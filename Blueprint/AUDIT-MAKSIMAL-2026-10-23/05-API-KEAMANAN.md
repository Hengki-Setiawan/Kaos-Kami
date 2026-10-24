# 05 — API INVENTORY & KEAMANAN (92 route)

> Sumber: Auditor 5 (very thorough). Basis `kaos-kami-web/src/app/api/` (92 file: 91 route.ts + zones shared helper). TIDAK ADA middleware.ts. Kolom: AUTH (–/U=user/A=admin/S=staff), Z=zod, RL=rate limiter, EH=error handling robust.

## A. Inventaris API (ringkas; detail lengkap di laporan auditor)

| Grup route | AUTH | Z | RL | Catatan |
|---|---|---|---|---|
| `addresses` CRUD | U | ✓ | ✓ | sehat |
| `auth/[...all]` better-auth | – | – | – | handler resmi |
| `auth/pin-bypass` | **–** | ❌ | ❌ | 🔴 B1 |
| `auth/send-otp`/`verify-otp` | – | ✓ | ✓ IP+phone | sehat (hash+pepper, burn single-use) |
| `auth/send-email-otp`/`verify-email-otp`/reset-password/* | – | ✓ | ✓ | F5: Turnstile opsional |
| `auth/resolve-identifier` | – | ✓ | ✓ | 🟠 enumeration email |
| `auth/update-phone`, `verify-turnstile` | U/– | ✓ | ✓ | sehat |
| `cart`, `cart/items(+batch)` | U | ✓ | ✓ | sehat (tapi UI tak membaca DB cart — F6/04) |
| `catalog/*` (5) | – | – | – | statis, sehat |
| `chat/messages`, `chat/presence`, `chat/upload` | U/guest | ❌ | ✓ | 🟠 IDOR guest |
| `chat/threads` | A/S | – | ✓ | sehat |
| `checkout` web | U/guest+OTP | ✓ | ✓ | lihat 04 |
| `mobile/*` (catalog, orders/checkout, orders/[id]/status, designs/sync, notifications/register) | beda | ✓/– | ✓ | checkout mobile: U tanpa guest ✓; status polling publik |
| `cron/sweep` | Bearer CRON_SECRET fail-closed | – | ❌ (by design) | sehat |
| `cron/shipping-sync` | Bearer ATAU A | – | ❌ | tak terjadwal & tak terdok RUNBOOK (07) |
| `cron/backup-status` | publik | – | ✓ | sehat (fetch CF tanpa timeout) |
| `designs*` (4) | U/– | ✓ | ✓ | zod enum bermasalah (02-#2) |
| `enhance-image` | – | ❌ | ✓ | stub 501 mati permanen |
| `geocode/{search,reverse}` | – | ✓ | ✓ | proxy Nominatir rapi, UA policy, fail-soft |
| `health` | – | – | ✓ | sehat |
| `lookbook`, `shop/announcement` | – | – | ✓/– | sehat |
| `notifications` | U | ❌ | ✓ | berkaitan isu mobile `?userId=` — verifikasi server binding (08-#7) |
| `orders/[id]` GET publik | – | ✓ | ✓ | expose totalIdr + melakukan mutasi (reconcile idempoten) — catat |
| `orders/[id]/{bypass-payment,cancel,repay,request-payment}` | A/U/OTP | ✓/– | ✓ | bypass A ✓; M7 enum-mismatch |
| `proxy-image` | **–** | ❌ | **❌** | 🟠 open relay |
| `qc/inspections` | S/A | ✓ | ✓ | sehat |
| `reviews` | U | ✓ | ✓ | default isVerifiedPurchase=true bila order tak ketemu (06-#12) |
| `shipping/{quote,locations}` | – | ✓ | ✓ | sehat |
| `test/otp` | gate-lapis | ✓ | ✓ | di-gate NODE_ENV+env (contoh baik untuk pin-bypass) |
| `track/orders` | OTP WA | ✓ | ✓ | sehat |
| `upload/r2` | U | ✓ (manual ketat) | ✓ | whitelist+magic byte+10MB+kuota harian |
| `user/profile`, `user/profile/export` | U | ✓ | ✓ | export GDPR ada |
| `admin/*` 24 route | A (S beberapa) | ✓ kebanyakan | ✓ | lihat 03; complaints = gap |
| `webhooks/ipaymu` | signature fail-open | ❌ | ✓ | 🔴 B2 |

## B. Temuan utama

### B1 [BLOCKER] `api/auth/pin-bypass` — login admin tanpa kredensial di produksi
- `route.ts:23-37`: `pin "164164" → targetRole SUPER_ADMIN`, `"461461" → CUSTOMER`; `:124-171` INSERT baris Session token sah + set cookie `better-auth.session_token`.
- Tidak ada `NODE_ENV` gate, RL, zod. Interceptor dev `lib/auth.ts:99` di-gate — route ini tidak.
- **Dampak:** POST `{pin:"164164"}` = sesi better-auth sah 30 hari sebagai user role pertama SUPER_ADMIN/ADMIN → kendali penuh panel (pelanggan, omzet, refund, bypass bayar, ubah role).
- **Perbaikan:** env-gate 3 lapis (ala `test/otp`) ATAU hapus route + pemanggil (`SecretPinModal.tsx:36`, `AdminNav.tsx:96`, `AdminMobileNav.tsx:201`). Minimal: PIN via env secret + RL 5/15mnt + delay + log audit.

### B2 [BLOCKER] Webhook iPaymu fail-open + guard nominal terlewati
- `webhooks/ipaymu/route.ts:39-41` (fail-open eksplisit), `:88` `Number(payload.amount || payload.total || 0)`, `:116` `if (amount > 0 && Math.abs(amount - order.totalIdr) > 1)`.
- Kontra docs resmi iPaymu: wajib verifikasi `X-Signature` (kunci=VA); server iPaymu RETRY callback jika tak 200 → idempotensi wajib.
- `orderNumber` `KK-YYYYMMDD-XXXX` hanya 4 digit (±9.000/hari) → brute reference + oracle 404 vs 400 amount-mismatch.
- **Perbaikan:** (1) fail-closed 401 tanpa signature; (2) `!Number.isFinite(amount) || amount<=0 → 400`; (3) nominal wajib match SELALU; (4) pertimbangkan secret per-order di notifyUrl.

### MAJOR
- **#3 enumeration & kebocoran email:** `resolve-identifier/route.ts:63-102` — phone/nama → **email asli**; `send-email-otp:68-72` 409 "sudah terdaftar". → respons netral + masking.
- **#4 IDOR chat guest:** `chat/messages/route.ts:22-27` guestId dari query; `:60-86` baca+mark-read sembrono; `:112-124` POST spoof pengirim. → cookie httpOnly `chat_guest` server-side.
- **#5 proxy-image open relay:** `proxy-image/route.ts:17,28-46` — `isSafeImageUrl` menerima SEMUA host; fetch→arrayBuffer penuh; `Access-Control-Allow-Origin:*`; tanpa RL/cap/type-check. → whitelist host (r2.dev, domain sendiri), cap 5MB, type image/*, limiter.
- **#6 limiter fail-open + OTP jalur:** `security/rateLimiter.ts:200-231` fail-open; KV opsional, 1 write/dtk/key + isolat baru = counter 0. → fail-closed di send-otp/reset; record Verification 24 jam.

### MINOR
- **#7 CSP** masih `unsafe-inline`+`unsafe-eval` (`next.config.mjs:52-65`); rekomendasi `wasm-unsafe-eval` only + nonce middleware; `img-src https:` → batasi.
- **#8 admin guard digandakan ≥12 file** (variasi requireAdmin/assertAdminSession/requireWorkshop) → ekstrak `lib/security/authGuard.ts` `requireRole([...])`; `admin/customers` PATCH boleh set `SUPER_ADMIN` — pastikan hanya SUPER boleh set SUPER (route sudah proteksi, harden + test).
- **#9 BYPASS_FALLBACK_EMAILS hardcode** (`checkout:138-139`, `bypass-payment:14` `["hengkishadow@gmail.com","admin@kaoskami.biz.id"]`) — wajibkan env di prod (fail-closed 503).
- **#10 duplikasi checkout web vs mobile** (~1.700 baris) → ekstrak `lib/checkout/createOrder()`.
- **#11 env kill-switch client-side** (`NEXT_PUBLIC_CHECKOUT_OTP_REQUIRED` baked build) vs server env → satu sumber via endpoint.
- **#12 kredensial Duitku legacy di `.env` (21-23)** — hapus + rotasi di dashboard Duitku (kredensial tidak pernah tracked, aman dari commit).
- **#13 lain-lain:** GET publik melakukan mutasi reconcile (idempoten — catat), `designs/[id]` guest publik-by-design (dokumentasi), zod v3 konsisten, 6 `catch {}` kosong.

## C. Eksplisit TIDAK ditemukan (positif)
- Tidak ada `dangerouslySetInnerHTML` dari user data; chat disanitasi `<'>`.
- Tidak ada SQL injection (semua drizzle parameterized; tidak ada `$queryRawUnsafe`).
- Tidak ada open redirect (`returnUrlOverride` dibatasi regex scheme; redirect PIN literal server).
- SSRF: hanya `proxy-image` yang fetch URL user; geocode/shipping host tetap.
- Tidak ada secret di client/NEXT_PUBLIC_*: FONNTE_TOKEN, IPAYMU_*, TURSO_AUTH_TOKEN, CLOUDFLARE_API_TOKEN, BETTER_AUTH_SECRET, CRON_SECRET, AGENWEBSITE, GOOGLE_CLIENT_SECRET — semua server-side.
- better-auth `role input:false` (`lib/auth.ts:80`) — cookie payload tak bisa role-injected.
- Tidak ada presigned URL R2 (upload selalu via worker, key server-side).
- Middleware `/api/admin` global TIDAK ada — proteksi per-route (terverifikasi lengkap).
- Sentry: config placeholder, DSN via env (tidak hardcode) — tapi belum `withSentryConfig` / tidak ada init aktif (07).

## D. Top-8 prioritas security
1. Gate/hapus `pin-bypass` (B1)
2. Webhook iPaymu fail-closed (B2)
3. Netralisasi enumeration (`resolve-identifier`, `send-email-otp`)
4. Guest-token chat (cookie httpOnly)
5. Kunci `proxy-image` (whitelist+cap+RL+type)
6. Ekstrak `requireRole()` + hapus BYPASS_FALLBACK_EMAILS prod
7. Limiter fail-closed OTP + konsolidasi env kill-switch
8. Ekstrak core checkout shared + hapus kredensial Duitku
