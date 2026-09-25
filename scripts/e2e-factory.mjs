#!/usr/bin/env node
/**
 * e2e-factory.mjs â€” Bab 8 R2 (PANDUAN-RUNNER Â§1.1).
 * Buat 4 akun factory e2e-<stamp>-r{1..4}@kaoskami.test via API sign-up better-auth.
 *
 * Endpoint: POST {BASE}/api/auth/sign-up/email {email,password,name}
 * (handler: kaos-kami-web/src/app/api/auth/[...all]/route.ts â†’ better-auth;
 *  AuthModal UI tambah langkah OTP verify-email-otp DULU, tapi server
 *  emailAndPassword TANPA requireEmailVerification (lib/auth.ts) â†’ direct
 *  API sign-up VALID + autoSignIn, set-cookie better-auth.session_token.)
 *
 * Aturan: --stamp wajib | --help | --dry-run (LIST aksi, NOL tulis) |
 * password HANYA via env E2E_FACTORY_PASSWORD (JANGAN di file!) |
 * token di factory.json MAKS 8 char + "...".
 *
 * Contoh: node scripts/e2e-factory.mjs --stamp 20260923-0900
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const STAMP_RE = /^\d{8}-\d{4}$/;
const COOKIES = ["better-auth.session_token", "kaoskami-auth.session_token"];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (s) => String(s ?? "").slice(0, 8) + "...";
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (isi dari kaos-kami-web/.env.local, JANGAN commit)`);
  return v;
}

if (has("--help")) {
  console.log(`e2e-factory â€” buat 4 akun e2e-<stamp>-r{1..4}@kaoskami.test
Pakai: node scripts/e2e-factory.mjs --stamp YYYYMMDD-HHMM [--dry-run] [--base-url URL]
Env: E2E_FACTORY_PASSWORD (wajib saat run asli) | BASE_URL (default ${BASE})
Out: Blueprint/e2e/hasil-pengujian-e2e/<stamp>/factory.json`);
  process.exit(0);
}

const STAMP = val("--stamp") || process.env.RUN_STAMP || "";
if (!STAMP_RE.test(STAMP)) {
  console.error("REFUSE: RUN_STAMP wajib format YYYYMMDD-HHMM (--stamp atau env RUN_STAMP).");
  process.exit(2);
}
const DRY = has("--dry-run");
const OUT_DIR = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", STAMP);
const slots = [1, 2, 3, 4].map((n) => ({
  slot: `r${n}`,
  email: `e2e-${STAMP}-r${n}@kaoskami.test`,
  name: `E2E ${STAMP} R${n}`,
}));

if (DRY) {
  console.log(`[dry-run] stamp=${STAMP} base=${BASE}`);
  for (const s of slots) console.log(`[dry-run] POST /api/auth/sign-up/email â†’ ${s.email}`);
  console.log(`[dry-run] tulis ${path.join(OUT_DIR, "factory.json")} (token terpotong 8 char)`);
  console.log("[dry-run] assign STAFF: SKIP (role input:false) + catat cara manual");
  process.exit(0);
}

const PASSWORD = requireEnv("E2E_FACTORY_PASSWORD");
if (has("--prod") && process.env.E2E_PROD_CONFIRM !== "YA") {
  console.error("REFUSE: --prod butuh E2E_PROD_CONFIRM=YA + konfirmasi owner.");
  process.exit(2);
}

const accounts = [];
let failed = 0;
for (const s of slots) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    signal: AbortSignal.timeout(60000), // PANDUAN §10: timeout anti-gantung
    method: "POST",
    // Origin WAJIB localhost:3000 (masuk trustedOrigins dev!) walau POST ke 127.0.0.1 (anti-gantung!).
    // JANGAN tambah 127.0.0.1 ke trustedOrigins app (keputusan produk!) — ini trik test-only yang sah.
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email: s.email, password: PASSWORD, name: s.name }),
  });
  if (res.status === 429) {
    console.error(`STOP 429 saat ${s.email} â€” JANGAN retry buta (tunggu + ulangi manual).`);
    failed++;
    break;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`GAGAL ${s.email}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
    failed++;
    await sleep(1200);
    continue;
  }
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const row = setCookies.find((c) => c.startsWith("better-auth.session_token="));
  const token = row ? row.split(";")[0].slice("better-auth.session_token=".length) : "";
  const userId = body?.user?.id || body?.data?.user?.id || "";
  console.log(`OK ${s.email} userId=${short(userId)} sess=${short(token)}`);
  accounts.push({ ...s, userId, sessionTokenPreview: short(token), cookieReady: !!token });
  await sleep(1200);
}

const factory = {
  _aturan: "Token MAKS 8 char + '...'. Password TIDAK disimpan (env E2E_FACTORY_PASSWORD).",
  runStamp: STAMP,
  baseUrl: BASE,
  createdAt: new Date().toISOString(),
  cookies: COOKIES,
  accounts,
  staffAssign: {
    status: "SKIP-via-API",
    reason: "auth.ts: role input:false â€” pendaftar tak bisa kirim role (anti eskalasi ADMIN).",
    manual: [
      "Opsi 1 (dashboard): login SUPER_ADMIN â†’ /admin/customers â†’ role e2e-<stamp>-r1 â†’ PRODUCTION_STAFF.",
      "Opsi 2 (Turso): UPDATE \"User\" SET role='PRODUCTION_STAFF' WHERE email='e2e-<stamp>-r1@kaoskami.test';",
    ],
  },
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "factory.json"), JSON.stringify(factory, null, 2));
console.log(`factory.json â†’ ${OUT_DIR} (${accounts.length}/4 akun)`);
if (failed > 0) process.exit(1);
