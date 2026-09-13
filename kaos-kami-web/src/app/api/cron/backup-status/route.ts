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

/** Parse stamp nama file `kaos-kami-YYYYMMDDHHMM.sql` → ISO (fallback bila API tak beri `uploaded`). */
function parseStampAt(key: string): string | null {
  const m = key.match(/(\d{12})\.sql$/);
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
 * List prefix `backups/` di bucket privat — pola tiru `listR2Objects`
 * (src/lib/r2.ts) + `bucketOverride` pola cron/backup/route.ts.
 * Tak ada helper list dengan bucketOverride di lib, jadi panggil API
 * Cloudflare langsung di sini (bucket backup, bukan bucket aset).
 */
async function listBackupFiles(): Promise<{ success: boolean; files: ListedFile[] }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  if (!accountId || !token) return { success: false, files: [] };
  try {
    const url =
      `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/r2/buckets/${BACKUP_BUCKET}/objects?prefix=${encodeURIComponent(BACKUP_PREFIX)}&per_page=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return { success: false, files: [] };
    const objs = data.result?.objects || [];
    const files: ListedFile[] = (objs as any[])
      .map((o) => ({
        key: String(o.key || ""),
        uploaded:
          typeof o.uploaded === "string"
            ? o.uploaded
            : typeof o.modified === "string"
              ? o.modified
              : null,
      }))
      .filter((f) => f.key.startsWith(BACKUP_PREFIX) && !f.key.endsWith("/"));
    return { success: true, files };
  } catch {
    return { success: false, files: [] };
  }
}

/**
 * GET /api/cron/backup-status — ringkasan backup PUBLIK (tanpa CRON_SECRET).
 * Non-sensitif: hanya nama file terbaru + umur + jumlah (TANPA isi dump/PII).
 */
export async function GET(req: NextRequest) {
  // Rate-limit ringan 30/mnt (tiru pola admin-cms GET anti-scrape).
  const rl = await checkRateLimitAsync(`backup-status:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited)
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  const empty = { success: true, latestFile: null, at: null, ageSec: null, count: 0 };
  try {
    const listed = await listBackupFiles();
    if (!listed.success || listed.files.length === 0) {
      return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=60" } });
    }
    const sorted = [...listed.files].sort((a, b) =>
      (b.uploaded || b.key).localeCompare(a.uploaded || a.key)
    );
    const latest = sorted[0]!;
    const at = latest.uploaded || parseStampAt(latest.key);
    const ageSec = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000)) : null;
    return NextResponse.json(
      { success: true, latestFile: latest.key, at, ageSec, count: listed.files.length },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch {
    return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
