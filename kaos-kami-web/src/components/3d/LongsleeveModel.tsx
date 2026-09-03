"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";

const MODEL_PATH = "/models/longsleeve.glb";
useGLTF.preload(MODEL_PATH);

const GltfLongsleeve: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { nodes } = useGLTF(MODEL_PATH) as any;
  const {
    selectedColor,
    isRotating,
    isWireframe,
    materialFinish,
    modelPosX,
    modelPosY,
    modelScale,
    viewMode,
    partColors,
    activeColorMode,
    animationPreset,
    animationSpeed,
  } = useConfiguratorStore();

  const windStrength =
    animationPreset === "wind"
      ? 0.8 * animationSpeed
      : animationPreset === "walking"
      ? 0.4 * animationSpeed
      : animationPreset === "knit"
      ? 0.2
      : 0;

  // Multi-part coloring for longsleeve (collar, sleeves including cuffs, body)
  const coloredGeometry = useMemo(() => {
    const base = nodes?.T_Shirt_male?.geometry as THREE.BufferGeometry | undefined;
    if (!base) return null;
    if (activeColorMode !== "multi-part") return base;

    const geo = base.clone();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    if (!pos) return base;

    const colors = new Float32Array(pos.count * 3);
    const colBody = new THREE.Color(partColors.body || selectedColor);
    const colSleeve = new THREE.Color(partColors.sleeves || partColors.sleeve || selectedColor);
    const colCollar = new THREE.Color(partColors.collar || selectedColor);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let c: THREE.Color;
      if (y > 0.16) c = colCollar;
      else if (Math.abs(x) > 0.14) c = colSleeve;
      else c = colBody;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [nodes, activeColorMode, partColors, selectedColor]);

  // Use realistic cloth physical material with sheen & peach fuzz
  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "longsleeve",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength]);

  useEffect(() => {
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
    return () => {
      material.dispose();
    };
  }, [material, activeColorMode, partColors]);

  useFrame((state, delta) => {
    if (activeColorMode !== "multi-part") {
      easing.dampC(material.color, new THREE.Color(selectedColor), 0.25, delta);
    } else {
      easing.dampC(material.color, new THREE.Color(0xffffff), 0.25, delta);
    }

    if ((material as any).userData?.shader?.uniforms?.uTime) {
      (material as any).userData.shader.uniforms.uTime.value += delta * animationSpeed;
    }

    if (meshRef.current) {
      if (isRotating) meshRef.current.rotation.y += delta * 0.75;
      if (animationPreset === "walking") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.position.y = Math.sin(t * 2.2) * 0.025;
        meshRef.current.rotation.z = Math.sin(t * 1.6) * 0.04;
      } else if (animationPreset === "knit") {
        const prog = Math.min(1, (state.clock.getElapsedTime() % 3) / 2);
        const s = 0.9 + prog * 0.1;
        meshRef.current.scale.set(s, s, s);
      }
    }
  });

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;

  return (
    <group
      ref={meshRef}
      position={[posX, posY, 0]}
      scale={[scale, scale, scale]}
      dispose={null}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={(coloredGeometry as any) || nodes?.T_Shirt_male?.geometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={0.176} surfaceZBack={0.176} />
      </mesh>
    </group>
  );
};

export const LongsleeveModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfLongsleeve />
    </Suspense>
  );
};
