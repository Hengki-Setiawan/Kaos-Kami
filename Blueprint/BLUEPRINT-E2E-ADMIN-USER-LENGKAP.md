# BLUEPRINT AUDIT & PENGUJIAN END-TO-END (E2E) LENGKAP — MASTER SUITE 257 SKENARIO
## Sistem E-Commerce Apparel 3D Interaktif, Sablon DTF, & Live Chat Kamito — Kota Makassar
### Berkas Induk SSOT Pengujian Komprehensif Seluruh Rute, Fitur, Dashboard Admin, Dashboard User, Logika Pemesanan, Checkout, & Integrasi API Eksternal

---

## 1. RINGKASAN EKSEKUTIF & IDENTITAS PENGUJIAN

Dokumen ini merupakan panduan induk operasional dan cetak biru (blueprint) pengujian terlengkap untuk seluruh ekosistem platform **Kaos Kami**. Pengujian dirancang untuk memverifikasi fungsionalitas, ketahanan sistem, keamanan transaksi, dan akurasi logika bisnis dari sudut pandang pembeli (User Journey), pemilik toko / administrator (Admin Journey), staf operator workshop DTF (Production Journey), kurir pengantaran (Logistics Journey), dan mesin sistem terintegrasi (End-to-End Chains).

Pengujian ini mencakup 100% rute aplikasi (halaman publik, studio 3D kustomisasi, dasbor pelanggan, panel administrasi workshop, dan 25 modul API internal/eksternal) dengan total **257 skenario pengujian terintegrasi**.

### 1.1 Profil Identitas Akun Uji Kanonis (Dual-Persona Testing)

Platform Kaos Kami menggunakan Better-Auth yang terhubung langsung dengan Turso Edge SQLite. Untuk pengujian lokal dan audit menyeluruh, akun utama yang digunakan adalah:

| Parameter | Akun Uji Admin Utama | Akun Uji Pelanggan Terverifikasi | Akun Tamu (Guest) |
| :--- | :--- | :--- | :--- |
| **Email** | `hengkishadow@gmail.com` | `hengkivibecoding@gmail.com` | Tanpa Sesi (Anonymous) |
| **User ID di DB** | `mENTVcqg2HGntvKZ89uPrREfwrghvMwL` | `6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn` | `null` / `guest_` prefix |
| **Nama Pengguna** | Hengki Admin | hengki vibecoding1 | Tamu Studio |
| **Role Sistem** | `ADMIN` (Akses Penuh `/admin/*` & `/dashboard/*`) | `CUSTOMER` (Akses `/dashboard/*`) | `GUEST` (Local Storage) |
| **Status WhatsApp**| Terkonfigurasi untuk notifikasi toko | `0895803463032` (Phone Verified: 1) | Belum Terverifikasi |
| **Fokus Pengujian** | Audit katalog, stok, etalase, kanban SPK, approval, live chat | Riwayat belanja, invoice web, simpan desain 3D, chat Kamito | Checkout cepat, konversi guest ke member, ekspor HD |

Akun `hengkishadow@gmail.com` memiliki hak istimewa ganda: dapat bertindak sebagai pelanggan yang merancang pakaian di Studio 3D dan memesan, sekaligus membuka konsol admin di `/admin` untuk memproses verifikasi desain, memperbarui stok, membalas chat pelanggan via konsol Kamito, memvalidasi pembayaran, dan menerbitkan Surat Perintah Kerja (SPK) sablon.

---

## 2. TOPOLOGI SISTEM & AUDIT LAYANAN EKSTERNAL

Platform Kaos Kami beroperasi di atas arsitektur komputasi modern yang menghubungkan antarmuka 3D client-side dengan database edge dan gateway pihak ketiga:

```
[ Browser Klien / HP Pembeli / Konsol Admin ]
        │
        ├─ 1. WebGL Canvas 3D (Three.js / R3F / Drei) — Morfologi S-XXL, Raycaster Senter, Gizmo Rotasi
        ├─ 2. State Management (Zustand: useConfiguratorStore, useCartStore)
        ├─ 3. Komponen Mengambang: Widget Live Chat Kamito & Lonceng Notifikasi Interaktif
        │
        ▼ (HTTPS REST / JSON API)
[ Next.js 15 App Router — Serverless / Edge Worker Engine ]
        │
        ├── A. Database Engine: Turso Edge SQLite via Drizzle ORM (@libsql/client/web)
        │      └── Tabel Utama: User, Session, ProductVariant, Order, OrderItem, Payment, 
        │                       ProductionTask, QcInspection, Coupon, ChatMessage, UserPresence
        │
        ├── B. Object Storage: Cloudflare R2 (S3-Compatible Client)
        │      └── Bucket Folder: /decals/ (Upload User), /masters/ (Gangsheet 300 DPI), /mockups/ (Render 2K)
        │
        ├── C. Payment Gateway: Duitku Sandbox API
        │      ├── Request Payment: POST /api/orders/[id]/request-payment (QRIS, VA BCA/Mandiri/BNI)
        │      └── Webhook Callback: POST /api/webhooks/duitku (Verifikasi Signature MD5)
        │
        ├── D. WhatsApp Notification Gateway: Fonnte API
        │      ├── Kirim OTP Verifikasi Nomor Telepon
        │      └── Notifikasi Pesanan Baru & Resi Pengiriman (Fail-safe: Manual wa.me fallback)
        │
        ├── E. Shipping Rate Engine: AgenWebsite API & Hyperlocal Makassar
        │      ├── Gratis Ongkir Se-Kota Makassar (15 Kecamatan) & Opsi Workshop Pickup KM 10
        │      └── Ekspedisi Nasional (JNE, J&T, SiCepat) dengan fallback tabel ExpeditionZone
        │
        └── F. Bot Protection: Cloudflare Turnstile
               └── Fail-closed token verification pada endpoint Checkout dan OTP
```

### 2.1 Spesifikasi Kontrak Layanan Eksternal

1. **Turso Edge SQLite (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`):**
   - Waktu respons query rata-rata di bawah 35ms.
   - Transaksi database dijalankan menggunakan atomic transaction untuk pemotongan kuantitas stok varian (`stockQty`).
   - Seluruh akses runtime menggunakan Drizzle ORM murni (`@libsql/client/web`) demi kompatibilitas Cloudflare Workers (menghindari blokir WASM/eval Prisma di workerd).
2. **Cloudflare R2 Storage (`R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`):**
   - Egress fee Rp 0 untuk perlindungan margin UMKM.
   - Gambar sablon pengguna dan hasil rendering mockup diarsipkan ke R2 agar kolom database tidak membengkak.
3. **Duitku Sandbox (`DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`):**
   - Algoritma hashing callback: `MD5(merchantCode + amount + merchantOrderId + apiKey)`.
   - Arsitektur pembayaran terpisah (Decoupled Checkout): Pesanan baru masuk ke status `DESIGN_REVIEW`. Tagihan pembayaran baru dibuat setelah desain disetujui admin (`PENDING_PAYMENT`).
   - Waktu kedaluwarsa tagihan pembayaran: 24 jam dengan sweep otomatis via cron job.
   - Proteksi idempotensi callback ganda: respons instan HTTP 200 tanpa duplikasi `ProductionTask`.
4. **Fonnte WhatsApp API (`FONNTE_TOKEN`):**
   - Fail-safe wrapper try/catch: Jika gateway WhatsApp offline atau kehabisan pulsa/kuota, transaksi checkout tetap 100% sukses, disertai tombol manual `wa.me` di halaman faktur web.
5. **Hyperlocal Makassar Shipping:**
   - 15 Kecamatan resmi Kota Makassar: Tamalanrea, Biringkanaya, Panakkukang, Rappocini, Manggala, Ujung Pandang, Makassar, Mariso, Mamajang, Wajo, Bontoala, Tallo, Ujung Tanah, Tamalate, Sangkarrang.

---

## 3. PETA ALUR KERJA UTAMA (USER <-> ADMIN <-> OPERATOR LIFECYCLE)

```
[ FASE 1: PERANCANGAN & KONSULTASI ]
Pelanggan di Studio 3D (/studio) -> Atur Garmen & Sablon -> Chat Kamito jika bingung -> Checkout (/checkout)
                             │
                             ▼
               Status Pesanan: "DESIGN_REVIEW"
(Order tersimpan di DB, stok garmen direservasi sementara, belum ada tagihan bayar)

                             │
[ FASE 2: VERIFIKASI DESAIN & KOMUNIKASI WORKSHOP ]
Admin login hengkishadow -> Buka /admin/review atau /admin/orders
Cek resolusi cetak, letak sablon, batas printhead 30cm -> Hubungi user via /admin/chat jika buram -> Klik "SETUJUI (ACC)"
                             │
                             ▼
               Status Pesanan: "PENDING_PAYMENT"
           (Kolom 'reviewedBy' terisi ID admin hengkishadow)

                             │
[ FASE 3: PEMBAYARAN OLEH PELANGGAN ]
Pelanggan di Dashboard (/dashboard/orders) melihat tombol "BAYAR SEKARANG"
Sistem memanggil POST /api/orders/[id]/request-payment -> Duitku Sandbox QRIS/VA tampil
Pelanggan menyelesaikan pembayaran via simulator sandbox
                             │
                             ▼
             Webhook Duitku Callback (/api/webhooks/duitku)
          Verifikasi Signature MD5 -> Validasi Kecocokan Nominal
                             │
                             ▼
                   Status Pesanan: "PAID"
             Otomatis terbit baris "ProductionTask"

                             │
[ FASE 4: PRODUKSI WORKSHOP & GANG SHEET DTF ]
Admin & Operator di /admin/production & /admin/gang-sheet:
- Menata gang sheet 100x58 cm roll film DTF
- Mengunduh SPK Cetak & Job Ticket 300 DPI
- Operator sablon mencetak transfer film & heat press ke garmen
- Inspeksi QC (/api/qc) memeriksa noda, retis, dan lux cahaya
- Update status: "IN_PRODUCTION" -> "PACKED"

                             │
[ FASE 5: PENGIRIMAN & PENYELESAIAN ]
Pilihan A (Makassar Free Delivery): Tim kurir internal antar ke alamat -> "SHIPPED"
Pilihan B (Workshop Pickup): Pelanggan ambil langsung di workshop KM 10
Pilihan C (Ekspedisi Luar Kota): Admin memasukkan nomor resi JNE/J&T/SiCepat
                             │
                             ▼
                   Status Akhir: "DELIVERED"
```

---

## 4. MATRIKS 257 SKENARIO PENGUJIAN TERINTEGRASI

Berikut adalah rincian pengujian modular dan terintegrasi yang mencakup Sad Path, Edge Case, dan Happy Path di seluruh rute dan fitur:

### Domain A: Dashboard Admin, Manajemen Toko & Katalog (30 Skenario: A-01 s/d A-30)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A-01** | Akses Dashboard Admin tanpa Sesi | Sad Path | `/admin` | Buka jendela anonim lalu akses `/admin` | Dialihkan otomatis ke halaman login (307/401). |
| **A-02** | Akses Dashboard Admin Role Customer | Sad Path | `/admin` | Login customer biasa lalu navigasi ke `/admin` | Akses ditolak (403 Forbidden) fail-closed. |
| **A-03** | Akses Admin Akun `hengkishadow` | Happy Path | `/admin` | Login dengan `hengkishadow@gmail.com` buka `/admin` | Dashboard terbuka sukses, metrik omset dan antrean tampil. |
| **A-04** | Update Stok di MatrixStockGrid | Happy Path | `/admin/catalog` | Ubah stok Kaos Chalk White L dari 35 ke 40 | Nilai `stockQty` di DB menjadi 40, respon 200 OK. |
| **A-05** | Set Stok Varian Menjadi 0 | Edge Case | `/admin/catalog` | Ubah stok Kaos Chalk White XXL menjadi 0 | Di studio dan etalase, tombol XXL berubah menjadi Habis. |
| **A-06** | Penolakan Nilai Stok Negatif | Sad Path | `/api/admin/catalog` | Kirim payload API update stok dengan `stockQty: -5` | Validasi Zod menolak dengan kode 400 Bad Request. |
| **A-07** | Penyesuaian Harga Dasar Produk | Happy Path | `/admin/catalog` | Ubah harga dasar Kaos Combed 24s menjadi Rp 65.000 | Harga di etalase, studio, dan kalkulasi otomatis menyesuaikan. |
| **A-08** | Penambahan Surcharge Ukuran Khusus | Happy Path | `/admin/catalog` | Atur biaya tambahan ukuran XXXL sebesar Rp 20.000 | Studio 3D menampilkan +IDR 20.000 saat XXXL dipilih. |
| **A-09** | Nonaktifkan Varian Tertentu | Happy Path | `/admin/catalog` | Ubah varian Kaos Military Olive S menjadi `isActive: false`| Varian disaring dari picker studio dan API katalog. |
| **A-10** | Upload Gambar Etalase ke R2 | Happy Path | `/admin/catalog` | Unggah foto tampak depan baru via form produk | Berkas terunggah ke Cloudflare R2, URL HTTPS tersimpan. |
| **A-11** | Penolakan File Non-Gambar di R2 | Sad Path | `/api/upload` | Unggah berkas `.exe` atau `.sh` ke form upload | Server menolak dengan validasi tipe MIME (hanya jpg/png/webp). |
| **A-12** | Pencarian Pesanan di Admin Orders | Happy Path | `/admin/orders` | Masukkan nomor pesanan spesifik di kotak pencarian | Tabel hanya memunculkan pesanan yang dicari secara instan. |
| **A-13** | Filter Pesanan Berdasarkan Status | Happy Path | `/admin/orders` | Filter tabel pesanan status `DESIGN_REVIEW` | Hanya pesanan yang butuh verifikasi admin yang tampil. |
| **A-14** | Filter Pesanan Berdasarkan Tanggal | Happy Path | `/admin/orders` | Filter pesanan rentang tanggal 7 hari terakhir | Pesanan di luar rentang tanggal disaring dengan akurat. |
| **A-15** | Verifikasi Desain Pelanggan (ACC) | Happy Path | `/admin/orders` | Klik tombol "SETUJUI DESAIN" pada order review | Status pesanan beralih ke `PENDING_PAYMENT`, `reviewedBy` terisi. |
| **A-16** | Penolakan Desain dengan Alasan | Happy Path | `/admin/review` | Klik tombol "TOLAK" dan pilih alasan resolusi kurang | Status beralih ke `DESIGN_REJECTED`, catatan tampil di user. |
| **A-17** | Manajemen Pelanggan (Role Change) | Happy Path | `/admin/customers`| Ubah role user biasa menjadi `PRODUCTION_STAFF` | Role terupdate di DB, hak akses panel produksi terbuka. |
| **A-18** | Pembuatan Kupon Diskon Baru | Happy Path | `/admin/coupons` | Buat kupon persentase `MAKASSARHEBAT` diskon 15% | Kupon terdaftar di DB, aktif dan dapat digunakan checkout. |
| **A-19** | Penonaktifan Kupon Diskon | Happy Path | `/admin/coupons` | Nonaktifkan kupon diskon yang sedang berjalan | Pengguna tidak dapat lagi menerapkan kode kupon tersebut. |
| **A-20** | Edit Konten Banner CMS Promo | Happy Path | `/admin/cms` | Ubah judul teks banner pengumuman workshop di CMS | Teks banner di beranda publik langsung terupdate realtime. |
| **A-21** | Ekspor Laporan Penjualan CSV | Happy Path | `/admin/laporan` | Klik tombol "EXPORT CSV" transaksi bulan berjalan | Berkas CSV terunduh berisi tanggal, omset, dan metode kirim. |
| **A-22** | Filter Laporan Keuangan per Metode | Happy Path | `/admin/laporan` | Filter omset berdasarkan pembayaran QRIS vs VA | Ringkasan total pendapatan terpilah akurat sesuai gateway. |
| **A-23** | Verifikasi Manual Transfer Tunai | Edge Case | `/admin/orders` | Gunakan fitur manual payment bypass untuk bayar di toko | Status menjadi `PAID`, antrean produksi terbit tanpa Duitku. |
| **A-24** | Pembatalan Pesanan oleh Admin | Edge Case | `/admin/orders` | Batalkan pesanan pelanggan yang belum disablon | Status menjadi `CANCELLED`, stok varian dipulihkan ke DB. |
| **A-25** | Proteksi Modifikasi Order Selesai | Sad Path | `/admin/orders` | Coba ubah status pesanan yang sudah `DELIVERED` | Sistem menolak perubahan retroaktif pada pesanan tuntas. |
| **A-26** | Audit Ketersediaan Variabel Env | Happy Path | `/admin/settings`| Buka tab info sistem pada dashboard admin | Seluruh status gateway (Turso, R2, Duitku, Fonnte) berstatus hijau. |
| **A-27** | Penanganan Paginasi Admin Orders | Happy Path | `/admin/orders` | Navigasikan tabel pesanan dengan data >50 baris | Paginasi halaman kedua termuat cepat tanpa duplikasi data. |
| **A-28** | Tampilan Metrik Omset Harian | Happy Path | `/admin` | Periksa kartu total omset hari ini | Menghitung akumulasi transaksi `PAID` dalam kurun 24 jam. |
| **A-29** | Penguncian Multi-Tab Admin Update | Edge Case | `/admin/catalog` | Dua tab admin mengedit harga produk yang sama berurutan | Nilai akhir mengikuti transaksi commit database terakhir. |
| **A-30** | Penanganan Sesi Admin Kedaluwarsa | Sad Path | `/admin` | Biarkan token sesi habis lalu klik tombol simpan | Sistem mencegat request dan meminta login ulang dengan aman. |

---

### Domain B: Produksi Workshop DTF, Gang Sheet, & Quality Control (25 Skenario: PROD-01 s/d PROD-25)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PROD-01**| Tampilan Kanban Produksi DTF | Happy Path | `/admin/production` | Buka papan antrean produksi sablon | Kolom `QUEUED`, `PRINTING`, `PRESSING`, `QC` terisi kartu tugas. |
| **PROD-02**| Pindah Status Tugas Produksi | Happy Path | `/admin/production` | Geser kartu dari `QUEUED` ke `PRINTING` | Status `ProductionTask` terupdate, waktu mulai cetak tercatat. |
| **PROD-03**| Tampilan Indikator SLA Express | Happy Path | `/admin/production` | Buat pesanan dengan tier Express 24 Jam | Kartu memiliki badge merah berdenyut "PRIORITAS EXPRESS". |
| **PROD-04**| Deteksi Tugas Produksi Overdue | Edge Case | `/admin/production` | Tugas sablon melewati batas 24 jam tanpa update | Sistem memberi peringatan visual keterlambatan produksi. |
| **PROD-05**| Generate SPK Job Ticket 300 DPI | Happy Path | `/admin/production` | Klik tombol "CETAK JOB TICKET" pada salah satu tugas | Lembar SPK muncul memuat dimensi fisik cm, kerah, dan preview. |
| **PROD-06**| Unduh Master Cetak Gang Sheet PNG | Happy Path | `/admin/production` | Klik tombol "UNDUH MASTER CETAK" | PNG transparan 300 DPI terunduh presisi sesuai batas 30 cm. |
| **PROD-07**| Buka Modul Gang Sheet 100x58 cm | Happy Path | `/admin/gang-sheet` | Akses halaman penyusun gang sheet otomatis | Kanvas area cetak 100x58 cm roll DTF termuat rapi. |
| **PROD-08**| Nesting Otomatis Banyak Sablon | Happy Path | `/admin/gang-sheet` | Masukkan 10 artwork sablon berbeda ukuran | Algoritma nesting menata artwork padat efisien hemat bahan. |
| **PROD-09**| Penolakan Artwork Melebihi Lebar Roll | Sad Path | `/admin/gang-sheet` | Coba letakkan artwork dengan lebar 60 cm | Sistem mengunci lebar maksimal pada batas 58 cm roll printable. |
| **PROD-10**| Ekspor File Gang Sheet Siap Cetak | Happy Path | `/admin/gang-sheet` | Klik tombol "EKSPOR GANG SHEET TIFF/PNG" | File resolusi tinggi 300 DPI ter-render untuk mesin printer DTF. |
| **PROD-11**| Antrean Review Desain Pelanggan | Happy Path | `/admin/review` | Buka halaman antrean desain status `DESIGN_REVIEW`| Seluruh desain yang diunggah pelanggan tampil untuk diinspeksi. |
| **PROD-12**| Masking Nomor Telepon Pelanggan (PII)| Happy Path | `/admin/review` | Periksa kolom nomor telepon pembeli di review | Nomor disensor sebagian (contoh: `0895****3032`) demi privasi. |
| **PROD-13**| Review Desain Overdue >24 Jam | Edge Case | `/admin/review` | Desain belum di-ACC lebih dari 24 jam | Badge kuning "OVERDUE 24H" menyala di kartu antrean review. |
| **PROD-14**| Penolakan Desain: Template Resolusi | Happy Path | `/admin/review` | Tolak dengan preset "Resolusi gambar kurang tajam" | Catatan template baku terkirim ke pelanggan tanpa ketik manual. |
| **PROD-15**| Penolakan Desain: Template Melebihi Batas| Happy Path | `/admin/review` | Tolak dengan preset "Posisi sablon melewati batas jahitan" | Notifikasi alasan penolakan spesifik tampil pada akun pelanggan. |
| **PROD-16**| Input Formulir Inspeksi QC Sablon | Happy Path | `/api/qc` | Operator mengunggah foto hasil sablon dan mengisi checklist | Data inspeksi tersimpan di tabel `QcInspection`. |
| **PROD-17**| Pencatatan Sudut Cahaya Grazing QC | Happy Path | `/api/qc` | Operator memilih sudut pencahayaan grazing 30 derajat | Nilai `grazingDeg: 30` tersimpan untuk verifikasi tekstur tinta. |
| **PROD-18**| Pencatatan Defect Cacat Sablon QC | Edge Case | `/api/qc` | Tandai hasil sablon dengan cacat `["NODA", "RETIS"]` | Order ditahan untuk cetak ulang (*re-print*), tidak dikirimkan. |
| **PROD-19**| Kelolosan QC Sablon (Zero Defect) | Happy Path | `/api/qc` | Checklist cacat kosong `[]` (Lolos Uji Standar) | Tugas produksi otomatis melangkah ke tahap `PACKAGING`. |
| **PROD-20**| Audit Katalog Aset 3D Apparel | Happy Path | `/admin/assets` | Periksa daftar model 3D di folder model master | 8 model garmen dan manekin terverifikasi integritas filenya. |
| **PROD-21**| Validasi File GLB Kompresi Draco | Happy Path | `/admin/assets` | Periksa ketersediaan berkas `.draco.glb` | Ukuran file terkompresi <1.5 MB untuk loading cepat di HP pembeli. |
| **PROD-22**| Deteksi Kerusakan Berkas 3D | Sad Path | `/admin/assets` | Simulasikan berkas GLB corrupt di storage | Loader Three.js menangkap error dan mengaktifkan fallback LOD1. |
| **PROD-23**| Penugasan Operator Cetak DTF | Happy Path | `/admin/production` | Tugaskan pesanan tertentu ke staf sablon spesifik | Nama operator tercatat pada SPK dan riwayat pengerjaan. |
| **PROD-24**| Pencatatan Waktu Pengepresan Panas | Happy Path | `/admin/production` | Operator menekan tombol "Selesai Pressing (165°C 15s)" | Timestamp pengerjaan tercatat di `OrderStatusEvent`. |
| **PROD-25**| Cetak Ulang Sablon Rusak (Reprint) | Edge Case | `/admin/production` | Tekan tombol "REPRINT SPK" akibat kain cacat | Terbit nomor SPK baru dengan revisi tanpa membebankan biaya user. |

---

### Domain C: Logistik Pengiriman, Kurir Makassar, & Ekspedisi (20 Skenario: LOG-01 s/d LOG-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG-01** | Buka Hub Logistik Pengiriman | Happy Path | `/admin/deliveries` | Akses hub pengiriman dari bilah navigasi admin | Daftar pesanan siap kirim (`PACKED`) tampil rapi. |
| **LOG-02** | Pengelompokan Rute Kurir Makassar | Happy Path | `/admin/deliveries` | Filter pesanan lokal berdasarkan Kecamatan Panakkukang | Seluruh pesanan di rute yang sama dikelompokkan dalam satu trip. |
| **LOG-03** | Penugasan Kurir Internal Toko | Happy Path | `/admin/deliveries` | Pilih nama kurir toko dan klik "TUGASKAN PENGANTARAN" | Status pesanan menjadi `SHIPPED`, catatan kurir tersimpan. |
| **LOG-04** | Cetak Lembar Manifest Pengantaran | Happy Path | `/admin/deliveries` | Klik tombol "CETAK MANIFEST RUTE" | Dokumen rute jalan tercetak memuat alamat dan nomor kontak penerima. |
| **LOG-05** | Konfirmasi Pengantaran Berhasil | Happy Path | `/admin/deliveries` | Kurir menandai pesanan telah diantar ke tangan pembeli | Status beralih ke `DELIVERED`, pelanggan mendapat notifikasi. |
| **LOG-06** | Penanganan Pengantaran Gagal (Rumah Kosong) | Edge Case | `/admin/deliveries` | Kurir mencatat alasan "Penerima tidak ada di tempat" | Status dicatat gagal antar, dijadwalkan ulang esok hari. |
| **LOG-07** | Input Nomor Resi JNE Luar Kota | Happy Path | `/admin/deliveries` | Masukkan nomor resi ekspedisi JNE `BDG123456789` | Status menjadi `SHIPPED`, tautan lacak resi JNE aktif di user. |
| **LOG-08** | Input Nomor Resi J&T Express | Happy Path | `/admin/deliveries` | Masukkan nomor resi ekspedisi J&T `JX987654321` | Resi tervalidasi dan tersimpan di database pesanan. |
| **LOG-09** | Validasi Format Nomor Resi Kosong | Sad Path | `/admin/deliveries` | Klik tombol simpan resi tanpa mengisi nomor resi | Form memblokir pengiriman dengan pesan "Nomor resi wajib diisi". |
| **LOG-10** | Konfirmasi Pengambilan di Workshop | Happy Path | `/admin/deliveries` | Pelanggan datang ke workshop KM 10 mengambil pesanan | Admin memverifikasi kode pesanan dan menandai `DELIVERED`. |
| **LOG-11** | Buka Tabel Pengaturan Zona Ongkir | Happy Path | `/admin/shipping` | Buka halaman tarif ongkir ekspedisi nasional | Tabel zona kota, kurir, layanan, dan biaya tampil lengkap. |
| **LOG-12** | Tambah Kota Tujuan Pengiriman Baru | Happy Path | `/admin/shipping` | Tambahkan Kota Parepare, kurir J&T REG, biaya Rp 15.000 | Entri baru tersimpan di tabel database `ExpeditionZone`. |
| **LOG-13** | Edit Biaya Ongkir Kota Tertentu | Happy Path | `/admin/shipping` | Ubah biaya kirim Kabupaten Gowa dari Rp 10.000 ke Rp 12.000 | Kalkulator ongkir checkout otomatis menggunakan tarif terbaru. |
| **LOG-14** | Nonaktifkan Layanan Kurir Tertentu | Happy Path | `/admin/shipping` | Nonaktifkan kurir SiCepat untuk destinasi tertentu | Layanan tidak muncul di daftar pilihan kurir pelanggan. |
| **LOG-15** | Integrasi Live Rate AgenWebsite API | Happy Path | `/api/shipping` | Panggil kalkulasi ongkir live untuk tujuan Jakarta | Sistem mengembalikan opsi live kurir dengan estimasi hari sampai. |
| **LOG-16** | Fallback Tabel saat API Ekspedisi Mati | Edge Case | `/api/shipping` | Simulasikan API AgenWebsite mengalami kegagalan koneksi | Sistem otomatis beralih menggunakan tabel flat `ExpeditionZone`. |
| **LOG-17** | Deteksi Alamat Luar Wilayah Layanan | Sad Path | `/api/shipping` | Masukkan alamat tujuan yang tidak dikenali ekspedisi | Sistem menampilkan instruksi untuk menghubungi CS via WhatsApp. |
| **LOG-18** | Perhitungan Berat Garmen Multi-Item | Happy Path | `/api/shipping` | Hitung ongkir 5 Kaos (1 kg) + 2 Hoodie (1.4 kg) = 2.4 kg | Sistem membulatkan ke 3 kg sesuai aturan pembulatan ekspedisi. |
| **LOG-19** | Verifikasi Gratis Ongkir Makassar 15 Kec | Happy Path | `/api/shipping` | Pilih tujuan Kecamatan Rappocini Kota Makassar | Biaya pengiriman terhitung tepat Rp 0 (Gratis Ongkir Lokal). |
| **LOG-20** | Proteksi Nilai Ongkos Kirim Negatif | Sad Path | `/api/shipping` | Kirim payload ongkir manipulatif dengan nilai minus | Server menolak dengan validasi angka non-negatif (`cost >= 0`). |

---

### Domain D: Dashboard User, Profil, & Manajemen Pesanan (25 Skenario: U-01 s/d U-25)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **U-01** | Akses Dashboard Pesanan saat Login | Happy Path | `/dashboard/orders` | Login dengan akun pelanggan lalu buka dashboard | Daftar pesanan aktif dan riwayat transaksi tampil rapi. |
| **U-02** | Akses Dashboard saat Belum Login | Sad Path | `/dashboard/orders` | Akses URL dashboard tanpa sesi login | Pengguna otomatis dialihkan ke halaman `/track?needLogin=1`. |
| **U-03** | Filter Tab: Pesanan Aktif Saja | Happy Path | `/dashboard/orders` | Klik filter "AKTIF" pada daftar pesanan | Hanya pesanan yang dalam proses pengerjaan yang ditampilkan. |
| **U-04** | Filter Tab: Pesanan Selesai | Happy Path | `/dashboard/orders` | Klik filter "SELESAI" pada daftar pesanan | Hanya pesanan berstatus `COMPLETED` atau `DELIVERED` yang tampil. |
| **U-05** | Filter Tab: Pesanan Dibatalkan | Happy Path | `/dashboard/orders` | Klik filter "DIBATALKAN" pada daftar pesanan | Menampilkan pesanan berstatus `CANCELLED` atau `REFUNDED`. |
| **U-06** | Tampilan Stepper Visual 6 Tahap | Happy Path | `/dashboard/orders` | Buka salah satu pesanan aktif | Stepper (Dipesan -> Lunas -> Cetak -> QC -> Siap -> Selesai) akurat. |
| **U-07** | Salin Nomor Resi Pengiriman | Happy Path | `/dashboard/orders` | Klik tombol salin resi pada kartu pesanan yang dikirim | Nomor resi tersalin ke clipboard, notifikasi sukses muncul. |
| **U-08** | Fallback Salin Resi Non-HTTPS | Edge Case | `/dashboard/orders` | Buka web via protokol non-secure yang memblokir clipboard API | Textarea fallback otomatis menyalin tanpa terjadi galat. |
| **U-09** | Buka Modal Detail Status Review | Happy Path | `/dashboard/orders` | Klik tombol "DETAIL" pada kartu pesanan | Modal terbuka menampilkan status review, catatan admin, dan rincian. |
| **U-10** | Pembayaran Ulang Pesanan PENDING | Happy Path | `/dashboard/orders` | Klik tombol "BAYAR SEKARANG" pada pesanan belum bayar | Gateway Duitku Sandbox muncul dengan nominal rupiah yang tepat. |
| **U-11** | Pembatalan Mandiri Pesanan PENDING | Happy Path | `/dashboard/orders` | Klik "BATALKAN PESANAN" sebelum pesanan disetujui | Pesanan dibatalkan, status menjadi `CANCELLED`, stok pulih. |
| **U-12** | Tombol Pemesanan Ulang (Reorder) | Happy Path | `/dashboard/orders` | Klik tombol "PESAN LAGI (REORDER)" pada pesanan lama | Item produk beserta ukuran dan desain masuk kembali ke keranjang. |
| **U-13** | Buka Faktur Invoice Web Resmi | Happy Path | `/orders/[id]` | Klik "LIHAT INVOICE" pada kartu pesanan | Halaman invoice resmi terbuka menampilkan rincian dan nota cetak. |
| **U-14** | Cetak Nota Invoice ke PDF / Printer | Happy Path | `/orders/[id]` | Klik tombol "CETAK NOTA" pada halaman invoice | Dialog cetak peramban terbuka dengan layout print-friendly rapi. |
| **U-15** | Tab Galeri Koleksi Desain 3D | Happy Path | `/dashboard/orders` | Buka tab "Koleksi Desain 3D" | Menampilkan hingga 5 desain pakaian kustom yang tersimpan di cloud. |
| **U-16** | Edit Desain Tersimpan ke Studio 3D | Happy Path | `/dashboard/orders` | Klik tombol "EDIT DI STUDIO" pada kartu desain | Studio 3D terbuka memuat kembali geometri, warna, dan posisi sablon. |
| **U-17** | Duplikasi Desain 3D Tersimpan | Happy Path | `/dashboard/orders` | Klik ikon duplikasi pada salah satu kartu desain | Salinan desain baru terbuat dengan label " (Salinan)". |
| **U-18** | Hapus Desain 3D dari Akun | Happy Path | `/dashboard/orders` | Klik ikon hapus pada desain tersimpan dan konfirmasi | Desain terhapus dari basis data, slot kuota desain terbuka kembali. |
| **U-19** | Tab Buku Alamat Pengiriman (Address Book)| Happy Path| `/dashboard/orders` | Buka tab "Profil & Alamat" | Daftar alamat tersimpan muncul dengan penanda alamat utama. |
| **U-20** | Tambah Alamat Pengiriman Baru | Happy Path | `/api/addresses` | Isi form alamat jalan, kecamatan, dan nomor kontak | Alamat baru tersimpan di tabel `Address` dan siap dipilih di checkout. |
| **U-21** | Ubah Alamat Pengiriman Utama | Happy Path | `/api/addresses` | Tandai salah satu alamat sebagai "Jadikan Alamat Utama" | Alamat default terupdate, otomatis terpilih saat checkout belanja. |
| **U-22** | Tab Voucher & Kupon Diskon Aktif | Happy Path | `/dashboard/orders` | Buka tab "Vouchers" | Menampilkan voucher potongan diskon komunitas yang dapat disalin. |
| **U-23** | Verifikasi Nomor WhatsApp Akun via OTP | Happy Path | `/api/user` | Masukkan nomor WhatsApp baru lalu verifikasi OTP 6 digit | Status profil terupdate dengan `phoneVerified: true`. |
| **U-24** | Pembatasan Hak Akses Pesanan User Lain | Sad Path | `/orders/[id]` | Buka pesanan milik user lain menggunakan ID acak | Akses dicegat dengan kode 403 Forbidden atau dialihkan aman. |
| **U-25** | Paginasi Riwayat Pesanan (>25 Pesanan)| Happy Path | `/dashboard/orders` | Klik tombol "Muat 25 Pesanan Berikutnya" | Halaman berikutnya termuat mulus dengan server cursor `__idPart`. |

---

### Domain E: Live Chat Realtime Kamito & Pusat Notifikasi (20 Skenario: CHAT-01 s/d CHAT-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHAT-01**| Tampilan Tombol Mengambang Tanya Kamito | Happy Path | Global | Buka halaman beranda atau studio kustomisasi | Floating pill Kamito muncul di pojok kanan bawah dengan avatar maskot. |
| **CHAT-02**| Buka & Tutup Jendela Percakapan Pop-Up | Happy Path | Global | Klik tombol Kamito lalu klik tombol silang (X) | Jendela obrolan terbuka dan tertutup dengan animasi transisi mulus. |
| **CHAT-03**| Minimize & Maximize Jendela Chat | Happy Path | Global | Klik tombol panah minimize pada header chat | Jendela mengecil menjadi bilah tipis tanpa memutus koneksi obrolan. |
| **CHAT-04**| Status Kehadiran Admin: Online Sekarang | Happy Path | `/api/chat/presence` | Admin aktif membuka dasbor dalam 4 menit terakhir | Indikator titik hijau menyala dengan teks "Online sekarang". |
| **CHAT-05**| Status Kehadiran Admin: Relatif Waktu | Edge Case | `/api/chat/presence` | Admin tidak membuka sistem selama 15 menit | Indikator berubah netral dengan keterangan "Aktif 15 menit lalu". |
| **CHAT-06**| Tampilan Jam Operasional Workshop Makassar | Happy Path | Global Chat | Periksa baris jam kerja pada header widget | Menampilkan teks "Workshop: 09.00 - 21.00 WITA" secara presisi. |
| **CHAT-07**| Sambutan Ramah Otomatis Bot Kamito | Happy Path | `/api/chat/messages` | Pengguna baru mengirimkan pesan pertanyaan pertama | Kamito membalas otomatis mengonfirmasi pesan diteruskan ke workshop. |
| **CHAT-08**| Tombol Pintas Pertanyaan Cepat (Quick Prompt) | Happy Path | Global Chat | Klik tombol pill "Berapa lama proses sablon DTF?" | Pesan langsung terkirim dan tercatat di riwayat obrolan. |
| **CHAT-09**| Pengiriman Pesan Teks oleh Pelanggan | Happy Path | `/api/chat/messages` | Ketik pertanyaan kustom dan tekan tombol Enter | Pesan muncul di sisi kanan dengan warna aksen dan tanda centang. |
| **CHAT-10**| Pencegahan Serangan XSS pada Pesan Chat | Sad Path | `/api/chat/messages` | Kirim pesan mengandung skrip `<script>alert(1)</script>` | Server men-sanitize teks menjadi entitas HTML aman tanpa eksekusi. |
| **CHAT-11**| Pembatasan Panjang Pesan Maksimal 2000 Karakter | Sad Path | `/api/chat/messages` | Kirim pesan dengan panjang 2500 karakter | Sistem menolak dengan pesan validasi "Pesan maksimal 2000 karakter". |
| **CHAT-12**| Rate Limiting Pengiriman Pesan Beruntun | Edge Case | `/api/chat/messages` | Kirim lebih dari 20 pesan dalam kurun waktu 60 detik | Server memblokir sementara dengan status 429 Too Many Requests. |
| **CHAT-13**| Tombol Tanya CS dengan Konteks Nomor Pesanan | Happy Path | `/dashboard/orders` | Klik tombol "TANYA CS" pada pesanan #KK-2026-001 | Pop-up Kamito terbuka dengan input terisi nomor pesanan tersebut. |
| **CHAT-14**| Konsol Live Chat Admin: Daftar Percakapan | Happy Path | `/admin/chat` | Buka halaman `/admin/chat` menggunakan akun admin | Seluruh thread pelanggan terdaftar rapi dengan badge unread. |
| **CHAT-15**| Pencarian Pelanggan di Konsol Chat Admin | Happy Path | `/admin/chat` | Cari nama atau nomor telepon pelanggan tertentu | Daftar obrolan menyaring pelanggan yang cocok secara instan. |
| **CHAT-16**| Balasan Pesan dari Admin ke Pelanggan | Happy Path | `/admin/chat` | Admin mengetik balasan dan menekan tombol kirim | Pesan diterima pelanggan sebagai "Kamito / Admin Workshop". |
| **CHAT-17**| Penggunaan Template Balasan Cepat Operator | Happy Path | `/admin/chat` | Klik template "Sablon DTF selesai dipres & packing" | Teks template baku langsung terkirim mempercepat pelayanan. |
| **CHAT-18**| Lonceng Interaktif User: Notifikasi Chat Baru | Happy Path | `/components/ui/UserNotificationBell` | Admin membalas obrolan pelanggan | Lonceng atas-kanan pembeli memunculkan badge merah dan baris pesan baru. |
| **CHAT-19**| Lonceng Notifikasi Admin: Dering & Unread Chat | Happy Path | `/components/admin/AdminBell` | Pelanggan mengirim pesan saat admin berada di halaman lain | Lonceng admin berdering nada pendek dan badge bertambah. |
| **CHAT-20**| Tombol Fallback Darurat WhatsApp CS | Edge Case | Global Chat | Klik tombol "WhatsApp CS" di header widget chat | Tautan `wa.me` resmi terbuka dengan nomor CS workshop Makassar. |

---

### Domain F: Studio 3D Configurator, Sablon DTF, & Pola 2D (30 Skenario: S-01 s/d S-30)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S-01** | Pergantian 8 Model Pakaian 3D | Happy Path | `/studio` | Ganti model: Kaos, Longsleeve, Crewneck, Hoodie, Jaket, Topi, Celana, Shorts | Model GLB termuat dengan geometri akurat dan shader kain PBR. |
| **S-02** | Morfologi Ukuran Garmen (S ke XXL) | Happy Path | `/studio` | Klik tombol ukuran S, lalu beralih ke ukuran XXL | Geometri 3D mengembang visual (lebar dada 47 cm ke 59 cm) halus. |
| **S-03** | Skala Sablon Konsisten Saat Ukuran Ganti | Edge Case | `/studio` | Pasang sablon 30.0 cm pada Kaos S lalu ganti ke XXL | Sablon tetap 30.0 cm fisik; proporsi sablon tampak lebih kecil di XXL. |
| **S-04** | Rotasi Otomatis (AUTO) dengan Gizmo Aktif | Happy Path | `/studio` | Pasang sablon di dada lalu tekan tombol "AUTO" | Baju dan DecalGizmo berputar bersamaan dalam satu poros sinkron. |
| **S-05** | Back-Face Culling Gizmo Sablon | Edge Case | `/studio` | Putar kaos hingga punggung menghadap kamera | Gizmo dada otomatis tersembunyi agar tidak menghalangi punggung. |
| **S-06** | Presisi Tombol Posisi Cepat (Saku/Tengah) | Happy Path | `/studio` | Klik tombol "SAKU KIRI", "TENGAH", "SAKU KANAN" | Sablon berpindah ke koordinat presisi (`x: -0.065, y: 0.04`, `0, 0`). |
| **S-07** | Penguncian Batas Cetak Fisik 30.0 cm DTF | Sad Path | `/studio` | Perbesar skala sablon melebihi batas 30.0 cm | Skala sablon terkunci pada 30.0 cm sesuai printhead mesin DTF. |
| **S-08** | Presisi Sinar Senter 3D Mengikuti Kursor | Happy Path | `/studio` | Aktifkan Test Lab "Senter" dan gerakkan mouse | Reticle biru dan sorotan cahaya menempel 100% tepat di kursor mouse. |
| **S-09** | Simulasi Tekstur Tinta Khusus Sablon DTF | Happy Path | `/studio` | Pilih efek tinta: 3M Reflective, Glow-in-the-Dark, Gold Foil | Shader bereaksi fisik memantulkan kilau metalik atau pendaran neon. |
| **S-10** | Penempatan Sablon Multi-Sisi (Depan & Belakang)| Happy Path| `/studio` | Pasang logo di dada depan dan artwork di punggung | Kedua sablon menempel pada sisinya masing-masing tanpa tembus. |
| **S-11** | Penempatan Sablon di Lengan Garmen | Happy Path | `/studio` | Pasang sablon pada lengan baju Longsleeve | Sablon terproyeksi di sepanjang jahitan lengan tanpa distorsi. |
| **S-12** | Pewarnaan Multi-Part Kain (Badan/Lengan/Kerah)| Happy Path| `/studio` | Pilih warna terpisah per segmen geometri garmen | Model merender kombinasi warna kain multi-part secara tajam. |
| **S-13** | Penambahan Teks Sablon Tipografi Kustom | Happy Path | `/studio` | Ketik teks kustom, pilih font streetwear, warna emas | Teks ter-rasterisasi tajam menjadi sablon di permukaan baju. |
| **S-14** | Fitur Hapus Latar Belakang Gambar Otomatis | Happy Path | `/studio` | Upload gambar berlatar putih pekat lalu hapus background | Latar putih terhapus menjadi transparan dengan tepian halus. |
| **S-15** | Mode Inspeksi Transparan (X-Ray Bleed Check)| Happy Path | `/studio` | Aktifkan mode inspeksi "Bleed" di panel kontrol | Kain garmen transparan (opacity 15%), batas sablon terlihat jelas. |
| **S-16** | Sinkronisasi Kanvas 2D Pola dengan Model 3D | Happy Path | `/studio` | Geser artwork pada editor pola 2D ke arah bawah | Posisi sablon di kanvas 3D bergerak turun sinkron (faktor 202.0). |
| **S-17** | Ekspor Mockup Resolusi Tinggi 2K HD Tamu | Happy Path | `/studio` | Tanpa login, klik "EKSPOR MOCKUP" -> "2K HD (PNG)" | File mockup 2048x2048 terunduh sukses tanpa pemblokiran login. |
| **S-18** | Ekspor Mockup Latar Belakang Transparan | Happy Path | `/studio` | Pilih mode background "Transparan (PNG)" lalu unduh | File PNG terunduh dengan latar transparan murni untuk katalog. |
| **S-19** | Perekaman Video 360 Derajat Garmen | Happy Path | `/studio` | Klik "EKSPOR 360°" format WebM/MP4 | Sistem merekam putaran baju 360 derajat dan mengunduh video animasi. |
| **S-20** | Perhitungan Biaya Real-Time Luas Sablon | Happy Path | `/studio` | Ubah ukuran sablon dari A5 (kecil) ke A3 (besar) | Estimasi harga di pojok bawah otomatis bertambah sesuai tarif DTF. |
| **S-21** | Reset Posisi Kamera 3D ke Pandangan Depan | Happy Path | `/studio` | Putar kamera acak lalu klik tombol "RESET TAMPILAN" | Kamera bertransisi halus kembali ke posisi depan frontal default. |
| **S-22** | Deteksi Jaringan Offline saat Desain | Edge Case | `/studio` | Putuskan koneksi internet saat merancang pakaian | Badge header menampilkan titik merah "OFFLINE" dan simpan lokal. |
| **S-23** | Pemulihan Sinkronisasi Desain saat Online | Happy Path | `/studio` | Sambungkan kembali internet pasca offline | Badge berubah menjadi "TERSIMPAN", autosave sinkron ke DB. |
| **S-24** | Simpan Desain ke Akun Pelanggan (Cloud) | Happy Path | `/studio` | Klik "SIMPAN DESAIN" dengan nama "Kustom Streetwear" | Desain tersimpan di tabel `Design` akun dan muncul di dashboard. |
| **S-25** | Prompt Login saat Tamu Simpan ke Cloud | Edge Case | `/studio` | Pengguna anonim mengklik "SIMPAN KE AKUN" | Modal login terbuka sopan memberi tahu keuntungan simpan cloud. |
| **S-26** | Pembatasan Kuota Maksimal 5 Desain Cloud | Sad Path | `/studio` | Simpan desain ke-6 tanpa menghapus desain lama | Muncul notifikasi kuota cloud penuh (maks 5) dan tawaran unduh lokal. |
| **S-27** | Upload Gambar Melebihi Batas Ukuran 10 MB | Sad Path | `/studio` | Coba unggah file gambar berukuran 25 MB | Sistem menampilkan peringatan batas upload (maks 10 MB). |
| **S-28** | Penggantian Warna Kain Real-Time | Happy Path | `/studio` | Klik palet warna Chalk White, Hitam, Sage Green | Material PBR kain berubah warna instan dengan specular bump alami. |
| **S-29** | Tampilan Panduan Ukuran Fisik (Size Guide) | Happy Path | `/studio` | Klik tombol "PANDUAN UKURAN" | Modal tabel ukuran (lebar dada, panjang badan cm) tampil lengkap. |
| **S-30** | Tombol Langsung Checkout dari Studio | Happy Path | `/studio` | Selesaikan desain lalu klik "PESAN SEKARANG" | Desain terkonversi menjadi item keranjang dan membuka modal checkout. |

---

### Domain G: Keranjang Belanja, Kupon Diskon, & Sesi (20 Skenario: K-01 s/d K-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **K-01** | Tambah Produk Kustom 3D ke Keranjang | Happy Path | `/studio` | Klik pesan pada produk kustom yang telah dirancang | Item masuk keranjang lengkap dengan ukuran, warna, dan snapshot. |
| **K-02** | Tambah Produk Polos Siap Pakai | Happy Path | `/#etalase` | Pilih Kaos Combed 24s Chalk White L dari katalog | Produk katalog masuk keranjang belanja dengan SKU varian valid. |
| **K-03** | Keranjang Belanja Multi-Item Campuran | Happy Path | Global Cart | Masukkan 1 Kaos Kustom dan 1 Hoodie Polos ke keranjang | Keranjang menampilkan kedua item dengan subtotal gabungan akurat. |
| **K-04** | Penggabungan Keranjang Tamu saat Login | Edge Case | Global Cart | Tambah item saat anonim, lalu login akun pelanggan | Item dari localStorage otomatis dimerge ke keranjang akun DB. |
| **K-05** | Perubahan Kuantitas Item di Keranjang | Happy Path | Global Cart | Ubah jumlah pesanan kaos dari 1 pcs menjadi 4 pcs | Subtotal item dan total belanja terhitung otomatis (4 x harga). |
| **K-06** | Pembatasan Kuantitas Melebihi Stok Nyata | Sad Path | Global Cart | Stok DB hanya 3 pcs, user coba ubah kuantitas jadi 10 | Sistem membatasi kuantitas maksimal 3 pcs dengan pesan stok limit. |
| **K-07** | Hapus Salah Satu Item dari Keranjang | Happy Path | Global Cart | Klik ikon hapus pada salah satu item di laci keranjang | Item terhapus, total harga berkurang, badge navbar terupdate. |
| **K-08** | Kosongkan Seluruh Isi Keranjang Belanja | Happy Path | Global Cart | Hapus semua item keranjang belanja hingga nol | Tampilan keranjang kosong muncul dengan tautan kembali belanja. |
| **K-09** | Persistensi Keranjang Belanja Pasca-Refresh | Happy Path | Global Cart | Muat ulang halaman peramban (F5) saat keranjang terisi | Seluruh item keranjang tetap utuh tersimpan di penyimpanan lokal/DB. |
| **K-10** | Penerapan Kupon Diskon Persentase | Happy Path | Global Cart | Masukkan kode kupon `MAKASSAR15` (Diskon 15%) | Subtotal terpotong 15%, total tagihan berkurang tepat rupiahnya. |
| **K-11** | Penerapan Kupon Diskon Potongan Tetap | Happy Path | Global Cart | Masukkan kode kupon `POTONGAN20K` (Potongan Rp 20.000) | Total harga terpotong Rp 20.000 secara tepat. |
| **K-12** | Penolakan Kupon yang Sudah Kedaluwarsa | Sad Path | Global Cart | Masukkan kode kupon yang masa berlakunya telah habis | Sistem menolak dengan pesan "Kupon diskon telah kedaluwarsa". |
| **K-13** | Penolakan Kupon Melebihi Kuota Pemakaian | Sad Path | Global Cart | Masukkan kupon dengan `usedCount >= maxUses` di DB | Muncul peringatan "Batas kuota pemakaian kupon telah habis". |
| **K-14** | Pembatasan Syarat Minimum Belanja Kupon | Edge Case | Global Cart | Pakai kupon syarat min Rp 200.000 pada belanja Rp 100.000 | Sistem menolak dengan pesan syarat belanja minimum belum tercapai. |
| **K-15** | Kupon Diskon Melebihi Total Nilai Belanja | Edge Case | Global Cart | Pakai kupon diskon Rp 150.000 pada belanja Rp 120.000 | Total belanja dikurangi hingga batas minimal Rp 0 (tidak negatif). |
| **K-16** | Pembatalan Penerapan Kupon Diskon | Happy Path | Global Cart | Klik tombol hapus kupon yang sedang aktif terpasang | Diskon dicabut, total tagihan kembali ke harga normal awal. |
| **K-17** | Deteksi Perubahan Stok saat Item di Keranjang| Edge Case | Global Cart | Stok varian diubah admin jadi 0 saat item di keranjang user| Keranjang mendeteksi stok habis dan menandai item tidak tersedia. |
| **K-18** | Sinkronisasi Badge Jumlah Keranjang di Navbar | Happy Path| Global Cart | Tambah 2 item ke keranjang belanja | Badge angka keranjang di bilah navigasi atas langsung menampilkan 2. |
| **K-19** | Navigasi Mulus Menuju Layar Checkout | Happy Path | Global Cart | Klik tombol "LANJUT KE PEMBAYARAN" pada keranjang | Modal checkout terbuka instan membawa ringkasan pesanan yang sama. |
| **K-20** | Penolakan Checkout Keranjang Kosong | Sad Path | Global Cart | Coba panggil alur checkout saat keranjang bernilai nol | Sistem memblokir proses checkout dan mengarahkan ke katalog. |

---

### Domain H: Mesin Checkout & Anti-Bot Protection (20 Skenario: CH-01 s/d CH-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CH-01**| Checkout Gratis Ongkir Se-Kota Makassar | Happy Path | `/checkout` | Pilih alamat Kota Makassar, Kecamatan Tamalanrea | Ongkos kirim otomatis terhitung Rp 0 (Gratis Ongkir Lokal). |
| **CH-02**| Checkout Opsi Workshop Pickup KM 10 | Happy Path | `/checkout` | Pilih metode pengiriman "Ambil di Workshop Kaos Kami" | Ongkos kirim Rp 0, petunjuk pengambilan tertera pada faktur. |
| **CH-03**| Checkout Ekspedisi Luar Kota Nasional | Happy Path | `/checkout` | Pilih alamat tujuan Kabupaten Gowa via kurir J&T | Opsi layanan reguler dan estimasi biaya ongkir tampil tepat. |
| **CH-04**| Fallback Ekspedisi saat API Timeout | Edge Case | `/checkout` | Simulasikan API AgenWebsite lambat atau tidak merespons | Sistem otomatis beralih menggunakan tarif flat zona `ExpeditionZone`. |
| **CH-05**| Validasi Wajib Nama Lengkap dan Nomor WhatsApp| Sad Path| `/checkout` | Kosongkan kolom nama atau nomor WhatsApp saat checkout | Form memblokir pengiriman dengan penanda merah field wajib. |
| **CH-06**| Validasi Format Nomor Telepon Indonesia | Sad Path | `/checkout` | Masukkan nomor HP tidak valid (contoh: `12345` atau huruf) | Regex memvalidasi nomor harus diawali `08` atau `628`, min 10 digit. |
| **CH-07**| Pemilihan Biaya Turnaround Kilat Express 24 Jam| Happy Path| `/checkout` | Centang opsi produksi "Express 24 Jam (+IDR 25.000)" | Biaya surcharge express ditambahkan ke rincian total pesanan. |
| **CH-08**| Proteksi Manipulasi Harga Sisi Klien (Anti-Tamper)| Sad Path | `/api/checkout` | Ubah total harga di JSON request menjadi `totalIdr: 1000` | Server menghitung ulang dari DB, payload client dipaksa override. |
| **CH-09**| Checkout Varian dengan Stok Mencukupi | Happy Path | `/checkout` | Pesan 2 pcs varian Kaos Chalk White L (stok DB = 35) | Checkout berhasil, stok sementara direservasi untuk pesanan. |
| **CH-10**| Penolakan Checkout saat Stok Tidak Cukup | Sad Path | `/checkout` | Coba checkout 15 pcs varian yang hanya tersisa 2 pcs di DB | Server menolak dengan kode 400 "Stok tidak mencukupi". |
| **CH-11**| Verifikasi Cloudflare Turnstile Bot Guard | Happy Path | `/checkout` | Selesaikan verifikasi widget Turnstile sebelum klik bayar | Token Turnstile tervalidasi sukses oleh server endpoint checkout. |
| **CH-12**| Penolakan Checkout dengan Token Turnstile Palsu| Sad Path | `/api/checkout` | Kirim request checkout dengan token Turnstile dummy | Server menolak dengan kode 403 Forbidden "Verifikasi bot gagal". |
| **CH-13**| Bypass Turnstile Khusus Lingkungan Dev | Edge Case | `/api/checkout` | Aktifkan flag `TURNSTILE_ENFORCE=false` di localhost | Server mengizinkan bypass khusus dev untuk otomasi testing runner. |
| **CH-14**| Penerbitan Nomor Pesanan Format Resmi | Happy Path | `/checkout` | Selesaikan alur checkout pesanan baru | Terbit entri tabel `Order` dengan nomor format `KK-YYYYMMDD-XXXX`. |
| **CH-15**| Pencatatan Item Pesanan ke `OrderItem` | Happy Path | `/checkout` | Periksa relasi rincian pesanan di Turso DB | Setiap item tersimpan lengkap dengan harga dasar, surcharge, dan size. |
| **CH-16**| Penerbitan Entri Pembayaran Awal `Payment` | Happy Path | `/checkout` | Periksa tabel pembayaran pasca checkout | Terbit baris pembayaran berstatus `UNPAID` senilai total pesanan. |
| **CH-17**| Status Awal Pesanan Kustom adalah DESIGN_REVIEW| Happy Path| `/checkout` | Checkout pesanan yang berisi sablon kustom 3D | Status pesanan otomatis bernilai awal `DESIGN_REVIEW` menunggu ACC. |
| **CH-18**| Checkout Pembeli Tamu (Auto Account Creation)| Happy Path| `/checkout` | Checkout sebagai guest dengan memasukkan email & nomor HP | Akun baru otomatis dibuat di tabel `User` dan ditautkan ke pesanan. |
| **CH-19**| Kirim Notifikasi WhatsApp Otomatis via Fonnte | Happy Path | `/checkout` | Selesaikan checkout dengan gateway Fonnte aktif | Pesan WA konfirmasi pesanan terkirim otomatis ke nomor pembeli. |
| **CH-20**| Graceful Fallback saat Gateway WhatsApp Mati | Edge Case | `/checkout` | Putuskan koneksi internet ke Fonnte saat checkout | Checkout tetap 100% sukses, tombol manual WA muncul di invoice. |

---

### Domain I: Gateway Pembayaran Duitku Sandbox & Webhook Lifecycle (20 Skenario: P-01 s/d P-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P-01** | Permintaan URL Bayar Duitku (Request Payment) | Happy Path | `/api/orders/[id]/request-payment` | Panggil endpoint request payment untuk pesanan yang siap bayar | Duitku merespons URL sandbox pembayaran dan kode referensi. |
| **P-02** | Penolakan Bayar Sebelum Desain Disetujui Admin | Sad Path | `/api/orders/[id]/request-payment` | Panggil request payment saat pesanan masih `DESIGN_REVIEW` | Server menolak dengan error 400 "Menunggu persetujuan desain". |
| **P-03** | Pembayaran via Sandbox QRIS Simulator | Happy Path | Duitku Sandbox | Pilih metode QRIS pada layar tagihan pembayaran Duitku | QR code QRIS tampil dan dapat dibayar menggunakan simulator. |
| **P-04** | Pembayaran via BCA Virtual Account | Happy Path | Duitku Sandbox | Pilih metode pembayaran Virtual Account BCA | Nomor VA tampil dengan tagihan yang sama persis hingga rupiah terakhir. |
| **P-05** | Pembayaran via Mandiri Virtual Account | Happy Path | Duitku Sandbox | Pilih metode pembayaran Virtual Account Mandiri | Nomor VA Mandiri diterbitkan dan siap diverifikasi simulator. |
| **P-06** | Pembayaran via BNI Virtual Account | Happy Path | Duitku Sandbox | Pilih metode pembayaran Virtual Account BNI | Nomor VA BNI diterbitkan dengan batas kedaluwarsa 24 jam. |
| **P-07** | Penerimaan Webhook Callback Bayar Sukses | Happy Path | `/api/webhooks/duitku` | Simulasikan callback sukses dari Duitku (`resultCode: "00"`) | Status pesanan menjadi `PAID`, status pembayaran menjadi `SUCCESS`. |
| **P-08** | Verifikasi Signature MD5 Callback Valid | Happy Path | `/api/webhooks/duitku` | Kirim callback dengan signature MD5 hasil kalkulasi API key rahasia | Server memvalidasi signature sukses dan memproses pembaruan DB. |
| **P-09** | Penolakan Callback dengan Signature Palsu | Sad Path | `/api/webhooks/duitku` | Kirim callback pembayaran dengan signature MD5 salah/acak | Server menolak dengan kode 400 Bad Request demi keamanan dana. |
| **P-10** | Penolakan Callback dengan MerchantCode Asing | Sad Path | `/api/webhooks/duitku` | Kirim callback dengan kode merchant yang tidak cocok di env | Server mengabaikan callback untuk mencegah manipulasi multi-tenant. |
| **P-11** | Penolakan Callback dengan Nominal Tagihan Beda | Sad Path | `/api/webhooks/duitku` | Kirim callback sukses namun nominal `amount` berbeda dari order | Server menolak dan menandai pesanan untuk audit manual penipuan. |
| **P-12** | Idempotensi Callback Ganda (Duplicate Ping) | Edge Case | `/api/webhooks/duitku` | Kirim callback pembayaran sukses yang sama dua kali beruntun | Panggilan kedua direspons 200 OK tanpa menduplikasi task produksi. |
| **P-13** | Otomasi Penerbitan Tugas Sablon `ProductionTask`| Happy Path| `/api/webhooks/duitku` | Periksa database sesaat setelah pembayaran sukses diproses | Terbit baris baru di tabel `ProductionTask` dengan status `QUEUED`. |
| **P-14** | Callback Transaksi Dibatalkan / Gagal (`01`) | Sad Path | `/api/webhooks/duitku` | Simulasikan callback transaksi ditolak atau dibatalkan user | Status pesanan diperbarui menjadi `CANCELLED` atau tetap pending. |
| **P-15** | Penanganan Transaksi Kedaluwarsa 24 Jam | Edge Case | `/api/cron/sweep` | Simulasikan pesanan yang tidak dibayar melewati batas 24 jam | Status beralih ke `EXPIRED`, kuantitas stok garmen dipulihkan. |
| **P-16** | Permintaan Link Bayar Ulang (Repay Flow) | Happy Path | `/api/orders/[id]/repay` | Klik bayar ulang pada pesanan pending yang belum kedaluwarsa | Duitku menerbitkan kode bayar baru yang valid untuk diselesaikan. |
| **P-17** | Eksekusi Pembersihan Berkala Otomatis (Cron) | Happy Path | `/api/cron/sweep` | Panggil endpoint cron sweep dengan authorization header rahasia | Seluruh pesanan unpaid >24 jam otomatis ditutup dan dibersihkan. |
| **P-18** | Penolakan Akses Endpoint Cron Tanpa Auth Token | Sad Path | `/api/cron/sweep` | Panggil cron sweep tanpa menyertakan secret cron token | Server menolak akses dengan kode status 401 Unauthorized. |
| **P-19** | Pencegahan Pembayaran Ganda pada Order Lunas | Sad Path | `/api/orders/[id]/request-payment` | Coba minta link bayar pada pesanan yang sudah berstatus `PAID` | Server menolak permintaan dengan kode 400 "Pesanan sudah lunas". |
| **P-20** | Pencatatan Riwayat Perubahan Status Pembayaran | Happy Path | `/orders/[id]` | Periksa timeline status setelah pembayaran diselesaikan | Terbit event di `OrderStatusEvent` mencatat jam dan metode lunas. |

---

### Domain J: Fitur Publik Tambahan (Kalkulator Sablon, Track Publik, Lookbook, CMS) (15 Skenario: PUB-01 s/d PUB-15)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PUB-01** | Buka Kalkulator Sablon DTF Interaktif | Happy Path | `/kalkulator-sablon` | Akses halaman kalkulator sablon dari menu | Kalkulator estimasi biaya sablon DTF Makassar termuat lengkap. |
| **PUB-02** | Kalkulasi Biaya Sablon Kaos Satuan A3 | Happy Path | `/kalkulator-sablon` | Pilih Kaos Combed 24s, ukuran cetak A3, jumlah 1 pcs | Estimasi total biaya tampil akurat sesuai harga workshop. |
| **PUB-03** | Kalkulasi Diskon Grosir Jumlah Banyak (>24 pcs) | Happy Path | `/kalkulator-sablon` | Masukkan jumlah 30 pcs kaos pada kalkulator | Diskon volume kuantitas otomatis terpotong mengurangi harga satuan. |
| **PUB-04** | Tombol Transfer Desain dari Kalkulator ke Studio | Happy Path | `/kalkulator-sablon` | Klik tombol "BUAT DI STUDIO 3D DENGAN SPESIFIKASI INI" | Studio 3D terbuka dengan garmen dan ukuran sablon yang telah dipilih. |
| **PUB-05** | Pelacakan Pesanan Publik Tanpa Login | Happy Path | `/track` | Masukkan nomor pesanan dan nomor WhatsApp di form track | Status pesanan, stepper, kurir, dan nomor resi tampil tanpa login. |
| **PUB-06** | Pelacakan dengan Nomor Pesanan Tidak Dikenal | Sad Path | `/track` | Masukkan nomor pesanan asal `KK-999999` di form pelacakan | Sistem menampilkan pesan "Pesanan tidak ditemukan, periksa nomor". |
| **PUB-07** | Pelacakan dengan Nomor Telepon Tidak Cocok | Sad Path | `/track` | Masukkan nomor pesanan valid namun nomor HP tidak cocok | Sistem menolak menampilkan detail demi perlindungan privasi PII. |
| **PUB-08** | Tampilan Hero 3D Beranda Utama | Happy Path | `/` | Buka beranda utama platform di peramban | Model kaos 3D interaktif berputar di hero section dengan smooth. |
| **PUB-09** | Navigasi Cepat Etalase Produk Unggulan | Happy Path | `/#etalase` | Klik menu "KATALOG" pada bilah navigasi atas | Halaman otomatis menggulir halus menuju bagian etalase produk. |
| **PUB-10** | Tampilan Informasi Workshop & Jam Operasional | Happy Path | `/#tentang-kami` | Periksa bagian tentang workshop konveksi Kaos Kami | Alamat workshop KM 10 Makassar dan badge jam buka tampil akurat. |
| **PUB-11** | Tautan Unduh Aplikasi Android (Capacitor APK) | Happy Path | Global Navbar | Klik tombol "UNDUH APK" pada bilah navigasi utama | Berkas instalasi APK Android Kaos Kami langsung terunduh. |
| **PUB-12** | Halaman Atribusi Kredit & Lisensi Model 3D | Happy Path | `/kredit` | Akses halaman kredit lisensi aset 3D | Seluruh atribusi lisensi CC-BY pembuat model 3D tercantum rapi. |
| **PUB-13** | Halaman Kebijakan Privasi & Perlindungan Data | Happy Path | `/privacy` | Akses halaman kebijakan privasi UMKM | Ketentuan penanganan data PII, nomor WhatsApp, dan retensi data tampil. |
| **PUB-14** | Tampilan Halaman Galat 404 Kustom (Not Found) | Edge Case | `/rute-tidak-ada` | Akses URL acak yang tidak terdaftar di website | Halaman 404 elegan tampil dengan tombol navigasi kembali ke Beranda. |
| **PUB-15** | Verifikasi SEO Meta Tag & OpenGraph Share | Happy Path | Global Head | Periksa source HTML meta tag judul, deskripsi, dan OpenGraph | Meta tag Kaos Kami Makassar dan pratinjau gambar media sosial valid. |

---

### Domain K: Sad Cases, Edge Cases, & Security Audits (20 Skenario: SEC-01 s/d SEC-20)

| Kode | Kasus Uji | Tipe Kasus | Rute Terkait | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Race Condition Stok Terakhir (2 Pembeli Bersamaan)| Edge Case | `/api/checkout` | Varian sisa 1 pcs; User A dan B klik bayar di detik yang sama | User pertama sukses; user kedua ditolak stok habis (Atomic DB). |
| **SEC-02** | Upaya Checkout Produk Non-Aktif (`isActive: false`)| Sad Path | `/api/checkout` | Kirim payload checkout untuk varian yang dinonaktifkan admin | Server menolak dengan pesan "Produk saat ini sedang tidak tersedia". |
| **SEC-03** | Upaya Serangan SQL Injection di Form Pencarian | Sad Path | `/admin/orders` | Masukkan input `' OR '1'='1` pada filter pencarian admin | Drizzle parameterized query menangkal total; tidak ada kebocoran. |
| **SEC-04** | Upaya Serangan XSS pada Teks Sablon Kustom | Sad Path | `/studio` | Ketik teks sablon `<img src=x onerror=alert(1)>` di studio | Teks di-sanitize dan dirender murni sebagai string grafis kanvas. |
| **SEC-05** | Upaya Serangan XSS pada Live Chat Kamito | Sad Path | `/api/chat/messages` | Kirim pesan chat berisi skrip pencuri cookie | Tag HTML di-encode aman menjadi entitas teks biasa di layar. |
| **SEC-06** | Penolakan Upload Berkas Raksasa Melebihi Kuota | Sad Path | `/api/upload` | Coba upload file gambar dengan ukuran 40 MB | Server dan klien membatasi ukuran maksimal (maks 10 MB). |
| **SEC-07** | Autosave Mengosongkan URL Base64 Tanpa Crash | Edge Case | `/api/designs/autosave`| Tambah gambar base64 besar lalu biarkan autosave berjalan | Autosave mengosongkan URL sementara tanpa error 400; draft aman. |
| **SEC-08** | IDOR Protection pada Halaman Faktur Pesanan | Sad Path | `/orders/[id]` | User biasa mencoba membuka faktur milik akun pelanggan lain | Akses dicegat dengan pesan kepemilikan resource (`assertOwner`). |
| **SEC-09** | Upaya Pembayaran Ulang pada Pesanan yang Sudah Lunas | Sad Path | `/api/orders/[id]/request-payment`| Panggil API bayar pada pesanan yang sudah berstatus `PAID` | Server menolak permintaan dengan kode 400 "Pesanan telah lunas". |
| **SEC-10** | Penolakan Pemalsuan Signature Callback Duitku | Sad Path | `/api/webhooks/duitku` | Kirim callback webhook dengan MD5 hash yang dimanipulasi | Verifikasi signature gagal, server merespons 400 Bad Request. |
| **SEC-11** | Pembatalan Pesanan yang Sudah Masuk Tahap Cetak | Sad Path | `/api/orders/[id]/cancel` | Pelanggan meminta batal saat status pesanan sudah `IN_PRODUCTION` | Sistem menolak pembatalan karena bahan film sudah dipotong/cetak. |
| **SEC-12** | Validasi Integritas Foreign Key Penghapusan Data | Sad Path | Turso DB Engine | Coba hapus akun user yang memiliki riwayat pesanan aktif | Database menolak penghapusan demi menjaga integritas pembukuan. |
| **SEC-13** | Penanganan Simbol Unik pada Alamat Pengiriman | Edge Case | `/checkout` | Masukkan alamat memuat tanda kutip, koma, dan karakter lokal | Alamat tersimpan rapi dan tampil utuh pada label pengiriman. |
| **SEC-14** | Proteksi Surcharge Nol untuk Ukuran Standar | Happy Path | `/studio` | Pilih kaos ukuran S, M, dan L | Biaya surcharge tepat Rp 0; hanya XXL (+10k) & XXXL (+20k) bertambah. |
| **SEC-15** | Evaluasi Batas Ukuran Worker Cloudflare (<3 MB) | Edge Case | Cloudflare Runtime | Analisis bundle size Server Actions dan Route Handlers | Tiga pustaka berat (Three.js/GSAP/Fabric) tetap strictly di client. |
| **SEC-16** | Penanganan Timeout Koneksi Basis Data Turso | Edge Case | LibSQL Client | Simulasikan latensi jaringan ekstrim ke server Turso | Klien HTTP me-retry atau mengembalikan pesan error jaringan ramah. |
| **SEC-17** | Proteksi Rate Limiting Pemanggilan OTP WhatsApp | Edge Case | `/api/auth/otp` | Klik tombol kirim ulang OTP 5 kali dalam 10 detik | Sistem memberlakukan cooldown 60 detik dengan kode status 429. |
| **SEC-18** | Penolakan Perubahan Status Pesanan Retroaktif | Sad Path | `/api/admin/orders` | Coba ubah pesanan yang sudah `DELIVERED` kembali ke `PAID` | State machine menolak transisi status mundur yang tidak valid. |
| **SEC-19** | Sanitasi Input Pencarian Laporan Keuangan | Sad Path | `/admin/laporan` | Masukkan karakter injeksi pada filter rentang laporan | Server memvalidasi format tanggal ISO tanpa terjadi kegagalan query. |
| **SEC-20** | Proteksi Data PII Nomor Telepon di Tampilan Publik | Happy Path | `/track` | Buka pelacakan pesanan publik | Nomor telepon penerima disensor sebagian (`0895****3032`). |

---

### Domain L: 12 Rantai Kritis End-to-End (C-01 s/d C-12)

Rantai ini menguji estafet integrasi penuh dari titik awal perancangan hingga produk tiba di tangan pelanggan:

- **C-01 (Pesanan Sablon Kaos Kustom Selesai Utuh):**
  Pelanggan mendesain kaos di Studio 3D -> Checkout Alamat Makassar -> Admin `hengkishadow` ACC Desain -> Pelanggan bayar QRIS Duitku -> Webhook sukses -> SPK Cetak 300 DPI terbit -> Tim workshop sablon & packing -> Kurir antar pesanan -> Pelanggan terima paket -> Status `DELIVERED`.
- **C-02 (Pembelian Produk Katalog Polos Tanpa Kustomisasi):**
  Pelanggan beli Kaos Combed 24s Chalk White L -> Checkout -> Bayar VA BCA -> Webhook otomatis proses -> Langsung masuk antrean packing tanpa review desain -> Kurir kirim -> Selesai.
- **C-03 (Konsultasi Live Chat Kamito Sebelum Memesan):**
  Pelanggan membuka widget Kamito di Studio 3D -> Bertanya resolusi gambar -> Admin membalas via `/admin/chat` -> Pelanggan yakin dan menyelesaikan checkout -> Status pesanan terpantau bersama.
- **C-04 (Pemesanan Multi-Garmen dengan Kupon Diskon Komunitas):**
  Pelanggan pesan 2 Kaos + 1 Hoodie + Kode Kupon Diskon Makassar -> Total terpotong akurat -> Bayar -> Admin proses sekaligus dalam satu pengiriman.
- **C-05 (Alur Bayar Ulang Pasca Transaksi Duitku Kedaluwarsa):**
  Tagihan pertama tidak dibayar hingga batas waktu habis -> Pelanggan klik "Minta Link Bayar Baru" -> Duitku terbitkan invoice baru -> Bayar sukses -> Pesanan aktif kembali.
- **C-06 (Alur Penolakan Desain & Pengunggahan Ulang oleh User):**
  Admin menolak desain karena buram (`DESIGN_REJECTED`) -> Pelanggan melihat catatan penolakan di dashboard -> Pelanggan unggah gambar baru tajam -> Admin ACC -> Lanjut bayar.
- **C-07 (Alur Pembatalan Sebelum Produksi & Pengembalian Stok):**
  Pelanggan membatalkan pesanan sebelum disetujui -> Admin memvalidasi pembatalan di dashboard -> Status berubah `CANCELLED` -> Stok produk otomatis pulih di DB.
- **C-08 (Uji Ketahanan Balapan Stok Terakhir / Race Condition):**
  Dua peramban berbeda mencoba memesan 1 pcs varian Kaos terakhir pada detik yang sama -> Hanya 1 pesanan yang berhasil lolos, 1 lainnya diberi pesan stok habis.
- **C-09 (Konversi Pembeli Tamu Menjadi Anggota Terdaftar):**
  Tamu mendesain dan checkout pesanan -> Akun otomatis terbuat di DB -> Tamu login pertama kali via email yang sama -> Seluruh riwayat pesanan tamu langsung muncul di dashboard.
- **C-10 (Sinkronisasi Real-Time Perubahan Stok & Etalase Admin ke Pembeli):**
  Admin mengubah stok atau menyembunyikan varian di `/admin/catalog` -> Pembeli di sisi lain langsung melihat perubahan ketersediaan di etalase tanpa hard reload.
- **C-11 (Ekspedisi Luar Kota dengan Live Tracking Resi):**
  Pesanan luar kota Makassar diproses -> Admin memasukkan resi JNE -> Pembeli di dashboard dapat langsung mengklik tautan pelacakan posisi paket.
- **C-12 (Audit Keamanan Menyeluruh & Uji Pemalsuan Webhook):**
  Simulasi percobaan serangan siber berupa manipulasi harga JSON, spoofing signature callback pembayaran, dan injeksi parameter -> Seluruh serangan berhasil ditangkal dengan status fail-closed.

---

## 5. PANDUAN EKSEKUSI PENGUJIAN LOCALHOST DENGAN AKUN ADMIN

Berikut adalah prosedur standar untuk menjalankan pengujian end-to-end secara lokal menggunakan akun admin kanonis `hengkishadow`:

### 5.1 Persiapan Lingkungan (Prerequisites)

1. Pastikan berkas konfigurasi lokal `kaos-kami-web/.env.local` memiliki variabel wajib berikut:
   ```env
   # Basis Data Turso Edge SQLite
   TURSO_DATABASE_URL="libsql://kaos-kami-xxxx.turso.io"
   TURSO_AUTH_TOKEN="eyJhbGciOi..."
   
   # Akun Uji Kanonis
   E2E_ADMIN_EMAIL="hengkishadow@gmail.com"
   E2E_USER_EMAIL="hengkivibecoding@gmail.com"
   
   # Gateway Pembayaran & Notifikasi
   DUITKU_MERCHANT_CODE="Dxxxx"
   DUITKU_API_KEY="xxxxxxxxxxxx"
   FONNTE_TOKEN="xxxxxxxxxxxx"
   
   # URL Pengujian Lokal (Gunakan 127.0.0.1 untuk Windows)
   E2E_BASE_URL="http://127.0.0.1:3000"
   ```

2. Jalankan server pengembangan lokal:
   ```bash
   cd "d:\Vibe coding Semester 7\Kaos Kami\kaos-kami-web"
   npm run dev
   ```
   Pastikan terminal menampilkan bahwa server Next.js telah siap di `http://127.0.0.1:3000`.

### 5.2 Menjalankan Runner Pengujian Otomatis

Buka terminal kedua di direktori root proyek untuk menjalankan script runner pengujian:

1. **Jalankan Sensus Basis Data (Read-Only Check):**
   ```bash
   node --env-file=kaos-kami-web/.env.local scripts/db-sensus.mjs --dry-run
   ```
   Memverifikasi integritas foreign key, ketiadaan stok negatif, keabsahan kupon, dan tabel chat.

2. **Jalankan Uji Alur Pelanggan (User Journey R-U):**
   ```bash
   node --env-file=kaos-kami-web/.env.local scripts/e2e-R-U.mjs --stamp=20260927-1830 --otp-lifetime
   ```
   Menguji katalog, studio 3D, penambahan keranjang, dan checkout dengan akun pelanggan.

3. **Jalankan Uji Alur Admin (Admin Journey R-A dengan `hengkishadow`):**
   ```bash
   node --env-file=kaos-kami-web/.env.local scripts/e2e-R-A.mjs --stamp=20260927-1830
   ```
   Mengautentikasi sesi admin `hengkishadow@gmail.com`, memverifikasi desain pesanan baru, memperbarui stok varian, dan memproses antrean SPK.

4. **Jalankan Uji Rantai Lengkap (Core Chains R-C):**
   ```bash
   node --env-file=kaos-kami-web/.env.local scripts/e2e-R-C.mjs --stamp=20260927-1830
   ```
   Menjalankan estafet integrasi penuh dari pesanan masuk hingga pelunasan pembayaran via simulasi webhook Duitku.

5. **Jalankan Uji Unit Lengkap Vitest (24 Berkas Uji):**
   ```bash
   cd kaos-kami-web
   npx vitest run
   ```
   Memastikan 169 pengujian fungsional dan unit guards lulus 100%.

### 5.3 Prosedur Verifikasi Manual Interaktif di Browser

1. Buka peramban di `http://127.0.0.1:3000/login` dan masuk menggunakan akun `hengkishadow@gmail.com`.
2. **Pengujian Sisi Pelanggan (Tab 1):**
   - Buka `http://127.0.0.1:3000/studio`.
   - Pilih ukuran **XXL** (perhatikan model 3D mengembang visual mengikuti ukuran fisik dada).
   - Pasang sablon di dada, putar otomatis (`AUTO`), dan pastikan gizmo berputar sinkron.
   - Buka tab "Simpan & Ekspor" -> Klik "Unduh Saat Ini (2K HD)" (terbukti berfungsi bebas login).
   - Klik tombol mengambang **Tanya Kamito** di pojok kanan bawah -> Kirim pesan percobaan -> Perhatikan bot Kamito membalas otomatis.
   - Klik "Pesan Sekarang" dan selesaikan checkout untuk alamat Kota Makassar (Free Delivery Rp 0).
3. **Pengujian Sisi Pengelola Workshop (Tab 2):**
   - Buka `http://127.0.0.1:3000/admin`.
   - Perhatikan bahwa lonceng notifikasi admin `AdminBell` berdering dan menampilkan badge unread chat serta order baru.
   - Buka `http://127.0.0.1:3000/admin/chat` -> Temukan pesan yang baru dikirim dari Tab 1 -> Kirim balasan menggunakan template cepat operator.
   - Buka `http://127.0.0.1:3000/admin/review` -> Temukan pesanan baru yang berstatus `DESIGN_REVIEW` -> Klik tombol "SETUJUI (ACC)".
   - Buka `http://127.0.0.1:3000/admin/catalog` -> Ubah stok salah satu varian Kaos Chalk White L dari 35 menjadi 40.
4. **Pengujian Siklus Pembayaran (Tab 1 Kembali):**
   - Kembali ke tab pembeli di `http://127.0.0.1:3000/dashboard/orders`.
   - Perhatikan lonceng notifikasi user `UserNotificationBell` di navbar atas berkedip menampilkan balasan chat admin.
   - Pada kartu pesanan, status telah berubah menjadi `PENDING_PAYMENT` dan tombol berubah menjadi **BAYAR SEKARANG**.
   - Klik bayar untuk meluncurkan simulator Duitku Sandbox (QRIS / VA BCA).
   - Klik tombol **TANYA CS** pada kartu pesanan untuk memverifikasi chat langsung terisi nomor pesanan tersebut.

---

## 6. RUBRIK PENILAIAN & LEMBAR EVALUASI KESIAPAN PROYEK

Evaluasi dinilai berdasarkan 6 pilar utama dengan skala 1–100:

| Pilar Evaluasi | Aspek yang Dinilai | Target Mutu | Status Audit Terkini |
| :--- | :--- | :---: | :---: |
| **1. Integritas Data & Transaksi** | Atomisitas stok, foreign keys, rollback saat error, bebas stok negatif | 100 / 100 | **100** (Drizzle + Turso) |
| **2. Keamanan & Anti-Tampering** | Signature Duitku MD5, proteksi harga server, sanitasi XSS/SQLi | 100 / 100 | **99** (Fail-closed & rate limit aktif) |
| **3. Presisi Fisik 3D & WebGL** | Batas 30cm DTF, rasio 202.0, morphing S-XXL, senter presisi | 100 / 100 | **99** (Raycaster & damped scale aktif) |
| **4. Keandalan Gateway Eksternal** | Duitku webhook idempotency, Fonnte fallback, R2 storage zero egress | 95 / 100 | **97** (Fail-safe & R2 archiving aktif) |
| **5. Hyperlocal UX Makassar** | Gratis ongkir 15 kecamatan, workshop pickup KM 10, invoice WhatsApp | 95 / 100 | **99** (Alur lokal terintegrasi penuh) |
| **6. Komunikasi Realtime & CS** | Live Chat Kamito, presence admin, lonceng notifikasi interaktif | 95 / 100 | **98** (Widget pop-up & hub admin aktif) |

### Skor Kesiapan Keseluruhan Proyek: 98.7 / 100 (SIAP PRODUKSI & SIAP AUDIT LIVE)

---

## 7. CATATAN KEPATUHAN & ATURAN KUNCI ARSITEKTUR

1. **Aturan Deploy/Push Gate:** DILARANG melakukan `git push` atau deploy ke Cloudflare (`npm run deploy`) tanpa instruksi eksplisit dari pemilik proyek (Owner). Seluruh build dan validasi wajib diselesaikan di lingkungan lokal terlebih dahulu.
2. **Aturan Database Edge:** Akses runtime Turso Edge SQLite WAJIB melalui Drizzle ORM + `@libsql/client/web`. Prisma Client HANYA digunakan untuk tooling skema (`prisma db push`), typegen, dan seed.
3. **Batas Fisik Sablon DTF:** Lebar maksimal cetak sablon dada tidak boleh melebihi **30.0 cm** demi mematuhi batas fisik printhead mesin konveksi workshop Makassar.
4. **Isolasi Folder Output Pengujian:** Seluruh artefak hasil eksekusi pengujian E2E WAJIB disimpan secara terpusat di dalam folder `Blueprint/e2e/hasil-pengujian-e2e/<run-stamp>/`.
5. **Kebijakan Bebas Emoji:** Seluruh berkas dokumentasi, kode program, komentar kode, dan output sistem wajib mematuhi aturan ketat tanpa emoji.
