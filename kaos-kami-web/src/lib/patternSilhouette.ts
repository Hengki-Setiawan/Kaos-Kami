// src/lib/patternSilhouette.ts — Sketsa datar (flat technical sketch) per panel,
// digambar prosedural dari geometri cm. PANDUAN VISUAL workshop & produksi DTF,
// presisi anatomis 1:1 terhadap asset 3D, meja sablon, dan gangsheet cetak.
import type { ApparelType } from "./constants";
import { getPanelGeometry, type PatternPanel } from "./patternGeometry";

export interface Silhouette {
  viewBox: string;
  /** Path outline garmen utama */
  body: string;
  /** Path detail (kerah rib, placket, saku kanguru, kancing, manset) */
  details: string[];
  /** Path garis jahitan presisi (dashed / topstitch di render SVG) */
  stitches: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Siluet flat lay torso garmen (depan & belakang).
 * Skala 1 unit = 1 cm, proporsional terhadap lebar dada (w) dan panjang badan (h).
 * Mendukung: tshirt, longsleeve, crewneck, hoodie, shirt (coach jacket).
 */
function buildTorsoSilhouette(
  apparel: ApparelType,
  w: number,
  h: number,
  isBack = false
): Silhouette {
  const cx = w / 2;
  const isLong =
    apparel === "longsleeve" ||
    apparel === "hoodie" ||
    apparel === "crewneck" ||
    apparel === "shirt";
  const isHoodie = apparel === "hoodie";
  const isCrewneck = apparel === "crewneck";
  const isJacket = apparel === "shirt";

  // Dimensi kerah (cm)
  const collarW = w * 0.34; // ~19 cm pada kaos 56 cm
  const collarDepth = isBack ? 2.0 : isHoodie ? 4.5 : isCrewneck ? 6.5 : isJacket ? 5.5 : 7.5;

  // Titik anatomi bahu & lengan
  const shoulderSpan = w * 0.46; // ~25.8 cm dari tengah (total bentang bahu 51.5 cm)
  const shoulderY = 7.0;

  // Bentang lengan luar: panjang penuh (54cm) untuk lengan panjang, 21.5cm untuk kaos pendek
  const sleeveDropX = isLong ? w * 0.49 : w * 0.485;
  const sleeveDropY = isLong ? 54.0 : 21.5;

  // Ketiak (underarm)
  const underarmX = isLong ? w * 0.435 : w * 0.445;
  const underarmY = 24.0;

  // Kelim bawah (bottom hem)
  const hemX = w * 0.45;
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
    `L ${r2(cx + underarmX)} ${r2(underarmY + (isLong ? 26.0 : 0))}`,
    // Ketiak lengan kanan
    `L ${r2(cx + underarmX)} ${r2(underarmY)}`,
    // Sisi kanan badan
    `L ${r2(cx + hemX)} ${r2(hemY)}`,
    // Kelim bawah badan
    `L ${r2(cx - hemX)} ${r2(hemY)}`,
    // Sisi kiri badan
    `L ${r2(cx - underarmX)} ${r2(underarmY)}`,
    // Ketiak lengan kiri
    `L ${r2(cx - underarmX)} ${r2(underarmY + (isLong ? 26.0 : 0))}`,
    // Kelim manset lengan kiri
    `L ${r2(cx - sleeveDropX)} ${r2(sleeveDropY)}`,
    // Bahu kiri
    `L ${r2(cx - shoulderSpan)} ${r2(shoulderY)}`,
    "Z",
  ].join(" ");

  const details: string[] = [];
  const stitches: string[] = [];

  // Garis jahitan kelim bawah (double needle topstitch)
  stitches.push(`M ${r2(cx - hemX)} ${r2(h - 4.5)} L ${r2(cx + hemX)} ${r2(h - 4.5)}`);
  stitches.push(`M ${r2(cx - hemX)} ${r2(h - 5.5)} L ${r2(cx + hemX)} ${r2(h - 5.5)}`);

  // Ribbing kerah (rib collar contour)
  const ribOffset = isBack ? 1.4 : 2.2;
  details.push(
    `M ${r2(cx - collarW / 2)} 2.5 Q ${r2(cx)} ${r2(2.5 + collarDepth + ribOffset)} ${r2(cx + collarW / 2)} 2.5`
  );

  // Jahitan pundak (shoulder seams)
  stitches.push(`M ${r2(cx - collarW / 2)} 2.5 L ${r2(cx - shoulderSpan)} ${r2(shoulderY)}`);
  stitches.push(`M ${r2(cx + collarW / 2)} 2.5 L ${r2(cx + shoulderSpan)} ${r2(shoulderY)}`);

  // Jahitan manset lengan
  if (isLong) {
    // Manset rib lengan panjang
    details.push(
      `M ${r2(cx + sleeveDropX)} ${r2(sleeveDropY - 5.0)} L ${r2(cx + underarmX)} ${r2(underarmY + 21.0)}`
    );
    details.push(
      `M ${r2(cx - sleeveDropX)} ${r2(sleeveDropY - 5.0)} L ${r2(cx - underarmX)} ${r2(underarmY + 21.0)}`
    );
  } else {
    stitches.push(
      `M ${r2(cx + sleeveDropX)} ${r2(sleeveDropY - 2.5)} L ${r2(cx + underarmX)} ${r2(underarmY - 2.5)}`
    );
    stitches.push(
      `M ${r2(cx - sleeveDropX)} ${r2(sleeveDropY - 2.5)} L ${r2(cx - underarmX)} ${r2(underarmY - 2.5)}`
    );
  }

  // Detail khusus Hoodie
  if (isHoodie) {
    if (!isBack) {
      // Kantung kanguru depan (kangaroo pouch) dengan curved entry
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
      // Jahitan saku kanguru
      stitches.push(
        `M ${r2(cx - pTopW / 2 + 1)} ${r2(pTopY + 1)} L ${r2(cx + pTopW / 2 - 1)} ${r2(pTopY + 1)}`
      );
      // Tali tudung (drawstrings with metal aglets)
      details.push(`M ${r2(cx - 3)} ${r2(collarDepth + 3)} L ${r2(cx - 3.5)} ${r2(collarDepth + 15)}`);
      details.push(`M ${r2(cx + 3)} ${r2(collarDepth + 3)} L ${r2(cx + 3.5)} ${r2(collarDepth + 15)}`);
      // Metal eyelets pada tudung
      details.push(`M ${r2(cx - 3.5)} ${r2(collarDepth + 3)} A 0.5 0.5 0 1 0 ${r2(cx - 2.5)} ${r2(collarDepth + 3)}`);
      details.push(`M ${r2(cx + 2.5)} ${r2(collarDepth + 3)} A 0.5 0.5 0 1 0 ${r2(cx + 3.5)} ${r2(collarDepth + 3)}`);
      // Rib waistband bawah tebal (6.5cm)
      details.push(`M ${r2(cx - hemX)} ${r2(h - 8.5)} L ${r2(cx + hemX)} ${r2(h - 8.5)}`);
    } else {
      // Siluet tudung belakang leher jatuh di bahu
      details.push(
        `M ${r2(cx - w * 0.22)} 2.5 Q ${r2(cx)} ${r2(-h * 0.04)} ${r2(cx + w * 0.22)} 2.5`
      );
      // Rib waistband bawah
      details.push(`M ${r2(cx - hemX)} ${r2(h - 8.5)} L ${r2(cx + hemX)} ${r2(h - 8.5)}`);
    }
  }

  // Detail khusus Crewneck
  if (isCrewneck) {
    // Rib waistband bawah tebal (6.5cm)
    details.push(`M ${r2(cx - hemX)} ${r2(h - 8.5)} L ${r2(cx + hemX)} ${r2(h - 8.5)}`);
    if (!isBack) {
      // Classic vintage V-notch stitch triangle di tengah bawah kerah
      stitches.push(
        `M ${r2(cx - 2.5)} ${r2(2.5 + collarDepth + ribOffset)} L ${r2(cx)} ${r2(2.5 + collarDepth + ribOffset + 4.0)} L ${r2(cx + 2.5)} ${r2(2.5 + collarDepth + ribOffset)}`
      );
    }
  }

  // Detail khusus Coach Jacket / Shirt
  if (isJacket) {
    if (!isBack) {
      // Garis bukaan kancing / placket tengah
      details.push(`M ${r2(cx)} ${r2(2.5 + collarDepth)} L ${r2(cx)} ${r2(hemY)}`);
      details.push(`M ${r2(cx + 2)} ${r2(2.5 + collarDepth)} L ${r2(cx + 2)} ${r2(hemY)}`);
      // Kancing snap button logam (6 butir)
      for (let i = 0; i < 6; i++) {
        const by = 2.5 + collarDepth + 8.0 + i * 9.0;
        if (by < hemY - 4) {
          details.push(`M ${r2(cx + 1 - 0.6)} ${r2(by)} A 0.6 0.6 0 1 0 ${r2(cx + 1 + 0.6)} ${r2(by)}`);
        }
      }
      // Kerah lipat shirt (spread collar lapels)
      details.push(
        `M ${r2(cx - collarW / 2)} 2.5 L ${r2(cx - collarW * 0.45)} ${r2(collarDepth + 5.0)} L ${r2(cx)} ${r2(collarDepth + 2.0)}`
      );
      details.push(
        `M ${r2(cx + collarW / 2)} 2.5 L ${r2(cx + collarW * 0.45)} ${r2(collarDepth + 5.0)} L ${r2(cx)} ${r2(collarDepth + 2.0)}`
      );
      // Saku samping (welt hip pockets)
      details.push(`M ${r2(cx - w * 0.38)} ${r2(h * 0.70)} L ${r2(cx - w * 0.22)} ${r2(h * 0.74)}`);
      details.push(`M ${r2(cx + w * 0.38)} ${r2(h * 0.70)} L ${r2(cx + w * 0.22)} ${r2(h * 0.74)}`);
    } else {
      // Yoke seam belakang (horizontal back yoke)
      stitches.push(`M ${r2(cx - shoulderSpan)} ${r2(shoulderY + 6.0)} L ${r2(cx + shoulderSpan)} ${r2(shoulderY + 6.0)}`);
    }
  }

  // Back View Universal Neck Tape (pita penguat leher belakang)
  if (isBack) {
    details.push(`M ${r2(cx - collarW * 0.35)} 4.5 L ${r2(cx + collarW * 0.35)} 4.5`);
    stitches.push(`M ${r2(cx - collarW * 0.35)} 5.0 L ${r2(cx + collarW * 0.35)} 5.0`);
  }

  return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
}

/**
 * Siluet flat lay pola lengan (kiri / kanan).
 * Pola presisi industri garment:
 * - Busur kerung lengan (S-curve sleeve cap) di atas
 * - Taper proporsional ke bawah
 * - Manset rajut rib bertekstur (lengan panjang) / kelim jarum ganda (kaos)
 * - Garis sumbu tengah vertikal (fold/print alignment axis)
 */
function buildSleeveSilhouette(apparel: ApparelType, w: number, h: number): Silhouette {
  const cx = w / 2;
  const isLong =
    apparel === "longsleeve" ||
    apparel === "hoodie" ||
    apparel === "crewneck" ||
    apparel === "shirt";

  const topW = w * 0.92;
  const botW = isLong ? w * 0.58 : w * 0.82;
  const cuffH = isLong ? 5.5 : 2.5;

  const capHeight = isLong ? 7.0 : 4.5;
  const capY = 2.0;
  const underarmY = capY + capHeight;

  const leftUnderX = cx - topW / 2;
  const rightUnderX = cx + topW / 2;
  const crownY = capY;

  const body = [
    `M ${r2(leftUnderX)} ${r2(underarmY)}`,
    // S-curve kerung lengan kiri ke puncak mahkota bahu
    `C ${r2(cx - topW * 0.32)} ${r2(underarmY + 0.5)}, ${r2(cx - topW * 0.18)} ${r2(crownY)}, ${r2(cx)} ${r2(crownY)}`,
    // S-curve puncak bahu ke kerung lengan kanan
    `C ${r2(cx + topW * 0.18)} ${r2(crownY)}, ${r2(cx + topW * 0.32)} ${r2(underarmY + 0.5)}, ${r2(rightUnderX)} ${r2(underarmY)}`,
    // Garis kelim samping kanan
    `L ${r2(cx + botW / 2)} ${r2(h - 2.0)}`,
    // Kelim manset ujung bawah
    `L ${r2(cx - botW / 2)} ${r2(h - 2.0)}`,
    // Garis kelim samping kiri
    "Z",
  ].join(" ");

  const details: string[] = [];
  const stitches: string[] = [];

  // Garis sumbu tengah vertikal (fold axis & print crosshair)
  stitches.push(`M ${r2(cx)} ${r2(crownY)} L ${r2(cx)} ${r2(h - 2.0)}`);

  if (isLong) {
    // Manset Rib elastis lengan panjang
    details.push(
      `M ${r2(cx - botW / 2)} ${r2(h - 2.0 - cuffH)} L ${r2(cx + botW / 2)} ${r2(h - 2.0 - cuffH)}`
    );
    // Garis tekstur rajutan rib vertikal
    const numRibs = 7;
    for (let i = 1; i <= numRibs; i++) {
      const rx = (cx - botW / 2) + (botW / (numRibs + 1)) * i;
      details.push(`M ${r2(rx)} ${r2(h - 2.0 - cuffH)} L ${r2(rx)} ${r2(h - 2.0)}`);
    }
  } else {
    // Kelim jarum ganda untuk kaos pendek
    stitches.push(
      `M ${r2(cx - botW / 2)} ${r2(h - 2.0 - cuffH)} L ${r2(cx + botW / 2)} ${r2(h - 2.0 - cuffH)}`
    );
    stitches.push(
      `M ${r2(cx - botW / 2)} ${r2(h - 2.0 - cuffH + 0.6)} L ${r2(cx + botW / 2)} ${r2(h - 2.0 - cuffH + 0.6)}`
    );
  }

  return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
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
 * Siluet flat lay topi baseball (cap).
 * Ukuran w: 20 cm, h: 15 cm.
 * - Mahkota Depan (Front): 6-panel crown structure, top squatchee button,
 *   seam lines, embroidered ventilation eyelets, dan visor/lidah dengan 4 concentric stitch rows.
 * - Belakang (Back): Crown dome, arch opening cutout, adjustable strap & buckle.
 */
function buildCapSilhouette(w: number, h: number, isBack = false): Silhouette {
  const cx = w / 2;
  const details: string[] = [];
  const stitches: string[] = [];

  if (!isBack) {
    // MAHKOTA DEPAN & VISOR (Curved Baseball Cap)
    // Outline: Mahkota atas melengkung + visor melengkung di bawah
    const crownTopY = 2.5;
    const crownLeftX = cx - 8.5;
    const crownRightX = cx + 8.5;
    const visorBaseY = 9.8;
    const visorTipY = 14.5;

    const body = [
      // Puncak mahkota
      `M ${r2(cx)} ${r2(crownTopY)}`,
      // Lengkung mahkota kanan
      `Q ${r2(crownRightX + 1.0)} ${r2(crownTopY + 2.5)} ${r2(crownRightX)} ${r2(visorBaseY)}`,
      // Lengkung visor kanan luar
      `Q ${r2(crownRightX + 1.2)} ${r2(visorTipY - 1.0)} ${r2(cx)} ${r2(visorTipY)}`,
      // Lengkung visor kiri luar
      `Q ${r2(crownLeftX - 1.2)} ${r2(visorTipY - 1.0)} ${r2(crownLeftX)} ${r2(visorBaseY)}`,
      // Lengkung mahkota kiri
      `Q ${r2(crownLeftX - 1.0)} ${r2(crownTopY + 2.5)} ${r2(cx)} ${r2(crownTopY)}`,
      "Z",
    ].join(" ");

    // Garis batas mahkota dan visor (visor seam)
    details.push(
      `M ${r2(crownLeftX)} ${r2(visorBaseY)} Q ${r2(cx)} ${r2(visorBaseY + 1.2)} ${r2(crownRightX)} ${r2(visorBaseY)}`
    );

    // Garis jahitan panel tengah mahkota (center seam)
    stitches.push(`M ${r2(cx)} ${r2(crownTopY + 0.6)} L ${r2(cx)} ${r2(visorBaseY + 1.2)}`);

    // Garis jahitan panel samping kiri & kanan (side panel seams)
    stitches.push(`M ${r2(cx)} ${r2(crownTopY + 0.6)} Q ${r2(cx - 4.5)} ${r2(crownTopY + 4.5)} ${r2(cx - 5.0)} ${r2(visorBaseY + 0.9)}`);
    stitches.push(`M ${r2(cx)} ${r2(crownTopY + 0.6)} Q ${r2(cx + 4.5)} ${r2(crownTopY + 4.5)} ${r2(cx + 5.0)} ${r2(visorBaseY + 0.9)}`);

    // Lubang ventilasi bordir (embroidered eyelets)
    details.push(`M ${r2(cx - 3.5)} 5.5 A 0.45 0.45 0 1 0 ${r2(cx - 2.6)} 5.5`);
    details.push(`M ${r2(cx + 2.6)} 5.5 A 0.45 0.45 0 1 0 ${r2(cx + 3.5)} 5.5`);

    // Kancing atas mahkota (squatchee top button)
    details.push(`M ${r2(cx - 0.7)} ${r2(crownTopY)} A 0.7 0.7 0 1 0 ${r2(cx + 0.7)} ${r2(crownTopY)}`);

    // 4 Baris jahitan melengkung khas visor topi (concentric brim stitches)
    for (let i = 1; i <= 4; i++) {
      const offset = i * 0.9;
      stitches.push(
        `M ${r2(crownLeftX + 0.8 + offset * 0.3)} ${r2(visorBaseY + offset * 0.4)} ` +
        `Q ${r2(cx)} ${r2(visorBaseY + 1.2 + offset)} ` +
        `${r2(crownRightX - 0.8 - offset * 0.3)} ${r2(visorBaseY + offset * 0.4)}`
      );
    }

    return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
  } else {
    // BELAKANG TOPI (Rear crown arch & adjustable strap)
    const crownTopY = 2.5;
    const crownLeftX = cx - 8.5;
    const crownRightX = cx + 8.5;
    const baseY = 11.5;

    const body = [
      `M ${r2(cx)} ${r2(crownTopY)}`,
      `Q ${r2(crownRightX + 1.0)} ${r2(crownTopY + 3.0)} ${r2(crownRightX)} ${r2(baseY)}`,
      `L ${r2(crownLeftX)} ${r2(baseY)}`,
      `Q ${r2(crownLeftX - 1.0)} ${r2(crownTopY + 3.0)} ${r2(cx)} ${r2(crownTopY)}`,
      "Z",
    ].join(" ");

    // Bukaan lengkung belakang (rear keyhole arch cutout)
    const archTopY = 7.0;
    const archW = 6.5;
    details.push(
      `M ${r2(cx - archW / 2)} ${r2(baseY)} Q ${r2(cx)} ${r2(archTopY)} ${r2(cx + archW / 2)} ${r2(baseY)} Z`
    );

    // Tali pengatur ukuran (adjustable strap)
    details.push(
      `M ${r2(cx - archW / 2 - 0.5)} ${r2(baseY - 1.2)} L ${r2(cx + archW / 2 + 0.5)} ${r2(baseY - 1.2)}`
    );
    details.push(
      `M ${r2(cx - archW / 2 - 0.5)} ${r2(baseY - 0.2)} L ${r2(cx + archW / 2 + 0.5)} ${r2(baseY - 0.2)}`
    );

    // Gesper logam pengunci (metal buckle slider)
    details.push(
      `M ${r2(cx + 1.2)} ${r2(baseY - 1.5)} L ${r2(cx + 2.4)} ${r2(baseY - 1.5)} L ${r2(cx + 2.4)} ${r2(baseY + 0.1)} L ${r2(cx + 1.2)} ${r2(baseY + 0.1)} Z`
    );

    // Kancing atas mahkota
    details.push(`M ${r2(cx - 0.7)} ${r2(crownTopY)} A 0.7 0.7 0 1 0 ${r2(cx + 0.7)} ${r2(crownTopY)}`);

    // Jahitan panel belakang
    stitches.push(`M ${r2(cx)} ${r2(crownTopY + 0.6)} L ${r2(cx)} ${r2(archTopY)}`);

    return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
  }
}

/**
 * Siluet flat lay celana panjang streetwear (sweatpants / trackpants).
 * Ukuran w: 32.7 cm, h: 100 cm.
 * - Ban pinggang elastis berkaret & bertali (ribbed waistband + drawstrings).
 * - Saku samping miring (slanted side welt pockets).
 * - Faux fly seam (jahitan pesak).
 * - Kaki tirus (tapered legs) dengan karet manset pergelangan kaki (elastic ankle cuffs).
 */
function buildPantsSilhouette(w: number, h: number, isBack = false): Silhouette {
  const cx = w / 2;
  const waistHalfW = 14.0; // Lebar pinggang 28 cm
  const hipHalfW = 15.5;   // Lebar pinggul 31 cm
  const ankleHalfW = 5.8;  // Lebar pergelangan kaki
  const crotchY = 32.0;    // Selangkangan
  const cuffH = 5.0;       // Manset karet bawah

  const body = [
    // Pinggang kiri ke kanan
    `M ${r2(cx - waistHalfW)} 2.5`,
    `L ${r2(cx + waistHalfW)} 2.5`,
    // Pinggul kanan ke kaki luar kanan
    `Q ${r2(cx + hipHalfW)} 18.0 ${r2(cx + 10.5)} ${r2(h - 2.5)}`,
    // Bukaan manset kaki kanan
    `L ${r2(cx + 10.5 - ankleHalfW)} ${r2(h - 2.5)}`,
    // Kaki dalam kanan ke selangkangan (inseam)
    `L ${r2(cx)} ${r2(crotchY)}`,
    // Selangkangan ke kaki dalam kiri (inseam)
    `L ${r2(cx - 10.5 + ankleHalfW)} ${r2(h - 2.5)}`,
    // Bukaan manset kaki kiri
    `L ${r2(cx - 10.5)} ${r2(h - 2.5)}`,
    // Kaki luar kiri ke pinggul kiri
    `Q ${r2(cx - hipHalfW)} 18.0 ${r2(cx - waistHalfW)} 2.5`,
    "Z",
  ].join(" ");

  const details: string[] = [];
  const stitches: string[] = [];

  // Ban pinggang elastis (elastic waistband band 4.5cm)
  details.push(`M ${r2(cx - waistHalfW)} 7.0 L ${r2(cx + waistHalfW)} 7.0`);
  stitches.push(`M ${r2(cx - waistHalfW)} 4.8 L ${r2(cx + waistHalfW)} 4.8`);

  // Manset karet pergelangan kaki bawah (ankle cuffs)
  details.push(`M ${r2(cx + 10.5 - ankleHalfW)} ${r2(h - 2.5 - cuffH)} L ${r2(cx + 10.5)} ${r2(h - 2.5 - cuffH)}`);
  details.push(`M ${r2(cx - 10.5)} ${r2(h - 2.5 - cuffH)} L ${r2(cx - 10.5 + ankleHalfW)} ${r2(h - 2.5 - cuffH)}`);

  if (!isBack) {
    // Saku samping kiri & kanan (slanted side pockets)
    details.push(`M ${r2(cx - waistHalfW + 1.5)} 7.0 L ${r2(cx - hipHalfW + 1.0)} 22.0`);
    details.push(`M ${r2(cx + waistHalfW - 1.5)} 7.0 L ${r2(cx + hipHalfW - 1.0)} 22.0`);

    // Jahitan pesak / resleting palsu (faux fly J-stitch)
    stitches.push(`M ${r2(cx)} 7.0 L ${r2(cx)} 18.0 Q ${r2(cx)} 21.0 ${r2(cx + 2.5)} 21.0`);

    // Tali serut pinggang (drawstrings with aglets)
    details.push(`M ${r2(cx - 1.0)} 5.0 L ${r2(cx - 1.5)} 13.0`);
    details.push(`M ${r2(cx + 1.0)} 5.0 L ${r2(cx + 1.5)} 13.0`);
  } else {
    // Saku tempel belakang kanan (back patch pocket on right hip)
    const pocketW = 7.0;
    const pocketH = 8.0;
    const px = cx + 3.5;
    const py = 12.0;
    details.push(
      `M ${r2(px)} ${r2(py)} L ${r2(px + pocketW)} ${r2(py)} L ${r2(px + pocketW)} ${r2(py + pocketH)} L ${r2(px)} ${r2(py + pocketH)} Z`
    );
    stitches.push(
      `M ${r2(px + 0.6)} ${r2(py + 0.6)} L ${r2(px + pocketW - 0.6)} ${r2(py + 0.6)} L ${r2(px + pocketW - 0.6)} ${r2(py + pocketH - 0.6)} L ${r2(px + 0.6)} ${r2(py + pocketH - 0.6)} Z`
    );
  }

  return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
}

/**
 * Siluet flat lay celana pendek streetwear (sweat shorts).
 * Ukuran w: 40.7 cm, h: 50 cm.
 * - Ban pinggang elastis berkaret & bertali.
 * - Saku samping miring (slanted hip pockets).
 * - Faux fly seam.
 * - Kelim jahitan ganda di ujung paha (double needle bottom hem).
 */
function buildShortsSilhouette(w: number, h: number, isBack = false): Silhouette {
  const cx = w / 2;
  const waistHalfW = 18.0; // Lebar pinggang 36 cm
  const hipHalfW = 19.5;   // Lebar pinggul 39 cm
  const legHalfW = 7.5;    // Bukaan paha bawah
  const crotchY = 28.0;    // Selangkangan
  const hemY = h - 2.5;

  const body = [
    // Pinggang kiri ke kanan
    `M ${r2(cx - waistHalfW)} 2.5`,
    `L ${r2(cx + waistHalfW)} 2.5`,
    // Pinggul kanan ke paha luar kanan
    `Q ${r2(cx + hipHalfW)} 15.0 ${r2(cx + 17.5)} ${r2(hemY)}`,
    // Bukaan kaki kanan
    `L ${r2(cx + 17.5 - legHalfW * 1.8)} ${r2(hemY)}`,
    // Kaki dalam kanan ke selangkangan
    `L ${r2(cx)} ${r2(crotchY)}`,
    // Selangkangan ke kaki dalam kiri
    `L ${r2(cx - 17.5 + legHalfW * 1.8)} ${r2(hemY)}`,
    // Bukaan kaki kiri
    `L ${r2(cx - 17.5)} ${r2(hemY)}`,
    // Kaki luar kiri ke pinggul kiri
    `Q ${r2(cx - hipHalfW)} 15.0 ${r2(cx - waistHalfW)} 2.5`,
    "Z",
  ].join(" ");

  const details: string[] = [];
  const stitches: string[] = [];

  // Ban pinggang elastis (elastic waistband band 4.5cm)
  details.push(`M ${r2(cx - waistHalfW)} 7.0 L ${r2(cx + waistHalfW)} 7.0`);
  stitches.push(`M ${r2(cx - waistHalfW)} 4.8 L ${r2(cx + waistHalfW)} 4.8`);

  // Garis jahitan ganda kelim paha bawah (double needle hem)
  stitches.push(`M ${r2(cx - 17.5)} ${r2(hemY - 2.5)} L ${r2(cx - 17.5 + legHalfW * 1.8)} ${r2(hemY - 2.5)}`);
  stitches.push(`M ${r2(cx + 17.5 - legHalfW * 1.8)} ${r2(hemY - 2.5)} L ${r2(cx + 17.5)} ${r2(hemY - 2.5)}`);

  if (!isBack) {
    // Saku samping miring (slanted pockets)
    details.push(`M ${r2(cx - waistHalfW + 2.0)} 7.0 L ${r2(cx - hipHalfW + 1.5)} 20.0`);
    details.push(`M ${r2(cx + waistHalfW - 2.0)} 7.0 L ${r2(cx + hipHalfW - 1.5)} 20.0`);

    // Jahitan pesak (faux fly J-stitch)
    stitches.push(`M ${r2(cx)} 7.0 L ${r2(cx)} 16.0 Q ${r2(cx)} 19.0 ${r2(cx + 2.5)} 19.0`);

    // Tali serut pinggang (drawstrings with aglets)
    details.push(`M ${r2(cx - 1.0)} 5.0 L ${r2(cx - 1.5)} 13.0`);
    details.push(`M ${r2(cx + 1.0)} 5.0 L ${r2(cx + 1.5)} 13.0`);
  } else {
    // Saku tempel belakang kanan (back patch pocket on right hip)
    const pocketW = 7.5;
    const pocketH = 8.5;
    const px = cx + 4.5;
    const py = 12.0;
    details.push(
      `M ${r2(px)} ${r2(py)} L ${r2(px + pocketW)} ${r2(py)} L ${r2(px + pocketW)} ${r2(py + pocketH)} L ${r2(px)} ${r2(py + pocketH)} Z`
    );
    stitches.push(
      `M ${r2(px + 0.6)} ${r2(py + 0.6)} L ${r2(px + pocketW - 0.6)} ${r2(py + 0.6)} L ${r2(px + pocketW - 0.6)} ${r2(py + pocketH - 0.6)} L ${r2(px + 0.6)} ${r2(py + pocketH - 0.6)} Z`
    );
  }

  return { viewBox: `0 0 ${w} ${h}`, body, details, stitches };
}

/**
 * SSOT Factory Generator Siluet Pola 2D per apparel dan panel.
 * Sepenuhnya mendukung seluruh 8 apparel katalog:
 * - tshirt, longsleeve, crewneck, hoodie, shirt (coach jacket)
 * - cap (topi baseball)
 * - pants (celana panjang)
 * - shorts (celana pendek)
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

  if (apparel === "cap") {
    return buildCapSilhouette(w, h, panel === "back");
  }

  if (apparel === "pants") {
    return buildPantsSilhouette(w, h, panel === "back");
  }

  if (apparel === "shorts") {
    return buildShortsSilhouette(w, h, panel === "back");
  }

  return buildTorsoSilhouette(apparel, w, h, panel === "back");
}
