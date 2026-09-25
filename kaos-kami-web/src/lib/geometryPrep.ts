"use client";

import * as THREE from "three";

/**
 * Persiapan geometri garmen sebelum render:
 * 1. ensureWindWeights — atribut `windWeight` per-vertex (0 di kerah/bahu,
 *    1 di hem/lengan bawah). TANPA ini shader wind tidak bergerak sama sekali
 *    (atribut kosong = 0 di WebGL). Dihitung SEKALI dari bounding box.
 * 2. ensureBoxUV — proyeksi UV box ala drcmda bila mesh TIDAK punya UV
 *    (kasus hoodie/jacket). Tanpa UV, normalMap anyaman diam-diam mati
 *    (three.js pakai UV default → normal konstan → terlihat plastik).
 *    Catatan: box-UV cukup untuk weave normal, BUKAN untuk cetakan akurat
 *    (lihat lib/printUV.ts untuk jalur cetak).
 * 3. M2.7 (weave jujur): UV dinormalisasi sisi-terpanjang (maxSide) sehingga
 *    repeat peta weave ≈ world-scale — rapat serat konsisten antar apparel
 *    (kaos/hoodie/jaket). Sengaja TAK diubah perilakunya di sini (repeat
 *    hidup di proceduralTextures: WEAVE_REPEAT).
 * 4. M-fabric (rasa kain, TANPA sculpt): lipatan gravitasi universal —
 *    geser mikro tiap vertex sepanjang normalnya (maks ±2.5mm), dimask
 *    lebih kuat di sisi badan/ketiak (|x| besar) dan pinggang/hem (y
 *    rendah) tempat kain nyata menggantung & menumpuk. Fisis: normal-map
 *    hanya menipu cahaya (siluet tetap papan); geser 2.5mm ini yang
 *    memecah SILUET + memberi paralaks nyata saat diputar. Amplitudo
 *    SENGAJA universal (tak per-arketipe): pada skala ini gravitasi menarik
 *    semua bahan mirip; karakter bahan (halus-rapat vs besar-lembut vs
 *    tegas-jarang) datang dari peta lipatan per-arketipe (FOLD_SPECS).
 *    Batas aman: FOLD_DISP_AMP ≤0.005 (5mm) — di atas itu siluet berubah +
 *    surfaceZ kalibrasi cetak (scaleCalibration, TAK DISENTUH di sini)
 *    meleset >1%. REVERT: set FOLD_DISP_AMP = 0 (windWeight tetap jalan).
 *    UJI: putar model miring, zoom 100% — tepi siluet harus berombak lembut
 *    (bukan garis lurus penggaris), decal drei-Decal mengikuti otomatis
 *    karena displacement di-bake ke geometri sebelum render. SENGAJA tak
 *    computeVertexNormals ulang: disp << ukuran segitiga (±1cm) sehingga
 *    perubahan normal tak kasatmata, hemat CPU HP kentang (sekali per load).
 */

/**
 * Amplitudo lipatan gravitasi (satuan dunia model; ≈meter bila 1 unit ≈ 1m
 * seperti hasil kalibrasi skala-cm). 0 = dinonaktifkan (geometri kain murni tanpa distorsi).
 */
const FOLD_DISP_AMP = 0;

export function ensureWindWeights(
  geo: THREE.BufferGeometry,
  pinY?: number,
  hemY?: number
): THREE.BufferGeometry {
  if (geo.getAttribute("windWeight")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const top = pinY ?? (bb.min.y + (bb.max.y - bb.min.y) * 0.72);
  const bottom = hemY ?? bb.min.y;
  const span = Math.max(1e-5, top - bottom);
  const halfWidth = Math.max(1e-5, (bb.max.x - bb.min.x) * 0.5);
  // Normal WAJIB ada untuk arah geser lipatan (GLB kaos & merged hoodie/
  // jaket selalu punya; bila tak ada — lewati geser, windWeight tetap jalan).
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const weights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // smoothstep: 0 di atas garis pin (bahu/kerah/dada), 1 di hem bawah
    // Zona dada print sablon (y > 38% tinggi, |x| < 60% lebar) dikunci 0 agar sablon tidak pernah tembus
    const isChestPrintZone = Math.abs(pos.getX(i)) < halfWidth * 0.65 && y > (bb.min.y + (bb.max.y - bb.min.y) * 0.38);
    const chestDamp = isChestPrintZone ? 0.0 : 1.0;
    const t = Math.max(0, Math.min(1, (top - y) / span));
    weights[i] = t * t * (3 - 2 * t) * chestDamp;
    // Lipatan gravitasi: dua sinus diagonal (panjang gelombang 2π/28 ≈ 0.22
    // unit ≈ 22cm + 2π/17 ≈ 37cm — skala kerut torso nyata 15–35cm, BUKAN
    // kerut mikro yang sudah dipegang normal-map). Masker: sisi badan/ketiak
    // 2× lebih kuat dari tengah dada + pinggang/hem 1.35× dari bahu.
    if (nor) {
      const x = pos.getX(i);
      const side = Math.min(1, Math.abs(x) / halfWidth);
      const mask = (0.45 + 0.55 * side) * (0.65 + 0.35 * t);
      const d =
        FOLD_DISP_AMP *
        mask *
        (0.6 * Math.sin(x * 28 + y * 20) + 0.4 * Math.sin(x * 17 - y * 25 + 1.3));
      pos.setXYZ(
        i,
        x + nor.getX(i) * d,
        y + nor.getY(i) * d,
        pos.getZ(i) + nor.getZ(i) * d
      );
    }
  }
  pos.needsUpdate = true;
  geo.setAttribute("windWeight", new THREE.BufferAttribute(weights, 1));
  return geo;
}

export function ensureBoxUV(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute("uv")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!pos || !nor) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const maxSide = Math.max(size.x, size.y, size.z, 1e-5);
  const uv = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    let u = 0;
    let v = 0;
    if (ax >= ay && ax >= az) {
      u = (p.z - bb.min.z) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    } else if (ay >= ax && ay >= az) {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.z - bb.min.z) / maxSide;
    } else {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * TAMBAHAN (Sep 2026) — bobot stretch uji-tarik, di samping ensureWindWeights:
 * 5. ensureStretchWeights — atribut float `aStretchW` per-vertex (1 di area
 *    tarik, 0 di kerah/bahu y > 0.12 dan — mode dada — di lengan |x| > 0.165,
 *    smoothstep feather di perbatasan). Dipakai shader `lib/3d/stretchDeform.ts`
 *    (`applyStretchToMaterial`). Ambang IDENTIK dengan default
 *    `StretchWeightOpts` di sana (bukti: collarBaselineY 0.155–0.31 &
 *    sleeveAnchorX ≈0.17 di `scaleCalibration.ts`); bila ambang berubah,
 *    ubah di DUA tempat.
 * 6. ensureWindAndStretchWeights — SATU pass untuk kedua atribut (hindari
 *    loop ganda saat setup mesh). Rumus wind di dalamnya IDENTIK dengan
 *    `ensureWindWeights` di atas (termasuk zona dada + blok lipatan
 *    FOLD_DISP_AMP) — JANGAN diverge; perilaku existing tak diubah
 *    (fungsi lama dibiarkan apa adanya).
 */

function stretchSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface StretchPrepOpts {
  /** 'chest' (default): mask lengan |x|>sleeveX → 0. 'full': seluruh mesh. */
  mode?: "chest" | "full";
  collarY?: number;
  sleeveX?: number;
  feather?: number;
}

export function ensureStretchWeights(
  geo: THREE.BufferGeometry,
  opts: StretchPrepOpts = {}
): THREE.BufferGeometry {
  if (geo.getAttribute("aStretchW")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  const { mode = "chest", collarY = 0.12, sleeveX = 0.165, feather = 0.02 } = opts;
  const weights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const collarFree = 1 - stretchSmoothstep(collarY, collarY + feather, pos.getY(i));
    const sleeveFree =
      mode === "full" ? 1 : 1 - stretchSmoothstep(sleeveX, sleeveX + feather, Math.abs(pos.getX(i)));
    weights[i] = collarFree * sleeveFree;
  }
  geo.setAttribute("aStretchW", new THREE.BufferAttribute(weights, 1));
  return geo;
}

export interface WindStretchPrepOpts extends StretchPrepOpts {
  pinY?: number;
  hemY?: number;
}

/**
 * Tulis `windWeight` + `aStretchW` dalam SATU loop (atribut yang sudah ada
 * dilewati). Geser lipatan hanya diterapkan bila `windWeight` belum ada —
 * cermin perilaku `ensureWindWeights` (yang me-return dini bila atribut ada).
 */
export function ensureWindAndStretchWeights(
  geo: THREE.BufferGeometry,
  opts: WindStretchPrepOpts = {}
): THREE.BufferGeometry {
  const needWind = !geo.getAttribute("windWeight");
  const needStretch = !geo.getAttribute("aStretchW");
  if (!needWind && !needStretch) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  const { pinY, hemY, mode = "chest", collarY = 0.12, sleeveX = 0.165, feather = 0.02 } = opts;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const top = pinY ?? (bb.min.y + (bb.max.y - bb.min.y) * 0.72);
  const bottom = hemY ?? bb.min.y;
  const span = Math.max(1e-5, top - bottom);
  const halfWidth = Math.max(1e-5, (bb.max.x - bb.min.x) * 0.5);
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const wind = needWind ? new Float32Array(pos.count) : null;
  const stretch = needStretch ? new Float32Array(pos.count) : null;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    if (wind) {
      // Rumus IDENTIK ensureWindWeights (jangan diverge — lihat catatan §6).
      const isChestPrintZone = Math.abs(x) < halfWidth * 0.65 && y > (bb.min.y + (bb.max.y - bb.min.y) * 0.38);
      const chestDamp = isChestPrintZone ? 0.0 : 1.0;
      const t = Math.max(0, Math.min(1, (top - y) / span));
      wind[i] = t * t * (3 - 2 * t) * chestDamp;
      if (nor) {
        const side = Math.min(1, Math.abs(x) / halfWidth);
        const mask = (0.45 + 0.55 * side) * (0.65 + 0.35 * t);
        const d =
          FOLD_DISP_AMP *
          mask *
          (0.6 * Math.sin(x * 28 + y * 20) + 0.4 * Math.sin(x * 17 - y * 25 + 1.3));
        pos.setXYZ(
          i,
          x + nor.getX(i) * d,
          y + nor.getY(i) * d,
          pos.getZ(i) + nor.getZ(i) * d
        );
      }
    }
    if (stretch) {
      const collarFree = 1 - stretchSmoothstep(collarY, collarY + feather, y);
      const sleeveFree =
        mode === "full" ? 1 : 1 - stretchSmoothstep(sleeveX, sleeveX + feather, Math.abs(x));
      stretch[i] = collarFree * sleeveFree;
    }
  }
  pos.needsUpdate = true;
  if (wind) geo.setAttribute("windWeight", new THREE.BufferAttribute(wind, 1));
  if (stretch) geo.setAttribute("aStretchW", new THREE.BufferAttribute(stretch, 1));
  return geo;
}
