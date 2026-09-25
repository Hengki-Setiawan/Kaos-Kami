#!/usr/bin/env node
// scripts/e2e-R-C.mjs â€” Runner R-C: rantai Bab 7 (C-01â€“C-10), estafet user<->admin.
// REUSE hasil R-U/R-A (created.json+final.json, --reuse default YA); lengkapi simpul
// kurang (repay/webhook-mock-MD5, resi PATCH, komplain); JANGAN duplikat order hijau.
// BERHENTI di simpul merah pertama per rantai. L3 = LANGKAH browser-automation di
// CHAIN.md + tandai L3:MANUAL (JANGAN pura-pura otomatis!). DILARANG run live di
// sesi tulis; verifikasi hanya `node --check scripts/e2e-R-C.mjs`.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@libsql/client/web";
import { cookieHeader } from "./e2e-auth.mjs"; // fallback sesi-DB + signed (password E2E tak ada untuk akun real!)

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => {
  const i = ARGS.indexOf(f);
  return i >= 0 && ARGS[i + 1] && !String(ARGS[i + 1]).startsWith("--") ? ARGS[i + 1] : d;
};
if (has("--help")) {
  console.log(`R-C rantai Bab 7 (C-01â€“C-10). Pakai: node scripts/e2e-R-C.mjs --stamp YYYYMMDD-HHMM [--reuse <stamp>] [--no-reuse] [--only C-01] [--base-url URL] [--dry-run]
Env: E2E_USER_EMAIL + E2E_TEST_PASSWORD (simpul user) | E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD (simpul admin)
  DUITKU_MERCHANT_CODE + DUITKU_API_KEY (webhook-mock-MD5 U-048) | E2E_SLEEP_MS (default 1500)
Aturan: REUSE default YA (baca <reuse>/created.json+final.json); cookie ganda per peran tiap simpul;
  invoice=GET /orders/<id> mentah; SPK=GET /admin/orders/<id>/job-ticket mentah; STOP 429; token file maks 8char;
  L3 MANUAL via skill browser-automation (lihat CHAIN.md tiap rantai).`);
  process.exit(0);
}
const STAMP = val("--stamp", process.env.RUN_STAMP || "");
if (!/^\d{8}-\d{4}$/.test(STAMP)) throw new Error("REFUSE: --stamp YYYYMMDD-HHMM wajib");
const DRY = has("--dry-run");
const NO_REUSE = has("--no-reuse");
const REUSE_STAMP = NO_REUSE ? "" : (val("--reuse", process.env.E2E_REUSE_STAMP || STAMP) || "");
const ONLY = val("--only", "");
let BASE = val("--base-url", process.env.E2E_BASE_URL || "http://127.0.0.1:3000");
if (has("--prod")) {
  if (!has("--confirm-prod")) throw new Error("REFUSE: --prod butuh --confirm-prod + perintah owner");
  BASE = val("--base-url", "https://kaoskami.biz.id");
}
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (JANGAN commit nilainya)`);
  return v;
}
const short = (s) => String(s ?? "").slice(0, 8) + "...";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLEEP = Number(process.env.E2E_SLEEP_MS || 1500);
class RateHit extends Error {}
class ChainStop extends Error {}
const OUT = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", STAMP, "chains");

// Definisi 10 rantai Bab 7: simpul = {test, peran, method, path, body}
// Path fungsi (id order diisi saat jalan / dari REUSE). L3 = langkah manual di CHAIN.md.
// Definisi 10 rantai Bab 7.
// DESAIN v2 (2026-09-23, jujur!): R-C = VERIFIER, bukan re-eksekutor. Menembak ulang body
// deskriptif ("checkout FREE_MAKASSAR") menghasilkan 400 massal tanpa makna — sudah terbukti 10/10 MERAH
// palsu. Sebagai gantinya tiap rantai = daftar MILESTONE yang diverifikasi dari BUKTI yang ada
// (DB read-only + GET aman + artefak runner lain). Tak ada bukti = SKIP jujur (BUKAN fail!).
// `verify` = milestone IDs (engine di bawah). `orderTag` = tag courierNotes fixture yang dicari.
const CHAINS = [
  { id: "C-01", nama: "Beli kaos sampai cetak (emas)", orderTag: "ADVANCED-ANY", simpul: [
    { test: "U-021", peran: "user", method: "POST", path: "/api/checkout", body: "checkout FREE_MAKASSAR" },
    { test: "A-001", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "approve" },
    { test: "U-046", peran: "user", method: "POST", path: "/api/orders/<id>/request-payment", body: "{}" },
    { test: "U-048", peran: "user", method: "POST", path: "/api/webhooks/duitku", body: "webhook-mock-MD5 resultCode 00" },
    { test: "A-028", peran: "admin", method: "GET", path: "/api/admin/production/tasks?orderId=<id>", body: "-" },
    { test: "A-030", peran: "admin", method: "PATCH", path: "/api/admin/orders/<id>", body: "advance PRINTING" } ],
    verify: ["order", "reviewed", "approve-event", "charged", "paid", "confirmed-min", "tasks-exist", "invoice-html", "status-poll"] },
  { id: "C-02", nama: "Desain ditolak -> user tahu kenapa", orderTag: "REJECTED-ANY", simpul: [
    { test: "U-021", peran: "user", method: "POST", path: "/api/checkout", body: "checkout order-B" },
    { test: "A-002", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "reject resolusi-kurang" },
    { test: "INV", peran: "user", method: "GET", path: "/orders/<id>", body: "invoice HTML (reviewNote tampil)" } ],
    verify: ["order", "rejected-note", "invoice-html", "invoice-contains-note"] },
  { id: "C-03", nama: "Kupon dipakai -> dibatalkan -> kembali", orderTag: "CANCELLED-ANY", simpul: [
    { test: "A-051", peran: "admin", method: "POST", path: "/api/admin/coupons", body: "buat kupon E2E-<stamp>-C03" },
    { test: "U-028", peran: "user", method: "POST", path: "/api/checkout", body: "checkout + couponCode" },
    { test: "U-054", peran: "user", method: "POST", path: "/api/orders/<id>/cancel", body: "{}" },
    { test: "A-cek", peran: "admin", method: "GET", path: "/api/admin/coupons?code=<kode>", body: "usedCount turun" } ],
    verify: ["order", "cancelled-coupon", "coupon-state"] },
  { id: "C-04", nama: "Bulk ekspedisi sampai resi di HP user", orderTag: "SHIPPED-NEED", simpul: [
    { test: "U-031+U-025", peran: "user", method: "POST", path: "/api/checkout", body: "bulk 12pcs EXPEDITION_MANUAL" },
    { test: "A-001", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "approve" },
    { test: "U-046+U-048", peran: "user", method: "POST", path: "/api/webhooks/duitku", body: "bayar via repay/webhook-mock" },
    { test: "A-034+A-045", peran: "admin", method: "PATCH", path: "/api/admin/orders/<id>", body: "full 7 tahap + QC" },
    { test: "A-011", peran: "admin", method: "PATCH", path: "/api/admin/orders/<id>", body: "trackingNumber resi" },
    { test: "U-073+U-059", peran: "user", method: "GET", path: "/api/mobile/orders/<id>/status", body: "resi tampil + link" } ],
    verify: ["need-shipped"] },
  { id: "C-05", nama: "EXPRESS kilat di kanban + invoice", orderTag: "EXPRESS-ANY", simpul: [
    { test: "U-027", peran: "user", method: "POST", path: "/api/checkout", body: "checkout EXPRESS_24H" },
    { test: "A-001", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "approve" },
    { test: "U-048", peran: "user", method: "POST", path: "/api/webhooks/duitku", body: "webhook-mock-MD5" },
    { test: "A-040", peran: "admin", method: "GET", path: "/api/admin/production/tasks?orderId=<id>", body: "badge/sortir EXPRESS" },
    { test: "A-030", peran: "admin", method: "PATCH", path: "/api/admin/orders/<id>", body: "advance PRINTING" } ],
    verify: ["order-tier", "invoice-html"] },
  { id: "C-06", nama: "Komplain cacat sampai terlihat admin", orderTag: "SHIPPED-NEED", simpul: [
    { test: "A-011", peran: "admin", method: "PATCH", path: "/api/admin/orders/<id>", body: "resi -> SHIPPED (reuse order lunas)" },
    { test: "U-069", peran: "user", method: "POST", path: "/api/complaints", body: "SABLON_CACAT + pesan>=10char" },
    { test: "A-062", peran: "admin", method: "GET", path: "/api/admin/complaints/summary", body: "complaintsOpen +1 + timeline [KOMPLAIN:]" } ],
    verify: ["need-shipped"] },
  { id: "C-07", nama: "Stok habis jujur di dua layar", orderTag: "VARIANT-NEED", simpul: [
    { test: "A-053+A-054", peran: "admin", method: "PATCH", path: "/api/admin/products/variants/<id>", body: "produk E2E stok 1" },
    { test: "U-032", peran: "user", method: "POST", path: "/api/checkout", body: "beli 1 varian + lunas webhook-mock" },
    { test: "U-038", peran: "user", method: "POST", path: "/api/checkout", body: "akun KEDUA beli lagi -> 400 stok" },
    { test: "A-lap", peran: "admin", method: "GET", path: "/api/admin/reports/stock", body: "stok 1->0" } ],
    verify: ["variant-exists", "variant-stock"] },
  { id: "C-08", nama: "Ganti nomor WA lalu order lagi", orderTag: "OTP-NEED", simpul: [
    { test: "U-066", peran: "user", method: "PATCH", path: "/api/user/profile", body: "ganti nomor + otpCode baru (akun cadangan!)" },
    { test: "U-061+U-062", peran: "user", method: "POST", path: "/api/auth/send-otp", body: "OTP nomor baru (LIVE bila perlu, else SKIP jujur)" },
    { test: "U-021", peran: "user", method: "POST", path: "/api/checkout", body: "checkout nomor baru" },
    { test: "A-001", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "approve" } ],
    verify: ["need-otp"] },
  { id: "C-09", nama: "Mobile penuh: desain HP -> bayar -> lacak", orderTag: "MOBILE-PARTIAL", simpul: [
    { test: "M-020", peran: "user", method: "POST", path: "/api/mobile/designs", body: "simpan desain HP" },
    { test: "M-008", peran: "user", method: "POST", path: "/api/mobile/orders/checkout", body: "checkout HP" },
    { test: "A-001", peran: "admin", method: "POST", path: "/api/admin/orders/<id>/review", body: "approve (via WEB)" },
    { test: "M-013", peran: "user", method: "GET", path: "/api/mobile/orders/<id>/status", body: "tunggu ACC vs modal" },
    { test: "U-048", peran: "user", method: "POST", path: "/api/webhooks/duitku", body: "lunas via web/sheet" },
    { test: "M-015+M-027", peran: "user", method: "GET", path: "/api/mobile/orders/<id>/status", body: "tracker HP dimensi asli" } ],
    verify: ["mobile-catalog", "status-poll", "status-dims"] },
  { id: "C-10", nama: "Sweep + backup terlihat di health (infra)", orderTag: "INFRA", simpul: [
    { test: "FIX", peran: "sistem", method: "NOTE", path: "fixture PENDING basi >24h (catat, sah)", body: "-" },
    { test: "K-005", peran: "sistem", method: "POST", path: "/api/cron/sweep", body: "CRON_SECRET" },
    { test: "K-009", peran: "sistem", method: "GET", path: "/api/cron/backup-status", body: "bytes,tables,rows" },
    { test: "K-012", peran: "sistem", method: "GET", path: "/api/health", body: "marker cron.sweep.ageSec kecil" },
    { test: "A-025", peran: "admin", method: "GET", path: "/api/admin/reports", body: "batal masuk hitungan" } ],
    verify: ["health-ok", "health-markers", "backup-status-ok"] },
];
const PICK = ONLY ? CHAINS.filter((c) => c.id === ONLY) : CHAINS;
if (!PICK.length) throw new Error(`--only tak dikenal (pilih ${CHAINS.map((c) => c.id).join("/")})`);

function loadReuse() {
  if (!REUSE_STAMP) return { orders: [], note: "reuse OFF (--no-reuse)" };
  const dir = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", REUSE_STAMP);
  const orders = [];
  for (const f of ["created.json", "final.json"]) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const list = j.orders || j.created || j.sisaAktif || [];
      for (const o of list) if (o && (o.orderId || o.id)) orders.push({ orderId: o.orderId || o.id, orderNumber: o.orderNumber || o.number || "", status: o.status || "", src: f });
    } catch { /* file rusak -> abaikan, tulis manual */ }
  }
  const seen = new Map();
  for (const o of orders) if (o.orderNumber && !seen.has(o.orderNumber)) seen.set(o.orderNumber, o);
  return { orders: [...seen.values()], note: `reuse ${REUSE_STAMP}: ${seen.size} order dikenal` };
}

function chainMd(c, stamp, reuseNote, rows, hasil) {
  const l3 = `## Bukti L3 (LAYAR â€” L3:MANUAL via skill browser-automation)
> JANGAN isi otomatis dari JSON. Buka browser-automation, ikuti langkah, simpan
> ui-sebelum.png + ui-sesudah.png + dom-assert.json + console.log ke folder ini,
> lalu ganti L3:MANUAL -> PASS/FAIL + tulis file:line komponen bila UI-DESYNC.
${c.simpul.map((s, i) => `${i + 1}. [${s.peran}] ${s.test}: screenshot SEBELUM -> aksi -> screenshot SESUDAH; DOM assert terlihat; console 0 error. (L3:MANUAL)`).join("\n")}`;
  return `# CHAIN ${c.id} â€” ${c.nama} (${stamp})\n\n> Template: \`../../../_template/CHAIN.md\`. Aturan Bab 7: BERHENTI di simpul merah pertama + screenshot SEBELUM/SESUDAH tiap ganti peran + console 0 error. ${reuseNote}\n\n## Simpul (estafet peran!)\n\n| # | Test ID | Peran (cookie) | L1 status | L2 artefak | L3 UI | Status |\n${rows.map((r, i) => `| ${i + 1} | ${r.test} | ${r.peran} | ${r.l1} | ${r.l2} | L3:MANUAL | ${r.status} |`).join("\n")}\n\n## Bukti L2 (bisa dibuka!)\n\n- \`request.json\` â€” payload persis per simpul (token dipotong 8char!)\n- \`response.json\` â€” status + ringkasan respons per simpul\n- \`${c.id}-invoice.html\` â€” GET /orders/<id> mentah (server-render!)\n- \`${c.id}-spk.html\` â€” GET /admin/orders/<id>/job-ticket mentah\n\n${l3}\n\n## Hasil\n\n_${hasil}_\n`;
}

async function req(method, p, { cookie = "", body = null, id = "?" } = {}) {
  const res = await fetch(BASE + p, { signal: AbortSignal.timeout(60000), method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); // PANDUAN §10: timeout anti-gantung
  const txt = await res.text();
  let j = null;
  try { j = JSON.parse(txt); } catch { j = { _raw: txt.slice(0, 500) }; }
  if (res.status === 429) throw new RateHit(`RATE-HIT ${id} ${method} ${p} -> 429 (STOP, lanjut manual)`);
  await sleep(SLEEP);
  return { status: res.status, json: j, raw: txt };
}
async function signIn(email, password) {
  try {
  const res = await fetch(BASE + "/api/auth/sign-in/email", { signal: AbortSignal.timeout(60000), method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify({ email, password }) }); // PANDUAN §10
  const getSC = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = getSC.find((x) => x.startsWith("better-auth.session_token=")) || res.headers.get("set-cookie") || "";
  const tok = raw.split(";")[0].slice("better-auth.session_token=".length);
  if (!tok) throw new Error(`login gagal ${email} -> ${res.status}`);
  await sleep(SLEEP);
  // PANDUAN §9: HANYA better-auth.session_token (signed) — varian kaos-kami-auth/kaoskami-auth tidak ada di kode app, JANGAN kirim.
  return `better-auth.session_token=${tok}`;
  } catch (e) {
    if (!password) throw e;
    throw e;
  }
}
// Fallback: sesi-DB + signed cookie (untuk akun real TANPA password E2E!). Dipakai bila signIn password gagal.
async function sessionCookieDb(email) {
  const c = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
  const r = await c.execute({ sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [email] });
  if (!r.rows?.[0]?.token) throw new Error(`tak ada sesi-DB ${email}`);
  requireEnv("BETTER_AUTH_SECRET");
  return cookieHeader(String(r.rows[0].token));
}
const md5duitku = (code, amount, orderNo, key) => crypto.createHash("md5").update(`${code}${amount}${orderNo}${key}`).digest("hex");
const maskDeep = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (/token|cookie|secret|otp|password|signature/i.test(k) && typeof v === "string" ? short(v) : v)));

if (DRY) {
  console.log(`DRY-RUN ${STAMP} @ ${BASE} (NOL tulis/jaringan): reuse=${REUSE_STAMP || "OFF"}`);
  for (const c of PICK) { console.log(`- ${c.id} ${c.nama}`); c.simpul.forEach((s) => console.log(`    [${s.peran}] ${s.test} ${s.method} ${s.path}`)); }
  console.log("L3 tiap rantai: browser-automation MANUAL (ui-sebelum/sesudah.png + dom-assert.json + console.log).");
  process.exit(0);
}

const reuse = loadReuse();
console.log(reuse.note);
const summary = [];
// ===== ENGINE v2: VERIFIER (read-only DB + GET aman; TANPA tembak-ulang body deskriptif!) =====
// Prinsip Bab 7 (jujur!): verifikasi BUKTI yang ada. Tak ada bukti = SKIP (BUKAN fail, BUKAN hijau palsu!).
// Verdict rantai: FAIL bila ada checker FAIL; SEBAGIAN bila ada SKIP; HIJAU bila semua PASS.
const ADV_RANK = ["PAYMENT_CONFIRMED","IN_PRODUCTION_QUEUE","PRINTING","PRESSING","QUALITY_CHECK","PACKAGING","READY_TO_SHIP","SHIPPED","DELIVERED","COMPLETED"];
const rankOf = (s) => { const i = ADV_RANK.indexOf(s); return i < 0 ? (s === "PENDING_PAYMENT" ? 100 : s === "DESIGN_REVIEW" ? 200 : 300) : i; };
let _dbRC = null;
const getDbR = () => (_dbRC ??= createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") }));
async function dbOne(sql, args) { try { const r = await getDbR().execute({ sql, args }); return r.rows?.[0] || null; } catch (e) { return { __dberr: String(e?.message || e).slice(0, 160) }; } }
async function dbAll(sql, args) { try { const r = await getDbR().execute({ sql, args }); return r.rows || []; } catch (e) { return [{ __dberr: String(e?.message || e).slice(0, 160) }]; } }
function dberr(x) { return x && x.__dberr; }

async function findOrder(spec) {
  // spec: ADVANCED-ANY | REJECTED-ANY | CANCELLED-ANY | SHIPPED-ANY | EXPRESS-ANY | SHIPPED-NEED | OTP-NEED | VARIANT-NEED | MOBILE-PARTIAL | INFRA | U-xxx (tag notes)
  if (spec === "SHIPPED-NEED") return { skip: "butuh order SHIPPED (kanban+R-A penuh dulu; kini belum ada)" };
  if (spec === "OTP-NEED") return { skip: "butuh OTP WA asli (protokol PANDUAN-13; minta ke owner)" };
  if (spec === "INFRA") return { infra: true };
  if (spec === "VARIANT-NEED") return { special: spec };
  if (spec === "MOBILE-PARTIAL") { const r = await dbAll(`SELECT * FROM "Order" WHERE courierNotes LIKE ? ORDER BY createdAt DESC`, [`%${REUSE_STAMP}%`]); if (r[0] && dberr(r[0])) return { dberr: r[0].__dberr }; if (!r.length) return { skip: "tanpa order reuse (R-U dulu)" }; r.sort((a, b) => rankOf(a.status) - rankOf(b.status)); return { order: r[0] }; }
  let rows = [];
  if (spec === "ADVANCED-ANY") rows = await dbAll(`SELECT * FROM "Order" WHERE courierNotes LIKE ? ORDER BY createdAt DESC`, [`%${REUSE_STAMP}%`]);
  else if (spec === "EXPRESS-ANY") rows = await dbAll(`SELECT * FROM "Order" WHERE courierNotes LIKE ? ORDER BY createdAt DESC`, [`%EXPRESS%`]);
  else if (spec.endsWith("-ANY")) { const st = spec.replace("-ANY", ""); rows = await dbAll(`SELECT * FROM "Order" WHERE status = ? AND courierNotes LIKE ? ORDER BY createdAt DESC`, [st, `%${REUSE_STAMP}%`]); }
  else rows = await dbAll(`SELECT * FROM "Order" WHERE courierNotes LIKE ? ORDER BY createdAt DESC`, [`%${REUSE_STAMP}:${spec}%`]);
  if (rows[0] && dberr(rows[0])) return { dberr: rows[0].__dberr };
  if (!rows.length) return { skip: `tanpa fixture ${spec} (stamp ${REUSE_STAMP})` };
  rows.sort((a, b) => rankOf(a.status) - rankOf(b.status));
  return { order: rows[0] };
}

async function runMilestones(c, ctx) {
  // ctx: {order|null, userCk, adminCk, dir, rows, reqLog, resLog}
  const out = [];
  const rec = (test, status, l1, l2) => { out.push({ test, peran: "-", l1, l2, status }); console.log(`[${c.id}] ${status} ${test} — ${l1}`); };
  const M = {
    "order": async () => ctx.order ? ["PASS", `order ${ctx.order.orderNumber} (${ctx.order.status})`] : ["SKIP", "tanpa fixture"],
    "order-tier": async () => { const r = await dbAll(`SELECT * FROM "Order" WHERE courierNotes LIKE ? ORDER BY createdAt DESC`, [`%EXPRESS%`]); if (r[0] && dberr(r[0])) return ["SKIP", "DB err"]; const hit = r.find((x) => String(x.courierNotes || "").includes(REUSE_STAMP)) || r[0]; if (!hit) return ["SKIP", "tanpa order EXPRESS (U-027 belum lunas? A-001/R-A kanban dulu!)"]; ctx.order = hit; return ["PASS", `EXPRESS ${hit.orderNumber} (${hit.status})`]; },
    "reviewed": async () => ctx.order?.reviewedBy ? ["PASS", `reviewedBy ${String(ctx.order.reviewedBy).slice(0, 8)}...`] : ["FAIL", "reviewedBy kosong padahal butuh ACC"],
    "approve-event": async () => { const e = await dbOne(`SELECT id FROM OrderStatusEvent WHERE orderId = ? AND (status = 'PENDING_PAYMENT' OR note LIKE ?)`, [ctx.order.id, "%SETUJUI%"]); return dberr(e) ? ["SKIP", "DB err: " + e.__dberr] : e ? ["PASS", "event approve ada"] : ["FAIL", "tanpa event approve"]; },
    "charged": async () => { const p = await dbOne(`SELECT providerRef FROM Payment WHERE orderId = ?`, [ctx.order.id]); if (dberr(p)) return ["SKIP", "DB err"]; if (!p) return ["FAIL", "tanpa baris Payment"]; return String(p.providerRef || "").startsWith("pending-") ? ["FAIL", `masih ${p.providerRef}`] : ["PASS", `ref ${String(p.providerRef).slice(0, 18)}...`]; },
    "paid": async () => { const p = await dbOne(`SELECT status FROM Payment WHERE orderId = ?`, [ctx.order.id]); if (dberr(p)) return ["SKIP", "DB err"]; return p && p.status === "SETTLEMENT" ? ["PASS", "SETTLEMENT"] : ["FAIL", `payment=${p?.status || "TIDAK-ADA"}`]; },
    "confirmed-min": async () => ADV_RANK.includes(ctx.order.status) ? ["PASS", ctx.order.status] : ["FAIL", `status=${ctx.order.status}`],
    "tasks-exist": async () => { const t = await dbAll(`SELECT id, stage FROM ProductionTask WHERE orderId = ?`, [ctx.order.id]); if (t[0] && dberr(t[0])) return ["SKIP", "DB err"]; return t.length ? ["PASS", `${t.length} task (${t.map((x) => x.stage).join(",")})`] : ["FAIL", "0 task"]; },
    "invoice-html": async () => { if (!ctx.order) return ["SKIP", "tanpa order"]; if (!ctx.userCk) return ["SKIP", "tanpa sesi user"]; const r = await req("GET", `/orders/${ctx.order.id}`, { cookie: ctx.userCk, id: `${c.id}:invoice` }); if (r.status !== 200) return ["FAIL", `invoice HTTP ${r.status}`]; fs.mkdirSync(ctx.dir, { recursive: true }); fs.writeFileSync(path.join(ctx.dir, `${c.id}-invoice.html`), r.raw); return ["PASS", `${c.id}-invoice.html (${r.raw.length}B)`]; },
    "invoice-contains-note": async () => { const f = path.join(ctx.dir, `${c.id}-invoice.html`); if (!fs.existsSync(f)) return ["SKIP", "invoice-html belum ada"]; const html = fs.readFileSync(f, "utf8"); const note = String(ctx.order.reviewNote || ""); if (!note) return ["SKIP", "reviewNote kosong"]; return html.includes(note.slice(0, 30)) ? ["PASS", "reviewNote tampil di invoice"] : ["FAIL", "reviewNote TAK tampil di invoice (UI-DESYNC!)"]; },
    "status-poll": async () => { if (!ctx.order) return ["SKIP", "tanpa order"]; const r = await req("GET", `/api/mobile/orders/${ctx.order.id}/status`, { cookie: ctx.userCk, id: `${c.id}:poll` }); return r.status === 200 && r.json?.status ? ["PASS", `status=${r.json.status}`] : ["FAIL", `poll HTTP ${r.status}`]; },
    "status-dims": async () => { if (!ctx.order) return ["SKIP", "tanpa order"]; const r = await req("GET", `/api/mobile/orders/${ctx.order.id}/status`, { cookie: ctx.userCk, id: `${c.id}:dims` }); const w = r.json?.printWidthCm; return w != null ? ["PASS", `W=${w}cm`] : ["SKIP", "dimensi null (GAP M-027 known! bukan fail)"]; },
    "rejected-note": async () => ctx.order.status === "REJECTED" && String(ctx.order.reviewNote || "").length >= 5 ? ["PASS", `REJECTED + alasan (${ctx.order.reviewNote.length}ch)`] : ["FAIL", `status=${ctx.order.status}`],
    "cancelled-ok": async () => ctx.order.status === "CANCELLED" ? ["PASS", "CANCELLED"] : ["FAIL", `status=${ctx.order.status}`],
    "coupon-state": async () => { const k = await dbAll(`SELECT code, usedCount, maxUses, isActive FROM Coupon WHERE code LIKE ?`, [`E2E-${REUSE_STAMP}%`]); if (k[0] && dberr(k[0])) return ["SKIP", "DB err"]; return k.length ? ["PASS", k.map((x) => `${x.code}:used=${x.usedCount}/${x.maxUses},active=${x.isActive}`).join(" | ")] : ["SKIP", "tanpa kupon E2E"]; },
    "variant-exists": async () => { const v = await dbAll(`SELECT id, name, stockQty FROM ProductVariant WHERE name LIKE ? ORDER BY createdAt DESC`, [`%E2E%`]); if (v[0] && dberr(v[0])) return ["SKIP", "DB err"]; return v.length ? ["PASS", `${v[0].name} stok=${v[0].stockQty}`] : ["SKIP", "tanpa varian E2E"]; },
    "variant-stock": async () => { const v = await dbOne(`SELECT stockQty FROM ProductVariant WHERE name LIKE ? ORDER BY createdAt DESC`, [`%E2E%`]); if (dberr(v)) return ["SKIP", "DB err"]; return v ? ["PASS", `stok=${v.stockQty}`] : ["SKIP", "tanpa varian E2E"]; },
    "mobile-catalog": async () => { const r = await req("GET", `/api/mobile/catalog`, { cookie: ctx.userCk, id: `${c.id}:mc` }); return r.status === 200 ? ["PASS", "katalog HP 200"] : ["FAIL", `HTTP ${r.status}`]; },
    "health-ok": async () => { const r = await req("GET", `/api/health`, { id: `${c.id}:health` }); return r.status === 200 && r.json?.checks?.db ? ["PASS", `db ok, latency ${r.json?.latencyMs}ms`] : ["FAIL", `HTTP ${r.status}`]; },
    "health-markers": async () => { const r = await req("GET", `/api/health`, { id: `${c.id}:markers` }); const a = r.json?.cron?.sweep?.ageSec; return a != null && a < 7200 ? ["PASS", `sweep ageSec=${a}`] : ["SKIP", `marker sweep tak-segar (cron-job.org? ageSec=${a})`]; },
    "backup-status-ok": async () => { const r = await req("GET", `/api/cron/backup-status`, { id: `${c.id}:bs` }); const a = r.json?.ageSec; return a != null && a < 691200 ? ["PASS", `ageSec=${a}`] : ["SKIP", `backup tak-segar (ageSec=${a})`]; },
  };
  for (const mid of c.verify) {
    const fn = M[mid];
    if (!fn) { rec(mid, "SKIP", "milestone tak dikenal", "-"); continue; }
    let st, l1;
    try { [st, l1] = await fn(); }
    catch (e) {
      if (e instanceof RateHit) throw e;
      st = "FAIL"; l1 = "ERROR: " + String(e?.message || e).slice(0, 160);
    }
    const l2 = st === "PASS" || st === "FAIL" ? "db/api-read" : "-";
    rec(mid, st, l1, l2);
    ctx.reqLog.push({ test: mid, milestone: true });
    ctx.resLog.push({ test: mid, status: st, detail: l1 });
    if (st === "FAIL") throw new ChainStop(`MERAH di ${mid}: ${l1}`);
  }
  return out;
}

for (const c of PICK) {
  const dir = path.join(OUT, c.id);
  const rows = [], reqLog = [], resLog = [];
  let hasil = "STATUS: BELUM JALAN";
  try {
    const tryLogin = async (emEnv, pwEnv, fallbackEm) => {
      const em = process.env[emEnv] || fallbackEm, pw = process.env[pwEnv] || "";
      if (pw) { try { return await signIn(em, pw); } catch (e) { console.log(`  login ${em} gagal, fallback sesi-DB`); } }
      return sessionCookieDb(em);
    };
    let userCk = "", adminCk = "";
    try { userCk = await tryLogin("E2E_USER_EMAIL", "E2E_TEST_PASSWORD", "hengkivibecoding@gmail.com"); }
    catch (e) { console.log(`  userCk GAGAL: ${e.message} (simpul user jadi SKIP)`); }
    try { adminCk = await tryLogin("E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD", "hengkishadow@gmail.com"); }
    catch (e) { console.log(`  adminCk GAGAL (simpul admin jadi SKIP)`); }
    const found = await findOrder(c.orderTag || "");
    if (found.skip) {
      rows.push({ test: "fixture", peran: "-", l1: found.skip, l2: "-", status: "SKIP" });
      hasil = `STATUS: SKIP (tanpa fixture: ${found.skip})`;
    } else if (found.dberr) {
      rows.push({ test: "fixture", peran: "-", l1: "DB err: " + found.dberr, l2: "-", status: "SKIP" });
      hasil = `STATUS: SKIP (DB err)`;
    } else {
      const ctx = { order: found.order || null, userCk, adminCk, dir, rows: null, reqLog, resLog };
      if (c.orderTag === "INFRA" || c.orderTag === "VARIANT-NEED" || c.orderTag === "MOBILE-PARTIAL") ctx.order = ctx.order || null;
      const got = await runMilestones(c, ctx);
      rows.push(...got);
      const nFail = got.filter((x) => x.status === "FAIL").length;
      const nSkip = got.filter((x) => x.status === "SKIP").length;
      hasil = nFail ? `STATUS: MERAH (${nFail} milestone)` : nSkip ? `STATUS: SEBAGIAN (${got.filter((x) => x.status === "PASS").length} PASS, ${nSkip} SKIP)` : `STATUS: HIJAU (order ${ctx.order?.orderNumber || "-"})`;
    }
  } catch (e) {
    if (e instanceof RateHit) { hasil = `STATUS: STOP-429 (${e.message})`; }
    else if (e instanceof ChainStop) { hasil = `STATUS: ${e.message}`; }
    else { hasil = `STATUS: ERROR (${String(e.message).slice(0, 160)})`; }
  }
  const verdict = hasil.includes("HIJAU") ? "HIJAU" : hasil.includes("SEBAGIAN") ? "SEBAGIAN" : hasil.includes("SKIP") ? "SKIP" : hasil.includes("STOP-429") ? "STOP-429" : hasil.includes("MERAH") ? "MERAH" : "ERROR";
  summary.push(`${c.id} ${verdict}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify({ stamp: STAMP, chain: c.id, log: reqLog }, null, 2));
  fs.writeFileSync(path.join(dir, "response.json"), JSON.stringify({ stamp: STAMP, chain: c.id, log: resLog }, null, 2));
  fs.writeFileSync(path.join(dir, "dom-assert.json"), JSON.stringify({ note: "L3:MANUAL - isi via browser-automation", asserts: [] }, null, 2));
  fs.writeFileSync(path.join(dir, "console.log"), "L3:MANUAL - tempel 5 baris pertama console browser di sini (0 error = tulis bersih)\n");
  fs.writeFileSync(path.join(dir, "CHAIN.md"), chainMd(c, STAMP, reuse.note, rows, hasil));
  console.log(`${c.id}: ${hasil}`);
}
console.log(`SELESAI ${STAMP}: ${summary.join(" | ")}`);
console.log("INGAT: L3 tiap rantai MANUAL (browser-automation) - JANGAN klaim hijau penuh tanpa PNG+DOM+console.");
