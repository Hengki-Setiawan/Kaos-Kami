"use client";

import { useState, useEffect } from 'react';

export type DeviceTier = 'high' | 'mid' | 'low' | 'no-webgl';

export interface TierCapabilities {
  tier: DeviceTier;
  dpr: [number, number];
  shadows: boolean;
  softShadows: boolean;
  antialias: boolean;
  maxTextureSize: number;
  targetFps: number;
}

const TIER_PROFILES: Record<DeviceTier, TierCapabilities> = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    shadows: true,
    softShadows: true,
    antialias: true,
    maxTextureSize: 2048,
    targetFps: 60,
  },
  mid: {
    tier: 'mid',
    dpr: [1, 1.5],
    shadows: true,
    softShadows: false,
    antialias: true,
    maxTextureSize: 1024,
    targetFps: 60,
  },
  low: {
    tier: 'low',
    dpr: [1, 1],
    shadows: false,
    softShadows: false,
    antialias: false,
    maxTextureSize: 512,
    targetFps: 30,
  },
  'no-webgl': {
    tier: 'no-webgl',
    dpr: [1, 1],
    shadows: false,
    softShadows: false,
    antialias: false,
    maxTextureSize: 0,
    targetFps: 0,
  },
};

export function useMobileDeviceTier(): TierCapabilities {
  const [capabilities, setCapabilities] = useState<TierCapabilities>(TIER_PROFILES.mid);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

      if (!gl) {
        setCapabilities(TIER_PROFILES['no-webgl']);
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
      const cores = navigator.hardwareConcurrency ?? 4;

      const isAdreno = /Adreno/i.test(renderer);
      const isMali = /Mali/i.test(renderer);
      const isApple = /Apple/i.test(renderer) || /iPhone|iPad/i.test(navigator.userAgent);

      // Flagship profile detection
      if ((isApple && memory >= 4) || (isAdreno && /Adreno.*(7|8)/i.test(renderer)) || (cores >= 8 && memory >= 6)) {
        setCapabilities(TIER_PROFILES.high);
      } else if (memory <= 3 || cores <= 4 || (isMali && /Mali-G(5|7)[0-2]/i.test(renderer))) {
        setCapabilities(TIER_PROFILES.low);
      } else {
        setCapabilities(TIER_PROFILES.mid);
      }
    } catch {
      setCapabilities(TIER_PROFILES.mid);
    }
  }, []);

  return capabilities;
}
