/**
 * SSOT tier area sablon DTF (Blueprint 01 §10 + kalibrasi 30cm).
 * Satu-satunya definisi tier — dipakai pricingEngine (by cm fisik) & constants (by skala 3D).
 *
 * Tier: A6 +10k (≤10cm), A5 +15k (≤15cm), A4 +25k (≤25cm), A3 +35k (>25cm, maks 30cm roll DTF).
 * Catatan: `computePhysicalPrintDimensions` meng-clamp lebar ke 30cm, jadi klasifikasi
 * HARUS memakai batas ≤30 yang reachable (bukan `else >30` yang dead-code).
 */

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
 * Klasifikasi dari skala 3D mentah (fallback saat aspek gambar belum diketahui).
 * Dipetakan agar konsisten dengan by-cm: scale 0.04–0.165 → ±7–30cm (multiplier ~185).
 */
export function classifyPrintTierByScale(scale: number): PrintTier {
  if (scale < 0.065) return "A6";
  if (scale < 0.095) return "A5";
  if (scale < 0.135) return "A4";
  return "A3";
}

export function printTierCost(tier: PrintTier): number {
  return PRINT_TIER_COST_IDR[tier];
}
