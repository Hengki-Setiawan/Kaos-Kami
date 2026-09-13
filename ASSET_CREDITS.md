# Asset Credits & Licensing Log

This document tracks all external 3D models, textures, fonts, and assets sourced for the Kaos Kami project.

## 1. 3D Garment Models (`.glb`)

| Asset Name | Target File Path | Provenance / Sourced From | License | Size | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heavyweight Boxy Tee** | `public/models/tshirt-heavyweight.glb` | Starklord / Poimandres lineage — file BIT-IDENTIK dengan `shirt_baked.glb` (SHA256 `4C020995…CC3725`, cocok 11 Sep 2026) — [Starklord17/threejs-t-shirt](https://github.com/Starklord17/threejs-t-shirt) | MIT | 1.0 MB | Active Production (sumber dikoreksi M0.3; klaim lama "Open 3D Apparel Library / CC-BY 4.0" dicatat di §4) |
| **Heavyweight Boxy Longsleeve** | `public/models/longsleeve.glb` | Hulu Starklord/JS-Mastery, ikut tee (klaim lama "Derived from Open 3D Apparel Library…" DICABUT — lihat §4) | MIT (hulu Starklord/JS-Mastery, ikut tee — SELESAI 13 Sep, lihat §4; simpan copyright notice) | 1.2 MB | Active Production — SELESAI 13 Sep (lihat §4) |
| **Blue Hoodie (Default)** | `public/models/hoodie-blue.glb` & `hoodie-blue.draco.glb` | Irevex11 — [Sketchfab](https://sketchfab.com/3d-models/blue-hoodie-7b78c56cd15e479b8ec9b18145ed0721) | CC-BY 4.0 | 2.55 MB (Draco) / 3.0 MB | Active Production — ✅ TERVERIFIKASI CC-BY 4.0 (model legacy `hoodie.glb` dipensiunkan ke `backups/models-archive/`) |
| **Streetwear Coach Jacket** | `public/models/jacket.glb` | ⚠️ VERIFIKASI — tercatat "Tactical Apparel Asset Library", tanpa URL/author/invoice | ⚠️ VERIFIKASI — TANPA KLAIM (lihat §4) | 28 KB aktual (tercatat lama "5.2MB→4.1MB", dikoreksi M0.3) | Active — lisensi belum terlacak |
| **Celana Panjang (Pants)** | `public/models/pants.glb` (master bit-identik `Asset 3D/github/pants.glb`, SHA256 `C0CEAD9977E7…F2F61A2`) | madjin, MIT, GitHub — klaim `Blueprint/ASSET-WAVE1-CHECKLIST.md:57`; ⚠️ URL repo persis BUTUH dari owner | MIT (klaim checklist, belum terbukti) | 1.16 MB (1.215.800 byte) | ⚠️ BUTUH URL repo persis — terukur 13 Sep 2026: 1.536 tris, UV 1/1, 1 img/1 tex/1 mat |
| **Celana Pendek (Shorts)** | `public/models/shorts.glb` (master bit-identik `Asset 3D/github/shorts.glb`, SHA256 `8F35E9F082E7…AC5A0BA2`) | madjin, MIT, GitHub — klaim `Blueprint/ASSET-WAVE1-CHECKLIST.md:57`; ⚠️ URL repo persis BUTUH dari owner | MIT (klaim checklist, belum terbukti) | 754 KB (772.500 byte) | ⚠️ BUTUH URL repo persis — terukur 13 Sep 2026: 1.078 tris, UV 1/1, 1 img/1 tex/1 mat |
| **Baked AO T-Shirt** | `.skills-sourced/3d-configurators/starklord-tshirt/public/shirt_baked.glb` | Starklord / Poimandres Repository | MIT | 1.0 MB | Reference / Backup |
| **Classic Crewneck Tee** | `.skills-sourced/3d-configurators/afilah-clothing-configurator/public/shirt.glb` | Afilah 3D Configurator Repo | MIT | 1.1 MB | Reference / Backup |

## 2. Textures, Shaders & Fonts

| Asset | Target Path | Source URL / Provider | License | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Micro-weave Normal Map** | `src/lib/proceduralTextures.ts` | Procedural 2D Canvas Generator | MIT | Zero-dependency, dynamic 24s/28s cotton knit |
| **Cotton Jersey Normal (GL) 512px** | `kaos-kami-web/public/textures/cotton-jersey-nor_gl_512.jpg` (13.9KB, q90) | [Poly Haven — Cotton Jersey](https://polyhaven.com/a/cotton_jersey) — Rico Cilliers + colormass | CC0 (public domain, tanpa atribusi wajib) | Foto knit makro, repeat 3× di atas weave prosedural 9× (lihat `clothPhysicalMaterial.ts`); 1K asli 679KB → 512px |
| **Cotton Jersey Roughness 512px** | `kaos-kami-web/public/textures/cotton-jersey-rough_512.jpg` (47.9KB, q85) | [Poly Haven — Cotton Jersey](https://polyhaven.com/a/cotton_jersey) — Rico Cilliers + colormass | CC0 (public domain, tanpa atribusi wajib) | Mean terukur 0.80 → kompensasi `PHOTO_ROUGH_MEAN`; bump mikro prosedural tetap dipakai; tier-low tetap prosedural murni |
| **Lookbook Placeholders** | `src/lib/placeholderImage.ts` | Procedural Canvas Generator | MIT | Fallback offline assets |
| **Google Typography** | `next/font/google` | Syne, JetBrains Mono, Plus Jakarta Sans | SIL Open Font License | Embedded in Next.js build |

## 3. Reference Configurator Codebases

| Repository | Local Path | Origin | License | Primary Takeaway |
| :--- | :--- | :--- | :--- | :--- |
| **Starklord T-Shirt** | `.skills-sourced/3d-configurators/starklord-tshirt/` | [Starklord17/threejs-t-shirt](https://github.com/Starklord17/threejs-t-shirt) | MIT | Drei `<Decal>` projection & reactive color mutation |
| **Vihan T-Shirt Designer** | `.skills-sourced/3d-configurators/vihan-tshirt-designer/` | [vihanrs/t-shirt-designer-webapp](https://github.com/vihanrs/t-shirt-designer-webapp) | MIT | Fabric.js 2D Canvas typography & 3D texture projection |
| **Afilah Clothing Configurator** | `.skills-sourced/3d-configurators/afilah-clothing-configurator/` | [afilahkle/3D-Clothing-Configurator](https://github.com/afilahkle/3D-Clothing-Configurator) | MIT | Multi-apparel geometry scale clamping & drawer UI |

## 4. Catatan verifikasi M0.3 (11 Sep 2026 — riwayat klaim lama dipertahankan, tidak dihapus)

- **Tee (TERKOREKSI, terverifikasi)**: klaim lama "Open 3D Apparel Library / CC-BY 4.0" terbukti keliru.
  Bukti: `tshirt-heavyweight.glb` SHA256 `4C020995F86593348909FC6DA64C390D60EF2A22F8A4D421F70ACED70ACC3725`
  = bit-identik dengan `.skills-sourced/3d-configurators/starklord-tshirt/public/shirt_baked.glb`
  (node `T_Shirt_male`, material `lambert1`, tekstur JPEG 512KB+80KB sama). Sumber terdekat yang bisa
  diverifikasi: [Starklord17/threejs-t-shirt](https://github.com/Starklord17/threejs-t-shirt), lisensi MIT.
  Konsekuensi: kewajiban atribusi ikut aturan MIT (simpan copyright notice), bukan CC-BY.
  Sisa manusia: telusuri hulu Starklord (lini tutorial JS Mastery — penulis model asli belum bernama) bila perlu atribusi penuh.
- **Longsleeve (MIT — hulu sama dengan Starklord, 13 Sep 2026)**: klaim lama "Derived from Open 3D Apparel Library with organic arm folds &
  5cm ribbed cuffs / CC-BY 4.0" tanpa URL/author/invoice DICABUT. Bukti baru (riset web 13 Sep 2026):
  pasangan node `T_Shirt_male` + material `lambert1` adalah sidik jari file `shirt_baked.glb` dari
  lini tutorial JS Mastery ([adrianhajdin/project_threejs_ai#58](https://github.com/adrianhajdin/project_threejs_ai/issues/58)
  — tipe `GLTFResult { nodes: { T_Shirt_male }, materials: { lambert1 } }`), file yang SAMA yang dipakai
  Starklord ([Starklord17/threejs-t-shirt](https://github.com/Starklord17/threejs-t-shirt), lisensi MIT,
  `public/shirt_baked.glb`), digabung forensik lokal: pasangan tekstur JPEG identik (512KB normal +
  80KB occlusion) sama dengan file Starklord/MIT. Kesimpulan: longsleeve hampir pasti turunan hulu yang
  sama → ikut aturan MIT (simpan copyright notice), BUKAN CC-BY. Caveat sama seperti tee: penulis model
  asli hulu tutorial belum bernama — bila perlu atribusi penuh, telusuri hulu JS Mastery.
  Sisa manusia: owner cek file `.blend`/riwayat unduhan sebagai konfirmasi akhir.
- **Hoodie (⚠️ VERIFIKASI)**: klaim lama "3D Garment Asset Vault / CC-BY 4.0" tanpa URL/author/invoice.
  Jejak forensik: material `Force Fleece_FRONT_134561` + `Fabric374733_FRONT_76578` khas ekspor CLO/Marvelous
  Designer — petunjuk (bukan bukti): cek riwayat unduhan CLO-SET CONNECT/akun garment library owner.
- **Jacket (⚠️ VERIFIKASI)**: klaim lama "Tactical Apparel Asset Library / CC-BY 4.0" tanpa URL/author/invoice.
  Jejak forensik: root `OSG_Scene` + `RootNode (gltf orientation matrix)` + material generik `tex_jacket` =
  konversi Collada/OpenSceneGraph, 10 sub-mesh. Sumber tak diketahui — butuh invoice/URL dari owner.
- **Pants/Shorts (⚠️ BUTUH URL repo persis, 13 Sep 2026)**: klaim checklist "madjin — MIT — GitHub
  ✅ SUDAH (6 GLB, 4MB)" (`Blueprint/ASSET-WAVE1-CHECKLIST.md:57`) — hanya itu buktinya.
  Terukur: `pants.glb` 1.215.800 byte / 1.536 tris / UV 1/1 / 1 img+1 tex+1 mat;
  `shorts.glb` 772.500 byte / 1.078 tris / UV 1/1 / 1 img+1 tex+1 mat; salinan
  `public/models/` bit-identik dengan `Asset 3D/github/` (SHA256 cocok penuh).
  Klaim MIT JANGAN dianggap terverifikasi sampai owner memberi URL repo GitHub
  persis + bukti file LICENSE di repo tersebut. Catatan jujur: baris `Asset 3D/github/`
  hanya berisi 2 file ini (4 file checklist lain — tshirt/hoodie/longsleeve/vest —
  tidak ada di folder itu; jangan cari di sana).
- **Aturan M5**: file berlabel ⚠️ VERIFIKASI tidak boleh dinyatakan lolos legal sampai ada URL + author +
  lisensi tertulis (tolak NC/ND/SA/Editorial).
 - **Koreksi ukuran (M0.3)**: kolom Size jacket tercatat "5.2 MB → draco 4.1MB" — aktual `jacket.glb` = 27.956 byte
   (±28KB). Klaim lama dikutip di sini agar riwayat tidak hilang; angka tabel sudah dikoreksi.

## 5. Staged Wave-1 — 7 file Sketchfab (12 Sep 2026, inventaris admin)

> Status SEMUA baris: **✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) (screenshot badge + URL sumber)**.
> Kolom "Klaim checklist" HANYA menyalin `Blueprint/ASSET-WAVE1-CHECKLIST.md` (bukan bukti lisensi).
> Angka tris/byte/UV/tekstur TERUKUR via parse chunk JSON GLB (read-only, 12 Sep 2026).
> PEMBARUAN SORE 12 Sep 2026: 5 dari 7 baris ini kini punya salinan rename di
> `kaos-kami-web/public/models/` (tee-basic, hoodie-blue, sweater, cap, fleece-alt —
> SHA256 identik, terkonfirmasi ulang via `gltf-transform inspect`), plus 2 salinan
> dari arsip (hoodie-flat ← hoodie vsese, tee-alt ← tshirt aliabbas). Lihat §7.
> `bomber_jacket` + `wind_breaker_jacket` TIDAK ikut disalin (arsip sementara).

| Asset Name | File | Klaim Checklist (belum bukti) | Lisensi | Terukur | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic T-Shirt** | `Asset 3D/sketchfab/basic_t-shirt.glb` | MadeByYeshe, CC-BY, 7.2k + 4K | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 1.315.068 byte • 7.202 tris • UV 1/1 • 3 img/3 tex | STAGED |
| **Blue Hoodie** | `Asset 3D/sketchfab/blue_hoodie.glb` | Irevex11, CC-BY, 13.8k | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 3.004.384 byte • 13.802 tris • UV 1/1 • 3 img/3 tex | STAGED (alternatif hoodie BER-UV) |
| **Sweater Pack (crewneck)** | `Asset 3D/sketchfab/sweater_pack.glb` | MadeByYeshe, CC-BY | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 2.626.444 byte • 7.424 tris • UV 1/1 • 3 img/3 tex | STAGED |
| **Baseball Cap** | `Asset 3D/sketchfab/baseball_cap.glb` | Jarlan Perez, CC-BY 3.0 via poly.pizza | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 2.982.976 byte • 93.200 tris FLAT (0 tex) | STAGED — wajib decimate/LOD + material ulang SEBELUM public/ |
| **Bomber Jacket** | `Asset 3D/sketchfab/bomber_jacket.glb` | DeJuan_Owens, CC-BY, 5.8k | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 2.891.048 byte • 5.836 tris • UV 5/5 • 3 img/3 tex | STAGED |
| **Fleece Jacket** | `Asset 3D/sketchfab/fleece_jacket.glb` | Jonathan Millhauser, CC-BY, 6.4k | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 3.829.312 byte • 6.392 tris • UV 10/10 • 3 img/3 tex | STAGED |
| **Wind Breaker Jacket** | `Asset 3D/sketchfab/wind_breaker_jacket.glb` | Anti-Impack, CC-BY, 8.4k | ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) | 2.546.820 byte • 8.380 tris • UV 3/3 • 3 img/3 tex | STAGED |

Aturan M5 berlaku: file ⚠️ tidak boleh dinyatakan lolos legal sampai ada URL + author + lisensi tertulis (tolak NC/ND/SA/Editorial).

## 6. Arsip Wave-1 — 16 GLB Sketchfab + 4 zip BlendSwap (tetap di `Asset 3D/`, JANGAN copy ke `public/`)

16 GLB arsip (terukur): `polo_shirt.glb` 829.168 tris/24,9MB (retopo dulu) • `t_shirt.glb` 237.938 tris tanpa tekstur •
`male_pants_jeans.glb` 70.943 tris/7,2MB (klaim checklist 10k TIDAK COCOK ukur) • `beanie.glb` 38.844 tris •
`premium_eco_hoodie.glb` 31.413 tris (cadangan hoodie) • `soccer_jersey.glb` 25.329 tris (repaint polos dulu) •
`tshirt.glb` 21.983 tris (cadangan tee) • `canvas_bag.glb` 16.525 tris/10,6MB/33 tekstur (gabung material dulu) •
`denim_jacket.glb` 11.352 tris • `female_denim_short.glb` 13.782 tris (butuh varian male) •
`hoodie.glb` 10.278 tris vsese ⚠️ NAMA KEMBAR dengan hoodie aktif (file BERBEDA, tanpa tekstur) •
`male_cargo_pants.glb` 10.016 tris • `scarf.glb` 12.326 tris tanpa tekstur •
`bucket_hat.glb` 7.298 tris (cadangan topi; hapus bendera Czech) • `apron.glb` 6.336 tris (pasar kafe) •
`jacket_varsity.glb` 2.576 tris (paling ringan, cadangan varsity).

4 zip BlendSwap — **butuh Blender** (berisi `.blend`, tris tak terukur tanpa Blender; lisensi di bawah DIBACA dari
`LICENSE.html` bawaan tiap zip, bukan karangan):

| Asset Name | File | Author (checklist + bundle) | Lisensi (dari LICENSE.html bawaan) | Isi Zip | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic Hoodie** | `Asset 3D/blendswap/Basic Hoodie.zip` (3.566.882 byte) | acstrider | CC0 1.0 (blend #91633, Blender 2.79, 2018-04-29) | `Basic Hoodie.blend` 4,9MB | ARSIP — butuh Blender |
| **Cloth library** | `Asset 3D/blendswap/Cloth library.zip` (32.856.694 byte) | hotzst | CC0 1.0 (blend #87574, Blender 2.78, 2017-02-18) | `clothLib.blend` 39MB — ekstrak shirt-nya saja | ARSIP — butuh Blender |
| **Set of clothes** | `Asset 3D/blendswap/Set of clothes.zip` (3.032.692 byte) | Mironov | CC-BY 3.0, atribusi wajib (blend #92133) | `set of clothes.blend` 8,5MB, ada UV per checklist | ARSIP — butuh Blender |
| **Shirt Template** | `Asset 3D/blendswap/Shirt Template.zip` (269.143 byte) | jesterelly | CC0 (blend #77218; turunan topologi "blouson" zuendholz) | `shirts_tpl.blend` 1MB + preview | ARSIP — butuh Blender |
- **Catatan unduhan M-sisa (11 Sep 2026, jujur)**:
  - HDR lokal GAGAL budget — `studio_small_03_1k.hdr` (Poly Haven, CC0) terukur 1.686.299 byte
    (≈1.6MB) > batas 300KB, jadi TIDAK dimasukkan ke repo (melindungi budget unduhan HP).
    `StudioLighting` tetap preset CDN `city` + sekat `IBLFallback` (offline = lampu prosedural,
    model tetap tampil). Percobaan ulang sah bila ada HDR studio CC0 ≤300KB.
  - Tekstur cotton-jersey BERHASIL (lihat §2): 1K asli 679KB+865KB → 512px ±62KB total.
  - Decoder Draco: 9 file non-runtime dihapus (`bunny.drc`, encoder ×3, nodejs ×3,
    `draco3dgltf.js`, `package.json`, `README.md` — salinan npm `draco3dgltf@1.5.7`
    Apache-2.0 Google Draco Team); runtime tersisa 4 file sesuai kebutuhan three
    `DRACOLoader` (`draco_decoder.js` fallback JS + `draco_wasm_wrapper.js` +
     `draco_decoder.wasm` jalur WASM) + `draco_decoder_gltf.wasm` cadangan mandat.

## 7. Salinan public/ 12 Sep 2026 (sore) — 7 file STAGED, inventaris admin

> 7 file di bawah adalah salinan rename di `kaos-kami-web/public/models/` yang
> SHA256-nya IDENTIK dengan master di `Asset 3D/` (12 hex pertama dicocokkan,
> read-only — bukan olahan ulang). Angka tris/UV/tekstur dikonfirmasi ulang via
> `gltf-transform inspect` (glPrimitives = tris; TEXCOORD_0 = UV): SEMUA COCOK
> dengan §5/§6, tidak ada asumsi baru.
> Status SEMUA baris: **✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) (screenshot badge + URL sumber)**.
> Kolom "Klaim checklist" HANYA menyalin `Blueprint/ASSET-WAVE1-CHECKLIST.md` (bukan bukti lisensi).
> TIDAK ada lisensi yang dikarang di bagian ini.

| File public/ (baru) | Master Asset 3D/ (SHA256 12 hex) | Klaim Checklist (belum bukti) | Terukur (inspect) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `kaos-kami-web/public/models/tee-basic.glb` (1.315.068 byte) | `Asset 3D/sketchfab/basic_t-shirt.glb` (`BA69F75A0C1D…`) | MadeByYeshe, CC-BY, 7.2k + 4K | 7.202 tris • UV 1/1 • 3 tex/1 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) |
| `kaos-kami-web/public/models/hoodie-blue.glb` (3.004.384 byte) | `Asset 3D/sketchfab/blue_hoodie.glb` (`17400DD160C8…`) | Irevex11, CC-BY, 13.8k | 13.802 tris • UV 1/1 • 3 tex/1 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) |
| `kaos-kami-web/public/models/sweater.glb` (2.626.444 byte) | `Asset 3D/sketchfab/sweater_pack.glb` (`09D9829D756C…`) | MadeByYeshe, CC-BY | 7.424 tris • UV 1/1 • 3 tex/1 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) |
| `kaos-kami-web/public/models/cap.glb` (2.982.976 byte) | `Asset 3D/sketchfab/baseball_cap.glb` (`84640C2922C3…`) | Jarlan Perez, CC-BY 3.0 via poly.pizza | 93.200 tris FLAT (0 tex, UV 1/1) | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab); wajib decimate/LOD + material ulang SEBELUM produksi |
| `kaos-kami-web/public/models/fleece-alt.glb` (3.829.312 byte) | `Asset 3D/sketchfab/fleece_jacket.glb` (`714440165C9B…`) | Jonathan Millhauser, CC-BY, 6.4k | 6.392 tris (10 prim) • UV 10/10 • 3 tex/1 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) |
| `kaos-kami-web/public/models/hoodie-flat.glb` (298.048 byte) | `Asset 3D/sketchfab/hoodie.glb` vsese (`CC4C56B40D70…`) | vsese, CC-BY, 10.3k | 10.278 tris • UV 1/1 • 0 tex/1 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab); ⚠️ NAMA KEMBAR dengan `hoodie.glb` aktif (file BERBEDA) |
| `kaos-kami-web/public/models/tee-alt.glb` (4.841.264 byte) | `Asset 3D/sketchfab/tshirt.glb` aliabbas.827 (`67C0017D30C3…`) | aliabbas.827, CC-BY, 22k | 21.983 tris (2 prim) • UV 2/2 • 4 tex/2 mat | STAGED — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab); cadangan tee bila tee-basic gagal verifikasi |

- **Swap default (STATUS JUJUR 12 Sep sore)**: kandidat default baru = `tee-basic.glb`
  (pengganti `tshirt-heavyweight.glb`) + `hoodie-blue.glb` (pengganti `hoodie.glb`
  yang tanpa UV). SWAP BELUM DIPASANG DI KODE — verifikasi grep sore ini:
  `TshirtModel` masih `/models/tshirt-heavyweight.draco.glb`, `HoodieModel` +
  `useDeviceTier` masih `/models/hoodie.glb` (+LOD1). File lama tetap AKTIF sebagai
  fallback; JANGAN hapus. Pemasangan menunggu agen 3D (kompresi Draco + ukur cm +
  MODEL_PATH) + lisensi terverifikasi owner.
- **16 tak terpakai tetap di `Asset 3D/`, JANGAN copy ke `public/`**: `apron`,
  `beanie`, `bomber_jacket`, `bucket_hat`, `canvas_bag`, `denim_jacket`,
  `female_denim_short`, `jacket_varsity`, `male_cargo_pants`, `male_pants_jeans`,
  `polo_shirt`, `premium_eco_hoodie`, `scarf`, `soccer_jersey`, `t_shirt`,
  `wind_breaker_jacket` (termasuk `bomber` + `wind_breaker` yang tidak ikut batch
  salinan sore ini — arsip sementara, naik ke staged bila owner butuh jaket ke-2).
- **4 zip BlendSwap — butuh Blender** (rinci di §6, diulang tegas di sini):
  `Basic Hoodie.zip`, `Cloth library.zip`, `Set of clothes.zip`,
  `Shirt Template.zip` — berisi `.blend`, tris tak terukur tanpa Blender.
- Aturan M5 tetap berlaku: file ⚠️ tidak boleh dinyatakan lolos legal sampai ada
  URL + author + lisensi tertulis (tolak NC/ND/SA/Editorial).

## 8. Wiring lineup Fase 13 — 12 Sep 2026 (malam, agen 3D)

> Pemasangan swap yang ditunggu §7. File lama (tshirt-heavyweight, hoodie,
> hoodie.lod1) TETAP di `public/models/` sebagai fallback berlapis — JANGAN hapus.
> Status lisensi TIDAK BERUBAH: semua baris §5/§7 tetap ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).
> Kompresi Draco via `gltf-transform draco` (read-only terhadap master, output
> file `.draco.glb` baru; `validate` bersih, bbox identik):
>
> | File `.draco.glb` (baru) | Master | Hasil |
> | :--- | :--- | :--- |
> | `tee-basic.draco.glb` (1.075.100 byte) | `tee-basic.glb` (1.315.068) | −18% ✓ dipakai default |
> | `hoodie-blue.draco.glb` (2.557.044 byte) | `hoodie-blue.glb` (3.004.384) | −15% ✓ dipakai default |
> | `sweater.draco.glb` (2.377.420 byte) | `sweater.glb` (2.626.444) | −9,5% ✓ dipakai default |
> | `cap.draco.glb` (229.480 byte) | `cap.glb` (2.982.976) | −92% ✓ dipakai default |
>
> Default aktif: kaos→`tee-basic` (rantai draco→master→tshirt-heavyweight),
> hoodie→`hoodie-blue` (rantai draco→master→hoodie.glb/lod1; scale-up ×26 di
> komponen karena node FBX 0.01), crewneck→`sweater` BARU (`CrewneckModel`,
> fallback `HoodieModel`), topi→`cap` BARU (`CapModel`, fallback kaos).
> Kalibrasi terukur Fase 13 (`scaleCalibration.ts`): tshirt 78.4 (56/0.71464),
> hoodie 105.6 (via tinggi 74/0.7007 — lengan terentang, preseden jacket),
> crewneck 102.4 (via tinggi 72/0.70304 — bukan warisan hoodie.glb);
> surfaceZ tshirt/crewneck 0.151, hoodie 0.177, cap 0.091.
> `APPAREL_CATALOG` +cap (mockup ya/order tidak) +pants (terkunci, tanpa file);
> checkout menolak `!orderable` 400; PatternStudio topi nonaktif eksplisit.
> Cadangan `tee-alt`/`hoodie-flat`/`fleece-alt` tetap master-only (belum di-wire).

## 9. Manekin berjalan in-place — Quaternius (12 Sep 2026, wired ke studio)

| Asset Name | Target File Path | Provenance / Sourced From | License | Size | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Animated Base Character (manekin)** | `kaos-kami-web/public/models/mannequin.glb` (salinan bit-identik, SHA256 `7446B2D8…FCAA`) | Master: `Asset 3D/quaternius/Animated_Base_Character.glb` — [Quaternius — Animated Base Character Pack](https://quaternius.com/packs/animatedbasecharacter.html) oleh Quaternius | CC0 1.0 Universal (public domain — atribusi tetap dicantumkan di sini walau tidak wajib) | 2.266.136 byte (2.16MB) | Active (Mode MANEKIN studio) |

- Terukur: mesh `Mannequin` 13.7k tris (skinned), rig `DEF-*`, 45 klip `Rig|*`
  IN-PLACE (Idle max 0.1mm, Walk 0.9mm, Jog 2.3mm — tanpa kompensasi
  root-motion). Klip dipakai: `Rig|Idle_Loop`, `Rig|Walk_Loop`,
  `Rig|Jog_Fwd_Loop` (sebagai lari), bonus `Rig|Sprint_Loop`.
- Klip Mixamo di `kaos-kami-web/public/animations/` (`mixamo-idle/walking/
  running/rumba.glb`, rig `mixamorig`) BEDA RIG — cadangan saja, tidak
  dimainkan di manekin ini.

## 10. Model Sketchfab Wave 1 � TERVERIFIKASI CC-BY 4.0 (12 Sep 2026)

Verifikasi via API publik Sketchfab (`faceCount` cocok dengan file lokal +
blok lisensi `CC Attribution, commercial allowed`). Wajib atribusi (di bawah +
halaman `/kredit`).

| File lokal | Model + Author + URL | Lisensi |
| :--- | :--- | :--- |
| `Asset 3D/sketchfab/basic_t-shirt.glb` ? `public/models/tee-basic.glb` | "Basic T-Shirt" oleh MadeByYeshe � https://sketchfab.com/3d-models/basic-t-shirt-71bdf5940b5d41b8b46628a615e9b0ed | CC-BY 4.0 |
| `Asset 3D/sketchfab/tshirt.glb` ? `public/models/tee-alt.glb` | "tshirt" oleh aliabbas.827 � https://sketchfab.com/3d-models/tshirt-8c59588602724f1d96ee60d2b43e11b0 | CC-BY 4.0 |
| `Asset 3D/sketchfab/blue_hoodie.glb` ? `public/models/hoodie-blue.glb` | "Blue Hoodie" oleh Irevex11 � https://sketchfab.com/3d-models/blue-hoodie-7b78c56cd15e479b8ec9b18145ed0721 | CC-BY 4.0 |
| `Asset 3D/sketchfab/hoodie.glb` ? `public/models/hoodie-flat.glb` | "Hoodie" oleh vsese � https://sketchfab.com/3d-models/hoodie-5a59576dc695462786c7b48db45f3d97 | CC-BY 4.0 |
| `Asset 3D/sketchfab/sweater_pack.glb` ? `public/models/sweater.glb` | "Sweater Pack" oleh MadeByYeshe � https://sketchfab.com/3d-models/sweater-pack-50fc69ff7a9a4f91ad721b44e898772d | CC-BY 4.0 |
| `Asset 3D/sketchfab/fleece_jacket.glb` ? `public/models/fleece-alt.glb` | "Fleece Jacket" oleh Jonathan Millhauser � https://sketchfab.com/3d-models/fleece-jacket-26e7c5710ca5471d9f5f977dd1499ea0 | CC-BY 4.0 |
| `Asset 3D/sketchfab/baseball_cap.glb` ? `public/models/cap.glb` | "Baseball Cap" oleh Scott VanArsdale (@vanart) � https://sketchfab.com/3d-models/baseball-cap-1c1d34d73fd94e6b9e8f82b1eb7194a0 | CC-BY 4.0 |

## 11. Atribusi CC-BY 4.0 Wave-1 + manekin CC0 (12 Sep 2026, mirror halaman `/kredit`)

> Cermin teks dari `kaos-kami-web/src/app/kredit/page.tsx` (7 model CC-BY 4.0 + 1 manekin CC0).
> Status verifikasi tetap ikut S10 (API publik Sketchfab: faceCount cocok file lokal + blok lisensi
> CC Attribution, commercial allowed). Baris S5/S7 tetap arsip status verifikasi lama.
> Format tiap entri: "Judul" oleh Author (URL author), sumber URL model, lisensi + link,
> catatan perubahan (skala cm, Draco, material web).

1. "Basic T-Shirt" oleh MadeByYeshe (https://sketchfab.com/MadeByYeshe),
   sumber: https://sketchfab.com/3d-models/basic-t-shirt-71bdf5940b5d41b8b46628a615e9b0ed,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: skala cm via `scaleCalibration.ts` (tshirt 78.4, surfaceZ 0.151), kompresi Draco
   `tee-basic.draco.glb` (-18%, default aktif rantai draco > master > tshirt-heavyweight), material PBR ulang untuk web.
   File: `Asset 3D/sketchfab/basic_t-shirt.glb` > `public/models/tee-basic.glb`.
2. "tshirt" oleh aliabbas.827 (https://sketchfab.com/aliabbas.827),
   sumber: https://sketchfab.com/3d-models/tshirt-8c59588602724f1d96ee60d2b43e11b0,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: CADANGAN master-only (`public/models/tee-alt.glb`) - belum di-wire/Draco (lihat S8);
   bila naik produksi wajib skala cm + Draco + material web dulu.
3. "Blue Hoodie" oleh Irevex11 (https://sketchfab.com/irevex11),
   sumber: https://sketchfab.com/3d-models/blue-hoodie-7b78c56cd15e479b8ec9b18145ed0721,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: skala cm via `scaleCalibration.ts` (hoodie 105.6 via tinggi, surfaceZ 0.177,
   scale-up x26 di komponen karena node FBX 0.01), Draco `hoodie-blue.draco.glb` (-15%, default aktif),
   material PBR ulang untuk web. File: `Asset 3D/sketchfab/blue_hoodie.glb` > `public/models/hoodie-blue.glb`.
4. "Hoodie" oleh vsese (akun tertera `vsese`; URL akun yang dipakai halaman /kredit:
   https://sketchfab.com/veskee - ejaan beda satu huruf, owner konfirmasi bila perlu),
   sumber: https://sketchfab.com/3d-models/hoodie-5a59576dc695462786c7b48db45f3d97,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: CADANGAN master-only (`public/models/hoodie-flat.glb`) - belum di-wire/Draco;
   NAMA KEMBAR dengan `hoodie.glb` aktif (file BERBEDA).
5. "Sweater Pack" oleh MadeByYeshe (https://sketchfab.com/MadeByYeshe),
   sumber: https://sketchfab.com/3d-models/sweater-pack-50fc69ff7a9a4f91ad721b44e898772d,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: skala cm via `scaleCalibration.ts` (crewneck 102.4 via tinggi, surfaceZ 0.151),
   Draco `sweater.draco.glb` (-9,5%, default crewneck `CrewneckModel`), material PBR ulang untuk web.
   File: `Asset 3D/sketchfab/sweater_pack.glb` > `public/models/sweater.glb`.
6. "Fleece Jacket" oleh Jonathan Millhauser (https://sketchfab.com/jonathanmillhauser),
   sumber: https://sketchfab.com/3d-models/fleece-jacket-26e7c5710ca5471d9f5f977dd1499ea0,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: ARSIP cadangan master-only (`public/models/fleece-alt.glb`) - belum di-wire/Draco/material web.
7. "Baseball Cap" oleh Scott VanArsdale (@vanart) (https://sketchfab.com/vanart),
   sumber: https://sketchfab.com/3d-models/baseball-cap-1c1d34d73fd94e6b9e8f82b1eb7194a0,
   lisensi CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/, commercial allowed, wajib kredit).
   Perubahan: Draco `cap.draco.glb` (-92%, 2,98MB > 229KB, default `CapModel`), surfaceZ 0.091,
   skala cm + material ulang untuk web. File: `Asset 3D/sketchfab/baseball_cap.glb` > `public/models/cap.glb`.
8. "Animated Base Character (manekin)" oleh Quaternius (https://quaternius.com),
   sumber pack: https://quaternius.com/packs/animatedbasecharacter.html,
   lisensi CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/ - TANPA wajib atribusi,
   dicantumkan sukarela di sini + halaman /kredit). File: `Asset 3D/quaternius/Animated_Base_Character.glb`
   > `public/models/mannequin.glb` (rincian rig/klip in-place lihat S9).
