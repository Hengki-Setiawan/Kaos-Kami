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
 * Offset kerah = (collarBaselineY − decalY) × meshMultiplier (faktor 36.0 lama
 * terbukti SALAH Sep 2026 — diganti multiplier agar konsisten dengan sumbu X).
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
  /** Y kerah di mesh (unit 3D), TERUKUR per apparel (0.14–0.18).
   * Konversi ke cm SELALU via meshMultiplier apparel tsb (bukan konstanta
   * global) — setiap apparel diskala dari mesh-nya sendiri (audit #15).
   * Rumus offset = (collarBaselineY − decalY) × meshMultiplier. */
  collarBaselineY: number;
  /** Tudung (hoodie SAJA, riset Sep 2026: panel hood 15–20cm, tengah tudung,
   * press datar hindari jahitan). Unit 3D, dikalibrasi visualiteratif —
   * ukur ulang bila mesh ganti. Non-hoodie: undefined = tak didukung. */
  maxHoodWidthCm?: number;
  maxHoodHeightCm?: number;
  hoodAnchorY?: number;
  hoodAnchorZ?: number;
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
    // Tudung belakang: panel 18×14cm (riset: standar 15–20cm), jangkar
    // TERUKUR dari bbox GLB (bukan tebakan): mesh tudung y 1.588–1.926,
    // z-belakang −0.115, center() −(y 1.42, z −0.02) → runtime y 0.168–0.506
    // (tengah 0.34), z-belakang −0.095. Ukur ulang bila mesh ganti.
    maxHoodWidthCm: 18.0,
    maxHoodHeightCm: 14.0,
    hoodAnchorY: 0.34,
    hoodAnchorZ: 0.095,
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
      : targetSide === "hood"
      ? (spec.maxHoodWidthCm ?? 0)
      : spec.maxFrontWidthCm;
  return maxW / spec.meshMultiplier;
}

/**
 * Faktor fit sisi (0..1) agar artwork muat box sisi TANPA distorsi.
 * Dipakai renderer (ukuran tampil = ukuran produksi, audit) + compute dims.
 */
export function fitScaleToSideBox(
  apparelType: string = "tshirt",
  targetSide: DecalTargetSide = "front",
  scale: number,
  aspectRatio: number = 1.0
): number {
  const spec =
    APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS["tshirt"] ?? APPAREL_PHYSICAL_SPECS[Object.keys(APPAREL_PHYSICAL_SPECS)[0] as string]!;
  const maxW =
    targetSide === "back"
      ? spec.maxBackWidthCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveWidthCm
      : targetSide === "hood"
      ? (spec.maxHoodWidthCm ?? 0)
      : spec.maxFrontWidthCm;
  const maxH =
    targetSide === "back"
      ? spec.maxBackHeightCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveHeightCm
      : targetSide === "hood"
      ? (spec.maxHoodHeightCm ?? 0)
      : spec.maxFrontHeightCm;
  const aspect = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawW = scale * spec.meshMultiplier;
  const rawH = rawW / aspect;
  if (maxW <= 0 || maxH <= 0) return 1;
  return Math.min(1, maxW / Math.max(rawW, 0.01), maxH / Math.max(rawH, 0.01));
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
  } else if (targetSide === "hood") {
    // Hoodie saja; non-hoodie max 0 → validasi sisi menolak di hulu.
    maxWidth = spec.maxHoodWidthCm ?? 0;
    maxHeight = spec.maxHoodHeightCm ?? 0;
  }

  // Scale-fit proporsional ke box sisi (audit: clamp lebar-dulu lalu tinggi
  // dari lebar-terjepit = distorsi + isWithin selalu true/tautologi).
  // Artwork portrait dikecilkan utuh agar muat, bukan dipaksa gepeng.
  const validAspectRatio = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawWidth = decalScale * spec.meshMultiplier;
  const rawHeight = rawWidth / validAspectRatio;
  const fitK = Math.min(1, maxWidth / Math.max(rawWidth, 0.01), maxHeight / Math.max(rawHeight, 0.01));
  const widthCm = Math.max(3.5, Math.round(rawWidth * fitK * 10) / 10);
  const heightCm = Math.max(3.5, Math.round(rawHeight * fitK * 10) / 10);

  // Konversi posisi Y ke jarak turun dari kerah dalam cm — via meshMultiplier
  // apparel ini (audit #15: faktor 36.0 lama SALAH, hasilnya ~1/3 jarak asli).
  const normalizedDistance = Math.max(0, spec.collarBaselineY - decalY);
  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round(normalizedDistance * spec.meshMultiplier * 10) / 10
  );

  // Validasi terhadap ukuran MENTAH (pre-fit): cukup-tidaknya box dinilai
  // sebelum dijepit, bukan sesudah (audit: tautologi selalu-true).
  const fitsBox = rawWidth <= maxWidth + 1e-6 && rawHeight <= maxHeight + 1e-6;
  const isWithinProductionLimits = fitsBox;
  const formattedText = `${widthCm.toFixed(1)} cm × ${heightCm.toFixed(1)} cm (Maks ${maxWidth} cm)`;

  return {
    widthCm,
    heightCm,
    offsetFromCollarCm,
    isWithinProductionLimits,
    formattedText,
  };
}
