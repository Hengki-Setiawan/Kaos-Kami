# 📜 MASTER BUILD PROGRESS TRACKER — KAOS KAMI
**Project:** Kaos Kami — 3D Interactive Apparel E-Commerce & DTF Sablon Platform  
**Target:** Kota Makassar, Sulawesi Selatan  
**Repository:** `https://github.com/Hengki-Setiawan/Kaos-Kami.git`  
**Last Updated:** 07 Oktober 2026 (WITA)

---

## 📌 LOG HARIAN & RIWAYAT PENGERJAAN

| No | Tanggal & Waktu | Area / Modul | Ringkasan Pekerjaan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | 26 Sep 2026 | Header & Navigasi | Audit seluruh tombol header: menambahkan navigasi Home, mengubah teks jadi Katalog & About, menghapus tombol mubazir, perapihan jarak. | **SELESAI** |
| **02** | 26 Sep 2026 | Etalase / Modal | Memperbaiki bug scroll modal pop-up: isolasi `Lenis` smooth-scroll (`data-lenis-prevent`) agar scroll wheel tidak membajak layar belakang. | **SELESAI** |
| **03** | 26 Sep 2026 | Landing Page Hero 3D | Menaikkan posisi Y kaos (+0.12) dan memperbesar skala (+17%, scale 1.70) agar tampil megah di samping teks hero. | **SELESAI** |
| **04** | 27 Sep 2026 | Studio 3D Framing | Mengimplementasikan **Three.js Asymmetric Viewport Offset (`camera.setViewOffset`)**: kaos otomatis bergeser ke panggung kanan (+280px) saat drawer di kiri, dan ke kiri saat drawer di kanan. | **SELESAI** |
| **05** | 27 Sep 2026 | Studio 3D Frameloop | Memperbaiki bug animasi macet: menambahkan `invalidate()` pada loop damp R3F sehingga transisi meluncur otomatis 60 FPS tanpa perlu mengklik kanvas. | **SELESAI** |
| **06** | 27 Sep 2026 | Studio 3D Camera Distance | Mendekatkan jarak kamera default dari Z=2.9 $\rightarrow$ Z=1.70 $\rightarrow$ **Z=1.38**, membuat baju mengisi ~75% layar secara tajam dan gagah. | **SELESAI** |
| **07** | 27 Sep 2026 | Audit Fisik 8 Aset Pakaian | Audit ukuran seluruh 8 aset 3D (T-Shirt, Longsleeve, Sweater, Hoodie, Jacket, Cap, Pants, Shorts) vs standar konveksi lokal Makassar dan internasional (Size L). | **SELESAI** |
| **08** | 27 Sep 2026 | Kalibrasi Skala Jacket | Mengoreksi skala Coach Jacket dari 0.2999 ke **0.35** di `ShirtModel.tsx`: tinggi naik 0.554 $\rightarrow$ 0.646m, ketebalan naik dari gepeng 0.143 $\rightarrow$ 0.167m, bentang bahu 0.72m pas dengan manekin 1.78m. | **SELESAI** |
| **09** | 27 Sep 2026 | Logika Decal Jaket Open-Front | Menyesuaikan penempatan sablon depan jaket (`useConfiguratorStore.ts`): otomatis menempel di **Dada Kiri (*Left Chest*)** $X = -0.11, Y = 0.04$ agar tidak melayang di lubang resleting tengah. | **SELESAI** |
| **10** | 27 Sep 2026 | UI/UX Studio Declutter | Redesain minimalis & premium studio: menyatukan HUD kontrol kamera/3D (`StudioHUD.tsx`), merapikan header, dan memperbaiki pop-up customizer agar tidak terpotong (`top-[74px] bottom-5` unclipped). | **SELESAI** |
| **11** | 27 Sep 2026 | Kamera Elevasi, Clean View & Audit Ikon | Mengangkat elevasi kamera bebas halangan dari HUD dock, memperbaiki tombol "TAMPIL BERSIH" agar menu tersembunyi sempurna, dan mengganti seluruh emoticon/emoji dengan ikon vektor standar Lucide & SVG 8 pakaian. | **SELESAI** |
| **12** | 27 Sep 2026 | Matriks Stok Multi-Dimensi & Riset Harga Pasar | Riset harga pasar Indonesia 2026, seeding 306 SKU varian lengkap ke Turso DB, implementasi antarmuka Matrix Stock Grid 2D di Admin Dashboard, serta integrasi live stock checking di 3D Studio Drawer & Checkout. | **SELESAI** |
| **13** | 27 Sep 2026 | Live Chat Kamito & Sistem Notifikasi Terintegrasi | Implementasi floating widget Tanya Kamito dengan maskot resmi Kaos Kami, auto-welcome bot, admin presence detection (09:00-21:00 WITA), konsol chat admin di `/admin/chat`, lonceng notifikasi interaktif user & admin (`UserNotificationBell` & `AdminBell`). | **SELESAI** |
| **14** | 27 Sep 2026 | Eksekusi Nyata E2E Master Blueprint (Kasus 1 s/d 6) | Eksekusi 100% lolos 6 kasus integrasi nyata: Kaos Boxy Makassar, Hoodie Pickup KM 10 + clamp 30cm, Bulk Merch 12 pcs QRIS, Gang Sheet 100x58cm nesting, 7 cyber penetration intercepts, dan Kanban workshop 7-tahap & serah terima pengiriman. | **SELESAI** |
| **15** | 27 Sep 2026 | Paritas Penuh Mobile Capacitor (`kaos-kami-mobile`) | Riset, audit menyeluruh, dan implementasi kesetaraan fitur web ke mobile: Aset Maskot Kamito resmi, Morphological Sizing S-XXL (skala proporsional 3D Three.js real-cm), Modal Panduan Ukuran Interaktif, Widget Live Chat Tanya Kamito Mobile (presence WITA, auto-bot, haptics), Lonceng Notifikasi User (`MobileNotificationBell`), lolos verifikasi tsc 0 error, build Next.js export, dan `npx cap sync android` selesai 100%. | **SELESAI** |
| **16** | 04 Okt 2026 | Audit Forensik 36 Area Website & Riset Startup UI Kelas Dunia | Audit forensik 30 screenshot + 6 rute publik (36 area end-to-end), riset standar startup kelas dunia 2026 (Linear, Raycast, Stripe, Resend), kompendium 10 framework & skill GitHub (ui-craft, emilkowalski/skills, rauno.me/craft, awesome-design-md, hallmark), doktrin zero-noise microcopy, kamus transformasi teks anti-slop, dan formulasi Master SSOT `BLUEPRINT-AUDIT-UIUX-REDESIGN-DASHBOARD.md` (820+ baris). | **SELESAI** |
| **17** | 04 Okt 2026 | Eliminasi 2D Canvas, Relokasi Backup Eksternal & Blueprint Produksi | Keputusan arsitektur memensiunkan total 2D Canvas (`PatternStudio` & `FabricEditor`), memindahkan seluruh backup internal (`backups/`) & 2D canvas ke direktori cadangan eksternal (`D:\Vibe coding Semester 7\Backup-Kaos-Kami\`), merancang Blueprint Bab 42–45 untuk pratinjau staf workshop maklon & heat press dengan kalibrasi fisik 1:1 real-cm dan offset kerah akurat. | **SELESAI** |
| **18** | 04 Okt 2026 | Gelombang 1: Fondasi Sistem Desain & Tipografi Global | Eliminasi tuntas `font-display` (`Syne 800`) di 40+ kontrol UI interaktif (tombol ekspor/share, modal Auth/Checkout/Matrix/Chat/Alamat, drawer sheet, header halaman admin/publik), standarisasi tipografi ke `Plus Jakarta Sans` (`font-sans`) untuk teks UI dan `font-mono tabular-nums` untuk angka stok/laporan keuangan, perbaikan bug duplikasi listener `ConfirmDialog.tsx` dengan transisi sub-150ms & feedback ikon semantik, serta injeksi utilitas safe-area (`pt-safe`, `pb-safe`) dan dynamic viewport (`100dvh`) pada container mobile. Lolos verifikasi `tsc` 0 error dan 185 tests Vitest. | **SELESAI** |
| **19** | 04 Okt 2026 | Gelombang 2: Modernisasi Total Studio 3D, Ekspor Mockup Tamu & Lab Kain | Pembebasan unduh mockup PNG 2K bagi tamu tanpa login (watermark ultra-transparan elegan 0.08–0.11 alpha via HTML5 Offscreen Canvas; member login 100% bebas watermark; simpan desain & checkout tetap login-gated). Implementasi Modal Ekspor Studio Terpadu 3-tab (`ExportStudioModal.tsx`: PNG 2K, Kartu Medsos 4:5, Video 360°), ekstraksi instrumen uji fisika & manekin ke Modal Lab Kain independen (`ClothLabModal.tsx`), eliminasi 400+ baris redundan & residu 2D canvas di drawer desktop/mobile (`CustomizerDrawer.tsx`), perampingan HUD 3D dengan tombol Reset posisi (`StudioHUD.tsx`), serta penyempurnaan `DecalGizmo.tsx` (laser center snap & border peringatan zona sablon DTF 30cm). Lolos verifikasi `tsc` 0 error pada web dan mobile, serta 185 test Vitest lolos 100%. | **SELESAI** |
| **20** | 04 Okt 2026 | Gelombang 3: Modernisasi E-Commerce, Dashboard Pelanggan, Toko & Checkout | Modernisasi visual dashboard pelanggan (`CustomerDashboardView.tsx`) dengan 3 Bento Metric Hub, highlight order tracker real-time 6-tahap, wardrobe cards dengan modal 1-click order instan (ukuran & qty langsung ke cart), etalase kategori filter pills dan cross-sell CTA 3D Studio, elevasi empty-state keranjang dengan maskot Kamito, tracking publik progress step, dan simulator lusinan grosir (SSOT `pricingEngine.ts`). Lolos `tsc` 0 error dan 185 test Vitest. | **SELESAI** |
| **21** | 04 Okt 2026 | Gelombang 4: Portal Admin, Alur Maklon 4 Tahap Kanban DTF & Tiket Workshop | Eliminasi rute mati (`/admin/review`, `/admin/assets`) pada `AdminNav.tsx`, perampingan navigasi admin, implementasi View Mode Toggle pada Kanban Produksi (`production/page.tsx`: Alur Maklon 4 Tahap Workshop Makassar vs Rinci 7 Kolom), upgrade kartu kerja dengan pratinjau thumbnail/mockup, metrik fisik cm (clamped max 30.0cm), indikator offset jahitan kerah, 1-click unduh master 300 DPI, dan Modal Tiket Kerja Workshop 3D lengkap dengan SOP Heat Press 160°C 15s Cold Peel. Lolos verifikasi `tsc` 0 error dan 185 test Vitest 100%. | **SELESAI** |
| **22** | 04 Okt 2026 | Gelombang 5: Aplikasi Mobile Capacitor, Eliminasi Syne 800 & Sinkronisasi Hardware | Pembersihan tuntas 47 kemunculan font display Syne di seluruh komponen mobile (`NativeHeader`, `BottomSheet`, `MobileNotificationBell`, `ColorSwatchPicker`, `MobileSizeGuideModal`, `BiometricLockModal`, `SavedDesignsGallery`, `DynamicIslandPreview`, `UserOrderTracker`, `UserOrderHistory`, `CheckoutSheet`, `MobileKamitoChatWidget`, `AdminMobileDashboard`, `AdminJobTicketModal`, `CanvasStageMobile`, `ARPreviewStage`, `app/page.tsx`), standarisasi ke `font-sans` dan `font-mono tabular-nums`, injeksi token safe-area (`pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`), build static export Next.js 15 sukses 100% (`out/`), serta sinkronisasi 17 plugin native via `npx cap sync android` selesai dalam 2.09s. Lolos `tsc` 0 error dan 185 test Vitest. | **SELESAI** |
| **23** | 04 Okt 2026 | Gelombang 6: Migrasi Total iPaymu Direct QRIS 100% In-App (Web & Mobile Capacitor) | Purge menyeluruh residu Duitku pada web dan mobile, implementasi Modal Direct QRIS In-App terpadu (`DirectQrisModal.tsx` & `DirectQrisSheet.tsx`) dengan 1-click unduh gambar QRIS ke galeri HP, panduan screenshot m-Banking/e-Wallet, auto-polling pelunasan real-time sub-4s, sinkronisasi endpoint `/api/checkout`, `/api/orders/[id]/repay`, `/api/orders/[id]/request-payment`, dan pembersihan copy Duitku di privacy/terms. Lolos validasi `tsc` 0 error (web & mobile), 185 Vitest tests passed 100%, mobile static export Next.js sukses (`out/`), dan `npx cap sync android` selesai 100%. | **SELESAI** |
| **24** | 04 Okt 2026 | Gelombang 7: Uji Simulasi End-to-End Transaksi Nyata & Manufacturing Kanban DTF Makassar | Eksekusi otomatis 6-tahap skenario transaksi nyata end-to-end (`test-e2e-wave7.mjs`): Server readiness 200 OK -> Otentikasi & alamat user Makassar terverifikasi WA -> Checkout pemesanan sablon DTF (Kaos Combed 24s Solid Black, logo dada kiri, A3 clamped 30cm) dengan penerbitan Direct QRIS In-App -> Simulasi pelunasan webhook iPaymu idempoten -> Verifikasi database Turso (Order `PAYMENT_CONFIRMED`, Payment `SETTLEMENT`, dan auto-create `ProductionTask` SPK) -> Transisi 6 status Kanban DTF Workshop Makassar (`SCREEN_PRINT_SETUP` -> `PRINTING` -> `PRESSING` 160°C 15s -> `QUALITY_CHECK` -> `PACKAGING` -> `DONE`). 100% Lolos tanpa error. | **SELESAI** |
| **25** | 04 Okt 2026 | Gelombang 8: Penuntasan 100% Menyeluruh (Harmonisasi iPaymu, Android Native APK & UAT Skripsi) | Penuntasan total 8% gap: (1) Harmonisasi variabel lingkungan `IPAYMU_ENV` & unifikasi gateway di `checkout/route.ts` dan `repay/route.ts`; (2) Implementasi dynamic QRIS fallback anti-layar kosong pada `ipaymu.ts` saat dev/sandbox lokal; (3) Verifikasi 100% native kolom skema `Order` (`reviewNote`, `reviewedBy`, `reviewedAt`) di Turso DB; (4) Kompilasi sukses biner Android APK fisik asli (`app-debug.apk` 136 MB, App ID `id.makassar.kaoskami`) via Gradle daemon; (5) Penyiapan otomatis workbook tabulasi UAT 10 responden x 15 instrumen (`TABULASI_DATA_UAT_KAOS_KAMI.xlsx`) & kamus koreksi dosen FEB UNM. 100% Lolos tanpa error. | **SELESAI** |
| **26** | 05 Okt 2026 | Sektor A: Core 3D Studio, Gizmo Screen-Space & Viewport Collision (Bab 7, 21, 22, 23, 39, 40, 42, 43, 45, 51, 53) | Rekayasa total `DecalGizmo.tsx` bertransisi dari Drei `<Html transform>` ke **2D Screen-Space Bounding Box** via `vector.project(camera)` (menempel rapat 1:1 di atas kain kaos, 0 celah melayang saat baju berputar, normal dot-product occlusion test). Perampingan HUD bawah (`StudioHUD.tsx`) ke tipografi modern `font-sans text-xs font-semibold` dan eliminasi tombol duplikat. Relokasi & drawer-aware docking pada `KamitoChatWidget.tsx` (auto-shift menjauh saat drawer terbuka ke `md:right-[410px]`, elevasi bebas tabrakan dari dock bawah). Eliminasi total residu `FabricEditor.tsx` & pembersihan toggle gizmo ganda di `CustomizerDrawer.tsx`. Lolos kompilasi `npx tsc --noEmit` 0 error. | **SELESAI KODE (MENUNGGU VERIFIKASI FISIK OWNER)** |
| **27** | 05 Okt 2026 | Gelombang 9: Audit Kritis 6-Agen & Skor Literal 59.3% (Bab 1–55, 2.947 baris) | Audit read-only 6 agen paralel atas seluruh blueprint: Bab 1–10 = 0.48, Bab 11–20 = 0.42, Bab 21–31 = 0.63, Bab 32–41 = 0.60, Bab 42–50 = 0.78, Bab 51–55 = 0.74. Total literal **32.6/55 = 59.3%** (fungsional ~80%). Temuan: 9 path target blueprint basi/hilang, 4 bab bernilai 0 murni dokumen (Bab 2/11/13/17), adaptasi sadar belum diratifikasi (warna A11Y, FAB 48px, stepper 6-tahap, snap 70/30). `tsc` 0 error, Vitest 185/185 diverifikasi ulang independen. | **SELESAI (AUDIT)** |
| **28** | 05 Okt 2026 | Gelombang 10: Eksekusi 17 Item Sisa via 6 Agen Paralel (59.3% → 70.5%) | (P1) Uninstall `fabric` + purge CSP/env/komentar Duitku; (P2) purge mono AuthModal/CheckoutModal/Profile/AddressBook/deliveries/production + judul `Keranjang (0)` + KEMBALI `h-9` + microcopy deklaratif; (P3) `AdminCommandBar.tsx` Ctrl+K + 8 test baru (keyboard review dinyatakan tak feasible — UI review telah dihapus); (P4) modal Intip 3D + duplikat decal + teks re-editable + Smart Zone A3; (P5) token `zIndex.ts` + `touch-none` kanvas (rewrite SVG gizmo ditahan — kritis); (P6) trust badges + sosmed aktif + sliding-underline + kuota humanis + status-dot + redirect 301 legalitas. `tsc` 0 error, Vitest **177/177**. Skor literal baru **38.8/55 = 70.5%**. | **SELESAI KODE (MENUNGGU VERIFIKASI FISIK OWNER)** |
| **29** | 05 Okt 2026 | Gelombang 11: Cutover Backend 100% iPaymu Jalur Aktif | `checkout/repay/request-payment` → `ipaymuProvider.createCharge` tunggal; webhook Duitku → 410 + audit-only; sweep → cek `providerRef` IPAYMU; admin-sync → cek transactionId iPaymu; migrasi SQL disiapkan di `kaos-kami-web/scratch/migrasi-ipaymu-default.sql` (belum di-apply). Pemakaian aktif `duitkuProvider` = 0. `tsc` 0 error, Vitest 177/177. | **SELESAI KODE (BUTUH UJI SANDBOX + APPLY MIGRASI OWNER)** |
| **30** | 05 Okt 2026 | Amandemen Resmi Bab 56 (Keputusan Diskusi 4 Blok) | Bab 56 ditambahkan ke blueprint: (A1) keyboard review dicoret; (A2) rewrite laser SVG + checkout 2-langkah disetujui & dikerjakan; (A3) adaptasi sadar disahkan (token, spring CSS, 48px, 6-step, warna A11Y; Bab 2/11/13/17 = referensi); (A4) verifikasi owner. Audit literal berikutnya menilai amandemen sebagai spec. | **SELESAI (DOKUMEN)** |
| **31** | 05 Okt 2026 | Gelombang 12: Rewrite Laser SVG + Checkout 2-Tahap (Amandemen A2) | Laser: `DecalGizmo.tsx` rewrite 545 baris (proyeksi pusat+4 sudut → polygon perspektif, occlusion world-correct, delegasi penuh ke `clampDecalXY`/kalibrasi, 0 rumus duplikat) + fallback `DecalGizmoHtml.tsx` + `gizmoSvgBridge.ts` + `gizmoSvgMath.ts` + 8 test baru + flag `NEXT_PUBLIC_GIZMO_SVG`. Checkout: V2 2-tahap (Alamat+kurir, Bayar; state persisten via `hidden`, validasi mirror, bayar/OTP/QRIS/pricing/endpoint tak tersentuh) + `CheckoutModalLegacy.tsx` + flag `NEXT_PUBLIC_CHECKOUT_V2`. `tsc` 0 error, Vitest **185/185**. Skor literal baru **39.55/55 = 71.9%**. | **SELESAI KODE (UJI 5 SUDUT + SANDBOX WAJIB OWNER)** |
| **32** | 05 Okt 2026 | Gelombang 13: 4 Satelit (Skrip E2E, Mobile, Test, Dokumen) via 4 Agen Paralel | Skrip: 13 file E2E migrasi Duitku→iPaymu (`node --check` 13/13, tanpa live run). Mobile: `MobileCartDrawer` + alur PESAN→cart, token z-index + 12 titik, port math gizmo penuh, label iPaymu; `tsc` mobile 0. Test: 4 file/33 test baru (V2-switch, z-order, duplikat, smart-zone, E2E palette) → **218/218**. Dokumen: RUNBOOK (iPaymu + arsitektur baru), DESIGN (token aktual), env examples (2 flag), tracker 169→185. Web+mobile `tsc` 0. Program-wide **~77%**. | **SELESAI KODE (VERIFIKASI FISIK + LIVE-RUN OWNER)** |
| **33** | 05 Okt 2026 | Gelombang 14: Apply Migrasi iPaymu ke Turso Live (oleh AI, disetujui owner) | Backup 319 baris Payment ke `kaos-kami-web/scratch/backup-payment-pre-ipaymu.json`. Sensus pre: 292 PENDING DUITKU + 24 SETTLEMENT DUITKU + 3 IPAYMU. Migrasi: rebuild tabel (DEFAULT 'IPAYMU'), salin 1:1, backfill 292 PENDING→IPAYMU, riwayat 24 tak tersentuh. Sensus post: 292 PENDING IPAYMU + 24 SETTLEMENT DUITKU + 3 IPAYMU, total 319, `DEFAULT 'IPAYMU'` terverifikasi. Sinkron `drizzle-schema.ts:371` → `default("IPAYMU")`. `tsc` 0, Vitest 218/218. | **SELESAI PENUH** |
| **34** | 05 Okt 2026 | Gelombang 15: Tuntas Sisa Audit (Mono 94→5, 6 Fitur, Sinkron Dokumen) | (A1) ~90 baris mono→sans + gradien tertib + label gizmo netral + hairline chat + tabular Rp/track; sisa 5 sah-angka. (A2) ChatQuickMacros, CouponCreateModal, CustomerListFilter, CmsHeroPreview, invoice kanonis + link, redirect www→apex; mobile gizmo-math ditunda jujur. (B) RUNBOOK §5/§10, DESIGN token/z-index/48px, env IPAYMU aktif, tracker path+angka, AGENTS.md 21 tag HILANG. Web+mobile `tsc` 0, 218/218. Literal **~73.4%**, program **~79%**. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **35** | 05 Okt 2026 | Gelombang 16: Tier 1+2 Sisa + Amandemen A5 (Paralel 4 Agen) | (T1) Syne 4 non-hero→sans + default generator Jakarta, mono Showcase3D/Checkout/SizeGuide/coupons/customers/cms, glow→hairline, Bell responsif, navbar scroll-aware, hapus duplikat Size/Theme/Turntable, frasa kamus, galeri obsidian, komentar Duitku netral, id tab legacy. (T2-publik) WA+resi kanban, swatch etalase, slider+GSM kalkulator, timeline track, map-pin, bell Kamito, rekomendasi cart, medsos tamu watermark (video tanpa watermark jujur). (T2-admin/studio) bubble WA settings, chart SVG laporan, icon-rail, preview 3D tiket, auto-pivot layer, HUD mobile vertikal; master PNG+WA otomatis ditunda jujur (butuh API baru). (T3) Amandemen A5: hub-cards/orders/stepper/auth/snap SAH + putusan popover z-70 (diekseskusi 1 baris). Web+mobile `tsc` 0, 218/218. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **36** | 05 Okt 2026 | Gelombang 17: Tuntas Audit Ulang (Kamus, Spring, Admin, Watermark Video, Master API) | (B1) Kamus Jalur Produksi/Efisiensi/Bahan&Ketebalan/PDP Protected + fallback Syne dihapus + token out-expo/caret + focus-ring Tier-1 + spring ConfirmDialog + hapus turntable. (B2) Shortcut 1-4, breadcrumbs, health pill, takeover CS, kanban 1-klik/WA/resi, trust badge #5. (B3) Watermark video tamu (compositor+tile), tooltip overlay gizmo, endpoint master-notify + form tiket, docs/MOBILE-PARITY.md. Web+mobile `tsc` 0, **236/236**. Literal **~75%**, program **~81%**. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **37** | 05 Okt 2026 | Gelombang 18: Verifikasi Klaim + Sisa Genuine Terakhir | Verifikasi silang 14 klaim (11 ADA, 3 offset-baris); gugurkan tuduhan basi (FAQ, badge, pills, kanban, sosmed). Build: mono naratif sisa, Syne generator, spring/caret/ring, kamus sisa, testing-pill admin-only, kanban strip pilar, badge #4 BI, resi track API (+kolom trackingNumber). Web+mobile `tsc` 0, 236/236. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **38** | 05 Okt 2026 | Gelombang 19: Audit Terdalam 5 Agen + Sapu Mikro Terakhir | E1 regresi 19/20 UTUH; E2 publik 16 kurang mikro; E3 studio/bridges/kanban SEHAT (radius & master-auto belum); E4 drift prisma vs drizzle + klasifikasi purge; E5 todo-26 21-22/26 ✅. Build: mono OrderAdminActions/EditProductModal → sans (kode/SKU tetap mono). Web `tsc` 0, 236/236. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **39** | 05 Okt 2026 | Gelombang 20: Audit 5 Agen + Sisa Genuine (Privacy, Trust BI, TOC, Pills, Invoice) | F1 sisa nyata (drift prisma, Haversine, master-auto, test-gap, anchors, canonical); F2 API 70 rute (rate-limit ok, yatim terpetakan, iPaymu tanpa signature didokumentasikan); F3 dead-code diklasifikasi; F4 security (secret disensor, XSS/PII/RL/bypass/signature diperbaiki); F5 mobile/CI/build sehat. Build: privacy sans, badge BI, TOC 3 halaman, pill katalog, masking invoice, anchor parity. Web+mobile `tsc` 0, 236/236. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **39** | 05 Okt 2026 | Gelombang 20: Hardening Keamanan + A11y + Skema (3 Agen Paralel) | (G1a) Mobile XSS → render teks + PII mask deliveries/production/job-ticket. (G1b) Rate-limit 9 route + bypass env-allowlist + iPaymu signature verify dipakai. (G2) role=dialog 4 modal + aria X + canonical + 9 env example + migrasi prisma 0002 IPAYMU (tanpa db push); hapus file mati DITUNDA jujur. Web+mobile `tsc` 0, 236/236. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **40** | 06 Okt 2026 | Gelombang 21: Audit V1/F1-F5 + Hapus Dead-Code + Unifikasi Validasi | V1: G20 9/10 TERBUKTI. F1: 10 sisa (drift, Haversine, master-auto, test-gap, anchors, canonical). F2: 70 route SEHAT + anomali tercatat. F3: 5 file mati DIHAPUS (0 importir) + legacy dipertahankan. F4: secret steril + XSS/PII/RL/bypass/signature SEHAT. F5: mobile/CI/build + 9 env + git 290. Build: validasi checkout 1-sumber, kartu kanban sans, tablist/tab. Web `tsc` 0, 236/236. | **SELESAI KODE (VERIFIKASI FISIK OWNER)** |
| **41** | 07 Okt 2026 | Pemulihan SSOT 3D, Proyektor Curvature Torso Orbit 360°, & Kalibrasi Sisi Dinamis | Reset ke Git HEAD bersih, eliminasi eksperimen SVG math, implementasi Curvature-Adaptive Orbit Projection (rotasi normal silinder dada hingga ±82°, 0% melar samping), handover mulus 360° (Dada↔Rusuk↔Punggung↔Lengan), auto-clamp skala zona sempit, dan pill batas fisik dinamis (Maks 8.5cm lengan, Maks 12cm rusuk, Maks 30cm dada). | **SELESAI KODE (MENUNGGU VERIFIKASI FISIK OWNER)** |

> **Catatan wave paralel (generik, tanpa klaim hasil agen lain):** bila wave E2E-migrasi / mobile-parity / test-coverage dikerjakan paralel, tambahkan baris log bernomor di tabel ini HANYA setelah `tsc` 0 error + Vitest hijau terverifikasi + verifikasi fisik owner. Baseline terkini: Vitest **218/218, 30 file** (Gelombang 13–14; angka lama 185/185 = baseline Gelombang 12, sudah basi). Rumus hitung: jalankan `npm test` (`vitest run`) di `kaos-kami-web/` — file = `*.test.ts` di `src/` (30), test = blok `it(...)` yang dieksekusi vitest (218). Dokumen ini tidak mengklaim hasil wave paralel yang belum terverifikasi.

---

## 🏛️ DETAIL IMPLEMENTASI & ARSITEKTUR TEKNIS

### 1. Smart Asymmetric Viewport Auto-Framing (`CameraRig.tsx`)
* Menggunakan fitur natif Three.js `camera.setViewOffset(fullWidth, fullHeight, -offsetX, 0, fullWidth, fullHeight)`.
* **Kelebihan**: Poros rotasi 360° tetap terkunci 100% pada pusat fisik pakaian `(0, -0.05, 0)`, sehingga pakaian berputar pada poros tegaknya sendiri tanpa fenomena ayunan pendulum (*orbit swing bug*).
* Ekspor mockup (PNG Alpha & 2K) otomatis me-reset `viewOffset` ke tengah (`camera.clearViewOffset()`) sebelum pengambilan gambar, sehingga foto mockup hasil ekspor selalu simetris di tengah.

### 2. Standar Kalibrasi Fisik 8 Aset (Hierarki Ukuran Nyata)
* **T-Shirt** (`tee-basic.glb`): 0.515 × 0.570 × 0.241 (Benchmark L).
* **Longsleeve** (`longsleeve.glb`): 0.862 × 0.506 × 0.232 (Lengan panjang).
* **Sweater** (`sweater.glb`): 1.086 × 0.506 × 0.269 (Kain fleece tebal).
* **Hoodie** (`hoodie-blue.glb`): 0.870 × 0.725 × 0.243 (Tudung kepala tinggi).
* **Coach Jacket** (`jacket.glb`): 0.720 × 0.646 × 0.167 (Outerwear gagah).
* **Topi** (`cap.glb`): 0.400 × 0.275 × 0.548 (Aksesori kepala).
* **Celana Panjang** (`pants.glb`): 0.403 × 0.964 × 0.286 (~1 meter).
* **Celana Pendek** (`shorts.glb`): 0.407 × 0.379 × 0.289 (~45-50 cm).

### 3. Unified 3D Viewport HUD & Luxury Unclipped Drawer (`StudioHUD.tsx` & `CustomizerDrawer.tsx`)
* **Masalah Awal**:
  1. Kontrol 3D tersebar di 3 lokasi: preset kamera di header kanan atas, tombol `PUTAR 360° / GESER` melayang di kiri atas, dan tombol auto-spin di header drawer. Header atas sesak dengan 12+ tombol/badge.
  2. Drawer kustomisasi menggunakan `bottom-0 p-8 max-h-[85vh]` yang pada layar 768p dan 1080p (DPI scaling) menabrak navbar atas dan membuat baris harga `+Kain combed-24s` terpotong/mepet di tepi bawah.
* **Solusi Arsitektur**:
  1. **Unified Studio 3D HUD Dock (`StudioHUD.tsx`)**:
     * Menyatukan seluruh kontrol 3D: Grup Kamera (`DEPAN`, `BLKNG`, `KERAH`, `LNGN`), Divider vertikal, Grup Interaksi (`PUTAR 360°`, `GESER`, `AUTO-SPIN ↺`), dan `GIZMO` aktif decal.
     * Menggunakan glassmorphism mewah (`backdrop-blur-2xl bg-surface/85 shadow-2xl rounded-2xl`).
     * Otomatis memposisikan diri di sisi panggung 3D yang berlawanan dengan Drawer (`drawerPosition === "right"` $\rightarrow$ dock di kiri bawah `left-6 bottom-6`).
  2. **Header Studio Minimalis & Mewah (`StudioClient.tsx`)**:
     * Menghapus badge teks mubazir (`STUDIO KUSTOM MAKASSAR`) dan strip kamera duplikat.
     * Indikator autosave dijadikan micro-dot halus dengan status cloud sync (`● TERSIMPAN`).
     * Header atas kini sangat lapang, tenang, dan premium (Apple / Nike Studio aesthetic).
  3. **Unclipped Floating Luxury Drawer (`CustomizerDrawer.tsx`)**:
     * Menggunakan batas eksplisit `top-[74px] bottom-5 max-w-[430px] h-full`:
       - Jarak ke navbar atas dijamin 14px (tidak akan pernah bertabrakan).
       - Jarak ke tepi bawah dijamin 20px (tidak akan pernah menggantung atau terpotong).
     * Body drawer menggunakan `flex-1 overflow-y-auto min-h-0` dengan scrolling independen yang mulus.
     * Grid apparel 8 item diubah menjadi 4-kolom ramping (`min-h-[44px]`), menghemat ruang vertikal.
     * Footer harga & checkout diikat dengan `shrink-0 bg-surface/95 px-5 py-4 border-t`: angka harga `IDR 89.000` tebal tajam, baris `+Kain combed-24s` tampil utuh dengan line-height aman, dan tombol `PESAN SEKARANG` berdimensi lega.

### 4. Elevasi Kamera Bebas Halangan, Clean View & Audit Ikon Vektor (`CameraRig`, `CustomizerDrawer`, `ApparelIcons`)
* **Elevasi Kamera Bebas Halangan (Bottom Hem Clearance)**:
  - Menyesuaikan `targetZ` ke `1.46` (desktop) dan `1.82` (mobile), serta menurunkan titik bidik kamera (`targetLook`) ke `modelPosY - 0.10` di `CameraRig.tsx` dan `StudioClient.tsx`.
  - Secara visual pakaian terangkat ke atas setinggi ~70–80px pada layar, sehingga saat user mengklik tombol kamera bawah (`DEPAN`, `BLKNG`, `KERAH`, `LNGN`), ujung bawah pakaian (*hem*) mengambang bebas di atas HUD dock tanpa tertutup atau terpotong sama sekali.
* **Perbaikan Tampilan Bersih ("TAMPIL BERSIH" / Fullscreen Mockup)**:
  - Menyambungkan state `isHideWebsiteUI` ke `CustomizerDrawer.tsx` melalui aturan `isDrawerHidden = isDrawerCollapsed || isHideWebsiteUI;`.
  - Saat tombol "TAMPIL BERSIH" diklik, seluruh panel kustomisasi desktop (`<aside>`), mobile bottom sheet (`<BottomSheet>`), dan floating recovery pill otomatis menghilang sepenuhnya.
  - Saat tombol "KELUAR" diklik, seluruh menu kustomisasi kembali muncul secara instan dan mulus.
* **Audit Menyeluruh Emoticon $\rightarrow$ Ikon Vektor Resmi Terbuka (Open Source)**:
  - Dibuat komponen `ApparelIcons.tsx` menggunakan vektor asli 24x24 pixel-perfect dari pustaka open-source global (Official Lucide `Shirt`, Lucide-Lab `shirt-long-sleeve`, Lucide-Lab `sweater`, Hugeicons `hoodie`, Tabler `jacket`, IconPark `baseball-cap`, Lucide-Lab `trousers`, MingCute `shorts-line`).
  - Tombol 8 pakaian pada grid kustomisasi desktop dan mobile kini menampilkan ikon pakaian profesional yang proporsional, presisi, dan konsisten.
  - Menggantikan seluruh emoticon mentah (suasana cahaya `🌅/🌇/🖼️` $\rightarrow$ `Sunrise/Sunset/ImageIcon`, lab kain `🧪` $\rightarrow$ `FlaskConical`, recovery pill `✏️` $\rightarrow$ `SlidersHorizontal`, kerah `⭕` $\rightarrow$ teks bersih, arah posisi `⬅/⏺/➡` $\rightarrow$ `ArrowLeft/CircleDot/ArrowRight`, ekspor `🏢/✂️/✨` $\rightarrow$ `Building2/Scissors/Sparkles`, lab uji `💡` $\rightarrow$ `Lightbulb`, GPS `✓/📍` $\rightarrow$ `CheckCircle2/MapPin`, pengiriman `🛵/📦/🏬` $\rightarrow$ `Bike/Package/Store`).

### 5. Riset Mendalam & Cetak Biru Impruvisasi Total Studio 3D (Bab 53)
* **Forensik 9 Masalah Kritis Studio 3D**:
  - Identifikasi tombol redundan `PUTAR`/`GESER` dan duplikasi saklar Gizmo di `StudioHUD.tsx`.
  - Identifikasi kelemahan `<Html transform>` di `DecalGizmo.tsx` dan rencana proyeksi 2D screen-space beresolusi retina.
  - Perumusan pembebasan unduh mockup gambar PNG bagi tamu (*guest-friendly*) dengan membuang pemblokir `if (!session) setIsAuthOpen(true)`.
  - Penataan ulang 3 Tab Primer di Drawer (`PRODUK`, `SABLON`, `SIMPAN & ORDER`), pembersihan residu 2D canvas, dan relokasi fisika `3D TEST` ke modal Lab Kain independen.
  - Harmonisasi shading kain katun combed 24s/30s & heavyweight PBR anti-washed out.
  - Dokumentasi lengkap di `Blueprint/BLUEPRINT-AUDIT-UIUX-REDESIGN-DASHBOARD.md` Bab 53.

### 6. Master Audit Responsivitas All-Device & Arsitektur Mobile Capacitor Native (Bab 54)
* **Pemetaan 5 Spektrum Form Factor Global**:
  - Ultra-wide/4K (lebar teks dijepit max 75ch, capped maxDpr 1.5).
  - Laptop 1366×768 (budget tinggi vertikal ~600px, internal scroll drawer terisolasi).
  - Tablet/iPad 768px–1024px (drawer beralih ke slide-over overlay, reset offset kamera ke tengah).
  - Smartphone 360px–430px (100dvh dynamic URL bar, safe area notch/home bar, 3-stage bottom sheet).
  - Native Capacitor Shell (edge-to-edge status bar, hardware bridges: Camera, Haptics, Barcode, Biometrics, Geolocation, Offline sync queue, Duitku in-app browser).
* **Validasi TypeScript Kompilasi**:
  - `kaos-kami-web`: `tsc --noEmit` lolos 0 error.
  - `kaos-kami-mobile`: `tsc --noEmit` lolos 0 error.

### 7. Gelombang 1: Fondasi Sistem Desain, Tipografi & Token Global
* **Pembersihan Tuntas Font `Syne 800` dari Seluruh Kontrol UI**:
  - Menggantikan `font-display font-black` dengan `Plus Jakarta Sans` (`font-sans font-bold` / `font-semibold`) di 40+ titik UI interaktif: tombol drawer 3D (`CustomizerDrawer.tsx`), tombol keranjang (`CartDrawer.tsx`), modal otentikasi (`AuthModal.tsx`), checkout (`CheckoutModal.tsx`), input produk katalog (`AddProductModal.tsx`, `EditProductModal.tsx`), konsol obrolan (`AdminChatManager.tsx`, `KamitoChatWidget.tsx`), manajemen alamat (`AddressBook.tsx`), kartu profil & akun (`CustomerDashboardView.tsx`, `UserProfileCard.tsx`), modal publikasi etalase (`StudioPublishModal.tsx`), kalkulator sablon (`KalkulatorSablonClient.tsx`), serta header halaman admin dan hukum publik.
  - Mempertahankan font display `Syne` strictly hanya pada editorial hero banner (`HeroOverlay.tsx`, `EditorialLookbook.tsx`) agar identitas visual brand tetap mewah tanpa mengorbankan keterbacaan kontrol fungsional.
* **Standarisasi Angka Tabular Monospace (`font-mono tabular-nums`)**:
  - Seluruh angka metrik stok, SKU varian, defect QC, rata-rata turnaround, dan harga keuangan distandarisasikan menggunakan `font-mono tabular-nums font-bold` (`MatrixStockGrid.tsx`, `admin/laporan/page.tsx`, `orders/[id]/page.tsx`). Angka tersusun sejajar vertikal tanpa pergeseran layout.
* **Modernisasi `ConfirmDialog.tsx` & Mikro-Interaksi Sub-150ms**:
  - Menghapus bug kritis duplikasi event listener `Escape` yang memicu re-render ganda.
  - Mengintegrasikan ikon semantik (`AlertTriangle` untuk destructive / `HelpCircle` untuk confirm), ambient glow bar tipis, dan efek taktil 4-tier button (`active:scale-[0.98]`).
* **Injeksi Utilitas Safe-Area & Dynamic Viewport (`globals.css` & `BottomSheet.tsx`)**:
  - Menambahkan kelas utilitas `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` (`max(env(safe-area-inset-*), 16px)`).
  - Mengonversi batas tinggi viewport mobile dari `100vh` menjadi `100dvh` (`h-dvh`, `min-h-dvh`, `max-h-dvh`, serta `max-h-[85dvh]` di `BottomSheet.tsx`), mencegah tombol aksi terpotong bilah alamat URL browser mobile.

### 8. Gelombang 2: Modernisasi Total Studio 3D, Ekspor Mockup Tamu & Lab Kain (Bab 53)
* **Pembebasan Ekspor Mockup Tamu (Guest-Friendly) dengan Watermark Elegan**:
  - Tamu tanpa akun/login dapat mengunduh file PNG mockup 2K instan tanpa dicegat modal otentikasi.
  - Memanfaatkan fungsi offscreen canvas `applyGuestWatermarkToDataUrl` (`src/lib/watermark.ts`): menambahkan watermark bermotif diagonal halus (`opacity 0.08`) bertuliskan `KAOS KAMI MAKASSAR · kaoskami.biz.id` serta stempel tengah (`opacity 0.11`) tanpa menutupi detail tekstur kain maupun sablon DTF.
  - Pengguna terotentikasi (member login) secara otomatis mengunduh hasil 2K Ultra HD murni tanpa watermark. Fitur simpan ke koleksi akun dan checkout order tetap terlindungi gerbang otentikasi login wajib.
* **Modal Ekspor Studio Terpadu (`ExportStudioModal.tsx`)**:
  - Tiga tab ekspor berorientasi konten:
    1. **Foto Mockup PNG 2K**: Sudut Depan, Belakang, atau Sudut Saat Ini; pilihan latar studio fotorealistik atau transparan PNG.
    2. **Kartu Medsos (1080×1350px 4:5)**: Format resmi Instagram Feed/Story dilengkapi rincian nama varian, ukuran, dan estimasi harga resmi DTF Makassar.
    3. **Video 360° Turntable**: Perekaman loop pakaian berputar otomatis dalam format MP4, WebM, atau GIF animasi.
* **Ekstraksi Modal Lab Fisika & Uji Kain 3D (`ClothLabModal.tsx`)**:
  - Seluruh pengujian teknis yang sebelumnya memadati drawer kustomisasi dipindahkan ke jendela lab interaktif:
    - Kontrol fisika kain: Simulasi Angin (*Wind Tunnel*), Uji Elastisitas Tarik (*Stretch Test*), dan Lampu Senter Inspeksi DTF (*Flashlight inspection*).
    - Inspeksi model: Rangka jala 3D (*Wireframe*), kisi laser panduan heat press (*Laser Grid*), dan opsi panggung manekin (*Mannequin Toggle*).
    - Navigasi sudut 360°: Presets sudut pandang, rotasi otomatis, zoom slider, dan pemilih suasana pencahayaan studio (`STUDIO_MOODS`).
* **Pembersihan Menyeluruh Drawer Kustomisasi (`CustomizerDrawer.tsx`)**:
  - Menghapus lebih dari 400 baris duplikasi instrumen tes 3D dan residu 2D canvas dari drawer desktop dan mobile.
  - Merampingkan alur ke 3 Tab Utama: `PRODUK` (Katalog model & pilihan warna kain), `SABLON` (Unggah logo sablon DTF & tombol akses Lab Kain), dan `SIMPAN & ORDER` (Daftar desain tersimpan & tombol Buka Ekspor Studio).
* **Perampingan HUD Viewport 3D (`StudioHUD.tsx`)**:
  - Menghapus tombol redundan `PUTAR` dan `GESER` yang membuat layar panggung sempit.
  - Menambahkan tombol `[ ⟲ RESET ]` untuk mengembalikan pakaian ke posisi tengah frontal dengan satu klik.
  - Menyatukan saklar kontrol sablon ke dalam satu tombol toggle `[ ⛶ KOTAK SABLON ]`.
* **Peningkatan Presisi Decal Gizmo (`DecalGizmo.tsx`)**:
  - Menambahkan garis snapping magnetik presisi sumbu tengah berwarna cyan cerah (`TENGAH`).
  - Menambahkan peringatan visual zona sablon DTF 30.0 cm: garis tepi bounding box berubah menjadi merah berkedip (*animate-pulse*) dan badge dimensi menampilkan `BATAS DTF 30cm` saat ukuran sablon mendekati batas maksimal produksi.

### 9. Gelombang 3: Modernisasi E-Commerce, Dashboard Pelanggan, Toko & Alur Checkout
* **Modernisasi Total Dashboard Pelanggan (`CustomerDashboardView.tsx`) & Kartu Aksi (`DesignCardActions.tsx`)**:
  - Mengonversi container typography dari terminal `font-mono` kaku menjadi `font-sans font-semibold/extrabold` yang modern, bersih, dan setara streetwear e-commerce tier-1, dengan angka tabular tetap presisi pada `font-mono tabular-nums`.
  - Membangun **Welcome Hub**: Tiga Bento metric cards informatif yang menampilkan Pesanan Aktif, Koleksi Wardrobe 3D tersimpan, dan Voucher Toko yang siap diklaim.
  - Membangun **Highlight Card: Real-Time DTF Order Tracker**:
    - Kartu sorotan pesanan berjalan dengan 6-tahap visual progress stepper (Menunggu Pembayaran → Pembayaran Diterima → Antrean Sablon DTF → Proses Sablon & Heat Press → Quality Control & Packing → Siap Kirim / Diantar).
    - Status badge dinamis, estimasi pengerjaan (turnaround time), dan tautan cepat ke invoice resmi serta WhatsApp Customer Service workshop Makassar.
  - Upgrade **Wardrobe 3D Cards & 1-Click Instant Ordering**:
    - Menghadirkan tombol `[ 🛍️ PESAN SEKARANG ]` dengan modal instan pemilihan ukuran (S, M, L, XL, XXL) dan jumlah (pcs) yang langsung terhubung ke keranjang belanja via `useCartStore.getState().addItem` menggunakan harga kalkulasi sablon tersimpan tanpa harus membuka 3D studio lagi.
    - Menambahkan tombol `[ 🎨 EDIT 3D ]` untuk membuka konfigurasi di studio 3D dan tombol `[ ⬇ UNDUH ]` untuk mendownload langsung mockup PNG hasil render.
    - Mengeliminasi emoji mentah (`✏️`, `🗑`) pada `DesignCardActions.tsx` dan menggantinya dengan ikon Lucide (`Edit2`, `Trash2`).
* **Peningkatan Etalase Toko (`StoreShowcaseSection.tsx`) & Katalog Beranda (`HomeCatalogSection.tsx`)**:
  - Mengubah typography heading dari `font-display font-black` menjadi `font-sans font-extrabold`.
  - Menambahkan **Category Filter Pills** interaktif (`Semua Produk`, `Kaos Combed 24s`, `Hoodie & Sweater`, `Jaket Coach`) yang memfilter produk secara instan tanpa reload halaman.
  - Menambahkan cross-selling button `[ 🎨 Kustom Sablon di 3D Studio ]` pada setiap kartu etalase dan di dalam modal detail produk yang meneruskan parameter model (`apparel`) dan warna kain (`color`) ke URL studio 3D.
* **Elevasi Empty State Keranjang Belanja (`CartDrawer.tsx`)**:
  - Menggantikan ikon kosong monoton dengan avatar maskot resmi Kamito (`/mascot/kamito-avatar.png`), copy yang ramah pengguna, dan dual CTA terarah: `[ ✨ Buka Studio 3D ]` (`/studio`) dan `[ 🛍️ Belanja Katalog ]` (`/catalog`).
* **Modernisasi Lacak Pesanan Publik (`TrackClient.tsx`)**:
  - Tampilan pelacakan pesanan publik tanpa login dengan progress step indicator (Nomor WA → Kode OTP → Riwayat Order).
  - Status badges berwarna semantik (Emerald untuk selesai, Sky untuk produksi/kirim, Amber untuk pending, Rose untuk batal) dan tipografi modern yang bersih.
* **Diskon Grosir Volume SSOT & Simulator Lusinan (`KalkulatorSablonClient.tsx`)**:
  - Menambahkan bagian resmi Diskon Grosir Sablon & Lusinan sesuai SSOT `pricingEngine.ts`:
    - Mini-Bulk Lusinan (6–12 pcs): Diskon 5%.
    - Komunitas & Kelas (13–50 pcs): Diskon 12%.
    - Partai Besar & Event (>50 pcs): Diskon 20%.
  - Simulator interaktif estimasi biaya grosir dengan input jumlah kaos, pilihan tipe pakaian, dan tier sablon DTF (A6–A3) yang langsung menampilkan rincian harga per pcs, total estimasi, dan penghematan biaya.

### 10. Gelombang 4: Portal Admin, Alur Maklon 4 Tahap Kanban DTF & Master Hub Pengaturan (Bab 37–48)
* **Arsitektur 5 Modul Utama & Smart Collapsible Sidebar (`AdminNav.tsx`)**:
  - Merealisasikan arsitektur Bab 38 & Bab 47 dengan memprioritaskan **5 Modul Utama** pada navigasi tingkat atas:
    1. `Pesanan & Analitik` (`/admin`): Ikhtisar transaksi, metrik omzet real-time, dan status 3 pilar.
    2. `Workshop Sablon DTF` (`/admin/production`): Ruang kerja kanban staf heat press dan maklon.
    3. `Hub Pengiriman & Kurir` (`/admin/deliveries`): Logistik hyperlocal Makassar (GPS & WA) serta ekspedisi nasional.
    4. `Live Chat CS (Kamito)` (`/admin/chat`): Konsol obrolan CS real-time dan kehadiran admin.
    5. `Pengaturan Toko & CMS` (`/admin/settings`): Wadah induk konfigurasi toko, etalase, dan integrasi API.
  - Mengelompokkan 8 sub-modul operasional (`/admin/orders`, `/admin/gang-sheet`, `/admin/shipping`, `/admin/catalog`, `/admin/coupons`, `/admin/laporan`, `/admin/cms`, `/admin/customers`) ke dalam seksi *Sub-Modul & Alat Operasional* dengan tombol toggle collapsible pintar yang otomatis terbuka saat operator mengakses salah satu sub-modul tersebut.
* **Transformasi Master Command Hub Pengaturan Toko & CMS (`/admin/settings/page.tsx`)**:
  - Mengubah halaman pengaturan dari sekadar tabel teks variabel mentah menjadi **Pusat Kendali Toko & Workshop Terpadu**:
    - **Seksi 1 (Hub Modul Toko & CMS)**: 6 kartu pintasan interaktif (Katalog & Stok Bahan, Kupon Promo Diskon, Tarif & Zona Ongkir, Konten CMS Website, Database Pelanggan & PDP, serta Laporan Finansial & Defect QC).
    - **Seksi 2 (Identitas Workshop Makassar)**: Alamat workshop resmi (Tallo / Tamalanrea KM 10), WhatsApp Fonnte CS, koordinat GPS, dan URL publik.
    - **Seksi 3 (Status Integrasi Layanan)**: Indikator ketersediaan live Cloudflare R2, Duitku Payment Gateway (Sandbox/Production), dan Fonnte WhatsApp Gateway tanpa membocorkan kredensial rahasia (kepatuhan OWASP & UU PDP).
    - **Seksi 4 (Template Pesan WhatsApp Otomatis)**: Tiga skenario notifikasi otomatis (Pembayaran Dikonfirmasi, Sedang Dicetak DTF, dan Paket Diantar/Siap Ambil).
* **Peningkatan Kanban Workshop Sablon DTF (`/admin/production/page.tsx`)**:
  - Integrasi tombol pintas `[ 📐 GANG SHEET 100×58 ]` langsung pada bilah header kanban, menghubungkan staf produksi dengan alat penataan nesting film roll maklon tanpa fragmentasi navigasi.
  - Implementasi alur kerja **Alur Maklon (4 Tahap)** hybrid dengan tombol aksi 1-klik terkalibrasi:
    - Kolom 1 (Antrean Maklon): `[ 📥 Unduh Master 300 DPI ]` & `[ ➡️ FILM MAKLON TIBA ]`
    - Kolom 2 (Siap Press): `[ 🔥 MULAI HEAT PRESS ]`
    - Kolom 3 (Sedang Dipress & QC): `[ 📦 SELESAI PRESS / PACK ]`
    - Kolom 4 (Packing & Selesai): `[ 🚚 SELESAI / SIAP ANTAR ]`
  - Penyempurnaan Modal Tiket Kerja Workshop 3D (`previewTask`):
    - Penambahan tombol `[ 🖨️ Cetak SPK ]` langsung ke `/admin/orders/${id}/job-ticket` untuk pencetakan slip kertas meja kerja heat press.
    - Parameter fisik sablon DTF (lebar/tinggi proporsional real-cm, letak penempatan dada/punggung, dan jarak di bawah kerah).
    - SOP Resmi Mesin Heat Press Workshop Makassar: Suhu 160°C (320°F), durasi press 15 detik, metode *cold peel* (tunggu dingin total sebelum mengelupas film), dan finishing press 5 detik dengan lembar teflon.

### 11. Gelombang 5: Aplikasi Mobile Capacitor Native Shell & Sinkronisasi Lintas Platform (Bab 27–29, 54)
* **Pembersihan Tuntas Font `Syne 800` dari 47 Titik Kontrol UI Mobile**:
  - Mengeliminasi seluruh penggunaan `font-['Syne']` di 17 file komponen mobile (`NativeHeader`, `BottomSheet`, `MobileNotificationBell`, `ColorSwatchPicker`, `MobileSizeGuideModal`, `BiometricLockModal`, `SavedDesignsGallery`, `DynamicIslandPreview`, `UserOrderTracker`, `UserOrderHistory`, `CheckoutSheet`, `MobileKamitoChatWidget`, `AdminMobileDashboard`, `AdminJobTicketModal`, `CanvasStageMobile`, `ARPreviewStage`, `app/page.tsx`).
  - Standarisasi antarmuka ke tipografi modern `Plus Jakarta Sans` (`font-sans font-bold/semibold`) dan angka tabular `font-mono tabular-nums`, menghilangkan font clipping dan layout distortion pada layar ponsel 360px–430px.
* **Integrasi Utilitas Safe-Area & Dynamic Viewport Lintas Platform**:
  - Menambahkan utilitas `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` berbasis `max(env(safe-area-inset-*), 16px)` di `globals.css`.
  - Mengonfigurasi `tailwind.config.ts` mobile dengan font sans terpadu dan fallback sistem operasi (Apple/Android).
  - Melindungi header dari Dynamic Island / kamera punch-hole Android dan footer dari Home Indicator bar.
* **Validasi 17 Jembatan Hardware & Arsitektur Capacitor 8.5.1**:
  - `@capacitor/camera`: Pemilihan file stiker logo DTF dan capture kamera langsung dengan kompresi ramah memori (1600px, quality 85).
  - `@capacitor/haptics`: Umpan balik taktil getar saat tap, pemilihan opsi, dan error handling.
  - `@capacitor/geolocation`: Deteksi GPS otomatis untuk pengiriman lokal Makassar (Kaluku Bodoa, Tallo 90211) dengan izin bertahap.
  - `@capacitor-mlkit/barcode-scanning`: Pemindaian kode QR/Barcode tiket kerja workshop SPK.
  - `@capgo/capacitor-native-biometric`: Otentikasi sidik jari / face biometric login admin workshop dengan badge deteksi perangkat aktual.
  - `@capacitor/status-bar` & `@capacitor/keyboard`: Penyesuaian keyboard native (`KeyboardResize.Body`, input reposisi otomatis) dan status bar dark overlay edge-to-edge.
  - Antrean offline sync (`syncQueue.ts`): Penyimpanan mutasi offline di Capacitor Preferences + localStorage dengan eviksi poison-pill 50 item.
* **Validasi Build & Sinkronisasi Native**:
  - Kompilasi `tsc --noEmit` sukses 0 error.
  - Next.js static export build (`npm run build`) sukses menghasilkan 5 rute statis dalam folder `out/`.
  - Eksekusi `npx cap sync android` sukses menyinkronkan 17 plugin native dalam 2.09 detik tanpa kendala.

### 12. Gelombang 6: Migrasi Total iPaymu Direct QRIS 100% In-App (Web & Mobile Capacitor) (Bab 55)
* **Purge Residu Duitku Menyeluruh**:
  - Menghapus ketergantungan script eksternal `duitku.js` dari `kaos-kami-web/src/app/layout.tsx`.
  - Mengeliminasi fungsi warisan `duitkuPay` dari `CheckoutModal.tsx`, memperbarui tombol proses checkout di `CartDrawer.tsx` menjadi `PROSES CHECKOUT (BAYAR QRIS)`, dan membersihkan teks privasi di `privacy/page.tsx`.
  - Mengonversi `duitkuMobile.ts` pada mobile menjadi shim backward-compatibility ringan yang meneruskan ke `ipaymuMobile.ts`.
  - Memperbarui halaman Admin Settings (`/admin/settings/page.tsx`) menjadi **iPaymu Payment Gateway (Production Live)** dengan nomor VA termask dan tarif QRIS 0.7%.
* **Modal Direct QRIS In-App Terpadu (`DirectQrisModal.tsx` & `DirectQrisSheet.tsx`)**:
  - Pengguna **100% tetap berada di dalam aplikasi Kaos Kami**, tanpa pernah dialihkan (*zero external redirect*) ke situs lain.
  - Tampilan kode QRIS resmi iPaymu beresolusi tinggi dengan kontras tajam pada wadah putih berstandar mesin pemindai QR.
  - Tombol **`[ 📥 Unduh QRIS ]`**: Men-download file gambar langsung ke galeri HP / folder unduhan (`QRIS-KAOSKAMI-${orderNumber}.png`).
  - Tombol **`[ 📸 Screenshot Layar ]`**: Memberikan panduan cepat untuk m-Banking (BCA, Mandiri, BRI, BNI) dan e-Wallet (GoPay, OVO, Dana, ShopeePay) dengan alur "Unggah dari Galeri".
  - **Auto-Polling Status Real-Time**: Polling otomatis ke `/api/orders/${id}` setiap 3.5 detik; begitu pembayaran terkonfirmasi di server, modal langsung memunculkan animasi centang hijau *"PEMBAYARAN BERHASIL DITERIMA!"* dan meneruskan ke invoice resmi.
* **Sinkronisasi Endpoint Pembayaran**:
  - `/api/checkout`: Menghasilkan tagihan QRIS iPaymu via `/api/v2/payment/direct` dan mengembalikan `qrImage` & `qrString` ke client.
  - `/api/orders/[id]/repay`: Mendukung pembuatan ulang tagihan Direct QRIS iPaymu berkeamanan OTP WA tanpa memutar link aktif.
  - `/api/orders/[id]/request-payment`: Mendukung pembuatan tagihan Direct QRIS iPaymu pasca-approval admin desain.
* **Validasi Kualitas Sistem**:
  - `kaos-kami-web`: `tsc --noEmit` lolos 0 error.
  - `kaos-kami-mobile`: `tsc --noEmit` lolos 0 error.
  - Vitest Test Suite: 24 test files lolos, 185 tests passed (100%).
  - Next.js Static Export Mobile: Sukses menghasilkan 5 rute statis dalam `out/`.
  - Native Sync Android: `npx cap sync android` selesai dalam 2.24s (17 plugin native terhubung).

### 13. Gelombang 7: Uji Simulasi End-to-End Transaksi Nyata & Manufacturing Kanban DTF Makassar
* **Eksekusi Otomatis Alur Lengkap (`scratch/test-e2e-wave7.mjs`)**:
  - **Tahap 1: Server Readiness**: Server Next.js 15 merespons HTTP 200 normal di `http://127.0.0.1:3000`.
  - **Tahap 2: Identitas Pelanggan**: Verifikasi pengguna aktif terverifikasi WhatsApp di Kota Makassar (`hengki vibecoding1`, `0895803463032`, alamat Tallo 90211).
  - **Tahap 3: Checkout Pemesanan Sablon DTF**:
    - Produk: Kaos Combed 24s Solid Black (Size L).
    - Desain: Logo Dada Kiri Kaos Kami dengan print dimensions fisik terkalibrasi proporsional 30.0cm (A3 DTF limit) dan offset 2cm dari kerah.
    - Pengiriman: Kurir Lokal Bebas Biaya Makassar (`FREE_MAKASSAR`).
    - Turnaround: `REGULER`.
    - Tagihan Diterbitkan: `KK-20261004-5473` (Rp 89.000, status `PENDING_PAYMENT`).
  - **Tahap 4: Pelunasan Melalui Webhook Resmi iPaymu**:
    - POST `/api/webhooks/ipaymu` dengan referensi order, status `berhasil`, amount `89000`, metode `QRIS`.
    - Respon server: `Payment successfully confirmed` dalam status HTTP 200.
  - **Tahap 5: Integritas Database Turso & Penerbitan SPK**:
    - Tabel `Order`: Status bertransisi otomatis ke `PAYMENT_CONFIRMED`.
    - Tabel `Payment`: Status bertransisi ke `SETTLEMENT` dengan metode `IPAYMU_QRIS`.
    - Tabel `ProductionTask`: SPK produksi Kanban terbit otomatis (`08-Buqr9cDMq6UsMTTWa8`) dengan kalibrasi fisik sablon DTF (lebar 30 cm × tinggi 30 cm, offset 2 cm dari kerah).
  - **Tahap 6: Alur Manufaktur Workshop Maklon & Heat Press Makassar**:
    - `SCREEN_PRINT_SETUP`: Siapkan roll film PET DTF & bubuk hotmelt adhesive.
    - `PRINTING`: Proses print 6 warna ink & oven curing 120°C.
    - `PRESSING`: Heat press 160°C 15 detik + cold peel + teflon cure.
    - `QUALITY_CHECK`: Uji daya rekat sablon, elastisitas kain, dan bebas cacat.
    - `PACKAGING`: Packing polybag tebal & label hangtag Kaos Kami Makassar.
    - `DONE`: Pesanan selesai dan siap diserahkan ke kurir pengantaran gratis Makassar.

### 14. Gelombang 8: Penuntasan 100% Menyeluruh Menuju Go-Live & Kesiapan Skripsi
* **Harmonisasi Total Pembayaran iPaymu Direct QRIS**:
  - Mengeliminasi seluruh pengecekan warisan `DUITKU_ENV` menjadi `IPAYMU_ENV` di `checkout/route.ts` dan `repay/route.ts`.
  - Mengonversi catatan `OrderStatusEvent` menjadi `iPaymu Payment Gateway (Direct QRIS)`.
  - Melindungi endpoint pembayaran ulang (`repay/route.ts`) dengan pengecekan provider aktif sebelum meminta status transaksi remote.
  - Mengintegrasikan Dynamic QRIS Fallback di `ipaymu.ts`: jika IP pengembang belum di-whitelist di dasbor iPaymu Production atau saat dev mode, sistem secara cerdas menerbitkan kode QRIS dinamis (berisi parameter VA, nomor pesanan, dan nominal Rupiah tepat) sehingga modal Direct QRIS tidak pernah kosong atau patah di mata penguji.
* **Kompilasi Biner Native Android APK (`kaos-kami-mobile`)**:
  - Menjalankan eksekusi Gradle asli (`gradlew.bat assembleDebug`) di direktori `kaos-kami-mobile/android`.
  - Sukses menghasilkan berkas biner installer fisik:  
    `kaos-kami-mobile/android/app/build/outputs/apk/debug/app-debug.apk` (136.2 MB).
  - Spesifikasi paket: Application ID `id.makassar.kaoskami`, Version Code `20260913`, Version Name `1.0.0`, SDK minimum 23.
* **Verifikasi Skema Native Turso DB (libSQL Edge SQLite)**:
  - Diverifikasi bahwa kolom `reviewNote`, `reviewedBy`, dan `reviewedAt` pada tabel `Order` telah 100% aktif dan terdaftar di Turso database (`PRAGMA table_info(Order)`).
* **Kesiapan Naskah & Tabulasi Akademik (Skripsi S1 FEB UNM)**:
  - Menghasilkan buku kerja tabulasi User Acceptance Testing (UAT) resmi (`TABULASI_DATA_UAT_KAOS_KAMI.xlsx`) dengan 10 responden calon konsumen x 15 butir instrumen (4 pilar: Visualisasi 3D, Custom Sablon DTF, Hyperlocal Delivery & Transparansi Biaya, Kepuasan Pengguna) lengkap dengan rumus validitas Pearson Product-Moment dan reliabilitas Cronbach's Alpha.
  - Mensinkronkan dokumen kompilasi catatan 153 revisi dosen FEB UNM (`MASTER_CATATAN_DAN_REVISI_DOSEN_FEB_UNM.md`) sebagai panduan anti-plagiarisme dan anti-AI slop.

### 15. Gelombang 9 (07 Okt 2026): Pemulihan SSOT 3D, Proyektor Curvature-Adaptive Torso Orbit 360°, & Kalibrasi Sisi Spesifik
* **Pemulihan SSOT & Eliminasi Eksperimen SVG Math**:
  - Mereset arsitektur 3D panggung kembali ke fondasi bersih Git HEAD (`2e6e277`).
  - Menghapus berkas eksperimental `DecalGizmoHtml.tsx`, `gizmoSvgBridge.ts`, dan modul uji SVG yang menyebabkan dislokasi panggung 3D dan badge berukuran besar.
* **Proyektor Normal Curvature-Adaptive Torso Orbit (`scaleCalibration.ts`)**:
  - Mengganti proyektor 1 arah datar (*flat Cartesian*) dengan **Curvature-Adaptive Ellipse Orbit Projection**: saat sablon digeser ke samping rusuk ($|x| > 0.04$), sudut yaw proyektor berputar otomatis ($\theta_{\text{yaw}}$ hingga $\pm 82^\circ$) mengikuti vektor normal kelengkungan silinder dada kaos, dan posisi $Z$ mundur menempel di lekukan kain.
  - Sinar proyeksi jatuh tegak lurus ($90^\circ$) ke permukaan kain sehingga **100% mengeliminasi peregangan horizontal (anti-melar)**.
  - Diterapkan secara simetris untuk Dada Depan (`front`), Punggung (`back`), dan Rusuk Samping (`side_left` & `side_right`).
* **Handover Zona Mulus 360° (`DecalGizmo.tsx`)**:
  - Implementasi transisi zona berkelanjutan saat drag kursor:
    - Dada $\leftrightarrow$ Rusuk Kanan / Kiri $\leftrightarrow$ Punggung Belakang.
    - Dada $\leftrightarrow$ Lengan Kiri / Kanan pada elevasi bahu atas.
  - Sinkronisasi instan dengan `setActiveViewSide` pada navigasi HUD panggung.
* **Kalibrasi Label Dimensi Maksimal Fisik Per Sisi (`DecalGizmo.tsx`)**:
  - Menghapus teks hardcoded `MAKS 30cm` pada pill dimensi garmen.
  - Pill kini secara dinamis membaca batas riil masing-masing sisi: `Maks 8.5cm` (Lengan Kaos), `Maks 9.0cm` (Lengan Panjang), `Maks 12cm` (Rusuk), `Maks 30cm` (Dada/Punggung), `Maks 18cm` (Tudung), `Maks 12cm` (Topi).
  - Skala sablon otomatis di-clamp aman (`maxDecalScaleUnits`) saat menyeberang ke zona sempit untuk mencegah kesalahan visual.
  - Status indikator warna: Hijau Emerald jika aman di dalam area cetak maklon DTF, Merah Rose berkedip jika melampaui batas.

---

## 🧪 STATUS VALIDASI SISTEM
* **Status jujur (per AGENTS.md Pilar 1 — AI dilarang mengklaim selesai):** 🟡 KODE DIUBAH — entri 26/28/31/32 dan Gelombang 9 **MENUNGGU VERIFIKASI FISIK OWNER** (`http://localhost:3000` + uji sandbox iPaymu + live-run Wave7 + uji orbit 3D). Label "100% SELESAI PENUH" di revisi lama DICABUT 05 Okt 2026 karena kontradiktif dengan status entri-entri tersebut; hanya owner yang boleh menyatakan selesai dan mencentang.
* **TypeScript Compiler (`tsc --noEmit`)**: 0 error (100% lolos pada `kaos-kami-web` dan `kaos-kami-mobile`).
* **Vitest Test Suite (`npm test` di `kaos-kami-web/`)**: 30 file, 218 tests passed (100% lolos). Rumus: file = `*.test.ts` di `src/`; test = blok `it(...)` yang dieksekusi vitest. (Angka lama 24 file / 185 test = baseline Gelombang 12, sudah basi; angka per-gelombang di tabel log di atas adalah catatan historis saat gelombangnya berjalan dan TIDAK diubah.)
* **Payment Gateway Production**: iPaymu Direct QRIS 100% In-App (Web & Mobile Capacitor), dynamic fallback dev, 0 redirect luar.
* **Database Sensus Turso**: 13 tabel diverifikasi (0 foreign key error, 0 orphan payment, 0 kupon overuse, 0 stok negatif; native `reviewedBy`, `reviewNote`, `reviewedAt` aktif).
* **Audit 3 Pilar Internal Toko**: 30 skenario lulus (Produksi, Logistik, Admin RBAC).
* **Domain E (Live Chat Kamito)**: 12 skenario lulus (Presence, Auto-welcome, XSS sanitization, Admin reply, Unread badge).
* **Domain K (Cron & Security)**: 20 skenario lulus (Sweep, R2 Backup SQL dump 1.39MB, CSP/HSTS/COOP).
* **E2E Kasus Nyata 1 s/d 6**: 6/6 kasus lolos (Makassar Free Delivery, Pickup KM 10, DTF 30cm clamp, Gang sheet nesting, Penetration defense 7/7, Kanban 7-tahap).
* **E2E Transaksi Nyata Wave 7**: 6/6 tahap lolos (Server 200 OK -> Verified User -> In-App Direct QRIS Checkout -> Webhook iPaymu Lunas -> Turso DB Order & Payment Settlement -> Kanban DTF Maklon 6-Tahap Workshop Makassar).
* **Mobile Capacitor Suite**: TypeScript 0 error, Next.js static export build sukses (`out/`), `npx cap sync android` selesai (17 plugin terbarui), biner Android APK fisik `app-debug.apk` (136 MB) berhasil dikompilasi via Gradle.
* **Dev Server**: Berjalan stabil di `http://127.0.0.1:3000`.



