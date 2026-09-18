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
  type PanelOrigin,
  type PrintBounds,
  type PatternPanel,
} from "./patternGeometry";

export {
  getPanelOrigin,
  getPrintBounds,
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

/** DecalLayer 3D -> posisi Fabric (butuh rasio aspek gambar w/h). */
export function decalToFabric(
  apparel: ApparelType,
  d: DecalLayer,
  aspectWoverH: number
): FabricPlacement {
  const longCm = unitsToCm(apparel, d.scale);
  const aspect = aspectWoverH > 0 ? aspectWoverH : 1;
  const wCm = aspect >= 1 ? longCm : longCm * aspect;
  const hCm = aspect >= 1 ? longCm / aspect : longCm;
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
  const { aspectWoverH, opacity } = options;
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

  const patch: { x: number; y: number; scale: number; rotation: number; opacity?: number } = {
    x: cmToUnits(apparel, cxPx / EDITOR_PX_PER_CM),
    y: cmToUnits(apparel, -cyPx / EDITOR_PX_PER_CM),
    scale: cmToUnits(apparel, longPx / EDITOR_PX_PER_CM),
    // KEMBALIKAN rotasi (audit #19 — sebelumnya parameter rotation dibuang,
    // putar 45° di pola 2D tak pernah sampai ke 3D). Bentuk return ini
    // assignable ke updateDecal(id, patch) (Partial<DecalLayer>).
    rotation: normalizeRotation(rotation),
  };
  if (opacity !== undefined && Number.isFinite(opacity)) {
    patch.opacity = Math.min(1, Math.max(0, opacity));
  }
  return patch;
}
