/**
 * Fase 13 (Sep 2026): + "cap" (mockup 3D AKTIF, order BELUM) + "pants"
 * (mockup 3D AKTIF — pants.glb) + "shorts" (mockup 3D AKTIF — shorts.glb).
 * CELANA coming-soon (pola cap): pants & shorts mockup 3D AKTIF,
 * pemesanan BELUM dibuka.
 * - mockupEnabled=false → picker terkunci, renderer tak pernah aktif.
 * - orderable=false → checkout server tolak 400 jujur; dashboard tetap boleh simpan.
 */
export type ApparelType = "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt" | "cap" | "pants" | "shorts";
export type StudioTheme = "gallery" | "obsidian" | "concrete";
export type MaterialFinish = "combed-cotton" | "french-terry" | "poplin";
/** Pola eksklusif Sep 2026: 3 mood baru TANPA HDR — hanya tint IBL prosedural
 * (StudioEnvironment) + tombol di drawer. Lampu StudioLighting tak disentuh
 * (fallback default untuk mood baru, anti blank). */
export type LightingPreset = "editorial" | "cyber" | "soft-daylight" | "golden" | "sunset" | "gallery";

/** Meta suasana (mood) studio — Bahasa Indonesia, manusiawi. */
export interface StudioMoodMeta {
  id: Extract<LightingPreset, "golden" | "sunset" | "gallery">;
  label: string;
  desc: string;
  /** Warna tint IBL prosedural (overlay alfa kecil, tanpa HDR). */
  tint: string;
  /** Ikon emoji tombol (tanpa aset baru). */
  icon: string;
}

export const STUDIO_MOODS: StudioMoodMeta[] = [
  {
    id: "golden",
    label: "Golden",
    desc: "Hangat keemasan — warna kain terlihat hidup",
    tint: "#ffcf9e",
    icon: "🌅",
  },
  {
    id: "sunset",
    label: "Sunset",
    desc: "Senja oranye — cek sablon di cahaya hangat",
    tint: "#ff9a6a",
    icon: "🌇",
  },
  {
    id: "gallery",
    label: "Galeri",
    desc: "Putih bersih galeri — warna paling jujur",
    tint: "#ffffff",
    icon: "🖼️",
  },
];

/** Palet tint per preset (null = netral, tanpa tint). Dipakai StudioEnvironment saja. */
export const LIGHTING_TINTS: Record<LightingPreset, string | null> = {
  editorial: null,
  cyber: null,
  "soft-daylight": null,
  golden: "#ffcf9e",
  sunset: "#ff9a6a",
  gallery: "#ffffff",
};

/** Template awal sablon (starter) — Bahasa Indonesia. Skala dijepit runtime
 * via maxDecalScaleUnits agar tak lepas dari batas cetak tiap apparel/sisi. */
export type StarterTemplateId = "logo-dada" | "quotes" | "full-back";

export interface StarterTemplate {
  id: StarterTemplateId;
  label: string;
  desc: string;
  targetSide: DecalTargetSide;
  scale: number;
  x: number;
  y: number;
  sampleText: string;
}

export const STUDIO_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "logo-dada",
    label: "Logo Dada",
    desc: "Kecil di dada kiri ±9 cm",
    targetSide: "front",
    scale: 0.07,
    x: -0.075,
    y: 0.02,
    sampleText: "KK",
  },
  {
    id: "quotes",
    label: "Quotes",
    desc: "Tulisan tengah dada ±21 cm",
    targetSide: "front",
    scale: 0.11,
    x: 0,
    y: -0.05,
    sampleText: "MAKASSAR NEVER DIES",
  },
  {
    id: "full-back",
    label: "Full-Back",
    desc: "Besar di punggung ±29 cm",
    targetSide: "back",
    scale: 0.24,
    x: 0,
    y: -0.02,
    sampleText: "KAOS KAMI",
  },
];
export type CameraViewPreset = "front" | "back" | "left" | "right" | "iso" | "collar";

export type DecalTargetSide =
  | "front"
  | "back"
  | "left_sleeve"
  | "right_sleeve"
  | "side_left"
  | "side_right"
  | "hood";

/** Label manusiawi sisi sablon (invoice, job ticket, kanban). */
export const DECAL_SIDE_LABELS: Record<DecalTargetSide, string> = {
  front: "Dada Depan",
  back: "Punggung",
  side_left: "Samping Kiri (Rusuk)",
  side_right: "Samping Kanan (Rusuk)",
  left_sleeve: "Lengan Kiri",
  right_sleeve: "Lengan Kanan",
  hood: "Tudung (Hood)",
};

/** Sisi valid per apparel (hood = hoodie saja — coach jacket tak bertudung).
 * Mendukung sisi samping (rusuk/seam) dan lengan untuk streetwear. */
export function validSidesFor(apparel: ApparelType): DecalTargetSide[] {
  if (apparel === "cap") return ["front", "side_left", "side_right", "back"];
  if (apparel === "pants" || apparel === "shorts") return ["front", "back", "side_left", "side_right"];
  const base: DecalTargetSide[] = [
    "front",
    "back",
    "side_left",
    "side_right",
    "left_sleeve",
    "right_sleeve",
  ];
  return apparel === "hoodie" ? [...base, "hood"] : base;
}

export interface DecalLayer {
  id: string;
  url: string;
  name: string;
  targetSide: DecalTargetSide;
  x: number; // offset X (-0.35 to 0.35)
  y: number; // offset Y (-0.35 to 0.35)
  scale: number; // skala 3D (MIN 0.04 SSOT; MAKS DINAMIS per apparel/sisi via maxDecalScaleUnits — mis. tshirt depan ≈0.295, lengan ≈0.083 — BUKAN 0.165 tetap)
  rotation: number; // rotation in degrees (-180 to 180)
  opacity: number; // 0 to 1
  /** Dimensi master cetak 300 DPI (px) — opsional, backwards-compatible di JSON lama. */
  printPx?: { w: number; h: number };
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
  previewUrl?: string;
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
  /** Fase 13: false = mockup TERKUNCI (tak ada file GLB).
   * pants/shorts mockupEnabled TRUE (file GLB ada), orderable FALSE. */
  mockupEnabled: boolean;
  /** Fase 13: false = TAK BISA dipesan (cap/pants/shorts) — checkout tolak 400 jujur. */
  orderable: boolean;
}

export const APPAREL_CATALOG: Record<ApparelType, ApparelOption> = {
  tshirt: {
    id: "tshirt",
    name: "Kaos Polos & Custom Kaos Kami",
    tagline: "Katun Combed 24s / 30s Sejuk & Nyaman Dipakai",
    weightGsm: "Combed 24s / 30s",
    basePriceIdr: 79000,
    formattedPrice: "IDR 79.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Kaos katun combed pilihan berkarakter sejuk dan jatuh rapi. Siap pakai polos atau dikustom sablon DTF satuan tanpa minimum order.",
    mockupEnabled: true,
    orderable: true,
  },
  longsleeve: {
    id: "longsleeve",
    name: "Kaos Lengan Panjang Kaos Kami",
    tagline: "Katun Combed Lembut dengan Manset Rib Lengan",
    weightGsm: "Combed 24s",
    basePriceIdr: 99000,
    formattedPrice: "IDR 99.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Kaos lengan panjang berkerah rib elastis yang nyaman untuk aktivitas harian, riding, dan seragam komunitas.",
    mockupEnabled: true,
    orderable: true,
  },
  crewneck: {
    id: "crewneck",
    name: "Sweater Crewneck Kaos Kami",
    tagline: "Bahan Fleece Lembut & Nyaman Hangat",
    weightGsm: "Fleece 280 GSM",
    basePriceIdr: 149000,
    formattedPrice: "IDR 149.000",
    sizes: ["M", "L", "XL", "XXL"],
    description: "Sweater crewneck berpotongan santai dengan bahan fleece lembut, pas untuk sablon kustom logo atau tulisan komunitas.",
    mockupEnabled: true,
    orderable: true,
  },
  hoodie: {
    id: "hoodie",
    name: "Hoodie Jumper Kaos Kami",
    tagline: "Cotton Fleece Tebal dengan Tudung Ganda & Saku",
    weightGsm: "Fleece 330 GSM",
    basePriceIdr: 179000,
    formattedPrice: "IDR 179.000",
    sizes: ["M", "L", "XL", "XXL"],
    description: "Hoodie jumper premium bertudung ganda dengan bahan tebal sejuk, ideal untuk sablon punggung besar hingga ukuran A3+.",
    mockupEnabled: true,
    orderable: true,
  },
  shirt: {
    id: "shirt",
    name: "Coach Jacket Kaos Kami",
    tagline: "Jaket Windbreaker Ringan Berkerah Kancing Jepret",
    weightGsm: "Micro Ripstop",
    basePriceIdr: 189000,
    formattedPrice: "IDR 189.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Jaket coach berkerah modern tahan angin dengan kancing jepret dan sablon DTF tajam tahan cuci.",
    mockupEnabled: true,
    orderable: true,
  },
  cap: {
    id: "cap",
    name: "Topi Baseball Kaos Kami (Mockup)",
    tagline: "Mockup 3D — pemesanan segera hadir",
    weightGsm: "Cotton Twill",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["All Size"],
    description: "Mockup 3D topi untuk pratinjau desain. Fitur pemesanan sedang disiapkan.",
    mockupEnabled: true,
    orderable: false,
  },
  pants: {
    id: "pants",
    name: "Celana Cargo Kaos Kami (Mockup)",
    tagline: "Mockup 3D — pemesanan segera hadir",
    weightGsm: "Twill Ripstop",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Mockup 3D celana cargo dengan kantong samping untuk simulasi desain.",
    mockupEnabled: true,
    orderable: false,
  },
  shorts: {
    id: "shorts",
    name: "Celana Pendek Denim Kaos Kami (Mockup)",
    tagline: "Mockup 3D — pemesanan segera hadir",
    weightGsm: "Denim Ringan",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Mockup 3D celana pendek denim untuk simulasi desain streetwear.",
    mockupEnabled: true,
    orderable: false,
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
    id: "chalk",
    name: "Chalk White",
    hex: "#FFFFFF",
    isSpecialPigment: false,
    description: "Pure white combed cotton, high-contrast DTF sablon canvas.",
  },
  {
    id: "obsidian",
    name: "Obsidian Black",
    hex: "#121214",
    isSpecialPigment: false,
    description: "Deep reactive carbon dyed combed cotton.",
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
  {
    id: "forest",
    name: "Rimba Forest",
    hex: "#234534",
    isSpecialPigment: true,
    description: "Deep rainforest green pigment dye (+IDR 15.000).",
  },
  {
    id: "cloud",
    name: "Cloud White",
    hex: "#F7F5F0",
    isSpecialPigment: false,
    description: "Clean bright white, kanvas terbaik untuk sablon DTF warna.",
  },
];

// Makassar Custom Printing & Garment Dynamic Pricing Engine
// Tier SSOT: lib/printTiers.ts (dipakai pricingEngine by-cm & fungsi legacy ini by-scale).
// Untuk total akurat (aspek gambar + diskon volume), pakai calculate6VariablePrice().
import { classifyPrintTierByScale, printTierCost, PRINT_TIER_LABEL } from "./printTiers";
export interface PriceBreakdown {
  basePrice: number;
  colorSurcharge: number;
  sizeSurcharge: number;
  sablonDetails: { id: string; name: string; sizeType: "A6 Pocket" | "A5 Sedang" | "A4 Chest" | "A3 Big Print"; cost: number }[];
  totalSablonCost: number;
  totalPrice: number;
  formattedTotal: string;
}

/**
 * @deprecated SSOT harga = `calculate6VariablePrice()` (src/lib/pricingEngine.ts).
 * Legacy ini buta terhadap surcharge ketebalan kain, aspek gambar
 * riil (printPx), dan diskon volume. Dipertahankan untuk kompatibilitas;
 * JANGAN dipakai di jalur tampil maupun jalur bayar.
 */
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
  // Selaras pricingEngine (SSOT): XXL +10k, XXXL/3XL +20k. XL tidak kena.
  let sizeSurcharge = 0;
  const upperSize = size.toUpperCase().trim();
  if (upperSize === "XXL") sizeSurcharge = 10000;
  else if (upperSize === "XXXL" || upperSize === "3XL") sizeSurcharge = 20000;
  // Tier via SSOT by-cm (konversi skala→cm terkalibrasi per apparel).
  const sablonDetails = decals.map((d, idx) => {
    const tier = classifyPrintTierByScale(d.scale, apparel);
    const cost = printTierCost(tier);
    const sizeType = PRINT_TIER_LABEL[tier];
    return { id: d.id, name: `Sablon #${idx + 1} (${d.targetSide.toUpperCase()} - ${sizeType})`, sizeType, cost };
  });
  const totalSablonCost = sablonDetails.reduce((s, i) => s + i.cost, 0);
  const totalPrice = basePrice + colorSurcharge + sizeSurcharge + totalSablonCost;
  return { basePrice, colorSurcharge, sizeSurcharge, sablonDetails, totalSablonCost, totalPrice, formattedTotal: `IDR ${totalPrice.toLocaleString("id-ID")}` };
}

export const TECHNICAL_SPECS = [
  {
    label: "BAHAN KAOS",
    value: "Katun Combed 24s & 30s",
    detail: "100% serat katun alami pilihan yang halus, sejuk di kulit, menyerap keringat, dan nyaman dipakai harian.",
  },
  {
    label: "SABLON DIGITAL",
    value: "DTF Premium 300 DPI",
    detail: "Cetak sablon Direct-to-Film presisi tinggi dengan tinta lentur anti-retak, warna tajam tahan cuci, dan permukaan lembut.",
  },
  {
    label: "JAHITAN DISTRO",
    value: "Jahit Rantai & Kerah Elastis",
    detail: "Konstruksi pundak jahit rantai ganda ekstra kuat serta rib kerah elastis yang awet dan tidak mudah melar setelah dicuci.",
  },
  {
    label: "SISTEM ORDER",
    value: "Bebas Pesan Satuan",
    detail: "Tanpa batas minimum order (bisa pesan 1 pcs untuk kado atau desain sendiri), hingga ratusan pcs untuk komunitas dan instansi.",
  },
];

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof SIZES)[number];

export const PRODUCT_DETAILS = {
  name: "Kaos Kami | Sablon Kaos & Streetwear Makassar",
  productTitle: "Kaos Polos & Custom Kaos Kami",
  sku: "KK-TEE-01",
  priceIdr: 79000,
  formattedPrice: "Rp 79.000",
  currency: "IDR",
  brand: "Kaos Kami",
  availability: "InStock",
  origin: "Kota Makassar, Sulawesi Selatan",
};
