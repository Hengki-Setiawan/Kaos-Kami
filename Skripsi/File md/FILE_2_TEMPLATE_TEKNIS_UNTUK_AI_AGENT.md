# TEMPLATE ISIAN TEKNIS UNTUK AI AGENT (Kaos-Kami Repo)
### Tujuan: mengisi 12 bagian teknis pada draf Proposal Skripsi Bab I–III (FILE 1) berdasarkan pemeriksaan langsung ke source code & aplikasi live

---

## INSTRUKSI UMUM UNTUK AI AGENT (baca dulu sebelum mengerjakan)

Kamu sedang membantu menyusun bagian **teknis** dari Proposal Skripsi Bab I–III milik Hengki Setiawan, mahasiswa Program Studi Bisnis Digital, Universitas Negeri Makassar, dengan judul **"Rancang Bangun E-Commerce Berbasis 3D Interactive Mockup untuk Optimalisasi Pemesanan UMKM Kaos Kami"**. Objek yang dijelaskan adalah aplikasi **Kaos-Kami** (repo ini), yang juga live di **https://kaoskami.biz.id**.

Ikuti aturan berikut dengan ketat:

1. **Periksa source code sungguhan** (folder `src/`, `public/models/`, `Blueprint/`, `package.json`, `next.config.mjs`, `.env.example`, dsb.) sebelum menjawab. Jangan menjawab hanya berdasarkan nama file atau asumsi.
2. **Jangan mengarang (hallucinate).** Jika sebuah detail tidak dapat kamu pastikan dari kode/dokumentasi yang ada (misalnya backend/API yang dipakai, database yang dipakai, dsb.), tulis dengan jelas: `> ⚠️ TIDAK DAPAT DIPASTIKAN DARI KODE — perlu dikonfirmasi manual oleh penulis.` Jangan menebak angka atau nama teknologi yang tidak ada buktinya di kode.
3. **Tulis semua jawaban dalam Bahasa Indonesia baku/akademik**, gaya deskriptif seperti laporan teknis skripsi (bukan gaya dokumentasi developer/README yang santai), karena hasilnya akan ditempel langsung ke naskah skripsi formal.
4. **Jangan mengubah, menghapus, atau mengganti nama tag** `[[ISI:KODE-TAG]]` di bawah — biarkan setiap tag sebagai judul bagian jawabanmu, agar penulis bisa mencari dan menyalin (copy-paste) jawabanmu ke FILE 1 dengan mudah menggunakan fitur *Find & Replace*.
5. Untuk setiap tag, tulis jawabanmu **tepat di bawah instruksinya**, pada bagian yang bertulisan **"✍️ JAWABAN AI AGENT:"**. Jangan menghapus instruksi di atasnya (biarkan untuk jejak/riwayat), cukup isi bagian jawabannya saja.
6. Jika suatu tag muncul lebih dari satu kali di FILE 1 (lihat catatan "muncul di:" pada tiap tag), buat jawabanmu **umum/lengkap** sehingga cocok ditempel di semua lokasi tersebut — atau, jika perlu versi berbeda per lokasi, beri sub-label jelas (misalnya "Versi untuk Latar Belakang (ringkas)" dan "Versi untuk Spesifikasi Produk (rinci/berpoin)").
7. Angka, nama library, dan versi **harus dikutip persis** dari `package.json`/kode — jangan dibulatkan atau ditebak.
8. Setelah selesai mengisi seluruh tag, tambahkan di paling bawah file ini sebuah bagian **"CATATAN TAMBAHAN AGENT"** berisi hal-hal penting yang kamu temukan di kode tapi tidak tertampung oleh 12 tag di atas, yang sebaiknya diketahui penulis skripsi.

---

## `[[ISI:BAB1-SPESIFIKASI-PRODUK]]`
**Muncul di:** (a) penutup Latar Belakang Bab I.A, (b) daftar rinci Bab I.D "Spesifikasi Produk yang Diharapkan".

**Tugas:** Buat DUA versi teks:

- **Versi ringkas (2–4 kalimat)** untuk penutup Latar Belakang — menyebutkan bahwa produk sudah live di kaoskami.biz.id, dibangun dengan Next.js + React Three Fiber/Three.js, dan menyebut 3–4 fitur inti secara sepintas sebagai jembatan ke Bab I.D.
- **Versi rinci (poin-poin)** untuk Bab I.D — daftar spesifikasi teknis final produk, minimal mencakup:
  1. Format model 3D yang dipakai (cek folder `public/models/` dan kode yang memuatnya — apakah pakai `.glb` terkompresi Draco seperti disebut README, atau mesh prosedural bawaan/fallback, atau keduanya, dan kapan masing-masing dipakai).
  2. Mekanisme fallback bila perangkat/browser tidak mendukung WebGL (cek komponen `StaticShowcase.tsx` yang disebut README — jelaskan cara kerjanya, apa yang ditampilkan sebagai pengganti scene 3D).
  3. Dukungan `prefers-reduced-motion` (aksesibilitas) — jelaskan efeknya terhadap animasi scroll dan animasi 3D.
  4. Ketersediaan aplikasi Android (APK) — cek apakah benar berbasis Capacitor (link `.apk` ada di homepage), termasuk bagaimana instalasinya di sisi pengguna (sideload biasa/tidak lewat Play Store), dan apakah ada perbedaan fitur antara versi web dan versi APK.
  5. Metode pembayaran yang didukung — konfirmasi ulang ke kode/`.env.example` apakah benar terintegrasi **Duitku** (QRIS, VA Mandiri/BCA/BNI/BRI/Permata, e-wallet sesuai teks di homepage), atau ada metode lain di kode yang belum tersebut di homepage.
  6. Ukuran/batas berkas desain yang boleh diunggah pengguna (format gambar apa saja yang diterima — PNG saja atau termasuk JPG/SVG, ada batas ukuran file/resolusi tidak).
  7. Ketersediaan versi bahasa (hanya Bahasa Indonesia, atau ada opsi bahasa lain).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB1-DEFINISI-ISTILAH-TEKNIS]]`
**Muncul di:** tabel Definisi Istilah/Operasional Bab I.G (baris tambahan).

**Tugas:** Buat baris tambahan tabel markdown (format sama seperti tabel di atasnya: `| Istilah | Definisi Operasional |`) untuk 6–10 istilah teknis yang benar-benar dipakai di kode/README, misalnya (sesuaikan dengan yang benar-benar ada, jangan sertakan yang tidak dipakai):

- React Three Fiber
- Three.js
- GLB / Draco Compression
- Decal (tekstur tempel desain pada model 3D)
- WebGL Fallback
- Zustand (state management)
- GSAP ScrollTrigger / Lenis (smooth scroll)
- OKLCH color space
- Capacitor (APK Android)
- Duitku Payment Gateway

Definisi harus ditulis **untuk pembaca awam bisnis digital** (bukan penjelasan teknis mendalam ala dokumentasi library), fokus ke "apa fungsinya dalam sistem ini" bukan "cara kerja internal library-nya".

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB2-TEKNOLOGI-3D-YANG-DIGUNAKAN]]`
**Muncul di:** akhir sub-bab Bab II.A.4 "Visualisasi Produk 3D dan Teknologi Web3D" (paragraf tambahan setelah paragraf yang membandingkan dengan X3DOM/WebGL-GLSL).

**Tugas:** Tulis 1–2 paragraf akademik yang menjelaskan **secara lebih teknis namun tetap naratif** (bukan bullet point) implementasi 3D pada aplikasi ini, mencakup:
- Bagaimana model 3D di-render (procedural mesh vs GLB), dan bagaimana tekstur kain/normal map dibuat secara dinamis (README menyebut "dynamic micro-weave canvas normal maps" — jelaskan maksudnya dalam bahasa yang bisa dipahami pembaca non-programmer: bagaimana efek tekstur kain dihasilkan tanpa file gambar tekstur statis).
- Bagaimana desain yang diunggah pengguna ditempelkan ke model 3D ("dynamic wordmark decal rendering") — jelaskan konsep *decal* secara sederhana.
- Sebutkan bahwa pendekatan ini tetap berjalan di atas WebGL milik browser (sama seperti fondasi teknologi yang dibahas Hamzaturrazak dkk., 2024), namun diorkestrasi lewat React sehingga labih mudah dipadukan dengan komponen e-commerce lain.
- Jika kamu menemukan bukti optimasi performa di kode (mis. "memory-safe VRAM disposal" yang disebut README) — jelaskan secara sederhana mengapa itu penting (mencegah aplikasi lambat/crash saat pengguna berkali-kali ganti desain).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB2-TABEL-PERBANDINGAN-FITUR]]`
**Muncul di:** akhir sub-bab "Posisi dan Kebaruan Penelitian (Research Gap)" Bab II.B.

**Tugas:** Buat **tabel markdown perbandingan fitur** antara (kolom): (1) Luthfi & Asmunin (FabricJS, 2D canvas), (2) Hananto dkk. 2024 (X3DOM, konkatenasi elemen 3D), (3) Surahman dkk. 2020 (3D Warehouse/SketchUp embed), dan (4) **Kaos Kami (penelitian ini)**. Baris-baris pembanding minimal:

- Dimensi visualisasi (2D / 3D)
- Teknologi rendering
- Kustomisasi real-time (ya/tidak, dan jenis kustomisasi apa: teks, gambar, warna, ukuran)
- Navigasi 360°
- Integrasi checkout/pembayaran dalam satu alur
- Ketersediaan versi mobile/APK
- Fallback non-WebGL
- Status implementasi (konsep/prototipe akademik vs live production)

Isi kolom "Kaos Kami" **wajib berbasis fakta dari kode/website**, isi kolom lain berbasis ringkasan jurnal yang sudah ada di FILE 1 (jangan mengarang detail teknis jurnal lain yang tidak disebutkan di jurnal aslinya — cukup pakai apa yang sudah dirangkum di FILE 1 Bab II.B).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-ARSITEKTUR-SISTEM]]`
**Muncul di:** Bab III.B.3 "Desain Produk".

**Tugas:** Jelaskan arsitektur sistem secara naratif (boleh dilengkapi diagram teks sederhana seperti contoh di FILE 1 bagian lain), mencakup:

1. **Front-end:** Next.js 14 (App Router) — sebutkan versi React yang dipakai (cek `package.json`), struktur routing App Router yang dipakai (folder `src/app/...`), rendering strategy (Server Components vs Client Components — cek apakah halaman Studio 3D pakai `"use client"`).
2. **Lapisan 3D:** React Three Fiber + Three.js sebagai renderer, dijalankan di sisi client (browser) memakai WebGL.
3. **State management:** Zustand — jelaskan state apa saja yang dikelola (mis. state desain kustomisasi: warna, ukuran, posisi desain, keranjang belanja) — cek folder store/state di `src/`.
4. **Backend/API:** `⚠️ WAJIB DIPERIKSA LANGSUNG KE KODE` — apakah ada API routes Next.js (`src/app/api/...`), apakah terhubung ke database eksternal (mis. Supabase/Firebase/PostgreSQL) atau backend terpisah, atau apakah sebagian data (katalog produk) masih berupa data statis (hardcoded JSON/TS) di dalam kode. **Jangan menebak** — kalau tidak ditemukan bukti backend/DB di kode, tulis dengan jelas bahwa katalog & data produk saat ini bersifat statis di sisi front-end, dan sebutkan implikasinya untuk penelitian (mis. jadi bagian "keterbatasan").
5. **Pembayaran:** Bagaimana alur pemanggilan Duitku dilakukan (client-side redirect / server action / API route) — cek `.env.example` untuk nama variabel (mis. `DUITKU_*`) sebagai petunjuk.
6. **Hosting/Deployment:** platform hosting yang dipakai untuk domain kaoskami.biz.id bila dapat dipastikan dari konfigurasi repo (mis. `next.config.mjs`, file konfigurasi Vercel/Netlify/Docker jika ada).
7. **Distribusi mobile:** Capacitor untuk membungkus web app menjadi APK Android — cek apakah ada folder `android/` atau file konfigurasi Capacitor (`capacitor.config.ts`).

Sertakan diagram teks sederhana seperti ini (isi sesuai temuan asli, hapus baris yang tidak relevan):

```
[Browser Pengguna / APK Android]
        |
   [Next.js App Router - Frontend + (API Routes jika ada)]
        |
   +----+----------------------+
   |                           |
[React Three Fiber/Three.js]  [Zustand State: desain, warna, ukuran, cart]
   |                           |
[WebGL Renderer di Browser]   [Duitku Payment Gateway - API/Redirect]
```

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-STRUKTUR-DATA]]`
**Muncul di:** Bab III.B.3 "Desain Produk" (setelah arsitektur sistem).

**Tugas:** Jelaskan struktur/model data yang dipakai sistem (bukan skema SQL formal kalau memang tidak ada database — cukup jelaskan bentuk data). Cek `src/` untuk `types/`, `interfaces`, atau file data produk. Minimal jelaskan entitas berikut (sesuaikan nama field dengan yang benar-benar ada di kode, JANGAN mengarang nama field):

1. **Produk** — field apa saja (nama, harga, kategori, gambar, apakah punya varian model 3D sendiri, dst).
2. **Varian/Opsi Kustomisasi** — warna, ukuran, jenis bahan, posisi desain, dsb.
3. **Desain/Decal yang diunggah pengguna** — bagaimana file disimpan sementara (di memori browser saja / diunggah ke server / storage eksternal).
4. **Keranjang/Pesanan** — field yang menyusun satu item pesanan (produk + kustomisasi + qty + harga).
5. **Pengguna (jika ada sistem login/akun)** — cek apakah ada fitur autentikasi sungguhan atau baru rencana/placeholder ("MASUK" di navbar) — jelaskan status sebenarnya.

Sajikan dalam bentuk tabel per entitas: `| Field | Tipe (perkiraan dari kode) | Keterangan |`.

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-PETA-SITUS-DAN-FITUR]]`
**Muncul di:** Bab III.B.3 "Desain Produk" (setelah struktur data).

**Tugas:** Buat **tabel peta situs (sitemap) lengkap** dengan menelusuri folder `src/app/` (setiap sub-folder dengan `page.tsx`/`page.jsx` adalah satu route). Verifikasi ulang route yang sudah diketahui dari homepage (`/`, `/catalog`, `/studio`, `/track`, `/kalkulator-sablon`, `/privacy`, `/kredit`) dan **tambahkan route lain yang ternyata ada di kode tapi belum ketahuan dari homepage** (misalnya halaman login/akun, halaman checkout, halaman detail produk `/catalog/[slug]`, halaman admin, dsb.).

Format tabel:

| Route (URL) | Nama Halaman | Fungsi Utama | Client/Server Component |
|---|---|---|---|

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-ALUR-KUSTOMISASI-3D]]`
**Muncul di:** Bab III.B.3 "Desain Produk" (setelah peta situs).

**Tugas:** Telusuri komponen yang menyusun halaman `/studio` (Studio 3D) dan tuliskan **alur langkah-demi-langkah** yang benar-benar dialami pengguna, dari membuka halaman sampai selesai kustomisasi (tidak perlu sampai checkout, itu beda alur). Sertakan nama komponen React yang relevan (untuk referensi teknis penulis, boleh ditulis dalam tanda kurung). Contoh format yang diharapkan (isi ulang sesuai temuan nyata, jangan pakai contoh ini apa adanya):

```
1. Pengguna membuka /studio -> sistem memuat scene 3D (model dasar kaos/hoodie/crewneck default)
2. Pengguna memilih jenis produk dasar (komponen: ...)
3. Pengguna memilih warna/colorway (komponen: ...)
4. Pengguna mengunggah gambar desain (format apa saja yang diterima; komponen: ...)
5. Sistem menempelkan desain sebagai decal pada permukaan model 3D secara real-time
6. Pengguna dapat menggeser/mengatur skala & posisi desain (jelaskan mekanismenya - drag, slider, dsb.)
7. Pengguna memilih ukuran (S/M/L/XL dst.)
8. Pengguna memutar model 3D 360 derajat untuk memeriksa hasil (OrbitControls / continuous spin)
9. Pengguna menambahkan ke keranjang / lanjut checkout
```

Juga jelaskan: apakah desain bisa ditempatkan di lebih dari satu sisi (depan & belakang, seperti disebut beberapa jurnal acuan), dan apakah ada validasi otomatis terhadap kualitas/resolusi gambar yang diunggah (mis. peringatan bila resolusi terlalu rendah untuk dicetak) — ini penting karena berkaitan langsung dengan masalah "kurangnya pengetahuan pelanggan akan resolusi gambar" yang disebut di Bab I (Luthfi & Asmunin, dan jurnal Hananto).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-SPESIFIKASI-KEBUTUHAN-SISTEM]]`
**Muncul di:** Bab III.B.6 "Pengembangan Produk Awal (Uji Coba Produk Tahap I)".

**Tugas:** Buat tabel spesifikasi kebutuhan sistem, dua bagian:

**(a) Kebutuhan Pengembangan** (untuk developer): versi Node.js yang disarankan (cek `package.json` -> `engines`, atau `.nvmrc` jika ada), package manager (npm/pnpm/yarn — cek lockfile), daftar dependensi utama beserta versinya (Next.js, React, Three.js, @react-three/fiber, @react-three/drei bila dipakai, GSAP, Lenis, Zustand, Tailwind, TypeScript) — **kutip versi persis dari `package.json`**.

**(b) Kebutuhan Pengguna Akhir** (untuk end-user mengakses situs): spesifikasi minimum perangkat/browser (dukungan WebGL, resolusi layar disarankan, kecepatan internet disarankan untuk memuat aset 3D), serta kebutuhan khusus untuk instalasi APK Android (versi Android minimum jika Capacitor mensyaratkan, izin/permission yang diminta APK).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-PROSES-PENGEMBANGAN-PRODUK-AWAL]]`
**Muncul di:** akhir Bab III.A "Model Penelitian dan Pengembangan".

**Tugas:** Tulis 1 paragraf naratif yang menjelaskan **proses/tahapan pengembangan produk yang benar-benar terjadi** (bukan tahapan ideal versi textbook), misalnya urutan fitur yang dibangun lebih dulu vs belakangan, keputusan desain penting yang diambil selama proses (misalnya kenapa dipilih mesh prosedural sebagai fallback ketimbang mewajibkan file GLB, kenapa dipilih React Three Fiber dibanding Three.js murni atau X3DOM). Jika riwayat commit Git di repo **hanya menunjukkan 1 commit** (artinya riwayat iterasi tidak tersimpan/di-squash), **jangan mengarang riwayat iterasi palsu**. Sebagai gantinya:
- Jelaskan proses pengembangan berdasarkan **struktur akhir kode saat ini** (mis. "arsitektur akhir menunjukkan pemisahan yang jelas antara komponen 3D interaktif, komponen fallback statis, dan komponen antarmuka e-commerce, yang mengindikasikan pengembangan dilakukan secara bertahap per-modul").
- Jika penulis (Hengki) mengingat urutan pengembangan sesungguhnya (mis. fitur mana yang dibangun duluan), catat di sini sebagai `> ⚠️ PERLU DIISI MANUAL OLEH PENULIS BERDASARKAN INGATAN/CATATAN PRIBADI, bukan dari histori Git.`

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-INSTRUMEN-KISI-KISI]]`
**Muncul di:** akhir Bab III.C.4 "Instrumen Pengumpulan Data" (melengkapi draf kisi-kisi yang sudah ada).

**Tugas:** Berdasarkan **daftar fitur nyata** yang sudah kamu identifikasi di tag-tag sebelumnya (terutama `BAB3-PETA-SITUS-DAN-FITUR` dan `BAB3-ALUR-KUSTOMISASI-3D`), tulis **butir-butir pernyataan angket** (gaya pernyataan positif, dijawab dengan skala 1–5 Sangat Tidak Setuju s.d. Sangat Setuju, meniru gaya instrumen Hananto dkk. 2021/2024) untuk DUA angket berikut:

**(a) Angket Validasi Ahli Media/Sistem** (10–15 pernyataan) — mencakup kelayakan teknis: kelancaran rendering 3D, ketepatan decal, navigasi orbit, responsivitas di perangkat mobile, kejelasan checkout, keamanan pembayaran, dsb.

**(b) Angket Uji Coba Pemakaian oleh Pengguna/Pengunjung** (15–20 pernyataan) — mencakup pengalaman pengguna nyata: kemudahan mengakses Studio 3D, kepuasan terhadap hasil pratinjau desain, kepercayaan terhadap hasil akhir produk, kemudahan checkout & pembayaran, kemudahan pelacakan pesanan, kepuasan dibanding pengalaman belanja kaos custom sebelumnya (via WhatsApp/marketplace).

Setiap pernyataan harus **spesifik terhadap fitur yang benar-benar ada** (jangan menulis pernyataan generik tentang fitur yang tidak ada di aplikasi ini, mis. jangan sebut "chat langsung dengan penjual" kalau fitur itu tidak ada).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## `[[ISI:BAB3-RENCANA-UJI-TEKNIS]]`
**Muncul di:** (a) Bab I.F.2.c "Keterbatasan Penelitian", (b) Bab III.B.6 "Pengembangan Produk Awal".

**Tugas:** Buat DUA versi:

- **Versi untuk Bab I (Keterbatasan, 2–3 kalimat):** Sebutkan keterbatasan teknis riil yang sudah/berpotensi ditemukan (mis. batas jumlah komponen 3D yang bisa ditampilkan bersamaan, ukuran berkas model 3D yang mempengaruhi waktu muat, ketergantungan pada dukungan WebGL perangkat, kendala performa pada ponsel kelas bawah — kalau kamu tidak punya data pengujian performa asli, cukup sebutkan sebagai **potensi keterbatasan yang akan diuji**, bukan klaim hasil pengujian yang belum dilakukan).
- **Versi untuk Bab III (Rencana Uji Teknis, poin-poin):** buat rencana pengujian teknis yang akan dilakukan penulis pada tahap Uji Coba Produk, meniru struktur Tabel II Hananto dkk. (2021) "Informasi Sistem yang Digunakan untuk Mengakses Prototipe" dan pengukuran performa Hamzaturrazak dkk. (2024). Minimal cakup:
  1. Tabel pengujian kompatibilitas: kombinasi Browser (Chrome, Firefox, Edge, Safari) × Platform (Windows/macOS/Linux/Android/iOS) × hasil tampil (berhasil/gagal) untuk konten 2D dan konten 3D — kosongkan kolom hasil (akan diisi penulis saat pengujian sungguhan berlangsung).
  2. Rencana pengujian waktu muat (loading time) model 3D pada koneksi internet berbeda (4G vs WiFi).
  3. Rencana pengujian APK Android pada minimal 2 perangkat berbeda kelas (low-end vs mid/high-end).

✍️ **JAWABAN AI AGENT:**
`[isi di sini oleh agent]`

---

## CATATAN TAMBAHAN AGENT
*(diisi oleh AI agent di akhir — hal penting yang ditemukan di kode tapi belum tertampung 12 tag di atas: mis. fitur tersembunyi, TODO/FIXME penting di kode, ketidaksesuaian antara README dan kode aktual, dependensi yang sudah usang, dsb.)*

`[isi di sini oleh agent]`

---

## CARA MENGGABUNGKAN KEMBALI KE FILE 1 (untuk penulis, bukan untuk agent)

1. Setelah semua bagian ✍️ di atas terisi oleh AI agent, buka FILE 1 (`FILE_1_PROPOSAL_BAB_1-3.md`) dan FILE 2 ini berdampingan.
2. Untuk setiap tag `[[ISI:KODE-TAG]]` di FILE 1, cari heading yang sama persis di FILE 2, salin isi jawaban di bawah "✍️ JAWABAN AI AGENT", lalu **timpa/ganti** baris tag tersebut di FILE 1 dengan jawaban itu (gunakan Find & Replace di Word/Google Docs/editor teks — cari `[[ISI:BAB1-SPESIFIKASI-PRODUK]]`, dst., satu per satu).
3. Setelah semua 12 tag diganti, baca ulang seluruh naskah FILE 1 dari atas ke bawah. Tambahkan kalimat penghubung bila ada bagian yang terasa "patah" setelah disisipi teks baru.
4. Hapus seluruh blok "CATATAN PENGGUNAAN FILE INI" di paling atas FILE 1 beserta semua teks *italic* berisi instruksi/petunjuk (yang diapit tanda `*(...)*`), karena itu bukan bagian dari naskah skripsi.
5. Pindahkan isi ke template resmi (Word) sesuai format dari prodi/pembimbing (font, margin, spasi, halaman sampul, dst.), lalu konsultasikan ke dosen pembimbing sebelum mendaftar seminar proposal.

