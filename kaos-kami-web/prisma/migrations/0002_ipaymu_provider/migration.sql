-- =====================================================================
-- 0002_ipaymu_provider — Default provider Payment: 'DUITKU' -> 'IPAYMU'
-- Target : Turso (libSQL / SQLite). JANGAN `prisma db push` / deploy otomatis.
-- Status : BELUM diaplikasikan — owner apply manual via Turso CLI saat mengizinkan.
-- Prisma : schema.prisma enum PaymentProvider + IPAYMU, default IPAYMU;
--          DUITKU/MIDTRANS/XENDIT dipertahankan untuk baris lama (audit-only).
--          Webhook Duitku NON-AKTIF (410 Gone, RUNBOOK §1).
-- 0001_init TIDAK disentuh (aturan owner).
-- =====================================================================
-- Latar:
-- - Gateway aktif = iPaymu (webhook /api/webhooks/ipaymu, checkout +
--   repay/request-payment default PAYMENT_GATEWAY_PROVIDER=ipaymu).
-- - src/lib/drizzle-schema.ts:371 sudah default("IPAYMU") — Prisma kini menyusul.
-- - SQLite TEXT: nilai enum tak di-CHECK, jadi migrasi = ganti DEFAULT saja.
--
-- Cara aplikasi (owner, pilih SALAH SATU, WAJIB backup dulu!):
--   turso db shell <nama-db> ".dump" > backup-pre-ipaymu-default.sql
--   A) turso db shell <nama-db> < kaos-kami-web/prisma/migrations/0002_ipaymu_provider/migration.sql
--   B) Pernyataan per pernyataan via dashboard Turso / libSQL client.
-- Verifikasi sesudah apply:
--   SELECT sql FROM sqlite_master WHERE name = 'Payment';
--   -- pastikan: "provider" TEXT NOT NULL DEFAULT 'IPAYMU'
--   SELECT provider, status, COUNT(*) FROM "Payment" GROUP BY provider, status;
-- Rollback: restore dari file backup di atas.
-- =====================================================================

-- SQLite TIDAK mendukung ALTER COLUMN untuk ganti DEFAULT, jadi dipakai
-- prosedur rebuild tabel (aman untuk tabel kecil). Data disalin 1:1 —
-- TIDAK ada baris yang dihapus.

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- 1) Tabel baru dengan DEFAULT 'IPAYMU' (skema lain IDENTIK dengan DDL
--    prisma/migrations/0001_init/migration.sql -> CREATE TABLE "Payment").
CREATE TABLE "Payment_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'IPAYMU',
    "providerRef" TEXT NOT NULL,
    "method" TEXT,
    "amountIdr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawWebhookPayload" TEXT,
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId")
      REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2) Salin seluruh data lama apa adanya (termasuk nilai provider lama
--    untuk audit — backfill dilakukan eksplisit di langkah 5).
INSERT INTO "Payment_new"
  ("id", "orderId", "provider", "providerRef", "method", "amountIdr",
   "status", "rawWebhookPayload", "paidAt", "expiresAt", "createdAt", "updatedAt")
SELECT
  "id", "orderId", "provider", "providerRef", "method", "amountIdr",
  "status", "rawWebhookPayload", "paidAt", "expiresAt", "createdAt", "updatedAt"
FROM "Payment";

-- 3) Tukar tabel lama -> baru.
DROP TABLE "Payment";
ALTER TABLE "Payment_new" RENAME TO "Payment";

-- 4) Kembalikan index UNIQUE warisan (0001_init): Payment_orderId_key.
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

COMMIT;

PRAGMA foreign_keys = ON;

-- 5) BACKFILL: hanya baris yang masih IN-FLIGHT (PENDING) dan tercatat
--    DUITKU yang dipindahkan ke IPAYMU — baris ini akan di-charge ulang
--    via iPaymu (repay/request-payment menimpa providerRef), jadi aman.
--    Riwayat SETTLEMENT / FAILED / EXPIRED SENGAJA TIDAK disentuh
--    (jejak audit gateway lama).
UPDATE "Payment"
SET "provider" = 'IPAYMU'
WHERE "provider" = 'DUITKU' AND "status" = 'PENDING';

-- 6) Verifikasi (baca saja — hapus/komentari bila runner menolak SELECT):
-- SELECT sql FROM sqlite_master WHERE name = 'Payment';
-- SELECT provider, status, COUNT(*) AS n FROM "Payment" GROUP BY provider, status;
