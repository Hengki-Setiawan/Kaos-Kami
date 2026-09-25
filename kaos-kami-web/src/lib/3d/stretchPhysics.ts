"use client";

import type { StretchDirection, TestLabMode } from "@/store/useConfiguratorStore";

export interface StretchFactors {
  stretchX: number;
  stretchY: number;
  stretchZ: number;
}

// Bukti SSOT P0 ENTERPRISE: satu-satunya sumber kebenaran untuk label elongasi/
// recovery di TestLabControls.tsx. Nilai elongasi = batas visual aman simulasi
// per arah (bukan sertifikasi lab). Poisson 0.4 = nilai efektif kain knit yang
// dipakai getStretchFactors (kontraksi 0.12/0.38 ≈ 0.32–0.4, dibulatkan 0.4).
export const U_MAX_ELONG: Record<StretchDirection, number> = {
  horizontal: 0.3,
  vertical: 0.18,
  biaxial: 0.2,
};

// Bukti: rasio Poisson efektif knit katun/fleece untuk kontraksi lateral visual.
export const POISSON_EFF = 0.4;

// Bukti: estimasi visual pemulihan elastis ala ASTM D2594 (knit stretch &
// recovery), 96% saat rileks turun 14 poin pada tarikan penuh. Bukan hasil lab.
export function recoveryEstimate(intensity: number): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  return 96 - 14 * clamped;
}

// Bukti: elongasi% visual = intensitas slider (0–1) × batas arah U_MAX_ELONG.
export function elongationPercent(
  direction: StretchDirection,
  intensity: number
): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  return U_MAX_ELONG[direction] * clamped * 100;
}

/**
 * Menghitung deformasi elastis kain dan sablon DTF berdasarkan arah tarikan
 * mengikuti rasio Poisson kain katun/fleece (saat ditarik melebar, kain sedikit mengerut membujur).
 */
export function getStretchFactors(
  testLabMode: TestLabMode,
  stretchIntensity: number,
  stretchDirection: StretchDirection = "horizontal"
): StretchFactors {
  if (testLabMode !== "stretch" || stretchIntensity <= 0.001) {
    return { stretchX: 1.0, stretchY: 1.0, stretchZ: 1.0 };
  }

  const clamped = Math.max(0, Math.min(1, stretchIntensity));

  if (stretchDirection === "vertical") {
    // Tarik ke bawah (vertikal): memanjang di Y, mengerut di X dan Z
    return {
      stretchX: 1.0 - clamped * 0.12,
      stretchY: 1.0 + clamped * 0.38,
      stretchZ: 1.0 - clamped * 0.08,
    };
  }

  if (stretchDirection === "biaxial") {
    // Tarik segala arah (radial): memanjang di X dan Y, menipis di Z
    return {
      stretchX: 1.0 + clamped * 0.26,
      stretchY: 1.0 + clamped * 0.26,
      stretchZ: 1.0 - clamped * 0.14,
    };
  }

  // Default: Horizontal (uji tarik dada melintang)
  return {
    stretchX: 1.0 + clamped * 0.38,
    stretchY: 1.0 - clamped * 0.12,
    stretchZ: 1.0 - clamped * 0.08,
  };
}
