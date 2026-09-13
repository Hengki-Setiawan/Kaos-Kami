"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { ensureWindWeights } from "@/lib/geometryPrep";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { SilentModelFallback } from "@/components/ui/ModelErrorBoundary";
import { HoodieModel } from "./HoodieModel";

// FASE 13 — crewneck akhirnya punya mesh SENDIRI (sweater.glb, sweater_pack
// Sketchfab, TANPA tudung — bukan lagi pinjaman hoodie.glb). Struktur meniru
// TshirtModel (single-mesh + center + cloth material + DecalLayerRenderer).
// Fallback DIAM ke mesh lama (hoodie.glb) bila sweater gagal dimuat.
const MODEL_PATH_NEW_DRC = "/models/sweater.draco.glb";
const MODEL_PATH_NEW = "/models/sweater.glb";
useGLTF.preload(MODEL_PATH_NEW_DRC);
useGLTF.preload(MODEL_PATH_NEW);

/** Ambil geometri mesh pertama (agnostik nama node Sketchfab). */
function firstMeshGeometry(nodes: any): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  return found?.geometry as THREE.BufferGeometry | undefined;
}

const GltfCrewneckNew: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const { nodes } = useGLTF(path) as any;
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

  const { animationPreset, animationSpeed } = useConfiguratorStore(
    useShallow((s) => ({ animationPreset: s.animationPreset, animationSpeed: s.animationSpeed }))
  );
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  // baseGeometry: clone cache GLB + center + bobot wind — HANYA [nodes, path].
  // FASE 13: center() WAJIB (sweater mentah melayang Y 0.92–1.62); kalibrasi
  // collar/surfaceZ Fase 13 diukur di ruang centered ini.
  const baseGeometry = useMemo(() => {
    const base = firstMeshGeometry(nodes);
    if (!base) return null;
    const geo = base.clone();
    geo.center();
    ensureWindWeights(geo);
    return geo;
  }, [nodes, path]);

  // Multi-part by vertex position. FASE 13 ambang di ruang centered (collar
  // terukur 0.32, jahitan bahu 0.19): y>0.28 kerah, |x|>0.21 lengan.
  const coloredGeometry = useMemo(() => {
    if (!baseGeometry) return null;
    if (activeColorMode !== "multi-part") {
      if (baseGeometry.getAttribute("color")) baseGeometry.deleteAttribute("color");
      return baseGeometry;
    }
    const pos = baseGeometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return baseGeometry;
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
      if (y > 0.28) tmp.copy(colCollar);
      else if (Math.abs(x) > 0.21) tmp.copy(colSleeve);
      else tmp.copy(colBody);
      arr[i * 3] = tmp.r;
      arr[i * 3 + 1] = tmp.g;
      arr[i * 3 + 2] = tmp.b;
    }
    attr.needsUpdate = true;
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  const material = useMemo(() => {
    // Archetype hoodie = French Terry fleece (kontinuitas material crewneck
    // lama yang me-render via HoodieModel; tak ada archetype crewneck).
    return createClothPhysicalMaterial({
      archetype: "hoodie",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength, tier]);

  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, coloredGeometry);
  useTrackedResource(matTracker, material);

  useEffect(() => {
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
    if (windStrength === 0) {
      const m = material as any;
      if (m.onBeforeCompile) {
        m.onBeforeCompile = undefined;
        m.userData.shader = undefined;
        m.needsUpdate = true;
      }
    }
  }, [material, activeColorMode, partColors, windStrength]);

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
        geometry={(coloredGeometry as any) || firstMeshGeometry(nodes)}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("crewneck")} surfaceZBack={surfaceZForApparel("crewneck")} />
      </mesh>
    </group>
  );
};

/**
 * Fallback warisan: perilaku crewneck LAMA = pinjam HoodieModel (ada tudung
 * secara geometri — tampilan salah untuk crewneck, tapi lebih baik dari
 * kanvas kosong bila sweater.glb hilang). Rantai fallback HoodieModel
 * (biru→master→hoodie.glb) berlaku penuh di sini.
 */
const GltfCrewneckLegacy: React.FC = () => {
  return <HoodieModel />;
};

export const CrewneckModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <SilentModelFallback
        fallback={
          <SilentModelFallback fallback={<GltfCrewneckLegacy />}>
            <GltfCrewneckNew path={MODEL_PATH_NEW} />
          </SilentModelFallback>
        }
      >
        <GltfCrewneckNew path={MODEL_PATH_NEW_DRC} />
      </SilentModelFallback>
    </Suspense>
  );
};
