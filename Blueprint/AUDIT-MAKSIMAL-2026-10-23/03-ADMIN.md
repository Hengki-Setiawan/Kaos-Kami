# 03 — ADMIN DASHBOARD, BACKOFFICE & RBAC

> Sumber: Auditor 3 (very thorough). Sitemap admin lengkap + 24 route `/api/admin/**` + 39 komponen domain admin. Status otorisasi: 🟢 solid; status data-handling: 🟠.

## A. Sitemap admin (hasil verifikasi, bukan asuman)

Gate layout: `src/app/admin/layout.tsx` fail-closed (`ADMIN|SUPER_ADMIN|PRODUCTION_STAFF|COURIER`), noindex, force-dynamic. Sidebar `AdminNav`, `AdminMobileNav`, `AdminBreadcrumbs`, `AdminCommandBar` (palet + cari order), `AdminBell` (poll summary), `AdminHealthPill`.

| Route | File | Fungsi | Data | Guard internal |
|---|---|---|---|---|
| `/admin` | `page.tsx` + `AdminOrdersManager.tsx` | Pusat pesanan, filter channel, sub-tab status, cari, paginasi offset, ekspor CSV | DB SSR | — |
| `/admin/orders` | re-export halaman atas | — | — | — |
| `/admin/orders/[id]` | detail + Inspector3D + OrderAdminActions + label thermal + WA dispatch | DB | **tanpa guard sendiri** |
| `/admin/orders/[id]/job-ticket` | tiket produksi cetak | DB | **tanpa guard sendiri** |
| `/admin/orders/[id]/gang-sheet` | gang sheet per order A3 | DB | **tanpa guard sendiri** |
| `/admin/production` | kanban DnD DTF (~3k baris), claim 409, QC gate, master-notify, UNDO 10s, tanstack polling 10s | API | ✓ (API) |
| `/admin/gang-sheet` | Roll batch → PATCH taskIds | API | ✓ (API) |
| `/admin/deliveries` | READY_TO_SHIP/SHIPPED, resi, status | API | ✓ (API) |
| `/admin/chat` | Chat pelanggan + resolusi komplain | API | ✓ (API) |
| `/admin/settings` | KPI, SystemHealthMonitor, shop-config | DB+API | ✓ |
| `/admin/laporan` | omset/QC/workload `/api/admin/reports?range=` | API | ADMIN/SUPER |
| `/admin/catalog` | CRUD varian 3D studio | DB | **tanpa guard sendiri** |
| `/admin/inventory` | matrix stok + master data | DB + `unstable_cache` 60s | **tanpa guard sendiri** |
| `/admin/distro-catalog` | produk e-commerce | DB | **tanpa guard sendiri** |
| `/admin/cms` | hero beranda, lookbook R2, announcement | DB/API | ✓ |
| `/admin/coupons` | voucher & kupon | API | ✓ |
| `/admin/customers` | pelanggan + ubah role | DB+API | ✓ |
| `/admin/shipping` | zona ekspedisi + kuota AgenWebsite | API | ✓ (API) |

Halaman per role: `cms/coupons/customers/settings` redirect PRODUCTION_STAFF→production, COURIER→deliveries.

**24 route API admin** (orders, orders/[id], orders/[id]/review, orders/export, production-tasks, production-tasks/master-notify, coupons, catalog, master-data, distro-catalog, zones+[id], customers, cms, cms/lookbook, complaints, activity-logs, notifications/summary, reports, shipping/usage, shop-config, system/health, dst.): semua terverifikasi cek `auth.api.getSession` + enum role. Tidak ada server actions di area admin.

## B. Temuan

### MAJOR-1 [PII] `passwordHash` ikut payload RSC halaman admin
- `src/app/admin/page.tsx:186` (`with: { user: true }`) & `orders/[id]/page.tsx:40`; skema `drizzle-schema.ts:48` `passwordHash`. API customers sendiri eksplisit melarang (`admin/customers/route.ts:41-42`).
- **Perbaikan:** allowlist kolom (id,name,email,role,phoneNumber) di kedua query.

### MAJOR-2 [PII] "PII dimask" klaim PALSU di `/api/admin/orders`
- `admin/orders/route.ts:8,32` import+ komentar mask, tapi `maskPhone` tak pernah dipanggil; respons `:84-85` `phoneNumber:true` + alamat mentah. Kontras: `orders/export/route.ts:166-167` benar masking; `reports/route.ts:104-108` benar.
- **Dampak:** PRODUCTION_STAFF & COURIER melihat WA mentah seluruh pelanggan (gang-sheet & deliveries bergantung jalur ini).
- **Perbaikan:** mask di server + kolom `waLink` dari nomor asli (untuk CS); atau asumsi toleransi eksplisit + hapus komentar palsu.

### MAJOR-3 [DATA-LOSS] master-dataPATCH `statusType` bisa menghancurkan nama
- `admin/master-data/route.ts:196-212`: PATCH `{statusType:"COMING_SOON"}` tanpa `name` → nama jadi "Apparel (SEGERA Hadir)"; `ACTIVE` tanpa name → nama kosong.
- **Perbaikan:** wajibkan `name` bila statusType, atau baca-modifikasi-tulis existing.

### MAJOR-4 [INTEGRITAS STOK] MatrixStockGrid kirim absolut, bukan delta
- `MatrixStockGrid.tsx:176-178`: `current + delta` di CLIENT lalu PATCH `{stockQty:…}` — menimpa proteksi anti-race API yang sudah menyediakan jalur `{delta}` (`admin/catalog/route.ts:23-24,131-138`; pemakaian benar di `VariantRowActions.tsx:93,102`).
- **Dampak:** lost update saat checkout bersamaan → oversell/ghost stock.
- **Perbaikan:** `handleDelta` → kirim `{delta}`.

### MAJOR-5 [RBAC] 6 halaman server tanpa guard internal + layout gate kasar
- Tanpa guard internal: `catalog`, `inventory`, `distro-catalog`, `orders/[id]`, `orders/[id]/job-ticket`, `orders/[id]/gang-sheet`. Layout izinkan 4 role untuk semua `/admin/*` → COURIER bisa buka job-ticket & detail order (kebijakan halaman per role yang jelas disengaja di page lain dilompati).
- **Perbaikan:** redirect per-role di level layout per segment ATAU guard async di tiap server page.

### MAJOR-6 [API] PATCH `/api/admin/complaints` tanpa zod/404/RL
- `complaints/route.ts:79-95`: `status` bebas (bukan enum RESOLVED/IN_PROGRESS/REJECTED), id tak dikenal tetap `success:true`, tanpa rate limit (kontras: route admin lain punya).
- **Perbaikan:** zod enum + `returning()` 404 + limiter.

### MINOR
7. `activity-logs` WA mentah, tanpa orderBy limit guard, akses 4 role (`route.ts:72`).
8. `shop-config` GET tanpa auth + `ensureTable()` DDL di jalur baca (`route.ts:44-46`, DDL runtime juga dicatat data auditor — lihat `06-`).
9. Update status order TIDAK memancing WA otomatis (cancel/refund/reject/resi hanya insert event; kebijakan owner OTP-only; eksplisit di `production-tasks/route.ts:624-625`) — dokumen saja agar admin tak berasumsi pelanggan dis SMS.
10. Batch `taskIds` gang-sheet tanpa optimistic where-stage (kemitraan jalur single punya 409 — `production-tasks/route.ts:359-366` vs `:519-529`) → bisa timpa saat 2 operator.
11. Katalog POST variasi: SKU duplikat tak dicek & tanpa try/catch (`catalog/route.ts:189-216`); jalur tunggal punya 409 (`:224-229`).
12. `distro-catalog` PATCH slug bisa menabrak slug lain (POST cek 1×).
13. master-data DELETE/PATCH id tak dikenal = `success:true` silent no-op; DELETE keras tanpa cek pemakaian.
14. UI: REFUNDED label "Dibatalkan" (`AdminOrdersManager.tsx:196-202`); detail order hardcode `text-white` (`orders/[id]/page.tsx:125`); ConfirmDialog 7 komponen vs `window.confirm` 2; AdminNav `roleLimit` dilumpuhkan `|| safeRole==="ADMIN"` (`AdminNav.tsx:88`); `useState(initialOrders)` bisa basi setelah router.refresh.
15. Cache: TIDAK ADA `revalidateTag/revalidatePath` se-repo; `unstable_cache` hanya inventory 60s; hero in-memory cache hanya valid per-isolate (multi-isolate basi ≤5 menit).

## C. yang TIDAK ditemukan (eksplisit — positif)
- **TIDAK ADA** route admin tanpa session check (24/24 fail-closed).
- **TIDAK ADA** vertical erosion ADMIN↔SUPER (customers:76-78 blok non-SUPER; reports & health hanya ADMIN/SUPER).
- **TIDAK ADA** IDOR lintas admin (aksi order via URL id — desain 1-admin toko).
- **TIDAK ADA** transisi status ilegal (assertTransition + optimistic 409 di 6 lokasi; cancel/refund whitelist + restore kupon; COMPLETED wajib semua task PACKAGING/DONE; QC gate memblokir tanpa inspeksi lolos).
- ClaimDoug atomic (isNull 409) TIDAK ada bug rebutan.
- Pagination tidak ada di: production-tasks (limit 200), complaints (100), activity-logs (200), distro — dinyatakan jujur, masih diterima skala UMKM.
- CSV export hanya Order (belum customers/coupons/inventory).
- Tidak ada CRUD banner slide terpisah (announcement via shop-config).

## D. Top 5
1. MAJOR-1 (passwordHash payload)
2. MAJOR-4 (matrix grid delta)
3. MAJOR-3 (statusType nama)
4. MAJOR-6 (complaints validation)
5. MAJOR-5 (gate per-role)
