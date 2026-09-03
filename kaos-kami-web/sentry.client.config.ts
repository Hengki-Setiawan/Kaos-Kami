// Sentry client config — placeholder, aktif hanya jika SENTRY_DSN di-set (Blueprint 04 §12)
// Untuk aktifkan: npm install @sentry/nextjs && set SENTRY_DSN di .env
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // eslint-disable-next-line
    const Sentry = require("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN as string,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch {}
}
export {};
