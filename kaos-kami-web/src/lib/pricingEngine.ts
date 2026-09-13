import { APPAREL_CATALOG, type ApparelType, type DecalLayer } from "./constants";
import { normalizeApparelSlug } from "./apparelSlug";
import { computePhysicalPrintDimensions } from "./scaleCalibration";
import { classifyPrintTierByCm, printTierCost } from "./printTiers";

export type FabricThicknessSlug = "combed-30s" | "combed-24s" | "combed-20s" | "combed-16s" | "french-terry-380";

/**
 * Pemetaan MaterialFinish studio (pilihan kain visual) → input engine (K-F).
 * - "combed-cotton" → combed-24s (+10k, standar distro Makassar, Blueprint 01 §10)
 * - "french-terry"  → french-terry-380 (+0, fleece 330-380 GSM crewneck/hoodie)
 * - "poplin"        → combed-30s (+0, tenun ringan coach jacket)
 * - tak dikenal/null (TERMASUK legacy "acid-wash" nonaktif Sep 2026) →
 *   default combed-cotton (fail-safe tampil, server tetap otoritatif
 *   saat checkout; tanpa surcharge treatment).
 */
export function materialFinishToPricing(finish?: string | null): {
  fabricThicknessSlug: FabricThicknessSlug;
} {
  switch ((finish || "").toLowerCase().trim()) {
    case "french-terry":
      return { fabricThicknessSlug: "french-terry-380" };
    case "poplin":
      return { fabricThicknessSlug: "combed-30s" };
    case "combed-cotton":
    default:
      return { fabricThicknessSlug: "combed-24s" };
  }
}

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
  // Color & pigment treatment surcharge (special pigment +15k; acid-wash
  // NONAKTIF Sep 2026 — dihapus total, legacy "acid-wash" tanpa surcharge)
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
  fabricThicknessSlug?: FabricThicknessSlug;
  size: string;
  colorHex: string;
  isSpecialPigment?: boolean;
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
  // K-B: normalisasi di entry — alias legacy "jacket"→"shirt" lolos,
  // slug asing DITOLAK 400 (bukan fallback harga tshirt yang salah).
  const apparelSlug = normalizeApparelSlug((input as { apparelSlug?: unknown })?.apparelSlug);
  const {
    fabricThicknessSlug = "combed-24s",
    size,
    isSpecialPigment = false,
    decals,
    quantity = 1,
  } = input;

  // Validasi sisi-vs-apparel (tudung = hoodie saja). Fail-closed: tolak
  // request manipulasi, bukan diam-diam harga salah.
  for (const d of decals || []) {
    if (d?.targetSide === "hood" && apparelSlug !== "hoodie") {
      const err: any = new Error("Sablon tudung hanya untuk hoodie.");
      err.status = 400;
      throw err;
    }
  }

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

  // 4. Per-Decal Print Area Tier (SSOT printTiers.ts, terkalibrasi Maks 30cm DTF)
  // Aspek RIIL dari printPx bila ada (audit: aspect 1.0 hardcoded = undercharge
  // artwork portrait + dimensi workshop salah).
  const aspectOf = (d: any): number => {
    const w = Number(d?.printPx?.w);
    const h = Number(d?.printPx?.h);
    if (w > 0 && h > 0) return w / h;
    return 1.0;
  };
  const decalLayers = decals.map((d, index) => {
    const physical = computePhysicalPrintDimensions(apparelSlug, d.scale, d.y, aspectOf(d), d.targetSide);
    const maxDimension = Math.max(physical.widthCm, physical.heightCm);

    const tier = classifyPrintTierByCm(maxDimension);
    const costIdr = printTierCost(tier);

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

  // Color Treatment Surcharge — pigmen khusus +15k dipertahankan;
  // acid-wash (+30k) DIHAPUS total Sep 2026 (keputusan owner).
  let colorTreatmentSurchargeIdr = 0;
  if (isSpecialPigment) colorTreatmentSurchargeIdr = 15000;

  // Unit subtotal
  const unitPriceBeforeDiscountIdr =
    basePriceIdr +
    fabricThicknessSurchargeIdr +
    sleeveSurchargeIdr +
    totalSablonCostIdr +
    sizeSurchargeIdr +
    colorTreatmentSurchargeIdr;

  // 6. Volume Wholesale Discounts (Blueprint 01 §10: 6+ = 5%, 13+ = 12%, >50 = 20%).
  // Batas ATAS eksklusif: qty=50 tepat masih 12% (audit: >=50 memberi 20%
  // senilai 800rb/order — ikut spek tertulis).
  let discountPercentage = 0;
  if (quantity > 50) discountPercentage = 20; // Partai Besar / Event
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
