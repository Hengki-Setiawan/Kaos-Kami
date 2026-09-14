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

