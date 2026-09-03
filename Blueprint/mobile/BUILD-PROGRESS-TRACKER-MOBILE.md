# BUILD PROGRESS TRACKER — MOBILE APP (BLUEPRINT M1-M10)
# Project: Kaos Kami Mobile (Capacitor 8 Enterprise Edition)
# Context: Commercial 3D Apparel Platform — Kota Makassar, Sulawesi Selatan
# Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 📌 INSTRUKSI UNTUK AI AGENT
- Berikan tanda centang `[x]` pada setiap item tugas yang telah selesai diuji.
- Perbarui tabel **Worklog Harian** di bagian bawah setiap kali mengakhiri sesi kerja.
- Uji coba secara berkala pada simulator Android/iOS atau perangkat fisik.

---

## 🏗️ PHASE 1: ARSITEKTUR & CAPACITOR 8 BRIDGE (M1)
- [x] Konfigurasi `next.config.mjs` dengan mode static export (`output: 'export'`)
- [x] Inisialisasi `@capacitor/core` dan `@capacitor/cli` versi 8.5.1
- [x] Konfigurasi `capacitor.config.ts` terpadu dengan appId `id.makassar.kaoskami`
- [x] Setup proyek Android di Android Studio (`npx cap add android` + 14 Native Plugins)
- [x] Implementasikan `NativeBridge` tersentralisasi dengan safe web fallback (Haptics, StatusBar, KeepAwake, Biometrics, Camera, Share, Network, Push)
- [x] Setup otomasi sinkronisasi 3D models (`scripts/sync-assets.mjs`)
- [x] Verifikasi build statis Next.js `npm run mobile:build` lolos 100% (0 error)
- [x] Verifikasi sinkronisasi native `npx cap sync` sukses (0.98s)

---

## 🎨 PHASE 2: SISTEM UI NATIVE & HAPTICS 2026 (M2)
- [ ] Implementasikan design tokens OKLCH & Safe Area insets (`mobile-tokens.css`)
- [ ] Bangun komponen `BottomSheet` dengan library `vaul` (snap points 15%, 50%, 85%)
- [ ] Pasang jembatan haptics (`@capacitor/haptics`) pada seluruh CTA dan gesture
- [ ] Bangun `HapticButton` dengan animasi spring scale `0.96` via Framer Motion
- [ ] Bangun Bottom Tab Bar (5 Tab: Home, Studio 3D, Katalog, Pesanan, Profil)
- [ ] Implementasikan `ColorSwatchPicker` multi-part garment coloring
- [ ] Lakukan Blind Test 10 detik (memastikan rasa 100% native tanpa browser artifacts)

---

## 👕 PHASE 3: 3D STUDIO MOBILE PERFORMANCE & GIZMO (M3)
- [ ] Implementasikan Adaptive Mobile Device Tiering (`high`, `mid`, `low`, `no-webgl`)
- [ ] Pasang On-Demand Rendering di R3F Canvas (`frameloop="demand"`)
- [ ] Listener `webglcontextlost` & pemulihan otomatis untuk mencegah crash
- [ ] Pasang `@capacitor-community/keep-awake` agar layar tidak mati saat mendesain
- [ ] Bangun Direct On-Mesh Decal Gizmo (drag, pinch to scale, rotate langsung di kain 3D)
- [ ] Kalibrasi fisik sablon DTF (clamp maksimal 30.0 cm) dengan haptic snap center
- [ ] Tambahkan preset animasi kain (Idle breathing, Walking, Waving wind, 360 Spin)
- [ ] Pembersihan memori GPU VRAM saat keluar dari 3D Studio

---

## 🛒 PHASE 4: ALUR TRANSAKSI & DUITKU PAYMENT POP (M4)
- [ ] Store keranjang belanja lokal dengan Optimistic UI (0 ms response)
- [ ] Checkout Sheet 3-Langkah (Alamat, Opsi Makassar, Pembayaran)
- [ ] Integrasi Duitku v2 Pop Modal (`duitku.js`) & In-App Browser dengan deep link return (`kaoskami://payment/callback`)
- [ ] Intersepsi skema URL E-Wallet & QRIS Indonesia (`shopeeid://`, `gojek://`, `dana://`, `bca://`)
- [ ] Konfigurasi opsi pengiriman Makassar (Workshop Tamalanrea Rp 0, Maxim COD, Flat Rate Rp 15.000)
- [ ] Integrasi WhatsApp Fonnte fail-safe untuk pengiriman invoice sablon

---

## 📱 PHASE 5: KAPABILITAS HARDWARE & OFFLINE-FIRST (M5)
- [ ] Setup database SQLite lokal di HP via `@capacitor-community/sqlite`
- [ ] Implementasikan antrean mutasi offline (*Sync Queue*) dengan network listener
- [ ] Descaler gambar stiker otomatis ke 4K/2K sebelum upload untuk mencegah OOM
- [ ] Integrasi autentikasi biometrik (FaceID / Fingerprint) via `@aparajita/capacitor-biometric-auth`
- [ ] Integrasi Native Share Sheet untuk membagikan tautan desain ke WhatsApp & IG Story
- [ ] Integrasi MLKit barcode scanner untuk scan QRIS & Job Ticket workshop

---

## 🚢 PHASE 6: PERFORMA, KEAMANAN & CI/CD PIPELINE (M6)
- [ ] Profiling performa (Cold start < 2.0 detik, RAM < 380MB di 3D Studio)
- [ ] Konfigurasi Proguard & R8 rules di Android untuk melindungi Three.js dan Capacitor
- [ ] Setup pipeline CI/CD GitHub Actions untuk build dan signing otomatis `.aab` dan `.ipa`
- [ ] Persiapan Google Play Data Safety & Apple App Store Privacy declarations
- [ ] Pengujian internal di minimal 5 jenis HP fisik (iPhone, Redmi, Samsung, Infinix, Pixel)

---

## 📷 PHASE 7: AR VIRTUAL TRY-ON LITE & CAMERA (M7)
- [ ] Pasang kamera passthrough 720p 60 FPS dengan panduan siluet bahu transparan
- [ ] Proyeksi transparan model 3D di atas feed video pengguna
- [ ] Penyesuaian pencahayaan real-time (DirectionalLight estimation)
- [ ] Tombol Shutter 1-ketuk untuk mengambil foto selfie dan membagikannya ke WhatsApp Status
- [ ] Tombol Flip Kamera (Depan / Belakang)

---

## 💰 PHASE 8: MONETISASI, ADS & B2B TECH PACK (M8)
- [ ] Generator dokumen PDF B2B DTF Sablon Tech Pack (koordinat CM, printhead, suhu press)
- [ ] Konfigurasi Google Play Billing & Apple In-App Purchase untuk Pro Export (tanpa watermark)
- [ ] Integrasi Rewarded Video Ads (Facebook Audience Network / AdMob) untuk pengguna gratis
- [ ] Sistem watermark otomatis pada ekspor gratis

---

## 🏝️ PHASE 9: DYNAMIC ISLAND & MATERIAL YOU (M9)
- [ ] Integrasi iOS Live Activities (`ActivityKit`) untuk tracking status sablon DTF di Dynamic Island
- [ ] Integrasi Lock Screen Widget progres pesanan
- [ ] Android Quick Settings Tile untuk akses instan ke 3D Studio dari notification shade
- [ ] Dukungan warna dinamis Android Material You berdasarkan wallpaper HP

---

## 🌐 PHASE 10: KONTRAK API & TURSO EDGE SYNC (M10)
- [ ] Endpoint katalog hemat data seluler (`GET /api/mobile/catalog`) dengan `304 Not Modified`
- [ ] Endpoint checkout ringkas (`POST /api/mobile/orders/checkout`)
- [ ] Endpoint polling status pesanan ultra-lean (< 500 bytes) untuk Live Activities
- [ ] Registrasi token push notifications FCM/APNs
- [ ] Validasi latensi sub-50ms Turso libSQL Edge di wilayah Indonesia

---

## 📝 WORKLOG HARIAN

| Tanggal | Fase | Tugas yang Diselesaikan | Kendala / Catatan | Status |
| :--- | :--- | :--- | :--- | :---: |
| **03 Sep 2026** | **Init** | Pembuatan 10 Master Blueprint Mobile (M1 s/d M10) | Sukses terstruktur di Blueprint/mobile | 🟢 Ready |
| **03 Sep 2026** | **Phase 1 (M1)** | Arsitektur Monorepo, Setup Capacitor 8, 14 Native Plugins, Static Export, Sync Android | Build 100% lolos 0 error, sync sukses | 🟢 Selesai |
| **03 Sep 2026** | **Expansion** | Ekspansi Suite Menjadi 10 Master Blueprint Mobile (M1 s/d M10): Riset Kompetitor, AR Lite, B2B Tech Pack, Dynamic Island, Duitku v2 Pop Modal, & Single-Repo Dual-Build | Hasil riset online & sinkronisasi Duitku selesai diintegrasikan | 🚀 Expanded |
