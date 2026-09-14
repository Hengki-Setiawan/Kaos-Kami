"use client";

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Decal, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useMobileStudioStore, mobileMaxScaleUnits } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';

function DecalItem({
  url,
  position,
  scale,
  rotation,
}: {
  url: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
}) {
  const texture = useTexture(url);
  const gl = useThree((s) => s.gl);
  // Cap tekstur per-tier (useMobileDeviceTier): low 512 / mid 1024 / high 2048
  // → cap anisotropy 2 / 4 / 8 (hemat VRAM & bandwidth HP low-end).
  const { maxTextureSize } = useMobileDeviceTier();

  // PERF 14 Sep 2026 cermin web DecalLayerRenderer: guard set-sekali agar tak
  // re-upload GPU tiap render. JANGAN texture.dispose — cache drei per-URL
  // dipakai bersama; dispose = flicker/use-after-dispose di decal lain.
  useEffect(() => {
    if (!texture) return;
    try {
      const tierCap = maxTextureSize >= 2048 ? 8 : maxTextureSize >= 1024 ? 4 : 2;
      let rendererMax = 8;
      try {
        rendererMax = gl.capabilities.getMaxAnisotropy();
      } catch {}
      const target = Math.min(8, tierCap, rendererMax);
      if ((texture as any).anisotropy !== target) {
        texture.anisotropy = target;
        texture.needsUpdate = true;
      }
      if (
        (texture as any).colorSpace !== undefined &&
        (texture as any).colorSpace !== THREE.SRGBColorSpace
      ) {
        (texture as any).colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
      }
    } catch {}
  }, [texture, maxTextureSize, gl]);

  // PERF 14 Sep 2026 cermin web DecalLayerRenderer.tsx:131-156: downscale
  // artwork >1024 ke sisi-panjang 1024 untuk PREVIEW 3D saja (master cetak
  // tak tersentuh). 2048²→1024² = −75% VRAM; di layar HP 1024 sudah >2×
  // oversample. Kecil (≤1024) = pakai asli (nol copy). Copy hasil di-dispose
  // saat ganti; cache drei tak disentuh.
  const displayMap = useMemo(() => {
    try {
      const img = (texture.image as unknown as { width?: number; height?: number }) || {};
      const w = Number((img as { width?: number }).width) || 0;
      const h = Number((img as { height?: number }).height) || 0;
      if (!w || !h || (w <= 1024 && h <= 1024)) return texture;
      if (typeof document === 'undefined') return texture;
      const s = Math.min(1024 / w, 1024 / h);
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return texture;
      ctx.drawImage(texture.image as unknown as CanvasImageSource, 0, 0, cw, ch);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      try {
        tex.anisotropy = texture.anisotropy;
      } catch {}
      tex.needsUpdate = true;
      return tex;
    } catch {
      return texture;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture]);

  useEffect(() => {
    return () => {
      try {
        if (displayMap !== texture) (displayMap as unknown as { dispose?: () => void }).dispose?.();
      } catch {}
    };
  }, [displayMap, texture]);

  // Aspect ratio preservation (dari displayMap agar ikut ukuran downscale)
  const aspect = useMemo(() => {
    const img = displayMap.image as HTMLImageElement | undefined;
    if (img && img.width > 0 && img.height > 0) {
      return img.width / img.height;
    }
    return 1;
  }, [displayMap]);

  // Clamp skala pada batas cetak AKTUAL per apparel (terkalibrasi ukur).
  // Bawah selaras Zod web DecalLayerSchema.scale min 0.02.
  const apparel = useMobileStudioStore((s) => s.apparelType);
  const maxScale = mobileMaxScaleUnits(apparel);
  const maxDimension = Math.min(maxScale, Math.max(0.02, scale[0]));
  const finalScale: [number, number, number] = aspect >= 1
    ? [maxDimension, maxDimension / aspect, maxDimension]
    : [maxDimension * aspect, maxDimension, maxDimension];

  return (
    <Decal
      position={position}
      rotation={[0, 0, rotation]}
      scale={finalScale}
    >
      <meshStandardMaterial
        map={displayMap}
        transparent
        polygonOffset
        polygonOffsetFactor={-4}
        roughness={0.4}
        metalness={0.1}
        depthTest={true}
        depthWrite={false}
      />
    </Decal>
  );
}

export function MobileDecalLayerRenderer() {
  const decalUrl = useMobileStudioStore((s) => s.decalUrl);
  const decalPosition = useMobileStudioStore((s) => s.decalPosition);
  const decalScale = useMobileStudioStore((s) => s.decalScale);
  const decalRotation = useMobileStudioStore((s) => s.decalRotation);

  if (!decalUrl) return null;

  return (
    <DecalItem
      url={decalUrl}
      position={decalPosition}
      scale={decalScale}
      rotation={decalRotation}
    />
  );
}
