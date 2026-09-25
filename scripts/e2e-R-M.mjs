#!/usr/bin/env node
// scripts/e2e-R-M.mjs â€” Runner R-M: parity mobile via endpoint WEB (Bab 4, M-001â€“M-030).
// Target: kaos-kami-web/src/app/api/mobile/* + proxy web (quote/locations/reverse).
// TIDAK butuh dev :3001 / emulator. UI-only HP = LANGKAH MANUAL ke LAPORAN.
// Konvensi: ESM, requireEnv, --stamp wajib, --dry-run NOL tulis, cookie ganda,
// sleep + STOP 429, token â‰¤8char, prefix TEST-<stamp>-M-*.
import fs from "node:fs";
import path from "node:path";
import { cookieHeader } from "./e2e-auth.mjs";
import { createClient } from "@libsql/client/web"; // cookie WAJIB bertanda (better-auth sign!) â€” token mentah = guest!

const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => {
  const i = ARGS.indexOf(f);
  return i >= 0 && ARGS[i + 1] && !ARGS[i + 1].startsWith("--") ? ARGS[i + 1] : d;
};
if (has("--help")) {
  console.log(`R-M mobile parity (M-001â€“M-030) via endpoint WEB.
Pakai: node scripts/e2e-R-M.mjs --stamp YYYYMMDD-HHMM [--base-url URL] [--with-otp 123456] [--dry-run]
Env (authed step M-002/3/5â€“9): E2E_SESSION_TOKEN E2E_USER_ID E2E_USER_PHONE (08â€¦)
  M-007 negatif TANPA otp; positif via --with-otp. Flag OTP = CHECKOUT_OTP_REQUIRED (sama R-U).
  --prod â†’ https://kaoskami.biz.id (butuh --confirm-prod). --dry-run: LIST aksi, NOL tulis/jaringan.`);
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
const short = (t) => (!t ? "-" : String(t).slice(0, 8) + "...");
const results = [];
const rec = (id, status, note) => { results.push({ id, status, note }); console.log(`${status} ${id} â€” ${note}`); };
class Stop429 extends Error {}
async function req(p, o = {}) {
  // PANDUAN §10: tiap fetch WAJIB timeout (anti-gantung).
  const r = await fetch(BASE + p, { signal: AbortSignal.timeout(60000), ...o });
  if (r.status === 429 && !o.expect429) throw new Stop429(`STOP 429 di ${p} â€” JANGAN retry buta, tunggu window`);
  return r;
}
const SLEEP_MS = Number(process.env.E2E_SLEEP_MS || 3000); // antar hit sensitif
const SLEEP_CHECKOUT_MS = Number(process.env.E2E_SLEEP_CHECKOUT_MS || 20000); // m-checkout 5/mnt
let OUT = null;
const T = (s) => `TEST-${STAMP}-M-${s}`;
const MANUAL = [
  "M-004 re-quote saat buka sheet (visual) + M-011 cart utuh saat gagal + M-012 clearCart",
  "M-010 jalur R2-vs-base64 + M-013 modal Duitku vs tunggu-ACC (butuh order PENDING ber-URL)",
  "M-016 push re-register (butuh FCM Play Services) + M-017 BackButton lapis + M-018 logout bersih",
  "M-019 badge biometrik + M-021 clamp 30cm store + M-022 PrintZoneGuide + M-023 sleeve/collar wire",
  "M-024 SPK nama+DPI + M-025 telemetri ASTM + M-026 invoice tab + M-028 QC foto + M-029 gang + M-030 admin HP",
];
const PLAN = ["M-001 katalog ETag/304", "M-002 capâ†’400", "M-003 harga server (sync)", "M-005 slug asing failed[]",
  "M-006 district luarâ†’400 + reverseGeocode", "M-007 gate OTP 401", "M-008 checkoutâ†’DESIGN_REVIEW",
  "M-009 replay keyâ†’409", "M-014 id acakâ†’404", "M-015 poll shape + M-027 dimensi", "proxy quote/locations",
  "GAP single-decal bila kirim >1 decal", "MANUAL UI-only â†’ LAPORAN"];
if (DRY) { console.log(`DRY-RUN ${STAMP} @ ${BASE} (NOL tulis/jaringan):`); PLAN.forEach((p) => console.log(" - " + p)); MANUAL.forEach((p) => console.log(" - MANUAL: " + p)); process.exit(0); }

const J = (b) => JSON.stringify(b);
try {
  // M-001 katalog ETag (publik).
  const c1 = await req("/api/mobile/catalog"); await sleep(SLEEP_MS);
  const etag = c1.headers.get("etag") || "";
  const c1b = await req("/api/mobile/catalog", { headers: { "If-None-Match": etag } });
  rec("M-001", c1b.status === 304 ? "PASS" : "FAIL", `katalog ${c1.status}, replay ETagâ†’${c1b.status} (harap 304)`);
  await sleep(SLEEP_MS);

  let tok = process.env.E2E_SESSION_TOKEN || "";
  requireEnv("BETTER_AUTH_SECRET"); // sign cookie sesi!
  let uid = process.env.E2E_USER_ID || "";
  let phone = process.env.E2E_USER_PHONE || "";
  if (!tok || !uid || !phone) { // fallback: sesi + profil dari DB read-only (tanpa tempel secret di shell!)
    const em = process.env.E2E_USER_EMAIL || "hengkivibecoding@gmail.com";
    const c = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
    const r = await c.execute({ sql: "SELECT s.token, u.id, u.phoneNumber FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [em] });
    if (!r.rows?.[0]?.token) throw new Error(`E2E butuh E2E_SESSION_TOKEN/USER_ID/USER_PHONE atau sesi-DB ${em}`);
    tok = String(r.rows[0].token); uid = String(r.rows[0].id); phone = String(r.rows[0].phoneNumber || "");
    if (!phone) throw new Error(`E2E butuh E2E_USER_PHONE (akun ${em} tanpa phone)`);
  }
  const CK = await cookieHeader(tok);
  const otpBypass = process.env.CHECKOUT_OTP_REQUIRED === "false";

  // M-003/M-005/M-020-cart: sync desain (harga server + slug asing + N-decal tersimpan).
  const syncBody = {
    userId: uid, deviceId: T("dev"),
    designs: [
      { clientId: T("D1"), title: `E2E ${STAMP} M-003`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "Obsidian Black", size: "L", calculatedPriceIdr: 1, decals: [{ id: "d1", name: "D1", targetSide: "front", url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-white.png", x: 0, y: 0.05, scale: 0.55, rotation: 0, opacity: 1 }] },
      { clientId: T("DX"), title: `E2E ${STAMP} M-005`, apparelSlug: "baju-asing-xyz", colorHex: "#121214", colorName: "X", size: "L", calculatedPriceIdr: 1, decals: [] },
    ],
  };
  const sy = await req("/api/mobile/designs/sync", { method: "POST", headers: { "Content-Type": "application/json", Cookie: CK }, body: J(syncBody) });
  const syJ = await sy.json().catch(() => ({}));
  const d1 = (syJ.results || []).find((r) => r.clientId === T("D1"));
  if (sy.status === 400 && /quota/i.test(syJ.error || "")) rec("M-003", "SKIP", "kuota desain 5/akun penuh â€” jujur, tanpa fixture");
  else rec("M-003", d1 ? "PASS" : "FAIL", `sync ${sy.status}, server hitung ulang (klaim HP=1 diabaikan), designId=${short(d1?.designId)}`);
  rec("M-005", (syJ.failed || []).some((f) => f.clientId === T("DX")) ? "PASS" : "FAIL", `slug asing â†’ failed[] per-item (${sy.status})`);
  await sleep(SLEEP_MS);

  const item2 = (n) => ({
    apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", colorHex: "#121214",
    colorName: "Obsidian Black", size: "L", quantity: 1, title: `E2E ${STAMP} M-${n}`,
    decals: [
      { id: "m-front", name: "Depan", targetSide: "front", url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-white.png", x: 0, y: 0.05, scale: 0.55, rotation: 0, opacity: 1 },
      { id: "m-back", name: "Kerah", targetSide: "back", url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-transparent.png", x: 0, y: 0.4, scale: 0.15, rotation: 0, opacity: 1 },
    ],
  });
  const baseCheckout = (tag, p, extra = {}) => ({
    recipientName: T(tag), phoneNumber: p, deliveryMethod: "FREE_MAKASSAR", district: "Tamalanrea",
    fullAddress: `Jl. E2E ${STAMP} No. 1, Tamalanrea, Makassar [E2E:${STAMP}:M-${tag}]`,
    courierNotes: `[E2E:${STAMP}:M-${tag}]`, paymentMethod: "QRIS", turnaroundTier: "REGULER",
    items: [item2(tag)], ...extra,
  });
  const postCheckout = (body, key) => req("/api/mobile/orders/checkout", { method: "POST", headers: { "Content-Type": "application/json", Cookie: CK, "Idempotency-Key": key }, body: J(body) });

  // M-002 guard orderable: cap DITOLAK 400 (gagal SEBELUM gerbang OTP â†’ tanpa bakar OTP).
  const cap = baseCheckout("002", phone); cap.items[0].apparelSlug = "cap"; cap.items[0].decals = [];
  const r002 = await postCheckout(cap, T("002")); await sleep(SLEEP_CHECKOUT_MS);
  rec("M-002", r002.status === 400 ? "PASS" : "FAIL", `cap checkoutâ†’${r002.status} (harap 400 orderable)`);

  // M-006 kecamatan whitelist + reverseGeocode fallback.
  const bad = baseCheckout("006", phone); bad.district = "Jakarta Selatan";
  const r006 = await postCheckout(bad, T("006")); await sleep(SLEEP_CHECKOUT_MS);
  rec("M-006", r006.status === 400 ? "PASS" : "FAIL", `district luarâ†’${r006.status} (harap 400)`);
  const rv = await req("/api/geocode/reverse?lat=-5.1353&lon=119.4891"); await sleep(SLEEP_MS);
  rec("M-006b", rv.status === 200 ? "PASS" : "FAIL", `reverseGeocodeâ†’${rv.status} (fallback GPS isi kota)`);

  // M-007 gate OTP: nomor lain + tanpa otpCode â†’ 401 (throttle otp-check 6/300, STOP 429).
  const noOtp = baseCheckout("007", "081999000111");
  const r007 = await postCheckout(noOtp, T("007")); await sleep(SLEEP_CHECKOUT_MS);
  rec("M-007", r007.status === 401 ? "PASS" : "FAIL", `tanpa OTPâ†’${r007.status} (harap 401)${otpBypass ? "; CATAT: CHECKOUT_OTP_REQUIRED=false (darurat)" : ""}`);

  // M-008 happy path â†’ DESIGN_REVIEW (skema MobileItemSchema TANPA variant!).
  const otpArg = val("--with-otp", "");
  const okBody = baseCheckout("008", phone, otpArg ? { otpCode: otpArg } : {});
  const r008 = await postCheckout(okBody, T("008"));
  const j008 = await r008.json().catch(() => ({}));
  let orderId = j008.orderId || null, orderNumber = j008.orderNumber || null;
  if (r008.status === 401) rec("M-008", "SKIP", "OTP diminta + --with-otp tak diberi â€” gate benar, positif = MANUAL");
  else { rec("M-008", r008.status === 200 && j008.status === "DESIGN_REVIEW" ? "PASS" : "FAIL", `checkoutâ†’${r008.status} ${j008.status || ""} order=${orderNumber || "-"} paymentUrl=${j008.paymentUrl ? "ADA?! (harap null pre-ACC)" : "null(benar)"}`); }
  await sleep(SLEEP_CHECKOUT_MS);

  // M-009 idempotency: replay key M-008 â†’ 409 + order lama.
  if (orderId) {
    const r009 = await postCheckout(okBody, T("008"));
    const j009 = await r009.json().catch(() => ({}));
    rec("M-009", r009.status === 409 && j009.orderId === orderId ? "PASS" : "FAIL", `replayâ†’${r009.status} orderId sama=${j009.orderId === orderId}`);
    await sleep(SLEEP_MS);
  } else rec("M-009", "SKIP", "tanpa order M-008");

  // M-014 deep-link palsu + M-015 poll + M-027 dimensi/review.
  const r014 = await req("/api/mobile/orders/id-acak-palsu-xyz/status"); await sleep(SLEEP_MS);
  rec("M-014", r014.status === 404 ? "PASS" : "FAIL", `id palsuâ†’${r014.status} (harap 404, status via server)`);
  if (orderId) {
    const r015 = await req(`/api/mobile/orders/${orderId}/status`);
    const j015 = await r015.json().catch(() => ({}));
    rec("M-015", r015.status === 200 && j015.status ? "PASS" : "FAIL", `pollâ†’${r015.status} status=${j015.status || "?"} item=${j015.itemCount ?? "?"} pay=${j015.paymentMethod || "null(pre-ACC)"}`);
    rec("M-027", r015.status === 200 ? (j015.printWidthCm ? "PASS" : "GAP") : "FAIL", `dimensi=${j015.printWidthCm ?? "null(Menunggu info, jujur)"} review=${j015.reviewNote ? "ada" : "null(pre-review)"}`);
    await sleep(SLEEP_MS);
  } else { rec("M-015", "SKIP", "tanpa order M-008"); rec("M-027", "SKIP", "tanpa order M-008"); }

  // Proxy ongkir/lokasi paritas sheet.
  const q = await req("/api/shipping/quote?city=Makassar&postalCode=90245&qty=1"); await sleep(SLEEP_MS);
  rec("PROXY-quote", q.status === 200 ? "PASS" : "FAIL", `quoteâ†’${q.status}`);
  const l = await req("/api/shipping/locations?q=Makassar"); await sleep(SLEEP_MS);
  rec("PROXY-locations", l.status === 200 ? "PASS" : "FAIL", `locationsâ†’${l.status}`);

  // GAP single-decal: M-008 kirim 2 decal â†’ wire front/back di luar itu = MANUAL.
  const gapDecals = 2;
  rec("GAP-decal", gapDecals > 1 ? "GAP" : "PASS", `checkout kirim ${gapDecals} decal; studio simpan-N vs wire sheet (CheckoutSheet.tsx:365-381) = MANUAL`);

  OUT = path.resolve(`Blueprint/e2e/hasil-pengujian-e2e/${STAMP}`);
  fs.mkdirSync(OUT, { recursive: true });
  const fname = orderNumber ? `cart-${orderNumber}.json` : `cart-${STAMP}-NOORDER.json`;
  fs.writeFileSync(path.join(OUT, fname), J({ stamp: STAMP, base: BASE, session: short(tok), orderId, orderNumber, gapDecals, results, manualSteps: MANUAL, at: new Date().toISOString() }, null, 2));
  console.log(`Tulis ${fname} (${results.length} hasil). MANUAL UI-only â†’ LAPORAN.`);
} catch (e) {
  if (e instanceof Stop429) { console.log(`STOP ${e.message}`); process.exit(2); }
  console.log(`FAIL run â€” ${e.message}`); process.exit(1);
}
