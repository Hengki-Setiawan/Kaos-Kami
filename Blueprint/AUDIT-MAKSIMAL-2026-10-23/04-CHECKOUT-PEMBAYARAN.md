# 04 — USER DASHBOARD, CHECKOUT, PEMBAYARAN & TRACKING

> Sumber: Auditor 4 (very thorough). Diverifikasi silang dengan docs resmi iPaymu + auditor API (05) + integrasi (07). Status: 🔴 jalur uang perlu perbaikan panggung-1.

## A. Peta alur checkout (terverifikasi)

1. **Keranjang:** 100% client zustand `useCartStore` persist `kaos-kami-cart-v1`. TIDAK ada route `/cart`.
2. **UI checkout:** TIDAK ada route `/checkout` — modal `CheckoutModal.tsx` (~2k baris, 2 langkah) + `CheckoutModalLegacy.tsx` rollback via `NEXT_PUBLIC_CHECKOUT_V2`. Custom wajib login; ready-stock boleh guest.
3. **Gate OTP & Turnstile API** (`api/checkout/route.ts:512+`): OTP WA bila belum `phoneVerified` & kategori wajib OTP; Turnstile wajib — kill-switch `CHECKOUT_OTP_REQUIRED`/`TURNSTILE_ENFORCE` exact-string `"false"` (benar sesuai RUNBOOK §2b).
4. **Pricing server-side + ongkir** (`route.ts:412-424`): harga server; ongkir 3-tier: live AgenWebsite → masterShippingRates (514 kota) → ExpeditionZone → flat 25.000.
5. **Idempotensi:** pola claim→seal tabel `Verification` — index NON-UNIQUE (diakui kode sendiri, tidak concurrency-safe; lihat `06-`).
6. **Order + pembayaran:** iPaymu Direct QRIS dinamis; fallback lokal palsu (F1).
7. **Webhook** `api/webhooks/ipaymu`: signature fail-open (F2).
8. **Konfirmasi** (`payments/confirmOrder.ts`): `confirmOrderPaid` idempoten optimistic; spawn ProductionTask; oversell → marker `[REVIEW:OVERSELL]` tanpa WA (sesuai kebijakan OTP-only; tombol wa.me manual ada di invoice ✓).
9. **Invoice publik:** `/orders/[id]/page.tsx` (masking PII, PaymentDeadline, poller 10s, PDF jsPDF A5 client, cancel + restore kupon, RepayButton).
10. **Kedaluwarsa:** `api/cron/sweep` Bearer fail-closed 503; cancel PENDING >24h + rekonsiliasi.
11. **Repay:** OTP-gated dalam reply; request-payment juga OTP.
12. **Tracking:** `/track` + `orders/machine.ts` status terminal terkunci, role allow-list.

## B. Temuan

### 🔴 F1 — QRIS PALSU saat API iPaymu error tapi diklaim SUCCESS [BLOCKER]
- **Bukti:** `lib/payments/ipaymu.ts:164-174,196-206` — pada error HTTP/network/TIMEOUT, server mem-fabricate QR EMVCo sendiri (CRC `6304` tanpa value 4 digit = QR invalid; tanpa panjang TLV benar), PNG via `api.qrserver.com`, respons `statusCode:"00"` `SUCCESS_QRIS/SUCCESS_FALLBACK`.
- **Dampak:** user scan QR kemungkinan invalid → tak pernah SETTLEMENT; sales hilang sunyi sampai sweep-cancel 24 jam; outage terkamuflase; kalau kebetulan valid pun tak menunans merchant.
- **Perbaikan:** hapus seluruh cabang fallback; pada error → 502 + ref `pending-*` (jalur repay sudah ada) + tombol "Coba Lagi".

### 🔴 F2 — Webhook iPaymu forgeable [BLOCKER]
- **Bukti:** `api/webhooks/ipaymu/route.ts:35-80,116` — signature opsional (fail-open); guard nominal `if (amount > 0 && …)` → bila `amount` dikosongkan, cek nominal dilewati. Docs resmi iPaymu: wajib `X-Signature` (HMAC-SHA256 kunci = **VA number**), normalisasi tipe → sort A-Z → JSON → HMAC; idempotensi wajib.
- **Dampak:** POST `{status:"berhasil"}` + referenceId yang ditebak (nomor order 4 digit, ranah 9.000/hari; GET publik expose totalIdr) = order gratis terbayar.
- **Perbaikan:** fail-closed (tolak tanpa signature); verifikasi nominal SELALU; pertimbangkan token per-order di `notifyUrl`; hapus `totalIdr` dari GET publik.

### 🔴 F3 — `pin-bypass` produksi + middleware TIDAK ADA [BLOCKER]
- **Bukti:** `api/auth/pin-bypass/route.ts` PIN `164164`→SUPER_ADMIN, `461461`→CUSTOMER pertama; tanpa gate NODE_ENV/IPAYMU_ENV; tanpa RL. Glob `middleware.*` = 0 file. Interceptor serupa di `lib/auth.ts` di-gate, tapi route ini tidak.
- **Perbaikan:** gate 3-lapis ala `testOtpPeek` atau hapus route + semua pemanggil UI (lihat `05-`).

### 🟠 F4 — Turnstile dummy token lolos produksi
- **Bukti:** `lib/turnstile.ts:21-24` — token `XXXX.DUMMY.` prefix memakai CF test-secret pass-all tanpa gate NODE_ENV.
- **Perbaikan:** cabang dummy hanya `NODE_ENV !== "production"`; token-prefix dilarang keras di prod.

### 🟠 F5 — `send-email-otp` Turnstile opsional
- **Bukti:** `route.ts:53` verifikasi hanya "if token dikirim" → bypass RP.
- **Perbaikan:** wajib 400 bila kosong (samakan checkout).

### 🟠 F6 — ReorderButton menulis Cart DB yang tidak pernah dibaca UI
- **Bukti:** `components/commerce/ReorderButton.tsx` → POST `/api/cart/items/batch` (DB `Cart/CartItem`), sedangkan drawer 100% zustand LS. grep se-src: tidak ada reader DB cart dari UI.
- **Dampak:** tombol "PESAN LAGI" membuka keranjang KOSONG.
- **Perbaikan:** satu SSOT — hydrate DB cart saat login ATAU ReorderButton menulis ke `useCartStore`.

### 🟠 F7 — sessionStorage QRIS restore dead-code
- **Bukti:** `DirectQrisModal.tsx:53-64` menulis `kaoskami_pending_qris` "agar QR survive refresh" — reader TIDAK ADA (grep).
- **Perbaikan:** implement reader + restore via `request-payment`, atau hapus penulis.

### MINOR
- **M1** WITA vs WIB: `InvoiceLiveBits.tsx:55-60` `toLocaleString("id-ID")` tanpa `timeZone` → stamp WIB label WITA. Kontras `shopHours.ts` benar (`Asia/Makassar`).
- **M2** Idempotency-Key baru setiap klik bayar (`CheckoutModal.tsx:79-86`) — timeout 75s re-klik = duplikat potensial (server index non-unique, lihat `06-`).
- **M3** Ongkir silent-fallback ke kurir termurah lain bila pilihan user tak ditemukan (`checkout/route.ts:412-424,439-445`); mobile 400 eksplisit — DV`JERGensi web/mobile (dikonfirmasi `07-` #1).
- **M4** RepayButton sticky bar tanpa `totalAmountIdr` (`orders/[id]/page.tsx:505`) → modal QRIS "Rp 0".
- **M5** Express surcharge via `courierNotes` hack `[TIER:EXPRESS_24H]` — buat kolom `serviceTier`.
- **M6** Guest `phoneVerified:true` tanpa OTP (`checkout/route.ts:509-519,646-659`) — terkonfirmasi auditor data (06).
- **M7** Payment status naming inkonsisten `SETTLEMENT` vs `SETTLED` (direkonfirmasi 06 & 07).
- **M8** GET `orders/[id]` publik expose `totalIdr` + `paymentRef` — rantai F2; token/HMAC per-order untuk URL invoice.

## C. Tidak ada / jujur-terverifikasi
- Idempotensi: ADA (pola claim→seal) tapi non-unique index — klaim "tidak ada idempotency" PALSU; klaim "tanpa concurrency-guard" BENAR.
- Limit OTP: ADA & layak (send 3/5mnt IP+phone; verify 5/3mnt phone + 10/3mnt IP; hash+pepper CSPRNG; burn single-use) — klaim "tanpa limit OTP" PALSU.
- Duitku md5/RATIO: N/A — gateway aktif iPaymu (env `IPAYMU_VA/API_KEY/ENV`; HMAC-SHA256 `METHOD:VA:SHA256(body):apiKey`); tidak ada kode Duitku.
- `middleware.ts` TIDAK ADA sama sekali.
- Gate payment expiry per-order: TIDAK ADA (hanya sweep global 24h).
- Guard double-submit selain limiter umum + idempotensi non-watertight: TIDAK ADA.
- Model fee/markup pembayaran: TIDAK ADA.
- WA otomatis "paid": TIDAK ADA — sesuai kebijakan owner (manual wa.me tersedia di invoice ✓).
- Route `/cart`,`/checkout`,`/login`: TIDAK ADA sebagai halaman.
- Rantai ongkir & flat DEFAULT 25000: baik, tanpa bolong gratis.

## D. Top 5
1. F3 pin-bypass + 0 middleware — exploit paling mudah.
2. F2 webhook forgeable — uang langsung.
3. F1 QRIS palsu — kepercayaan di momen pembayaran.
4. F4 dummy Turnstile + F5 email OTP — anti-bot dinonaktifkan faktis.
5. F6+F4-chain UX — konversi uang riil hilang (reorder kosong, QRIS Rp 0).
