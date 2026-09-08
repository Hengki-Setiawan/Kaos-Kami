# AUDIT DETAIL — STUDIO 3D, POLA 2D & LIB GRAFIS

> Induk: `AUDIT-MENYELURUH.md`. Stack: R3F 8 + drei 9 + three 0.169.

---

## 1. `3d/ApparelMeshRenderer.tsx` — 4/5
Switch apparel + lerp sinematik story vs manual studio. Bug: magic number story (1.35–1.70) vs kamera; crewneck pakai mesh hoodie tapi spek cm beda (lompat harga tanpa beda visual); `modelRotY` abai di story; skala ganda mobile (0.85 luar + modelScale dalam). useFrame tiap frame murah. Obat: dokumentasi + samakan spek/mult. Kecil.

## 2. `3d/CameraRig.tsx` — 4/5
Lerp story + OrbitControls studio. Bug: `target` literal (reset berulang); preset jump tanpa transisi; min/max vs story cam tak dijaga. Hooks order aman. Mobile damping OK. Obat: memo target + transisi preset. Kecil.

## 3. `3d/CanvasStage.tsx` — 3/5
Shell Canvas + tema + tier. Bug: `preserveDrawingBuffer:true` (slow-path + VRAM, mahal HP); `toneMappingExposure` hanya saat mount; Draco path tanpa cek file. Inkonsistensi: dpr tier vs ClothLab dpr sendiri. Mobile: 2 konteks WebGL = risiko limit + 2x memori. Obat: preserve on-demand + reaktif exposure + satu konteks. Kecil–sedang.

## 4. `3d/DecalGizmo.tsx` — 3/5
Handle geser/scale/putar + badge cm. Bug: cm abaikan aspek (portrait lebih); kerah hardcode 0.18 (salah s/d 1,4cm vs spek 0.14–0.18); maxFront untuk semua sisi; drag sensitif viewport bukan cm. Inkonsistensi: clamp ±0.25 vs guide 0.08 vs store ±0.35 (TIGA angka beda!). Mobile: Html di grup rotasi Y±90° (lengan) edge-on. Obat: SSOT clamp + aspek + kerah per spek. Sedang.

## 5. `3d/DecalLayerRenderer.tsx` — 2/5
Bug KRITIS: (a) cap legacy 0.162 (16,5cm) vs max 0.295 (30cm) — 30cm tak tercapai; gizmo izinkan, render kecilkan. (b) `depthTest:false` + `depthWrite:true` → decal belakang tembus (ghosting). (c) dispose texture share → flicker/use-after-dispose. (d) Sleeve: `posZ=decal.x` (±0.35) melayang dari lengan. Obat: hapus cap + depthTest true + hapus dispose + Z per-side + renderOrder. Sedang (0,5 hari).

## 6–9. Model (Hoodie/Shirt/Longsleeve/Tshirt) — 2–3/5
Hoodie/Shirt: LEAK material+merged (tanpa dispose), clone tak dispose, `center()` geser jangkar + hapus normals, roughness mati, preload ganda, surfaceZ campur (gizmo 0.18/guide 0.155/shirt 0.24 = selisih 4–6cm!). Longsleeve: mutasi cache GLB, clone tak dispose, knit timpa scale, ambang part tak terkalibrasi (baik: dispose ada). Tshirt: wind ganda (factory + effect), knit timpa scale, mutasi cache (baik: dispose ada). Obat: pola dispose terpusat + satukan surfaceZ per apparel + hapus preload legacy. Sedang (0,5–1 hari).

## 10. `3d/StudioLighting.tsx` — 4/5
Rig 7 lampu adaptif kain gelap. Risiko: physical-lights (point/spot redup); 7 lampu + shadow di tier-low tanpa degradasi. Perlu verifikasi visual + tiering. Obat: tiering lampu. Kecil.

## 11. `3d/PrintZoneGuide.tsx` — 2/5 (versi garis 3D)
Membaik (garis dunia nyata). Sisa: box SELALU 30×42 (hoodie-front 28×26, shirt 14×26!) → hijau palsu; `|x|>0.08` vs clamp lain; posisi y statis. Obat: box per-side dari spek. Kecil.

## 12. `studio/ClothLab.tsx` — 2/5
Swatch verlet cubit-tarik. Bug: side-effect di render; normals tiap frame; tanpa substep; tak dispose; wind assignment saat render. Biaya ~15–20k solve/frame (OK desktop, berat low + konteks kedua). Obat: pindah assignment ke effect + dispose + substep. Kecil–sedang.

## 13. `studio/PatternStudio.tsx` — 2/5
Editor pola Fabric sinkron 3D + ekspor 300DPI. Bug KRITIS: rotasi/opacity 2D hilang; satu arah saja (klaim live salah); clone gaya v5 vs v6; ekspor 17MP OOM HP; `scaleToWidth` abaikan portrait. Jepit ±0.35 vs lain. Obat: rotasi/opacity + langganan 2-arah + letterbox + cap ekspor. Sedang (1–2 hari).

## 14. `studio/StudioDesignLoader.tsx` — 3/5
Muat `?designId=` sekali. Bug: fetch SEMUA desain + find klien (over-fetch + bocor daftar); slug tanpa validasi; timeout tanpa cleanup. Baik: doneRef + parse defensif. Obat: endpoint by-id + validasi. Kecil.

## 15. `lib/scaleCalibration.ts` — 4/5
SSOT cm↔unit terukur. Rapuh: hoodie vs crewneck mesh sama mult beda (lompat harga tanpa beda visual); shirt via TINGGI vs lain via LEBAR; kerah 36.0 konstan semua mult; min 0.04 vs floor 3.5. Dokumentasi ukur bagus. Obat: selaraskan sumbu + kerah skala-tinggi. Kecil–sedang.

## 16. `lib/printTiers.ts` — 5/5
SSOT tier A6–A3 by-cm. Terbersih. Catatan: panggil dengan scale legacy = tier salah (ikuti obat no.5).

## 17. `lib/patternGeometry.ts` — 4/5
Panel cm + konversi + DPI. Bug: lengan `*2.2` fudge tak terdokumentasi; editor 6px/cm kasar (snap 1,7mm). Baik: konsisten satu mult. Obat: dokumentasi + naikkan ke 8px/cm. Kecil.

## 18. `lib/patternSilhouette.ts` — 3/5
Sketsa SVG jujur (bukan pola jahit). Bug: lengan longsleeve 1cm; hood di luar viewBox (tak terlihat); resleting shirt vs spek 14cm. Obat: kecil.

## 19. `lib/patternSync.ts` — 2/5
Konverter 2-arah. Bug KRITIS: buang rotation; komentar 2mm salah 10x (0,02 unit = 2,03cm — geser sistematis!); `max()` hancur bila stretch non-uniform. Baik: long-side konsisten. Obat: kembalikan rotasi + konstanta offset benar. Kecil.

## 20. `lib/verletCloth.ts` — 3/5
Verlet JS murni + preset GSM. Bug: `mass` mati; stiffness setengah standar (2x iterasi sia-sia); `addVelocity` hardcode 0.016; GC churn; tanpa clamp kecepatan. Stabil untuk dt≤1/30. Obat: faktor penuh + dt dinamis + typed-array links. Kecil.

## 21. `lib/dpiAnalyzer.ts` — 4/5
DPI = px/(cm/2.54) + tier. Bug: 1 sumbu; clamp menaikkan; default 28,5cm menyesatkan. Obat: kecil.

## 22. `lib/printUV.ts` — 2/5
Dual-hemisphere + compose 300DPI. Bug: split z gagal lengan + seam; v dari bbox hood; stretch drawImage (distorsi!); OOM 17MP. Obat: letterbox + cap/tiling. Sedang.

## 23. `lib/geometryPrep.ts` — 4/5
windWeight smoothstep + box-UV. Bug: pinY vs kerah hood; box-UV benar untuk weave. Obat: kecil.

## 24. `lib/proceduralTextures.ts` — 4/5
Normal anyaman + wordmark (nol aset). Bug: loop 512² main-thread (sekali, OK); letterSpacing Safari; repeat vs box-UV. Obat: kecil.

## 25. `lib/materials/clothPhysicalMaterial.ts` — 3/5
Physical sheen + anti-cuci hitam. Bug: selalu Physical (tier-low langgar); sheen 1,15 (>1); ambang linear vs sRGB; tanpa fallback SSR. Baik: arah anti-cuci + konsisten lighting. Obat: tiering material. Kecil–sedang.

## 26. `lib/shaders/windDisplacement.ts` — 2/5
Sine-displace via onBeforeCompile. Bug KRITIS inkonsistensi: ekspor X+Z, injeksi aktual X saja; tanpa windWeight sunyi; uTime reset; tanpa dispose. Obat: satukan + dispose. Kecil.

## 27. `lib/enhancers/compressImage.ts` — 2/5
Bug KRITIS kontradiksi: selalu PNG + quality mati + max 1200px → DPI 101@30cm = POOR ("print-ready" salah klaim); EXIF abai. Obat: JPEG/WebP adaptif + master asli. Kecil–sedang.

## 28. `lib/enhancers/removeSolidBackground.ts` — 2/5
Chroma-key tanpa flood-fill (makan putih interior!) + tanpa feather + CORS. Obat: flood-fill + feather + fallback. Sedang.

## 29. `lib/typography/textDecalGenerator.ts` — 2/5
Kanvas 3:1 fix + alpha buang + font tak tunggu + opsi mati. Obat: auto-fit + fonts.ready. Kecil.
