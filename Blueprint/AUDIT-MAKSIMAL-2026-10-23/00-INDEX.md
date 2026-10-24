# 🔍 AUDIT MAKSIMAL PROYEK KAOS KAMI — 23 Oktober 2026

> Audit menyeluruh read-only oleh 9 auditor independen + verifikasi build nyata + riset internet.
> Metode: bukti-first (setiap klaim punya `file:line`), anti-sycophancy (6 pilar AGENTS.md dihormati), nol persentase spekulatif — semua progres dinyatakan dalam hitungan temuan nyata.

---

## 1. Cakupan & Metodologi

| Area | Auditor | Status |
|---|---|---|
| Landing page + SEO + UI publik | Auditor 1 (`01-`) | ✅ 20 temuan |
| 3D Studio + pipeline decal→order | Auditor 2 (`02-`) | ✅ 12 temuan |
| Admin dashboard + backoffice + RBAC | Auditor 3 (`03-`) | ✅ 15 temuan |
| User dashboard + checkout + pembayaran | Auditor 4 (`04-`) | ✅ 15 temuan (3 BLOCKER) |
| API + keamanan (92 route) | Auditor 5 (`05-`) | ✅ 13 temuan (2 BLOCKER) |
| Data layer (Turso/Drizzle/Prisma 26 tabel) | Auditor 6 (`06-`) | ✅ 13 temuan (2 BLOCKER) |
| Integrasi + cron + shipping | Auditor 7 (`07-`) | ✅ 21 temuan (1 BLOCKER) |
| Mobile Capacitor 8 | Auditor 8 (`08-`) | ✅ 13 temuan (1 MAJOR rentetan) |
| Infra + docs + CI + scripts + repo health | Auditor 9 (`09-`) | ✅ 15 temuan |
| Rencana perbaikan P0/P1/P2 | Sintesis (`10-`) | ✅ urutan kerja |

**Verifikasi nyata dijalankan di sesi ini (bukan klaim):**
- `tsc --noEmit` web → **0 error** (bersih)
- `tsc -p kaos-kami-mobile` → **0 error** (bersih)
- `vitest run` web → **4 GAGAL / 228 lulus** (semua di `src/lib/zIndexHierarchy.test.ts` — hierarki z-index `Z_AUTH/Z_POPOVER/Z_QRIS/Z_TOAST` tidak sesuai kontrak di `zIndex.ts`)
- `npm audit --omit=dev` → **7 kerentanan (3 critical, 4 high)** — detail & konteks risiko di `09-INFRA-DOCS-CI.md` §B
- `npm ls` trace → `dompurify` berasal dari `jspdf@4.2.1` (client-side), `sharp` dari `next` + `@gltf-transform/cli`

**Riset internet dipakai untuk silang-cek (sumber docs resmi):**
- **iPaymu v2** (`docs.ipaymu.com`): signature request = `HMAC-SHA256(Method + ":" + VA + ":" + SHA256(body) + ":" + APIKey)`; callback wajib verifikasi `X-Signature` (kunci = **nomor VA**), normalisasi tipe → sort keys A-Z → JSON → HMAC; **idempotensi wajib** (server iPaymu retry jika bukan 200); **QRIS default expired 5 MENIT**; production mensyaratkan IP statis + domain terdaftar; `transaction_status_code` 1 = settled, 6 = received.
- **Fonnte** (`docs.fonnte.com`): `POST api.fonnte.com/send`, header `Authorization: <token>` (tanpa Bearer), file maks 4MB, ada kuota, ada masalah "Reach-out Time-lock" (nomor baru diblok kirim pertama — user harus chat dulu ke nomor).
- **Duitku**: MD5 MD5 callback **obsolete** (kini HMAC-SHA256) — tapi Duitku **sudah tidak dipakai** (0 referensi di `src/`, terkonfirmasi grep). Hanya jejak di `.env` legacy, workflows e2e, dan stub mobile.

---

## 2. Peta Temuan Berbobot (semua butir punya bukti di file area)

### 🔴 BLOCKER — perbaiki SEBELUM apa pun (P0)
| # | Temuan | Kode audit | Dikonfirmasi oleh |
|---|---|---|---|
| B1 | **Login admin tanpa kredensial di PRODUKSI**: PIN hardcoded `164164` → sesi SUPER_ADMIN 30 hari (`api/auth/pin-bypass/route.ts:23-37,124-171`) — tanpa gate NODE_ENV, tanpa rate limit | `05-` #1, `04-` F3 | 2 auditor |
| B2 | **Webhook iPaymu fail-open + guard nominal bisa dilewati** → order bisa dibuat lunas gratis (`api/webhooks/ipaymu/route.ts:39-41,88,116`) — kontras docs resmi iPaymu yang wajib verifikasi `X-Signature` (kunci VA) | `05-` #2, `04-` F2, `07-` #11 | 3 auditor + docs resmi |
| B3 | **Charge QRIS PALSU saat API iPaymu gagal** tapi respons diklaim `"00" SUCCESS` — QR dibuat sendiri tanpa CRC/TLV valid, dirender via pihak ketiga `api.qrserver.com` (`lib/payments/ipaymu.ts:160-207`) | `04-` F1, `07-` #10 | 2 auditor |
| B4 | **Turnstile dummy token `"XXXX.DUMMY."` lolos di produksi** (`src/lib/turnstile.ts:21-24`) + `send-email-otp` Turnstile opsional (`route.ts:53`) | `04-` F4/F5, `07-` #3 | 2 auditor |
| B5 | **Folder migrasi DB rusak**: `0001_init/migration.sql` tersimpan UTF-16LE (Prisma baca UTF-8 → gagal/salah parsing), DDL tak memuat ±10 tabel + 4 kolom yang ada di schema; 0002 "belum diapply" — recovery/onboarding DB **tidak reproducible dari repo** | `06-` (c)1 | 1 auditor, diverifikasi header byte |
| B6 | **Zero transaksi/batch di jalur uang**: checkout = ±6 tulisan beruntun (Order→OrderItem→Design→Update→Event→Payment) hanya dikompensasi try/catch hapus yatim; `confirmOrderPaid` juga beruntun (RUNBOOK §6: interactive `db.transaction()` memang tak didukung `@libsql/client/web`) | `06-` (c)2 | 1 auditor; disebut RUNBOOK |
| B7 | **Klaim clamp 30cm TIDAK ditegakkan**: `scaleCalibration.ts:91-93,283-284` = **35.0 cm**; klaim "Maksimal 30.0 cm" hanya komentar `:512`; test mengunci 35 (`scaleSnapshot.test.ts:20`) — AGENTS.md §3 & FAQ menjanjikan 30. Mobil `masterNotify.ts` malah clamp 35 | `02-` #1 | 1 auditor + tracker 3D |
| B8 | **Checkout mobile hanya kirim 1 decal** (front/back) per item sementara cart web simpan hingga 10 lapis × 7 sisi — desain lengan/rusuk/hood TIDAK terkirim ke produksi (`CheckoutSheet.tsx:498-521`; helper paritas sudah ditulis tapi 0 pemakaian) | `08-` #3 | 1 auditor |

### 🟠 MAJOR — kerusakan uang/data/kepercayaan (P0-P1)
Kelompok yang terpilih lintas-auditor (detail lengkap per file area):
- **Muang & pembayaran:** pengiriman ongkir web silently turun ke kurir lain berbeda harga vs mobile yang 400 eksplisit (`07-` #1, `04-` M3 — 2 auditor) · `IPAYMU_ENV` default **production** bila unset (`ipaymu.ts:48`) · `checkTransactionStatus` tanpa timeout & tanpa `res.ok` (`ipaymu.ts:263-287`)
- **Ubool/opsi telapak:** `phoneVerified: true` ditulis tanpa OTP di 2 jalur (tamu & ready-stock) (`06-` #5, `04-` M6 — 2 auditor) · enumbuster `SETTLED` vs `SETTLEMENT`, provider `ADMIN_BYPASS` di luar enum (`06-` #7/8, `04-` M7 — 2 auditor)
- **Integritas stok & keuangan:** stok TIDAK dikembalikan saat refund (`06-` #3) · MatrixStockGrid kirim `stockQty` absolut vs jalur `delta` anti-race yang sudah disediakan API (`03-` MAJOR-4) · oversell hanya diberi `[REVIEW:OVERSELL]` tanpa WA (sesuai kebijakan OTP-only, tapi perlu proses manual jelas)
- **Kebocoran data sensitif:** `passwordHash` ikut payload RSC halaman admin (`03-` MAJOR-1) · `maskPhone` diimpor tapi tak pernah dipanggil di `/api/admin/orders` — PII mentah ke staff/COURIER (`03-` MAJOR-2) · enumeration email via `resolve-identifier` & `send-email-otp` 409 (`05-` #3) · IDOR chat guest (GET/POST sembrono `guestId`) (`05-` #4) · `proxy-image` open relay tanpa RL/cap/type-check (`05-` #5)
- **Admin gate:** 6 halaman server admin tanpa guard internal + layout gate kasar untuk PRODUCTION_STAFF/COURIER (`03-` MAJOR-5) · PATCH complaints tanpa zod/404/RL (`03-` MAJOR-6) · master-data PATCH `statusType` tanpa `name` bisa mengosongkan nama kategori publik (`03-` MAJOR-3)
- **Rate limiting:** limiter fail-open per-isolate bila KV gagal; OTP jalur tetap jalan (`05-` #6)
- **3D studio:** zod autosave & desain menolak `side_left/side_right` → 400 senyap + loop status error (`02-` #2) · draf kerja tidak pulih otomatis + pill "Autosave aktif" menyesatkan (`02-` #5) · skala visual S–XXL ±15% tidak masuk hitungan cm (`02-` #6) · tanpa cek byte upload di klien (freeze/quota LS, 400 terlambat) (`02-` #4) · docstring printTiers lawas (A3 35k) vs kode 30k + test (`02-` #3)
- **Checkout UX:** ReorderButton menulis Cart DB yang tidak pernah dibaca UI (SSOT cart = zustand LS) (`04-` F6) · sessionStorage QRIS restore dead-code (`04-` F7) · RepayButton mobile tanpa totalAmountIdr → modal "Rp 0" (`04-` M4)
- **Mobile:** Turnstile tidak pernah dikirim → mode darurat server mematikan checkout APK (`08-` #4) · `assetlinks.json` placeholder (App Links tak bisa verifikasi) (`08-` #2) · nomor WA CS mobile ≠ web ≠ landing (3 nomor berbeda) (`08-` #1, `01-` #5) · versionCode statis (`08-` #5)
- **Integrasi/cron:** sweep reconcile tidak sesuai RUNBOOK (order tanpa Payment tak pernah dicek; ref regex melewatkan fallback) (`07-` #5/7) · Fonnte send & R2 PUT/DELETE tanpa timeout (`07-` #15/17) · health Fonnte fail-open (`07-` #18)
- **Landing/SEO:** canonical `" / "` global memukulkan seluruh subhalaman ke beranda (`01-` #1 — BLOCKER SEO tapi MAJOR-level di daftar ini karena can fix) · three.js terimpor statis di first-load (`01-` #2) · `/catalog` kosong di SSR (`01-` #4) · harga konflik JsonLd 79k vs APPAREL_CATALOG 59k (`01-` #7) · dark: Tailwind vs `[data-theme]` tabrakan (`01-` #10)
- **Infra:** CSP `connect-src` hash bucket R2 ≠ `wrangler.jsonc R2_PUBLIC_URL` (satu pasti stale) (`09-` #1) · komentar `images.unoptimized` kontradiktif (`09-` #3) · klaim Draco rantai tapi decoder folder tak ada & file draco dihapus (`09-` #2, `02-` #7) · ±24 file Blueprint dirujuk tapi hilang termasuk SSOT pengujian yang di-acu CI (`09-` #4) · ~50MB mascot mentah di git (`09-` #6) · chain-of-custody lisensi terputus ke file hilang (`09-` #5)

### 🟡 MINOR — polish & jujur-dokumentasi (P2)
±50 butir tersebar: timezone WITA vs WIB (`04-` M1), OTP email ke console.log (`07-` #21), default `IPAYMU_ENV`, drako wired ke folder mati + fallback usang 101.8/30.0 literal (`02-` #7/10/11), dispose membuang tekstur shared cache (`02-` #8), listener gizmo tak lepas saat unmount mid-drag (`02-` #9), eksemplar notifikasi palsu "Selamat Datang", share URL `designId` palsu AR (`08-` #11-12), badge biometrik tidak menggerbangkan apa pun (`08-` #10), AR AI default AKTIF vs komentar "MATI" (`08-` #6), polling notifikasi 60s + `userId` mentah — perlu cek server-side binding (`08-` #7), kontras & heading hierarchy landing, CSV/ekspror, komponen duplikat, dll. — daftar penuh di file area masing-masing.

---

## 3. Status 3 Warna (jujur, tanpa persentase)

| Lapisan | Status |
|---|---|
| Alur bisnis inti (order → produksi → kirim) | 🟢 berjalan; 🟠 berumung kriitis di checkpoint uang (checkout/webhook) |
| Keamanan sesi/role admin API | 🟢 24/24 route admin terverifikasi cek sesi+role, fail-closed; 🔴 pintu samping `pin-bypass` justru anomali besar |
| Keamanan pembayaran | 🔴 perlu perbaikan panggung-1 (B2, B3, B4) |
| Data layer | 🟠 skema hidup digerakkan db push + sync runtime (tanpa transaksi); folder migrasi mati |
| 3D studio fisika & pipeline | 🟠 inti aman (kalibrasi 202.0 konsisten, clone géometri, dispose disiplin); kontrak 30cm & skema validasi roboh |
| Mobile | 🟠 alur inti & keamanan WebView bagus; paritas checkout & App Links bermasalah |
| Landing & SEO | 🟠 visual & copy bagus; canonical global + SSR kosong merusak indeks |
| Infra & docs | 🟠 konfigurasi produksi solid; doc & CI banyak menipu (klaim file/aset yang hilang) |
| Test & CI | 🟠 vitest 232 test — 4 gagal; CI exist tapi e2e DRAFT men-acu SSOT hilang |

> Status maksimum yang boleh diclaim tanpa verifikasi fisik owner: **"AUDIT SELESAI — MENUNGGU VERIFIKASI & KEPUTUSAN OWNER"**. Tidak ada kode diubah di sesi ini (read-only).

---

## 4. Urutan Kerja Sarankan (detail di `10-RENCANA-PERBAIKAN.md`)

**P0 (hari ini, jalur uang):** B1 pin-bypass → B2 webhook fail-closed → B3 hapus QRIS palsu → B4 Turnstile gate NODE_ENV → B5+B6 (migrasi & batch `client.batch()`) → satu SSOT 30/35 cm (B7, butuh keputusan owner dulu) → checkout mobile N-decal (B8).

**P1 (minggu ini):** masking PII admin, allowlist kolom (tanpa passwordHash), enum `SETTLEMENT`, restore stok refund, khash zod side_left/right,引limiter fail-closed OTP, canonical per halaman, SSR katalog, hash bucket R2, sitemap DraBlu nih.

**P2 (polish):** minor di tiap file area + jujur-kan dokumentasi + bersha repositori (mascot, doc hilang, env legacy Duitku).

---

## 5. File-folder di folder audit ini

| File | Isi |
|---|---|
| `00-INDEX.md` | dokumen ini |
| `01-LANDING-SEO.md` | landing, halaman publik, SEO, aksesibilitas |
| `02-3D-STUDIO.md` | studio 3D, fisika cm, pipeline decal→order |
| `03-ADMIN.md` | admin dashboard, backoffice, RBAC |
| `04-CHECKOUT-PEMBAYARAN.md` | user dashboard, checkout, OTP, QRIS, invoice, tracking |
| `05-API-KEAMANAN.md` | inventaris 92 route + temuan keamanan |
| `06-DATA-LAYER.md` | Turso/Drizzle/Prisma, migrasi, integritas |
| `07-INTEGRASI-CRON.md` | ongkir, iPaymu, Fonnte, R2, cron, chat, env matrix |
| `08-MOBILE.md` | aplikasi Capacitor, paritas web, keamanan mobile |
| `09-INFRA-DOCS-CI.md` | infra, konfig, dokumentasi, CI, kesehatan repo, dependensi |
| `10-RENCANA-PERBAIKAN.md` | prioritas P0/P1/P2 + estimasi urutan kerja |

---

*Dibuat 23 Okt 2026 — audit read-only, tanpa perubahan kode. Semua butir dapat dilacak ke `file:line` di masing-masing file area.*
