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

  const { animationPreset, animationSpeed } = useConfiguratorStore();
  // Wind strength via animationPreset (BLUEPRINT-02 §4)
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  // Multi-part fake by vertex position (tanpa Blender re-export) — body/sleeves/collar by |x|/y threshold
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

  const material = useMemo(() => {
    const isMulti = activeColorMode === "multi-part";
    const baseColor = isMulti ? new THREE.Color(0xffffff) : new THREE.Color(selectedColor);
    if (materials?.lambert1) {
      const mat = materials.lambert1.clone() as THREE.MeshStandardMaterial;
      mat.color.copy(baseColor);
      mat.roughness = roughness;
      mat.metalness = 0.03;
      mat.wireframe = isWireframe;
      mat.aoMap = null;
      mat.aoMapIntensity = 0;
      mat.side = THREE.DoubleSide;
      (mat as any).vertexColors = isMulti;
      return mat;
    }
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness: 0.03,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
      vertexColors: isMulti,
    } as any);
  }, [materials, selectedColor, roughness, isWireframe, activeColorMode]);

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

  useFrame((state, delta) => {
    if (activeColorMode !== "multi-part") {
      easing.dampC(material.color, new THREE.Color(selectedColor), 0.25, delta);
    } else {
      // In multi-part, material stays white — vertex colors carry part colors, so keep white
      easing.dampC(material.color, new THREE.Color(0xffffff), 0.25, delta);
    }
    // Wind uTime update
    if ((material as any).userData?.shader?.uniforms?.uTime) {
      (material as any).userData.shader.uniforms.uTime.value += delta * animationSpeed;
    }
    // Animation presets: wind via shader, walking via bob, knit via quick reveal, static none
    if (meshRef.current) {
      if (isRotating) meshRef.current.rotation.y += delta * 0.75;
      if (animationPreset === "walking") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.position.y = Math.sin(t * 2.2) * 0.025;
        meshRef.current.rotation.z = Math.sin(t * 1.6) * 0.04;
      } else if (animationPreset === "knit") {
        const prog = Math.min(1, (state.clock.getElapsedTime() % 3) / 2);
        // subtle scale reveal for knit
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

export const TshirtModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfTshirt />
    </Suspense>
  );
};
