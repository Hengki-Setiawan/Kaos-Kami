# TODO LENGKAP — MOCKUP 5/5: ASET + SISTEM + ALUR 2D (FASE M0–M5)

> Target: semua aset skor 5/5 + semua lapis maksimal (realistis, akurat cm/DPI,
> HP-friendly, legal). Status: RENCANA (dibuat 09 Sep 2026).
> Aturan: tiap fase tutup `tsc 0 + build hijau` web+mobile + screenshot
> before/after + update `Blueprint/TODO-SISA-KERJA-MAXIMAL.md`. DEPLOY/PUSH GATE berlaku.
> Simbol `‖` = boleh paralel.
>
> KEPUTUSAN C5 (owner, 11 Sep 2026): KTX2 DITUNDA — Draco cukup untuk katalog
> saat ini. Syarat buka-lagi: katalog 10+ garmen ATAU VRAM tekstur >50MB
> (ukur via M5). Larangan: file `.ktx2` palsu sudah dihapus (M0.2:
> `hoodie.ktx2.glb`, `jacket.ktx2.glb` — hancurkan hierarki); JANGAN commit
> file `*.ktx2*` palsu lagi. Varian KTX2 asli (uastc/etc1s) di pipeline M1.0
> berstatus DITUNDA, bukan wajib.

---

## FASE M0 — KEPUTUSAN + BERSIH-BERSIH (dulu, ½ hari, blokir M1)

- [ ] **M0.1. Owner pilih jalur aset**: A gratis / B beli hero $10–20 ⭐ / C jasa.
      Acceptance: tertulis di tracker + budget keluar (B/C).
- [x] **M0.2. Hapus artefak menipu** ✅ 13 Sep 2026 (terbukti di kode): `hoodie.ktx2.glb`, `jacket.ktx2.glb`
      (palsu, hancurkan hierarki), `hoodie.optimized.glb`, `jacket.optimized.glb`
      (duplikat bit-identik) → hapus dari repo + perbaiki rantai fallback
      `useDeviceTier.ts`/`CanvasStage.tsx` (ktx2→optimized→lod1→legacy).
      Acceptance: grep `ktx2|optimized` hanya rujuk file yang ADA; tidak ada 404.
- [ ] **M0.3. Audit lisensi**: ganti kredit generik (`Open 3D Apparel Library`,
      `Vault`, `Tactical`) di `ASSET_CREDITS.md` dengan sumber riil
      (URL + author + lisensi + file invoice). Tolak NC/ND/SA/Editorial.
      Acceptance: tiap GLB prod terlacak sumbernya.

---

## FASE M1 — ASET 5/5 (shared + cabang A/B/C)

### M1.0 Shared — definisi selesai + pipeline (wajib semua jalur)
- [ ] **Checklist acceptance aset** (tolak bila gagal ≥2): quad ≥90%,
      5–15K tri, kerutan sculpted, hem/kerah/manset bervolume, UV pulau
      depan/belakang/lengan terpisah, Normal+AO baked, slot
      `body/sleeve/collar(/hood)`, skala cm + origin benar (angka bbox),
      GLB <3MB + LOD1, lisensi tertulis.
- [ ] **Pipeline baku per aset**: `inspect` → Blender (M1.A/B/C) → export GLB →
      `gltf-transform optimize --compress draco --texture-compress webp
      --texture-size 1024` → varian KTX2 asli (`uastc` normal/ORM +
      `etc1s` warna) → `simplify --ratio 0.35` LOD1 → `validate` 0 error.
- [ ] **Ukur ulang tiap aset baru**: multiplier + surfaceZ + spek sisi via
      metode `scaleCalibration.ts` (seperti Fase 13); update SSOT + uji klaim
      30.0/28.0/14.0cm. Acceptance: gizmo 30cm = render 30cm = cetak 30cm.

### M1.A Jalur GRATIS (Rp0, 1–2 minggu)
- [ ] Poles `tshirt-heavyweight.glb`: generate TANGENT, Solidify hem/kerah,
      UV depan rapi, bake AO, tekstur Poly Haven CC0, Draco+WebP <500KB.
- [ ] `longsleeve.glb`: rename node, deduplikasi 592KB tekstur (share),
      kompresi sama.
- [ ] Hoodie/jaket: re-UV + bake normal/AO + merge prims + namai node +
      center origin + split material logam jaket + bersihkan node Collada.
- [ ] Fallback: `shirt_baked.glb` (starklord) siap bila mesh prod rusak.

### M1.B Jalur BELI HERO ⭐ (Rp160–320rb + 2–4 hari per garmen)
- [ ] Beli 1 kaos hero (Superhive $9.99 / CGTrader $11.40, Royalty-Free/Fab,
      ada `.blend` + UV + PBR 2K) → retopo ringan → slot per part →
      pipeline M1.0 → ukur ulang → ganti hero bila lolos checklist.
- [ ] Ulangi hoodie (dan jaket/longslv bila perlu) hanya bila hero lolos.

### M1.C Jalur JASA (Rp500rb–1.5jt/garmen, 1–2 minggu)
- [ ] Brief + milestone (base → sculpt/UV → bake/export) + kontrak buyout
      + deliverable `.blend/.glb/2K/UV/slot/cm`.
- [ ] Validasi tiap milestone dengan checklist M1.0 (tolak bila gagal ≥2).

---

## FASE M2 — SISTEM RENDER MAKSIMAL (urut dampak, ±1 minggu)

- [ ] **M2.1. IBL Environment** (`StudioLighting.tsx`, `CanvasStage.tsx`):
      `Environment` HDR studio kecil (<300KB) + PMREM; `envMapIntensity`
      0.35–0.55 kaos / 0.25 hitam / 0.6–0.8 jaket; ambient 1.05→0.35–0.5,
      rear 1.3→0.6. Acceptance: highlight lembut grazing, kain gelap tak tercuci.
- [ ] **M2.2. Ketebalan**: rib kerah + cuff + hem double-fold (geometri atau
      strip dalam gelap) + piping jahitan via bump. Ukur ulang surfaceZ bila
      mesh berubah. Acceptance: tepi tak setajam silet saat zoom.
- [x] **M2.3. Decal menyatu kain** ✅ 13 Sep 2026 (terbukti di kode) (`DecalLayerRenderer.tsx`): warisi
      roughness 0.9–0.95 + sheen + normalMap weave 50–70% kain; alpha-feather
      1–2px; `polygonOffsetFactor -2`. Acceptance: sablon matte ikut serat.
- [x] **M2.4. Rasio lampu** ✅ 13 Sep 2026 (terbukti di kode) (`StudioLighting.tsx`): key:fill:rim ≈ 2.2:0.6:0.8;
      ambient → hemisphere (sky/ground beda); shadow 1024 semua tier (−75% memori depth) + radius 4–6,
      ortho ±1.5; ContactShadows blur 3.2 opacity 0.35. Acceptance: lipatan terbaca.
- [ ] **M2.5. Lipatan skala besar**: bake wrinkle normal (strength 0.5–0.8,
      tiling 1×) + AO lipatan; gabung micro-weave via detail (bukan repeat 32).
      Butuh aset M1 (atau sculpt cepat di kaos hero). Acceptance: dada tak papan licin.
- [x] **M2.6. Lantai studio** ✅ 13 Sep 2026 (terbukti di kode) (`CanvasStage.tsx`): lingkaran matte receiveShadow
      + ContactShadows penguat + gradient gelap bawah (refleksi 0.05–0.12
      khusus high-tier). Acceptance: tak mengambang; scale 6.5 dirampingkan.
- [x] **M2.7. Weave jujur** ✅ 13 Sep 2026 (terbukti di kode) (`proceduralTextures.ts`, `geometryPrep.ts`):
      repeat 16→8–10, normalScale →0.30–0.45 (uji moire DPR 1), tambah
      roughnessMap ±0.06 + bump 0.002, densitas world-scale, normal Non-Color.
      Acceptance: serat terbaca di jarak mockup, tak shimmer.
- [x] **M2.8. Colorspace** ✅ 13 Sep 2026 (terbukti di kode): decal SRGB eksplisit, normal/rough linear,
      output default; uji chart abu + merah/oranye. Acceptance: warna layar = file.
- [x] **M2.9. Tone-map akurat** ✅ 13 Sep 2026 (terbukti di kode): exposure 1.0 semua tema, Vignette →0.25–0.3,
      Bloom →0.15/off untuk mockup; toggle "akurat warna" pre-cetak.
      Acceptance: hitam tak jadi abu susu.
- [~] **M2.10. Kamera/AA lintas tier** ✅ 13 Sep 2026 (parsial kamera saja — fov 40; sisa AA/DPR/preset belum): fov 40 tetap; low-tier SMAA/FXAA +
      DPR ekspor PNG kunci 2; preset iso default lookbook.
      Acceptance: "kaos sama" di semua HP.

---

## FASE M3 — ALUR 2D MAKSIMAL: CETAK = LAYAR (±3–4 hari)

- [x] **M3.1. Master asli ke Fabric** ✅ 13 Sep 2026 (terbukti di kode): `PatternStudio` muat
      `getMasterDataUrl()` (bukan preview); ekspor komposit dari bitmap master;
      tolak ekspor bila `masterDpiAt30cm < 150` (pesan jujur).
- [x] **M3.2. Satu SSOT master** ✅ 13 Sep 2026 (terbukti di kode): `exportPanelMaster` menarik master per-decal;
      hapus jalur ganda dari checkout (atau dokumentasikan yang hidup).
- [x] **M3.3. Original tak tersentuh** ✅ 13 Sep 2026 (terbukti di kode): simpan `originalMaster` per decal +
      tombol "Kembalikan asli"; BG/sharp tulis master penuh (tanpa cap 1600)
      atau badge "master turun resolusi"; editor 3000 (jangan 2400).
- [x] **M3.4. Tepi bersih** ✅ 13 Sep 2026 (terbukti di kode): choke 1px + decontaminate RGB tepi; shadow teks
      opsional default MATI; tolerance slider + preview checkerboard; opsi
      black-background (foto malam).
- [x] **M3.5. Satu mesin teks** ✅ 13 Sep 2026 (terbukti di kode): hapus raster Fabric lokal → panggil
      `generateTextDecalDataUrl` dari kedua pintu + `setMasterDataUrl` + `printPx`.
- [ ] **M3.6. Master wajib sebelum checkout**: status per-decal (sudah/belum
      tersimpan); guest via server-hosting; peringatan "master belum tersimpan".
- [x] **M3.7. Label jujur + tiled** ✅ 13 Sep 2026 (terbukti di kode): label dinamis `SIMPAN MASTER @~{actualDpi}
      DPI`; `composePrintFileTiled` + upload sekuensial untuk A3; tetap contain.

---

## FASE M4 — BONUS KOMPETITOR (murah, berdampak)

- [x] **M4.1. Teamwear flow** ⭐ ✅ parsial 13 Sep (grouping + snapping saja): 1 desain → tabel nama/nomor → keranjang massal
      → task massal (pasar komunitas/sekolah/jersey Makassar).
- [ ] **M4.2. Kalkulator sablon statis**: print-size, GSM, tabel placement baku
      (SEO + trust, tanpa server).
- [x] **M4.3. Tur 3 langkah** ✅ parsial 13 Sep (grouping + snapping saja): upload → atur → order/download + Fit/Fill +
      snapping guidelines.
- [ ] **M4.4. Preset view + curated palette**: depan/belakang/lengan/zoom kerah;
      8–12 warna (bukan color-wheel bebas).
- [ ] **M4.5. Turntable + snapshot share**: auto-rotate + capture client-side
      (ganti video mahal).

---

## FASE M5 — VERIFIKASI 5/5 (definisi selesai)

- [ ] **Forensik ulang**: semua GLB prod lolos checklist M1.0 (skor 5/5) +
      tak ada file palsu/duplikat + lisensi tertulis.
- [ ] **Screenshot blind-test**: 3 apparel × 3 warna (terang/gelap/warna) +
      before/after M2 — bandingkan dengan foto kaos asli sekilas.
- [ ] **Akurasi**: klaim 30cm render, badge DPI vs master, ekspor vs cetak
      (uji 1 order nyata sampai produksi).
- [ ] **HP kentang**: FPS + VRAM + ukuran download per tier; LOD1 aktif benar.
- [ ] **Legal**: tidak ada NC/ND/SA/Editorial/kredit generik.

## Urutan + paralel
`M0 → M1 (+ M4.2/M4.3 paralel, statis) → M2 ‖ M3 → M4.1/M4.4/M4.5 → M5`.
Estimasi: A ≈ 2–3 minggu · B ≈ 2 minggu + belanja · C ≈ 2–3 minggu + jasa.
