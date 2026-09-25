/**
 * HYBRID SLIDING-WINDOW RATE LIMITER (Workers-safe)
 * - L1: in-memory sliding window (cepat, per-isolate). Tetap dipakai sebagai fast-path.
 * - L2 (opsional): Cloudflare KV fixed-window untuk lintas-isolate/colo.
 *   Aktif otomatis jika binding `RATE_LIMIT_KV` tersedia (wrangler `kv_namespaces`).
 *   Dibaca via API resmi `@opennextjs/cloudflare@^1.20`
 *   (`getCloudflareContext().env.RATE_LIMIT_KV`), di-cache di modul setelah
 *   hit pertama. Jika KV tidak ada / error → fail-OPEN (request lolos + warn
 *   log), agar limiter tidak pernah menjadi penyebab outage.
 *
 * Catatan riset:
 * - Workers Rate-Limiting API hanya mendukung period 10/60 dtk & per-PoP
 *   → tidak cocok untuk OTP 3x/5mnt, jadi tidak dipakai di sini.
 * - KV eventual-consistent ±60 dtk + 1 write/dtk/key → cocok untuk soft
 *   abuse-prevention (OTP/checkout/admin), BUKAN untuk billing-grade quota.
 *   Untuk kuota presisi global gunakan Durable Object per-key (belum dibutuhkan).
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimitRecord {
  timestamps: number[];
  windowMs: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries — memakai windowMs PER-ENTRY (bukan angka tetap):
// entri diprune tepat saat keluar dari window-nya sendiri. Entri tanpa
// windowMs tercatat (tak seharusnya terjadi) fallback 10 mnt agar tak bocor
// memori. Over-retain (keep > window) aman untuk correctness karena
// checkRateLimit selalu memfilter ulang sesuai window, tapi boros memori —
// jadi janitor memakai window persis per key.

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      const keep = record.windowMs > 0 ? record.windowMs : 600000;
      record.timestamps = record.timestamps.filter((ts) => now - ts < keep);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 600000);
}

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetSeconds: number;
  source?: "memory" | "kv" | "memory+kv";
}

interface KVLike {
  get(key: string, type?: "text" | "json"): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Check rate limit for a specific key (e.g. IP address + action)
 * @param key Unique key (e.g. `otp:${ip}` or `checkout:${ip}`)
 * @param limit Maximum allowed requests in the window
 * @param windowSeconds Duration of the time window in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const record = rateLimitStore.get(key) || { timestamps: [], windowMs: 0 };

  // Filter out timestamps older than the window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0] ?? now;
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

    return {
      isLimited: true,
      remaining: 0,
      resetSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps, windowMs });

  return {
    isLimited: false,
    remaining: limit - validTimestamps.length,
    resetSeconds: windowSeconds,
  };
}

/**
 * Helper to extract client IP from NextRequest.
 *
 * PERINGATAN XFF SPOOF (riset Sep 2026 — logika SENGAJA tak diubah):
 * `x-forwarded-for` / `x-real-ip` adalah header yang bisa dipalsukan client
 * bila request langsung ke origin tanpa melewati proxy tepercaya. Urutan di
 * bawah memprioritaskan `cf-connecting-ip` (ditulis Cloudflare, otoritatif
 * saat traffic lewat Cloudflare) dan hanya memakai XFF sebagai fallback.
 * Karena itu key limiter berbasis IP TIDAK boleh jadi satu-satunya tameng
 * untuk rute sensitif terautentikasi — rute yang sudah disentuh hardening
 * memakai key `userId` (kuota upload, dsb.) di samping limiter IP awal.
 * Fail-closed global (menolak semua request saat KV down) SENGAJA tidak
 * diterapkan — risiko outage lebih besar dari manfaatnya; lihat rekomendasi
 * di checkRateLimitAsync.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts[0]) return parts[0].trim();
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  return "127.0.0.1";
}

/** Hash kunci limiter agar tidak menyimpan PII mentah (IP/phone) di KV/logs. */
export async function hashRateLimitKey(raw: string): Promise<string> {
  try {
    const cryptoObj: Crypto | undefined =
      (globalThis as any).crypto ?? (await import("crypto")).webcrypto;
    if (!cryptoObj?.subtle) throw new Error("no-subtle");
    const digest = await cryptoObj.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`kaos-kami-rl:${raw}`)
    );
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback non-kripto (dev only): bukan untuk keamanan, hanya sharding key.
    let h = 5381;
    const s = `kaos-kami-rl:${raw}`;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return `fallback-${(h >>> 0).toString(16)}`;
  }
}

let cachedRateLimitKV: KVLike | null = null;

function getRateLimitKV(): KVLike | null {
  // Cache modul: hindari getCloudflareContext() tiap hit setelah binding ketemu.
  // Sengaja HANYA cache hasil positif — null tidak di-cache agar request
  // berikutnya (yang sudah di dalam request scope) tetap bisa menemukan KV.
  if (cachedRateLimitKV) return cachedRateLimitKV;
  // 1) Jalur RESMI @opennextjs/cloudflare ^1.20: getCloudflareContext().env.
  // Melempar di luar request scope (build/dev/test) → ditangkap, lanjut fallback.
  // (overload sync wajib argumen { async: false } — tanpa arg TS menolak.)
  try {
    const getCtx = getCloudflareContext as unknown as (o?: { async: false }) => {
      env: Record<string, unknown>;
    };
    const env = getCtx({ async: false })?.env;
    const kv = (env as Record<string, unknown> | undefined)?.["RATE_LIMIT_KV"] as KVLike | undefined;
    if (kv && typeof kv.get === "function" && typeof kv.put === "function") {
      cachedRateLimitKV = kv;
      return cachedRateLimitKV;
    }
  } catch {
    /* di luar request scope — lanjut fallback memory */
  }
  // 2) Fallback legacy (test/dev): global yang disuntik runtime lama.
  // process.env.RATE_LIMIT_KV SENGAJA tidak dibaca — isinya string, bukan binding KV.
  try {
    const g = globalThis as any;
    const legacy = g?.__cloudflare_context__?.env?.RATE_LIMIT_KV ?? g?.__env__?.RATE_LIMIT_KV;
    if (legacy && typeof legacy.get === "function" && typeof legacy.put === "function") {
      cachedRateLimitKV = legacy as KVLike;
      return cachedRateLimitKV;
    }
  } catch {
    /* abaikan — fallback memory */
  }
  return null;
}

/**
 * Versi async hybrid: memory sliding-window + KV fixed-window (jika binding ada).
 * Selalu fail-OPEN saat KV error agar API tidak down karena infra limiter.
 *
 * REKOMENDASI (dicatat, tidak diterapkan global — Sep 2026): untuk rute
 * auth-sensitif (OTP, reset password) pertimbangkan fail-CLOSED per-rute —
 * mis. bila KV tak tersedia DAN hasil memory sudah isLimited, tetap tolak —
 * karena fail-open memberi penyerang jendela bypass saat KV down. Jangan
 * jadikan fail-closed default global: satu insiden KV akan menjadi outage
 * seluruh API. Keputusan per-rute ada di pemilik rute masing-masing.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const mem = checkRateLimit(key, limit, windowSeconds);
  if (mem.isLimited) return { ...mem, source: "memory" };

  const kv = getRateLimitKV();
  if (!kv) return { ...mem, source: "memory" };

  try {
    const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
    const hashed = await hashRateLimitKey(`${key}`);
    const kvKey = `rl:${hashed}:${windowId}`;
    const raw = await kv.get(kvKey, "text");
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    if (count >= limit) {
      const resetSeconds = Math.max(
        1,
        windowId * windowSeconds + windowSeconds - Math.floor(Date.now() / 1000)
      );
      return { isLimited: true, remaining: 0, resetSeconds, source: "memory+kv" };
    }
    await kv.put(kvKey, String(count + 1), {
      expirationTtl: Math.max(60, windowSeconds + 5),
    });
    return { ...mem, source: "memory+kv" };
  } catch (e: any) {
    console.warn("[rate-limit] KV error, fail-open ke memory:", e?.message || e);
    return { ...mem, source: "memory" };
  }
}

/** Helper response 429 standar dengan header Retry-After. */
export function rateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    "Retry-After": String(result.resetSeconds),
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
}
