# Kaos Kami — RUNBOOK (lihat `AGENTS.md` untuk aturan arsitektur)

## 1. iPaymu webhook tidak fire / payment stuck PENDING (Duitku NONAKTIF permanen)
- **Gejala:** Order tetap `PENDING_PAYMENT` padahal customer sudah bayar, tidak ada `ProductionTask` terbuat.
- **Cek:** Dasbor iPaymu → Transactions → cari `orderNumber` → cek status sukses. Lalu cek vars `IPAYMU_ENV` + secrets: `npx wrangler secret list` wajib ada `IPAYMU_VA`, `IPAYMU_API_KEY`.
- **Callback aktif:** `POST /api/webhooks/ipaymu` (idempoten: konfirmasi order → baris `Payment` SETTLEMENT → auto-create `ProductionTask` SPK). Simulasi Wave 7 memakai endpoint ini (`ref`, `status=berhasil`, `amount`, `QRIS`).
- **Duitku 410 Gone permanen:** `POST|GET /api/webhooks/duitku` selalu jawab `410 Gone` (`src/app/api/webhooks/duitku/route.ts`); file SENGAJA dipertahankan sebagai jejak audit, verifikasi signature lama hanya `verifyDuitkuCallbackForAudit()` read-only tanpa efek DB. Order BARU tidak bergantung ke route ini (`checkout/repay/request-payment` → `ipaymuProvider.createCharge`; sweep cek `providerRef` IPAYMU). JANGAN kirim ulang callback ke Duitku.
- **Fix manual:** buat ulang tagihan via `POST /api/orders/[id]/repay` atau `/request-payment`, atau manual update order `PAYMENT_CONFIRMED` + buat `ProductionTask` rows + `OrderStatusEvent`.
- **Pencegahan:** Sentry `onRequestError` + health `/api/health` setiap 1 menit.
- **Catatan UI terkait (faktual, Okt 2026):** sidebar admin hanya **5 menu** (`AdminNav.tsx`: Pesanan & Analitik `/admin`, Workshop Sablon DTF `/admin/production`, Hub Pengiriman & Kurir `/admin/deliveries`, Live Chat CS `/admin/chat`, Pengaturan Toko & CMS `/admin/settings`); rute `/admin/review` & `/admin/assets` dihapus; `PatternStudio`/`FabricEditor` (2D canvas) dihapus total; checkout V2 2-tahap (`CheckoutModal.tsx`, legacy `CheckoutModalLegacy.tsx`, flag `NEXT_PUBLIC_CHECKOUT_V2`, default true, `false`=rollback); gizmo laser SVG (`DecalGizmo.tsx` + `DecalGizmoHtml.tsx` fallback + `gizmoSvgBridge.ts`/`gizmoSvgMath.ts`, flag `NEXT_PUBLIC_GIZMO_SVG`, default true, `false`=rollback gizmo `<Html>` lama). Detail flag di `.env.example`.

## 2. WhatsApp Fonnte device disconnect
- **Gejala:** Checkout sukses tapi WA tidak terkirim, log `[Fonnte Mock Log]` atau `WA trigger error`.
- **Cek:** `https://api.fonnte.com/device` status, QR scan di HP workshop.
- **Fallback:** Web invoice `/orders/[id]` + tombol `wa.me/628xxx?text=` manual selalu tampil — checkout tidak pernah gagal (fail-safe try/catch `whatsapp.ts:64`).
- **Alert:** Health check gagal → kirim WA ke admin via same Fonnte (ops).

## 2b. Kill-switch checkout darurat (default aman, fail-closed)
- `CHECKOUT_OTP_REQUIRED=false` → lewati gerbang OTP (darurat Fonnte mati); `TURNSTILE_ENFORCE=false` → lewati Turnstile. Hanya string persis `"false"` yang bypass — unset/kosong = WAJIB verifikasi.
- Berlaku di `src/app/api/checkout/route.ts` + `src/app/api/mobile/orders/checkout/route.ts`. Set via `.env.local` (dev) / `wrangler secret put` (prod); JANGAN commit nilainya. Matikan lagi segera setelah darurat selesai.
- **Vars opsional fail-closed (W3, 21 Sep 2026 — set sebagai `vars` di `wrangler.jsonc`, BUKAN secrets; default bila unset = mode produksi aman):**
  - `WHATSAPP_FORCE_MOCK="true"` → paksa mock WA, pesan tidak dikirim (dev/QA saja; `whatsapp.ts:51`). Default unset = kirim live via Fonnte (nomor dummy/test selalu diblokir walau live).
  - Ongkir luar kota TANPA API pihak ketiga (keputusan owner #20=A, 23 Okt 2026): master 514 kota → `ExpeditionZone` → flat 25k. Env `AGENWEBSITE_*` sudah dicabut dari kode.
  - Lihat default + komentar di `.env.example` (§ Ongkir, Notifications, Kill-switch).

## 3. R2 upload gagal
- **Gejala:** `r2.ts` `Missing token` atau `R2 upload failed 401`.
- **Cek:** `wrangler r2 bucket list`, `CLOUDFLARE_API_TOKEN` scope `R2:Edit`.

## 4. DB Turso unreachable
- **Gejala:** `/api/health` `db:disconnected`.
- **Cek:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` di `.env` & `wrangler.jsonc` vars.

## 5. Ubah skema DB prod (Prisma `migrate` & `db push` DITOLAK P1013 — jalur SQL via Node saja)
- **Fakta (Sep 2026, Prisma 7.10.0):** `prisma migrate deploy/resolve` menolak `libsql://` (`P1013 scheme not recognized`).
- **KOREKSI 21 Sep 2026 (terverifikasi 2x, berlaku sampai toolchain diganti):** `npx prisma db push` dari `kaos-kami-web/` JUGA gagal `P1013` pada toolchain ini (engine schema tak kenal skema `libsql://`, walau `DATABASE_URL` benar). JANGAN jalankan `db push` maupun `migrate deploy` terhadap URL `libsql://` apa pun — keduanya mati di toolchain ini. Prisma dipertahankan HANYA untuk: skema source-of-truth, typegen, seed (Node-only), Studio (lihat §6). `db push` hanya relevan untuk SQLite lokal `file:` (bukan Turso).
- **Prosedur aman aktual (satu-satunya jalur tulis skema prod):** (1) backup via `GET /api/cron/backup` (header `Authorization: Bearer <CRON_SECRET>`) → dump `kaos-kami-*.sql` di bucket R2 privat (BUKAN folder repo `backups/` — folder itu sudah dihapus dari worktree, lihat §10); (2) tulis migrasi SQL berversi, eksekusi via script Node `@libsql/client` (idempoten: cek `PRAGMA table_info` dulu; `ADD COLUMN` / `CREATE TABLE IF NOT EXISTS` aman; **hindari rebuild tabel ber-FK** — `DROP TABLE` induk gagal `SQLITE_CONSTRAINT` karena batch autocommit per-statement); (3) verifikasi `PRAGMA table_info` + row count + `PRAGMA foreign_key_check` + `GET /api/health`. Kolom yang tak bisa ALTER (mis. default `Order.status` — DB `PENDING_PAYMENT` vs schema.prisma `DESIGN_REVIEW`) biarkan drift selama SEMUA insert app set eksplisit; drift ini DIDOKUMENTASIKAN di sini, bukan diperbaiki dengan rebuild tabel.
- **Baseline (keputusan owner #8=A, 23 Okt 2026):** `prisma/baseline-schema.sql` = snapshot DDL **UTF-8** dari DB aktual via introspeksi READ-ONLY `sqlite_master` (`scripts/export-schema-sql.mjs`, hanya SELECT). Isi: 29 tabel + 37 index. Regenerate kapan pun dengan `npm run db:baseline` (butuh `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`); fallback tanpa DB: `npm run db:baseline:from-prisma` (menulis `prisma/baseline-from-schema.sql`).
- **Folder `prisma/migrations/` DIBERSIHKAN 23 Okt 2026** (0001_init UTF-16LE + stale/drift, 0002 belum tentu terapply). Salinan arsip di luar repo: `Backup-Kaos-Kami/arsip/prisma-migrations-2026-10-23/`. JANGAN fake `_prisma_migrations` manual. Untuk DB baru: eksekusi `baseline-schema.sql` berurutan (CREATE TABLE lalu CREATE INDEX) via `@libsql/client`.
- **DILARANG untuk Turso:** `prisma migrate deploy` (P1013) dan `prisma db push` (P1013 pada toolchain ini). (Catatan: baris "Prosedur aman via Turso branch + `db push`" di revisi runbook lama DICABUT 05 Okt 2026 karena kontradiktif dengan koreksi P1013 di atas.)

## 6. Runtime DB = Drizzle, BUKAN Prisma Client (arsitektur Sep 2026)
- **Fakta:** Prisma Client v6 (`eval` di `resolveEnginePath`) maupun v7 (query-compiler WASM `new WebAssembly.Module(bytes)` / impor `.wasm?module`) DITOLAK workerd (`Code generation disallowed`, issue prisma#28657). Next 14/webpack bahkan gagal build `.wasm?module` (`Module parse failed`). **Tidak ada kombinasi Prisma+Next14+Workers yang bisa jalan** (jalur resmi butuh Vite/wrangler-esbuild atau Next16+Turbopack).
- **Arsitektur sekarang:** `src/lib/db.ts` = Drizzle + `@libsql/client/web` (fetch murni). `src/lib/drizzle-schema.ts` cermin 1:1 skema Prisma (nama tabel/kolom persis, `DateTime` ISO-TEXT ↔ `Date` via `isoDateTime`, `Boolean` ↔ 0/1). `src/lib/auth.ts` = better-auth `drizzleAdapter` (tabel `User/Session/Account/Verification` yang sudah ada, tanpa migrasi).
- **Prisma tetap dipakai untuk:** skema source-of-truth, `db push`, typegen (`src/generated/*`, import TYPE saja — terhapus saat compile), `seed` (Node-only), Studio.
- **Bundling (pelajaran mahal, 4x rebuild gagal):**
  - `@libsql/client` ada di daftar external BAWAAN Next (`next/dist/lib/server-external-packages.json`) → WAJIB `transpilePackages: ["@libsql/client"]` agar ikut di-bundle.
  - WAJIB alias webpack `"@libsql/client$" → "@libsql/client/web"` di `next.config.mjs` — tanpa ini impor root dari dalam drizzle me-resolve ke build node → `require("@libsql/linux-x64-musl")` → 500 di workerd.
  - JANGAN external-kan drizzle/`@libsql/client` (external = webpack alias tidak berlaku).
- **Batasan libsql/web:** TIDAK ada `db.transaction()` interaktif (tidak dipakai di kode — semua tulis sekuensial). Checkout = order → items → history non-atomik; jika gagal di tengah ada kompensasi hapus order (lihat kode checkout) + order yatim terlihat di admin.
- **Verifikasi setelah deploy:** `GET /api/health` → `{"status":"ok","db":"connected"}`; `GET /api/mobile/catalog` → 200 + `success:true`; `GET /api/mobile/orders/<acak>` → 404 (bukan 500); `GET /api/auth/get-session` → `null`.

## 7. Aktifkan Sentry (CCTV error) — butuh akun Sentry
- **Status:** `@sentry/nextjs@10` terinstal; `sentry.{client,server}.config.ts` = placeholder inert (aktif hanya jika `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` di-set). `checkout/route.ts` sudah `import()` dinamis + `.catch()` → aman tanpa DSN.
- **Aktivasi:** (1) buat project di sentry.io → salin DSN; (2) `wrangler secret put SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (dan `.env.local` untuk dev); (3) bungkus `next.config.mjs` dengan `withSentryConfig(nextConfig, { org, project, silent })` + tambah `instrumentation.ts` (`onRequestError`); (4) rebuild + deploy + picu 1 error tes.
- **Catatan Workers:** Sentry di route handlers Workers = manual `captureException` (sudah ada di checkout); auto-instrumentasi penuh butuh `instrumentation.ts`.

## 8. Android rilis (keystore + AAB + Firebase)
- **Keystore beta** `kaos-kami-mobile/android/app/kaoskami-release.keystore` (RSA-2048, alias `kaoskami`, 30 thn) dibuat lokal 07 Sep 2026 — HANYA sideload. Password di `android/key.properties` (gitignored) + `keystore-passwords.local.txt` (gitignored, berikan ke owner via jalur aman). Untuk Play Store: generate keystore BARU terpisah.
- **CI secrets wajib:** `KAOSKAMI_STORE_PASSWORD`, `KAOSKAMI_KEY_ALIAS=kaoskami`, `KAOSKAMI_KEY_PASSWORD` (Settings → Secrets → Actions).
- **AAB:** `npm --workspace=kaos-kami-mobile run cap:build:aab` (butuh `JAVA_HOME` = JDK 17–21, BUKAN 24; hasil: `android/app/build/outputs/bundle/release/app-release.aab` ±19 MB, terbukti 07 Sep 2026).
- **Firebase (`google-services.json`):** SUDAH ADA di `kaos-kami-mobile/android/app/` (dibuat owner 07 Sep 2026) + `firebase-bom:34.18.0` & `firebase-messaging` di `app/build.gradle` → AAB 07 Sep 2026 sudah include FCM. File ini BOLEH di-commit (isinya identifier publik yang memang ikut terkirim di dalam APK; bukan secret).
- **Catatan Capacitor 8:** semua `@capacitor/*` WAJIB se-major dengan core (keyboard v7 gagal kompilasi di core v8 → upgrade ke v8).

## 9. DEPLOY/PUSH GATE � tanya owner dulu (aturan Sep 2026)
- JANGAN opennextjs-cloudflare deploy, wrangler deploy, atau git push tanpa perintah eksplisit owner. Pola kerja: banyak build + validasi lokal dulu (
px tsc --noEmit web+mobile, 
pm run build, 
pm run mobile:build), push/deploy SEKALIGUS saat disuruh.
- Deploy benar = 
pm run deploy dari kaos-kami-web/ (opennext build + deploy). 
px wrangler deploy langsung = bundle .open-next BASI (rute baru 404, terbukti 08 Sep 2026).
- Setelah deploy yang diminta: probe /api/health + 1 endpoint baru + catat Version ID ke tracker.

## 10. Cron luar (cron-job.org): sweep + backup — URL, jadwal, monitor umur
- **Endpoint (format generik, tanpa secret):**
  - Sweep: `GET <APP_URL>/api/cron/sweep` — PENDING_PAYMENT basi (>24 jam) → CANCELLED + kupon dikembalikan (`src/app/api/cron/sweep/route.ts`, `STALE_MS=24h`, `BATCH=100`).
  - Sweep + fase rekonsiliasi yatim: order PENDING_PAYMENT umur >30 mnt tanpa baris Payment (batch 20, `RECONCILE_MS=30m`, `RECONCILE_BATCH=20`) dicek server-to-server via `checkTransactionStatus` → sukses = buat baris Payment SETTLEMENT + `confirmOrderPaid`; respons `{success:true, checked, cancelled, reconciled, created}`.
  - Backup: `GET <APP_URL>/api/cron/backup` — fotokopi logis Turso → R2 privat `backups/kaos-kami-YYYYMMDDHHMMSS/schema.sql` + `<tabel>.part-NNN.sql` + `manifest.json` (`src/app/api/cron/backup/route.ts`). Split per part <4 MB; manifest ditulis TERAKHIR (ada manifest = backup lengkap). Seluruh schema + data dibaca dalam **satu transaksi baca** (`raw.transaction("read")`) agar INSERT/DELETE live tidak menggeser `LIMIT/OFFSET`. Upload memakai binding `R2_BACKUPS` (bukan REST) supaya 20+ PUT tidak menembus limit 50 subrequest Worker gratis; binding wajib ada di `wrangler.jsonc` dan bucket `kaos-kami-backups` wajib privat.
  - Restore drill: unduh backup dari bucket privat, lalu:
    - Split (format baru): `npm run backup:restore -- --dir <folder> --out <target.db>`
    - Single dump lama: `npm run backup:restore -- --file <kaos-kami-YYYY....sql> --out <target.db>`
    Script `kaos-kami-web/scripts/restore-backup.mjs` mendukung dua format. FK DIMATIKAN **sebelum** schema/dump dijalankan (tabel di-backup urut alfabet, bukan urutan dependensi; kalau FK ON, INSERT `Account` gagal `no such table: main.User`), lalu FK dinyalakan lagi dan divalidasi dengan `PRAGMA integrity_check` + `PRAGMA foreign_key_check` (gagal = exit non-zero). Split juga memverifikasi jumlah baris vs `manifest.json`.
  - Backup-status: `GET <APP_URL>/api/cron/backup-status` — ringkasan backup publik tanpa CRON_SECRET (rate-limit IP, `src/app/api/cron/backup-status/route.ts`) — cek cepat umur backup tanpa secret. Membaca `result` array Cloudflare R2 + `last_modified`, memakai `delimiter=/` agar folder split tidak terpotong pagination; `mode:"incomplete"` = folder terbaru ada tapi `manifest.json` belum tertulis (backup gagal di tengah).
  - Marker hidup (health.cron): sweep menulis `cron-state/sweep.json` + backup menulis `cron-state/backup.json` ke R2 — dibaca `/api/health` sebagai bukti cron hidup.
  - Prod `<APP_URL>` = `https://kaoskami.biz.id` (lihat `wrangler.jsonc` `NEXT_PUBLIC_SITE_URL`).
  - Auth: header `Authorization: Bearer <CRON_SECRET>` (env server `CRON_SECRET`; tanpa secret = 503, salah = 401, compare timing-safe). **JANGAN tulis nilai secret di file/repo** — set via `.env.local` (dev) + `wrangler secret put CRON_SECRET` (prod).
- **Jadwal di cron-job.org (2 job terpisah, metode GET + header di atas):**
  - Sweep: tiap jam (menit 0).
  - Backup: mingguan (mis. Senin dini hari).
  - Aktifkan notifikasi gagal cron-job.org (alert bila respons non-2xx / `success:false`).
- **Monitor umur (tanda job mati):**
  - Sweep: respons normal `{success:true, checked, cancelled, reconciled, created}`. Waspada bila order `PENDING_PAYMENT` berumur >24 jam menumpuk (query Turso) = sweep tidak jalan >1 hari. `cancelled` melonjak tiba-tiba = cek anomali trafik/bayar.
  - Backup: berisi PII → bucket PRIVAT `kaos-kami-backups` (bukan prefix publik). Manifest terbaru berumur >8 hari = job mati. `bytes`/`parts`/`rows` anjlok vs baseline = backup kosong/rusak — jangan hapus backup lama sebelum restore drill lolos.
  - Jejak lokal: folder repo `backups/` (termasuk `backups/draco-archive/`) SUDAH DIHAPUS dari worktree — terverifikasi tidak ada 05 Okt 2026; arsip manual direlokasi eksternal ke `D:\Vibe coding Semester 7\Backup-Kaos-Kami\` (lihat tracker entri 17). JANGAN referensikan path `backups/` untuk backup baru. Arsip manual BUKAN pengganti cron backup cloud (jangan andalkan umurnya).

## 11. Security hardening & residual risks (Okt 2026)

### Otorisasi admin (role-only, tanpa backdoor email)
- `ADMIN`/`SUPER_ADMIN` adalah satu-satunya sumber izin. Allowlist email hardcoded (`hengkishadow@gmail.com`, `admin@kaoskami.biz.id`) SUDAH DIHAPUS dari checkout dan `bypass-payment`; jangan tambahkan kembali. Untuk memberi akses admin, ubah `User.role` di DB.
- Hanya `SUPER_ADMIN` yang boleh memberi/mencabut `ADMIN`/`SUPER_ADMIN` (`/api/admin/customers`). `ADMIN` hanya boleh mengelola `CUSTOMER`/`PRODUCTION_STAFF`/`COURIER`.
- `syncPayment`, cancel, refund, dan review desain = `ADMIN`/`SUPER_ADMIN`. Staf produksi/kurir hanya aksi operasional (resi/status pengiriman). `SHIPPED` wajib resi valid.
- `PAYMENT_CONFIRMED`, `CANCELLED`, `REJECTED` tidak bisa diset lewat aksi status generik. Order lunas wajib lewat refund, bukan cancel.

### Auth & anti-abuse
- Better Auth rate limit: login/signup 5/menit, forgot-password 3/menit, reset-password 5/menit, send-verification 3/menit, two-factor 5/menit (per isolate; KV rate-limit aplikasi tetap lapis kedua).
- `BETTER_AUTH_SECRET` fail-closed di luar `NODE_ENV=development|test`. Jangan pernah deploy dengan secret kosong.
- OTP checkout/Turnstile default fail-closed. `CHECKOUT_OTP_REQUIRED=false` dan `TURNSTILE_ENFORCE=false` HANYA untuk darurat; unset/kosong = wajib verifikasi. Hanya string persis `"false"` yang mematikan gerbang.
- Email/password signup wajib tiket OTP (`x-email-verification-ticket`); Google OAuth dikecualikan.

### SSRF / open redirect / PII
- `/api/proxy-image` hanya mengambil dari host `R2_PUBLIC_URL` atau `NEXT_PUBLIC_SITE_URL` (dev: localhost), hanya PNG/JPEG/WebP/GIF/AVIF, maks 8 MB, timeout 10 dtk, 60/menit/IP. SVG ditolak.
- `returnUrlOverride` pembayaran hanya boleh origin kanonis/www Kaos Kami atau deep-link `kaoskami://`; URL bebas ditolak.
- Endpoint publik order/invoice hanya memuat kolom kontak yang dirender; `providerRef`, `passwordHash`, email admin, dan raw webhook tidak pernah dikirim ke publik. Catatan status internal `[REVIEW:...]` tidak ditampilkan ke pengunjung anonim.
- Backup PII hanya ke bucket privat; `uploadToR2` menolak `bucketOverride` yang sama dengan bucket aset publik.

### Residual risks yang BELUM ditutup (jangan klaim 100%)
- **Admin 2FA belum ada.** Mitigasi sementara: password admin unik + panjang, jumlah akun admin minimal, pantau sesi/aktivitas, segera cabut role jika mencurigakan. Rencana: TOTP/passkey Better Auth + migrasi tabel 2FA.
- **`/api/auth/resolve-identifier` masih mengembalikan email kanonis** saat lookup nomor WA/nama (dibutuhkan login multi-identifier). Mitigasi: Turnstile di AuthModal + rate limit 30/menit/IP dan 10/5menit/identifier; endpoint tidak membocorkan password/sesi. Risiko enumerasi email tetap ada; rencana jangka menengah: login proxy server-side (resolve + `signInEmail` + forward cookie) atau plugin username Better Auth.
- **Belum ada load test** (checkout/OTP/webhook) dan belum ada uji banjir trafik nyata.
- **Restore nyata SUDAH lolos 24 Okt 2026:** (a) single-dump `backups/kaos-kami-202610240703.sql` — 29 tabel, 747 baris, `integrity_check=ok`, `foreign_key_check=0`; (b) split `backups/kaos-kami-20261024071217/` — 29 tabel, 747 baris, 37 index (16 unique, termasuk `Verification_identifier_key`, `User_email_key`, `Order_orderNumber_key`), `integrity_check=ok`, `foreign_key_check=0`. Restore split sintetis + uji orphan yang ditolak juga lolos. **Cron backup split sudah dijalankan manual end-to-end** (bukan bukti jadwal cron eksternal). Backup fresh 24 Okt dibuat lewat trigger manual, BUKAN bukti cron-job.org hidup. Marker backup terakhir sebelum trigger masih 27 Sep 2026 dan sweep 06 Okt 2026 — OWNER wajib cek cron-job.org setelah deploy.
- **Belum ada satu transaksi QRIS nyata** end-to-end (callback 200 → PAID → tiket produksi/stok; replay tidak menggandakan; refund mengembalikan stok hanya bila stok sempat dikurangi).
- **Signature callback iPaymu belum diuji dengan callback asli**; normalisasi `additional_info` mengikuti dokumen resmi tetapi belum diverifikasi lapangan.
- **Webhook produksi lama masih fail-open** sampai deploy kode baru; probe unsigned harus 401 setelah deploy.
- Verifikasi fisik UI di browser dan uji refund nyata tetap milik OWNER.