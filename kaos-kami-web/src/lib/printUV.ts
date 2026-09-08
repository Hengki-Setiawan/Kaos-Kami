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
 * Komposisi file master cetak 300 DPI dari kanvas/dataURL Fabric.
 * DPI = piksel ÷ inci — target piksel = cm/2.54×300 (standar AcroRIP).
 */
export async function composePrintFile(
  source: HTMLCanvasElement | string,
  widthCm: number,
  heightCm: number
): Promise<{ dataUrl: string; widthPx: number; heightPx: number; dpi: number }> {
  // Cap 4000px/sisi (audit #22 — 17MP OOM di HP). Proporsi dipertahankan.
  const rawW = Math.max(1, (widthCm / 2.54) * 300);
  const rawH = Math.max(1, (heightCm / 2.54) * 300);
  const k = Math.min(1, 4000 / Math.max(rawW, rawH));
  const wPx = Math.max(1, Math.round(rawW * k));
  const hPx = Math.max(1, Math.round(rawH * k));
  const out = document.createElement("canvas");
  out.width = wPx;
  out.height = hPx;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak didukung");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Letterbox contain (audit #22 — stretch drawImage mendistorsi artwork):
  // gambar diskala proporsional + dipusatkan, sisa transparan.
  const paint = (sw: number, sh: number, draw: (dx: number, dy: number, dw: number, dh: number) => void) => {
    const s = Math.min(wPx / sw, hPx / sh);
    const dw = sw * s;
    const dh = sh * s;
    ctx.clearRect(0, 0, wPx, hPx);
    draw((wPx - dw) / 2, (hPx - dh) / 2, dw, dh);
  };
  if (typeof source === "string") {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal memuat gambar sumber cetak"));
      img.src = source;
    });
    const sw = img.naturalWidth || wPx;
    const sh = img.naturalHeight || hPx;
    paint(sw, sh, (dx, dy, dw, dh) => ctx.drawImage(img, dx, dy, dw, dh));
  } else {
    const sw = source.width || wPx;
    const sh = source.height || hPx;
    paint(sw, sh, (dx, dy, dw, dh) => ctx.drawImage(source, dx, dy, dw, dh));
  }
  return {
    dataUrl: out.toDataURL("image/png"),
    widthPx: wPx,
    heightPx: hPx,
    dpi: 300,
  };
}
