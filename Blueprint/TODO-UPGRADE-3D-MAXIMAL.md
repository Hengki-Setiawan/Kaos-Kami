# TODO LENGKAP — UPGRADE MAKSIMAL 3D & FRAMEWORK (FASE A–G)

> Status: SELESAI DIEKSEKUSI (09 Sep 2026, Fase 29 — 6 agen paralel).
> Verifikasi: `tsc 0 + build hijau` web + mobile. **DEPLOY/PUSH GATE berlaku**: jangan
> `git push` / deploy Cloudflare tanpa perintah eksplisit owner.
> Induk progres: Blueprint/TODO-SISA-KERJA-MAXIMAL.md (pengganti BUILD-PROGRESS-TRACKER yang sudah dihapus).

## Aturan eksekusi
1. Satu fase selesai = `npm run web:typecheck` 0 error + `web:build` hijau + `mobile:typecheck` + `mobile:build` hijau + screenshot studio (render OK, 0 console error).
2. Tiap perubahan perilaku visual (lampu, material, kotak DTF) wajib screenshot before/after.
3. Semua lib 3D/postprocessing/AI WAJIB client-only (`"use client"` + `next/dynamic` `ssr:false`) — Worker tetap <1.2MB.
4. Item bertanda `‖` boleh dikerjakan paralel (agen/file berbeda, tanpa dependensi).

---

## FASE A — Penyelarasan Versi (FONDASI, kerjakan pertama, sekuensial)

### A1. Samakan platform: mobile Next 14→15 + zustand web 4→5 ‖ (dua sub-item paralel)
- **Target**: `kaos-kami-mobile/package.json` (`next 14.2.15` → `^15.5.x`, `eslint-config-next`), `kaos-kami-web/src/store/useConfiguratorStore.ts:1`, `useCartStore.ts:3` (`zustand 4.5.5` → `^5.x`).
- **Langkah mobile**: `npm i next@15 eslint-config-next@15`, jalankan codemod Next 15, perbaiki `params/searchParams` async (tiru pola Fase 20 web — web sudah lolos, copy pattern-nya), samakan `react 19`, `R3F 9`, `drei 10`, `zustand 5`, `three 0.169` (tetap dulu, naik di A2 bareng).
- **Langkah zustand web**: `npm i zustand@5`, ganti semua selector yang return array/object literal ke `useShallow` dari `zustand/shallow` (migrasi resmi v5 — tanpa ini `Maximum update depth exceeded`). Cek juga mobile store yang sudah v5 apakah sudah pakai `useShallow` dengan benar.
- **Acceptance**: `tsc` 0 dua workspace, nol peer-dependency warning React 19, studio dibuka-tutup-drawer tanpa error depth, cart tambah/hapus normal.
- **Verifikasi**: `npm run web:typecheck`, `npm run mobile:typecheck`, `web:build`, `mobile:build`.

### A2. three 0.169 → 0.180 bertahap (SETELAH A1, jangan loncat ke 0.186)
- **Target**: `kaos-kami-web/package.json` + `kaos-kami-mobile/package.json` (`three`, `@types/three` ikut).
- **Langkah**: naik per ~10 rilis (`0.169 → 0.17x → 0.180`), tiap lompatan: baca migration guide resmi, `tsc`, screenshot studio. Checklist breaking per rentang:
  - `useLegacyLights=false` default → cek `StudioLighting.tsx` (7 lampu, point/spot bisa redup).
  - `PCFSoftShadowMap` deprecated → ganti `PCFShadowMap`.
  - `sheen` → `sheenTint` → cek `lib/materials/clothPhysicalMaterial.ts` (sekaligus betulkan `sheen 1.15 > 1`, audit #25).
  - `Clock` → `Timer` bila dipakai. `BatchedMesh.addInstance` bila dipakai.
- **Acceptance**: render before/after identik (mata + screenshot), 0 console error, tone kain tidak berubah drastis.
- **Verifikasi**: `tsc` 0 + `build` hijau tiap lompatan + screenshot arsip di PR/commit message.

---

## FASE B — Performa Render (dampak HP langsung)

### B1. Web tiru pola mobile: frameloop demand + preserveDrawingBuffer on-demand
- **Bukti grounding**: `CanvasStageMobile.tsx:83` sudah `frameloop={activeAnimation!=='none'?'always':'demand'}`. Web `CanvasStage.tsx:29-33,53-63` masih `always` + `preserveDrawingBuffer:true` permanen (slow-path + VRAM).
- **Langkah**: web pakai `frameloop="demand"` saat idle; setiap mutasi (drag gizmo, ganti warna, animasi wind/walk) panggil `invalidate()` (controls drei sudah otomatis). Ekspor PNG: aktifkan preserve hanya saat momen ekspor (render sekali ke target lalu `toDataURL`), bukan flag permanen. Samakan juga `CanvasStageMobile` bila polanya belum on-demand-penuh.
- **Acceptance**: HP mid tidak panas saat diam, FPS naik, ekspor PNG tetap tidak blank.
- **Verifikasi**: uji manual HP + `tsc`/`build`, cek `gl.getContextAttributes().preserveDrawingBuffer` hanya true saat ekspor.

### B2. Adaptive perf: PerformanceMonitor + AdaptiveDpr + ContactShadows hemat ‖ (paralel dengan B3)
- **Target**: `CanvasStage.tsx`, `hooks/useDeviceTier.ts` (jadikan baseline, bukan satu-satunya sinyal), `StudioLighting.tsx:108-116` (`ContactShadows` `resolution={512}` tanpa `frames`).
- **Langkah**: tambah `<PerformanceMonitor flipflops={3} onFallback={set DPR 1}>` + `<AdaptiveDpr/>` dari drei; `ContactShadows` tambah `frames={1}` + `resolution 256` di tier-low; evaluasi `Environment + Lightformer` mengganti 2–3 dari 7 lampu (cahaya "gratis" via HDRI, bukan real light). `toneMappingExposure` reaktif terhadap `studioTheme` (audit: sekarang hanya saat mount).
- **Acceptance**: tidak ada flip-flop DPR, tier-low render ringan, tier-high tetap sinematik.
- **Verifikasi**: screenshot tiap tier + theme, `build` hijau.

### B3. Dispose terpusat + SSOT clamp + box per-side (audit #4–#9) ‖ (paralel dengan B2)
- **Target**: `HoodieModel.tsx`, `ShirtModel.tsx`, `LongsleeveModel.tsx`, `TshirtModel.tsx`, `DecalLayerRenderer.tsx`, `DecalGizmo.tsx`, `PrintZoneGuide.tsx`, `lib/scaleCalibration.ts` (SSOT).
- **Langkah**: pola `ResourceTracker` resmi three (track geometry/material/texture → dispose saat unmount); **larang mutasi cache GLB** (`clone()` dulu sebelum ubah; hapus `preload` legacy ganda); satukan `surfaceZ` per apparel (audit: gizmo 0.18 vs guide 0.155 vs shirt 0.24); satukan clamp (`±0.25` vs `0.08` vs `±0.35` → satu SSOT di `scaleCalibration.ts`); `PrintZoneGuide` box per-side dari spek (bukan 30×42 selalu — hoodie-front 28×26, shirt 14×26).
- **Acceptance**: ganti model 20x → `renderer.info.memory` datar; kotak hijau = lolos cetak betulan per sisi.
- **Verifikasi**: ukur memory manual + `tsc`/`build` + uji klaim 30.0/28.0/14.0cm (tiru verifikasi Fase 13).

---

## FASE C — Kejujuran Cetak (inti bisnis DTF)

### C1. Kompres adaptif + master asli (audit #27 KRITIS) ‖
- **Target**: `lib/enhancers/compressImage.ts`, `CustomizerDrawer.tsx:304-334` (`handleFileUpload`), `lib/dpiAnalyzer.ts`.
- **Langkah**: format adaptif (JPEG/WebP sesuai konten/transparansi, bukan selalu PNG) + **simpan file asli sebagai master produksi** (preview 1200px hanya untuk 3D/DB hemat); badge DPI dihitung dari master; hapus label 300-DPI hardcode bila masih ada.
- **Acceptance**: tidak ada lagi klaim "print-ready" pada gambar ~101 DPI @30cm; upload foto HP realistis tetap cepat.

### C2. patternSync: kembalikan rotasi + betulkan offset (audit #19 KRITIS) ‖
- **Target**: `lib/patternSync.ts`.
- **Langkah**: kembalikan `rotation` yang dibuang konverter 2-arah; betulkan konstanta offset (0,02 unit = 2,03cm, bukan 2mm); tangani stretch non-uniform (jangan `max()` buta).
- **Acceptance**: putar 45° di pola 2D muncul di 3D dan sebaliknya, tanpa geser sistematis.

### C3. printUV letterbox + cap OOM (audit #22) ‖
- **Target**: `lib/printUV.ts`, `components/studio/PatternStudio.tsx`.
- **Langkah**: `drawImage` letterbox (jaga aspek, jangan stretch); cap resolusi ekspor + tiling agar HP tidak OOM 17MP; split-z lengan diperbaiki/dokumentasi batasnya.
- **Acceptance**: artwork portrait tidak distorsi; ekspor di HP mid selesai tanpa crash.

### C4. Teks auto-fit + fonts.ready (audit #29) ‖
- **Target**: `lib/typography/textDecalGenerator.ts`.
- **Langkah**: auto-fit ukuran kanvas ke teks (ganti 3:1 fix), tunggu `document.fonts.ready` sebelum raster, jangan buang alpha, hormati opsi (letter-spacing Safari diguard).
- **Acceptance**: teks panjang tidak kepotong, font custom tampil sebelum jadi tekstur.

---

## FASE D — Visual + Ekspor + DevTools (SETELAH B–C)

### D1. `@react-three/postprocessing` khusus tier-high ‖
- **Langkah**: `npm i @react-three/postprocessing`, `EffectComposer + Bloom + Vignette + SMAA`, render **hanya jika `deviceTier==='high'`**. Ukur VRAM/FPS sebelum–sesudah.
- **Acceptance**: tier-low/mid nol biaya; tier-high naik kelas editorial.

### D2. Ekspor 360° rapi: `webm-muxer`/`mediabunny` + `gifenc` ‖
- **Target**: `CustomizerDrawer.tsx:339` (`handleExport360Video` MediaRecorder mentah).
- **Langkah**: mux MP4/WebM benar + opsi GIF; cleanup stream/track (audit Fase 28: video cleanup) agar tidak leak.
- **Acceptance**: file jadi, bisa upload TikTok/IG langsung, tidak ada track kamera nyangkut.

### D3. Dev-only: `gltfjsx` + `leva` + `r3f-perf` (JANGAN ikut bundle prod)
- **Langkah**: `gltfjsx` generate komponen dari GLB (ganti traversal + part-tagging manual yang rapuh); `leva` panel tuning lampu/material; `r3f-perf` overlay FPS (dev saja).
- **Acceptance**: `next build` bundle prod tidak nambah; hapus dari `dependencies` bila terlanjur (pindah ke `devDependencies` + dynamic import dev-only).

---

## FASE E — Aset (bisa paralel kapan saja SETELAH A1)

### E1. KTX2/Basis + meshopt ulang hoodie/jacket [DITUNDA — C5 11 Sep 2026, lihat `TODO-MOCKUP-5PER5.md`]
> [DITUNDA C5 11 Sep 2026: KTX2 DITUNDA — Draco cukup untuk katalog saat ini. Syarat buka-lagi: katalog 10+ garmen ATAU VRAM tekstur >50MB (ukur via M5). Larangan: file `*.ktx2` palsu sudah dihapus (glob `**/*.ktx2*` nihil di repo); JANGAN commit file `*.ktx2*` palsu lagi. Varian KTX2 asli (uastc/etc1s) di pipeline M1.0 berstatus opsional, bukan wajib.]
- **Target**: `public/models/hoodie.glb` (16.3MB), `jacket.glb`, LOD1 tier-low.
- **Langkah**: `gltf-transform optimize --texture-compress ktx2/webp --texture-size 1024` (+ `meshopt` bila cocok animasi; `draco` untuk statis); simpan master tak-terkompres di luar repo/R2 arsip; verifikasi decoder self-host `/decoders/draco/` + transcoder basis ada dan ke-load; update `useDeviceTier` mapping model per tier.
- **Acceptance**: hoodie <3MB, load 4G <5 detik, weave/normal tidak pecah, LOD1 dipakai tier-low otomatis.

---

## FASE F — Fitur Baru: Edit Gambar In-Mockup (SETELAH C stabil)

### F1. Panel "Sesuaikan" — 0 dependensi baru (fabric 7.4.0 sudah ada)
- **File baru**: `src/components/studio/ImageEditorModal.tsx` (desktop modal; HP bottom-sheet tiru pola `BottomSheet.tsx`), `src/lib/imageEditPipeline.ts` (apply → `toDataURL` → `updateDecal` → refresh DPI).
- **Langkah**: slider Brightness/Contrast/Saturation/Vibrance/Hue/Gamma/Blur/Sharpen + preset Grayscale/Sepia via `fabric.Image.filters` (WebGL backend); edit di kanvas 2D offscreen per-decal aktif; Simpan → URL decal baru; Batal → buang.
- **Acceptance**: slider live <100ms, Simpan refresh tekstur 3D + badge DPI otomatis, Batal tidak ubah state.

### F2. Potong & Putar + Undo ‖ (paralel dengan F1, file sama)
- **Langkah**: cropX/cropY fabric + rotate + flip-X (wajib untuk back-print teks agar terbaca); history stack 10 langkah + Reset ke asli.
- **Acceptance**: teks back-print mirror-benar; undo 10x tidak corrupt URL/decal.

### F3. AI BG Pro — lazy & opsional (SETELAH F1/F2 stabil, JANGAN default)
- **Catatan risiko (hasil riset)**: `@imgly/background-removal` model small ~40MB / medium ~80MB + WASM 10–18MB (berat untuk 4G), lisensi **AGPL** — untuk komersial harus hubungi IMG.LY. Alternatif Transformers.js RMBG mirip bebannya.
- **Langkah**: `next/dynamic` + `await import()` hanya saat user klik "AI Pro"; progress bar download + cache browser (self-host model di R2 bila lisensi oke); gagal → fallback flood-fill + pesan jujur.
- **Acceptance**: klik pertama jelas ada progress; tanpa klik, bundle tetap 0KB tambahan.

### F4. Preset "Efek Sablon" (pembeda vs kompetitor generik)
- **Langkah**: 3 preset via filter fabric (`BlendColor`/`RemoveColor`/threshold): Duotone Kaos Hitam, Stencil Threshold, Vintage/Distressed. Preview di modal sebelum Simpan.
- **Acceptance**: efek terlihat beda di 3D dan konsisten di ekspor master 300 DPI.

### F5. Guardrail: DPI re-check + master produksi
- **Langkah**: setiap Simpan edit → `evaluatePrintQuality` dari pixel BARU (jangan bawa DPI lama); master hasil edit tersimpan untuk `printFileUrl`/ekspor 300 DPI (pola `masterAssetUrl` Fase 19).
- **Acceptance**: badge DPI selalu sesuai gambar terakhir; produksi terima file tajam.

---

## FASE G — Eksperimen (branch khusus, TIDAK blokir prod)

### G1. three 0.185+ + R3F v10 alpha + WebGPU/TSL
- **Syarat naik (hasil riset Sep 2026)**: butuh `three>=0.185`; compute shader bermasalah di iPhone/iPad; wind shader GLSL `onBeforeCompile` harus ditulis ulang TSL agar jalan dua backend.
- **Langkah**: branch `exp/webgpu`; migrasi minimal; uji matriks (Android mid, iPhone, desktop); fallback WebGL2 otomatis wajib hidup.
- **Kriteria lolos ke prod**: FPS ≥ WebGL2 di semua tier + tidak ada regresi visual + ukuran bundle tidak meledak. Gagal = tetap WebGL2, tutup branch dengan catatan.

---

## Urutan eksekusi & paralelisasi
1. `A1 → A2 → B1` (sekuensial, fondasi).
2. Tiga jalur paralel: `(B2 + B3) ‖ (C1 + C2 + C3 + C4) ‖ (E1)`.
3. `(D1 + D2 + D3) ‖ (F1 + F2)`.
4. `F3 + F4 + F5`.
5. `G1` kapan saja di branch.

## Estimasi kasar
A 1–2 hari · B 2–3 hari · C 2–4 hari · D 1–2 hari · E 1 hari · F1–F2 2–3 hari · F3–F5 2–3 hari → total ±2–3 minggu kerja fokus.

## Risiko utama
- Lompatan three terlalu besar sekaligus → WAJIB bertahap + screenshot (A2).
- Postprocessing/AI BG di HP kentang → WAJIB gate tier + lazy (D1, F3).
- Lisensi AGPL AI BG untuk komersial → klarifikasi sebelum prod (F3).
- Bundle Worker >3MB → semua tambahan 3D/AI client-only + dynamic (aturan #3).
