enggka 

# 🎨 BLUEPRINT MASTER AUDIT UI/UX & MASTER SISTEM DESAIN HIGH-CRAFT

## Analisis Forensik 36 Area Website, Riset Standar Startup Kelas Dunia (Linear/Raycast/Stripe), Integrasi Skill GitHub (ui-craft, ibelick, emil-design-eng), dan Konstitusi Rombak Total 100%

**Project:** Kaos Kami — 3D Interactive Apparel E-Commerce & DTF Sablon Platform
**Target Lokasi:** Workshop UMKM Kota Makassar, Sulawesi Selatan
**Tanggal Rilis Dokumen:** 04 Oktober 2026 (WITA)
**Status:** DOKUMEN MASTER LENGKAP 100% SELURUH WEBSITE (SSOT) — TIDAK BOLEH DIRINGKAS

---

## 1. 📌 RINGKASAN EKSEKUTIF & CAKUPAN 100% END-TO-END

Berdasarkan audit kritis terhadap **seluruh isi platform Kaos Kami** (menggabungkan 30 screenshot yang dikirim dan 6 rute publik lanjutan yang telah diaudit langsung di kode sumber), dipastikan bahwa **PEROMBAKAN INI MENCAKUP 100% SELURUH WEBSITE, BUKAN HANYA DASHBOARD!**

Sistem Kaos Kami memiliki fondasi teknis yang kuat (Turso libSQL, Drizzle ORM, Three.js 3D WebGL, Duitku sandbox payment, Cloudflare Turnstile, dan Fonnte WhatsApp). Namun, estetika visual di **seluruh lini aplikasi** (dari Landing Page, Studio 3D, Katalog, Kalkulator, Checkout, Invoice, hingga Dashboard User dan Admin) saat ini mengidap gejala klasik **"AI Slop"**:

1. **Penyebaran Beracun Font Display (`Syne` di 89+ Lokasi):**
   - Font `Syne 800` (yang berkarakter super-lebar/horizontal) dipaksakan di hampir setiap halaman: tombol kecil 12px, judul modal, tab drawer, judul produk katalog, langkah kalkulator, hingga faktur cetak! Akibatnya, teks terlihat memanjang kaku seperti balok hitam, menabrak batas container (*text clipping*), dan menghabiskan ruang horizontal.
2. **Kejenuhan Warna Monoton Beige / Warm Sand:**
   - Dari Landing Page, Footer, hingga sub-halaman publik, seluruhnya dilumuri warna krem/pasir yang sama tanpa ritme visual, terkesan seperti formulir kantor kelurahan tua, bukan clothing brand streetwear modern.
3. **Admin Dashboard Mengalami Cognitive Overload (Penumpukan Konten):**
   - Melanggar prinsip *Progressive Disclosure* (paragraf template alasan penolakan 300 DPI diulang 25 kali di layar utama).
   - Kanban 7-kolom mengalami ketimpangan ruang (5 kolom kosong memakan 65% layar, sementara kolom aktif terhimpit).
   - Catatan forensik teknis/developer bercampur baur dengan data operasional harian workshop.
4. **User Dashboard Kehilangan Nuansa Premium & Karakter 3D:**
   - Bocornya fitur developer (*testing mode banner* dan toggle persona) ke muka pelanggan asli.
   - Hilangnya esensi 3D di halaman kunci (kartu koleksi desain hanya menampilkan kotak abu-abu dengan lingkaran putih polos).
   - Status pesanan menyerupai struk kasir teks mentah (deretan 14 baris nomor) tanpa timeline/stepper visual yang modern.
5. **Cacat Ergonomi & Kebocoran Privasi (*Bugs & Leakage*):**
   - Modal Login dan Persona Switcher terpotong di tepi bawah taskbar pada laptop standar 768p/1080p.
   - Pilihan ukuran/kain di Studio 3D tenggelam/terpotong di bawah swatch warna.
   - Tombol manajemen internal toko (`PANEL ADMIN OPS`, `PAJANG DI ETALASE`) bocor ke layar pembeli biasa.
   - Data produk etalase mengalami *copy-paste mismatch* (foto Jaket Tactical dan Sweater Crewneck diberi judul teks *"Kaos Polos Combed 24s"*).

Dokumen ini menjadi **Cetak Biru Tunggal (SSOT)** untuk merombak total 36 area antarmuka tersebut tanpa ada satu pun halaman yang tertinggal.

---

## 2. 🌐 RISET GLOBAL: FONDASI ANTI-AI-SLOP & HIGH-CRAFT DESIGN

Riset internet dan telaah repositori open-source terkemuka menunjukkan bahwa antarmuka AI yang buruk memiliki tanda-tanda yang seragam (*tells*). Untuk menghasilkan antarmuka kelas dunia (*production-grade craft*), Kaos Kami mengadopsi 5 pilar repositori rujukan internasional:

### A. Referensi Repositori & Skill Desain Terbaik di Dunia

1. **`educlopez/ui-craft` (Eduardo Lopez — Adversarial Design Critique):**
   - **Sistem Evaluasi Heuristik & Hukum Desain:** Menguji UI terhadap 10 Heuristik Jakob Nielsen dan 6 Hukum Desain Klasik (*Fitts, Hick, Doherty, Cleveland-McGill, Miller, Tesler*).
   - Memberikan label dampak bisnis nyata: `blocks-conversion`, `adds-friction`, `reduces-trust`.
2. **`ibelick/ui-skills` (`baseline-ui` — Julien Thibeaut):**
   - **Deslopping Engine & Motion Constraints:** Standar pembersihan UI dari artefak AI, membatasi animasi murni pada `transform` dan `opacity` (nol layout thrashing), serta menghadirkan mikro-interaksi taktil yang memukau.
3. **`emilkowalski/skills` (`emil-design-eng` + `apple-design` — Emil Kowalski, ex-Vercel & Linear):**
   - **Fisika Pegas (Spring Physics) & Perceived Performance:** Animasi wajib di bawah 300ms, hanya memodifikasi `transform` dan `opacity` (nol layout thrashing GPU).
   - **Aturan Gerak:** Dilarang menganimasikan `scale(0)` (wajib dari `scale(0.9)` + fade agar tidak distorsi). Tipografi optikal: tracking rapat di heading besar, longgar di teks kecil.
4. **`nutlope/hallmark` (Hassan El Mghari — Together AI):**
   - **57 Slop-Test Gates & 21 Macrostructures:** Menghapus kebiasaan LLM mengeluarkan layout identik (hero + 3 kolom + footer).
   - Mengharamkan *purple-gradient hero*, *nested cards*, *badge soup*, *side-stripe cards*, dan *Inter-everywhere*.
5. **`rauno.me/craft` (Rauno Freiberg — Design Engineer Vercel):**
   - **Invisible Details & Calm Data:** Antarmuka harus tenang (*calm*). Informasi yang padat tidak boleh diterjemahkan menjadi visual yang ramai. Hirarki dibangun oleh ruang kosong (*whitespace*) dan kontras tipografi, bukan border kotak-kotak.

---

## 3. 🚀 STANDAR STARTUP KELAS DUNIA 2026: THE LINEAR, RAYCAST & STRIPE PLAYBOOK

Bagaimana startup elit (Linear, Raycast, Stripe, Vercel, Supabase, Cron) membuat antarmuka yang terasa **sangat mahal, cepat, dan profesional**?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ PILAR ANATOMI STARTUP KELAS DUNIA (LINEAR / RAYCAST / STRIPE)            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Surface Ladder (Tangga Kedalaman):                                       │
│    Tidak menggunakan bayangan hitam pekat atau border tebal. Kedalaman      │
│    dibangun lewat tangga abu-abu halus (Background #09090B -> Card #121215  │
│    -> Hover #18181B) dengan hairline border 1px rgba(255,255,255,0.06).     │
│                                                                             │
│ 2. Single Electric Accent:                                                  │
│    Mengharamkan warna-warni pelangi. 95% antarmuka bernuansa monokromatik   │
│    tenang (slate/zinc), dan hanya 1 warna aksen menyala (Signal Tangerine   │
│    #F97316) yang memandu mata user ke Primary Action.                       │
│                                                                             │
│ 3. Bento Grid & Asymmetrical Rhythm:                                        │
│    Meninggalkan grid 3-kolom simetris yang membosankan. Informasi disusun   │
│    dalam kotak modular Bento yang memiliki ukuran bervariasi sesuai bobot   │
│    informasinya.                                                            │
│                                                                             │
│ 4. Zero Useless Microcopy:                                                  │
│    Tidak ada teks basa-basi ("Selamat datang di toko kami", "Silakan klik").│
│    Setiap kata bersifat deklaratif, padat, dan langsung ke tujuan.          │
│                                                                             │
│ 5. Perceived Performance (<200ms Spring):                                   │
│    Antarmuka merespons secara instan. Drawer dan modal meluncur dengan      │
│    fisika pegas tanpa lag, memberikan rasa taktil seperti menyentuh benda   │
│    fisik nyata.                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ⚖️ 6 HUKUM DESAIN KLASIK & EVALUASI HEURISTIK (`ui-craft` INTEGRATION)

Diadaptasi dari framework `educlopez/ui-craft` dan Nielsen Norman Group:

| Hukum Desain                | Definisi & Prinsip                                                                                       | Pelanggaran di Kaos Kami Saat Ini                                                                                    | Solusi Rombak Baru                                                                                       |
| :-------------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Hukum Fitts**       | Waktu untuk mencapai target berbanding lurus dengan jarak dan berbanding terbalik dengan ukuran.         | Tombol utama checkout & ATC di mobile terhimpit di bawah swatches warna (`blocks-conversion`).                     | Pasang Sticky Bottom Action Bar besar yang selalu berada di zona jangkauan jempol (*thumb zone*).      |
| **Hukum Hick**        | Waktu yang dibutuhkan untuk membuat keputusan meningkat seiring bertambahnya pilihan.                    | Di Studio 3D ada 6 tombol berdesakan di header; di halaman review ada form dropdown di 25 kartu (`adds-friction`). | 1 Layar = 1 Aksi Utama. Form detail dan pilihan sekunder disembunyikan di Slide-over Drawer.             |
| **Hukum Miller**      | Manusia hanya mampu memproses 7 ± 2 potongan informasi sekaligus.                                       | Halaman`/dashboard/orders` menampilkan deretan 14 baris nomor teks nota minimarket (`reduces-trust`).            | Chunking informasi: Kelompokkan 14 baris tersebut ke dalam**Visual Order Stepper 5 Tahap**.        |
| **Doherty Threshold** | Produktivitas melonjak saat sistem dan penggunanya berinteraksi dengan jeda < 400ms.                     | Modal login dan drawer terasa berat karena font display Syne memicu layout recalculation lambat.                     | Animasi spring <200ms GPU-accelerated, font geometris ringan yang render dalam 0 frame delay.            |
| **Hukum Tesler**      | Setiap sistem memiliki tingkat kompleksitas mendasar yang tidak dapat dikurangi, hanya bisa dipindahkan. | Kerumitan kalkulasi 300 DPI, lebar sablon 30cm, dan margin gang sheet dibebankan ke teks layar user.                 | Sistem menyerap kerumitan tersebut di backend; user hanya melihat feedback visual hijau/merah sederhana. |
| **Cleveland-McGill**  | Mata manusia paling akurat menilai posisi pada skala umum dibanding menilai warna/area.                  | Data stok dan omset dinilai lewat badge warna campur aduk.                                                           | Gunakan posisi tabular numerik (`font-mono tabular-nums`) dan grafik batang proporsional.              |

---

## 5. ⚔️ ANATOMI 7 DOSA BESAR "AI SLOP" VS HIGH-CRAFT CURE

```
[ AI SLOP (Generik / Melelahkan) ]          [ HIGH-CRAFT PREMIUM (Linear / Apple) ]
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ [Badge 1] [Badge 2] [Badge 3]        │     │ Pesanan #KK-8812   ·   Rp 185.000    │
│ ┌──────────────────────────────────┐ │     │ 14:20 WITA  ·  Kaos Heavyweight      │
│ │ Card dalam Card (Border ganda)   │ │     │                                      │
│ │ "(Catatan: file harus 300 DPI    │ │     │ [ Sablon DTF Dada A3 ]   ● Sedang Cetak│
│ │ sesuai aturan maklon sablon)"    │ │     │                                      │
│ │ [Tolak] [Alasan Dropdown] [Teks] │ │     │ [Detail ↗]           [Setujui Cetak] │
│ └──────────────────────────────────┘ │     └──────────────────────────────────────┘
│ * Banyak badge warna-warni campur aduk│     * Satu bidang datar, batas tipis/hairline
│ * Teks mengajari hal yang sudah jelas │     * Copy singkat, tegas, informatif
│ * Semua tombol/form ditumpuk di kartu │     * Form aksi sekunder masuk ke Slide Drawer
```

### Rincian 7 Dosa Besar & Solusinya:

#### Dosa 1: Card-in-Card ("Nested Mud Anti-Pattern")

* **AI Slop:** Kartu dibungkus kartu, dibungkus *container* ber-border lagi, masing-masing punya border abu-abu dan bayangan tebal.
* **Solusi Premium:** **Satu Lapisan Datar (*Single Surface*)**. Hirarki dibangun dengan kontras tipografi (*font-weight* dan *font-size*), bukan membuat kotak di dalam kotak. Bayangan (*shadow*) hanya boleh dipakai untuk elemen yang benar-benar mengambang (*flyout*, *popover*, *modal*).

#### Dosa 2: Badge Soup & Eyebrow Mania

* **AI Slop:** Setiap baris teks ditempeli *pill badge* warna-warni (hijau, kuning, biru, merah) dan teks kapital kecil di atasnya (`01 / PILAR WORKSHOP`). Akibatnya mata user mengalami *visual fatigue* (buta warna karena semua berteriak minta diperhatikan).
* **Solusi Premium:** Gunakan teks biasa dengan warna abu-abu netral (`text-zinc-500`). Status cukup ditandai dengan **satu titik warna minimalis (*status dot*)** berukuran 6px (hijau untuk selesai, kuning untuk proses, merah untuk kendala). Badge pil hanya dipakai jika ada interaksi klik/filter.

#### Dosa 3: Explaining the Obvious (Boilerplate Diarrhea)

* **AI Slop:** Teks penjelasan teknis yang berulang-ulang di layar utama:
  - `(gap 10mm, margin 10mm pada gang sheet)`
  - `(angka '-' berarti tak-ada-data dari sistem)`
  - `(simpan ke R2 cms/hero.json)`
  - Mengulang 25 kali di setiap kartu antrean: *"Pilih alasan penolakan di bawah ini jika file tidak memenuhi standar 300 DPI"*.
* **Solusi Premium (Linear Style):** **Copy deklaratif & ringkas**. Tombol aksi cukup bertuliskan kata kerja tegas: `Setujui`, `Tolak`. Jika butuh form alasan penolakan, buka via **Slide-over Drawer**, jangan jejalkan form dropdown dan textarea ke dalam kartu ringkasan.

#### Dosa 4: Font Display Lebar untuk Tabel & Angka

* **AI Slop:** Menggunakan font display/sans tebal pada tabel angka yang menyebabkan teks memanjang, angka tidak rata (*tabular misalignment*), dan layar cepat penuh.
* **Solusi Premium:** Gunakan font **Monospace Tabular** (`font-mono font-variant-numeric: tabular-nums`) untuk kode pesanan, tanggal, ukuran CM, harga Rupiah, dan status kuantitas. Angka jadi sejajar vertikal dan rapi seperti terminal Bloomberg atau Stripe Dashboard.

#### Dosa 5: Kanban Kosong yang Memakan Tempat

* **AI Slop:** Menampilkan 7 kolom penuh lebar yang sama rata, meskipun 5 kolom di antaranya berstatus kosong (0 item). Layar menjadi melar ke samping secara mubazir.
* **Solusi Premium:** **Adaptive / Auto-collapsing Kanban**. Kolom yang memiliki antrean aktif tampil dominan (lebar penuh), sedangkan kolom kosong otomatis mengerut (*collapsed*) menjadi strip vertikal ramping dengan angka `(0)` yang bisa di-klik untuk *expand*.

#### Dosa 6: Bocoran Status Testing di Layar Konsumen

* **AI Slop:** Banner kuning `[Mode Testing Admin Aktif]` yang mencolok di dashboard user pembeli umum.
* **Solusi Premium:** Indikator internal hanya muncul jika user memiliki *role* tester/admin, diletakkan sebagai *pill* kecil di pojok bawah (*floating dev indicator*), bukan banner masif di atas konten utama.

#### Dosa 7: Placeholder Kotak Abu-Abu pada Desain 3D

* **AI Slop:** Di halaman koleksi desain user (`/dashboard/designs`), desain baju hanya direpresentasikan dengan kotak abu-abu datar berisi lingkaran putih. Terasa seperti wireframe belum selesai.
* **Solusi Premium:** Tampilkan **2K WebP Render Thumbnail asli** dari kaos/hoodie yang sudah disablon, lengkap dengan pencahayaan studio lembut, tekstur kain, dan sudut isometrik 3D.

---

## 6. ✍️ PEDOMAN COPYWRITING & MIKRO-COPY ANTI-SLOP (LINEAR & RESEND STYLE)

Kata-kata adalah bagian dari desain. Desain terbaik akan terlihat murahan jika dipenuhi copy generik atau penjelasan teknis berulang.

* **Dilarang Menjelaskan yang Sudah Jelas (*Explaining the Obvious*):**
  - ❌ *"Pilih salah satu opsi penolakan di bawah ini untuk menginformasikan kepada customer bahwa file tidak sesuai"*
  - ✅ Label ringkas: `Alasan Penolakan`
  - ❌ *"Masukkan email Anda pada kotak input di bawah ini"*
  - ✅ Placeholder langsung: `nama@email.com`
* **Dilarang Membocorkan Implementasi Teknis ke UI:**
  - ❌ `(gap 10mm, margin 10mm)` ➔ Cukup tampilkan visual padding di layar.
  - ❌ `(simpan ke R2 cms/hero.json)` ➔ Cukup tombol: `Simpan Perubahan`.
  - ❌ `(angka '-' berarti tak-ada-data dari Turso)` ➔ Tampilkan angka `0` atau strip tipis `-`.
  - ❌ `(UU PDP: gunakan seperlunya)` ➔ Cukup ikon gembok kecil bertuliskan `Data Terenkripsi`.
* **Kata Kerja Tegas & Spesifik (*Active Verbs*):**
  - Gunakan `Setujui Cetak`, `Tolak Desain`, `Salin Tautan`, `Buka Studio 3D`.
  - Hindari kata generik: `OK`, `Submit`, `Proses`, `Klik di Sini`.
* **Error Message yang Bertanggung Jawab (3 Bagian):**
  - 1. Apa yang terjadi (faktual, bukan meratap): *"File decal tidak terbaca."*
  - 2. Mengapa terjadi: *"Resolusi gambar di bawah 150 DPI."*
  - 3. Apa solusinya: *"Unggah file PNG transparan minimal 1500 x 1500 px."*
  - Dilarang keras menggunakan kata cengeng: *"Oops!"*, *"Waduh!"*, *"Something went wrong"*.

---

## 7. 🎯 BENCHMARK 3D CONFIGURATOR DUNIA (NIKE BY YOU & RIMOWA 3D)

Untuk studio 3D customizer dan representasi produk apparel, rujukan industri modern mengadopsi prinsip:

```
┌──────────────────────────────────────────────────────────┐
│  Kaos Kami  ·  Kaos Heavyweight 24s            Rp 135.000 │ <── Minimal Clean Header
├──────────────────────────────────────────────────────────┤
│                                                          │
│                     [ MODEL 3D KAOS ]                    │
│                  (Orbit 360°, Zoom, Pan)                 │
│                                                          │
│  [↻ Reset Kamera]                          [+] Upload Sablon │ <── Floating Ghost HUD
│  [◐ Depan / Belakang]                      [▲] Ganti Model   │     (Backdrop-blur glass)
├──────────────────────────────────────────────────────────┤
│  [ Warna Kaos: ● ● ● ● ]  |  [ Sablon: DTF A3 ]  | [ Checkout → ] │ <── Bottom Dock (Mobile Friendly)
└──────────────────────────────────────────────────────────┘
```

1. **Kanvas 3D adalah Raja (*Hero Canvas*):**
   - Kanvas 3D mengisi *full viewport* secara imersif, bukan terjepit di dalam kolom kartu sempit.
2. **HUD Melayang & Transparan (*Floating Glass HUD*):**
   - Kontrol kamera (Reset, Putar Depan/Belakang, Ganti Model) diletakkan sebagai tombol *ghost floating* tipis dengan latar belakang kaca blur halus (`backdrop-blur-md bg-black/20`).
3. **Bottom Dock / Sheet untuk Konfigurasi:**
   - Di mobile, semua pilihan (Warna, Ukuran Sablon, Posisi) berada di *bottom sheet* yang bisa di-swipe dengan satu jempol (*thumb-zone friendly*).
4. **Kalibrasi Fisik Realistis (Sablon DTF Makassar):**
   - Skala sablon tidak menggunakan slider persen tanpa arti (misal: "Ukuran: 67%").
   - Konfigurator menampilkan meteran fisik langsung: **"Lebar Sablon: 28.5 cm (DTF A3 Standard Press)"**. Begitu melebihi batas 30.0 cm, sistem memberikan snap visual & haptic lembut yang mengunci dimensi ke batas fisik heat press workshop.

---

## 8. 🎨 KONSTITUSI SISTEM DESAIN & TOKEN KAOS KAMI

### A. Palet Warna (Obsidian Neutral + Signal Tangerine)

* **Background Canvas:** `#09090B` (Dark Obsidian) / `#FAFAFA` (Light Studio) — *Dilarang pure black #000000 atau pure white #FFFFFF kaku*.
* **Surface Cards:** `#18181B` (Zinc-900) dengan border halus `#27272A` (Zinc-800) setebal 1px.
* **Primary Brand Accent:** `Signal Tangerine` (`#F97316` / `#EA580C`) — warna hangat api heat press sablon, kontras tinggi terhadap latar gelap.
* **Semantic Dots (Status 6px):**
  - Hijau Sukses / Siap Kirim: `#10B981` (Emerald-500)
  - Kuning Proses / Sedang Sablon: `#F59E0B` (Amber-500)
  - Merah Kendala / Butuh Revisi: `#EF4444` (Rose-500)
  - Abu-abu Antrean / Draft: `#71717A` (Zinc-500)

### B. Motion & Fisika Interaksi

* **Durasi:** Snappy & cepat (150ms – 250ms). Dilarang animasi lambat yang membuang waktu klik operator.
* **Easing:** Spring physics murni (`cubic-bezier(0.16, 1, 0.3, 1)` atau `ease-out`). Dilarang efek memantul liar (*bounce/elastic*).
* **Layer:** Hanya menganimasikan `opacity` dan `transform` (GPU accelerated).

### C. Strategi Dinamika Warna 2-Tone

1. **Hero & Intro (Studio Warmth):** Latar belakang studio hangat terang (`#F4F1EA`) memberikan kesan bersih dan ramah.
2. **Etalase Produk (Obsidian Exhibition):** Transisi ke kanvas gelap obsidian (`#0F0F11` / `#18181B`). Warna-warna kaos (Chalk White, Signal Tangerine, Deep Cobalt, Military Olive) akan **menyala dramatis (*pop-out*)** di atas kanvas gelap layaknya pameran galeri streetwear.
3. **Workshop & Footer (Industrial Heritage):** Nuansa arang netral dengan aksen garis tipis oranye api heat press (`Signal Tangerine #F97316`).

---

## 9. 🔬 BEDAH FORENSIK 36 AREA WEBSITE SECARA LENGKAP (30 SCREENSHOT + 6 RUTE PUBLIK)

### A. Kategori Admin Dashboard (15 Gambar)

#### 01. Dashboard Utama Overview 3 Pilar (`/admin`)

* **Status Saat Ini:** Menampilkan metrik 38 tugas cetak, 5 paket kurir, omset Rp 426,5 Jt, 4 kartu KPI, 6 kotak peringatan stok, dan tabel pesanan dalam 1 halaman.
* **Letak AI Slop:** Tumpukan card-in-card berlebihan, setiap kotak peringatan stok memiliki border tebal tersendiri, teks penjelas berulang.
* **Target Rombak:** Terapkan *Calm Executive Metrics* gaya Stripe: 3 KPI pahlawan di atas, 1 tabel antrean mendesak dengan status dot minimalis, dan panel peringatan stok yang dikelompokkan ke dalam satu tab drawer.
* **File Target:** `kaos-kami-web/src/app/admin/page.tsx`.

#### 02. Semua Pesanan Masuk 317 Order (`/admin/orders`)

* **Status Saat Ini:** Tabel raksasa 317 pesanan. Judul menggunakan font display super-lebar kapital yang memakan 20% tinggi layar. Kolom status dan aksi berdesakan.
* **Letak AI Slop:** Font display pada data tabel membuat teks sempit, badge status warna-warni campur aduk tanpa hierarki.
* **Target Rombak:** Ganti judul ke sans bersih, nomor pesanan dan harga menggunakan `font-mono tabular-nums`, pasang sticky header, dan tambahkan filter segmented horizontal (`Semua`, `Menunggu Review`, `Cetak`, `Kirim`).
* **File Target:** `kaos-kami-web/src/app/admin/orders/page.tsx` & `OrdersClient.tsx`.

#### 03. Kanban Produksi Sablon DTF 7 Kolom (`/admin/production`)

* **Status Saat Ini:** 7 kolom statis berlebar sama. Kolom 1 (*Persiapan File*) dan 7 (*Selesai*) padat, sementara kolom 2–6 kosong dengan teks berulang: *"Kosong - drag card ke sini"*.
* **Letak AI Slop:** Pemborosan 65% lebar layar untuk ruang kosong; teks placeholder monoton.
* **Target Rombak:** *Smart Adaptive Kanban* (gaya Linear). Kolom dengan antrean aktif mendapatkan lebar penuh (340px), sedangkan kolom kosong otomatis menciut (*collapsed vertical pill*) dengan angka `(0)` yang mengembang saat ada kartu di-drag ke atasnya.
* **File Target:** `kaos-kami-web/src/app/admin/production/ProductionKanban.tsx`.

#### 04. Live Chat Kamito CS Konsol (`/admin/chat`)

* **Status Saat Ini:** Avatar 3D maskot Kamito tampil baik, namun area percakapan kosong tanpa template balasan cepat atau status pelanggan.
* **Letak AI Slop:** Bidang putih polos yang tidak memandu tindakan admin.
* **Target Rombak:** Hadirkan panel ringkasan pesanan aktif pelanggan di sebelah kanan chat, tombol balasan cepat (*Quick Macros: "File sablon Anda sedang dicetak"*, *"Paket sudah diserahkan ke kurir"*), dan status kehadiran admin yang jelas.
* **File Target:** `kaos-kami-web/src/components/admin/AdminChatManager.tsx`.

#### 05. Antrean Review Desain 25 Order (`/admin/review`) — *TITIK PALING KRITIS*

* **Status Saat Ini:** 25 kartu pesanan menjejalkan dropdown alasan penolakan, textarea alasan, dan paragraf panjang teks template 300 DPI yang sama persis 25 kali di layar utama.
* **Letak AI Slop:** Bencana beban kognitif terburuk. Operator harus scroll bermeter-meter hanya untuk menyetujui cetak.
* **Target Rombak:** *Hybrid Table/Grid + Slide-over Drawer*. Setiap kartu hanya memuat foto mockup, resolusi DPI, dan 2 tombol cepat: `[✓ Setujui Cetak]` dan `[✕ Tolak]`. Mengklik tolak akan membuka Slide-over Drawer kanan dengan navigasi keyboard (`j`/`k` untuk navigasi antrean, `a` untuk approve, `r` untuk reject).
* **File Target:** `kaos-kami-web/src/app/admin/review/AdminReviewClient.tsx`.

#### 06. Gang-Sheet Builder & Nesting Packer (`/admin/gang-sheet`)

* **Status Saat Ini:** Tabel daftar pesanan yang siap susun rol 100x58cm berupa deretan checkbox tanpa preview visual.
* **Letak AI Slop:** Tampilan form teknis kaku tanpa visualisasi interaktif media cetak.
* **Target Rombak:** Tampilkan live visual canvas lembaran film 100x58cm di samping tabel, menunjukkan susunan layout sablon yang efisien dan sisa area kosong lembaran film (*waste reduction indicator*).
* **File Target:** `kaos-kami-web/src/app/admin/gang-sheet/page.tsx`.

#### 07. Hub Pengiriman & Kurir Makassar (`/admin/deliveries`)

* **Status Saat Ini:** 3 tab (Gratis Makassar, Ekspedisi, Pickup). Kartu dalam pengantaran terlalu lebar dengan tombol hijau raksasa.
* **Letak AI Slop:** Tombol aksi mendominasi seluruh visual kartu.
* **Target Rombak:** Rampingkan kartu kurir menjadi daftar ringkas dengan nama penerima, alamat singkat Makassar, tombol WhatsApp driver, dan status serah terima satu klik.
* **File Target:** `kaos-kami-web/src/app/admin/deliveries/page.tsx`.

#### 08. Ongkir & Kuota API AgenWebsite (`/admin/shipping`)

* **Status Saat Ini:** Monitor kuota API berfungsi baik, namun tabel kota tujuan tercampur dengan data testing E2E otomatis (`E2E City 20260923...`).
* **Letak AI Slop:** Bocornya data sampah testing ke antarmuka produksi.
* **Target Rombak:** Pasang toggle filter `[Data Riil Saja]` vs `[Sertakan Data Pengujian]`, rapikan tabel zona flat Makassar dan ekspedisi nasional.
* **File Target:** `kaos-kami-web/src/app/admin/shipping/page.tsx`.

#### 09. Inventaris Aset 3D GLB & Forensik (`/admin/assets`)

* **Status Saat Ini:** Sel tabel dijejali dinding teks teknis panjang (`SHA256: 7f8a...`, `glPrimitives: 1420`, lisensi CC-BY panjang).
* **Letak AI Slop:** Menampilkan data debug mentah ke dalam sel tabel utama.
* **Target Rombak:** Tampilkan hanya 5 kolom bersih: `Model`, `Kategori`, `Ukuran File`, `Status GLB`, dan `Aksi`. Pindahkan seluruh detail forensik SHA256 ke *Technical Inspector Drawer*.
* **File Target:** `kaos-kami-web/src/app/admin/assets/page.tsx`.

#### 10. Database Pelanggan & Masking PDP (`/admin/customers`)

* **Status Saat Ini:** Masking email dan no HP sudah sesuai UU PDP, namun 80% baris didominasi akun dummy testing E2E.
* **Letak AI Slop:** Tidak ada segmentasi antara pelanggan sungguhan dan bot test.
* **Target Rombak:** Tambahkan filter cepat untuk menyembunyikan akun bot (`e2***@kaoskami.test`) dan tambahkan metrik total belanja per pelanggan.
* **File Target:** `kaos-kami-web/src/app/admin/customers/page.tsx`.

#### 11. Manajemen Voucher & Kupon Promo (`/admin/coupons`)

* **Status Saat Ini:** Form pembuatan kupon berada di bagian bawah terpisah dari daftar kupon.
* **Letak AI Slop:** Formulir statis panjang yang memaksa scroll ke bawah.
* **Target Rombak:** Pindahkan form pembuatan kupon ke modal pop-up bersih atau Slide-over Drawer kanan dengan opsi kupon instan (Diskon %, Potongan Tetap, Gratis Ongkir Makassar).
* **File Target:** `kaos-kami-web/src/app/admin/coupons/page.tsx`.

#### 12. Matriks Stok 2D 1.184 Pcs (`/admin/catalog`)

* **Status Saat Ini:** Grid 12 warna x 5 ukuran sangat impresif secara data, namun sel angka dan tombol `+`/`-` terlalu rapat.
* **Letak AI Slop:** Kepadatan tanpa ruang bernapas; tabel rincian di bawahnya memanjang berlebihan.
* **Target Rombak:** Berikan padding proporsional pada sel matriks, gunakan font monospace tabular pada angka stok, dan buat input batch inline yang cepat.
* **File Target:** `kaos-kami-web/src/app/admin/catalog/page.tsx`.

#### 13. CMS Headless R2 Website (`/admin/cms`)

* **Status Saat Ini:** Fitur simpan langsung ke R2 tanpa deploy sudah sangat kuat, namun visualisasi form teks hero dan lookbook masih sederhana.
* **Letak AI Slop:** Pengeditan teks tanpa visual feedback langsung.
* **Target Rombak:** Tambahkan tab split-screen: Form editor di kiri, Live Mini Preview tampilan website di kanan sebelum dipublikasikan ke R2.
* **File Target:** `kaos-kami-web/src/app/admin/cms/page.tsx`.

#### 14. Pengaturan Sistem & WhatsApp Fonnte (`/admin/settings`)

* **Status Saat Ini:** Informasi workshop dan template pesan WA terpusat rapi, namun masih berupa teks statis textarea panjang.
* **Letak AI Slop:** Teks template terlihat seperti kode mentah tanpa visualisasi hasil kirim.
* **Target Rombak:** Hadirkan preview gelembung chat WhatsApp hijau di samping textarea, sehingga admin bisa melihat persis bagaimana pesan akan tampil di HP pembeli.
* **File Target:** `kaos-kami-web/src/app/admin/settings/page.tsx`.

#### 15. Laporan Workshop & Defect QC (`/admin/laporan`)

* **Status Saat Ini:** Laporan omset dan defect QC sablon lengkap, namun grafik batang menggunakan bar CSS statis yang kaku.
* **Letak AI Slop:** Visualisasi data tampak primitif dibanding standar dashboard SaaS modern.
* **Target Rombak:** Ganti grafik batang CSS dengan chart SVG interaktif yang memiliki hover tooltip angka Rupiah dan persentase defect.
* **File Target:** `kaos-kami-web/src/app/admin/laporan/page.tsx`.

---

### B. Kategori User Dashboard (7 Gambar)

#### 16. Pesanan Saya (`/dashboard/orders`)

* **Status Saat Ini:** Banner kuning tebal `[MODE PENGUJIAN ADMIN AKTIF]` terpampang di muka pembeli. 14 item pesanan berupa deretan teks nota kasir minimarket tanpa foto produk.
* **Letak AI Slop:** Banner debugging bocor ke konsumen; rincian pesanan berwujud struk mentah.
* **Target Rombak:** Sembunyikan banner testing ke menu terisolasi. Ganti teks rincian pesanan dengan **Visual Order Journey Stepper 5 Tahap** (*Desain Diterima ➔ Menunggu Bayar ➔ Cetak DTF ➔ QC & Jahit ➔ Siap Diantar*) dan kartu mini berfoto produk.
* **File Target:** `kaos-kami-web/src/app/dashboard/orders/OrdersClient.tsx`.

#### 17. Koleksi Desain 3D (`/dashboard/designs`)

* **Status Saat Ini:** Menampilkan kartu desain berupa kotak abu-abu datar dengan lingkaran putih polos bertuliskan `Chalk White`.
* **Letak AI Slop:** Kehilangan esensi 3D. Terasa seperti wireframe rusak yang gagal memuat gambar.
* **Target Rombak:** Ganti kotak abu-abu dengan **True 2K 3D Render Thumbnails** yang menampilkan kaos nyata bertekstur kain, pencahayaan studio, dan grafis sablon yang menempel presisi.
* **File Target:** `kaos-kami-web/src/app/dashboard/designs/DesignsClient.tsx`.

#### 18. Profil Pengguna & Buku Alamat (`/dashboard/profile`)

* **Status Saat Ini:** Kartu identitas sangat datar, bidang nomor telepon kosong, dan buku alamat memiliki ruang kosong besar.
* **Letak AI Slop:** Form dingin tanpa kepribadian; ruang kosong tidak dimanfaatkan.
* **Target Rombak:** Rapikan kartu profil dengan avatar elegan, status verifikasi nomor WhatsApp, dan buku alamat bergaya kartu pos modern dengan pin lokasi.
* **File Target:** `kaos-kami-web/src/app/dashboard/profile/ProfileClient.tsx`.

#### 19. Modal Tambah Alamat GPS (`AddressModal.tsx`)

* **Status Saat Ini:** Fitur deteksi koordinat GPS otomatis sangat canggih, namun formulir modal berpenampilan standar abu-abu kaku.
* **Letak AI Slop:** Kotak input kaku tanpa panduan visual peta.
* **Target Rombak:** Integrasikan mini visual static map pin di atas input alamat, rapikan field RT/RW dan patokan rumah khas Makassar.
* **File Target:** `kaos-kami-web/src/components/commerce/AddressModal.tsx`.

#### 20. Notifikasi Tab Toko (`/dashboard/notifications`)

* **Status Saat Ini:** Kotak putih kosong bertuliskan *"Semua sudah dibaca"*.
* **Letak AI Slop:** Empty state dingin dan steril.
* **Target Rombak:** Hadirkan ilustrasi maskot Kamito sedang tersenyum dengan teks: *"Kamu sudah up-to-date! Tidak ada pengumuman promo baru saat ini."*
* **File Target:** `kaos-kami-web/src/app/dashboard/notifications/NotificationsClient.tsx`.

#### 21. Notifikasi Tab Pribadi (`/dashboard/notifications`)

* **Status Saat Ini:** Teks datar satu baris: *"Belum ada notifikasi..."*.
* **Letak AI Slop:** Halaman mati tanpa aksi lanjutan.
* **Target Rombak:** Tampilkan ilustrasi Kamito dengan tombol ajakan bertindak: *"Belum ada pesanan aktif. Yuk mulai kustomisasi kaos pertamamu di Studio 3D!"* + tombol `[Mulai Kustomisasi 3D]`.
* **File Target:** `kaos-kami-web/src/app/dashboard/notifications/NotificationsClient.tsx`.

#### 22. Modal Switch Persona Cepat (`PersonaSwitcher.tsx`)

* **Status Saat Ini:** Transisi peran cepat, namun tombol kuning admin mendominasi dan padding bawah sangat mepet di layar laptop.
* **Letak AI Slop:** Hierarki tombol tidak seimbang; ancaman pemotongan tombol bawah.
* **Target Rombak:** Berikan padding bawah `pb-6`, buat toggle peran berbentuk segmented pill yang tenang, dan posisikan tombol akses panel admin sebagai aksi sekunder yang elegan.
* **File Target:** `kaos-kami-web/src/components/ui/PersonaSwitcher.tsx`.

---

### C. Kategori Publik & Studio (8 Gambar)

#### 23. Keranjang Belanja Slide-Over (`CartDrawer.tsx` / `keranjang belanja.png`)

* **Status Saat Ini:** Judul `KERANJANG BELANJA 0` menggunakan font display super-lebar menabrak tombol silang `(X)`. Latar drawer berupa balok putih polos 35% layar yang dingin.
* **Letak AI Slop:** Font display lebar yang berteriak; empty state kosong tanpa rekomendasi produk.
* **Target Rombak:** Ganti judul ke sans-serif bersih `Keranjang (0)`, tambahkan maskot Kamito membawa keranjang belanja, dan tambahkan rekomendasi cepat produk terlaris di bawahnya.
* **File Target:** `kaos-kami-web/src/components/ui/CartDrawer.tsx`.

#### 24. Landing Page Penuh (`/` / `layar utama.png`)

* **Status Saat Ini:** Warna dasar pasir krem (`#EDE8E3`) monoton dari atas ke bawah. Foto Jaket Tactical dan Sweater Crewneck dinamai *"Kaos Polos Combed 24s"*. Foto produk ditempeli 2 pill badge floating.
* **Letak AI Slop:** Copy-paste mismatch pada data produk; kejenuhan visual warna tunggal; badge floating mengotori estetika baju.
* **Target Rombak:** Terapkan dinamika warna 2-tone (Hero terang, Galeri Etalase gelap obsidian), perbaiki data produk katalog, dan hapus badge floating dari atas foto baju.
* **File Target:** `kaos-kami-web/src/app/page.tsx` & `StoreShowcaseSection.tsx`.

#### 25. Modal Login Idle (`AuthModal.tsx` / `login.png`)

* **Status Saat Ini:** Judul `MASUK AKUN` menggunakan font display lebar. Container form terlalu tinggi sehingga terancam terpotong di laptop resolusi standar.
* **Letak AI Slop:** Font display pada form login; tinggi modal statis kaku.
* **Target Rombak:** Ganti judul ke sans modern `Plus Jakarta Sans`, kurangi padding vertikal menjadi `p-6`, dan terapkan `max-h-[85vh]` agar adaptif di semua resolusi.
* **File Target:** `kaos-kami-web/src/components/ui/AuthModal.tsx`.

#### 26. Section Alamat Workshop & Komunitas (`ui alamat.png`)

* **Status Saat Ini:** Saat halaman di-scroll, teks judul section `KOMUNITAS` menabrak dan membayang kotor di balik navbar blur. Tombol WA berwarna hijau mint pucat tidak senada dengan aksen oranye brand.
* **Letak AI Slop:** Sticky navbar blur collision; inkonsistensi warna tombol aksi.
* **Target Rombak:** Perkuat soliditas latar navbar (`backdrop-blur-xl bg-background/85`), selaraskan warna tombol aksi ke aksen oranye brand, dan rapikan kartu workshop.
* **File Target:** `kaos-kami-web/src/components/ui/Navbar.tsx` & `AboutWorkshopSection.tsx`.

#### 27. Footer Toko & Trust Badges (`Footer.tsx` / `ui footer.png`)

* **Status Saat Ini:** Terdapat jurang ruang kosong putih raksasa antara strip 4 keunggulan dengan kolom footer. Kolom alamat workshop terlalu padat dibanding kolom lainnya.
* **Letak AI Slop:** Ketidakseimbangan vertikal (*spatial void*).
* **Target Rombak:** Rapatkan margin vertikal footer, tata kolom menjadi 4 kolom yang proporsional dengan divider hairline, dan integrasikan logo pembayaran Duitku secara elegan.
* **File Target:** `kaos-kami-web/src/components/ui/Footer.tsx`.

#### 28. Modal Login Verifying Turnstile (`AuthModal.tsx` / `ui login.png`)

* **Status Saat Ini:** Widget Cloudflare Turnstile memakan ruang vertikal 80px, memperparah pemotongan tombol `MASUK SEKARANG` di tepi bawah layar laptop.
* **Letak AI Slop:** Pemotongan aksi utama (*button clipping bug*).
* **Target Rombak:** Rampingkan container Turnstile, pastikan seluruh tombol utama dan link tamu selalu terlihat utuh di atas lipatan layar (*above the fold*).
* **File Target:** `kaos-kami-web/src/components/ui/AuthModal.tsx`.

#### 29. Panel Profil & Persona Switcher (`PersonaSwitcher.tsx` / `ui panel.png`)

* **Status Saat Ini:** Tombol kedua `DASHBOARD PESANAN SAYA` menempel persis di bibir bawah modal tanpa padding bawah (`pb-0`).
* **Letak AI Slop:** Zero-padding clipping.
* **Target Rombak:** Berikan safe bottom padding `pb-6` dan tata ulang kartu profil agar lebih tenang dan seimbang.
* **File Target:** `kaos-kami-web/src/components/ui/PersonaSwitcher.tsx`.

#### 30. Studio 3D Configurator (`/studio` / `ui studio.png`)

* **Status Saat Ini:** Tombol manajemen internal (`PANEL ADMIN OPS`, `PAJANG DI ETALASE`) bocor ke layar pembeli. Konten pilihan kain/ukuran terpotong di bawah swatches. Judul baju terpotong ellipsis (`KAOS POLOS & CUSTOM KAOS K...`).
* **Letak AI Slop:** Kebocoran kontrol internal; layout drawer overflow bug; judul baju terpotong.
* **Target Rombak:** Sembunyikan tombol admin dari pelanggan umum, buat area tengah drawer memiliki scroll internal independen (`overflow-y-auto`) agar pilihan kain tidak tenggelam, dan berikan judul baju ruang yang lega.
* **File Target:** `kaos-kami-web/src/app/studio/StudioClient.tsx` & `CustomizerDrawer.tsx`.

---

### D. Kategori Rute Publik Lanjutan (6 Area Tambahan)

#### 31. Halaman Katalog Lengkap 300+ Varian (`/catalog`)

* **Status Saat Ini:** Header `KATALOG PRODUK` dan setiap nama produk (`product.name`) menggunakan `font-display font-black uppercase text-lg line-clamp-2`.
* **Letak AI Slop:** Judul produk yang panjang menjadi balok hitam kaku dan berantakan saat membungkus ke baris kedua.
* **Target Rombak:** Ganti nama produk menjadi `Plus Jakarta Sans font-semibold text-base`, tambahkan filter pill modern (Kaos, Hoodie, Crewneck, Jaket, Topi, Celana) dan kartu produk bernuansa streetwear minimalis.
* **File Target:** `kaos-kami-web/src/app/catalog/CatalogClient.tsx`.

#### 32. Halaman Kalkulator Sablon DTF & GSM (`/kalkulator-sablon`)

* **Status Saat Ini:** Judul halaman, nomor urut langkah (`1 · Berapa tier`, `2 · Pilih ketebalan`, `3 · Placement baku`), dan tombol CTA menggunakan `font-display font-black uppercase`.
* **Letak AI Slop:** Nomor langkah dan teks tombol menjadi sangat lebar dan kaku. Tampilan tabel GSM terasa seperti dokumen spreadsheet teknis mentah.
* **Target Rombak:** Tata ulang kalkulator menjadi kartu interaktif modern: slider ukuran sablon interaktif, visualisasi kartu ketebalan GSM (Combed 30s, 24s, 20s, 16s, French Terry) yang bisa diklik, dan tombol CTA elegan menuju Studio 3D.
* **File Target:** `kaos-kami-web/src/app/kalkulator-sablon/KalkulatorSablonClient.tsx`.

#### 33. Halaman Lacak Pesanan Publik via WA OTP (`/track`)

* **Status Saat Ini:** Header `LACAK PESANAN` memakai font display besar. Form verifikasi OTP WhatsApp menggunakan styling form dasar abu-abu.
* **Letak AI Slop:** Kurangnya visual feedback status paket pengiriman.
* **Target Rombak:** Terapkan desain pelacakan kurir modern (seperti GoSend / J&T tracking): input nomor WA yang bersih, kotak 6-digit OTP elegan, dan tampilan timeline perjalanan kurir/ekspedisi real-time.
* **File Target:** `kaos-kami-web/src/app/track/TrackClient.tsx`.

#### 34. Modal 4-Langkah Checkout & Pembayaran (`CheckoutModal.tsx`)

* **Status Saat Ini:** Komponen 1550 baris dengan 4 tahap (Kontak, Pengiriman, Alamat GPS, Bayar Duitku). Header modal memakai font display, teks tombol konfirmasi berdesakan di layar HP.
* **Letak AI Slop:** Tumpukan form padat dengan teks penjelas berulang; tipografi tidak rata.
* **Target Rombak:** Rampingkan stepper checkout menjadi 4 langkah visual horizontal bersih, tombol bayar QRIS/VA Duitku yang menonjol, dan kalkulasi biaya ongkir Makassar otomatis yang transparan.
* **File Target:** `kaos-kami-web/src/components/ui/CheckoutModal.tsx`.

#### 35. Halaman Faktur Web Invoice & Bukti Bayar (`/orders/[id]`)

* **Status Saat Ini:** Header `FAKTUR PESANAN` menggunakan `font-display font-black text-2xl uppercase`. Format nota cetak masih memiliki elemen border ganda.
* **Letak AI Slop:** Dokumen transaksi resmi memakai font display jalanan yang kurang profesional untuk arsip belanja konsumen.
* **Target Rombak:** Rombak menjadi faktur digital modern bergaya Stripe Receipt: logo resmi Kaos Kami, nomor invoice mono tabular, status QRIS lunas ber-stempel hijau minimalis, dan tombol cetak PDF yang rapi.
* **File Target:** `kaos-kami-web/src/app/orders/[id]/page.tsx`.

#### 36. Halaman Kebijakan Privasi & Kredit Aset 3D (`/privacy` & `/kredit`)

* **Status Saat Ini:** Judul `KEBIJAKAN PRIVASI` dan `KREDIT ASET 3D` memakai `font-display text-3xl font-black uppercase`. Isi paragraf panjang tanpa visual hierarchy yang memadai.
* **Letak AI Slop:** Dinding teks hukum tanpa navigasi bab yang nyaman dibaca.
* **Target Rombak:** Format editorial bersih (*Medium / Linear Docs style*): sidebar navigasi daftar isi di kiri, konten legalitas UU PDP di kanan dengan tipografi yang nyaman di mata.
* **File Target:** `kaos-kami-web/src/app/privacy/page.tsx` & `kaos-kami-web/src/app/kredit/page.tsx`.

---

## 10. 🔤 RISET & SISTEM TIPOGRAFI MENDALAM (MEMPERBAIKI OVER-EXTENSION SYNE)

### A. Analisis Masalah Tipografi Saat Ini

Saat ini proyek mendefinisikan font di `layout.tsx`:

* `--font-display`: **`Syne`** (Weight 700, 800)
* `--font-sans`: **`Plus Jakarta Sans`** (Weight 400, 500, 600, 700)

**Mengapa ini menjadi bumerang visual?**
`Syne` adalah font eksentrik Prancis (*Lucas Descroix*) dengan karakteristik *extreme horizontal expansion* saat weight-nya naik ke 700-800. Font ini brilian jika dipakai untuk 1 baris judul besar di poster (`h1` 60px+). Tetapi ketika kode memakai `font-display font-black uppercase text-xs tracking-wider` pada 89+ lokasi (tombol kecil 12px, judul modal `MASUK AKUN`, `KERANJANG BELANJA`, tab drawer, kolom tabel):

1. Huruf menjadi balok hitam pekat yang gepeng dan sulit dibaca.
2. Memakan ruang horizontal 2x lipat teks normal, memicu pemotongan teks (*text clipping*) di tepi layar.
3. Tabel admin dan kolom Kanban terpaksa melar dan patah ke 2–3 baris (*line wrap* berantakan).

### B. 3 Pilihan Arsitektur Tipografi Baru yang Direkomendasikan

#### 🥇 Opsi 1 (Sangat Direkomendasikan: Luxury Modern Streetwear)

* **Display / Brand Headline:** **`Clash Display`** (atau **`Cabinet Grotesk`**)
  - *Karakter:* Modern, bold, tajam, proporsional, digunakan oleh brand streetwear kelas atas dan agensi fashion Awwwards. Tidak melar ke samping secara berlebihan.
* **UI Controls, Buttons, Modals, Body:** **`Plus Jakarta Sans`**
  - *Karakter:* Sans-serif geometris modern karya desainer Indonesia (Tokotype), sangat bersih, mudah dibaca di mobile, dan elegan.
* **Data, Operasional Workshop, Harga, Angka:** **`Geist Mono`** (atau `font-mono tabular-nums`)
  - *Karakter:* Presisi teknis, angka sejajar vertikal sempurna.

#### 🥈 Opsi 2 (Sleek Minimalist / Gaya Apple & Nike By You)

* **Universal Single Family:** **`Plus Jakarta Sans` Unified**
  - *Karakter:* Menggunakan 1 jenis font untuk seluruh antarmuka dengan memainkan kontras ketebalan (*weight contrast*):
    - `font-extrabold tracking-tight` untuk Hero H1.
    - `font-semibold` untuk Tombol dan Judul Modal.
    - `font-normal leading-relaxed` untuk Paragraf.
  - *Keuntungan:* Sangat bersih, waktu muat instan (0 layout shift), kohesif seperti ekosistem Apple.

#### 🥉 Opsi 3 (Surgical Fix: Pembatasan Ketat `Syne`)

* Pertahankan `Syne` **HANYA** untuk Hero H1 Landing Page (`text-4xl md:text-6xl font-display`).
* **HAPUS `font-display` dari seluruh tombol, modal, drawer, tabel, dan badge.** Seluruh komponen UI dialihkan 100% ke `Plus Jakarta Sans font-semibold` / `font-bold`.

### C. Tabel Konstitusi Hirarki Tipografi Kaos Kami

| Peruntukan                         | Ukuran           | Weight              | Font Token                        | Tracking & Leading                  |
| :--------------------------------- | :--------------- | :------------------ | :-------------------------------- | :---------------------------------- |
| **Hero Title H1**            | `36px – 56px` | `800 (Extrabold)` | `font-display` (Clash / Syne)   | `tracking-tight leading-[0.95]`   |
| **Section Header H2**        | `24px – 32px` | `700 (Bold)`      | `font-sans` (Plus Jakarta Sans) | `tracking-tight leading-snug`     |
| **Modal / Drawer Title**     | `18px – 20px` | `600 (Semibold)`  | `font-sans` (Plus Jakarta Sans) | `tracking-normal leading-normal`  |
| **Button Text**              | `13px – 14px` | `600 (Semibold)`  | `font-sans` (Plus Jakarta Sans) | `tracking-wide uppercase`         |
| **Body Copy**                | `14px – 15px` | `400 (Regular)`   | `font-sans` (Plus Jakarta Sans) | `tracking-normal leading-relaxed` |
| **Data Tabel / Harga / Jam** | `12px – 14px` | `500 (Medium)`    | `font-mono tabular-nums`        | `tracking-tight`                  |

---

## 11. 🛠️ FRAMEWORK SKILL INSPEKSI ANTI-AI-SLOP (KAOS KAMI INSPECTION ENGINE)

Untuk memastikan antarmuka Kaos Kami bebas dari cacat desain, kita menerapkan **6-Dimension Evaluation Matrix** yang diadaptasi dari *Jakob Nielsen Usability Heuristics*, *Nutlope/Hallmark Slop Gates*, dan *Vercel Craft Principles*:

| Dimensi Audit                                        | Pertanyaan Penguji                                                 | Standar Anti-AI-Slop Kaos Kami                                                                                                                |
| :--------------------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. The Squint Test (Hirarki Visual)**        | *Jika mata disipitkan, apakah ada 1 aksi utama yang jelas?*      | **Lolos:** Hanya ada 1 Primary Action per layar. Dilarang 3 tombol berbeda warna (oranye, kuning, hijau) berteriak bersamaan.           |
| **2. Progressive Disclosure (Beban Kognitif)** | *Apakah informasi yang ditampilkan hanya yang relevan saat itu?* | **Lolos:** Kartu ringkasan bebas dari form dropdown atau teks penolakan berulang. Form detail wajib berada di Slide-over Drawer.        |
| **3. Authorial Restraint (Bebas Boilerplate)** | *Apakah UI terbebas dari teks menjelaskan hal yang sudah jelas?* | **Lolos:** Hapus seluruh frasa teknis internal: `(gap 10mm)`, `(simpan ke R2)`, `(angka '-' berarti tak ada data)`, `(UU PDP)`. |
| **4. Viewport Ergonomics (Zero Clipping)**     | *Apakah elemen pas di layar laptop standar tanpa terpotong?*     | **Lolos:** Modal login & persona switcher tidak boleh terpotong oleh taskbar (`max-h-[85vh]` + safe padding bawah).                   |
| **5. Role & Security Isolation**               | *Apakah tombol admin tersembunyi dari pembeli umum?*             | **Lolos:** Tombol internal (`PANEL ADMIN OPS`, `PAJANG DI ETALASE`) HARAM di-render jika user bukan admin.                          |
| **6. Material Realism (Esensi 3D)**            | *Apakah pakaian terlihat nyata dengan bayangan dan kain?*        | **Lolos:** Dilarang menggunakan kotak kawat abu-abu dengan lingkaran putih. Kartu desain wajib 2K 3D Render Thumbnail asli.             |

---

## 12. 🚀 MASTER ROADMAP EKSEKUSI TRANSFORMASI (3 FASE TERSTRUKTUR)

```
[ FASE 1: PERBAIKAN ERGONOMI, TIPOGRAFI KRITIS, & ISOLASI ADMIN ]
├── 1.1 Jinakkan font Syne: ganti font-display pada Button, Modal, Drawer, dan Tabel ke Plus Jakarta Sans
├── 1.2 Perbaiki Viewport Clipping pada AuthModal.tsx dan PersonaSwitcher.tsx (max-h adaptif + safe padding)
├── 1.3 Perbaiki Drawer Overflow di CustomizerDrawer.tsx (area scroll independen agar pilihan kain tidak tenggelam)
└── 1.4 Isolasi tombol manajemen internal (sembunyikan [PANEL ADMIN OPS] & [PAJANG DI ETALASE] dari pembeli)

[ FASE 2: REDESAIN USER EXPERIENCE, PUBLIK, & 3D REALISM ]
├── 2.1 Sinkronisasi data Etalase di StoreShowcaseSection.tsx (sesuaikan nama Jaket Tactical, Sweater, dan Kaos)
├── 2.2 Integrasikan True 2K 3D Render Thumbnails pada kartu Koleksi Desain di /dashboard/designs
├── 2.3 Pasang Visual Order Journey Stepper (Timeline Produksi) di /dashboard/orders
├── 2.4 Berikan kepribadian maskot Kamito pada CartDrawer.tsx dan empty states
├── 2.5 Perbaiki sticky navbar overlap blur pada section Alamat & Komunitas
├── 2.6 Poles Halaman Publik: /catalog, /kalkulator-sablon, /track, CheckoutModal, dan Invoice /orders/[id]
└── 2.7 Terapkan Dinamika 2-Tone (Galeri Etalase Latar Gelap Obsidian)

[ FASE 3: ADMIN DECLUTTER & CALM WORKSPACE ]
├── 3.1 Rombak /admin/review: Kartu ringkas 1-klik ACC + Slide-over Drawer untuk penolakan
├── 3.2 Sempurnakan /admin/production: Adaptive collapsible empty columns pada Kanban DTF
├── 3.3 Rampingkan /admin/assets: Sembunyikan detail forensik ke Technical Inspector Drawer
└── 3.4 Terapkan tipografi tabular-nums monospace di seluruh tabel data operasional admin
```

---

## 13. 🧰 ARSENAL DESIGN ENGINEERING & KOMPENDIUM SKILL/FRAMEWORK GITHUB KELAS DUNIA

Untuk memberikan kemampuan membuat antarmuka maksimal setara startup Silicon Valley & studio desain Nordic, kita merangkum dan mengintegrasikan 10 repositori, framework, dan AI agent skills paling berpengaruh di dunia saat ini:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌐 ARSENAL DESIGN ENGINEERING & REPOSITORI RUJUKAN DUNIA                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. educlopez/ui-craft          -> Adversarial Design Critique, Heuristik Nielsen       │
│ 2. emilkowalski/skills         -> Spring Physics, Motion Curves, Perceived Performance │
│ 3. rauno.me/craft              -> Web Interface Guidelines, Invisible Details, cmdk   │
│ 4. VoltAgent/awesome-design-md -> Protokol SSOT DESIGN.md Standar Industri             │
│ 5. nutlope/hallmark            -> 57 Slop-Test Gates, Anti-Template Diversity          │
│ 6. ibelick/ui-skills           -> Baseline UI, Micro-interactions, Shaders, Canvas    │
│ 7. shadcn/ui + Radix UI        -> Accessible Headless Primitives & Composition         │
│ 8. paco.me/cmdk                -> Fast Keyboard-First Command Palette Architecture     │
│ 9. magicui & react-bits        -> Micro-effects, Subtle Gradient Borders, Bento Glow   │
│ 10. Anthropic frontend-design   -> Taste Constraints, Noise Reduction, Directness      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Rincian Profil & Pemanfaatan Tiap Repositori / Skill

#### 1. `educlopez/ui-craft` (Eduardo Lopez — Design Engineering Quality System)

* **URL:** `https://github.com/educlopez/ui-craft`
* **Inti Kekuatan:** Framework audit desain berbasis *Adversarial Agent Evaluation*. Membedah UI bukan sekadar dari apakah kodenya berjalan, melainkan apakah UI tersebut melanggar hukum psikologi persepsi manusia.
* **Fitur Utama:**
  - **Heuristic Quality Gates:** Menguji setiap komponen terhadap *Jakob Nielsen 10 Heuristics*, *Fitts's Law*, *Miller's Law*, dan *Hick's Law*.
  - **Business Impact Categorization:** Setiap cacat antarmuka diklasifikasikan ke dalam label dampak nyata: `blocks-conversion` (misal: modal terpotong di taskbar), `adds-friction` (misal: pilihan kain tenggelam di bawah swatch), atau `reduces-trust` (misal: teks penjelasan template 300 DPI diulang 25 kali).
  - **Interactive TUI CLI & MCP:** Memiliki Model Context Protocol (MCP) server untuk memindai drift token desain secara otomatis.

#### 2. `emilkowalski/skills` (Emil Kowalski — Animation & Interaction Craft)

* **URL:** `https://github.com/emilkowalski/skills` & `https://animations.dev`
* **Inti Kekuatan:** Kumpulan skill AI Agent (`animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `emil-design-eng`) dari pencipta komponen legendaris **Sonner** (toast) dan **Vaul** (iOS-style drawer).
* **Doktrin Gerak & Perceived Performance:**
  - **Durasi & Easing Ketat:** Interaksi mikro harus tuntas dalam **150ms – 250ms**. Menggunakan kurva bezier natural `cubic-bezier(0.16, 1, 0.3, 1)` atau pegas fisik (*spring physics*) dengan `stiffness: 400, damping: 30`.
  - **Zero Layout Thrashing:** Animasi HARAM mengubah properti layout geometri (`width`, `height`, `margin`, `top`). Hanya boleh memodifikasi properti GPU compositor: `transform` dan `opacity`.
  - **No Scale Zero:** Dilarang menganimasikan elemen dari `scale(0)` (terlihat murahan dan terdistorsi). Masuk selalu dari `scale(0.95)` atau `scale(0.98)` disertai fade-in halus.
  - **Tactile Active States:** Setiap tombol wajib memiliki respon sentuh instan (`active:scale-[0.98]` atau `active:scale-[0.99]`).

#### 3. `rauno.me/craft` (Rauno Freiberg — Staff Design Engineer at Vercel)

* **URL:** `https://rauno.me/craft` & `https://devouringdetails.com`
* **Inti Kekuatan:** Standar emas *Invisible Details* dan *Web Interface Guidelines* yang mendefinisikan antarmuka Vercel dan produk Next.js.
* **Prinsip Utama:**
  - **Calm Interfaces:** Informasi padat tidak boleh diterjemahkan menjadi visual yang ramai. Hirarki dibangun oleh ruang kosong (*whitespace* terukur) dan kontras tipografi, bukan border kotak berbingkai.
  - **Optical Alignment over Mathematical Center:** Teks dan ikon sering kali terlihat miring jika dipusatkan secara matematis murni. Penyesuaian optikal 1-2px wajib dilakukan untuk tombol dan badge.
  - **Focus States as First-Class Citizens:** Ring fokus keyboard bukan outline default browser yang jelek, melainkan cincin halus `ring-2 ring-primary/40 ring-offset-2 ring-offset-background`.

#### 4. `VoltAgent/awesome-design-md` (Standardized DESIGN.md Protocol)

* **URL:** `https://github.com/VoltAgent/awesome-design-md`
* **Inti Kekuatan:** Koleksi ratusan ribu file `DESIGN.md` yang merumuskan bahasa visual brand elit dunia (Linear, Stripe, Vercel, Supabase, Apple, Tesla) ke dalam token terstruktur yang dapat dipahami langsung oleh AI Agent.
* **Aplikasi di Kaos Kami:** Seluruh token warna (`surface-0`, `surface-1`, `surface-2`), font token, dan aturan radius dikunci ke dalam protokol `DESIGN.md` agar konsistensi antarmuka tidak terdegradasi seiring iterasi kode.

#### 5. `nutlope/hallmark` (Hassan El Mghari — Anti-AI-Slop Benchmark)

* **URL:** `https://github.com/nutlope/hallmark`
* **Inti Kekuatan:** 57 Slop-Test Gates yang secara eksplisit mendeteksi dan menghancurkan pola repetitif AI LLM.
* **Larangan Keras:**
  - Dilarang membuat hero dengan gradasi ungu-ke-biru generik.
  - Dilarang membuat 3 kartu fitur simetris identik berdampingan (*three-card yawn*).
  - Dilarang membuat badge kecil di atas setiap heading yang tidak membawa fungsi informatif (*badge soup*).
  - Dilarang mengurung kartu di dalam kartu (*nested card Russian doll*).

#### 6. `ibelick/ui-skills` (Julien Thibeaut — Baseline UI & Creative Component Craft)

* **URL:** `https://github.com/ibelick`
* **Inti Kekuatan:** Komponen mikro modern dengan efek cahaya halus (*subtle glow*), border gradient 1px dinamis, dan transisi fluiditas tinggi menggunakan Framer Motion dan Tailwind CSS.

#### 7. Ekosistem Primitif Fondasi: `shadcn/ui` + `radix-ui` + `vaul` + `cmdk`

* **Radix UI Primitives:** Fondasi *headless* tanpa gaya bawaan yang menjamin aksesibilitas WAI-ARIA 100% (keyboard navigation, trap focus modal, screen reader).
* **Vaul (`emilkowalski/vaul`):** Komponen drawer sentuh dengan physics pegas alami, *drag to dismiss*, dan background scaling untuk Cart Drawer dan Mobile Navigation Kaos Kami.
* **cmdk (`pacocoursey/cmdk`):** Komponen command palette instan (`Cmd + K` / `Ctrl + K`) untuk navigasi kilat di Admin dan Studio 3D.

---

## 14. 💎 DEEP DIVE STANDAR UI STARTUP KELAS DUNIA 2026 (SILICON VALLEY & NORDIC MINIMALISM)

Bagaimana startup seperti **Linear, Raycast, Stripe, Resend, Cron, dan Teenage Engineering** menciptakan antarmuka yang membuat pengguna merasa menggunakan "alat canggih bernilai miliaran rupiah"?

Ada 8 pilar arsitektur visual yang wajib kita tegakkan:

### 1. The Surface Elevation Ladder (Tangga Kedalaman Luminansi)

* **Penyakit AI Slop:** Menggunakan shadow hitam pekat berlebihan (`shadow-2xl` hitam kelam) atau border garis tebal 2px di setiap elemen, membuat layar terasa seperti tumpukan kardus kotor.
* **Standar Startup Modern:** Kedalaman visual tidak diciptakan oleh shadow hitam, melainkan oleh **tangga perubahan luminansi latar belakang (Surface Ladder)** dengan selisih 3%–5% kecerahan, dikunci dengan hairline border 1px yang sangat tipis:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏔️ HIERARKI SURFACE ELEVATION LADDER (DARK OBSIDIAN THEME)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Level 0: App Canvas (Dasar Layar)                                           │
│   • Background: #09090B (Zinc 950 Murni)                                    │
│   • Nuansa: Matte, tenang, menyerap cahaya.                                 │
│                                                                             │
│ Level 1: Inset Surface / Grid Table (Panel Kerja Utama)                     │
│   • Background: #121215 (Zinc 900/50)                                       │
│   • Border: 1px solid rgba(255, 255, 255, 0.06)                             │
│   • Contoh: Kartu Kanban, Container Tabel Order, Canvas Stage 3D            │
│                                                                             │
│ Level 2: Interactive Element / Card Hover (Elemen yang Menonjol)            │
│   • Background: #18181B (Zinc 900 Solid)                                    │
│   • Border: 1px solid rgba(255, 255, 255, 0.10)                             │
│   • Contoh: Input form, tombol secondary, card terpilih                     │
│                                                                             │
│ Level 3: Floating Overlay / Modal / Dropdown / Popover                      │
│   • Background: rgba(24, 24, 27, 0.85) + backdrop-blur-md                   │
│   • Border: 1px solid rgba(255, 255, 255, 0.14)                             │
│   • Shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.5)                             │
│   • Contoh: AuthModal, PersonaSwitcher, CartDrawer, Context Menu            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. The Zero-Noise Microcopy Doctrine (Linear & Resend Standard)

* **Penyakit AI Slop:** Teks penuh basa-basi, nasihat umum, kalimat motivasi kosong, dan deskripsi fungsi yang sudah jelas terlihat dari antarmukanya.
  - *Contoh Slop:* "Kelola seluruh pesanan kaos DTF Anda dengan efisien dan tepat waktu di panel manajemen pesanan ini."
  - *Contoh Slop:* "Pilih warna kaos favorit Anda di bawah ini untuk melihat pratinjau real-time 3D pada kanvas kami."
* **Standar Startup Modern:** **Setiap kata harus membayar sewanya di layar.** Jika suatu aksi sudah jelas dari tombol atau konteksnya, HAPUS teks penjelasnya!
  - *Aturan 3 Detik:* Jika mata pengguna dapat memahami fungsi tombol dalam 3 detik tanpa membaca paragraf, hapus paragraf tersebut.
  - *Gaya Bahasa:* Deklaratif, ringkas, profesional, berbasis fakta teknis.
  - *Perbandingan Langsung:*
    - ❌ Slop: *"Daftar pesanan kaos DTF Anda yang sedang diproses di workshop Makassar"*
    - ✅ Startup: *"Pesanan Aktif"* + angka badge `12`

### 3. Data Density & Calm Information Design

* **Penyakit AI Slop:** Menampilkan data seperti koran dinding. Setiap baris data diberi awalan teks berulang: "Nama Pembeli: Andi", "Nomor WhatsApp: 0812...", "Total Harga: Rp 120.000", "Status Pengiriman: Diproses".
* **Standar Startup Modern:**
  - Mengandalkan tata letak tabular dan posisi spasial untuk menjelaskan arti data.
  - Angka, harga, timestamp, dan kode pesanan WAJIB menggunakan **`font-mono tabular-nums`** agar lebar angka seragam dan tidak bergoyang saat diperbarui.
  - Status tidak ditulis dalam kotak badge raksasa warna-warni, melainkan cukup berupa **Status Dot Semantik 6px** dengan teks netral:
    - 🟢 `Production` (titik hijau 6px + teks "Produksi")
    - 🟡 `Pending Review` (titik kuning 6px + teks "Menunggu Review")
    - 🔵 `Shipped` (titik biru 6px + teks "Dikirim")

### 4. Single Electric Accent Discipline (Warna Fungsional)

* **Penyakit AI Slop:** Menggunakan 5 warna terang sekaligus (tombol oranye, badge ungu, progress bar hijau, banner kuning, border biru) sehingga mata pengguna lelah dan bingung mana yang penting.
* **Standar Startup Modern:**
  - **95% Kanvas Netral:** Hitam Obsidian (`#09090B`), Abu-abu Slate/Zinc (`#18181B`, `#27272A`), dan Putih Bersih (`#FAFAFA`).
  - **1 Warna Aksen Elektrik:** Kaos Kami **Signal Tangerine (`#F97316`)**. Warna ini HANYA digunakan untuk:
    1. Primary Call-to-Action (Tombol "Beli Sekarang", "ACC Order", "Simpan Desain").
    2. Focused Input Ring & Active Navigation Tab.
    3. Indikator progress sablon DTF aktif.
  - Dilarang keras menggunakan warna aksen sebagai latar belakang kartu besar yang menyilaukan mata!

### 5. Micro-interactions & Tactile Perceived Performance (<200ms)

* **Penyakit AI Slop:** Transisi CSS lambat berdurasi 500ms–800ms dengan efek `ease-in-out` yang terasa berat dan mengambang (*floaty*).
* **Standar Startup Modern:**
  - Antarmuka harus terasa **secepat kilat (snappy & tactile)**.
  - Durasi buka modal/drawer: **180ms – 220ms**.
  - Kurva gerak: `cubic-bezier(0.16, 1, 0.3, 1)` (cepat di awal, berhenti presisi tanpa mental).
  - Sentuhan Taktil: Setiap klik tombol memberikan mikro-kompresi fisik `scale(0.98)` selama 100ms.
  - Optimistic State: Ketika admin mengklik "ACC Desain", kartu langsung berpindah ke status hijau di layar secara instan dalam 0ms, sementara API Drizzle/Turso tersinkronisasi di latar belakang.

### 6. Asymmetrical Bento Layouts & Structural Variety

* **Penyakit AI Slop:** Seluruh halaman dibagi rata menjadi grid 3 kolom atau 4 kolom simetris yang membosankan (*three-column yawn*).
* **Standar Startup Modern:**
  - Menyusun informasi seperti kotak Bento Jepang dengan hirarki visual asimetris yang dinamis:
    - **Anchor Card (60%–70% lebar):** Pratinjau 3D pakaian interaktif atau grafik volume sablon DTF harian.
    - **Companion Cards (30%–40% lebar, tersusun vertikal):** Kartu ringkas antrean gang-sheet dan peringatan stok kain.

### 7. Spatial Breathing Room & Borderless Grouping

* **Penyakit AI Slop:** Setiap potongan teks atau tombol dikurung di dalam kotak berbingkai border dan berbayang (*border cage*).
* **Standar Startup Modern:**
  - Menggunakan jarak spasi terukur (`gap-6`, `gap-8`) dan garis pemisah rambut halus (`divide-y divide-white/[0.06]`) alih-alih membuat kotak-kotak terpisah.
  - Ruang kosong (*negative space*) berfungsi sebagai struktur visual yang menenangkan pikiran pengguna.

### 8. Typography Hierarchy & Strict Font Quarantine

* **Penyakit AI Slop:** Font display eksentrik (`Syne`) digunakan di mana-mana sampai ke tabel dan tombol kecil.
* **Standar Startup Modern:**
  - **Font Display (`Syne`):** Dibatasi HANYA untuk Hero H1 Marketing (`text-4xl+`).
  - **Workhorse Sans (`Plus Jakarta Sans`):** Menggerakkan 95% antarmuka fungsional (tombol, input, label modal, deskripsi produk, judul kartu).
  - **Monospace (`JetBrains Mono` / `Geist Mono`):** Menggerakkan 100% data numerik, koordinat DTF, harga rupiah, dan ID transaksi dengan fitur CSS `tabular-nums`.

---

## 15. 📖 ENSIKLOPEDIA TRANSFORMASI MIKRO-COPY ANTI-SLOP (36 AREA KAOS KAMI)

Berikut adalah kamus transformasi kata demi kata untuk membersihkan seluruh antarmuka Kaos Kami dari kalimat basa-basi AI Slop menuju standar teks startup minimalis kelas dunia:

| Lokasi / Layar                                       | ❌ Teks Lama (AI Slop / Bertele-tele / Bocor)                                                                           | ✅ Teks Baru (Startup Minimalis & Tegas)                                                                                                                | Rationale & Dampak Desain                                                      |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------- |
| **Admin Overview (`/admin`)**                | *"Sistem Operasi Produksi DTF & Apparel E-Commerce Kaos Kami Makassar — Pantau metrik..."*                           | Header Bersih:**"Ringkasan Operasional"** + Subtitle: *"Workshop Makassar • Real-time"*                                                        | Menghilangkan nama panjang sistem yang memakan 3 baris layar.                  |
| **Admin Review (`/admin/review`)**           | Paragraf alasan penolakan 300 DPI diulang 25 kali di kartu utama:*"File resolusi rendah... mohon upload ulang"*       | **Kartu Bersih (Gambar + Ukuran)**. Teks penolakan dipindahkan ke **Slide-over Drawer Penolakan**.                                          | Menghemat 60% ruang vertikal, admin bisa me-review 5x lebih cepat.             |
| **Admin Produksi (`/admin/production`)**     | *"Kolom antrean produksi sablon DTF: Siap Cetak, Cetak DTF, Press 1..."* (5 kolom kosong memakan 65% layar)           | **Header Ringkas:** *"Jalur Produksi"* + Filter Tab: `Aktif (12)` `Selesai (305)`. Kolom kosong terlipat otomatis jadi tab 40px.            | Menghilangkan ruang kosong mubazir, memfokuskan pandangan pada order aktif.    |
| **Admin Gang Sheet (`/admin/gang-sheet`)**   | Teks catatan:*"Mesin cetak DTF roll lebar 58cm x 100cm dengan gap minimal 10mm antar desain..."*                      | Teks dihapus. Ganti indikator visual:**`Roll: 58 × 100 cm`** • **`Efisiensi: 88.4%`**                                                 | Data teknis disajikan sebagai metrik angka, bukan kalimat manual.              |
| **Admin Assets (`/admin/assets`)**           | Teks debugging:*"R2 Storage Bucket... hash md5 checksum... status validasi mesh glTF"*                                | Tombol rapi:**`[Inspect Mesh]`** yang membuka Technical Drawer bagi developer. Layar utama hanya menampilkan thumbnail 3D & ukuran file.        | Memisahkan data operasional admin toko dari data debugging teknis.             |
| **Admin Pelanggan (`/admin/customers`)**     | Catatan hukum panjang:*"Data pelanggan dilindungi sesuai ketentuan privasi UU PDP Republik Indonesia..."*             | Indikator sensor elegan:**`0812-••••-8899`** + Ikon gembok kecil bertuliskan *"PDP Protected"*.                                           | Memberikan rasa aman tanpa harus menempelkan pasal undang-undang di dashboard. |
| **Dashboard User (`/dashboard/orders`)**     | Banner kuning:*"PERHATIAN: Mode Testing Aktif! Anda sedang mencoba sistem prototipe..."*                              | **DIHAPUS TOTAL** untuk pengguna umum. Banner hanya muncul jika `user.role === 'ADMIN'` dan env `NEXT_PUBLIC_SHOW_TESTING_BANNER === 'true'`. | Mengembalikan martabat profesional aplikasi sebagai toko nyata.                |
| **User Orders (`/dashboard/orders`)**        | Teks status berupa 14 baris nomor struk mentah bertumpuk kaku.                                                          | **Visual Order Journey Stepper (5 Titik):** `Diterima` → `Review Desain` → `Cetak DTF` → `Press Kaos` → `Dikirim`.                  | User langsung paham progres pesanan dalam 1 detik tanpa membaca baris teks.    |
| **User Designs (`/dashboard/designs`)**      | Kotak kawat abu-abu dengan lingkaran putih kosong dan teks:*"Slot Desain 2/5"*                                        | **Kartu 3D Realistic Render Thumbnail** menampilkan kaos asli dengan sablon pengguna + badge kuota: **`2 / 5 Desain`**.                   | Menonjolkan keunggulan platform 3D, bukan placeholder murahan.                 |
| **Studio 3D (`/studio`)**                    | Tombol bocor:`[PANEL ADMIN OPS]` dan `[PAJANG DI ETALASE]` terlihat oleh pembeli umum.                              | **DISEMBUNYIKAN 100%** untuk non-admin via conditional check: `{user?.role === 'ADMIN' && <AdminActionButtons />}`.                             | Menutup celah keamanan dan menjaga kesederhanaan tampilan pembeli.             |
| **Studio Drawer (`CustomizerDrawer.tsx`)**   | Teks panjang:*"Pilih jenis bahan kain katun combed berkualitas tinggi untuk kaos Anda di bawah ini"*                  | Sub-heading sederhana:**"Bahan & Ketebalan"** + kartu radio ringkas: `Combed 24s` / `Combed 30s` / `Heavyweight 16s`.                       | Menghapus kata-kata marketing klise yang menghalangi kontrol teknis.           |
| **Keranjang Belanja (`CartDrawer.tsx`)**     | Paragraf teks kosong:*"Keranjang belanja Anda saat ini masih kosong, silakan jelajahi etalase kami..."*               | Ilustrasi Maskot Kamito memegang keranjang kosong + Teks:**"Keranjang Kosong"** + Tombol: **"Buka Studio 3D"**.                             | Menghidupkan brand identity dan memandu user langsung ke aksi bernilai tinggi. |
| **Modal Login (`AuthModal.tsx`)**            | Teks panjang Turnstile:*"Verifikasi keamanan Cloudflare Turnstile sedang berlangsung..."* + tombol terpotong taskbar. | Animasi spinner minimalis 16px + Teks:**"Memverifikasi..."**. Modal diberi `max-h-[85vh]` sehingga tombol login selalu terlihat utuh.           | Memperbaiki ergonomi kritis agar konversi login tidak terhambat.               |
| **Persona Switcher (`PersonaSwitcher.tsx`)** | Teks penjelasan teknis peran admin/user di setiap tombol + container terpotong taskbar.                                 | Daftar switch peran minimalis dengan avatar + nama peran:**"Administrator Workshop"** / **"Pelanggan Terdaftar"**. Ukuran pas di layar.     | Memudahkan pergantian peran tanpa visual noise.                                |
| **Katalog Produk (`/catalog`)**              | Foto Jaket Tactical dan Sweater Crewneck diberi judul:*"Kaos Polos Combed 24s"*                                       | **Data Diperbaiki Sesuai Aset Asli:** `Tactical Windbreaker Jacket`, `Crewneck Heavyweight Fleece`, `Basic Tee Combed 24s`.                 | Menghilangkan kesan template copy-paste yang merusak kepercayaan pembeli.      |
| **Footer Publik (`Footer.tsx`)**             | Ruang kosong putih raksasa 300px di bawah copyright.                                                                    | Ruang kosong dibersihkan (`py-12`), ditata menjadi grid 4 kolom rapi dengan tautan Workshop, Kebijakan, dan Sosial Media Makassar.                    | Menghilangkan kesan website belum selesai atau patah.                          |

---

## 16. ⚡ KONSTITUSI CODING & IMPLEMENTASI DESIGN ENGINEERING (AGENT OPERATIONAL PROTOCOL)

Agar implementasi kode berlangsung mulus, presisi, dan tidak menimbulkan regresi teknis, seluruh perubahan kode antarmuka wajib mematuhi protokol berikut:

### 1. Tailwind CSS Class Architecture

* **Latar Belakang & Border:**
  - Latar Belakang Kartu: `bg-zinc-900/60 backdrop-blur-md`
  - Border Halus: `border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200`
  - Radius Sudut: Menggunakan `rounded-xl` (12px) untuk kartu, `rounded-lg` (8px) untuk tombol dan input. Hindari `rounded-3xl` berlebihan yang memakan ruang konten.
* **Tipografi Fungsional:**
  - Tombol: `font-sans font-semibold text-sm tracking-wide`
  - Angka & Metrik: `font-mono font-medium tabular-nums text-foreground`
  - Label Form: `font-sans font-medium text-xs text-muted-foreground uppercase tracking-wider`

### 2. Motion & Interaction Snippet (Standard Framer Motion)

Semua modal, drawer, dan dropdown wajib menggunakan preset spring berikut:

```tsx
// Preset Transisi Standar High-Craft Kaos Kami
export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 1,
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: springTransition 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    y: 4, 
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } 
  },
};
```

### 3. Pre-Flight Design Quality Gates (10 Pintu Audit Sebelum Ship)

Sebelum mengajukan kode hasil rombakan ke pengguna, agen wajib memverifikasi 10 poin ini:

1. `[ ]` **Zero Viewport Clipping:** Uji modal pada resolusi layar laptop 1366x768 dan 1920x1080. Apakah tombol bawah terpotong taskbar? (Wajib TIDAK).
2. `[ ]` **Syne Containment:** Pastikan font `Syne` TIDAK digunakan pada tombol, input form, modal header, drawer tabs, atau baris tabel.
3. `[ ]` **Zero AI Slop Boilerplate:** Periksa apakah ada kalimat panjang tak berguna yang bisa dihapus tanpa mengurangi pemahaman user.
4. `[ ]` **Admin Button Privacy:** Buka `/studio` dalam mode non-login / pembeli biasa. Pastikan tombol admin TIDAK muncul di DOM.
5. `[ ]` **3D Canvas Freedom:** Pastikan kanvas Three.js memiliki ruang gerak bebas dan tidak terhimpit oleh drawer yang macet.
6. `[ ]` **Monospace Currency & Quantities:** Seluruh harga (`Rp ...`), ukuran (`... cm`), dan nomor order menggunakan kelas `tabular-nums font-mono`.
7. `[ ]` **Touch Target Standard:** Seluruh tombol dan area klik memiliki ukuran minimal `44px × 44px` untuk kenyamanan sentuhan jari/mouse.
8. `[ ]` **Semantic Status Indicators:** Status pesanan menggunakan titik warna 6px + label ringkas, bukan badge raksasa warna-warni.
9. `[ ]` **Correct Catalog Metadata:** Seluruh foto jaket, hoodie, dan sweater di etalase memiliki nama dan deskripsi yang akurat sesuai jenis pakaian.
10. `[ ]` **Zero TypeScript / Build Errors:** Jalankan validasi `npm run web:typecheck` lokal untuk memastikan integritas tipe data 100% terjaga.

---

## 17. 🎨 SPESIFIKASI TEKNIS TOKEN SISTEM SURFACE ELEVATION & TANGGA LUMINANSI

Untuk menghentikan penggunaan shadow hitam pekat dan border tebal murahan, seluruh komponen antarmuka Kaos Kami diikat ke dalam **Tangga Kedalaman Luminansi (Surface Elevation System)** standar Tailwind CSS:

```css
/* Konfigurasi Token CSS Modern (globals.css / tailwind.config.ts) */
:root {
  /* Dark Obsidian Theme (Surface Ladder) */
  --surface-0: 240 10% 3.9%;        /* #09090B - Kanvas Utama Layar */
  --surface-1: 240 7% 7.5%;        /* #121215 - Container Tabel & Kanban */
  --surface-2: 240 5.9% 10%;       /* #18181B - Kartu Interaktif & Input Form */
  --surface-3: 240 3.7% 15.9%;     /* #27272A - Modal, Dropdown & Popover */
  
  /* Hairline Borders (1px Precision) */
  --border-hairline: rgba(255, 255, 255, 0.06);
  --border-hairline-hover: rgba(255, 255, 255, 0.12);
  --border-hairline-active: rgba(255, 255, 255, 0.18);

  /* Single Electric Accent (Signal Tangerine) */
  --accent-signal: #F97316;         /* Orange-500: Primary CTAs & Focus */
  --accent-signal-hover: #FB923C;   /* Orange-400: Hover State */
  --accent-signal-muted: rgba(249, 115, 22, 0.12); /* Subtle Active Fill */

  /* Status Semantik (Micro-Dots 6px) */
  --status-success: #10B981;        /* Emerald-500: Produksi / Lolos QC */
  --status-warning: #F59E0B;        /* Amber-500: Menunggu Review */
  --status-info: #3B82F6;           /* Blue-500: Pengiriman Kurir */
  --status-danger: #EF4444;         /* Rose-500: Ditolak / Reject */
}
```

### Tabel Kelas Utilitas Standar untuk Setiap Lapisan:

| Lapisan UI                       | Kelas Latar Belakang                 | Kelas Border                                             | Penggunaan di Kaos Kami                                                 |
| :------------------------------- | :----------------------------------- | :------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Canvas Dasar (L0)**      | `bg-zinc-950` (`#09090B`)        | *None*                                                 | Seluruh latar belakang halaman admin, studio, dan dark gallery etalase. |
| **Panel / Grid (L1)**      | `bg-zinc-900/50 backdrop-blur-sm`  | `border border-white/[0.06]`                           | Kolom Kanban`/admin/production`, kontainer tabel `/admin/orders`.   |
| **Kartu / Input (L2)**     | `bg-zinc-900 hover:bg-zinc-800/80` | `border border-white/[0.08] hover:border-white/[0.14]` | Kartu order, input teks, tombol secondary, radio button kain.           |
| **Floating Overlays (L3)** | `bg-zinc-900/90 backdrop-blur-xl`  | `border border-white/[0.14] shadow-2xl`                | `AuthModal.tsx`, `PersonaSwitcher.tsx`, `CartDrawer.tsx`.         |

---

## 18. 🔍 PEMETAAN TARGET OPERASI BEDAH FONT `SYNE` (89 LOKASI KODE SUMBER)

Audit kode sumber menemukan bahwa font `Syne 800` (`font-display font-black`) saat ini digunakan secara berlebihan di 89 lokasi, merusak proporsi teks tombol, tabel, dan modal. Berikut adalah peta perubahan kode sumber yang wajib dieksekusi pada Fase 1:

| File Komponen                            | Lokasi Baris & Elemen           | ❌ Kelas Lama (Syne Overuse)                                 | ✅ Kelas Baru (Plus Jakarta Sans / Mono)                                   |
| :--------------------------------------- | :------------------------------ | :----------------------------------------------------------- | :------------------------------------------------------------------------- |
| **`AuthModal.tsx`**              | Baris ~142 (Judul Modal)        | `font-display font-bold text-2xl`                          | `font-sans font-semibold text-lg tracking-tight text-white`              |
| **`AuthModal.tsx`**              | Baris ~205 (Tombol Submit)      | `font-display font-black uppercase text-xs tracking-wider` | `font-sans font-semibold text-sm tracking-wide text-white`               |
| **`PersonaSwitcher.tsx`**        | Baris ~88 (Judul Modal)         | `font-display font-black text-xl`                          | `font-sans font-semibold text-lg tracking-tight text-white`              |
| **`PersonaSwitcher.tsx`**        | Baris ~112 (Nama Peran)         | `font-display font-bold text-sm`                           | `font-sans font-medium text-sm text-zinc-200`                            |
| **`PersonaSwitcher.tsx`**        | Baris ~158 (Tombol Masuk)       | `font-display font-black text-xs uppercase`                | `font-sans font-semibold text-sm tracking-wide`                          |
| **`CartDrawer.tsx`**             | Baris ~95 (Header Drawer)       | `font-display font-bold text-xl`                           | `font-sans font-semibold text-base tracking-tight`                       |
| **`CartDrawer.tsx`**             | Baris ~164 (Judul Kosong)       | `font-display font-black text-lg`                          | `font-sans font-semibold text-base text-zinc-300`                        |
| **`CartDrawer.tsx`**             | Baris ~248 (Tombol Checkout)    | `font-display font-black text-sm uppercase tracking-wider` | `font-sans font-semibold text-sm tracking-wide text-white`               |
| **`CustomizerDrawer.tsx`**       | Baris ~180 (Header Tab)         | `font-display font-bold text-xs uppercase tracking-wider`  | `font-sans font-medium text-xs tracking-wider uppercase text-zinc-400`   |
| **`CustomizerDrawer.tsx`**       | Baris ~240 (Kartu Bahan)        | `font-display font-bold text-sm`                           | `font-sans font-semibold text-xs text-zinc-200`                          |
| **`CustomizerDrawer.tsx`**       | Baris ~310 (Badge GSM)          | `font-display font-black text-xs`                          | `font-mono font-medium text-[11px] tabular-nums text-zinc-400`           |
| **`CatalogClient.tsx`**          | Baris ~110 (Header Page)        | `font-display font-black text-3xl`                         | `font-sans font-bold text-2xl tracking-tight text-white`                 |
| **`CatalogClient.tsx`**          | Baris ~190 (Judul Produk)       | `font-display font-bold text-sm`                           | `font-sans font-semibold text-sm tracking-tight text-zinc-100`           |
| **`CatalogClient.tsx`**          | Baris ~215 (Harga Produk)       | `font-display font-black text-sm`                          | `font-mono font-semibold text-sm tabular-nums text-orange-400`           |
| **`KalkulatorSablonClient.tsx`** | Baris ~75 (Step Header)         | `font-display font-black text-sm uppercase`                | `font-sans font-semibold text-xs tracking-wider uppercase text-zinc-400` |
| **`KalkulatorSablonClient.tsx`** | Baris ~185 (Total Biaya)        | `font-display font-black text-3xl`                         | `font-mono font-bold text-3xl tabular-nums text-orange-500`              |
| **`TrackClient.tsx`**            | Baris ~60 (Tombol Lacak)        | `font-display font-black text-sm`                          | `font-sans font-semibold text-sm tracking-wide`                          |
| **`CheckoutModal.tsx`**          | Baris ~120 (Tahapan Pembayaran) | `font-display font-bold text-sm`                           | `font-sans font-semibold text-xs tracking-wider uppercase`               |
| **`OrderReceiptPage.tsx`**       | Baris ~90 (Header Invoice)      | `font-display font-black text-2xl`                         | `font-sans font-bold text-xl tracking-tight`                             |

---

## 19. 📱 ERGONOMI VIEWPORT LAPTOP & INTEGRASI MASKOT KAMITO

### A. Formula Safe-Area Viewport Laptop Standar (1366×768)

Banyak laptop di Indonesia (termasuk tim operasional UMKM Makassar) menggunakan resolusi layar 1366×768 dengan Windows Display Scaling 125%:

* **Tinggi Fisik Layar:** `768px` $\div 1.25 =$ **`614px` Effective Viewport Height**.
* **Area Terpakai Sistem:**
  - Windows Taskbar bawah: `48px`
  - Browser Header, Tab Bar & Bookmark Bar: `85px`
  - **Tinggi Efektif Bebas:** `614px - 48px - 85px =` **`481px`**.
* **Aturan Keras Arsitektur Modal (`AuthModal.tsx` & `PersonaSwitcher.tsx`):**
  - Container modal HARAM melebihi batas `max-h-[min(520px,85vh)]`.
  - Padding internal dibatasi `p-5 md:p-6` (bukan `p-10`).
  - Area konten diapit oleh pembungkus scroll mandiri: `flex-1 overflow-y-auto overscroll-contain pr-1`.
  - Tombol CTA aksi utama (`MASUK SEKARANG`, `DASHBOARD PESANAN`) dikunci di bagian bawah dengan `pt-4 border-t border-white/[0.06]` sehingga **100% selalu terlihat di layar tanpa terpotong oleh taskbar Windows**.

### B. Integrasi Visual Maskot Kamito (Delight & Zero-Slop Brand Identity)

Untuk menggantikan kotak abu-abu kosong dan teks basa-basi yang dingin, karakter maskot resmi Kaos Kami (**Kamito Si Kucing DTF**) diintegrasikan secara fungsional pada titik-titik jeda:

1. **CartDrawer Kosong:** Kamito duduk memegang keranjang sablon kosong dengan ekspresi penasaran + CTA langsung *"Mulai Kustomisasi 3D"*.
2. **Koleksi Desain User Kosong (`/dashboard/designs`):** Kamito membawa roll film DTF transparan + CTA *"Buat Desain Pertama Anda"*.
3. **Notifikasi Bersih (`/dashboard/notifications`):** Kamito santai tersenyum + label ringkas *"Semua beres • Tidak ada notifikasi baru"*.

---

## 20. 🎯 MATRIKS EVALUASI & QUALITY GATES 36 AREA (VERIFIKASI AKHIR)

Sebelum pekerjaan dinyatakan tuntas, setiap area dari 36 antarmuka website wajib memenuhi kriteria kelayakan berikut:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏁 QUALITY GATES 36 AREA KAOS KAMI                                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Area 1–15 (Admin Dashboard):                                                           │
│   • 0 Teks Basa-basi / Penjelasan template berulang 25x dihapus total                  │
│   • Kanban produksi melipat kolom kosong secara adaptif (<40px)                        │
│   • Seluruh angka ID, harga, koordinat, dan GSM menggunakan font-mono tabular-nums     │
│   • Detail teknis R2 / glTF tersembunyi rapi di dalam Slide-over Inspector Drawer      │
│                                                                                        │
│ Area 16–22 (User Dashboard):                                                           │
│   • Banner developer / testing mode 100% lenyap dari pandangan customer biasa          │
│   • Kartu koleksi desain menampilkan True 2K 3D Render Thumbnail berkualitas tinggi    │
│   • Status pesanan disajikan dalam Visual Order Stepper 5-tahap yang elegan            │
│   • Modal ganti peran & buku alamat pas di layar tanpa clipping taskbar                │
│                                                                                        │
│ Area 23–30 (Studio & Navigasi Publik):                                                 │
│   • Tombol admin internal ([PANEL ADMIN OPS]) tersembunyi dari pembeli umum            │
│   • Pilihan bahan/GSM pada Studio Drawer memiliki area scroll independen unclipped     │
│   • Modal Login Cloudflare Turnstile pas di layar 768p dan 1080p                       │
│   • Section Workshop & Komunitas tidak lagi tertutup overlap blur dari sticky navbar   │
│   • Whitespace void 300px pada Footer dipangkas menjadi grid 4-kolom bersih            │
│                                                                                        │
│ Area 31–36 (Katalog & Transaksi Lanjutan):                                             │
│   • Foto jaket, sweater, dan kaos di etalase memiliki nama dan metadata yang akurat    │
│   • Kalkulator sablon menampilkan kalkulasi harga live tanpa font display raksasa      │
│   • Halaman tracking order menampilkan timeline kurir yang tenang dan terpercaya       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 21. 💬 AUDIT FORENSIK CHAT WIDGET (`KamitoChatWidget.tsx`) & ARSITEKTUR DRAGGABLE COLLISION-FREE

Berdasarkan bukti forensik nyata pada tangkapan layar Studio 3D (`ui studio.png`), ditemukan cacat ergonomi kritis pada posisi tombol widget live chat yang mengganggu alur kerja kustomisasi:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 💥 ANATOMI TABRAKAN WIDGET CHAT DI STUDIO 3D (BUKTI UI STUDIO.PNG)                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Posisi Fixed Kaku:                                                                  │
│    KamitoChatWidget terkunci secara absolut pada 'fixed bottom-5 right-5 z-40'.        │
│                                                                                        │
│ 2. Dimensi Kapsul Terlalu Lebar:                                                       │
│    Tombol launcher menggunakan kapsul panjang berisi avatar + teks 'TANYA KAMITO CS    │
│    Online sekarang' dengan lebar mencapai ~210px.                                      │
│                                                                                        │
│ 3. Benturan dengan StudioHUD (Kontrol 3D):                                             │
│    Ketika drawer di sisi kiri, StudioHUD berada di 'md:right-6 md:bottom-6'. Kapsul    │
│    chat widget langsung menimpa tombol 'GESER', 'GIZMO', dan 'UKURAN' (tertutup 50%).  │
│                                                                                        │
│ 4. Benturan dengan CustomizerDrawer (Sisi Kanan):                                      │
│    Ketika drawer di sisi kanan, tombol chat berada persis di atas tombol konversi      │
│    kritis 'PESAN SEKARANG' (IDR 59.000) dan area swatch warna bawah.                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Solusi Kelas Dunia 1: Draggable Floating Action Button (FAB) via Framer Motion

Agar tombol tidak lagi menutupi kontrol penting, kita menyulap launcher widget chat menjadi **elemen interaktif yang dapat diseret (*draggable*)** ke mana pun oleh pengguna atau admin:

```tsx
// Cuplikan Arsitektur Draggable Chat Widget (KamitoChatWidget.tsx)
import { motion, useDragControls } from "framer-motion";

export function DraggableChatLauncher({ onClick, isOpen, isOnlineNow, unreadCount, isStudioMode }) {
  // Simpan posisi terakhir di localStorage agar posisi nyaman diingat
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kaoskami_chat_fab_pos");
      if (saved) try { return JSON.parse(saved); } catch {}
    }
    return { x: 0, y: 0 };
  });

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{ top: -window.innerHeight + 120, bottom: 0, left: -window.innerWidth + 120, right: 0 }}
      onDragEnd={(_, info) => {
        const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
        setPosition(newPos);
        localStorage.setItem("kaoskami_chat_fab_pos", JSON.stringify(newPos));
      }}
      className="fixed bottom-6 right-6 z-40 select-none cursor-grab active:cursor-grabbing"
    >
      {/* Mode Studio: Lingkaran Kompak 44px (Bebas Halangan) */}
      {isStudioMode ? (
        <button
          onClick={onClick}
          className="group relative w-12 h-12 rounded-full bg-surface/90 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          title="Tanya CS Kamito (Dapat digeser)"
        >
          <img src="/mascot/kamito-avatar.png" alt="Kamito" className="w-8 h-8 rounded-full object-cover" />
          <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-surface ${isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      ) : (
        /* Mode Publik Biasa: Kapsul Elegan dengan Drag-Handle */
        <button
          onClick={onClick}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface/95 backdrop-blur-xl border border-white/15 text-text-primary shadow-2xl hover:border-brand-accent transition-all"
        >
          {/* Ikon Grip halus penanda dapat digeser */}
          <GripVertical size={13} className="text-zinc-500 group-hover:text-zinc-300 -ml-1" />
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40">
            <img src="/mascot/kamito-avatar.png" alt="Kamito" className="w-full h-full object-cover" />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${isOnlineNow ? "bg-emerald-500" : "bg-neutral-500"}`} />
          </div>
          <div className="text-left hidden sm:block">
            <span className="font-sans font-semibold text-xs tracking-tight text-white block">Tanya Kamito</span>
            <span className="text-[10px] font-mono text-zinc-400">{isOnlineNow ? "Online" : "Workshop"}</span>
          </div>
        </button>
      )}
    </motion.div>
  );
}
```

### B. Solusi Kelas Dunia 2: Smart Collision Avoidance di Route `/studio`

1. **Deteksi Rute Otomatis:** Saat URL mendeteksi rute `/studio`, widget chat otomatis mengaktifkan prop `isStudioMode={true}`.
2. **Pengurangan Luas 75%:** Ukuran tombol menyusut dari kapsul 210px menjadi lingkaran kompak 44px (`w-11 h-11`), memberikan ruang napas luas bagi kanvas 3D.
3. **Auto-Repositioning Sinkron:** Mengamati state `drawerPosition` dari `useConfiguratorStore`. Jika drawer berada di kanan (`right`), tombol chat bergeser ke sudut kiri (`left-6 bottom-6`), menghindari tabrakan secara deterministik!

---

## 22. 🔍 AUDIT MENYELURUH SELURUH TOMBOL, HUD, DRAWER & FLOATING OVERLAYS DI KODE SUMBER

Selain Chat Widget, dilakukan audit mendalam terhadap seluruh komponen overlay dan tombol di dalam folder `src/components/`:

### 1. Studio HUD Dock (`StudioHUD.tsx` — 10 KB)

* **Masalah Saat Ini:** Terdiri dari 12 tombol berjejer horizontal panjang (`md:bottom-6 bottom-[84px]`). Di layar laptop dengan lebar <1200px, dock horizontal ini menabrak batas drawer dan memotong kanvas 3D.
* **Perbaikan Kode:**
  - Satukan preset kamera ke dalam **Segmented Radio Control Kompak** (Hanya 3 tab: `Depan`, `Belakang`, `Kerah/Detail`).
  - Bungkus dock dalam kontainer `backdrop-blur-2xl bg-zinc-900/80 border border-white/[0.08] shadow-2xl rounded-2xl` dengan tinggi konsisten 44px.
  - Koordinasikan margin bawah dengan chat widget (`bottom-6`).

### 2. Customizer Drawer (`CustomizerDrawer.tsx` — 207 KB)

* **Masalah Saat Ini:** Drawer menempati 380px di sisi layar (`top-[74px] bottom-5`). Area pemilihan bahan (Combed 24s/30s/Heavyweight 16s) dan slider ketebalan tenggelam di bawah swatch warna karena container tidak memiliki pembungkus scroll mandiri (`flex-1 overflow-y-auto`).
* **Perbaikan Kode:**
  - Pisahkan layout drawer menjadi 3 kompartemen tegas:
    1. **Fixed Header:** Judul produk, tombol flip posisi kiri/kanan, tombol tutup.
    2. **Independent Scrollable Body (`flex-1 overflow-y-auto pr-1`):** Tab produk, swatch warna, kartu bahan, dan slider GSM. Swatch warna tidak akan pernah lagi menenggelamkan kartu bahan.
    3. **Fixed Footer:** Baris estimasi total harga (`IDR 59.000`) dan tombol primary CTA `PESAN SEKARANG`.

### 3. Modal Akun & Ganti Persona (`AuthModal.tsx` — 50 KB)

* **Masalah Saat Ini:** Seperti terlihat pada tangkapan layar `ui panel.png`, modal profil pengguna berisi tombol ganti persona (`Admin | Pelanggan`) dan dua kartu navigasi besar (`BUKA PANEL ADMIN` & `DASHBOARD PESANAN SAYA`). Tinggi total modal mencapai >620px sehingga bagian bawahnya terpotong oleh taskbar Windows pada layar 768p/1080p.
* **Perbaikan Kode:**
  - Tambahkan batas ketinggian adaptif: `max-h-[min(520px,85vh)]`.
  - Pasang pembungkus scroll internal: `flex-1 overflow-y-auto overscroll-contain pr-1`.
  - Ganti font display tebal pada tombol dengan `font-sans font-semibold text-sm`.

### 4. Modal Panduan Ukuran 3D (`SizeGuideModal.tsx` — 48 KB)

* **Masalah Saat Ini:** Berisi tabel dimensi centimeter (S, M, L, XL, XXL) dan visual manekin. Pada layar tablet atau jendela browser yang dikecilkan, tabel dapat meluap ke samping (*horizontal overflow*).
* **Perbaikan Kode:**
  - Bungkus tabel dalam kontainer `overflow-x-auto rounded-xl border border-white/[0.06]`.
  - Format seluruh angka ukuran (`Lebar`, `Panjang`, `Lengan`) dengan `font-mono tabular-nums`.

### 5. Popover Notifikasi Pengguna & Admin (`UserNotificationBell.tsx` & `AdminBell.tsx` — 10 KB)

* **Masalah Saat Ini:** Popover daftar notifikasi terbuka dengan lebar tetap 320px (`w-80`). Pada layar smartphone (<400px), popover ini dapat menabrak tepi kanan layar (*screen boundary collision*).
* **Perbaikan Kode:**
  - Tambahkan kelas responsif `w-[calc(100vw-2rem)] sm:w-80` dan pasang alignment `align="end"` dengan offset `sideOffset={8}`.
  - Notifikasi yang telah dibaca diberi background netral tenang tanpa efek glow yang mencolok.

### 6. Keranjang Belanja Slide-over (`CartDrawer.tsx` — 16 KB)

* **Masalah Saat Ini:** Drawer keranjang meluncur dari kanan (`w-full sm:w-[420px]`). Tombol checkout di bagian bawah menggunakan font display tebal yang memanjang kaku.
* **Perbaikan Kode:**
  - Tombol checkout dialihkan ke `Plus Jakarta Sans font-semibold text-sm tracking-wide`.
  - Saat keranjang kosong, tampilkan ilustrasi vektor maskot Kamito sedang memegang keranjang kosong + CTA tombol langsung ke Studio 3D.

### 7. Header Navigasi Publik (`Navbar.tsx` — 14 KB)

* **Masalah Saat Ini:** Navbar sticky dengan `backdrop-blur-md` mengalami benturan visual (*blur collision*) dengan judul section di halaman landing saat di-scroll.
* **Perbaikan Kode:**
  - Terapkan scroll-aware background opacity: transparan saat `scrollY === 0`, dan beralih halus ke `bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06]` saat `scrollY > 20px`.
  - Berikan jarak aman padding atas (`pt-20` atau `pt-24`) pada seluruh section halaman utama agar judul section tidak pernah tertutup oleh navbar.

---

## 23. 📐 SISTEM KOORDINASI Z-INDEX & VIEWPORT DOCKING GLOBAL (ANTI-TUMBUKAN OVERLAY)

Untuk menghentikan "perang z-index" acak di mana satu komponen menimpa komponen lain tanpa aturan, platform Kaos Kami menetapkan **Hierarki Z-Index Global 8 Tingkat**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📐 HIERARKI Z-INDEX RESMI KAOS KAMI PLATFORM                                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Level 0–10  : 3D WebGL Canvas Stage & Interactive Mesh (Three.js Canvas)               │
│ Level 20    : Page Background Effects, Grid Lines & Ambient Lighting                   │
│ Level 30    : Studio HUD Dock & Camera Control Toolbar (StudioHUD.tsx)                 │
│ Level 40    : Draggable Floating Chat Widget (KamitoChatWidget.tsx)                    │
│ Level 50    : Navigation Bars & Slide-over Drawers (Navbar.tsx, CustomizerDrawer.tsx)  │
│ Level 60    : Central Dialogs & Modals (AuthModal, SizeGuideModal, CheckoutModal)      │
│ Level 70    : Dropdown Menus, Context Popovers & Tooltips (Radix Popover / Dropdown)   │
│ Level 80    : Toast Notifications & Emergency Alerts (Sonner Toaster)                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Dengan sistem z-index yang terkoordinasi dan kemampuan *drag & drop* pada chat widget, pengguna dan tim admin memiliki kendali penuh atas ruang kerja visual, menghasilkan pengalaman interaksi 3D yang sangat mulus, lapang, dan berstandar startup internasional.

---

## 24. 🎛️ REKAYASA TOTAL TOMBOL HEADBAR & SISTEM NAVIGASI ATAS (STUDIO, PUBLIK & ADMIN)

Headbar (bilah navigasi atas) adalah elemen pertama yang dilihat pengguna dan menjadi jangkar navigasi seluruh aplikasi. Berdasarkan audit forensik kode sumber, ditemukan sejumlah inefisiensi pada tombol headbar yang perlu dimaksimalkan:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎛️ ANATOMI PEROMBAKAN TOMBOL HEADBAR KAOS KAMI PLATFORM                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Studio 3D Headbar (StudioClient.tsx):                                               │
│    • Masalah: Terlalu banyak tombol kanan berserakan (TAMPIL BERSIH, PAJANG DI ETALASE,│
│      PANEL ADMIN OPS, MASUK) yang memotong layar pada resolusi <1024px.                │
│    • Solusi: Satukan kontrol ke dalam 3 Zona Harmonis dengan ketinggian seragam h-9    │
│      (36px) dan micro-tooltips Radix UI.                                              │
│                                                                                        │
│ 2. Public Navbar (Navbar.tsx):                                                         │
│    • Masalah: Link navigasi menggunakan font-mono huruf kapital kaku (HOME, KATALOG,   │
│      ABOUT, PESANANKU) seperti terminal Linux; tombol CTA bernama ganjil 'KOSTUM'.     │
│    • Solusi: Beralih ke font-sans font-medium text-sm yang hangat & elegan; tombol     │
│      CTA diganti menjadi 'Kustom 3D' dengan efek glow taktil.                          │
│                                                                                        │
│ 3. Admin Topbar & Sidebar (AdminNav.tsx):                                              │
│    • Masalah: Tombol logout memicu dialog konfirmasi tanpa animasi transisi.           │
│    • Solusi: Integrasi tombol tindakan cepat dengan dialog konfirmasi taktil.          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Rombak Studio 3D Headbar (`StudioClient.tsx`) Menjadi 3 Zona Presisi

1. **Zona Kiri (Navigasi & Status Dokumen):**
   * **Tombol Kembali:** Tombol `[←]` kapsul ramping `h-9 px-3 rounded-full bg-surface border border-white/[0.08] hover:border-white/[0.16] hover:bg-zinc-800 text-xs font-sans font-semibold text-zinc-300 hover:text-white transition-all active:scale-95`.
   * **Logo Kaos Kami:** Tetap di samping tombol kembali dengan transisi opacity saat hover.
   * **Indikator Autosave Cerdas:** Bukan tombol teks panjang, melainkan pil mikro `h-7 px-2.5 rounded-full bg-zinc-900/60 border border-white/[0.06] flex items-center gap-1.5 font-mono text-[10px] text-zinc-400`:
     - 🟢 *Tersimpan:* Titik hijau 6px + teks "Tersimpan"
     - 🟡 *Menyimpan:* Spinner mikro 10px + teks "Menyinkronkan..."
     - ⚪ *Offline:* Titik abu-abu + teks "Draf Lokal"
2. **Zona Kanan (Toolbar Aksi & Profil Terpadu):**
   * **Cluster Tool Ikon (Tinggi Seragam `h-9 w-9`):**
     - Tombol Panduan (`CircleHelp`), Tema (`Sun/Moon`), dan Fullscreen (`Maximize2`).
     - Menggunakan varian *Ghost-Button*: `w-9 h-9 rounded-full bg-surface/60 border border-white/[0.06] hover:border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95 flex items-center justify-center`.
   * **Cluster Admin Ringkas (Khusus Admin/Staff):**
     - Menggantikan tombol kuning oranye raksasa dengan pil eksekutif yang tenang: `h-9 px-3 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-sans font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95`.
   * **Tombol Akun / Masuk:**
     - Pil avatar ramping `h-9 px-3 rounded-full bg-surface border border-white/[0.08] hover:border-white/[0.16] text-xs font-sans font-semibold text-zinc-200 flex items-center gap-2 active:scale-95`.

### B. Rombak Public Navbar (`Navbar.tsx`) Menjadi Streetwear Modern

1. **Eliminasi Font Monospace pada Menu Navigasi:**
   - Ubah kelas dari `font-mono text-xs uppercase tracking-wider` menjadi:`font-sans font-medium text-sm text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/[0.05]`.
   - Pasang indikator titik oranye mikro (`w-1 h-1 rounded-full bg-orange-500`) di bawah menu yang sedang aktif.
2. **Optimalisasi Tombol CTA Utama ("KOSTUM" $\rightarrow$ "Kustom 3D"):**
   - Teks "KOSTUM" terasa canggung dan kurang menjelaskan nilai produk.
   - Ganti menjadi: **"Kustom 3D"** atau **"Mulai Desain"**.
   - Kelas tombol: `h-9 px-4 sm:px-5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-sans font-semibold text-xs tracking-wide shadow-[0_0_16px_rgba(249,115,22,0.35)] hover:shadow-[0_0_24px_rgba(249,115,22,0.5)] active:scale-95 transition-all flex items-center gap-1.5`.

---

## 25. 🛡️ REDESAIN ELEGAN DIALOG KONFIRMASI (CONFIRM DIALOG & MODAL TRANSAKSI)

Komponen dialog konfirmasi [`ConfirmDialog.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/ConfirmDialog.tsx>) saat ini memiliki cacat teknis dan visual serius:

1. **Bug Duplikasi Event Listener:** `useEffect` untuk menangani tombol `Escape` tertulis dua kali di baris 28–35 dan 37–44.
2. **Penyebaran Font Syne & Monospace Kaku:** Judul dialog menggunakan `font-display font-black text-base uppercase` (Syne), dan pesan dialog menggunakan `font-mono text-xs` yang terlihat seperti error log developer, bukan bahasa manusia yang sopan.
3. **Ketiadaan Animasi (Abrupt Pop-in):** Dialog muncul mendadak tanpa transisi pegas halus.
4. **Ketiadaan Ikon Status Visual:** Tidak ada penanda visual apakah aksi tersebut berbahaya (*destructive*), informatif, atau sekadar simpan data.

### Spesifikasi Kode Rombak `ConfirmDialog.tsx` High-Craft:

```tsx
"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // 1 Event listener tunggal dan bersih
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={busy ? undefined : onCancel}
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/[0.12] p-6 space-y-4 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Top Glow Line */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                danger ? "bg-rose-500" : "bg-orange-500"
              }`}
            />

            {/* Header dengan Ikon Semantik */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  danger
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                }`}
              >
                {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
              </div>
              <div className="space-y-1">
                <h3 className="font-sans font-semibold text-base text-zinc-100 leading-snug">
                  {title}
                </h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Tombol Aksi Taktil */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/[0.08] font-sans font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                autoFocus
                className={`flex-1 py-2.5 rounded-xl font-sans font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                  danger
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                    : "bg-orange-500 hover:bg-orange-400 text-white shadow-orange-950/50"
                }`}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

---

## 26. 🔘 KONSTITUSI SISTEM TOMBOL HIGH-CRAFT 4-TIER & MIKRO-INTERAKSI TAKTIL

Untuk menjamin seluruh tombol di 36 area platform Kaos Kami memiliki konsistensi visual dan respon fisik yang memuaskan, ditetapkan **Konstitusi 4-Tier Button Design System**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔘 4-TIER BUTTON DESIGN SYSTEM (KAOS KAMI STANDAR 2026)                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Primary Action (Signal Tangerine #F97316)                                      │
│   • Peruntukan: Satu-satunya aksi utama di halaman (Checkout, Kustom 3D, ACC Order).  │
│   • Style: bg-orange-500 hover:bg-orange-400 text-white font-sans font-semibold        │
│     shadow-[0_0_20px_rgba(249,115,22,0.35)] active:scale-[0.98].                     │
│                                                                                        │
│ Tier 2: Secondary / Surface Action (Zinc Inset Surface)                                │
│   • Peruntukan: Aksi pendukung berbobot (Filter Kategori, Simpan Draf, Unduh Mockup).  │
│   • Style: bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08]     │
│     hover:border-white/[0.14] font-sans font-medium active:scale-[0.98].               │
│                                                                                        │
│ Tier 3: Ghost / Tertiary Action (Transparent Minimal)                                  │
│   • Peruntukan: Tombol navigasi headbar, tombol icon, tombol batal, dan expand/toggle. │
│   • Style: bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-white         │
│     active:scale-95 font-sans font-medium transition-colors.                           │
│                                                                                        │
│ Tier 4: Destructive Action (Rose Semantic Tone)                                        │
│   • Peruntukan: Aksi berbahaya (Hapus Item, Tolak Desain, Batalkan Pesanan).           │
│   • Style: bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white            │
│     border border-rose-500/20 active:scale-[0.98] font-sans font-semibold.             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Aturan Baku Desain Rekayasa Tombol (Design Engineering Rules):

1. **Zero-Jitter Loading State:** Tombol tidak boleh berubah ukuran atau meloncat saat loading. Teks dilarang diganti dengan "MOHON TUNGGU..." yang memanjangkan tombol. Gunakan spinner 16px di posisi tengah dengan dimensi tombol yang terkunci stabil.
2. **Perceived Performance Speed:** Durasi transisi hover dan active tidak boleh melebihi **150ms** (`transition-all duration-150`).
3. **Sensasi Fisik Taktil:** Setiap klik tombol wajib memberikan mikro-kompresi fisik instan `active:scale-[0.98]` (atau `active:scale-95` pada icon button bulat).
4. **Keyboard Focus Ring Standar:** Semua tombol wajib memiliki ring fokus aksesibilitas:
   `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`.

---

## 27. 📱 AUDIT FORENSIK PENGALAMAN MOBILE WEB (SMARTPHONE VIEWPORT 360px–430px)

Pengalaman pengguna di smartphone (browser Safari iOS dan Chrome Android) memiliki dinamika fisik yang sangat berbeda dibanding desktop. Berdasarkan prinsip desain mobile kelas dunia (*Steven Hoober Thumb Zones, Apple HIG, Material Design 3, dan W3C Touch Events*), ditemukan sejumlah cacat kritis pada tampilan mobile website Kaos Kami saat ini:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📱 ANATOMI ERGONOMI MOBILE SMARTPHONE (VIEWPORT 360px - 430px)                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Pelanggaran Thumb Zone (Zona Jangkauan Jempol):                                     │
│    • Riset Steven Hoober membuktikan 75% navigasi satu tangan bertumpu pada sepertiga │
│      bawah layar (Bottom Third - EASY ZONE).                                          │
│    • Saat ini, tombol StudioHUD (bottom-[84px]), tombol customizer drawer, dan tombol  │
│      KamitoChatWidget (bottom-5 right-5) saling bertumpuk di zona bawah 120px,        │
│      membuat jempol pengguna salah tekan (mistapping).                                │
│                                                                                        │
│ 2. Pelanggaran No-Hover Doctrine:                                                      │
│    • Status hover (:hover) TIDAK ADA di layar sentuh. Seluruh label yang disembunyikan│
│      di balik hover (seperti tooltip kamera HUD) menjadi tidak terbaca di HP.         │
│                                                                                        │
│ 3. Kekacauan Tinggi Viewport (100vh vs 100dvh):                                        │
│    • Browser mobile memiliki dynamic URL bar yang muncul-tenggelam saat scroll.        │
│      Penggunaan 100vh menyebabkan tombol checkout dan opsi terbawah terpotong di balik│
│      bilah navigasi browser. Wajib dialihkan ke 100dvh (Dynamic Viewport Height).     │
│                                                                                        │
│ 4. Tabrakan Gestur Sentuh 3D (Touch Gesture Conflicts):                                │
│    • OrbitControls Three.js (sentuhan 1 jari putar, 2 jari cubit zoom) membajak        │
│      gestur scroll halaman, sehingga pengguna terjebak tidak bisa scroll ke bawah.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Solusi Rekayasa Mobile Web:

1. **Dynamic Viewport Height (`100dvh`):**
   - Seluruh kontainer layar penuh (seperti Studio 3D dan Slide-over Drawer) diubah dari `h-screen` (`100vh`) menjadi `h-dvh` (`100dvh`).
2. **Safe-Area Insets (`env(safe-area-inset-*)`):**
   - Tambahkan utility padding aman:
     ```css
     .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
     .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
     ```
   - Mencegah tombol navigasi terpotong oleh *home indicator bar* iPhone atau *gesture navigation bar* Android.
3. **Isolasi Gestur OrbitControls 3D:**
   - Kanvas Three.js diberi kelas `touch-none` untuk memisahkan interaksi rotasi 3D.
   - Di luar kanvas, disediakan tombol/tab navigasi eksplisit agar pengguna tidak perlu menyentuh kanvas untuk menggulir halaman.
4. **Sentuhan Minimal 44px (Touch Target Standard):**
   - Seluruh tombol di mobile dipastikan berukuran minimal `44px × 44px` dengan jarak spasi minimal `8px`.

---

## 28. 📲 AUDIT FORENSIK APLIKASI NATIVE CAPACITOR (`kaos-kami-mobile`)

Aplikasi mobile berbasis Capacitor Android dan iOS (`kaos-kami-mobile`) memiliki arsitektur shell native tersendiri yang telah diaudit di level kode sumber:

### 1. Edge-to-Edge Status Bar & Notch Overlays

* **Kondisi Kode:** File `capacitor.config.ts` menetapkan `StatusBar: { overlaysWebView: true, style: 'DARK' }`.
* **Dampak Desain:** Status bar transparan menumpuk di atas WebView.
* **Perbaikan Kode:**
  - Header aplikasi (`NativeHeader.tsx`) wajib mempertahankan `pt-safe` (`padding-top: max(env(safe-area-inset-top), 16px)`) agar logo Kaos Kami dan tombol back tidak tertusuk oleh kamera punch-hole Android atau Dynamic Island iPhone.
  - Bagian bawah aplikasi yang memuat `TabBar.tsx` wajib mempertahankan `pb-safe` (`padding-bottom: max(env(safe-area-inset-bottom), 12px)`) agar tab navigasi tidak menabrak bar navigasi sistem Android.

### 2. Virtual Keyboard Push Handling

* **Kondisi Kode:** Menggunakan `@capacitor/keyboard` dengan `resize: KeyboardResize.Body`.
* **Dampak Desain:** Saat pengguna mengetik di live chat CS Kamito atau mengisi form alamat/checkout, keyboard virtual setinggi 280px–320px muncul ke atas.
* **Perbaikan Kode:**
  - Komponen modal dan form input menggunakan `max-h-[calc(100dvh-var(--keyboard-height,0px))]`.
  - Input teks chat CS Kamito (`MobileKamitoChatWidget.tsx`) otomatis terdorong persis di atas keyboard tanpa terpotong.

### 3. Pembersihan Residu Font `Syne` di Mobile

* **Temuan Kode Sumber:** Pada file `kaos-kami-mobile/src/components/chat/MobileKamitoChatWidget.tsx` baris 240, ditemukan kode hardcoded:
  ```tsx
  <span className="text-[11px] font-bold block leading-tight font-['Syne'] text-[#FF6B35]">
    Tanya Kamito
  </span>
  ```
* **Perbaikan:** Menghapus `font-['Syne']` dan menggantinya dengan `font-sans font-semibold text-zinc-100` agar konsisten dengan doktrin tipografi modern.

### 4. Optimalisasi Kinerja GPU & Thermal Throttling

* **Kondisi Layar Sentuh:** GPU mobile (seperti Adreno pada Snapdragon atau Mali pada MediaTek) cepat panas jika merender WebGL tanpa henti pada 60/120 FPS.
* **Solusi Efisiensi:**
  - Canvas 3D menggunakan konfigurasi `frameloop="demand"`: panggung Three.js HANYA merender frame baru saat pengguna memutar pakaian atau mengganti sablon/warna. Saat pakaian diam, konsumsi daya GPU turun menjadi **0%**, menghemat baterai HP secara drastis!
  - Batasi resolusi render kanvas ke `dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}` untuk mencegah layar Quad-HD merender 4x piksel yang tidak perlu.

---

## 29. ⚖️ MATRIKS KESETARAAN & HARMONISASI CROSS-PLATFORM (WEB VS MOBILE CAPACITOR)

Untuk menjamin pengguna mendapatkan pengalaman mewah dan konsisten di platform mana pun mereka membuka Kaos Kami, berikut adalah matriks perbandingan dan aturan harmonisasinya:

| Aspek / Komponen              | Responsive Web Desktop / Laptop         | Responsive Web Mobile (HP)                              | Native Capacitor App (`kaos-kami-mobile`) |
| :---------------------------- | :-------------------------------------- | :------------------------------------------------------ | :------------------------------------------ |
| **Viewport Engine**     | `100vh` standar desktop               | `100dvh` (Dynamic URL Bar Aware)                      | Edge-to-Edge (`pt-safe` & `pb-safe`)    |
| **3D Configurator**     | Layar penuh + Drawer samping 380px      | Bottom Sheet geser naik (`h-[50dvh]` / `h-[85dvh]`) | Native Bottom Sheet + Haptic Tick Feedback  |
| **Frameloop Three.js**  | `always` / `demand` (GPU Dedicated) | `demand` (Hemat baterai HP)                           | `demand` (0% idle battery draw)           |
| **Model 3D Loading**    | DRACO compressed (<1.5MB)               | DRACO compressed (<1.5MB)                               | CacheStorage lokal terverifikasi            |
| **Widget Live Chat**    | Draggable FAB kapsul di desktop         | Bubble Avatar 44px minimalis pojok kanan                | Floating Pill`bottom-20` di atas TabBar   |
| **Dialog Konfirmasi**   | `ConfirmDialog.tsx` spring popover    | `ConfirmDialog.tsx` modal terpusat                    | Native Haptic Alert / Bottom Confirm Dialog |
| **Tipografi Antarmuka** | `Plus Jakarta Sans` + `font-mono`   | `Plus Jakarta Sans` (Zero Syne di UI)                 | `Plus Jakarta Sans` (Zero Syne di UI)     |
| **Metode Pembayaran**   | Duitku Redirect / Popup QRIS            | Duitku Webview / QRIS Scan                              | In-App Browser Duitku + Deep-link e-Wallet  |

---

## 30. 🚀 ADOPSI STANDAR STARTUP TIER-1 (LINEAR × APPLE WWDC × EMIL KOWALSKI)

Berdasarkan riset mendalam pada repositori desain engineering resmi industri tech modern (seperti `emilkowalski/skills`, *Linear App Design*, dan *Apple WWDC Fluid Interfaces*), proyek Kaos Kami secara resmi mengadopsi standar eksekusi antarmuka startup global untuk membasmi segala bentuk *AI slop*, desain amatir tugas sekolah, maupun antarmuka kaku:

### 1. Sepuluh Standar Mutlak Desain Rekayasa Antarmuka (Non-Negotiable)

1. **Justified Motion:** Setiap animasi wajib memiliki tujuan fungsional nyata (feedback, konsistensi spasial, indikasi status, atau jembatan layout). Dilarang membuat animasi semata-mata karena "terlihat keren" pada elemen data yang sedang dibaca pengguna.
2. **Frequency-Appropriate Budget:** Aksi keyboard dan navigasi cepat (100+ kali/hari) dijalankan tanpa animasi (instan). Aksi reguler menggunakan transisi cepat sub-150ms. Aksi modal/drawer menggunakan animasi 200ms–280ms.
3. **Responsive Easing:** Dilarang keras menggunakan `ease-in` pada elemen UI yang masuk. Wajib menggunakan `cubic-bezier(0.16, 1, 0.3, 1)` atau peredam pegas kritis (*critically damped spring*).
4. **Sub-300ms Interaction Budget:** Seluruh modal, drawer, dan popover wajib menyelesaikan animasi dalam tempo di bawah 300ms. Animasi keluar (*exit*) wajib 30%–50% lebih cepat dibanding animasi masuk.
5. **Physical Correctness & Scale Anchors:** Dilarang menganimasikan modal dari `scale(0)`. Skala awal modal wajib dimulai dari `scale(0.95)` atau `scale(0.97)` dipadu dengan `opacity`. Dropdown dan menu wajib memiliki `transform-origin` tepat di titik tombol pemicunya (*trigger*).
6. **Continuous Interruptibility:** Gestur dan animasi tidak boleh mengunci input pengguna. Jika pengguna membatalkan atau memegang kembali elemen yang sedang bergerak, elemen harus langsung mengikuti kursor/jari dari posisi live-nya di layar tanpa melompat ke titik awal.
7. **Strict GPU-Only Transitions:** Animasi hanya boleh memanipulasi `transform` (`translate3d`, `scale`) dan `opacity`. Dilarang keras menganimasikan `width`, `height`, `margin`, `padding`, `top`, `left` yang memicu *layout thrashing* dan penurunan FPS.
8. **No-Stuck-Hover Mobile Doctrine:** Seluruh selector `:hover` wajib dibungkus dalam media query `@media (hover: hover) and (pointer: fine)` agar tidak meninggalkan efek hover palsu yang tersangkut di layar sentuh ponsel.
9. **Immediate Pointer-Down Feedback:** Tombol wajib merespons tekanan seketika pada event `pointerdown` / `:active` (`transform: scale(0.97)` dalam 100ms), bukan menunggu event `click` selesai.
10. **Optical Sizing & Semantic Color Tokens:** Hirarki warna gelap presisi berstandar OLED (`#0A0A0C` canvas, `#141418` surface, hairline border `#27272A`, aksen `#F97316`). Tipografi fungsional 100% menggunakan `Plus Jakarta Sans` dengan zero-clutter.

### 2. File Sumber Kebenaran Desain (SSOT)

- Telah dibuat file panduan permanen di root repositori: `DESIGN.md` sebagai acuan tunggal seluruh komponen.
- Telah diaktifkan skill internal AI di `.agents/skills/startup-design-engineering/SKILL.md` untuk mengawal setiap baris kode komponen agar memenuhi standar startup kelas dunia.

---

## 31. 🛡️ INTEGRASI STANDAR ANTI-AI-SLOP GLOBAL: HALLMARK (58 GATES) & IMPECCABLE (PAUL BAKAUS CRAFT FLOOR)

Untuk memastikan platform Kaos Kami terbebas 100% dari kesan antarmuka murahan, template Next.js generik, atau hasil prompt kecerdasan buatan yang tidak bernyawa, repositori ini telah memasang dan mengintegrasikan dua framework standar emas industri dunia:

### 1. Hallmark (`nutlope/hallmark` — Together AI / Hassan El Mghari)

Telah diinstal ke dalam `.agents/skills/hallmark/` dengan 58 gerbang uji kepatuhan (*Slop-Test Gates*):

- **Visual Integrity Gates:**
  - *Gate 1 (Font Ban):* Dilarang keras menggunakan font generik seperti Inter, Roboto, Poppins, Open Sans sebagai display headline. Standar kita: `Plus Jakarta Sans` berbobot tebal dan bersih.
  - *Gate 2 (Gradient Text Ban):* Dilarang keras menggunakan teks judul bergradasi warna (`background-clip: text`). Penekanan teks wajib berasal dari perbedaan bobot font (`font-bold`) atau ukuran, bukan gradasi warna ungu/cyan klise.
  - *Gate 3 (Card Grid Ban):* Dilarang menggunakan grid 3 kolom kartu berukuran sama dengan format lazy "icon di atas judul". Setiap seksi harus memiliki variasi asimetris atau layout berbasis data nyata.
  - *Gate 4 (No Nested Cards):* Dilarang keras meletakkan kartu di dalam kartu lain.
  - *Gate 5 (No Side-Stripe Border):* Dilarang menggunakan aksen garis tepi tebal di kiri/kanan kartu (`border-l-4`).
  - *Gate 6 (Off-Axis Hero):* Dilarang membuat hero section di mana seluruh elemen (badge, judul, deskripsi, CTA) bertumpuk di satu sumbu tengah (*centred-everything*). Paling banyak 2 elemen yang boleh berada di tengah; sisanya harus berlabuh asimetris.
- **Typography & Interaction Discipline:**
  - *Max 3 Font Families:* Seluruh platform hanya menggunakan 2+1 font: `Plus Jakarta Sans` (UI & Body), `Plus Jakarta Sans Display` (Headline Display), dan `JetBrains Mono` / `font-mono` (Khusus angka tabular, dimensi cetak DTF 30cm, nomor resi, dan SKU produk).
  - *No Italic Display Headlines:* Dilarang membuat judul atau header dengan gaya tulisan miring (*italic*). Tulisan miring hanya boleh digunakan untuk penekanan kata dalam paragraf panjang.
  - *Eight Interactive States:* Seluruh elemen interaktif wajib mengimplementasikan 8 state lengkap: *default, hover, active, focus-visible, disabled, loading, error, success*.
  - *Contrast Thresholds (WCAG 4.5:1 & APCA Lc >= 60):* Warna teks tombol dilarang berada dalam rentang kecerahan yang mirip dengan latar belakang tombol. Tombol aksi wajib memiliki kontras tajam.
  - *No Fabricated Metrics:* Dilarang menulis metrik palsu (misal: "99.9% Kepuasan", "10x Lebih Cepat"). Gunakan fakta teknis nyata workshop Makassar: "Sablon DTF Presisi 30.0 cm", "Toleransi Oven 160°C", "Kapasitas 100 Kaos/Hari".

### 2. Impeccable (`pbakaus/impeccable` — Paul Bakaus, Creator of jQuery UI & Ex-Google)

Telah diinstal ke dalam `.agents/skills/impeccable/` dengan aturan mutlak *Craft Floor* dan segmentasi *Surface Modes*:

- **Segmentasi Surface Mode Kaos Kami:**
  1. **Mode `Operate` (Dashboard Admin `/admin/*` & User Dashboard `/dashboard/*`):**
     - Fokus utama: Pemindaian visual instan (*scanability*), densitas data yang nyaman, aksi cepat, nol dekorasi yang mengaburkan data.
     - Brand identity hadir melalui ketepatan detail (micro-badge status pesanan, divider halus, zero-jitter buttons).
  2. **Mode `Experience` (Studio 3D `/studio`):**
     - Fokus utama: Kanvas visual 3D Three.js memimpin sejak viewport pertama. UI kontrol HUD dan drawer melayang dengan elegan dan segera menepi agar fokus pengguna tetap pada pakaian 3D.
  3. **Mode `Persuade` (Beranda `/`, Landing Page, Katalog Produk `/catalog`):**
     - Fokus utama: Membangun kepercayaan tinggi, menampilkan hasil fisik sablon DTF Makassar beresolusi tajam, dan memandu pengguna ke tombol kustom 3D.
  4. **Mode `Read` (Halaman `/faq`, `/terms-and-conditions`, `/refund-policy`, `/kontak`):**
     - Fokus utama: Kenyamanan membaca artikel (lebar kolom 65–75ch), navigasi dokumen cepat, hierarki heading terstruktur rapi.
- **Craft Floor Mandates:**
  - *Browser Surfaces Theming:* Bagian default browser yang sering dilupakan AI wajib distilasi dari palet desain: warna kursor ketik (*caret-color*), highlight seleksi teks (*::selection*), scrollbar tipis kustom, dan ring fokus keyboard.
  - *Zero Hard-Offset Shadows:* Bayangan blok keras (`box-shadow: 4px 4px 0`) dilarang keras di luar tema neobrutalist. Gunakan bayangan halus realistis dengan blur berbobot.
  - *Real SVG Icons Only:* Dilarang menggunakan emoji Unicode (*🚀 🔥 ✨ 🎯*) sebagai representasi fitur atau langkah proses. Wajib menggunakan ikon vektor Lucide berskala konsisten (1.5px / 2px stroke).

---

## 32. ⚙️ BLUEPRINT FORENSIK & ARSITEKTUR REDESIGN DASHBOARD ADMIN (`/admin/*`)

Dashboard Admin Kaos Kami adalah kokpit operasional internal yang digunakan oleh **Owner UMKM, Staf Produksi Workshop DTF, dan Kurir Antar Makassar**. Berdasarkan panduan Mode `Operate` dari Impeccable dan standar gerak Emil Kowalski, berikut adalah cetak biru restrukturisasinya:

### 1. Masalah & Anti-Pattern Dashboard Admin Saat Ini

1. **Navigasi Sidebar Terlalu Vertikal & Penuh:** Sidebar memuat 14 tautan menu yang saling berebut perhatian, memaksa pengguna laptop (1366×768) terus menggulir sidebar hanya untuk berpindah modul.
2. **Kartu Statistik Klise AI (Hero Metric Cards):** Tampilan `/admin` masih menggunakan kartu metrik generik (angka raksasa di atas label kecil dengan aksen warna di pojok) yang tidak mencerminkan dinamika operasional sablon harian.
3. **Pemberitahuan & Alert Kurang Kontekstual:** Saat pesanan baru masuk atau ada desain yang memerlukan verifikasi manual (DPI rendah / dimensi melebihi 30cm), admin belum mendapatkan indikator visual instan di tabel antrean.
4. **Ketiadaan Command Bar (Power-User Experience):** Belum ada navigasi keyboard cepat (`Cmd+K` / `Ctrl+K`) untuk mencari pesanan, pelanggan, atau resi tanpa menyentuh mouse.

### 2. Arsitektur Baru Dashboard Admin (Mode `Operate` Berdaya Tinggi)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🖥️ KOKPIT DASHBOARD ADMIN KAOS KAMI (STANDAR MODE OPERATE)                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Top Utility Bar]                                                                      │
│   • Breadcrumbs hierarkis: Admin > Workshop DTF > Antrean Sablon                      │
│   • Command Bar Search Input [ Ctrl + K ] (Cari Resi, Nama Customer, No. Order)       │
│   • Live System Status Indicator (Turso Edge DB: Connected • Fonnte WA: Active)      │
│   • Admin Bell Notification Pill (Alert Pesanan Baru / Gagal Cetak)                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Pillar Segmented Navigation (Sub-Header Tabs)]                                        │
│   [ 📊 Ikhtisar & Order ]  [ 🖨️ Workshop Sablon DTF ]  [ 🚚 Pengiriman ]  [ ⚙️ Toko ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Main Operational Workspace]                                                           │
│                                                                                        │
│   A. Seksi Workshop Sablon DTF (Kanban Papan Produksi Real-Time):                      │
│      • Kolom: Menunggu Cetak -> Sedang Print Film -> Oven Lem -> Press Kaos -> QC     │
│      • Kartu Produksi Memuat:                                                          │
│        - Mini Thumbnail Mockup 3D (Tampak Depan/Belakang)                              │
│        - Nama Bahan: Cotton Combed 24s / 30s / Heavyweight                             │
│        - Dimensi Sablon Terverifikasi (misal: 28.5 cm × 19.2 cm)                       │
│        - Badge Indikator Resolusi Decal: Hijau (300 DPI) / Kuning (<200 DPI)           │
│        - Tombol Aksi 1-Klik: "Download Master Cetak R2" & "Pindah ke Pressing"        │
│                                                                                        │
│   B. Seksi Gang Sheet DTF 100×58 cm (`/admin/gang-sheet`):                             │
│      • Visualisasi grid kanvas film meteran DTF (58cm lebar cetak roll).               │
│      • Nesting otomatis tata letak logo dada, punggung, dan lengan untuk meminimalkan  │
│        pemborosan film sablon DTF (Zero-Waste Layout Engine).                          │
│                                                                                        │
│   C. Seksi CS Live Chat Kamito Monitoring (`/admin/chat`):                             │
│      • Antarmuka dual-pane: Daftar room pembeli di kiri, percakapan live di kanan.     │
│      • Status bot: "Kamito AI Aktif". Tombol "Ambil Alih (Human CS)" berlatar oranye.   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Quick Action & Keyboard Shortcuts untuk Admin

- `Ctrl + K` : Buka Command Palette pencarian global.
- `1` / `2` / `3` / `4` : Berpindah antar 4 pilar utama (*Overview, Production, Delivery, Store*).
- `Esc` : Menutup modal/dialog konfirmasi tanpa jeda.

---

## 33. 🛍️ BLUEPRINT FORENSIK & ARSITEKTUR REDESIGN DASHBOARD USER (`/dashboard/*`)

Dashboard Pelanggan Kaos Kami adalah tempat di mana pembeli memantau status sablon pakaian mereka, menyimpan koleksi desain 3D, mengelola alamat pengiriman di Makassar maupun luar kota, dan melakukan pemesanan ulang (*repeat order*).

### 1. Masalah & Kelemahan Dashboard User Saat Ini

1. **Monolitik 957 Baris (`CustomerDashboardView.tsx`):** Seluruh antarmuka digabung dalam satu file raksasa dengan tab navigation manual, membuat pengelolaan state berat dan kurang adaptif di layar smartphone.
2. **Ketiadaan Hub Ringkasan Pengguna (Welcome Hub):** Pengguna langsung disuguhkan daftar tabel pesanan yang dingin dan teknis. Tidak ada kartu sambutan yang ramah, ringkasan pesanan yang sedang aktif diproduksi, maupun shortcut ke studio 3D.
3. **Status Pesanan Kurang Berjiwa Sablon:** Stepper status pesanan saat ini masih berupa bullet teks standar (`Dipesan`, `Lunas`, `Cetak DTF`, `Selesai`). Pelanggan tidak bisa merasakan proses fisik pakaian mereka yang sedang disablon di workshop Makassar.
4. **Fitur Repeat Order Belum Menonjol:** Banyak distro dan komunitas lokal di Makassar melakukan repeat order secara berkala. Fitur pemesanan ulang (*Reorder*) saat ini tersembunyi kecil di dalam detail pesanan.

### 2. Arsitektur Baru Dashboard User (Mode `Operate` & `Persuade`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 👤 DASHBOARD CUSTOMER KAOS KAMI (STANDAR MODE OPERATE + DELIGHT)                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Personalized Welcome Banner]                                                          │
│   • Sapaan: "Halo, [Nama Pengguna]! Pakaian kustom Anda sedang dikerjakan."           │
│   • Quick Summary Pills:                                                               │
│     - 📦 1 Pesanan Aktif (Dalam Proses Press Sablon)                                  │
│     - 🎨 4 Desain Tersimpan di Wardrobe 3D                                            │
│     - 🎟️ 1 Voucher Diskon Ongkir Makassar Tersedia                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Highlight Card: Lacak Pesanan Paling Aktif (Real-Time DTF Tracker)]                  │
│                                                                                        │
│   No. Pesanan: #KK-261004-9821 • Kaos Combed 24s Hitam (Size L, Sablon A3 Depan)       │
│                                                                                        │
│   ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐         │
│   │   ✓   │───▶│   ✓   │───▶│ 🖨️ ▶ │───▶│  ⏱️   │───▶│  🚚   │───▶│  📦   │         │
│   └───────┘    └───────┘    └───────┘    └───────┘    └───────┘    └───────┘         │
│    Dipesan       Lunas      Cetak Film   Oven & Press   Kurir Antar   Diterima        │
│                                                                                        │
│   Estimasi Selesai: Besok Sore (~17:00 WITA) • Workshop Tallo (Jl. Galangan Kapal), Makassar│
│   [ Hubungi CS Workshop via WA ]       [ Lihat Faktur & Detail Lengkap ]               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Navigasi Tab Konten Berbobot]                                                         │
│   [ 📦 Semua Pesanan (3) ]  [ 🎨 Wardrobe Desain 3D (4) ]  [ 📍 Alamat ]  [ 🎟️ Promo ]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Koleksi Desain Tersimpan (Wardrobe 3D)]:                                              │
│   • Tampilan kartu pakaian dengan thumbnail sudut 3D dinamis.                          │
│   • Tombol 1-Klik: "Buka di Studio 3D" (langsung load model, warna, dan posisi sablon) │
│   • Tombol 1-Klik: "Pesan Sekarang" (masuk keranjang dengan kalkulasi harga seketika)  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Riwayat Pesanan & 1-Click Instant Reorder]:                                           │
│   • Daftar pesanan masa lalu dengan rincian ukuran (S, M, L, XL, XXL).                 │
│   • Tombol mencolok "Pesan Ulang Desain Ini" (Reorder): Langsung memuat jumlah pesanan │
│     dan file sablon yang sama ke keranjang belanja tanpa perlu upload ulang.          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Sentuhan Delights & Humanisasi (Anti-AI-Slop):

- **Jadwal Kerja Workshop Jujur:** Estimasi pengerjaan secara otomatis memperhitungkan hari libur workshop (Minggu tutup) sehingga pelanggan tidak menerima janji palsu.
- **Transparansi Cetak DTF:** Terdapat visualisasi penjelasan ringkas tentang apa itu sablon DTF (*Direct Transfer Film*), mengapa sablon Kaos Kami tahan cuci puluhan kali, dan instruksi perawatan pakaian (jangan disetrika langsung di atas sablon).
- **Integrasi Kurir Lokal Makassar vs Ekspedisi:** Jika pelanggan memilih kurir lokal Makassar, tampilkan badge *"Antar Langsung Tim Kaos Kami (Makassar)"* dengan nomor kontak driver. Jika ekspedisi nasional (JNE/J&T), sediakan tombol salin resi otomatis dan link pelacakan langsung.

---

## 34. 🧹 FORENSIC DE-SLOP & RADICAL MINIMALIST PURGE (MEMBASMI KESAN 'BUATAN ANAK KECIL' & TEKS BERLEBIH)

Berdasarkan tinjauan kritis mendalam terhadap seluruh halaman dan keluhan nyata pengguna (*"kenapa dashboard admin dan user banyak banget penuh gak rapi berantakan... kebanyakan teks bikin gak premium dan profesional, checkout dan login terasa murahan dan kayak buatan anak kecil..."*), dilakukan pembedahan forensik akar masalah:

### 1. Tiga Dosa Besar AI-Slop yang Mengotori Kode Saat Ini

1. **Sindrom "Kostum Monospace" (The Fake Technical Costume):**
   - Model AI secara otomatis menambahkan `font-mono uppercase tracking-widest` pada hampir setiap tombol, tag kategori, label tabel, hingga seluruh seksi landing page (`AboutWorkshopSection` baris 34).
   - *Dampak:* Website terlihat seperti terminal hacker amatir atau tugas kuliah pemrograman, bukan platform e-commerce fashion & apparel mewah seperti Apple, Uniqlo, atau Linear.
   - *Solusi:* **Hapus total `font-mono` dari seluruh teks deskriptif, tombol, judul, dan navigasi.** Font monospace **HANYA** diizinkan untuk data angka tabular presisi: harga rupiah (`Rp 85.000`), kode order (`#KK-261004`), dan dimensi fisik (`30.0 cm`).
2. **Sindrom "Tembok Teks" (Wall of Text & Over-Explaining):**
   - Hampir setiap kartu diisi oleh 2–3 baris paragraf instruksi panjang yang tidak pernah dibaca manusia.
   - *Dampak:* Antarmuka terasa bising, melelahkan, dan amatir.
   - *Solusi:* **Pangkas 60%–70% teks.** Desain startup kelas dunia berbicara melalui hierarki visual, kontras yang percaya diri, dan aksi langsung.
3. **Abstraksi Fiktif Alur Produksi:**
   - AI sebelumnya memodelkan 7 tahapan pabrik sablon rumit (*"SCREEN_PRINT_SETUP", "PRINTING", "OVEN_POWDER"*) yang tidak sesuai dengan realitas operasional Kaos Kami.
   - *Realitas Bisnis:* Kaos Kami memesan cetakan film sablon ke **Maklon DTF**, dan staf internal di workshop Tallo (Jl. Galangan Kapal) **HANYA MENEMPELKAN (Heat Press)** film sablon tersebut ke kaos katun combed polos.

---

## 35. ⚙️ BLUEPRINT RAMPING DASHBOARD ADMIN (`/admin/*`) — REALITAS MAKLON & HEAT PRESS

Pangkas 14 sub-halaman admin yang membingungkan menjadi **5 Modul Inti Fungsional & Berbobot**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🖥️ KOKPIT ADMIN KAOS KAMI (5 MODUL INTI BERDAYA TINGGI)                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [1. 📊 ANALITIK & RINGKASAN]                                                           │
│   • Metrik harian: Omset hari ini, pesanan baru masuk, pesanan menunggu press.         │
│   • Zero grafik hiasan kosong: Hanya data riil transaksi Turso DB.                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [2. 🖨️ WORKSHOP SABLON (PEKERJA TEMPEL HEAT PRESS)]                                    │
│   • Tujuan: Staf sablon hanya butuh tahu di mana menempel dan desainnya seperti apa.   │
│   • Fitur Kartu Kerja:                                                                 │
│     1. Preview visual 3D baju pembeli (depan/belakang) agar tidak salah posisi.        │
│     2. Panduan fisik penempelan (contoh: Dada Depan, 7 cm di bawah kerah, Size L).     │
│     3. Tombol 1-klik: "Unduh Master Cetak (PNG/PDF)" untuk dikirim ke Maklon DTF.     │
│     4. Tombol status taktil: "Siap Press" ➔ "Sudah Dipress & Selesai".                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [3. 🚚 LOGISTIK & PENGIRIMAN (KURIR MAKASSAR & EKSPEDISI)]                             │
│   • Tab 1: Antar Langsung Tim Kaos Kami (Makassar)                                     │
│     - Nama pembeli, alamat pengiriman, patokan rumah.                                  │
│     - Tombol 1-klik: "Buka Google Maps" (`https://www.google.com/maps/search/?api=1`)  │
│     - Tombol 1-klik: "Chat WhatsApp Pembeli" (`https://wa.me/62...`) langsung ke WA! │
│       (Tidak perlu bot AI yang rumit untuk pengiriman; kurir langsung chat manusia).   │
│     - Tombol 1-klik: "Paket Terkirim".                                                 │
│   • Tab 2: Ekspedisi Luar Kota (JNE / J&T / SiCepat)                                   │
│     - Kolom input nomor resi cepat + tombol simpan.                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [4. 👥 KELOLA PESANAN, PELANGGAN & LIVE CHAT]                                          │
│   • Daftar transaksi masuk, riwayat pembayaran iPaymu / Duitku.                        │
│   • Live Chat CS Kamito dengan tombol "Ambil Alih Human CS".                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [5. 🌐 KELOLA WEBSITE & ETALASE (CMS SEDERHANA)]                                       │
│   • Etalase produk siap beli (kaos polos combed, hoodie, merch).                       │
│   • Edit informasi toko: Alamat workshop Tallo Makassar, jam operasional, link         │
│     Instagram, TikTok, dan nomor WhatsApp resmi.                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 36. 👤 BLUEPRINT RAMPING DASHBOARD USER (`/dashboard/*`) — 5 STATUS TERPADU & OTP

Sederhanakan komponen monolitik `CustomerDashboardView.tsx` menjadi antarmuka bersih yang memprioritaskan transparansi pesanan, desain tersimpan, dan keamanan akun:

### 1. Lima Status Pesanan Riil (Terintegrasi Penuh dengan Admin)

1. 🟡 **Menunggu Dicek:** Pesanan masuk, sedang diverifikasi ketersediaan stok atau file oleh admin.
2. 🟠 **Menunggu Pembayaran Kamu:** Menampilkan rincian bayar, QRIS interaktif, atau rekening bank dengan batas waktu.
3. 🔵 **Sedang Diproses:** Film sablon sedang dipesan ke maklon / sedang ditempel (heat press) oleh staf workshop.
4. 🟣 **Sedang Diantar:** Paket sedang dibawa oleh kurir lokal Makassar (dengan nomor WA kurir) atau kurir ekspedisi (dengan nomor resi).
5. 🟢 **Selesai:** Pakaian telah diterima oleh pembeli.

### 2. Wardrobe 3D (Desain Tersimpan Saya)

* Menampilkan kartu pakaian kustom dengan thumbnail sudut pandang 3D.
* **Tombol "Buka di Studio 3D":** Seketika memuat kembali pakaian, warna kain, dan posisi stiker sablon ke `/studio` untuk diedit ulang.
* **Tombol "Pesan Lagi":** Memasukkan desain ke checkout tanpa mendesain dari awal.

### 3. Manajemen Akun, Profil, & Ganti Nomor HP via OTP

* **Data Profil:** Ubah Nama Lengkap dan Kata Sandi.
* **Ganti Nomor WhatsApp:** Untuk keamanan transaksi, saat pengguna mengganti nomor WhatsApp, sistem mengirimkan **6 digit kode OTP via WhatsApp Fonnte** ke nomor baru tersebut sebelum nomor diperbarui di database.
* **Buku Alamat Pengiriman:** Simpan alamat utama Makassar (dengan patokan jalan) dan alamat luar kota.

---

## 37. 💎 RESTRUKTURISASI CHECKOUT, LOGIN MODAL, HOME & STUDIO (STANDAR STARTUP GLOBAL)

### 1. Pembersihan Modal Autentikasi (`AuthModal.tsx`)

* **Masalah:** Komponen setebal 1.100 baris dengan garis gradasi warna-warni, input bertumpuk, dan teks bertele-tele yang terkesan murahan.
* **Standar Baru:**
  * Modal ramping berbasis spring physics (`scale(0.97)` to `scale(1)`).
  * Form Login Minimalis: Masukkan Email / WhatsApp + Kata Sandi.
  * Tab Pendaftaran: Nama, WhatsApp/Email, Kata Sandi.
  * Hapus garis neon dan teks dekoratif yang tidak perlu.

### 2. Pembersihan Alur Checkout (`CheckoutModal.tsx` & `/api/checkout`)

* Rampingkan formulir ke dalam 2 langkah cepat:
  * **Langkah 1 (Alamat):** Pilih Ambil di Workshop, Kurir Kaos Kami Makassar, atau Ekspedisi Nasional.
  * **Langkah 2 (Bayar):** Pilih QRIS / Transfer Bank, tampilkan total bersih (Harga Kaos + Sablon + Ongkir).
* Hapus pop-up peringatan bertumpuk yang membingungkan pembeli.

### 3. Pembersihan Home (`page.tsx`) & Studio (`/studio`)

* **Home:** Hapus kelas `font-mono` di elemen naratif. Gunakan tipografi proporsional `Plus Jakarta Sans` berkarakter editorial elegan.
* **Studio:** Kapsul chat widget Kamito dibuat mengecil menjadi avatar bubble 44px di pojok agar tidak menabrak tombol kontrol 3D.

---

## 38. 🗑️ ELIMINASI MENU GANDA & PERAMPINGAN TOTAL SIDEBAR ADMIN (DARI 14 MENU MENJADI 5 MENU UTAMA)

Berdasarkan audit mendalam atas duplikasi fungsional yang membingungkan (*"apakah ada rencana mengurangi menu sidebar juga dan tidak ada lagi menu ganda yang fungsinya sama?"*), ditetapkan **Keputusan Arsitektur Mutlak**:

### 1. Daftar 9 Menu Ganda & Redundant yang Dieliminasi dari Sidebar

1. ❌ **`Review Desain Sablon (/admin/review)` DIHAPUS DARI SIDEBAR:**
   * *Alasan:* Review desain sablon adalah bagian tak terpisahkan dari data pesanan itu sendiri. Memisahkannya ke halaman tersendiri menciptakan fragmentasi kerja. Review desain langsung disematkan di dalam kartu pesanan di Modul Pesanan & Produksi.
2. ❌ **`Laporan Finansial (/admin/laporan)` DIGABUNG KE IKHTISAR:**
   * *Alasan:* Menu `/admin` (Ikhtisar) dan `/admin/laporan` adalah menu ganda yang sama-sama menampilkan total omset dan grafik pendapatan. Keduanya disatukan ke dalam satu tab analitik ringkas di Modul 1.
3. ❌ **`Gang Sheet DTF 100x58 (/admin/gang-sheet)` DIHAPUS DARI SIDEBAR:**
   * *Alasan:* Kaos Kami menggunakan jasa Maklon DTF untuk pencetakan film meteran; staf internal di workshop Makassar fokus pada penempelan (heat press). Fitur ini tidak relevan untuk operasional harian.
4. ❌ **`Aset 3D Apparel (/admin/assets)` DIHAPUS DARI SIDEBAR:**
   * *Alasan:* Aset GLB pakaian sudah terkelola di level basis data dan jarang diubah oleh admin operasional.
5. ❌ **`Tarif & Zona Ongkir (/admin/shipping)` DIGABUNG KE PENGATURAN TOKO:**
   * *Alasan:* Pengaturan tarif ongkir adalah konfigurasi statis, bukan menu operasional harian kurir.
6. ❌ **`Katalog Bahan (/admin/catalog)` DIGABUNG KE PENGATURAN TOKO:**
   * *Alasan:* Disatukan bersama manajemen produk jadi di Modul Kelola Toko (CMS).
7. ❌ **`Database Pelanggan (/admin/customers)` DIGABUNG KE MODUL PESANAN:**
   * *Alasan:* Informasi pelanggan langsung dapat dilihat dan dicari dari daftar pesanan dan riwayat kontak.
8. ❌ **`Kupon & Promo Diskon (/admin/coupons)` DIGABUNG KE PENGATURAN TOKO:**
   * *Alasan:* Promo adalah sub-seksi dari CMS toko.
9. ❌ **`Informasi Sistem (/admin/settings)` DIGABUNG KE PENGATURAN TOKO:**
   * *Alasan:* Disatukan ke dalam satu panel terpadu.

### 2. Lima (5) Menu Utama Baru yang Bersih, Fokus, & Zero Duplikasi

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧭 SIDEBAR ADMIN KAOS KAMI V2 (MINIMALIS & ZERO DUPLIKASI)                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 📊 Pesanan & Analitik      (/admin)                                                 │
│    • Menggabungkan: Daftar transaksi baru, verifikasi pembayaran, omset harian, dan    │
│      pencarian riwayat pesanan (menggantikan /admin/orders + /admin/laporan).         │
│                                                                                        │
│ 2. 🖨️ Workshop Sablon (Press)  (/admin/production)                                     │
│    • Satu-satunya ruang kerja staf sablon: Preview 3D kaos pembeli, panduan penempelan │
│      (cm & kerah), tombol unduh PNG maklon, dan tombol status "Sudah Dipress".        │
│                                                                                        │
│ 3. 🚚 Pengiriman & Kurir      (/admin/deliveries)                                      │
│    • Satu-satunya ruang kerja kurir: Antar Tim Makassar (Google Maps + WA Pembeli)     │
│      dan Ekspedisi Luar Kota (Input Nomor Resi).                                       │
│                                                                                        │
│ 4. 💬 Live Chat CS            (/admin/chat)                                            │
│    • Monitoring interaksi pembeli dengan Kamito AI + tombol ambil alih Human CS.      │
│                                                                                        │
│ 5. ⚙️ Pengaturan Toko & CMS   (/admin/settings)                                        │
│    • Menggabungkan: Etalase produk siap beli, tarif ongkir, kupon promo, dan info toko │
│      (alamat workshop Makassar, nomor WhatsApp, Instagram & TikTok).                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Dengan struktur 5 menu ini, sidebar admin tidak lagi membutuhkan scroll pada layar laptop 1366×768, tidak ada lagi kebingungan *"harus klik menu yang mana"*, dan staf workshop maupun kurir dapat bekerja dengan efisiensi 100%.

---

## 39. 📐 RESOLUSI GIZMO 3D: TRANSISI KE 2D SCREEN-SPACE BOUNDING BOX & ARSITEKTUR BATAS CETAK DTF

Berdasarkan analisis kritis terhadap bug *"gizmo melayang di udara dan macet saat digeser ke lengan"*, ditetapkan **Keputusan Rekayasa Sistem 3D**:

### 1. Mengapa Gizmo Melayang (Pembedahan Teknis):

* **Penyebab Akar:** Komponen `DecalGizmo.tsx` merender elemen HTML di dalam 3D menggunakan Drei `<Html transform>` pada bidang datar konstan ($Z = zBase$). Karena kain kaos 3D melengkung dan memiliki ketebalan anatomis, kotak kontrol HTML yang datar tampak **melayang 2–5 cm di depan dada pakaian**.
* **Solusi Baku (Standar Figma / Canva 3D):**
  * Kanvas Three.js WebGL murni merender pakaian dan tekstur stiker sablon (`<Decal>`).
  * Di atas kanvas WebGL, dipasang **Layer Interaksi 2D Transparan (SVG Screen-Space Overlay)**.
  * Titik jangkar 3D stiker diproyeksikan secara realtime ke koordinat piksel 2D layar pengguna menggunakan fungsi proyeksi Three.js: `vector.project(camera)`.
  * **Hasilnya:** Kotak seleksi **100% menempel pas di atas sablon**, tidak pernah melayang, tidak miring gepeng tipis, dan selalu tajam di semua jenis layar (Retina/OLED).

### 2. Mengapa Stiker Macet Saat Digeser ke Lengan (Pembedahan Teknis):

* **Realitas Fisik Sablon DTF & Pola Kaos:** Kaos fisik dijahit dari potongan pola terpisah (Badan Depan, Badan Belakang, Lengan Kiri, Lengan Kanan). Di antara dada dan lengan terdapat **Jahitan Sambungan Ketiak (Armhole Seam)** yang tebal. Mesin sablon DTF dan heat press **tidak bisa menempelkan sablon menyeberangi jahitan tebal tersebut** (sablon akan retak dan copot).
* **Solusi UX:**
  1. **Visual Print Boundary Box (Area Cetak Maksimal A3):** Saat stiker dipilih, tampilkan garis batas tipis transparan di area dada (Area Cetak Maksimal: 30 cm × 40 cm). Pengguna langsung paham batas fisiknya, sehingga tidak merasa "sistemnya ngebug/nyangkut".
  2. **Smart Zone Transition (Auto-Switch):** Saat stiker diseret melewati batas dada ke arah luar ($X > 0.32$), muncul indikator cerdas atau kamera berputar lembut 90° ke arah lengan kiri dan memindahkan stiker ke sisi lengan secara otomatis tanpa paksaan manual.

---

## 40. 🔍 AUDIT FORENSIK TOMBOL GANDA (DUPLICATE BUTTONS) DI SELURUH STUDIO 3D & SOLUSI PERAMPINGAN

Berdasarkan penelusuran menyeluruh pada seluruh komponen Studio (`StudioClient.tsx`, `StudioHUD.tsx`, `CustomizerDrawer.tsx`, `InspectControls.tsx`, `TestLabControls.tsx`), ditemukan **7 Kasus Tombol Ganda & Tumpang Tindih yang Membebani Layar**:

### 1. Kasus Duplikasi 1: Kontrol Sudut Kamera (Viewport Preset)

* **Lokasi Ganda:**
  - `StudioHUD.tsx` (bar bawah): Tombol `DEPAN`, `BLKNG`, `KERAH`, `LNGN`.
  - `CustomizerDrawer.tsx` (posisi sablon): Tombol `DADA`, `PUNGGUNG`, `LGN KIRI`, `LGN KANAN` (yang memanggil fungsi `setCameraPreset` yang persis sama).
* **Masalah:** Pengguna bingung ada dua tempat tombol arah pandang.
* **Solusi Ramping:** Pertahankan tombol kamera HANYA di satu tempat terpadu di `StudioHUD` dock bawah dengan pill minimalis: `[ Depan | Belakang | Lengan ]`.

### 2. Kasus Duplikasi 2: Tombol Saklar Gizmo (Gizmo Toggle ON/OFF)

* **Lokasi Ganda:**
  - `StudioHUD.tsx` baris 193: Tombol `GIZMO` (`onClick={toggleGizmoVisible}`).
  - `CustomizerDrawer.tsx` baris 2251: Tombol `GIZMO ON / GIZMO OFF` (`onClick={toggleGizmoVisible}`).
* **Masalah:** Dua tombol dengan icon `<Move />` dan fungsi 100% identik di layar yang sama.
* **Solusi Ramping:** **Hapus kedua tombol toggle ini!** Di standar software desain modern (Canva/Figma), kotak seleksi (gizmo) **otomatis muncul saat stiker diklik**, dan **otomatis hilang jika pengguna mengklik area kosong/kain**. Tidak perlu ada tombol manual on/off yang memenuhi layar!

### 3. Kasus Duplikasi 3: Mode Interaksi Mouse (PUTAR vs GESER)

* **Lokasi Ganda:**
  - `StudioHUD.tsx` baris 141: Tombol `PUTAR` (`setInteractionTool("rotate")`).
  - `StudioHUD.tsx` baris 156: Tombol `GESER` (`setInteractionTool("pan")`).
* **Masalah:** Memaksa pengguna mengklik tombol bolak-balik hanya untuk menggeser kaos.
* **Solusi Ramping:** **Hapus kedua tombol ini.** Standarkan interaksi 3D global:
  - Drag klik kiri / 1 jari sentuh = **PUTAR (Orbit 360°)**.
  - Drag klik kanan / 2 jari sentuh = **GESER (Pan)**.
  - Scroll mouse / cubit 2 jari = **ZOOM**.

### 4. Kasus Duplikasi 4: Putar 360 Otomatis (Turntable / Auto-Rotate)

* **Lokasi Ganda:**
  - `StudioHUD.tsx` baris 171: Tombol `AUTO / BERPUTAR` (`onClick={toggleRotating}`).
  - `InspectControls.tsx` baris 76: Tombol `TURNTABLE` (`onClick={() => pick("turntable")}`).
* **Masalah:** Dua tombol berbeda untuk memicu animasi putaran 360° yang sama.
* **Solusi Ramping:** Satukan ke tombol ikon putar di dock HUD bawah, hapus dari panel samping.

### 5. Kasus Duplikasi 5: Atur Posisi & Ukuran (Gizmo vs Slider Manual)

* **Lokasi Ganda:**
  - Manipulator langsung di atas baju (tarik sudut untuk ukuran, drag untuk posisi).
  - Slider manual di `CustomizerDrawer.tsx` (Slider X, Slider Y, Slider Skala).
* **Solusi Ramping:** Pengguna utama cukup berinteraksi dengan Gizmo di layar. Slider angka manual disembunyikan rapi di dalam accordion lipat *"Pengaturan Presisi"* bagi yang butuh ketelitian desimal.

### 6. Kasus Duplikasi 6: Panduan Ukuran Baju (Size Guide Modal)

* **Lokasi Ganda:**
  - `StudioHUD.tsx` baris 210: Tombol `SIZE: L` (`onClick={toggleSizeGuide}`).
  - `CustomizerDrawer.tsx` tab Apparel: Tombol `Panduan Ukuran`.
* **Solusi Ramping:** Cukup letakkan di tab pemilihan ukuran pakaian di dalam drawer.

### 7. Kasus Duplikasi 7: Mode Terang/Gelap (Studio Theme)

* **Lokasi Ganda:**
  - `StudioClient.tsx` baris 151: Tombol `Sun / Moon` di header atas.
  - `CustomizerDrawer.tsx` tab Opsi: Pilihan tema studio (Obsidian vs Gallery).
* **Solusi Ramping:** Cukup letakkan tombol toggle cepat di header atas.

---

### 🏆 Hasil Akhir Studio 3D Setelah Pemangkasan Tombol Ganda:

* **Tampilan Layar 100% Lega:** Kanvas 3D Three.js mendominasi 100% viewport tanpa dikepung oleh tombol-tombol melayang yang fungsinya ganda.
* **Interaksi Intuitif:** Pengguna mengklik baju untuk mendesain, mengklik stiker untuk mengatur ukuran, dan menyeret mouse secara alami untuk memutar 360°.

---

## 41. 🌐 AUDIT TOMBOL GANDA & KONFLIK ALUR DI LUAR STUDIO (HOME, CART, CHECKOUT & AUTH)

Berdasarkan audit menyeluruh terhadap alur navigasi global website, ditemukan konflik tombol dan tumpang tindih alur transaksi:

### 1. Konflik Tombol Keranjang vs Langsung Checkout:

* **Kondisi Saat Ini:**
  - Di `Navbar.tsx` ada ikon keranjang belanja yang membuka slide drawer `CartDrawer.tsx` (yang memuat tombol *Checkout*).
  - Namun di `CustomizerDrawer.tsx` (Studio 3D) terdapat tombol besar *"PESAN SEKARANG"* yang mem-bypass `CartDrawer.tsx` dan langsung memunculkan pop-up modal `CheckoutModal.tsx`.
* **Masalah:** Alur paralel yang membingungkan. Pengguna yang mendesain kaos bertanya-tanya: *"Apakah desain saya tersimpan di keranjang, atau langsung bayar? Bagaimana kalau saya mau mendesain kaos kedua?"*.
* **Solusi Ramping (Standar E-Commerce Modern):**
  - Tombol *"PESAN SEKARANG"* di Studio berfungsi ganda secara mulus: Menambahkan item ke Keranjang ➔ Membuka Cart Drawer ringkas dengan tombol utama *"Lanjut ke Pembayaran"*.
  - Di dalam keranjang, pembeli bisa memilih: *"Tambah Desain Kaos Lain (+ Desain Baru)"* atau *"Langsung Bayar"*.

### 2. Tabrakan Modal di Atas Modal (Auth Collision pada Checkout):

* **Kondisi Saat Ini:** Di dalam `CheckoutModal.tsx`, jika pengguna belum login, ada tombol *"Sudah punya akun? Masuk di sini"* yang membuka `AuthModal.tsx` **tepat di atas CheckoutModal** (terjadi tumpukan dua backdrop gelap dan dua modal yang saling mengunci scroll).
* **Solusi Ramping (In-Line Checkout Auth):**
  - **Dilarang memanggil modal di atas modal.**
  - Pada langkah pertama checkout, jika user belum terautentikasi, sediakan form login cepat in-line (Nomor WhatsApp / Email + OTP / Password) langsung di dalam badan checkout tanpa memunculkan modal baru.

---

## 42. 🎨 AUDIT FORENSIK 2D CANVAS DI STUDIO (FABRICEDITOR VS PATTERNSTUDIO VS 3D VIEWPORT)

Di dalam repositori Kaos Kami saat ini, ditemukan fakta mengejutkan bahwa terdapat **DUA IMPLEMENTASI 2D CANVAS FABRIC.JS YANG TERPISAH DAN SALING TUMPANG TINDIH**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎨 KONDISI DUA KANVAS 2D YANG TERSEMBUNYI DI STUDIO SAAT INI                           │
├──────────────────────────────────────┬─────────────────────────────────────────────────┤
│ 1. FabricEditor.tsx (5.3 KB)         │ 2. PatternStudio.tsx (76.7 KB)                  │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ • Dipicu oleh tombol di Drawer:      │ • Dipicu oleh sub-mode "pattern" di Drawer.     │
│   "EDITOR 2D LANJUTAN" (baris 2085). │ • Kanvas Fabric.js 2048px dengan siluet pola    │
│ • Membuka kotak kanvas statis        │   kaos (Depan, Belakang, Lengan Kiri/Kanan).    │
│   450 × 500 px terisolasi.           │ • Memiliki sinkronisasi 2-arah realtime dengan  │
│ • Berisi teks default "KAOS KAMI"    │   model 3D (geser di 2D otomatis gerak di 3D,   │
│   dengan font "Syne" lama!           │   dan sebaliknya).                              │
│ • Saat diekspor, hasilnya dijadikan  │ • Menghitung master file cetak fisik 300 DPI    │
│   stiker datar di 3D.                │   sesuai batas ukuran sablon DTF (cm).          │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

### Analisis Kritis:

1. **Mengapa Kanvas 2D Ini Ada?**
   - Di industri sablon pakaian (seperti Printful dan Teespring), kanvas 2D datar sangat penting bagi pengguna yang ingin menyusun tata letak presisi (menambah logo, tulisan, dan mengatur batas tepi) tanpa terganggu oleh perspektif kamera 3D yang miring.
   - Kanvas 2D juga menjadi penyelamat bagi perangkat HP berspesifikasi rendah (*Low-End Mobile*) yang berat memutar WebGL 3D 60 FPS.
2. **Kelemahan Fatal Saat Ini:**
   - Adanya `FabricEditor.tsx` dan `PatternStudio.tsx` secara bersamaan adalah **duplikasi kode yang membingungkan**.
   - `FabricEditor.tsx` berukuran kecil dan masih menggunakan font `Syne` usang yang merusak estetika brand.
   - Sedangkan `PatternStudio.tsx` jauh lebih canggih (memiliki siluet bentuk baju dan sinkronisasi 2-arah ke 3D), namun tombolnya tersembunyi jauh di dalam tab drawer sehingga jarang ditemukan pembeli!

### Opsi Strategis Penyatuan Kanvas 2D:

* **Opsi 1 (Split View / Mode Switch [ 3D Mockup | 2D Datar ]):**
  - Hapus total `FabricEditor.tsx` yang usang.
  - Angkat `PatternStudio.tsx` menjadi mode tampilan utama sejajar dengan 3D.
  - Sediakan tombol switch minimalis di headbar: `[ 3D Studio | 2D Pola ]`.
  - Pengguna yang ingin menempel presisi bisa berpindah ke tampilan 2D datar pola kaos, dan saat kembali ke 3D, hasilnya langsung terproyeksi hidup!
* **Opsi 2 (Murni 3D dengan 2D Screen-Space Gizmo):**
  - Jika ingin platform tetap fokus 100% pada pengalaman 3D interaktif yang minimalis dan ringan tanpa beban bundle Fabric.js (~300KB), seluruh manipulasi dilakukan langsung di kanvas 3D menggunakan 2D Screen-Space Gizmo (Bab 39), dan modul 2D yang redundant dinonaktifkan.

---

## 43. ✂️ KEPUTUSAN FINAL: PENGHAPUSAN KANVAS 2D & FOKUS 100% PADA 3D STUDIO BERSIH

Berdasarkan keputusan mutlak pemilik proyek (*"aku mau hapus 2D canvas dan fokus ke 3D... masukkan ke folder backup di luar project kaos kami"*), ditetapkan **Keputusan Rekayasa Produk**:

### 1. Eliminasi Total Kanvas 2D:

* Modul `FabricEditor.tsx` dan `PatternStudio.tsx` serta ketergantungan library `fabric` dipensiunkan dari alur runtime Studio.
* Seluruh file terkait kanvas 2D diarsipkan dan dipindahkan ke folder cadangan di luar proyek: `D:\Vibe coding Semester 7\Backup-Kaos-Kami\arsip\2d-canvas\`.
* Tombol *"EDITOR 2D LANJUTAN"* dan sub-mode *"pattern"* di dalam `CustomizerDrawer.tsx` dihapus total.

### 2. Keuntungan Langsung bagi Platform:

* **Ukuran Bundle Berkurang Signifikan (~300 KB gzipped):** Menghilangkan library Fabric.js mempercepat waktu muat awal Studio 3D secara drastis (*Speed Index & LCP Score meningkat*).
* **Fokus Penuh pada Kemewahan 3D:** Seluruh manipulasi grafis kini berpusat 100% pada **2D Screen-Space Gizmo** (Bab 39) yang melayang presisi di atas model pakaian Three.js tanpa lag dan tanpa bug melayang di udara.

---

## 44. 🧹 PEMBERSIHAN FOLDER BACKUP INTERNAL REPO (PEMINDAHAN DRACO & ARSIP LAMA)

Untuk menjamin kebersihan repositori dan memastikan penulisan laporan akademik/skripsi tidak terkontaminasi oleh file usang (*"takutnya saat aku buat laporan malah ada draco padahal aku tidak pakai lagi"*):

### 1. Temuan Folder Backup di Dalam Repo:

* Di root repositori ditemukan folder `backups/` yang memuat:
  - `backups/draco-archive/` (arsip lama Draco compression).
  - `backups/models-archive/` (arsip model 3D lama).
  - `backups/kaos-kami-202609071541.sql` (dump SQL lama).

### 2. Prosedur Pemindahan ke Eksternal:

* Seluruh isi folder `d:\Vibe coding Semester 7\Kaos Kami\backups\` dipindahkan secara permanen ke folder cadangan eksternal:`D:\Vibe coding Semester 7\Backup-Kaos-Kami\backups\`.
* Folder `backups/` di dalam repositori dihapus atau dikosongkan agar laporan skripsi dan pelacakan git bersih 100% dari file Draco yang sudah tidak digunakan.

---

## 45. 🖨️ BLUEPRINT PRATINJAU DESAIN STAF PRODUKSI & AKURASI FISIK CM 1:1

Berdasarkan pertanyaan kritis pemilik proyek (*"pratinjau seperti apa yang bisa dilihat oleh admin atau karyawan produksi agar tahu desain user? Apakah 3D juga? Dan apakah akurat juga ukurannya dalam cm?"*), berikut adalah spesifikasi visual dan kalibrasi fisiknya:

### 1. Seperti Apa Pratinjau yang Dilihat Karyawan Produksi di Dashboard Admin?

Karyawan produksi sablon (operator heat press) di workshop Kaos Kami (Jl. Galangan Kapal, Kaluku Bodoa, Tallo, Makassar) tidak disajikan kode teknis yang membingungkan. Mereka disajikan **Kartu Perintah Kerja Fisik (Work Order Ticket)** yang memuat:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🖨️ TIKET KERJA PRODUKSI HEAT PRESS (#KK-261004-9821)                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [MOCKUP VISUAL BAJU UTUH (TAMPAK DEPAN & BELAKANG)]                                    │
│   • Foto render garmen 3D resolusi tinggi lengkap dengan sablon di posisinya.          │
│   • Kaos: Cotton Combed 24s • Warna: Hitam Jet Black • Ukuran: L (1 Pcs).              │
│   • Tombol: [ 🔍 Buka Pratinjau 3D Interaktif ] (Bisa diputar 360° jika ragu).         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [PANDUAN PENEMPELAN FISIK WORKSHOP]                                                    │
│   • Posisi Sablon  : DADA DEPAN (Center Chest)                                         │
│   • Ukuran Fisik   : 28.5 cm (Lebar) × 19.2 cm (Tinggi) — Kategori A3                 │
│   • Titik Tempel   : ↓ 7.5 cm DI BAWAH GARIS KERAH BAJU                               │
│   • Suhu & Durasi  : 160°C • 15 Detik Press • Kupas Dingin (Cold Peel)                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [AKSI EKSEKUSI PRODUKSI]                                                               │
│   [ 📄 Unduh Master Cetak Maklon (PNG 300 DPI) ]   [ ✅ Tandai: Sudah Dipress Selesai ]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Apakah Ukurannya dalam Sentimeter (cm) Benar-Benar Akurat?

**JAWABAN: YA, 100% SANGAT AKURAT DAN TERKALIBRASI TERHADAP MESIN SABLON MAKLON.**

* **Rumus Kalibrasi Terukur (`scaleCalibration.ts`):**
  Ukuran sablon dihitung menggunakan rasio proporsional terhadap anatomi dada garmen:
  $$
  \text{Lebar Fisik (cm)} = \text{Skala 3D} \times \text{Multiplier Mesh Garmen}
  $$

  Untuk Kaos Cotton Combed (lebar dada fisik 56.0 cm), lebar sablon secara ketat dikunci maksimal **30.0 cm** (sesuai lebar maksimal plat heat press workshop dan batas lebar film DTF roll 30cm/58cm).
* **Akurasi Titik Tempel Kerah (`offsetFromCollarCm`):**
  Sistem menghitung jarak vertikal dari jahitan rib kerah (`collarBaselineY`) ke batas atas stiker. Jadi saat sistem menampilkan `↓ 7.5 cm dari kerah`, staf produksi di bengkel tinggal meletakkan meteran kain dari kerah ke bawah sejauh 7.5 cm, meletakkan lembaran film DTF hasil maklon, dan langsung mengepresnya dengan presisi mutlak tanpa tebak-tebakan.

### 3. Apakah Bisa Dilihat dalam 3D Juga oleh Staf?

**YA.** Disediakan modal pop-up minimalis *"Visualizer 3D"* di mana staf atau admin dapat memutar baju 360° secara langsung di layar komputer workshop jika ingin memastikan posisi stiker di sudut-sudut tertentu (seperti di bawah kerah atau di bagian punggung).

### 4. 📍 Klarifikasi SSOT Alamat Resmi Workshop & Pengiriman:

Seluruh operasional fisik, koordinat GPS kurir, titik ambil mandiri (*self-pickup*), dan legalitas toko terpusat pada **Satu Sumber Kebenaran Tunggal (`src/lib/shop.ts`)**:

* **Alamat Workshop Resmi:** `Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211`
* **Koordinat GPS:** `-5.106018313739206, 119.43239633333334`
* **Kode Pos Asal Ongkir:** `90211` (Kec. Tallo)
* **Jam Buka:** Senin – Sabtu, 09:00 – 21:00 WITA (Minggu Libur/Tutup)

---

## 46. 🎯 ACTIONABLE TO-DO LIST & MASTER EXECUTION ROADMAP

Dokumen ini menetapkan daftar pekerjaan prioritas (*Actionable To-Do List*) yang akan dieksekusi secara berurutan dan terukur:

### 🚀 FASE 1: Un-wiring & Pembersihan Total 2D Canvas di Studio 3D

- [ ] **1.1.** Hapus deklarasi dinamis `FabricEditor` dan `PatternStudioLazy` dari [`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>).
- [ ] **1.2.** Hapus tab tombol *"POLA 2D"* dan tombol *"EDITOR 2D LANJUTAN"* dari antarmuka drawer.
- [ ] **1.3.** Bersihkan variabel state usang `showFabricEditor` dan kondisi submode `pattern`.
- [ ] **1.4.** Pastikan Studio 3D 100% fokus pada kanvas Three.js interaktif tanpa beban bundle Fabric.js.
- [ ] **1.5.** Verifikasi kompilasi lokal (`npx tsc --noEmit`) bebas error.

### 🎯 FASE 2: Resolusi Gizmo 3D & Batas Area Cetak Fisik A3 (Bab 39)

- [ ] **2.1.** Ganti komponen `DecalGizmo.tsx` yang menggunakan Drei `<Html transform>` (melayang di udara) dengan **2D Screen-Space Bounding Box** berbasis proyeksi koordinat layar (`vector.project(camera)`).
- [ ] **2.2.** Tampilkan kotak batas visual cetak DTF A3 (garis putus-putus tipis nan elegan, clamped maksimal 30.0 cm) di area dada dan punggung.
- [ ] **2.3.** Tambahkan feedback visual halus saat stiker sablon digeser mendekati batas jahitan kerah atau ketiak/lengan kaos.
- [ ] **2.4.** Sediakan pegangan kontrol rotasi dan skala yang mulus dengan akselerasi spring physics 60 FPS.

### 🧹 FASE 3: Eliminasi 7 Kluster Tombol Ganda di Studio 3D (Bab 40)

- [ ] **3.1.** Sederhanakan HUD Docking [`StudioHUD.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/StudioHUD.tsx>): Hapus tombol mouse ganda *"PUTAR 360°"* dan *"GESER"* (cukup gunakan gestur sentuh / klik-geser natif OrbitControls).
- [ ] **3.2.** Hapus toggle ganda `GIZMO ON/OFF` (hanya sediakan 1 sakelar elegan di HUD).
- [ ] **3.3.** Rampingkan tombol preset kamera menjadi segmen minimalis (`Depan`, `Belakang`, `Kerah`, `Lengan`).
- [ ] **3.4.** Perbaiki styling drawer kustomisasi agar tidak bertabrakan dengan header navigasi (`unclipped top-[74px]`).

### 🖨️ FASE 4: Modernisasi Tiket Kerja Staf Sablon Workshop (`/admin/production` - Bab 45)

- [ ] **4.1.** Tampilkan foto render 3D baju utuh jadi ([`snapshotImageUrl`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/lib/drizzle-schema.ts#L350>)) tampak depan/belakang di setiap kartu antrean produksi.
- [ ] **4.2.** Tampilkan metrik fisik penempelan terkalibrasi:
  - Dimensi Sablon: `Lebar × Tinggi cm` (terkalibrasi, maks 30.0 cm).
  - Titik Tempel Kerah: `offsetFromCollarCm` (mis. `📍 7.5 cm di bawah jahitan kerah`).
- [ ] **4.3.** Buat tombol 1-klik `[📄 Unduh Master Cetak Maklon (PNG 300 DPI)]` untuk dikirim ke vendor maklon sablon.
- [ ] **4.4.** Buat pop-up modal `[👁️ Buka Pratinjau 3D Interaktif]` agar staf bisa memutar baju 360° langsung jika diperlukan.
- [ ] **4.5.** Buat tombol aksi 1-klik `[✓ Tandai Selesai Dipress]` yang memindahkan status tiket ke QC/Packing dan memicu notifikasi WhatsApp otomatis ke pembeli.

### 🏛️ FASE 5: Perampingan Total Sidebar Admin Menjadi 5 Menu Utama (Bab 38)

- [ ] **5.1.** Perbarui [`AdminNav.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/admin/AdminNav.tsx>) untuk menampilkan HANYA 5 menu esensial:
  1. `📊 Pesanan & Analitik` (`/admin`)
  2. `🖨️ Workshop Sablon` (`/admin/production`)
  3. `🚚 Pengiriman & Kurir` (`/admin/deliveries`)
  4. `💬 Live Chat CS` (`/admin/chat`)
  5. `⚙️ Pengaturan Toko & CMS` (`/admin/settings`)
- [ ] **5.2.** Pindahkan fitur sekunder (edit banner, ubah kontak toko, kelola etalase pakaian) ke dalam sub-tab terorganisasi di dalam `/admin/settings`.
- [ ] **5.3.** Hapus 9 menu samping duplikat yang membingungkan.

### 👤 FASE 6: Redesain Dashboard Pelanggan (`/dashboard/*`) & Anti-AI-Slop Global (Bab 33, 34, 36)

- [ ] **6.1.** Terapkan alur pelacak 5 status pesanan terpadu (*Menunggu Pembayaran ➔ Desain Diproses ➔ Dicetak & Dipress ➔ Siap Diambil/Dikirim ➔ Selesai*).
- [ ] **6.2.** Implementasikan Wardrobe 3D interaktif untuk membuka kembali desain tersimpan pelanggan dalam 1-klik.
- [ ] **6.3.** Sediakan fitur ubah nomor telepon WhatsApp dengan verifikasi kode OTP fail-safe.
- [ ] **6.4.** Basmi font monospace tiruan (`font-mono uppercase`) dari seluruh teks deskripsi, tombol, dan judul; gunakan font monospace hanya untuk angka rupiah, kode pesanan, dan ukuran cm.
- [ ] **6.5.** Singkirkan gradien neon norak dan terapkan palet luxury monokromatik modern standar startup kelas dunia (Linear / Apple).

---

## 47. 🔬 AUDIT FORENSIK 18 RUTE DASHBOARD ADMIN (ANALISIS JUJUR: FIKTIF VS BERGUNA NYATA)

Berdasarkan permintaan pemilik proyek (*"riset analisis seluruh dashboard admin, ada yang fiktif dan ada yang benar-benar berguna tidak? Riset dan analisis mendalam"*), telah dilakukan pembongkaran menyeluruh terhadap **18 file rute dan halaman** di bawah direktori `kaos-kami-web/src/app/admin/`.

Berikut adalah audit forensik objektif, tanpa kompromi, dan berbasis realitas operasional UMKM konveksi & sablon Kaos Kami di Kota Makassar:

### 1. Tabel Forensik Seluruh 18 Rute Admin

| No           | Rute Halaman                      | Ukuran Kode | Status & Vonis                           | Analisis Kritis & Akar Masalah                                                                                                                                                       | Tindakan Rekayasa                                                     |
| :----------- | :-------------------------------- | :---------- | :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **01** | `/admin` (`page.tsx`)         | 21.9 KB     | 🟢**BERFUNGSI INTI**               | Pusat ikhtisar metrik omzet, pesanan baru, dan tabel transaksi harian.                                                                                                               | **Pertahankan sebagai Kokpit Utama.**                           |
| **02** | `/admin/orders`                 | 11.7 KB     | 🔴**DUPLIKAT 100%**                | Duplikasi dari`/admin`. Memuat daftar pesanan yang sama persis dengan filter status dan nomor halaman. Menambah beban navigasi.                                                    | **Hapus dari sidebar; satukan ke `/admin`.**                  |
| **03** | `/admin/orders/[id]`            | 8.1 KB      | 🟢**BERFUNGSI INTI**               | Rincian lengkap pesanan pelanggan, alamat pengiriman, status pembayaran Duitku, dan tombol cetak faktur PDF.                                                                         | **Pertahankan sebagai Detail Pesanan.**                         |
| **04** | `/admin/orders/[id]/job-ticket` | 3.3 KB      | 🟢**BERFUNGSI**                    | Halaman cetak slip kertas fisik untuk ditempel di baju saat produksi.                                                                                                                | **Pertahankan sebagai Aksi Cetak Tiket.**                       |
| **05** | `/admin/orders/[id]/gang-sheet` | 2.8 KB      | 🟡**FRAGMENTASI**                  | Pratinjau susunan cetak per-order. Jarang dipakai sendiri-sendiri.                                                                                                                   | **Integrasikan ke Workshop Sablon.**                            |
| **06** | `/admin/production`             | 46.1 KB     | 🟢**BERFUNGSI INTI**               | Papan antrean kerja sablon fisik. Namun saat ini salah memodelkan 7 kolom fiktif pabrik.                                                                                             | **Rombaak menjadi Kanban 4-Kolom Maklon (Bab 48).**             |
| **07** | `/admin/gang-sheet`             | 63.5 KB     | 🟡**BERGUNA TAPI FRAGMENTASI**     | Algoritma*Guillotine Bin-Packing* untuk menyusun logo ke film roll 58×100 cm hemat bahan. Sangat berguna hemat ongkos maklon, tetapi tidak perlu jadi menu sidebar terpisah.      | **Jadikan sub-tab di `/admin/production`.**                   |
| **08** | `/admin/deliveries`             | 20.7 KB     | 🟢**BERFUNGSI INTI**               | Hub logistik nyata: tab antar kurir lokal Makassar (GPS Maps & WA), tab ekspedisi (input resi JNE/J&T), dan tab ambil mandiri di Tallo.                                              | **Pertahankan sebagai Menu Inti Pengiriman.**                   |
| **09** | `/admin/shipping`               | 15.0 KB     | 🔴**SALAH PENEMPATAN**             | Hanya tabel konfigurasi flat tarif luar kota (`ExpeditionZone`). Bukan operasional kurir harian.                                                                                   | **Hapus dari sidebar; pindah ke sub-tab `/admin/settings`.**  |
| **10** | `/admin/chat`                   | 1.3 KB      | 🟢**BERFUNGSI INTI**               | Konsol chat CS real-time (widget Kamito) dan integrasi tombol WhatsApp resmi.                                                                                                        | **Pertahankan sebagai Menu Inti CS.**                           |
| **11** | `/admin/catalog`                | 7.8 KB      | 🟢**BERFUNGSI INTI**               | Pengaturan stok kaos polos per ukuran (S/M/L/XL/XXL), warna, dan harga dasar konveksi.                                                                                               | **Pindahkan ke sub-tab `/admin/settings` (Stok & Bahan).**    |
| **12** | `/admin/customers`              | 7.0 KB      | 🟡**SEKUNDER**                     | Daftar akun pengguna dan penetapan role (ADMIN/USER). Bukan aktivitas harian.                                                                                                        | **Pindahkan ke sub-tab `/admin/settings` (Pengguna).**        |
| **13** | `/admin/coupons`                | 4.8 KB      | 🟡**SEKUNDER**                     | Manajemen kode promo diskon. Jarang diubah setiap hari.                                                                                                                              | **Pindahkan ke sub-tab `/admin/settings` (Promo & Voucher).** |
| **14** | `/admin/cms`                    | 2.4 KB      | 🟡**SEKUNDER**                     | Form pengubah banner hero dan lookbook foto produk.                                                                                                                                  | **Pindahkan ke sub-tab `/admin/settings` (Tampilan Web).**    |
| **15** | `/admin/settings`               | 7.6 KB      | 🟢**BERFUNGSI INTI**               | Pengaturan identitas toko (alamat Tallo, nomor WhatsApp, API key).                                                                                                                   | **Jadikan Wadah Induk Pengaturan Toko & CMS.**                  |
| **16** | `/admin/laporan`                | 21.0 KB     | 🟡**DUPLIKAT PARSIAL**             | Rekap finansial (omzet kotor/bersih, refund). Seharusnya menyatu dengan analitik di beranda admin.                                                                                   | **Satukan ke tab Analitik di `/admin`.**                      |
| **17** | `/admin/review`                 | 14.6 KB     | 🔴**100% FIKTIF / GHOST CODE**     | Kode eksplisit menulis:*"bergantung pada endpoint yang BELUM ADA di server"*. Alur Kaos Kami adalah *instant checkout*, bukan approval kontes desain.                            | **Hapus total dari sidebar dan alur operasional.**              |
| **18** | `/admin/assets`                 | 7.5 KB      | 🔴**100% ARTEFAK DEBUG DEVELOPER** | Tabel pembacaan file statis`assetManifest.ts` (menampilkan ukuran byte dan jumlah segitiga 3D *tris*). Pemilik bisnis konveksi tidak butuh melihat berapa ribu *tris* baju 3D. | **Hapus total dari sidebar admin.**                             |

---

### 2. Kesimpulan Forensik: Mengapa Dashboard Admin Terlihat "Banyak dan Berantakan"?

1. **Terlalu Banyak Menu Fiktif & Artefak Pengembang (2 Menu Sampah):**
   - `/admin/assets` adalah alat inspeksi internal programmer yang secara keliru dipajang di sidebar pemilik toko.
   - `/admin/review` adalah fitur spekulatif buatan AI yang tidak pernah memiliki backend nyata dan tidak sesuai dengan model bisnis UMKM.
2. **Duplikasi Menu yang Membuat Admin Bingung (2 Menu Duplikat):**
   - Menaruh `/admin` (Ikhtisar) dan `/admin/orders` (Pesanan) berdampingan adalah redundansi murni. Keduanya menampilkan data yang sama.
   - Menaruh `/admin/deliveries` (Pengiriman) dan `/admin/shipping` (Ekspedisi) berdampingan membuat staf kurir bingung harus membuka yang mana.
3. **Penyebaran Menu Pengaturan Menjadi 5 Halaman Terpisah:**
   - Katalog stok, kupon promo, CMS banner, tarif zona, dan info toko masing-masing dijadikan menu sidebar tingkat atas. Akibatnya sidebar memiliki 15 tautan yang memadati layar.

---

## 48. 🖨️ BLUEPRINT SPESIFIKASI KANBAN 4-KOLOM HYBRID MAKLON & HEAT PRESS WORKSHOP

Menggantikan arsitektur 7-kolom fiktif di `/admin/production` dengan **Papan Kanban 4-Kolom Terpadu** yang dirancang presisi untuk model bisnis sablon Maklon DTF Kaos Kami di Kota Makassar:

### 1. Struktur 4 Kolom Kanban Realistis

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🖨️ PAPAN KANBAN WORKSHOP KAOS KAMI (ALUR KERJA MAKLON DTF & HEAT PRESS)                                │
├────────────────────┬────────────────────┬────────────────────────┬─────────────────────────────────────┤
│ 1. 📄 KIRIM KE MAKLON│ 2. 👕 SIAP PRESS   │ 3. 🔥 SEDANG DIPRESS   │ 4. 📦 SELESAI (SIAP ANTAR / AMBIL)  │
│    (Waiting DTF)   │    (Film Tiba)     │    (& QC Sablon)       │    (Ready for Dispatch)             │
├────────────────────┼────────────────────┼────────────────────────┼─────────────────────────────────────┤
│ • Pesanan lunas    │ • Lembaran film DTF│ • Operator menyalakan  │ • Kaos sudah masuk plastik packing  │
│   masuk antrean.   │   dari vendor cetak│   mesin heat press     │   polymailer rapi & higienis.       │
│ • Admin 1-klik     │   maklon sudah tiba│   (160°C, 15 detik).   │ • Jika kirim lokal Makassar: kurir  │
│   unduh master     │   di bengkel Tallo.│ • Mengukur jarak tempel│   Kaos Kami siap antar (tombol WA). │
│   PNG 300 DPI.     │ • Staf mengambil   │   dari kerah (cm).     │ • Jika ekspedisi luar kota: admin   │
│ • File dikirim ke  │   kaos polos combed│ • Mengupas film dingin │   siap input resi JNE/J&T/SiCepat.  │
│   vendor roll DTF  │   sesuai ukuran &  │   (cold peel) & periksa│ • Jika self-pickup: baju siap di    │
│   di Makassar.     │   warna dari rak.  │   daya rekat sablon.   │   rak toko workshop Tallo.          │
│                    │                    │                        │ • WhatsApp notifikasi otomatis      │
│                    │                    │                        │   terkirim ke pelanggan.            │
└────────────────────┴────────────────────┴────────────────────────┴─────────────────────────────────────┘
```

### 2. Anatomi Kartu Kanban yang Berbobot (Standar Startup Tier-1)

Setiap kartu pesanan di papan Kanban menyajikan data visual lengkap tanpa memaksa operator membuka halaman lain:

1. **Mockup 3D Garmen Nyata:** Thumbnail foto garmen jadi lengkap dengan sablon di posisinya (depan/belakang).
2. **Identitas Apparel:** Contoh: `Kaos Cotton Combed 24s • Hitam Jet Black • Ukuran L (1 Pcs)`.
3. **Ukuran Fisik Terkalibrasi (cm):** `📏 28.5 cm × 19.2 cm (Maks 30.0 cm)`.
4. **Titik Tempel Kerah Presisi:** `📍 7.5 cm di bawah jahitan kerah`.
5. **Tombol Aksi Cepat 1-Klik (Dual-Mode):**
   - Selain drag-and-drop, kartu memiliki tombol transisi 1-klik agar operator yang tangannya memegang alat press atau sarung tangan dapat memajukan status tanpa licin:
     - Di Kolom 1: `[ ➔ Film Maklon Diterima ]`
     - Di Kolom 2: `[ 🔥 Mulai Heat Press ]`
     - Di Kolom 3: `[ ✓ Selesai Press & Masuk Packing ]`
6. **Tombol File Cetak Maklon:** Tombol `[ 📄 Unduh Master Cetak 300 DPI ]`.
7. **Tombol Pop-Up 3D Viewer:** Tombol `[ 👁️ 3D Preview ]` untuk memutar model 360° jika ragu dengan posisi sablon.

---

## 49. 🎨 RISET & AUDIT FORENSIK ETALASE, LANDING PAGE & HALAMAN PUBLIK (`/`, `/catalog`, `/faq`, `/kontak`, `/terms`, `/refund`)

Berdasarkan instruksi pemilik proyek (*"analisis dan riset etalase dan bagian landing page atau page depan... dan juga page-page terpisah seperti FAQ, Tentang Kami, tombol-tombol medsos... lakukan riset internet analisis mendalam, lakukan luas dan maksimal plan-nya, dan tambah di blueprint"*), telah dilakukan audit komprehensif terhadap seluruh permukaan publik platform Kaos Kami.

Berikut adalah hasil riset benchmarking e-commerce fesyen kelas dunia (Fear of God, Represent Clo, Kith, Uniqlo, Printful, dan Linear) serta formulasi perbaikan radikalnya:

---

### 1. 👕 Audit Forensik Halaman Depan / Landing Page (`/` & `HeroOverlay.tsx`)

#### Temuan Masalah di Kode Saat Ini:

1. **Sindrom Kostum Terminal Hacker (`font-mono` Berlebihan):**
   - Di `HeroOverlay.tsx`, hampir setiap teks menggunakan `font-mono tracking-widest uppercase` (dari kategori kecil, harga, tombol aksi, hingga penunjuk gulir).
   - *Dampak Psikologis Pembeli:* Website terasa seperti terminal kodingan teknikal atau aplikasi tugas kuliah, bukan merek busana streetwear / konveksi premium yang elegan.
2. **Value Proposition Kurang Menyengat:**
   - Judul saat ini: `"BIKIN KAOS IMPIANMU DENGAN MOCKUP 3D"`. Terlalu generik dan terdengar seperti template software 3D.
   - *Rekomendasi Riset:* Ubah menjadi proposisi nilai yang percaya diri dan membanggakan lokalitas Makassar:
     **"SABLON DTF PRESISI & APPAREL PREMIUM MAKASSAR"**
     *Sub-judul:* "Simulasikan desain pakaianmu dalam 3D interaktif 360°. Cetak satuan bebas tanpa minimum order di atas 100% Katun Combed 24s adem."
3. **Dual Call-to-Action (CTA) yang Seimbang:**
   - Tombol 1 (Utama): `[ ✨ Mulai Desain 3D ]` (Mengarahkan langsung ke Studio 3D).
   - Tombol 2 (Sekunder): `[ 🛍️ Belanja Produk Siap Pakai ]` (Meluncur mulus ke etalase kaos polos & jaket).
   - Tipografi tombol diubah dari font monospace menjadi `font-sans font-bold text-xs uppercase tracking-wider` dengan spring interaction yang lembut saat diklik.

---

### 2. 🛍️ Audit & Peningkatan Etalase Produk Siap Beli (`StoreShowcaseSection.tsx` & `/catalog`)

#### Temuan Masalah & Keunggulan Saat Ini:

* **Keunggulan Nyata:** Adanya modal **Quick View 3D (`Showcase3DOrbitViewer`)** di mana calon pembeli bisa memutar produk kaos, hoodie, atau coach jacket dalam 3D sebelum membeli. Ini adalah pembeda (*unfair advantage*) nomor satu Kaos Kami dibanding distro konveksi lain!
* **Kelemahan Visual:**
  1. Latar belakang kartu menggunakan abu-abu gelap monoton (`bg-[#18181b]`) yang terlihat flat dan tidak mewah.
  2. Belum ada **Pill Filter Kategori Cepat** (Semua, Kaos Combed, Hoodie, Coach Jacket, Crewneck, Merchandise).
  3. Belum ada jembatan silang (*Cross-Selling*) antara produk jadi dengan Studio 3D.

#### Cetak Biru Improvisasi Etalase Kelas Dunia:

1. **Kategori Filter Horizontal Interaktif:**
   - Disediakan filter pil elegan di atas etalase:
     `[ Semua Produk ]` `[ Kaos Combed 24s ]` `[ Hoodie & Sweater ]` `[ Coach Jacket ]` `[ Aksesori & Topi ]`
2. **Kartu Produk Dinamis Berkelas:**
   - Menampilkan foto garmen studio resolusi tinggi dengan efek *hover zoom* mikro (1.03×) yang sangat halus.
   - **Swatch Warna Interaktif:** Pembeli bisa langsung mengklik lingkaran warna (Hitam Jet Black, Putih Ecru, Olive Green, Orange Makassar) pada kartu etalase untuk melihat perubahan warna pakaian seketika.
   - Badge ketersediaan stok jujur: `● Ready Stock (Tallo HQ)` atau `⏱️ Pre-Order 2 Hari`.
3. **Jembatan Silang ke Studio 3D (*The "Customize This" Button*):**
   - Di setiap kartu etalase, selain tombol `[+ Keranjang]`, sediakan tombol sekunder elegan:`[ 🎨 Kustom Sablon Desain Sendiri ]`.
   - Jika diklik, pembeli langsung dibawa masuk ke Studio 3D dengan model pakaian dan warna yang sudah terpilih otomatis! Ini melipatgandakan konversi pemesanan sablon kustom.

---

### 3. ❓ Audit & Transformasi Halaman FAQ (`/faq`)

#### Temuan Masalah:

* Konten 4 kategori FAQ di `faq/page.tsx` sudah sangat berbobot dan akurat (mencakup sablon satuan DTF, pembayaran QRIS, pengiriman lokal Makassar, dan cara cuci baju sablon).
* Namun antarmukanya terasa kaku dan dipenuhi font monospace tiruan pada breadcrumb, judul kategori, dan deskripsi.

#### Cetak Biru Improvisasi Halaman FAQ:

1. **Desain Bersih Gaya Tech-Support Modern (Linear / Apple Support Style):**
   - Menghilangkan `font-mono` dari seluruh teks deskriptif; menggantinya dengan tipografi `Plus Jakarta Sans` berbobot tebal yang nyaman dibaca mata.
2. **Infografis Visual Perawatan Sablon DTF (*Wash & Care Guide*):**
   - Menyajikan 4 kartu visual panduan mencuci yang dapat dibagikan pelanggan:
     - ❄️ *Cuci Air Dingin & Balik Pakaian (Sablon di dalam).*
     - 🚫 *Jangan Disikat Langsung pada Permukaan Sablon.*
     - 🧴 *Gunakan Detergen Lembut (Hindari Pemutih Keras).*
     - 👔 *Setrika dari Bagian Dalam Baju (Jangan sentuhkan besi setrika panas langsung ke sablon).*
3. **Quick Support Fallback Banner:**
   - Di bagian bawah FAQ, tampilkan kartu bantuan interaktif:
     *"Punya pertanyaan khusus tentang sablon komunitas atau pesanan lusinan? Maskot Kamito & Customer Service kami siap membantu langsung via WhatsApp (Senin–Sabtu 09:00–21:00 WITA)."* + Tombol 1-klik terhubung ke WhatsApp.

---

### 4. 🏢 Audit Halaman Tentang Kami (`AboutWorkshopSection.tsx`) & Kontak (`/kontak`)

#### Temuan Masalah:

* Seluruh container `AboutWorkshopSection.tsx` dibungkus `font-mono text-xs`.
* Informasi fisik workshop Tallo sudah benar, namun belum menceritakan jiwa konveksi lokal Makassar dan keunggulan teknologi sablon digital Kaos Kami.

#### Cetak Biru Pembaruan Halaman Tentang Kami & Kontak:

1. **Penyatuan Identitas Workshop Tallo Makassar yang Membanggakan:**
   - Menampilkan narasi otentik: *"Lahir di pesisir Tallo, Kota Makassar, Kaos Kami menggabungkan ketelitian konveksi pakaian katun combed berkualitas dengan teknologi visualisasi 3D mutakhir dan sablon digital DTF presisi tinggi."*
2. **3 Pilar Kepercayaan Utama (Trust Pillars):**
   - 🛡️ **Bahan Otentik 100% Combed 24s:** Serat rapat, tidak berbulu, adem di cuaca tropis Makassar, dan menyerap keringat optimal.
   - ⚡ **Tanpa Minimum Order (Bebas Satuan):** Pesan 1 kaos untuk hadiah spesial atau ribuan kaos untuk seragam komunitas dilayani dengan standar kualitas yang sama.
   - 📍 **Workshop Fisik Nyata & Self-Pickup:** Pelanggan Makassar bisa datang langsung ke Jl. Galangan Kapal, Tallo untuk fitting ukuran, meraba kain sampel, atau mengambil pesanan secara gratis tanpa ongkir.
3. **Pembersihan Rute Ganda Legalitas:**
   - Konsolidasi file alias: memastikan `/contact`, `/terms-and-conditions`, dan `/refund-policy` menggunakan redirect canonical 301 ke `/kontak`, `/terms`, dan `/refund` untuk menjaga skor SEO dan mencegah duplikasi konten di mesin pencari.

---

## 50. 🌟 BLUEPRINT INOVASI MEDIA SOSIAL, KOMUNITAS & TRUST SIGNALS KELAS DUNIA

Selama ini, tautan media sosial di footer dan seksi tentang kami hanya berupa kotak ikon kecil (`w-8 h-8`) yang terlihat kering dan pasif. Di era e-commerce 2026, media sosial adalah **saluran konversi dan bukti sosial (Social Proof) nomor satu**.

### 1. Dari "Ikon Mati" Menjadi "Kartu Media Sosial Aktif (Active Social Tiles)"

Ubah tautan media sosial di `AboutWorkshopSection.tsx` dan `Footer.tsx` menjadi kartu interaktif yang menjelaskan manfaat spesifik bagi calon pembeli:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌐 HUB KOMUNITAS & MEDIA SOSIAL RESMI KAOS KAMI MAKASSAR                                               │
├───────────────────────────────────┬────────────────────────────────────────────────────────────────────┤
│ 🎵 TIKTOK (@kaoskami)             │ 📸 INSTAGRAM (@kaoskami.makassar)                                  │
│   • Video proses cetak DTF nyata. │   • Galeri foto hasil sablon jadi pelanggan & komunitas.           │
│   • Uji tarik elastisitas sablon. │   • Behind The Scenes kesibukan mesin press di workshop Tallo.     │
│   • Review ketebalan kain combed. │   • Update katalog baru & giveaway bulanan.                        │
│   [ ↗ Tonton di TikTok ]          │   [ ↗ Kunjungi Profil Instagram ]                                  │
├───────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ 💬 WHATSAPP OFFICIAL CS           │ 👥 GRUP KOMUNITAS KREATIF MAKASSAR                                 │
│   • Konsultasi desain gratis.     │   • Wadah sharing sesama desainer & pelaku clothing brand lokal.   │
│   • Bantuan pemilihan ukuran kaos.│   • Info diskon khusus member komunitas konveksi.                  │
│   • Respon cepat 09:00–21:00 WITA │   • Diskusi seputar sablon digital & streetwear Makassar.          │
│   [ ↗ Chat CS WhatsApp Sekarang ] │   [ ↗ Gabung Komunitas Facebook ]                                  │
└───────────────────────────────────┴────────────────────────────────────────────────────────────────────┘
```

---

### 2. 🛡️ Trust Badges & Jaminan Layanan (Hyperlocal Makassar Proof)

Di bagian bawah etalase produk dan halaman checkout, tambahkan **4 Lencana Kepercayaan (Trust Badges)** yang memberikan rasa aman mutlak kepada pembeli baru:

1. **Jaminan Anti-Cacat Sablon 100% Ganti Baru:**Jika sablon miring, mengelupas, atau warna tidak sesuai karena kesalahan produksi kami, kaos kami ganti baru tanpa biaya tambahan.
2. **100% Katun Combed Premium Asli:**Bahan 100% serat kapas alami tanpa campuran poliester panas (bukan kain carded/TC kasar). Garansi uang kembali jika terbukti bukan combed.
3. **Gratis Ongkir Seluruh Kota Makassar:**Pengantaran langsung oleh tim kurir internal Kaos Kami untuk area Kota Makassar (Panakkukang, Tamalanrea, Bontoala, Mariso, Rappocini, Manggala, Tallo, Ujung Pandang, dll.) atau opsi ambil mandiri di workshop.
4. **Pembayaran Aman Berizin Bank Indonesia:**
   Transaksi menggunakan QRIS Nasional dan Virtual Account terenkripsi SSL 256-bit bekerja sama dengan payment gateway resmi Duitku.

---

### 3. ✨ Penyempurnaan Navbar & Footer Terintegrasi

#### A. Navbar (`Navbar.tsx`):

* Ganti teks navigasi dari huruf kapital monospace (`HOME`, `KATALOG`, `ABOUT`, `PESANANKU`) menjadi teks sans-serif modern yang anggun:**`Beranda`** • **`Katalog Produk`** • **`Tentang Kami`** • **`Pesananku`**.
* Tambahkan micro-interaction garis bawah meluncur (*sliding underline*) saat kursor berpindah antar menu.
* Pertahankan efek kaca mewah (*glassmorphism backdrop-blur-xl*) dan tombol keranjang terpadu yang menampilkan jumlah item secara reaktif.

#### B. Footer (`Footer.tsx`):

* Susun hierarki 4 kolom yang rapi dan profesional:
  - **Kolom 1:** Logo resmi Kaos Kami + Ringkasan Misi Usaha + Kartu Media Sosial Aktif.
  - **Kolom 2: Layanan & Produk:** Kaos Polos Combed 24s, Sablon DTF Satuan, Hoodie & Crewneck, Coach Jacket, Kalkulator Ongkos Sablon.
  - **Kolom 3: Bantuan & Legalitas:** FAQ (Tanya Jawab), Syarat & Ketentuan Layanan, Kebijakan Pengembalian Dana (Refund), Lacak Pesanan.
  - **Kolom 4: Workshop & Jam Buka:** Alamat resmi Jl. Galangan Kapal Tallo Makassar, tombol Google Maps, jam kerja operasional (09:00–21:00 WITA), dan nomor WhatsApp resmi.
* Bagian paling bawah footer dilengkapi **Logo Mitra Pembayaran Resmi** (QRIS, BCA, Mandiri, BNI, BRI, GoPay, OVO, ShopeePay) serta **Logo Mitra Ekspedisi Nasional** (J&T Express, JNE, SiCepat) untuk memperkuat kredibilitas platform di mata pelanggan baru.

---

## 51. 💾 BLUEPRINT FORENSIK EKSPOR & SIMPAN DESAIN 3D STUDIO (KAMERA, RESOLUSI 2K, VIDEO 360° & CLOUD SYNC)

Berdasarkan audit teknis mendalam terhadap sistem ekspor dan penyimpanan desain di Studio 3D ([`CanvasStage.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/CanvasStage.tsx>), [`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>), dan [`useConfiguratorStore.ts`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/store/useConfiguratorStore.ts>)), ditemukan keunggulan teknis tersembunyi yang luar biasa namun terhalang oleh masalah antarmuka pengguna (UX).

---

### 1. 🔍 Evaluasi Forensik Engine Ekspor Saat Ini

#### A. Keunggulan Teknis yang Sudah Ada di Kode (`CanvasStage.tsx: exportMockup`):

1. **DPR Kunci 3 & Resolusi 2048px (2K):**Fungsi `exportMockup` merender ulang kanvas dengan Device Pixel Ratio (DPR) 3 dan dimensi target hingga 2048 piksel. Hasil render sangat tajam dan tidak pecah bahkan saat di-zoom.
2. **Latar Belakang Transparan (PNG Alpha):**Saat mode transparan aktif, Three.js secara cerdas menyembunyikan lantai studio (`studio-floor`) dan bayangan tanah, lalu menyetel `clearAlpha = 0`. Gambar yang diunduh murni pakaian dan sablon tanpa kotak latar belakang.
3. **Penyelarasan Kamera Otomatis (*Camera Offset Reset*):**Sebelum foto diambil, Three.js me-reset pergeseran sudut kamera (`camera.clearViewOffset()`) sehingga baju selalu berada tepat di tengah frame foto, bukan miring ke kiri/kanan.
4. **Perekaman Video 360° Turntable (`mediabunny` & `MediaRecorder`):**Sistem mendukung ekspor video baju berputar 360° dalam format MP4, WebM, dan animasi GIF 12 FPS.
5. **Kartu Feed Media Sosial (1080×1350):**
   Terdapat generator kartu grafis rasio 4:5 untuk feed Instagram dan TikTok lengkap dengan nama bahan katun combed dan harga.

#### B. Kelemahan UX yang Menghambat Pengguna:

1. **Arsitektur Ekspor Mockup Dual-Tier (Tamu vs Terdaftar):**Pengunjung baru yang belum membuat akun (*Guest*) kini diizinkan mengunduh foto desain bajunya secara instan tanpa pop-up login yang mengagetkan.*Spesifikasi Watermark Tamu:*
   - **Tamu (Belum Login):** Mockup hasil unduhan otomatis disematkan **Watermark Transparan Kaos Kami** di bagian tengah dengan opasitas sangat rendah (*ultra-low opacity* 0.08–0.12) berukuran proporsional atau diagonal bertuliskan `KAOS KAMI MAKASSAR · kaoskami.biz.id`. Kaos dan desain sablon tetap 100% terlihat jelas, tajam, dan memukau, sementara karya terlindungi serta menjadi media promosi organik.
   - **Member Terdaftar (Login):** Mendapatkan unduhan mockup murni bersih tanpa watermark (*clean 2K Ultra HD*).
   - **Simpan ke Cloud & Checkout Pembayaran:** Tetap 100% WAJIB login akun untuk integritas data database Turso.
2. **Tombol Ekspor Tersebar & Opsi Membingungkan:**
   Tombol ekspor diselipkan di bagian bawah drawer kustomisasi dengan 10+ variasi tombol teks kecil (*"Front View", "Back View", "Current View", "MP4", "WebM", "GIF", "HD", "2K"*).
   *Solusi:* Satukan ke dalam **Satu Modal Pratinjau Ekspor Mewah (*The Export Studio Modal*)**.

---

### 2. 🎛️ Cetak Biru Modal Pratinjau Ekspor Mewah (*Export Studio Suite*)

Saat pengguna mengklik tombol **`[ ⬇ Ekspor Desain ]`** di header Studio, muncul modal pop-up elegan dengan 3 tab pilihan yang sangat jelas:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📸 EKSPOR MOCKUP & KARYA 3D — KAOS KAMI                                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Tab 1: Foto Mockup PNG]     [Tab 2: Story/Feed Medsos 4:5]     [Tab 3: Video 360°]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐  PILIHAN FORMAT:                                         │
│ │                           │  • Sudut Tampilan : [ Tampak Depan ] [ Belakang ] [ 3D ] │
│ │   [PRATINJAU GAMBAR HASIL │  • Resolusi Gambar: [ Full HD (1080p) ] [ Ultra 2K ]     │
│ │    RENDER FOTO BAJU 3D]   │  • Latar Belakang : [ Transparan (PNG) ] [ Studio Abu ]  │
│ │                           │                                                          │
│ └───────────────────────────┘  [ ⬇ Unduh Foto Mockup Resolusi Tinggi (Gratis) ]        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. ☁️ Alur Simpan Desain & Cloud Sync (`POST /api/designs`)

1. **Penyimpanan Lokal Instan (*Zero Latency LocalStorage*):**Desain langsung tersimpan di browser seketika tanpa menunggu jaringan internet.
2. **Sinkronisasi Otomatis ke Cloud (Turso DB & Cloudflare R2):**Aset stiker diunggah ke R2 dan metadata disimpan ke tabel `Design`.
3. **Indikator Autosave Percaya Diri di Header:**Menggantikan teks membingungkan dengan micro-badge modern di header:`● Tersimpan di Cloud` (Warna hijau lembut dengan timestamp, misal: *Tersimpan 2 mnt lalu*).
4. **Humanisasi Pesan Kuota Storage (Maksimal 5 Slot):**
   Ubah pesan galak `⛔ KUOTA 5 PENUH` menjadi komunikasi sopan:
   *"Koleksi Cloud Anda telah terisi 5 desain. Anda dapat memesan langsung desain ini sekarang atau mengganti salah satu desain lama di dashboard."*

---

## 52. 🎨 BLUEPRINT WARDROBE DESAIN & 1-CLICK INSTANT ORDER DASHBOARD PELANGGAN

Halaman koleksi desain pelanggan di [`CustomerDashboardView.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/commerce/CustomerDashboardView.tsx>) selama ini memiliki friksi besar: jika pelanggan ingin memesan ulang kaos yang pernah mereka desain bulan lalu, mereka dipaksa mengklik *"Buka di 3D Studio"*, menunggu kanvas 3D memuat dari nol, membuka drawer, dan baru bisa mengklik tombol pesan.

### 1. Transformasi Menjadi "Virtual Wardrobe" Berdaya Beli Tinggi

Setiap kartu desain di Wardrobe Pelanggan (`/dashboard/orders` tab *Koleksi Desain 3D*) kini dilengkapi **3 Tombol Aksi Langsung**:

```
┌─────────────────────────────────────────────────────────┐
│ 👕 DESAIN: "MAKASSAR STREETWEAR BOX"                    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │   [THUMBNAIL FOTO RENDER 3D MOCKUP UTUH BAJU]       │ │
│ │   Kaos Cotton Combed 24s • Hitam Jet Black          │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ • Ukuran: L • Sablon DTF Dada Depan (28.5 cm)           │
│ • Harga: Rp 85.000 / pcs                                │
├─────────────────────────────────────────────────────────┤
│ [ 🛍️ PESAN SEKARANG ]   (1-Klik Langsung Masuk Keranjang)│
├─────────────────────────────────────────────────────────┤
│ [ 🎨 Buka di Studio 3D ]  [ ⬇ Unduh Mockup ]  [ 🗑️ Hapus ]│
└─────────────────────────────────────────────────────────┘
```

### 2. Tiga Fitur Unggulan Wardrobe Baru:

1. **Tombol 1-Klik "Pesan Sekarang" (Instant Add-to-Cart):**
   - Pelanggan tidak perlu menunggu 3D Studio memuat.
   - Mengklik tombol ini langsung membuka pop-up mini pemilihan ukuran (S/M/L/XL/XXL) dan kuantitas, lalu pesanan langsung masuk ke keranjang belanja siap checkout!
2. **Tombol 1-Klik "Unduh Mockup HD":**
   - Pelanggan bisa langsung mengunduh gambar kaos 3D mereka dari dashboard untuk ditunjukkan ke teman atau diposting ke media sosial tanpa harus masuk ke editor.
3. **Mini 3D Viewer Pop-up (Putar Baju 360° Langsung di Dashboard):**
   - Disediakan tombol intip 3D ringan sehingga pelanggan bisa memutar bajunya langsung di halaman dashboard tanpa lag.
4. **Indikator Kuota Elegan Bergaya Apple iCloud:**
   - Menghilangkan badge merah menakutkan; menggantinya dengan bilah progres tipis minimalis:
     `Kapasitas Desain Cloud: 3 dari 5 slot digunakan` + tombol cepat bersihkan slot lama.

---

## 53. 🚀 MASTER AUDIT FORENSIK, REKAYASA & IMPRUVISASI TOTAL STUDIO 3D CONFIGURATOR

Studio 3D ([`/studio`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/app/studio>)) adalah **mahkota teknologi dan pusat pendapatan utama (*core revenue engine*) platform Kaos Kami**. Di studio inilah calon pelanggan, distro indie, kepanitiaan kampus, dan komunitas lokal Makassar merancang pakaian mereka sebelum melakukan checkout sablon DTF.

Berdasarkan riset mendalam terhadap konfigurator 3D kelas dunia (*Nike By You, Rimowa 3D, Apple Studio Configurator, Spline 3D Viewer, Printful 3D Studio, Canva Apparel Designer*) serta audit forensik menyeluruh terhadap 12 file inti 3D studio di repositori ini ([`CanvasStage.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/CanvasStage.tsx>), [`StudioHUD.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/StudioHUD.tsx>), [`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>), [`DecalGizmo.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/DecalGizmo.tsx>), [`PrintZoneGuide.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/PrintZoneGuide.tsx>), [`ApparelMeshRenderer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/ApparelMeshRenderer.tsx>), [`CameraRig.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/CameraRig.tsx>), [`StudioLighting.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/StudioLighting.tsx>), [`TshirtModel.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/TshirtModel.tsx>), [`ImageEditorModal.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/ImageEditorModal.tsx>), [`SizeGuideModal.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/SizeGuideModal.tsx>), dan [`useConfiguratorStore.ts`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/store/useConfiguratorStore.ts>)), bab ini merumuskan **analisis komprehensif, pemangkasan elemen redundan, perbaikan bug kritis, dan cetak biru impruvisasi total standar industri modern**.

---

### 1. 🌐 Benchmark Studio Kelas Dunia vs Karakteristik DTF Kaos Kami

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌐 BENCHMARK KONFIGURATOR 3D TERNAMA DUNIA VS KAOS KAMI MAKASSAR                       │
├───────────────────────┬───────────────────────────────────┬────────────────────────────┤
│ Platform              │ Keunggulan Visual / UX            │ Keterbatasan / Perbedaan   │
├───────────────────────┼───────────────────────────────────┼────────────────────────────┤
│ Nike By You           │ • Sudut kamera dinamis terkunci   │ • Hanya ganti warna panel  │
│                       │ • Shading kulit & bahan sangat PBR│ • Tidak ada custom sablon  │
│                       │ • Micro-interaction halus 60fps   │   bebas / upload gambar    │
├───────────────────────┼───────────────────────────────────┼────────────────────────────┤
│ Rimowa 3D Config      │ • Refleksi logam aluminium mewah  │ • Koper statis, tidak ada  │
│                       │ • Pencahayaan studio IBL dramatis │   deformasi kain fleksibel │
├───────────────────────┼───────────────────────────────────┼────────────────────────────┤
│ Printful / Printify   │ • Generator mockup otomatis       │ • Tampilan 3D kaku & flat  │
│                       │ • Validasi resolusi DPI cetak     │ • Tidak ada fisika kain /  │
│                       │ • Kalkulasi harga bertingkat      │   uji senter grazing QC    │
├───────────────────────┼───────────────────────────────────┼────────────────────────────┤
│ Spline 3D Viewer      │ • Interaksi gestur sangat responsif│• Bukan platform e-commerce │
│                       │ • Zero-clutter viewport           │ • Tidak ada kalibrasi cm   │
├───────────────────────┼───────────────────────────────────┼────────────────────────────┤
│ KAOS KAMI (TARGET     │ • 3D Interactive WebGL Apparel    │ • Platform komersial UMKM  │
│ STANDAR HIGH-CRAFT)   │ • Kalibrasi Fisik Nyata 1:1 (cm)  │   Workshop Tallo Makassar  │
│                       │ • DTF Heat-Press Clamping (30.0cm)│ • Langsung cetak tanpa     │
│                       │ • Collar Offset Alignment akurat  │   perantara pihak ketiga   │
│                       │ • Validasi DPI 3-Tier instan      │ • Dukung grosir komunitas  │
└───────────────────────┴───────────────────────────────────┴────────────────────────────┘
```

#### Nilai Inti (*Core Value Proposition*) Studio Kaos Kami:

Kaos Kami bukan sekadar mainan visualisasi 3D tanpa guna. Setiap millimeter posisi, skala, dan rotasi stiker di layar 3D diterjemahkan menjadi **tiket perintah kerja produksi (*Production Work Order*) yang terkalibrasi presisi dengan meja cetak roll DTF 58 cm dan plat mesin press 40×50 cm** di workshop Tallo.

---

### 2. 🔬 Audit Forensik 9 Masalah Kritis & Redundansi di Studio 3D

Berdasarkan pembacaan baris-demi-baris kode sumber, berikut adalah 9 temuan forensik yang menjadi akar ketidaknyamanan, kebingungan pengguna, maupun potensi bug di Studio 3D:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔬 TABEL AUDIT FORENSIK 9 PENYAKIT STUDIO 3D SAAT INI                                  │
├────┬─────────────────────────────┬───────────────────────────────┬─────────────────────┤
│ No │ Area / Komponen             │ Masalah / Redundansi          │ Dampak bagi Pengguna│
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 1  │ StudioHUD.tsx (Bilah Bawah) │ Tombol PUTAR vs GESER ganda;  │ Jempol salah tekan, │
│    │                             │ tombol GIZMO ON/OFF muncul di │ pakaian hilang dari │
│    │                             │ 3 lokasi berbeda.             │ layar panggung.     │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 2  │ DecalGizmo.tsx (Alat Sablon)│ Drei <Html transform> miring; │ Kotak kontrol peyot,│
│    │                             │ batas geser mentok X=0.35     │ sablon macet tanpa  │
│    │                             │ tanpa indikator visual.       │ ada penjelasan.     │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 3  │ CustomizerDrawer.tsx        │ 4.132 baris! Duplikasi ganda  │ Beban unduh lambat, │
│    │                             │ Desktop vs Mobile; residu     │ resiko inkonsistensi│
│    │                             │ Pola 2D Canvas masih ada.     │ bug saat edit.      │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 4  │ CustomizerDrawer.tsx:1266   │ if (!session) setIsAuthOpen   │ Tamu/guest dilarang │
│    │                             │ memblokir ekspor gambar PNG.  │ unduh mockup; lari! │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 5  │ Tab "SABLON" di Drawer      │ Memuat sub-tab "3D TEST"      │ Membingungkan! Apa  │
│    │                             │ (angin, stretch, drop test).  │ kaitan sablon dan   │
│    │                             │                               │ terowongan angin?   │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 6  │ Multi-Decal Layer List      │ Tidak ada tombol duplikat;    │ Repot mengunggah    │
│    │                             │ klik layer tidak otomatis     │ logo yang sama untuk│
│    │                             │ memutar kamera ke sisi sablon.│ dada dan lengan.    │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 7  │ Lighting & Material PBR     │ Kaos hitam pekat memudar      │ Warna kaos di layar │
│    │                             │ abu-abu susu; lipatan kaos    │ berbeda dengan kain │
│    │                             │ putih silau hilang kontras.   │ fisik di workshop.  │
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 8  │ Mode Smartphone Mobile      │ HUD bawah, BottomSheet drawer,│ Tombol bertumpuk    │
│    │                             │ dan chat Kamito bertabrakan.  │ di area bawah 120px.│
├────┼─────────────────────────────┼───────────────────────────────┼─────────────────────┤
│ 9  │ Typographic Text Decal      │ Teks sablon yang sudah dibuat │ Tidak bisa typo-fix │
│    │                             │ tidak bisa diedit ulang huruf │ tanpa harus membuat │
│    │                             │ dan font-nya (menjadi stiker).│ layer dari nol lagi.│
└────┴─────────────────────────────┴───────────────────────────────┴─────────────────────┘
```

---

### 3. 🛠️ Solusi Rekayasa & Rencana Impruvisasi Komprehensif

#### A. Pemangkasan Redundansi Bilah Kontrol Bawah ([`StudioHUD.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/StudioHUD.tsx>))

1. **Hapus Tombol Ganda `PUTAR` dan `GESER`:**

   - *Akar Masalah:* Komponen Three.js OrbitControls (`CameraRig.tsx`) sudah memiliki pemetaan intuitif standar industri:
     - Mouse Kiri / Sentuhan 1 Jari = Memutar pakaian 360° (*Rotate*).
     - Mouse Kanan / Sentuhan 2 Jari = Menggeser panggung (*Pan*).
     - Scroll Wheel / Cubit 2 Jari = Memperbesar/memperkecil (*Zoom*).
   - Menyediakan tombol radio `interactionTool === "pan"` justru mencelakakan pengguna: begitu tombol "GESER" aktif, sentuhan 1 jari biasa memindahkan baju ke luar layar tanpa bisa diputar kembali, membuat pengguna mengira aplikasi *hang*.
   - *Solusi:* Hapus tombol `PUTAR` dan `GESER` sepenuhnya dari HUD. OrbitControls selalu siap merotasi pakaian dengan 1 jari/mouse kiri, dan menggeser dengan 2 jari/mouse kanan. Sediakan tombol tunggal **`[ ⟲ Reset Posisi ]`** jika pengguna ingin mengembalikan pakaian tepat ke tengah panggung.
2. **Konsolidasi Tombol Saklar Gizmo:**

   - Saklar Gizmo saat ini ada di `StudioHUD.tsx` (baris 191), di `CustomizerDrawer.tsx` (baris 2185), dan di pojok kiri atas kotak gizmo itu sendiri (ikon `X`).
   - *Solusi:* Tetapkan SSOT kontrol: Tombol Gizmo dipertahankan **HANYA 1** di bilah HUD samping dengan label bersih `[ ⛶ Kotak Sablon ]`, dan tombol silang `X` di sudut gizmo untuk menyembunyikannya saat ingin melihat tampilan bersih.
3. **Penyempurnaan Preset Sudut Kamera Menjadi Segmented Pill Ergonomis:**

   - 4 sudut utama dirangkum dalam kapsul segmented modern:`[ Depan ]  [ Belakang ]  [ Kerah ]  [ Lengan ]`
   - Tombol `Kerah` mengarahkan kamera makro ke rib leher (zoom in) untuk memeriksa tekstur rajut katun.
   - Tombol `Lengan` memiliki logika toggle pintar: klik pertama mengarah ke lengan kiri, klik kedua otomatis bergeser ke lengan kanan.

---

#### B. Rekayasa Ulang Decal Gizmo ke 2D Screen-Space ([`DecalGizmo.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/DecalGizmo.tsx>))

1. **Eliminasi Cacat Drei `<Html transform>`:**

   - Komponen `<Html transform>` meletakkan elemen HTML di dalam ruang 3D Three.js dan mengonversinya menjadi matriks transformasi CSS 3D (`matrix3d(...)`).
   - Masalah: Ketika pakaian diputar sedikit miring atau saat viewport menerapkan offset samping (`setViewOffset`), kotak gizmo HTML mengalami distorsi miring (*shearing*), kabur (*blur*), atau terpisah beberapa piksel dari tekstur pakaian.
   - *Solusi Modern (Canva / Figma Style):*
     - Hitung koordinat 3D pusat stiker di permukaan mesh garmen.
     - Proyeksikan koordinat tersebut ke piksel layar 2D menggunakan rumus:`vector.project(camera)` $\rightarrow$ `pixelX = (proj.x * 0.5 + 0.5) * canvasWidth`, `pixelY = (-(proj.y * 0.5) + 0.5) * canvasHeight`.
     - Render kotak pembatas (*bounding box*) di lapisan SVG / HTML 2D yang menumpuk tepat di atas kanvas WebGL.
     - Hasil: Garis pembatas selalu beresolusi super tajam (1 piksel presisi retina), pegangan sudut (*corner dots*) bulat sempurna tanpa distorsi oval, dan rotasi selalu 1:1 mengikuti gerak tangan kursor.
2. **Umpan Balik Visual Batas Sablon Fisik DTF (Anti-Macet Tanpa Penjelasan):**

   - Saat ini, fungsi `clampDecalXY` secara paksa menghentikan koordinat jika $X > 0.35$ (area dada) atau $X > 0.15$ (area lengan).
   - Pengguna merasa mouse macet karena tidak ada indikator visual batas sablon.
   - *Solusi:*
     - Tampilkan bingkai batas aman cetak DTF (*DTF Safe Zone Outline*) berupa garis putus-putus halus warna hijau zamrud saat stiker digeser.
     - Jika stiker ditarik melebihi lebar maksimum 30.0 cm atau mendekati jahitan samping, bingkai berubah warna menjadi oranye lembut disertai tooltip taktil: *"Maksimal Lebar Sablon A3 (30 cm) — Dekati jahitan samping dapat menyebabkan sablon terpotong di mesin heat press"*.
     - Berikan magnet snapping lembut (*magnetic snap*) pada garis sumbu tengah dada ($X = 0$) disertai garis bantu cyan vertikal.

---

#### C. Pembersihan Residu 2D Canvas & Dekonstruksi Monolit Drawer ([`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>))

1. **Pembersihan Total Residu 2D Canvas:**

   - Menghapus import lazy `PatternStudioLazy` dan `FabricEditor`.
   - Menghapus tombol sub-mode `POLA 2D` di baris 2024 dan 3516.
   - Menghapus state `showFabricEditor` dan cabang render terkait.
   - Seluruh fokus kustomisasi dialihkan 100% pada kanvas 3D interaktif yang jauh lebih realistis dan disukai pelanggan.
2. **Relokasi Fitur Fisika "3D TEST" ke Panel Laboratorium Kain Mandiri:**

   - Fitur simulasi kain (terowongan angin *wind tunnel*, uji elastisitas sablon *stretch deform*, dan lampu senter inspeksi grazing *flashlight*) adalah fitur canggih yang memukau, namun **sangat salah tempat jika ditaruh di dalam tab "SABLON"**.
   - Pengguna yang membuka tab sablon hanya ingin mengunggah logo atau mengetik nama komunitas, bukan mengatur kecepatan angin simulator.
   - *Solusi:* Pindahkan fitur pengujian fisik kain ini ke tombol ikon khusus di header studio bernama **`[ 🧪 Lab Kain ]`** yang membuka modal kompak [`ClothLab.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/ClothLab.tsx>). Dengan demikian, tab `SABLON` di drawer kembali bersih, fokus, dan bebas distraksi!
3. **Restrukturisasi 3 Tab Utama yang Ramping & Logis:**

   - **Tab 1: `PRODUK`**
     - Pemilihan jenis pakaian: Kaos Polos, Lengan Panjang, Crewneck, Hoodie, Jaket Coach, Topi.
     - Pemilihan bahan resmi: Cotton Combed 24s (200 gsm), Combed 30s (150 gsm), Heavyweight (260 gsm), Fleece Katun (330 gsm).
     - Palet warna resmi: 12 warna distrik streetwear (Jet Black, Chalk White, Tangerine Orange, Royal Cobalt, Olive Military, Terracotta, Maroon Burgundy, Forest Pine, Khaki Dune, Misty Charcoal, dsb.).
     - Pilihan warna single atau multi-part (badan, lengan, rib leher).
   - **Tab 2: `SABLON`**
     - Tombol aksi unggah gambar utama: `+ Upload Gambar (PNG/JPG/WebP)`.
     - Tombol buat teks tipografi: `+ Tulis Teks Kustom`.
     - Daftar lapisan sablon aktif (*Layer Stack*) dengan thumbnail pratinjau, posisi (Depan/Belakang/Lengan), dimensi fisik nyata (cm), tombol duplikat, dan tombol hapus.
     - Slider ukuran (cm), rotasi (°), dan tombol preset posisi cepat (Dada Kiri, Dada Tengah, Punggung Atas, dsb.).
   - **Tab 3: `SIMPAN & ORDER`**
     - Ringkasan pesanan & rincian kalkulasi harga matematis 6 variabel.
     - Pilihan ukuran pakaian (S, M, L, XL, XXL, 3XL) disertai tombol modal panduan ukuran fisik cm.
     - Tombol aksi utama: **`[ 🛍️ PESAN SEKARANG ]`** (membuka modal checkout instan) dan **`[ 💾 Simpan Desain ]`** (menyimpan ke Wardrobe akun).

---

#### D. Pembebasan Ekspor Mockup untuk Pengguna Tamu (*Guest-Friendly*) & Modal Ekspor Terpadu

1. **Bebaskan Ekspor untuk Tamu (*Remove Guest Lockout*):**

   - Hapus baris pemblokiran:
     ```tsx
     // DIBEBASKAN: Pengunjung tanpa login bebas mengunduh mockup 2K!
     // if (!session) { setIsAuthOpen(true); return; }
     ```
   - Memberikan kebebasan unduh mockup gambar kepada calon pembeli akan melipatgandakan *viral loop* di WhatsApp dan media sosial, karena panitia atau ketua komunitas bisa langsung mengunduh mockup dan membagikannya ke grup WA mereka untuk voting!
   - Login hanya diwajibkan saat: (1) Menyimpan desain ke database cloud akun, atau (2) Melakukan pembayaran checkout pesanan.
2. **Satu Modal Pratinjau Ekspor Mewah (*Unified Export Studio Modal*):**

   - Menggantikan 10 tombol berserakan di bawah drawer dengan satu modal terpadu yang dibuka dari tombol **`[ ⬇ Ekspor ]`** di header.
   - Modal memiliki 3 tab pratinjau visual langsung (*WYSIWYG*):
     - **Tab 1: Foto Mockup 2K PNG:** Pilihan tampak depan / tampak belakang / sudut 3D saat ini, pilihan resolusi (1080p Full HD atau 2048p Ultra HD 2K), pilihan latar transparan atau studio.
     - **Tab 2: Kartu Medsos 4:5 (Story/Feed):** Menghasilkan kartu grafis vertikal beresolusi 1080×1350 siap upload ke Instagram dan TikTok, lengkap dengan nama bahan katun combed dan watermark resmi Kaos Kami.
     - **Tab 3: Video Berputar 360° Turntable:** Menghasilkan video looping 5 detik format MP4/WebM/GIF yang memperlihatkan pakaian berputar 360 derajat.

---

#### E. Kalibrasi Visual Shading & Realisme Tekstur Bahan PBR ([`StudioLighting.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/StudioLighting.tsx>))

1. **Anti-Washing Out Warna Hitam (Jet Black):**

   - *Akar Masalah:* Cahaya ambient yang terlalu terang dan tone mapping exposure > 1.0 mengubah warna `#111111` menjadi abu-abu susu di layar monitor pengguna.
   - *Solusi:*
     - Kunci `toneMappingExposure = 1.0` permanen.
     - Gunakan `studioTheme === "gallery"` dengan pencahayaan 3-titik (*Key Light 1.2*, *Fill Light 0.4*, *Rim Light 0.8*).
     - Cahaya *Rim Light* dari belakang pakaian memberikan garis tepi halus (*contour lighting*) yang memisahkan pakaian hitam dari latar belakang gelap tanpa memudarkan warna dasar kain.
2. **Preservasi Kontur Lipatan Kain pada Kaos Putih (Chalk White):**

   - *Akar Masalah:* Warna putih murni `#FFFFFF` memantulkan cahaya berlebih sehingga lekukan dan lipatan kain menjadi datar (*blown-out highlights*).
   - *Solusi:*
     - Peta normal prosedural katun combed (*Cotton Weave Normal Map*) diterapkan dengan kekuatan bump `0.35` untuk memberikan bayangan mikro pada pori-pori kain.
     - Tambahkan saluran ambient occlusion (AO) lembut di sekitar ketiak, jahitan bahu, dan rib kerah sehingga kaos putih tetap memiliki kedalaman bayangan 3D yang sangat realistis.
3. **Penyelarasan Bahan Nyata Workshop Makassar:**

   - **Cotton Combed 24s:** Roughness `0.84`, Metalness `0.02`, Sheen `0.25` (karakter kain tebal sedang, berbobot, menyerap keringat, standar distro Makassar).
   - **Cotton Combed 30s:** Roughness `0.80`, Metalness `0.02`, Sheen `0.35` (lebih tipis, lebih jatuh, adem untuk cuaca pesisir pantai Makassar).
   - **Heavyweight Cotton 260 gsm:** Roughness `0.90`, Metalness `0.00`, Sheen `0.15` (sangat kaku, tebal, ala streetwear boxy cut Amerika Serikat).
   - **Fleece Katun 330 gsm (Hoodie):** Roughness `0.88`, Sheen `0.45` dengan serat halus lembut.

---

#### F. Ergonomi Multi-Decal & Fitur Duplikasi Cepat

1. **Fitur 1-Klik "Duplikat Sablon" (*Duplicate Decal*):**

   - Pada kartu stiker di drawer, tambahkan tombol `[ ⧉ Duplikat ]`.
   - Mengklik tombol ini langsung membuat layer stiker baru dengan gambar dan skala yang sama, namun digeser sedikit ($X + 0.05$) atau otomatis dipindahkan ke lengan lawan. Pengguna tidak perlu mengunggah dan memotong logo yang sama berulang kali!
2. **Kamera Otomatis Mengikuti Seleksi Sablon (*Camera Auto-Pivot*):**

   - Saat pengguna mengklik salah satu stiker di daftar layer (misalnya stiker di punggung belakang):
     - Kamera Three.js secara otomatis meluncur mulus (*smooth glide lerp 0.6s*) menghadap ke tampak belakang (`cameraPreset: "back"`).
     - Pengguna tidak perlu memutar-mutar pakaian secara manual hanya untuk melihat stiker yang sedang dieditnya.
3. **Penyempurnaan Stiker Teks Tipografi (Dapat Diedit Ulang):**

   - Simpan teks mentah, nama font, dan warna font di dalam objek `DecalLayer` (misal: `textMetadata: { text: "MAKASSAR", fontId: "oswald", color: "#FFFFFF" }`).
   - Saat pengguna memilih stiker teks, drawer menampilkan tombol **`[ ✏ Edit Teks ]`** yang langsung membuka kembali modal generator teks dengan kalimat lama yang sudah terisi. Typo penulisan nama komunitas dapat diperbaiki seketika!

---

#### G. Ergonomi Tampilan Layar Smartphone (Mobile Viewport 360–430px)

1. **Eliminasi Tabrakan Bilah Bawah:**
   - Pada viewport mobile (<768px):
     - Pindahkan tombol preset kamera (`Depan`, `Belakang`, `Kerah`) ke **bilah mengambang vertikal minimalis di sisi kanan atas layar**.
     - Panggung Three.js mendapatkan 100% ruang bebas tanpa tertutup bilah kontrol.
2. **3-Stage Bottom Sheet Ergonomis:**
   - Drawer mobile diubah menjadi lembar geser bawah (*Bottom Sheet*) dengan 3 titik henti magnetis (*snap points*):
     - **Taraf 1: Mode Intip / Peek (Tinggi 12dvh):** Hanya menampilkan ringkasan harga (`Rp 85.000`) dan tombol utama `[ 🛍️ PESAN ]` + indikator geser naik (*drag handle*). Panggung 3D terlihat 88% lapang!
     - **Taraf 2: Mode Kontrol / Half (Tinggi 48dvh):** Menampilkan pemilih warna, ukuran, dan tombol sablon. Pengguna bisa mengubah warna baju sambil langsung melihat perubahan di model 3D di separuh atas layar.
     - **Taraf 3: Mode Penuh / Expanded (Tinggi 88dvh):** Membuka pengaturan detail sablon, editor gambar, atau panduan ukuran.
3. **Pencegahan Pembajakan Gestur Layar:**
   - Kanvas 3D memiliki area sentuh yang terisolasi: geser 1 jari di tengah layar = putar baju 360°. Geser di luar kanvas (pada area bottom sheet) = scroll menu pengaturan.

---

### 4. 📐 Diagram Arsitektur Interaksi Studio 3D (Before vs After)

```
SEBELUM (BERANTAKAN, GANDA & MENUMPUK):
┌────────────────────────────────────────────────────────────────────────┐
│ [Headbar: 8 Tombol Teks Berserakan & Saling Tumpang Tindih]           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      [PANGGUNG 3D THREE.JS]                           │
│               (Kotak Decal HTML 3D Miring Saat Diputar)                │
│                                                                        │
│   [HUD Bawah: PUTAR | GESER | AUTO | GIZMO | SIZE L (Tumpang Tindih)]  │
├────────────────────────────────────────────────────────────────────────┤
│ [Drawer Kanan 4.132 Baris: Tab SABLON campur Uji Angin 3D & Pola 2D]   │
│ [10+ Tombol Ekspor di Bawah: Tamu/Guest Dikunci Pop-up Login!]         │
└────────────────────────────────────────────────────────────────────────┘

SESUDAH (HIGH-CRAFT, BERSIH, TERKALIBRASI & INTUITIF):
┌────────────────────────────────────────────────────────────────────────┐
│ [Headbar: Kembali | Logo | ● Tersimpan | 🧪 Lab Kain | ⬇ Ekspor | Akun]│
├───────────────────────────────────────────────────────┬────────────────┤
│                                                       │ [DRAWER 3 TAB] │
│                 [PANGGUNG 3D RETINA]                  │ 1. PRODUK      │
│          • Kanvas Bersih, Shading PBR Otentik         │ 2. SABLON      │
│          • Decal Gizmo 2D Screen-Space Tajam          │ 3. SIMPAN/ORDER│
│          • Garis Laser Simetri & Batas 30cm Aman      │                │
│                                                       │ Ringkasan Harga│
│ [HUD Bawah: (Depan | Belakang | Kerah) • (⟲ Reset)]  │ [ 🛍️ PESAN ]   │
└───────────────────────────────────────────────────────┴────────────────┘
```

---

### 5. 📋 Rencana Aksi Eksekusi Bertahap (Actionable Roadmap)

Untuk merealisasikan cetak biru di atas secara terukur tanpa merusak kestabilan kode saat ini, eksekusi dibagi menjadi **6 Fase Presisi**:

* **Fase 1: Pembersihan Kode Mati & Un-wire 2D Canvas**

  - Cabut import `PatternStudioLazy` dan `FabricEditor` dari [`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>).
  - Hapus tombol sub-mode `POLA 2D`.
  - Pindahkan kontrol `3D TEST` ke tombol independen `Lab Kain`.
  - Verifikasi kompilasi TypeScript (`npx tsc --noEmit`).
* **Fase 2: Perampingan & Pembersihan Kontrol Ganda di HUD ([`StudioHUD.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/studio/StudioHUD.tsx>))**

  - Hapus tombol redundan `PUTAR` dan `GESER`.
  - Satukan saklar Gizmo menjadi 1 tombol elegan.
  - Sederhanakan tombol preset sudut pandang kamera menjadi 3 tombol segmented (`Depan`, `Belakang`, `Kerah`).
* **Fase 3: Pembebasan Ekspor Mockup Tamu Ber-Watermark Halus & Modal Ekspor Terpadu**

  - Hapus gembok login `if (!session) setIsAuthOpen(true)` pada unduhan mockup PNG.
  - Terapkan canvas compositing watermark transparan halus (*ultra-low opacity* 0.08–0.12) bertuliskan `KAOS KAMI MAKASSAR · kaoskami.biz.id` di area tengah untuk pengguna tamu/guest (kaos dan sablon tetap jelas terlihat).
  - Berikan unduhan murni bersih (*clean 2K*) tanpa watermark bagi member terdaftar yang login.
  - Satukan seluruh opsi ekspor ke dalam komponen modal terpusat `ExportStudioModal.tsx` dengan tab Foto 2K, Medsos 4:5, dan Video 360°.
* **Fase 4: Modernisasi Decal Gizmo ke 2D Screen-Space ([`DecalGizmo.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/DecalGizmo.tsx>))**

  - Terapkan proyeksi koordinat 3D ke 2D piksel layar via `vector.project(camera)`.
  - Tambahkan pegangan sudut taktil 2D dan garis bantu magnetis sumbu tengah dada.
  - Pasang indikator visual batas fisik DTF 30.0 cm yang ramah.
* **Fase 5: Modularisasi Komponen Drawer & Pembasmian Duplikasi Mobile/Desktop**

  - Pisahkan konten drawer menjadi komponen modular yang dapat dipakai bersama (*shared reusable content*) oleh Desktop Drawer maupun Mobile BottomSheet, memangkas ukuran `CustomizerDrawer.tsx` dari 4.132 baris menjadi di bawah 1.000 baris.
* **Fase 6: Penyetelan PBR Shading, Normal Kain & Nilai Kalibrasi Produksi**

  - Sempurnakan pencahayaan 3-titik di [`StudioLighting.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/3d/StudioLighting.tsx>) agar kaos hitam dan putih memiliki kontras sempurna.
  - Pastikan nilai `offsetFromCollarCm` dan `printWidthCm` selalu tersimpan akurat ke database untuk tim workshop DTF di Tallo Makassar.

---

## 54. 🌐 MASTER AUDIT & CETAK BIRU RESPONSIVITAS TOTAL SELURUH PERANGKAT (ALL-DEVICE UI/UX) & ARSITEKTUR MOBILE CAPACITOR NATIVE

Platform Kaos Kami melayani dua kanal pengguna utama: **Kanal Responsive Web ([`kaos-kami-web`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web>))** yang diakses melalui berbagai peramban desktop dan ponsel, serta **Kanal Native Mobile App ([`kaos-kami-mobile`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-mobile>))** berbasis Capacitor Android (APK) dan iOS.

Untuk menjamin kenyamanan interaksi tanpa hambatan (*frictionless experience*) dari layar raksasa 4K hingga smartphone ringkas 360px di tangan pengguna Makassar, bab ini menetapkan **audit forensik responsivitas menyeluruh, pemetaan 5 spektrum form factor, integrasi jembatan native Capacitor, dan konstitusi kesetaraan visual cross-platform**.

---

### 1. 📐 Pemetaan 5 Spektrum Form Factor Perangkat Global

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📐 5 SPEKTRUM FORM FACTOR PERANGKAT KAOS KAMI PLATFORM                                 │
├────┬───────────────────────────┬───────────────────┬───────────────────────────────────┤
│ No │ Kategori Perangkat        │ Rentang Resolusi  │ Tantangan & Solusi Rekayasa       │
├────┼───────────────────────────┼───────────────────┼───────────────────────────────────┤
│ 1  │ Ultra-wide & Desktop 4K   │ 1920px – 3840px   │ • Lebar teks dijepit (max 75ch).  │
│    │ (iMac 27", Monitor 34")   │ (QHD, 4K UHD)     │ • WebGL maxDpr dibatasi ke 1.5    │
│    │                           │                   │   agar GPU tidak overheat/drop FPS│
├────┼───────────────────────────┼───────────────────┼───────────────────────────────────┤
│ 2  │ Laptop Standar Indonesia  │ 1366px – 1536px   │ • Tinggi vertikal sempit (~600px).│
│    │ (Resolusi #1 di Makassar) │ (Tinggi ~768px)   │ • Sidebar Admin & Drawer 3D wajib │
│    │                           │                   │   memiliki internal scroll mulus. │
├────┼───────────────────────────┼───────────────────┼───────────────────────────────────┤
│ 3  │ Tablet & Foldable Device  │ 768px – 1024px    │ • Portrait: Drawer jadi overlay.  │
│    │ (iPad Air/Pro, Galaxy Tab)│ (Touch-first)     │ • Matikan selector :hover palsu.  │
│    │                           │                   │ • Mode sentuh 1 jari vs 2 jari.   │
├────┼───────────────────────────┼───────────────────┼───────────────────────────────────┤
│ 4  │ Smartphone Mobile Web     │ 360px – 430px     │ • 100dvh (Dynamic URL Bar aware). │
│    │ (Safari iOS, Chrome HP)   │ (Tinggi ~800-932) │ • Safe Area Inset notch & home bar│
│    │                           │                   │ • 3-Stage Bottom Sheet (12-48-88%)│
├────┼───────────────────────────┼───────────────────┼───────────────────────────────────┤
│ 5  │ Native Capacitor Shell    │ Android APK &     │ • Status bar transparan (pt-safe).│
│    │ (`kaos-kami-mobile`)      │ iOS Native WebView│ • Hardware APIs: Kamera, Haptik,  │
│    │                           │                   │   Biometrik, Barcode, Geolocation.│
└────┴───────────────────────────┴───────────────────┴───────────────────────────────────┘
```

---

### 2. 🔬 Audit Forensik Responsivitas Web ([`kaos-kami-web`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web>))

#### A. Navigasi & Header Publik ([`Navbar.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/Navbar.tsx>))

1. **Desktop (>1024px):**
   - Logo Kaos Kami dan tautan navigasi (`BERANDA`, `KATALOG`, `TENTANG KAMI`, `PESANANKU`) tertata rapi di sebelah kiri.
   - Tombol keranjang belanja menampilkan jumlah item secara reaktif via `useCartStore(s => s.items.reduce(...))`.
   - Tombol utama `KUSTOM 3D` berwarna oranye hangat (`Signal Tangerine #F97316`) menjadi jangkar visual konversi.
2. **Mobile (<1024px):**
   - Menu desktop otomatis menciut menjadi tombol burger minimalis dengan animasi ikon halus (`Menu` $\leftrightarrow$ `X`).
   - Drawer menu navigasi mobile meluncur mulus dari samping dengan latar belakang kaca gelap (*dark obsidian glassmorphism* `backdrop-blur-2xl`), dilengkapi tombol download aplikasi Android native APK.

#### B. Studio 3D All-Device Ergonomics ([`StudioClient.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/app/studio/StudioClient.tsx>) & [`CustomizerDrawer.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/ui/CustomizerDrawer.tsx>))

1. **Laptop 1366×768 (Vertical Fold Constraint):**
   - Pada laptop dengan tinggi viewport efektif hanya ~600px, drawer kustomisasi diikat secara presisi: `top-[74px] bottom-5 max-w-[420px]`.
   - Header drawer dan footer harga terkunci (*fixed header/footer*), sementara badan drawer menggunakan `flex-1 overflow-y-auto min-h-0` dengan scrollbar tipis kustom. Pengguna tidak akan pernah kehilangan akses ke tombol *"PESAN SEKARANG"*.
2. **Tablet 768px (Portrait View):**
   - Jika lebar layar $\le 1024px$, drawer samping beralih dari mode *Side-Dock* (yang memakan 50% panggung) menjadi mode *Slide-Over Overlay* atau *Bottom Sheet*.
   - Kamera Three.js secara cerdas me-reset `setViewOffset(0)` sehingga pakaian 3D berada tepat di tengah layar tablet, bukan terdorong keluar frame.
3. **Smartphone 360px–430px (Thumb-Zone & Safe Area):**
   - Bilah bawah `StudioHUD` yang sebelumnya bertabrakan dipindahkan: preset kamera diletakkan di pojok kanan atas, sementara menu kustomisasi menggunakan **3-Stage Bottom Sheet**:
     - *Taraf 1 (Peek 12dvh):* Menampilkan harga `IDR 85.000` dan tombol pesan instan.
     - *Taraf 2 (Half 48dvh):* Menampilkan pemilih warna, ukuran, dan upload stiker.
     - *Taraf 3 (Full 88dvh):* Pengaturan detail teks dan editor gambar.

#### C. Dashboard Admin Kokpit ([`AdminNav.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-web/src/components/admin/AdminNav.tsx>) & `/admin/*`)

1. **Perampingan Sidebar untuk Laptop Layar Pendek:**
   - 14 tautan menu yang sebelumnya memenuhi layar vertikal dikelompokkan ke dalam **4 Pilar Ringkas**: `📊 Ringkasan`, `🖨️ Workshop DTF`, `🚚 Pengiriman`, `⚙️ Toko`.
   - Pada resolusi $\le 1280px$, sidebar otomatis menciut menjadi icon-rail 64px dengan tooltip mengambang, memberikan ruang maksimal untuk tabel antrean pesanan dan kanvas gang-sheet sablon.

---

### 3. 📲 Audit Forensik & Arsitektur Native Capacitor ([`kaos-kami-mobile`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-mobile>))

Aplikasi mobile native `kaos-kami-mobile` dirancang khusus untuk memberikan pengalaman premium sekelas aplikasi retail streetwear internasional di Android dan iOS.

#### A. Arsitektur 5 Tab Utama ([`page.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-mobile/src/app/page.tsx>) — 1.695 Baris)

1. **Tab `home` (Beranda Streetwear & Pelacak Cepat):**
   - Hero banner dinamis dengan preview apparel 3D interaktif.
   - Kartu lacak pesanan aktif (*Active Order Tracker Card*) yang langsung memperlihatkan tahapan sablon garmen di workshop Tallo.
2. **Tab `studio` (Studio 3D Mobile Engine):**
   - Merender [`CanvasStageMobile.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-mobile/src/components/3d/CanvasStageMobile.tsx>) dengan konfigurasi hemat daya baterai.
   - Antarmuka kontrol sentuh mengambang ([`StudioControlOverlay.tsx`](<file:///d:/Vibe%20coding%20Semester%207/Kaos%20Kami/kaos-kami-mobile/src/components/3d/StudioControlOverlay.tsx>)).
3. **Tab `catalog` (Etalase Produk Lengkap):**
   - Grid produk 2-kolom responsif dengan swatch warna interaktif dan filter kategori pill.
4. **Tab `orders` (Riwayat Pesanan & Tech Pack Sablon):**
   - Rincian faktur digital, status pembayaran Duitku, dan tombol cetak Tech Pack PDF produksi.
5. **Tab `profile` (Pengaturan, Biometrik & Akses Admin):**
   - Buku alamat tersinkronisasi GPS, toggle keamanan sidik jari, dan tombol pintas ke konsol admin workshop.

#### B. Integrasi 8 Jembatan Perangkat Keras Native (*Capacitor Hardware Bridges*)

1. **Kamera & Galeri Foto (`@capacitor/camera`):**
   - Fungsi `pickOrCaptureDecalImage`: Pengguna dapat memotret sketsa atau logo langsung dari kamera HP atau memilih dari galeri foto dengan kompresi cerdas sebelum diproyeksikan ke pakaian 3D.
2. **Umpan Balik Taktil Getaran (`@capacitor/haptics`):**
   - Setiap ketukan tombol, rotasi pakaian, dan pemilihan warna memicu getaran mikro taktil (*light impact haptic*), memberikan sensasi fisik yang sangat memuaskan (*native feel*).
3. **Pemindai Barcode & QR Code (`@capacitor-mlkit/barcode-scanning`):**
   - Staf produksi workshop dapat memindai barcode invoice fisik atau resi kurir langsung dari kamera HP tanpa alat scanner terpisah.
4. **Keamanan Biometrik Sidik Jari & Face ID (`@capgo/capacitor-native-biometric`):**
   - Memproteksi akses ke panel Admin dan riwayat transaksi dengan otentikasi biometrik lokal perangkat.
5. **Geolokasi GPS Presisi (`@capacitor/geolocation`):**
   - Mengambil koordinat GPS akurat pengguna saat memilih alamat antar untuk memvalidasi radius **Gratis Ongkir Makassar (Radius 10 km dari workshop Tallo)**.
6. **Deteksi Koneksi & Antrean Sinkronisasi Offline (`@capacitor/network` & `syncQueue`):**
   - Saat sinyal internet terputus di jalan, aplikasi menampilkan banner oranye tenang *"Mode Offline — Desain tersimpan di memori HP"*. Begitu online kembali, antrean transaksi otomatis tersinkronisasi ke server Edge Turso.
7. **Pemberitahuan Dorong (*Push Notifications* — `@capacitor/push-notifications`):**
   - Mengirimkan update seketika saat sablon pakaian selesai dipress atau saat kurir berangkat mengantar pesanan.
8. **In-App Browser Pembayaran & Deep Linking (`@capacitor/browser` & `@capacitor/app`):**
   - Membuka halaman pembayaran Duitku (QRIS / VA) di dalam browser in-app yang aman, lalu secara otomatis kembali ke aplikasi via skema URL `id.makassar.kaoskami://payment-return`.

#### C. Optimalisasi Termal GPU & Manajemen Baterai WebGL

* **Frameloop Hemat Baterai (`frameloop="demand"`):**
  - GPU smartphone (Adreno/Mali) sangat rentan mengalami *thermal throttling* (panas dan boros baterai) jika merender 3D terus menerus pada 60/120 FPS.
  - Pada `CanvasStageMobile.tsx`, canvas Three.js berjalan pada mode **`demand`**: panggung WebGL **HANYA** merender frame baru saat jari pengguna memutar pakaian atau saat warna diganti.
  - Saat pakaian diam, konsumsi daya GPU turun menjadi **0%**, menjaga suhu HP tetap dingin dan baterai awet!
* **Resolusi Terjepit (Max DPR 2):**
  - Pada layar smartphone beresolusi Quad-HD (1440p), nilai device pixel ratio (DPR) sering kali mencapai 3.5 hingga 4.
  - Sistem secara cerdas membatasi render panggung ke `maxDpr = 2`, memangkas beban pemrosesan piksel hingga 50% tanpa ada penurunan ketajaman visual di mata manusia.

#### D. Penanganan Edge-to-Edge Status Bar & Keyboard Virtual

1. **Edge-to-Edge Safe Padding:**
   - File `capacitor.config.ts` menyetel `StatusBar: { overlaysWebView: true }`.
   - Header mobile (`NativeHeader.tsx`) diproteksi dengan `padding-top: max(env(safe-area-inset-top), 16px)` agar tombol tidak tertutup oleh Dynamic Island iPhone atau kamera punch-hole Android.
   - Bilah bawah (`TabBar.tsx`) diproteksi dengan `padding-bottom: max(env(safe-area-inset-bottom), 12px)` agar tidak menabrak bar navigasi sistem Android.
2. **Keyboard Push Handling:**
   - Plugin `@capacitor/keyboard` dikonfigurasi dengan `resize: KeyboardResize.Body`.
   - Saat pengguna mengetik di live chat CS Kamito atau mengisi form alamat, kontainer form otomatis terangkat tepat di atas keyboard virtual tanpa terpotong.

---

### 4. ⚖️ Matriks Harmonisasi Cross-Platform (Web vs Mobile Capacitor)

```
┌──────────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ Fitur / Aspek Desain     │ Responsive Web (kaos-kami-web)    │ Native Mobile (kaos-kami-mobile)  │
├──────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ Viewport Height          │ 100dvh (Bebas potong URL Bar)     │ Edge-to-edge (pt-safe & pb-safe)  │
│ 3D Configurator Layout   │ Layar Penuh + Floating Drawer     │ Layar Penuh + 3-Stage BottomSheet │
│ Three.js Frameloop       │ Demand (Idle) / Always (Animasi)  │ Demand murni (0% GPU idle draw)   │
│ Model 3D Asset Loading   │ Draco Compressed R2 Cloudflare    │ CacheStorage lokal terverifikasi  │
│ Input Unggah Stiker      │ File Picker HTML5 drag-and-drop   │ Kamera Langsung & Galeri Native   │
│ Respon Sentuhan          │ CSS active:scale-[0.98]           │ Native Haptic Vibrate (Capacitor) │
│ Otentikasi Pengguna      │ Better-Auth Email / Password      │ Password + Biometrik Sidik Jari   │
│ Live Chat CS             │ Kapsul Mengambang (Draggable FAB) │ Tab Bar Pill + Floating Bubble    │
│ Pelacakan GPS Alamat     │ Browser Geolocation API           │ Native GPS Akurat (Capacitor)     │
---

## 55. 💳 CETAK BIRU PURGE TOTAL DUITKU & INTEGRASI PENUH IPAYMU DIRECT QRIS 100% IN-APP (WEB & MOBILE CAPACITOR)

Berdasarkan keputusan mutlak pemilik proyek (Oktober 2026), platform Kaos Kami telah resmi **bermigrasi 100% dari Duitku ke iPaymu Production Gateway**. Seluruh residu kode, skrip pihak ketiga, dan penyebutan nama Duitku di web maupun mobile wajib dibersihkan secara tuntas.

### 1. Keputusan Arsitektur Mutlak: 100% iPaymu Production
* **Kredensial Resmi Aktif (`.env.local` & Production Secret):**
  - `PAYMENT_GATEWAY_PROVIDER=ipaymu`
  - `IPAYMU_VA=1179005803463032`
  - `IPAYMU_API_KEY=<disensor — lihat .env.local, JANGAN commit nilai> (bocor 05 Okt 2026, SUDAH disensor dari dokumen; ROTASI via dashboard iPaymu bila key pernah publik)`
  - `IPAYMU_ENV=production`
  - Verifikasi mandiri telah lolos 100% pada skrip `scratch/test-ipaymu.mjs`.
* **Daftar Residu Duitku yang Dieliminasi Total (Purge List):**
  1. Hapus skrip eksternal `https://app.duitku.com/lib/js/duitku.js` dan `app-sandbox.duitku.com` dari `kaos-kami-web/src/app/layout.tsx`.
  2. Gantikan fungsi warisan `duitkuPay` dan pop-up iframe Duitku di `CheckoutModal.tsx` dengan **Modal Direct QRIS In-App Kaos Kami**.
  3. Perbarui rute bayar ulang `kaos-kami-web/src/app/api/orders/[id]/repay/route.ts` agar memanggil `ipaymuProvider.createCharge` (Direct QRIS).
  4. Perbarui footer toko (`Footer.tsx`), syarat & ketentuan (`terms/page.tsx`), dan FAQ (`faq/page.tsx`): ganti teks referensi Duitku menjadi *"iPaymu Payment Gateway (QRIS Nasional & Bank Transfer)"*.
  5. Perbarui kartu status integrasi di `/admin/settings/page.tsx` menjadi **iPaymu Payment Gateway (Production Live)**.
  6. Pada mobile app (`kaos-kami-mobile`): hapus file `src/lib/payments/duitkuMobile.ts`, gantikan dengan `src/lib/payments/ipaymuMobile.ts` serta perbarui `CheckoutSheet.tsx`, `UserOrderTracker.tsx`, dan `src/app/page.tsx`.

---

### 2. Standar Antarmuka Direct QRIS 100% In-App (Zero External Redirect)
Keunggulan utama API iPaymu v2 (`/api/v2/payment/direct`) adalah menghasilkan data QRIS mentah (`qrString`) dan URL gambar QR resmi (`qrImage`) langsung dari server. Pengguna **TIDAK PERNAH DILEMPAR PINDAH KE SITUS LAIN**!
```

┌────────────────────────────────────────────────────────────────────────┐
│ 💳 MODAL DIRECT QRIS RESMI KAOS KAMI (IN-APP POPUP)                   │
├────────────────────────────────────────────────────────────────────────┤
│ [Logo QRIS Nasional]              Batas Waktu Bayar: [ 23:59:45 ⏳ ]   │
│                                                                        │
│                ┌──────────────────────────────────┐                    │
│                │                                  │                    │
│                │     GAMBAR QR CODE RESMI         │                    │
│                │     IPAYMU RESOLUSI TINGGI       │                    │
│                │     (TAMPIL JELAS & PRESISI)     │                    │
│                │                                  │                    │
│                └──────────────────────────────────┘                    │
│                                                                        │
│ Total Tagihan: Rp 145.000 (Nomor Pesanan: #KK-20261004-9821)           │
│                                                                        │
│ [ 📸 Screenshot Layar ] atau [ 📥 Unduh Gambar QRIS ke Galeri HP ]    │
│                                                                        │
│ 📱 Panduan Bayar Cepat (1 Menit Lunas):                                │
│ 1. Simpan gambar QRIS ke galeri atau lakukan Screenshot di HP Anda.    │
│ 2. Buka m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, Dana, │
│    OVO, ShopeePay, LinkAja).                                           │
│ 3. Pilih menu "Bayar QRIS" lalu klik ikon "Ambil dari Galeri Foto".    │
│ 4. Transaksi lunas seketika tanpa biaya admin tambahan!                │
│                                                                        │
│ [ 🔄 Menunggu Pembayaran... (Otomatis Terverifikasi) ]                 │
│ [ 🧾 Buka Halaman Invoice Pesanan ]                                    │
└────────────────────────────────────────────────────────────────────────┘

```

* **Fitur Utama Direct QRIS In-App:**
  1. **Tampil Langsung di Modal Web & Sheet Mobile:** Tidak ada perpindahan tab atau jendela browser baru.
  2. **Tombol Unduh & Dukungan Screenshot:** Gambar QRIS dapat diunduh langsung (`download="qris-kaoskami-orderNumber.png"`) atau di-screenshot oleh pengguna smartphone.
  3. **Auto-Polling Status Pelunasan:** Komponen mendengarkan webhook callback iPaymu (`/api/webhooks/ipaymu`). Saat dana diterima, modal seketika berubah menjadi centang hijau *"✅ Pembayaran Berhasil Diterima!"* dan mengarahkan pengguna ke halaman invoice resmi.

---

### 3. Matriks Revisi Gelombang 5 & Gelombang 6

1. **Penyempurnaan Gelombang 5 (Mobile Capacitor & Payment Bridge):**
   - Menggantikan seluruh ketergantungan `duitkuMobile.ts` di `kaos-kami-mobile` dengan `ipaymuMobile.ts`.
   - Mengintegrasikan Direct QRIS Sheet di dalam aplikasi mobile native sehingga pengguna mobile dapat langsung menyimpan gambar QRIS ke galeri HP via `@capacitor/filesystem` atau screenshot.
2. **Eksekusi Gelombang 6 (Tuntas Direct QRIS Web, In-App Modal & Quality Gates):**
   - Pembersihan script Duitku di web.
   - Pemasangan Modal Direct QRIS In-App di `CheckoutModal.tsx` dan `orders/[id]/page.tsx`.
   - Sinkronisasi endpoint `/api/orders/[id]/repay`.
   - Pengujian end-to-end webhook iPaymu secara lokal.

---

*Dokumen ini adalah SSOT Resmi Desain Kaos Kami yang disimpan di `Blueprint/BLUEPRINT-AUDIT-UIUX-REDESIGN-DASHBOARD.md`. Setiap baris kode antarmuka yang akan dibuat wajib mematuhi panduan di atas tanpa pengurangan data.*

---

## 56. 📜 AMANDEMEN RESMI OWNER (05 OKT 2026) — KEPUTUSAN DISKUSI 4 BLOK

Hasil diskusi owner + audit 6 agen (skor literal 59.3% → 70.5%). Amandemen ini **bagian sah blueprint**; audit berikutnya wajib menilainya sebagai spec.

### A1. Item keyboard review `j/k/a/r` DICORET dari roadmap (Blok 1)
* UI `/admin/review` telah dihapus sah (Bab 47: "100% fiktif / ghost code"); approval berjalan via `/admin/orders`.
* Shortcut tanpa rumah = tuntutan batal. Item keyboard Fase 3.1 dinyatakan **tidak berlaku**.

### A2. Rewrite laser SVG + checkout 2-langkah DISETUJUI & DIKERJAKAN (Blok 2)
* **Laser:** ganti `<Html>` Drei dengan SVG overlay proyeksi `vector.project(camera)` penuh (bukan hybrid). Alasan: membunuh blur sub-piksel + lag 1-frame sampai ke akar. Wajib: feature-flag + uji 5 sudut kamera.
* **Checkout:** padatkan 4 → 2 tahap (Alamat+kurir, Bayar) + rampingkan `AuthModal`. Wajib: 1 transaksi sandbox penuh + Wave7 hijau sebelum sentuh produksi.

### A3. Adaptasi sadar DISAHKAN sebagai pengganti angka spec (Blok 3)
* Token `--color-*` menggantikan `--surface-0..3`; spring via token CSS `out-expo` (bukan `springTransition` framer-motion); drag chat custom (bukan `motion.div`); snap sheet 70/30; FAB 48px; stepper 6 tahap; modal `560px`; warna A11Y `#121214`/`#FF7A1A`.
* Bab 2/11/13/17 berstatus **referensi desain resmi** (tak wajib implementasi literal); 9 path target basi dipetakan ke file aktual.

### A4. Verifikasi owner (Blok 4, tak terwakilkan)
* Wave7 live, 5 langkah visual, apply `scratch/migrasi-ipaymu-default.sql`, push/deploy — hanya sah oleh owner.
```

### A5. Pengesahan adaptasi struktural (05 OKT 2026) — kartu-hub, rute mandiri, stepper, auth, snap, z-index popover

Amandemen ini **bagian sah blueprint**; audit berikutnya wajib menilainya sebagai spec. Prinsip: adaptasi di bawah ini SAH apa adanya — **DILARANG merge rute, DILARANG hapus/pindah halaman, DILARANG ubah kode** dalam rangka amandemen ini (putusan tertulis saja).

### A5-a. Kartu-hub settings SAH sebagai pengganti sub-tab
* `kaos-kami-web/src/app/admin/settings/page.tsx` adalah hub kartu (`MODULE_CARDS`, 8 kartu): `/admin/orders` (Pesanan), `/admin/gang-sheet` (Produksi), `/admin/catalog` (Inventaris), `/admin/coupons` (Pemasaran), `/admin/shipping` (Logistik), `/admin/cms` (Tampilan), `/admin/customers` (Akun & PDP), `/admin/laporan` (Analitik).
* 8 rute mandiri tetap hidup sebagai file `page.tsx` masing-masing; navigasi antar-modul via kartu hub + tautan "Kembali ke Ikhtisar" (`/admin`). Tidak ada tuntutan sub-tab di dalam `/admin/settings`; tuntutan sub-tab dinyatakan **batal**.

### A5-b. `/admin/orders` mandiri SAH (tak perlu ditanam ke `/admin`)
* `kaos-kami-web/src/app/admin/orders/page.tsx` (+ `[id]/page.tsx`, `[id]/job-ticket`, `[id]/gang-sheet`) tetap rute mandiri; `/admin/page.tsx` tetap ikhtisar (kokpit + kartu Antrean `ProductionTask`), bukan wadah tanam orders. Tidak ada iframe/embed orders ke dalam `/admin`; tuntutan penanaman dinyatakan **batal**.

### A5-c. Stepper UI 6 label SAH dipetakan ke status mesin (`CustomerDashboardView` → `machine.ts`)
* Sumber UI: `kaos-kami-web/src/components/commerce/CustomerDashboardView.tsx:120-161` (`ORDER_STEPS` + `getStepIndex`). Sumber mesin: `kaos-kami-web/src/lib/orders/machine.ts:15-29` (`ORDER_STATUSES`, 13 status kanonis) + `ADMIN_CHAIN`/`ORDER_TRANSITIONS`.
* Tabel pemetaan sah (lipat maju, mesin tetap otoritatif via `assertTransition`):

| UI stepper (6 label) | Status mesin yang dilipat (`getStepIndex`) | Catatan |
|---|---|---|
| UI[0] Dipesan | `PENDING_PAYMENT` | Langkah 0 |
| UI[1] Lunas | `PAYMENT_CONFIRMED` + `IN_PRODUCTION_QUEUE` | Langkah 1 |
| UI[2] Cetak DTF | `PRINTING` + `PRESSING` | `PRESSING` = lipatan defensif (stage produksi/legacy, tidak ada di `ORDER_STATUSES`); tidak merusak |
| UI[3] Quality Check | `QUALITY_CHECK` + `PACKAGING` | `PACKAGING` = lipatan defensif (sama seperti di atas); tidak merusak |
| UI[4] Siap / Dikirim | `READY_TO_SHIP` + `SHIPPED` + `DELIVERED` | Langkah 4 |
| UI[5] Selesai | `COMPLETED` | Langkah 5 |
| (di luar stepper — badge terpisah) | `DESIGN_REVIEW`, `CANCELLED`, `REFUNDED`, `REJECTED`, status tak dikenal → `-1` (netral, bukan default "Lunas") | Sah; `CANCELLED/REFUNDED/COMPLETED/REJECTED` terminal di mesin (`isTerminalStatus`) |

### A5-d. Auth eksklusif tutup-dulu-baru-buka SAH (tuntutan inline-auth dibatalkan)
* `kaos-kami-web/src/components/ui/CheckoutModal.tsx:550-563` (+ `CheckoutModalLegacy.tsx:487,1584`): bila `isAuthModalOpen`, checkout disembunyikan dulu lalu `AuthModal` tampil SENDIRI via satu portal (`createPortal(..., document.body)`); larang modal-di-atas-modal (Bab 37.2 + Bab 41). Tuntutan inline-auth (form login ditumpuk di dalam checkout) dinyatakan **batal**.

### A5-e. Snap sheet 70/30 SAH (tuntutan 12/48/88 dibatalkan)
* `kaos-kami-web/src/components/ui/BottomSheet.tsx:63-65`: `peek → translate-y-[70%]`, `half → translate-y-[30%]`, `full → translate-y-0` (ambang drag 60px). Skema tinggi 12/48/88 dvh dari Bab 54/§G dinyatakan **batal** sebagai angka literal; 70/30 adalah adaptasi sadar yang sah (status referensi desain resmi per A3, tak wajib literal).

### A5-f. 🟡 Putusan mismatch popover z-50-vs-70 (putusan dokumen SAJA — kode JANGAN diubah)
* Fakta: `kaos-kami-web/src/lib/zIndex.ts:42` menetapkan numerik `Z_POPOVER = 70` (komentar L6 baris 18-19: POPOVER/AUTH/CONFIRM = 70) tetapi `Z_CLASS_POPOVER = "z-50"` (baris 58) — tidak cocok dengan `Z_CLASS_AUTH/CONFIRM = "z-[70]"` (baris 56-57).
* **PUTUSAN SAH: samakan class ke `z-[70]` agar cocok dengan numerik 70** (satu nilai untuk seluruh lapis L6: auth/confirm/popover/dropdown/`UserNotificationBell`). Eksekusi kode DITUNDA — amandemen ini hanya mengesahkan putusan tertulis; perubahan `zIndex.ts:58` dilakukan pada giliran kode tersendiri atas perintah owner, bukan sekarang.
* 🟡 Satu-satunya temuan kuning amandemen ini (inkonsistensi nyata, belum merusak visual karena popover saat ini masih di bawah cart/modal sesuai perilaku eksisting; risiko hanya bila popover dibuka di atas `AuthModal`/cart).
