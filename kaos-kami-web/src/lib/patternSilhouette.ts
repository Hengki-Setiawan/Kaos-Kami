// src/lib/patternSilhouette.ts — Sketsa datar (flat technical sketch) per panel,
// digambar prosedural dari geometri cm. INI PANDUAN VISUAL penempatan sablon,
// bukan pola jahit produksi (tidak termasuk seam allowance / grading size).
import type { ApparelType } from "./constants";
import { getPanelGeometry, type PatternPanel } from "./patternGeometry";

export interface Silhouette {
  viewBox: string;
  /** Path outline badan */
  body: string;
  /** Path detail (kerah, saku, resleting, manset) */
  details: string[];
  /** Path garis jahitan (dashed di render) */
  stitches: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Siluet flat lay kaos / garment torso (depan & belakang).
 * Skala 1 unit = 1 cm, proporsional terhadap lebar dada (w) dan panjang badan (h).
 */
function buildTorsoSilhouette(
  apparel: ApparelType,
  w: number,
  h: number,
  isBack = false
): Silhouette {
  const cx = w / 2;
  const isLong = apparel === "longsleeve";
  const isHoodie = apparel === "hoodie";
  const isCrewneck = apparel === "crewneck";
  const isJacket = apparel === "shirt";

  // Dimensi kerah (cm)
  const collarW = w * 0.34; // ~19 cm pada kaos 56 cm
  const collarDepth = isBack ? 2.5 : isHoodie ? 4.5 : isCrewneck ? 6.5 : 7.5;

  // Titik anatomi bahu & lengan
  const shoulderSpan = w * 0.46; // ~25.8 cm dari tengah (total bentang bahu 51.5 cm)
  const shoulderY = 7.0;

  // Bentang lengan luar
  const sleeveDropX = isLong ? w * 0.49 : w * 0.485;
  const sleeveDropY = isLong ? 36.0 : 21.5;

  // Ketiak (underarm)
  const underarmX = w * 0.445; // ~24.9 cm (lebar badan dada 49.8 cm)
  const underarmY = 24.0;

  // Kelim bawah (bottom hem)
  const hemX = w * 0.45; // ~25.2 cm (lebar bawah badan 50.4 cm)
  const hemY = h - 2.0;

  const body = [
    // Kerah tengah
    `M ${r2(cx - collarW / 2)} 2.5`,
    `Q ${r2(cx)} ${r2(2.5 + collarDepth)} ${r2(cx + collarW / 2)} 2.5`,
    // Bahu kanan
    `L ${r2(cx + shoulderSpan)} ${r2(shoulderY)}`,
    // Lengan kanan luar
    `L ${r2(cx + sleeveDropX)} ${r2(sleeveDropY)}`,
    // Kelim manset lengan kanan
    `L ${r2(cx + underarmX)} ${r2(underarmY)}`,
    // Sisi kanan badan
    `L ${r2(cx + hemX)} ${r2(hemY)}`,
    // Kelim bawah badan
    `L ${r2(cx - hemX)} ${r2(hemY)}`,
    // Sisi kiri badan
    `L ${r2(cx - underarmX)} ${r2(underarmY)}`,
    // Kelim manset lengan kiri
    `L ${r2(cx - sleeveDropX)} ${r2(sleeveDropY)}`,
    // Bahu kiri
    `L ${r2(cx - shoulderSpan)} ${r2(shoulderY)}`,
    "Z",
  ].join(" ");

  const details: string[] = [];
  const stitches: string[] = [];

  // Garis jahitan kelim bawah (double stitch)
  stitches.push(`M ${r2(cx - hemX)} ${r2(h - 4.5)} L ${r2(cx + hemX)} ${r2(h - 4.5)}`);
  stitches.push(`M ${r2(cx - hemX)} ${r2(h - 5.5)} L ${r2(cx + hemX)} ${r2(h - 5.5)}`);

  // Ribbing kerah
  const ribOffset = isBack ? 1.4 : 2.0;
  details.push(
    `M ${r2(cx - collarW / 2)} 2.5 Q ${r2(cx)} ${r2(2.5 + collarDepth + ribOffset)} ${r2(cx + collarW / 2)} 2.5`
  );

  // Jahitan manset lengan
  stitches.push(
    `M ${r2(cx + sleeveDropX)} ${r2(sleeveDropY - 2.5)} L ${r2(cx + underarmX)} ${r2(underarmY - 2.5)}`
  );
  stitches.push(
    `M ${r2(cx - sleeveDropX)} ${r2(sleeveDropY - 2.5)} L ${r2(cx - underarmX)} ${r2(underarmY - 2.5)}`
  );

  // Detail khusus Hoodie
  if (isHoodie) {
    if (!isBack) {
      // Kantung kanguru depan
      const pTopW = w * 0.32;
      const pBotW = w * 0.44;
      const pTopY = h * 0.58;
      const pBotY = h * 0.88;
      details.push(
        [
          `M ${r2(cx - pTopW / 2)} ${r2(pTopY)}`,
          `L ${r2(cx + pTopW / 2)} ${r2(pTopY)}`,
          `L ${r2(cx + pBotW / 2)} ${r2(pBotY)}`,
          `L ${r2(cx - pBotW / 2)} ${r2(pBotY)}`,
          "Z",
        ].join(" ")
      );
      // Tali tudung (drawstrings)
      details.push(`M ${r2(cx - 3)} ${r2(collarDepth + 3)} L ${r2(cx - 3.5)} ${r2(collarDepth + 15)}`);
      details.push(`M ${r2(cx + 3)} ${r2(collarDepth + 3)} L ${r2(cx + 3.5)} ${r2(collarDepth + 15)}`);
    } else {
      // Siluet tudung belakang leher
      details.push(
        `M ${r2(cx - w * 0.20)} 2.5 Q ${r2(cx)} ${r2(-h * 0.05)} ${r2(cx + w * 0.20)} 2.5`
      );
    }
  }

  // Detail khusus Crewneck
  if (isCrewneck) {
    // Rib waistband bawah
    details.push(`M ${r2(cx - hemX)} ${r2(h - 7)} L ${r2(cx + hemX)} ${r2(h - 7)}`);
  }

  // Detail khusus Coach Jacket / Shirt
  if (isJacket) {
    if (!isBack) {
      // Garis resleting tengah
      details.push(`M ${r2(cx)} ${r2(2.5 + collarDepth)} L ${r2(cx)} ${r2(hemY)}`);
      // Kerah lipat kiri & kanan
      details.push(
        `M ${r2(cx - collarW / 2)} 2.5 L ${r2(cx - collarW * 0.4)} ${r2(collarDepth + 4)} L ${r2(cx)} ${r2(collarDepth + 2)}`
      );
      details.push(
        `M ${r2(cx + collarW / 2)} 2.5 L ${r2(cx + collarW * 0.4)} ${r2(collarDepth + 4)} L ${r2(cx)} ${r2(collarDepth + 2)}`
      );
    }
  }

  if (isBack) {
    // Neck tape line di bagian dalam belakang
    details.push(`M ${r2(cx - collarW * 0.3)} 5.0 L ${r2(cx + collarW * 0.3)} 5.0`);
  }

  return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
}

/**
 * Siluet flat lay lengan (kiri / kanan).
 */
function buildSleeveSilhouette(apparel: ApparelType, w: number, h: number): Silhouette {
  const cx = w / 2;
  const isLong =
    apparel === "longsleeve" ||
    apparel === "hoodie" ||
    apparel === "crewneck" ||
    apparel === "shirt";
  const topW = w * 0.94;
  const botW = isLong ? w * 0.65 : w * 0.82;
  const cuffH = isLong ? h * 0.08 : 3.0;

  // Busur kerung lengan atas (armhole sleeve cap curve)
  const body = [
    `M ${r2(cx - topW / 2)} 5.0`,
    `Q ${r2(cx)} 1.0 ${r2(cx + topW / 2)} 5.0`,
    `L ${r2(cx + botW / 2)} ${r2(h - 2.0)}`,
    `L ${r2(cx - botW / 2)} ${r2(h - 2.0)}`,
    "Z",
  ].join(" ");

  const stitches = [
    `M ${r2(cx - botW / 2)} ${r2(h - 2.0 - cuffH)} L ${r2(cx + botW / 2)} ${r2(h - 2.0 - cuffH)}`,
  ];

  return { viewBox: `0 0 ${w} ${h}`, body, details: [], stitches };
}

/**
 * Siluet flat lay tudung hoodie (hood).
 */
function buildHoodSilhouette(w: number, h: number): Silhouette {
  const cx = w / 2;
  const r = Math.min(w * 0.42, h * 0.44);
  const body = [
    `M ${r2(cx - r)} ${r2(h - 2)}`,
    `L ${r2(cx - r)} ${r2(h * 0.32)}`,
    `Q ${r2(cx - r)} 3 ${r2(cx)} 2`,
    `Q ${r2(cx + r)} 3 ${r2(cx + r)} ${r2(h * 0.35)}`,
    `L ${r2(cx + r)} ${r2(h - 2)}`,
    "Z",
  ].join(" ");

  const stitches = [
    `M ${r2(cx)} 2 L ${r2(cx)} ${r2(h - 2)}`, // Garis lipatan tengah
  ];

  return { viewBox: `0 0 ${w} ${h}`, body, details: [], stitches };
}

/**
 * Siluet flat lay celana / celana pendek (pants / shorts).
 */
function buildPantsSilhouette(w: number, h: number, isShorts = false): Silhouette {
  const cx = w / 2;
  const waistW = w * 0.85;
  const crotchY = isShorts ? h * 0.45 : h * 0.35;
  const legW = w * 0.38;

  const body = [
    `M ${r2(cx - waistW / 2)} 2`,
    `L ${r2(cx + waistW / 2)} 2`,
    `L ${r2(cx + waistW / 2)} ${r2(h - 2)}`,
    `L ${r2(cx + waistW / 2 - legW)} ${r2(h - 2)}`,
    `L ${r2(cx)} ${r2(crotchY)}`,
    `L ${r2(cx - waistW / 2 + legW)} ${r2(h - 2)}`,
    `L ${r2(cx - waistW / 2)} ${r2(h - 2)}`,
    "Z",
  ].join(" ");

  const stitches = [
    `M ${r2(cx - waistW / 2)} 6 L ${r2(cx + waistW / 2)} 6`, // Ban pinggang
  ];

  return { viewBox: `0 0 ${w} ${h}`, body, details: [], stitches };
}

/**
 * SSOT Factory Generator Siluet Pola 2D per apparel dan panel.
 */
export function getPatternSilhouette(apparel: ApparelType, panel: PatternPanel): Silhouette {
  const g = getPanelGeometry(apparel, panel);
  const w = g.wCm;
  const h = g.hCm;

  if (panel === "left_sleeve" || panel === "right_sleeve") {
    return buildSleeveSilhouette(apparel, w, h);
  }

  if (panel === "hood") {
    return buildHoodSilhouette(w, h);
  }

  if (apparel === "pants" || apparel === "shorts") {
    return buildPantsSilhouette(w, h, apparel === "shorts");
  }

  return buildTorsoSilhouette(apparel, w, h, panel === "back");
}
