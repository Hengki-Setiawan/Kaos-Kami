"use client";

import * as THREE from "three";

/**
 * Dual-hemisphere planar UV untuk KEBUTUHAN CETAK (bukan untuk weave).
 * Pola mini-jersey-studio yang terbukti produksi:
 * - vertex depan (z > 0) → u ∈ [0, 0.5] (kiri texture = depan)
 * - vertex belakang (z ≤ 0) → u ∈ [0.5, 1.0] dicerminkan horizontal
 *   agar teks terbaca benar dari kamera belakang
 * - v dari bounding-box Y (atas = 1)
 * Disimpan sebagai atribut `uvPrint` agar tidak menimpa `uv` weave.
 * Dengan ini satu kanvas Fabric 2048px bisa jadi texture baju SEKALIGUS
 * file master cetak — mockup 3D = file cetak 1:1.
 *
 * ── BATAS split-z LENGAN (audit #22, wajib dibaca agen pola/ekspor) ──
 * 1. Split memakai TANDA z saja (`z > 0` = depan). Dinding lengan/tubuh yang
 *    SEJAJAR sumbu-z (normal ±x, z ≈ 0) jatuh ARBITRER ke hemisfer belakang
 *    (cabang `else`) — posisinya di texture tak bermakna pola lengan.
 * 2. Ada SEAM di bidang z = 0: vertex lengan kiri/kanan yang berseberangan
 *    dijahit dari dua hemisfer berbeda → artwork yang melintasi seam ROBEK.
 * 3. v diambil dari bbox-Y SELURUH mesh; untuk hoodie/jacket (hood, saku,
 *    lengan terentang) bbox mencakup bagian non-badan → v artwork badan
 *    terkompresi/bergeser bila satu texture dipakai mentah-mentah.
 * KONSEKUENSI: fungsi ini HANYA untuk panel depan/belakang badan. Master
 * lengan/hood WAJIB lewat jalur PatternStudio per-panel (exportPanelMaster)
 * yang memetakan cm→px eksplisit per sisi. Jangan pakai uvPrint untuk
 * menagih posisi lengan — selalu meleset di seam.
 */
export function generatePrintUV(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const sx = Math.max(1e-5, bb.max.x - bb.min.x);
  const sy = Math.max(1e-5, bb.max.y - bb.min.y);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = (x - bb.min.x) / sx;
    const v = (y - bb.min.y) / sy;
    let u: number;
    if (z > 0) {
      u = 0.5 * nx; // depan
    } else {
      u = 0.5 + 0.5 * (1 - nx); // belakang, mirror horizontal
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute("uvPrint", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * Batas ekspor anti-OOM HP (audit #22).
 * - A3 30×42cm @300DPI mentah = 3543×4960 ≈ 17,6MP ≈ 70MB RGBA → OOM di HP mid.
 * - `maxSidePx` + `maxMegapixels` menjepit SEMUA ekspor satu-kanvas ke
 *   ≤ ~48MB. `tileSidePx` = ukuran tile jalur `composePrintFileTiled`
 *   (tiap tile ≤ ~16MB, di-upload sekuensial — puncak RAM tetap kecil).
 */
export const PRINT_EXPORT_LIMITS = {
  maxSidePx: 4000,
  maxMegapixels: 12,
  tileSidePx: 2048,
} as const;

/** Faktor skala agar rawW×rawH muat dalam batas (proporsi dipertahankan). */
export function exportScaleFactor(rawW: number, rawH: number): number {
  const { maxSidePx, maxMegapixels } = PRINT_EXPORT_LIMITS;
  const sideK = maxSidePx / Math.max(1, rawW, rawH);
  const mpK = Math.sqrt((maxMegapixels * 1_000_000) / Math.max(1, rawW * rawH));
  return Math.min(1, sideK, mpK);
}

/** Petakan sumber → rect contain (letterbox) di dalam output. */
function containRect(sw: number, sh: number, outW: number, outH: number): { dx: number; dy: number; dw: number; dh: number; s: number } {
  const s = Math.min(outW / Math.max(1, sw), outH / Math.max(1, sh));
  const dw = sw * s;
  const dh = sh * s;
  return { dx: (outW - dw) / 2, dy: (outH - dh) / 2, dw, dh, s };
}

async function loadSourceImage(source: HTMLCanvasElement | string): Promise<
  | { kind: "canvas"; el: HTMLCanvasElement; w: number; h: number }
  | { kind: "img"; el: HTMLImageElement; w: number; h: number }
> {
  if (typeof source !== "string") {
    return { kind: "canvas", el: source, w: source.width || 1, h: source.height || 1 };
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal memuat gambar sumber cetak"));
    img.src = source;
  });
  return { kind: "img", el: img, w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
}

/**
 * Komposisi file master cetak 300 DPI dari kanvas/dataURL Fabric.
 * DPI = piksel ÷ inci — target piksel = cm/2.54×300 (standar AcroRIP).
 * Letterbox contain: gambar diskala proporsional + dipusatkan, sisa
 * transparan (PNG — alpha DTF dipertahankan, bukan di-stretch).
 */
export async function composePrintFile(
  source: HTMLCanvasElement | string,
  widthCm: number,
  heightCm: number
): Promise<{ dataUrl: string; widthPx: number; heightPx: number; dpi: number }> {
  const rawW = Math.max(1, (widthCm / 2.54) * 300);
  const rawH = Math.max(1, (heightCm / 2.54) * 300);
  // Cap sisi + megapiksel (audit #22 — 17MP OOM di HP). Proporsi dipertahankan.
  const k = exportScaleFactor(rawW, rawH);
  const wPx = Math.max(1, Math.round(rawW * k));
  const hPx = Math.max(1, Math.round(rawH * k));
  const out = document.createElement("canvas");
  out.width = wPx;
  out.height = hPx;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak didukung");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, wPx, hPx);

  const src = await loadSourceImage(source);
  try {
    const { dx, dy, dw, dh } = containRect(src.w, src.h, wPx, hPx);
    ctx.drawImage(src.el as CanvasImageSource, dx, dy, dw, dh);
  } finally {
    if (src.kind === "img") src.el.removeAttribute("src");
  }
  return {
    dataUrl: out.toDataURL("image/png"),
    widthPx: wPx,
    heightPx: hPx,
    // DPI SEBENARNYA (audit: 300 hardcoded padahal cap menurunkan resolusi).
    dpi: Math.round((wPx / (widthCm / 2.54) + hPx / (heightCm / 2.54)) / 2),
  };
}

export interface PrintTile {
  dataUrl: string;
  /** Indeks kolom/baris tile. */
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** Ukuran tile px. */
  widthPx: number;
  heightPx: number;
  /** Offset tile di dalam komposisi penuh (px output). */
  x0: number;
  y0: number;
}

/**
 * Ekspor TILING anti-OOM (audit #22): komposisi penuh TIDAK PERNAH dipegang
 * sebagai satu kanvas. Output dipecah grid (tiap tile ≤ `tileSidePx`),
 * tiap tile di-render di kanvas kecilnya sendiri langsung dari SUMBER
 * (region sumber yang dipetakan contain) lalu bisa di-upload SEBUAH DEMI
 * SEBUAH — puncak RAM ≈ 1 tile (~16MB @2048² RGBA) + sumber, bukan 70MB.
 * Agen ekspor: loop `tiles`, POST sekuensial, gabung di server/R2 bila perlu.
 */
export async function composePrintFileTiled(
  source: HTMLCanvasElement | string,
  widthCm: number,
  heightCm: number,
  tileSidePx: number = PRINT_EXPORT_LIMITS.tileSidePx
): Promise<{
  tiles: PrintTile[];
  widthPx: number;
  heightPx: number;
  dpi: number;
  cols: number;
  rows: number;
}> {
  const rawW = Math.max(1, (widthCm / 2.54) * 300);
  const rawH = Math.max(1, (heightCm / 2.54) * 300);
  const k = exportScaleFactor(rawW, rawH);
  const wPx = Math.max(1, Math.round(rawW * k));
  const hPx = Math.max(1, Math.round(rawH * k));
  const dpi = Math.round((wPx / (widthCm / 2.54) + hPx / (heightCm / 2.54)) / 2);

  const tile = Math.max(256, Math.floor(tileSidePx));
  const cols = Math.max(1, Math.ceil(wPx / tile));
  const rows = Math.max(1, Math.ceil(hPx / tile));

  const src = await loadSourceImage(source);
  try {
    const { dx, dy, s } = containRect(src.w, src.h, wPx, hPx);
    const tiles: PrintTile[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = col * tile;
        const y0 = row * tile;
        const tw = Math.min(tile, wPx - x0);
        const th = Math.min(tile, hPx - y0);
        const c = document.createElement("canvas");
        c.width = tw;
        c.height = th;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D tidak didukung");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, tw, th);
        // Region sumber yang jatuh di tile ini (koordinat contain → sumber).
        const sx = (x0 - dx) / s;
        const sy = (y0 - dy) / s;
        const sw = tw / s;
        const sh = th / s;
        // Iris dengan batas sumber (di luar = tetap transparan letterbox).
        const ix0 = Math.max(0, sx);
        const iy0 = Math.max(0, sy);
        const ix1 = Math.min(src.w, sx + sw);
        const iy1 = Math.min(src.h, sy + sh);
        if (ix1 > ix0 && iy1 > iy0) {
          ctx.drawImage(
            src.el as CanvasImageSource,
            ix0, iy0, ix1 - ix0, iy1 - iy0,
            dx + ix0 * s - x0, dy + iy0 * s - y0,
            (ix1 - ix0) * s, (iy1 - iy0) * s
          );
        }
        const dataUrl = c.toDataURL("image/png");
        // Bebaskan piksel tile segera (anti-OOM: jangan tahan N kanvas).
        c.width = 0;
        c.height = 0;
        tiles.push({ dataUrl, col, row, cols, rows, widthPx: tw, heightPx: th, x0, y0 });
      }
    }
    return { tiles, widthPx: wPx, heightPx: hPx, dpi, cols, rows };
  } finally {
    if (src.kind === "img") src.el.removeAttribute("src");
  }
}
