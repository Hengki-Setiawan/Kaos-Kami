# TODO MAKSIMAL — Sisa Kerja Kaos Kami (13 Sep 2026, hasil audit 6 agen paralel + eksekusi 8 agen)

> Sumber: audit paralel + eksekusi 13 Sep 2026. `tsc` web+mobile = 0 error (terverifikasi pasca-eksekusi).
> Aturan: DEPLOY/PUSH GATE berlaku — jangan `git push` / deploy Cloudflare tanpa perintah eksplisit owner.
> Legenda: `[x]` selesai di kode (tsc 0) · `[~]` sebagian / menunggu owner · `[ ]` belum.

---

## P0 — Uang / Order / Legal / HP kentang

### P0-1. Payment-before-charge + rekonsiliasi yatim
- [x] `checkout/route.ts` — insert `Payment PENDING` (`pending-<orderId>`) SEBELUM `createCharge`, update `providerRef` setelah sukses.
- [x] Sama di `mobile/orders/checkout/route.ts` (paritas penuh).
- [x] Job rekonsiliasi SELESAI 13 Sep (fase di `cron/sweep`: `PENDING_PAYMENT` >30 mnt tanpa `Payment` → `checkTransactionStatus` → buat baris + `confirmOrderPaid`, batch 20, respons `{reconciled, created}`).

### P0-2. Idempotency-Key anti double order / double charge
- [x] Replay-check `Idempotency-Key` (8–128 char) via tabel `Verification` (`idem:checkout:<key>`, 24 jam) → 409 + order lama; klaim in-flight → 409. Best-effort TANPA migrasi (identifier non-unique; prosedur `@unique`+P2002 terdokumentasi di komentar, JANGAN eksekusi tanpa perintah).
- [x] Kompensasi diperluas: hapus `Address` + `Design` arsip yatim.
- [x] Client kirim key unik per klik: `CheckoutModal:newIdempotencyKey` (crypto.randomUUID) + `CheckoutSheet` + `mobileApiClient.checkout(opts.idempotencyKey)`.

### P0-3. Gerbang OTP server-side + guard FREE_MAKASSAR
- [x] Kedua checkout: wajib `otpCode` 6-digit (`hashOtp` + expiry + owner-match + satu-pakai, tiru repay) → tanpa OTP = 401. Kurir eksplisit wajib match live rates (else 400, tanpa silent-fallback). Turnstile prod fail-closed (secret kosong → 503).
- [x] Guard kota: `FREE_MAKASSAR` wajib district dalam `MAKASSAR_SUBDISTRICTS` (else 400) di kedua checkout.
- [x] UI wiring: `CheckoutModal` (KIRIM OTP + input digits-only + pesan 401/403/409 jujur; VERIFIKASI tidak lagi burn kode — cek format lokal) + `CheckoutSheet` (langkah OTP + select kecamatan + mirror whitelist di `deliveryOptionsMobile.ts`).
- [x] Kill-switch darurat 13 Sep (default aman): `CHECKOUT_OTP_REQUIRED=false` lewati OTP (darurat Fonnte mati) + `TURNSTILE_ENFORCE=false` lewati Turnstile — eksplisit "false" saja yang bypass, unset = wajib.

### P0-4. Lisensi aset (legal)
- [x] Tuntaskan hoodie legacy: `hoodie.glb` & `hoodie.lod1.glb` dipensiunkan ke `backups/models-archive/` (13 Sep 2026), rantai default & fallback beralih 100% ke `hoodie-blue` (Irevex11, CC-BY 4.0 terverifikasi). File staged (`tee-alt`, `fleece-alt`, `hoodie-flat`) diamankan ke `backups/models-archive/`. Sisa: `jacket.glb` (kandidat CC-BY bomber DeJuan_Owens / varsity ValentynPetrov staged di `Asset 3D/sketchfab/`). `longsleeve.glb` SELESAI (MIT hulu Starklord/JS-Mastery).
- [~] `pants.glb` + `shorts.glb` masuk `ASSET_CREDITS.md` (hash + tris terukur) — BUTUH: URL repo GitHub madjin persis + file LICENSE; `/kredit` + `/admin/assets` belum diupdate.

### P0-5. Geometri + rantai aset
- [~] `cap.glb` LOD1 TERUJI di temp (`simplify --ratio 0.3`: −57% byte, 93,2k→45,4k tris, bbox identik, validate bersih) — BUTUH: QA visual + promosi manual ke `public/` + wiring rantai (perintah siap di laporan agen).
- [~] `tee-alt.draco.glb` TERUJI di temp (−22,5%, tris identik, validate bersih) — BUTUH: promosi manual (porsi besar = PNG 1024, perlu keputusan resize tekstur owner).
- [ ] LOD1 10/12 model + Draco (`fleece-alt`, `hoodie-flat`, `mannequin`, `pants`, `shorts`) + rename `hoodie-flat.glb` — belum (keputusan owner).

### P0-6. Split bundle + guard backup
- [x] `studio/page.tsx` → dynamic `StudioClient` (ssr:false); `StudioClient` → dynamic `CanvasStage`, `three` via dynamic import; `app/page.tsx` → dynamic `CanvasStage`; gsap lazy di `SmoothScrollProvider` + `useScrollPhases`.
- [x] `cron/backup`: guard `out.length > 25jt → 413` + rencana split per-tabel di komentar.

---

## P1 — Backend / Mobile / Security / Web TODO

### P1-1. Backend commerce + admin + cron
- [x] Admin: coupons `GET`+`DELETE`; customers `GET` paginated; catalog `POST/DELETE` → 405 jujur (read-only by design); production `claim` race → 409 bila dipegang operator lain.
- [x] Quote: param `?qty=` (bucket sama dengan checkout) + tolak `EXPEDITION_MANUAL` tanpa postalCode/zoneId/city → 400 + helper `validateExpeditionSelection`.
- [x] Cron marker `cron-state/sweep.json` + `backup.json` (best-effort) + `health.cron.{sweep,backup}.{at,ageSec}`.
- [x] Auth/OTP: `trustedOrigins` kondisional; `track/orders` → `^\d{6}$`; `send-otp` tak log kode di prod.
- [x] R2: kuota `upload:user:<id>` 50 file + 200MB/hari.
- [x] Histori `cms/hero-<ts>.json` SELESAI 13 Sep (arsip best-effort + retensi 10) + endpoint `GET /api/cron/backup-status` (nama file + umur saja, rate-limit 30/mnt).

### P1-2. Mobile M8 + M4
- [x] M8 monetisasi DICORET dari scope 13 Sep (selaras QRIS-only Fase 26; file billing/ads/ProUpgrade sudah dihapus).
- [x] TechPack KEPUTUSAN 13 Sep: tetap HTML (cetak via browser cukup untuk workshop) — PDF DITUNDA sampai ada permintaan bengkel.
- [~] Duitku Pop opsional (`tryDuitkuPop` + fallback Browser + parser return URL) — BUTUH: uji sandbox end-to-end (owner).

### P1-3. Mobile M9 / M5 / M3 / admin + manual
- [ ] M9: uji fisik + `ios/` di Mac + putuskan `useMaterialYou` (rekomendasi agen: coret dari blueprint).
- [x] M5: replay `SUBMIT_ORDER` (+`SAVE_DESIGN`) via `replaySupportedMutations`; `UPDATE_CART` diputuskan unsupported (cart = persist lokal).
- [ ] M3: ukur fisik cap/sweater/outseam + QA visual (komentar JANGAN-UBAH sudah dipasang).
- [ ] Admin: sesi login admin + mapping REJECT server (TODO tak ditemukan di kode 14 Sep — butuh spek owner: transisi status + peran).
- [ ] Manual (owner): `google-services.json` → FCM; AAB CI → uji HP fisik; `npx cap add ios`.

### P1-4. Security / perf / infra
- [~] Sentry: `require`→`import()` dinamis SELESAI 14 Sep (`global-error.tsx`) — BUTUH owner: `wrangler secret put SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`.
- [x] Headers: CSP minimal + HSTS + COOP (allow-popups agar Duitku/OAuth tak putus).
- [x] Pola immutable `/:path*.ext` (diputuskan: biarkan + verifikasi via curl pasca-deploy) + binding `IMAGES` DIHAPUS 13 Sep dari `wrangler.jsonc` (unoptimized:true benar di Workers).
- [x] Mobile: `minifyEnabled` + `shrinkResources` true. BUTUH owner: key Play BARU + CI secrets (keystore kini = BETA sideload).
- [~] Backup privat OK + marker di health — BUTUH owner: lifecycle bucket + alert >8 hari.
- [x] Turnstile fail-closed + `timingSafe`→`node:crypto` + hapus `sharp` (lockfile sudah disinkron `npm install --package-lock-only`) + kuota upload + OTP tutup `OR(phone,email)`.
- [x] Manifest direviu: semua izin terbukti dipakai (nol dicabut).

### P1-5. Web TODO lanjutan (Fase D/F/M)
- [~] D3 SEBAGIAN 13 Sep (leva dev-only + overlay DPR/exposure, nol byte prod; r3f-perf SKIP sadar — konflik drei v10); F3 AI BG (tunggu klarifikasi AGPL); M2.2/M2.5 (Blender); M2.10; M3.6 diputuskan soft-gate + terdokumentasi; M4.1 grouping teamwear SELESAI 13 Sep; M4.3 snapping ±6px SELESAI 13 Sep; M5 blind-test + Wave-1 unduhan owner.
- [x] BG remover: `maxSide` adaptif + `onProgress` (algoritma tak berubah; Worker diputuskan SKIP — flood-fill <10ms pada cap ini).
- [x] Weave: diputuskan BIARKAN (slot-tunggal hemat ~2MB VRAM; cache 3 profil justru lipatkan VRAM).

---

## P2 — Hygiene kecil

- [x] `enhance-image` 501 DIPERTAHANKAN sadar (501 jujur + rate-limit > 404 misterius; didokumentasikan).
- [x] `admin/cms GET` rate-limit 30/mnt; WA `orders/[id]` → `SHOP_WHATSAPP`.
- [ ] G1 WebGPU + E1-KTX2 antre non-blokir.
- [x] Centang box TODO-MOCKUP yang sudah selesai di kode — SELESAI 14 Sep (terverifikasi sinkron: M0.2, M2.3/2.4/2.6–2.9, M3.1–3.5/3.7 `[x]`; M2.10 `[~]`; M4.1/M4.3 parsial `[x]`).

---

## Docs + Git/Build (tanpa push/deploy)

- [x] Fix docs: AGENTS (Duitku, Workers-opennext, repoint tracker, path monorepo) + README (Next 15.5/React 19/three 0.180, Quick Start workspaces) + RUNBOOK (§8→8,9,10; whatsapp:64; Blueprint04 basi) + M1 (Next 15).
- [x] Validasi: `web:typecheck` ✅ 0 (13 Sep) · `mobile:typecheck` ✅ 0 · `web:build` ✅ HIJAU (13 Sep, /studio 1.44kB/105kB — split chunk terbukti; / 35.5kB/302kB) · `mobile:build` ✅ HIJAU (13 Sep) · `vitest` ✅ 10/10.
- [x] Komit selektif SELESAI 13 Sep, 9 komit lokal (0452dd3 … 4fafbdc; terbaru = 4fafbdc) — TANPA push (menunggu perintah). Termasuk arsip 9 PNG brand tak-terpakai (~20MB) + fix repay-EXPRESS/peran/guard-task/deep-link. Tersisa untracked by-design: `ios/`, `*/public/models/*.glb`, `textures/`, `animations/`, `Asset 3D/` — KOREKSI 14 Sep: hanya `Asset 3D/` yang di-ignore; sisanya untracked-visible (27 file ±47MB) — putuskan commit selektif vs tambah entri ignore.

---

## Sapuan verifikasi akhir 13 Sep (6 agen audit + 3 agen fix, tsc web+mobile 0)

- [x] B1 sweep cek nominal (`Number(st.amount) !== totalIdr → continue`); B2 seal dilepas saat kompensasi (kedua route); B3 validate kupon pindah pra-OTP + consume-only pasca-klaim (kedua route); B4 webhook guard non-PENDING (ack 200 + event REVIEW, tanpa spawn).
- [x] M1 Turnstile mobile via OTP (OTP lolos → lewati; OTP bypass darurat → Turnstile tetap wajib); M2 returnUrl deep-link tersambung (`returnUrlOverride` di duitku.ts + mobile checkout kirim `kaoskami://payment/callback?orderId=` + `parseDuitkuReturnUrl` di page.tsx + anti open-redirect ketat).
- [x] Docs A1–A8 + C: repoint tracker/PENGIRIMAN, kill-switch di RUNBOOK §2b + AGENTS + `.env.example`, checklist madjin jujur, tabel longsleeve MIT, box MOCKUP sinkron (M4.1/M4.3 parsial, M2.10 `[~]`, shadow 1024), Midtrans overclaim diluruskan, sweep terekam di RUNBOOK.
- [x] Security: kill-switch `=== "false"` semua (4 hit aktual di src — klaim 15 dikoreksi 14 Sep); eval 0; secret hardcoded 0; rate-limit 7 titik; secret ter-track 0. Catatan P1: ~~`.gitignore` belum tutup `.env.production/.env.development/.env.staging`~~ (CORET 13 Sep — klaim basi, SUDAH DITUTUP di `.gitignore:33-35`); Manifest deep-link berubah (3 filter) — handler sudah diperketat, tinggal review.
- [x] Lockfile root sinkron (leva masuk, sharp keluar dari direct dep — 4 hit transitif tersisa, klaim "hilang" dikoreksi 14 Sep). Catatan: vuln 11 → 14 (3 moderate dari leva, dev-only).
