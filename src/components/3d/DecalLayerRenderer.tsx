"use client";

import React, { useEffect } from "react";
import { Decal, useTexture } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
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
  const zPos = isBack ? -surfaceZ : surfaceZ;
  const rotY = isBack ? Math.PI : 0;
  const rotZ = (decal.rotation * Math.PI) / 180;

  // Starklord technique: anisotropy 16 + depth tuning for crisp decal at angle
  if ((uploaded as any).anisotropy !== undefined) {
    (uploaded as any).anisotropy = 16;
    uploaded.needsUpdate = true;
  }

  return (
    <Decal
      position={[decal.x, decal.y, zPos]}
      rotation={[0, rotY, rotZ]}
      scale={[decal.scale, decal.scale, 0.35]}
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
