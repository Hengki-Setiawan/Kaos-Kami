// src/lib/db.ts — Runtime DB untuk Cloudflare Workers via Drizzle + libSQL HTTP.
//
// MENGAPA BUKAN PRISMA CLIENT (RUNBOOK §6):
// Prisma Client v7 butuh query-compiler WASM yang di-compile saat runtime
// (new WebAssembly.Module / ?module). workerd MENOLAK keduanya
// ("code generation disallowed" — issue prisma#28657, terbukti di preview
// lokal: semua query 500). Next 14 (webpack) juga tidak bisa mem-bundle
// impor .wasm?module (gagal "Module parse failed").
// Drizzle = SQL builder TypeScript murni + @libsql/client (fetch) →
// 100% workerd-safe. Bentuk nilai dipertahankan (Date, boolean).
//
// Prisma tetap dipakai untuk: skema source-of-truth, `db push`,
// typegen (import TYPE dari @/generated/prisma/*), seed (Node), Studio.
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";
import { schema, type DbSchema } from "./drizzle-schema";

export type Db = LibSQLDatabase<DbSchema>;

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
};

function getDatabaseUrl(): string {
  // Dukung kedua env: DATABASE_URL (Prisma native) dan TURSO_DATABASE_URL (legacy)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("libsql://")) {
    return process.env.DATABASE_URL;
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // JANGAN pakai file: — klien /web (fetch-only, workerd-safe) tidak mendukung
  // SQLite file lokal dan THROW saat import (merusak next build/CI). Dummy URL
  // membuat import aman; query tanpa env tetap gagal dengan pesan jaringan
  // yang jelas. Dev/prod SELALU set TURSO_* via .env.local / secrets.
  console.warn("[db] TURSO_DATABASE_URL/DATABASE_URL kosong — pakai dummy (query akan gagal).");
  return "libsql://localhost:8080";
}

function createDb(): Db {
  // Varian /web (fetch-only, tanpa Node API) agar SATU kode jalan di
  // Node DEV maupun Cloudflare Workers PROD.
  const client = createClient({
    url: getDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export const db: Db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

/** Klien libsql mentah (untuk SQL yang tak bisa diungkapkan via Drizzle,
 * mis. sqlite_master / DDL introspeksi). Bukan untuk query bisnis umum. */
export function getRawClient() {
  return createClient({
    url: getDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}
