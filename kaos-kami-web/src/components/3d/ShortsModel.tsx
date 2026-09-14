"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
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
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { TshirtModel } from "./TshirtModel";

// CELANA PENDEK coming-soon (pola integrasi pants persis, Sep 2026).
// Aset: Asset 3D/github/shorts.glb → public/models/shorts.glb
// (754 verts, 1 mesh "Body (merged).baked.008", UV yes,
// 1× PNG 1024×1024). Struktur meniru PantsModel. Khusus shorts:
// - geometri di-center (mentah LOKAL X ±0.16596, Y −0.32047…0.26464,
//   Z −0.11834…0.12120; node male_shorts rotY 180° TANPA translasi →
//   WORLD X ±0.16596, Y sama, Z −0.12120…0.11834).
//   center() menggeser tengah WORLD (Y ≈−0.028, Z ≈−0.001) ke origin —
//   render bbox Y ±0.29255 (lebih pendek dari pants ±0.501 — framing
//   story sama, user geser/skala manual bila perlu).
// - depan menghadap +Z (rotY node 180° simetris X/Z — sisi depan/belakang
//   hampir simetris; decal depan di +Z sudah benar).
// - single-color SELALU (satu panel; multi-part tak bermakna untuk celana).
// - validSidesFor(shorts) = ["front"] — PatternStudio shorts nonaktif eksplisit.
const MODEL_PATH = "/models/shorts.glb?v=9";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

/** Ambil geometri mesh pertama (agnostik nama node). */
function firstMeshGeometry(nodes: any, scene?: THREE.Group): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  if (found?.geometry) return found.geometry as THREE.BufferGeometry;
  if (scene) {
    let geom: THREE.BufferGeometry | undefined;
    scene.traverse((child: any) => {
      if (!geom && child.isMesh && child.geometry) {
        geom = child.geometry;
      }
    });
    return geom;
  }
  return undefined;
}

const GltfShorts: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const invalidate = useThree((s) => s.invalidate);
  const { nodes, scene } = useGLTF(path) as any;
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
    return extractApparelGeometry(scene, { scaleMultiplier: 0.0125 });
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  const material = useMemo(() => {
    // Tak ada archetype celana — twill katun paling dekat dengan "tshirt".
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
        geometry={baseGeometry || undefined}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("shorts")} surfaceZBack={surfaceZForApparel("shorts")} />
      </mesh>
    </group>
  );
};

export const ShortsModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfShorts path={MODEL_PATH} />
    </Suspense>
  );
};
