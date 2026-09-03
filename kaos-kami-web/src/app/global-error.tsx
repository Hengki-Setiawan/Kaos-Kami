"use client";
import { useEffect } from "react";
import NextError from "next/error";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line
        const Sentry: any = require("@sentry/nextjs");
        Sentry.captureException(error);
      } catch {}
    }
  }, [error]);
  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
