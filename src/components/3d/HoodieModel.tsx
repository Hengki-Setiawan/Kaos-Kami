"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { DecalLayerRenderer } from "./DecalLayerRenderer";

const MODEL_PATH = "/models/hoodie.glb";
useGLTF.preload(MODEL_PATH);

const GltfHoodie: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_PATH);
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

  const roughness = materialFinish === "acid-wash" ? 0.82 : 0.88;

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedColor),
      roughness,
      metalness: 0.03,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
      aoMap: null,
      aoMapIntensity: 0,
    });
  }, [selectedColor, roughness, isWireframe]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Merge and normalize all Clo3D hoodie meshes so the model is centered at [0,0,0]
  const mergedGeometry = useMemo(() => {
    scene.updateMatrixWorld(true);
    const geoms: THREE.BufferGeometry[] = [];

    scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        geoms.push(cloned);
      }
    });

    if (geoms.length === 0) return null;

    try {
      const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
      if (merged) {
        merged.center(); // Center origin at [0, 0, 0]
        merged.computeVertexNormals();
        return merged;
      }
    } catch (e) {
      console.warn("Failed to merge hoodie geometries:", e);
    }
    return null;
  }, [scene]);

  useFrame((_, delta) => {
    if (meshRef.current && isRotating) {
      meshRef.current.rotation.y += delta * 0.75;
    }
  });

  if (!mergedGeometry) return null;

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
        geometry={mergedGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={0.176} surfaceZBack={0.176} />
      </mesh>
    </group>
  );
};

export const HoodieModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfHoodie />
    </Suspense>
  );
};
