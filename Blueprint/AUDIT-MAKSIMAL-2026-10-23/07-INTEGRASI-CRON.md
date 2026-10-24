# 07 — INTEGRASI EKSTERNAL & JOB TERJADWAL

> Sumber: Auditor 7 (very thorough) + silang-checker docs resmi (iPaymu, Fonnte). Konteks: migrasi Duitku→iPaymu selesai (0 referensi di src; `Payment.provider` default IPAYMU); kebijakan Fonnte **OTP-only** sejak 20 Sep 2026 (WA transaksional dinonaktifkan secara disengaja).

## A. Peta integrasi

| # | Integrasi | Lib/rute | Status |
|---|---|---|---|
| 1 | Ongkir AgenWebsite Rate API | `lib/shipping/agenwebsite.ts` + `api/shipping/{quote,locations}` + checkout web/mobile | kode AKTIF (opsional key); owner: **jadikan legacy** — tabel zona/flat adalah realita produksi |
| 2 | Ongkir fallback 3-tier | `masterShippingRates.ts` (514 kota statis) → `zones.ts` (`ExpeditionZone`) → flat Rp25.000 | AKTIF (jalur realita) |
| 3 | iPaymu Direct QRIS | `lib/payments/ipaymu.ts`, `payments/confirmOrder.ts`, `/api/webhooks/ipaymu`, checkout/repay/request-payment + mobile `ipaymuMobile.ts` | AKTIF — 🔴 1 BLOCKER + beberapa MAJOR |
| 4 | Duitku | — | LEGACY 410/audit-only; jejek di `.env` + workflow e2e |
| 5 | Fonnte WA | `lib/notifications/whatsapp.ts`, `api/auth/send-otp`, `admin/production-tasks/master-notify` | OTP + master-notify manual |
| 6 | Cloudflare R2 | `lib/r2.ts`, `api/upload/r2`, `api/chat/upload`, cron backup | AKTIF REST API (bukan presigned) |
| 7 | Cron luar | `/api/cron/{sweep,backup,backup-status,shipping-sync}` | AKTIF via cron-job.org |
| 8 | Turso/Drizzle, Better Auth/Google OAuth, Turnstile, KV ratelimit | — | AKTIF |
| 9 | Livechat Kamito | `/api/chat/*` + widget/admin | AKTIF (HTTP polling) |
| 10 | Kecil | Leaflet+OSM, Nominatim proxy, GA4+CF Analytics, Resend (opsional), Sentry (tidur), Capacitor bridges | AKTIF/PARSIAl |

## B. Per integrasi: temuan

### 1. Shipping
- **Alur web:** weight `max(250, qty×250)` → tier1 `awRatesCached` (cache 30mnt, bucket 250g) → tier2 master 514 → tier3 zone/flat. Timeout AW 15s + 429→null, fail-soft (disengaja), tanpa retry.
- **#1 [MAJOR] silent downgrade kurir web vs mobile 400 eksplisit:** `checkout/route.ts:412-424,439-445` — bila kurir/layanan pilihan user tak ada di live list, server ambil yang lain (bisa beda harga ≠ quote user). Mobile `mobile/orders/checkout:294-337` benar (400). → samakan web ke 400.
- **#2 [MINOR]** quote `shipping/quote:56` tak filter kurir → list bisa ≠ canon checkout (bucket cache sama).
- **#3 [MINOR]** master 514 = statis; `shipping-sync` hanya verifikasi hitungan, tak menyegarkan tarif (`cron/shipping-sync:35-44`).
- **#4 [MINOR]** rateCache per-isolate — TTL efektif pendek di Workers.

### 2. iPaymu
- **Alur:** charge direct `/api/v2/payment/direct` (timeout 8s) → Payment PENDING ref=TransactionId → webhook POST (signature opsional) → guard nominal ±Rp1 → `confirmOrderPaid` (idempoten optimistic) → spawn task + oversell flag (tanpa WA).
- **#10 [BLOCKER] QRIS fallback fabricate** (`ipaymu.ts:160-207`): pada error gateway, kode membangun QR EMV sendiri (TLV tanpa panjang field benar, **tanpa CRC valid**), PNG via `api.qrserver.com` (#13 [MAJOR] renderer QR uang = pihak ketiga; query memuat orderNumber+amount; availability pihak ketiga memblokir modal), respons `"00" SUCCESS_*` → dikenali charge sukses. Outage terkamuflase; order menunggu harga salah sampai cancel 24 jam.
- **#11 [MAJOR] webhook fail-open** — callback palsu bisa SETTLEMENT-kan order (guard hanya referenceId+nominal; tak cek trxId ownership). Kontra docs resmi (X-Signature HMAC kunci=VA, idempotensi wajib).
- **#12 [MINOR]** `IPAYMU_ENV` default **production** bila unset (`ipaymu.ts:48`); `:127-128` mutasi digit terakhir nomor pembeli (anti-406 hack); direct body telak **tanpa expiry** — docs: QRIS default 5 MENIT (≠ klaim sweep "24 jam", `sweep/route.ts:17` — asumsi tak diset). ⚠ docs juga: production iPaymu mensyaratkan IP statis + domain terdaftar — Cloudflare Workers TIDAK punya IP statis; jalur domain → perlu konfirmasi konfigurasi dashboard iPaymu (yg bertanggung jawab: owner).
- **#14 [MINOR]** repay/request-payment estamp item lines konsisten nominal; direct QRIS 1 baris agregat (detail produk tak tampil di nota gateway).
- **#5 (sweep) [MAJOR]** reconcile regex skip hanya `pending-|IPAYMU-DEV-|reconciled-` → ref fallback `IPAYMU-LIVE-*`/`FALLBACK-*` lolos → `Number()=NaN` → body `{transactionId:null}` dikirim tiap jam (boros + pasti gagal).
- **#6 (status-check) [MAJOR]** `ipaymu.ts:263-287` `checkTransactionStatus` TANPA timeout & tanpa `res.ok` → cron hang potensial.
- **#7 [MAJOR] doc drift RUNBOOK:** RUNBOOK:77 klaim reconcile "order PENDING tanpa baris Payment" — kode `innerJoin(Payment)` & hanya UPDATE; order tanpa Payment tak pernah dicek (`sweep:101-108`).

### 3. Fonnte
- **Alur:** OTP 6-digit via `sendWhatsAppNotification` (format 62, debug/blacklist dummy, mock saat token kosong). Rate: 3/5mnt IP+phone; send-before-save.
- **#17 [MAJOR]** fetch Fonnte **tanpa timeout/retry/queue** (`whatsapp.ts:65-83`) — ok OTP (send-before-save) tapi master-notify bisa hang worker.
- **#18 [MAJOR]** health Fonnte fail-open (`admin/system/health:82-112`) — device disconnect tetap "CONNECTED"; `/api/health` utama TIDAK cek Fonnte.
- **#19 [MINOR]** template `buildOrderConfirmedMessage` dead code sejak OTP-only.
- Kontext docs: ada masalah "Reach-out Time-lock" fonnte (nomor baru diblok kirim pertama) — rekomendasi: sebelum reintroducing WA transaksional, minta customer simulator chat dulu; pertimbangkan tombol wa.me sebagai default (frame yang sudah ada di invoice ✓).

### 4. R2
- **#15 [MAJOR]** `lib/r2.ts` PUT/DELETE/LIST **tanpa timeout/retry**; backup >25MB ditolak 413 (split belum diimplementasi); delete draft tamu berbasis substring URL `.r2.dev/` (`sweep:224-234`) fragile.
- **#16 [MINOR]** chat/upload membolehkan tamu (kuota per-IP ok); dataURI fallback ≤1.5MB bobot naik ke row DB.

### 5. Chat Kamito
- **#20 [MINOR]** mark-as-read N+1 (per motile update); polling user 8s/30s + admin 15s → 3× table scan di jam ramai. Blueprint tak eksplisit soal polling — dokumen.

### 6. Kecil
- geocode Nominatim proxy rapi (RL 10/mnt, timeout 8s, fail-soft).
- **#21 [MINOR]** kode OTP email dicetak `console.log` (`email.ts:79-85,137-143`).
- Sentry: TIDAK diinisialisasi (DSN template saja); hanya satu dynamic-import captureException.
- Mobile bridges: Geolocation bridge, MLKit scanner, KeepAwake hanya AR, deep-link `kaoskami://payment` `removeAllListeners` sebelum addListener (ordering bermasalah, `<zero-timeout listener>`).

## C. Inventory cron

| Job | Kontrak | Jadwal | Penjadwal | Proteksi | Marker |
|---|---|---|---|---|---|
| sweep | Bearer CRON_SECRET (503 tanpa/401 salah) | tiap jam | cron-job.org eksternal | ✓ | `cron-state/sweep.json` → /api/health |
| backup | sama | mingguan → R2 privat | cron-job.org | ✓ | `cron-state/backup.json` |
| backup-status | publik + RL 30/mnt | on-demand | — | by-design | — |
| shipping-sync | Bearer ATAU session A | "MONTHLY" (klaim kode) | TIDAK terjadwal/terdok RUNBOOK | ✓ | ❌ tak menulis |
| e2e-nightly GH | workflow | mingguan | GitHub Actions | — | masih DUITKU_* env |

Cakupan fungsi sweep: auto-cancel PENDING >24h (+restore kupon), rekonsiliasi >30mnt, retensi OTP/session/presence/publish utilisateur. **Tidak ada:** reminder, refresh zone otomatis, split backup. Kegagalan job = hilang satu siklus penuh (tanpa retry mekanisme eksternal).

## D. Eksplisit TIDAK ADA
- retry (hanya orderNumber unique retry 5× di checkout:696-734)
- timeout: Fonnte, R2 PUT/DELETE/LIST, iPaymu status-check, backup-status list
- queue WA/email; dedupe WA (moot: OTP send-before-save)
- cache (hanya AW ratecache 30mnt — dgn isolat pendek efektif)
- presigned R2 / CORS browser upload
- multipart R2 / split backup; auto-cancel dari webhook failure
- wrangler cron triggers (cron eksternal — benar)
- inisialisasi Sentry; KTX2 pipeline; WebSocket/SSE chat
- server-side image processing (sharp dihapus — kompresi 100% browser)
- cleanup orphan R2 menyeluruh (hanya draft tamu)

## E. ENV matrix (NAMA saja — nilai tidak dicetak)
- Server: `TURSO_AUTH_TOKEN`, `DATABASE_URL`/`TURSO_DATABASE_URL`, `BETTER_AUTH_URL/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `TURNSTILE_ENFORCE`, `CHECKOUT_OTP_REQUIRED`, `IPAYMU_VA`, `IPAYMU_API_KEY`, `IPAYMU_ENV`, `PAYMENT_GATEWAY_PROVIDER`, `FONNTE_TOKEN`/`WHATSAPP_FORCE_MOCK`, `AGENWEBSITE_RATE_API_KEY`/`AGENWEBSITE_SANDBOX`, `RESEND_API_KEY/FROM_EMAIL`, `CRON_SECRET`, `CLOUDFLARE_API_TOKEN/ACCOUNT_ID`, `R2_BUCKET_NAME/R2_PUBLIC_URL/R2_BACKUP_BUCKET_NAME/R2_ENDPOINT`, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (tak dipakai), `E2E_ALLOW_OTP_PEEK/NUMBERS` + legacy `DUITKU_*`.
- wrangler.jsonc vars committed (publik): URL/ID publik, GA, sitekey Turnstile, postal code, dst + `secrets.required` daftar inti — paritas baik.
- Gap kecil: `AGENWEBSITE_SANDBOX`, `PAYMENT_GATEWAY_PROVIDER`, `R2_ENDPOINT` tidak di `.dev.vars.example`; `DUITKU_*` masih di workflows e2e + `.env` lokal.

## F. Top 5
1. BLOCKER QRIS fabricate → hapus cabang, 502 + ref pending-*.
2. MAJOR webhook fail-open → fail-closed + verifikasi X-Signature selalu.
3. MAJOR silent downgrade kurir web vs mobile 400.
4. MAJOR status-check + reconcile sweep hang/NaN + doc drift RUNBOOK.
5. MAJOR kesehatan: health Fonnte fail-open + tanpa timeout di R2/Fonnte.
