/**
 * REAL-WORLD PHYSICAL SCALE CALIBRATION (3D-to-CM Mapping)
 * Standardized for DTF Sablon Workshop in Kota Makassar.
 * Based on international garment sizing charts and DTF print limits.
 *
 * KALIBRASI TERUKUR (Sep 2026): multiplier LAMA (175-185) SALAH ~1.8x.
 * Nilai baru diukur langsung dari bounding-box geometri GLB
 * (script ukur: min/max accessor POSITION) dibagi lebar dada acuan:
 *   unitsToCm = chestWidthCm / meshWidthUnits
 * - tshirt: 56 / 0.550 = 101.8
 * - longsleeve: 56 / 0.794 = 70.5
 * - hoodie & crewneck (mesh hoodie.glb sama): 60 / 0.631 = 95.1 / 58 / 0.631 = 91.9
 * - shirt (coach jacket, lengan terentang 2.0 unit): kalibrasi via TINGGI
 *   74 / 1.065 = 69.5 agar area dada proporsional.
 * Faktor Y offset kerah (36.0) EMPIRIS — dikalibrasi ke standar industri
 * 3 inch (7.6cm) drop kerah untuk full-front (bukan dari proporsi sculpt).
 */

import type { DecalTargetSide } from "./constants";

export interface ApparelSpec {
  name: string;
  chestWidthCm: number;
  bodyLengthCm: number;
  maxFrontWidthCm: number;
  maxFrontHeightCm: number;
  maxBackWidthCm: number;
  maxBackHeightCm: number;
  maxSleeveWidthCm: number;
  maxSleeveHeightCm: number;
  meshMultiplier: number;
  /** Lebar mesh terukur (unit 3D) — bukti kalibrasi, JANGAN diubah tanpa ukur ulang GLB. */
  measuredMeshWidthUnits: number;
  /** Jangkar X lengan di mesh (unit 3D) — posisi jahitan bahu terukur per apparel. */
  sleeveAnchorX: number;
  collarBaselineY: number;
}

export const APPAREL_PHYSICAL_SPECS: Record<string, ApparelSpec> = {
  tshirt: {
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 12.0,
    meshMultiplier: 101.8, // TERUKUR: 56.0cm / 0.550 unit (tshirt-heavyweight.glb)
    measuredMeshWidthUnits: 0.55,
    sleeveAnchorX: 0.27,
    collarBaselineY: 0.18,
  },
  longsleeve: {
    name: "Heavyweight Longsleeve",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 42.0, // Longsleeve typography down the entire arm
    meshMultiplier: 70.5, // TERUKUR: 56.0cm / 0.794 unit (longsleeve.glb)
    measuredMeshWidthUnits: 0.794,
    sleeveAnchorX: 0.36,
    collarBaselineY: 0.18,
  },
  crewneck: {
    name: "Heavyweight Crewneck",
    chestWidthCm: 58.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 38.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 40.0,
    meshMultiplier: 91.9, // TERUKUR: 58.0cm / 0.631 unit (mesh hoodie.glb yang dipakai crewneck)
    measuredMeshWidthUnits: 0.631,
    sleeveAnchorX: 0.29,
    collarBaselineY: 0.17,
  },
  hoodie: {
    name: "Heavyweight Oversized Hoodie",
    chestWidthCm: 60.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 28.0, // Dibatasi oleh Saku Kangaroo
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 42.0,
    meshMultiplier: 95.1, // TERUKUR: 60.0cm / 0.631 unit (hoodie.glb)
    measuredMeshWidthUnits: 0.631,
    sleeveAnchorX: 0.29,
    collarBaselineY: 0.14,
  },
  shirt: {
    name: "Streetwear Coach Jacket",
    chestWidthCm: 58.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 14.0, // Terpisah oleh Resleting Depan
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 38.0,
    meshMultiplier: 69.5, // TERUKUR via tinggi: 74.0cm / 1.065 unit (jacket.glb lengan terentang, lebar 2.0 tidak representatif)
    measuredMeshWidthUnits: 2.0,
    sleeveAnchorX: 0.9,
    collarBaselineY: 0.16,
  },
};

export const REAL_WORLD_PRINT_LIMITS = {
  maxPrintWidthCm: 30.0,
  maxPrintHeightCm: 42.0,
  /** Batas visual minimal decal (unit 3D) — ≈3.5–4cm di semua apparel. */
  minDecalScaleUnits: 0.04,
  chestWidthReferenceCm: {
    tshirt: 56.0,
    longsleeve: 56.0,
    crewneck: 58.0,
    hoodie: 60.0,
    shirt: 58.0,
  } as Record<string, number>,
};

/**
 * Skala 3D MAKSIMAL agar klaim cm-nya tepat menyentuh batas cetak sisi tsb:
 * maxScale = maxWidthCm / multiplier. Tanpa ini, multiplier benar justru
 * mengunci pengguna di 16.5cm (0.162 warisan multiplier 185 yang salah).
 */
export function maxDecalScaleUnits(
  apparelType: string = "tshirt",
  targetSide: DecalTargetSide = "front"
): number {
  const spec =
    APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS["tshirt"] ?? APPAREL_PHYSICAL_SPECS[Object.keys(APPAREL_PHYSICAL_SPECS)[0] as string]!;
  const maxW =
    targetSide === "back"
      ? spec.maxBackWidthCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveWidthCm
      : spec.maxFrontWidthCm;
  return maxW / spec.meshMultiplier;
}

export interface PhysicalPrintDimension {
  widthCm: number;
  heightCm: number;
  offsetFromCollarCm: number;
  isWithinProductionLimits: boolean;
  formattedText: string;
}

/**
 * Konversi skala dan posisi 3D UV decal ke ukuran sentimeter fisik nyata garmen.
 * Rasio dikalibrasi 1:1 terhadap cetak sablon DTF (Maksimal 30.0 cm).
 * @param apparelType Jenis pakaian ("tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt")
 * @param decalScale Skala decal 3D (0.04 s/d 0.165)
 * @param decalY Posisi Y decal (-0.35 s/d 0.35)
 * @param aspectRatio Rasio aspek gambar nyata (width / height), default 1.0
 * @param targetSide Sisi pakaian ("front" | "back" | "left_sleeve" | "right_sleeve")
 */
export function computePhysicalPrintDimensions(
  apparelType: string = "tshirt",
  decalScale: number = 0.11,
  decalY: number = -0.05,
  aspectRatio: number = 1.0,
  targetSide: DecalTargetSide = "front"
): PhysicalPrintDimension {
  const spec: ApparelSpec = APPAREL_PHYSICAL_SPECS[apparelType] || APPAREL_PHYSICAL_SPECS["tshirt"] || {
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 12.0,
    meshMultiplier: 101.8,
    measuredMeshWidthUnits: 0.55,
    sleeveAnchorX: 0.27,
    collarBaselineY: 0.18,
  };
  
  let maxWidth = spec.maxFrontWidthCm;
  let maxHeight = spec.maxFrontHeightCm;

  if (targetSide === "back") {
    maxWidth = spec.maxBackWidthCm;
    maxHeight = spec.maxBackHeightCm;
  } else if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    maxWidth = spec.maxSleeveWidthCm;
    maxHeight = spec.maxSleeveHeightCm;
  }

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
