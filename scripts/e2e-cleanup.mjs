#!/usr/bin/env node
/**
 * e2e-cleanup.mjs â€” Bab 6.2 (PANDUAN-RUNNER Â§1.8). Menutup run E2E.
 * --stamp <STAMP>: cancel order TEST-<stamp>-* masih PENDING_PAYMENT via
 * POST /api/orders/[id]/cancel (cookie owner) â†’ hapus desain `E2E <stamp>*`
 * via DELETE /api/designs {id} â†’ nonaktifkan kupon E2E-<stamp>-* via
 * PATCH /api/admin/coupons {id,isActive:false} â†’ hapus zona E2E via
 * DELETE /api/admin/zones/[id] â†’ tulis final.json (skema _template/final.json).
 *
 * Cookie owner: factory.json hanya simpan userId + token 8-char (audit!) â†’
 * token PENUH diambil live dari tabel Session via TURSO (read SELECT).
 * Aksi admin (kupon/zona) butuh env E2E_ADMIN_SESSION_TOKEN; bila absen â†’
 * status SKIP tercatat di final.json (TIDAK crash).
 *
 * Contoh: node scripts/e2e-cleanup.mjs --stamp 20260923-0900 [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client/http";
import { cookieHeader } from "./e2e-auth.mjs"; // cookie WAJIB bertanda (better-auth sign!) â€” token mentah = guest!

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const STAMP_RE = /^\d{8}-\d{4}$/;
const TERMINAL = new Set(["CANCELLED", "REFUNDED", "REJECTED", "COMPLETED"]);

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (isi dari kaos-kami-web/.env.local, JANGAN commit)`);
  return v;
}

if (has("--help")) {
  console.log(`e2e-cleanup â€” tutup run: cancel PENDING + hapus desain/kupon/zona fixture
Pakai: node scripts/e2e-cleanup.mjs --stamp YYYYMMDD-HHMM [--dry-run]
Env: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (cari fixture + token sesi live)
     E2E_ADMIN_SESSION_TOKEN (opsional; tanpa ini langkah admin = SKIP tercatat)
Out: Blueprint/e2e/hasil-pengujian-e2e/<stamp>/final.json (skema _template/final.json)`);
  process.exit(0);
}
const STAMP = val("--stamp") || process.env.RUN_STAMP || "";
if (!STAMP_RE.test(STAMP)) {
  console.error("REFUSE: --stamp YYYYMMDD-HHMM wajib.");
  process.exit(2);
}
const DRY = has("--dry-run");
const OUT_DIR = path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", STAMP);

const PLAN = [
  `SELECT order courierNotes LIKE %stamp% status PENDING_PAYMENT â†’ POST /api/orders/[id]/cancel (cookie owner)`,
  `SELECT desain judul 'E2E ${STAMP}%' status<>ORDERED â†’ DELETE /api/designs {id} (cookie owner)`,
  `SELECT kupon E2E-${STAMP}-* aktif â†’ PATCH /api/admin/coupons {id,isActive:false} (admin)`,
  `SELECT ExpeditionZone city LIKE 'E2E%' â†’ DELETE /api/admin/zones/[id] (admin)`,
  `PRAGMA foreign_key_check + GET /api/health â†’ tulis final.json`,
];
if (DRY) {
  console.log(`[dry-run] stamp=${STAMP} base=${BASE}`);
  PLAN.forEach((p) => console.log(`[dry-run] ${p}`));
  process.exit(0);
}

const db = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
requireEnv("BETTER_AUTH_SECRET"); // sign cookie sesi!
const ADMIN = process.env.E2E_ADMIN_SESSION_TOKEN || "";
const adminCookie = ADMIN ? await cookieHeader(ADMIN) : "";
let factory = { accounts: [] };
try {
  factory = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "factory.json"), "utf8"));
} catch {
  console.log("factory.json tak ada (tanpa factory-run: akun real kanonis) — lanjut dengan map kosong.");
}
const userIds = new Map((factory.accounts || []).map((a) => [a.userId, a.email]));
const sessCache = new Map();
async function ownerCookie(userId) {
  if (!userId) return "";
  // TEMUAN: JANGAN batasi factory-map (R-U pakai akun real vibecoding1/2!) — scope aman sudah dijamin
  // query pemanggil (judul/order TEST-<stamp>-*). Sesi diambil read-only dari DB + cookie di-sign!
  if (!sessCache.has(userId)) {
    const r = await db.execute({
      sql: `SELECT token FROM "Session" WHERE userId = ? ORDER BY expiresAt DESC LIMIT 1`,
      args: [userId],
    });
    sessCache.set(userId, r.rows[0]?.token ? String(r.rows[0].token) : "");
  }
  const t = sessCache.get(userId);
  return t ? await cookieHeader(t) : "";
}

const final = {
  _schema: "e2e-final/1",
  _aturan: "Ditulis runner/cleanup saat MENUTUP run. Semua TEST-<stamp>-* harus terminal atau KEEP + alasan.",
  runStamp: STAMP,
  orders: [],
  designsDeleted: 0,
  couponsDeactivated: [],
  variantsOff: [],
  zonesDeleted: [],
  factoryAccounts: factory.accounts.map((a) => `${a.email}:kept-fixture-audit`),
  dbCheck: { foreign_key_check: -1, health: "unknown" },
  sisaAktif: [],
};

// 1. Orders fixture (TEMUAN: orderNumber = KK-* (BUKAN TEST-*)! match via courierNotes [E2E:<stamp>:*]!)
const ord = await db.execute({
  sql: `SELECT id, orderNumber, userId, status FROM "Order" WHERE courierNotes LIKE ? ORDER BY orderNumber`,
  args: [`%${STAMP}%`],
});
for (const o of ord.rows) {
  const id = String(o.id);
  const no = String(o.orderNumber);
  const st = String(o.status);
  if (st === "PENDING_PAYMENT") {
    const ck = await ownerCookie(String(o.userId));
    if (!ck) {
      final.orders.push({ orderNumber: no, statusAkhir: "KEEP:tanpa-cookie-owner", via: "e2e-cleanup", couponRestored: false });
      final.sisaAktif.push(no);
      continue;
    }
    const res = await fetch(`${BASE}/api/orders/${id}/cancel`, { signal: AbortSignal.timeout(60000), method: "POST", headers: { Cookie: ck } }); // PANDUAN §10
    if (res.status === 429) {
      console.error("STOP 429 (cancel) â€” JANGAN retry buta.");
      final.orders.push({ orderNumber: no, statusAkhir: "KEEP:STOP-429", via: "e2e-cleanup", couponRestored: false });
      final.sisaAktif.push(no);
      break;
    }
    const ok = res.ok;
    console.log(`${ok ? "CANCELLED" : "GAGAL " + res.status} ${no}`);
    final.orders.push({ orderNumber: no, statusAkhir: ok ? "CANCELLED" : `KEEP:cancel-${res.status}`, via: "e2e-cleanup/cancel-API", couponRestored: ok });
    if (!ok) final.sisaAktif.push(no);
    await sleep(1200);
  } else if (TERMINAL.has(st)) {
    final.orders.push({ orderNumber: no, statusAkhir: st, via: "terminal-sebelum-cleanup", couponRestored: true });
  } else {
    final.orders.push({ orderNumber: no, statusAkhir: `KEEP:${st}-butuh-aksi-manual`, via: "e2e-cleanup", couponRestored: false });
    final.sisaAktif.push(no);
  }
}

// 2. Desain fixture (judul `E2E <stamp>*`; DELETE butuh {id}, title opsional).
// TEMUAN: JANGAN hapus status=ORDERED (arsip order lunas! cth. desain U-030 di order CONFIRMED)!
const des = await db.execute({
  sql: `SELECT id, userId, title FROM "Design" WHERE (title LIKE ? OR title LIKE ?) AND status <> 'ORDERED'`,
  args: [`E2E ${STAMP}%`, `TEST-${STAMP}%`],
});
for (const d of des.rows) {
  const ck = await ownerCookie(d.userId ? String(d.userId) : "");
  if (!ck) {
    final.sisaAktif.push(`design:${String(d.id)}`);
    continue;
  }
  const res = await fetch(`${BASE}/api/designs`, {
    signal: AbortSignal.timeout(60000), // PANDUAN §10
    method: "DELETE",
    headers: { "Content-Type": "application/json", Cookie: ck },
    body: JSON.stringify({ id: String(d.id) }),
  });
  if (res.status === 429) {
    console.error("STOP 429 (desain) â€” JANGAN retry buta.");
    final.sisaAktif.push(`design:${String(d.id)}`);
    break;
  }
  if (res.ok) final.designsDeleted++;
  else final.sisaAktif.push(`design:${String(d.id)}`);
  await sleep(800);
}
console.log(`desain dihapus: ${final.designsDeleted}/${des.rows.length}`);

// 3+4. Kupon & zona (butuh admin; SKIP tercatat bila tanpa token admin)
if (!ADMIN) {
  final.couponsDeactivated.push(`SKIP:E2E-${STAMP}-* (tanpa E2E_ADMIN_SESSION_TOKEN)`);
  final.zonesDeleted.push("SKIP:E2E* (tanpa E2E_ADMIN_SESSION_TOKEN)");
} else {
  const kup = await db.execute({ sql: `SELECT id, code FROM "Coupon" WHERE code LIKE ? AND isActive = 1`, args: [`E2E-${STAMP}-%`] });
  for (const k of kup.rows) {
    const res = await fetch(`${BASE}/api/admin/coupons`, {
      signal: AbortSignal.timeout(60000), // PANDUAN §10
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ id: String(k.id), isActive: false }),
    });
    if (res.ok) final.couponsDeactivated.push(String(k.code));
    else final.sisaAktif.push(`coupon:${String(k.code)}`);
    await sleep(800);
  }
  const zon = await db.execute({ sql: `SELECT id, city, courier, service FROM "ExpeditionZone" WHERE city LIKE 'E2E%'` });
  for (const z of zon.rows) {
    const res = await fetch(`${BASE}/api/admin/zones/${String(z.id)}`, { signal: AbortSignal.timeout(60000), method: "DELETE", headers: { Cookie: adminCookie } }); // PANDUAN §10
    if (res.ok) final.zonesDeleted.push(`${String(z.city)}/${String(z.courier)}/${String(z.service)}`);
    else final.sisaAktif.push(`zone:${String(z.id)}`);
    await sleep(800);
  }
}

// 5. dbCheck + tulis final.json
try {
  const fk = await db.execute(`PRAGMA foreign_key_check`);
  final.dbCheck.foreign_key_check = fk.rows.length;
} catch {
  final.dbCheck.foreign_key_check = "PRAGMA-gagal";
}
try {
  const h = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(60000) }); // PANDUAN §10
  final.dbCheck.health = h.status;
} catch (e) {
  final.dbCheck.health = `unreachable:${String(e?.message || e).slice(0, 60)}`;
}
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "final.json"), JSON.stringify(final, null, 2));
console.log(`final.json â†’ ${OUT_DIR} (sisaAktif: ${final.sisaAktif.length})`);
if (final.sisaAktif.length > 0) process.exit(1);
