"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';

export function MobileStudioLighting() {
  const { shadows } = useMobileDeviceTier();

  return (
    <>
      {/* Studio Ambient Base */}
      <ambientLight intensity={0.65} color="#F8FAFC" />

      {/* Main Key Light */}
      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={1.2}
        color="#FFFFFF"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Fill Light */}
      <directionalLight
        position={[-2.5, 2.0, 2.0]}
        intensity={0.55}
        color="#E0E7FF"
      />

      {/* Rim / Backlight (Makassar Streetwear Edge Glow) */}
      <directionalLight
        position={[0, 3.5, -3.0]}
        intensity={0.85}
        color="#FF8A50"
      />

      {/* Soft Contact Shadow beneath garment */}
      <ContactShadows
        position={[0, -0.9, 0]}
        opacity={0.45}
        scale={4.0}
        blur={2.0}
        far={1.5}
        color="#000000"
      />
    </>
  );
}
