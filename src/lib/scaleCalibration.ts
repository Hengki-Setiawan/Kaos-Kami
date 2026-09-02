/**
 * REAL-WORLD PHYSICAL SCALE CALIBRATION (3D-to-CM Mapping)
 * Standardized for DTF Sablon Workshop in Kota Makassar.
 * Based on international garment sizing charts and DTF print limits.
 */

export interface ApparelSpec {
  name: string;
  chestWidthCm: number;
  bodyLengthCm: number;
  maxFrontWidthCm: number;
  maxFrontHeightCm: number;
  maxBackWidthCm: number;
  maxBackHeightCm: number;
  meshMultiplier: number;
  collarBaselineY: number;
}

export const APPAREL_PHYSICAL_SPECS: Record<string, ApparelSpec> = {
  tshirt: {
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 54.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    meshMultiplier: 60.0,
    collarBaselineY: 0.28,
  },
  longsleeve: {
    name: "Heavyweight Longsleeve",
    chestWidthCm: 54.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    meshMultiplier: 60.0,
    collarBaselineY: 0.28,
  },
  crewneck: {
    name: "Heavyweight Crewneck",
    chestWidthCm: 58.0,
    bodyLengthCm: 70.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 38.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    meshMultiplier: 56.0,
    collarBaselineY: 0.26,
  },
  hoodie: {
    name: "Heavyweight Oversized Hoodie",
    chestWidthCm: 60.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 28.0, // Terhalang oleh batas saku samping
    maxFrontHeightCm: 24.0, // Dibatasi oleh Saku Kangaroo di bawah
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0, // Punggung bebas format A3+
    meshMultiplier: 55.0,
    collarBaselineY: 0.22,
  },
  shirt: {
    name: "Streetwear Coach Jacket",
    chestWidthCm: 58.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 14.0, // Terpisah oleh Resleting / Kancing Depan
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0, // Punggung bebas format A3+
    meshMultiplier: 58.0,
    collarBaselineY: 0.25,
  },
};

export const REAL_WORLD_PRINT_LIMITS = {
  maxPrintWidthCm: 30.0,
  maxPrintHeightCm: 42.0,
  chestWidthReferenceCm: {
    tshirt: 54.0,
    longsleeve: 54.0,
    crewneck: 58.0,
    hoodie: 60.0,
    shirt: 58.0,
  } as Record<string, number>,
};

export interface PhysicalPrintDimension {
  widthCm: number;
  heightCm: number;
  offsetFromCollarCm: number;
  isWithinProductionLimits: boolean;
  formattedText: string;
}

/**
 * Konversi skala dan posisi 3D UV decal ke ukuran sentimeter fisik nyata garmen.
 * @param apparelType Jenis pakaian ("tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt")
 * @param decalScale Skala decal (0.12 s/d 0.85)
 * @param decalY Posisi Y decal (-0.75 s/d 0.75)
 * @param aspectRatio Rasio aspek gambar nyata (width / height), default 1.0
 * @param targetSide Sisi pakaian ("front" | "back")
 */
export function computePhysicalPrintDimensions(
  apparelType: string = "tshirt",
  decalScale: number = 0.5,
  decalY: number = -0.05,
  aspectRatio: number = 1.0,
  targetSide: "front" | "back" = "front"
): PhysicalPrintDimension {
  const fallbackSpec: ApparelSpec = {
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 54.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    meshMultiplier: 60.0,
    collarBaselineY: 0.28,
  };
  const spec: ApparelSpec = APPAREL_PHYSICAL_SPECS[apparelType] || APPAREL_PHYSICAL_SPECS["tshirt"] || fallbackSpec;
  const maxWidth = targetSide === "back" ? spec.maxBackWidthCm : spec.maxFrontWidthCm;
  const maxHeight = targetSide === "back" ? spec.maxBackHeightCm : spec.maxFrontHeightCm;

  const rawWidth = decalScale * spec.meshMultiplier;
  const widthCm = Math.min(maxWidth, Math.max(3.5, Math.round(rawWidth * 10) / 10));

  // Hitung tinggi proporsional berdasarkan rasio aspek riil gambar
  const validAspectRatio = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawHeight = widthCm / validAspectRatio;
  const heightCm = Math.min(maxHeight, Math.max(3.5, Math.round(rawHeight * 10) / 10));

  // Konversi posisi Y ke jarak turun dari kerah dalam cm
  const normalizedDistance = Math.max(0, spec.collarBaselineY - decalY);
  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round(normalizedDistance * 36.0 * 10) / 10
  );

  const isWithinProductionLimits = widthCm <= maxWidth && heightCm <= maxHeight;
  const formattedText = `${widthCm.toFixed(1)} cm × ${heightCm.toFixed(1)} cm (Maks ${maxWidth} cm)`;

  return {
    widthCm,
    heightCm,
    offsetFromCollarCm,
    isWithinProductionLimits,
    formattedText,
  };
}
