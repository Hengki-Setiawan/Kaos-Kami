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

/** Siluet kaos lengan pendek/panjang: badan + lengan pendek + kerah. */
function teeFront(w: number, h: number, sleeveLen: number, collarW: number): Silhouette {
  const cx = w / 2;
  const shoulderY = h * 0.06;
  const sleeveY = shoulderY + h * 0.16;
  const body = [
    `M ${r2(cx - collarW / 2)} 2`,
    `Q ${r2(cx)} ${r2(2 + h * 0.035)} ${r2(cx + collarW / 2)} 2`,
    `L ${r2(cx + w * 0.18)} ${r2(shoulderY)}`,
    `L ${r2(cx + w * 0.18 + sleeveLen)} ${r2(sleeveY)}`,
    `L ${r2(cx + w * 0.18 + sleeveLen - w * 0.03)} ${r2(sleeveY + h * 0.09)}`,
    `L ${r2(cx + w * 0.14)} ${r2(shoulderY + h * 0.1)}`,
    `L ${r2(cx + w * 0.14)} ${r2(h - 2)}`,
    `L ${r2(cx - w * 0.14)} ${r2(h - 2)}`,
    `L ${r2(cx - w * 0.14)} ${r2(shoulderY + h * 0.1)}`,
    `L ${r2(cx - w * 0.18 - sleeveLen + w * 0.03)} ${r2(sleeveY + h * 0.09)}`,
    `L ${r2(cx - w * 0.18 - sleeveLen)} ${r2(sleeveY)}`,
    `L ${r2(cx - w * 0.18)} ${r2(shoulderY)}`,
    "Z",
  ].join(" ");
  const stitches = [
    `M ${r2(cx - w * 0.14)} ${r2(h - 6)} L ${r2(cx + w * 0.14)} ${r2(h - 6)}`,
  ];
  return { viewBox: `0 0 ${w} ${h}`, body, details: [], stitches };
}

export function getPatternSilhouette(apparel: ApparelType, panel: PatternPanel): Silhouette {
  const g = getPanelGeometry(apparel, panel);
  const w = g.wCm;
  const h = g.hCm;

  if (panel === "left_sleeve" || panel === "right_sleeve") {
    // Panel lengan: persegi dengan ujung manset.
    const cuffH = apparel === "longsleeve" || apparel === "crewneck" ? h * 0.12 : h * 0.06;
    const body = `M 1 1 L ${r2(w - 1)} 1 L ${r2(w - 1)} ${r2(h - 1)} L 1 ${r2(h - 1)} Z`;
    const stitches = [`M 1 ${r2(h - cuffH)} L ${r2(w - 1)} ${r2(h - cuffH)}`];
    return { viewBox: `0 0 ${w} ${h}`, body, details: [], stitches };
  }

  const isBack = panel === "back";
  const sleeveLen =
    apparel === "longsleeve" ? w * 0.02 : apparel === "tshirt" ? w * 0.16 : w * 0.14;
  const base = teeFront(w, h, sleeveLen, w * 0.22);
  const details: string[] = [...base.details];
  const cx = w / 2;

  if (apparel === "hoodie") {
    // Tudung (hood) di belakang leher + saku kanguru di depan.
    details.push(
      `M ${r2(cx - w * 0.16)} 3 Q ${r2(cx)} ${r2(-h * 0.06)} ${r2(cx + w * 0.16)} 3`
    );
    if (!isBack) {
      details.push(
        `M ${r2(cx - w * 0.12)} ${r2(h * 0.62)} L ${r2(cx + w * 0.12)} ${r2(h * 0.62)} L ${r2(cx + w * 0.09)} ${r2(h * 0.82)} L ${r2(cx - w * 0.09)} ${r2(h * 0.82)} Z`
      );
    }
  }
  if (apparel === "crewneck") {
    details.push(
      `M ${r2(cx - w * 0.11)} 2 Q ${r2(cx)} ${r2(2 + h * 0.025)} ${r2(cx + w * 0.11)} 2`
    );
  }
  if (apparel === "shirt") {
    // Coach jacket: garis resleting tengah + kerah.
    details.push(`M ${r2(cx)} 4 L ${r2(cx)} ${r2(h - 2)}`);
    details.push(
      `M ${r2(cx - w * 0.11)} 2 L ${r2(cx)} ${r2(h * 0.06)} L ${r2(cx + w * 0.11)} 2`
    );
  }
  if (isBack) {
    details.push(`M ${r2(cx - w * 0.05)} ${r2(h * 0.1)} L ${r2(cx + w * 0.05)} ${r2(h * 0.1)}`);
  }
  return { ...base, details };
}
