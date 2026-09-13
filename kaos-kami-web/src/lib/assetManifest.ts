/**
 * assetManifest.ts — SSOT inventaris aset 3D Kaos Kami (read-only, tanpa DB).
 *
 * Cakupan array: 15 file (4 AKTIF + 4 CADANGAN optimasi + 7 STAGED
 * salinan rename Wave-1) + 16 ARSIP Sketchfab + 4 zip BlendSwap yang tetap
 * di `Asset 3D/` (JANGAN copy ke public/ tanpa keputusan owner — hemat
 * bundle/R2). CATATAN 14 Sep 2026: disk `public/models/` kini 22 file
 * (+pants/shorts/mannequin + 4 varian Draco) — BELUM masuk array, naik-tabel
 * menunggu owner (lihat CATATAN KEADALUWARSAAN di bawah).
 *
 * Angka tris/byte/UV/tekstur 7 file STAGED: TERUKUR 12 Sep 2026 (sore) via
 * `gltf-transform inspect` (read-only) + SHA256 terbukti IDENTIK dengan master
 * di `Asset 3D/sketchfab/` (cukup 12 hex pertama, lihat note per file).
 * Klaim checklist Wave-1 (`Blueprint/ASSET-WAVE1-CHECKLIST.md`) ternyata cocok
 * dengan hasil ukur — dicatat sebagai pembanding, BUKAN sumber/bukti lisensi.
 * Pengecualian: 4 zip BlendSwap berisi `.blend` → tris TAK TERUKUR tanpa Blender
 * (`tris: null`, `trisSource: "unmeasured"`).
 *
 * LISENSI: 7 file STAGED = "✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab) (screenshot
 * badge + URL sumber)". Klaim author/CC di note HANYA menyalin checklist,
 * BUKAN lisensi terverifikasi. "SWAP DEFAULT BELUM dipasang" KEDALUWARSA
 * 13 Sep — Fase 13 sudah wire default draco (lihat CATATAN KEADALUWARSAAN
 * di bawah + `hooks/useDeviceTier.ts`); file lama tetap AKTIF sebagai
 * fallback (lihat ASSET_CREDITS §7).
 *
 * OWNER: untuk mengubah daftar, cukup ubah array di bawah — halaman
 * `/admin/assets` ikut otomatis (satu sumber kebenaran).
 */

// prettier-ignore
export type AssetStatus = "active" | "backup" | "staged" | "archive";
export type TrisSource = "measured" | "checklist" | "unmeasured";

export interface AssetEntry {
  /** Nama file saja, mis. "basic_t-shirt.glb". */
  file: string;
  /** Lokasi repo relatif, mis. "kaos-kami-web/public/models/". */
  location: string;
  /** Jenis: "glb" | "glb-draco" | "glb-lod" | "zip-blend". */
  kind: "glb" | "glb-draco" | "glb-lod" | "zip-blend";
  /** Ukuran file terukur (byte). */
  bytes: number;
  /** Jumlah segitiga terukur (parse JSON GLB), null bila tak terukur. */
  tris: number | null;
  trisSource: TrisSource;
  /** "ada (3/3 prim)" / "tidak (0/42 prim)" / "tak terukur (butuh Blender)". */
  uv: string;
  /** "3 img / 3 tex / 1 mat" — ringkasan terukur dari JSON GLB. */
  textures: string;
  status: AssetStatus;
  /** Catatan forensik singkat (sumber klaim selalu disebut eksplisit). */
  note: string;
}

/** 4 model produksi yang dipakai mockup studio (lihat useDeviceTier.ts). */
export const ACTIVE_FILES: AssetEntry[] = [
  {
    file: "tshirt-heavyweight.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 1048108,
    tris: 19517,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "2 img / 2 tex / 1 mat",
    status: "active",
    note:
      "TERUKUR. Bit-identik Starklord shirt_baked.glb (SHA256 4C020995…CC3725) → MIT, bukan CC-BY (ASSET_CREDITS §4). Node T_Shirt_male.",
  },
  {
    file: "longsleeve.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 1204412,
    tris: 20861,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "2 img / 2 tex / 1 mat",
    status: "active",
    note:
      "TERUKUR. Jejak node/material/tekstur identik file Starklord/MIT — klaim CC-BY meragukan, ⚠️ VERIFIKASI (ASSET_CREDITS §4).",
  },
  {
    file: "hoodie.glb",
    location: "backups/models-archive/",
    kind: "glb-draco",
    bytes: 402272,
    tris: 134214,
    trisSource: "measured",
    uv: "TIDAK ADA (0/42 prim)",
    textures: "0 img / 0 tex / 4 mat",
    status: "archive",
    note:
      "DIPENSIUNKAN 13 Sep 2026. 134k tris/42 prim TANPA UV & tanpa lisensi terverifikasi — dipindahkan ke backups/models-archive/. Digantikan penuh oleh hoodie-blue (CC-BY 4.0 Irevex11).",
  },
  {
    file: "jacket.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb-draco",
    bytes: 27956,
    tris: 6392,
    trisSource: "measured",
    uv: "TIDAK ADA (0/10 prim)",
    textures: "0 img / 0 tex / 1 mat",
    status: "active",
    note:
      "TERUKUR. Konversi Collada/OSG (root OSG_Scene, 10 sub-mesh), tanpa UV/tekstur. Lisensi ⚠️ VERIFIKASI. Ukuran aktual ±28KB (klaim lama 5.2MB dikoreksi M0.3).",
  },
];

/** Varian optimasi model AKTIF (fallback tier-low / hemat bandwidth). */
export const BACKUP_FILES: AssetEntry[] = [
  {
    file: "tshirt-heavyweight.draco.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb-draco",
    bytes: 669808,
    tris: 19517,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "2 img / 2 tex / 1 mat",
    status: "backup",
    note: "TERUKUR. Varian Draco tee aktif (−36% byte, tris identik). Dipakai TshirtModel sebagai MODEL_PATH.",
  },
  {
    file: "longsleeve.draco.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb-draco",
    bytes: 672816,
    tris: 20861,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "2 img / 2 tex / 1 mat",
    status: "backup",
    note: "TERUKUR. Varian Draco longsleeve aktif (−44% byte, tris identik). Dipakai LongsleeveModel.",
  },
  {
    file: "hoodie.lod1.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb-lod",
    bytes: 208720,
    tris: 47779,
    trisSource: "measured",
    uv: "TIDAK ADA (0/42 prim)",
    textures: "0 img / 0 tex / 4 mat",
    status: "backup",
    note: "TERUKUR. LOD1 hoodie aktif untuk tier-low (−48% byte, 134k→48k tris). Tanpa UV sama seperti master.",
  },
  {
    file: "jacket.lod1.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb-lod",
    bytes: 19504,
    tris: 2979,
    trisSource: "measured",
    uv: "TIDAK ADA (0/10 prim)",
    textures: "0 img / 0 tex / 1 mat",
    status: "backup",
    note: "TERUKUR. LOD1 jacket aktif untuk tier-low (6,4k→3k tris). Tanpa UV sama seperti master.",
  },
];

/**
 * 7 file STAGED Wave-1 — salinan rename di `kaos-kami-web/public/models/`,
 * SHA256 IDENTIK dengan master di `Asset 3D/sketchfab/` (bukan olahan ulang).
 * TERUKUR via `gltf-transform inspect` (read-only, 12 Sep 2026 sore):
 * glPrimitives = tris; TEXCOORD_0 = UV; tabel TEXTURES = tekstur.
 * Lisensi SEMUA = ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab). Klaim author/CC di note HANYA
 * menyalin `Blueprint/ASSET-WAVE1-CHECKLIST.md` (bukan bukti).
 * Swap default (tee-basic/hoodie-blue) BELUM dipasang di kode — file lama
 * tetap aktif sebagai fallback sampai agen 3D (Draco + ukur cm + MODEL_PATH)
 * + verifikasi lisensi owner selesai.
 */
export const STAGED_FILES: AssetEntry[] = [
  {
    file: "tee-basic.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 1315068,
    tris: 7202,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "3 img / 3 tex / 1 mat",
    status: "staged",
    note:
      "TERUKUR via inspect (glPrimitives 7.202 = klaim checklist 7,2k). Salinan identik Asset 3D/sketchfab/basic_t-shirt.glb (SHA256 BA69F75A0C1D…). Klaim checklist: MadeByYeshe, CC-BY — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab). Kandidat default tee baru; tshirt-heavyweight lama tetap AKTIF/fallback.",
  },
  {
    file: "hoodie-blue.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 3004384,
    tris: 13802,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "3 img / 3 tex / 1 mat",
    status: "staged",
    note:
      "TERUKUR via inspect (glPrimitives 13.802 = klaim 13,8k). Salinan identik Asset 3D/sketchfab/blue_hoodie.glb (SHA256 17400DD160C8…). Klaim checklist: Irevex11, CC-BY — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab). Alternatif hoodie BER-UV (vs hoodie aktif tanpa UV); kandidat default hoodie baru; hoodie.glb lama tetap AKTIF/fallback.",
  },
  {
    file: "sweater.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 2626444,
    tris: 7424,
    trisSource: "measured",
    uv: "ada (1/1 prim)",
    textures: "3 img / 3 tex / 1 mat",
    status: "staged",
    note:
      "TERUKUR via inspect (glPrimitives 7.424 ≈ klaim 7,4k crewneck). Salinan identik Asset 3D/sketchfab/sweater_pack.glb (SHA256 09D9829D756C…). Klaim checklist: MadeByYeshe, CC-BY — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
  {
    file: "cap.glb",
    location: "kaos-kami-web/public/models/",
    kind: "glb",
    bytes: 2982976,
    tris: 93200,
    trisSource: "measured",
    uv: "ada (1/1 prim, tanpa tekstur)",
    textures: "0 img / 0 tex / 1 mat (FLAT)",
    status: "staged",
    note:
      "TERUKUR via inspect (glPrimitives 93.200, material Scene_-_Root tanpa tekstur). Salinan identik Asset 3D/sketchfab/baseball_cap.glb (SHA256 84640C2922C3…). Klaim checklist: Jarlan Perez, CC-BY 3.0 via poly.pizza — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab). BERAT: wajib decimate/LOD + material ulang SEBELUM dipakai produksi.",
  },
  {
    file: "fleece-alt.glb",
    location: "backups/models-archive/",
    kind: "glb",
    bytes: 3829312,
    tris: 6392,
    trisSource: "measured",
    uv: "ada (10/10 prim)",
    textures: "3 img / 3 tex / 1 mat",
    status: "archive",
    note:
      "DIARSIPKAN ke backups/models-archive/. TERUKUR via inspect (10 prim TRIANGLES total 6.392 = klaim 6,4k; material tex_jacket ×10). Salinan identik Asset 3D/sketchfab/fleece_jacket.glb (SHA256 714440165C9B…). Klaim checklist: Jonathan Millhauser, CC-BY — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
  {
    file: "hoodie-flat.glb",
    location: "backups/models-archive/",
    kind: "glb",
    bytes: 298048,
    tris: 10278,
    trisSource: "measured",
    uv: "ada (1/1 prim, tanpa tekstur)",
    textures: "0 img / 0 tex / 1 mat",
    status: "archive",
    note:
      "DIARSIPKAN ke backups/models-archive/. TERUKUR via inspect (glPrimitives 10.278 = klaim 10,3k; material FABRIC_1_FRONT_2578 tanpa tekstur). Salinan identik Asset 3D/sketchfab/hoodie.glb vsese (SHA256 CC4C56B40D70…). Klaim checklist: vsese, CC-BY — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
  {
    file: "tee-alt.glb",
    location: "backups/models-archive/",
    kind: "glb",
    bytes: 4841264,
    tris: 21983,
    trisSource: "measured",
    uv: "ada (2/2 prim)",
    textures: "4 img / 4 tex / 2 mat",
    status: "archive",
    note:
      "DIARSIPKAN ke backups/models-archive/. TERUKUR via inspect (18.617 + 3.366 = 21.983; material Polo_Shirt + Button). Salinan identik Asset 3D/sketchfab/tshirt.glb (SHA256 67C0017D30C3…). Klaim checklist: aliabbas.827, CC-BY 22k — ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
];

/**
 * 16 file ARSIP — tetap di `Asset 3D/sketchfab/`, JANGAN copy ke `public/`
 * (hemat bundle/R2). Alasan arsip per file dicatat jujur dari hasil ukur.
 * Riwayat: `hoodie.glb` (vsese) + `tshirt.glb` (aliabbas) keluar dari arsip
 * 12 Sep 2026 sore karena kini punya salinan identik di public/ (hoodie-flat,
 * tee-alt — lihat STAGED_FILES); `bomber_jacket` + `wind_breaker_jacket` masuk
 * arsip sementara karena TIDAK ikut disalin ke public/ pada batch yang sama.
 */
export const ARCHIVED_FILES: AssetEntry[] = [
  {
    file: "polo_shirt.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 24932860, tris: 829168, trisSource: "measured",
    uv: "ada (8/8 prim)", textures: "1 img / 1 tex / 1 mat", status: "archive",
    note: "ARSIP: 829k tris / 24,9MB — butuh retopo berat (Wave 2). Checklist sudah menandai ⚠️ cek tri/UV.",
  },
  {
    file: "t_shirt.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 6786916, tris: 237938, trisSource: "measured",
    uv: "ada (10/10 prim)", textures: "0 img / 0 tex / 2 mat", status: "archive",
    note: "ARSIP: 238k tris / 6,8MB TANPA tekstur (funlab117) — optimasi + material ulang dulu (Wave 2).",
  },
  {
    file: "male_pants_jeans.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 7217068, tris: 70943, trisSource: "measured",
    uv: "ada (2/2 prim)", textures: "3 img / 3 tex / 2 mat", status: "archive",
    note: "ARSIP: 71k tris / 7,2MB (klaim checklist 10k TIDAK COCOK hasil ukur) — decimate dulu.",
  },
  {
    file: "beanie.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 3842072, tris: 38844, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP: 38,8k tris (oluwaphemi) — non-prioritas Wave-1 + agak berat; checklist menandai ⚠️.",
  },
  {
    file: "premium_eco_hoodie.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 964808, tris: 31413, trisSource: "measured",
    uv: "ada (15/15 prim)", textures: "1 img / 1 tex / 4 mat", status: "archive",
    note: "ARSIP: 31,4k tris = klaim 31k (lekuns) — cadangan hoodie bila blue_hoodie gagal verifikasi.",
  },
  {
    file: "soccer_jersey.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 1819876, tris: 25329, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "1 img / 1 tex / 1 mat", status: "archive",
    note: "ARSIP: 25,3k tris = klaim 25k (Guitomic) — butuh repaint polos dulu; niche jersey.",
  },
  {
    file: "bomber_jacket.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 2891048, tris: 5836, trisSource: "measured",
    uv: "ada (5/5 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP SEMENTARA 12 Sep 2026 sore: 5.836 tris = klaim 5,8k (DeJuan_Owens, klaim CC-BY) — ringan + full-UV, TAPI tidak ikut disalin ke public/ pada batch ini. Naik ke staged bila owner butuh jaket ke-2. ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
  {
    file: "wind_breaker_jacket.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 2546820, tris: 8380, trisSource: "measured",
    uv: "ada (3/3 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP SEMENTARA 12 Sep 2026 sore: 8.380 tris = klaim 8,4k (Anti-Impack, klaim CC-BY) — TAPI tidak ikut disalin ke public/ pada batch ini. Naik ke staged bila owner butuh jaket ke-2. ✅ TERVERIFIKASI CC-BY 4.0 (12 Sep 2026, API Sketchfab).",
  },
  {
    file: "canvas_bag.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 10636696, tris: 16525, trisSource: "measured",
    uv: "ada (66/66 prim)", textures: "33 img / 33 tex / 11 mat", status: "archive",
    note: "ARSIP: 10,6MB / 66 mesh / 33 tekstur (RatATatKat) — butuh gabung material dulu (checklist).",
  },
  {
    file: "denim_jacket.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 3133848, tris: 11352, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP: 11,4k tris = klaim 11,3k (cp04) — jaket ke-4, kalah prioritas dari 3 jaket staged.",
  },
  {
    file: "female_denim_short.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 2913096, tris: 13782, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "2 img / 2 tex / 1 mat", status: "archive",
    note: "ARSIP: 13,8k tris (Zulfiqar Hussain) — butuh varian male (checklist); niche shorts.",
  },
  {
    file: "male_cargo_pants.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 3703852, tris: 10016, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "4 img / 4 tex / 1 mat", status: "archive",
    note: "ARSIP: 10k tris (Alexander Kurmanin) — niche celana; celana bukan fokus DTF Wave-1.",
  },
  {
    file: "scarf.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 356164, tris: 12326, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "0 img / 0 tex / 1 mat", status: "archive",
    note: "ARSIP: 12,3k tris (neutralize), tanpa tekstur — niche syal, bukan fokus DTF Wave-1.",
  },
  {
    file: "bucket_hat.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 3263992, tris: 7298, trisSource: "measured",
    uv: "ada (4/4 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP: 7,3k tris = klaim ±7,3k (landout) — cadangan topi bila baseball_cap gagal decimate (hapus bendera Czech).",
  },
  {
    file: "apron.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 2869616, tris: 6336, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP: 6,3k tris (Alexander Kurmanin) — pasar kafe, di luar Wave-1.",
  },
  {
    file: "jacket_varsity.glb", location: "Asset 3D/sketchfab/", kind: "glb",
    bytes: 2796556, tris: 2576, trisSource: "measured",
    uv: "ada (1/1 prim)", textures: "3 img / 3 tex / 1 mat", status: "archive",
    note: "ARSIP: 2,6k tris = klaim 2,5k (ValentynPetrov) — paling ringan, cadangan varsity bila slot jaket bertambah.",
  },
];

/**
 * 4 zip BlendSwap — berisi `.blend`, BUKAN `.glb`: tris TAK TERUKUR tanpa Blender.
 * Lisensi di bawah TERUKUR dari file `LICENSE.html` di dalam tiap zip
 * (bukan karangan — dikutip apa adanya), TETAP butuh Blender untuk ekstrak + ekspor.
 */
export const BLENDSWAP_FILES: AssetEntry[] = [
  {
    file: "Basic Hoodie.zip", location: "Asset 3D/blendswap/", kind: "zip-blend",
    bytes: 3566882, tris: null, trisSource: "unmeasured",
    uv: "tak terukur (butuh Blender)", textures: "blend 4,9MB + LICENSE.html", status: "archive",
    note: "Butuh Blender. LICENSE.html bawaan: CC0 1.0 (blend #91633, Blender 2.79, 2018-04-29) — cocok klaim checklist (acstrider, CC0).",
  },
  {
    file: "Cloth library.zip", location: "Asset 3D/blendswap/", kind: "zip-blend",
    bytes: 32856694, tris: null, trisSource: "unmeasured",
    uv: "tak terukur (butuh Blender)", textures: "blend 39MB + LICENSE.html", status: "archive",
    note: "Butuh Blender. LICENSE.html bawaan: CC0 1.0 (blend #87574, Blender 2.78, 2017-02-18) — cocok klaim checklist (hotzst, CC0). Ekstrak shirt-nya saja.",
  },
  {
    file: "Set of clothes.zip", location: "Asset 3D/blendswap/", kind: "zip-blend",
    bytes: 3032692, tris: null, trisSource: "unmeasured",
    uv: "tak terukur (butuh Blender)", textures: "blend 8,5MB + LICENSE.html", status: "archive",
    note: "Butuh Blender. LICENSE.html bawaan: CC-BY 3.0 (blend #92133, atribusi wajib) — cocok klaim checklist (Mironov, CC-BY). Ada UV per checklist.",
  },
  {
    file: "Shirt Template.zip", location: "Asset 3D/blendswap/", kind: "zip-blend",
    bytes: 269143, tris: null, trisSource: "unmeasured",
    uv: "tak terukur (butuh Blender)", textures: "blend 1MB + license.html + preview", status: "archive",
    note: "Butuh Blender. License.html bawaan: CC0 oleh jesterelly (blend #77218) — turunan topologi 'blouson' zuendholz; UV seams pola kasual.",
  },
];

/** Gabungan untuk tabel admin: AKTIF + CADANGAN + STAGED (dinamis mengikuti array). */
export const INVENTORY: AssetEntry[] = [...ACTIVE_FILES, ...BACKUP_FILES, ...STAGED_FILES];

export const STATUS_LABEL: Record<AssetStatus, string> = {
  active: "AKTIF (mockup)",
  backup: "CADANGAN (optimasi)",
  staged: "STAGED (Wave-1)",
  archive: "ARSIP (Asset 3D/)",
};

export function formatBytes(b: number): string {
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

export function formatTris(t: number | null): string {
  if (t == null) return "—";
  if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
  return `${t}`;
}

/**
 * CATATAN KEADALUWARSAAN (13 Sep 2026 — komentar saja; array di atas TAK DIUBAH,
 * tak ada rename file GLB, tak ada ubah rantai default):
 * 1. Header "15 file (4 AKTIF + 4 CADANGAN + 7 STAGED)" KEDALUWARSA — `public/models/`
 *    kini 22 file: + `pants.glb`, `shorts.glb`, `mannequin.glb` dan 4 varian Draco
 *    staged (`tee-basic.draco.glb`, `hoodie-blue.draco.glb`, `sweater.draco.glb`,
 *    `cap.draco.glb`). Semuanya BELUM masuk array — naik-tabel butuh keputusan owner.
 * 2. "SWAP DEFAULT BELUM dipasang" KEDALUWARSA — Fase 13 sudah wire default draco
 *    (lihat ASSET_CREDITS §8 + rantai di `hooks/useDeviceTier.ts`).
 * 3. `pants.glb`/`shorts.glb` (madjin, klaim MIT checklist:57) terukur ringan
 *    (1.536 / 1.078 tris, UV 1/1) — naik-tabel + Draco/LOD menunggu URL repo persis owner.
 */
