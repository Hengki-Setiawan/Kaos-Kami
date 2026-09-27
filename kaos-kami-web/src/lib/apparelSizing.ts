/**
 * STANDAR UKURAN FISIK APPAREL (SIZE CHART SSOT)
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
    displayName: "Sweater Crewneck Terry Cotton",
    category: "tops",
    toleranceCm: "±1 - 1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 52, chestCircumferenceCm: 104, bodyLengthCm: 66, shoulderWidthCm: 48, sleeveLengthCm: 57 },
      M: { size: "M", chestWidthCm: 55, chestCircumferenceCm: 110, bodyLengthCm: 69, shoulderWidthCm: 51, sleeveLengthCm: 59 },
      L: { size: "L", chestWidthCm: 58, chestCircumferenceCm: 116, bodyLengthCm: 72, shoulderWidthCm: 54, sleeveLengthCm: 61 },
      XL: { size: "XL", chestWidthCm: 61, chestCircumferenceCm: 122, bodyLengthCm: 75, shoulderWidthCm: 57, sleeveLengthCm: 63 },
      XXL: { size: "XXL", chestWidthCm: 64, chestCircumferenceCm: 128, bodyLengthCm: 77, shoulderWidthCm: 60, sleeveLengthCm: 64 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari bawah ketiak kiri ke ketiak kanan." },
      { point: "Panjang Badan", description: "Diukur dari titik samping kerah rib leher ke rib pinggang bawah." },
      { point: "Panjang Lengan", description: "Diukur dari jahitan bahu sampai ujung rib lengan." },
    ],
  },
  shirt: {
    apparelSlug: "shirt",
    displayName: "Streetwear Coach Jacket Taslan",
    category: "tops",
    toleranceCm: "±1 - 1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", chestWidthCm: 52, chestCircumferenceCm: 104, bodyLengthCm: 68, shoulderWidthCm: 46, sleeveLengthCm: 59 },
      M: { size: "M", chestWidthCm: 55, chestCircumferenceCm: 110, bodyLengthCm: 71, shoulderWidthCm: 49, sleeveLengthCm: 61 },
      L: { size: "L", chestWidthCm: 58, chestCircumferenceCm: 116, bodyLengthCm: 74, shoulderWidthCm: 52, sleeveLengthCm: 63 },
      XL: { size: "XL", chestWidthCm: 61, chestCircumferenceCm: 122, bodyLengthCm: 76, shoulderWidthCm: 55, sleeveLengthCm: 65 },
      XXL: { size: "XXL", chestWidthCm: 64, chestCircumferenceCm: 128, bodyLengthCm: 78, shoulderWidthCm: 58, sleeveLengthCm: 66 },
    },
    measuringGuide: [
      { point: "Lebar Dada", description: "Diukur mendatar dari ketiak ke ketiak jaket terkancing rapat." },
      { point: "Panjang Badan", description: "Diukur dari sambungan kerah leher belakang hingga keliman bawah." },
      { point: "Panjang Lengan", description: "Diukur dari batas bahu sampai ke manset pergelangan tangan." },
    ],
  },
  pants: {
    apparelSlug: "pants",
    displayName: "Celana Panjang Streetwear Sweatpants",
    category: "bottoms",
    toleranceCm: "±1 - 2 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", waistMinCm: 74, waistMaxCm: 82, bodyLengthCm: 96, thighCircumferenceCm: 58, legOpeningCm: 30 },
      M: { size: "M", waistMinCm: 78, waistMaxCm: 86, bodyLengthCm: 98, thighCircumferenceCm: 60, legOpeningCm: 32 },
      L: { size: "L", waistMinCm: 82, waistMaxCm: 90, bodyLengthCm: 100, thighCircumferenceCm: 62, legOpeningCm: 34 },
      XL: { size: "XL", waistMinCm: 86, waistMaxCm: 94, bodyLengthCm: 102, thighCircumferenceCm: 64, legOpeningCm: 36 },
      XXL: { size: "XXL", waistMinCm: 90, waistMaxCm: 100, bodyLengthCm: 104, thighCircumferenceCm: 66, legOpeningCm: 38 },
    },
    measuringGuide: [
      { point: "Lingkar Pinggang", description: "Diukur melingkar pada ban pinggang (kondisi relaks hingga ditarik wajar)." },
      { point: "Panjang Celana", description: "Diukur dari bagian paling atas pinggang hingga ke keliman pergelangan kaki." },
      { point: "Lingkar Paha", description: "Diukur melingkar pada bagian paha terlebar di bawah pesak." },
      { point: "Open Leg", description: "Lebar lingkar bukaan ujung bawah celana." },
    ],
  },
  shorts: {
    apparelSlug: "shorts",
    displayName: "Celana Pendek Baby Terry Sweatshorts",
    category: "bottoms",
    toleranceCm: "±1 - 1.5 cm",
    sizeList: ["S", "M", "L", "XL", "XXL"],
    dimensions: {
      S: { size: "S", waistMinCm: 70, waistMaxCm: 80, bodyLengthCm: 44, thighCircumferenceCm: 56 },
      M: { size: "M", waistMinCm: 74, waistMaxCm: 84, bodyLengthCm: 46, thighCircumferenceCm: 58 },
      L: { size: "L", waistMinCm: 78, waistMaxCm: 88, bodyLengthCm: 48, thighCircumferenceCm: 60 },
      XL: { size: "XL", waistMinCm: 82, waistMaxCm: 94, bodyLengthCm: 50, thighCircumferenceCm: 62 },
      XXL: { size: "XXL", waistMinCm: 86, waistMaxCm: 100, bodyLengthCm: 52, thighCircumferenceCm: 64 },
    },
    measuringGuide: [
      { point: "Lingkar Pinggang", description: "Diukur melingkar pada karet pinggang elastis." },
      { point: "Panjang Celana", description: "Diukur dari ban pinggang atas hingga keliman bawah paha." },
      { point: "Lingkar Paha", description: "Diukur melingkar pada lubang paha bawah." },
    ],
  },
  cap: {
    apparelSlug: "cap",
    displayName: "Topi Baseball Cotton Twill",
    category: "headwear",
    toleranceCm: "±0.5 - 1 cm",
    sizeList: ["ALL SIZE"],
    dimensions: {
      "ALL SIZE": {
        size: "ALL SIZE",
        bodyLengthCm: 12.5,
        headCircumferenceMinCm: 56,
        headCircumferenceMaxCm: 60,
        crownHeightCm: 12.5,
        visorLengthCm: 7.5,
      },
    },
    measuringGuide: [
      { point: "Lingkar Kepala", description: "Lingkar dalam topi dapat disesuaikan menggunakan strap belakang (56 - 60 cm)." },
      { point: "Tinggi Mahkota", description: "Kedalaman lengkung topi dari dasar kening hingga kancing atas (12.5 cm)." },
      { point: "Panjang Visor", description: "Panjang lidah topi depan pelindung matahari (7.5 cm)." },
    ],
  },
};

/**
 * Mengambil spesifikasi ukuran lengkap untuk jenis apparel tertentu.
 */
export function getApparelSizing(apparelSlug: string = "tshirt"): ApparelSizingSpec {
  let normalized = (apparelSlug || "tshirt").toLowerCase().trim();
  if (normalized === "tee") normalized = "tshirt";
  if (normalized === "sweater") normalized = "crewneck";
  const found = APPAREL_SIZING_DATA[normalized] || APPAREL_SIZING_DATA.tshirt || Object.values(APPAREL_SIZING_DATA)[0];
  return found!;
}

/**
 * Mengambil dimensi satuan untuk apparel dan ukuran tertentu.
 */
export function getSizeDimensions(apparelSlug: string = "tshirt", size: string = "L"): GarmentDimensions {
  const spec = getApparelSizing(apparelSlug);
  const normalizedSize = (size || "L").toUpperCase().trim();
  return spec.dimensions[normalizedSize] || spec.dimensions["L"] || Object.values(spec.dimensions)[0]!;
}

/**
 * Menghasilkan ringkasan dimensi 1-baris yang rapi dan elegan untuk preview di kustomizer.
 */
export function formatQuickDimensions(apparelSlug: string = "tshirt", size: string = "L"): string {
  const spec = getApparelSizing(apparelSlug);
  const dims = getSizeDimensions(apparelSlug, size);

  if (spec.category === "headwear") {
    return `Lingkar Kepala ${dims.headCircumferenceMinCm}-${dims.headCircumferenceMaxCm} cm • Tinggi ${dims.crownHeightCm} cm • Lidah ${dims.visorLengthCm} cm`;
  }

  if (spec.category === "bottoms") {
    const waistStr = dims.waistMinCm && dims.waistMaxCm ? `Pinggang ${dims.waistMinCm}-${dims.waistMaxCm} cm` : "";
    const pahaStr = dims.thighCircumferenceCm ? `Paha ${dims.thighCircumferenceCm} cm` : "";
    return [`Panjang ${dims.bodyLengthCm} cm`, waistStr, pahaStr].filter(Boolean).join(" • ");
  }

  // Tops (Kaos, Hoodie, Longsleeve, Crewneck, Jacket)
  const parts: string[] = [];
  if (dims.chestWidthCm) {
    parts.push(`Lebar Dada ${dims.chestWidthCm} cm`);
  }
  if (dims.chestCircumferenceCm) {
    parts.push(`Lingkar ${dims.chestCircumferenceCm} cm`);
  }
  if (dims.bodyLengthCm) {
    parts.push(`Panjang ${dims.bodyLengthCm} cm`);
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
