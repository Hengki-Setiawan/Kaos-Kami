"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { easing } from "maath";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { getStretchFactors } from "@/lib/3d/stretchPhysics";

const MODEL_PATH = "/models/jacket.glb?v=15";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

const GltfJacket: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const invalidate = useThree((s) => s.invalidate);
  const { scene } = useGLTF(path) as any;
  const {
    selectedColor,
    isRotating,
    isWireframe,
    materialFinish,
    modelPosX,
    modelPosY,
    modelScale,
    viewMode,
  } = useConfiguratorStore(
    useShallow((s) => ({
      selectedColor: s.selectedColor,
      isRotating: s.isRotating,
      isWireframe: s.isWireframe,
      materialFinish: s.materialFinish,
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
      modelScale: s.modelScale,
      viewMode: s.viewMode,
    }))
  );
  const { partColors, activeColorMode } = useConfiguratorStore(
    useShallow((s) => ({ partColors: s.partColors, activeColorMode: s.activeColorMode }))
  );

  const { animationPreset, animationSpeed, testLabMode, stretchIntensity, stretchDirection } = useConfiguratorStore(
    useShallow((s) => ({
      animationPreset: s.animationPreset,
      animationSpeed: s.animationSpeed,
      testLabMode: s.testLabMode,
      stretchIntensity: s.stretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : 0;

  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "jacket",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength, tier]);

  // Ekstrak geometri jaket terkalibrasi proporsional (selaras Hoodie acuan emas):
  // scaleMultiplier 0.52 & crownYOffset -0.075 agar bahu tepat di Y=0.110 dan area dada atas di Y=0.05 (logo KK pas di dada).
  const baseGeometry = useMemo(() => {
    return extractApparelGeometry(scene, { scaleMultiplier: 0.52, crownYOffset: -0.075 });
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  // Atribut warna vertex (multi-part) untuk badan jaket (ruang terkalibrasi: kerah y>0.14, lengan |x|>0.20)
  const mergedGeometry = useMemo(() => {
    if (!baseGeometry) return null;
    if (activeColorMode !== "multi-part") {
      if (baseGeometry.getAttribute("color")) baseGeometry.deleteAttribute("color");
      return baseGeometry;
    }
    const pos = baseGeometry.attributes.position as THREE.BufferAttribute;
    if (pos) {
      const colBody = new THREE.Color(partColors.body || selectedColor);
      const colSleeve = new THREE.Color(partColors.sleeves || partColors.sleeve || selectedColor);
      const colCollar = new THREE.Color(partColors.collar || selectedColor);
      let attr = baseGeometry.getAttribute("color") as THREE.BufferAttribute | null;
      if (!attr || attr.count !== pos.count) {
        attr = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
        baseGeometry.setAttribute("color", attr);
      }
      const arr = attr.array as Float32Array;
      const tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        if (y > 0.14) tmp.copy(colCollar);
        else if (Math.abs(x) > 0.20) tmp.copy(colSleeve);
        else tmp.copy(colBody);
        arr[i * 3] = tmp.r;
        arr[i * 3 + 1] = tmp.g;
        arr[i * 3 + 2] = tmp.b;
      }
      attr.needsUpdate = true;
    }
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  // Dispose via ResourceTracker terpisah per jenis
  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, mergedGeometry);
  useTrackedResource(matTracker, material);

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

  const stretchFactors = getStretchFactors(testLabMode, stretchIntensity, stretchDirection);

  return (
    <group
      ref={meshRef}
      position={[posX, posY, 0]}
      scale={[scale * stretchFactors.stretchX, scale * stretchFactors.stretchY, scale * stretchFactors.stretchZ]}
      dispose={null}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={mergedGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("shirt")} surfaceZBack={surfaceZForApparel("shirt")} />
      </mesh>
    </group>
  );
};

export const ShirtModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfJacket path={MODEL_PATH} />
    </Suspense>
  );
};
