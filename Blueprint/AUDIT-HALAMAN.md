# AUDIT DETAIL — 23 HALAMAN & SHELL (Kaos Kami Web)

> Induk: `AUDIT-MENYELURUH.md` §1–§2. Metode: baca penuh tiap file. Nilai 1–5.

---

## H1. `src/app/page.tsx` — Landing 3D story-scroll + fallback statis — 4/5

**Tujuan:** Homepage pengalaman 3D 4-fase dengan fallback non-WebGL.
**Bug:**
- Blok JSON-LD diduplikat di dua cabang return (pindah ke komponen `JsonLd`).
- `webglSupported===undefined` (belum detect) render kanvas kosong + overlay penuh → flash.
- `setViewMode("story")` tanpa cleanup bisa menimpa state Studio saat back-nav cepat.
**UX:** Fallback `StaticShowcase` bagus; tidak ada `h1` SEO di file ini (tergantung `HeroOverlay`); tidak ada error-boundary jika `CanvasStage` crash → layar hitam.
**Keamanan:** N/A publik. JSON-LD aman.
**Mati:** Import `Link` tidak dipakai.
**Obat:** komponen JsonLd + guard `undefined` + cleanup effect + boundary. Estimasi: kecil.

## H2. `src/app/catalog/page.tsx` — Grid katalog + quick-buy — 3/5

**Tujuan:** List varian ready-stock dengan filter kategori/ukuran.
**Bug:**
- `handleOpenInStudio` tidak panggil `setActiveApparel` (destructure mati) dan Link `/studio` tanpa varian → pilihan warna/ukuran hilang.
- `addItem` tanpa cek `stockQty===0` → bisa beli stok habis.
- Fetch gagal hanya `console.error` → empty-state menuduh "filter" padahal API down.
- Cast `as any` untuk `category.slug`.
**UX:** Loading + empty-state baik; filter `S/M/L/XL/ALL` hilang `XXL`; tombol tanpa `aria-pressed`; `<img>` tanpa dimensi → CLS.
**Mati:** `setActiveApparel`, ikon `Sparkles,Check,Layers,ArrowRight`.
**Obat:** teruskan varian via `?variantId=` + cek stok + error jujur + dimensi img. Estimasi: kecil–sedang.

## H3. `src/app/privacy/page.tsx` — Kebijakan privasi — 5/5 (fungsi)

**Bug:** Tanggal hardcode "September 2026".
**UX:** Tanpa Navbar/Footer (navigasi inkonsisten, hanya link kembali); tipografi mono kecil.
**Obat:** tambah nav + tanggal dinamis. Estimasi: kecil.

## H4. `src/app/track/page.tsx` — Lacak via WA OTP — 3/5

**Bug:** terima `data.mock` sebagai sukses (bypass dev bisa lolos prod); validasi `code<4` tapi label "6 digit"; tanpa timer/resend; nomor tak tampil di step-2; fetch tanpa catch JSON invalid.
**UX:** Empty-state baik; sukses/error sama-sama amber; tanpa auto-focus/Enter (bukan `<form>`); tanpa countdown 5 menit.
**Keamanan:** Flow benar (OTP sebelum list); link hasil `/orders/{id}` publik (proteksi = masking).
**Obat:** tolak mock di prod + form proper + countdown + tampilkan nomor. Estimasi: kecil.

## H5. `src/app/studio/page.tsx` — Shell fullscreen Studio 3D — 3/5

**Bug:** Tanpa fallback/pesan bila `!webglSupported` (layar hitam + header); `new Vector3` tiap render; `activeApparel` destructure mati.
**UX:** `h-screen overflow-hidden select-none` sulit di mobile; ikon tanpa aria-label; `CanvasStage` tak di-Suspense.
**Obat:** fallback non-WebGL + memo vektor + aria. Estimasi: kecil.

## H6. `src/app/render/[designId]/page.tsx` — Render farm — 1/5

**Bug:** `CanvasStage` (client/WebGL) di Server Component; `design` difetch tapi TAK PERNAH dioper → selalu render default; `data-render-ready='true'` langsung (race Puppeteer).
**UX:** Tanpa loading/error selain teks.
**Keamanan:** Tanpa auth → enumerasi designId.
**Mati:** `category` di-with tapi tak dipakai.
**Obat:** client-island + oper decals/warna + ready via `onCreated` + guard pemilik. Estimasi: sedang.

## H7. `src/app/orders/[id]/page.tsx` — Invoice publik + masking — 4/5

**Bug:** `order.user.name` crash bila guest `user=null`; `IN_PRODUCTION_QUEUE` = banner "BERHASIL" (menyesatkan); `?status=success` dipercaya (spoofable).
**UX:** Histori + rincian + WA baik; `courierNotes` internal tampil publik.
**Keamanan:** BAGUS (`canSeePII`, maskPhone/maskEmail, alamat hidden). Sisa: UUID tahu = lihat item/total/notes.
**Mati:** Import `Package,Truck,Calendar,CreditCard,ShieldCheck`.
**Obat:** guard null + banner jujur + sembunyikan notes internal. Estimasi: kecil.

## H8. `src/app/dashboard/orders/page.tsx` — Portal pelanggan — 2/5

**Bug KRITIS (P0-1):** guest (`sessionUserId=null`) → `where=undefined` → 5 order + 6 desain milik ORANG LAIN. `design.category.slug` tanpa `?.`; `ReorderButton userId` bocorkan ID.
**UX:** Limit 5/6 tanpa "lihat semua"; empty tanpa CTA.
**Mati:** `revalidate+force-dynamic` dobel; impor ikon mati.
**Obat:** redirect login + default `[]`. Estimasi: kecil.

## H9. `src/app/admin/page.tsx` — Overview metrik — 3/5

**Bug:** Omset termasuk PENDING (inflated); deteksi express `like %EXPRESS%` rapuh; `dynamic` di bawah (jalan tapi tak rapi).
**UX:** Kartu jelas; tabel tanpa paginasi/search.
**Keamanan:** Andalkan layout; nama full.
**Mati:** `ArrowUpRight,AlertTriangle,Calendar`.
**Obat:** filter status lunas + paginasi. Estimasi: kecil–sedang.

## H10. `src/app/admin/production/page.tsx` — Kanban DnD — 3/5

**Bug:** Drop ke task (bukan kolom) gagal diam; tombol dalam kartu draggable tanpa handle; `t.order.user.name` tanpa `?.`; tanpa optimistic update.
**UX:** Tanpa skeleton (papan 600px kosong); 7 kolom sempit; search nama depan saja.
**Keamanan:** Phone full + printFileUrl ke semua staff.
**Mati:** `Clock,Filter,ChevronRight` sebagian.
**Obat:** baca stage dari `over.data` + drag-handle + skeleton. Estimasi: kecil.

## H11. `src/app/admin/orders/page.tsx` — Tabel pesanan — 3/5

**Bug:** Tanpa limit → OOM saat ribuan; tanggal tanpa tahun; kolom payment difetch tak tampil.
**UX:** `overflow-x-auto` baik; tanpa search/filter/sort padahal ikon diimpor.
**Mati:** `Search,Filter,Clock`.
**Obat:** paginasi + tampil payment. Estimasi: sedang.

## H12. `src/app/admin/orders/[id]/page.tsx` — Detail inspeksi — 3/5

**Bug:** `wa.me/undefined` bila phone null; fallback `productionTasks[idx]` bisa salah baris; `OrderInspector3D` generik ("prediktif" menyesatkan); histori jam saja.
**UX:** Job-ticket/gang-sheet `_blank` baik; hint 360 jelas.
**Keamanan:** PII penuh ke semua staff; tak ada RBAC di page (andalkan layout).
**Mati:** `MapPin,AlertCircle`.
**Obat:** guard null + join eksplisit + oper data ke inspector. Estimasi: sedang.

## H13. `src/app/admin/orders/[id]/gang-sheet/page.tsx` — Lembar A3 — 2/5

**Bug:** `onClick={()=>window.print()}` di Server Component (kemungkinan error runtime); `width:30cm` overflow mobile; fallback idx mismatch.
**UX:** Empty-state ada; tombol cetak mati; grid kaku.
**Keamanan:** Tanpa RBAC di page; URL master terekspos.
**Obat:** tombol ke `PrintButton` + join eksplisit. Estimasi: kecil.

## H14. `src/app/admin/orders/[id]/job-ticket/page.tsx` — Tiket PDF — 4/5

**Bug:** Fallback idx sama; asumsi `front` bila placement null.
**UX:** Paling matang (print:hidden, checklist, tanda tangan); checkbox tanpa htmlFor.
**Keamanan:** PII tercetak (kebutuhan ops); tanpa watermark.
**Mati:** `Printer` (pakai PrintButton).
**Obat:** join eksplisit. Estimasi: kecil.

## H15. `src/app/admin/catalog/page.tsx` — Manajemen katalog — 3/5

**Bug:** `limit:20` dikira total; kategori read-only (klaim CRUD bohong); field tanpa fallback ("undefined").
**UX:** Tanpa tambah/filter/empty-state.
**Obat:** paginasi + label jujur. Estimasi: sedang.

## H16. `src/app/admin/customers/page.tsx` — Database pelanggan — 3/5

**Bug:** `limit:50` dikira total; `CustomerRoleSelect` inline di `<span>`.
**UX:** Tanpa mask/search/export; baris sempit mobile.
**Keamanan:** PII penuh + teks PDP tanpa enforcement.
**Obat:** paginasi + mask. Estimasi: sedang.

## H17. `src/app/admin/coupons/page.tsx` — Voucher — 3/5

**Bug:** `.catch(()=>[])` sembunyikan DB down; badge hitung nonaktif; teks "buat di atas" padahal form di bawah; `minSpendIdr.toLocaleString` crash bila null.
**UX:** Form di bawah (scroll); tanpa tanggal.
**Obat:** tampilkan error + pindah form. Estimasi: kecil.

## H18. `src/app/admin/cms/page.tsx` — CMS — 2/5

**Bug:** Panel Lookbook palsu (input + tombol tanpa handler, Server Component); placeholder `look-01..04` bukan data R2; `<a>` bukan Link.
**UX:** Klaim "KELOLA SELURUH WEBSITE" overpromise; tanpa preview/sukses.
**Obat:** implement R2 list/upload atau hapus panel. Estimasi: sedang.

## H19. `src/app/admin/settings/page.tsx` — Info + template WA — 3/5

**Bug:** Read-only berjudul settings; fallback env bisa bocor ke UI.
**UX:** Rapi; catatan "edit via code" jujur tapi bukan solusi.
**Obat:** jadikan "Info Sistem" atau tambah edit. Estimasi: kecil.

## H20. `src/app/admin/layout.tsx` — Gate RBAC + sidebar — 2/5

**Bug KRITIS (P0-5):** fail-open (non-prod/catch → render). Hardcode nama operator.
**UX:** Tanpa active-state/collapse mobile/logout (import mati).
**Obat:** selalu redirect + rethrow + logout + role asli. Estimasi: kecil.

## H21. `src/app/layout.tsx` — Root shell — 4/5

**Bug:** `DUITKU_ENV` unset → fallback sandbox ikut prod; gaId tanpa sanitasi; tanpa OG image.
**UX:** Banner mount di admin/print; SmoothScroll ganggu print.
**Obat:** guard env + OG + kecualikan banner/print. Estimasi: kecil.

## H22. `src/app/not-found.tsx` — 404 kustom — 4/5

Minimal bagus; orphan tanpa nav; pesan generik. Estimasi: kecil.

## H23. `src/app/sitemap.ts` — Sitemap — 4/5

Fallback `kaoskami.com` vs `workers.dev` (kanonikal ganda); `lastModified: now` boros crawl. Estimasi: kecil.
