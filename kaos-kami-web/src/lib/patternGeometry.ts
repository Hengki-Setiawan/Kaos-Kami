// src/lib/patternGeometry.ts — Geometri pola DATAR 2D (satuan cm) per apparel.
// Satu sumber kebenaran untuk: kanvas pola Fabric, sinkron 2D<->3D DecalLayer,
// dan ekspor master cetak 300 DPI. Angka panel dari APPAREL_PHYSICAL_SPECS
// (lebar dada & panjang badan) + maxSleeve* (area sablon lengan).
import type { ApparelType, DecalTargetSide } from "./constants";
import { APPAREL_PHYSICAL_SPECS } from "./scaleCalibration";

export type PatternPanel = "front" | "back" | "left_sleeve" | "right_sleeve" | "hood";

export function getPanelsForApparel(apparel: ApparelType): Array<{ id: PatternPanel; label: string }> {
  if (apparel === "cap") {
    return [
      { id: "front", label: "Mahkota Depan" },
      { id: "back", label: "Belakang / Strap" },
    ];
  }
  if (apparel === "pants" || apparel === "shorts") {
    return [
      { id: "front", label: "Paha Depan" },
      { id: "back", label: "Belakang" },
    ];
  }
  if (apparel === "hoodie") {
    return [
      { id: "front", label: "Depan" },
      { id: "back", label: "Belakang" },
      { id: "left_sleeve", label: "Lengan Kiri" },
      { id: "right_sleeve", label: "Lengan Kanan" },
      { id: "hood", label: "Tudung" },
    ];
  }
  return [
    { id: "front", label: "Depan" },
    { id: "back", label: "Belakang" },
    { id: "left_sleeve", label: "Lengan Kiri" },
    { id: "right_sleeve", label: "Lengan Kanan" },
  ];
}

export interface PanelGeometry {
  /** Lebar panel cm */
  wCm: number;
  /** Tinggi panel cm */
  hCm: number;
  /** Batas sablon cm (lebar × tinggi), untuk panduan + validasi */
  printWcm: number;
  printHcm: number;
  /** Label manusiawi */
  label: string;
}

/** Geometri panel per apparel (cm). */
export function getPanelGeometry(apparel: ApparelType, panel: PatternPanel): PanelGeometry {
  const spec = APPAREL_PHYSICAL_SPECS[apparel] ?? APPAREL_PHYSICAL_SPECS.tshirt!;
  if (panel === "front" || panel === "back") {
    const isCap = apparel === "cap";
    const isPantsOrShorts = apparel === "pants" || apparel === "shorts";
    let label = panel === "front" ? "Depan" : "Belakang";
    if (isCap) {
      label = panel === "front" ? "Mahkota Depan" : "Belakang / Strap";
    } else if (isPantsOrShorts) {
      label = panel === "front" ? "Paha Depan" : "Belakang";
    }
    return {
      wCm: spec.chestWidthCm,
      hCm: spec.bodyLengthCm,
      printWcm: panel === "front" ? spec.maxFrontWidthCm : spec.maxBackWidthCm,
      printHcm: panel === "front" ? spec.maxFrontHeightCm : spec.maxBackHeightCm,
      label,
    };
  }
  if (panel === "hood") {
    // Panel tudung (hoodie saja): artboard + margin.
    // Non-hoodie: max 0 → UI menyembunyikan tab (lihat PANELS filter).
    const hw = spec.maxHoodWidthCm ?? 0;
    const hh = spec.maxHoodHeightCm ?? 0;
    return {
      wCm: Math.max(1, hw * 1.4),
      hCm: Math.max(1, hh * 1.4),
      printWcm: hw,
      printHcm: hh,
      label: "Tudung (Hood)",
    };
  }
  // Panel lengan: artboard proporsional mengakomodasi busur kerung lengan (sleeve cap)
  // di atas dan kelim manset di bawah, dengan area cetak DTF terpusat aman di tengah.
  const sleeveArtboardH =
    apparel === "tshirt"
      ? 18.0
      : Math.max(22, (spec.maxSleeveHeightCm ?? 14.0) * 1.25);
  return {
    wCm: Math.max(14, spec.maxSleeveWidthCm * 2.2),
    hCm: sleeveArtboardH,
    printWcm: spec.maxSleeveWidthCm,
    printHcm: spec.maxSleeveHeightCm,
    label: panel === "left_sleeve" ? "Lengan Kiri" : "Lengan Kanan",
  };
}

/** Konversi unit 3D -> cm (faktor TERUKUR per apparel). */
export function unitsToCm(apparel: ApparelType, units: number): number {
  return units * (APPAREL_PHYSICAL_SPECS[apparel]?.meshMultiplier ?? 202.0);
}

/** Konversi cm -> unit 3D. */
export function cmToUnits(apparel: ApparelType, cm: number): number {
  return cm / (APPAREL_PHYSICAL_SPECS[apparel]?.meshMultiplier ?? 202.0);
}

/** DPI master produksi. 1 cm = 118.11 px pada 300 DPI. */
export const PRINT_DPI = 300;
export const PX_PER_CM_300DPI = PRINT_DPI / 2.54;

/** Resolusi kanvas EDITOR (px per cm) — snap 1,25mm, masih ringan untuk HP.
 * Dipakai simetris (× dan ÷) di patternSync + editor per-panel sehingga aman naik
 * dari 6 (audit #17). Ekspor 300 DPI tak terpengaruh (faktor k terpisah). */
export const EDITOR_PX_PER_CM = 8;

export interface PanelOrigin {
  /** X origin dalam cm dari tepi kiri kanvas pola */
  xCm: number;
  /** Y origin dalam cm dari tepi atas kanvas pola */
  yCm: number;
  /** X origin dalam px editor */
  xPx: number;
  /** Y origin dalam px editor */
  yPx: number;
  /** Posisi Y kerah (neckline terdalam) dalam cm dari tepi atas */
  collarYCm: number;
}

/**
 * Titik acuan origin (0, 0) 3D di atas kanvas pola 2D.
 * SSOT PARITAS MATEMATIS 1:1:
 * - Di 3D, origin (0, 0) adalah area Dada (Chest) yang berjarak
 *   collarBaselineY * meshMultiplier cm di bawah garis kerah (~7.5 cm / 3 inci distro).
 * - Di 2D, garis kerah terendah berada pada collarYCm dari puncak kanvas.
 * - Maka titik Y origin di 2D = collarYCm + (collarBaselineY * meshMultiplier).
 * - Sumbu X di 2D selalu di tengah lebar kanvas (wCm / 2).
 * - Panel lengan dan tudung berpusat di tengah kanvasnya masing-masing.
 */
export function getPanelOrigin(apparel: ApparelType, panel: PatternPanel): PanelOrigin {
  const geo = getPanelGeometry(apparel, panel);
  const spec = APPAREL_PHYSICAL_SPECS[apparel] ?? APPAREL_PHYSICAL_SPECS.tshirt!;
  const xCm = geo.wCm / 2;

  if (panel === "front") {
    if (apparel === "cap") {
      const collarYCm = 2.0;
      const yCm = geo.hCm * 0.45;
      return {
        xCm,
        yCm,
        xPx: xCm * EDITOR_PX_PER_CM,
        yPx: yCm * EDITOR_PX_PER_CM,
        collarYCm,
      };
    }
    if (apparel === "pants" || apparel === "shorts") {
      const collarYCm = 4.0;
      const distCollarToOriginCm = spec.collarBaselineY * spec.meshMultiplier;
      const yCm = collarYCm + distCollarToOriginCm;
      return {
        xCm,
        yCm,
        xPx: xCm * EDITOR_PX_PER_CM,
        yPx: yCm * EDITOR_PX_PER_CM,
        collarYCm,
      };
    }

    const collarYCm =
      apparel === "hoodie" ? 8.0 : apparel === "crewneck" ? 8.5 : apparel === "shirt" ? 8.0 : 9.0;
    const distCollarToOriginCm = spec.collarBaselineY * spec.meshMultiplier;
    const yCm = collarYCm + distCollarToOriginCm;
    return {
      xCm,
      yCm,
      xPx: xCm * EDITOR_PX_PER_CM,
      yPx: yCm * EDITOR_PX_PER_CM,
      collarYCm,
    };
  }

  if (panel === "back") {
    if (apparel === "cap") {
      const collarYCm = 2.0;
      const yCm = geo.hCm * 0.45;
      return {
        xCm,
        yCm,
        xPx: xCm * EDITOR_PX_PER_CM,
        yPx: yCm * EDITOR_PX_PER_CM,
        collarYCm,
      };
    }
    if (apparel === "pants" || apparel === "shorts") {
      const collarYCm = 4.0;
      const distCollarToOriginCm = spec.collarBaselineY * spec.meshMultiplier;
      const yCm = collarYCm + distCollarToOriginCm;
      return {
        xCm,
        yCm,
        xPx: xCm * EDITOR_PX_PER_CM,
        yPx: yCm * EDITOR_PX_PER_CM,
        collarYCm,
      };
    }

    const collarYCm = 4.5; // Kerah belakang landai (neck drop 2.0 cm)
    // Standar Industri Distro Sablon Punggung:
    // Titik pusat sablon punggung (back origin 0,0) berada di area belikat atas (upper-mid back),
    // berjarak 16.5 cm di bawah garis kerah belakang.
    // Dengan demikian sablon poster A4/A3 (tinggi 20-30 cm) akan duduk aman di punggung
    // dengan batas atas ~5.5 cm di bawah kerah (100% identik dengan tampilan 3D, tidak menembus kerah).
    const distCollarToOriginCm = 16.5;
    const yCm = collarYCm + distCollarToOriginCm;
    return {
      xCm,
      yCm,
      xPx: xCm * EDITOR_PX_PER_CM,
      yPx: yCm * EDITOR_PX_PER_CM,
      collarYCm,
    };
  }

  // Lengan & Tudung: origin di tengah artboard
  const yCm = geo.hCm / 2;
  return {
    xCm,
    yCm,
    xPx: xCm * EDITOR_PX_PER_CM,
    yPx: yCm * EDITOR_PX_PER_CM,
    collarYCm: 0,
  };
}

export interface PrintBounds {
  /** Posisi X tengah box cetak (px) */
  leftPx: number;
  /** Posisi Y tengah box cetak (px) */
  topPx: number;
  /** Lebar box cetak (px) */
  widthPx: number;
  /** Tinggi box cetak (px) */
  heightPx: number;
  /** Margin atas dari kerah (cm) */
  topFromCollarCm: number;
}

/**
 * Posisi & dimensi area sablon cetak (kotak hijau) di atas kanvas 2D.
 * Standard DTF Sablon Workshop Kota Makassar:
 * - Depan: mulai 5.0 cm di bawah kerah (hoodie 4.0 cm), tinggi printHcm.
 * - Belakang: mulai 4.0 cm di bawah kerah, tinggi printHcm.
 * - Lengan & Tudung: terpusat pada panel.
 */
export function getPrintBounds(apparel: ApparelType, panel: PatternPanel): PrintBounds {
  const geo = getPanelGeometry(apparel, panel);
  const origin = getPanelOrigin(apparel, panel);
  const widthPx = Math.round(geo.printWcm * EDITOR_PX_PER_CM);
  const heightPx = Math.round(geo.printHcm * EDITOR_PX_PER_CM);

  if (apparel === "cap" || apparel === "pants" || apparel === "shorts") {
    return {
      leftPx: origin.xPx,
      topPx: origin.yPx,
      widthPx,
      heightPx,
      topFromCollarCm: 0,
    };
  }

  if (panel === "front" || panel === "back") {
    const topFromCollarCm = panel === "front" ? (apparel === "hoodie" ? 4.0 : 5.0) : 4.0;
    const topEdgeCm = origin.collarYCm + topFromCollarCm;
    const centerCm = topEdgeCm + geo.printHcm / 2;
    return {
      leftPx: origin.xPx,
      topPx: Math.round(centerCm * EDITOR_PX_PER_CM),
      widthPx,
      heightPx,
      topFromCollarCm,
    };
  }

  return {
    leftPx: origin.xPx,
    topPx: origin.yPx,
    widthPx,
    heightPx,
    topFromCollarCm: 0,
  };
}

