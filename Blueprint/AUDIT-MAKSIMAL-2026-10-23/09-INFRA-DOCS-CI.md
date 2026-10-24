# 09 — INFRA, KONFIG, DOKUMENTASI, CI, SCRIPTS & REPO HEALTH

> Sumber: Auditor 9 (very thorough) + riset dependensi langsung (npm audit/ls di sesi ini) + verifikasi tsc/vitest.

## A. Dokumen kunci (ringkas)

- **README.md**: klaim `tee-basic.draco.glb` rantai + decoder `public/decoders/draco/` — **TIDAK ADA di disk** (lihat.Tempuan 2).
- **RUNBOOK.md** (10 §): §1 iPaymu jalur aktif (QRIS in-app, webhook `/api/webhooks/ipaymu` idempoten; Duitku 410 audit-only) ✓ kode; §2/§2b Fonnte fail-safe + kill-switch exact-string ✓ kode; §5 `prisma migrate` P1013 → SQL via `@libsql/client` adalah satu-satunya jalur tulis skema ✓; §6 Prisma v7 TIDAK BISA workerd → Drizzle + `@libsql/client/web` + transpilePackages + alias ✓ (`next.config.mjs:11,158`); §8 keystore beta + Capacitor major wajib甘 se-major ✓; §9 deploy gate `npm run deploy` ✓ (tapi baris 65-71 "px tsc/pm run" korup); §10 cron EKSTERNAL cron-job.org ✓ (wrangler.jsonc tanpa triggers) — **gap: `/api/cron/shipping-sync` ada di kode tapi TIDAK terdok RUNBOOK**.
- **DESIGN.md**: token OKLCH + SSOT `globals.css`, tier tombol, motion, z-index SSOT `src/lib/zIndex.ts` dengan catatan MISMATCH `Z_CLASS_POPOVER` (tabel z-[70] vs file z-50) — dan kini **terbukti hard**: vitest 4 GAGAL di `zIndexHierarchy.test.ts` (konfirmasi langsung).
- **ASSET_CREDITS.md**: MIT tee/longsleeve; CC-BY 4.0 sweater/hoodie/jacket terverifikasi; pants/shorts MIT dari `Blueprint/ASSET-WAVE1-CHECKLIST.md` — file itu HILANG (chain-of-custody terputus).

## B. Klaim AGENTS.md: HILANG vs ADA (terverifikasi)

Tabel: ringkas — banyak file diklaim ada tapi TIDAK ADA. Daftar HILANG (determinant):
- `Blueprint/RINGKASAN-LENGKAP.md`, `TODO-SISA-KERJA-MAXIMAL.md`, `TODO-TESTLAB-{ADMIN,USER,ENV,MOBILE}`, `CRON-JOB-SPEC.md`, `ALUR-LENGKAP-USER-ADMIN-PROGRAM.md`, `TODO-MOCKUP-5PER5.md`, `ASSET-WAVE1-CHECKLIST.md`, `mobile/BLUEPRINT-M1..M10`, `BUILD-PROGRESS-TRACKER-MOBILE.md`, `e2e/E2E-MASTER-PLAN.md`, `e2e/hasil-pengujian-e2e/{README,BAB-COVERAGE,_template}`, `e2e/{TODO-MASTER,DUITKU-SANDBOX,SOP-REFUND,SOP-REKONSILIASI,KEBIJAKAN-RETENSI,PLAYBOOK-CS,PANDUAN-RUNNER}.md` — ±21+7 file.
- `PANDUAN-RUNNER.md` seharusnya menspesifikasi 9 script runner — runner-nya ada (`scripts/test-3pillars-audit.mjs`, `e2e-R-CHAT.mjs`, `e2e-kasus-1..6.mjs`, `verify-mobile-parity.mjs` = 9, cocok index.md Suites 2–10) tapi SPEKNYA hilang.
- Implikasi: CI draft `.github/workflows/e2e-{nightly,smoke}.yml` mengacu ke `E2E-MASTER-PLAN.md` hilang; dua-duanya self-drafted "DRAF belum proof-hijau".

## C. Temuan

### #1 [MAJOR] CSP connect-src hash bucket R2 ≠ R2_PUBLIC_URL
- `next.config.mjs:60`: `https://pub-5746f36a46904edc8425ecd72 517865c.r2.dev` vs `wrangler.jsonc:47` `R2_PUBLIC_URL = …1b0bfdc.r2.dev`. Satu pasti stale → fetch/XHR ke URL R2 benar ditolak CSP (img aman `img-src https:`).
- **Fix:** samakan (tentukan bucket aktif `wrangler r2 bucket list`), lalu perkecil `img-src https:` juga (05-#7).

### #2 [MAJOR] Dokumentasi klaim Draco yang tidak ada
- `README.md:47-48`, AGENTS.md "LOCAL ASSETS"; disk realita: 13 file non-Draco; `public/decoders/` hanya `basis/`; `scripts/sync-assets.mjs:8-12` draco SOFT-DISABLE 14 Sep 2026 diarsip `backups/draco-archive/` (folder juga dihapus).
- Rantaian `probeFirstExistingUrl` sehat walau miss — tapi dokumen salah arah. **Fix:** update README/AGENTS; hapus `setDecoderPath` (`02-` #7).

### #3 [MAJOR] Coment vs kode `images.unoptimized` kontradiktif
- `next.config.mjs:27-31`: komentar "optimasi AKTIF" vs value `true`; `wrangler.jsonc:35-38` bilang value true disengaja (benar untuk Workers). Dua dokumen saling menanding — pengembang berikut "membetulkan" → memicu loader di Workers. **Fix:** hapus komentar CWV lawas; SSOT satu sumber.

### #4 [MAJOR] ±24 file Blueprint hilang termasuk SSOT pengujian; CI men-acu
- **Fix:** pulihkan dari backup/archive ATAU cabut referensi + tandai workflows `enabled: false`.

### #5 [MAJOR] Chain-of-custody lisensi terputus
- `ASSET_CREDITS.md:14-15,24` rujuk file/folder hilang (ASSET-WAVE1, backups/*) — verifikasi lisensi tak reconstruksional oleh clone lain; risiko kepatuhan komersial. **Fix:** relokasi bukti ke repo/R2 audit + tulis ulang path mati.

### #6 [MAJOR] ±50MB raw mascot di git
- `git ls-files "Kaos Kami Mascot"` = 15 PNG (3.3–6.4MB); `.git` 371.6MB; duplikat ×2 workspace, `kamito-full-standing-clean.png` 6.39MB juga di web. **Fix:** `git rm -r` (simpan lokal) + generate varian dari satu master; `git filter-repo` (destruktif, keputusan owner terpisah).

### MINOR
- **#7** workflows e2e masih DUITKU_* env (dead gateway) → pindahkan iPaymu sandbox vars (pattern RUNBOOK §1).
- **#8** `mobile-ci-build.yml`: typecheck tanpa `-p`; `if: secrets.X != ''` perlu env-indirection verify; `paths`+`tags` OR-ness.
- **#9** `eslint ignoreDuringBuilds: true` (`next.config.mjs:4-6`) — lint hanya CI/manual; pertahankan aturan theme ke error di CI.
- **#10** cron & register test stale: shipping-sync tak terdok; `hasil-pengujian-e2e/index.md:27-29` angka lawas vs 34 vitest files hari ini (tracker #36-40 said 236/236).
- **#11** env duplikasi 3-4 lokasi (root .env/.env.local + web + .dev.vars) — semua TIDAK tracked (aman) tapi rotasi manual; satu sumber + copy script.
- **#12** artefak lokal berat & folder aneh: `scratch/` 154.5MB (742 file), `Screenshot/` 31.5MB, `.agents/` 5.7MB, root `.open-next/` hasil deploy lama, ±36 log, tes *.docx — digitignored (aman), tapi berat disk.
- **#13** `optimizePackageImports` membawa `framer-motion` di web (tak ada dep) — hapus.
- **#14** `BUILD-PROGRESS-TRACKER.md` #39 duplikat + "Last-Update 11 Okt" stale vs entri lebih baru.
- **#15** `.env.example` & `.dev.vars.example` lengkap & hanya placeholder — GOOD.

## D. Verifikasi dependensi & build (dilakukan langsung di sesi audit)

### tsc & vitest
- `tsc --noEmit` web → 0 error; `tsc -p mobile` → 0 error.
- `vitest web`: **232 test, 4 GAGAL** — semua `src/lib/zIndexHierarchy.test.ts` (rantai z-index Z_AUTH/Z_POPOVER/Z_QRIS/Z_TOAST vs `zIndex.ts`). Konfirmasi langsung catatan MISMATCH DESIGN.md.

### npm audit --omit=dev → 7 kerentanan (3 critical, 4 high)
| Paket | Advisory | Konteks nyata proyek |
|---|---|---|
| next 15.5.25 (critical) | GHSA-4jqv-mc3x-m676 (cache poisoning SSG/ISR self-hosted), GHSA-mcj8-r9mp-w47p, RCE image-opt SVG GHSA-2464-fhr4-w9xw, DoS Server Actions GHSA-p3m5-59mp-jv5r | OpenNext Workers ≈ self-hosted → cache poisoning relevan; RCE image-opt TIDAK berlaku sementara `unoptimized:true` (tapi lihat LDR konfig; jangan "perbaiki" tanpa dedup juga); upgrade patch 15.5.x terbaru + verifikasi kompat opennextjs (nih `--dangerouslyUseUnsupportedNextVersion`) |
| postcss ≤8.5.22 (high) | 4 advisory (XSS </style>; path traversal sourceMappingURL dll) | via next — build-time |
| sharp <0.35.5 (high) | librsvg CVE-2026-96889 | dari next + @gltf-transform/cli — exposure runtime-minimal (image opt off); dev pipeline terdampak |
| source-map-js (high) | event-loop DoS | build/dev saja |
| dompurify 3.4.15 (high ×3) | GHSA-mrv2-3pqr-j5jr, GHSA-p98j-92pf-mc4p, GHSA-c6gr-qvv4-5v3f | berasal `jspdf@4.2.1` (client-side!) — cek apakah `jspdf.html()` fed konten tidak tepercaya (invoice PDF) |
- `npm audit fix` tersedia; jalankan bertahap + test. **Jangan blind-fix `next` tanpa cek kompat opennextjs-cloudflare.**

## E. YANG TIDAK DITEMUKAN (eksplisit)
- CI auto-deploy: TAK ada (sesuai aturan owner — deploy manual via `npm run deploy`).
- Coverage vitest/threshold: TAK ada.
- Sentry prod aktif: TAK (placeholder; `withSentryConfig` belum).
- Backup DB otomatis ganda: hanya mingguan cron → R2 (retensi/verify manual).
- Dependabot/Renovate: TAK ada.
- Jadwal `shipping-sync`: TAK terjadwal di mana pun (fitur ada di kode).
- Error budget/SLA: TAK ada di docs.

## F. Config yang sudah dicek baik
- tsconfig web: strict + noUncheckedIndexedAccess + noImplicitAny ✓
- vitest config: node env, 34 test files ✓ (tambahkan coverage)
- playwright.config.ts DRAFT R1 (setup/api/chromium/l3, storageState gitignored)
- open-next.config.ts r2 incremental cache; wrangler.jsonc: worker `kaos-kami-3d`, compat 2026-08-31, nodejs_compat, self-ref service, KV ratelimit, secrets.required 10 — TIDAK ada D1/cron triggers (sesuai desain)
- ci.yml: install → prisma generate (dummy URL) → typecheck web+mobile → lint → vitest → build web → build mobile → Lighthouse (LCP<3.5s, CLS<0.1, a11y 0.9) — tanpa deploy ✓
- Health repo: main == origin/main, 919 file tracked, kredensial/PII tak pernah tracked, gitignore baik

## G. Top 5
1. Hash bucket R2 CSP vs wrangler (functional bug nyata)
2. Pulihkan/cabut ±24 file Blueprint hilang (CI & kebijakan mengacu file hilang)
3. Rekonstruksi bukti lisensi (kepatuhan komersial)
4. Angkat ±50MB mascot dari git
5. Sinkron dokumentasi ↔ realitas (Draco, unoptimized, register test) + upgrade next patch (jarak ke 7 CVE)
