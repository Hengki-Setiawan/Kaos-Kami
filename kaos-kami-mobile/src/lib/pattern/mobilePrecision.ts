/**
 * Helper murni mode presisi-cm mobile (P2) — TANPA kanvas 2D / Fabric.
 *
 * SSOT angka = `lib/3d/mobileScaleCalibration` (port web scaleCalibration):
 * batas box per sisi (MOBILE_SIDE_BOX_CM), sisi valid (validSidesForMobile),
 * multiplier (MOBILE_MULTIPLIERS), skala maks (mobileMaxDecalScaleUnits).
 * File ini HANYA berisi logika presisi (validasi, DPI, gate) — JANGAN
 * duplikasi angka box di sini.
 */

import type { ApparelType } from '@/store/useMobileStudioStore';
import {
  MOBILE_MULTIPLIERS,
  MOBILE_SIDE_BOX_CM,
  mobileMaxDecalScaleUnits,
  validSidesForMobile,
  type MobileDecalSide,
} from '@/lib/3d/mobileScaleCalibration';

/** Sisi presisi = sisi decal mobile (7 sisi, cermin store multi-decal). */
export type MobilePatternSide = MobileDecalSide;

export const MOBILE_SIDE_LABELS: Record<MobilePatternSide, string> = {
  front: 'Depan',
  back: 'Belakang',
  side_left: 'Samping Kiri',
  side_right: 'Samping Kanan',
  left_sleeve: 'Lengan Kiri',
  right_sleeve: 'Lengan Kanan',
  hood: 'Tudung (hoodie saja)',
};

export interface SideLimits {
  maxWcm: number;
  maxHcm: number;
}

/** Batas cetak sisi ini (cm) — baca SSOT box, tanpa angka lokal. */
export function sideLimitsFor(apparel: ApparelType, side: MobilePatternSide): SideLimits {
  const box = MOBILE_SIDE_BOX_CM[apparel]?.[side] ?? MOBILE_SIDE_BOX_CM['tshirt']?.[side];
  return { maxWcm: box?.w ?? 0, maxHcm: box?.h ?? 0 };
}

/** Sisi yang valid untuk apparel ini (hood = hoodie saja, dst). */
export function validSidesFor(apparel: ApparelType): MobilePatternSide[] {
  return validSidesForMobile(apparel);
}

/** Global clamp printhead DTF 30.0cm (cermin web REAL_WORLD_PRINT_LIMITS). */
export const DTF_MAX_WIDTH_CM = 30.0;

export function clampWidthToDtf(w: number): number {
  if (!Number.isFinite(w)) return 0;
  return Math.min(DTF_MAX_WIDTH_CM, Math.max(0, w));
}

/** Konversi lebar cm → skala 3D, dijepit ke maks sisi (cermin web maxDecalScaleUnits). */
export function widthCmToScale(apparel: ApparelType, side: MobilePatternSide, widthCm: number): number {
  const mult = MOBILE_MULTIPLIERS[apparel] ?? 100;
  const maxS = Math.max(0.02, mobileMaxDecalScaleUnits(apparel, side));
  const raw = (Number(widthCm) || 0) / mult;
  return Math.min(maxS, Math.max(0.02, raw));
}

/**
 * Estimasi DPI jujur dari piksel upload: px ÷ inci cetak.
 * Cermin web PatternStudio (masterDpiAt30cm) + mobile imageOptimizer.
 */
export function estimateDpi(pxW: number, widthCm: number): number | null {
  const px = Number(pxW);
  const cm = Number(widthCm);
  if (!Number.isFinite(px) || px <= 0 || !Number.isFinite(cm) || cm <= 0) return null;
  const inch = cm / 2.54;
  if (inch <= 0) return null;
  return Math.max(0, Math.min(2400, Math.round(px / inch)));
}

export type DpiTone = 'good' | 'ok' | 'bad' | 'unknown';

export interface DpiGate {
  tone: DpiTone;
  label: string;
}

/** Gate DPI cermin web: <150 tolak, 150–299 cukup, >=300 tajam. */
export function dpiGate(dpi: number | null): DpiGate {
  if (dpi === null || !Number.isFinite(dpi) || dpi <= 0) {
    return { tone: 'unknown', label: 'DPI menyusul — upload / kunci ukuran dulu' };
  }
  if (dpi < 150) return { tone: 'bad', label: `~${dpi} DPI — DITOLAK (<150): perkecil sablon / pakai file lebih tajam` };
  if (dpi < 300) return { tone: 'ok', label: `~${dpi} DPI — cukup untuk DTF` };
  return { tone: 'good', label: `~${dpi} DPI — tajam & siap cetak` };
}

export interface PrecisionInput {
  widthCm: number;
  heightCm: number;
  offsetCm: number;
}

/**
 * Validasi angka presisi (murni, tanpa efek samping).
 * - lebar/tinggi finite, 1–42cm, lebar ≤30 global + ≤ batas sisi.
 * - offset 0–30cm (jarak dari kerah).
 */
export function validatePrecisionInput(
  apparel: ApparelType,
  side: MobilePatternSide,
  input: PrecisionInput,
): string[] {
  const errors: string[] = [];
  const lim = sideLimitsFor(apparel, side);
  const { widthCm, heightCm, offsetCm } = input;
  if (!Number.isFinite(widthCm) || widthCm <= 0) errors.push('Lebar harus angka > 0 cm.');
  if (!Number.isFinite(heightCm) || heightCm <= 0) errors.push('Tinggi harus angka > 0 cm.');
  if (Number.isFinite(widthCm) && widthCm > DTF_MAX_WIDTH_CM) {
    errors.push(`Lebar ${widthCm}cm melebihi printhead DTF ${DTF_MAX_WIDTH_CM}cm — diklem otomatis.`);
  }
  if (Number.isFinite(widthCm) && widthCm > lim.maxWcm) {
    errors.push(`Lebar ${widthCm}cm melebihi batas sisi ${MOBILE_SIDE_LABELS[side]} (${lim.maxWcm}cm).`);
  }
  if (Number.isFinite(heightCm) && (heightCm < 1 || heightCm > 42)) {
    errors.push('Tinggi harus 1–42 cm.');
  }
  if (Number.isFinite(heightCm) && heightCm > lim.maxHcm) {
    errors.push(`Tinggi ${heightCm}cm melebihi batas sisi ${MOBILE_SIDE_LABELS[side]} (${lim.maxHcm}cm).`);
  }
  if (!Number.isFinite(offsetCm) || offsetCm < 0 || offsetCm > 30) {
    errors.push('Offset kerah harus 0–30 cm.');
  }
  return errors;
}

/**
 * FOLLOW-UP Fabric.js di WebView (dicatat di sini agar tak hilang):
 * - Teknis FEASIBLE cepat: fabric v7 client-only via dynamic import
 *   (pola web PatternStudio sudah begitu), tanpa beban Worker (mobile Next
 *   bukan Cloudflare Workers, batas 3MB tak berlaku di HP).
 * - DITUNDA dengan sadar: editor 2D butuh kanvas pola per-panel +
 *   sinkronisasi 2D↔3D + magnet-snap + gate DPI per-decal. Itu pekerjaan
 *   P2-lanjutan, BUKAN bagian misi ini (mode angka dulu).
 * - Bila owner memerintahkan: tambah `src/components/pattern/
 *   MobilePatternCanvas.tsx` (dynamic import fabric, TANPA ubah renderer/
 *   gizmo), baca master dari mobileMasterRegistry, tulis via updateDecal.
 */
export const FABRIC_WEBVIEW_FOLLOW_UP =
  'Fabric.js WebView feasible (dynamic import, tanpa Worker), ditunda sampai kanvas pola per-panel siap — mode angka P2 tetap SSOT.';
