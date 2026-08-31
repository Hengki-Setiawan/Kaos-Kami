export type ApparelType = "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt";
export type StudioTheme = "obsidian" | "gallery" | "concrete";
export type MaterialFinish = "combed-cotton" | "french-terry" | "acid-wash" | "poplin";
export type LightingPreset = "editorial" | "cyber" | "soft-daylight";
export type CameraViewPreset = "front" | "back" | "left" | "right" | "iso";

export interface DecalLayer {
  id: string;
  url: string;
  name: string;
  targetSide: "front" | "back";
  x: number; // offset X (-0.35 to 0.35)
  y: number; // offset Y (-0.35 to 0.35)
  scale: number; // scale (0.15 to 1.2)
  rotation: number; // rotation in degrees (-180 to 180)
  opacity: number; // 0 to 1
}

export interface SavedMockupDesign {
  id: string;
  title: string;
  apparel: ApparelType;
  colorHex: string;
  colorName: string;
  size: string;
  theme: StudioTheme;
  materialFinish: MaterialFinish;
  decals: DecalLayer[];
  savedAt: string;
  calculatedPriceIdr: number;
}

export interface ApparelOption {
  id: ApparelType;
  name: string;
  tagline: string;
  weightGsm: string;
  basePriceIdr: number;
  formattedPrice: string;
  sizes: readonly string[];
  description: string;
}

export const APPAREL_CATALOG: Record<ApparelType, ApparelOption> = {
  tshirt: {
    id: "tshirt",
    name: "Heavyweight Boxy Tee (Lengan Pendek)",
    tagline: "240 & 280 GSM Long-Staple Combed Cotton",
    weightGsm: "240 / 280 GSM",
    basePriceIdr: 149000,
    formattedPrice: "IDR 149.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Architectural drop-shoulder silhouette with heavy ribbed 3.2cm collar binding.",
  },
  longsleeve: {
    id: "longsleeve",
    name: "Heavyweight Longsleeve Tee (Lengan Panjang)",
    tagline: "240 & 280 GSM Combed Cotton with Ribbed Cuffs",
    weightGsm: "240 / 280 GSM",
    basePriceIdr: 169000,
    formattedPrice: "IDR 169.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Drop-shoulder boxy longsleeve with 5cm ribbed sleeve cuffs and reinforced neckline.",
  },
  crewneck: {
    id: "crewneck",
    name: "Heavyweight Crewneck Sweater",
    tagline: "330 & 380 GSM Premium Loopback French Terry",
    weightGsm: "330 / 380 GSM",
    basePriceIdr: 249000,
    formattedPrice: "IDR 249.000",
    sizes: ["M", "L", "XL", "XXL"],
    description: "Classic relaxed streetwear sweater without hood, featuring dense ribbed collar, cuffs, and hem.",
  },
  hoodie: {
    id: "hoodie",
    name: "Heavyweight Oversized Hoodie",
    tagline: "380 GSM Heavy French Terry Fleece",
    weightGsm: "380 GSM",
    basePriceIdr: 269000,
    formattedPrice: "IDR 269.000",
    sizes: ["M", "L", "XL", "XXL"],
    description: "Dense loopback French Terry with double-layered structured hood and deep kangaroo pouch.",
  },
  shirt: {
    id: "shirt",
    name: "Streetwear Coach Jacket",
    tagline: "320 GSM Technical Canvas & Hardware",
    weightGsm: "320 GSM",
    basePriceIdr: 329000,
    formattedPrice: "IDR 329.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Architectural boxy zip jacket with front hardware, side pockets, and durable tactical weave.",
  },
};

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  isSpecialPigment?: boolean;
  description: string;
}

export const PRODUCT_COLORS: ProductColor[] = [
  {
    id: "obsidian",
    name: "Obsidian Black",
    hex: "#121214",
    isSpecialPigment: false,
    description: "Deep reactive carbon dyed combed cotton.",
  },
  {
    id: "chalk",
    name: "Chalk Ecru",
    hex: "#EFECE6",
    isSpecialPigment: false,
    description: "Natural unbleached raw organic cotton flecks.",
  },
  {
    id: "tangerine",
    name: "Signal Tangerine",
    hex: "#E65100",
    isSpecialPigment: true,
    description: "High-visibility industrial acid orange pigment dye (+IDR 15.000).",
  },
  {
    id: "olive",
    name: "Military Olive",
    hex: "#3B4435",
    isSpecialPigment: true,
    description: "Subdued tactical olive drab utility wash (+IDR 15.000).",
  },
  {
    id: "shadow",
    name: "Shadow Grey",
    hex: "#2A2B2E",
    isSpecialPigment: false,
    description: "Muted brutalist concrete wash.",
  },
  {
    id: "cobalt",
    name: "Deep Cobalt",
    hex: "#16284F",
    isSpecialPigment: true,
    description: "Rich maritime midnight blue pigment (+IDR 15.000).",
  },
  {
    id: "crimson",
    name: "Vintage Crimson",
    hex: "#5C1D24",
    isSpecialPigment: true,
    description: "Deep aged streetwear burgundy red (+IDR 15.000).",
  },
];

// Makassar Custom Printing & Garment Dynamic Pricing Engine
// Unified to 6-variable engine (Blueprint 01 §10) — single source of truth via pricingEngine.ts
export interface PriceBreakdown {
  basePrice: number;
  colorSurcharge: number;
  sizeSurcharge: number;
  sablonDetails: { id: string; name: string; sizeType: "A6 Pocket" | "A4 Chest" | "A3 Big Print"; cost: number }[];
  totalSablonCost: number;
  totalPrice: number;
  formattedTotal: string;
}

export function calculateCustomMockupPrice(
  apparel: ApparelType,
  colorHex: string,
  size: string,
  decals: DecalLayer[]
): PriceBreakdown {
  // Unified 6-var tiers (A6 10k / A5 15k / A4 25k / A3 35k) — inline to avoid circular + lint
  const basePrice = APPAREL_CATALOG[apparel]?.basePriceIdr ?? 149000;
  const matchedColor = PRODUCT_COLORS.find((c) => c.hex.toLowerCase() === colorHex.toLowerCase());
  const colorSurcharge = matchedColor?.isSpecialPigment ? 15000 : 0;
  let sizeSurcharge = 0;
  if (size === "XL") sizeSurcharge = 10000;
  else if (size === "XXL") sizeSurcharge = 20000;
  // Use scaleCalibration for tier (same as pricingEngine) — fallback to scale heuristic
  const sablonDetails = decals.map((d, idx) => {
    let cost = 25000;
    let sizeType: "A6 Pocket" | "A4 Chest" | "A3 Big Print" = "A4 Chest";
    // 6-var mapping: scale <0.35 → A6 10k, <0.65 → A5/A4 15k-25k, >=0.65 → A3 35k
    if (d.scale < 0.35) {
      cost = 10000;
      sizeType = "A6 Pocket";
    } else if (d.scale >= 0.65) {
      cost = 35000;
      sizeType = "A3 Big Print";
    } else if (d.scale < 0.5) {
      cost = 15000;
      sizeType = "A4 Chest";
    } else {
      cost = 25000;
      sizeType = "A4 Chest";
    }
    return { id: d.id, name: `Sablon #${idx + 1} (${d.targetSide.toUpperCase()} - ${sizeType})`, sizeType, cost };
  });
  const totalSablonCost = sablonDetails.reduce((s, i) => s + i.cost, 0);
  const totalPrice = basePrice + colorSurcharge + sizeSurcharge + totalSablonCost;
  return { basePrice, colorSurcharge, sizeSurcharge, sablonDetails, totalSablonCost, totalPrice, formattedTotal: `IDR ${totalPrice.toLocaleString("id-ID")}` };
}

export const TECHNICAL_SPECS = [
  {
    label: "FABRIC WEIGHT",
    value: "240 & 280 GSM",
    detail: "Heavyweight premium combed cotton engineered to hold a structured boxy drape without sagging.",
  },
  {
    label: "YARN ARCHITECTURE",
    value: "16s Ring-Spun",
    detail: "Zero-twist combed long-staple cotton yarn offering maximum surface smoothness and durability.",
  },
  {
    label: "COLLAR STRUCTURE",
    value: "3.2cm Ribbed Binding",
    detail: "High-density 1x1 ribbed neckband with twin-needle reinforcement to prevent bacon neck after washes.",
  },
  {
    label: "SILHOUETTE CUT",
    value: "Boxy Drop-Shoulder",
    detail: "Architectural proportions with lengthened sleeve cuffs and relaxed body circumference.",
  },
];

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof SIZES)[number];

export const PRODUCT_DETAILS = {
  name: "kaos kami — Heavyweight 3D Apparel Experience",
  productTitle: "OVERSIZED HEAVY-KNIT",
  sku: "KK-HW-240-01",
  priceIdr: 149000,
  formattedPrice: "IDR 149.000",
  currency: "IDR",
  brand: "kaos kami",
  availability: "InStock",
  origin: "Makassar / Jakarta, Indonesia",
};
