import * as THREE from 'three';

/**
 * M-fabric mobile — CERMIN WEB (kaos-kami-web/src/lib/proceduralTextures.ts).
 * Bila rasa kain mobile↔web beda, samakan dulu tiga angka ini dengan web:
 * WEAVE_REPEAT, WEAVE_AMP, dan normalScale di clothPhysicalMaterial —
 * ketiganya penentu utama presence anyaman. Warna TAK DISENTUH misi ini.
 *
 * Fisis & batas (sama dengan web, disesuaikan kanvas 256):
 * - Sine-based (bukan garis diagonal digambar seperti dulu): garis 1px tiap
 *   4px pada repeat 32 = frekuensi selang-seling piksel → MOIRE di DPR 1.
 *   Sine 14 siklus × repeat 10 ≈ 140 loop/dada ≈ 3.5mm/loop (mendekati loop
 *   rajut fisik ±2–3mm). BATAS AMAN: repeat ≤12 (lihat komentar web).
 *   REVERT: WEAVE_REPEAT 10→9→7 + normalScale −0.05 (urutan itu).
 * - Kanvas 256 (bukan 512 seperti web): HP kentang hemat VRAM/upload 4×;
 *   frekuensi rib diskalakan 96→48 agar panjang gelombang TETAP ≈5.3px
 *   (96/512 = 48/256) — frekuensi piksel yang SAMA, bukan angka yang sama.
 * - Lipatan per-profil (tshirt/hoodie/jacket) = FOLD_SPECS web (frekuensi &
 *   amplitudo SAMA PERSIS agar drape mobile↔web konsisten; yang beda hanya
 *   resolusi bake). Mobile TAK dapat lipatan geometri (ensureWindWeights
 *   mobile di windShader.ts read-only misi ini) → peta inilah satu-satunya
 *   pembawa lipatan di mobile, jadi amplitudo JANGAN dikecilkan dari web.
 * - UJI: HP DPR 1, zoom 100%→200%→50% + putar miring; lolos bila serat
 *   terbaca tanpa shimmer berjalan.
 */
const M_WEAVE_CYCLES = 14; // CERMIN WEB (jangan ubah sendiri — ubah web dulu)
const M_WEAVE_AMP = 13; // CERMIN WEB ±2.9°; JANGAN >18 (emboss plastik)
const M_RIB_CYCLES = 48; // = 96 web diskala 512→256 (5.3px/garis, anti-moire); DIKUNCI
const M_RIB_AMP = 4; // CERMIN WEB; JANGAN >5 (garis zebra)
const M_WEAVE_REPEAT = 10; // CERMIN WEB (batas 12); turunkan ke 9→7 bila shimmer
const M_SIZE = 256; // 128 lama TERLALU kasar (14 siklus → 9px/gelombang, aliasing saat bake)

export type MobileWeaveProfile = 'tshirt' | 'hoodie' | 'jacket';

interface MobileFoldSpec {
  freq: number;
  amp: number;
  sharpen: number;
}

// CERMIN FOLD_SPECS web 1:1 (alasan fisis lihat web proceduralTextures.ts):
// jersey tipis halus-rapat / fleece tebal besar-lembut / kanvas kaku tegas-jarang.
// Revert: samakan semua ke { freq: 2, amp: 14, sharpen: 0 }.
const M_FOLD_SPECS: Record<MobileWeaveProfile, MobileFoldSpec> = {
  tshirt: { freq: 3.0, amp: 10, sharpen: 0 },
  hoodie: { freq: 1.5, amp: 18, sharpen: 0 },
  jacket: { freq: 1.0, amp: 20, sharpen: 1 },
};

function shapeFold(s: number, sharpen: number): number {
  // CERMIN web: pangkatkan 0.7 untuk tekukan kanvas kaku. Revert: return s.
  if (!sharpen) return s;
  return Math.sign(s) * Math.pow(Math.abs(s), 0.7);
}

const weaveCache: Partial<Record<MobileWeaveProfile, THREE.CanvasTexture>> = {};

export function getProceduralWeaveTexture(profile: MobileWeaveProfile = 'tshirt'): THREE.CanvasTexture {
  if (weaveCache[profile]) return weaveCache[profile]!;

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }

  const S = M_SIZE;
  const spec = M_FOLD_SPECS[profile] ?? M_FOLD_SPECS.tshirt;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(S, S);
    const data = imgData.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const idx = (y * S + x) * 4;
        const u = (x / S) * Math.PI * 2 * M_WEAVE_CYCLES;
        const v = (y / S) * Math.PI * 2 * M_WEAVE_CYCLES;
        let waveX = Math.sin(u) * Math.cos(v) * M_WEAVE_AMP;
        let waveY = Math.cos(u) * Math.sin(v) * M_WEAVE_AMP;
        waveX += Math.sin((x / S) * Math.PI * 2 * M_RIB_CYCLES) * M_RIB_AMP;
        const foldPhase = ((x + y) / S) * Math.PI * 2 * spec.freq;
        waveX += shapeFold(Math.sin(foldPhase), spec.sharpen) * spec.amp;
        waveY += shapeFold(Math.cos(foldPhase * 0.9 + 0.7), spec.sharpen) * spec.amp;
        data[idx] = Math.max(0, Math.min(255, Math.floor(128 + waveX)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.floor(128 + waveY)));
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(M_WEAVE_REPEAT, M_WEAVE_REPEAT);
  // WAJIB (dulu tak diset!): tanpa mipmap + filter linear, repeat 10..32
  // dijamin shimmer di HP — ini kemungkinan sumber utama "plastik" mobile.
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace; // data-map linear (CERMIN WEB)
  texture.anisotropy = 4; // web 8; mobile 4 (hemat sampler HP kentang — revert bila shimmer: BUKAN ke 0/1, tapi turunkan repeat dulu)
  texture.needsUpdate = true;

  weaveCache[profile] = texture;
  return texture;
}

/**
 * Peta roughness mobile — CERMIN WEB (mean 235 ±22 + blotch ±8, repeat 10).
 * Mean SAMA dengan web (0.92) agar kompensasi roughness target identik.
 * REVERT: M_NOISE_AMP 22→15, M_BLOTCH_AMP 8→0. UJI: highlight berpasir
 * halus di zoom 100% miring, bukan bercak.
 */
const M_ROUGH_MEAN = 235; // DIKUNCI (CERMIN WEB) — ubah = recalibrate target
const M_NOISE_AMP = 22;
const M_BLOTCH_AMP = 8;

let cachedMobileRough: THREE.CanvasTexture | null = null;

export function getMobileRoughnessMap(): THREE.CanvasTexture {
  if (cachedMobileRough) return cachedMobileRough;
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }
  const S = 128; // roughness butuh resolusi lebih rendah dari normal (hemat VRAM)
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(S, S);
    const data = imgData.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = (Math.random() * 2 - 1) * M_NOISE_AMP;
        const blotch =
          Math.sin(((x + y) / S) * Math.PI * 2 * 3) *
          Math.cos(((x - y) / S) * Math.PI * 2 * 2) *
          M_BLOTCH_AMP;
        const v = Math.max(200, Math.min(255, Math.floor(M_ROUGH_MEAN + n + blotch)));
        const idx = (y * S + x) * 4;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(M_WEAVE_REPEAT, M_WEAVE_REPEAT); // sejajar weave
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  cachedMobileRough = texture;
  return texture;
}

export function createMobileClothMaterial(baseColor: string): THREE.MeshStandardMaterial {
  // Fallback lawas (MeshStandardMaterial TANPA sheen — rasa bulu fleece tak
  // bisa muncul di sini; untuk rasa penuh pakai createClothPhysicalMaterial).
  // Angka dicerminkan dari web tshirt-terang agar fallback tak plastik:
  // roughness 0.85→0.90 (katun heavyweight tengah web), metalness 0.05→0.0
  // (kain = dielektrik; 0.05 memberi kilau logam = sumber "plastik" lama),
  // normalScale 0.12→0.44 (CERMIN WEB 0.46, dikurangi 0.02 karena tanpa sheen
  // highlight lebih keras — revert: 0.12 bila shimmer). UJI: bandingkan
  // zoom 100% + putar miring vs web tshirt — harus sekeluarga.
  const normalMap = getProceduralWeaveTexture('tshirt');
  const roughnessMap = getMobileRoughnessMap();

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor),
    roughness: Math.min(1, 0.9 / 0.92), // kompensasi mean 0.92 (CERMIN WEB)
    roughnessMap,
    bumpMap: roughnessMap, // satu tekstur dua peran (CERMIN WEB)
    bumpScale: 0.0022, // CERMIN WEB tshirt (batas 0.005; revert 0.002)
    metalness: 0.0,
    normalMap,
    normalScale: new THREE.Vector2(0.44, 0.44),
    side: THREE.DoubleSide,
  });
}
