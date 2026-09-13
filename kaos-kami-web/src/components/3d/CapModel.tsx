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
import { TshirtModel } from "./TshirtModel";

// FASE 13 — topi baseball (baseball_cap Sketchfab → cap.glb; draco -92%).
// Struktur meniru TshirtModel. Khusus topi:
// - geometri di-center (mentah X ±0.20, Y 0.03–0.31, Z −0.22…0.32).
// - offset Y −0.11 memanggang agar TENGAH CROWN ≈ origin (crown terukur
//   +0.113 pasca-center) — decal default (y≈0) langsung mendarat di crown,
//   bukan di lidah.
// - lidah menghadap +Z (penonton) — decal depan di +Z sudah benar.
// - single-color SELALU (satu panel; multi-part tak bermakna untuk topi).
// - validSidesFor(cap) = ["front"] — PatternStudio cap nonaktif eksplisit.
const MODEL_PATH_NEW_DRC = "/models/cap.draco.glb";
const MODEL_PATH_NEW = "/models/cap.glb";
useGLTF.preload(MODEL_PATH_NEW_DRC);
useGLTF.preload(MODEL_PATH_NEW);

/** Offset agar crown (bukan bbox-center) tepat di origin. TERUKUR Fase 13. */
const CAP_CROWN_Y_OFFSET = -0.11;

/** Ambil geometri mesh pertama (agnostik nama node Sketchfab). */
function firstMeshGeometry(nodes: any): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  return found?.geometry as THREE.BufferGeometry | undefined;
}

const GltfCap: React.FC<{ path: string }> = ({ path }) => {
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

  const { animationPreset, animationSpeed } = useConfiguratorStore(
    useShallow((s) => ({ animationPreset: s.animationPreset, animationSpeed: s.animationSpeed }))
  );
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : 0;

  const baseGeometry = useMemo(() => {
    const base = firstMeshGeometry(nodes);
    if (!base) return null;
    const geo = base.clone();
    geo.center();
    ensureWindWeights(geo);
    return geo;
  }, [nodes, path]);

  const material = useMemo(() => {
    // Tak ada archetype topi — twill katun paling dekat dengan "tshirt".
    return createClothPhysicalMaterial({
      archetype: "tshirt",
      color: selectedColor,
      isWireframe,
      isMultiPart: false,
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, materialFinish, windStrength, tier]);

  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, baseGeometry);
  useTrackedResource(matTracker, material);

  useEffect(() => {
    if (windStrength === 0) {
      const m = material as any;
      if (m.onBeforeCompile) {
        m.onBeforeCompile = undefined;
        m.userData.shader = undefined;
        m.needsUpdate = true;
      }
    }
  }, [material, windStrength]);

  useFrame((state, delta) => {
    easing.dampC(material.color, new THREE.Color(selectedColor), 0.25, delta);
    if ((material as any).userData?.shader?.uniforms?.uTime) {
      (material as any).userData.shader.uniforms.uTime.value += delta * animationSpeed;
    }
    if (meshRef.current) {
      if (isRotating) meshRef.current.rotation.y += delta * 0.75;
      if (animationPreset === "walking") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.position.y = Math.sin(t * 2.2) * 0.025;
        meshRef.current.rotation.z = Math.sin(t * 1.6) * 0.04;
      }
    }
  });

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = (viewMode === "story" ? -0.05 : modelPosY - 0.05) + CAP_CROWN_Y_OFFSET;
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
        geometry={(baseGeometry as any) || firstMeshGeometry(nodes)}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("cap")} surfaceZBack={surfaceZForApparel("cap")} />
      </mesh>
    </group>
  );
};

/**
 * Fallback: topi TAK PUNYA file lama — draco gagal → master cap.glb.
 * Keduanya hilang (sangat kecil kemungkinan) → tampilkan TshirtModel agar
 * studio tetap jalan dan decal tak hilang. Bukan mockup topi yang benar
 * (dinyatakan di sini, bukan disembunyikan dari developer).
 */
export const CapModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <SilentModelFallback fallback={<TshirtModel />}>
        <SilentModelFallback fallback={<GltfCap path={MODEL_PATH_NEW} />}>
          <GltfCap path={MODEL_PATH_NEW_DRC} />
        </SilentModelFallback>
      </SilentModelFallback>
    </Suspense>
  );
};
