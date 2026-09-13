# Kaos Kami — RUNBOOK (lihat `AGENTS.md` untuk aturan arsitektur)

## 1. Duitku webhook tidak fire / payment stuck PENDING
- **Gejala:** Order tetap `PENDING_PAYMENT` padahal customer sudah bayar, tidak ada `ProductionTask` terbuat.
- **Cek:** Dashboard Duitku → Transactions → cari `orderNumber` → cek `resultCode=00`. Lalu cek secrets: `npx wrangler secret list` wajib ada `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_ENV`.
- **Fix manual:** kirim ulang callback ke `POST /api/webhooks/duitku` (verifikasi MD5 + cek nominal otomatis), atau manual `prisma.order.update status=PAYMENT_CONFIRMED` + buat `ProductionTask` rows + `OrderStatusEvent`.
- **Pencegahan:** Sentry `onRequestError` + health `/api/health` setiap 1 menit.
- **Catatan:** Proyek ini sepenuhnya Duitku. Route/kode Midtrans dihapus (Sep 2026); sisa enum DB historis MIDTRANS/XENDIT (schema.prisma:397-399, read-only order lama); jika masih ada secrets `MIDTRANS_*` di Cloudflare, hapus via `npx wrangler secret delete MIDTRANS_SERVER_KEY` (dst.) agar tidak membingungkan.

## 2. WhatsApp Fonnte device disconnect
- **Gejala:** Checkout sukses tapi WA tidak terkirim, log `[Fonnte Mock Log]` atau `WA trigger error`.
- **Cek:** `https://api.fonnte.com/device` status, QR scan di HP workshop.
- **Fallback:** Web invoice `/orders/[id]` + tombol `wa.me/628xxx?text=` manual selalu tampil — checkout tidak pernah gagal (fail-safe try/catch `whatsapp.ts:64`).
- **Alert:** Health check gagal → kirim WA ke admin via same Fonnte (ops).

## 2b. Kill-switch checkout darurat (default aman, fail-closed)
- `CHECKOUT_OTP_REQUIRED=false` → lewati gerbang OTP (darurat Fonnte mati); `TURNSTILE_ENFORCE=false` → lewati Turnstile. Hanya string persis `"false"` yang bypass — unset/kosong = WAJIB verifikasi.
- Berlaku di `src/app/api/checkout/route.ts` + `src/app/api/mobile/orders/checkout/route.ts`. Set via `.env.local` (dev) / `wrangler secret put` (prod); JANGAN commit nilainya. Matikan lagi segera setelah darurat selesai.

## 3. R2 upload gagal
- **Gejala:** `r2.ts` `Missing token` atau `R2 upload failed 401`.
- **Cek:** `wrangler r2 bucket list`, `CLOUDFLARE_API_TOKEN` scope `R2:Edit`.

## 4. DB Turso unreachable
- **Gejala:** `/api/health` `db:disconnected`.
- **Cek:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` di `.env` & `wrangler.jsonc` vars.

## 5. Ubah skema DB prod (Turso hanya support `db push`)- **Fakta (Sep 2026, Prisma 7.10.0):** `prisma migrate deploy/resolve` menolak `libsql://` (`P1013 scheme not recognized`). Turso = `db push` only.
- **Prosedur aman:** (1) backup via Turso branch (`turso db create backup-YYYYMMDD --from kaos-kami-...` atau dashboard), (2) `npx prisma db push` dengan `DATABASE_URL` = Turso (CLI dari `kaos-kami-web/`, baca `prisma.config.ts`), (3) verifikasi `/api/health` + 1 query baca, (4) jika rusak → restore dari branch.
- **File migrasi** `prisma/migrations/0001_init/` = referensi baseline yang cocok dengan skema prod saat ini (dibuat via `db push`); JANGAN fake `_prisma_migrations` manual.
- **Script `db:migrate` (`prisma migrate deploy`) RUSAK untuk Turso** — jangan dipakai; pakai `db:push` + prosedur di atas.

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
  - Backup: `GET <APP_URL>/api/cron/backup` — fotokopi logis Turso → R2 `backups/kaos-kami-YYYYMMDDHHMM.sql` (`src/app/api/cron/backup/route.ts`).
  - Backup-status: `GET <APP_URL>/api/cron/backup-status` — ringkasan backup publik tanpa CRON_SECRET (rate-limit IP, `src/app/api/cron/backup-status/route.ts`) — cek cepat umur backup tanpa secret.
  - Marker hidup (health.cron): sweep menulis `cron-state/sweep.json` + backup menulis `cron-state/backup.json` ke R2 — dibaca `/api/health` sebagai bukti cron hidup.
  - Prod `<APP_URL>` = `https://kaoskami.biz.id` (lihat `wrangler.jsonc` `NEXT_PUBLIC_SITE_URL`).
  - Auth: header `Authorization: Bearer <CRON_SECRET>` (env server `CRON_SECRET`; tanpa secret = 503, salah = 401, compare timing-safe). **JANGAN tulis nilai secret di file/repo** — set via `.env.local` (dev) + `wrangler secret put CRON_SECRET` (prod).
- **Jadwal di cron-job.org (2 job terpisah, metode GET + header di atas):**
  - Sweep: tiap jam (menit 0).
  - Backup: mingguan (mis. Senin dini hari).
  - Aktifkan notifikasi gagal cron-job.org (alert bila respons non-2xx / `success:false`).
- **Monitor umur (tanda job mati):**
  - Sweep: respons normal `{success:true, checked, cancelled, reconciled, created}`. Waspada bila order `PENDING_PAYMENT` berumur >24 jam menumpuk (query Turso) = sweep tidak jalan >1 hari. `cancelled` melonjak tiba-tiba = cek anomali trafik/bayar.
  - Backup: berisi PII → bucket PRIVAT `kaos-kami-backups` (bukan prefix publik). File terbaru berumur >8 hari = job mati. `bytes` anjlok vs baseline = backup kosong/rusak — jangan hapus backup lama sebelum verifikasi isi.
  - Jejak lokal: `backups/` di repo ini = arsip manual, BUKAN pengganti cron backup cloud (jangan andalkan umurnya).