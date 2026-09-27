# TODO MAKSIMAL — 3D TEST LAB & SIMULASI FISIKA (Kaos Kami)

> Dibuat: 26 Sep 2026 · Metode: static analysis kode (baca file + trace call site) + validasi `vitest 158/158` + `tsc 0/0` web & mobile.
> **Status verifikasi tiap item ditandai eksplisit** — jangan smogain READ sebagai PROVEN.
> Cakupan: `kaos-kami-web/src/components/{3d,ui}/*TestLab*`, `src/lib/{3d,shaders,qcLighting,geometryPrep}.ts`, `src/lib/3d/stretchPhysics.ts`, `src/store/useConfiguratorStore.ts`, dan port mobile `kaos-kami-mobile/src/components/3d/Mobile*`.
> BLOKIRAN: item P0-1 (tinta) butuh keputusan owner dulu — lihat "KUTUPAN KEPUTUSAN".

---

## RINGKASAN EKSEKUTIF

Test Lab punya **fondasi teknis terbaik di seluruh repo** (pure-math SSOT + unit test + GPU-safe + jujur soal batas), tapi **3 kelas cacat**:

| Kelas | Jumlah | Akar |
|---|---|---|
| **Fitur mati / UI menipu** | 3 | Kode tidak pernah dipanggil (`specialInkEffect`), target lights salah, rumus divergen |
| **SSOT drift** | 4 | Konstanta diduplikasi di 2+ file,_threshold satu_file jadi 2 nilai |
| **Paritas mobile** | 4 | State mobile ada, renderer/UI tidak、横切 temporally |

**Tidak ada P0 yang memblokir deploy.** 3 item P0 = kualitas/promise, bukan斷 availability.

### Status per Prioritas

| Prioritas | Item |-conv | Estimated | Risiko |
|---|---|---|---|---|
| **P0** | 6 | READ-verified | 3–6 jam | UX bohong |
| **P1** | 7 | READ-verified | 4–8 jam | Data drift |
| **P2** | 5 | READ-inferred | 3–5 jam | HP low-tier |
| **P3** | 6 | READ-inferred | 8–14 jam | Paritas |
| **P4** | 6 | READ-verified | 2–3 jam | Teknis |
| **P5** | 10 |gagasan | 20–40 jam | — |
| **P6** | 6 | gagasan | 6–10 jam | Regression |
| **P7** | 3 | READ-verified | 2 jam | Docs |

---

## P0 — FUNGSIONAL RUSAK / UI MENIPU USER

### [ ] P0-1. `specialInkEffect` = 5 tombol NO-OP (dead code)
**Status: READ-VERIFIED** (grep 0 pembaca)
**File:**
- Deklarasi+setter: `useConfiguratorStore.ts:23,169,170,305,681` · `useMobileStudioStore.ts:27,265,302,394,635`
- UI: `TestLabControls.tsx:41,65,314-343` · `MobileTestLabControls.tsx:44,61,295-300`

**Gejala:** 5 tombol (Reflective 3M, Glow in Dark, Gold Foil, Holo Prism) menulis ke store yang **tidak pernah dibaca siapa pun**. Klik → tidak ada efek visual, tidak ada harga, tidak ada persistensi.

**Kenapa berbahaya:** Panel menampilkan badge `"SIMULASI VISUAL — produksi DTF standar"` (L310) yang **menyiratkan ada sesuatu yang render**. Reality: 0 shader, 0 material property, 0 uniform.

**Dampak schema:** `Design` (drizzle-schema:251-280) **tidak punya kolom `specialInkEffect`**. Bahkan jika shader diimplementasikan, pilihan tinta hilang saat save/reload.

**PILIHAN (butuh(owner):**
- **(A) Hapus UI** — hapus 5 tombol + hapus `specialInkEffect` dari 2 store + type. ~30 menit. UI jujur.
- **(B) Implementasikan** — see P5-1 (shader tinta). ~8-15 jam + kolom DB baru + `db push` via SQL (RUNBOOK §5).
- **(C) Tuvoerkan "segera"** — disable button + tooltip `"Fitur sedang disiapkan"`. ~10 menit. Paling jujur.

> Rekomendasi: **(A) sekarang** untuk hapus janji, (B) sebagai P5 terpisah setelah owner konfirmasi.

**Verifikasi (A):** `grep -rn "specialInkEffect" src` → 0 hits. `vitest` hijau.
**Verifikasi (B):** 1 screenshot mode senter + 1 saat ekspor PNG menunjukkan efek.

---

### [ ] P0-2. `spotLight target` undefined di render pertama → senter menyorot (0,0,0)
**Status: READ-VERIFIED** (code trace)
**File:** `TestLabOverlay3D.tsx:223-226` · mobile `MobileTestLabOverlay3D.tsx:142-145`

```tsx
<object3D ref={targetRef} position={[0, 0, surfaceZ]} />
<spotLight ref={spotLightRef} target={targetRef.current || undefined} ... />
```

**Gejala:** saat mount `targetRef.current === null` → `target = undefined` → three.js membuat target default sendiri yang **tidak ada di scene graph** → lampu menyorot **titik origin (0,0,0)**, bukan lokasi inspeksi.

**Self-heal?** Hanya bila terjadi re-render berikutnya (ganti `activeApparel`/`qcSide`/pointer state). Kalau user buka Studio → langsung klik "SENTER 3D" → tidak pernah ganti apparel → **bug bertahan sampai pageswap**.

**Fix (pola aman):**
```tsx
const spotRef = useRef<THREE.SpotLight>(null);
useEffect(() => {
  if (spotRef.current && targetRef.current) {
    spotRef.current.target = targetRef.current;
  }
}, []);
```
ATAU andalkan R3F: `target={targetRef}` (R3F dukung ref object, resolve setelah mount) — **perlu verify R3F v9** supports ref-as-prop untuk `target`.

**Verifikasi:** buka `/studio` → mode SENTER → tanpa ganti apparel → gerakkan pointer → sorotan harus IKUT pointer, bukan diam di tengah.

---

### [ ] P0-3. 3 rumus `windSpeed → animationSpeed` berbeda
**Status: READ-VERIFIED** (code trace)
**File:** `TestLabControls.tsx:96` · `:497` · `:517`

| Lokasi | Konteks | Rumus | spd=20 |
|---|---|---|---|
| L96 | ganti mode tab | `Math.max(0.6, spd/35)` | **0.6** |
| L497 | slider onChange | `Math.max(0.4, spd/35)` | 0.571 |
| L517 | tombol preset | `spd/35` (no floor) | 0.571 |

**Gejala:** klik tab ANGIN 3D → 0.6. Geser slider ke 20 → **lompat** ke 0.571. Preset "Sepoi (20)" → 0.571 (beda dari tab). Inkonsisten 3 jalur untuk 1 konsep.

**Fix:** extract 1 helper SSOT.
```ts
// lib/3d/windSpeedCoupling.ts
export function windAnimationSpeed(spd: number): number {
  return Math.max(0.4, spd / 35);
}
```
Import di 3 tempat + 1 unit test.

**Verifikasi:** test tabel `spd ∈ [0,5,…,100]` → 3 jalur identik.

---

## P1 — SSOT DRIFT & DATA INTEGRITY

### [ ] P1-1. `ensureStretchWeights` DUPLIKAT di 2 file
**Status: READ-VERIFIED** (locasi & threshold identik)
**File:** `stretchDeform.ts:76-97` vs `geometryPrep.ts:162-179`

Logika identik (`smoothstep` vs `stretchSmoothstep`, threshold `collarY=0.12, sleeveX=0.165, feather=0.02`). Helper smoothstep juga diduplikasi (`stretchDeform:66` vs `geometryPrep:149`).

Komentar `geometryPrep.ts:140-141` **sendiri mengakui**: *"bila ambang berubah, ubah di DUA tempat."*

**Risiko:**一旦 ada tuning ambang di satu file, mask jadi tidak simetris → sablon bisa robek di satu sisi saja.

**Fix:** hapus versi `geometryPrep`, import dari `stretchDeform` (atau vice versa — pilih owner tunggal, taruh di `lib/3d/stretchWeights.ts` sebagai SSOT baru). `geometryPrep` yang memanggil (line 196, 209) update import.

**Verifikasi (WAJIB empiris):** script banding 2 implementasi pada 3 geometri sintetis (2000 vertex acak, grid torso, 1 segitiga) → `max|Δ| = 0`. Lihat P6-1.

---

### [ ] P1-2. Audit note `stretchDeform.ts` SALAH + 2 konstanta bertentangan
**Status: READ-VERIFIED**
**File:** `stretchDeform.ts:16-22` (note) · `:35` · `:37` vs `stretchPhysics.ts:15-22`

Note L16-22 mengklaim: *"`stretchPhysics.ts` TIDAK mengekspor `U_MAX_ELONG`/`POISSON_EFF`"*. **SALAH** — keduanya di-export (L15-22), dan di-import `TestLabOverlay3D.tsx:9`.

| Konstan | SSOT (`stretchPhysics`) | Stale (`stretchDeform`) | Δ |
|---|---|---|---|
| elongasi horizontal | **0.30** | 0.38 | **+27%** |
| Poisson | **0.40** | 0.32 | **−20%** |

**Status sekarang:** ter-mask — `StretchPhysicsController` tulis ulang tiap frame (L425-426). TAPI:
- `useStretchUniforms()` (L213, **dead**) masih pakai default salah
- `sharedStretchUniforms` default salah **sebelum frame pertama** (flash of wrong physics)
- Developer baca note → tambah uniform baru dengan konstanta salah

**Fix:**
1. Ganti note L16-22 dengan komentar faktual ("nilai diturunkan dari `stretchPhysics` SSOT").
2. `export const STRETCH_MAX_ELONG_DEFAULT = 0.30;` ← atau **lebih baik: hapus** & import `U_MAX_ELONG.horizontal` langsung.
3. `STRETCH_POISSON_DEFAULT = POISSON_EFF` via import.
4. Hapus `useStretchUniforms` (lihat P4-2) — satu-satunya pemakai yang tidak bisa di-update.

**Verifikasi:** `grep STRETCH_MAX_ELONG_DEFAULT` → 0 hits setelah fix. Tambah test: `expect(STRETCH_POISSON_DEFAULT).toBe(POISSON_EFF)`.

---

### [ ] P1-3. `7.2` (intensitas lux) diduplikasi 3× — readout bisa bohong
**Status: READ-VERIFIED**
| Lokasi | Guna |
|---|---|
| `TestLabOverlay3D.tsx:227` | `intensity={7.2}` — cahaya aktual |
| `TestLabOverlay3D.tsx:215` | `estimateLux(7.2, dist)` — readout UI |
| `qcLighting.ts:58` | `BOOTH_K = 1500 / (7.2 / 1.6*1.6)` — kalibrasi |

**Risiko:** ubah `intensity` → readout lux **diam-diam bohong**, test tetap hijau (test hanya uji `estimateLux` terisolasi). Ini adalah ** Claims to customer** (UI `<span>≈ {qcLux} lux</span>`).

**Fix:** `export const QC_LAMP_CD = 7.2;` di `qcLighting.ts`, import di 2 tempat + dipakai `BOOTH_K`.

**Verifikasi:** test `expect(BOOTH_K).toBe(1500 / (QC_LAMP_CD / (1.6**2)))` + `estimateLux(QC_LAMP_CD, 1.6) === 1500`.

---

### [ ] P1-4. Threshold slider vs clamp store tidak sinkron
**Status: READ-VERIFIED**
| | min | max |
|---|---|---|
| Slider `flashlightFocus` | 0.18 (`TestLabControls:356`) | 0.75 (`:357`) |
| Store clamp `setFlashlightFocus` | 0.15 (`useConfiguratorStore:686`) | 0.85 |

**Gejala:** nilai 0.15 atau 0.85 (reachable via store/API) **tidak representable** slider → thumb meluber/terjepit. Mobile punya slider 0.18 juga (`:335`).

**Fix:** samakan. Rekomendasi: slider `min=0.15 max=0.85 step=0.02` (cukup Smooth), atau store clamp persempit ke `[0.18, 0.75]`. **Pilih 1, tulis di store sebagai konstanta** supaya 1 sumber.

**Verifikasi:** test store clamp + `input.min/max` snapshot.

---

### [ ] P1-5. `windDirectionToVec("side")` = (-1,0,0) tapi partikel mengalir +X→−X di koordinat **tersalut** — cek konvensi
**Status: READ-inferred** — **butuh verifikasi visual**
**File:** `windDirection.ts:22` · `TestLabOverlay3D.tsx:103-114`

`windDirectionToVec("side")` mengembalikan `(-1,0,0)` (kanan→kiri). Partikel di `L105` `p.x -= velocity` (also ke −X). **Konsisten.** ✅

Tapi `streakGeo` di `L53-54` `g.rotateZ(π/2)` — cylinder default sumbu Y, dirotasi 90° Z → sumbu X. **Konsisten untuk 'side'.** ✅

`windDisplacement.ts` baris 71: `vec3 flutter = uWindDir * (w1+w2) * windWeight * 0.045 * g` — uWindDir = arah gerak, partikel = arah gerak. **Konsisten.** ✅

> likely bukan bug — tapi **belum ada test** yang mengunci konvensi ini. Lihat P6-2.

---

### [ ] P1-6. `getStretchFactors` hanya dipakai mobile — web & mobile punya 2 fisika berbeda
**Status: READ-VERIFIED**
**Fakta:**
- **Web** → shader `stretchDeform.ts` (elongation `uMaxElong`, Poisson `uPoisson`, `sAmp`)
- **Mobile** → `getStretchFactors` (`stretchPhysics.ts:44`) untuk **mesh `scale`** (`MobileApparelMeshRenderer:231,335`, `MobileCapModel:74`, `MobileDecalLayerRenderer:257`, `MobileSweaterModel:70`)
- Web tidak pernah memanggil `getStretchFactors` (grep: hanya `interactionFixes.test.ts`)

**Masalah:** web = **vertex-level deform** (realistis, ada mask); mobile = **object-level scale** (kasar, seluruh mesh ikut, tidak ada mask kerah/lengan). **Deformasi visual berbeda antar platform** — violates "paritas" yang diklaim di docs.

**Fix (P1 minimal):** dokumentasikan perbedaan ini eksplisit di `mobileScaleCalibration.ts` header + test snapshot per platform. **Fix (ideal, P3-4):** port shader path ke mobile.

---

### [ ] P1-7. Wind gust tidak_zone-zero saat speed=0
**Status: READ-inferred**
**File:** `windDisplacement.ts:68` `float g = uWindStrength * uGust;`

`uWindStrength` diset dari `opts.strength` (default 0). Tapi `windWeight` bisa > 0 dan `uGust` default 0.6 — kalau `uWindStrength` stale dari material sebelumnya yang pernah di-set > 0, **`speed=0` tidak mengembalikan kain ke diam**.

**Fix:** di `WindUniformWriter` (`TestLabOverlay3D:439-445`), tulis `uWindStrength` eksplisit = 0 saat mode ≠ windtunnel (bukan hanya `uWindDir`). Cek apakah `uWindStrength` shared atau per-material — kalau per-material, perlu track.

**Verifikasi:** mode windtunnel speed 85 → ganti ke STANDAR → kain harus diam total dalam 1 frame.

---

## P2 — PERFORMA & FRAMERATE (target: HP low-tier)

### [ ] P2-1. Badai re-render saat recoil pegas
**Status: READ-inferred** (code trace, perlu profiler)
**File:** `TestLabOverlay3D.tsx:315-321` (subscribe) + `:411` (set di useFrame) + `:429-434` (pass ke `StretchForceIndicator3D`)

`useFrame` memanggil `st.setStretchIntensity(nextVal)` **setiap frame** saat recoil (tension 34, damping 7.8 → osilasi ±1 detik). Karena komponen subscribe `stretchIntensity` via `useShallow` → **re-render ~60 Hz** + re-create `<mesh>` panah (`StretchForceIndicator3D` bikin 4 `<coneGeometry>` untuk biaxial).

**Ironis:** komentar file sendiri L397-498Designer bilang *"tanpa subscribe → tanpa re-render per-frame"* — benar untuk jalur `useFrame`, **salah untuk jalur pointer & recoil**.

**Fix:** pisahkan channel:
- `intensity` untuk **shader** → uniform langsung (sudah ada, benar)
- `intensityDisplay` untuk **UI/indicator** → subscribe, throttled 10 Hz via `requestAnimationFrame` + `lastEmit`

Alternatif lebih bersih: `StretchForceIndicator3D` baca via `useFrame` + `ref.current.scale.set()` langsung (tanpa React).

**Verifikasi:** React DevTools Profiler → recoil stretch 3 detik → commit count turun dari ~180 ke <20.

---

### [ ] P2-2. Throttle lux berbasis frame, bukan waktu — label "Hz" salah
**Status: READ-VERIFIED**
**File:** `TestLabOverlay3D.tsx:212-216`

```ts
frameRef.current += 1;
if (frameRef.current % 15 === 0) { … }  // komentar: "throttle ~4Hz"
```

Frame-count ≠ waktu. 60fps→4Hz ✓ · 30fps→**2Hz** · 120fps→**8Hz**. Di HP low-tier (target proyek) readout lux melambat 2×.

**Fix:** accumulator waktu.
```ts
luxAccum.current += delta;
if (luxAccum.current >= 0.25) { luxAccum.current = 0; setQcLux(…); }
```

**Verifikasi:** throttle HP 30fps, lux readout tetap ~4 update/detik.

---

### [ ] P2-3. `InstancedMesh` di-recreate saat ganti arah angin → 1 frame blank
**Status: READ-VERIFIED**
**File:** `TestLabOverlay3D.tsx:149-153`

```tsx
<instancedMesh ref={meshRef} args={[streakGeo, streakMat, count]} … />
```
`streakGeo`/`streakMat` di-`useMemo([direction])` → ganti arah = `args` berubah = R3F **reconstruct mesh** → `instanceMatrix` nol → partikel tak terlihat. `useEffect` inisialisasi matrix (L83-92) **tidak punya `streakGeo`/`streakMat` di deps** → tidak re-run.

Self-heal dalam 1 frame via `useFrame` (L94-146) — jadi **nyaris tak terlihat**, tapi tetap hoki. Fix: tambahkan `streakGeo` ke deps `useEffect`, atau jangan re-morph geometry (pakai 1 geometry + `quaternion`/rotasi per-instance).

---

### [ ] P2-4. `scene.traverse` tiap `pointerdown` — O(n) full scene walk
**Status: READ-VERIFIED**
**File:** `TestLabOverlay3D.tsx:347-350`

Setiap pointerdown (bukan per-frame, jadi tidakpli критично) traverse seluruh scene hanya untuk kumpulkan mesh. Dengan `windtunnel` 50 partikel + arrows + garment, ini bisa 20-40 objek — masih OK. **Tapi** `intersectObjects(meshes, false)` non-recursive setelah traverse manual → hanya mesh langsung, **skip nested mesh** (group > mesh).

**Fix:** cache daftar mesh saat mount (`useMemo` + `useEffect` invalidasi saat `activeApparel` berubah), atau pakai `raycaster.intersectObject(scene, true)` (built-in recursive).

**Verifikasi:** drag di lengan → `uStretchCenter` harus ikut lengan, bukan fallback (0,0).

---

### [ ] P2-5. Overdraw partikel angin — additive + `depthWrite:false` + `frustumCulled={false}`
**Status: READ-inferred**
**File:** `TestLabOverlay3D.tsx:70-78` · `:152`

50 partikel `CylinderGeometry(0.0035, 0.0035, 1, 8)` additive, `frustumCulled={false}` (wajar — partikel dinamis). Overdraw kecil di 50 partikel, **tapi** `canvas` di mobile/low-tier sudah berat.

**Verifikasi:** ukur FPS di `/studio` mode windtunnel, low-tier (Android 4GB). Target ≥ 30 FPS. Bila < 30: turunkan `count` ke 24 untuk tier low (pakai `useDeviceTier`).

---

## P3 — PARITAS WEB ↔ MOBILE

### [ ] P3-1. Mobile Senter 3D tidak punya: grazing, azimuth, sisi, readout lux
**Status: READ-VERIFIED** (grep + signature)
**Fakta:** store mobile **sudah punya** `qcLux/qcGrazingDeg/qcAzimuth/qcSide/flashlightFocus` (6 match di `useMobileStudioStore.ts`). Tapi:
- `MobileTestLabOverlay3D.tsx:142` — `MobileFlashlight: React.FC<{ focusAngle: number }>` — **hanya 1 prop**
- `MobileTestLabControls.tsx:326-335` — hanya slider focus

**Yang hilang di mobile:** preset grazing 15/30/45/90 · slider azimuth · 6 tombol sisi (DEPAN/BELAKANG/LGN×2/RUSUK×2) · readout lux.

**Fix:** port signature `MobileFlashlight({ focusAngle, grazingDeg, azimuthDeg, side })` + `useFrame` yang sama s `TestLabOverlay3D:180-217` (re-use `grazingToOffset`/`estimateLux` dari web — **shared code**, jangan duplikat). Tambah UI panel.

**Verifikasi:** screenshot mobile mode senter → 6 tombol sisi + 4 preset grazing + lux visible.

---

### [ ] P3-2. Mobile tidak punya darkroom dim
**Status: READ-VERIFIED**
**File:** web `StudioLighting.tsx:94-95` — `testLabDim = isFlashlight ? 0.05 : 1.0`
**Mobile:** `MobileStudioLighting.tsx` — **tidak ada** `testLabDim`.

**Gejala:** mode senter mobile **tidak berdarkroom** → efek dramatic hilang, kontras worse di layar HP terang.

**Fix:** port `testLabDim` ke `MobileStudioLighting`.

---

### [ ] P3-3. Gust coupling tidak sinkron web/mobile → denyut tidak serasi
**Status: READ-VERIFIED**
| | Web (`TestLabOverlay:100`) | Mobile (`MobileTestLabOverlay:87`) |
|---|---|---|
| velocity | `(speed/35) * delta * 2.4 * (0.5 + 0.5*gust)` | `(speed/35) * delta * 2.4` |

**Gejala:** partikel mobile **tidak berdenyut** —Always kecepatan konstan. Web berdenyut sinus.，但如果_MODE_` sama,MX visual tidak match.

**Fix:** mobile juga baca `WIND_GUST(clock.elapsedTime)` (fungsi sudah pure & tersedia — tinggal import, **atau** salin ke shared).

---

### [ ] P3-4. Kopling speed saat ganti mode hilang di mobile
**Status: READ-VERIFIED**
**File:** mobile `MobileTestLabControls.tsx:82-95`

```ts
if (mode === 'windtunnel') { setActiveAnimation('waving'); }  // ← TIDAK set speed
```
Web set `setAnimationSpeed(Math.max(0.6, spd/35))` (L96). Mobile **tidak** — jadi ganti tab ANGIN tidak meng-couple kecepatan.

**Fix:** samakan dengan web (setelah P0-3 fix, pakai helper SSOT yang sama).

---

### [ ] P3-5. Mobile belum ada `MobileDecalGizmo`/mask paritas untuk stretch di lengan
**Status: READ-inferred**
**Fakta:** mobile pakai `getStretchFactors` = **object-level scale** (P1-6), jadi **tidak ada mask kerah/lengan**. Web pakai shader + `aStretchW` mask. Saat user tarik lengan di mobile, **seluruh kaos ikut melar** — termasuk kerah & dada (yang diweb dikunci).

**Fix (P3-4.5, prioritas rendah):** port `ensureStretchWeights` + shader path ke mobile, atau terapkan mask via vertex colors/skin-weight di mesh mobile.

**Verifikasi:** banding video: web tarik lengan (dada diam) vs mobile tarik lengan (dada ikut) — harus sama setelah fix.

---

### [ ] P3-6. `useMobileStudioStore.ts` punya **2 initial state object** (duplikat store?)
**Status: READ-VERIFIED — perlu konfirmasi**
**File:** `useMobileStudioStore.ts:393-394` dan `:671-672`

Dua lokasi sama-sama punya:
```
testLabMode: 'none',
specialInkEffect: 'standard',
```

**Kemungkinan:** `createStore()` factory dipanggil 2× (mis. untuk 2 tier/context), atau file punya 2 store definition. **Jika 2 store terpisah** → state Test Lab di UI ≠ state yang dibaca renderer 3D = **bug diam**.

**Wajib klarifikasi:** baca seluruh file, pastikan 1 store atau 2 context **sengaja**.

---

## P4 — DEAD CODE & HYGIENE

### [ ] P4-1. `windVertexShader` — 36 baris GLSL dead
**Status: READ-VERIFIED** (grep 0 pemanggil)
**File:** `windDisplacement.ts:5-19`
`applyWindToMaterial` (L36-80) pakai string inline `onBeforeCompile`, **bukan** shader ini. Hapus, atau jadikan fallback untuk custom `ShaderMaterial`.

---

### [ ] P4-2. `useStretchUniforms()` — hook dead + default salah
**Status: READ-VERIFIED** (grep 0 pemanggil)
**File:** `stretchDeform.ts:213-228`
Hook tidak pernah dipanggil; kalau dipanggil, default-nya **kontradiksi SSOT** (P1-2). Hapus.

---

### [ ] P4-3. `STRETCH_MAX_ELONG_DEFAULT` / `STRETCH_POISSON_DEFAULT` self-referential
**Status: READ-VERIFIED**
**File:** `stretchDeform.ts:35,37` — hanya dirujuk di file itu sendiri (`sharedStretchUniforms` init + `useStretchUniforms`). Setelah P1-2 + P4-2, jadi 0Reference. Hapus.

---

### [ ] P4-4. Duplikat JSDoc block
**Status: READ-VERIFIED**
**File:** `TestLabOverlay3D.tsx:304-307` — blok komentar pertama (lama) langsung didahului blok asli L308-313. Orphan. Hapus L304-307.

---

### [ ] P4-5. `windDisplacement.ts`少了 `"use client"` — periksa
**Status: perlu konfirmasi** — file ini **tidak** punya `"use client"` (bandingkan `stretchDeform.ts:1` yang punya). Tapi ia dipanggil dari komponen client. Aman (module side-effect free), tapi **konsistensi** dengan `stretchPhysics.ts:1` yang punya `"use client"`. Untuk konsistensi & keamanan (module ini baca `sharedWindUniforms` global), pertimbangkan tambah.

---

### [ ] P4-6. `mockupOnly` apparel punya `orderable:false` tapi `basePriceIdr:0` — Test Lab tetap bisa disimulasikan
**Status: READ-VERIFIED** (informasi, bukan bug)
**File:** `constants.ts:260,272,284` — cap/pants/shorts `orderable: false`, `basePriceIdr: 0`.
Test Lab (stretch/flashlight/wind) **tetap bisa** dipakai di apparel mockup → bagus (bisa test visual).

**Tidak ada action.** Dokumentasikan saja biar tidak ada yang "perbaiki" premature.

---

## P5 — FITURE LANJUTAN (opsional, backlog)

### [ ] P5-1. Implementasikan shader tinta khusus (efe 5 mode)
**Butuh:** owner犹豫 (lihat P0-1). Scope: `clothPhysicalMaterial.ts` — tambah uniform `uInkMode` (0=std, 1=reflective3m, 2=glow, 3=goldfoil, 4=holo) + `uInkTime`. Tambah kolom `Design.specialInkEffect`. Tambah harga di `pricingEngine`. Butuh `db push` via SQL (RUNBOOK §5, bukan `prisma db push` — P1013).

### [ ] P5-2. Real cloth simulation (Verlet) — `verletCloth.ts` sudah ada tapi belum dipakai Test Lab?
**Status: perlu konfirmasi** — `verletCloth.ts` (7.5 KB) ada. Cek apakah dipakai `TestLabOverlay` atau sudah legacy.

### [ ] P5-3. Inspection mode: turntable / bleed / macro / mood / bounds
**Status: docs claim** — `RINGKASAN-LENGKAP.md:19` menyebut "inspeksi turntable/bleed/macro/mood/bounds" sudah ada. **Tidak terlihat** di `TestLabOverlay3D.tsx` (hanya 3 mode). Verifikasi — mungkin ada di `InspectControls.tsx` (6 KB) atau `StudioTour.tsx`. Kalau belum → backlog.

### [ ] P5-4. Overlay ukur cm di Test Lab (dari scaleCalibration)
**Status: belum** — tampilkan dimension line `printWidthCm × printHeightCm` live di atas decal saat mode stretch/flashlight. P powerfully kan印证 kalibrasi 30cm clamp.

### [ ] P5-5. Integrasi `dpiAnalyzer.ts` — tampilkan DPI sablon di panel
**Status: belum terlihat** — `dpiAnalyzer.ts` (3.4 KB) ada. Tampilkan "DPI: 300 ✓ / 150 ⚠" di Test Lab saat decal aktif.

### [ ] P5-6. Persist hasil Test Lab ke `Design` + `ProductionTask`
**Fakta:** Test Lab state (`testLabMode`, `stretchIntensity`, `qcGrazingDeg`, …) **tidak disimpan**. Hilang saat reload. Untuk traceability QC produksi, **minimal** simpan hasil stretching test & lux measurement ke `OrderStatusEvent` atau `QcInspection.checksJson`.

### [ ] P5-7. Snapshot A/B compare Test Lab
**Buat** 2 preset state Test Lab, toggle cepat untuk banding before/after. Berguna untuk belt-and-suspenders Sablon.

### [ ] P5-8. Wind tunnel: parameter realism
**Tambah** turbulence (noise), turbulence intensity, Reynolds number display, garment drag coefficient.

### [ ] P5-9. Senter: color temperature (K) + CRI readout
**Web** sudah ada `setAnimationPreset("golden"/"sunset")` untuk lighting. Senter QC sering butuh 5000K vs 6500K. Tambah slider K (2700–6500) + readout.

### [ ] P5-10. Test Lab: preset skenario QC (workflow 1-klik)
**Misal:** "Kontrol calidad DTF standart" = stretch 50% horizontal → check recovery → senter 30° grazing depan → senter 90° belakang. 1 klik Jalankan 6 langkah, hasilnya bisa jadi checklist QC job ticket.

---

## P6 — TESTING & QUALITY GATE

### [ ] P6-1. Test paritas `ensureStretchWeights` (wajib untuk P1-1)
Script banding 2 implementasi pada 3 geometri sintetis → `max|Δ| = 0`. Jadikan unit test permanen kalau P1-1_fix).

### [ ] P6-2. Test konvensi arah angin (P1-5)
Kunci: vektor `windDirectionToVec` × arah aliran partikel × orientasi `streakGeo`. Cegah regresi kalau `streakGeo` diubah.

### [ ] P6-3. Test range sebenarnya `WIND_GUST`
Dokumentasi klaim [0.2, 1.0] — **belum diujiProperties**. Sweep `t ∈ [0, 120]` step 0.05, assert `min ≥ 0.19` `max ≤ 1.01`, dan estimate perioda.

### [ ] P6-4. Test `grazingToOffset` sumbu azimuth
Test sweep azimuth 0/45/90/180/270/360 — reagent `x²+y²+z² = dist²` (panjang konstan) + `z ≥ 0`. Deteksi degenerasi `deg=0` (lampu di plane kain).

### [ ] P6-5. Test `estimateLux` guard
Input rusak: `NaN`, `Infinity`, `0`, negatif, `distM=0` → output harus finite ≥ 0.

### [ ] P6-6. Playwright spec Test Lab
`playwright.config.ts` sudah punya project `chromium` (c-01..c-05) — belum ada spec Test Lab. Tambah minimal:
- Mode tab reachable & aria-pressed benar
- Slider mengubah store (via observable DOM)
- Senter mode: tidak crash saat apparel switch
- `prefers-reduced-motion` path

---

## P7 — DOKUMENTASI & INFRA (meta)

### [ ] P7-1. **`Blueprint/` dihapus dari repo tapi `AGENTS.md` masih merujuk ~30 file**
**Status: READ-VERIFIED** (commit `426d902` menghapus 40+ file; folder kosong & untracked)
**Dampak:** `e2e-nightly.yml:46` & `e2e-smoke.yml:4` upload ke `Blueprint/e2e/hasil-pengujian-e2e/`; 6 runner `scripts/e2e-R-*.mjs` tulis ke path itu → **pasti gagal**. `AGENTS.md` §1 menyuruh baca `RINGKASAN-LENGKAP.md` dll yang sudah tidak ada.

**Fix:** (a) pulihkan `Blueprint/` dari `..\Backup-Kaos-Kami\`, atau (b) update semua rujukan + `AGENTS.md` §1. **Test Lab TODO ini (`Blueprint/TODO-TESTLAB-3D-MAXIMAL.md`) adalah file pertama yang kembali ke `Blueprint/` — stepssia球迷 mengikuti dengan tracker lain.**

### [ ] P7-2. `playwright.config.ts` ber-`@ts-nocheck` + ditandai "DRAFT" padahal 17 spec sudah ada
**File:** `kaos-kami-web/playwright.config.ts:1-2` — `// @ts-nocheck` + "DRAF R1 … JANGAN jadikan acuan hijau".

**Fix:** hapus `@ts-nocheck`, typecheck config, update komentar status.

### [ ] P7-3. Sinkronisasi status test count di docs
`RINGKASAN-LENGKAP.md:27` & `PROGRESS:5` tulis "vitest 57/57". Aktual **158/158** (22 file). Update semua dokumen + badge.

---

## KUTUPAN KEPUTUSAN (owner)

Sebelum kerjakan P5, butuh keputusan:

1. **P0-1 tinta:** (A) hapus UI · (B) implementasikan · (C) disable + tooltip?
2. **P0-2 senter:**修復 `target` via `useEffect` (aman) atau R3F ref-as-prop (perlu verify v9)?
3. **P1-1 duplikat:**显而易见 mana yang jadi owner (`stretchDeform.ts` atau `geometryPrep.ts`)?
4. **P3-1 mobile senter:** port penuh (gagal/client work 8–14 jam) atau cukup sediakan darkroom + focus (P3-2, 1 jam)?
5. **P5-6 persist:** Test Lab state perlu disimpan ke DB untuk traceability QC, atau cukup UI session?

---

## URUTAN EKSEKUSI SARAN

**Sesi 1 — "Jujur & Consistency" (santai, ~4 jam, low risk)**
1. P0-1 → pilih (A) atau (C) **(putuskan dulu!)**
2. P0-2 fix target senter
3. P0-3 extract helper `windAnimationSpeed`
4. P1-3 `QC_LAMP_CD` konstanta
5. P1-4 samakan slider ↔ clamp
6. P4-1/2/3/4 hapus dead code

**Sesi 2 — "SSOT Health" (~4 jam)**
7. P1-1 dedup `ensureStretchWeights` + P6-1 test paritas
8. P1-2 fix konstanta + note
9. P7-1 pulihkan `Blueprint/` atau update `AGENTS.md`
10. P7-2 hapus `@ts-nocheck`
11. P7-3 update status test

**Sesi 3 — "Performance & Polish" (~4 jam)**
12. P2-1 throttle display re-render
13. P2-2 throttle lux berbasis waktu
14. P2-3 fix `useEffect` deps
15. P2-4 cache mesh list
16. P6-3/4/5 unit tests tambahan

**Sesi 4 — "Mobile Parity" (~10 jam)**
17. P3-2 darkroom mobile
18. P3-3 gust coupling
19. P3-4 speed coupling
20. P3-1 senter mobile lengkap
21. P3-5 stretch mask mobile (opsional)
22. P3-6 klarifikasi 2 store

**Sesi 5+ — "Feature" (backlog P5, butuh owner)**
23. P5-10 preset skenario QC
24. P5-4 cm overlay
25. P5-5 DPI panel
26. P5-1 tinta (jika diputuskan (B))

---

## CATATAN VALIDASI

- `npm run web:typecheck` → ✅ 0 error
- `npm run mobile:typecheck` → ✅ 0 error
- `npm --workspace=kaos-kami-web run test` → ✅ **158/158 PASS** (22 file, ~8.8s)
- Item P0-1, P1-1, P1-2, P1-3, P1-4, P0-3, P2-2, P2-3, P3-2, P3-3, P3-4, P3-6, P4-1/2/3/4, P7-1, P7-2 → **READ-verified** (bukti file:line)
- Item P1-5, P1-6, P1-7, P2-1, P2-4, P2-5, P3-5, P5-* → **READ-inferred / belum diuji empiris** — verifikasi dulu sebelum action
- Gating: `playwright.config.ts` masih DRAFT (P7-2), jadi E2E belum bisa jadi gerbang hijau

**Tidak ada P0 yang memblokir deploy.** 3 item P0 = kualitas/promise ke user, bukan availability.
