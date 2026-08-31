"use client";

import { useState, useEffect } from "react";

export type DeviceTier = "high" | "mid" | "low" | "no-webgl";

export interface DeviceTierInfo {
  tier: DeviceTier;
  isMobile: boolean;
  maxDpr: number;
  enablePostProcessing: boolean;
  enableShadows: boolean;
}

export function useDeviceTier(): DeviceTierInfo {
  const [info, setInfo] = useState<DeviceTierInfo>({
    tier: "high",
    isMobile: false,
    maxDpr: 2,
    enablePostProcessing: true,
    enableShadows: true,
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
      });
    } else if (isMobile || memory <= 4 || logicalCores <= 4) {
      // Mid-tier device: DPR up to 1.5
      setInfo({
        tier: "mid",
        isMobile,
        maxDpr: 1.5,
        enablePostProcessing: true,
        enableShadows: true,
      });
    } else {
      // High-tier device: Full visual fidelity
      setInfo({
        tier: "high",
        isMobile,
        maxDpr: 2,
        enablePostProcessing: true,
        enableShadows: true,
      });
    }
  }, []);

  return info;
}
