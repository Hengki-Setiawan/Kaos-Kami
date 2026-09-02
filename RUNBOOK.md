# Kaos Kami — RUNBOOK (Blueprint 04 §12)

## 1. Midtrans webhook tidak fire / payment stuck PENDING
- **Gejala:** Order tetap `PENDING_PAYMENT` padahal customer sudah bayar di Snap, tidak ada `ProductionTask` terbuat.
- **Cek:** `https://dashboard.midtrans.com` → Transactions → cari `orderNumber` → cek status `settlement`.
- **Fix manual:** `POST /api/webhooks/midtrans` dengan payload dari Midtrans (signature verify) atau manual `prisma.order.update status=PAYMENT_CONFIRMED` + buat `ProductionTask` rows + `OrderStatusEvent`.
- **Pencegahan:** Sentry `onRequestError` + health `/api/health` setiap 1 menit.

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
