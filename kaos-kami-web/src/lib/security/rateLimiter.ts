/**
 * HYBRID SLIDING-WINDOW RATE LIMITER (Workers-safe)
 * - L1: in-memory sliding window (cepat, per-isolate). Tetap dipakai sebagai fast-path.
 * - L2 (opsional): Cloudflare KV fixed-window untuk lintas-isolate/colo.
 *   Aktif otomatis jika binding `RATE_LIMIT_KV` tersedia (wrangler `kv_namespaces`).
 *   Jika KV tidak ada / error → fail-OPEN (request lolos + warn log), agar limiter
 *   tidak pernah menjadi penyebab outage (sesuai riset Cloudflare 2026).
 *
 * Catatan riset:
 * - Workers Rate-Limiting API hanya mendukung period 10/60 dtk & per-PoP
 *   → tidak cocok untuk OTP 3x/5mnt, jadi tidak dipakai di sini.
 * - KV eventual-consistent ±60 dtk + 1 write/dtk/key → cocok untuk soft
 *   abuse-prevention (OTP/checkout/admin), BUKAN untuk billing-grade quota.
 *   Untuk kuota presisi global gunakan Durable Object per-key (belum dibutuhkan).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000);
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

  const record = rateLimitStore.get(key) || { timestamps: [] };

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
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    isLimited: false,
    remaining: limit - validTimestamps.length,
    resetSeconds: windowSeconds,
  };
}

/**
 * Helper to extract client IP from NextRequest
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

function getRateLimitKV(): KVLike | null {
  try {
    const g = globalThis as any;
    // OpenNext/Workers: env tersedia via getCloudflareContext().env atau global.
    const candidates: any[] = [
      g?.__cloudflare_context__?.env?.RATE_LIMIT_KV,
      g?.__env__?.RATE_LIMIT_KV,
      (typeof process !== "undefined" ? (process as any).env?.RATE_LIMIT_KV : null),
    ];
    for (const kv of candidates) {
      if (kv && typeof kv.get === "function" && typeof kv.put === "function") return kv as KVLike;
    }
  } catch {
    /* abaikan — fallback memory */
  }
  return null;
}

/**
 * Versi async hybrid: memory sliding-window + KV fixed-window (jika binding ada).
 * Selalu fail-OPEN saat KV error agar API tidak down karena infra limiter.
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
