/**
 * REAL-WORLD PHYSICAL SCALE CALIBRATION (3D-to-CM Mapping)
 * Standardized for DTF Sablon Workshop in Kota Makassar.
 * Max printable width is clamped strictly to 30.0 cm (standard A3 DTF printhead roll limit).
 */

export const REAL_WORLD_PRINT_LIMITS = {
  maxPrintWidthCm: 30.0, // Batas maksimal lebar roll DTF 30cm
  maxPrintHeightCm: 42.0, // Batas maksimal tinggi format A3+
  chestWidthReferenceCm: {
    tshirt: 54.0, // Size L Chest Width
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
 * @param decalScale Skala decal (0.15 s/d 1.2)
 * @param decalY Posisi Y decal (-0.75 s/d 0.75)
 * @param aspectRatio Rasio aspek gambar (width / height), default 1.0 (persegi)
 */
export function computePhysicalPrintDimensions(
  apparelType: string = "tshirt",
  decalScale: number = 0.5,
  decalY: number = -0.05,
  aspectRatio: number = 1.0
): PhysicalPrintDimension {
  // Hitung lebar fisik mentah berbasis batas A3 DTF 30cm
  // decalScale 1.0 = 30.0 cm lebar cetak penuh
  const rawWidth = decalScale * REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm;
  const widthCm = Math.min(
    REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm,
    Math.max(4.0, Math.round(rawWidth * 10) / 10)
  );

  // Hitung tinggi proporsional berdasarkan rasio gambar
  const validAspectRatio = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawHeight = widthCm / validAspectRatio;
  const heightCm = Math.min(
    REAL_WORLD_PRINT_LIMITS.maxPrintHeightCm,
    Math.max(4.0, Math.round(rawHeight * 10) / 10)
  );

  // Konversi posisi Y ke jarak turun dari kerah (collar baseline) dalam cm
  // Titik collar diestimasi pada Y = 0.28 pada mesh kaos
  const collarBaselineY = 0.28;
  const normalizedDistance = Math.max(0, collarBaselineY - decalY);
  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round(normalizedDistance * 32.0 * 10) / 10
  );

  const isWithinProductionLimits =
    widthCm <= REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm &&
    heightCm <= REAL_WORLD_PRINT_LIMITS.maxPrintHeightCm;

  const formattedText = `${widthCm.toFixed(1)} cm × ${heightCm.toFixed(1)} cm (Maks 30 cm)`;

  return {
    widthCm,
    heightCm,
    offsetFromCollarCm,
    isWithinProductionLimits,
    formattedText,
  };
}
