/**
 * Fase 13 (Sep 2026): + "cap" (mockup 3D AKTIF, order BELUM) + "pants"
 * (mockup 3D AKTIF — pants.glb) + "shorts" (mockup 3D AKTIF — shorts.glb).
 * CELANA coming-soon (pola cap): pants & shorts mockup 3D AKTIF,
 * pemesanan BELUM dibuka.
 * - mockupEnabled=false → picker terkunci, renderer tak pernah aktif.
 * - orderable=false → checkout server tolak 400 jujur; dashboard tetap boleh simpan.
 */
export type ApparelType = "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt" | "cap" | "pants" | "shorts";
export type StudioTheme = "obsidian" | "gallery" | "concrete";
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

export type DecalTargetSide = "front" | "back" | "left_sleeve" | "right_sleeve" | "hood";

/** Label manusiawi sisi sablon (invoice, job ticket, kanban). */
export const DECAL_SIDE_LABELS: Record<DecalTargetSide, string> = {
  front: "Dada Depan",
  back: "Punggung",
  left_sleeve: "Lengan Kiri",
  right_sleeve: "Lengan Kanan",
  hood: "Tudung (Hood)",
};

/** Sisi valid per apparel (hood = hoodie saja — coach jacket tak bertudung).
 * Fase 13: cap = depan saja (lidah topi). CELANA coming-soon (pola cap):
 * pants & shorts = depan saja (paha depan) — PatternStudio nonaktif eksplisit. */
export function validSidesFor(apparel: ApparelType): DecalTargetSide[] {
  if (apparel === "cap") return ["front"];
  if (apparel === "pants") return ["front"];
  if (apparel === "shorts") return ["front"];
  const base: DecalTargetSide[] = ["front", "back", "left_sleeve", "right_sleeve"];
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
    name: "Heavyweight Boxy Tee (Lengan Pendek)",
    tagline: "240 & 280 GSM Long-Staple Combed Cotton",
    weightGsm: "240 / 280 GSM",
    basePriceIdr: 149000,
    formattedPrice: "IDR 149.000",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Architectural drop-shoulder silhouette with heavy ribbed 3.2cm collar binding.",
    mockupEnabled: true,
    orderable: true,
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
    mockupEnabled: true,
    orderable: true,
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
    mockupEnabled: true,
    orderable: true,
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
    mockupEnabled: true,
    orderable: true,
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
    mockupEnabled: true,
    orderable: true,
  },
  // Fase 13: mockup 3D AKTIF (cap.glb), pemesanan BELUM dibuka.
  // basePriceIdr 0 = arsip dashboard saja (bukan harga jual) — checkout
  // menolak SEBELUM pricing (guard orderable), jadi 0 tak pernah ditagih.
  cap: {
    id: "cap",
    name: "Snapback Baseball Cap (Mockup Saja)",
    tagline: "Mockup 3D — pemesanan SEGERA hadir",
    weightGsm: "—",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["All Size"],
    description: "Mockup 3D topi untuk latihan desain. Belum bisa dipesan — harga & produksi menyusul.",
    mockupEnabled: true,
    orderable: false,
  },
  // CELANA coming-soon (pola cap): mockup 3D AKTIF (pants.glb), pemesanan
  // BELUM dibuka. basePriceIdr 0 = arsip dashboard saja (bukan harga jual) —
  // checkout menolak SEBELUM pricing (guard orderable), jadi 0 tak pernah ditagih.
  pants: {
    id: "pants",
    name: "Celana Panjang (Mockup Saja)",
    tagline: "Mockup 3D — pemesanan SEGERA hadir",
    weightGsm: "—",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Mockup 3D celana untuk latihan desain. Belum bisa dipesan — harga & produksi menyusul.",
    mockupEnabled: true,
    orderable: false,
  },
  // CELANA PENDEK coming-soon (pola pants persis): mockup 3D AKTIF
  // (shorts.glb), pemesanan BELUM dibuka. basePriceIdr 0 = arsip dashboard
  // saja (bukan harga jual) — checkout menolak SEBELUM pricing (guard
  // orderable), jadi 0 tak pernah ditagih.
  shorts: {
    id: "shorts",
    name: "Celana Pendek (Mockup Saja)",
    tagline: "Mockup 3D — pemesanan SEGERA hadir",
    weightGsm: "—",
    basePriceIdr: 0,
    formattedPrice: "SEGERA",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Mockup 3D celana pendek untuk latihan desain. Belum bisa dipesan — harga & produksi menyusul.",
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
    label: "BERAT KAIN (GSM)",
    value: "240 & 280 GSM",
    detail: "Katun combed tebal berkualitas tinggi, jatuh tegap berkarakter boxy, tidak terawang dan tetap sejuk.",
  },
  {
    label: "SPESIFIKASI BENANG",
    value: "16s Ring-Spun Combed",
    detail: "Serat katun combed panjang dengan permukaan rapat dan halus, hasil penyerapan tinta sablon lebih tajam.",
  },
  {
    label: "KONSTRUKSI KERAH",
    value: "Rib Tebal 3.2cm",
    detail: "Kerah rajut ganda dengan jahitan rantai pundak ekstra kuat, anti-melar meski dicuci berkali-kali.",
  },
  {
    label: "POLA POTONGAN",
    value: "Oversized Boxy Cut",
    detail: "Siluet drop-shoulder modern khas streetwear dengan bukaan lengan lebar dan potongan badan proporsional.",
  },
];

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof SIZES)[number];

export const PRODUCT_DETAILS = {
  name: "Kaos Kami — Platform Sablon DTF & Streetwear Makassar",
  productTitle: "HEAVYWEIGHT BOXY TEE",
  sku: "KK-HW-240-01",
  priceIdr: 149000,
  formattedPrice: "Rp 149.000",
  currency: "IDR",
  brand: "Kaos Kami",
  availability: "InStock",
  origin: "Kota Makassar, Sulawesi Selatan",
};
