# 📜 MASTER BUILD PROGRESS TRACKER — KAOS KAMI
**Project:** Kaos Kami — 3D Interactive Apparel E-Commerce & DTF Sablon Platform  
**Target:** Kota Makassar, Sulawesi Selatan  
**Repository:** `https://github.com/Hengki-Setiawan/Kaos-Kami.git`  
**Last Updated:** 27 September 2026 (WITA)

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

---

## 🧪 STATUS VALIDASI SISTEM
* **TypeScript Compiler (`tsc --noEmit`)**: 0 error (100% lolos).
* **Vitest Test Suite (`npm test`)**: 24 test files, 169 tests passed (100% lolos).
* **Database Sensus Turso**: 13 tabel diverifikasi (0 foreign key error, 0 orphan payment, 0 kupon overuse, 0 stok negatif).
* **Audit 3 Pilar Internal Toko**: 30 skenario lulus (Produksi, Logistik, Admin RBAC).
* **Domain E (Live Chat Kamito)**: 12 skenario lulus (Presence, Auto-welcome, XSS sanitization, Admin reply, Unread badge).
* **Domain K (Cron & Security)**: 20 skenario lulus (Sweep, R2 Backup SQL dump 1.39MB, CSP/HSTS/COOP).
* **E2E Kasus Nyata 1 s/d 6**: 6/6 kasus lolos (Makassar Free Delivery, Pickup KM 10, DTF 30cm clamp, Gang sheet nesting, Penetration defense 7/7, Kanban 7-tahap).
* **Mobile Capacitor Suite**: TypeScript 0 error, Next.js static export build sukses, `npx cap sync android` selesai (17 plugin terbarui).
* **Dev Server**: Berjalan stabil di `http://127.0.0.1:3000`.
