// src/lib/patternGeometry.ts — Geometri pola DATAR 2D (satuan cm) per apparel.
// Satu sumber kebenaran untuk: kanvas pola Fabric, sinkron 2D<->3D DecalLayer,
// dan ekspor master cetak 300 DPI. Angka panel dari APPAREL_PHYSICAL_SPECS
// (lebar dada & panjang badan) + maxSleeve* (area sablon lengan).
import type { ApparelType, DecalTargetSide } from "./constants";
import { APPAREL_PHYSICAL_SPECS } from "./scaleCalibration";

export type PatternPanel = "front" | "back" | "left_sleeve" | "right_sleeve";

export interface PanelGeometry {
  /** Lebar panel cm */
  wCm: number;
  /** Tinggi panel cm */
  hCm: number;
  /** Batas sablon cm (lebar × tinggi), untuk panduan + validasi */
  printWcm: number;
  printHcm: number;
  /** Label manusiawi */
  label: string;
}

/** Geometri panel per apparel (cm). */
export function getPanelGeometry(apparel: ApparelType, panel: PatternPanel): PanelGeometry {
  const spec = APPAREL_PHYSICAL_SPECS[apparel] ?? APPAREL_PHYSICAL_SPECS.tshirt!;
  if (panel === "front" || panel === "back") {
    return {
      wCm: spec.chestWidthCm,
      hCm: spec.bodyLengthCm,
      printWcm: panel === "front" ? spec.maxFrontWidthCm : spec.maxBackWidthCm,
      printHcm: panel === "front" ? spec.maxFrontHeightCm : spec.maxBackHeightCm,
      label: panel === "front" ? "Depan" : "Belakang",
    };
  }
  return {
    wCm: spec.maxSleeveWidthCm * 2.2,
    hCm: spec.maxSleeveHeightCm,
    printWcm: spec.maxSleeveWidthCm,
    printHcm: spec.maxSleeveHeightCm,
    label: panel === "left_sleeve" ? "Lengan Kiri" : "Lengan Kanan",
  };
}

/** Konversi unit 3D -> cm (faktor TERUKUR per apparel). */
export function unitsToCm(apparel: ApparelType, units: number): number {
  return units * (APPAREL_PHYSICAL_SPECS[apparel]?.meshMultiplier ?? 101.8);
}

/** Konversi cm -> unit 3D. */
export function cmToUnits(apparel: ApparelType, cm: number): number {
  return cm / (APPAREL_PHYSICAL_SPECS[apparel]?.meshMultiplier ?? 101.8);
}

/** DPI master produksi. 1 cm = 118.11 px pada 300 DPI. */
export const PRINT_DPI = 300;
export const PX_PER_CM_300DPI = PRINT_DPI / 2.54;

/** Resolusi kanvas EDITOR (px per cm) — ringan untuk HP. */
export const EDITOR_PX_PER_CM = 6;
