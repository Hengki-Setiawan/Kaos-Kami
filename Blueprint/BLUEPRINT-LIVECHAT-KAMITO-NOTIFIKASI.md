# BLUEPRINT SISTEM KOMUNIKASI REALTIME, MASKOT KAMITO, & NOTIFIKASI
## Platform E-Commerce Apparel 3D Interaktif & Sablon DTF Kaos Kami — Kota Makassar
### Berkas Arsitektur, Spesifikasi Kontrak API, dan Panduan Integrasi User & Admin

---

## 1. RINGKASAN EKSEKUTIF & IDENTITAS MASKOT RESMI

Platform Kaos Kami kini dilengkapi dengan ekosistem komunikasi dua arah dan pusat notifikasi terintegrasi yang menghubungkan pembeli (User) dengan pengelola workshop (Admin). Fitur ini mengeliminasi kesenjangan komunikasi saat pelanggan melakukan kustomisasi di Studio 3D, memantau status sablon DTF, ataupun mengajukan pertanyaan dan komplain terkait pesanan konveksi.

### 1.1 Identitas Karakter Maskot: Kamito
- **Nama Karakter:** Kamito
- **Peran:** Asisten Resmi Workshop & Layanan Pelanggan Kaos Kami Makassar
- **Aset Visual:** Berkas asli di repositori lokal `kaos-kami-web/public/mascot/`
  - Avatar Utama: `/mascot/mascot-primary.png`
  - Varian Sablon: `/mascot/mascot-sablon.png`
  - Varian Cool: `/mascot/mascot-cool.png`
  - Lambang Toko: `/mascot/logo-emblem.png`
- **Gaya Komunikasi:** Ramah, informatif, sigap, dan berfokus pada standar teknis sablon DTF (resolusi 300 DPI, batas cetak 30 cm, bahan Combed 24s/30s, dan jam kerja workshop Makassar).

---

## 2. TOPOLOGI BASIS DATA & MODEL DATA RUNTIME

Tabel percakapan dan status kehadiran (*presence*) telah aktif di Turso Edge SQLite dan disinkronkan ke Drizzle ORM (`src/lib/drizzle-schema.ts`) serta Prisma Schema (`prisma/schema.prisma`).

### 2.1 Skema Tabel `ChatMessage`
Menyimpan setiap butir pesan percakapan antara pelanggan, admin workshop, dan bot Kamito:

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Format identifier acak unik (misal: `chat_<timestamp>_<random>`) |
| `senderId` | `TEXT NOT NULL` | Relasi ke `User.id` pengirim atau `kamito_mascot` untuk bot |
| `senderName` | `TEXT` | Nama tampilan pengirim saat pesan dikirim |
| `senderRole` | `TEXT NOT NULL` | Nilai: `'CUSTOMER'`, `'ADMIN'`, atau `'BOT'` |
| `receiverId` | `TEXT` | `null` jika ditujukan ke tim workshop; berisi ID pelanggan jika balasan admin |
| `orderId` | `TEXT` | Opsional: menautkan percakapan dengan ID pesanan tertentu |
| `content` | `TEXT NOT NULL` | Teks pesan (disanitasi dari tag HTML untuk proteksi XSS, maks 2000 karakter) |
| `attachments`| `TEXT` | JSON array berisi tautan foto/lampiran Cloudflare R2 |
| `isRead` | `INTEGER` | Nilai boolean: `0` (belum dibaca), `1` (sudah dibaca) |
| `createdAt` | `TEXT NOT NULL` | Tanggal pencatatan waktu format ISO-8601 |
| `updatedAt` | `TEXT NOT NULL` | Tanggal pembaruan pesan |

Indeks aktif: `idx_chat_sender`, `idx_chat_receiver`, `idx_chat_created`, `idx_chat_order`.

### 2.2 Skema Tabel `UserPresence`
Melacak aktivitas dan waktu aktif terakhir pengelola workshop dan pelanggan:

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `userId` | `TEXT PRIMARY KEY` | ID pengguna unik |
| `userName` | `TEXT` | Nama pengguna |
| `role` | `TEXT NOT NULL` | Peran pengguna (`'CUSTOMER'` atau `'ADMIN'`) |
| `lastSeenAt` | `TEXT NOT NULL` | Timestamp aktivitas terakhir |
| `isOnline` | `INTEGER` | Nilai status online (`1` = aktif dalam 4 menit terakhir, `0` = nonaktif) |
| `deviceInfo` | `TEXT` | Keterangan perangkat (opsional) |

Indeks aktif: `idx_presence_role`, `idx_presence_lastSeen`.

---

## 3. INTEGRASI ANTARMUKA PENGGUNA (USER JOURNEY)

### 3.1 Widget Chat Mengambang (Kamito Chat Widget)
- **Komponen:** `src/components/chat/KamitoChatWidget.tsx`
- **Lokasi Pemasangan:** Diinjeksi secara global di `src/app/layout.tsx` di dalam `DesignSyncProvider`.
- **Tampilan Tombol Mengambang (Floating Button):**
  - Terletak di pojok kanan bawah (`bottom-5 right-5 z-40`).
  - Menampilkan avatar visual maskot Kamito dengan titik status online berkedip hijau.
  - Teks pill: "TANYA KAMITO • CS".
  - Badge angka merah menyala jika terdapat pesan masuk baru yang belum dibaca dari admin.
- **Tampilan Jendela Percakapan (Chat Window):**
  - Desain bertema *streetwear dark obsidian* dengan efek *glassmorphism* kaca buram (tanpa kesan template pasaran).
  - Header interaktif: Nama Kamito, badge "WORKSHOP MAKASSAR", indikator presisi ("Online sekarang" atau "Aktif X menit lalu"), dan tombol WhatsApp CS sebagai jalan keluar darurat (*fail-safe*).
  - Baris informasi jam operasional: "Workshop: 09.00 - 21.00 WITA".
  - Gelembung pesan:
    - Pesan pelanggan berada di sisi kanan dengan latar belakang *brand accent* dan tanda centang keterbacaan (*double checkmark*).
    - Pesan admin/Kamito berada di sisi kiri disertai avatar Kamito dan label peran.
  - Sambutan ramah otomatis: Pesan pertama dari pelanggan langsung direspons oleh bot Kamito untuk memberi kepastian bahwa pertanyaan telah diteruskan ke meja operator cetak.
  - Tombol pintas (*quick prompts*): Pertanyaan umum terkait durasi sablon, resolusi gambar 300 DPI, gratis ongkir Makassar, dan sablon lengan.
  - Form kirim pesan: Mendukung tombol `Enter` untuk mengirim dan `Shift+Enter` untuk baris baru.

### 3.2 Lonceng Notifikasi Interaktif Pengguna (User Notification Bell)
- **Komponen:** `src/components/ui/UserNotificationBell.tsx`
- **Lokasi Pemasangan:** Pojok kanan atas bilah navigasi utama (`src/components/ui/Navbar.tsx`).
- **Fitur Popover Dropdown:**
  - Menampilkan jumlah notifikasi belum dibaca pada lencana merah.
  - Saat diklik, membuka panel melayang yang menggabungkan:
    1. Notifikasi pesanan (`type: "order"`): Status review desain, konfirmasi bayar, proses sablon DTF, nomor resi pengiriman.
    2. Notifikasi chat (`type: "chat"`): Pesan baru dari Kamito atau operator workshop.
  - Tombol "Tandai dibaca" untuk memperbarui status baca lokal dan server.
  - Tautan langsung pada setiap baris untuk melompat ke rincian pesanan atau membuka widget chat Kamito.

### 3.3 Tombol Tanya CS pada Setiap Kartu Pesanan
- **Komponen:** `src/components/commerce/CustomerDashboardView.tsx`
- Pada daftar pesanan pembeli di `/dashboard/orders`, setiap kartu pesanan memiliki tombol "TANYA CS".
- Saat tombol ditekan, sistem memicu *event* kustom `open-kamito-chat` dengan melampirkan nomor pesanan (contoh: `#KK-20260927-001`), sehingga input obrolan langsung terisi konteks nomor pesanan yang sedang dibahas.

---

## 4. INTEGRASI ANTARMUKA PENGELOLA (ADMIN JOURNEY)

### 4.1 Konsol Pusat Chat Admin (Admin Chat Manager)
- **Komponen:** `src/components/admin/AdminChatManager.tsx`
- **Halaman Khusus:** `/admin/chat` (`src/app/admin/chat/page.tsx`)
- **Tautan Sidebar:** Terdaftar pada pilar E-Commerce & Admin di `src/components/admin/AdminNav.tsx` dengan label "LIVE CHAT PELANGGAN".
- **Tata Letak Dua Panel:**
  1. **Panel Kiri (Daftar Percakapan):**
     - Kotak pencarian pelanggan berdasarkan nama, email, atau nomor telepon.
     - Daftar percakapan yang diurutkan berdasarkan waktu pesan terbaru.
     - Indikator status kehadiran pelanggan (titik hijau = online, abu-abu = offline).
     - Cuplikan isi pesan terakhir dan lencana merah jumlah pesan belum dibaca.
  2. **Panel Kanan (Ruang Percakapan Aktif):**
     - Header profil pelanggan: Nama lengkap, email, nomor telepon (dengan tautan langsung ke WhatsApp `wa.me`), status online, dan tombol pintas "Lihat Pesanan".
     - Aliran percakapan dua arah secara langsung.
     - Baris *Template Balasan Cepat* untuk mempercepat respons operator:
       - Konfirmasi review desain sedang berjalan di workshop.
       - Permintaan kirim ulang file gambar resolusi minimal 300 DPI.
       - Pemberitahuan sablon DTF selesai dipres dan masuk tahap packing.
       - Pemberitahuan paket diserahkan ke kurir pengiriman Kota Makassar.
     - Bidang teks balasan yang mengirim pesan atas nama "Kamito / Admin Workshop".

### 4.2 Integrasi Lonceng Notifikasi Admin (AdminBell)
- **Komponen:** `src/components/admin/AdminBell.tsx`
- **Pembaruan Metrik:**
  - Mengambil data dari `GET /api/admin/notifications/summary`.
  - Menghitung metrik baru `unreadChatCount` (jumlah pesan masuk dari pembeli yang belum dibaca).
  - Lonceng admin otomatis membunyikan nada dering notifikasi pendek saat ada pesan baru atau pesanan masuk.
  - Dropdown lonceng menampilkan baris "Chat masuk pelanggan" dengan penanda bahaya jika nilai > 0, serta tautan langsung menuju `/admin/chat`.

---

## 5. SPESIFIKASI KONTRAK API

### 5.1 Endpoint Status Kehadiran (`/api/chat/presence`)
- **GET `/api/chat/presence`**
  - Akses: Publik / Pelanggan
  - Respons:
    ```json
    {
      "success": true,
      "isAdminOnline": true,
      "lastSeenText": "Online sekarang",
      "lastSeenAt": "2026-09-27T18:00:00.000Z",
      "isShopOpen": true,
      "shopHoursLabel": "Setiap Hari 09.00–21.00 WITA",
      "mascot": {
        "name": "Kamito",
        "role": "Asisten Workshop Kaos Kami",
        "avatarUrl": "/mascot/mascot-primary.png"
      }
    }
    ```
- **POST `/api/chat/presence`**
  - Akses: Pengguna Terotentikasi (Sesi)
  - Fungsi: Mengirimkan detak jantung (*heartbeat*) bahwa pengguna/admin sedang aktif membuka aplikasi.

### 5.2 Endpoint Pesan Percakapan (`/api/chat/messages`)
- **GET `/api/chat/messages`**
  - Parameter Query: `userId` (wajib untuk admin yang membuka obrolan pelanggan tertentu; diabaikan untuk pelanggan yang membaca pesan miliknya sendiri).
  - Fungsi: Mengembalikan daftar riwayat pesan terurut waktu dan otomatis menandai pesan yang belum dibaca menjadi terbaca (`isRead: true`).
- **POST `/api/chat/messages`**
  - Akses: Pengguna Terotentikasi
  - Proteksi: *Rate limiter* 20 pesan per menit per ID pengguna.
  - Payload Pelanggan:
    ```json
    {
      "content": "Halo Kamito, apakah file PNG saya sudah cukup tajam untuk cetak A3?",
      "orderId": "clxxxxxx"
    }
    ```
  - Payload Balasan Admin:
    ```json
    {
      "receiverId": "usr_customer_id",
      "content": "File sudah tajam dan resolusi sesuai standar 300 DPI ya kak!"
    }
    ```

### 5.3 Endpoint Daftar Percakapan Admin (`/api/chat/threads`)
- **GET `/api/chat/threads`**
  - Akses: Khusus Role Admin (`ADMIN`, `SUPER_ADMIN`, `PRODUCTION_STAFF`).
  - Fungsi: Merangkum seluruh pelanggan yang pernah mengirim pesan, menghitung jumlah pesan belum dibaca per pelanggan, dan memeriksa status online masing-masing.

### 5.4 Endpoint Notifikasi Terintegrasi (`/api/notifications`)
- **GET `/api/notifications`**
  - Mengembalikan daftar gabungan antara `OrderStatusEvent` (pembaruan pesanan) dan `ChatMessage` (pesan baru dari Kamito/Admin) milik pelanggan yang sedang masuk.
- **POST `/api/notifications`**
  - Menandai seluruh pesan notifikasi pelanggan sebagai telah dibaca.

### 5.5 Endpoint Ringkasan Notifikasi Admin (`/api/admin/notifications/summary`)
- Mengembalikan metrik gabungan operasional workshop:
  - `needsReview`: Pesan sablon berstatus `DESIGN_REVIEW`.
  - `unreadChatCount`: Pesan chat masuk dari pelanggan yang belum dibalas.
  - `complaintsOpen`: Jumlah komplain terbuka.
  - `newOrdersLastHour`: Pesan baru dalam satu jam terakhir.

---

## 6. VALIDASI & PENGUJIAN MUTU OTOMATIS

Seluruh kode yang dibuat telah melalui validasi ketat:

1. **Pemeriksaan Kompilasi TypeScript (`tsc --noEmit`):**
   - Hasil: 0 galat (Clean build).
2. **Pengujian Unit Vitest (`src/lib/chatGuards.test.ts`):**
   - Sanitasi input XSS: Berhasil mengubah tag HTML menjadi entitas teks aman.
   - Validasi panjang pesan: Menolak string kosong dan membatasi maksimal 2000 karakter.
   - Kalkulasi status kehadiran: Memverifikasi ambang batas 4 menit untuk status online dan format relatif untuk offline.
3. **Hasil Suite Vitest Keseluruhan:**
   - 24 berkas uji lulus 100% (24/24 passed).
   - 169 pengujian fungsional lulus 100% (169/169 passed).
4. **Kepatuhan Aturan Non-Negosiasi:**
   - Dilarang Menggunakan Emoji: 100% dipatuhi (seluruh teks antarmuka, komentar, dan berkas bebas emoji).
   - Aturan Deploy/Push Gate: Tidak ada perintah `git push` atau `wrangler deploy` yang dijalankan tanpa perintah eksplisit pemilik proyek.
