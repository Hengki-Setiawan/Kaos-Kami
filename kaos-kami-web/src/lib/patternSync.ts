// src/lib/patternSync.ts — Konversi 2-ARAH antara DecalLayer 3D dan objek
// Fabric kanvas pola 2D. Kontrak disalin dari DecalLayerRenderer:
// - scale unit 3D = SISI PANJANG artwork (landscape: lebar, portrait: tinggi)
// - (x, y) = offset TENGAH artwork dari titik (0,0) mesh, satuan unit
// - rotasi derajat [-180, 180], opacity 0-1
// Kanvas 2D: pusat artboard = (0,0) 3D, pemetaan EXACT tanpa offset.
//
// CATATAN OFFSET (audit #19): TIDAK ada konstanta ajaib di pemetaan ini.
// Komentar lama "0,02 = 2mm" SALAH 10x lipat: 0,02 unit × multiplier tshirt
// 101,8 = 2,04 cm (bukan 2mm). Nilai `y: 0.02` yang dioper pemanggil
// (mis. PatternStudio handleUpload) adalah offset data ±2cm yang JUJUR,
// bukan konstanta konversi — jangan "mengoreksi"nya di sini.
//
// CATATAN STRETCH (audit #19): DecalLayer.scale UNIFORM (satu angka).
// PatternStudio mengunci skala uniform saat scaling, jadi stretch non-uniform
// hanya bisa datang dari bbox terotasi / pemanggil programatik. Bila rasio
// aspek sumber diketahui, sumbu acuan dipilih dari SISI PANJANG SUMBER
// (bukan max() buta atas bbox) — lihat fabricToDecal.
import type { ApparelType, DecalLayer } from "./constants";
import {
  cmToUnits,
  EDITOR_PX_PER_CM,
  unitsToCm,
  getPanelOrigin,
  getPrintBounds,
  getPanelGeometry,
  getPanelsForApparel,
  type PanelOrigin,
  type PrintBounds,
  type PatternPanel,
} from "./patternGeometry";

export {
  getPanelOrigin,
  getPrintBounds,
  getPanelGeometry,
  getPanelsForApparel,
  type PanelOrigin,
  type PrintBounds,
  type PatternPanel,
};

export interface FabricPlacement {
  /** px offset dari origin panel getPanelOrigin(apparel, panel) (x kanan+, y bawah+) */
  cxPx: number;
  cyPx: number;
  /** lebar px artwork */
  wPx: number;
  /** tinggi px artwork */
  hPx: number;
  rotation: number;
  opacity: number;
}

/** Normalisasi sudut ke [-180, 180] (rentang DecalLayer.rotation). */
export function normalizeRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** DecalLayer 3D -> posisi Fabric (butuh rasio aspek gambar w/h, panel opsional). */
export function decalToFabric(
  apparel: ApparelType,
  d: DecalLayer,
  aspectWoverH: number,
  panelOverride?: PatternPanel
): FabricPlacement {
  const panel = panelOverride || (d.targetSide as PatternPanel) || "front";
  const geo = getPanelGeometry(apparel, panel);
  const longCm = unitsToCm(apparel, d.scale);
  const aspect = aspectWoverH > 0 ? aspectWoverH : 1;
  const wCm = aspect >= 1 ? longCm : longCm * aspect;
  const hCm = aspect >= 1 ? longCm / aspect : longCm;

  // Kalibrasi Khusus Panel Lengan (Kiri & Kanan):
  // Di 3D (scaleCalibration.ts):
  // - decalY berkisar dari +0.35 (pangkal bahu / top) hingga -0.35 (ujung manset / bottom).
  // - decalX adalah geser melingkar [-0.12, +0.12].
  // Di 2D (PatternStudio & patternGeometry):
  // - origin berada tepat di tengah kanvas pola lengan (wCm/2, hCm/2).
  // - Kita petakan decalY normalized [-1, 1] ke tinggi panel lengan secara proporsional,
  //   sehingga sablon di bahu, lengan tengah, maupun manset selalu berada 100% di dalam pola 2D!
  if (panel === "left_sleeve" || panel === "right_sleeve") {
    const normY = Math.max(-1, Math.min(1, d.y / 0.35));
    const maxAvailableHPx = Math.max(10, (geo.hCm * EDITOR_PX_PER_CM - hCm * EDITOR_PX_PER_CM) / 2);
    const usableHalfHeightPx = maxAvailableHPx * 0.88;
    const cyPx = -normY * usableHalfHeightPx;

    const normX = Math.max(-1, Math.min(1, d.x / 0.12));
    const maxAvailableWPx = Math.max(10, (geo.wCm * EDITOR_PX_PER_CM - wCm * EDITOR_PX_PER_CM) / 2);
    const usableHalfWidthPx = maxAvailableWPx * 0.88;
    const cxPx = normX * usableHalfWidthPx;

    return {
      cxPx,
      cyPx,
      wPx: wCm * EDITOR_PX_PER_CM,
      hPx: hCm * EDITOR_PX_PER_CM,
      rotation: normalizeRotation(d.rotation),
      opacity: d.opacity,
    };
  }

  // Panel Standar (Depan, Belakang, Tudung)
  return {
    cxPx: unitsToCm(apparel, d.x) * EDITOR_PX_PER_CM,
    cyPx: -unitsToCm(apparel, d.y) * EDITOR_PX_PER_CM,
    wPx: wCm * EDITOR_PX_PER_CM,
    hPx: hCm * EDITOR_PX_PER_CM,
    rotation: normalizeRotation(d.rotation),
    opacity: d.opacity,
  };
}

export interface FabricToDecalOptions {
  /** Panel target di PatternStudio */
  panel?: PatternPanel;
  /** Rasio aspek SUMBER artwork (w/h). Bila diisi, sumbu acuan skala dipilih
   * dari sisi panjang SUMBER — tahan terhadap bbox Fabric yang mengembang
   * saat objek terotasi (getScaledWidth/Height = AABB, bukan ukuran riil). */
  aspectWoverH?: number;
  /** Opacity objek Fabric (0-1). Diteruskan ke patch bila diisi — agen
   * PatternStudio: oper `obj.opacity` agar opacity 2D↔3D sinkron. */
  opacity?: number;
}

/**
 * Deteksi stretch non-uniform: bandingkan rasio bbox Fabric vs aspek sumber.
 * > toleransi (default 3%) = artwork ditarik 1 sisi / AABB rotasi — JANGAN
 * naik ke film DTF tanpa normalisasi (lihat PatternStudio: kunci uniform).
 */
export function detectNonUniformStretch(
  wPx: number,
  hPx: number,
  aspectWoverH: number,
  tolerance = 0.03
): boolean {
  if (!(wPx > 0) || !(hPx > 0) || !(aspectWoverH > 0)) return false;
  const ratio = wPx / hPx;
  return Math.abs(ratio - aspectWoverH) / aspectWoverH > tolerance;
}

/** Posisi Fabric -> patch DecalLayer 3D (scale = sisi panjang). */
export function fabricToDecal(
  apparel: ApparelType,
  cxPx: number,
  cyPx: number,
  wPx: number,
  hPx: number,
  rotation: number,
  options: FabricToDecalOptions = {}
): { x: number; y: number; scale: number; rotation: number; opacity?: number } {
  const { panel, aspectWoverH, opacity } = options;
  const w = Math.max(1, wPx);
  const h = Math.max(1, hPx);

  // Skala dari SISI PANJANG SUMBER (bukan max() buta atas bbox): bila aspek
  // sumber landscape → acuan lebar; portrait → acuan tinggi. Untuk input
  // uniform (kasus normal, PatternStudio mengunci uniform) hasilnya IDENTIK
  // dengan max() lama; untuk stretch/AABB-rotasi, sumbu pendek yang
  // terdistorsi tidak lagi mendikte skala cetak.
  const aspect = aspectWoverH && aspectWoverH > 0 ? aspectWoverH : w / h;
  const longPx = aspect >= 1 ? w : h;

  if (
    aspectWoverH &&
    aspectWoverH > 0 &&
    detectNonUniformStretch(w, h, aspectWoverH) &&
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production"
  ) {
    console.warn(
      `[patternSync] stretch non-uniform terdeteksi (bbox ${Math.round(w)}×${Math.round(h)}px ` +
        `vs aspek sumber ${aspectWoverH.toFixed(3)}) — skala diambil dari sisi panjang sumber. ` +
        `Kunci skala uniform di editor (audit #19).`
    );
  }

  let finalX = cmToUnits(apparel, cxPx / EDITOR_PX_PER_CM);
  let finalY = cmToUnits(apparel, -cyPx / EDITOR_PX_PER_CM);

  // Kalibrasi Khusus Panel Lengan (Kiri & Kanan):
  if (panel === "left_sleeve" || panel === "right_sleeve") {
    const geo = getPanelGeometry(apparel, panel);
    const maxAvailableHPx = Math.max(10, (geo.hCm * EDITOR_PX_PER_CM - h) / 2);
    const usableHalfHeightPx = maxAvailableHPx * 0.88;
    const normY = usableHalfHeightPx > 0 ? -cyPx / usableHalfHeightPx : 0;
    finalY = Math.max(-0.35, Math.min(0.35, Number((normY * 0.35).toFixed(4))));

    const maxAvailableWPx = Math.max(10, (geo.wCm * EDITOR_PX_PER_CM - w) / 2);
    const usableHalfWidthPx = maxAvailableWPx * 0.88;
    const normX = usableHalfWidthPx > 0 ? cxPx / usableHalfWidthPx : 0;
    finalX = Math.max(-0.12, Math.min(0.12, Number((normX * 0.12).toFixed(4))));
  }

  const patch: { x: number; y: number; scale: number; rotation: number; opacity?: number } = {
    x: finalX,
    y: finalY,
    scale: cmToUnits(apparel, longPx / EDITOR_PX_PER_CM),
    rotation: normalizeRotation(rotation),
  };
  if (opacity !== undefined && Number.isFinite(opacity)) {
    patch.opacity = Math.min(1, Math.max(0, opacity));
  }
  return patch;
}
