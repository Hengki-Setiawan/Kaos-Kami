# 10 — RENCANA PERBAIKAN PRIORITAS (P0 → P2)

> Sintesis 9 auditor + verifikasi build + riset docs resmi. Aturan: **satu masalah fisik nyata per giliran** (Pilar 3), status hanya bisa diangkat OWNER setelah uji fisik di browser (Pilar 1), laporan pakai bukti file:line + tabel 3 warna (Pilar 2), tanpa persentase spekulatif (Pilar 5).

---

## 🔴 P0 — HARI INI (jalur uang & pintu belakang)

Urutan kerja di bawah ini berurutan (ikuti nomor):

### 0.1 — B1 `pin-bypass` (efek: keamanan total)
File: `kaos-kami-web/src/app/api/auth/pin-bypass/route.ts`
- Gerbang tiga lapis ala `test/otp/route.ts` (`NODE_ENV !== "production"` + env lalu pelunasan R2).
- Hapus pemanggil di UI setelah env-gate aktif: `SecretPinModal.tsx:36`, `AdminNav.tsx:96`, `AdminMobileNav.tsx:201`.
- Verifikasi fisik owner: POST `{pin:"164164"}` di produksi → 403/404; login admin tetap jalan normal.

### 0.2 — B2 webhook iPaymu fail-closed
File: `kaos-kami-web/src/app/api/webhooks/ipaymu/route.ts`
- Tolak 401 callback TANPA signature (lihat docs: HMAC-SHA256 kunci = VA; sort keys A-Z + normalisasi tipe + JSON).
- Ganti `route.ts:88,116` guard: `!Number.isFinite(amount) || amount <= 0 → 400`; nominal ≠ `order.totalIdr` (±1) → 400 SELALU.
- Pertimbangkan token rahasia per-order pada `notifyUrl` (`payments/ipaymu.ts:113`).
- Idempotensi: status PENDING→SETTLEMENT via optimistic where (sudah ada) + dedupe referenceId.
- Verifikasi fisik: replay callback tanpa signature → 401; amount 0 → 400; amount ≠ total → 400; callback sah dari sandbox iPaymu → SETTLEMENT.

### 0.3 — B3 hapus QRIS fabricate-lokal
File: `kaos-kami-web/src/lib/payments/ipaymu.ts:160-206` (+ mirror mobile `ipaymuMobile.ts` di mobile? — verifikasi)
- Hapus cabang fallback QR-lokal; on error charge → return 502 + ref `pending-*` (jalur repay ok).
- Set `expired` body (docs: QRIS default 5 menit) & tangani expired UI modal (polling 3s + cek `Expired`).
- Pindahkan render QR dari `api.qrserver.com` ke generate lokal (canvas) — QR uang jangan lewat pihak ketiga.
- Default `IPAYMU_ENV` → sandbox (fail safe), bukan production — atau wajibkan env explicit di prod.
- Verifikasi fisik: matikan koneksi iPaymu (sandbox error) → pesan gagal + tombol Coba Lagi; TIDAK ADA modal QR.

### 0.4 — B4 Turnstile dummy gate NODE_ENV
File: `src/lib/turnstile.ts:21-24`
- Cabang dummy hanya `NODE_ENV !== "production"`.
- `api/auth/send-email-otp/route.ts:53`: token wajib (400 bila kosong).
- Verifikasi fisik: POST token `XXXX.DUMMY.…` di prod → 400.

### 0.5 — B5+B6 data layer
- B5: re-encode `prisma/migrations/0001_init/migration.sql` ke UTF-8 (ATAU regenerate baseline dari schema.prisma), apply 0002 atau buang; pilih SATU mekanisme (~`prisma db push` + snapshot SQL tersimpan) dan dok RUNBOOK §5.
- B6: `client.batch()` untuk: checkout sequence (`api/checkout/route.ts:748-864`), `confirmOrderPaid` sequence (`payments/confirmOrder.ts:51-251`), update stok refund (`admin/orders/[id]/route.ts:293-338` — lihat 1.3).
- Verifikasi fisik: matikan jaringan tengah checkout → tidak ada order yatim; PRAGMA integrity_check via studio.

### 0.6 — B7 keputusan 30 vs 35 cm (KEPUTUSAN OWNER DULU!)
- Jika 30 (sesuai AGENTS.md §3): ubah `scaleCalibration.ts:91-93,283-284` + test `scaleSnapshot.test.ts:20` + `mobileParity.test.ts:61` + `masterNotify.ts:12,16-23` (35→30) + copy publik 35 (`app/[locale]` mobile `page.tsx:860`).
- Jika 35: ubah AGENTS.md §3 + FAQ/ketentuan.
- Lalu satukan `maxDecalScaleUnits/fitScaleToSideBox` ke `REAL_WORLD_PRINT_LIMITS`.
- Verifikasi fisik: decal 3D di studio tak bisa melewati nilai baru; ProductionTask tersimpan nilai baru.

### 0.7 — B8 checkout mobile N-decal
File: `kaos-kami-mobile/src/app/CheckoutSheet.tsx:498-521` — integrasikan §4 `checkoutParity` (draft R2 per-decal, nested loop ≥ semua lapis).
- Verifikasi fisik: desain 3 lapis (front + lengan + hood) di mobile → order di web admin menunjukkan 3 decal.

---

## 🟠 P1 — MINGGU INI (integritas data & paritas)

1. **Stok refund restore** — `admin/orders/[id]/route.ts:293-338` (+rollback `productVariantId`).
2. **MatrixStockGrid delta** — `MatrixStockGrid.tsx:176-178` kirim `{delta}` (API sudah siap `catalog:131-138`).
3. **master-data PATCH nama** — `master-data/route.ts:196-212` wajib name / read-mod-write.
4. **PII admin** — allowlist tanpa `passwordHash` (admin/page.tsx:186, orders/[id]/page.tsx:40); panggil `maskPhone` di `admin/orders/route.ts` (atau buat kebijakan + kolom waLink).
5. **Enum domain** — satukan `SETTLEMENT` + enum feliz `ADMIN_BYPASS` + push; hyperlink UI `AdminOrdersManager.tsx:929`.
6. **zod side_left/right** — `schemas/design.ts:26` + `autosave/route.ts:16` + test.
7. **FK + index** — tambahkan FK (`ProductionTask.orderItemId`, actors), `ON DELETE SET NULL`; index `Order.createdAt`, `Payment(providerRef)`, `OrderItem.designId/productVariantId`, `Address.userId`.
8. **Idempotensi**: `Verification.identifier` unique + upsert claim; idempotency-key modal per sesi.
9. **Limiter fail-closed OTP** (`rateLimiter.ts:200-231`) + record Verification 24h.
10. **Scalar web mobile**: samakan silent-downgrade kurir → 400 (checkout web `route.ts:412-445`).
11. **SEO canonical per page + sitemap + OG satuan** (01).
12. **SSR katalog + image optimization** sepakat (01-#3/#4; perlu putusan: terus R2 + next/image dengan loader worker? atau comproxy).
13. **Hash bucket R2 CSP** (`next.config.mjs:60` vs `wrangler.jsonc:47`).
14. **proxy-image kunci** (05-#5) + **guest chat cookie** (05-#4) + **resolve-identifier masking** (05-#3).
15. **three first-load landing** (01-#2): Vector3 → objek plain; Preloader useProgress via store.
16. **Compose checkout shared** web/mobile → `lib/checkout/createOrder()`.
17. **Reorder → useCartStore** (04-F6) + **QRIS restore reader** (04-F7) + **RepayButton totalIdr** (04-M4).
18. **R2/Fonnte timeout** + **health fonnte fail-closed** (07) + **email OTP tak ke console.log** (07-#21).
19. **upgrade next patch + audit fix bertahap**: `npm audit fix` (7 vuln) — jalankan bertahap, tsc+vitest+build+preview opennext; dompurify/klik cek jspdf.html usaga; sharp postcss source-map-js byproduct.
20. **Mobile**: kirim Turnstile; samarkan 3 nomor WA; versionCode CI; assetlinks SHA256; AR default-off.
21. **vitest hijau**: `zIndexHierarchy.test.ts` — pilih finalisasi persetujuan DESIGN.md (poin yang dinyatakan oleh DESIGN: tunggu putusan owner).

## 🟡 P2 — POLISH & DOKUMENTASI (jenuh)

- Semua MINOR di 01–09 (timezone WITA/WIB, kontras, heading, dsb).
- Jujur-kan klaim: klaim Draco (README/AGENTS + `setDecoderPath`), komentar `unoptimized`, `masterNotify 35cm`, klaim "4.9★", strip `CheckoutModalLegacy` + `USE_CHECKOUT_V2`.
- Bersihkan repo: mascot ±50MB dari git; `scratch/` 154MB; log berulang; env duplikat 3 lokasi → satu sumber.
- Dok renungan: file Blueprint hilang (pilih pulihkan atau cabut klaim + status CI draft); RUNBOOK §10a shipping-sync; `PANDUAN-RUNNER` missing; retensi `KEBIJAKAN-RETENSI.md`.
- Sisi operator: Sentry init; coverage vitest; Dependabot; split backup R2 >25MB; decide cron `shipping-sync`.
- Bash lisensi backlog: relokasi ASSET-WAVE1-CHECKLIST isi + bukti CC-BY/MIT ke file yang ada.

---

## Tabel status 3 warna (setelah P0/P1/P2 selesai ditandai owner)

| Butir | Status sekarang | Jadi diperlukan tindakan |
|---|---|---|
| B1–B8 (BLOCKER) | ⚪ belum disentuh (kode) | P0 — 8 perbaikan berurutan |
| MAJOR (±40 butir) | ⚪/🟡 kontekstual | P1 — urut sesuau prioritas di atas |
| MINOR (±50 butir) | ⚪ | P2 |
| Building verifikasi tsc web/mobile | 🟢 bersih RI (nenang tanpa klaim fungsi fisik) | — |
| vitest | 🔴 4 gagal | 1 file test + keputusan z-index |
| npm audit | 🔴 7 vuln | P1 #19 bertahap |
| Dokumen audit ini | 🟢 selesai sebagai layak | = status audit; bukan klaim fitur |

> **Prinsip:** setiap butir setelah dikerjakan → status berubah menjadi `🟡 KODE DIUBAH — MENUNGGU VERIFIKASI FISIK OWNER`, dan hanya OWNER yang mencentang `[x]` di tracker (`BUILD-PROGRESS-TRACKER.md`) setelah uji di layar.
