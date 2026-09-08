// src/lib/patternSync.ts — Konversi 2-ARAH antara DecalLayer 3D dan objek
// Fabric kanvas pola 2D. Kontrak disalin dari DecalLayerRenderer:
// - scale unit 3D = SISI PANJANG artwork (landscape: lebar, portrait: tinggi)
// - (x, y) = offset TENGAH artwork dari titik (0,0) mesh, satuan unit
// - rotasi derajat, opacity 0-1
// Kanvas 2D: pusat artboard = (0,0) 3D (offset 2mm box diabaikan, di bawah
// persepsi); X kanan+, Y kanvas ke bawah (dibalik dari Y 3D ke atas).
import type { ApparelType, DecalLayer } from "./constants";
import { cmToUnits, EDITOR_PX_PER_CM, unitsToCm } from "./patternGeometry";

export interface FabricPlacement {
  /** px dari tengah kanvas (x kanan+, y bawah+) */
  cxPx: number;
  cyPx: number;
  /** lebar px artwork */
  wPx: number;
  /** tinggi px artwork */
  hPx: number;
  rotation: number;
  opacity: number;
}

/** DecalLayer 3D -> posisi Fabric (butuh rasio aspek gambar w/h). */
export function decalToFabric(
  apparel: ApparelType,
  d: DecalLayer,
  aspectWoverH: number
): FabricPlacement {
  const longCm = unitsToCm(apparel, d.scale);
  const aspect = aspectWoverH > 0 ? aspectWoverH : 1;
  const wCm = aspect >= 1 ? longCm : longCm * aspect;
  const hCm = aspect >= 1 ? longCm / aspect : longCm;
  return {
    cxPx: unitsToCm(apparel, d.x) * EDITOR_PX_PER_CM,
    cyPx: -unitsToCm(apparel, d.y) * EDITOR_PX_PER_CM,
    wPx: wCm * EDITOR_PX_PER_CM,
    hPx: hCm * EDITOR_PX_PER_CM,
    rotation: d.rotation,
    opacity: d.opacity,
  };
}

/** Posisi Fabric -> patch DecalLayer 3D (scale = sisi panjang). */
export function fabricToDecal(
  apparel: ApparelType,
  cxPx: number,
  cyPx: number,
  wPx: number,
  hPx: number,
  rotation: number
): { x: number; y: number; scale: number } {
  const longPx = Math.max(wPx, hPx);
  return {
    x: cmToUnits(apparel, cxPx / EDITOR_PX_PER_CM),
    y: cmToUnits(apparel, -cyPx / EDITOR_PX_PER_CM),
    scale: cmToUnits(apparel, longPx / EDITOR_PX_PER_CM),
  };
}
