#!/usr/bin/env node
/**
 * db-sensus.mjs — G-039 (PANDUAN-RUNNER §1.9). PURE READ-ONLY.
 * HANYA SELECT + PRAGMA via @libsql/client/http (resolve dari workspace
 * root — root node_modules/@libsql/client ADA). TANPA tulis apa pun ke DB,
 * TANPA --stamp pun boleh jalan (--stamp/--out opsional, hanya tentukan
 * lokasi sensus.json).
 *
 * Cek: foreign_key_check + order-by-status + payment-yatim (Payment tanpa
 * Order) + stok-negatif (ProductVariant.stockQty<0) + kupon-overuse
 * (usedCount>maxUses) + counts per tabel → sensus.json.
 *
 * Contoh: node scripts/db-sensus.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client/http";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};
function requireEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`E2E butuh env ${n} (isi dari kaos-kami-web/.env.local, JANGAN commit)`);
  return v;
}

if (has("--help")) {
  console.log(`db-sensus — sensus READ-ONLY Turso (SELECT + PRAGMA saja)
Pakai: node scripts/db-sensus.mjs [--stamp YYYYMMDD-HHMM] [--out PATH] [--dry-run]
Env: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
Out default: Blueprint/e2e/hasil-pengujian-e2e/_sensus/sensus.json`);
  process.exit(0);
}

const QUERIES = [
  ["foreign_key_check", "PRAGMA foreign_key_check", []],
  ["order_by_status", `SELECT status, COUNT(*) AS n FROM "Order" GROUP BY status ORDER BY n DESC`, []],
  ["payment_yatim", `SELECT p.id, p.orderId, p.status, p.amountIdr FROM "Payment" p LEFT JOIN "Order" o ON o.id = p.orderId WHERE o.id IS NULL LIMIT 50`, []],
  ["stok_negatif", `SELECT id, sku, name, stockQty FROM "ProductVariant" WHERE stockQty < 0 LIMIT 50`, []],
  ["kupon_overuse", `SELECT id, code, maxUses, usedCount, isActive FROM "Coupon" WHERE maxUses IS NOT NULL AND usedCount > maxUses LIMIT 50`, []],
];
const COUNT_TABLES = ["User", "Session", "Design", "Cart", "Order", "OrderItem", "Payment", "ProductionTask", "Coupon", "ExpeditionZone", "ProductVariant"];

if (has("--dry-run")) {
  console.log("[dry-run] READ-ONLY, NOL tulis DB. Query yang AKAN jalan:");
  QUERIES.forEach(([n, q]) => console.log(`[dry-run] ${n}: ${q}`));
  COUNT_TABLES.forEach((t) => console.log(`[dry-run] count: SELECT COUNT(*) FROM "${t}"`));
  process.exit(0);
}

const db = createClient({ url: requireEnv("TURSO_DATABASE_URL"), authToken: requireEnv("TURSO_AUTH_TOKEN") });
const sensus = { generatedAt: new Date().toISOString(), readOnly: true, via: "@libsql/client/http (SELECT+PRAGMA)", checks: {} };
for (const [name, sql, sqlArgs] of QUERIES) {
  const r = await db.execute({ sql, args: sqlArgs });
  sensus.checks[name] = { rows: r.rows.length, data: r.rows.slice(0, 50) };
  console.log(`${name}: ${r.rows.length} baris`);
}
sensus.checks.tabel_counts = {};
for (const t of COUNT_TABLES) {
  const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM "${t}"`, args: [] });
  sensus.checks.tabel_counts[t] = Number(r.rows[0]?.n ?? 0);
}
console.log("counts:", JSON.stringify(sensus.checks.tabel_counts));

const stamp = val("--stamp") || "";
const outPath = val("--out") || path.join(ROOT, "Blueprint", "e2e", "hasil-pengujian-e2e", stamp || "_sensus", "sensus.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(sensus, null, 2));
console.log(`sensus.json → ${outPath}`);
