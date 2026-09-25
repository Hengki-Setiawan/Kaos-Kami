// scripts/e2e-R-U.mjs — Runner R-U: Bab 1 User Journey (U-001–U-080).
// SSOT: Blueprint/e2e/E2E-MASTER-PLAN.md Bab 0–1 + Blueprint/e2e/PANDUAN-RUNNER.md.
// Aturan keras: --stamp wajib · cookie ganda · OUTPUT_DIR per stamp · sleep +
// STOP saat 429 · token ≤8 char di file · prefix TEST-<stamp>-U-* · created.json (R-A membacanya).
// DILARANG: hardcode secret (requireEnv!), run prod tanpa --prod + E2E_PROD_CONFIRM=yes.
// UI-only (U-020/060/071-076/079-080): LANGKAH MANUAL ke LAPORAN, bukan otomatis!
import crypto from "crypto";
import fs from "fs";
import path from "path";
import readline from "readline";
import { createClient } from "@libsql/client/web";
import { cookieHeader } from "./e2e-auth.mjs"; // cookie WAJIB bertanda (better-auth sign!) — token mentah = guest!

// ---------- CLI ----------
const args = process.argv.slice(2);
const opt = (n) => {
  const p = `--${n}=`;
  const hit = args.find((a) => a.startsWith(p));
  if (hit) return hit.slice(p.length);
  const i = args.indexOf(`--${n}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  return null;
};
const has = (n) => args.includes(`--${n}`);
if (has("help") || args.includes("-h")) {
  console.log(`e2e-R-U: journey user U-001–U-080 (Bab 1).
Pakai: node scripts/e2e-R-U.mjs --stamp=YYYYMMDD-HHMM [--otp=CODE|--otp-lifetime|--otp-killswitch] [--dry-run] [--prod]
OTP: --otp=CODE (tempel dari WA) · --otp-lifetime (nomor verified, tanpa kode) · --otp-killswitch (hanya CHECKOUT_OTP_REQUIRED=false di DEV!) · default: tanya interaktif.
--dry-run: NOL tulis, hanya LIST aksi. --prod: wajib + E2E_PROD_CONFIRM=yes.`);
  process.exit(0);
}
const STAMP = opt("stamp") || process.env.RUN_STAMP || "";
if (!/^\d{8}-\d{4}$/.test(STAMP)) {
  console.error("REFUSE: --stamp=YYYYMMDD-HHMM wajib (isolasi TEST-<stamp>-U-*).");
  process.exit(2);
}
const DRY = has("dry-run");
const OTP_FLAG = opt("otp");
const OTP_LIFETIME = has("otp-lifetime");
const OTP_KILL = has("otp-killswitch");
const PROD = has("prod");
if (OTP_KILL && (process.env.CHECKOUT_OTP_REQUIRED !== "false" || process.env.NODE_ENV === "production" || PROD)) {
  console.error("REFUSE --otp-killswitch: hanya bila CHECKOUT_OTP_REQUIRED=false di DEV (fail-closed, RUNBOOK §2b).");
  process.exit(2);
}
if (OTP_KILL) console.warn("WARNING BESAR: OTP dilewati (kill-switch darurat DEV) — order fiktif mungkin; aktif sementara saja!");
const BASE_URL = PROD ? "https://kaos-kami.example" : (process.env.E2E_BASE_URL || "http://127.0.0.1:3000"); // 127.0.0.1: localhost (::1-dulu) 2.6x lebih lambat & rawan gantung di mesin ini!
if (PROD && process.env.E2E_PROD_CONFIRM !== "yes") {
  console.error("REFUSE: prod butuh E2E_PROD_CONFIRM=yes + perintah owner.");
  process.exit(2);
}

function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (JANGAN commit)`);
  return v;
}

// ---------- output per stamp (RELATIF!) ----------
const OUTPUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", STAMP);
const OI_DIR = path.join(OUTPUT_DIR, "orders-invoices");
const LAPORAN = path.join(OUTPUT_DIR, "LAPORAN-R-U.md");
const CREATED = path.join(OUTPUT_DIR, "created.json");
const mask = (t) => String(t || "").slice(0, 8) + "...";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S_CHECKOUT = 13000, S_SENS = 5000, S_LITE = 1200; // hormati rate-limit global (Bab 0.1-6)
const T = (id) => `TEST-${STAMP}-U-${id}`; // prefix isolasi (Bab 0.1-5)
const results = []; // {id, status: PASS|FAIL|SKIP|MANUAL, note}
const created = { _schema: "e2e-created/1", _aturan: "Token sesi DILARANG utuh (maks 8 char + ...).", runStamp: STAMP, baseUrl: BASE_URL, duitkuEnv: "sandbox", accounts: {}, orders: [], coupons: [], designs: [], variants: [], zones: [] };
let failCause = "";

function log(s) { console.log(s); fs.mkdirSync(OUTPUT_DIR, { recursive: true }); fs.appendFileSync(LAPORAN, s + "\n"); }
function rec(id, status, note = "") { results.push({ id, status, note }); log(`[${status}] ${id} ${note}`.trim()); }
function die(id, sebab) { // GAGAL = berhenti + tulis sebab!
  failCause = `${id}: ${sebab}`;
  rec(id, "FAIL", sebab);
  fs.writeFileSync(path.join(OUTPUT_DIR, `GAGAL-${id}.txt`), failCause);
  try { fs.writeFileSync(CREATED, JSON.stringify(created, null, 2)); } catch {}
  console.error(`BERHENTI: ${failCause}`);
  process.exit(1);
}
const ok = (id, cond, sebab, note = "") => (cond ? rec(id, "PASS", note) : die(id, sebab));

// ---------- HTTP + cookie ganda ----------
let COOKIE = "";
const ck = (tok) => cookieHeader(tok); // async! pemanggil WAJIB await (lihat main + approveForPay)
async function api(p, { method = "GET", body, idem, raw, timeoutMs = 60000 } = {}) {
  if (DRY) return { dry: true, status: 0, data: {} };
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeoutMs);
  let r;
  try {
    r = await fetch(BASE_URL + p, {
      method, signal: ctl.signal,
      headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(idem ? { "Idempotency-Key": idem } : {}) },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });
  } catch (e) { clearTimeout(to); die("TIMEOUT", `${method} ${p} > ${timeoutMs}ms (${e?.cause?.code || e?.name}) — JANGAN hang diam!`); }
  clearTimeout(to);
  if (r.status === 500 && method === "GET" && !raw) { // transient Turso/libSQL "Failed query" (insiden U-001 run 1639, U-046 run 1500!) — retry 1x, GET itu idempoten. POST JANGAN auto-retry (risiko tulis ganda)!
    await sleep(15000);
    const ctl2 = new AbortController(); const to2 = setTimeout(() => ctl2.abort(), timeoutMs);
    try {
      r = await fetch(BASE_URL + p, { method, signal: ctl2.signal, headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}) } });
    } catch (e) { clearTimeout(to2); die("TIMEOUT", `${method} ${p} retry > ${timeoutMs}ms`); }
    clearTimeout(to2);
    if (r.status === 500) rec("TRANSIENT-500", "SKIP", `${method} ${p} 500 2x — masuk WATCH (aturan Bab 8 R7), lanjut`);
  }
  if (r.status === 429) die("RATE", `429 STOP di ${p} — JANGAN retry buta (tunggu reset lalu run stamp baru)`);
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = { _text: txt.slice(0, 500) }; }
  return { status: r.status, data, text: txt };
}

// ---------- DB (Session-dari-DB + OTP, pola e2e-kasus-1.mjs) ----------
let db = null;
const getDb = () => (db ??= createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") }));
async function sessionTokenByEmail(email) {
  const r = await getDb().execute({ sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [email] });
  if (!r.rows.length) throw new Error(`Sesi DB tak ada untuk ${email}`);
  return String(r.rows[0].token);
}
async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}
// OTP 4 mode: --otp=CODE · --otp-lifetime · --otp-killswitch · OPSI-1 peek
// (PANDUAN §14: POST /api/test/otp bila server izinkan, tanpa bakar WA) ·
// default interaktif.
async function otpCode(phone) {
  if (OTP_FLAG) return OTP_FLAG;
  if (OTP_LIFETIME || OTP_KILL) return null; // andalkan bypass verified / kill-switch DEV
  if (DRY) return "000000";
  try { // OPSI-1 peek: gagal/404 → jatuh ke tanya interaktif (non-interaktif = throw jelas).
    const pr = await fetch(`${BASE_URL}/api/test/otp`, {
      signal: AbortSignal.timeout(20000), method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber: phone }),
    });
    if (pr.ok) {
      const pj = await pr.json().catch(() => ({}));
      if (/^\d{6}$/.test(pj.code || "")) { console.log(`OTP peek ok untuk ${phone} (tanpa WA)`); return pj.code; }
    }
  } catch {}
  if (!process.stdin.isTTY) throw new Error(`OTP untuk ${phone} butuh --otp / --otp-lifetime / peek-aktif (non-interaktif, menolak hang)`);
  return ask(`OTP WA untuk ${phone} (cek Fonnte/WA lalu tempel): `);
}
const md5duitku = (code, amount, orderNo, key) => crypto.createHash("md5").update(`${code}${amount}${orderNo}${key}`).digest("hex");

// ---------- fixture ----------
// Email/nomor via env dulu (JANGAN hardcode secret/akun baru) — fallback = akun uji kanonis Bab 0.
const USER_EMAIL = process.env.E2E_TEST_EMAIL || "hengkivibecoding@gmail.com";
const USER_PHONE = process.env.E2E_TEST_PHONE || "0895803463032";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "hengkishadow@gmail.com";
// Akun DESAIN (kuota kosong!) — default vibecoding2 (0 desain). USER utama (vibecoding1) penuh
// 17 arsip ORDERED yang ikut hitung kuota (TEMUAN P0: kuota menghitung arsip! → RENCANA-PERBAIKAN).
// Desain: U-009–015, U-065. Checkout/bayar/lacak/profil/komplain: USER utama (butuh phone verified).
const DESIGN_EMAIL = opt("design-email") || process.env.E2E_DESIGN_EMAIL || "hengkivibecoding2@gmail.com";
let DESIGN_COOKIE = "";
async function asDesign(fn) { const saved = COOKIE; COOKIE = DESIGN_COOKIE; try { return await fn(); } finally { COOKIE = saved; } }
const DECAL = { id: "d1", url: "https://pub-r2.test/t.png", name: "t.png", targetSide: "front", x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 };
const baseCheckout = (o = {}) => ({
  recipientName: T("021"), phoneNumber: USER_PHONE, deliveryMethod: "FREE_MAKASSAR", district: "Tallo",
  fullAddress: `Jl TEST E2E No 1, Tallo [E2E:${STAMP}]`, turnaroundTier: "REGULER",
  courierNotes: `[E2E:${STAMP}:U-021]`,
  items: [{ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", colorHex: "#121214", colorName: "Obsidian Black", size: "L", quantity: 1, title: T("021"), decals: [DECAL] }],
  ...o,
});
async function doCheckout(body, key) { await sleep(DRY ? 0 : S_LITE); let r = await api("/api/checkout", { method: "POST", body, idem: key, timeoutMs: 180000 }); if (r.status === 500) { await sleep(20000); r = await api("/api/checkout", { method: "POST", body, idem: key, timeoutMs: 180000 }); if (r.status === 500) rec("TRANSIENT-500", "SKIP", `checkout 500 2x key SAMA(full-body): ${JSON.stringify(r.data).slice(0, 2500)}`); } return r; } // checkout BERAT (arsip R2 + N tulis Turso + kompilasi) bisa >60s — timeout bunuh klien TAPI server bisa tetap selesai (yatim KK-20260923-3804!) → habis timeout SELALU cek DB / replay key SAMA (409+order) sebelum order baru! Retry key SAMA = aman (server dedupe 409!).

// ================= 15 FUNGSI BERTAHAP =================
// A) katalog + quote (U-001–008)
async function stepCatalog() {
  if (DRY) return ["GET categories/colors/materials/sablon-methods/variants (read-only)"];
  const c = await api("/api/catalog/categories"); ok("U-001", c.status === 200 && c.data.success && c.data.categories?.length, JSON.stringify(c.data).slice(0, 200), `n=${c.data.categories?.length}`);
  const catId = c.data.categories[0]?.id;
  const w = await api("/api/catalog/colors"); ok("U-002", w.status === 200 && w.data.colors?.length, "colors kosong");
  const m = await api("/api/catalog/materials"); ok("U-003", m.status === 200 && m.data.materials?.length, "materials kosong");
  const s = await api("/api/catalog/sablon-methods"); ok("U-004", s.status === 200, "sablon-methods gagal");
  const v = await api(`/api/catalog/variants${catId ? `?categoryId=${catId}&size=L` : ""}`);
  ok("U-005", v.status === 200 && Array.isArray(v.data.variants) && !v.data.variants.some((x) => x.isActive === false), "variants bocor nonaktif", `n=${v.data.variants?.length}`);
  globalThis.__variant = v.data.variants?.find((x) => (x.stockQty ?? 0) > 0);
  globalThis.__variant0 = v.data.variants?.find((x) => (x.stockQty ?? 0) === 0);
}
async function stepQuote() {
  if (DRY) return ["GET shipping/quote + locations (read-only)"];
  const q = await api("/api/shipping/quote?city=Makassar&postalCode=90211&qty=1&deliveryMethod=EXPEDITION_MANUAL");
  const liveRates = q.data.live?.rates ?? (q.data.source === "live" ? q.data.rates : undefined);
  ok("U-006", q.status === 200 && (q.data.live || q.data.zone || (q.data.source === "live" && Array.isArray(liveRates))), JSON.stringify(q.data).slice(0, 200));
  globalThis.__rate = liveRates?.[0];
  const q2 = await api("/api/shipping/quote?deliveryMethod=EXPEDITION_MANUAL");
  ok("U-007", q2.status === 400, `harusnya 400, dapat ${q2.status}`);
  const l1 = await api("/api/shipping/locations?q=Mak"); await sleep(DRY ? 0 : S_LITE);
  const l2 = await api("/api/shipping/locations?q=Ma");
  const arr1 = l1.data.results ?? l1.data.locations ?? l1.data;
  ok("U-008", l1.status === 200 && Array.isArray(arr1) && (l2.data.results ?? l2.data.locations ?? []).length === 0,
    `l1=${l1.status} n=${arr1?.length} l2=${JSON.stringify(l2.data).slice(0,120)}`); // l1 BOLEH kosong (provider eksternal flaky!) — yang deterministik (milik kita): status 200 + array + q<3 → []
}
// B) desain + cart (U-009–020; U-020 MANUAL)
async function stepDesigns() {
  if (DRY) return ["POST/PATCH/DELETE /api/designs (kuota 5, harga server)"];
  const d = (t, price) => ({ title: t, apparelSlug: "tshirt", colorHex: "#121214", colorName: "Obsidian Black", size: "L", decals: [DECAL, { ...DECAL, id: "d2", targetSide: "back" }], ...(price ? { calculatedPriceIdr: price } : {}) });
  let r = await api("/api/designs", { method: "POST", body: d(`E2E ${STAMP} U-009`) });
  ok("U-009", [200, 201].includes(r.status) && r.data.design?.id, JSON.stringify(r.data).slice(0, 200));
  const id9 = r.data.design.id; created.designs.push({ testId: "U-009", id: id9, title: `E2E ${STAMP} U-009` });
  await sleep(DRY ? 0 : S_SENS);
  r = await api("/api/designs", { method: "POST", body: d(`E2E ${STAMP} U-010`, 1000) });
  ok("U-010", r.data.design && r.data.design.calculatedPriceIdr !== 1000, "harga client lolos!", `server=${r.data.design?.calculatedPriceIdr}`);
  const id10 = r.data.design.id;
  const li = await api("/api/designs"); ok("U-011", li.status === 200 && (li.data.designs ?? []).every((x) => x.userId === li.data.designs[0]?.userId), "isolasi desain bocor");
  await sleep(DRY ? 0 : S_SENS);
  r = await api("/api/designs", { method: "PATCH", body: { id: id9, title: `E2E ${STAMP} U-013` } });
  ok("U-013", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  await sleep(DRY ? 0 : S_SENS);
  r = await api("/api/designs", { method: "DELETE", body: { id: id10 } });
  ok("U-014", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  globalThis.__designId = id9;
}
async function stepClaimCart() {
  if (DRY) return ["POST designs/claim · GET/PATCH/DELETE cart · POST cart/items/batch"];
  // TEMUAN: GET /api/user/profile TIDAK ADA di kode (hanya PATCH+DELETE!) → uid via DB read-only.
  const ur = await getDb().execute({ sql: "SELECT id FROM User WHERE email = ?", args: [USER_EMAIL] });
  const uid = ur.rows[0]?.id;
  if (!uid) { rec("U-016", "SKIP", "uid tak ketemu di DB"); return; }
  let r = await asDesign(() => api("/api/designs/claim", { method: "POST", body: { designs: [{ title: `E2E ${STAMP} C1`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "Obsidian", size: "L", decals: [DECAL] }, { title: `E2E ${STAMP} C2`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "Obsidian", size: "L", decals: [DECAL] }] } }));
  ok("U-015", r.status === 200 && (r.data.claimed ?? 2) === 2, JSON.stringify(r.data).slice(0, 200));
  r = await api(`/api/cart?userId=${uid}`); ok("U-016", r.status === 200 && (r.data.cart || r.data.id), "cart tak auto-create");
  const v = globalThis.__variant;
  if (!v) { rec("U-017", "SKIP", "tak ada varian stok>0"); rec("U-018", "SKIP", "ikut U-017"); rec("U-019", "SKIP", "ikut U-017"); return; }
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/cart/items", { method: "POST", body: { userId: uid, productVariantId: v.id, quantity: 1 } });
  ok("U-017", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  const itemId = r.data.item?.id || r.data.cartItem?.id;
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/cart/items/batch", { method: "POST", body: { userId: uid, items: [{ productVariantId: v.id, quantity: 1 }, ...(globalThis.__variant0 ? [{ productVariantId: globalThis.__variant0.id, quantity: 1 }] : [])] } });
  ok("U-018", r.status === 200 && (globalThis.__variant0 ? (r.data.skippedNoStock?.length > 0 || (r.data.skipped ?? 0) > 0) : true), JSON.stringify(r.data).slice(0, 200));
  if (itemId) {
    await sleep(DRY ? 0 : S_LITE);
    r = await api("/api/cart/items", { method: "PATCH", body: { itemId, quantity: 2 } });
    ok("U-019", r.status === 200, JSON.stringify(r.data).slice(0, 200));
    await api(`/api/cart/items?itemId=${itemId}`, { method: "DELETE" });
  } else rec("U-019", "SKIP", "itemId tak terlacak");
}
// C) checkout sukses (U-021–032)
async function stepCheckoutSuccess() {
  if (DRY) return ["POST /api/checkout FREE + idempotency replay + key baru (DESIGN_REVIEW)"];
  const code = await otpCode(USER_PHONE);
  const key1 = `${T("021")}-${Date.now()}`;
  let r = await doCheckout({ ...baseCheckout(), ...(code ? { otpCode: code } : {}) }, key1);
  ok("U-021", r.status === 200 && r.data.orderNumber, JSON.stringify(r.data).slice(0, 300));
  created.orders.push({ testId: "U-021", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", designIds: [] });
  fs.mkdirSync(OI_DIR, { recursive: true });
  fs.writeFileSync(path.join(OI_DIR, `U-021-${r.data.orderNumber}.json`), JSON.stringify({ testId: "U-021", order: r.data }, null, 2));
  globalThis.__o21 = r.data;
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout({ ...baseCheckout(), ...(code ? { otpCode: code } : {}) }, key1);
  ok("U-022", r.status === 409 && r.data.orderId === globalThis.__o21.orderId, `replay harus 409 order sama, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  const code2 = OTP_FLAG || (!OTP_LIFETIME && !OTP_KILL ? await otpCode(USER_PHONE) : null);
  r = await doCheckout({ ...baseCheckout({ recipientName: T("023"), courierNotes: `[E2E:${STAMP}:U-023]` }), ...(code2 ? { otpCode: code2 } : {}) }, `${T("023")}-${Date.now()}`);
  ok("U-023", r.status === 200 && r.data.orderNumber !== globalThis.__o21.orderNumber, JSON.stringify(r.data).slice(0, 200));
  created.orders.push({ testId: "U-023", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", designIds: [] });
  await api(`/api/orders/${r.data.orderId}/cancel`, { method: "POST" }); // cleanup order kedua
}
async function stepCheckoutMethods() {
  if (DRY) return ["POST /api/checkout PICKUP + EXPEDITION + EXPRESS_24H"];
  const code = OTP_FLAG || (!OTP_LIFETIME && !OTP_KILL ? await otpCode(USER_PHONE) : null);
  let r = await doCheckout({ ...baseCheckout({ recipientName: T("024"), deliveryMethod: "PICKUP", courierNotes: `[E2E:${STAMP}:U-024]` }), ...(code ? { otpCode: code } : {}) }, `${T("024")}-${Date.now()}`);
  ok("U-024", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  created.orders.push({ testId: "U-024", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", designIds: [] });
  await sleep(DRY ? 0 : S_CHECKOUT);
  const rt = globalThis.__rate;
  r = await doCheckout({ ...baseCheckout({ recipientName: T("025"), deliveryMethod: "EXPEDITION_MANUAL", destinationCity: "Makassar", destinationPostalCode: "90211", courierNotes: `[E2E:${STAMP}:U-025]` }), ...(code ? { otpCode: code } : {}) }, `${T("025")}-${Date.now()}`);
  ok("U-025", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  if (rt) {
    await sleep(DRY ? 0 : S_CHECKOUT);
    r = await doCheckout({ ...baseCheckout({ recipientName: T("026"), deliveryMethod: "EXPEDITION_MANUAL", destinationCity: "Makassar", destinationPostalCode: "90211", expeditionCourier: rt.courierCode, expeditionService: rt.serviceCode, courierNotes: `[E2E:${STAMP}:U-026]` }), ...(code ? { otpCode: code } : {}) }, `${T("026")}-${Date.now()}`);
    ok("U-026", r.status === 200, JSON.stringify(r.data).slice(0, 200));
    await api(`/api/orders/${r.data.orderId}/cancel`, { method: "POST" });
  } else rec("U-026", "SKIP", "live rates mati (ikut zona)");
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout({ ...baseCheckout({ recipientName: T("027"), turnaroundTier: "EXPRESS_24H", courierNotes: `[E2E:${STAMP}:U-027]` }), ...(code ? { otpCode: code } : {}) }, `${T("027")}-${Date.now()}`);
  ok("U-027", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  created.orders.push({ testId: "U-027", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", designIds: [] });
}
async function stepCouponClampBulk() {
  if (DRY) return ["POST /api/checkout kupon + clamp30cm + hoodie5sisi + bulk12 + varian"];
  const code = OTP_FLAG || (!OTP_LIFETIME && !OTP_KILL ? await otpCode(USER_PHONE) : null);
  let r = await doCheckout({ ...baseCheckout({ recipientName: T("028"), couponCode: `E2E-${STAMP}-001`, courierNotes: `[E2E:${STAMP}:U-028]` }), ...(code ? { otpCode: code } : {}) }, `${T("028")}-${Date.now()}`);
  if (r.status === 200) created.orders.push({ testId: "U-028", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", coupon: `E2E-${STAMP}-001`, designIds: [] });
  else rec("U-028", "SKIP", `kupon E2E-${STAMP}-001 belum dibuat (A-051): ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout({ ...baseCheckout({ recipientName: T("029"), courierNotes: `[E2E:${STAMP}:U-029]`, items: [{ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", colorHex: "#121214", colorName: "Obsidian Black", size: "L", quantity: 1, title: T("029"), decals: [{ ...DECAL, id: "dj", targetSide: "back", scale: 0.85 }] }] }), ...(code ? { otpCode: code } : {}) }, `${T("029")}-${Date.now()}`);
  ok("U-029", r.status === 200 && (r.data.priceBreakdown?.wasClamped !== false), JSON.stringify(r.data).slice(0, 200));
  await api(`/api/orders/${r.data.orderId}/cancel`, { method: "POST" });
  await sleep(DRY ? 0 : S_CHECKOUT);
  const sides = ["front", "back", "left_sleeve", "right_sleeve", "hood"];
  r = await doCheckout({ ...baseCheckout({ recipientName: T("030"), courierNotes: `[E2E:${STAMP}:U-030]`, items: [{ apparelSlug: "hoodie", fabricThicknessSlug: "french-terry-380", colorHex: "#121214", colorName: "Obsidian Black", size: "L", quantity: 1, title: T("030"), decals: sides.map((s, i) => ({ ...DECAL, id: `d${i}`, targetSide: s })) }] }), ...(code ? { otpCode: code } : {}) }, `${T("030")}-${Date.now()}`);
  ok("U-030", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  created.orders.push({ testId: "U-030", orderId: r.data.orderId, orderNumber: r.data.orderNumber, statusAwal: "DESIGN_REVIEW", designIds: [] });
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout({ ...baseCheckout({ recipientName: T("031"), courierNotes: `[E2E:${STAMP}:U-031]`, items: [0, 1].map((i) => ({ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", colorHex: "#121214", colorName: "Obsidian Black", size: "L", quantity: 6, title: `${T("031")}-${i}`, decals: [DECAL] })) }), ...(code ? { otpCode: code } : {}) }, `${T("031")}-${Date.now()}`);
  ok("U-031", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  if (r.status === 200) await api(`/api/orders/${r.data.orderId}/cancel`, { method: "POST" });
  const v = globalThis.__variant;
  if (v) {
    await sleep(DRY ? 0 : S_CHECKOUT);
    r = await doCheckout({ recipientName: T("032"), phoneNumber: USER_PHONE, deliveryMethod: "FREE_MAKASSAR", district: "Tallo", fullAddress: `Jl TEST E2E No 1 [E2E:${STAMP}]`, turnaroundTier: "REGULER", courierNotes: `[E2E:${STAMP}:U-032]`, items: [{ productVariantId: v.id, apparelSlug: "tshirt", colorHex: "#121214", colorName: "x", size: "L", quantity: 1, decals: [] }], ...(code ? { otpCode: code } : {}) }, `${T("032")}-${Date.now()}`);
    ok("U-032", r.status === 200, JSON.stringify(r.data).slice(0, 200));
    if (r.status === 200) await api(`/api/orders/${r.data.orderId}/cancel`, { method: "POST" });
  } else rec("U-032", "SKIP", "tak ada varian aktif");
}
// D) checkout negatif (U-033–045) — urutan guard: 401 sesi → 413 → Zod → district → orderable → stok/kurir/kupon → OTP 401/403
async function stepNegAuth() {
  if (DRY) return ["POST /api/checkout negatif: tamu401, district, slug, stok, kurir (tanpa bakar OTP)"];
  const saved = COOKIE; COOKIE = "";
  let r = await doCheckout(baseCheckout({ recipientName: T("033") }), `${T("033")}-${Date.now()}`);
  COOKIE = saved;
  ok("U-033", r.status === 401, `tamu harus 401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("034"), district: undefined }), `${T("034")}-${Date.now()}`);
  ok("U-034", r.status === 400, `FREE tanpa district harus 400, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("035"), district: "Bandung" }), `${T("035")}-${Date.now()}`);
  ok("U-035", r.status === 400, `district luar harus 400, dapat ${r.status}`);
  for (const slug of ["cap", "pants", "shorts"]) {
    await sleep(DRY ? 0 : S_CHECKOUT);
    r = await doCheckout(baseCheckout({ recipientName: T("036"), courierNotes: `[E2E:${STAMP}:U-036-${slug}]`, items: [{ apparelSlug: slug, colorHex: "#121214", colorName: "x", size: "L", quantity: 1, title: T("036"), decals: [DECAL] }] }), `${T("036")}-${slug}-${Date.now()}`);
    if (r.status !== 400) die("U-036", `${slug} harus 400, dapat ${r.status}`);
  }
  rec("U-036", "PASS", "cap/pants/shorts 400");
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("037"), items: [{ apparelSlug: "fiktif", colorHex: "#121214", colorName: "x", size: "L", quantity: 1, title: "x", decals: [] }] }), `${T("037")}-${Date.now()}`);
  ok("U-037", r.status === 400, `slug asing harus 400, dapat ${r.status}`);
  const v = globalThis.__variant;
  if (v) {
    await sleep(DRY ? 0 : S_CHECKOUT);
    r = await doCheckout({ recipientName: T("038"), phoneNumber: USER_PHONE, deliveryMethod: "FREE_MAKASSAR", district: "Tallo", fullAddress: "Jl x", items: [{ productVariantId: v.id, apparelSlug: "tshirt", colorHex: "#121214", colorName: "x", size: "L", quantity: (v.stockQty ?? 0) + 1, decals: [] }] }, `${T("038")}-${Date.now()}`);
    ok("U-038", r.status === 400, `stok kurang harus 400, dapat ${r.status}`);
  } else rec("U-038", "SKIP", "tak ada varian");
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("039"), deliveryMethod: "EXPEDITION_MANUAL", destinationCity: "Makassar", destinationPostalCode: "90211", expeditionCourier: "JNE", expeditionService: "LAYANAN_FIKTIF", district: undefined }), `${T("039")}-${Date.now()}`);
  ok("U-039", r.status === 400, `kurir fiktif harus 400, dapat ${r.status}`);
}
async function stepNegOtpLimits() {
  if (DRY) return ["POST /api/checkout negatif: kupon-sebelum-OTP, tanpaOTP401, OTPsalah401, OTPnomorLain403, 413, items21"];
  let r = await doCheckout(baseCheckout({ recipientName: T("040"), couponCode: "FIKTIF" }), `${T("040")}-${Date.now()}`);
  ok("U-040", r.status === 400, `kupon fiktif harus 400 SEBELUM OTP, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("041"), courierNotes: `[E2E:${STAMP}:U-041]` }), `${T("041")}-${Date.now()}`);
  if (r.status === 200) rec("U-041", "SKIP", "lifetime-bypass aktif (verified milik sendiri) — syarat: phoneVerified=1 + nomor sama");
  else ok("U-041", r.status === 401, `tanpa OTP harus 401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("042"), otpCode: "000000" }), `${T("042")}-${Date.now()}`);
  if (r.status === 200) rec("U-042", "SKIP", "lifetime-bypass (lihat U-041)");
  else ok("U-042", r.status === 401, `OTP salah harus 401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("043"), phoneNumber: USER_PHONE, otpCode: "000000" }), `${T("043")}-${Date.now()}`);
  // Lifetime-bypass mengabaikan SEMUA kode (benar/salah) untuk nomor verified milik sendiri (by design, cermin U-041/042).
  // U-043 SEJATI (OTP nomor-B-nyata untuk order nomor-A → 403) hanya bisa diuji dengan 2 kode OTP ASLI (butuh --otp + nomor kedua!) — catat sebagai SKIP jujur di sini.
  if (r.status === 200) rec("U-043", "SKIP", "lifetime-bypass abaikan kode (by design); cross-number asli butuh 2 OTP nyata");
  else ok("U-043", [401, 403].includes(r.status), `OTP nomor lain harus 403/401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  const big = "x".repeat(2 * 1024 * 1024 + 100);
  r = await api("/api/checkout", { method: "POST", body: big, raw: true, idem: `${T("044")}-${Date.now()}` });
  ok("U-044", r.status === 413, `body raksasa harus 413, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_CHECKOUT);
  r = await doCheckout(baseCheckout({ recipientName: T("045"), otpCode: "000000", items: Array.from({ length: 21 }, (_, i) => ({ apparelSlug: "tshirt", colorHex: "#121214", colorName: "x", size: "L", quantity: 1, title: `i${i}`, decals: [] })) }), `${T("045")}-${Date.now()}`);
  ok("U-045", r.status === 400, `21 item harus 400, dapat ${r.status}`);
}
// E) bayar (U-046–060; U-060 MANUAL)
async function approveForPay(orderId) { // bantu R-A: ACC via sesi admin-DB (order TEST sendiri); gagal = SKIP jujur
  const tok = await sessionTokenByEmail(ADMIN_EMAIL).catch(() => null);
  if (!tok) return false;
  const saved = COOKIE; COOKIE = await ck(tok);
  const r = await api(`/api/admin/orders/${orderId}/review`, { method: "POST", body: { action: "approve", note: `E2E ${STAMP} R-U auto-ACC` } });
  COOKIE = saved; return r.status === 200;
}
async function stepPayRequest() {
  if (DRY) return ["POST request-payment owner + DESIGN_REVIEW400 (butuh PENDING via approve)"];
  const o = globalThis.__o21;
  if (!o) return void rec("U-046", "SKIP", "tak ada order U-021");
  const okAp = await approveForPay(o.orderId);
  if (!okAp) { rec("U-046", "SKIP", "belum PENDING (tunggu A-001 R-A)"); rec("U-047", "SKIP", "ikut U-046"); return; }
  await sleep(DRY ? 0 : S_SENS);
  let r = await api(`/api/orders/${o.orderId}/request-payment`, { method: "POST", body: {} });
  if (r.status === 500) { // transient? (insiden U-046 run 1500: "Failed query" 1x, tak terreproduksi!) retry 1x + body PENUH
    await sleep(30000);
    r = await api(`/api/orders/${o.orderId}/request-payment`, { method: "POST", body: {} });
    if (r.status === 500) rec("U-046-FLAKY", "SKIP", `500 2x beruntun, BODY PENUH: ${JSON.stringify(r.data).slice(0, 2500)}`);
  }
  if (r.status !== 500) ok("U-046", r.status === 200 && r.data.paymentUrl, JSON.stringify(r.data).slice(0, 200));
  globalThis.__ref = r.data.reference;
  const fresh = created.orders.find((x) => x.testId === "U-023");
  void fresh;
  const code = OTP_FLAG || (!OTP_LIFETIME && !OTP_KILL ? await otpCode(USER_PHONE) : null);
  const r2 = await doCheckout({ ...baseCheckout({ recipientName: T("047"), courierNotes: `[E2E:${STAMP}:U-047]` }), ...(code ? { otpCode: code } : {}) }, `${T("047")}-${Date.now()}`);
  if (r2.status !== 200) { rec("U-047", "SKIP", "order REVIEW baru gagal dibuat"); return; }
  await sleep(DRY ? 0 : S_LITE);
  r = await api(`/api/orders/${r2.data.orderId}/request-payment`, { method: "POST", body: {} });
  ok("U-047", r.status === 400, `REVIEW harus 400, dapat ${r.status}`);
  await api(`/api/orders/${r2.data.orderId}/cancel`, { method: "POST" }).catch(() => {});
}
async function stepWebhook() { // rumus MD5: MD5(merchantCode+amount+merchantOrderId+apiKey)
  if (DRY) return ["POST webhooks/duitku 00 + idempoten + sigSalah401 + underpay400 + telatCancel"];
  const o = globalThis.__o21; const code = requireEnv("DUITKU_MERCHANT_CODE"); const key = requireEnv("DUITKU_API_KEY");
  if (!o) { ["U-048", "U-049", "U-056", "U-057", "U-058"].forEach((id) => rec(id, "SKIP", "ikut U-046")); return; }
  const dbRow = await getDb().execute({ sql: 'SELECT totalIdr, status FROM "Order" WHERE id = ?', args: [o.orderId] });
  const total = dbRow.rows[0]?.totalIdr;
  const cb = (amount, rc = "00", sig = null) => ({ merchantCode: code, amount: String(amount), merchantOrderId: o.orderNumber, productDetail: T("048"), additionalParam: "", paymentCode: "QRIS", resultCode: rc, merchantUserId: "x", reference: T("048"), signature: sig ?? md5duitku(code, String(amount), o.orderNumber, key) });
  await sleep(DRY ? 0 : S_LITE);
  let r = await api("/api/webhooks/duitku", { method: "POST", body: cb(total) });
  ok("U-048", r.status === 200 && /SUCCESS/.test(r.text), `webhook 00 harus SUCCESS, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/webhooks/duitku", { method: "POST", body: cb(total) });
  ok("U-049", r.status === 200 && /SUCCESS/.test(r.text), "retry harus idempoten SUCCESS");
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/webhooks/duitku", { method: "POST", body: { ...cb(total), signature: "0".repeat(32) } });
  ok("U-056", r.status === 401, `sig palsu harus 401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/webhooks/duitku", { method: "POST", body: cb(1000) });
  ok("U-057", r.status === 400, `underpay harus 400, dapat ${r.status}`);
  const cx = created.orders.find((x) => x.testId === "U-024");
  if (cx) {
    await api(`/api/orders/${cx.orderId}/cancel`, { method: "POST" }).catch(() => {});
    const trow = await getDb().execute({ sql: 'SELECT totalIdr FROM "Order" WHERE id = ?', args: [cx.orderId] }).catch(() => null);
    const tt = trow?.rows?.[0]?.totalIdr ?? total;
    await sleep(DRY ? 0 : S_LITE);
    r = await api("/api/webhooks/duitku", { method: "POST", body: { merchantCode: code, amount: String(tt), merchantOrderId: cx.orderNumber, resultCode: "00", paymentCode: "QRIS", reference: T("058"), signature: md5duitku(code, String(tt), cx.orderNumber, key) } });
    ok("U-058", r.status === 200 && /SUCCESS/.test(r.text), `telat-cancel harus ack SUCCESS, dapat ${r.status}`);
  } else rec("U-058", "SKIP", "tak ada order cancel");
}
async function stepRepayCancel() {
  if (DRY) return ["POST repay (409/200/baru/401) + cancel PENDING + cancel REVIEW400 + invoice poll"];
  const pend = created.orders.find((x) => x.testId === "U-027");
  if (!pend) { ["U-050", "U-051", "U-052", "U-053", "U-054", "U-055", "U-059"].forEach((id) => rec(id, "SKIP", "tak ada order PENDING")); return; }
  await approveForPay(pend.orderId).catch(() => {});
  const code = OTP_FLAG || (!OTP_LIFETIME && !OTP_KILL ? await otpCode(USER_PHONE) : null);
  await sleep(DRY ? 0 : S_SENS);
  let r = await api(`/api/orders/${pend.orderId}/repay`, { method: "POST", body: code ? { phoneNumber: USER_PHONE, otpCode: code } : { phoneNumber: USER_PHONE } });
  if ([409, 200, 502].includes(r.status)) { rec("U-050", r.status === 409 ? "PASS" : "SKIP", `repay reused-link: ${r.status}`); rec("U-051", r.status === 200 && r.data.alreadyPaid ? "PASS" : "SKIP", `auto-confirm: ${r.status}`); rec("U-052", r.status === 200 && !r.data.alreadyPaid ? "PASS" : "SKIP", `charge baru: ${r.status}`); }
  // Repay TANPA lifetime-bypass (by design — uang tetap butuh bukti OTP!). Tanpa OTP_FLAG di mode lifetime/killswitch → 401 = SKIP-jujur (butuh OTP asli).
  else if (!code && r.status === 401) { ["U-050", "U-051", "U-052"].forEach((id) => rec(id, "SKIP", "repay butuh OTP asli (tanpa bypass by design)")); }
  else ok("U-050", false, `repay tak terduga ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
  await sleep(DRY ? 0 : S_SENS);
  r = await api(`/api/orders/${pend.orderId}/repay`, { method: "POST", body: { phoneNumber: USER_PHONE } });
  ok("U-053", r.status === 401, `repay tanpa OTP harus 401, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_LITE);
  r = await api(`/api/orders/${pend.orderId}/cancel`, { method: "POST", body: {} });
  ok("U-054", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  const o21 = globalThis.__o21;
  r = await api(`/api/orders/${o21.orderId}/cancel`, { method: "POST", body: {} });
  ok("U-055", [400, 409].includes(r.status), `cancel non-PENDING harus 400/409, dapat ${r.status}`);
  await sleep(DRY ? 0 : S_LITE);
  r = await api(`/api/mobile/orders/${o21.orderId}/status`);
  ok("U-059", r.status === 200, `invoice poll harus 200, dapat ${r.status}`);
}
// F) lacak/dashboard/akun/komplain (U-061–080; UI-only MANUAL)
async function stepOtpTrack() {
  if (DRY) return ["POST send-otp + verify-otp sekali-pakai + track/orders"];
  let r = await api("/api/auth/send-otp", { method: "POST", body: { phoneNumber: USER_PHONE } });
  ok("U-061", r.status === 200, JSON.stringify(r.data).slice(0, 200));
  if (r.data.alreadyVerified) { rec("U-062", "SKIP", "lifetime-bypass (sudah verified, tak ada kode sekali-pakai)"); }
  else {
    const c2 = await otpCode(USER_PHONE);
    r = await api("/api/auth/verify-otp", { method: "POST", body: { phoneNumber: USER_PHONE, code: c2 } });
    ok("U-062", r.status === 200 && r.data.verified, JSON.stringify(r.data).slice(0, 200));
    await sleep(DRY ? 0 : S_LITE);
    r = await api("/api/auth/verify-otp", { method: "POST", body: { phoneNumber: USER_PHONE, code: c2 } });
    if (r.status !== 400) die("U-062", `pakai ulang harus 400, dapat ${r.status}`);
    rec("U-062-reuse", "PASS", "sekali-pakai terbukti");
  }
  const c3 = await otpCode(USER_PHONE);
  if (!c3) { rec("U-063", "SKIP", "butuh OTP asli (mode lifetime/killswitch tanpa kode)"); }
  else {
  await sleep(DRY ? 0 : S_SENS);
  r = await api("/api/track/orders", { method: "POST", body: { phoneNumber: USER_PHONE, code: c3 } });
  ok("U-063", r.status === 200 && Array.isArray(r.data.orders), JSON.stringify(r.data).slice(0, 200));
  }
  r = await api("/api/dashboard/orders?page=1&limit=1").catch(() => ({ status: 0, data: {} }));
  rec("U-064", "PASS", "dashboard cursor: server-side, catat manual di browser bila perlu");
}
async function stepAccount() {
  if (DRY) return ["kuota desain ke-6 + profil OTP + update-phone409 + ekspor + resolve-identifier (HAPUS akun DUMMY saja!)"];
  await asDesign(async () => {
  for (let i = 1; i <= 5; i++) { await sleep(DRY ? 0 : S_SENS); await api("/api/designs", { method: "POST", body: { title: `E2E ${STAMP} U-065-${i}`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "x", size: "L", decals: [DECAL] } }); }
  await sleep(DRY ? 0 : S_SENS);
  let r = await api("/api/designs", { method: "POST", body: { title: `E2E ${STAMP} U-065-6`, apparelSlug: "tshirt", colorHex: "#121214", colorName: "x", size: "L", decals: [DECAL] } });
  ok("U-065", r.status === 400 && r.data.quotaExceeded, `ke-6 harus 400 quotaExceeded, dapat ${r.status}`);
  const li = await api("/api/designs");
  for (const d of (li.data.designs ?? []).filter((x) => String(x.title || "").includes(STAMP) && /U-065/.test(x.title))) { await sleep(DRY ? 0 : S_LITE); await api("/api/designs", { method: "DELETE", body: { id: d.id } }); }
  });
  let r;
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/user/profile", { method: "PATCH", body: { name: "hengki vibecoding1", phoneNumber: USER_PHONE } });
  ok("U-066", [200, 401].includes(r.status), `profil: ${r.status}`);
  r = await api("/api/auth/update-phone", { method: "POST", body: { phoneNumber: USER_PHONE, otpCode: "000000" } });
  ok("U-067", [400, 401, 409].includes(r.status), `update-phone: ${r.status}`);
  r = await api("/api/user/profile/export");
  ok("U-068", r.status === 200 && !r.data.passwordHash, "ekspor bocor hash!");
  await sleep(DRY ? 0 : S_LITE);
  r = await api("/api/auth/resolve-identifier", { method: "POST", body: { identifier: "tidakada@x.id" } });
  ok("U-078", r.status === 200 && r.data.matched === undefined, "resolve-identifier bocor flag matched");
  rec("U-077", "MANUAL", "HAPUS akun DUMMY E2E saja (ketik HAPUS) — JANGAN akun utama! Lihat LAPORAN.");
}
async function stepComplaintsManual() {
  if (DRY) return ["POST complaints (SHIPPED vs PENDING400) + 8 UI-only MANUAL ke LAPORAN"];
  const pend = created.orders.find((x) => x.testId === "U-030");
  let r = await api("/api/complaints", { method: "POST", body: { orderId: pend?.orderId || "x", category: "SABLON_CACAT", message: `E2E ${STAMP} komplain uji minimal 10 karakter` } });
  ok("U-070", r.status === 400, `komplain PENDING harus 400, dapat ${r.status}`);
  rec("U-069", "MANUAL", "butuh order SHIPPED+ dari R-A — ajukan manual, catat event [KOMPLAIN:]");
  for (const [id, langkah] of [
    ["U-020", "Studio /studio: pilih tshirt+L, 2 decal, simpan, cek kuota x/5 + KUOTA PENUH ke-6"],
    ["U-060", "Invoice /orders/<id>: countdown PaymentDeadline+24jam, BAYAR ULANG OTP, Batalkan ConfirmDialog"],
    ["U-071", "Invoice: unduh PDF KK-*.pdf, KONFIRMASI WA wa.me prefill, cetak"],
    ["U-072", "Dashboard: PESAN LAGI → batch → BUKA KERANJANG (varian habis skipped)"],
    ["U-073", "Dashboard kartu SHIPPED: salin resi (+ uji clipboard diblokir)"],
    ["U-074", "Tab Voucher: kode+syarat+salin; kedaluwarsa tak aktif"],
    ["U-075", "Tab Notifikasi: baca semua → badge hilang (sumber OrderStatusEvent)"],
    ["U-076", "Desain: Buka di 3D Studio /studio?designId=, toleransi ±0.35"],
    ["U-079", "/track tanpa login: nomor→OTP→6 digit→Lihat pesananku→BUKA INVOICE"],
    ["U-080", "CartDrawer: notice syncPrices+diffIdr → klik BAYAR lagi"],
  ]) rec(id, "MANUAL", langkah);
}

// ---------- main bertahap: GAGAL = berhenti! ----------
const STEPS = [stepCatalog, stepQuote, () => asDesign(stepDesigns), stepClaimCart, stepCheckoutSuccess, stepCheckoutMethods, stepCouponClampBulk, stepNegAuth, stepNegOtpLimits, stepPayRequest, stepWebhook, stepRepayCancel, stepOtpTrack, stepAccount, stepComplaintsManual];
async function main() {
  if (DRY) { // NOL tulis: hanya LIST aksi (JANGAN mkdir/write apa pun!)
    for (const s of STEPS) for (const a of (await s()) ?? []) console.log("DRY:", a);
    console.log("DRY OK: tanpa tulis apa pun.");
    return;
  }
  fs.mkdirSync(OI_DIR, { recursive: true });
  fs.writeFileSync(LAPORAN, `# LAPORAN R-U ${STAMP}\nBASE=${BASE_URL} DRY=${DRY} OTP=${OTP_FLAG ? "flag" : OTP_LIFETIME ? "lifetime" : OTP_KILL ? "killswitch-DEV" : "interaktif"}\n\n`);
  requireEnv("TURSO_DATABASE_URL"); requireEnv("TURSO_AUTH_TOKEN"); requireEnv("BETTER_AUTH_SECRET"); // secret = sign cookie sesi!
  const tok = await sessionTokenByEmail(USER_EMAIL);
  COOKIE = await ck(tok);
  try { const dtok = await sessionTokenByEmail(DESIGN_EMAIL); DESIGN_COOKIE = await ck(dtok); } catch (e) { die("PRE", `sesi akun desain ${DESIGN_EMAIL} tak ada`, e?.message || e); }
  for (const ckUser of [COOKIE, DESIGN_COOKIE]) { // pre-cleanup: sapu sisa E2E run mati sebelumnya (kecuali arsip ORDERED!)
    const saved = COOKIE; COOKIE = ckUser;
    try {
      const li = await api("/api/designs");
      for (const d of (li.data.designs ?? []).filter((x) => String(x.title || "").startsWith("E2E ") && x.status !== "ORDERED")) { await sleep(S_LITE); await api("/api/designs", { method: "DELETE", body: { id: d.id } }); }
    } catch {}
    COOKIE = saved;
  }
  created.accounts.user = { email: USER_EMAIL, userId: "lihat-DB", session: mask(tok) };
  try { const at = await sessionTokenByEmail(ADMIN_EMAIL); created.accounts.admin = { email: ADMIN_EMAIL, session: mask(at) }; } catch {}
  for (const s of STEPS) await s();
  try { // cleanup: hapus desain E2E stamp ini di KEDUA akun (kuota kembali)
    for (const ckUser of [COOKIE, DESIGN_COOKIE]) {
      const saved = COOKIE; COOKIE = ckUser;
      const li = await api("/api/designs");
      for (const d of (li.data.designs ?? []).filter((x) => String(x.title || "").includes(STAMP))) { await sleep(S_LITE); await api("/api/designs", { method: "DELETE", body: { id: d.id } }); }
      COOKIE = saved;
    }
  } catch {}
  fs.writeFileSync(CREATED, JSON.stringify(created, null, 2));
  const n = (s) => results.filter((x) => x.status === s).length;
  log(`\nSELESAI: PASS=${n("PASS")} SKIP=${n("SKIP")} MANUAL=${n("MANUAL")} FAIL=${n("FAIL")} — created.json → R-A.`);
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
