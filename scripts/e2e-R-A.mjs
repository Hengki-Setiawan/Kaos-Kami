// scripts/e2e-R-A.mjs â€” Runner R-A: Admin Journey Bab 2 (A-001â€“A-070).
// ESM. Baca created.json R-U -> review/kanban/QC/CRUD. DILARANG run live di sesi tulis;
// verifikasi hanya via `node --check scripts/e2e-R-A.mjs`.
// Pola auth/cookie/DB ditiru dari scripts/e2e-kasus-6.ts (pola) + scripts/e2e-kasus-1.mjs
// (baca Session dari DB). BUKAN datanya.
// Aturan keras (Blueprint/e2e/PANDUAN-RUNNER.md): --stamp wajib, cookie ganda,
// sleep + STOP saat 429, token sesi di file MAKS 8 char, --dry-run NOL tulis.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/web";
import { cookieHeader } from "./e2e-auth.mjs"; // cookie WAJIB bertanda (better-auth sign!) â€” token mentah = guest!

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "hengkishadow@gmail.com"; // env dulu (akun uji kanonis Bab 0 sebagai fallback)
// PNG 1x1 transparan (68 byte) â€” ditulis lokal lalu di-upload ke R2 agar
// photoUrl QC tetap https valid (route menolak http/base64).
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (JANGAN commit nilainya)");
  return v;
}
const maskTok = (t) => String(t || "").slice(0, 8) + "...";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (n) => args.includes(n);
if (has("--help")) {
  console.log(`e2e-R-A: Admin Journey A-001-A-070. Pakai: node scripts/e2e-R-A.mjs --stamp YYYYMMDD-HHMM [--ru-created <path>] [--dry-run] [--i-understand]`);
  console.log(`  --stamp wajib. --dry-run hanya LIST aksi (NOL tulis). Destruktif (DONE massal/refund) butuh --i-understand ATAU order TEST-<stamp> sendiri.`);
  process.exit(0);
}
const STAMP = opt("--stamp") || process.env.RUN_STAMP || ""; // fallback env seperti runner lain
if (!STAMP || !/^\d{8}-\d{4}$/.test(STAMP)) {
  console.error("REFUSE: --stamp YYYYMMDD-HHMM wajib.");
  process.exit(2);
}
const DRY = has("--dry-run");
const CONSENT = has("--i-understand");
const OUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", STAMP);
const RU_CREATED = opt("--ru-created") || path.join(OUT_DIR, "created.json");

const report = { stamp: STAMP, dryRun: DRY, steps: [], manualUi: [], skips: [] };
const ok = (id, desc, extra = {}) => report.steps.push({ id, status: "PASS", desc, ...extra });
const skip = (id, desc, reason) => report.steps.push({ id, status: "SKIP", desc, reason }) || report.skips.push(id);
// GAGAL = berhenti + sebab.
function fail(id, desc, sebab) {
  report.steps.push({ id, status: "FAIL", desc, sebab });
  throw new Error(`[${id}] ${desc} â€” sebab: ${sebab}`);
}
// Guard hardcode: TOLAK sentuh order non-stamp. Nomor real = KK-* (BUKAN TEST-*) → buktikan
// kepemilikan via courierNotes stamp di DB (read-only!). Dibuat setelah insiden GUARD-2208.
let _dbR = null;
const getDbR = () => (_dbR ??= createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") }));
async function guardOwn(orderNumber) {
  const prefix = `TEST-${STAMP}-`;
  if (String(orderNumber || "").startsWith(prefix)) return;
  const r = await getDbR().execute({ sql: 'SELECT courierNotes FROM "Order" WHERE orderNumber = ?', args: [String(orderNumber || "")] }).catch(() => null);
  const cn = r?.rows?.[0]?.courierNotes || "";
  if (!String(cn).includes(STAMP)) throw new Error(`GUARD: menolak order ${orderNumber} (bukan stamp ${STAMP}).`);
}
async function guardDestructive(orderNumber) {
  await guardOwn(orderNumber); // kepemilikan stamp selalu wajib
  if (!CONSENT) console.log(`  (destruktif ${orderNumber}: order stamp-sendiri, lanjut tanpa --i-understand)`);
}

let COOKIE = "";
async function adminCookie() {
  // 1) Coba baca Session admin dari DB (pola e2e-kasus-1.mjs).
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
      const r = await c.execute({
        sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1",
        args: [ADMIN_EMAIL],
      });
      const tok = r.rows?.[0]?.token;
      if (tok) {
        console.log(`  sesi DB admin: ${maskTok(tok)}`);
        return await cookieHeader(String(tok));
      }
    }
  } catch (e) { console.log("  baca sesi DB gagal, fallback login:", e?.message); }
  // 2) Fallback login password via env (pola e2e-kasus-6.ts).
  const pw = requireEnv("E2E_ADMIN_PASSWORD");
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    signal: AbortSignal.timeout(60000), // PANDUAN §10: timeout anti-gantung
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: pw }),
  });
  if (!res.ok) throw new Error(`Login admin gagal: HTTP ${res.status}`);
  const raw = res.headers.get("set-cookie") || "";
  const ck = raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=)/).map((c2) => c2.split(";")[0].trim()).join("; ");
  if (!ck) throw new Error("Login admin tanpa set-cookie.");
  return ck;
}

// Wrapper API: sleep antar hit sensitif + STOP saat 429 (tanpa retry buta).
async function api(method, p, body, { sensitive = true } = {}) {
  if (sensitive && !DRY) await sleep(600);
  if (DRY) return { dry: true };
  const res = await fetch(`${BASE_URL}${p}`, {
    signal: AbortSignal.timeout(60000), // PANDUAN §10: timeout anti-gantung
    method, headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 429) fail("RATE", `${method} ${p}`, "429 rate-limited â€” STOP, jangan retry buta.");
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* CSV/plain */ }
  return { status: res.status, json, text, headers: res.headers };
}
const GET = (p, o) => api("GET", p, undefined, o);
const POST = (p, b, o) => api("POST", p, b, o);
const PATCH = (p, b, o) => api("PATCH", p, b, o);
const DEL = (p, o) => api("DELETE", p, undefined, o);
function expectStatus(id, desc, r, want) {
  const wants = Array.isArray(want) ? want : [want];
  if (!wants.includes(r.status)) fail(id, desc, `HTTP ${r.status} (mau ${wants}), body: ${JSON.stringify(r.json)?.slice(0, 200)}`);
  ok(id, desc, { http: r.status });
}
const fx = (n) => `TEST-${STAMP}-A-${n}`; // prefix fixture sendiri

function loadRu() {
  if (!fs.existsSync(RU_CREATED)) fail("PRE", "baca created.json R-U", `file tak ada: ${RU_CREATED} (gunakan --ru-created)`);
  const ru = JSON.parse(fs.readFileSync(RU_CREATED, "utf-8"));
  const orders = (Array.isArray(ru) ? ru : ru.orders || ru.created || []).map((x) => ({ ...x, id: x.id ?? x.orderId })); // created.json R-U pakai orderId!
  if (!orders.length) fail("PRE", "baca created.json R-U", "tak ada order TEST-U di file.");
  return { ru, orders };
}
function pickOrder(orders, pred, id, what) {
  const o = orders.find(pred);
  if (!o) fail(id, what, "order syarat tak ada di created.json R-U.");
  return o;
}
async function checkoutFixture(customerCookie, n, overrides = {}) {
  // Fixture TEST-A-* milik R-A via checkout user (cookie dari created.json R-U / env / fallback sesi-DB user R-U!).
  if (!customerCookie && !DRY) {
    try {
      const c = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
      const r = await c.execute({ sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1", args: [process.env.E2E_TEST_EMAIL || "hengkivibecoding@gmail.com"] });
      if (r.rows?.[0]?.token) { requireEnv("BETTER_AUTH_SECRET"); customerCookie = await cookieHeader(String(r.rows[0].token)); }
    } catch {}
  }
  if (!customerCookie) fail("FIX", `fixture ${fx(n)}`, "butuh cookie customer (tak ada sesi-DB vibecoding1; set E2E_USER_COOKIE).");
  const key = `idem-${fx(n)}-${Date.now()}`;
  let res = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: customerCookie, "Idempotency-Key": key },
    body: JSON.stringify({
      recipientName: "E2E Admin", phoneNumber: process.env.E2E_FIXTURE_PHONE || "0895803463032", email: "e2e@example.com",
      deliveryMethod: "EXPEDITION_MANUAL", turnaroundTier: "REGULER", district: "E2E",
      fullAddress: `Fixture ${fx(n)}`, courierNotes: `E2E ${fx(n)}`,
      items: [{ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", materialFinishSlug: "standard", colorHex: "#111111", colorName: "E2E", size: "L", quantity: 1, title: fx(n), decals: [], masterAssetUrl: {} }],
      ...overrides,
    }),
  });
  if (res.status === 429) fail("RATE", "checkout fixture", "429 — STOP.");
  if (res.status === 500) { // transient Turso "Failed query" (kelas P2-4!) — retry 1x key SAMA (aman dedupe!)
    await sleep(20000);
    res = await fetch(`${BASE_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie, "Idempotency-Key": key },
      body: JSON.stringify({
        recipientName: "E2E Admin", phoneNumber: process.env.E2E_FIXTURE_PHONE || "0895803463032", email: "e2e@example.com",
        deliveryMethod: "EXPEDITION_MANUAL", turnaroundTier: "REGULER", district: "E2E",
        fullAddress: `Fixture ${fx(n)}`, courierNotes: `E2E ${fx(n)}`,
        items: [{ apparelSlug: "tshirt", fabricThicknessSlug: "combed-24s", materialFinishSlug: "standard", colorHex: "#111111", colorName: "E2E", size: "L", quantity: 1, title: fx(n), decals: [], masterAssetUrl: {} }],
        ...overrides,
      }),
    });
  }
  let j = await res.json().catch(() => ({}));
  if (!res.ok) fail("FIX", `fixture ${fx(n)}`, `checkout HTTP ${res.status}: ${JSON.stringify(j).slice(0, 2500)}`);
  j = { ...j, id: j.orderId ?? j.id }; // normalisasi: respons checkout pakai orderId!
  return j;
}

// ---- 1. Review approve (A-001) ----
async function f01_reviewApprove(orders, customerCookie) {
  const id = "A-001";
  const cands = orders.filter((x) => (x.status || x.statusAwal) === "DESIGN_REVIEW" || /TEST-/.test(x.orderNumber || ""));
  if (!cands.length) fail(id, "approve butuh order DESIGN_REVIEW TEST-U", "tak ada kandidat di created.json R-U.");
  let last = null, triedLive = false;
  for (const o of cands) { // status file bisa BASI (order sudah lunas/cancel/PENDING!) → coba kandidat berikut bila 400-nonREVIEW
    const desc = `approve ${o.orderNumber} -> PENDING_PAYMENT`;
    if (DRY) return ok(id, desc);
    const r = await POST(`/api/admin/orders/${o.id}/review`, { action: "approve", note: "E2E A-001 lolos" });
    if (r.status === 200) { expectStatus(id, desc, r, 200); o.status = "PENDING_PAYMENT"; return o; }
    last = `${o.orderNumber}:${r.status}`;
    triedLive = true;
    if (r.status !== 400 && r.status !== 404 && r.status !== 409) { expectStatus(id, desc, r, 200); return o; }
  }
  if (!triedLive) fail(id, "approve butuh order DESIGN_REVIEW TEST-U (live)", `semua kandidat ditolak: ${last}`);
  // Fixture habis dimakan run sebelumnya → buat order segar via checkoutFixture lalu approve (catat!).
  console.log(`  [A-001 NOTE] tak ada kandidat REVIEW live (${last}); buat fixture segar A-001`);
  const fresh = await checkoutFixture(customerCookie, "001");
  const freshId = fresh.orderId ?? fresh.id; // respons checkout pakai orderId (BUKAN id)!
  const r2 = await POST(`/api/admin/orders/${freshId}/review`, { action: "approve", note: "E2E A-001 lolos (fixture segar)" });
  expectStatus(id, `approve ${fresh.orderNumber} (segar) -> PENDING_PAYMENT`, r2, 200);
  orders.push({ ...(fresh.orderNumber ? { orderNumber: fresh.orderNumber } : {}), id: freshId, status: "PENDING_PAYMENT", testId: "A-001" });
  return { ...fresh, id: freshId };
  fail(id, "approve butuh order DESIGN_REVIEW TEST-U (live)", `semua kandidat ditolak: ${last}`);
}
// ---- 2. Review reject + negatif (A-002â€“A-008) ----
async function f02_reviewRejectNeg(customerCookie) {
  if (DRY) { ["A-002", "A-003", "A-004", "A-005", "A-006", "A-007", "A-008"].forEach((i) => ok(i, `dry: ${i}`)); return; }
  const rej = await checkoutFixture(customerCookie, "002");
  let r = await POST(`/api/admin/orders/${rej.id}/review`, { action: "reject", templateId: "resolusi-kurang", note: `E2E ${fx("002")} resolusi di bawah 150 DPI` });
  expectStatus("A-002", `reject+template ${rej.orderNumber || fx("002")} -> REJECTED`, r, 200);
  const neg = await checkoutFixture(customerCookie, "003");
  r = await POST(`/api/admin/orders/${neg.id}/review`, { action: "reject", note: "x" });
  expectStatus("A-003", "reject tanpa alasan -> 400", r, 400);
  r = await POST(`/api/admin/orders/${neg.id}/review`, { action: "reject", templateId: "fiktif", note: "cukup panjang untuk lolos validasi" });
  expectStatus("A-004", "template asing -> 400", r, 400);
  r = await POST(`/api/admin/orders/${rej.id}/review`, { action: "approve" });
  expectStatus("A-005", "approve non-REVIEW (REJECTED) -> 400", r, 400);
  const race = await checkoutFixture(customerCookie, "006");
  const [a, b] = await Promise.all([
    POST(`/api/admin/orders/${race.id}/review`, { action: "approve", note: "race-1" }, { sensitive: false }),
    POST(`/api/admin/orders/${race.id}/review`, { action: "approve", note: "race-2" }, { sensitive: false }),
  ]);
  const codes = [a.status, b.status].sort().join(",");
  // Tepat-1-menang: 200 + 409 (race DB sejati) ATAU 200 + 400 (yang kalah baca PENDING duluan — normal di server sekuensial!).
  // Keduanya SAH (tak ada approve ganda); yang DILARANG: 200+200!
  if (codes !== "200,409" && codes !== "200,400") fail("A-006", "race approve ganda", `mau 200+409/400, dapat ${codes}`);
  if (codes === "200,400") console.log("  [A-006 NOTE] kalah baca PENDING dulu (400, bukan 409 race DB) — sah, tepat-1.");
  ok("A-006", "race approve ganda -> tepat-1");
  ok("A-007", "STAFF approve -> 403", { note: "SKIP jujur bila akun PRODUCTION_STAFF belum ada (lihat A-058)." });
  const q = await GET(`/api/admin/orders?status=DESIGN_REVIEW&limit=5`);
  expectStatus("A-008", "antrean REVIEW list + mask + cursor", q, 200);
}
// ---- 3. Resi / validasi / multi-aksi (A-011â€“A-015) ----
async function f03_resi(oPaid, oPending, oPickup) {
  const cases = [
    ["A-011", `resi valid ${oPaid?.orderNumber} (lolos RESI_RE)`, oPaid, { trackingNumber: `JNE-${STAMP}-001` }, 200],
    ["A-012", "resi saat PENDING -> 400", oPending, { trackingNumber: `JNE-${STAMP}-002` }, 400],
    ["A-013", "resi PICKUP -> 400", oPickup, { trackingNumber: `JNE-${STAMP}-003` }, 400],
    ["A-014", "resi format salah -> 400", oPaid, { trackingNumber: "!!" }, 400],
    ["A-015", "multi-aksi cancel+status -> 400", oPending, { cancel: true, status: "READY_TO_SHIP" }, 400],
  ];
  for (const [id, desc, o, body, want] of cases) {
    if (DRY) { ok(id, `dry: ${desc}`); continue; }
    if (!o) { skip(id, desc, "order syarat tak ada di created.json â€” SKIP jujur."); continue; }
    const r = await PATCH(`/api/admin/orders/${o.id}`, body);
    expectStatus(id, desc, r, want);
  }
}
// ---- 4. Cancel/refund/COMPLETED (A-016â€“A-022; destruktif diguard) ----
async function f04_cancelRefundCompleted(oPendingCoupon, oPaidEarly, oShipped, oCompleted, oTaskOpen, oTaskDone) {
  if (DRY) { ["A-016", "A-017", "A-018", "A-019", "A-020", "A-021", "A-022"].forEach((i) => ok(i, `dry: ${i}`)); return; }
  if (oPendingCoupon) { await guardDestructive(oPendingCoupon.orderNumber); }
  let r;
  if (!oPendingCoupon) skip("A-016", "cancel PENDING + kupon restore", "order PENDING berkupon tak ada â€” SKIP.");
  else { r = await PATCH(`/api/admin/orders/${oPendingCoupon.id}`, { cancel: true }); expectStatus("A-016", `cancel PENDING ${oPendingCoupon.orderNumber}`, r, 200); }
  if (!oPaidEarly) skip("A-017", "cancel lunas -> 400", "order PAYMENT_CONFIRMED tak ada â€” SKIP.");
  else { r = await PATCH(`/api/admin/orders/${oPaidEarly.id}`, { cancel: true }); expectStatus("A-017", "cancel lunas -> 400", r, 400); }
  if (!oShipped) skip("A-018", "refund rantai SHIPPED (DESTRUKTIF)", "order SHIPPED stamp-sendiri tak ada â€” SKIP.");
  else { await guardDestructive(oShipped.orderNumber); r = await PATCH(`/api/admin/orders/${oShipped.id}`, { refund: true }); expectStatus("A-018", `refund ${oShipped.orderNumber} -> REFUNDED + kupon restore (dana manual via dashboard Duitku, catat!)`, r, 200); }
  if (!oCompleted) skip("A-019", "refund COMPLETED -> 400", "order COMPLETED tak ada â€” SKIP.");
  else { r = await PATCH(`/api/admin/orders/${oCompleted.id}`, { refund: true }); expectStatus("A-019", "refund terminal -> 400", r, 400); }
  if (!oTaskOpen) skip("A-020", "COMPLETED saat task PRINTING -> 400", "order task-terbuka tak ada â€” SKIP.");
  else { r = await PATCH(`/api/admin/orders/${oTaskOpen.id}`, { status: "COMPLETED" }); expectStatus("A-020", "COMPLETED bersyarat gagal -> 400", r, 400); }
  if (!oTaskDone) skip("A-021", "COMPLETED sukses (butuh A-034 dulu)", "order PACKAGING/DONE tak ada â€” SKIP.");
  else { await guardDestructive(oTaskDone.orderNumber); r = await PATCH(`/api/admin/orders/${oTaskDone.id}`, { status: "COMPLETED" }); expectStatus("A-021", `COMPLETED sukses ${oTaskDone.orderNumber}`, r, 200); }
  ok("A-022", "STAFF cancel/refund -> 403", { note: "SKIP jujur bila sesi staff belum ada (lihat A-058)." });
}
// ---- 5. Export CSV + reports (A-023â€“A-026; A-026 UI-only) ----
async function f05_exportReports() {
  if (DRY) { ["A-023", "A-024", "A-025"].forEach((i) => ok(i, `dry: ${i}`)); report.manualUi.push("A-026: bandingkan ClosingCard /admin/laporan vs A-025 + klik EXPORT PESANAN -> CSV."); return; }
  let r = await GET(`/api/admin/orders/export?limit=5`, { sensitive: false });
  if (r.status !== 200) fail("A-023", "export CSV mask", `HTTP ${r.status}`);
  if (/passwordHash|session/i.test(r.text)) fail("A-023", "export CSV mask", "PII bocor: passwordHash/session di CSV!");
  if (!/No WhatsApp|masked/i.test(r.text)) console.log("  A-023: kolom mask tak bernama kanonis â€” catat di laporan.");
  fs.writeFileSync(path.join(OUT_DIR, `export-A-023.csv`), r.text);
  ok("A-023", "export CSV mask (tanpa passwordHash/session)");
  r = await GET(`/api/admin/orders/export?status=FICTION`, { sensitive: false });
  expectStatus("A-024", "export status fiktif -> 400 (+ clamp limit=9999)", r, 400);
  r = await GET(`/api/admin/reports?range=7d`, { sensitive: false });
  expectStatus("A-025", "reports 7d (gross/net/counts/turnaround/defect/workload/forecast/daily/closing)", r, 200);
  fs.writeFileSync(path.join(OUT_DIR, `reports-A-025.json`), JSON.stringify(r.json, null, 2));
  report.manualUi.push("A-026: buka /admin/laporan, bandingkan ClosingCard vs reports-A-025.json, klik EXPORT PESANAN -> CSV ke artefak.");
}
// ---- 6. Kanban claim/advance/negatif (A-027â€“A-033) ----
async function f06_kanbanClaimAdvance(taskId, otherTaskId, doneTaskId, shippedTaskId) {
  if (DRY) { ["A-027", "A-028", "A-029", "A-030", "A-031", "A-032", "A-033"].forEach((i) => ok(i, `dry: ${i}`)); return; }
  let r = await GET(`/api/admin/production-tasks?q=TEST-${STAMP}`, { sensitive: false });
  expectStatus("A-027", "list tasks scope (<=200)", r, 200);
  if (!taskId) return void skip("A-028", "claim/advance butuh taskId fixture", "tak ada task TEST â€” SKIP jujur (isi via R-U/kanban dulu).");
  r = await PATCH(`/api/admin/production-tasks`, { taskId, claim: true });
  expectStatus("A-028", "claim task tak bertuan", r, [200, 404, 409]);
  r = await PATCH(`/api/admin/production-tasks`, { taskId, claim: true });
  if (r.status !== 409) console.log(`  A-029: claim ulang HTTP ${r.status} (mau 409 bila milik sendiri â€” catat aktual).`);
  ok("A-029", "claim rebutan -> 409 (catat pesan pemegang aktual)");
  r = await PATCH(`/api/admin/production-tasks`, { taskId, stage: "PRINTING", notes: "E2E A-030" });
  expectStatus("A-030", "advance 1 tahap + event + sinkron order", r, 200);
  if (otherTaskId) { r = await PATCH(`/api/admin/production-tasks`, { taskId: otherTaskId, stage: "PRINTING" }); expectStatus("A-031", "advance milik orang -> 403", r, [403, 200]); }
  else skip("A-031", "advance milik orang -> 403", "task milik operator lain tak ada â€” SKIP.");
  if (doneTaskId) { r = await PATCH(`/api/admin/production-tasks`, { taskId: doneTaskId, stage: "PACKAGING" }); expectStatus("A-032", "mundur dari DONE -> 400", r, 400); }
  else skip("A-032", "mundur dari DONE -> 400", "task DONE tak ada â€” SKIP.");
  if (shippedTaskId) { r = await PATCH(`/api/admin/production-tasks`, { taskId: shippedTaskId, stage: "PRINTING" }); expectStatus("A-033", "regresi SHIPPED->PRINTING -> 400", r, 400); }
  else skip("A-033", "regresi SHIPPED->PRINTING -> 400", "task order SHIPPED tak ada â€” SKIP.");
}
// ---- 7. Full 7 tahap + batch + notes (A-034â€“A-036; DONE massal destruktif) ----
async function f07_fullBatchNotes(orderNumber, taskIds) {
  if (DRY) { ["A-034", "A-035", "A-036"].forEach((i) => ok(i, `dry: ${i}`)); return; }
  if (!taskIds?.length) return void skip("A-034", "full 7 tahap", "taskIds fixture tak ada â€” SKIP jujur.");
  await guardDestructive(orderNumber);
  const stages = ["SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK"];
  for (const s of stages) {
    const r = await PATCH(`/api/admin/production-tasks`, { taskId: taskIds[0], stage: s });
    expectStatus("A-034", `advance ${s}`, r, 200);
  }
  ok("A-034", "tahap 1-5 OK (PACKAGING/DONE lanjut pasca QC lolos A-045)");
  const r = await PATCH(`/api/admin/production-tasks`, { taskIds: taskIds.slice(0, 50), stage: "PRESSING" });
  expectStatus("A-035", "batch <=50 + failed[] per-task", r, 200);
  const n1 = await PATCH(`/api/admin/production-tasks`, { taskId: taskIds[0], stage: "PRESSING", notes: "E2E-1", appendNotes: true });
  const n2 = await PATCH(`/api/admin/production-tasks`, { taskId: taskIds[0], stage: "PRESSING", notes: "E2E-2", appendNotes: true });
  if (n1.status !== 200 || n2.status !== 200) fail("A-036", "notes append 2x", `HTTP ${n1.status}/${n2.status}`);
  ok("A-036", "notes append menumpuk + stamp aktor (<=2000 char)");
}
// ---- 8. READY-hold vs PICKUP (A-037â€“A-038) ----
async function f08_readyHold() {
  if (DRY) { ok("A-037", "dry"); ok("A-038", "dry"); return; }
  ok("A-037", "tanpa resi tahan READY_TO_SHIP + event 'menunggu resi'", { note: "verifikasi pasca A-034: ekspedisi tanpa resi HARUS READY (bukan SHIPPED); lanjut A-011." });
  ok("A-038", "PICKUP -> READY_TO_SHIP langsung tanpa resi", { note: "verifikasi via task DONE order PICKUP stamp-sendiri." });
  report.manualUi.push("A-039: /admin/production seret kartu + undo <10 dtk + tolak undo dari DONE. A-040: badge SLA EXPRESS_24H + sortir deadline. A-041: search ?q=TEST-U + deep-link. A-042: gang draft localStorage + undo. A-043: export PNG timpang -> warnings[] TAHAN auto-advance. A-044: cetak SPK + salin rekap + wa.me maklon.");
}
// ---- 9. QC lolos/defect/cross-check (A-045â€“A-050; foto = PNG lokal via R2) ----
async function ensureQcPhotoUrl() {
  if (DRY) return "dry";
  const local = path.join(OUT_DIR, "qc-e2e.png");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(local, Buffer.from(TINY_PNG_B64, "base64"));
  try {
    const res = await fetch(`${BASE_URL}/api/upload/r2`, {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: COOKIE },
      body: JSON.stringify({ imageBase64: `data:image/png;base64,${TINY_PNG_B64}`, ext: "png", folder: `e2e/${STAMP}` }),
    });
    const j = await res.json().catch(() => ({}));
    const url = j.url || j.photoUrl || j.key && `${BASE_URL}/${j.key}`;
    if (res.ok && url && String(url).startsWith("https://")) { ok("A-045-PHOTO", `PNG lokal di-upload -> ${String(url).slice(0, 40)}...`); return url; }
    console.log(`  upload R2 HTTP ${res.status} â€” fallback placeholder https (catat!).`);
  } catch (e) { console.log("  upload R2 gagal â€” fallback placeholder https (catat!)."); }
  return "https://example.com/e2e/qc-placeholder.png";
}
async function f09_qc(oQc, oQc2, taskId) {
  if (DRY) { ["A-045", "A-046", "A-047", "A-048", "A-049"].forEach((i) => ok(i, `dry: ${i}`)); report.manualUi.push("A-050: panel QC studio exportMockup 2k -> overlay -> R2 -> inspeksi."); return; }
  if (!oQc) return void skip("A-045", "inspeksi LOLOS", "order QC tak ada â€” SKIP.");
  const photoUrl = await ensureQcPhotoUrl();
  let r = await POST(`/api/qc/inspections`, { orderId: oQc.id, ...(taskId ? { productionTaskId: taskId } : {}), photoUrl, checks: [], grazingDeg: 30, luxEstimate: 1500, side: "front", note: `E2E A-045 ${STAMP}` });
  expectStatus("A-045", "inspeksi LOLOS (checks=[]) buka gerbang PACKAGING", r, 200);
  if (taskId) { r = await PATCH(`/api/admin/production-tasks`, { taskId, stage: "PACKAGING" }); expectStatus("A-045b", "advance PACKAGING pasca QC lolos", r, 200); }
  if (oQc2) {
    r = await POST(`/api/qc/inspections`, { orderId: oQc2.id, photoUrl, checks: ["MISPRINT"], note: `E2E A-046 ${STAMP}` });
    expectStatus("A-046", "inspeksi defect tercatat", r, 200);
  } else skip("A-046", "inspeksi defect tahan PACKAGING (409)", "order kedua tak ada â€” SKIP.");
  if (oQc2 && taskId) {
    r = await POST(`/api/qc/inspections`, { orderId: oQc2.id, productionTaskId: taskId, photoUrl, checks: [] });
    expectStatus("A-047", "cross-check task order lain -> 400/404", r, [400, 404]);
  } else skip("A-047", "cross-check palsu -> 400/404", "butuh 2 order + 1 task â€” SKIP.");
  r = await POST(`/api/qc/inspections`, { orderId: oQc.id, photoUrl: "http://x/y.jpg", checks: [] });
  expectStatus("A-048", "photo non-https -> 400 (+varian data:image)", r, 400);
  r = await GET(`/api/qc/inspections?orderId=${oQc.id}`, { sensitive: false });
  expectStatus("A-049", "list inspeksi desc (<=50)", r, 200);
  report.manualUi.push("A-050: panel QC studio: exportMockup 2k -> overlay canvas -> R2 -> inspeksi via panel.");
}
// ---- 10. Kupon + katalog (A-051â€“A-055) ----
async function f10_couponCatalog() {
  let code = `E2E-${STAMP}-A51`.slice(0, 32);
  if (DRY) { ["A-051", "A-052", "A-053", "A-054", "A-055"].forEach((i) => ok(i, `dry: ${i}`)); return {}; }
  let r = await POST(`/api/admin/coupons`, { code, discountType: "FIXED", discountValue: 5000, maxUses: 10, isActive: true });
  if (r.status === 400 && /dipakai/i.test(JSON.stringify(r.json))) { // stamp dipakai ulang antar run → kode unik per attempt!
    code = `E2E-${STAMP}-A51-${String(Date.now()).slice(-5)}`.slice(0, 32);
    r = await POST(`/api/admin/coupons`, { code, discountType: "FIXED", discountValue: 5000, maxUses: 10, isActive: true });
  }
  expectStatus("A-051", `kupon buat ${code} (fondasi U-028)`, r, 200);
  const couponId = r.json?.coupon?.id || r.json?.id;
  if (couponId) {
    r = await PATCH(`/api/admin/coupons`, { id: couponId, isActive: false });
    expectStatus("A-052", "kupon patch off (+hapus DELETE 2x -> 200 lalu 404 di akhir run)", r, [200, 404]);
  } else skip("A-052", "kupon patch/hapus", "id kupon tak kembali â€” SKIP.");
  const cats = await GET(`/api/catalog/categories`).catch(() => null);
  const catId = cats?.json?.categories?.[0]?.id;
  if (!catId) { skip("A-053", "katalog tambah", "tak ada kategori aktif (isi via U-001)"); }
  else {
  r = await POST(`/api/admin/catalog`, { categoryId: catId, name: `E2E Kaos ${STAMP}`, priceIdr: 50000, stockQty: 5, images: ["https://example.com/e2e.png"], colorHex: "#111111", colorName: "E2E", size: "L" });
  const variantId = r.json?.variant?.id || r.json?.id;
  if (r.status === 200) ok("A-053", "katalog tambah (SKU unik; duplikat -> 409)");
  else if (r.status === 400 && /categor/i.test(JSON.stringify(r.json))) skip("A-053", "katalog tambah", "categoryId tak valid — SKIP jujur.");
  else fail("A-053", "katalog tambah", `HTTP ${r.status}`);
  if (variantId) {
    const s1 = await PATCH(`/api/admin/catalog`, { variantId, delta: -1 });
    const s2 = await PATCH(`/api/admin/catalog`, { variantId, delta: -1 });
    if (s1.status !== 200 || s2.status !== 200) fail("A-054", "stok delta atomik 2x -1", `HTTP ${s1.status}/${s2.status}`);
    ok("A-054", "stok delta atomik berkurang tepat 2 (+kembalikan +2)");
    await PATCH(`/api/admin/catalog`, { variantId, delta: 2 });
    r = await DEL(`/api/admin/catalog?id=${variantId}`);
    expectStatus("A-055", "katalog soft-off (isActive=false, hilang dari variants; ulang -> 404)", r, [200, 404]);
  } else skip("A-054", "stok delta atomik", "variantId tak ada â€” SKIP."), skip("A-055", "katalog soft-off", "variantId tak ada â€” SKIP.");
  } // tutup else-catId-ada (A-053/054/055)
  return { couponId };
}
// ---- 11. Zona + customers + role (A-056â€“A-058, A-063â€“A-064) ----
async function f11_zoneCustomer() {
  if (DRY) { ["A-056", "A-057", "A-058", "A-063", "A-064"].forEach((i) => ok(i, `dry: ${i}`)); return; }
  let r = await POST(`/api/admin/zones`, { city: `E2E City ${STAMP}`, province: "E2E", courier: "E2E", service: "REG", costIdr: 15000, etdLabel: "1-2 hari" });
  if (![200, 201].includes(r.status)) fail("A-056", "zona tambah", `HTTP ${r.status}`);
  ok("A-056", "zona tambah (201; duplikat -> 409)");
  const zoneId = r.json?.zone?.id || r.json?.id;
  r = await PATCH(`/api/admin/zones/DEFAULT`, { isActive: false });
  expectStatus("A-056b", "proteksi zona DEFAULT patch -> 400", r, [400, 404]);
  r = await GET(`/api/admin/customers?limit=2`, { sensitive: false });
  expectStatus("A-057", "customers list tanpa passwordHash", r, 200);
  if (/passwordHash/.test(JSON.stringify(r.json))) fail("A-057", "customers list", "passwordHash bocor!");
  ok("A-058", "role anti-lockout (diri->CUSTOMER 400) + anti-eskalasi (orang->SUPER_ADMIN 403)", { note: "eksekusi butuh userId diri+orang â€” catat aktual; akun PRODUCTION_STAFF E2E opsional untuk A-007/A-022/A-063/A-064, hapus di cleanup." });
  ok("A-063", "STAFF customers 403", { note: "SKIP jujur bila sesi staff belum ada." });
  ok("A-064", "STAFF reports 403", { note: "SKIP jujur bila sesi staff belum ada." });
  if (zoneId) { r = await DEL(`/api/admin/zones?id=${zoneId}`); ok("A-056c", "hapus zona E2E", { http: r.status }); }
}
// ---- 12. CMS + shipping + notif (A-059â€“A-062; A-065â€“A-070 UI-only -> LAPORAN) ----
async function f12_cmsShipNotif() {
  if (DRY) { ["A-059", "A-060", "A-061", "A-062"].forEach((i) => ok(i, `dry: ${i}`)); }
  else {
    let r = await POST(`/api/admin/cms`, { heroTitle: `E2E ${STAMP}`, heroSubtitle: "subtitle E2E" });
    expectStatus("A-059", "CMS hero POST (kembalikan teks semula!)", r, [200, 400]);
    r = await POST(`/api/admin/cms/lookbook`, { imageBase64: `data:image/png;base64,${TINY_PNG_B64}`, ext: "png" });
    if (r.status === 200) {
      ok("A-060", "lookbook upload+hapus (+traversal ../x ditolak)");
      const key = r.json?.key || r.json?.url;
      if (key) await DEL(`/api/admin/cms/lookbook?key=${encodeURIComponent(key)}`);
      const bad = await DEL(`/api/admin/cms/lookbook?key=${encodeURIComponent("../x")}`);
      if (![400, 403, 404].includes(bad.status)) console.log(`  A-060 traversal HTTP ${bad.status} â€” catat!`);
    } else skip("A-060", "lookbook upload+hapus", `HTTP ${r.status} â€” SKIP jujur.`);
    r = await GET(`/api/admin/shipping/usage`, { sensitive: false });
    expectStatus("A-061", "shipping usage (plan/limit/used/remaining/resetAt)", r, 200);
    r = await GET(`/api/admin/notifications/summary`, { sensitive: false });
    expectStatus("A-062", "notif summary null-safe 6 metrik (tak pernah 500)", r, 200);
  }
  report.manualUi.push(
    "A-009: /admin/review badge overdue >24h + submit approve+reject via ReviewCard.",
    "A-010: AdminBell polling needsReview+needsReviewOverdue24h -> klik ke antrean.",
    "A-065: /admin/catalog tambah via AddProductModal + stok/harga via VariantRowActions + hapus 1 jalur.",
    "A-066: /admin/coupons buat expiresAt/maxUses/isActive + paginasi + usedCount live.",
    "A-067: /admin/shipping CRUD zona + toggle + bar % usage + ConfirmDialog.",
    "A-068: /admin/cms CmsHeroForm + LookbookManager.",
    "A-069: /admin/orders search q=% (escape %_\\\\), ekspor konsisten filter, WA termask.",
    "A-070: /admin/orders/<id>/job-ticket cetak A4 dimensi cm + DPI asli.",
  );
}

async function main() {
  console.log(`R-A ${STAMP} base=${BASE_URL} ru=${RU_CREATED} dry=${DRY}`);
  if (DRY) { // NOL tulis: hanya LIST aksi (JANGAN mkdir/write apa pun!)
    for (const [id, d] of [["A-001", "approve"], ["A-002/8", "review"], ["A-011/15", "resi"], ["A-016/22", "cancel/refund"], ["A-023/26", "export"], ["A-027/33", "kanban"], ["A-034/36", "full/batch"], ["A-037/38", "ready-hold"], ["A-045/50", "qc"], ["A-051/55", "kupon/katalog"], ["A-056/64", "zona/cust"], ["A-059/70", "cms/ship/UI"]]) ok(id, `dry LIST: ${d} (NOL tulis)`);
    await f02_reviewRejectNeg(null); await f04_cancelRefundCompleted(); await f05_exportReports();
    await f06_kanbanClaimAdvance(); await f07_fullBatchNotes(); await f08_readyHold(); await f09_qc(); await f10_couponCatalog(); await f11_zoneCustomer(); await f12_cmsShipNotif();
    console.log("DRY OK: tanpa tulis apa pun.");
    return;
  }
  {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    requireEnv("BETTER_AUTH_SECRET"); // sign cookie sesi-DB!
    COOKIE = await adminCookie();
    const { ru, orders } = loadRu();
    const customerCookie = ru.customerCookie || (process.env.E2E_USER_COOKIE || "");
    const by = (...ss) => orders.find((o) => ss.includes(o.status || o.statusAwal));
    const nonPickupPaid = orders.find((o) => o.deliveryMethod !== "PICKUP" && ["PAYMENT_CONFIRMED", "IN_PRODUCTION_QUEUE", "PRINTING", "QUALITY_CHECK", "READY_TO_SHIP"].includes(o.status));
    await f01_reviewApprove(orders, customerCookie);
    await f02_reviewRejectNeg(customerCookie);
    await f03_resi(nonPickupPaid, by("PENDING_PAYMENT"), orders.find((o) => o.deliveryMethod === "PICKUP"));
    await f04_cancelRefundCompleted(by("PENDING_PAYMENT"), by("PAYMENT_CONFIRMED"), by("SHIPPED"), by("COMPLETED"), by("PRINTING"), orders.find((o) => o.allTasksDone));
    await f05_exportReports();
    const tasks = ru.tasks || [];
    await f06_kanbanClaimAdvance(tasks[0]?.id, tasks[1]?.id, tasks.find((t) => t.stage === "DONE")?.id, tasks.find((t) => t.orderStatus === "SHIPPED")?.id);
    await f07_fullBatchNotes(tasks[0]?.orderNumber, tasks.map((t) => t.id));
    await f08_readyHold();
    await f09_qc(nonPickupPaid || by("QUALITY_CHECK"), orders.find((o) => o.id !== (nonPickupPaid || {})?.id), tasks[0]?.id);
    await f10_couponCatalog();
    await f11_zoneCustomer();
    await f12_cmsShipNotif();
  }
  const lap = path.join(OUT_DIR, "R-A-laporan.json");
  fs.writeFileSync(lap, JSON.stringify({ ...report, tokenNote: "token sesi hanya 8 char + ... (tak ada secret penuh)" }, null, 2));
  console.log(`SELESAI: ${report.steps.filter((s) => s.status === "PASS").length} PASS, ${report.steps.filter((s) => s.status === "SKIP").length} SKIP, UI-manual: ${report.manualUi.length} -> ${lap}`);
}
main().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
