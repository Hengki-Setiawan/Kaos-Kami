/**
 * REAL-TIME PRINT RESOLUTION & DPI QUALITY ANALYZER
 * Formula: Effective DPI = Image Pixel Width / (Print Width in Centimeters / 2.54)
 */

export type PrintQualityTier = "EXCELLENT" | "GOOD" | "POOR";

export interface QualityReport {
  dpi: number;
  tier: PrintQualityTier;
  badgeLabel: string;
  badgeColor: string; // Tailwind styling class
  warningMessage?: string;
  recommendation: string;
}

export function evaluatePrintQuality(
  imagePixelWidth: number = 1200,
  printWidthCm: number = 28.5,
  // Sumbu ke-2 (audit #21 — DPI 1 sumbu menipu bila artwork portrait/
  // stretch). DPI efektif = sumbu TERKECIL (yang paling dulu pecah).
  imagePixelHeight?: number,
  printHeightCm?: number
): QualityReport {
  const wIn = Math.max(0.5, printWidthCm / 2.54);
  let dpi = Math.round(imagePixelWidth / wIn);
  if (imagePixelHeight && printHeightCm) {
    const hIn = Math.max(0.5, printHeightCm / 2.54);
    dpi = Math.min(dpi, Math.round(imagePixelHeight / hIn));
  }

  if (dpi >= 300) {
    return {
      dpi,
      tier: "EXCELLENT",
      badgeLabel: `🟢 ${dpi} DPI (HD Tajam & Siap Cetak)`,
      badgeColor: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
      recommendation: "Resolusi grafis sangat prima. Cetakan sablon DTF akan memiliki detail mikroskopis yang jernih.",
    };
  } else if (dpi >= 150) {
    return {
      dpi,
      tier: "GOOD",
      badgeLabel: `🟡 ${dpi} DPI (Kualitas Cukup Jelas)`,
      badgeColor: "text-amber-400 bg-amber-950/40 border-amber-500/30",
      warningMessage: "Hasil cetak cukup baik, namun garis sangat halus mungkin terlihat sedikit lembut.",
      recommendation: "Untuk hasil maksimal standar distro, gunakan resolusi minimal 2000px atau perkecil sedikit skala sablon.",
    };
  } else {
    return {
      dpi,
      tier: "POOR",
      badgeLabel: `🔴 ${dpi} DPI (Peringatan: Gambar Blur/Pecah)`,
      badgeColor: "text-rose-400 bg-rose-950/40 border-rose-500/30",
      warningMessage: "Resolusi file terlalu kecil untuk ukuran cetak ini. Gambar berpotensi pecah/pixelated di atas kain.",
      recommendation: "Perkecil skala gambar atau gunakan tombol [Pertajam Resolusi] / ganti dengan file berresolusi lebih tinggi.",
    };
  }
}
