/**
 * SSOT tier area sablon DTF (Blueprint 01 §10 + kalibrasi 30cm).
 * Satu-satunya definisi tier — SEMUA jalur klasifikasi via cm fisik.
 *
 * Tier: A6 +10k (≤10cm), A5 +15k (≤15cm), A4 +25k (≤25cm), A3 +35k (>25cm, maks 30cm roll DTF).
 * Catatan: `computePhysicalPrintDimensions` meng-clamp lebar ke 30cm, jadi klasifikasi
 * HARUS memakai batas ≤30 yang reachable (bukan `else >30` yang dead-code).
 */

import { APPAREL_PHYSICAL_SPECS } from "./scaleCalibration";

export type PrintTier = "A6" | "A5" | "A4" | "A3";

export const PRINT_TIER_COST_IDR: Record<PrintTier, number> = {
  A6: 10000,
  A5: 15000,
  A4: 25000,
  A3: 35000,
};

export const PRINT_TIER_LABEL: Record<PrintTier, "A6 Pocket" | "A5 Sedang" | "A4 Chest" | "A3 Big Print"> = {
  A6: "A6 Pocket",
  A5: "A5 Sedang",
  A4: "A4 Chest",
  A3: "A3 Big Print",
};

/** Klasifikasi utama: dari dimensi fisik cm (sudah dikalibrasi 30cm). */
export function classifyPrintTierByCm(maxDimensionCm: number): PrintTier {
  if (maxDimensionCm <= 10) return "A6";
  if (maxDimensionCm <= 15) return "A5";
  if (maxDimensionCm <= 25) return "A4";
  return "A3";
}

/**
 * Klasifikasi dari skala 3D + apparel: skala dikonversi ke cm via multiplier
 * TERUKUR per apparel, lalu lewat jalur by-cm yang sama. Tidak ada lagi dua
 * tabel ambang berbeda (dulu scale 0.11 = A4 di satu jalur, A5 di jalur lain).
 */
export function classifyPrintTierByScale(scale: number, apparel: string = "tshirt"): PrintTier {
  const mult = APPAREL_PHYSICAL_SPECS[apparel]?.meshMultiplier
    ?? APPAREL_PHYSICAL_SPECS["tshirt"]?.meshMultiplier
    ?? 101.8;
  return classifyPrintTierByCm(scale * mult);
}

export function printTierCost(tier: PrintTier): number {
  return PRINT_TIER_COST_IDR[tier];
}
