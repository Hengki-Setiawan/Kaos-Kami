# AUDIT DETAIL — BACKEND & MOBILE

> Induk: `AUDIT-MENYELURUH.md`. Metode: baca penuh + probe live + uji numerik + docs resmi.

---

## A. BACKEND — AREA & NILAI

| Area | Nilai | Alasan |
|---|---|---|
| DB / Drizzle | 2/5 | Tanpa FK/check, tabrakan orderNumber, repay UNIQUE, race user |
| Auth | 2/5 | Eskalasi role, cookie basi, campur akun guest |
| Payment | 3/5 | Server-pricing + fail-closed bagus; repay/oversell/Rp0/COD |
| Webhook | 4/5 | Signature+merchant+nominal+idempoten benar; minor |
| OTP | 2/5 | Plaintext, stacking, Math.random, limiter lokal |
| Rate-limit | 2/5 | Per-isolate, fail-open, IP spoof, non-atomik |
| R2/upload | 3/5 | Auth+MIME+key-server bagus; base64 skip sharp; Buffer |
| Cron | 3/5 | Fail-closed + race-guard bagus; backup publik, secret biasa |

## B. DB (db.ts, drizzle-schema.ts)

**Race:** orderNumber ruang 9000 + UNIQUE tanpa retry (~40% tabrakan @100/hari) → 500. find-or-create User tanpa onConflict → 500 kembar. Stok cek-dulu-kurang-nanti → oversell (max(0) sembunyikan). `Payment.orderId UNIQUE` → repay 500 pasti. Address tanpa FK → delete yatimkan order. Kompensasi yatim berjendela (tanpa transaksi interaktif).
**Aman:** tanpa FK/RLS/CHECK (satu route lupa guard = bocor). `isoDateTime` null → 1970/Invalid.
**Inkonsisten:** default status campur; enum hanya Zod; transisi mundur bebas; CartItem tanpa unique (dedup app, race dobel).
**Obat:** retry orderNumber / nanoid8; onConflict user; decrement kondisional + flag; repay update-in-place + auth; FK/CHECK bertahap. Estimasi: 2–3 hari.

## C. AUTH (auth.ts, guard, schemas, [...all])

**Eskalasi:** `role` tanpa `input:false` → daftar sebagai ADMIN (P0, terverifikasi sumber better-auth).
**Basi:** cookie-cache 5 mnt → demote telat; semua route admin baca cookie.
**Campur akun:** guest checkout `or(phone,email)` menumpang akun korban; guest tak bisa batalkan sendiri.
**Lain:** Google env kosong samar; email tanpa verifikasi; password min-6 custom; staff baca PII penuh.
**Obat:** input:false + tolak payload + baca DB untuk admin + audit ADMIN + verifikasi email + password policy + minimasi PII. Estimasi: 1–2 hari.

## D. PAYMENT (duitku.ts, confirmOrder.ts, checkout×2, repay, cancel)

**Benar:** hitung ulang server; itemDetails balance; fail-closed 502; satu pintu + race-guard.
**Sisa:** repay 500 (P0-4) + expire-dulu; COD tak dikenal webhook/repay; total-Rp0 lolos; discount negatif; oversell; kupon hangus; method mentah; mobile tanpa varian; MD5+HMAC ganda (catat hapus MD5).
**Obat:** lihat P0-4 + guard total-min + COD eksplisit + clamp total + sinkron stok-coupons + samakan varian. Estimasi: 1–2 hari.

## E. WEBHOOK

**Benar:** form+JSON, 400/401/404/merchant-asing/nominal/idempoten/satu pintu.
**Sisa:** amount opsional saat sukses; race ganda (payload last-wins); FAILED tanpa history; compare non-timing-safe.
**Obat:** wajibkan amount + history gagal + timingSafeEqual. Estimasi: kecil.

## F. OTP (send/verify/track)

**Bug:** multi-kode valid; plaintext; Math.random; validasi longgar; format campur; mock-guard membingungkan.
**Lubang:** tanpa counter DB; limiter memory antar-isolate/IP; IP spoof; enumerasi via track.
**Obat:** hapus kode lama + hash + CSPRNG + counter DB + normalisasi tunggal + kunci per-user. Estimasi: 1–2 hari.

## G. RATE-LIMIT

Merata + Retry-After benar. Masalah: per-isolate (KV aktif sejak Fase 17 — membaik), fail-open, IP spoof, non-atomik, kuota global per-order, tanpa kunci user. Obat: kunci user + DO presisi + timing-safe. Estimasi: 1 hari.

## H. R2 / UPLOAD

**Benar:** login + allowlist + 10MB + key server + sharp multipart.
**Sisa:** base64 skip sharp; contentType dipercaya; designs fallback bengkakkan DB; OOM regex; Buffer vs compat; Turnstile catch fail-open. SSRF: TIDAK TERBUKTI (hanya data: URL; fetch user tak ada). Risiko nyata = stored URL tak tersanitasi di renderer.
**Obat:** samakan pipeline + magic-byte + batas + hapus fallback DB. Estimasi: 0,5–1 hari.

## I. CRON (sweep/backup)

**Benar:** fail-closed + Bearer exact + race-guard + batch + dokumentasi jujur.
**Sisa:** secret biasa; sweep tanpa limit; backup ke bucket PUBLIK (P0-3); OOM string; escape kutip; rotasi + IP allowlist.
**Obat:** lihat P0-3 + rotasi + allowlist. Estimasi: 0,5 hari.

## J. AREA PELENGKAP

- **Cart:** harga client (server hitung ulang — aman); qty tanpa max POST; variant/design tak divalidasi.
- **Designs:** guest PATCH/DELETE by-obscurity; claim/autosave `z.any` raksasa; sync by-title (kolisi/overwrite); fallback kategori diam; LWW jam-HP.
- **Admin:** guard seragam bagus; tasks tanpa pemilik/transisi; claim overwrite; kupon FIXED max100; ADMIN promosikan SUPER_ADMIN.
- **Katalog:** publik wajar; ETag mobile bagus; eq tanpa sanitasi panjang.
- **Mobile API:** status publik tanpa PII (diterima); register benar.

---

## K. MOBILE APP

### Peta
5 tab (home/studio/catalog/orders/profile). Checkout: cart → sheet → API → tracker polling 10dtk → Browser Duitku. Sync SAVE_DESIGN + push + deeplink `kaoskami://` + QS Tile.

### Nilai per area
| Area | Nilai | Alasan |
|---|---|---|
| Checkout & order | 3 | Lengkap + fail-closed; validasi telat; total tanpa diskon; size L hardcode |
| Kupon | 3 | Sanitasi baik; tanpa format/max; navigasi skip |
| Admin workshop | 2 | Tolak=COMPLETED + approve tanpa PATCH = data bohong |
| API error-handling | 2 | Tanpa timeout/retry/auth; null generik; platform hardcode |
| Offline | 2 | Persist ya; checkout wajib online; trigger minim |
| Versi plugin | 2→? | Core v8 vs 12×v7 (branch: samakan 19 — verifikasi HP tertunda) |
| Token/URL | 3 | HTTPS baik; userId plaintext; backup on; deeplink longgar (aman via poll) |
| Data pribadi | 2 | Hardcode 5 file + dual nomor (P0-9) |
| 3D/perf | 4 | Disposal + tier + context-loss terbaik; physical di low; video base64 OOM |
| Signing/build | 4 | Env/key.properties benar; vCode 1; minSdk 23; minify off |

### Temuan penting
1. **Tolak=COMPLETED + approve tanpa PATCH** — data bohong. Obat: REJECTED + mapping + taskId. 4–6 jam.
2. **Poison queue** — 1 mutasi tahan semua (desain ikut). Desain idempoten → aman tapi berisik. Obat: ack per-id + retry + Preferences. 6–8 jam.
3. **Data pribadi dev** — 5 file + dual nomor. Obat: akun login + env tunggal. 2–3 jam.
4. **Campur mayor v7×v8** — upgrade 12 plugin + regresi Android 13–15. 1–2 hari.
5. **Nol timeout/retry + listener bocor + polling boros** — timeout 12–15dtk + retry + backoff + removeListener + platform dinamis. 5–7 jam.

---

## L. INFRA & RENCANA OBAT BERURUT

1. P0-2 (role) → 2. P0-1 (dashboard redirect) → 3. P0-5 (admin fail-closed) → 4. P0-3 (bucket privat) → 5. P0-4 (repay) → 6. P1 backend batch → 7. P1 3D batch → 8. Mobile batch → 9. P2 UI batch.
Estimasi total: P0 ≈ 3–4 hari, P1 ≈ 8–12 hari, P2 ≈ 10–15 hari (termasuk uji). Tanpa ubah skema kecuali noted.

---

## M. PUTARAN 2 — TEMUAN BARU TERVERIFIKASI (8 Sep, malam)

### Koreksi
- GUGUR: unlink `undefined` (Drizzle filter), pola header GLB (probe 200 + immutable benar), KV mati (aktif Fase 17), campur React (satu pohon pasca-merge), keystore ter-commit (bersih; hanya google-services.json yang disengaja).

### API baru (semua lokasi file:baris terverifikasi baca kode)
- **Items tanpa max (web)** vs mobile max(20) → DoS/latensi. Samakan + cap qty.
- **OrderNumber tanggal UTC** (00–08 WITA mundur sehari) → `Asia/Makassar`.
- **Fallback localhost** untuk invoiceUrl → fail-closed + validasi boot.
- **Tanpa isSafeInteger/cap Rp** → total fiktif ke Duitku. Tolak >Rp500jt.
- **Mobile collapse ke SP** → whitelist metode + 400.
- **DTO gagal drift** (userId vs detail) → satu tipe `CheckoutFailure`.
- **deviceId dibuang** → simpan ke audit.
- **Harga HP dipercaya** → hitung ulang server.
- **`designId:""` sukses palsu** → throw + 207 per-item.
- **N+1 ±150 query serial** → preload categories + bulk.
- **Autosave sukses-palsu + z.any + DRAFT tertimpa + cuid-vs-nanoid PATCH mati + DELETE tanpa guard + GET menulis + OTP oracle + delete fail-open + send tanpa Zod.**
- **Kupon TOCTOU** (consume tanpa cek aktif/expired). Klaim "16 jam" SALAH (Date tz-agnostic).
- **Register unlink: BUKAN bug** (terbukti di kode Drizzle).

### Mobile baru (lokasi terverifikasi)
- Manifest: backup tanpa rules (token ke Drive); deeplink tanpa host (spoof hasil bayar); TileService API 23 vs butuh 24; permission timpang; FileProvider over-broad.
- Build: versionCode statis; minify off + R8 tak lengkap.
- Wrangler: host DB + Account ID plaintext (pindah secret + binding R2); tanpa limits/placement/observability/triggers.
- Health dangkal (tanpa tulis/KV/R2/latensi, bisa di-cache, bocor uptime).
- db.ts: dummy membingungkan + raw client bocor soket.
- Drift: enum ongkir, katalog (crewneck hilang, jacket-vs-shirt, flat 35rb), tracker (CANCELLED tampil Siap Dibayar + tombol bayar → risiko bayar ganda!), Rp0/0x0cm.
- Camera triple-copy; network error = online; store tanpa version; scanner prompt; biometrik tanpa PIN.

### 3D baru (terverifikasi baca kode)
- Gizmo 3-angka beda; box per-side; leak Hoodie/Shirt; center() geser; wind ganda/X-only; knit scale; tier-low; kamera literal; Draco; exposure; rotasi hilang; offset 2cm; OOM ekspor; printUV stretch; compress PNG; removeBG interior; textDecal 3:1; dpi 1-sumbu; verlet tuning; ClothLab render-side-effect; PatternStudio dispose/listener/timeout; sync 60Hz; ID lemah; anchor unduhan; kanvas salah; scroll magic; activeDecal null; hex desync; dialog a11y. (Detail: AUDIT-OTAK-3D.)

