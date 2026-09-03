import { APPAREL_CATALOG, type ApparelType, type DecalLayer } from "./constants";
import { computePhysicalPrintDimensions } from "./scaleCalibration";

export interface PricingBreakdown6Var {
  // 1. Base apparel
  basePriceIdr: number;
  // 2. Fabric thickness / GSM surcharge
  fabricThicknessSlug: string;
  fabricThicknessSurchargeIdr: number;
  // 3. Sleeve type surcharge (short vs longsleeve)
  isLongsleeve: boolean;
  sleeveSurchargeIdr: number;
  // 4. Per-decal print area tier (A6, A5, A4, A3 max 30cm)
  decalLayers: {
    id: string;
    name: string;
    widthCm: number;
    heightCm: number;
    tier: "A6" | "A5" | "A4" | "A3";
    costIdr: number;
  }[];
  totalSablonCostIdr: number;
  // 5. Size surcharge (XXL +10k, XXXL +20k)
  size: string;
  sizeSurchargeIdr: number;
  // Color & pigment treatment surcharge (e.g. Acid wash +30k, special pigment +15k)
  colorTreatmentSurchargeIdr: number;
  // Unit Subtotal before bulk discount
  unitPriceBeforeDiscountIdr: number;
  // 6. Volume wholesale discount
  quantity: number;
  discountPercentage: number; // 0, 5, 12, 20
  discountAmountIdr: number;
  // Final Totals
  unitPriceIdr: number;
  totalPriceIdr: number;
  formattedTotal: string;
}

export interface CalculatePricingInput {
  apparelSlug: ApparelType;
  fabricThicknessSlug?: "combed-30s" | "combed-24s" | "combed-20s" | "combed-16s" | "french-terry-380";
  size: string;
  colorHex: string;
  isSpecialPigment?: boolean;
  isAcidWash?: boolean;
  decals: DecalLayer[];
  quantity?: number;
}

/**
 * Dynamic 6-Variable Pricing Engine
 * Matches Blueprint 01 §10 specifications:
 * 1. Base Apparel
 * 2. Fabric GSM Thickness (30s 0k, 24s +10k, 20s +15k, 16s +25k)
 * 3. Sleeve Type (Longsleeve +20k)
 * 4. Print Area Tier (A6 +10k, A5 +15k, A4 +25k, A3 max 30cm +35k)
 * 5. Size Surcharge (XXL +10k, XXXL +20k)
 * 6. Volume Wholesale Discounts (6-12 pcs -5%, 13-50 pcs -12%, >50 pcs -20%)
 */
export function calculate6VariablePrice(input: CalculatePricingInput): PricingBreakdown6Var {
  const {
    apparelSlug,
    fabricThicknessSlug = "combed-24s",
    size,
    isSpecialPigment = false,
    isAcidWash = false,
    decals,
    quantity = 1,
  } = input;

  // 1. Base Apparel Price
  const basePriceIdr = APPAREL_CATALOG[apparelSlug]?.basePriceIdr ?? 149000;

  // 2. Fabric GSM Surcharge
  let fabricThicknessSurchargeIdr = 0;
  if (fabricThicknessSlug === "combed-24s") fabricThicknessSurchargeIdr = 10000;
  else if (fabricThicknessSlug === "combed-20s") fabricThicknessSurchargeIdr = 15000;
  else if (fabricThicknessSlug === "combed-16s") fabricThicknessSurchargeIdr = 25000;

  // 3. Sleeve Surcharge
  const isLongsleeve = apparelSlug === "longsleeve";
  const sleeveSurchargeIdr = isLongsleeve ? 20000 : 0;

  // 4. Per-Decal Print Area Tier (Calibrated to Max 30cm DTF standard)
  const decalLayers = decals.map((d, index) => {
    const physical = computePhysicalPrintDimensions(apparelSlug, d.scale, d.y, 1.0, d.targetSide);
    const maxDimension = Math.max(physical.widthCm, physical.heightCm);

    let tier: "A6" | "A5" | "A4" | "A3" = "A4";
    let costIdr = 25000;

    if (maxDimension <= 10.0) {
      tier = "A6";
      costIdr = 10000;
    } else if (maxDimension <= 20.0) {
      tier = "A5";
      costIdr = 15000;
    } else if (maxDimension <= 30.0) {
      tier = "A4";
      costIdr = 25000;
    } else {
      tier = "A3";
      costIdr = 35000;
    }

    return {
      id: d.id,
      name: d.name || `Sablon Layer #${index + 1}`,
      widthCm: physical.widthCm,
      heightCm: physical.heightCm,
      tier,
      costIdr,
    };
  });

  const totalSablonCostIdr = decalLayers.reduce((acc, curr) => acc + curr.costIdr, 0);

  // 5. Size Surcharge
  let sizeSurchargeIdr = 0;
  const upperSize = size.toUpperCase().trim();
  if (upperSize === "XXL") sizeSurchargeIdr = 10000;
  else if (upperSize === "XXXL" || upperSize === "3XL") sizeSurchargeIdr = 20000;

  // Color Treatment Surcharge
  let colorTreatmentSurchargeIdr = 0;
  if (isAcidWash) colorTreatmentSurchargeIdr = 30000;
  else if (isSpecialPigment) colorTreatmentSurchargeIdr = 15000;

  // Unit subtotal
  const unitPriceBeforeDiscountIdr =
    basePriceIdr +
    fabricThicknessSurchargeIdr +
    sleeveSurchargeIdr +
    totalSablonCostIdr +
    sizeSurchargeIdr +
    colorTreatmentSurchargeIdr;

  // 6. Volume Wholesale Discounts
  let discountPercentage = 0;
  if (quantity >= 50) discountPercentage = 20; // Partai Besar / Event
  else if (quantity >= 13) discountPercentage = 12; // Komunitas / Kelas
  else if (quantity >= 6) discountPercentage = 5; // Lusinan Mini-Bulk

  const unitDiscountIdr = Math.round((unitPriceBeforeDiscountIdr * discountPercentage) / 100);
  const unitPriceIdr = unitPriceBeforeDiscountIdr - unitDiscountIdr;
  const totalPriceIdr = unitPriceIdr * quantity;
  const discountAmountIdr = unitDiscountIdr * quantity;

  return {
    basePriceIdr,
    fabricThicknessSlug,
    fabricThicknessSurchargeIdr,
    isLongsleeve,
    sleeveSurchargeIdr,
    decalLayers,
    totalSablonCostIdr,
    size,
    sizeSurchargeIdr,
    colorTreatmentSurchargeIdr,
    unitPriceBeforeDiscountIdr,
    quantity,
    discountPercentage,
    discountAmountIdr,
    unitPriceIdr,
    totalPriceIdr,
    formattedTotal: `IDR ${totalPriceIdr.toLocaleString("id-ID")}`,
  };
}
