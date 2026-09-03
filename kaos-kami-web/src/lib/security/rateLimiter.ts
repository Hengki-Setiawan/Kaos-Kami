/**
 * IN-MEMORY SLIDING WINDOW RATE LIMITER
 * Lightweight, zero-dependency, edge-compatible rate limiter for API endpoints.
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
