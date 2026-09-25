#!/usr/bin/env node
// scripts/e2e-R-K.mjs â€” Runner R-K: cron/health/infra (Bab 5, K-001â€“K-020).
// PALING AMAN, tanpa fixture. Sweep/backup BUTUH CRON_SECRET via env.
// JANGAN buat fixture basi palsu: K-002/003/006/007/008-mock/010-mock = SKIP jujur.
// Konvensi: ESM, requireEnv, --stamp wajib, --dry-run NOL tulis, sleep + STOP 429,
// token â‰¤8char, OUTPUT sweep.json/backup.json/health.json ke OUTPUT_DIR.
import fs from "node:fs";
import path from "node:path";

const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => {
  const i = ARGS.indexOf(f);
  return i >= 0 && ARGS[i + 1] && !ARGS[i + 1].startsWith("--") ? ARGS[i + 1] : d;
};
if (has("--help")) {
  console.log(`R-K cron/health/infra (K-001â€“K-020), tanpa fixture.
Pakai: node scripts/e2e-R-K.mjs --stamp YYYYMMDD-HHMM [--base-url URL] [--dry-run]
Env: CRON_SECRET (wajib utk K-004/005/009); TURSO_* (opsional, K-018); E2E_WORKER_URL (opsional, K-015).
  K-013 (rate 429) SELALU TERAKHIR. --dry-run: LIST aksi, NOL tulis/jaringan.`);
  process.exit(0);
}
const STAMP = val("--stamp", process.env.RUN_STAMP || "");
if (!/^\d{8}-\d{4}$/.test(STAMP)) throw new Error("REFUSE: --stamp YYYYMMDD-HHMM wajib (cth 20260922-0130)");
const DRY = has("--dry-run");
let BASE = val("--base-url", process.env.E2E_BASE_URL || "http://127.0.0.1:3000");
if (has("--prod")) {
  if (!has("--confirm-prod")) throw new Error("REFUSE: --prod butuh --confirm-prod + perintah owner");
  BASE = val("--base-url", "https://kaoskami.biz.id");
}
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (isi dari kaos-kami-web/.env.local, JANGAN commit)`);
  return v;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLEEP_MS = Number(process.env.E2E_SLEEP_MS || 2000);
class Stop429 extends Error {}
async function req(p, o = {}) {
  // PANDUAN §10: tiap fetch WAJIB timeout (anti-gantung).
  const r = await fetch(BASE + p, { signal: AbortSignal.timeout(60000), ...o });
  if (r.status === 429 && !o.expect429) throw new Stop429(`STOP 429 di ${p} â€” JANGAN retry buta, tunggu window`);
  return r;
}
const R = [];
const rec = (id, status, note) => { R.push({ id, status, note }); console.log(`${status} ${id} â€” ${note}`); };
const PLAN = ["K-001 health shape", "K-004 sweep 401", "K-005 sweep Bearer (CATAT efek!)", "K-009 backup (CATAT key/bytes!)",
  "K-011 backup-status publik", "K-012 markerâ†’health", "K-014 CSP/HSTS", "K-015 workers.dev (SKIP bila tak ada URL)",
  "K-016 models immutable", "K-017 assetlinks", "K-018 FK (SKIP bila tanpa TURSO_*)", "K-019/020 umur cron",
  "SKIP jujur: K-002/003/006/007/008-mock/010-mock (tanpa mock!)", "K-013 rate 429 TERAKHIR"];
if (DRY) { console.log(`DRY-RUN ${STAMP} @ ${BASE} (NOL tulis/jaringan):`); PLAN.forEach((p) => console.log(" - " + p)); process.exit(0); }

try {
  // K-001 health shape.
  const h1 = await req("/api/health");
  const hj = await h1.json().catch(() => ({}));
  const shapeOk = hj.status && hj.checks?.db && hj.checks?.ratelimit && hj.checks?.r2 && "latencyMs" in hj && hj.timestamp;
  rec("K-001", h1.status === 200 && shapeOk ? "PASS" : h1.status === 503 ? "FAIL" : "FAIL", `healthâ†’${h1.status} status=${hj.status || "?"} db=${hj.checks?.db?.ok ?? "?"}`);
  await sleep(SLEEP_MS);
  rec("K-002", "SKIP", "DB-matiâ†’503 butuh mock/cabut env â€” tanpa mock, jujur SKIP");
  rec("K-003", "SKIP", "R2-404â†’degraded butuh hapus/mock favicon â€” tanpa mock, jujur SKIP");

  // K-004 sweep Bearer salah + tanpa header â†’ 401 (tanpa efek samping).
  const CRON = requireEnv("CRON_SECRET");
  const sW = await req("/api/cron/sweep", { headers: { Authorization: "Bearer salah-uji" } });
  const sN = await req("/api/cron/sweep"); await sleep(SLEEP_MS);
  rec("K-004", sW.status === 401 && sN.status === 401 ? "PASS" : "FAIL", `salahâ†’${sW.status} tanpaâ†’${sN.status} (harap 401+401)`);

  // K-005 sweep sukses â€” EFEK SAMPING SAH: bisa CANCEL basi + reconcile yatim!
  const s5 = await req("/api/cron/sweep", { headers: { Authorization: `Bearer ${CRON}` } });
  const s5j = await s5.json().catch(() => ({}));
  rec("K-005", s5.status === 200 && s5j.success ? "PASS" : "FAIL", `sweepâ†’${s5.status} checked=${s5j.checked ?? "?"} cancelled=${s5j.cancelled ?? "?"} reconciled=${s5j.reconciled ?? "?"} created=${s5j.created ?? "?"}`);
  await sleep(SLEEP_MS);
  rec("K-006", "SKIP", "order PENDING 1h butuh fixture U-021 â€” JANGAN fixture palsu; cek checked tanpa cancelled di atas");
  rec("K-007", "SKIP", "REVIEW basi dilewati (machine.ts:52) â€” tanpa fixture basi, jujur SKIP");
  rec("K-008", (s5j.reconciled ?? 0) > 0 ? "PASS" : "SKIP", `yatim nominal-samaâ†’SETTLEMENT via sweep-reconcile (${s5j.reconciled ?? 0}); nominal-beda mock = SKIP`);

  // K-009 backup shape â€” CATAT key/bytes (PII di bucket privat, JANGAN buka isi!).
  const b9 = await req("/api/cron/backup", { headers: { Authorization: `Bearer ${CRON}` } });
  const b9j = await b9.json().catch(() => ({}));
  rec("K-009", b9.status === 200 && b9j.key ? "PASS" : "FAIL", `backupâ†’${b9.status} key=${b9j.key || "-"} bytes=${b9j.bytes ?? "?"} tables=${b9j.tables ?? "?"} rows=${b9j.rows ?? "?"}`);
  await sleep(SLEEP_MS);
  rec("K-010", "SKIP", `dump>25MBâ†’413 butuh mock raksasa â€” aktual ${b9j.bytes ?? "?"} vs ambang 25jt, jujur SKIP`);

  // K-011 backup-status publik (tanpa secret).
  const b11 = await req("/api/cron/backup-status");
  const b11j = await b11.json().catch(() => ({}));
  rec("K-011", b11.status === 200 && "ageSec" in b11j ? "PASS" : "FAIL", `statusâ†’${b11.status} latest=${b11j.latestFile || "null"} ageSec=${b11j.ageSec ?? "null"} count=${b11j.count ?? "?"}`);
  await sleep(SLEEP_MS);

  // K-012 marker sweep/backup terbaca health.
  const h2 = await req("/api/health");
  const h2j = await h2.json().catch(() => ({}));
  rec("K-012", h2j.cron?.sweep?.at && h2j.cron?.backup?.at ? "PASS" : "GAP", `sweep.at=${h2j.cron?.sweep?.at ? "isi" : "null"} backup.at=${h2j.cron?.backup?.at ? "isi" : "null"}`);
  await sleep(SLEEP_MS);

  // K-014 header CSP/HSTS (+COOP/nosniff/SAMEORIGIN/Referrer/Permissions).
  const root = await req("/");
  const hd = (n) => root.headers.get(n) || "";
  const cspOk = /default-src/.test(hd("content-security-policy"));
  rec("K-014", cspOk && hd("strict-transport-security") ? "PASS" : "GAP", `CSP=${cspOk ? "ok" : "HILANG"} HSTS=${hd("strict-transport-security") ? "ok" : "null(http-lokal wajar)"} COOP=${hd("cross-origin-opener-policy") || "null"}`);
  await sleep(SLEEP_MS);

  // K-015 workers.dev â†’ 308 kanonis (SKIP bila tak ada URL).
  const wurl = process.env.E2E_WORKER_URL || "";
  if (!wurl) rec("K-015", "SKIP", "E2E_WORKER_URL tak diset â€” catat, bukan gagal");
  else {
    const w = await fetch(wurl, { redirect: "manual" });
    rec("K-015", w.status === 308 ? "PASS" : "FAIL", `${wurl}â†’${w.status} (harap 308 biz.id)`);
    await sleep(SLEEP_MS);
  }

  // K-016 models immutable + CORS; K-017 assetlinks tanpa redirect.
  const m = await req("/models/tee-basic.glb", { method: "HEAD" });
  rec("K-016", /immutable/.test(m.headers.get("cache-control") || "") ? "PASS" : "FAIL", `cache=${m.headers.get("cache-control") || "?"} cors=${m.headers.get("access-control-allow-origin") || "?"}`);
  await sleep(SLEEP_MS);
  const a = await fetch(BASE + "/.well-known/assetlinks.json", { redirect: "manual" });
  rec("K-017", a.status === 200 && (a.headers.get("content-type") || "").includes("json") ? "PASS" : "FAIL", `assetlinksâ†’${a.status} ct=${a.headers.get("content-type") || "?"}`);
  await sleep(SLEEP_MS);

  // K-018 FK check (Turso read-only; SKIP bila tanpa env).
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const { createClient } = await import("@libsql/client/http");
    const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    const fk = await c.execute("PRAGMA foreign_key_check");
    rec("K-018", fk.rows.length === 0 ? "PASS" : "FAIL", `FK violation=${fk.rows.length} (harap 0) â€” STOP bila >0`);
  } else rec("K-018", "SKIP", "TURSO_* tak diset di env runner â€” jujur SKIP");

  // K-019/020 umur cron (baca saja, JANGAN investigasi prod).
  const swAge = h2j.cron?.sweep?.ageSec, bkAge = b11j.ageSec;
  rec("K-019", swAge == null ? "GAP" : swAge < 7200 ? "PASS" : "FAIL", `sweep ageSec=${swAge ?? "null"} (sehat <7200; ~18h+=job mati, cek cron-job.org)`);
  rec("K-020", bkAge == null ? "GAP" : bkAge < 691200 ? "PASS" : "FAIL", `backup ageSec=${bkAge ?? "null"} (sehat <691200=8hri)`);

  // K-013 rate health 429 â€” TERAKHIR (membakar kuota 10/mnt!).
  let saw429 = false, hits = 0;
  for (let i = 0; i < 11 && !saw429; i++) {
    const r = await req("/api/health", { expect429: true }); hits++;
    if (r.status === 429) saw429 = true; else await sleep(1000);
  }
  rec("K-013", saw429 ? "PASS" : "FAIL", `429 terlihat setelah ${hits} hit (harap â‰¤11)`);

  const OUT = path.resolve(`Blueprint/e2e/hasil-pengujian-e2e/${STAMP}`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "sweep.json"), JSON.stringify({ stamp: STAMP, base: BASE, warn: "Sweep BISA cancel PENDING basi + reconcile yatim â€” efek samping sah, terverifikasi di atas", tests: R.filter((t) => /^K-00[4-8]/.test(t.id)), result: { checked: s5j.checked ?? null, cancelled: s5j.cancelled ?? null, reconciled: s5j.reconciled ?? null, created: s5j.created ?? null }, at: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(OUT, "backup.json"), JSON.stringify({ stamp: STAMP, base: BASE, tests: R.filter((t) => /^K-00[19]|K-010|K-011|K-020/.test(t.id)), result: { key: b9j.key ?? null, bytes: b9j.bytes ?? null, tables: b9j.tables ?? null, rows: b9j.rows ?? null, status: b11j }, at: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(OUT, "health.json"), JSON.stringify({ stamp: STAMP, base: BASE, tests: R.filter((t) => !/^K-00[4-9]|K-010|K-011|K-020/.test(t.id)), health: { status: hj.status, checks: hj.checks, latencyMs: hj.latencyMs }, cron: h2j.cron ?? null, at: new Date().toISOString() }, null, 2));
  console.log(`Tulis sweep.json backup.json health.json (${R.length} hasil) ke ${STAMP}/.`);
} catch (e) {
  if (e instanceof Stop429) { console.log(`STOP ${e.message}`); process.exit(2); }
  console.log(`FAIL run â€” ${e.message}`); process.exit(1);
}
