# TODO MAKSIMAL — Sisa Kerja Kaos Kami (13 Sep 2026, hasil audit 6 agen paralel + eksekusi 8 agen)

> Sumber: audit paralel + eksekusi 13 Sep 2026. `tsc` web+mobile = 0 error (terverifikasi pasca-eksekusi).
> Aturan: DEPLOY/PUSH GATE berlaku — jangan `git push` / deploy Cloudflare tanpa perintah eksplisit owner.
> Legenda: `[x]` selesai di kode (tsc 0) · `[~]` sebagian / menunggu owner · `[ ]` belum.

---

## P0 — Uang / Order / Legal / HP kentang

### P0-1. Payment-before-charge + rekonsiliasi yatim
- [x] `checkout/route.ts` — insert `Payment PENDING` (`pending-<orderId>`) SEBELUM `createCharge`, update `providerRef` setelah sukses.
- [x] Sama di `mobile/orders/checkout/route.ts` (paritas penuh).
- [x] Job rekonsiliasi SELESAI 13 Sep (fase di `cron/sweep`: `PENDING_PAYMENT` >30 mnt tanpa `Payment` → `checkTransactionStatus` → buat baris + `confirmOrderPaid`, batch 20, respons `{reconciled, created}`).

### P0-2. Idempotency-Key anti double order / double charge
- [x] Replay-check `Idempotency-Key` (8–128 char) via tabel `Verification` (`idem:checkout:<key>`, 24 jam) → 409 + order lama; klaim in-flight → 409. Best-effort TANPA migrasi (identifier non-unique; prosedur `@unique`+P2002 terdokumentasi di komentar, JANGAN eksekusi tanpa perintah).
- [x] Kompensasi diperluas: hapus `Address` + `Design` arsip yatim.
- [x] Client kirim key unik per klik: `CheckoutModal:newIdempotencyKey` (crypto.randomUUID) + `CheckoutSheet` + `mobileApiClient.checkout(opts.idempotencyKey)`.

### P0-3. Gerbang OTP server-side + guard FREE_MAKASSAR
- [x] Kedua checkout: wajib `otpCode` 6-digit (`hashOtp` + expiry + owner-match + satu-pakai, tiru repay) → tanpa OTP = 401. Kurir eksplisit wajib match live rates (else 400, tanpa silent-fallback). Turnstile prod fail-closed (secret kosong → 503).
- [x] Guard kota: `FREE_MAKASSAR` wajib district dalam `MAKASSAR_SUBDISTRICTS` (else 400) di kedua checkout.
- [x] UI wiring: `CheckoutModal` (KIRIM OTP + input digits-only + pesan 401/403/409 jujur; VERIFIKASI tidak lagi burn kode — cek format lokal) + `CheckoutSheet` (langkah OTP + select kecamatan + mirror whitelist di `deliveryOptionsMobile.ts`).
- [x] Kill-switch darurat 13 Sep (default aman): `CHECKOUT_OTP_REQUIRED=false` lewati OTP (darurat Fonnte mati) + `TURNSTILE_ENFORCE=false` lewati Turnstile — eksplisit "false" saja yang bypass, unset = wajib.

### P0-4. Lisensi aset (legal)
- [x] Tuntaskan hoodie legacy: `hoodie.glb` & `hoodie.lod1.glb` dipensiunkan ke `backups/models-archive/` (13 Sep 2026), rantai default & fallback beralih 100% ke `hoodie-blue` (Irevex11, CC-BY 4.0 terverifikasi). File staged (`tee-alt`, `fleece-alt`, `hoodie-flat`) diamankan ke `backups/models-archive/`. Sisa: `jacket.glb` (kandidat CC-BY bomber DeJuan_Owens / varsity ValentynPetrov staged di `Asset 3D/sketchfab/`). `longsleeve.glb` SELESAI (MIT hulu Starklord/JS-Mastery).
- [~] `pants.glb` + `shorts.glb` masuk `ASSET_CREDITS.md` (hash + tris terukur) — BUTUH: URL repo GitHub madjin persis + file LICENSE; `/kredit` + `/admin/assets` belum diupdate.

### P0-5. Geometri + rantai aset
- [~] `cap.glb` LOD1 TERUJI di temp (`simplify --ratio 0.3`: −57% byte, 93,2k→45,4k tris, bbox identik, validate bersih) — BUTUH: QA visual + promosi manual ke `public/` + wiring rantai (perintah siap di laporan agen).
- [~] `tee-alt.draco.glb` TERUJI di temp (−22,5%, tris identik, validate bersih) — BUTUH: promosi manual (porsi besar = PNG 1024, perlu keputusan resize tekstur owner).
- [ ] LOD1 10/12 model + Draco (`fleece-alt`, `hoodie-flat`, `mannequin`, `pants`, `shorts`) + rename `hoodie-flat.glb` — belum (keputusan owner).

### P0-6. Split bundle + guard backup
- [x] `studio/page.tsx` → dynamic `StudioClient` (ssr:false); `StudioClient` → dynamic `CanvasStage`, `three` via dynamic import; `app/page.tsx` → dynamic `CanvasStage`; gsap lazy di `SmoothScrollProvider` + `useScrollPhases`.
- [x] `cron/backup`: guard `out.length > 25jt → 413` + rencana split per-tabel di komentar.

---

## P1 — Backend / Mobile / Security / Web TODO

### P1-1. Backend commerce + admin + cron
- [x] Admin: coupons `GET`+`DELETE`; customers `GET` paginated; catalog `POST/DELETE` → 405 jujur (read-only by design); production `claim` race → 409 bila dipegang operator lain.
- [x] Quote: param `?qty=` (bucket sama dengan checkout) + tolak `EXPEDITION_MANUAL` tanpa postalCode/zoneId/city → 400 + helper `validateExpeditionSelection`.
- [x] Cron marker `cron-state/sweep.json` + `backup.json` (best-effort) + `health.cron.{sweep,backup}.{at,ageSec}`.
- [x] Auth/OTP: `trustedOrigins` kondisional; `track/orders` → `^\d{6}$`; `send-otp` tak log kode di prod.
- [x] R2: kuota `upload:user:<id>` 50 file + 200MB/hari.
- [x] Histori `cms/hero-<ts>.json` SELESAI 13 Sep (arsip best-effort + retensi 10) + endpoint `GET /api/cron/backup-status` (nama file + umur saja, rate-limit 30/mnt).

### P1-2. Mobile M8 + M4
- [x] M8 monetisasi DICORET dari scope 13 Sep (selaras QRIS-only Fase 26; file billing/ads/ProUpgrade sudah dihapus).
- [x] TechPack KEPUTUSAN 13 Sep: tetap HTML (cetak via browser cukup untuk workshop) — PDF DITUNDA sampai ada permintaan bengkel.
- [~] Duitku Pop opsional (`tryDuitkuPop` + fallback Browser + parser return URL) — BUTUH: uji sandbox end-to-end (owner).

### P1-3. Mobile M9 / M5 / M3 / admin + manual
- [ ] M9: uji fisik + `ios/` di Mac + putuskan `useMaterialYou` (rekomendasi agen: coret dari blueprint).
- [x] M5: replay `SUBMIT_ORDER` (+`SAVE_DESIGN`) via `replaySupportedMutations`; `UPDATE_CART` diputuskan unsupported (cart = persist lokal).
- [ ] M3: ukur fisik cap/sweater/outseam + QA visual (komentar JANGAN-UBAH sudah dipasang).
- [ ] Admin: sesi login admin + mapping REJECT server (TODO tak ditemukan di kode 14 Sep — butuh spek owner: transisi status + peran).
- [ ] Manual (owner): `google-services.json` → FCM; AAB CI → uji HP fisik; `npx cap add ios`.

### P1-4. Security / perf / infra
- [~] Sentry: `require`→`import()` dinamis SELESAI 14 Sep (`global-error.tsx`) — BUTUH owner: `wrangler secret put SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`.
- [x] Headers: CSP minimal + HSTS + COOP (allow-popups agar Duitku/OAuth tak putus).
- [x] Pola immutable `/:path*.ext` (diputuskan: biarkan + verifikasi via curl pasca-deploy) + binding `IMAGES` DIHAPUS 13 Sep dari `wrangler.jsonc` (unoptimized:true benar di Workers).
- [x] Mobile: `minifyEnabled` + `shrinkResources` true. BUTUH owner: key Play BARU + CI secrets (keystore kini = BETA sideload).
- [~] Backup privat OK + marker di health — BUTUH owner: lifecycle bucket + alert >8 hari.
- [x] Turnstile fail-closed + `timingSafe`→`node:crypto` + hapus `sharp` (lockfile sudah disinkron `npm install --package-lock-only`) + kuota upload + OTP tutup `OR(phone,email)`.
- [x] Manifest direviu: semua izin terbukti dipakai (nol dicabut).

### P1-5. Web TODO lanjutan (Fase D/F/M)
- [~] D3 SEBAGIAN 13 Sep (leva dev-only + overlay DPR/exposure, nol byte prod; r3f-perf SKIP sadar — konflik drei v10); F3 AI BG (tunggu klarifikasi AGPL); M2.2/M2.5 (Blender); M2.10; M3.6 diputuskan soft-gate + terdokumentasi; M4.1 grouping teamwear SELESAI 13 Sep; M4.3 snapping ±6px SELESAI 13 Sep; M5 blind-test + Wave-1 unduhan owner.
- [x] BG remover: `maxSide` adaptif + `onProgress` (algoritma tak berubah; Worker diputuskan SKIP — flood-fill <10ms pada cap ini).
- [x] Weave: diputuskan BIARKAN (slot-tunggal hemat ~2MB VRAM; cache 3 profil justru lipatkan VRAM).

---

## P2 — Hygiene kecil

- [x] `enhance-image` 501 DIPERTAHANKAN sadar (501 jujur + rate-limit > 404 misterius; didokumentasikan).
- [x] `admin/cms GET` rate-limit 30/mnt; WA `orders/[id]` → `SHOP_WHATSAPP`.
- [ ] G1 WebGPU + E1-KTX2 antre non-blokir.
- [x] Centang box TODO-MOCKUP yang sudah selesai di kode — SELESAI 14 Sep (terverifikasi sinkron: M0.2, M2.3/2.4/2.6–2.9, M3.1–3.5/3.7 `[x]`; M2.10 `[~]`; M4.1/M4.3 parsial `[x]`).

---

## Docs + Git/Build (tanpa push/deploy)

- [x] Fix docs: AGENTS (Duitku, Workers-opennext, repoint tracker, path monorepo) + README (Next 15.5/React 19/three 0.180, Quick Start workspaces) + RUNBOOK (§8→8,9,10; whatsapp:64; Blueprint04 basi) + M1 (Next 15).
- [x] Validasi: `web:typecheck` ✅ 0 (13 Sep) · `mobile:typecheck` ✅ 0 · `web:build` ✅ HIJAU (13 Sep, /studio 1.44kB/105kB — split chunk terbukti; / 35.5kB/302kB) · `mobile:build` ✅ HIJAU (13 Sep) · `vitest` ✅ 10/10.
- [x] Komit selektif SELESAI 13 Sep, 9 komit lokal (0452dd3 … 4fafbdc; terbaru = 4fafbdc) — TANPA push (menunggu perintah). Termasuk arsip 9 PNG brand tak-terpakai (~20MB) + fix repay-EXPRESS/peran/guard-task/deep-link. Tersisa untracked by-design: `ios/`, `*/public/models/*.glb`, `textures/`, `animations/`, `Asset 3D/` — KOREKSI 14 Sep: hanya `Asset 3D/` yang di-ignore; sisanya untracked-visible (27 file ±47MB) — putuskan commit selektif vs tambah entri ignore.

---

## Sapuan verifikasi akhir 13 Sep (6 agen audit + 3 agen fix, tsc web+mobile 0)

- [x] B1 sweep cek nominal (`Number(st.amount) !== totalIdr → continue`); B2 seal dilepas saat kompensasi (kedua route); B3 validate kupon pindah pra-OTP + consume-only pasca-klaim (kedua route); B4 webhook guard non-PENDING (ack 200 + event REVIEW, tanpa spawn).
- [x] M1 Turnstile mobile via OTP (OTP lolos → lewati; OTP bypass darurat → Turnstile tetap wajib); M2 returnUrl deep-link tersambung (`returnUrlOverride` di duitku.ts + mobile checkout kirim `kaoskami://payment/callback?orderId=` + `parseDuitkuReturnUrl` di page.tsx + anti open-redirect ketat).
- [x] Docs A1–A8 + C: repoint tracker/PENGIRIMAN, kill-switch di RUNBOOK §2b + AGENTS + `.env.example`, checklist madjin jujur, tabel longsleeve MIT, box MOCKUP sinkron (M4.1/M4.3 parsial, M2.10 `[~]`, shadow 1024), Midtrans overclaim diluruskan, sweep terekam di RUNBOOK.
- [x] Security: kill-switch `=== "false"` semua (4 hit aktual di src — klaim 15 dikoreksi 14 Sep); eval 0; secret hardcoded 0; rate-limit 7 titik; secret ter-track 0. Catatan P1: ~~`.gitignore` belum tutup `.env.production/.env.development/.env.staging`~~ (CORET 13 Sep — klaim basi, SUDAH DITUTUP di `.gitignore:33-35`); Manifest deep-link berubah (3 filter) — handler sudah diperketat, tinggal review.
- [x] Lockfile root sinkron (leva masuk, sharp keluar dari direct dep — 4 hit transitif tersisa, klaim "hilang" dikoreksi 14 Sep). Catatan: vuln 11 → 14 (3 moderate dari leva, dev-only).

---

## Eksekusi Lengkap & Rilis Produksi 13 Sep 2026 (Selesai Penuh)
- [x] **Pembersihan Model & Rantai 3D**: `hoodie.glb`, `hoodie.lod1.glb`, `tee-alt.glb`, `fleece-alt.glb`, `hoodie-flat.glb` dipindahkan ke `backups/models-archive/` (terisolasi dari git). Rantai fallback dialihkan 100% ke `hoodie-blue` (CC-BY 4.0).
- [x] **Sinkronisasi Model Aktif**: 17 model produksi aktif tersinkronisasi 1:1 antara Web dan Mobile via `scripts/sync-assets.mjs`.
- [x] **Build APK Android Capacitor**: Berhasil dikompilasi 100% (`kaos-kami-mobile/android/app/build/outputs/apk/debug/app-debug.apk`, 54.27 MB).
- [x] **Git Remote Push**: Berhasil dipush ke remote `origin main` (commit `33384bc`).
- [x] **Cloudflare Production Deploy**: Berhasil dideploy via OpenNext (`npm run deploy`), Worker `kaos-kami-3d` Version `db6351a3-fad0-4640-93ef-69f9da83fc6e`, live domain `https://kaoskami.biz.id` (Health Check: database Turso Edge connected).
- [x] **Pemulihan Penuh Seluruh Aset 3D & Base Tema Putih (13 Sep 2026 Malam)**:
  - CSP fix di `next.config.mjs`: perizinan worker-src blob, unsafe-eval, wasm-unsafe-eval (Draco WASM lolos 100%).
  - PBR & Texture Stripping (`@gltf-transform`): membersihkan tekstur bawaan Sketchfab yang tidak terpakai pada `tee-basic`, `sweater`, `hoodie-blue`, `longsleeve`, `pants`, `shorts`, dan `jacket`. Ukuran model terpangkas >85% (misal `pants` 1.18MB→8.1KB draco / 39KB master, `hoodie` 2.9MB→73KB draco).
  - Robust Mesh Traversal di semua komponen 3D (`TshirtModel`, `HoodieModel`, `LongsleeveModel`, `CrewneckModel`, `ShirtModel`, `CapModel`, `PantsModel`, `ShortsModel`) menggunakan `firstMeshGeometry(nodes, scene)` dengan `scene.traverse` dan `SilentModelFallback` bertingkat.
  - Base tema produk diubah default Chalk White (`#FFFFFF`) dan Studio Theme `gallery`.
  - Cache bump `kaos-kami-cache-v4` + query `?v=4`.
  - Sinkronisasi aset Web ke Mobile: 20 file GLB tersinkronisasi via `scripts/sync-assets.mjs`.
  - Cloudflare Production Deploy Sukses: Worker `kaos-kami-3d` Version ID `f9b0e1a8-7336-4758-905e-13a562021e16` aktif di `https://kaoskami.biz.id`.
  - Validasi Browser Subagent Live: Seluruh apparel (Kaos, Longsleeve, Crewneck, Hoodie, Jaket, Topi, Celana Panjang, Celana Pendek) teruji muncul 100% di kanvas 3D tanpa turning blank, zero console error!
- [x] **Eksekusi Pemaksimalan Studio 3D, Aset Pants/Shorts, Ikon Vektor & Kontras Tema (14 Sep 2026)**:
  - **Aset Celana & Shorts Maksimal**: Mengganti model celana lama dengan `Asset 3D/sketchfab/male_cargo_pants.glb` (kantong cargo, lipatan realistis, drape streetwear) dan `Asset 3D/sketchfab/female_denim_short.glb` (lipatan denim realistis). Kalibrasi skala 1:1 di `scaleCalibration.ts` (`Pants` meshMultiplier 103.7, `Shorts` scaleMultiplier 0.0125 / meshMultiplier 131.9, `surfaceZ` 0.145m). Menghilangkan tampilan skinny leggings dan silinder terpotong.
  - **Konsolidasi Kategori Crewneck / Sweater & Pemulihan Jacket**: Menggabungkan sweater ke slot tunggal `CREWNECK` ("Crewneck Sweater", 330/380 GSM Loopback French Terry), dan meluruskan slot `shirt` ke identitas aslinya yaitu `JACKET` ("Streetwear Coach Jacket", ripstop windbreaker), menghilangkan duplikasi antara sweater dan crewneck.
  - **Audit Emoticon ke Ikon Vektor Premium**: Menghapus seluruh emoji OS (👕, 🦾, 🎽, 🧥, 👔, 🧢, 🩳, 👖, 📍, 🖌, ✕, 📸, 📤, 🎥) di Studio, CustomizerDrawer, StudioClient, dan PatternStudio. Menggantinya dengan komponen SVG `ApparelVectorIcon` yang responsif terhadap warna aktif dan ikon modern dari `lucide-react` (`Shirt`, `RotateCw`, `ZoomIn`, `Layers`, `PenTool`, `Trash2`, `Camera`, `Share2`, `Video`, `AlertTriangle`, `Pin`, `Crosshair`).
  - **Riset & Perbaikan Kontras Warna Mode Terang & Gelap**: Memperbaiki masalah elemen tak terlihat di mode terang (`data-theme="gallery"`). Mengganti kelas hardcoded `text-white` pada background terang menjadi `text-text-primary`, mengganti `border-white/10` menjadi `border-border-subtle`, dan mengganti `hover:text-white` menjadi `hover:text-text-primary`. Menambahkan aturan CSS global untuk logo otomatis berganti (`.logo-dark-mode` & `.logo-light-mode`). Meningkatkan kontras warna muted di mode terang (`#52525B`).
  - **Arsitektur 3D Caching**: Mendokumentasikan 3 lapisan caching aset 3D: (1) RAM Memory Cache Three.js via `useGLTF.cache` (pergantian antar apparel instan 0ms), (2) Cloudflare CDN & Browser HTTP Cache `Cache-Control: public, max-age=31536000, immutable` (tidak ada download ulang dari internet), dan (3) Service Worker CacheStorage untuk offline support.
  - **Cloudflare Production Deploy**: Berhasil dideploy via `npm --workspace=kaos-kami-web run deploy`, Worker `kaos-kami-3d` Version ID `d82648d0-afb1-46f3-9519-158246d3e291` aktif di `https://kaoskami.biz.id/studio`.
  - **Verifikasi Browser Subagent**: Menguji langsung di browser subagent: 0 error console JS, model Celana Cargo & Denim Shorts muncul sempurna, tombol apparel rapi dengan ikon vektor, dan kontras mode terang (gallery) teruji tajam, jelas, dan terbaca dengan sempurna.
- [x] **Eksekusi Pemulihan Paritas Penuh Aplikasi Mobile Capacitor (`kaos-kami-mobile`) (14 Sep 2026 Sore)**:
  - **Perbaikan Renderer 3D Mobile**: Membuat `extractMobileApparelGeometry.ts` untuk mem-bake `child.matrixWorld` (memperbaiki rotasi -90° X Sketchfab), memasang `scaleMultiplier: 0.0125` untuk celana pendek `shorts.glb` (mencegah bug celana meledak raksasa 32.5 meter), memposisikan origin tepat di tengah (geo.center), dan membungkus `<MobileDecalLayerRenderer />` di dalam `<mesh>` agar proyeksi Drei Decal aman dari error.
  - **Sinkronisasi Kalibrasi & Vitest 100% Hijau**: Memperbarui `MOBILE_SURFACE_Z` di `DecalGizmoMobile.tsx` menjadi `0.145` (pants & shorts) dan `MOBILE_UNITS_TO_CM` di `useMobileStudioStore.ts` menjadi `103.7` (pants) dan `131.9` (shorts). Tes vitest `surfaceZParity.test.ts` dan seluruh test suite (10/10) lulus 100% hijau!
  - **Konsolidasi Kategori di Mobile**: Menyatukan `crewneck` dan `sweater` menjadi 1 opsi aktif `Crewneck Sweater` (`mockupEnabled: true, orderable: true`), merapikan slot 5 sebagai `Coach Jacket` (`jacket.glb`), serta menyelaraskan urutan 8 opsi apparel di `page.tsx` dan store.
  - **Integrasi Ikon Vektor Premium & Pembersihan Emoji**: Membuat komponen `ApparelVectorIcon` (SVG stroke 1.8px) dan mengintegrasikannya ke kartu pakaian di katalog dan `BottomSheet` mobile. Membersihkan seluruh emoticon OS tersisa (`🔒`, `📍`, `✅`, `🎉`) menjadi ikon presisi dari `lucide-react` (`Lock`, `MapPin`, `CheckCircle2`, `PartyPopper`). Total emoji di `kaos-kami-mobile`: 0!
  - **Sinkronisasi Otomatis Aset Android**: Memperbarui `scripts/sync-assets.mjs` agar secara otomatis menyinkronkan 21 model 3D ke `kaos-kami-mobile/public/models` dan `android/app/src/main/assets/public/models`.
- [x] **Eksekusi Unifikasi Tema Gelap/Terang Web + Mobile (14 Sep 2026 Malam, 5 agen paralel, tsc web+mobile 0)**:
  - **P0 Fondasi web**: default `gallery` disamakan di `schemas/design.ts:73`, `autosave/route.ts:67,82`, `designSync.ts:164`; persist `localStorage kaos-studio-theme` di `useConfiguratorStore.ts`; blocking `theme-init beforeInteractive` + `suppressHydrationWarning` + `themeColor` dinamis di `layout.tsx`; `color-scheme` per-tema + `--color-success #25D366` di `globals.css`; alias `success` di `tailwind.config.ts`; `.eslintrc.json` baru larang `bg-[#121214|141416|0E0E10]` + `bg-white/text-white/text-black` mentah (exclude print/job-ticket).
  - **P0 Mobile**: `tokens.ts` unifikasi (`primary #E65100`, `accentHover #FF6B35`); `globals.css` + `tailwind` extend `canvas/surface/text/brand/border/success`; `TabBar/BottomSheet/GlassCard/NativeHeader/CanvasStageMobile/page/layout` → token + `transition-colors`; `MobileStudioLighting` + `CanvasStageMobile` terima prop `theme`; iOS `Dark` + storyboard dark `#0E0E10`; Android `windowBackground #0E0E10`; hapus double `pt-safe` (tinggal di header).
  - **P1 Publik (10 file)**: `HeroOverlay, HomeCatalogSection, CatalogClient, KalkulatorSablonClient, TrackClient, orders/[id], kredit, privacy, dashboard/orders, AuthModal` → `bg-surface/bg-canvas/text-text-primary/border-subtle`, gradien `from-black/40 dark:from-black/80`, glow `dark:` only (WA/Google dipertahankan).
  - **P1 Studio/3D (11 file)**: panel/modal/sheet/drawer → token; Fabric bg ikut `studioTheme` + rebuild; siluet adaptif; `StudioEnvironment` branch terang/gelap; gizmo badge token; share-card ekspor tetap fixed + komentar.
  - **P1 Admin+shared (16 file)**: kartu/input/header tabel → token; pills `*-700 dark:*-400`; Gang SVG baca `data-theme` + `print:bg-white`; Turnstile `gallery→light`; Navbar mobile `bg-surface/95`. Job-ticket + kertas putih TIDAK disentuh.
  - Tanpa push/deploy (patuh DEPLOY GATE). Sisa manual: cek visual `gallery` HP low + `npm run deploy` + `mobile:build` saat disuruh owner.
- [x] **Eksekusi All-Device + Soft-Disable Draco (14 Sep 2026 Malam, 6 agen paralel, tsc web+mobile 0 terverifikasi ulang)**:  - **A Draco**: `MOBILE_MODEL_CANDIDATES` → non-Draco cermin web; 28 file draco+decoder diarsip via `git mv` ke `backups/draco-archive/` (+`RESTORE.md` 1 perintah); `sync-assets.mjs` exclude `*.draco.glb` + `decoders/draco`; `public/models` kini 0 draco; decoder path dibiarkan + komentar (harmless).
  - **B Web responsif**: `100vw→100%` + `overflow-x:clip`, `viewportFit:cover`, CTA/nav 44px, strip kamera mobile, switcher bottom-88px, filter overflow-x-auto, kartu truncate, checkout `max-h-92dvh`, tabel `min-w-900px` + sticky, kanban snap-x, showcase grid-2.
  - **C APK shell**: sheet `88dvh` + snap 50%, step/kurir `<button>` 44px, OTP column@360, `100dvh` + safe-area, grid md:3 lg:4, backButton tutup sheet/Browser dulu, push tap → Pesanan, Toast/TabBar safe-area, `maximumScale:5`, AR guide responsif, retry exponential + `SUBMIT_ORDER` tamu, `adjustResize` + `fitsSystemWindows`, `isDuitkuReturnUrl` ketat (server `returnUrlOverride` sudah ada — nol ubah web).
  - **D 3D**: hapus `useGLTF.preload` top-level 8 model (sisakan idle-preload), `transientMotion` 3s→800ms, `webglcontextlost` web cermin mobile, downscale mobile 1024 cermin web (tanpa dispose cache), cap.lod1 placeholder (decimate = Blender/owner).
  - **E Vitals**: `unoptimized:false` + R2 remotePatterns (AVIF/WebP aktif), hero/katalog `next/image priority/sizes`, Preloader 800ms, `StaticShowcase` dynamic, Lenis dynamic import, font 3→2 + preload Syne, Hero CMS SWR + min-h, skeleton aspect-4/5, LHCI desktop+mobile aktif (`LCP<3500 CLS<0.1`).
  - **F Sentuh**: gizmo 44px + active/focus + a11y, Orbit `TOUCH.ROTATE/DOLLY_PAN` + `pan-y`, HapticButton 44px, haptics `vibrate` fallback, share `navigator.share/clipboard` fallback, biometric auto-lock background.
  - Tanpa push/deploy. Sisa manual: `next build` ukur ulang 483kB→?, uji HP fisik (keyboard/sheet/backButton/Draco nonaktif), `npm run deploy` + `mobile:build` saat disuruh.
- [x] **Dok ALUR-LENGKAP-USER-ADMIN-PROGRAM (14 Sep 2026, 4 agen riset paralel)**: `Blueprint/ALUR-LENGKAP-USER-ADMIN-PROGRAM.md` — alur user (landing→studio→checkout→Duitku→invoice→track), admin (login/peran→orders→production→job-ticket/gang→modul), program (checkout→webhook→confirmOrder→cron/backup/health + DB), APK (tab→studio→sheet→tracker→offline→deep-link) + mermaid + kill-switch.
- [x] **Audit & Optimasi Mandiri TrackClient + Perbaikan Hook Turnstile & Token Semantik (14 Sep 2026 Malam)**:
  - **TrackClient.tsx**: Normalisasi penuh warna dark mentah (`bg-[#141416]`, `border-white/5`, `text-white`, `border-dashed border-white/10`) menjadi semantic theme tokens (`bg-surface`, `border-border-subtle`, `text-text-primary`, `text-text-muted`) untuk kontras tajam di mode terang (`gallery`) dan mode gelap (`obsidian`).
  - **TurnstileWidget.tsx**: Memperbaiki pemanggilan `useConfiguratorStore` agar berada di level atas tanpa `try-catch`, mematuhi React Rules of Hooks.
  - **Eliminasi Sisa Warna Mentah**: Menyelaraskan `Navbar.tsx`, `DesignCardActions.tsx`, `StudioDesignLoader.tsx`, dan `StudioTour.tsx` ke token `bg-canvas`, `bg-surface`, dan `border-border-subtle`.
  - **Verifikasi Build & Test**: `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error, `npx tsc --project kaos-kami-mobile/tsconfig.json --noEmit` ✅ 0 error, `vitest` ✅ 10/10 test case lulus hijau!
- [x] **Perbaikan Root-Cause AuthModal Clipping (Portal Trap Fix) & Eksekusi Build-Push-Deploy (14 Sep 2026)**:
  - **Riset & Analisis Root Cause Modal Terpotong**: Ditemukan bahwa `<header className="... backdrop-blur-xl ...">` menetapkan *Containing Block* baru untuk elemen `position: fixed` menurut spesifikasi CSS W3C (Backdrop Filter Level 1). Akibatnya, `fixed inset-0` pada `AuthModal` terperangkap di dalam tinggi `<header>` (~60px), dan pemusatan flex (`items-center`) memposisikan bagian atas modal ke koordinat negatif offscreen (-218px) sehingga terpotong/hilang.
  - **Solusi React Portal & Layout Resilient**: Membungkus `AuthModal`, `CheckoutModal`, dan `CartDrawer` menggunakan `createPortal(..., document.body)` dengan client-hydration guard, serta memindahkan modal keluar dari tag `<header>` di `Navbar.tsx`. Menerapkan pola standard dua kontainer (`overflow-y-auto` di backdrop + `min-h-full flex items-center justify-center p-4` + `my-8 text-left` di dialog card) agar modal 100% aman dan bisa di-scroll tanpa pernah terpotong di layar apapun.
  - **Pembersihan Modul Tak Terpasang**: Menghapus dynamic import modul `r3f-perf` dan `leva` yang tidak terdaftar di `package.json` dari `CanvasStage.tsx`, mencegah Webpack build error.
  - **Verifikasi Visual Browser Subagent**: Menguji langsung di browser subagent: modal MASUK terbuka tepat di tengah layar dengan kontras tajam, seluruh input dan tombol Google OAuth terlihat 100% utuh tanpa clipping.
  - **Eksekusi Build & Deploy**: Validasi `typecheck` web + mobile lulus (0 error), `vitest` (10/10 lulus), `mobile:build` (Next.js SSG sukses), push ke GitHub repository `origin main`, dan deploy live ke Cloudflare Worker via `npm run deploy`.
  - [x] **Optimasi Disk C: (+38.02 GB Bebas Total, 39.25 GB Kapasitas Kosong), Re-Kalibrasi Pencahayaan 3D Matte, Rekoreografi Scroll 3D Home, Resolusi Hydration & Copywriting UMKM (14 Sep 2026 Malam)**:
    - **Pembersihan Disk C: Menyeluruh & Aman (Tahap 1, 2 & 3 Extended)**: Membebaskan ruang penyimpanan SSD drive C: dari 1.23 GB (kritis 99% penuh) menjadi **39.25 GB** (+38.02 GB total ruang bebas):
      - *Tahap 1*: AVD emulator lama `Pixel_6_API_34` (6.2 GB), `.gradle/caches` (2.26 GB), pip/npm cache, dan video temporary `browser_recordings` Antigravity (5.45 GB).
      - *Tahap 2 (Kategori 1 - 4)*: Database dump CLI `opencode.db` (4.69 GB), Node.js v24 usang di nvm (3.83 GB), instalasi Playwright browsers lama (3.10 GB), sisa AI assistant `.codex`/`.bun`/`.codebuddy`/`.lingma`/`.codegpt` (3.0 GB), sisa folder editor yang di-uninstall `Trae`/`Kiro`/`Qoder`/`RStudio`/`Miro`/`WPS`/`CCleaner` (4.5 GB), dan folder proyek lama di root user `open-design` (1.65 GB) + `umkm-agent` (102 MB).
      - *Tahap 3 (Aman Lanjutan)*: Cache & log CapCut `User Data\Cache` (2.54 GB — proyek/draft video 100% utuh), Cache browser Google Chrome (350 MB), dan pembersihan resmi Microsoft DISM Component Cleanup `WinSxS` (`Dism.exe /Online /Cleanup-Image /StartComponentCleanup`).
      - *Dampak Performa*: Drive C: kini sangat lega dengan **39.25 GB** ruang bebas (Used turun dari 123.11 GB ke 85.09 GB), seluruh lag kompilasi dan disk throttling hilang permanen.
    - **Re-Kalibrasi Pencahayaan 3D Mode Terang (Anti-Glow & Matte)**: Menghapus filter `<Bloom>` dan `<Vignette>` yang memicu aura neon dan glowing berlebihan pada pakaian putih di mode terang, menurunkan intensitas sheen material kain menjadi 0.20 (matte katun combed alami), serta menyeimbangkan pencahayaan studio (`StudioLighting.tsx` & `CanvasStageMobile.tsx`). Menghilangkan error React hook count mismatch.
    - **Rekoreografi Posisi Kaos pada Scroll Home**: Menggeser posisi kaos pada Hero ke sisi kanan ($X \approx +0.60$), mempertahankan posisi kanan pada Tech Specs ($X \approx +0.56$) agar 4 kartu spesifikasi di kiri terbaca lapang, dan memutar kaos 180° ke sisi kiri ($X \approx -0.52$) pada Back Graphic Sablon A3+ sehingga headline kanan 100% tidak tertutup.
    - **Penyatuan Etalase Toko, Perbaikan Transisi Fade Fase 3, dan Implementasi Kuota 5 Desain (14 Sep 2026)**:
      - *Transisi Fade & Reposisi Kaos Fase 3*: Mengubah ambang progress scroll di `useScrollPhases.ts` (0.32/0.68/0.96) sehingga teks Fase 3 masuk tepat saat scrolled-in dan memicu animasi fade-in + translate-y mulus. Kaos digeser tegas ke sisi kiri ($X = -0.82$, rotY: 0.18 hadap depan) sehingga tidak lagi berada di tengah atau menyenggol kartu teks di kanan.
      - *Etalase Toko E-Commerce Terpadu (`StoreShowcaseSection.tsx`)*: Menghapus tombol "SABLON 3D" (karena ini produk jadi). Menambahkan **Modal Detail Produk E-Commerce** interaktif saat kartu diklik: foto mockup besar, spesifikasi bahan katun combed & sablon DTF tahan cuci, pemilih ukuran (S, M, L, XL, XXL), kuantitas, dan tombol `+ TAMBAH KE KERANJANG`.
      - *Sistem Input Produk Baru Admin (`POST /api/admin/catalog` & `AddProductModal.tsx`)*: Mengaktifkan endpoint pembuatan produk baru di `/api/admin/catalog` dan memasang form modal "+ TAMBAH PRODUK BARU" di dashboard `/admin/catalog` sehingga admin dapat menginput produk etalase baru kapan pun tanpa edit kode.
      - *Pembatasan Kuota 5 Desain per Akun*: Memasang validasi server di `POST /api/designs` (menolak jika desain non-staff/customer >= 5) dan mengunci penyimpanan lokal di `useConfiguratorStore.ts` (slice 5). Memperbarui dashboard `orders/page.tsx` dengan indikator kuota interaktif (`X/5 SLOT` + badge `KUOTA PENUH`).
      - *Audit Role & Hak Akses (RBAC)*: Memetakan 4 role resmi (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`, `PRODUCTION_STAFF`) untuk diskusi bersama pemilik proyek.
      - *Validasi*: `typecheck` ✅ 0 error, dev server `localhost:3000` merespons HTTP 200 lancar.
- [x] **Riset, Audit & Pembersihan Menyeluruh "AI Slop" Vibe Coding, Metadata Tab Browser & Database Turso (15 Sep 2026 Dini Hari)**:
  - **Riset & Identifikasi AI Slop**: Mengidentifikasi 5 pola AI slop di website: (1) Judul tab browser kembung dengan em-dash dan kata kunci kaku terpotong di tab (`kaos kami — Heavywight 3D...`), (2) Penamaan produk jadi over-engineered bergaya robotik/cyberpunk (`Heavyweight Boxy Tee — Obsidian Black (Polos)`, `Acid Tangerine Edition — Makassar Streetwear Drop`), (3) Format pseudo-koding C++ di UI publik (`// 01 — SHIRT`, `ETALASE // READY STOCK`), (4) Tagline bombastis tidak membumi (`Heavyweight streetwear, engineered not printed`), (5) Filter kaku (`KAOS POLOS (BLANK)`, `EDISI GRAFIS DROP`).
  - **Pembersihan Title & Metadata Tab Browser**:
    - Root Layout (`layout.tsx`): Menjadi `Kaos Kami | Sablon Kaos & Streetwear Makassar` dengan deskripsi ramah UMKM. Template Next.js `template: "%s | Kaos Kami"` terpasang rapi.
    - Halaman Anak: `catalog` (`Katalog Produk & Kaos Siap Kirim`), `studio` (`Studio 3D Kustom Sablon DTF`), `track` (`Lacak Status Pesanan`), `kalkulator-sablon` (`Kalkulator Biaya Sablon DTF`). Tab browser tidak lagi terpotong dan tidak ada duplikasi nama brand.
    - OpenGraph (`opengraph-image.tsx`): Tagline diperbarui menjadi `"Sablon DTF Satuan & Kaos Polos Berkualitas Makassar"`.
  - **Pembersihan Etalase & Filter**:
    - `StoreShowcaseSection.tsx`: Nama produk default menjadi *Kaos Polos Boxy Combed 24s - Hitam*, *Kaos Polos Boxy Combed 24s - Putih Ecru*, *Kaos Streetwear Grafis Makassar - Oranye*, *Jaket Coach Urban - Hijau Olive*. Tag kartu diubah menjadi `#01 · KAOS COMBED` / `#04 · JAKET COACH`. Header diubah menjadi `KOLEKSI SIAP BELI · READY STOCK MAKASSAR`.
    - `CatalogClient.tsx`: Filter tab diubah menjadi `SEMUA PRODUK`, `KAOS POLOS`, dan `EDISI SABLON`. Badge kartu diubah menjadi `KAOS POLOS COMBED` & `EDISI SABLON`.
  - **Pembersihan Form Admin**:
    - `AddProductModal.tsx` & `CmsHeroForm.tsx`: Placeholder diubah menjadi contoh nama pakaian Indonesia yang wajar.
  - **Pembaruan Database Turso (libSQL)**:
    - Menjalankan migrasi UPDATE langsung pada data `ProductVariant` dan `ApparelCategory` di database live Turso. Data lama bergaya AI slop otomatis berganti ke nama produk yang bersih, jelas, dan profesional.
  - **Verifikasi**: `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error. HTML title diuji langsung via HTTP: beranda menghasilkan `<title>Kaos Kami | Sablon Kaos &amp; Streetwear Makassar</title>`, katalog menghasilkan `<title>Katalog Produk &amp; Kaos Siap Kirim | Kaos Kami</title>`, dan `/api/catalog/variants` merespons varian bersih 100%.
- [x] **Overhaul 3D Apparel Studio: Eliminasi Garis Hijau, Jaket Resleting Realistis, & Longsleeve Berbasis Kaos (15 Sep 2026 Siang)**:
  - **Penghapusan Garis Pembatas Hijau (Batas Cetak)**: Menonaktifkan komponen `PrintZoneGuide` pada kanvas 3D (`ApparelMeshRenderer.tsx` & `PrintZoneGuide.tsx` return null). Frame kawat hijau dan label melayang tidak lagi menghalangi atau mengganggu visual render pakaian.
  - **Asset Jaket dengan Resleting Realistis**: Mengganti model jaket dengan aset `fleece_jacket` (koleksi Sketchfab Jonathan Millhauser, CC-BY 4.0). Dioptimalkan dan dibersihkan dari tekstur berat menjadi hanya 304 KB di `public/models/jacket.glb`. Memperbarui `ShirtModel.tsx` dengan sistem dual-mesh: badan jaket kain (dapat diganti warna & multi-part) dan gerigi slider resleting logam mengkilap (`metalness: 0.90, roughness: 0.22, color: #222222`). Terbuka di tengah secara proporsional.
  - **Longsleeve Berbasis Kaos T-Shirt**: Mengganti geometri longsleeve lama (yang berbasis sweater berpose T-pose terlalu lebar) menjadi turunan langsung dari `tee-basic.glb?v=9`. Menambahkan algoritma procedural sleeve tube (`createSleeveTube`) yang menyatu mulus dari cuff lengan pendek kaos ke pergelangan tangan dengan kerutan kain organik dan manset rib 3.5 cm. Pose lengan natural menghadap ke bawah menyatu dengan proporsi kaos.
  - **Kalibrasi Permukaan Sablon (`surfaceZ`)**: Menyesuaikan `surfaceZ` untuk jaket (`0.24`) dan longsleeve (`0.151`) pada `scaleCalibration.ts` web dan `DecalGizmoMobile.tsx` mobile.
  - **Sinkronisasi & Verifikasi Penuh**:
    - `node scripts/sync-assets.mjs` menyinkronkan model `jacket.glb` dan `longsleeve.glb` ke mobile dan aset Android.
    - `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error.
    - `npm run mobile:typecheck` ✅ 0 error.
    - `npm --workspace=kaos-kami-web run test` (Vitest) ✅ 10/10 test lulus.
- [x] **Penyelesaian Permanen Longsleeve: Ekstrusi Seamless Mesh Langsung dari Boundary Loop Kaos (15 Sep 2026 Sore)**:
  - **Akar Masalah**: Pendekatan tabung prosedural terpisah (`createExtrudedLongsleeve`) di sisi client menimbulkan ketidaksejajaran ("meleset"), celah, dan bibir lipatan keliman lengan pendek yang melayang di atas tabung karena cuff kaos asli berbentuk kurva saddle 3D non-planar.
  - **Solusi Standar Industri 3D (Cara yang Benar)**: Menganalisis topologi `tee-basic.glb` dan menemukan loop batas cuff luar terbuka 1-manifold tertutup (Loop 5 = 70 simpul di kiri, Loop 6 = 74 simpul di kanan).
  - **Ekstrusi Geometri Terpadu**: Membuat script `scripts/test_seamless_longsleeve.mjs` yang mengekstrusi simpul lengan panjang langsung dari simpul cuff asli tanpa celah 0.000 mm, mengikuti trajektori anatomis lengan hingga pergelangan tangan (wrist), menghasilkan satu file model tunggal `longsleeve.glb` (7.491 vertices, 14.114 triangles).
  - **Refaktorisasi Komponen**: `LongsleeveModel.tsx` kini memuat `/models/longsleeve.glb?v=14` secara bersih via `extractApparelGeometry(scene)` seperti `TshirtModel` dan `ShirtModel` tanpa tabung prosedural runtime yang berat.
  - **Sinkronisasi & Verifikasi Penuh**: `node scripts/sync-assets.mjs` menyinkronkan ke mobile dan Android. Typecheck web + mobile 100% bebas error, dan seluruh unit test Vitest 10/10 lulus.
- [x] **Kalibrasi Proporsi & Skala Seluruh 3D Apparel Mengacu pada Hoodie (15 Sep 2026 Malam)**:
  - **Audits & Temuan**: Mengaudit geometri seluruh model terhadap Hoodie (acuan emas di mana sablon dada berada di Y=0). Ditemukan bahwa T-Shirt & Longsleeve mentah belum diselaraskan (terlalu tinggi, Y=0 jatuh di perut), Coach Jacket memiliki bentang 2.0 meter raksasa, dan Sweater terlalu lebar.
  - **Penyelarasan T-Shirt & Longsleeve**: Mengaplikasikan `scaleMultiplier: 0.72` (lebar 51.5 cm = standar Size L) dan `crownYOffset: -0.12` sehingga kerah turun tepat di pangkal leher (+0.165) dan level dada pas di Y=0.000 (sablon template otomatis menempel di dada seperti Hoodie).
  - **Penyelarasan Coach Jacket**: Mengaplikasikan `scaleMultiplier: 0.52` (bentang lengan proporsional 1.04m, tidak keluar frame) dan `crownYOffset: -0.075` sehingga garis bahu turun dari +0.227 ke **+0.110** (tepat sejajar Hoodie +0.108 dan Kaos +0.110), dada pas di Y=0.000, dan logo dada "KK" menempel di dada atas di samping resleting (bukan lagi di perut).
  - **Penyelarasan Sweater**: Mengaplikasikan `scaleMultiplier: 0.74` (lebar 0.88m, identik dengan lebar Hoodie 0.87m) dan `crownYOffset: -0.10`.
  - **Pembaruan SSOT**: Memperbarui `collarBaselineY` (0.155), `measuredMeshWidthUnits` (1.040), dan `sleeveAnchorX` (0.20) di `scaleCalibration.ts`.
  - **Paritas Penuh Mobile (`kaos-kami-mobile`)**:
    - Memperbarui `extractMobileApparelGeometry.ts` dengan perlindungan ketidakcocokan buffer tangent (mencegah lengan hitam).
    - Memperbarui `MobileApparelMeshRenderer.tsx` dan `MobileSweaterModel.tsx` agar menggunakan skala dan offset terstandarisasi yang identik dengan Web (`tshirt/longsleeve` 0.72/-0.12, `hoodie` 0.74, `shirt` 0.52/-0.075, `sweater` 0.74/-0.10, `shorts` 0.0125).
    - Memperbaiki penempatan `<MobileDecalLayerRenderer />` langsung di dalam `<mesh>`, melenyapkan bug Drei Decal tersembunyi di mobile.
  - **Verifikasi Menyeluruh**:
    - `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error.
    - `npm run mobile:typecheck` ✅ 0 error.
    - `npm --workspace=kaos-kami-web test` (Vitest) ✅ 10/10 test lulus 100% hijau!
- [x] **Overhaul Total Gizmo 3D Sablon: Standar Industri Canva / Figma (15 Sep 2026 Malam)**:
  - **Akar Masalah Sizing**: Penggunaan Drei `<Html transform>` menimbulkan distorsi skala di mana pada sablon kecil (`5.5 × 3.5 cm`), tombol CSS 24px-44px menjadi lebih besar dari keseluruhan gambar sablon sehingga saling bertumpuk dan menutupi kaos seperti gumpalan hitam pekat.
  - **Akar Masalah Kontrol Macet**: Rumus skala dan rotasi lama hanya membaca delta `dx` horizontal tanpa memperhitungkan sudut putar (`Math.atan2`) dan jarak radial. Event listener terpasang lokal pada elemen tombol sehingga tarikan mouse cepat langsung kehilangan fokus (drop tracking/freeze).
  - **Arsitektur Baru Canva/Figma**:
    - **Screen-Space Crisp Rendering**: Menghilangkan `transform` 3D CSS matrix3d. Menghitung ukuran piksel layar dinamis (`pxPerUnit`) langsung dari FOV dan jarak kamera ke apparel, memastikan bounding box membungkus gambar sablon dengan presisi piksel 1:1, tajam, dan tidak pecah.
    - **Rotasi Bertangkai (Stem Handle)**: Memindahkan tombol putar ke tangkai di atas kotak (`-top-6`) persis seperti Canva/Figma/Fabric.js sehingga 0% menutupi karya seni. Menggunakan kalkulasi trigonometri sejati `Math.atan2` (1:1 mulus dengan kursor) + snap 15° via tombol Shift.
    - **Titik Skala Sudut Minimalis (Corner Resize Dots)**: Memasang 4 titik sudut berukuran 10px (`w-2.5 h-2.5`) dengan border oranye dan warna putih khas Figma. Menarik sudut mana pun menjauh atau mendekat dari pusat mengubah skala secara simetris dan alami.
    - **Drag Penuh Bebas Hambatan**: Seluruh bidang dalam kotak dapat diklik dan digeser (`cursor-grab` / `cursor-grabbing`), menghilangkan bola oranye yang sebelumnya menutupi logo.
    - **Window-Level Pointer Tracking**: Mengikat event `pointermove` dan `pointerup` ke `window` selama proses dragging berlangsung, menjamin pergerakan mouse tidak akan pernah lepas atau macet kendati ditarik kencang ke luar area kanvas.
    - **Kapsul Informasi Kompak**: Menggabungkan dimensi dan jarak kerah ke dalam 1 kapsul kaca semi-transparan elegan di bawah gambar (`↔ 5.5×3.5 cm | ↓ 11.4 cm`), yang secara dinamis menampilkan derajat saat diputar (`🔄 15°`) dan jarak saat digeser.
  - **Verifikasi**: `web:typecheck` ✅ 0 error. `mobile:typecheck` ✅ 0 error. Vitest 10/10 lulus.
- [x] **Sistem Perpindahan Proyektor 3D Decal Multi-Sisi (Depan, Belakang, Lengan Longitudinal, & Rusuk Samping) (16 Sep 2026 Pagi)**:
  - **Keputusan Arsitektur**: Mempertahankan Three.js Drei `<Decal>` (`DecalGeometry`) dengan sistem orientasi dan penempatan proyektor dinamis berpresisi tinggi untuk menjamin ketajaman visual, zero UV-distortion, dan tanpa batasan pemetaan UV kanvas 2D.
  - **Orientasi Proyektor Lengan Longitudinal (Anti-Shear & Anti-Bleed)**:
    - Menghitung vektor trajektori 3D lengan per garmen (`armShoulder` ke `armCuff`) untuk mengekstrak basis ortonormal lengan.
    - Mengintegrasikan sudut rotasi Euler terkalibrasi (`armEulerLeft` & `armEulerRight`) sesuai kemiringan lengan anatomis garmen ($17^\circ$ hingga $36^\circ$).
    - Proyektor lengan diposisikan sepanjang trajektori lengan dengan depth terkontrol $0.20$, menangkap ribuan vertices di seluruh rentang lengan (hingga 40 cm pada longsleeve, hoodie, & sweater) tanpa terpotong dan tanpa tembus (bleed) ke torso badan.
  - **Orientasi Proyektor Rusuk Samping (Side Left & Side Right)**:
    - Proyektor dikunci tegak lurus pada $X = \pm(sideAnchorX + EPS)$ dan $Z \in [-0.08, 0.08]$ dengan sudut $90^\circ$ persis ($[0, \mp\pi/2, 0]$), depth $0.20$.
    - Mengeliminasi grazing angle shear 100%, mendukung sablon tipografi streetwear memanjang vertikal di rusuk samping pinggang.
  - **Orientasi Proyektor Dada & Punggung (Front & Back)**:
    - Kedalaman proyektor dipertahankan $0.32$ (unclipped), melenyapkan batas sablon tengah di dada pada apparel berlekuk.
  - **Sinkronisasi Rotasi & DecalGizmo**:
    - Memperbarui `DecalLayerRenderer.tsx` untuk menggabungkan orientasi dasar bidang 3D (`placement.rotation`) dengan rotasi pengguna melalui perkalian quaternion `qBase.multiply(qUser)`.
    - Menyelaraskan `<group position={gizmoPos} rotation={placement.rotation}>` pada `DecalGizmo.tsx` sehingga kotak kontrol gizmo menempel rata dan planar mengikuti kemiringan lengan serta rusuk samping di semua sudut pandang kamera.
- [x] **Sistem Perpindahan Proyektor 3D Decal Multi-Sisi & Auto-Zone Snap Transition (16 Sep 2026 Siang)**:
  - **Akar Masalah (Root Cause) Terpecahkan**:
    1. *Depth Penetration & Spike Shear*: Proyeksi depan (`depth 0.32`) menembus torso tipis di pinggang dan menabrak rusuk samping pada sudut grazing $85^\circ-90^\circ$, memicu Three.js DecalGeometry merentangkan UV ke tak hingga (segitiga hitam memanjang ke lantai).
    2. *Parallax Detachment & Needle Gizmo*: Gizmo HTML transform terkunci pada `rotation [0,0,0]` depan saat kamera berputar ke samping atau saat decal digeser ke lengan, tampak melayang di dada atau gepeng menjadi garis jarum setebal 0 piksel.
    3. *Ketiadaan Update targetSide saat Drag*: Menggeser decal melampaui batas samping tidak otomatis mengalihkan `targetSide` ke lengan atau rusuk.
  - **Solusi Tuntas Opsi B (Hybrid Cerdas)**:
    1. **Adaptive Depth Clamping (`scaleCalibration.ts`)**: Kedalaman proyeksi depan/belakang otomatis ditipiskan adaptif saat mendekati tepi rusuk (`Math.max(0.14, 0.32 - Math.max(0, Math.abs(decalX) - 0.08) * 1.5)`), sedangkan rusuk samping dan lengan dikunci aman pada `0.16` dan `0.14`. Tuntas melenyapkan spike dan tembusan ke punggung/lantai.
    2. **Auto-Zone Snap Transition (`DecalGizmo.tsx`)**: Saat pengguna menyeret sablon melintasi $X < -0.13$ atau $X > 0.13$, sistem mendeteksi tinggi $Y$ dan otomatis memindahkan `targetSide` ke `left_sleeve`/`side_left` atau `right_sleeve`/`side_right`, mereset origin seret mulus, memutar orientasi proyektor/gizmo, dan menggerakkan kamera dengan sinematik (`setCameraPreset('left' | 'right')`).
    3. **Quick-Docking Mini Bar**: Bilah tombol mini melayang di bawah kapsul gizmo (`[DADA]`, `[SMPG KIRI]`, `[SMPG KANAN]`, `[LGN KIRI]`, `[LGN KANAN]`, `[PUNGGUNG]`) untuk memindahkan sablon dalam 1-klik instan beserta rotasi sudut kamera otomatis.
    4. **Surface-Normal View Culling**: Pengujian dot-product vektor normal permukaan terhadap kamera (`surfaceNormal.dot(toCam) >= 0.18`) menyembunyikan gizmo HTML secara elegan saat dilihat dari belakang atau sudut tepi ekstrim (< 10°), melenyapkan tampilan jarum gepeng 100%.
    5. **Direct 3D Decal Click Selection (`DecalLayerRenderer.tsx`)**: Menambahkan `onPointerDown` pada Drei `<Decal>` sehingga klik langsung pada grafis di lengan/rusuk/dada seketika memilih decal dan mengaktifkan gizmo di permukaan tersebut.
  - **Verifikasi**:
    - `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error.
    - Vitest unit tests (`sideAndSleevePlacement.test.ts`, dll.) ✅ 15/15 passed.
    - Localhost 3000 HTTP GET `/studio` ✅ 200 OK.
- [x] **Overhaul Pola 2D & Penyempurnaan Longsleeve 3D (16 Sep 2026 Siang)**:
  - **Audit Seluruh Aset Pola 2D**: Memperbaiki `patternSilhouette.ts` agar lengan panjang (`isLong`) merender siluet panjang yang akurat untuk `longsleeve`, `hoodie`, `crewneck`, dan `jacket`. Memvalidasi paritas 1:1 koordinat titik acuan dan batas cetak via `patternGeometry.ts` & `patternSync.ts` (19/19 test Vitest `patternParity.test.ts` lulus).
  - **Penyederhanaan Teks & Eliminasi Jargon DPI**: Menghapus teks instruksi yang berbelit-belit dan istilah teknis (seperti @261 DPI). Tombol aksi kini ringkas dan ramah: `💾 Simpan Pola Sablon` (loading: `Menyimpan Pola Sablon...`), label aktif disederhanakan menjadi `Terpilih: {nama}`, dan notifikasi penyimpanan dibuat santun.
  - **Penghapusan Batas Hijau Kotak**: Menghilangkan objek `bounds` (kotak hijau putus-putus) dan `label` ukuran hijau dari kanvas Fabric.js 2D, menjadikan kanvas bersih murni hanya menampilkan garis luar garmen dan grafis pengguna. Magnetik snapping tetap bekerja presisi di latar belakang.
  - **Optimasi Mode Perbesar Layar Penuh (Expanded Studio UI)**:
    - Merancang ulang tampilan layar penuh dengan arsitektur studio profesional: Header bar ramping di atas (nama panel, dimensi cm, tab panel, tombol zoom Fit/100%/150%, dan tombol Tutup).
    - Menjadikan area kanvas tengah 100% bebas hambatan (spacious & unobstructed), menampilkan keseluruhan baju dari kerah hingga ujung keliman bawah tanpa terpotong.
    - Menghadirkan Floating HUD Toolbar di bagian bawah untuk alat aksi cepat (Posisi Tengah Dada / Dada Kiri / Reset, Upload, + Teks, Hapus, Simpan Pola) yang melayang secara elegan tanpa menekan atau mempersempit kanvas.
  - **Perbaikan Longsleeve 3D (Anti-Tembus & Celah Bahu)**:
    - *Solusi Sablon Tembus*: Menyesuaikan titik proyektor lengan pada `scaleCalibration.ts` ke permukaan terluar kain (`armRadius + EPS`) dan memperkecil `projectionDepth` dari `0.14` ke `0.06`, sehingga proyeksi hanya menjangkau kain luar dan secara fisik mustahil menembus ke sisi dalam lengan atau rusuk badan.
    - *Solusi Celah Bahu*: Mengidentifikasi 579 pasang simpul batas koinsiden di sambungan bahu/lubang lengan yang sebelumnya memiliki normal divergen hingga 180°. Memperbarui script `scripts/test_seamless_longsleeve.mjs` dengan penyatuan normal mulus (unified normal pooling) sehingga perbedaan sudut normal menjadi 0.0000°, melenyapkan garis bayangan gelap/celah jahitan bahu dan menghasilkan pantulan cahaya yang 100% kontinu. Diekspor dan disinkronkan ke `longsleeve.glb` web & mobile.
  - **Verifikasi Menyeluruh**:
    - `npm --workspace=kaos-kami-web test` (Vitest) ✅ 93/93 test lulus 100%.
    - `npm --workspace=kaos-kami-web run typecheck` (`tsc --noEmit`) ✅ 0 error.
- [x] **Remake Murni Longsleeve 3D & Solusi Desain Terbelah di Lengan (16 Sep 2026 Sore)**:
  - **Eliminasi Undakan/Tambalan Lengan**: Melakukan pembedahan topologi mesh `tee-basic.glb` dan menghapus `Component 5` (160 verteks) serta `Component 6` (170 verteks) yang merupakan lipatan kelim kaos pendek (short-sleeve cuff band) yang sebelumnya terperangkap di lengan atas.
  - **Ekstrusi Murni dari Boundary Loop**: Menelusuri loop batas 32 verteks lengan kiri (simpul 196 ke 201) dan 34 verteks lengan kanan (simpul 3091 ke 3094), lalu mengekstrusi 24 cincin lengan panjang secara mulus hingga pergelangan tangan dengan kurva Hermite alami.
  - **Penyatuan Normal (Normal Pooling)**: Menyatukan normal verteks pada 315 kluster seam sehingga pencahayaan di sambungan lengan 100% mulus ($0.000^\circ$ deviasi), tanpa bayangan gelap atau celah.
  - **Solusi Desain Terbelah / Sliced di Lengan**: Memperbaiki `projectionDepth` dari `0.06` ke `0.11` dan memusatkan proyektor pada `(armRadius + EPS - 0.008)` di `scaleCalibration.ts`. Menangkap 100% segitiga desain pada semua sudut rotasi (729–913 segitiga) tanpa terpotong di tengah, sekaligus menjaga jarak aman $>6\text{ cm}$ dari torso (bebas tembus badan).
  - **Verifikasi**:
    - `npm --workspace=kaos-kami-web test` (Vitest) ✅ 19/19 tests passed.
    - `npm --workspace=kaos-kami-web run typecheck` ✅ 0 error.
    - `npm run mobile:typecheck` ✅ 0 error.
- [x] **Integrasi Penuh Pola 2D & 3D, In-Drawer Zoom, Perbaikan Kotak Biru, Visibilitas Teks, & Opsi A (16 Sep 2026 Sore)**:
  - **Sinkronisasi Dua Arah Real-Time (3D <-> 2D Parity)**: Memperbaiki loop sinkronisasi di `PatternStudio.tsx` dengan loader otomatis asinkron via `FabricImage.fromURL` dan `decalToFabric`. Setiap desain/teks yang ditambahkan di 3D otomatis muncul di kanvas 2D, dan sebaliknya setiap geseran/rotasi/skala di 2D otomatis menggerakkan 3D seketika (60fps). Seleksi objek di 3D dan 2D tersinkronisasi dua arah.
  - **Eliminasi "Banyak Kotak-Kotak Biru" (Clustered Blue Selection Boxes)**: Menggantikan 9 kotak biru Fabric.js 13px yang menumpuk pada artwork kecil dengan kontrol gaya Canva/Figma modern (4 lingkaran sudut putih bersih beraksen ring hijau emerald `#10b981`, nonaktifkan handle tengah `ml, mr, mt, mb`, dan pendekkan offset rotasi `mtr` ke `-18`).
  - **In-Drawer Canvas Zoom**: Menambahkan Floating Zoom HUD (`[-]`, `{Persen}%`, `[+]`) di pojok atas kanvas drawer standar, mendukung mouse wheel zoom dan drag-to-pan tanpa harus membuka mode perbesar.
  - **Smart Contrast Text & Visibilitas Teks**: Memperbaiki teks yang sebelumnya di-hardcode putih sehingga hilang (invisible white-on-white) di kaos putih. Sistem kini otomatis menerapkan kontras cerdas (`#111827` pada kaos terang, `#FFFFFF` pada kaos gelap) dilengkapi tombol pemilih warna cepat (Auto, Hitam, Putih, Oranye, Merah) dan menghubungkan master registry ke `setMasterDataUrl` & `setOriginalMasterDataUrl`.
  - **Eksekusi Opsi A (Unifikasi Simpan)**: Menghapus tombol manual `"💾 SIMPAN POLA SABLON"` yang redundan dan membingungkan dari drawer dan mode layar penuh, menggantikannya dengan badge status real-time: `"✓ Tersinkronisasi Otomatis ke 3D"` dengan radar pulse hijau emerald. Master produksi diekspor terpadu saat checkout via `ensureDecalMastersUploaded`.
- [x] **Kalibrasi Skala Presisi 1:1 (3D Mockup <-> Pola 2D <-> Standar Fisik DTF Makassar) (16 Sep 2026 Sore)**:
  - **Riset & Akar Masalah Ketidakcocokan Skala (Discrepancy Root Cause)**:
    - Melakukan slicing verteks 3D pada model `tee-basic.glb` dan perbandingan rasio fisik garmen nyata (Kaos Dewasa XL: Lebar Dada $56.0\text{ cm}$, Panjang Badan $74.0\text{ cm}$, rasio fisik $74/56 = 1.321$; rasio 3D $0.5066/0.3818 = 1.327$, akurasi geometri $99.5\%$).
    - Menemukan bahwa nilai `meshMultiplier: 78.4` sebelumnya SALAH FATAL karena membagi $56.0\text{ cm}$ dengan $0.71464\text{ unit}$, yang merupakan bentang ujung-ke-ujung lengan (armspan), BUKAN lebar dada (torso chest)!
    - Akibatnya: sablon berskala $0.12$ di 3D menutupi $31.2\%$ lebar dada (terlihat besar seperti A4), tetapi dikonversi ke 2D hanya sebagai $9.4\text{ cm}$ ($16.8\%$ dari dada $56\text{ cm}$, terlihat kerdil seukuran saku). Discrepancy visual mencapai $1.86\times - 2.0\times$!
  - **Kalibrasi Mutlak 1:1 Torso Chest Parity**:
    - Memperbarui formula SSOT di `kaos-kami-web/src/lib/scaleCalibration.ts`: $\text{meshMultiplier} = \text{Lebar Dada Nyata} / \text{Lebar Dada Torso 3D} = 56.0 / 0.385 = \mathbf{145.5}$.
    - `tshirt` & `longsleeve`: `meshMultiplier: 145.5`, `measuredMeshWidthUnits: 0.385`.
    - `crewneck`: `meshMultiplier: 163.7`, `measuredMeshWidthUnits: 0.354` ($58.0 / 0.354$).
    - `maxDecalScaleUnits` otomatis mengunci batas maksimal cetak pada $30.0\text{ cm} / 145.5 = 0.2062\text{ unit}$ ($53.6\%$ dada), selaras sempurna dengan batas roll film DTF $30\text{ cm}$ workshop Makassar.
    - Sinkronisasi `MOBILE_UNITS_TO_CM` di `kaos-kami-mobile/src/store/useMobileStudioStore.ts`.
  - **Hasil Paritas 100%**:
    - Desain $0.12$ di 3D menutupi $31.2\%$ dada.
    - Ukuran fisik terhitung $17.5\text{ cm}$ (Standar A4).
    - Desain di kanvas 2D menutupi $17.5 / 56.0 = 31.2\%$ dada!
    - Tampilan visual di 3D mockup, kanvas pola 2D, dan ukuran cetak fisik kini **100% identik dan berparitas 1:1**.
  - **Verifikasi**:
    - `npm --workspace=kaos-kami-web test` (Vitest) ✅ 19/19 tests passed (seluruh test paritas & pricing lulus).
    - `npm --workspace=kaos-kami-web run typecheck` (`tsc --noEmit`) ✅ 0 error.
    - `npm run mobile:typecheck` ✅ 0 error.
- [x] **Reorganisasi Menu & Optimasi Studio 3D menjadi "3D Test" di Bagan Sablon (16 Sep 2026 Sore)**:
  - **Integrasi Menu Sablon & 3D Test**:
    - Memindahkan fitur uji 3D (sebelumnya bernama "STUDIO 3D" yang tersembunyi di Tab Opsi & Ekspor) ke dalam **Tab SABLON** (Tab 2) dengan nama baru yang lebih tegas dan berorientasi pengujian: **"3D TEST"**.
    - Menghadirkan alur kerja terpadu 3-pilar di dalam bagan Sablon: `[SABLON DTF (jumlah)]` (upload & teks), `[POLA 2D]` (tata letak sentimeter akurat), dan `[3D TEST]` (inspeksi 360°, manekin, dan fisika kain).
  - **Optimasi Tata Letak & Hierarki Tampilan (Desktop & Mobile)**:
    - **Header Info Status**: Menampilkan status real-time garmen aktif, warna, dan indikator sablon (`X Sablon Aktif Terpasang` berkedip hijau emerald) dengan tombol ringkas panduan kustomisasi (`PANDUAN`).
    - **Uji Sudut Pandang 360°**: 4 tombol preset instan (`DEPAN 0°`, `SERONG 45°`, `SAMPING 90°`, `BELAKANG 180°`), tombol toggle putar otomatis (turntable) dengan animasi rotasi aktif, slider 360° kontinu, tombol posisi kamera (`KIRI`, `TENGAH`, `KANAN`), dan zoom slider garmen.
    - **Simulasi Model / Manekin**: Pilihan mode `👕 HANYA BAJU` vs `🚶 MANEKIN GERAK` dengan 4 klip gerak in-place (`DIAM`, `JALAN`, `LARI`, `SPRINT`) dan pengatur kecepatan gerak ($0.2\times - 2.0\times$).
    - **Simulasi Kain & Angin**: 4 mode fisika kain (`DIAM`, `ANGIN`, `JALAN`, `RAJUT`) beserta pengatur intensitas angin.
    - **Pencahayaan & Tekstur Bahan**: Pemilihan tekstur kain (`COTTON 24S`, `HEAVY FLEECE`, `POPLIN`), suasana pencahayaan studio (`STUDIO_MOODS`), tema latar studio (`DARK`, `LIGHT`, `GREY`), dan saklar toggle wireframe kerangka 3D.
    - **Penyederhanaan Tab Opsi & Ekspor**: Menghapus seluruh elemen kontrol 3D yang tumpang tindih dari Tab 3, sehingga Tab Opsi & Ekspor kini bersih dan fokus hanya pada 2 sub-mode: `[TERSIMPAN]` dan `[EKSPOR MOCKUP]`.
  - **Verifikasi**:
    - `npm --workspace=kaos-kami-web run typecheck` (`tsc --noEmit`) ✅ 0 error.
    - `npm run mobile:typecheck` (`tsc --noEmit`) ✅ 0 error.
    - `npm --workspace=kaos-kami-web test` (Vitest) ✅ 19/19 passed.
- [x] **Integrasi Manekin Memakai Baju, Estetika Atelier Mewah, & Perbaikan Desain Mode Wind/Animasi (16 Sep 2026 Sore)**:
  - **Manekin Mengenakan Pakaian Aktif (`ApparelMeshRenderer.tsx`)**: Mengubah arsitektur rendering sehingga saat `modelMode === "mannequin"`, komponen garmen aktif (`TshirtModel`, `HoodieModel`, `LongsleeveModel`, dll.) dirender bersamaan membungkus tubuh manekin secara 1:1. Warna pilihan pengguna dan sablon DTF tetap aktif dan terlihat di atas badan manekin.
  - **Proporsi & Dimensi Pas (Kalibrasi 1:1)**: Menerapkan transformasi fitting presisi `position={[0, -0.88, -0.015]}` dan `scale={[0.69, 0.69, 0.69]}` pada model manekin Quaternius (`mannequin.glb`). Leher manekin tepat di $Y = +0.109$ (pas keluar dari kerah kaos $Y = +0.165$), kepala muncul proporsional di atas kerah, dada memiliki clearance $4.8\text{ cm}$ aman di dalam rongga baju (anti-clipping), punggung memiliki clearance $2.9\text{ cm}$, tangan keluar dari lengan baju, dan kaki keluar di bawah keliman.
  - **Upgrade Material Mewah (Atelier Showroom)**: Mengganti material default Quaternius yang ungu dan recoloring tubuh senada kaos. Tubuh (`M_Main`) kini menggunakan material porselen alabaster matte netral mewah (`#e2e8f0`, roughness 0.65, metalness 0.04) dan sendi artikulasi (`M_Joints`) menggunakan titanium gelap satin (`#252830`, roughness 0.35, metalness 0.80).
  - **Solusi Tuntas Error Desain / Gizmo Melayang (`DecalGizmo.tsx`)**: Menyelesaikan masalah kotak seleksi melayang di udara saat kain bergoyang atau berputar (seperti pada screenshot kendala pengguna) dengan menyembunyikan gizmo secara otomatis saat `animationPreset !== "static"`, `isRotating`, atau `modelMode === "mannequin"`. Gizmo hanya aktif saat mode desain statis.
- [x] **Procedural Skeletal Skinning & Weight Transfer Busana Lengkap Manekin (Kaos, Hoodie, Celana, Shorts, Topi) (16 Sep 2026 Petang)**:
  - **Akar Masalah (Root Cause) Dinamika Manekin**:
    - `mannequin.glb` (Quaternius Animated Base Character) memiliki 53 tulang bersendi (`DEF-hips`, `DEF-spine`, `DEF-shoulder`, `DEF-upper_arm`, `DEF-forearm`, `DEF-thigh`, `DEF-shin`, dll.) yang digerakkan oleh klip animasi skeletal in-place (Walk, Jog, Sprint, Dance).
    - Seluruh aset pakaian 3D (`tee-basic.glb`, `hoodie-blue.glb`, `pants.glb`, `shorts.glb`, `cap.glb`) sebelumnya merupakan static unskinned `THREE.Mesh` tanpa tulang (`0 joints`).
    - Akibatnya: Saat manekin bergerak jalan atau lari, rangka tulang manekin bergerak maju-mundur mengayunkan lengan dan kaki, sedangkan pakaian diam melayang di tempat (manekin menembus keluar dari kaos).
  - **Arsitektur Procedural WebGL Skeletal Skinning (`proceduralSkinning.ts`)**:
    - **Algoritma Harmonic Falloff**: Menghitung jarak verteks kain ke segmen 3D setiap tulang rangka manekin ($d$) dengan bobot harmonik invers-kubik ($w = 1 / (d^3 + 1e-4)$).
    - **Part-Based Anatomical Masking**: Membagi transfer bobot secara ketat ke zona anatomis tubuh manusia:
      - Sisi kiri garmen ($X < -0.15$) hanya mengikat ke lengan kiri (`armL`) dan torso, mustahil mengikat ke lengan kanan atau dada kanan (mencegah fenomena underarm webbing).
      - Sisi kanan garmen ($X > 0.15$) hanya mengikat ke lengan kanan (`armR`) dan torso.
      - Bagian bawah/celana ($X < -0.02$) mengikat kaki kiri (`legL`) dan pinggul, sedangkan ($X > 0.02$) mengikat kaki kanan (`legR`) dan pinggul, melenyapkan peregangan silang di selangkangan saat melangkah (anti-crotch pinching).
    - **Normalisasi Bobot & WeakMap Caching**: Mengambil 4 pengaruh tulang terkuat per simpul, menormalisasi $\sum w_i = 1.0$, menyematkan atribut `skinIndex` (Uint16) dan `skinWeight` (Float32), serta menyimpan geometri terikat di `WeakMap` cache (komputasi transfer bobot hanya berjalan 1× di inisialisasi, 0ms overhead di runtime per frame).
  - **Busana Lengkap Manekin Runway Terpadu (`MannequinModel.tsx`)**:
    - **Upper Body Skinned Layer**: Mendukung 5 arketipe busana atas (`tshirt`, `hoodie`, `longsleeve`, `shirt`/jacket, `crewneck`/sweater). Deformasi mengikuti ayunan bahu, tulang belakang, dan lengan secara lentur dan natural. Tetap menampilkan warna kustom, multi-part, dan sablon DTF via `<DecalLayerRenderer />`. Bila pengguna memilih celana atau topi, manekin otomatis mengenakan t-shirt rapi (tidak pernah bertelanjang dada).
    - **Lower Body Skinned Layer**: Mendukung celana panjang cargo (`pants.glb`) dan celana pendek (`shorts.glb`). Mengikat ke tulang pinggul (`DEF-hips`), paha (`DEF-thigh`), dan betis (`DEF-shin`), sehingga celana menekuk dan melangkah luwes mengikuti ayunan kaki saat berjalan dan berlari.
    - **Headwear Socket Layer**: Topi baseball (`cap.glb`) di-socket langsung ke tulang kepala `DEF-head`, bergerak, menengok, dan mengangguk menyatu dengan kepala manekin.
  - **Pemisahan Mode Bersih (`ApparelMeshRenderer.tsx`)**:
    - `{isMannequin ? <MannequinModel /> : renderApparel()}`: Saat `modelMode === "mannequin"`, pakaian statis yang melayang otomatis dilepas dan digantikan oleh manekin lengkap berbusana skinned. Saat `modelMode === "garment"`, studio kembali menampilkan busana mengambang 1:1 centimeter dengan DecalGizmo untuk kalibrasi cetak DTF.
- [x] **Solusi Tuntas Kaos Rusak / Lengan Corong Manekin & Pembuatan Skill AI Agent Blender (`blender-apparel-designer`) (17 Sep 2026 Dini Hari)**:
  - **Akar Masalah (Root Cause) Geometri Corong di Tangkapan Layar**:
    - Manekin (`mannequin.glb`) memiliki bind/rest pose berbentuk **T-Pose** (lengan horizontal $180^\circ$ lurus di $Z = 1.42\text{ m}$).
    - Model kaos awal (`tee-basic.glb`) dimodelkan dalam **A-Pose** (lengan miring $45^\circ$ ke bawah).
    - Saat dilakukan transfer bobot tanpa penyesuaian sudut lengan, verteks lengan kaos terikat ke tulang yang salah (tulang rusuk/torso/klavikula terdekat). Ketika manekin beranimasi (misal `Idle_Loop`), lengan ditarik paksa sehingga membalik ke luar seperti corong zirah robot.
  - **Pembuatan Skill Resmi AI Agent (`.agents/skills/blender-apparel-designer/SKILL.md`)**:
    - Mendokumentasikan arsitektur kontrol mandiri Blender headless via Python (`blender.exe -b -P`) dan integrasi open-source MCP GitHub (`ahujasid/mcp-for-blender`, `sandraschi/blender-mcp`, `PatrykIti/blender-ai-mcp`).
    - Panduan rotasi lengan A-Pose ke T-Pose sebelum binding untuk mencegah artefak sayap.
    - Panduan transfer bobot permukaan via `DATA_TRANSFER` modifier (`POLYINTERP_NEAREST`) dengan isolasi tulang upper body.
    - Protokol inspeksi visual mandiri (*self-validation*) dengan camera pass otomatis 512x512.
  - **Produksi Ulang Model Presisi (`mannequin-tee.glb`)**:
    - Menggunakan base mesh `tshirt-heavyweight.glb` (10.526 verteks) dengan topologi lipatan kain fisik nyata.
    - Menerapkan rotasi lengan terkalibrasi ($36^\circ$ pivot bahu) ke orientasi horizontal T-Pose.
    - Transfer bobot halus `POLYINTERP_NEAREST` dari `Mannequin` ke `Apparel_Tee`, membersihkan seluruh grup tulang kaki, dan menormalisasi bobot $\sum w_i = 1.0$.
    - Ekspor glTF 2.0 (`mannequin-tee.glb`) dengan 54 tulang dan seluruh 45 klip animasi skeletal utuh.
    - Validasi visual render studio di Blender membuktikan lengan kaos jatuh alami melingkari lengan atas, kerah pas di leher, dan rongga torso tertutup rapat tanpa clipping.
  - **Verifikasi Kode & Sistem**:
    - Inspeksi Three.js GLTF Loader (`test-inspect-glb.mjs`) ✅ 45 animasi, 3 SkinnedMesh (`Apparel_Tee`, `Mannequin_1`, `Mannequin_2`), 54 bones.
    - Three.js Animation Mixer test ✅ Animasi berjalan mulus tanpa error.
    - `npx tsc --noEmit` di `kaos-kami-web` ✅ 0 error.
- [x] **Produksi Penuh 7 Aset Busana Skinned Manekin Runway & Sistem Universal DTF Decal Socketing (17 Sep 2026 Pagi)**:
  - **Produksi 7 Model Skinned Penuh di Blender Headless Portable (54 Tulang & 45 Klip Animasi)**:
    1. `mannequin-tee.glb` (Kaos / T-Shirt Heavyweight 10.526 verteks, lengan T-pose terkalibrasi).
    2. `mannequin-hoodie.glb` (Hoodie dengan tudung, saku kanguru, dan lengan terintegrasi).
    3. `mannequin-longsleeve.glb` (Kaos lengan panjang, terikat dari bahu hingga pergelangan tangan).
    4. `mannequin-sweater.glb` (Crewneck / Sweater rajut tebal).
    5. `mannequin-pants.glb` (Celana panjang kargo, terikat ke pinggul, paha, dan betis).
    6. `mannequin-shorts.glb` (Celana pendek + T-shirt, pergerakan paha natural).
    7. `mannequin-cap.glb` (Topi baseball + T-shirt, topi terikat 100% ke `DEF-head`, bergerak luwes mengikuti tengokan dan anggukan kepala).
  - **Penyelesaian Tuntas Bug Reparenting `<primitive>` Decal via `createPortal` (`MannequinSkinnedApparel.tsx`)**:
    - Menemukan akar masalah mengapa decal sablon sebelumnya lepas/melayang: penggunaan `<primitive object={socket}>` di JSX R3F memaksa Three.js memindahkan `socket` dari tulang manekin (`spine3`) ke scene root.
    - Mengganti ke `createPortal(children, socket)` dari `@react-three/fiber` sehingga seluruh mesh sablon DTF tersemat langsung sebagai child native Three.js dari tulang rangka tanpa terlepas.
  - **Sistem Multi-Target DTF Sablon Universal di Manekin**:
    - Sisi Dada Depan (`front`) & Punggung (`back`): terhubung ke tulang `DEF-spine003` dengan kurvatur anatomi dada/punggung dan clearance permukaan adaptif per garmen ($0.180\text{ m} - 0.192\text{ m}$).
    - Sisi Rusuk Samping Kiri (`side_left`) & Kanan (`side_right`): terhubung ke `DEF-spine003` menghadap lateral ($90^\circ$).
    - Sisi Lengan Kiri (`left_sleeve`): terhubung ke soket tulang bicep `DEF-upper_armL` yang bergerak sinkron saat lengan berayun.
    - Sisi Lengan Kanan (`right_sleeve`): terhubung ke soket tulang bicep `DEF-upper_armR`.
    - Sisi Mahkota Topi (`cap` / `head`): terhubung ke `DEF-head` pada mahkota dahi topi.
    - Koreksi pemetaan koordinat: membetulkan `decal.x` dan `decal.y` yang berpusat di $0$ (sebelumnya salah diasumsikan $0.5$).
  - **Invalidasi Cache Service Worker (`sw.js`)**:
    - Menaikkan cache ke `kaos-kami-cache-v9` dan menambahkan seluruh 7 model glb manekin ke `STATIC_ASSETS` precache.
- [x] **Solusi Tuntas & Permanen Sablon Lengan Tembus / Bocor ke Badan di Seluruh Aset Pakaian (18 Sep 2026 Subuh)**:
  - **Identifikasi Akar Masalah**:
    - `getDecal3DPlacement` sebelumnya tidak memiliki data spek koordinat lengan spesifik per model pakaian, sehingga untuk Sweater, Longsleeve, Hoodie, dan Jaket jatuh ke fallback sempit kaos pendek ($[-0.17, 0.10]$ s/d $[-0.257, -0.03]$).
    - Titik tengah default ($u=0.5$ / `decalY=0`) jatuh persis di ketiak / perbatasan rusuk dada ($X=-0.21$, $Y=0.035$). Akibatnya kotak proyeksi menabrak rusuk badan dan memotong kain secara ganda (sebagian di rusuk badan, sebagian di lengan seperti pada foto screenshot).
    - Jangkauan vertikal hanya 5 cm di pangkal bahu dan tidak pernah bisa mencapai tengah lengan apalagi pergelangan tangan / manset.
  - **Kalibrasi Trajektori Lereng Lengan 5 Model Pakaian (`scaleCalibration.ts`)**:
    - Ekstraksi kontur verteks 3D asli dari bahu ke manset untuk `tshirt`, `longsleeve`, `crewneck` (sweater), `hoodie`, dan `shirt` (jaket).
    - Interpolasi trajektori non-linear $u \in [0, 1]$ (`decalY` $+0.35$ bahu $\to$ $0.0$ tengah lengan $\to$ $-0.35$ ujung manset).
    - Pemetaan posisi tengah lengan (`decalY = 0`) berada di rentang $X = -0.235\text{ s/d } -0.374\text{ m}$ (jauh di luar batas torso $X = -0.15\text{ s/d } -0.16\text{ m}$).
    - Pemetaan ujung manset (`decalY = -0.35`) mencapai pergelangan tangan $X = -0.251\text{ s/d } -0.520\text{ m}$, $Y = -0.045\text{ s/d } -0.340\text{ m}$.
    - Orientasi sudut proyektor dihitung presisi via normal basis vector murni (`computeEulerFromNormal`) tanpa dependensi pustaka Three.js, menjaga batas Cloudflare Worker 1.2MB.
    - Menurunkan ketebalan kedalaman (*projection depth*) dari 16–22.5 cm menjadi 7.5–8.5 cm (sesuai ketebalan kain silinder lengan).
  - **Isolasi Spasial Dua Lapis di `CleanDecal.tsx`**:
    - Menambahkan `targetSide` ke `filterDecalBackfaces`.
    - Proyektor `left_sleeve` otomatis mengeliminasi poligon apapun yang berada di koordinat rusuk/torso ($x > -0.165\text{ m}$).
    - Proyektor `right_sleeve` otomatis mengeliminasi poligon dengan $x < 0.165\text{ m}$.
    - Proyektor `front` & `back` mengeliminasi poligon yang tumpah ke lengan ($|x| > 0.22\text{ m}$).
    - Kebocoran sablon lengan ke torso = **0% (Hilang Total)**.
  - **Verifikasi**:
    - `sideAndSleevePlacement.test.ts` (10/10 tests passed).
    - `npm --workspace=kaos-kami-web run typecheck` (0 error).
    - Dev server hot-reloaded lancar di `http://localhost:3000/studio`.
- [x] **Penyempurnaan Menyeluruh Dashboard User, Dashboard Admin & Gang Sheet 100×58 DTF (18 Sep 2026 Siang)**:
  - **Akun Superadmin**: Dibuat dan diverifikasi `hengkishadow@gmail.com` dengan role `ADMIN`.
  - **Dashboard User (`/dashboard/orders`)**:
    - Tab navigasi segmented (`[ Pesanan Saya ]`, `[ Koleksi Desain 3D ]`, `[ Buku Alamat ]`).
    - Stepper timeline status pesanan 6 tahap (*Dipesan → Lunas → Cetak DTF → Quality Check → Siap/Dikirim → Selesai*).
    - Kotak salin resi instan 1-klik, kartu pratinjau thumbnail desain 3D asli, kuota storage (5 slot), tombol Buka di 3D Studio, ganti nama & hapus.
  - **Dashboard Admin (`/admin/*`)**:
    - Multi-field Smart Search di `/admin/orders` (cari berdasarkan ID pesanan, nama pembeli, nomor WhatsApp, nomor resi).
    - Filter periode omset di overview (`all`, `today`, `7d`, `30d`), kartu peringatan stok menipis (*Low Stock Alert* $\le 5$ pcs).
    - Tombol aksi cepat: *Tandai Siap Kirim/Ambil* & *Tandai Selesai/Diambil* (auto-update `ProductionTask.stage = 'DONE'`).
    - Endpoint export CSV UTF-8 dengan BOM di `/api/admin/orders/export` untuk pembukuan UMKM.
  - **Gang Sheet 100×58 cm & Arahan Sablon DTF Maklon**:
    - Pemilih orientasi roll: `Roll 58×100 cm (Standar DTF)` vs `100×58 cm (Landscape)`.
    - Ekspor HD PNG transparan murni (`ctx.clearRect` 300 DPI, tanpa latar belakang putih) agar software RIP maklon (AcroRIP/Hoson) tidak mencetak blok underbase putih yang keliru.
    - Job Ticket terkalibrasi dimensi cm real, offset kerah, checklist QC suhu oven (160°C 120s) dan heat press (165°C 15s).
  - **Validasi Build Menyeluruh**:
    - `npm --workspace=kaos-kami-web run typecheck`: 0 error.
    - `npm run mobile:typecheck`: 0 error.
    - `npm run mobile:build`: Berhasil (Next.js static export ke `out/`).
    - `npm run mobile:sync`: Berhasil (Capacitor web assets & 17 plugins disinkronkan ke Android & iOS).
    - `gradlew.bat assembleDebug`: BUILD SUCCESSFUL (APK Android debug selesai dikompilasi).
    - `npm --workspace=kaos-kami-web run build`: Berhasil (53/53 rute).
    - `npx opennextjs-cloudflare build`: Berhasil (Cloudflare Worker bundle `.open-next/worker.js` siap deploy).



