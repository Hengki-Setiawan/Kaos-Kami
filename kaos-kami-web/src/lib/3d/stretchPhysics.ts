"use client";

import type { StretchDirection, TestLabMode } from "@/store/useConfiguratorStore";

export interface StretchFactors {
  stretchX: number;
  stretchY: number;
  stretchZ: number;
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
