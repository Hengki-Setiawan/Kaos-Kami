import { NextRequest, NextResponse } from "next/server";
import { getRawClient } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

const q = (v: unknown): string =>
  v === null || v === undefined
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

/**
 * GET /api/cron/backup — Fotokopi logis Turso → R2 (backups/kaos-kami-TS.sql).
 * Dijadwalkan mingguan dari luar (cron-job.org) dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * Tanpa CRON_SECRET = 503. Backup berisi PII pelanggan — file di R2 private
 * (bukan prefix publik aplikasi/).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = getRawClient();
    const tablesRes = await raw.execute(
      `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name`
    );
    const tables = tablesRes.rows || [];
    let out = `-- Kaos Kami cloud backup ${new Date().toISOString()}\nBEGIN TRANSACTION;\n`;
    let totalRows = 0;
    for (const t of tables as any[]) {
      out += `\n${t.sql};\n`;
      let off = 0;
      for (;;) {
        const r = await raw.execute(`SELECT * FROM "${(t as any).name}" LIMIT 100 OFFSET ${off}`);
        if (!r.rows || r.rows.length === 0) break;
        const cols = r.columns.map((c: string) => `"${c}"`).join(",");
        for (const row of r.rows as any[]) {
          out += `INSERT INTO "${(t as any).name}" (${cols}) VALUES (${r.columns.map((c: string) => q(row[c])).join(",")});\n`;
          totalRows++;
        }
        off += 100;
        if (r.rows.length < 100) break;
      }
    }
    out += "COMMIT;\n";
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const key = `backups/kaos-kami-${stamp}.sql`;
    const up = await uploadToR2(key, out, "application/sql");
    if (!up.success) {
      return NextResponse.json({ error: up.error || "Upload backup gagal" }, { status: 500 });
    }
    return NextResponse.json({ success: true, key, bytes: out.length, tables: tables.length, rows: totalRows });
  } catch (e: any) {
    console.error("Backup error:", e?.message);
    return NextResponse.json({ error: e?.message || "Backup gagal" }, { status: 500 });
  }
}
