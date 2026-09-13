// Sentry client config — placeholder, aktif hanya jika DSN di-set (Blueprint 04 §12).
// P1: import statis (bukan require). DSN TIDAK di-set di sini — via env
// NEXT_PUBLIC_SENTRY_DSN oleh owner (JANGAN wrangler secret dari sesi ini).
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
export {};
