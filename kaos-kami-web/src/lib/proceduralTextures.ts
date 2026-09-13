"use client";
import * as THREE from "three";

/**
 * Micro-weave normal map generated at runtime on an HTML5 canvas.
 * Removes all dependency on external fabric-normal.jpg files.
 *
 * M-fabric (maksimalkan RASA kain, warna tak disentuh):
 * - Anyaman diperkuat: siklus 12→14/tile, amplitudo 10→13, rib-knit 3→4,
 *   repeat 9→10. Hitungan fisis: 14 siklus × repeat 10 = 140 loop selebar
 *   dada ±50cm ≈ 3.5mm/loop — mendekati loop rajut combed 24s/28s asli
 *   (±2–3mm). Nilai lama 12×9 = 108 loop (≈4.6mm/loop) terlalu jarang
 *   sehingga dada terbaca papan plastik mulus di jarak mockup.
 * - BATAS AMAN MOIRE (jangan lewati): repeat ≤12 dan WEAVE_CYCLES ≤16.
 *   Pada repeat 12 → 168 loop pada garmen ±600px layar ≈ 3.5px/loop, masih
 *   di atas Nyquist DPR 1 (2px) berkat mipmap — tapi sudah mepet. Repeat 16
 *   (nilai pra-M2.7) TERBUKTI shimmer → jangan kembali ke sana.
 *   CARA TURUNKAN BILA SHIMMER DI HP DPR 1 (berurutan, satu per satu, uji
 *   tiap langkah di zoom 50%/100%/200% + putar miring): 1) repeat 10→9,
 *   2) normalScale di clothPhysicalMaterial −0.05, 3) baru WEAVE_AMP 13→10.
 *   JANGAN matikan generateMipmaps/anisotropy — itu anti-shimmer utama.
 * - Box-UV ternormalisasi sisi-terpanjang (lihat geometryPrep) sehingga
 *   repeat ini ≈ world-scale (rapat serat konsisten antar apparel).
 * - Lipatan TANPA sculpt: undulasi frekuensi-rendah per-arketipe
 *   (FOLD_SPECS) ditumpuk di atas anyaman mikro agar dada tak papan licin.
 *   Kompromi jujur: lipatan ikut repeat weave (bukan tiling 1× seperti bake
 *   M1 asli) — sculpt/bake wrinkle beneran tetap sisa Blender (M1).
 *   Fisis tiap profil: jersey kaos tipis = drape lemas → lipatan HALUS RAPAT
 *   (frekuensi tinggi, amplitudo kecil); fleece hoodie tebal = lipatan BESAR
 *   LEMBUT jarang (frekuensi rendah, amplitudo besar, tanpa sharpen);
 *   kanvas jaket kaku = lipatan TEGAS JARANG (frekuensi paling rendah +
 *   sharpen 0.7 → puncak gelombang lebih runcing seperti tekukan kaku).
 * - M2.2 MURAH: rib-knit vertikal halus (±4) dibake di sini sebagai "bump
 *   piping" global — rib kerah/cuff/hem SPESIFIK lokasi butuh remodel
 *   (sisa). Frekuensi rib SENGAJA dikunci 96/tile @512px (≈5.3px/garis):
 *   di atas ini garis menyatu jadi moire di DPR 1.
 * - UJI MANUAL (tak bisa uji visual di run ini): buka studio di HP DPR 1,
 *   zoom 100%→200%→50% + putar miring (grazing angle); lolos bila tak ada
 *   shimmer/riak berjalan dan serat terbaca di zoom 100%. REVERT TOTAL:
 *   kembalikan WEAVE_CYCLES=12, WEAVE_AMP=10, RIB_AMP=3, WEAVE_REPEAT=9,
 *   FOLD pakai profil tshirt untuk semua (nilai pra-misi ini).
 */
// Kekuatan anyaman — naikkan/turunkan HANYA blok ini (batas aman di atas).
const WEAVE_CYCLES = 14; // 12→14: rapat loop 108→140/dada; JANGAN >16 (aliasing bake <32px/gelombang)
const WEAVE_AMP = 13; // 10→13: kemiringan semu ±13/255 ≈ ±2.9° — terbaca di grazing; JANGAN >18 (emboss plastik)
const RIB_CYCLES = 96; // DIKUNCI (lihat atas) — jangan ubah tanpa uji DPR 1
const RIB_AMP = 4; // 3→4: rib pecah highlight tanpa jadi garis zebra; JANGAN >5 (garis moire)
const WEAVE_REPEAT = 10; // 9→10: masih aman (batas 12); turunkan ke 9→7 bila shimmer

export type WeaveFoldProfile = "tshirt" | "hoodie" | "jacket";

interface FoldSpec {
  freq: number; // periode lipatan per tile peta
  amp: number; // kedalaman semu lipatan (satuan normal 0–255)
  sharpen: number; // 0 = sinus lembut, 1 = runcingkan puncak (kanvas kaku)
}

// Fisis: kaos lemas-halus-rapat, hoodie tebal-besar-lembut, jaket kaku-tegas-jarang.
// Uji per profil: bandingkan zoom 100% + putar miring antar apparel — kaos harus
// terlihat paling halus, hoodie paling berbulu-dalam, jaket paling tegas.
// Revert: samakan semua ke { freq: 2, amp: 14, sharpen: 0 } (nilai tunggal pra-misi).
const FOLD_SPECS: Record<WeaveFoldProfile, FoldSpec> = {
  tshirt: { freq: 3.0, amp: 10, sharpen: 0 }, // jersey tipis: banyak lipatan kecil lemas
  hoodie: { freq: 1.5, amp: 18, sharpen: 0 }, // fleece 380GSM: gelombang besar lembut jarang
  jacket: { freq: 1.0, amp: 20, sharpen: 1 }, // kanvas/ripstop kaku: tekukan tegas jarang
};

function shapeFold(s: number, sharpen: number): number {
  // sharpen=1: |s|^0.7 meruncingkan puncak sinus → mendekati segitiga seperti
  // tekukan kain kaku (bukan melengkung lembut). Pangkat <1 (bukan >1) karena
  // yang diruncingkan PUNCAK, bukan dilebarkan lembah. Revert: return s polos.
  if (!sharpen) return s;
  return Math.sign(s) * Math.pow(Math.abs(s), 0.7);
}

export function createFabricNormalMap(profile: WeaveFoldProfile = "tshirt"): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base tangent-space normal color [128, 128, 255]
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // Anyaman katun combed 24s/28s (sine-based, anti-aliased): amplitudo 13
  // ≈ ±2.9° kemiringan semu — cukup menggoyang highlight di grazing angle
  // tanpa terlihat karung goni. 14 siklus/tile × repeat 10 ≈ 140 loop
  // selebar garmen — dekat ke loop rajut fisik (±2–3mm).
  const spec = FOLD_SPECS[profile] ?? FOLD_SPECS.tshirt;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      // Anyaman twill diagonal halus (gradien lembut, tanpa frekuensi kasar)
      const u = (x / 512) * Math.PI * 2 * WEAVE_CYCLES;
      const v = (y / 512) * Math.PI * 2 * WEAVE_CYCLES;
      let waveX = Math.sin(u) * Math.cos(v) * WEAVE_AMP;
      let waveY = Math.cos(u) * Math.sin(v) * WEAVE_AMP;
      // M2.2 murah: rib-knit vertikal halus (stripes frekuensi tinggi,
      // amplitudo kecil ±4 — terbaca sebagai serat rajut, bukan garis).
      const rib = Math.sin((x / 512) * Math.PI * 2 * RIB_CYCLES) * RIB_AMP;
      waveX += rib;
      // Lipatan skala-besar per-arketipe (lihat FOLD_SPECS): dua diagonal
      // berfase beda agar tak terlihat pola salib buatan. Setara strength
      // wrinkle-bake 0.5–0.8 pada jarak mockup (tshirt) hingga ~1.0 (jacket).
      const foldPhase = ((x + y) / 512) * Math.PI * 2 * spec.freq;
      waveX += shapeFold(Math.sin(foldPhase), spec.sharpen) * spec.amp;
      waveY += shapeFold(Math.cos(foldPhase * 0.9 + 0.7), spec.sharpen) * spec.amp;

      data[idx] = Math.max(0, Math.min(255, Math.floor(128 + waveX)));     // R (X normal)
      data[idx + 1] = Math.max(0, Math.min(255, Math.floor(128 + waveY))); // G (Y normal)
      data[idx + 2] = 255;                                                  // B (Z normal)
      data[idx + 3] = 255;                                                  // Alpha
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(WEAVE_REPEAT, WEAVE_REPEAT); // 9→10 (batas aman 12, lihat atas)
  texture.generateMipmaps = true; // WAJIB true: mipmap = anti-shimmer utama
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // M2.8: data-map (normal) WAJIB linear eksplisit — jangan sampai SRGB.
  texture.colorSpace = THREE.NoColorSpace;
  // Anisotropy 8 (dulu 4): anyaman tetap tajam di sudut grazing/miring saat
  // user memutar model — di situlah rasa kain paling diuji. Biaya sampler
  // naik tipis, masih aman untuk HP mid (bukan 16 seperti decal).
  // REVERT/UJI: bila HP kentang (DPR 1 + Mali lama) shimmer atau drop FPS,
  // kembalikan ke 4 — mipmap tetap menahan moire, hanya grazing lebih blur.
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// PERF #7: SATU profil normal aktif per sesi (dipilih ini, BUKAN singleton
// DPR-rendah — alasan: lipatan per bahan tshirt/hoodie/jacket sudah di-tune
// M-fabric; singleton tshirt-only hemat sama tapi hilangkan karakter fleece
// 380GSM & kanvas kaku = risiko visual lebih besar). Satu slot = 1 upload
// 512² ≈1MB vs 3× ≈3MB (−2MB VRAM, −2 sampler); ganti apparel = dispose lama
// (GL dibebaskan; bila masih direferensi three re-upload otomatis — aman).
// SYARAT: garment + decal WAJIB profil SAMA (decal pakai profil apparel aktif,
// bukan tshirt tetap) agar slot tak thrash. Lazy agar aman diimpor mana pun.
let activeNormalProfile: WeaveFoldProfile | null = null;
let activeNormalTex: THREE.CanvasTexture | null = null;
export function getFabricNormalMapForArchetype(archetype: string): THREE.CanvasTexture {
  // longsleeve = jersey tipis seperti kaos; shirt = jaket kanvas (cermin
  // pemetaan apparelToArchetype mobile + switch archetype clothPhysicalMaterial).
  const profile: WeaveFoldProfile =
    archetype === "hoodie" ? "hoodie" : archetype === "jacket" || archetype === "shirt" ? "jacket" : "tshirt";
  if (activeNormalTex && activeNormalProfile === profile) return activeNormalTex;
  if (typeof window === "undefined") return createFabricNormalMap(profile);
  if (activeNormalTex && activeNormalProfile !== null && activeNormalProfile !== profile) {
    try {
      activeNormalTex.dispose();
    } catch {}
    activeNormalTex = null;
  }
  activeNormalTex = createFabricNormalMap(profile);
  activeNormalProfile = profile;
  return activeNormalTex;
}

// Alias lama — dipertahankan agar impor lama tak pecah; kini lewat slot tunggal
// (bukan cache tshirt abadi). Pemanggil baru WAJIB getFabricNormalMapForArchetype
// (activeApparel) agar share slot dengan garment.
export function getSharedFabricNormalMap(): THREE.CanvasTexture {
  return getFabricNormalMapForArchetype("tshirt");
}

/**
 * M-fabric: noise roughnessMap — butir acak ±22 + belang skala-cm ±8 di
 * sekitar mean (total sebaran efektif ±0.09–0.12, dulu hanya ±0.06).
 * Fisis: serat katun acak memecah highlight menjadi pasir halus (bukan
 * cermin plastik mulus), dan serapan celup tak pernah rata → belang lembut
 * skala cm. MEAN SENGAJA TETAP ~235/255 (≈0.92): factory membagi roughness
 * target dengan 0.92 sehingga nilai TENGAH efektif tetap = target (mis.
 * 0.90 → 0.978 × 0.92 ≈ 0.90) — kompensasi ROUGH_MAP_MEAN TAK PERLU diubah.
 * Dipakai juga sebagai bumpMap (bumpScale per-arketipe di factory — hoodie
 * 1.5× agar butir yang SAMA terbaca lebih kasar seperti fleece) — satu
 * tekstur, dua peran. M2.8: linear eksplisit (NoColorSpace).
 * BATAS: noise >±30 mulai terlihat bintik kotor (dirty speckle), blotch
 * >±12 mulai belang murahan. REVERT: NOISE_AMP 22→15 dan BLOTCH_AMP 8→0.
 * UJI: zoom 100% di area highlight miring — highlight harus berpasir halus
 * memecah alami, bukan bercak terang/gelap. Kain HITAM: peta ini hanya
 * mengacak KEKASARAN (bukan warna) + sheenColor gelap di factory, jadi hitam
 * tak tercuci — bila hitam keabu-abu, yang salah sheen/envMap, bukan peta ini.
 */
const ROUGH_MEAN = 235; // DIKUNCI ≈0.92 (lihat atas) — ubah = recalibrate factory
const NOISE_AMP = 22; // 15→22: highlight pecah alami; JANGAN >30 (bintik kotor)
const BLOTCH_AMP = 8; // baru: belang celup skala-cm; JANGAN >12 (belang murahan)
const ROUGH_REPEAT = 10; // 9→10: sejajar weave baru agar butir sejajar serat
export function createFabricRoughnessMap(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const imgData = ctx.createImageData(S, S);
  const data = imgData.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Butir acak (serat) + gelombang diagonal lembut skala-cm (belang
      // celup 3×2/tile ≈ tiap ±8–12cm dunia nyata) agar tak terlihat seperti
      // pasir digital murni. Mean gabungan tetap ≈ROUGH_MEAN (blotch sinus
      // mean-nol) → kompensasi factory tidak berubah.
      const n = (Math.random() * 2 - 1) * NOISE_AMP;
      const blotch =
        Math.sin(((x + y) / S) * Math.PI * 2 * 3) *
        Math.cos(((x - y) / S) * Math.PI * 2 * 2) *
        BLOTCH_AMP;
      const v = Math.max(200, Math.min(255, Math.floor(ROUGH_MEAN + n + blotch)));
      const idx = (y * S + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROUGH_REPEAT, ROUGH_REPEAT); // sama dengan weave agar butir sejajar serat
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace; // M2.8: data-map linear
  texture.needsUpdate = true;
  return texture;
}

let sharedRoughnessMap: THREE.CanvasTexture | null = null;
export function getSharedFabricRoughnessMap(): THREE.CanvasTexture {
  if (!sharedRoughnessMap && typeof window !== "undefined") {
    sharedRoughnessMap = createFabricRoughnessMap();
  }
  return sharedRoughnessMap as THREE.CanvasTexture;
}

/**
 * Default high-impact wordmark decal generated at runtime.
 * Removes all dependency on external default-artwork.png files.
 */
export function createWordmarkDecal(
  label = "KAOS KAMI",
  subtitle = "HEAVYWEIGHT · 240GSM"
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 512);

  // Minimalist box background
  ctx.fillStyle = "rgba(18, 18, 20, 0.4)";
  ctx.fillRect(40, 160, 432, 192);

  // Subtle border hairline
  ctx.strokeStyle = "rgba(230, 81, 0, 0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 160, 432, 192);

  // Primary bold wordmark (letterSpacing tak didukung Safari — deteksi fitur,
  // fallback spasi manual agar tampilan konsisten, audit #24).
  const spaced = (text: string) =>
    "letterSpacing" in ctx ? text : text.split("").join("\u2009");
  ctx.fillStyle = "#F5F3EF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 52px 'Arial Black', 'Helvetica Neue', sans-serif";
  try {
    (ctx as any).letterSpacing = "2px";
  } catch {}
  ctx.fillText(spaced(label.toUpperCase()), 256, 235);

  // Signal Tangerine subline
  ctx.font = "700 15px 'Courier New', monospace";
  ctx.fillStyle = "#E65100";
  try {
    (ctx as any).letterSpacing = "4px";
  } catch {}
  ctx.fillText(spaced(subtitle.toUpperCase()), 256, 295);
  try {
    (ctx as any).letterSpacing = "0px";
  } catch {}

  const texture = new THREE.CanvasTexture(canvas);
  // M2.8: decal = gambar warna → SRGB eksplisit agar warna layar = file.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
