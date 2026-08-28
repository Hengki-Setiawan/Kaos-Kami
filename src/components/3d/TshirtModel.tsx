"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { DecalLayerRenderer } from "./DecalLayerRenderer";

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

  const roughness =
    materialFinish === "acid-wash"
      ? 0.78
      : materialFinish === "french-terry"
      ? 0.88
      : 0.84;

  const material = useMemo(() => {
    if (materials?.lambert1) {
      const mat = materials.lambert1.clone() as THREE.MeshStandardMaterial;
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
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((_, delta) => {
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
