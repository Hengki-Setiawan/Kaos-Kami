// scripts/export-schema-sql.mjs
// Snapshot DDL UTF-8 dari database AKTUAL (read-only introspection).
// Keputusan owner #8=A (23 Okt 2026): baseline migrasi di-regenerate; folder
// prisma/migrations lama (UTF-16LE + stale/drift) dihapus.
//
// AMAN: hanya SELECT ke sqlite_master. Tidak ada CREATE/ALTER/DROP.
// Jalankan dari kaos-kami-web:  node scripts/export-schema-sql.mjs
// Output: prisma/baseline-schema.sql (UTF-8, tanpa BOM)

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@libsql/client/web";

// Muat .env.local dulu (dev), fallback .env. Tidak menimpa env yang sudah ada.
dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("TURSO_DATABASE_URL / DATABASE_URL tidak ditemukan. Jalankan dari kaos-kami-web/.");
  process.exit(1);
}

const OUT = path.join("prisma", "baseline-schema.sql");
const client = createClient({ url, authToken });

const tables = await client.execute(
  `SELECT name, sql FROM sqlite_master
   WHERE type = 'table'
     AND name NOT LIKE 'sqlite_%'
     AND name NOT LIKE '_prisma%'
   ORDER BY name`
);
const indexes = await client.execute(
  `SELECT name, sql FROM sqlite_master
   WHERE type = 'index'
     AND sql IS NOT NULL
     AND name NOT LIKE 'sqlite_%'
   ORDER BY name`
);

const missingSql = [...tables.rows, ...indexes.rows].filter((r) => !r.sql);
if (missingSql.length > 0) {
  console.error("ADA objek tanpa SQL (tak bisa direkonstruksi):", missingSql.map((r) => r.name).join(", "));
  process.exit(1);
}

const now = new Date().toISOString();
const header = `-- ============================================================================
-- BASELINE SKEMA KAOS KAMI (SQLite / Turso libSQL)
-- Digenerate: ${now}
-- Sumber   : introspeksi READ-ONLY sqlite_master dari database aktif
--            (@libsql/client/web; hanya SELECT, tanpa tulis).
-- Keputusan owner #8=A (23 Okt 2026).
--
-- CATATAN PENTING:
-- 1) File ini adalah SNAPSHOT REFERENSI, bukan migration runner otomatis.
--    Prisma migrate/db push TIDAK bisa konek ke libsql:// (P1013) — lihat RUNBOOK §5.
-- 2) Untuk database baru: eksekusi statement berurutan via @libsql/client
--    (autocommit per-statement; JANGAN bungkus satu transaksi interaktif).
-- 3) Urutan: semua CREATE TABLE dulu, lalu CREATE INDEX.
-- 4) Jangan edit manual kecuali darurat; regenerate dengan:
--       node scripts/export-schema-sql.mjs
-- ============================================================================

`;

const body = [
  ...tables.rows.map((r) => `${r.sql};`),
  "",
  ...indexes.rows.map((r) => `${r.sql};`),
].join("\n\n");

fs.writeFileSync(OUT, header + body + "\n", { encoding: "utf8" });

console.log(`OK: ${OUT}`);
console.log(`  tables : ${tables.rows.length}`);
console.log(`  indexes: ${indexes.rows.length}`);
console.log(`  bytes  : ${fs.statSync(OUT).size}`);
