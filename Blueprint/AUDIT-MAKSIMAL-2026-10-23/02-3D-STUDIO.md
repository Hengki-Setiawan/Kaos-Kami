# 02 — 3D STUDIO & PIPELINE DECAL → ORDER

> Sumber: Auditor 2 (very thorough). Path `kaos-kami-web/`. Status fisika inti: 🟢 kalibrasi 202.0 konsisten (tertest `scaleSnapshot.test.ts`); kontrak kebijakan & validasi: 🔴/🟠.

## A. Peta file inti

| File | Peran |
|---|---|
| `src/lib/scaleCalibration.ts` (1012 brs) | SSOT fisika: `APPAREL_PHYSICAL_SPECS` (meshMultiplier per apparel, max lebar/tinggi per sisi `:91-118,143-234`), `DECAL_MOVE_LIMITS`, `maxDecalScaleUnits`, `fitScaleToSideBox`, `computePhysicalPrintDimensions:514`, `getDecal3DPlacement`, `REAL_WORLD_PRINT_LIMITS:283` |
| `src/lib/printTiers.ts` | Tier harga A6/A5/A4/A3 (:14-19), `classifyPrintTierByCm`, fallback mult 101.8 (:51) |
| `src/lib/pricingEngine.ts` | `calculate6VariablePrice`; dipanggil ulang server di `api/checkout/route.ts:371` (client price tidak dipercaya ✓) |
| `src/components/3d/CanvasStage.tsx` (635) | Canvas R3F: `PerfAdaptive`, SMAA dyn (tier-high), `SceneDisposer` + forceContextLoss, recovery context-loss 1×/1.5s, patch toDataURL dpr3, `exportMockup` 2k/hd |
| `src/components/3d/DecalLayerRenderer.tsx` / `CleanDecal.tsx` / `DecalGizmo.tsx` (708) | useTexture per decal; DecalGeometry three-stdlib proyeksi lokal; gizmo drag/rotate/scale + transisi zona 360° |
| `src/components/3d/TshirtModel.tsx` (+sibling) | `extractApparelGeometry` + vertex-color multi-part + `createClothPhysicalMaterial` |
| `src/hooks/useDeviceTier.ts` | Tier high/mid/low/no-webgl; `probeFirstExistingUrl` HEAD-chain |
| `src/lib/imageEditPipeline.ts` (659) | EDIT_MAX_SIDE=3000, master registry LS `decal:<id>`, `uploadMasterDataUrlToR2`, `buildCheckoutMasterMap` |
| `src/store/useConfiguratorStore.ts` (857) | decals/preset/saveDesigns; `adminViewMode` default "admin" (:357) |
| `src/lib/designSync.ts` + `DesignSyncProvider.tsx` | Autosave debounce 1.5s → `POST /api/designs/autosave`; hydrate dari server |
| `src/lib/payments/confirmOrder.ts` | Spawn ProductionTask per decal via `computePhysicalPrintDimensions`; fallback 28.5×16 |
| `src/lib/gangPacker.ts` / `gangExport.ts` | maxrects-packer murni (bin 1000×580mm, multi-start deterministik) |

## B. Temuan

### 1. [BLOCKER] Klaim clamp 30 cm TIDAK ditegakkan — SSOT nyata 35 cm
- **Bukti:** `scaleCalibration.ts:91-93` `maxFrontWidthCm/maxBackWidthCm: 35.0`; `:283-284` `"maxPrintWidthCm: 35.0"`; di file yang sama `:512` komentar klaim "(Maksimal 30.0 cm)". Clamp 30 hanya di UI admin produksi `production/page.tsx:591,1539` (`Math.min(task.printWidthCm, 30.0)`). Test mengunci 35: `scaleSnapshot.test.ts:20`; `mobileParity.test.ts:61`. Sisi mobile `masterNotify.ts:12,16-23` clamp 35 juga.
- **Dampak:** AGENTS.md §3 + FAQ/ketentuan menjanjikan 30, user bisa menset decal hingga 35; ProductionTask tersimpan 35 dan hanya dikoreksi manual → risiko produksi fisik + klaim legal.
- **Keputusan yang dibutuhkan OWNER (dulu, sebelum kode):** pilih SSOT 30 atau 35. Konsekuensi 30: ubah spec+test+FAQ+masterNotify; konsekuensi 35: ubah AGENTS/FAQ. Setelah itu arahkan `maxDecalScaleUnits/fitScaleToSideBox` ke satu SSOT.

### 2. [MAJOR] Zod autosave & deploy desain menolak `side_left/side_right` → 400 senyap
- **Bukti:** `api/designs/autosave/route.ts:16` & `src/lib/schemas/design.ts:26` enum `["front","back","left_sleeve","right_sleeve","hood"]` — padahal DecalGizmo membuat zona `side_left/side_right` (transisi 360°) dan `computePhysicalPrintDimensions` mendukungnya (`scaleCalibration.ts:548-550`).
- **Dampak:** menarik decal ke zona sisi → POST autosave selalu 400 "Payload autosave tidak valid"; draft tamu masuk queue offline; syncStatus error/loop.
- **Perbaikan:** tambahkan `"side_left","side_right"` di KEDUA enum + test payload zona sisi.

### 3. [MAJOR] Docstring printTiers vs konstanta & test (A3 35k vs 30k)
- **Bukti:** `printTiers.ts:2-8` (dokumen A5 15k/A4 25k/A3 35k) vs `:14-19` (kode 10/20/30/30); `pricingEngine.ts:84`; `pricingEngine.test.ts:108`.
- **Perbaikan:** sync test + derive docstring dari `PRINT_TIERS`.

### 4. [MAJOR] Tidak ada cek ukuran byte upload di klien studio
- **Bukti:** `CustomizerDrawer.tsx:1059-1169` — tidak ada cek `file.size`; cap server yang ada di tempat lain: upload R2 10MB (`api/upload/r2/route.ts:7`), checkout raw 2MB (`api/checkout/route.ts:69`), designs 8MB/3MB.
- **Dampak:** file 50MB → UI freeze saat compress/save base64 LS → quota overflow; server 400 terlambat.
- **Perbaikan:** cek `file.size` dini + toast, konversi ke master ≤3000px sebelum bake LS.

### 5. [MAJOR] Draf kerja tidak pulih otomatis + pill "Autosave aktif" menyesatkan
- **Bukti:** `designSync.ts:160-205` — hydrate mengisi `savedDesigns`, BUKAN decals kerja; studio hanya pulih via deep-link `?designId=`; pill `StudioClient.tsx:228-251`.
- **Perbaikan:** on-mount hydrate → restore decal terakhir per sesi; ubah copy pill jujur.

### 6. [MAJOR] Skala visual S–XXL (±15%) tidak masuk hitungan cm
- **Bukti:** `apparelSizing.ts:268-313` clamp 0.85–1.15 diaplikasikan ke group mesh (`ApparelMeshRenderer.tsx:157-175`); `computePhysicalPrintDimensions` memakai basis 202.0 tanpa faktor ukuran.
- **Dampak:** decal "28cm terlihat" bisa produksi 24–32cm pada S/XXL → hasil produksi vs preview meleset.
- **Perbaikan:** terapkan faktor size ke rumus cm (atau cabut faktor visual decal) + dokumentasi kalibrasi referensi size mana.

### MINOR
7. **Draco decoder wired ke folder tak ada** (`CanvasStage.tsx:54` `setDecoderPath("/decoders/draco/")`; disk hanya `decoders/basis/`; draco SOFT-DISABLE 14 Sep 2026, diarsip `backups/draco-archive` yang sudah dihapus — lihat `09-` #2) → hapus baris atau restore decoder.
8. **`disposeSceneHierarchy` membuang tekstur SHARED cache** (`disposeScene.ts:29-31` vs aturan sendiri `threeResourceTracker.ts:14-18` "JANGAN track useGLTF/useTexture") → GPU churn/flicker potensial; filter via flag `userData.shared`.
9. **Listener window gizmo hanya lepas di pointer-up**, tidak di cleanup unmount (`DecalGizmo.tsx:273-274,308-309,562-563` add vs `:267-268,302-303,555-556` remove) → mid-drag unmount bisa menyisakan `isGizmoDragging` stuck + frameloop `always` persist.
10. **Literal fallback usang**: `PrintZoneGuide.tsx:42` & `SablonTabContent.tsx:769` & `printTiers.ts:51` `?? 101.8` (basis kini 202.0); literal 30.0 mati `:522-537`; header kalibrasi stale (klaim 101.8/145.5) → fail-fast `throw` atau derive SSOT.
11. **Hygiene store** (`useConfiguratorStore.ts`): stub `setFront/BackGraphicUrl:467-516` hardcode scale 0.11/y 0.02 (bypass clamp per-apparel); `removeDecal:449-459` bisa `revokeObjectURL` yang masih dirujuk entri `savedDesigns`; `adminViewMode` default "admin" (:357) persisted LS → default "customer" untuk non-admin, vumat stub via `maxDecalScaleUnits`.
12. **Error boundary decal di luar subtree model** (`TshirtModel.tsx:400` vs `:409-411`; `StudioClient.tsx:103-113`) + hardcode 28cm admin gang vault (`StudioClient.tsx:103`) — abaikan lebar decal nyata.

## C. Yang TIDAK terbukti ada (positif — berhak dijaga)
1. Mutasi geometri aman: `extractApparelGeometry` SELALU `geometry.clone()` (`:29`) — tanpa cross-model pollution.
2. Server tidak percaya harga client (`checkout/route.ts:371` hitung ulang + simpan `pricingSnapshot:387`).
3. Memory discipline bagus: ResourceTracker + SceneDisposer + forceContextLoss + recovery 1×.
4. KTX2/draco benar-benar ditunda (tidak setengah-wired).
5. Three/R3F client-only (server worker tidak memuat); `HighTierEffects` dyn + gate tier.
6. Paritas mobile dinotasikan jujur di `mobileParitySpec.json:72` (drift cap 50 vs 100, maxWidth 12 vs 10).
7. Fail-closed slug & pricing; DPI analyzer dwi-sumbu (`dpiAnalyzer.ts:47-52`).
8. maxrects murni & deterministik (`gangPacker.ts:18-19`).
9. Upload picker menolak SVG/HEIC; watermark guest wajib mode tamu (`ExportStudioModal.tsx:121-124`).

## D. Top 5
1. **#1 30 vs 35 cm** — butuh KEPUTUSAN OWNER dulu, lalu satu SSOT.
2. **#2 zod side_left/right** — 1-baris fix + test, dampak besar ke data tamu.
3. **#6 cm vs visual** — akurasi produksi S/XXL.
4. **#5 draf tidak pulih + pill** — kepercayaan user studio.
5. **#4 cek byte client** — freeze/quota LS.
