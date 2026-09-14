"use client";

import { useState, useEffect } from "react";

export type DeviceTier = "high" | "mid" | "low" | "no-webgl";

export interface DeviceTierInfo {
  tier: DeviceTier;
  isMobile: boolean;
  maxDpr: number;
  enablePostProcessing: boolean;
  enableShadows: boolean;
  // B2/D1: true setelah deteksi client selesai. Nilai awal "high" hanyalah
  // placeholder SSR — JANGAN pakai tier sebelum isResolved untuk keputusan
  // berbayar (mis. memuat chunk postprocessing), agar tier-low tidak ikut unduh.
  isResolved: boolean;
}

export function useDeviceTier(): DeviceTierInfo {
  const [info, setInfo] = useState<DeviceTierInfo>({
    tier: "high",
    isMobile: false,
    maxDpr: 2,
    enablePostProcessing: true,
    enableShadows: true,
    isResolved: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const logicalCores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4; // in GB

    // Check WebGL context support & GPU vendor string
    let hasWebGL = false;
    let isLowEndGpu = false;

    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");

      if (gl) {
        hasWebGL = true;
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
          if (/Mali-400|Adreno 3|PowerVR SGX|Intel HD Graphics/i.test(renderer)) {
            isLowEndGpu = true;
          }
        }
      }
    } catch {
      hasWebGL = false;
    }

    if (!hasWebGL) {
      setInfo({
        tier: "no-webgl",
        isMobile,
        maxDpr: 1,
        enablePostProcessing: false,
        enableShadows: false,
        isResolved: true,
      });
      return;
    }

    if (memory < 3 || logicalCores <= 2 || isLowEndGpu) {
      // Low-tier device: limit DPR to 1, disable heavy shadows
      setInfo({
        tier: "low",
        isMobile,
        maxDpr: 1,
        enablePostProcessing: false,
        enableShadows: false,
        isResolved: true,
      });
    } else if (isMobile || memory <= 4 || logicalCores <= 4) {
      // Mid-tier device: DPR up to 1.5
      setInfo({
        tier: "mid",
        isMobile,
        maxDpr: 1.5,
        enablePostProcessing: true,
        enableShadows: true,
        isResolved: true,
      });
    } else {
      // High-tier device: Full visual fidelity
      setInfo({
        tier: "high",
        isMobile,
        maxDpr: 2,
        enablePostProcessing: true,
        enableShadows: true,
        isResolved: true,
      });
    }
  }, []);

  return info;
}

// ---------------------------------------------------------------------------
// E1 — Kandidat model per tier (M0.2: artefak ktx2 palsu + optimized duplikat
// bit-identik DIHAPUS 11 Sep 2026; rantai disederhanakan agar tak 404).
// high → file prod penuh; low → lod1 ringan lalu prod penuh.
// Semua pemakaian WAJIB lewat probeFirstExistingUrl agar studio tetap jalan
// walau lod1 belum ada di /public/models.
// ---------------------------------------------------------------------------

// FASE 13 & P0-4: rantai default BARU (draco → master). Model legacy hoodie.glb
// dipensiunkan ke backups/ demi lisensi CC-BY 4.0 terverifikasi (Irevex11).
export const HOODIE_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/hoodie-blue.glb?v=7"],
  low: ["/models/hoodie-blue.glb?v=7"],
};

export const JACKET_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/sweater.glb?v=7"],
  low: ["/models/sweater.glb?v=7"],
};

export const TSHIRT_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/tee-basic.glb?v=7", "/models/tshirt-heavyweight.glb?v=7"],
  low: ["/models/tee-basic.glb?v=7", "/models/tshirt-heavyweight.glb?v=7"],
};

export const LONGSLEEVE_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/longsleeve.glb?v=7"],
  low: ["/models/longsleeve.glb?v=7"],
};

export const CREWNECK_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/sweater.glb?v=7"],
  low: ["/models/sweater.glb?v=7"],
};

export const CAP_MODEL_CANDIDATES: Record<"high" | "low", string[]> = {
  high: ["/models/cap.glb?v=7"],
  low: ["/models/cap.glb?v=7"],
};

// Kembalikan URL kandidat pertama yang TERBUKTI ada (HEAD). Tak pernah throw:
// gagal total (offline/HEAD diblokir) → fallback elemen terakhir (path lama
// yang diasumsikan selalu ada). SSR → langsung fallback terakhir.
export async function probeFirstExistingUrl(candidates: string[]): Promise<string> {
  const fallback = candidates[candidates.length - 1] ?? "/models/hoodie-blue.glb";
  try {
    if (typeof window === "undefined" || typeof fetch === "undefined") return fallback;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) return url;
      } catch {
        // Lanjut ke kandidat berikutnya (file belum dibuat agen aset = normal).
      }
    }
  } catch {
    // Abaikan — pakai fallback di bawah.
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// CATATAN KEADALUWARSAAN (13 Sep 2026 — komentar saja; RANTAI DEFAULT TAK DIUBAH):
// `public/models/pants.glb` + `shorts.glb` (madjin, klaim MIT checklist:57) ADA
// di disk tapi SENGAJA tanpa rantai kandidat di sini: celana terkunci di
// APPAREL_CATALOG (mockup-only) dan PantsModel/ShortsModel me-wire langsung ke
// "/models/pants.glb" + "/models/shorts.glb" (bukan via probeFirstExistingUrl).
// JANGAN tambah PANTS/SHORTS_CANDIDATES tanpa keputusan owner (butuh URL repo
// persis + varian Draco/LOD + ukur cm). Rantai kaos/hoodie/crewneck/topi di atas
// sudah Fase-13 (draco → master → legacy) — jangan ubah urutan.
// ---------------------------------------------------------------------------
