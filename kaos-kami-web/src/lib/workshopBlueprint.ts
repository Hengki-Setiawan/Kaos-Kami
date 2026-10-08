// SSOT Engine Kalkulasi Blueprint 2D Meja Sablon DTF (Workshop Flat Garment Spec).
// Digunakan oleh Admin Production Dashboard, Order Inspector, dan Job Ticket PDF.
// Menghitung jarak presisi fisik real-cm terhadap jahitan kerah, jahitan samping kiri/kanan,
// garis tengah dada (centerline), dan jahitan kelim bawah garmen saat dihamparkan datar di meja press.

import { APPAREL_SIZING_DATA } from "./apparelSizing";

export interface FlatPlacementCalculation {
  apparelType: string;
  apparelName: string;
  size: string;
  targetSide: "front" | "back" | "left_sleeve" | "right_sleeve" | "side_left" | "side_right";
  chestWidthCm: number;
  bodyLengthCm: number;
  collarDropCm: number;
  printWidthCm: number;
  printHeightCm: number;
  offsetFromCollarCm: number;
  leftSeamMarginCm: number;
  rightSeamMarginCm: number;
  bottomHemMarginCm: number;
  centerlineOffsetCm: number;
  alignmentLabel: string;
  isSymmetric: boolean;
  operatorStepGuide: string[];
}

export interface ComputeFlatPlacementParams {
  apparelType?: string | null;
  size?: string | null;
  targetSide?: string | null;
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  offsetFromCollarCm?: number | null;
  decalX?: number | null;
  decalY?: number | null;
}

/**
 * Menghitung parameter fisik penempatan sablon DTF pada garmen datar di meja heat press.
 * Menghubungkan koordinat 3D UV decal ke dimensi fisik real-world centimeter (SOP konveksi).
 */
export function computeFlatWorkshopPlacement(
  params: ComputeFlatPlacementParams
): FlatPlacementCalculation {
  const rawApparel = (params.apparelType || "tshirt").toLowerCase();
  const slug =
    rawApparel.includes("hoodie")
      ? "hoodie"
      : rawApparel.includes("longsleeve") || rawApparel.includes("panjang")
      ? "longsleeve"
      : rawApparel.includes("sweater") || rawApparel.includes("crewneck")
      ? "crewneck"
      : rawApparel.includes("jacket") || rawApparel.includes("coach")
      ? "coach_jacket"
      : "tshirt";

  const sizeKey = (params.size || "L").toUpperCase();
  const validSize = ["S", "M", "L", "XL", "XXL"].includes(sizeKey) ? sizeKey : "L";

  // Ambil dimensi riil garmen dari tabel ukuran resmi
  const sizingSpec = APPAREL_SIZING_DATA[slug] || APPAREL_SIZING_DATA["tshirt"];
  const dim = sizingSpec?.dimensions?.[validSize] || {
    chestWidthCm: 53,
    bodyLengthCm: 74,
  };

  const chestWidthCm = dim.chestWidthCm || 53;
  const bodyLengthCm = dim.bodyLengthCm || 74;

  const rawSide = (params.targetSide || "front").toLowerCase();
  const targetSide: FlatPlacementCalculation["targetSide"] =
    rawSide.includes("back") || rawSide.includes("belakang") || rawSide.includes("punggung")
      ? "back"
      : rawSide.includes("left_sleeve") || (rawSide.includes("lengan") && rawSide.includes("kiri"))
      ? "left_sleeve"
      : rawSide.includes("right_sleeve") || (rawSide.includes("lengan") && rawSide.includes("kanan"))
      ? "right_sleeve"
      : rawSide.includes("side_left") || (rawSide.includes("samping") && rawSide.includes("kiri"))
      ? "side_left"
      : rawSide.includes("side_right") || (rawSide.includes("samping") && rawSide.includes("kanan"))
      ? "side_right"
      : "front";

  const isSleeve = targetSide === "left_sleeve" || targetSide === "right_sleeve";
  const isSide = targetSide === "side_left" || targetSide === "side_right";

  // Standar industri kedalaman kerah dari puncak bahu
  const collarDropCm = targetSide === "back" ? 3.5 : isSleeve || isSide ? 0 : 8.5;

  // Ukuran cetak film DTF (clamped maks 30.0 cm sesuai standar A3 heat press)
  const printWidthCm = Math.max(
    3.0,
    Math.min(isSleeve ? 10.0 : isSide ? 14.0 : 30.0, Math.round((params.printWidthCm ?? (isSleeve ? 8.0 : isSide ? 12.0 : 28.0)) * 10) / 10)
  );
  const printHeightCm = Math.max(
    3.0,
    Math.min(isSleeve ? 16.0 : isSide ? 38.0 : 42.0, Math.round((params.printHeightCm ?? (isSleeve ? 8.0 : isSide ? 24.0 : 35.0)) * 10) / 10)
  );

  // Offset vertikal dari jahitan acuan
  const defaultOffset =
    isSleeve
      ? 10.0 // 10cm dari jahitan bahu
      : isSide
      ? 14.0 // 14cm dari titik ketiak
      : targetSide === "back"
      ? 8.0
      : printWidthCm <= 12.0
      ? 8.0 // Logo dada kecil / pocket
      : 6.5; // Desain dada besar (aturan 2-3 jari dewasa)

  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round((params.offsetFromCollarCm ?? defaultOffset) * 10) / 10
  );

  // Kalkulasi orientasi horizontal (Centerline vs Dada Kiri/Kanan)
  let centerlineOffsetCm = 0.0;
  let alignmentLabel =
    targetSide === "back"
      ? "Punggung Tengah (Simetris)"
      : targetSide === "left_sleeve"
      ? "Lengan Kiri Luar (Center)"
      : targetSide === "right_sleeve"
      ? "Lengan Kanan Luar (Center)"
      : targetSide === "side_left"
      ? "Rusuk Samping Kiri"
      : targetSide === "side_right"
      ? "Rusuk Samping Kanan"
      : "Dada Tengah (Simetris)";
  let isSymmetric = true;

  if (params.decalX !== undefined && params.decalX !== null) {
    const derivedOffset = Math.round(params.decalX * 202 * 10) / 10;
    if (derivedOffset < -3.5) {
      centerlineOffsetCm = derivedOffset;
      alignmentLabel = "Dada Kiri (Pocket Area)";
      isSymmetric = false;
    } else if (derivedOffset > 3.5) {
      centerlineOffsetCm = derivedOffset;
      alignmentLabel = "Dada Kanan";
      isSymmetric = false;
    }
  } else if (rawSide.includes("pocket") || rawSide.includes("dada_kiri") || (printWidthCm <= 12 && rawSide === "front_left")) {
    centerlineOffsetCm = -9.0;
    alignmentLabel = "Dada Kiri (Pocket Area)";
    isSymmetric = false;
  }

  // Margin horizontal ke jahitan samping kiri & kanan
  const referenceWidth = isSleeve ? 22.0 : isSide ? 18.0 : chestWidthCm;
  const halfChest = referenceWidth / 2;
  const leftSeamMarginCm = Math.max(
    1.0,
    Math.round((halfChest + centerlineOffsetCm - printWidthCm / 2) * 10) / 10
  );
  const rightSeamMarginCm = Math.max(
    1.0,
    Math.round((referenceWidth - printWidthCm - leftSeamMarginCm) * 10) / 10
  );

  // Margin vertikal ke jahitan kelim bawah
  const effectiveLength = isSleeve ? 24.0 : isSide ? 50.0 : Math.max(20.0, bodyLengthCm - collarDropCm);
  const bottomHemMarginCm = Math.max(
    1.0,
    Math.round((effectiveLength - offsetFromCollarCm - printHeightCm) * 10) / 10
  );

  const displayName = sizingSpec?.displayName || "T-Shirt Cotton Combed 24s";

  // Panduan langkah kerja untuk operator meja press
  const operatorStepGuide = isSleeve
    ? [
        `Gelar lengan ${targetSide === "left_sleeve" ? "kiri" : "kanan"} di atas platen lengan (sleeve platen) atau meja press dengan permukaan rata.`,
        `Tarik meteran dari jahitan pundak/bahu: posisikan batas atas sablon tepat ${offsetFromCollarCm.toFixed(1)} cm di bawah jahitan sambungan bahu.`,
        `Pastikan sablon berada di tengah lekukan lengan: sisa jarak ke manset ujung lengan adalah ${bottomHemMarginCm.toFixed(1)} cm.`,
        `Press suhu 160°C selama 15 detik, biarkan dingin total (Cold Peel), lalu finishing press 5 detik dengan lembar teflon.`,
      ]
    : isSide
    ? [
        `Posisikan panel rusuk samping ${targetSide === "side_left" ? "kiri" : "kanan"} mendatar di atas meja heat press.`,
        `Tarik meteran dari titik ketiak: posisikan atas sablon tepat ${offsetFromCollarCm.toFixed(1)} cm di bawah jahitan ketiak.`,
        `Pastikan arah tipografi vertikal lurus sejajar jahitan samping dengan sisa margin kelim bawah ${bottomHemMarginCm.toFixed(1)} cm.`,
        `Press suhu 160°C selama 15 detik, biarkan dingin total (Cold Peel), lalu finishing press 5 detik dengan lembar teflon.`,
      ]
    : [
        `Ratakan ${displayName} (Size ${validSize}) di atas meja heat press 40×50 cm bebas kerutan.`,
        `Tarik meteran dari rib kerah: posisikan tepi atas film PET tepat ${offsetFromCollarCm.toFixed(1)} cm di bawah jahitan kerah.`,
        isSymmetric
          ? `Pastikan posisi simetris: jarak ke jahitan samping kiri dan kanan masing-masing ${leftSeamMarginCm.toFixed(1)} cm.`
          : `Posisikan offset ${alignmentLabel}: ${leftSeamMarginCm.toFixed(1)} cm dari jahitan samping kiri dan ${rightSeamMarginCm.toFixed(1)} cm dari jahitan kanan.`,
        `Sisa jarak ke lipatan kelim bawah adalah ${bottomHemMarginCm.toFixed(1)} cm.`,
        `Press suhu 160°C selama 15 detik (tekanan 4–5 bar), biarkan dingin total (Cold Peel), lalu finishing press 5 detik dengan lembar teflon.`,
      ];

  return {
    apparelType: slug,
    apparelName: displayName,
    size: validSize,
    targetSide,
    chestWidthCm,
    bodyLengthCm,
    collarDropCm,
    printWidthCm,
    printHeightCm,
    offsetFromCollarCm,
    leftSeamMarginCm,
    rightSeamMarginCm,
    bottomHemMarginCm,
    centerlineOffsetCm,
    alignmentLabel,
    isSymmetric,
    operatorStepGuide,
  };
}
