import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRawClient } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { secretsEqual } from "@/lib/timingSafe";

const q = (v: unknown): string =>
  v === null || v === undefined
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

// Satu objek R2 dijaga < 4 MB: cukup kecil untuk memori Worker, cukup besar
// agar jumlah PUT tidak meledak. Dump TIDAK pernah dipegang seluruhnya.
const MAX_PART_BYTES = 4_000_000;
// Harus sama dengan /api/cron/backup-status (env override agar nama bucket
// tidak divergen antara penulis dan pembaca status).
const BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET_NAME || "kaos-kami-backups";

/**
 * Upload dump ke bucket privat lewat binding R2 bila tersedia.
 *
 * Kenapa: REST `fetch` ke Cloudflare API dihitung sebagai subrequest. Split
 * backup bisa >25 PUT; Worker gratis dibatasi 50 subrequest/request, sehingga
 * backup bisa gagal justru saat data membesar. Binding R2 tidak dihitung
 * sebagai subrequest. Di `next dev` binding tidak ada → fallback REST.
 */
async function putBackupObject(
  key: string,
  body: string,
  contentType: string
): Promise<{ success: boolean; key: string; error?: string }> {
  try {
    const getCtx = getCloudflareContext as unknown as (o?: { async: false }) => {
      env?: { R2_BACKUPS?: { put: (k: string, v: string, o?: any) => Promise<unknown> } };
    };
    const bucket = getCtx()?.env?.R2_BACKUPS;
    if (bucket && typeof bucket.put === "function") {
      await bucket.put(key, body, { httpMetadata: { contentType } });
      return { success: true, key };
    }
  } catch {
    // Binding tidak tersedia (dev/test) — pakai REST di bawah.
  }
  return uploadToR2(key, body, contentType, BACKUP_BUCKET);
}

/**
 * GET /api/cron/backup — Fotokopi logis Turso → R2 (bucket privat).
 * Dijadwalkan mingguan dari luar (cron-job.org) dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * Tanpa CRON_SECRET = 503. Backup berisi PII pelanggan — bucket privat.
 *
 * Format split (sejak 24 Okt 2026): setiap tabel dipecah menjadi part < 4 MB
 * di `backups/kaos-kami-<stamp>/`. `manifest.json` ditulis TERAKHIR, sehingga
 * keberadaan manifest = backup lengkap. Ini menggantikan single-file 25 MB
 * yang gagal total saat tabel Design membesar.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (!secretsEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = getRawClient();
    // Snapshot baca: schema + semua tabel harus dari titik waktu yang SAMA.
    // Tanpa transaksi, INSERT/DELETE live di tengah backup bisa membuat offset
    // LIMIT/OFFSET melewatkan baris atau menggandakan baris.
    const tx = await raw.transaction("read");
    try {
      // WAJIB ikut index/trigger/view: unique index (mis. Verification.identifier,
      // User.email, Order.orderNumber) adalah gerbang idempotensi & integritas.
      // Tanpa index, restore "sukses" tetapi aplikasi bisa membuat duplikat.
      const tablesRes = await tx.execute(
        `SELECT type, name, sql FROM sqlite_master
         WHERE type IN ('table','index','trigger','view')
           AND name NOT LIKE 'sqlite_%'
           AND name NOT LIKE '_litestream%'
           AND sql IS NOT NULL
         ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END, name`
      );
    const schemaObjects = (tablesRes.rows || []) as any[];
    // Hanya objek type=table yang punya baris untuk di-dump; index/trigger/view
    // cukup masuk schema.sql.
    const tables = schemaObjects.filter((t) => t?.type === "table");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const prefix = `backups/kaos-kami-${stamp}`;
    const schemaKey = `${prefix}/schema.sql`;

    // Schema ditulis lebih dulu; restore script menjalankan schema lalu parts.
    let schemaSql =
      `-- Kaos Kami split backup ${new Date().toISOString()}\n` +
      `PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n`;
    for (const t of schemaObjects) {
      if (t?.sql) schemaSql += `\n${t.sql};\n`;
    }
    schemaSql += `COMMIT;\nPRAGMA foreign_keys=ON;\n`;
    const schemaUp = await putBackupObject(schemaKey, schemaSql, "application/sql");
    if (!schemaUp.success) {
      return NextResponse.json(
        { error: schemaUp.error || "Upload schema backup gagal" },
        { status: 500 }
      );
    }

    const manifestTables: Array<{ name: string; rows: number; parts: string[] }> = [];
    let totalRows = 0;
    let totalBytes = schemaSql.length;
    let totalParts = 0;

    for (const t of tables) {
      const tableName = String(t?.name || "");
      if (!tableName) continue;
      const safeName = tableName.replace(/[^A-Za-z0-9_-]/g, "_");
      let partIndex = 0;
      let partRows = 0;
      let tableRows = 0;
      let part = `-- table ${tableName} (part ${partIndex + 1})\n`;
      const partKeys: string[] = [];

      const flushPart = async () => {
        if (partRows === 0) return;
        partIndex++;
        const key = `${prefix}/${safeName}.part-${String(partIndex).padStart(3, "0")}.sql`;
        const up = await putBackupObject(key, part, "application/sql");
        if (!up.success) throw new Error(up.error || `Upload part ${key} gagal`);
        partKeys.push(key);
        totalParts++;
        totalBytes += part.length;
        part = `-- table ${tableName} (part ${partIndex + 1})\n`;
        partRows = 0;
      };

      let off = 0;
      for (;;) {
        // ORDER BY rowid membuat offset stabil selama backup berjalan.
        const r = await tx.execute(
          `SELECT * FROM "${tableName.replace(/"/g, '""')}" ORDER BY rowid LIMIT 100 OFFSET ${off}`
        );
        if (!r.rows || r.rows.length === 0) break;
        const cols = r.columns.map((c: string) => `"${c}"`).join(",");
        for (const row of r.rows as any[]) {
          const line = `INSERT INTO "${tableName.replace(/"/g, '""')}" (${cols}) VALUES (${r.columns
            .map((c: string) => q(row[c]))
            .join(",")});\n`;
          if (part.length + line.length > MAX_PART_BYTES) {
            await flushPart();
          }
          part += line;
          partRows++;
          tableRows++;
          totalRows++;
        }
        off += 100;
        if (r.rows.length < 100) break;
      }
      await flushPart();
      manifestTables.push({ name: tableName, rows: tableRows, parts: partKeys });
    }

    const manifest = {
      ok: true,
      format: "kaos-kami-sql-parts-v1",
      createdAt: new Date().toISOString(),
      stamp,
      schemaKey,
      tables: manifestTables,
      totalRows,
      totalParts,
      totalBytes,
    };
    const manifestKey = `${prefix}/manifest.json`;
    const manifestUp = await putBackupObject(
      manifestKey,
      JSON.stringify(manifest, null, 2),
      "application/json"
    );
    if (!manifestUp.success) {
      return NextResponse.json(
        { error: manifestUp.error || "Upload manifest backup gagal" },
        { status: 500 }
      );
    }

    // Marker observabilitas (best-effort, JANGAN ubah hasil backup bila gagal):
    // cron-state/backup.json dibaca /api/health sebagai bukti cron hidup.
    // Marker ke bucket ASET default (publik-terbaca) — isinya hanya metadata,
    // BUKAN dump PII (dump tetap di bucket privat kaos-kami-backups).
    try {
      await uploadToR2(
        "cron-state/backup.json",
        JSON.stringify({
          ok: true,
          at: new Date().toISOString(),
          // JANGAN tulis key objek bucket privat ke bucket publik.
          mode: "split",
          bytes: totalBytes,
          tables: manifestTables.length,
          parts: totalParts,
          rows: totalRows,
        }),
        "application/json"
      );
    } catch (e: any) {
      console.warn("Backup marker gagal:", e?.message);
    }

    return NextResponse.json({
      success: true,
      key: manifestKey,
      schemaKey,
      mode: "split",
      bytes: totalBytes,
      tables: manifestTables.length,
      parts: totalParts,
      rows: totalRows,
    });
    } finally {
      try {
        await tx.rollback();
      } catch {}
      try {
        raw.close();
      } catch {}
    }
  } catch (e: any) {
    console.error("Backup error:", e?.message);
    return NextResponse.json({ error: e?.message || "Backup gagal" }, { status: 500 });
  }
}
