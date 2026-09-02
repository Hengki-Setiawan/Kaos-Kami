// Next.js instrumentation — Sentry onRequestError (Next 14 App Router)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      await import("./sentry.server.config");
    } catch {}
  }
}

export const onRequestError = async (err: unknown) => {
  if (process.env.SENTRY_DSN) {
    try {
      // @ts-ignore — optional peer, install @sentry/nextjs to activate
      const Sentry: any = await import("@sentry/nextjs");
      Sentry.captureException(err);
    } catch {}
  }
};
