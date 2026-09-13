/**
 * TEAMWEAR / JERSEY REGU (M4.1) — helper murni (tanpa DOM/kanvas).
 * Alur: 1 desain studio → tabel roster (nama + nomor + ukuran) → tiap baris
 * jadi 1 item keranjang (desain dasar + 2 teks personal punggung) → checkout
 * normal. Harga FINAL selalu dihitung server (/api/checkout); fungsi di sini
 * hanya untuk ESTIMASI tampil (display-only, tak dipercaya server).
 */

import type { ApparelType, DecalLayer, DecalTargetSide } from "./constants";
import { APPAREL_CATALOG, PRODUCT_COLORS } from "./constants";
import { calculate6VariablePrice, materialFinishToPricing } from "./pricingEngine";

export interface RosterRow {
  key: string;
  nama: string;
  nomor: string;
  size: string;
}

/** Batas baris per pengiriman (di bawah batas 20 item/checkout server + jaga payload <2MB). */
export const TEAMWEAR_MAX_ROWS = 12;

/** Maksimal decal desain dasar agar +2 teks personal tak melanggar batas 10/server. */
export const TEAMWEAR_MAX_BASE_DECALS = 8;

/** Batas tampil personal: nama ≤24 char (generateTextDecalDataUrl juga memotong 24). */
export const TEAMWEAR_MAX_NAME_LEN = 24;

/** Nomor punggung: 1–2 digit angka. */
export const NOMOR_REGEX = /^[0-9]{1,2}$/;

/** Ambang dataURL "besar" yang sebaiknya di-hosting ke R2 dulu (hemat payload). */
export const TEAMWEAR_LARGE_DATAURL_CHARS = 150_000;

/** Pagu estimasi payload checkout agar tak kena 413 (server cap 2MB). */
export const TEAMWEAR_PAYLOAD_GUARD_BYTES = 1_800_000;

export function newRosterRow(size: string): RosterRow {
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nama: "",
    nomor: "",
    size,
  };
}

export function validateRosterRow(row: RosterRow, sizes: readonly string[]): string | null {
  const nama = row.nama.trim();
  if (!nama) return "Nama wajib diisi.";
  if (nama.length > TEAMWEAR_MAX_NAME_LEN) return `Nama maks ${TEAMWEAR_MAX_NAME_LEN} huruf.`;
  if (!NOMOR_REGEX.test(row.nomor.trim())) return "Nomor wajib 1–2 digit angka (mis. 7, 10).";
  if (!sizes.includes(row.size)) return `Ukuran ${row.size} tak tersedia untuk apparel ini.`;
  return null;
}

/** Spesifikasi 2 teks personal punggung (dipakai panel untuk generate raster). */
export const TEAMWEAR_NAME_DECAL = {
  targetSide: "back" as DecalTargetSide,
  x: 0,
  /** Nama di punggung atas (di bawah kerah). */
  y: 0.16,
  scale: 0.055,
  rotation: 0,
  opacity: 1,
} as const;

export const TEAMWEAR_NUMBER_DECAL = {
  targetSide: "back" as DecalTargetSide,
  x: 0,
  /** Nomor besar di tengah punggung. */
  y: -0.04,
  scale: 0.11,
  rotation: 0,
  opacity: 1,
} as const;

export interface TeamwearEstimateInput {
  apparel: ApparelType;
  colorHex: string;
  materialFinish: string;
  size: string;
  /** Decal desain dasar (tanpa personal). */
  baseDecals: DecalLayer[];
  /** Jumlah baris valid (tiap baris qty 1; personal 2 decal A6–A5). */
  rows: RosterRow[];
}

/**
 * Estimasi TAMPIL per baris (display-only): desain dasar + 2 teks personal.
 * Server menghitung ulang otoritatif saat checkout (termasuk diskon volume
 * bila memenuhi syarat) — klien DILARANG menghitung diskon sendiri.
 */
export function estimateTeamwearPerRowIdr(input: TeamwearEstimateInput): number | null {
  try {
    const mat = materialFinishToPricing(input.materialFinish);
    const matched = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === input.colorHex.toLowerCase()
    );
    // Personal: 2 decal teks kecil — pakai objek ringan bertaip DecalLayer
    // agar tier cm-nya realistis (nama ≈ A6, nomor ≈ A5/A4).
    const personal: DecalLayer[] = [
      {
        id: "est-nama",
        url: "estimasi",
        name: "Nama Punggung",
        ...TEAMWEAR_NAME_DECAL,
      },
      {
        id: "est-nomor",
        url: "estimasi",
        name: "Nomor Punggung",
        ...TEAMWEAR_NUMBER_DECAL,
      },
    ];
    const pricing = calculate6VariablePrice({
      apparelSlug: input.apparel,
      fabricThicknessSlug: mat.fabricThicknessSlug,
      size: input.size,
      colorHex: input.colorHex,
      isSpecialPigment: !!matched?.isSpecialPigment,
      decals: [...input.baseDecals, ...personal],
      quantity: 1,
    });
    return pricing.totalPriceIdr;
  } catch {
    return null;
  }
}

/** Estimasi kasar byte payload checkout untuk guard 413 (JSON string). */
export function estimatePayloadBytes(items: Array<{ decals: DecalLayer[]; title?: string }>): number {
  try {
    return new Blob([JSON.stringify(items)]).size;
  } catch {
    return JSON.stringify(items).length;
  }
}

/** Label ukuran valid untuk apparel aktif (fallback S–XXL bila katalog tak dikenal). */
export function sizesFor(apparel: ApparelType): readonly string[] {
  return APPAREL_CATALOG[apparel]?.sizes ?? ["S", "M", "L", "XL", "XXL"];
}
