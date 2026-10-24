/**
 * withBusyRetry: Meredam lock-contention (SQLITE_BUSY / database is locked)
 * pada Turso libSQL SQLite saat banyak transaksi konkuren checkout terjadi bersamaan.
 * Menggunakan exponential backoff + jitter acak agar request konkuren tidak bertabrakan.
 */
export async function withBusyRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 40;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "").toLowerCase();
      const isBusy =
        msg.includes("sqlite_busy") ||
        msg.includes("database is locked") ||
        msg.includes("busy") ||
        msg.includes("cannot start a transaction within a transaction");

      if (!isBusy || attempt === maxRetries - 1) {
        throw err;
      }

      // Jitter acak (10-40ms) + exponential backoff
      const jitter = Math.floor(Math.random() * 30);
      const delay = Math.round(baseDelayMs * Math.pow(1.8, attempt) + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
