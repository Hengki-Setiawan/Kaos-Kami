"use client";

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Decal, useTexture } from '@react-three/drei';
import { useMobileStudioStore, mobileMaxScaleUnits } from '@/store/useMobileStudioStore';

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

  useEffect(() => {
    if (texture) {
      texture.anisotropy = 16;
      texture.needsUpdate = true;
    }
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  // Aspect ratio preservation
  const aspect = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    if (img && img.width > 0 && img.height > 0) {
      return img.width / img.height;
    }
    return 1;
  }, [texture]);

  // Clamp skala pada batas cetak AKTUAL per apparel (terkalibrasi ukur).
  const apparel = useMobileStudioStore((s) => s.apparelType);
  const maxScale = mobileMaxScaleUnits(apparel);
  const maxDimension = Math.min(maxScale, Math.max(0.04, scale[0]));
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
        map={texture}
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
