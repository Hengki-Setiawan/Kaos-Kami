# Kaos Kami — RUNBOOK (Blueprint 04 §12)

## 1. Duitku webhook tidak fire / payment stuck PENDING
- **Gejala:** Order tetap `PENDING_PAYMENT` padahal customer sudah bayar, tidak ada `ProductionTask` terbuat.
- **Cek:** Dashboard Duitku → Transactions → cari `orderNumber` → cek `resultCode=00`. Lalu cek secrets: `npx wrangler secret list` wajib ada `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_ENV`.
- **Fix manual:** kirim ulang callback ke `POST /api/webhooks/duitku` (verifikasi MD5 + cek nominal otomatis), atau manual `prisma.order.update status=PAYMENT_CONFIRMED` + buat `ProductionTask` rows + `OrderStatusEvent`.
- **Pencegahan:** Sentry `onRequestError` + health `/api/health` setiap 1 menit.
- **Catatan:** Proyek ini sepenuhnya Duitku. Kode & route Midtrans sudah dihapus total (Sep 2026); jika masih ada secrets `MIDTRANS_*` di Cloudflare, hapus via `npx wrangler secret delete MIDTRANS_SERVER_KEY` (dst.) agar tidak membingungkan.

## 2. WhatsApp Fonnte device disconnect
- **Gejala:** Checkout sukses tapi WA tidak terkirim, log `[Fonnte Mock Log]` atau `WA trigger error`.
- **Cek:** `https://api.fonnte.com/device` status, QR scan di HP workshop.
- **Fallback:** Web invoice `/orders/[id]` + tombol `wa.me/628xxx?text=` manual selalu tampil — checkout tidak pernah gagal (fail-safe try/catch `whatsapp.ts:28`).
- **Alert:** Health check gagal → kirim WA ke admin via same Fonnte (ops).

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
- **Firebase (`google-services.json`):** BELUM ADA — push notification tidak aktif sampai owner buat project Firebase + taruh file di `android/app/` (build tetap jalan tanpa itu, hanya push yang mati).
- **Catatan Capacitor 8:** semua `@capacitor/*` WAJIB se-major dengan core (keyboard v7 gagal kompilasi di core v8 → upgrade ke v8).
