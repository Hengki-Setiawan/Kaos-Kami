import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Bucket PRIVAT yang sama dengan cron/backup (dump PII) — endpoint ini HANYA
// membaca daftar nama file (tanpa isi dump, tanpa getRawClient/DB).
const BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET_NAME || "kaos-kami-backups";
const BACKUP_PREFIX = "backups/";

interface ListedFile {
  key: string;
  uploaded: string | null;
}

interface R2ListResult {
  success: boolean;
  files: ListedFile[];
  prefixes: string[];
}

/** Parse stamp path `kaos-kami-YYYYMMDDHHMM/...` → ISO (fallback bila API tak beri `last_modified`). */
function parseStampAt(key: string): string | null {
  const m = key.match(/(\d{12})/);
  if (!m) return null;
  const s = m[1]!;
  const dt = new Date(
    Date.UTC(
      Number(s.slice(0, 4)),
      Number(s.slice(4, 6)) - 1,
      Number(s.slice(6, 8)),
      Number(s.slice(8, 10)),
      Number(s.slice(10, 12))
    )
  );
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

/**
 * List objek R2 di bucket privat. Cloudflare API mengembalikan `result`
 * sebagai ARRAY (bukan `{ objects: [...] }`) dan waktu unggah di
 * `last_modified` — dua bentuk lama di kode ini membuat endpoint selalu
 * melaporkan "tidak ada backup" walau bucket berisi dump.
 *
 * `delimiter=/` dipakai untuk mengambil daftar folder backup (split) tanpa
 * terpotong pagination 100 objek.
 */
async function r2List(prefix: string, delimiter?: string): Promise<R2ListResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  if (!accountId || !token) return { success: false, files: [], prefixes: [] };
  try {
    const qs = new URLSearchParams({ prefix, per_page: "1000" });
    if (delimiter) qs.set("delimiter", delimiter);
    const url =
      `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/r2/buckets/${BACKUP_BUCKET}/objects?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return { success: false, files: [], prefixes: [] };

    const raw = Array.isArray(data.result)
      ? data.result
      : Array.isArray(data.result?.objects)
        ? data.result.objects
        : [];
    const files: ListedFile[] = (raw as any[])
      .map((o) => ({
        key: String(o.key || ""),
        uploaded:
          typeof o.last_modified === "string"
            ? o.last_modified
            : typeof o.uploaded === "string"
              ? o.uploaded
              : typeof o.modified === "string"
                ? o.modified
                : null,
      }))
      .filter((f) => f.key.startsWith(prefix) && !f.key.endsWith("/"));

    const prefixes = Array.isArray(data.result_info?.delimited)
      ? (data.result_info.delimited as string[]).filter((p) => p.startsWith(prefix))
      : [];

    return { success: true, files, prefixes };
  } catch {
    return { success: false, files: [], prefixes: [] };
  }
}

/**
 * GET /api/cron/backup-status — ringkasan backup PUBLIK (tanpa CRON_SECRET).
 * Non-sensitif: hanya umur + jumlah + mode (TANPA key objek, isi dump, atau PII).
 */
export async function GET(req: NextRequest) {
  // Rate-limit ringan 30/mnt (tiru pola admin-cms GET anti-scrape).
  const rl = await checkRateLimitAsync(`backup-status:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited)
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  const empty = { success: true, at: null, ageSec: null, count: 0, mode: "none" as const };
  try {
    // Satu panggilan berdelimiter: file lama single-dump di root + folder split.
    const root = await r2List(BACKUP_PREFIX, "/");
    if (!root.success) return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=60" } });

    const folders = root.prefixes
      .map((p) => p.replace(/\/+$/, "") + "/")
      .filter((p) => p.startsWith(BACKUP_PREFIX))
      .sort();
    const latestFolder = folders.length > 0 ? folders[folders.length - 1]! : null;

    let folderFiles: ListedFile[] = [];
    if (latestFolder) {
      const listed = await r2List(latestFolder);
      if (listed.success) folderFiles = listed.files;
    }
    const manifest = folderFiles.find((f) => f.key.endsWith("/manifest.json"));
    const folderAt = latestFolder ? parseStampAt(latestFolder) : null;

    // File single-dump lama (backup/kaos-kami-YYYY...sql) — tetap didukung.
    const singleFiles = root.files.filter((f) => /\.(sql|json)$/i.test(f.key));
    const latestSingle = [...singleFiles].sort((a, b) =>
      (b.uploaded || b.key).localeCompare(a.uploaded || a.key)
    )[0];

    if (manifest) {
      const at = manifest.uploaded || folderAt;
      const ageSec = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000)) : null;
      return NextResponse.json(
        { success: true, at, ageSec, count: folders.length, mode: "split" },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    if (latestSingle) {
      const at = latestSingle.uploaded || parseStampAt(latestSingle.key);
      const ageSec = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000)) : null;
      return NextResponse.json(
        { success: true, at, ageSec, count: singleFiles.length, mode: "single" },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    // Folder terbaru ada tapi manifest belum tertulis = backup terakhir gagal
    // di tengah jalan. Laporkan jujur, jangan fallback ke backup lama seolah sehat.
    if (latestFolder) {
      const ageSec = folderAt
        ? Math.max(0, Math.round((Date.now() - new Date(folderAt).getTime()) / 1000))
        : null;
      return NextResponse.json(
        { success: true, at: folderAt, ageSec, count: folders.length, mode: "incomplete" },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
