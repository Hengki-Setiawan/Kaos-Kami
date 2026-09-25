"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';

export type MobileStudioTheme = 'gallery' | 'obsidian' | 'concrete';

export function MobileStudioLighting({
  theme = 'obsidian',
  dimFactor = 1.0,
}: {
  theme?: MobileStudioTheme;
  /** F2 Test Lab: 0.05 saat mode senter (darkroom QC cermin web testLabDim). */
  dimFactor?: number;
}) {
  const { shadows, tier } = useMobileDeviceTier();
  // Resolusi shadow map per-tier (hemat VRAM low-end).
  const shadowResolution = tier === 'high' ? 1024 : tier === 'mid' ? 512 : 256;

  // P0-3: branch warna cermin web StudioLighting (hemi sky/ground, key/
  // fill/rim, shadow). gallery = terang, concrete = abu gelap, obsidian = default.
  const isLightMode = theme === 'gallery';
  const shadowColor = isLightMode ? '#707080' : '#050508';
  const hemiSky = isLightMode ? '#eae7e1' : theme === 'concrete' ? '#f1f3f9' : '#F8FAFC';
  const hemiGround = isLightMode ? '#d4d0c7' : '#2a2b30';
  const hemiIntensity = isLightMode ? 0.35 : 0.4;
  const fillColor = isLightMode ? '#e2e8f0' : '#E0E7FF';
  const rimColor = isLightMode ? '#f8fafc' : '#FF8A50';

  return (
    <>
      {/* Studio Ambient Base (hemisphere agar lipatan terbaca, cermin web) */}
      <hemisphereLight args={[hemiSky, hemiGround, hemiIntensity * dimFactor]} />
      <ambientLight intensity={0.25 * dimFactor} color="#F8FAFC" />

      {/* Main Key Light */}
      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={1.2 * dimFactor}
        color="#FFFFFF"
        castShadow={shadows}
        shadow-mapSize-width={shadowResolution}
        shadow-mapSize-height={shadowResolution}
        shadow-bias={-0.0001}
      />

      {/* Fill Light */}
      <directionalLight
        position={[-2.5, 2.0, 2.0]}
        intensity={0.55 * dimFactor}
        color={fillColor}
      />

      {/* Rim / Backlight (Makassar Streetwear Edge Glow) */}
      <directionalLight
        position={[0, 3.5, -3.0]}
        intensity={0.85 * dimFactor}
        color={rimColor}
      />

      {/* Soft Contact Shadow beneath garment — frames={1}: dipanggang sekali
          (hemat GPU), bukan render ulang tiap frame. */}
      <ContactShadows
        position={[0, -0.9, 0]}
        opacity={0.45}
        scale={4.0}
        blur={2.0}
        far={1.5}
        frames={1}
        resolution={shadowResolution}
        color={shadowColor}
      />
    </>
  );
}
