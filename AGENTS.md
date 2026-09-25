# AGENTS.MD — AI AGENT OPERATIONAL INSTRUCTIONS & KNOWLEDGE BASE
# Project: Kaos Kami — 3D Interactive Apparel E-Commerce & DTF Sablon Platform
# Context: Commercial UMKM Platform — Kota Makassar, Sulawesi Selatan
# Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 📌 CRITICAL INSTRUCTIONS FOR ALL AI AGENTS & SESSIONS

Every AI assistant working in this repository MUST strictly follow the architecture, guidelines, and execution tracker established in this codebase.

### 1. The Blueprint & Progress System
All design decisions, schemas, and API contracts are formally documented in the `Blueprint/` directory (+ ringkasan utama `Blueprint/RINGKASAN-LENGKAP.md`):
- **`Blueprint/RINGKASAN-LENGKAP.md`**: ringkasan 1-file seluruh progres (arsitektur, alur, build, validasi, risiko, sisa).
- **`Blueprint/TODO-SISA-KERJA-MAXIMAL.md`**: MASTER EXECUTION CHECKLIST.
- **`Blueprint/TODO-TESTLAB/ADMIN/USER/ENV/MOBILE-MAXIMAL.md` + `CRON-JOB-SPEC.md` + `ALUR-LENGKAP-USER-ADMIN-PROGRAM.md`**: tracker aktif per area.
- **`Blueprint/TODO-MOCKUP-5PER5.md`**: Mockup 5/5 Fase M0–M5 (RENCANA 09 Sep 2026; KTX2 DITUNDA keputusan owner).
- **`Blueprint/ASSET-WAVE1-CHECKLIST.md`**: Checklist unduh Wave-1 (bukti lisensi, dirujuk `ASSET_CREDITS.md` — JANGAN pindah).
- **`Blueprint/mobile/BLUEPRINT-M1-…-M10-*.md`** + **`BUILD-PROGRESS-TRACKER-MOBILE.md`**: spek + tracker mobile.
- **`Blueprint/e2e/E2E-MASTER-PLAN.md`**: SSOT testing Bab 0–17 (±350 test + 60 go-live G + 10 rantai C + roadmap R1–R7). WAJIB dibaca sebelum tulis/jalankan test apa pun; notasi `TEST-<STAMP>-*` + akun factory + bukti 3 lapis (Bab 0, 7).
- **`Blueprint/e2e/hasil-pengujian-e2e/`**: SATU-SATUNYA folder output test (`README` aturan + `index.md` register + `BAB-COVERAGE.md` cakupan Bab 0–17 + `_template/` kontrak + `<run-ts>/` artefak). Klaim tanpa file di sini = BELUM terjadi. JANGAN buat folder hasil lain!
- **`Blueprint/e2e/` (dokumen operasional, dibaca sesuai kebutuhan)**: `TODO-MASTER.md` (checklist urutan Fase 0–5 BERTUAN — baca DULU sebelum kerjakan apa pun!) · `DUITKU-SANDBOX.md` (D-01) · `SOP-REFUND.md` · `SOP-REKONSILIASI.md` · `KEBIJAKAN-RETENSI.md` · `PLAYBOOK-CS.md` (10 template WA + koms insiden) · `PANDUAN-RUNNER.md` (spesifikasi 9 script eksekusi + aturan keras — WAJIB dibaca sebelum tulis/jalankan runner apa pun!).
- Arsip basi (di luar repo): `Backup-Kaos-Kami/arsip/` = `TODO-UPGRADE-3D-MAXIMAL.md` (SELESAI 09 Sep 2026) + `hasil-pengujian-e2e/` (artefak 267MB). Whenever you complete a task, you MUST check off `[x]` the corresponding item in this tracker and update the daily worklog table!

---

## 🏛️ NON-NEGOTIABLE ARCHITECTURAL RULES

1. **Database:** Always use **Turso (libSQL Edge SQLite)**. RUNTIME access MUST go through **Drizzle ORM + `@libsql/client/web`** (`src/lib/db.ts`, schema in `src/lib/drizzle-schema.ts`) — Prisma Client v6/v7 CANNOT run on Cloudflare Workers (eval/WASM blocked by workerd, see RUNBOOK §6). Prisma is kept ONLY for: schema source-of-truth, `db push`, typegen, seed (Node), Studio. NEVER switch to regular Supabase (to prevent 7-day inactivity pause issues).
2. **Object Storage:** Always use **Cloudflare R2** for user-uploaded decals, master assets, and 3D models. Zero egress fees protect the project margin.
3. **Physical Scale Calibration (DTF Sablon Standard):**
   - Maximum printable width is strictly clamped to **30.0 cm** (matching physical DTF printhead limits).
   - Real-world dimensions (`printWidthCm`, `printHeightCm`, `offsetFromCollarCm`) must always be calculated and displayed to users and stored in `ProductionTask`.
4. **Fulfillment (Makassar Hyperlocal + Ekspedisi Nasional):**
    - PICKUP (alamat workshop di invoice) • FREE_MAKASSAR antar tim Rp 0 • Luar kota = AgenWebsite Rate API live (user pilih termurah), fallback tabel `ExpeditionZone` → flat. Detail: `RUNBOOK.md` (§ cron + shipping) dan kode `kaos-kami-web/src/lib/shipping/` + `kaos-kami-web/src/app/api/shipping/` + `kaos-kami-web/src/app/api/cron/` (pengganti `Blueprint/PENGIRIMAN.md` yang sudah tidak ada).
    - Key `AGENWEBSITE_RATE_API_KEY` hanya via secret/env, tidak pernah di-commit.
5. **WhatsApp Notifications:**
   - Automated via Fonnte with **Fail-Safe / Graceful Fallback**: wrapped in try/catch so checkout 100% succeeds, with web invoice + direct `wa.me` manual button.
6. **Cloudflare 3MB Worker Limit:**
    - Keep 3D libraries (`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`) strictly on the client side (`use client` + dynamic imports).
    - The server Worker must remain lean (< 1.2 MB).
7. **DEPLOY/PUSH GATE (aturan owner, Sep 2026):**
    - JANGAN deploy ke Cloudflare (`opennextjs-cloudflare deploy`, `wrangler deploy`) atau `git push` tanpa perintah eksplisit owner. Selesaikan banyak build/validasi lokal dulu (`tsc`, `next build`, `mobile:build`), push/deploy SEKALIGUS saat disuruh.
    - Sebelum deploy yang diminta: selalu tanya/konfirmasi dulu ke owner.
    - Deploy benar = `npm run deploy` (opennext build + deploy). `wrangler deploy` langsung = bundle `.open-next` BASI (rute baru 404).
8. **Kill-switch checkout darurat (default fail-closed):** darurat via CHECKOUT_OTP_REQUIRED=false / TURNSTILE_ENFORCE=false, default fail-closed — hanya string persis `"false"` yang bypass (unset/kosong = WAJIB verifikasi); detail `RUNBOOK.md` §2b.

---

## 📁 LOCAL ASSETS & REFERENCES

- `.skills-sourced/3d-configurators/starklord-tshirt/` — Drei `<Decal>` projection math and `shirt_baked.glb`.
- `.skills-sourced/3d-configurators/vihan-tshirt-designer/` — Fabric.js 2D Canvas Designer integration.
- `.skills-sourced/3d-configurators/afilah-clothing-configurator/` — Multi-apparel geometry and `shirt.glb`.
- `kaos-kami-web/public/models/` — rantai aktif (via `probeFirstExistingUrl` di `src/hooks/useDeviceTier.ts:120-157`): kaos `tee-basic.draco.glb→tee-basic.glb→tshirt-heavyweight.glb`; hoodie `hoodie-blue.draco.glb→hoodie-blue.glb→hoodie.lod1.glb/hoodie.glb`; longsleeve `longsleeve.draco.glb→longsleeve.glb`; sweater/crewneck `sweater.draco.glb→sweater.glb` + cap `cap.draco.glb→cap.glb` + pants `pants.glb` + shorts `shorts.glb` (mockup-saja, orderable FALSE); jacket `jacket.lod1.glb→jacket.glb`; manekin web-only `/models/mannequin.glb` (`MannequinModel.tsx:35`, `CanvasStage.tsx:335`); `tee-alt/fleece-alt/hoodie-flat.glb` staged tapi TAK wired ke loader (hanya `assetManifest.ts` STAGED_FILES + `/kredit` atribusi); mirror `kaos-kami-mobile/public/models/` sama minus `mannequin.glb` + `tshirt-heavyweight.draco.glb` + `tee-alt/fleece-alt/hoodie-flat` (mobile tak minta file itu — rantai `MobileApparelMeshRenderer.tsx:73-119` + fallback `tshirt-heavyweight.glb/hoodie.glb` menutupi).
- `ASSET_CREDITS.md` — Complete licensing and provenance log.
