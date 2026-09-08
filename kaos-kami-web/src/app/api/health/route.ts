import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Health jujur (audit N13): DB tulis-baca + latensi + status KV/R2,
// no-store anti-cache, tanpa bocor rahasia (hanya ok/gagal + ms).
export async function GET() {
  const started = Date.now();
  const checks: Record<string, { ok: boolean; ms?: number; note?: string }> = {};

  // DB: tulis-baca nyata (bukan SELECT 1 — tulis membuktikan permission).
  try {
    const t0 = Date.now();
    await db.run(sql`CREATE TEMP TABLE IF NOT EXISTS _health (id INTEGER PRIMARY KEY, ts TEXT)`);
    await db.run(sql`INSERT INTO _health (ts) VALUES (${new Date().toISOString()})`);
    await db.run(sql`DELETE FROM _health`);
    checks.db = { ok: true, ms: Date.now() - t0 };
  } catch (e: any) {
    checks.db = { ok: false, note: e?.message?.slice(0, 80) || "db error" };
  }

  // KV rate-limit (best-effort, tanpa bocor isi).
  try {
    const t0 = Date.now();
    const { checkRateLimitAsync } = await import("@/lib/security/rateLimiter");
    await checkRateLimitAsync("health:self", 1000, 60);
    checks.ratelimit = { ok: true, ms: Date.now() - t0 };
  } catch {
    checks.ratelimit = { ok: false };
  }

  // R2: HEAD file statis publik (tanpa token, tanpa bocor).
  try {
    const t0 = Date.now();
    const pub = process.env.R2_PUBLIC_URL;
    if (!pub) {
      checks.r2 = { ok: false, note: "no public url configured" };
    } else {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${pub.replace(/\/+$/, "")}/brand/favicon.png`, {
        method: "HEAD",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      checks.r2 = { ok: res.ok, ms: Date.now() - t0 };
    }
  } catch {
    checks.r2 = { ok: false };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
