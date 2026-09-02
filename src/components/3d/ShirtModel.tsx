"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { easing } from "maath";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";

const MODEL_PATH_HIGH = "/models/jacket.optimized.glb";
const MODEL_PATH_LOW = "/models/jacket.lod1.glb";
const MODEL_PATH = "/models/jacket.glb";
useGLTF.preload(MODEL_PATH_HIGH);
useGLTF.preload(MODEL_PATH_LOW);
useGLTF.preload(MODEL_PATH);

const GltfJacket: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const activePath = tier === "low" ? MODEL_PATH_LOW : MODEL_PATH_HIGH;
  const { scene } = useGLTF(activePath);
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

  const { animationPreset, animationSpeed } = useConfiguratorStore();
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : 0;
  const roughness = materialFinish === "poplin" ? 0.78 : 0.86;

  const material = useMemo(() => {
    const isMulti = activeColorMode === "multi-part";
    const baseColor = isMulti ? new THREE.Color(0xffffff) : new THREE.Color(selectedColor);
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness: 0.04,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
      aoMap: null,
      aoMapIntensity: 0,
      vertexColors: isMulti,
    } as any);
    if (windStrength > 0) {
      try {
        applyWindToMaterial(mat, windStrength);
      } catch {}
    }
    return mat;
  }, [selectedColor, roughness, isWireframe, windStrength, activeColorMode]);

  // Merge and center all 10 jacket sub-meshes + vertex colors for multi-part
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
        merged.center();
        merged.computeVertexNormals();
        if (activeColorMode === "multi-part") {
          const pos = merged.attributes.position as THREE.BufferAttribute;
          if (pos) {
            const colors = new Float32Array(pos.count * 3);
            const colBody = new THREE.Color(partColors.body || selectedColor);
            const colSleeve = new THREE.Color(partColors.sleeves || partColors.sleeve || selectedColor);
            const colCollar = new THREE.Color(partColors.collar || selectedColor);
            for (let i = 0; i < pos.count; i++) {
              const x = pos.getX(i);
              const y = pos.getY(i);
              let c: THREE.Color;
              if (y > 0.22) c = colCollar;
              else if (Math.abs(x) > 0.18) c = colSleeve;
              else c = colBody;
              colors[i * 3] = c.r;
              colors[i * 3 + 1] = c.g;
              colors[i * 3 + 2] = c.b;
            }
            merged.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          }
        } else {
          merged.deleteAttribute("color");
        }
        return merged;
      }
    } catch (e) {
      console.warn("Failed to merge jacket geometries:", e);
    }
    return null;
  }, [scene, activeColorMode, partColors, selectedColor]);

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
        meshRef.current.position.y = Math.sin(t * 2.2) * 0.02;
        meshRef.current.rotation.z = Math.sin(t * 1.6) * 0.03;
      }
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
        <DecalLayerRenderer surfaceZFront={0.24} surfaceZBack={0.24} />
      </mesh>
    </group>
  );
};

export const ShirtModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfJacket />
    </Suspense>
  );
};
