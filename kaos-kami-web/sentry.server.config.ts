// Sentry server config — placeholder, aktif hanya jika DSN di-set.
// P1: import statis (bukan require). DSN TIDAK di-set di sini — via env
// SENTRY_DSN oleh owner (JANGAN wrangler secret dari sesi ini).
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
export {};
