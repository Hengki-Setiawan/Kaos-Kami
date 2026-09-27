/**
 * STANDAR UKURAN FISIK APPAREL (SIZE CHART SSOT - MOBILE)
 * Konveksi & Distro Sablon DTF Kaos Kami - Kota Makassar
 *
 * Menyediakan data dimensi nyata dunia nyata (dalam centimeter)
 * untuk seluruh 8 jenis produk garmen dari ukuran S hingga XXL.
 * Tanpa emotikon, standar industri garmen profesional.
 */

export interface GarmentDimensions {
  size: string;
  chestWidthCm?: number;
  chestCircumferenceCm?: number;
  bodyLengthCm: number;
  shoulderWidthCm?: number;
  sleeveLengthCm?: number;
  waistMinCm?: number;
  waistMaxCm?: number;
  thighCircumferenceCm?: number;
  legOpeningCm?: number;
  headCircumferenceMinCm?: number;
  headCircumferenceMaxCm?: number;
  crownHeightCm?: number;
  visorLengthCm?: number;
}

export interface ApparelSizingSpec {
  apparelSlug: string;
  displayName: string;
  category: "tops" | "bottoms" | "headwear";
  toleranceCm: string;
  sizeList: string[];
  dimensions: Record<string, GarmentDimensions>;
  measuringGuide: {
    point: string;
    description: string;
  }[];
}

export const APPAREL_SIZING_DATA: Record<string, ApparelSizingSpec> = {
  tshirt: {
    apparelSlug: "tshirt",
    displayName: "Kaos Polos & Grafis Combed 24s",
    category: "tops",
    toleranceCm: "±1 - 1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 47, chestCircumferenceCm: 94, bodyLengthCm: 68, shoulderWidthCm: 42, sleeveLengthCm: 21 },
      M: { size: "M", chestWidthCm: 50, chestCircumferenceCm: 100, bodyLengthCm: 71, shoulderWidthCm: 45, sleeveLengthCm: 22 },
      L: { size: "L", chestWidthCm: 53, chestCircumferenceCm: 106, bodyLengthCm: 74, shoulderWidthCm: 48, sleeveLengthCm: 23 },
      XL: { size: "XL", chestWidthCm: 56, chestCircumferenceCm: 112, bodyLengthCm: 76, shoulderWidthCm: 51, sleeveLengthCm: 24 },
      XXL: { size: "XXL", chestWidthCm: 59, chestCircumferenceCm: 118, bodyLengthCm: 78, shoulderWidthCm: 54, sleeveLengthCm: 25 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur lurus dari titik tertinggi bahu/kerah ke ujung bawah kaos." },
      { point: "Lebar Bahu", description: "Diukur mendatar dari jahitan bahu kiri ke jahitan bahu kanan." },
      { point: "Panjang Lengan", description: "Diukur dari ujung jahitan bahu hingga ke ujung ban lengan." },
    ],
  },
  hoodie: {
    apparelSlug: "hoodie",
    displayName: "Heavyweight Boxy Hoodie Fleece",
    category: "tops",
    toleranceCm: "±1.5 - 2 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 54, chestCircumferenceCm: 108, bodyLengthCm: 66, shoulderWidthCm: 50, sleeveLengthCm: 58 },
      M: { size: "M", chestWidthCm: 57, chestCircumferenceCm: 114, bodyLengthCm: 69, shoulderWidthCm: 53, sleeveLengthCm: 60 },
      L: { size: "L", chestWidthCm: 60, chestCircumferenceCm: 120, bodyLengthCm: 72, shoulderWidthCm: 56, sleeveLengthCm: 62 },
      XL: { size: "XL", chestWidthCm: 63, chestCircumferenceCm: 126, bodyLengthCm: 75, shoulderWidthCm: 59, sleeveLengthCm: 64 },
      XXL: { size: "XXL", chestWidthCm: 66, chestCircumferenceCm: 132, bodyLengthCm: 77, shoulderWidthCm: 62, sleeveLengthCm: 65 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur dari titik samping sambungan tudung ke ujung rib pinggang." },
      { point: "Lebar Bahu", description: "Diukur mendatar potongan drop-shoulder dari sambungan kiri ke kanan." },
      { point: "Panjang Lengan", description: "Diukur dari jahitan drop-shoulder ke ujung pergelangan manset." },
    ],
  },
  longsleeve: {
    apparelSlug: "longsleeve",
    displayName: "Kaos Lengan Panjang Combed 24s",
    category: "tops",
    toleranceCm: "±1 - 1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 47, chestCircumferenceCm: 94, bodyLengthCm: 68, shoulderWidthCm: 42, sleeveLengthCm: 58 },
      M: { size: "M", chestWidthCm: 50, chestCircumferenceCm: 100, bodyLengthCm: 71, shoulderWidthCm: 45, sleeveLengthCm: 60 },
      L: { size: "L", chestWidthCm: 53, chestCircumferenceCm: 106, bodyLengthCm: 74, shoulderWidthCm: 48, sleeveLengthCm: 62 },
      XL: { size: "XL", chestWidthCm: 56, chestCircumferenceCm: 112, bodyLengthCm: 76, shoulderWidthCm: 51, sleeveLengthCm: 64 },
      XXL: { size: "XXL", chestWidthCm: 59, chestCircumferenceCm: 118, bodyLengthCm: 78, shoulderWidthCm: 54, sleeveLengthCm: 66 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur dari titik tertinggi bahu ke hem bawah kaos." },
      { point: "Panjang Lengan", description: "Diukur dari jahitan bahu ke ujung rib pergelangan tangan." },
    ],
  },
  crewneck: {
    apparelSlug: "crewneck",
    displayName: "Sweater Crewneck Fleece 280",
    category: "tops",
    toleranceCm: "±1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 52, chestCircumferenceCm: 104, bodyLengthCm: 67, shoulderWidthCm: 48, sleeveLengthCm: 59 },
      M: { size: "M", chestWidthCm: 55, chestCircumferenceCm: 110, bodyLengthCm: 70, shoulderWidthCm: 51, sleeveLengthCm: 61 },
      L: { size: "L", chestWidthCm: 58, chestCircumferenceCm: 116, bodyLengthCm: 73, shoulderWidthCm: 54, sleeveLengthCm: 63 },
      XL: { size: "XL", chestWidthCm: 61, chestCircumferenceCm: 122, bodyLengthCm: 75, shoulderWidthCm: 57, sleeveLengthCm: 64 },
      XXL: { size: "XXL", chestWidthCm: 64, chestCircumferenceCm: 128, bodyLengthCm: 77, shoulderWidthCm: 60, sleeveLengthCm: 65 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur dari titik samping sambungan kerah rib ke ujung rib pinggang." },
      { point: "Panjang Lengan", description: "Diukur dari jahitan bahu ke ujung manset rib pergelangan tangan." },
    ],
  },
  sweater: {
    apparelSlug: "sweater",
    displayName: "Sweater Fleece Premium",
    category: "tops",
    toleranceCm: "±1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 52, chestCircumferenceCm: 104, bodyLengthCm: 67, shoulderWidthCm: 48, sleeveLengthCm: 59 },
      M: { size: "M", chestWidthCm: 55, chestCircumferenceCm: 110, bodyLengthCm: 70, shoulderWidthCm: 51, sleeveLengthCm: 61 },
      L: { size: "L", chestWidthCm: 58, chestCircumferenceCm: 116, bodyLengthCm: 73, shoulderWidthCm: 54, sleeveLengthCm: 63 },
      XL: { size: "XL", chestWidthCm: 61, chestCircumferenceCm: 122, bodyLengthCm: 75, shoulderWidthCm: 57, sleeveLengthCm: 64 },
      XXL: { size: "XXL", chestWidthCm: 64, chestCircumferenceCm: 128, bodyLengthCm: 77, shoulderWidthCm: 60, sleeveLengthCm: 65 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur dari titik samping kerah rib ke ujung rib pinggang." },
    ],
  },
  shirt: {
    apparelSlug: "shirt",
    displayName: "Coach Jacket Streetwear",
    category: "tops",
    toleranceCm: "±1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 53, chestCircumferenceCm: 106, bodyLengthCm: 69, shoulderWidthCm: 47, sleeveLengthCm: 61 },
      M: { size: "M", chestWidthCm: 56, chestCircumferenceCm: 112, bodyLengthCm: 71, shoulderWidthCm: 50, sleeveLengthCm: 62 },
      L: { size: "L", chestWidthCm: 59, chestCircumferenceCm: 118, bodyLengthCm: 74, shoulderWidthCm: 53, sleeveLengthCm: 64 },
      XL: { size: "XL", chestWidthCm: 62, chestCircumferenceCm: 124, bodyLengthCm: 76, shoulderWidthCm: 56, sleeveLengthCm: 65 },
      XXL: { size: "XXL", chestWidthCm: 65, chestCircumferenceCm: 130, bodyLengthCm: 78, shoulderWidthCm: 59, sleeveLengthCm: 66 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan saat kancing tertutup." },
      { point: "Panjang Badan", description: "Diukur dari titik bahu tertinggi ke tali serut hem bawah." },
      { point: "Panjang Lengan", description: "Diukur dari jahitan bahu luar ke ujung karet manset." },
    ],
  },
  pants: {
    apparelSlug: "pants",
    displayName: "Celana Panjang Cargo / Chino",
    category: "bottoms",
    toleranceCm: "±2 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", waistMinCm: 70, waistMaxCm: 78, bodyLengthCm: 98, thighCircumferenceCm: 58, legOpeningCm: 36 },
      M: { size: "M", waistMinCm: 74, waistMaxCm: 84, bodyLengthCm: 100, thighCircumferenceCm: 61, legOpeningCm: 38 },
      L: { size: "L", waistMinCm: 80, waistMaxCm: 90, bodyLengthCm: 102, thighCircumferenceCm: 64, legOpeningCm: 40 },
      XL: { size: "XL", waistMinCm: 86, waistMaxCm: 96, bodyLengthCm: 104, thighCircumferenceCm: 67, legOpeningCm: 42 },
      XXL: { size: "XXL", waistMinCm: 92, waistMaxCm: 102, bodyLengthCm: 105, thighCircumferenceCm: 70, legOpeningCm: 44 },
    },
    measuringGuide: [
      { point: "Lingkar Pinggang", description: "Diukur melingkari pinggang celana dari kondisi relaks hingga melar elastis." },
      { point: "Panjang Celana", description: "Diukur lurus dari ban pinggang atas hingga ujung bukaan kaki bawah." },
      { point: "Lingkar Paha", description: "Diukur melingkar di titik paha terlebar di bawah selangkangan." },
    ],
  },
  shorts: {
    apparelSlug: "shorts",
    displayName: "Celana Pendek Santai / Boardshorts",
    category: "bottoms",
    toleranceCm: "±1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", waistMinCm: 68, waistMaxCm: 82, bodyLengthCm: 42, thighCircumferenceCm: 56, legOpeningCm: 52 },
      M: { size: "M", waistMinCm: 72, waistMaxCm: 88, bodyLengthCm: 44, thighCircumferenceCm: 59, legOpeningCm: 54 },
      L: { size: "L", waistMinCm: 76, waistMaxCm: 94, bodyLengthCm: 46, thighCircumferenceCm: 62, legOpeningCm: 56 },
      XL: { size: "XL", waistMinCm: 82, waistMaxCm: 100, bodyLengthCm: 48, thighCircumferenceCm: 65, legOpeningCm: 58 },
      XXL: { size: "XXL", waistMinCm: 88, waistMaxCm: 106, bodyLengthCm: 50, thighCircumferenceCm: 68, legOpeningCm: 60 },
    },
    measuringGuide: [
      { point: "Lingkar Pinggang", description: "Diukur melingkar ban pinggang karet." },
      { point: "Panjang Celana", description: "Diukur dari bagian atas ban pinggang hingga hem bawah celana pendek." },
    ],
  },
  cap: {
    apparelSlug: "cap",
    displayName: "Topi Baseball Cotton Twill",
    category: "headwear",
    toleranceCm: "±1 cm",
    sizeList: ["All Size"],
    dimensions: {
      "All Size": { size: "All Size", headCircumferenceMinCm: 54, headCircumferenceMaxCm: 62, crownHeightCm: 12, visorLengthCm: 7.5, bodyLengthCm: 12 },
    },
    measuringGuide: [
      { point: "Lingkar Kepala", description: "Dapat diatur dengan gesper belakang (54 cm - 62 cm)." },
      { point: "Tinggi Mahkota (Crown)", description: "Kedalaman topi dari kancing atas hingga tepi dasar." },
      { point: "Panjang Lidah (Visor)", description: "Panjang visor depan pelindung sinar matahari." },
    ],
  },
};

export function getApparelSizing(apparelSlug: string = "tshirt"): ApparelSizingSpec {
  return APPAREL_SIZING_DATA[apparelSlug] || APPAREL_SIZING_DATA.tshirt;
}

export function formatGarmentDimensions(dims: GarmentDimensions): string {
  const parts: string[] = [];

  if (dims.chestWidthCm) {
    parts.push(`Lebar Dada ${dims.chestWidthCm} cm`);
  }
  if (dims.bodyLengthCm) {
    parts.push(`Panjang ${dims.bodyLengthCm} cm`);
  }
  if (dims.waistMinCm && dims.waistMaxCm) {
    parts.push(`Pinggang ${dims.waistMinCm}-${dims.waistMaxCm} cm`);
  }
  if (dims.shoulderWidthCm) {
    parts.push(`Bahu ${dims.shoulderWidthCm} cm`);
  }
  if (dims.sleeveLengthCm) {
    parts.push(`Lengan ${dims.sleeveLengthCm} cm`);
  }

  return parts.join(" • ");
}

/**
 * Menghitung faktor skala 3D (X, Y, Z) relatif terhadap ukuran referensi (L = 1.0)
 * berdasarkan tabel fisik APPAREL_SIZING_DATA.
 * S -> lebih ramping & pendek
 * M -> proporsional sedang
 * L -> 1.0 (baseline acuan 3D)
 * XL -> lebih lebar & panjang
 * XXL -> ekstra lebar & panjang
 */
export function getApparelSizeScaleFactors(apparelSlug: string = "tshirt", size: string = "L"): {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
} {
  const spec = getApparelSizing(apparelSlug);
  const refDim = spec.dimensions["L"] || spec.dimensions["All Size"] || Object.values(spec.dimensions)[0];
  const curDim = spec.dimensions[size.toUpperCase()] || spec.dimensions[size] || refDim;

  if (!refDim || !curDim) {
    return { scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0 };
  }

  let ratioW = 1.0;
  let ratioH = 1.0;

  if (spec.category === "tops") {
    const refW = refDim.chestWidthCm || 53;
    const curW = curDim.chestWidthCm || refW;
    ratioW = curW / refW;

    const refH = refDim.bodyLengthCm || 74;
    const curH = curDim.bodyLengthCm || refH;
    ratioH = curH / refH;
  } else if (spec.category === "bottoms") {
    const refW = refDim.waistMinCm || 34;
    const curW = curDim.waistMinCm || refW;
    ratioW = curW / refW;

    const refH = refDim.bodyLengthCm || 100;
    const curH = curDim.bodyLengthCm || refH;
    ratioH = curH / refH;
  } else {
    // Headwear
    const refC = refDim.headCircumferenceMinCm || 56;
    const curC = curDim.headCircumferenceMinCm || refC;
    ratioW = curC / refC;
    ratioH = 1.0;
  }

  // Batasi rentang variasi yang wajar (0.85 - 1.15) agar model garmen tetap estetis & stabil
  const scaleX = Math.max(0.85, Math.min(1.15, ratioW));
  const scaleY = Math.max(0.85, Math.min(1.15, ratioH));
  const scaleZ = Math.max(0.85, Math.min(1.15, (scaleX + 1.0) / 2));

  return { scaleX, scaleY, scaleZ };
}
