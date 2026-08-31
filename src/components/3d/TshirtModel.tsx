"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";

const MODEL_PATH = "/models/tshirt-heavyweight.glb";
useGLTF.preload(MODEL_PATH);

const GltfTshirt: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { nodes, materials } = useGLTF(MODEL_PATH) as any;
  const {
    selectedColor,
    isRotating,
    isWireframe,
    materialFinish,
    modelPosX,
    modelPosY,
    modelScale,
    viewMode,
  } = useConfiguratorStore();

  const { partColors, activeColorMode } = useConfiguratorStore();
  const roughness =
    materialFinish === "acid-wash"
      ? 0.78
      : materialFinish === "french-terry"
      ? 0.88
      : 0.84;

  // Wind strength: 0 static, 0.6 when rotating (BLUEPRINT-02 §4 cheap cloth)
  const windStrength = isRotating ? 0.6 : 0;

  const material = useMemo(() => {
    if (materials?.lambert1) {
      const mat = materials.lambert1.clone() as THREE.MeshStandardMaterial;
      // Initial color set, then smoothed via dampC in useFrame (starklord technique)
      mat.color.set(selectedColor);
      mat.roughness = roughness;
      mat.metalness = 0.03;
      mat.wireframe = isWireframe;
      mat.aoMap = null;
      mat.aoMapIntensity = 0;
      mat.side = THREE.DoubleSide;
      return mat;
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedColor),
      roughness,
      metalness: 0.03,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
    });
  }, [materials, selectedColor, roughness, isWireframe]);

  useEffect(() => {
    // Afilah multi-part: if multi-part mode, override with first part color
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
    // Wind shader wiring (BLUEPRINT-02 §4)
    if (windStrength > 0) {
      try {
        applyWindToMaterial(material, windStrength);
      } catch {}
    }
    return () => {
      material.dispose();
    };
  }, [material, activeColorMode, partColors, windStrength]);

  useFrame((_, delta) => {
    easing.dampC(material.color, new THREE.Color(selectedColor), 0.25, delta);
    // Wind uTime update
    if ((material as any).userData?.shader?.uniforms?.uTime) {
      (material as any).userData.shader.uniforms.uTime.value += delta;
    }
    if (meshRef.current && isRotating) {
      meshRef.current.rotation.y += delta * 0.75;
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
        geometry={nodes?.T_Shirt_male?.geometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={0.176} surfaceZBack={0.176} />
      </mesh>
    </group>
  );
};

export const TshirtModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfTshirt />
    </Suspense>
  );
};
