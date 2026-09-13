import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp } from "@/lib/security/rateLimiter";

// Health jujur (audit N13): DB baca saja + latensi + status KV/R2,
// no-store anti-cache, tanpa bocor rahasia (hanya ok/gagal + ms).
export async function GET(req: Request) {
  // Throttle: tiap hit = 2 query baca ringan (tanpa batas = amplifikasi DB).
  const rl = await checkRateLimitAsync(`health:ip:${getClientIp(req)}`, 10, 60);
  if (rl.isLimited) {
    return NextResponse.json({ status: "limited" }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const started = Date.now();
  const checks: Record<string, { ok: boolean; ms?: number; note?: string }> = {};

  // DB: baca saja (anti amplifikasi tulis — sebelumnya tiap hit health
  // = 3 query tulis CREATE+INSERT+DELETE).
  try {
    const t0 = Date.now();
    await db.run(sql`SELECT 1`);
    // Cek baca tabel nyata (bukti permission baca tanpa tulis).
    await db.query.ApparelCategory.findFirst({ columns: { id: true } });
    checks.db = { ok: true, ms: Date.now() - t0 };
  } catch (e: any) {
    checks.db = { ok: false, note: e?.message?.slice(0, 80) || "db error" };
  }

  // KV rate-limit (best-effort, tanpa bocor isi). `note` memuat backend
  // aktif ("memory" vs "memory+kv") agar sinyal KV tetap terbaca health.
  try {
    const t0 = Date.now();
    const { checkRateLimitAsync } = await import("@/lib/security/rateLimiter");
    const probe = await checkRateLimitAsync("health:self", 1000, 60);
    checks.ratelimit = { ok: true, ms: Date.now() - t0, note: probe.source ?? "memory" };
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

  // Cron observabilitas (informatif saja — tak pengaruhi status): baca marker
  // R2 cron-state/sweep.json & backup.json yang ditulis tiap sukses cron.
  // Tanpa marker (cron belum pernah sukses / R2 belum dikonfigurasi) = null jujur.
  let cron: Record<string, { at: string | null; ageSec: number | null }> | null = null;
  try {
    const pub = process.env.R2_PUBLIC_URL;
    if (pub) {
      const base = pub.replace(/\/+$/, "");
      const readMarker = async (name: string) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4000);
          const res = await fetch(`${base}/cron-state/${name}.json`, {
            cache: "no-store",
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (!res.ok) return { at: null, ageSec: null };
          const j: any = await res.json().catch(() => null);
          const at = typeof j?.at === "string" ? j.at : null;
          const ageSec = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000)) : null;
          return { at, ageSec };
        } catch {
          return { at: null, ageSec: null };
        }
      };
      const [sweep, backup] = await Promise.all([readMarker("sweep"), readMarker("backup")]);
      cron = { sweep, backup };
    }
  } catch {
    cron = null;
  }

  // Status HTTP = ONE QUESTION: bisakah worker melayani? DB ok → 200
  // (r2/kv/cron informatif saja — R2 publik belum tentu berisi favicon,
  // KV bisa fail-open by-design; semuanya tetap terlihat di `checks`).
  // 503 HANYA bila DB mati. Diubah 13 Sep 2026: sebelumnya r2 HEAD 404
  // di bucket upload ikut men-503-kan seluruh health (false alarm prod).
  const dbOk = checks.db?.ok === true;
  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: !dbOk ? "down" : allOk ? "ok" : "degraded",
      checks,
      cron,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
