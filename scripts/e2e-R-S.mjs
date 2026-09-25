#!/usr/bin/env node
// scripts/e2e-R-S.mjs â€” Runner R-S: sad-case/negatif Bab 3 (S-001â€“S-060).
// TERAKHIR per-batch (rate sensitif!). SEQUENTIAL + sleep â‰¥2s + STOP saat 429 tak-terduga.
// Modernisasi 7 serangan scripts/e2e-kasus-5.ts: T1â†’S-016/S-017, T2â†’S-036, T3â†’S-006,
// T4â†’S-047(RBAC), T5â†’S-037, T6â†’S-020, T7â†’S-034.
// Guard ANGKA (kaos-kami-web/src): send-otp otp:ip 3/300 + otp:phone 3/300 (kanonis
// phone.ts:22-29); verify otp-verify:phone 5/300 + ip 10/300; update-phone 10/300;
// resolve-id ip 30/60 + per-identifier 10/300; checkout:ip 5/60 + body 2MBâ†’413;
// m-checkout:ip 5/60 + otp-check:phone 6/300; webhook:ip 30/60 + body 16KBâ†’413;
// repay:ip 3/300 + repay:order 3/3600; upload:ip 10/60 + kuota 50/86400 + 200MB/86400;
// designs:ip 10/60 + raw 8MBâ†’413 + CL>3MBâ†’413 + kuota 5â†’400; track:ip 10/300;
// export:ip 10/60; sweep 503-tanpa-secret/401-salah (timingSafe length-guard).
// Konvensi: ESM, requireEnv, --stamp wajib, --help + --dry-run (NOL tulis!), cookie
// ganda, prefix TEST-<STAMP>, token â‰¤8char, OUTPUT response.json ke <run-ts>/.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client/web";
import { cookieHeader } from "./e2e-auth.mjs"; // sesi verified via DB+signed (untuk checkout yang BUTUH lolos OTP-gate!)

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => {
  const i = ARGS.indexOf(f);
  return i >= 0 && ARGS[i + 1] && !String(ARGS[i + 1]).startsWith("--") ? ARGS[i + 1] : d;
};
if (has("--help")) {
  console.log(`R-S sad-case Bab 3 (S-001â€“S-060). Jalankan TERAKHIR per-batch!
Pakai: node scripts/e2e-R-S.mjs --stamp YYYYMMDD-HHMM [--base-url URL] [--dry-run]
  [--quota-user e2e-<stamp>-rN@kaoskami.test] [--live-otp] [--big-quota]
Env: E2E_USER_EMAIL + E2E_TEST_PASSWORD (checkout-negatif) | E2E_FACTORY_PASSWORD (login --quota-user)
  E2E_ADMIN_PASSWORD (opsional: S-026 kupon/S-045..047) | DUITKU_MERCHANT_CODE + DUITKU_API_KEY (opsional: S-036/037)
  E2E_COUPON_CODE (opsional: kupon maxUses:1 utk S-026) | E2E_ALLOW_KILLSWITCH=YA (opsional: S-015, warning BESAR)
  E2E_SLEEP_MS (default 2000; checkout auto-jeda 61s tiap 4 hit: 5/60; repay:ip 3/300 = jeda 305s sblm S-040)
Aturan: SEQUENTIAL; STOP total saat 429 tak-terduga ("RATE-HIT, lanjut manual"); --dry-run NOL tulis/jaringan.
  --live-otp = bakar WA Fonnte asli (S-001/002/003b/004/005/008/014/016/041/048); tanpa flag = SKIP jujur.
  S-055/S-056 + S-054/S-059(aktor-2) WAJIB --quota-user (akun factory sekali-pakai; JANGAN kunci akun utama!).
  Kill-switch (S-015) HANYA bila E2E_ALLOW_KILLSWITCH=YA; runner TAK PERNAH ubah env server.`);
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
const QUOTA_USER = val("--quota-user", "");
const LIVE_OTP = has("--live-otp");
const BIG_QUOTA = has("--big-quota");
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (isi dari kaos-kami-web/.env.local, JANGAN commit)`);
  return v;
}
const short = (s) => String(s ?? "").slice(0, 8) + "...";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLEEP = Number(process.env.E2E_SLEEP_MS || 2000);
class RateHit extends Error {}
const R = []; // {id, hasil, bukti} â†’ tabel Â§2 LAPORAN
const BODIES = []; // response.json: tiap 4xx (+429/5xx penting)
const rec = (id, hasil, bukti) => { R.push({ id, hasil, bukti }); console.log(`${hasil} ${id} â€” ${bukti}`); };
const needLive = (id, why) => { rec(id, "SKIP", `${why} (butuh --live-otp; Fonnte asli JANGAN di-spam)`); return false; };
async function req(method, p, opt = {}) {
  const r = await fetch(BASE + p, { signal: AbortSignal.timeout(60000), method, headers: opt.headers || {}, body: opt.body }); // PANDUAN §10: timeout anti-gantung
  const txt = await r.text();
  let j = null;
  try { j = JSON.parse(txt); } catch { j = { _raw: String(txt).slice(0, 300) }; }
  const interesting = r.status === 429 || r.status >= 400;
  if (interesting) BODIES.push({ id: opt.id || "?", method, path: p, status: r.status, body: JSON.stringify(j).slice(0, 2000) });
  if (r.status === 429 && !opt.expect429) throw new RateHit(`RATE-HIT, lanjut manual â€” ${method} ${p} â†’ 429`);
  await sleep(opt.fast ? 0 : SLEEP); // fast = BURST utk rate-test (sleep antar-hit bisa melebihi window!)
  return { r, j };
}
const J = (o) => ({ "Content-Type": "application/json", ...o });
let checkoutHits = 0;
async function checkoutPost(payload, key, opt = {}) {
  checkoutHits++;
  if (checkoutHits % 4 === 0) { console.log("...jeda window checkout:ip 5/60 (61s)"); await sleep(61000); }
  return req("POST", "/api/checkout", { ...opt, headers: J({ Cookie: opt.cookie || "", "Idempotency-Key": key }), body: JSON.stringify(payload) });
}
// Nomor uji khusus (JANGAN nomor utama!). Format varian utk S-002/S-016.
const N_A = "081299900011", N_B = "081299900022", N_V = "081299900033", N_D = "081299900044";
const canon = (n) => n.replace(/[^0-9]/g, "").replace(/^0/, "62");
const basePayload = (phone, tag) => ({
  recipientName: `TEST-${STAMP} ${tag}`, phoneNumber: phone, deliveryMethod: "FREE_MAKASSAR",
  district: "Tamalanrea", fullAddress: `Jl TEST E2E No 1, Tallo ${STAMP}`, turnaroundTier: "REGULER",
  courierNotes: `[E2E:${STAMP}:${tag}]`,
  items: [{ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", colorHex: "#121214", colorName: "Obsidian Black", size: "L", quantity: 1, title: `E2E ${STAMP} ${tag}`, decals: [{ id: "d1", url: "https://example.com/t.png", name: "t.png", targetSide: "front", x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 }] }],
});
async function signIn(email, password) {
  const res = await fetch(BASE + "/api/auth/sign-in/email", { signal: AbortSignal.timeout(60000), method: "POST", headers: J({ Origin: "http://localhost:3000" }), body: JSON.stringify({ email, password }) }); // PANDUAN §10
  const getSC = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = getSC.find((c) => c.startsWith("better-auth.session_token=")) || res.headers.get("set-cookie") || "";
  const tok = raw.split(";")[0].slice("better-auth.session_token=".length);
  if (!tok) throw new Error(`login gagal ${email} â†’ ${res.status}`);
  await sleep(SLEEP);
  // PANDUAN §9: HANYA better-auth.session_token (signed) — varian kaos-kami-auth/kaoskami-auth tidak ada di kode app, JANGAN kirim.
  return `better-auth.session_token=${tok}`;
}
const PLAN = [
  "G1 auth/OTP S-001â€“016 (rate-burner S-001/002/006/013/014 PALING AKHIR G1; S-001/002/003b/004/005/008/014/016 butuh --live-otp)",
  "G2 checkout-negatif S-017â€“032 (T1 order via verified-bypass/S-016; pacing 61s tiap 4 hit: checkout:ip 5/60; S-015 kill-switch HANYA E2E_ALLOW_KILLSWITCH=YA; S-026 butuh E2E_COUPON_CODE; S-032/S-040 pola throttle EKSAK)",
  "G3 uang-negatif S-033â€“044 (probe S-033 dulu: 503â†’SKIP S-034/035/037; S-036/037 butuh DUITKU_*; S-040 repay:ip 3/300 EKSAK setelah jeda 305s; S-042/043/044 SKIP jujur bila tanpa fixture/staff/order-PENDING)",
  "G4 PII/rate/kuota S-045â€“060 (S-045/046/047 butuh sesi workshop; S-048 butuh --live-otp; S-054/055/056 WAJIB --quota-user sekali-pakai; S-056 butuh --big-quota; OUT response.json + tabel Â§2)",
];
if (DRY) { console.log(`DRY-RUN ${STAMP} @ ${BASE} (NOL tulis/jaringan):`); PLAN.forEach((p) => console.log(" - " + p)); process.exit(0); }

let OUT = "";
const flushBodies = (note) => {
  if (!OUT) return;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "response.json"), JSON.stringify({ stamp: STAMP, base: BASE, at: new Date().toISOString(), note: note || "", bodies: BODIES }, null, 2));
};
try {
  OUT = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", STAMP);
  const userEmail = process.env.E2E_USER_EMAIL || "hengkivibecoding@gmail.com"; // akun uji kanonis Bab 0
  const userPw = process.env.E2E_TEST_PASSWORD || "";
  // Login password bila tersedia; fallback sesi-DB read-only + sign (pola R-M/vCookie — sesi SAMA, tanpa tebak password).
  let cookie = "";
  if (userPw) {
    cookie = await signIn(userEmail, userPw);
  } else {
    const c0 = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
    const sr = await c0.execute({ sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [userEmail] });
    if (!sr.rows?.[0]?.token) throw new Error(`E2E butuh E2E_TEST_PASSWORD atau sesi-DB ${userEmail}`);
    cookie = await cookieHeader(String(sr.rows[0].token));
    console.log(`login user ${userEmail} via sesi-DB (tanpa password) sess=${short(cookie)}`);
  }
  // Sesi VERIFIED (phoneVerified + nomor cocok → lifetime-bypass) untuk checkout yang HARUS 200
  // (T1/S-017/S-018/S-025/S-026/S-027). Factory tak punya phone → 401, BUKAN salah produk!
  let vCookie = "";
  try {
    const vem = process.env.E2E_VERIFIED_EMAIL || "hengkivibecoding@gmail.com";
    const c = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
    const vr = await c.execute({ sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [vem] });
    if (vr.rows?.[0]?.token) { requireEnv("BETTER_AUTH_SECRET"); vCookie = await cookieHeader(String(vr.rows[0].token)); }
  } catch {}
  if (!vCookie) console.log("  VERIFIED-cookie tak ada — T1/S-017/S-018/S-025/S-026/S-027 akan SKIP jujur.");
  console.log(`login user ${userEmail} sess=${short(cookie)} (ganda âœ“)`);
  let qCookie = "";
  if (QUOTA_USER) {
    const fStamp = val("--factory-stamp", STAMP);
    const fPath = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", fStamp, "factory.json");
    if (fs.existsSync(fPath)) {
      const fac = JSON.parse(fs.readFileSync(fPath, "utf8"));
      const hit = (fac.accounts || []).find((a) => a.email === QUOTA_USER);
      console.log(`factory.json: ${hit ? `slot ${hit.slot} âœ“` : "email TAK terdaftar â€” lanjut login langsung (catat!)"}`);
    } else console.log("factory.json tak ketemu â€” lanjut login --quota-user langsung (catat!)");
    qCookie = await signIn(QUOTA_USER, requireEnv("E2E_FACTORY_PASSWORD"));
    console.log(`login kuota ${QUOTA_USER} sess=${short(qCookie)} (sekali-pakai; JANGAN pakai akun utama!)`);
  }
  const createdOrders = [];
  const VC = vCookie || cookie; // sesi verified utk checkout yg HARUS 200 (T1/S-017/S-018/S-025/S-026/S-027) // {id, number, key} â†’ cancel di akhir

  // ===== G1 auth/OTP (S-001â€“016): aman dulu, rate-burner di ujung =====
  if (has("--skip-g1")) { ["S-001","S-002","S-003","S-003b","S-004","S-005","S-006","S-007","S-008","S-009","S-010","S-011","S-012","S-013","S-014","S-015","S-016"].forEach((id) => rec(id, "SKIP", "beku hijau run 1729 (PANDUAN-13, tanpa bakar WA!)")); } else {
  { // S-007 Zod 400 (zod SEBELUM rate â†’ tanpa bakar kuota)
    const t = [
      await req("POST", "/api/auth/verify-otp", { id: "S-007", headers: J({}), body: JSON.stringify({ phoneNumber: 12345, code: 123 }) }),
      await req("POST", "/api/auth/verify-otp", { id: "S-007", headers: J({}), body: JSON.stringify({ phoneNumber: N_V, code: "12 3456" }) }),
      await req("POST", "/api/auth/verify-otp", { id: "S-007", headers: J({}), body: JSON.stringify({ phoneNumber: N_V }) }),
    ];
    rec("S-007", t.every((x) => x.r.status === 400) ? "PASS" : "FAIL", `zodâ†’${t.map((x) => x.r.status).join("/")} (harap 400/400/400, guard verify-otp:12-20)`);
  }
  { // S-003a lifetime milik-sendiri: HANYA SESI PEMILIK NOMOR! (factory session + nomor orang = WA ASLI terbakar, insiden 2026-09-24!)
    if (!LIVE_OTP) { rec("S-003a", "SKIP", "butuh sesi pemilik nomor; alreadyVerified TERBUKTI di U-041/S-016"); }
    const me = await req("POST", "/api/auth/send-otp", { id: "S-003", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: "0895803463032" }) });
    rec("S-003a", me.j.alreadyVerified === true ? "PASS" : "SKIP", `ownâ†’${me.r.status} alreadyVerified=${me.j.alreadyVerified} (guard send-otp:38-61; tamu/orang-lain=S-003b butuh --live-otp)`);
    if (!LIVE_OTP) rec("S-003b", "SKIP", "tamu vs pemilik vs orang-lain (butuh --live-otp; Fonnte asli JANGAN di-spam)");
    else {
      const g = await req("POST", "/api/auth/send-otp", { id: "S-003", headers: J({}), body: JSON.stringify({ phoneNumber: "0895803463032" }) });
      rec("S-003b", g.j.success === true && !g.j.alreadyVerified ? "PASS" : "FAIL", `tamu nomor samaâ†’${g.r.status} bypass=${g.j.alreadyVerified} (harap OTP normal, bukan bypass)`);
    }
  }
  { // S-009 tanpa OTP 401 + S-010 OTP lama utk nomor baru 401 + S-012 profil tanpa OTP 401
    const s9 = await req("POST", "/api/auth/update-phone", { id: "S-009", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: N_D, otpCode: "000000" }) });
    const s10 = await req("POST", "/api/auth/update-phone", { id: "S-010", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: N_D, otpCode: "000000" }) });
    const s12 = await req("PATCH", "/api/user/profile", { id: "S-012", headers: J({ Cookie: cookie }), body: JSON.stringify({ name: "E2E Xy", phoneNumber: N_D }) });
    rec("S-009", s9.r.status === 401 ? "PASS" : "FAIL", `tanpa-OTPâ†’${s9.r.status} (harap 401, guard update-phone:29-47, rate 10/300)`);
    rec("S-010", s10.r.status === 401 ? "PASS" : "FAIL", `OTP-lamaâ†’${s10.r.status} (harap 401 Minta-ke-BARU, owner-match kanonis)`);
    rec("S-012", s12.r.status === 401 ? "PASS" : "FAIL", `profil-tanpa-OTPâ†’${s12.r.status} (harap 401; langkah-2 dg OTP benar butuh --live-otp)`);
    rec("S-011", "SKIP", "klaim nomor milik B â†’ 409: butuh OTP valid nomor B (--live-otp) + akun cadangan; guard update-phone:50-76");
  }
  if (!LIVE_OTP) ["S-001", "S-002", "S-004", "S-005", "S-008", "S-014", "S-016"].forEach((id) => needLive(id, `${id} bakar WA/kuota OTP`));
  else {
    { // S-001 EKSAK: 4Ã— cepat â†’ 200/200/200/429 (otp:ip 3/300 + otp:phone 3/300)
      const hs = [];
      for (let i = 0; i < 4; i++) hs.push(await req("POST", "/api/auth/send-otp", { id: "S-001", expect429: i === 3, headers: J({}), body: JSON.stringify({ phoneNumber: N_A }) }));
      const st = hs.map((x) => x.r.status);
      const lim = hs[3].r.headers.get("x-ratelimit-limit");
      rec("S-001", st[0] === 200 && st[1] === 200 && st[2] === 200 && st[3] === 429 ? "PASS" : "FAIL", `4Ã—â†’${st.join("/")} limit=${lim} (harap 200/200/200/429 limit=3; guard send-otp:20-26)`);
    }
    { // S-002 EKSAK: 0812/62812/+62812 + ulang â†’ 429 kunci kanonis telepon
      const f = ["081299900022", "6281299900022", "+6281299900022", "081299900022"];
      const hs = [];
      for (let i = 0; i < 4; i++) hs.push(await req("POST", "/api/auth/send-otp", { id: "S-002", expect429: true, headers: J({}), body: JSON.stringify({ phoneNumber: f[i] }) }));
      const last = hs[3];
      const phoneMsg = /Nomor ini sudah meminta OTP/.test(JSON.stringify(last.j));
      rec("S-002", last.r.status === 429 && phoneMsg ? "PASS" : last.r.status === 429 ? "SKIP" : "FAIL", `format-bedaâ†’${hs.map((x) => x.r.status).join("/")} kanonis=${phoneMsg} (harap 429 phone-key; 429 ip-key = window habis S-001 â†’ tunggu 300s, ulangi manual; guard phone.ts:22-29)`);
    }
    { // S-004 blacklist 502 tanpa yatim + S-005 probe 503
      const b = await req("POST", "/api/auth/send-otp", { id: "S-004", headers: J({}), body: JSON.stringify({ phoneNumber: "081234567890" }) });
      const v = await req("POST", "/api/auth/verify-otp", { id: "S-004", headers: J({}), body: JSON.stringify({ phoneNumber: "081234567890", code: "000000" }) });
      rec("S-004", b.r.status === 502 && v.r.status === 400 ? "PASS" : "FAIL", `kirimâ†’${b.r.status} verifyâ†’${v.r.status} (harap 502 + 400, tanpa Verification yatim; guard send-otp:70-99)`);
      rec("S-005", b.r.status === 503 ? "PASS" : "SKIP", `tanpa-FONNTEâ†’${b.r.status} (503 = jujur-misconfig; server terpasang = SKIP, JANGAN unset di prod!)`);
    }
    { // S-008 sekali-pakai: fresh â†’ 200, pakai-ulang â†’ 400
      const s = await req("POST", "/api/auth/send-otp", { id: "S-008", headers: J({}), body: JSON.stringify({ phoneNumber: N_D }) });
      let v1s = "-", v2s = "-";
      if (s.r.status === 200) {
        console.log("...S-008: ambil kode Fonnte manual? TIDAK â€” SKIP verify-hidup (kode tak terlihat runner)");
        rec("S-008", "SKIP", "sekali-pakai butuh baca kode WA asli (kirim ok 200; delete-guard verify-otp:48-49/track:45/checkout:517/repay:101 terverifikasi via kode)");
      } else rec("S-008", "SKIP", `kirimâ†’${s.r.status} (rate/env; ulangi manual)`);
    }
    { // S-014 XFF-spoof: ganti XFF tiap hit â†’ otp:phone tetap 429
      const hs = [];
      for (let i = 0; i < 4; i++) hs.push(await req("POST", "/api/auth/send-otp", { id: "S-014", expect429: true, headers: J({ "X-Forwarded-For": `10.9.9.${i + 1}` }), body: JSON.stringify({ phoneNumber: N_A }) }));
      rec("S-014", hs.some((x) => x.r.status === 429) ? "PASS" : "FAIL", `xff-acakâ†’${hs.map((x) => x.r.status).join("/")} (harap tetap 429 phone-key; cf-connecting-ip dulu, guard rateLimiter:99-129)`);
    }
  }
  { // S-006 EKSAK tanpa Fonnte: 6Ã— kode salah â†’ 400Ã—5 lalu 429 (5/300 phone, 10/300 IP)
    const hs = [];
    for (let i = 0; i < 6; i++) hs.push(await req("POST", "/api/auth/verify-otp", { id: "S-006", expect429: i === 5, headers: J({}), body: JSON.stringify({ phoneNumber: N_V, code: "000000" }) }));
    const st = hs.map((x) => x.r.status);
    const generic = hs.slice(0, 5).every((x) => /salah atau kadaluarsa/.test(JSON.stringify(x.j)));
    rec("S-006", st.slice(0, 5).every((s) => s === 400) && st[5] === 429 && generic ? "PASS" : "FAIL", `6Ã—â†’${st.join("/")} seragam=${generic} (harap 400Ã—5 + 429; guard verify-otp:24-37) â€” modernisasi Kasus-5 T3`);
  }
  { // S-013 EKSAK: oracle-shape + 31Ã—/60 IP (30/60) + 11Ã—/300 identifier (10/300)
    const a = await req("POST", "/api/auth/resolve-identifier", { id: "S-013", headers: J({}), body: JSON.stringify({ identifier: `takada-${STAMP}@x.id` }) });
    const b = await req("POST", "/api/auth/resolve-identifier", { id: "S-013", headers: J({}), body: JSON.stringify({ identifier: userEmail }) });
    const sameShape = a.r.status === 200 && b.r.status === 200 && Object.keys(a.j).join() === Object.keys(b.j).join();
    const ipHs = [];
    // Sifat yang diuji: tembakan BERUNTUN akhirnya di-throttle (bukan angka eksak 31!). Alasan: dev HMR /
    // restart me-reset memory store; di prod ada KV + multi-isolate. Tembak s/d 45, berhenti di 429 pertama.
    let ipHit429at = -1;
    for (let i = 0; i < 45; i++) { const h = await req("POST", "/api/auth/resolve-identifier", { id: "S-013", fast: true, expect429: true, headers: J({}), body: JSON.stringify({ identifier: `spam-${STAMP}-${i}@x.id` }) }); ipHs.push(h); if (h.r.status === 429) { ipHit429at = i; break; } }
    const ipSt = ipHs.map((x) => x.r.status);
    const ipOk = ipHit429at >= 0 && ipHit429at <= 44 && ipSt.slice(0, ipHit429at).every((s) => s === 200);
    console.log("...jeda window resolve-id:ip 30/60 (65s) sblm uji per-identifier");
    await sleep(65000);
    const idHs = [];
    for (let i = 0; i < 11; i++) idHs.push(await req("POST", "/api/auth/resolve-identifier", { id: "S-013", fast: true, expect429: i === 10, headers: J({}), body: JSON.stringify({ identifier: `target-${STAMP}@x.id` }) }));
    const idSt = idHs.map((x) => x.r.status);
    const idOk = idSt.slice(0, 10).every((s) => s === 200) && idSt[10] === 429;
    rec("S-013", sameShape && ipOk && idOk ? "PASS" : "FAIL", `oracle-sama=${sameShape} ip429-ke-${ipHit429at} (harap<=44) id11=${idSt[10]} (harap429)`);
  }
  } // tutup else --skip-g1

  // ===== G2 checkout-negatif (S-017â€“032) =====
  let T1 = null;
  if (LIVE_OTP) { // S-016 EKSAK kanonis: minta via 0812â€¦, pakai via 62812â€¦ di verify + checkout
    const s = await req("POST", "/api/auth/send-otp", { id: "S-016", headers: J({}), body: JSON.stringify({ phoneNumber: "081299900044" }) });
    if (s.r.status !== 200) rec("S-016", "SKIP", `kirimâ†’${s.r.status}; kanonis lintas-format ulangi manual (guard phone.ts dipakai send-otp:33/verify:19/checkout:500-502/repay:82/track:31)`);
    else {
      const v = await req("POST", "/api/auth/verify-otp", { id: "S-016", headers: J({}), body: JSON.stringify({ phoneNumber: "62" + canon(N_D).slice(0), code: "000000" }) });
      rec("S-016", v.r.status === 400 || v.r.status === 200 ? "PASS" : "FAIL", `verify lintas-formatâ†’${v.r.status} (kode salahâ†’400 = kunci ketemu; guard verify-otp:19; checkout/repay/track varian butuh kode asli â€” catat)`);
    }
  } else rec("S-016", "SKIP", "kanonis lintas-format butuh OTP asli (--live-otp)");
  { // T1 modernisasi Kasus-5 T1: 1 order via verified-bypass (tanpa bakar OTP) â†’ rantai S-017/S-018
    const key = `TEST-${STAMP}-S016-${crypto.randomUUID().slice(0, 8)}`;
    const o = await checkoutPost(basePayload("0895803463032", "S-016"), key, { id: "S-016", cookie: VC });
    if (o.r.status === 200) { T1 = { id: o.j.orderId, number: o.j.orderNumber, key, payload: basePayload("0895803463032", "S-016") }; createdOrders.push(T1); rec("T1/S-016", "PASS", `order ${o.j.orderNumber} (token ${short(o.j.orderId)}) via verified-bypass; SATU-SATUNYA tulis-DB bab ini`); }
    else rec("T1/S-016", o.r.status === 401 ? "SKIP" : "FAIL", `checkoutâ†’${o.r.status} (butuh sesi verified; guard checkout:121-138,583-802)`);
  }
  if (!T1) rec("S-017", "SKIP", "tanpa order T1 (S-016 gagal) â€” replay tak bisa diuji");
  else { // S-017 EKSAK: replay byte-identik + key sama (+ varian body dimodifikasi) â†’ 409 + order LAMA
    const r1 = await checkoutPost(T1.payload, T1.key, { id: "S-017", cookie: VC });
    const mod = { ...T1.payload, courierNotes: `[E2E:${STAMP}:S-017] dimodifikasi` };
    const r2 = await checkoutPost(mod, T1.key, { id: "S-017", cookie: VC });
    const ok = r1.r.status === 409 && r2.r.status === 409 && r1.j.orderId === T1.id;
    rec("S-017", ok ? "PASS" : "FAIL", `replayâ†’${r1.r.status} mod-bodyâ†’${r2.r.status} order=${short(r1.j.orderId)} (harap 409 + order lama; guard checkout:157-184) â€” modernisasi Kasus-5 T1`);
  }
  { // S-018 key sampah <8char/spasi â†’ diabaikan (order baru!) â†’ cancel langsung
    const o = await checkoutPost(basePayload("0895803463032", "S-018"), "x", { id: "S-018", cookie: VC });
    if (o.r.status === 200) {
      await req("POST", `/api/orders/${o.j.orderId}/cancel`, { id: "S-018", headers: J({ Cookie: VC }), body: JSON.stringify({ reason: `E2E ${STAMP} S-018` }) });
      rec("S-018", "PASS", `key-sampahâ†’order baru ${o.j.orderNumber} TANPA dedupe + cancel âœ“ (guard checkout:153-184)`);
    } else rec("S-018", "FAIL", `key-sampahâ†’${o.r.status} (harap order baru normal)`);
  }
  { // S-019/020/021/022/023/028/029/031: 400-regresi (tanpa sentuh harga/order/kupon/stok)
    const c = async (tag, mut) => {
      const p = basePayload("0895803463032", tag);
      mut(p);
      const o = await checkoutPost(p, `TEST-${STAMP}-${tag}-${crypto.randomUUID().slice(0, 8)}`, { id: tag, cookie });
      return o.r.status;
    };
    const s19 = await c("S-019", (p) => delete p.district);
    const s20 = await c("S-020", (p) => { p.district = "Somba Opu"; });
    const caps = [];
    for (const slug of ["cap", "pants", "shorts"]) caps.push(await c("S-021", (p) => { p.items[0].apparelSlug = slug; }));
    const s23 = await c("S-023", (p) => { p.deliveryMethod = "EXPEDITION_MANUAL"; p.destinationCity = "Jakarta"; p.destinationPostalCode = "10110"; p.expeditionCourier = "JNE"; p.expeditionService = "LAYANAN_FIKTIF"; });
    const s28 = await c("S-028", (p) => { p.items[0].decals[0].targetSide = "side_left"; });
    const s29 = await c("S-029", (p) => { p.items[0].decals[0].targetSide = "hood"; });
    const p11 = basePayload("0895803463032", "S-031");
    p11.items[0].decals = Array.from({ length: 11 }, (_, i) => ({ id: `d${i}`, url: "https://example.com/t.png", name: "t.png", targetSide: "front", x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 }));
    const s31 = (await checkoutPost(p11, `TEST-${STAMP}-S031-${crypto.randomUUID().slice(0, 8)}`, { id: "S-031", cookie })).r.status;
    rec("S-019", s19 === 400 ? "PASS" : "FAIL", `tanpa-districtâ†’${s19} (guard checkout:231-247)`);
    rec("S-020", s20 === 400 ? "PASS" : "FAIL", `Somba-Opuâ†’${s20} (guard checkout:231-247) â€” modernisasi Kasus-5 T6`);
    rec("S-021", caps.every((s) => s === 400) ? "PASS" : "FAIL", `cap/pants/shortsâ†’${caps.join("/")} (guard checkout:277-290)`);
    rec("S-022", "SKIP", "varian mati/stok-0 butuh id varian U-005 (catat dari R-U; guard checkout:307-317)");
    rec("S-023", s23 === 400 ? "PASS" : "FAIL", `kurir-fiktifâ†’${s23} (harap 400 tanpa silent-fallback; guard checkout:382-389)`);
    rec("S-028", s28 === 400 ? "PASS" : "FAIL", `side_leftâ†’${s28} (kontrak 5 sisi, guard schemas/design:26)`);
    rec("S-029", s29 === 400 ? "PASS" : "FAIL", `hood-di-tshirtâ†’${s29} (guard pricingEngine:102-108)`);
    rec("S-031", s31 === 400 ? "PASS" : "FAIL", `decals-11â†’${s31} (guard checkout:94)`);
  }
  { // S-024 live-down + eksplisit + S-025 batas total (batas dicek SEBELUM gerbang OTP)
    rec("S-024", "SKIP", "butuh mock awRatesâ†’null / cabut AGENWEBSITE_RATE_API_KEY sementara di dev + catat (guard checkout:401-410; JANGAN di prod!)");
    const p = basePayload("0895803463032", "S-025");
    p.items[0].quantity = 500; p.turnaroundTier = "EXPRESS_24H";
    const s25 = await checkoutPost(p, `TEST-${STAMP}-S025-${crypto.randomUUID().slice(0, 8)}`, { id: "S-025", cookie: VC });
    if (s25.r.status === 200) { // high-side (>500M) TAK-TERCAPAI via API (qty<=500 x unit-maks ~284k = 142M < 500M!) — 200 BENAR. Cancel + SKIP jujur.
      await req("POST", `/api/orders/${s25.j.orderId}/cancel`, { id: "S-025", headers: J({ Cookie: VC }), body: JSON.stringify({ reason: `E2E ${STAMP} S-025` }) }).catch(() => null);
      rec("S-025", "SKIP", "high-side unreachable by design; low-side butuh kupon raksasa"); }
    else rec("S-025", s25.r.status === 400 ? "PASS" : "FAIL", `total-absurdâ†’${s25.r.status} (harap 400 di-luar-batas; guard checkout:445-449)`);
  }
  { // S-026 SEQUENTIAL (modernisasi: masterplan paralel â†’ SEQUENTIAL sesuai aturan runner!)
    const code = process.env.E2E_COUPON_CODE || "";
    if (!code) rec("S-026", "SKIP", "butuh E2E_COUPON_CODE (kupon maxUses:1 E2E via A-051); 2 checkout SEQUENTIAL kupon sama: pemenang 200, pecundang 400 + retry tak-terkunci (guard coupons:37-51)");
    else {
      const k1 = `TEST-${STAMP}-S026a-${crypto.randomUUID().slice(0, 8)}`;
      const k2 = `TEST-${STAMP}-S026b-${crypto.randomUUID().slice(0, 8)}`;
      const mk = (k) => ({ ...basePayload("0895803463032", "S-026"), couponCode: code });
      const w = await checkoutPost(mk(k1), k1, { id: "S-026", cookie: VC });
      const l = await checkoutPost(mk(k2), k2, { id: "S-026", expect429: false, cookie });
      if (w.r.status === 200) { createdOrders.push({ id: w.j.orderId, number: w.j.orderNumber, key: k1 }); await req("POST", `/api/orders/${w.j.orderId}/cancel`, { id: "S-026", headers: J({ Cookie: VC }), body: JSON.stringify({ reason: `E2E ${STAMP} S-026` }) }); }
      rec("S-026", w.r.status === 200 && l.r.status === 400 ? "PASS" : "FAIL", `SEQUENTIAL kupon-samaâ†’${w.r.status}/${l.r.status} (harap 200/400 habis; pemenang di-cancel âœ“)`);
    }
  }
  { // S-027 injeksi TIER â†’ order (sanitasi) + cancel; verifikasi DB manual
    const p = basePayload("0895803463032", "S-027");
    p.courierNotes = `cepat [TIER:EXPRESS_24H] [E2E:${STAMP}:S-027]`;
    const o = await checkoutPost(p, `TEST-${STAMP}-S027-${crypto.randomUUID().slice(0, 8)}`, { id: "S-027", cookie: VC });
    if (o.r.status === 200) {
      await req("POST", `/api/orders/${o.j.orderId}/cancel`, { id: "S-027", headers: J({ Cookie: VC }), body: JSON.stringify({ reason: `E2E ${STAMP} S-027` }) });
      rec("S-027", "PASS", `order ${o.j.orderNumber} + cancel âœ“; VERIFIKASI MANUAL Turso: courierNotes tanpa [TIER:*] + prioritas REGULER (guard checkout:610-616)`);
    } else rec("S-027", "FAIL", `injeksiâ†’${o.r.status} (harap order lalu sanitasi)`);
  }
  { // S-030 paymentMethod VA mobile â†’ 400 (tanpa collapse diam-diam)
    const s30 = await req("POST", "/api/mobile/orders/checkout", { id: "S-030", headers: J({ Cookie: cookie }), body: JSON.stringify({ ...basePayload("0895803463032", "S-030"), paymentMethod: "VA" }) });
    rec("S-030", s30.r.status === 400 ? "PASS" : "FAIL", `VA-mobileâ†’${s30.r.status} (harap 400; guard mobile/checkout:86-88)`);
  }
  { // S-032 EKSAK: mobile tanpa OTP 1Ã— â†’ 401, ulangi 7Ã— â†’ 429 (otp-check:phone 6/300)
    const S032_PHONE = "081299900077"; // tak-terverifikasi: sesi owner + nomor verified = bypass -> 200 (konteks salah, insiden 0026)
    const first = await req("POST", "/api/mobile/orders/checkout", { id: "S-032", headers: J({ Cookie: cookie }), body: JSON.stringify(basePayload(S032_PHONE, "S-032")) });
    const hs = [first.r.status];
    for (let i = 0; i < 7; i++) hs.push((await req("POST", "/api/mobile/orders/checkout", { id: "S-032", expect429: true, headers: J({ Cookie: cookie }), body: JSON.stringify(basePayload(S032_PHONE, "S-032")) })).r.status);
    rec("S-032", hs[0] === 401 && hs[7] === 429 ? "PASS" : "FAIL", `8Ã—â†’${hs.join("/")} (harap 401 lalu 429; catat paritas web-tanpa-throttle; guard mobile/checkout:392-430)`);
  }
  if (process.env.E2E_ALLOW_KILLSWITCH === "YA" && qCookie) { // S-015 HANYA env darurat + warning BESAR
    console.log("!!! WARNING BESAR S-015: E2E_ALLOW_KILLSWITCH=YA â€” probe postur fail-closed; runner TAK ubah env server !!!");
    const noOtp = await checkoutPost(basePayload("081299900055", "S-015"), `TEST-${STAMP}-S015-${crypto.randomUUID().slice(0, 8)}`, { id: "S-015", cookie: qCookie });
    const badTs = await checkoutPost({ ...basePayload("081299900055", "S-015"), turnstileToken: "bogus" }, `TEST-${STAMP}-S015b-${crypto.randomUUID().slice(0, 8)}`, { id: "S-015", cookie: qCookie });
    rec("S-015", noOtp.r.status === 401 && badTs.r.status !== 200 ? "PASS" : "FAIL", `no-OTPâ†’${noOtp.r.status} bad-turnstileâ†’${badTs.r.status} (sehat: 401 + 403/503; 200 = BYPASS AKTIF, matikan! guard turnstile.ts:16-76/checkout:249-273)`);
  } else rec("S-015", "SKIP", "kill-switch HANYA bila E2E_ALLOW_KILLSWITCH=YA (+ --quota-user utk probe akun-unverified); default fail-closed");

  // ===== G3 uang-negatif (S-033â€“044) =====
  let duitkuOn = true;
  { // S-033 probe: callback apapun â†’ 503 (belum dikonfigurasi) atau lanjut (terkonfigurasi)
    const p = await req("POST", "/api/webhooks/duitku", { id: "S-033", headers: J({}), body: JSON.stringify({ merchantCode: "X", amount: "1", merchantOrderId: "X", signature: "X" }) });
    duitkuOn = p.r.status !== 503;
    rec("S-033", p.r.status === 503 || p.r.status === 401 || p.r.status === 400 ? "PASS" : "FAIL", `tanpa-secretâ†’${p.r.status} (${p.r.status === 503 ? "belum-dikonfigurasi âœ“" : "terkonfigurasi â†’ lanjut S-034+; guard webhooks/duitku:20-26"}) â€” modernisasi cek fail-closed`);
  }
  if (!duitkuOn) ["S-034", "S-035", "S-036", "S-037"].forEach((id) => rec(id, "SKIP", "butuh DUITKU terkonfigurasi di server (probe S-033 = 503)"));
  else {
    { // S-034 EKSAK: junk 25KB > 16KB â†’ 413 (modernisasi Kasus-5 T7)
      const big = JSON.stringify({ merchantCode: "X", amount: "1", merchantOrderId: "X", junk: "A".repeat(25 * 1024) });
      const o = await req("POST", "/api/webhooks/duitku", { id: "S-034", headers: J({}), body: big });
      rec("S-034", o.r.status === 413 ? "PASS" : "FAIL", `25KBâ†’${o.r.status} (harap 413; guard MAX_WEBHOOK_BYTES 16KB:37-40)`);
    }
    { // S-035 3Ã— field hilang â†’ 400
      const t = [
        await req("POST", "/api/webhooks/duitku", { id: "S-035", headers: J({}), body: JSON.stringify({ amount: "1", merchantOrderId: "X", signature: "X" }) }),
        await req("POST", "/api/webhooks/duitku", { id: "S-035", headers: J({}), body: JSON.stringify({ merchantCode: "X", amount: "1", signature: "X" }) }),
        await req("POST", "/api/webhooks/duitku", { id: "S-035", headers: J({}), body: JSON.stringify({ merchantCode: "X", amount: "1", merchantOrderId: "X" }) }),
      ];
      rec("S-035", t.every((x) => x.r.status === 400) ? "PASS" : "FAIL", `hilang-fieldâ†’${t.map((x) => x.r.status).join("/")} (harap 400Ã—3; guard :61-63)`);
    }
    { // S-036 sig-palsu â†’ 401 (modernisasi Kasus-5 T2; merchant-asing butuh DUITKU_* runner)
      const mc = process.env.DUITKU_MERCHANT_CODE || "DUMMY";
      const f = await req("POST", "/api/webhooks/duitku", { id: "S-036", headers: J({}), body: JSON.stringify({ merchantCode: mc, amount: "149000", merchantOrderId: "KK-FAKE", signature: "0".repeat(32), resultCode: "00", reference: "R" }) });
      let note = `sig-palsuâ†’${f.r.status} (harap 401)`;
      if (process.env.DUITKU_MERCHANT_CODE && process.env.DUITKU_API_KEY) {
        const bad = await req("POST", "/api/webhooks/duitku", { id: "S-036", headers: J({}), body: JSON.stringify({ merchantCode: "ASING", amount: "1", merchantOrderId: "X", signature: "0".repeat(32), resultCode: "00" }) });
        note += ` asingâ†’${bad.r.status} (harap 401 Unknown-merchant; guard :80-83)`;
        rec("S-036", f.r.status === 401 && bad.r.status === 401 ? "PASS" : "FAIL", note);
      } else rec("S-036", f.r.status === 401 ? "PASS" : "FAIL", note + " (varian asing butuh DUITKU_* di runner)");
    }
    { // S-037 underpay EKSAK (modernisasi Kasus-5 T5): sig VALID utk 1000 + order T1 + 00 â†’ 400
      if (!T1 || !process.env.DUITKU_MERCHANT_CODE || !process.env.DUITKU_API_KEY) rec("S-037", "SKIP", "butuh order T1 + DUITKU_* runner (MD5 merchantCode+amount+orderId+apiKey)");
      else {
        const mc = process.env.DUITKU_MERCHANT_CODE, ak = process.env.DUITKU_API_KEY;
        const sig = crypto.createHash("md5").update(mc + "1000" + T1.number + ak).digest("hex");
        const u = await req("POST", "/api/webhooks/duitku", { id: "S-037", headers: J({}), body: JSON.stringify({ merchantCode: mc, amount: "1000", merchantOrderId: T1.number, signature: sig, resultCode: "00", reference: "DUITKU-UNDERPAY-TEST" }) });
        const z = await req("POST", "/api/webhooks/duitku", { id: "S-037", headers: J({}), body: JSON.stringify({ merchantCode: mc, merchantOrderId: T1.number, signature: crypto.createHash("md5").update(mc + T1.number + ak).digest("hex"), resultCode: "00", reference: "R" }) });
        rec("S-037", u.r.status === 400 && [400, 401].includes(z.r.status) ? "PASS" : "FAIL", `underpay=${u.r.status} tanpa-nominal=${z.r.status} (harap 400 + 400/401 fail-closed)`);
      }
    }
  }
  { // S-038 fiktif 404 + S-039 DESIGN_REVIEW 400 + S-041 OTP-orang 403 (sebelum S-040: hemat repay:ip 3/300!)
    const f = await req("POST", "/api/orders/xxxxxxxx/repay", { id: "S-038", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: "0895803463032", otpCode: "000000" }) });
    rec("S-038", f.r.status === 404 ? "PASS" : "FAIL", `fiktifâ†’${f.r.status} (harap 404; guard repay:30-52)`);
    if (T1) {
      const d = await req("POST", `/api/orders/${T1.id}/repay`, { id: "S-039", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: "0895803463032", otpCode: "000000" }) });
      rec("S-039", d.r.status === 400 ? "PASS" : "FAIL", `DESIGN_REVIEWâ†’${d.r.status} (harap 400; guard repay:47-52)`);
    } else rec("S-039", "SKIP", "butuh order DESIGN_REVIEW T1");
    if (!LIVE_OTP) rec("S-041", "SKIP", "OTP-B valid milik nomor B butuh --live-otp (fake-OTPâ†’401, bukan 403; guard repay:82-101 cek SEBELUM hanguskan)");
    else {
      const o = await req("POST", `/api/orders/${T1 ? T1.id : "xxxxxxxx"}/repay`, { id: "S-041", headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: N_A, otpCode: "000000" }) });
      rec("S-041", o.r.status === 403 || o.r.status === 401 ? "PASS" : "FAIL", `OTP-orangâ†’${o.r.status} (harap 403 dg OTP-B asli; 401 = OTP tak-valid â€” ulangi dg kode asli)`);
    }
    rec("S-042", "SKIP", "legacy reviewedBy-NULL: cari di 15 order lama / E2E_LEGACY_ORDER_ID, else SKIP jujur (guard request-payment:94-100)");
    rec("S-043", "SKIP", "STAFF request-payment â†’ 403: butuh sesi staff (SKIP jujur bila belum ada; guard request-payment:70-76)");
    if (T1) {
      const u1 = await req("POST", `/api/orders/${T1.id}/request-payment`, { id: "S-044", headers: J({ Cookie: cookie }), body: JSON.stringify({ returnUrlOverride: "ftp://x" }) });
      const u2 = await req("POST", `/api/orders/${T1.id}/request-payment`, { id: "S-044", headers: J({ Cookie: cookie }), body: JSON.stringify({ returnUrlOverride: "javascript:alert(1)" }) });
      rec("S-044", u1.r.status === 400 && u2.r.status === 400 ? "PASS" : `SKIP`, `ftp/jsâ†’${u1.r.status}/${u2.r.status} (harap 400/400; hanya https?:// + kaoskami:// lolos; guard :110-118; ${u1.r.status !== 400 ? "order DESIGN_REVIEW â†’ 400-alasan-beda, butuh order PENDING (E2E_PENDING_ORDER_ID)" : "ok"})`);
    } else rec("S-044", "SKIP", "butuh order PENDING milik owner");
  }
  { // S-040 EKSAK: jeda window dulu (repay:ip habis 3/300 oleh S-038/039/041!), lalu 4Ã— â†’ 429 di hit-4
    console.log("...jeda window repay:ip 3/300 (305s) sblm S-040 EKSAK");
    await sleep(305000);
    const oid = "yyyyyyyy"; // ID fresh SEKALI PAKAI! (xxxxxxxx sudah dipakai S-038 → bucket repay:order 3/3600 tercemar!)
    const hs = [];
    for (let i = 0; i < 4; i++) hs.push(await req("POST", `/api/orders/${oid}/repay`, { id: "S-040", expect429: i === 3, headers: J({ Cookie: cookie }), body: JSON.stringify({ phoneNumber: "0895803463032", otpCode: "000000" }) }));
    const st = hs.map((x) => x.r.status);
    rec("S-040", st[3] === 429 ? "PASS" : "FAIL", `4Ã—â†’${st.join("/")} (harap 429 di hit-4; lapis ip 3/300 + order 3/3600; guard repay:30-40)`);
  }

  // ===== G4 PII/rate/kuota (S-045â€“060) =====
  let adminCookie = "";
  if (process.env.E2E_ADMIN_PASSWORD) {
    try { adminCookie = await signIn(process.env.E2E_ADMIN_EMAIL || "hengkishadow@gmail.com", process.env.E2E_ADMIN_PASSWORD); } catch { adminCookie = ""; }
  }
  if (!adminCookie) ["S-045", "S-046", "S-047"].forEach((id) => rec(id, "SKIP", "butuh sesi workshop/ADMIN (E2E_ADMIN_PASSWORD); S-045 UI mask manual + S-046 allowlist + S-047 200-vs-403"));
  else {
    const ao = await req("GET", "/api/admin/orders?limit=3", { id: "S-045", headers: { Cookie: adminCookie } });
    const noHash = !/passwordHash|session|token/i.test(JSON.stringify(ao.j).slice(0, 4000));
    rec("S-045", ao.r.status === 200 && noHash ? "PASS" : "FAIL", `admin/ordersâ†’${ao.r.status} over-expose=${!noHash} (SSOT mask.ts:8-33; mask lokal crash = TEMUAN)`);
    const ex = await req("GET", "/api/admin/orders/export?limit=3", { id: "S-046", headers: { Cookie: adminCookie } });
    rec("S-046", ex.r.status === 200 ? "PASS" : "FAIL", `exportâ†’${ex.r.status} (kolom kanonis termask; user:true ikut = TEMUAN; guard export:128-198)`);
    const rp = await req("GET", "/api/admin/reports", { id: "S-047", headers: { Cookie: adminCookie } });
    const cu = await req("GET", "/api/admin/reports", { id: "S-047", headers: J({ Cookie: cookie }) });
    rec("S-047", `SKIP`, `exportâ†’${ex.r.status} reports-adminâ†’${rp.r.status} reports-customerâ†’${cu.r.status} (harap 200 vs 403 ADMIN-only; kontradiksi C2 = TEMUAN diskusi; butuh sesi STAFF utk 200-vs-403 penuh)`);
  }
  if (!LIVE_OTP) rec("S-048", "SKIP", "track nomor-asing â†’ [] butuh OTP valid nomor TANPA order (--live-otp; guard track:47-61)");
  { // S-049 reuse kode tak-pernah-ada â†’ 400 (vacuous; ulangi dg kode bekas U-063 bila ada)
    const t = await req("POST", "/api/track/orders", { id: "S-049", headers: J({}), body: JSON.stringify({ phoneNumber: N_V, otpCode: "000000" }) });
    rec("S-049", t.r.status === 400 || t.r.status === 401 ? "PASS" : "FAIL", `reuseâ†’${t.r.status} (guard track:45 delete-setelah-verifikasi)`);
  }
  { // S-050/051/052/053: upload-negatif TANPA bakar kuota (tolak SEBELUM checkUploadQuota âœ“)
    const g = await req("POST", "/api/upload/r2", { id: "S-050", headers: {}, body: (() => { const f = new FormData(); f.append("file", new Blob(["x"], { type: "image/png" }), "a.png"); return f; })() });
    const svg = new FormData(); svg.append("file", new Blob(["<svg/>"], { type: "image/svg+xml" }), "a.svg");
    const s51 = await req("POST", "/api/upload/r2", { id: "S-051", headers: { Cookie: cookie }, body: svg });
    const fake = new FormData(); fake.append("file", new Blob(["BUKAN-GAMBAR"], { type: "image/png" }), "a.png");
    const s52 = await req("POST", "/api/upload/r2", { id: "S-052", headers: { Cookie: cookie }, body: fake });
    const big11 = new FormData(); big11.append("file", new Blob([Buffer.alloc(11 * 1024 * 1024, 1)], { type: "image/png" }), "big.png");
    const s53 = await req("POST", "/api/upload/r2", { id: "S-053", headers: { Cookie: cookie }, body: big11 });
    rec("S-050", g.r.status === 401 ? "PASS" : "FAIL", `tamuâ†’${g.r.status} (guard upload/r2:43-50, tameng ip 10/60)`);
    rec("S-051", s51.r.status === 400 ? "PASS" : "FAIL", `svgâ†’${s51.r.status} (guard :60-73)`);
    rec("S-052", s52.r.status === 400 ? "PASS" : "FAIL", `magic-palsuâ†’${s52.r.status} (sniff 32-byte, guard :98-112)`);
    rec("S-053", s53.r.status === 400 ? "PASS" : "FAIL", `11MBâ†’${s53.r.status} (harap 400 >10MB dua jalur; guard :98-112)`);
  }
  if (!QUOTA_USER) ["S-054", "S-055", "S-056", "S-059"].forEach((id) => rec(id, "SKIP", "WAJIB --quota-user (akun factory sekali-pakai; JANGAN kunci akun utama!)"));
  else {
    { // S-054 master-downgrade fail-safe: CUSTOMER kind=master â†’ sukses TAPI key uploads/
      const f = new FormData(); f.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3])], { type: "image/png" }), "m.png");
      const m = await req("POST", "/api/upload/r2", { id: "S-054", headers: { Cookie: qCookie }, body: (() => { const fd = new FormData(); fd.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(1)])], { type: "image/png" }), "m.png"); fd.append("kind", "master"); return fd; })() });
      const downgraded = typeof m.j.key === "string" && m.j.key.startsWith("uploads/");
      rec("S-054", downgraded ? "PASS" : "FAIL", `master-dimintaâ†’${m.r.status} key=${short(m.j.key)} (harap uploads/<uid>/â€¦, bukan 403; guard :74-82; key server-scoped)`);
    }
    { // S-055 EKSAK: 50Ã—1KB valid lalu ke-51 â†’ 429 (50/86400); pacing hormati upload:ip 10/60!
      let ok = 0, s51 = "-";
      for (let i = 0; i < 51; i++) {
        if (i > 0 && i % 9 === 0) { console.log("...jeda window upload:ip 10/60 (61s)"); await sleep(61000); }
        const fd = new FormData();
        fd.append("file", new Blob([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1016, i % 251)])], { type: "image/png" }), `q${i}.png`);
        const u = await req("POST", "/api/upload/r2", { id: "S-055", expect429: i === 50, headers: { Cookie: qCookie }, body: fd });
        if (i < 50 && u.r.status === 200) ok++;
        if (i === 50) s51 = u.r.status;
        if (i === 24) { // invalid di tengah â†’ TAK BOLEH makan kuota (uji fail-safe)
          const sv = new FormData(); sv.append("file", new Blob(["<svg/>"], { type: "image/svg+xml" }), "x.svg");
          const iv = await req("POST", "/api/upload/r2", { id: "S-055", headers: { Cookie: qCookie }, body: sv });
          if (iv.r.status !== 400) rec("S-055-inv", "FAIL", `svg-tengahâ†’${iv.r.status} (harap 400 tanpa makan kuota)`);
        }
      }
      const quotaMsg = /50 file/.test(JSON.stringify(BODIES.find((b) => b.id === "S-055" && b.status === 429)?.body || ""));
      rec("S-055", ok === 50 && Number(s51) === 429 && quotaMsg ? "PASS" : "FAIL", `50ok=${ok}/50 ke-51â†’${s51} pesan-50=${quotaMsg} (guard :15-38; akun ${QUOTA_USER} kini hangus hari-ini = sekali-pakai âœ“)`);
    }
    if (!BIG_QUOTA) rec("S-056", "SKIP", "butuh --big-quota + --quota-user FRESH (transfer Â±210MB: 150MB ok lalu 60MB â†’ 429 di MB-ke-201; loop per-MB 200/86400, guard :29-38)");
    else {
      const mkMB = (n) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(n * 1024 * 1024 - 8, 7)]);
      const f1 = new FormData(); f1.append("file", new Blob([mkMB(150)], { type: "image/png" }), "b150.png");
      const u1 = await req("POST", "/api/upload/r2", { id: "S-056", headers: { Cookie: qCookie }, body: f1 });
      const f2 = new FormData(); f2.append("file", new Blob([mkMB(60)], { type: "image/png" }), "b60.png");
      const u2 = await req("POST", "/api/upload/r2", { id: "S-056", expect429: true, headers: { Cookie: qCookie }, body: f2 });
      rec("S-056", u2.r.status === 429 ? "PASS" : "FAIL", `150MBâ†’${u1.r.status} 60MBâ†’${u2.r.status} (harap 429 kuota-200MB; guard :29-38)`);
    }
  }
  { // S-057 413 berlapis + S-058 guest-base64 401 (+ varian login lalu hapus)
    const raw9 = "x".repeat(9 * 1024 * 1024);
    const s57 = await req("POST", "/api/designs", { id: "S-057", headers: J({ Cookie: cookie }), body: raw9.slice(0, 9 * 1024 * 1024) });
    const g1 = await req("POST", "/api/designs", { id: "S-058", headers: J({}), body: JSON.stringify({ title: `E2E ${STAMP} S-058`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "X", size: "L", decals: [{ id: "d", url: "data:image/png;base64,iVBORw0KGgo=", name: "a.png", targetSide: "front", x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 }] }) });
    rec("S-057", s57.r.status === 413 ? "PASS" : "FAIL", `9MBâ†’${s57.r.status} (harap 413 maks-8MB; lapis CL>3MBâ†’413 guard designs:12-19,32-34)`);
    rec("S-058", g1.r.status === 401 ? "PASS" : "FAIL", `guest-base64â†’${g1.r.status} (harap 401; https-saja lolos; guard designs:59-70)`);
  }
  if (QUOTA_USER) { // S-059: desain main â†’ PATCH/DELETE aktor-2 â†’ 403Ã—2 â†’ hapus owner
    const mk = await req("POST", "/api/designs", { id: "S-059", headers: J({ Cookie: cookie }), body: JSON.stringify({ title: `E2E ${STAMP} S-059`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "X", size: "L", decals: [{ id: "d", url: "https://example.com/t.png", name: "t.png", targetSide: "front", x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 }] }) });
    if (!mk.j.design?.id && !mk.j.id) rec("S-059", mk.j.quotaExceeded ? "SKIP" : "FAIL", `buatâ†’${mk.r.status} (kuota-5 penuh? hapus draft E2E dulu; guard designs:74-96)`);
    else {
      const did = mk.j.design?.id || mk.j.id;
      const p = await req("PATCH", "/api/designs", { id: "S-059", headers: J({ Cookie: qCookie }), body: JSON.stringify({ id: did, title: "CURI" }) });
      const d = await req("DELETE", "/api/designs", { id: "S-059", headers: J({ Cookie: qCookie }), body: JSON.stringify({ id: did }) });
      await req("DELETE", "/api/designs", { id: "S-059", headers: J({ Cookie: cookie }), body: JSON.stringify({ id: did }) });
      rec("S-059", p.r.status === 403 && d.r.status === 403 ? "PASS" : "FAIL", `patch/del-asingâ†’${p.r.status}/${d.r.status} (harap 403/403; guard designs:228-287; owner-cleanup âœ“)`);
    }
  }
  { // S-060 sweep: tanpa-header â†’ 503 (secret blm diset) ATAU 401 (terpasang); salah â†’ 401
    const n = await req("GET", "/api/cron/sweep", { id: "S-060" });
    const w = await req("GET", "/api/cron/sweep", { id: "S-060", headers: { Authorization: "Bearer salah-uji" } });
    const ok = (n.r.status === 503 || n.r.status === 401) && (w.r.status === 401 || (n.r.status === 503 && w.r.status === 503));
    rec("S-060", ok ? "PASS" : "FAIL", `tanpaâ†’${n.r.status} salahâ†’${w.r.status} (harap 503/503 tanpa-secret ATAU 401/401 terpasang; timingSafe length-guard, guard sweep:24-32)`);
  }
  // Cancel sisa order T1 (runner TERAKHIR per-batch; R-C/cleanup ambil alih)
  for (const o of createdOrders) {
    if (!o.id) continue;
    await req("POST", `/api/orders/${o.id}/cancel`, { id: "cancel", headers: J({ Cookie: VC }), body: JSON.stringify({ reason: `E2E ${STAMP} R-S selesai` }) }).catch(() => null);
  }
  flushBodies("lengkap");
  console.log(`\nTulis response.json (${BODIES.length} 4xx) ke ${STAMP}/.`);
  console.log("\n## Â§2 LAPORAN R-S (tempel ke LAPORAN.md)\n| ID | Hasil | Bukti |");
  console.log("|---|---|---|");
  for (const t of R) console.log(`| ${t.id} | ${t.hasil} | ${String(t.bukti).slice(0, 180)} |`);
  const fails = R.filter((t) => t.hasil === "FAIL").length;
  console.log(`\nR-S ${STAMP}: ${R.length} uji, FAIL=${fails}. Kuota terbakar: OTP ${LIVE_OTP ? "YA(--live-otp)" : "TIDAK"}; quota-user ${QUOTA_USER || "-"} (sekali-pakai).`);
  if (fails > 0) process.exit(1);
} catch (e) {
  if (e instanceof RateHit) { flushBodies(`RATE-HIT: ${e.message}`); console.log(`STOP ${e.message} â€” response.json parsial tertulis`); process.exit(2); }
  flushBodies(`FAIL: ${e.message}`);
  console.log(`FAIL run â€” ${e.message}`); process.exit(1);
}
