"use client";

import React, { useEffect } from "react";
import { Decal, useTexture } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits, REAL_WORLD_PRINT_LIMITS } from "@/lib/scaleCalibration";
import type { DecalLayer } from "@/lib/constants";

const SingleDecalItem: React.FC<{
  decal: DecalLayer;
  surfaceZ: number;
}> = ({ decal, surfaceZ }) => {
  const uploaded = useTexture(decal.url);

  useEffect(() => {
    return () => {
      uploaded.dispose();
    };
  }, [uploaded]);

  const isBack = decal.targetSide === "back";
  const isLeftSleeve = decal.targetSide === "left_sleeve";
  const isRightSleeve = decal.targetSide === "right_sleeve";

  // Jangkar lengan per-apparel dari hasil ukur mesh (bukan ±0.27 global)
  const sleeveX =
    APPAREL_PHYSICAL_SPECS[useConfiguratorStore.getState().activeApparel]?.sleeveAnchorX ?? 0.27;

  let posX = decal.x;
  let posY = decal.y;
  let posZ = isBack ? -surfaceZ : surfaceZ;
  let rotY = isBack ? Math.PI : 0;
  const rotZ = (decal.rotation * Math.PI) / 180;

  if (isLeftSleeve) {
    // Proyeksi ke lengan kiri (X negatif)
    posX = -sleeveX;
    posZ = decal.x; // slider X mengatur geser maju-mundur di lengan
    rotY = -Math.PI / 2;
  } else if (isRightSleeve) {
    // Proyeksi ke lengan kanan (X positif)
    posX = sleeveX;
    posZ = -decal.x;
    rotY = Math.PI / 2;
  }

  // Starklord technique: anisotropy 16 + depth tuning for crisp decal at angle
  if ((uploaded as any).anisotropy !== undefined) {
    (uploaded as any).anisotropy = 16;
    uploaded.needsUpdate = true;
  }

  // Presisi Rasio Aspek Alami & Normalisasi Skala Fisik Nyata (Maksimal 30.0 cm DTF)
  const imgWidth = (uploaded.image as any)?.width || 1;
  const imgHeight = (uploaded.image as any)?.height || 1;
  const aspect = imgWidth > 0 && imgHeight > 0 ? imgWidth / imgHeight : 1;

  // Auto-koreksi data legacy dari localStorage (jika scale tersimpan > 0.22, normalisasi ke skala metrik 1:1)
  let normalizedScale = decal.scale;
  if (normalizedScale > 0.22) {
    normalizedScale = Math.min(0.162, normalizedScale * 0.22);
  }
  // Kunci keras pada batas fisik printhead roll DTF workshop Makassar —
  // batas UNIT dihitung dari multiplier terukur agar 30cm benar-benar tercapai.
  const maxScale = maxDecalScaleUnits(
    useConfiguratorStore.getState().activeApparel,
    decal.targetSide
  );
  normalizedScale = Math.max(
    REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits,
    Math.min(maxScale, normalizedScale)
  );

  let scaleX = normalizedScale;
  let scaleY = normalizedScale;
  if (aspect >= 1) {
    // Landscape atau Square: lebar dasar, tinggi proporsional
    scaleY = normalizedScale / aspect;
  } else {
    // Portrait: tinggi dasar, lebar proporsional
    scaleX = normalizedScale * aspect;
  }

  return (
    <Decal
      position={[posX, posY, posZ]}
      rotation={[0, rotY, rotZ]}
      scale={[scaleX, scaleY, 0.35]}
    >
      <meshStandardMaterial
        map={uploaded}
        transparent
        opacity={decal.opacity}
        polygonOffset
        polygonOffsetFactor={-10}
        depthTest={false}
        depthWrite={true}
        roughness={0.8}
        metalness={0}
      />
    </Decal>
  );
};

export const DecalLayerRenderer: React.FC<{
  surfaceZFront?: number;
  surfaceZBack?: number;
}> = ({
  surfaceZFront = 0.176,
  surfaceZBack = 0.176,
}) => {
  const { decals } = useConfiguratorStore();

  if (!decals || decals.length === 0) {
    return null;
  }

  return (
    <>
      {decals.map((decal) => (
        <SingleDecalItem
          key={decal.id}
          decal={decal}
          surfaceZ={decal.targetSide === "front" ? surfaceZFront : surfaceZBack}
        />
      ))}
    </>
  );
};
