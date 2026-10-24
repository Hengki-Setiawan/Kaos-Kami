# 06 — DATA LAYER (Turso · Drizzle runtime · Prisma schema SSOT)

> Sumber: Auditor 6 (very thorough). Status: 🟠 skema hidup digerakkan `db push` + sync runtime — folder migrasi MATI; 🔴 dua BLOCKER.

## A. Ringkasan skema (schema.prisma, 689 baris, 26 tabel)

Semua PK `cuid()` TEXT; uang `Int` rupiah utuh; `DateTime` ISO-8601 TEXT; enum SQLite = TEXT tanpa CHECK.

| Grup | Model | Catatan integritas |
|---|---|---|
| Identity | `User, Session, Account, Verification, UserDevice` | Session/Account cascade; `Account @@unique(providerId,accountId)`; `Verification` hanya INDEX (identifier non-unique!) |
| Katalog | `ApparelCategory, ProductVariant, ColorOption, MaterialFinish, SablonMethod, CatalogProduct` | `ProductVariant.categoryId` RESTRICT; JSON-string di beberapa kolom |
| Zona | `ExpeditionZone` | `@@unique(city,courier,service)` + index city |
| Studio | `Design` | userId nullable SetNull; decals/priceBreakdown/masterAssetUrl JSON besar |
| Keranjang | `Cart` (unic per user), `CartItem` | FK opsional SetNull |
| Order | `Order, OrderItem, OrderStatusEvent, Payment` (1:1 uniq), `Coupon` | Order→User **RESTRICT**; OrderItem cascade; snapshot denormalized ✓ |
| Produksi | `ProductionTask, QcInspection` | **`orderItemId` TANPA FK** |
| After-sales | `OrderComplaint, OrderRefund, ProductReview` | cascade; Review.orderId SetNull |
| Chat/config | `ChatMessage, UserPresence, ShopConfig` | ChatMessage 0 relasi di Prisma |

Runtime mirror `drizzle-schema.ts` (846 brs) + `isoDateTime`. Client `db.ts`: Drizzle + `@libsql/client/web` fetch-only; fallback dummy `libsql://localhost:8080`; global cache dev; `getRawClient()` buka klien baru per panggilan.

## B. Mismatch Prisma ↔ Drizzle ↔ DB (bukti)

| # | Set | Bukti | Klasifikasi |
|---|---|---|---|
| 1 | Default `Payment.provider` | Prisma/Drizzle `IPAYMU` ≠ DB 0001_init `'DUITKU'`; 0002 yang mengganti IPAYMU **BELUM diaplikasikan** | drift migration |
| 2 | Default `Order.status` | Prisma/Drizzle `DESIGN_REVIEW` ≠ 0001_init `'PENDING_PAYMENT'` | drift |
| 3 | Kolom nyata TIDAK ada di 0001_init | `Account.issuer`, `User.phoneVerified`, `Order.reviewNote/By/At`, `ProductionTask.teamName/teamwearFlag` + index, tabel `QcInspection, ExpeditionZone, UserDevice, ChatMessage, UserPresence, CatalogProduct, OrderComplaint, OrderRefund, ProductReview, ShopConfig` | migrations stale TOTAL; DB aktual dibangun `db push` + `sync-turso-tables.mjs` + CREATE-table runtime |
| 4 | `@updatedAt` vs `$onUpdate` | Drizzle `$onUpdate` hanya jalan bila `.set()` via drizzle; raw SQL/Studio tidak | semantik beda tipis |
| 5 | Relasi ChatMessage | Prisma tanpa relasi; Drizzle versi ada | graf tak identik |
| 6 | Nama index | `ChatMessage_senderId_idx` vs `idx_chat_sender`, dsb | nama saja |
| 7 | Enum domain dilanggar runtime | Prisma `PaymentStatus=SETTLEMENT` tapi kode tulis `"SETTLED"` (checkout:877; bypass:107,113); provider `ADMIN_BYPASS` di luar enum | Drizzle tanpa CHECK → tulis sukses, tipe bohong |
| 8 | Sentinel string di kolom user | `"ADMIN_TEST_BYPASS"/"SYSTEM_CATALOG"/"AUDIT_SANDBOX"` ditulis `reviewedBy` (checkout:706-708) | domain kotor |

**Bukan masalah:** pemetaan kolom per-baris untuk 26 tabel 1:1 (tipe/nullable/default/binary mode) — tidak ada mismatch tipe.

## C. Temuan

### C1 [BLOCKER] Folder migrasi rusak & drift
- `0001_init/migration.sql` tersimpan **UTF-16LE** (header byte 255,254 — verifikasi PowerShell) → Prisma baca UTF-8 → gagal/salah parsing.
- DDL dalamnya tak memuat ±10 tabel + 4 kolom di schema; 0002 manual "belum apply".
- **Dampak:** recovery/onboarding produksi TIDAK reproducible dari repo; fitur baru yang butuh kolom `review*`/`teamwear*` bisa 500 `no such column` bila ada push berbeda-beda mekanisme.
- **Perbaikan:** re-encode/regenerate baseline; pilih SATU mekanisme (rekomendasinya `prisma db push` + snapshot SQL disimpan) dan hapus folder migrations sampai benar.

### C2 [BLOCKER] Zero transaksi di jalur uang
- grep `.batch(|.transaction(` = 0 di src. Checkout ±6 tulisan beruntun (Order → bulk OrderItem → N Design → N Update designId → Event → Payment) hanya dikompensasi try/catch hapus yatim (`checkout/route.ts:748-864`); `confirmOrderPaid` beruntun per decal (`payments/confirmOrder.ts:51-251`).
- **Perbaikan:** `client.batch()` (didukung libsql /web) untuk blok tulis kritis; JANGAN pakai interactive tx (tak didukung varian /web, sesuai RUNBOOK §6).

### MAJOR
- **C3 stok tak dikembalikan saat refund** (`admin/orders/[id]/route.ts:293-338` hanya status+kupon) → inventory loss terstruktur, forecast bias. → rollback stok di jalur REFUNDED.
- **C4 FK "hias"** — `ProductionTask.orderItemId` (tanpa FK), `assignedToUserId`, `OrderStatusEvent.actorUserId`, `QcInspection.productionTaskId`, `OrderComplaint.resolvedByUserId`, `OrderRefund.processedByUserId`, `ProductReview.productVariantId`, `ChatMessage.*` → yafrom;cjh jika dihapus manual; `. with {user}` tampil "Tak dikenal". → tambahkan FK + `onDelete:SetNull`.
- **C5 `phoneVerified=true` tanpa OTP** di 2 jalur (tamu & ready-stock; `checkout:509-519,646-659`) → verifikasi kepemilikan akun fabrikm.
- **C6 idempotensi checkout**: pinjam tabel `Verification` identifier NON-UNIQUE (`schema.prisma:96` index saja) — dua request konkur bisa 2 order. → unique + upsert claim.
- **C7 analitik bayar matching `Order.notes`** (`admin/reports:482-489` includes "IPAYMU"/"QRIS") padahal notes hanya `COUPON:…` → breakdown selalu "other". → join Payment.provider/method.
- **C8 Enum-buster `SETTLED`/`ADMIN_BYPASS`** → UI admin banding `SETTLEMENT` (`AdminOrdersManager.tsx:929`) → order uji tampil "Belum Bayar"; guard repay tak melindunginya.

### MINOR
- **C9** daftar offset-paginasi + `with` penuh; TANPA index `Order.createdAt`, `Payment(providerRef)`, `OrderItem.designId/productVariantId`, `Address.userId`; N+1 kecil kanban (`production-tasks:338-341,402-408`).
- **C10** reports JS-side agregat 2000 order (aman skala UMKM; biaya jaringan).
- **C11** retensi/PII asimetris: sweep hanya Verification/Session/Presence/publish utilisateur; address bertambah per checkout TANPA reuse; ChatMessage; `Payment.rawWebhookPayload`; akun tamu `${phone}@kaoskami.phone`; refund bank `accountNumber` abadi; `KEBIJAKAN-RETENSI.md` HILANG; backup mingguan → R2 (verify manual).
- **C12** review `isVerifiedPurchase` default TRUE bila order tak ketemu (`api/reviews:41-50`) → social proof falsifiable.
- **C13** runtime DDL dari HTTP GET (`shop-config:35-40`) versi berbeda dari Prisma/Drizzle; `getRawClient()` per-call tanpa reuse.

## D. Eksplisit TIDAK ADA
- transaksi `client.batch()` — nol.
- FK enforcement via kode Drizzle; `PRAGMA foreign_keys` tak pernah diset dari kode.
- Soft delete `deleted_at` — penghapusan fisik; "arsip" hanya Design.status.
- Migrasi yang lifelike — tidak ada (C1).
- 4 index bisnis (C9).
- Reset stok refund & dedupe idempotency-key.
- `KEBIJAKAN-RETENSI.md` — HILANG.
- Model mati: TIDAK ada (semua tabel dipakai; `AbandonedCartLog` sudah dibersihkan bersih).

## E. Top 5
1. C1 migrasi rusak/stale.
2. C2 zero transaksi jalur uang.
3. C3 stok tak restore saat refund.
4. C4 FK stub + tanpa index bisnis.
5. C5/C8 enum & phoneVerified — sumber bug analitik + privileges.
