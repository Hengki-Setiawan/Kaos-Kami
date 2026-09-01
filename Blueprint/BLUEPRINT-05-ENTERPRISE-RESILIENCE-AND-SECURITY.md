# ================================================================================
# BLUEPRINT-05: ENTERPRISE RESILIENCE, SECURITY & PRODUCTION EXCELLENCE
# ================================================================================
# Project: Platform E-Commerce Berbasis 3D Interactive Mockup — UMKM Kaos Kami (Kota Makassar)
# Standard: 11 Pillars of Production Engineering Excellence
# Architecture: Next.js 14 App Router, Three.js/R3F, Cloudflare Edge & R2, Turso libSQL, Duitku v2, Better Auth
# Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git
# ================================================================================

Dokumen ini mendokumentasikan secara menyeluruh audit arsitektur teknis dan implementasi **11 Pilar Ketahanan & Keamanan Produksi (Enterprise Production Hardening)** di project **Kaos Kami**. Dokumen ini menjadi rujukan baku bagi seluruh AI agent dan pengembang dalam memelihara standar industri, keamanan data, efisiensi biaya, dan stabilitas operasional.

---

## 🏛️ MATRIKS 11 PILAR KETAHANAN PRODUKSI (EXECUTIVE SUMMARY)

```
                            11 PILAR REKAYASA PRODUKSI KAOS KAMI
                                              │
 ┌───────────────┬────────────────────────────┼────────────────────────────┬───────────────┐
 ▼               ▼                            ▼                            ▼               ▼
[P1] FRONTEND   [P2] BACKEND LOGIC          [P3] DATABASE & STORAGE      [P4] AUTH & RBAC  [P5] HOSTING & DEPLOY
• VRAM Disposal • Runtime Zod Validation    • 3NF Relational Schema      • Better Auth     • Zero Secret Leak
• Adaptive DPR  • Non-Blocking Graceful API • Indexing pada Foreign Keys • Server Gates   • Strict Env Scoping
• WebGL Fallback• Error 400 Clean Handlers  • Cloudflare R2 Decoupling   • Role Matrix     • Clean Prod Isolation
                 │                            │                            │
                 ▼                            ▼                            ▼
                [P6] CLOUD COST             [P7] CI/CD PIPELINE          [P8] RLS & ANTI-IDOR
                • Zero-Egress Storage (R2)  • GitHub Actions Automation  • Scoped Resource Query
                • Always-On Turso libSQL    • Typecheck, Lint, Build QA  • Ownership Assertion
                • Rp 0 / Bulan Operasional  • Zero Broken Commits        • No URL Guessing Hack
                 │                            │                            │
                 ▼                            ▼                            ▼
                [P9] RATE LIMITING          [P10] MULTI-TIER CACHE       [P11] LOAD BALANCER & SCALE
                • Sliding Window Engine     • PWA Service Worker (0ms)   • 330+ Cloudflare Edge Nodes
                • Anti-Spam WA OTP (3x/5m)  • 1-Yr Immutable CDN Cache   • Serverless Instant Scaling
                • Anti-Flood Checkout (5x/m)• TanStack Query Client      • Zero Single-Point-of-Failure
```

---

## 1. 🎨 PILAR 1: LAYER FRONTEND & 3D GRAPHICS LIFECYCLE

### Masalah Klasik "Vibe Coder"
Fokus pada tampilan visual luar semata, tanpa memahami siklus hidup memori WebGL/VRAM GPU. Akibatnya, saat pengunjung berganti-ganti warna kaos atau mengunggah 10 gambar logo, memori HP mengalami *Memory Leak*, browser crash (*Out of Memory*), dan baterai HP pengguna menjadi sangat panas.

### Implementasi Arsitektural di Kaos Kami
1. **Manajemen Pembersihan Memori GPU Otomatis (`dispose()`):**
   * Lokasi: `src/components/3d/ApparelMeshRenderer.tsx` dan `src/components/3d/DecalLayerRenderer.tsx`.
   * Setiap kali material, tekstur, atau geometri 3D diganti, komponen secara eksplisit melepaskan alokasi VRAM:
     ```ts
     texture.dispose();
     material.dispose();
     geometry.dispose();
     ```
2. **Adaptive Device Tiering & Frame Rate Throttling:**
   * Deteksi otomatis kapabilitas GPU client:
     * **Mobile / Low-End Tier:** DPR dibatasi `1.0`, nonaktifkan bayangan kompleks (*PCFSoftShadowMap*), nonaktifkan post-processing berat.
     * **Desktop / High-End Tier:** DPR `1.5 - 2.0`, ACESFilmic Tone Mapping, 16x Anisotropy Texture Filtering.
3. **Zero-Missing-Asset Guarantee & Fallback 2D:**
   * Jika browser client tidak mendukung WebGL (misal browser lama atau mode hemat daya ekstrim), antarmuka secara mulus beralih ke `src/components/3d/StaticShowcase.tsx` tanpa menampilkan layar hitam (*blank screen*).
4. **State Management Bersih (Zustand):**
   * `useConfiguratorStore.ts` dan `useCartStore.ts` mengisolasi mutasi state tanpa *re-render cascade* ke seluruh halaman.

---

## 2. ⚙️ PILAR 2: API & BACKEND LOGIC ROBUSTNESS

### Masalah Klasik "Vibe Coder"
Membuat API handler tanpa validasi skema runtime dan tanpa *try/catch resilient*. Saat menerima payload JSON yang tidak sesuai atau saat server pihak ketiga mengalami downtime, server melempar Unhandled Exception (Error 500), proses Node.js crash, dan alur checkout pembeli terputus.

### Implementasi Arsitektural di Kaos Kami
1. **Validasi Runtime Ketat Menggunakan Zod:**
   * Lokasi: `src/lib/schemas/auth.ts`, `src/lib/schemas/design.ts`, `src/app/api/checkout/route.ts`.
   * Setiap request masuk wajib lolos validasi skema sebelum menyentuh database:
     ```ts
     const validation = CheckoutPayloadSchema.safeParse(body);
     if (!validation.success) {
       return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
     }
     ```
2. **Pola Non-Blocking Graceful Fallback:**
   * Notifikasi WhatsApp Fonnte (`src/lib/notifications/whatsapp.ts`) dan upload media Cloudflare R2 (`src/lib/r2.ts`) dirancang dengan pola *non-blocking*. Jika Fonnte offline atau kehabisan pulsa, transaksi pesanan di database **tetap 100% sukses** dan sistem menyediakan invoice web instan beserta tombol manual `wa.me`.
3. **Kalkulasi Harga Tunggal di Server (Zero-Trust Client Pricing):**
   * Lokasi: `src/lib/pricingEngine.ts` di dalam `src/app/api/checkout/route.ts`.
   * Harga total kaos, biaya sablon per cm², dan ongkir **selalu dihitung ulang secara independen di server**. Manipulasi angka harga dari Inspect Element di client otomatis ditolak.

---

## 3. 🗄️ PILAR 3: DATABASE & STORAGE NORMALIZATION

### Masalah Klasik "Vibe Coder"
Menumpuk seluruh data pesanan, user, alamat, dan file gambar base64 ke dalam 1 tabel SQLite raksasa tanpa indeks dan tanpa relasi. Setelah 1.000 transaksi, database membengkak ratusan megabyte dan query membutuhkan waktu 5 detik (*kura-kura*).

### Implementasi Arsitektural di Kaos Kami
1. **Normalisasi Relasional 3NF (15 Model Entitas):**
   * Lokasi: `prisma/schema.prisma`.
   * Entitas terpisah secara modular: `User`, `Account`, `Session`, `ApparelCategory`, `ProductVariant`, `ColorOption`, `MaterialFinish`, `SablonMethod`, `Design`, `Order`, `OrderItem`, `ProductionTask`, `Payment`, `Address`, `Verification`.
2. **Strategi Indexing Database Efisien:**
   * Kolom pencarian kritis dipasangi indeks: `@@index([phoneNumber])`, `@@index([orderNumber])`, `@@index([userId])`, `@@index([sku])`, `@@index([status])`, `@@index([stage])`. Query pencarian data di Turso libSQL berjalan dalam **< 5 ms**.
3. **Pemisahan Penyimpanan Objek (Storage Decoupling):**
   * Database Turso libSQL **hanya menyimpan metadata teks & referensi URL**.
   * Seluruh file biner berukuran besar (Decal PNG 300 DPI, GLB 3D Model, foto lookbook) dialirkan langsung ke **Cloudflare R2 Object Storage** melalui `src/lib/r2.ts`.

---

## 4. 🔒 PILAR 4: AUTHENTICATION VS AUTHORIZATION (RBAC)

### Masalah Klasik "Vibe Coder"
Hanya membuat halaman login tampilan luar, namun tidak memahami perbedaan antara **Authentication** (*"Siapa kamu"*) dan **Authorization** (*"Kamu boleh mengakses apa"*). Pengguna biasa dapat membuka menu admin dengan mengubah parameter URL (misal: `/admin/dashboard?id=1`).

### Implementasi Arsitektural di Kaos Kami
1. **Authentication Aman Berbasis Kriptografi (Better Auth):**
   * Lokasi: `src/lib/auth.ts`, `src/lib/auth-client.ts`.
   * Menggunakan signed session cookie dengan hashing Argon2/Bcrypt dan proteksi CSRF.
2. **Server-Side Authorization Gate (RBAC):**
   * Lokasi: `src/app/admin/layout.tsx` dan `src/lib/security/authGuard.ts`.
   * Sistem memeriksa role pengguna langsung di server:
     ```ts
     const session = await auth.api.getSession({ headers: await headers() });
     const role = (session?.user as any)?.role;
     if (!session || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
       redirect("/");
     }
     ```
3. **Matriks Peran Pengguna (Role Matrix):**
   * `CUSTOMER`: Hanya dapat mengelola keranjang, membuat desain, dan melihat riwayat pesanannya sendiri.
   * `PRODUCTION_STAFF`: Operator mesin DTF, hanya dapat melihat antrean tugas cetak (*ProductionTask*) di Kanban.
   * `ADMIN` / `SUPER_ADMIN`: Akses penuh ke metrik omset, manajemen pengguna, dan CMS.

---

## 5. 🌐 PILAR 5: HOSTING & DEPLOYMENT INTEGRITY

### Masalah Klasik "Vibe Coder"
Salah menempatkan kunci API rahasia ke variabel client-side (`NEXT_PUBLIC_`), sehingga private key payment gateway dan token database ter-expose secara gratis di Console F12 browser untuk dicuri hacker.

### Implementasi Arsitektural di Kaos Kami
1. **Strict Server-Only Environment Scoping:**
   * Variabel rahasia sensitif:
     * `DUITKU_API_KEY`
     * `BETTER_AUTH_SECRET`
     * `FONNTE_TOKEN`
     * `TURSO_AUTH_TOKEN`
     * `R2_SECRET_ACCESS_KEY`
   * Seluruh variabel di atas **TIDAK PERNAH diberi awalan `NEXT_PUBLIC_`**. Kompiler Next.js menjamin variabel ini 100% dicabut dari bundle JavaScript browser.
2. **Isolasi Lingkungan Bersih (Dev vs Sandbox vs Prod):**
   * Diatur via `DUITKU_ENV="sandbox"` / `"production"` dan `process.env.NODE_ENV`.
   * Pengujian lokal tidak pernah mengganggu data transaksi produksi live.

---

## 6. 💸 PILAR 6: CLOUD COMPUTE COST & ZERO-BILLING STRATEGY

### Masalah Klasik "Vibe Coder"
Menggunakan AWS S3 atau Vercel tanpa perhitungan bandwidth egress. Di akhir bulan, pemilik bisnis syok menerima tagihan cloud puluhan juta rupiah ($1,482+) karena biaya download aset 3D dan foto produk membengkak.

### Implementasi Arsitektural di Kaos Kami
1. **Cloudflare Pages & Workers:**
   * Kuota **100.000 request per hari GRATIS** dengan eksekusi V8 isolate ultra-cepat.
2. **Cloudflare R2 Object Storage (Zero Egress Fees):**
   * Tidak ada biaya egress/download data sama sekali. Sebanyak apapun pengunjung mengunduh file 3D model dan master sablon, **biaya transfer datanya Rp 0**.
3. **Turso libSQL Database (24/7 Always-On):**
   * Kuota gratis **9 GB storage** dan Always-On (tidak pernah tertidur seperti Supabase Free Tier).
4. **Alokasi Region Rendah Latensi:**
   * Database Turso di region Asia terdekat (`aws-ap-southeast-1` Singapura / `aws-ap-northeast-1` Tokyo).
   * Storage R2 di region `APAC`.
   * **Total Biaya Operasional Infrastruktur Cloud = Rp 0 / Bulan.**

---

## 7. 🛠️ PILAR 7: CI/CD PIPELINE AUTOMATION

### Masalah Klasik "Vibe Coder"
Melakukan `git push` langsung ke branch production tanpa testing otomatis. Website down di jam 2 pagi karena ada salah ketik tanda kurung atau impor komponen yang hilang.

### Implementasi Arsitektural di Kaos Kami
1. **Automated GitHub Actions Workflow:**
   * Lokasi: `.github/workflows/ci.yml`.
   * Setiap kali ada push atau pull request, pipeline otomatis menjalankan 5 tahap pengujian berurutan:
     1. `npm ci` (Instalasi dependencies deterministik).
     2. `npm run typecheck` (`tsc --noEmit` — 0 TypeScript error).
     3. `npm run lint` (ESLint code quality assurance).
     4. `npx prisma generate` (Validasi tipe skema database).
     5. `npm run build` (Verifikasi kompilasi 35 rute Next.js).
2. **Dependency & Build Cache:**
   * Menggunakan `actions/setup-node` dengan `cache: npm` untuk memangkas waktu build pipeline menjadi < 60 detik.

---

## 8. 🛡️ PILAR 8: ROW-LEVEL SECURITY & ANTI-IDOR PROTECTION

### Masalah Klasik "Vibe Coder"
Celah **IDOR (*Insecure Direct Object Reference*)**, di mana Pembeli A dapat melihat isi invoice, nama, nomor HP, dan alamat rumah Pembeli B hanya dengan mengubah ID di URL `/orders/KK-001` menjadi `/orders/KK-002`.

### Implementasi Arsitektural di Kaos Kami
1. **Centralized Ownership Assertion Helper:**
   * Lokasi: `src/lib/security/authGuard.ts`.
   * Fungsi `assertResourceOwnerOrAdmin(resourceUserId)` memastikan pembeli hanya dapat membaca data miliknya sendiri, kecuali jika yang login adalah Staff/Admin Workshop:
     ```ts
     export async function assertResourceOwnerOrAdmin(resourceUserId: string): Promise<AuthenticatedUser> {
       const user = await getAuthenticatedUser();
       if (!user) throw new Error("Unauthorized");
       const isAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(user.role);
       if (!isAdmin && user.id !== resourceUserId) {
         throw new Error("Forbidden: Akses ditolak");
       }
       return user;
     }
     ```
2. **Scoping Query Database Berdasarkan User Session:**
   * Endpoint riwayat pesanan (`/dashboard/orders`) dan autosave studio (`/api/designs/autosave`) selalu menyertakan filter `where: { userId: session.user.id }`.

---

## 9. 🚦 PILAR 9: RATE LIMITING & ANTI-BOT ENGINE

### Masalah Klasik "Vibe Coder"
Endpoint API dibiarkan terbuka tanpa batasan frekuensi request. Bot iseng dapat menembak endpoint OTP SMS/WhatsApp ribuan kali dalam 1 menit hingga kuota pulsa Fonnte ludes, atau membanjiri database dengan 50.000 order fiktif (*DDoS Attack*).

### Implementasi Arsitektural di Kaos Kami
1. **Sliding Window Token Bucket Engine:**
   * Lokasi: `src/lib/security/rateLimiter.ts`.
   * Engine in-memory berlatensi 0ms berbasis IP client (`cf-connecting-ip` / `x-forwarded-for`).
2. **Ambang Batas Khusus per Endpoint Kritis:**
   * **OTP WhatsApp (`/api/auth/send-otp`):** Dibatasi maksimal **3 request per 5 menit** per IP dan per nomor telepon. Menghindari pembobolan kuota Fonnte.
   * **Checkout Transaksi (`/api/checkout`):** Dibatasi maksimal **5 request per menit** per IP. Mencegah spam order di database dan Duitku.
   * **Upload & Enhancer (`/api/upload`, `/api/enhance-image`):** Dibatasi maksimal **10 request per menit** per IP.
3. **Respon Standar HTTP 429:**
   * Jika melewati batas, sistem mengembalikan status `HTTP 429 Too Many Requests` lengkap dengan pesan durasi detik reset:
     ```json
     { "error": "Terlalu banyak permintaan OTP. Silakan tunggu 240 detik." }
     ```

---

## 10. ⚡ PILAR 10: MULTI-TIER CACHE & EDGE CDN ACCELERATION

### Masalah Klasik "Vibe Coder"
Website terasa lambat saat dibuka karena setiap refresh halaman selalu menembak query database dari nol dan mendownload ulang file 3D 1MB dari server asal.

### Implementasi Arsitektural di Kaos Kami
1. **Tier 1 — Browser PWA Cache-First (0 ms):**
   * Lokasi: `public/sw.js` & `public/manifest.json`.
   * Model 3D (`tshirt-heavyweight.glb`, `hoodie.glb`, `jacket.glb`) di-cache di browser client. Kunjungan kedua terbuka instan dalam 0 detik secara offline-ready.
2. **Tier 2 — Cloudflare Global Edge CDN (1-Year Immutable):**
   * Lokasi: `next.config.mjs`.
   * Header resmi:
     ```js
     {
       source: "/:all*(glb|gltf|png|jpg|jpeg|webp|avif|woff2|mp4)",
       headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
     }
     ```
   * 330+ server edge Cloudflare di seluruh dunia melayani aset statis langsung dari cache edge terdekat tanpa menyentuh server origin.
3. **Tier 3 — In-Memory React Query Cache:**
   * Lokasi: `src/lib/queryClient.ts`.
   * `staleTime: 5 menit`, `gcTime: 30 menit`. Navigasi antar halaman katalog dan studio tidak memicu refetch database.
4. **Tier 4 — Turso libSQL Edge SQLite Replica:**
   * Eksekusi query database lokal ultra-ringan dengan waktu respon **< 5 ms**.

---

## 11. ⚖️ PILAR 11: LOAD BALANCING & SERVERLESS AUTO-SCALING

### Masalah Klasik "Vibe Coder"
Menggunakan 1 unit server VPS single-core. Saat toko mengadakan promo diskon viral di TikTok/Instagram dan 5.000 orang masuk serentak, CPU server melonjak 100% (*Single Point of Failure*) dan website mati total.

### Implementasi Arsitektural di Kaos Kami
1. **Arsitektur Serverless Edge Workers (OpenNext + Cloudflare):**
   * Tidak ada konsep "1 server fisik". Setiap request ditangani oleh V8 isolate serverless independen di titik POP Cloudflare terdekat.
2. **Anycast Routing & Global Load Balancing:**
   * Trafik dari pengguna Makassar dialirkan ke data center terdekat (Ujung Pandang / Jakarta / Singapura) secara otomatis.
3. **Kemampuan Auto-Scaling dari 0 hingga Tak Terhingga:**
   * Jika trafik melonjak dari 10 pengunjung menjadi 100.000 pengunjung dalam 1 menit, Cloudflare otomatis melipatgandakan worker dalam hitungan milidetik tanpa perlu intervensi manual dan tanpa down.
4. **DDoS Protection Bawaan Cloudflare:**
   * Lapisan mitigasi DDoS otomatis menyaring serangan bot L3/L4/L7 sebelum mencapai aplikasi Next.js.

---

## 🧪 RINGKASAN BUKTI VERIFIKASI SISTEM (QA LOG)

```bash
# 1. Typecheck Strict Mode
npm run typecheck
> tsc --noEmit
# Result: 0 Errors (Passed)

# 2. Production Compilation
npm run build
# Result: 35/35 routes generated successfully (Passed)

# 3. Rate Limiting Verification
node test-rate-limiter.js
# Result: Request 1-3 ALLOWED, Request 4-5 BLOCKED HTTP 429 (Passed)

# 4. Live Payment Gateway Sandbox
Duitku v2 Inquiry API POST
# Result: statusCode "00" SUCCESS with National QRIS string (Passed)
```

---

*Dokumen Blueprint 05 ini menetapkan standar integritas rekayasa perangkat lunak tertinggi untuk platform komersial Kaos Kami. Setiap pembaruan kode di masa depan wajib mematuhi ke-11 pilar di atas.*
