// Sentry server config — placeholder
if (process.env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line
    const Sentry = require("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN as string,
      tracesSampleRate: 0.1,
    });
  } catch {}
}
export {};
