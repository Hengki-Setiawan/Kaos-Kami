"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { easing } from "maath";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";
import { ensureWindWeights, ensureBoxUV } from "@/lib/geometryPrep";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { SilentModelFallback } from "@/components/ui/ModelErrorBoundary";

// FASE 13 & P0-4: hoodie default & fallback = hoodie-blue (lisensi CC-BY 4.0 Irevex11).
// Model legacy hoodie.glb dipensiunkan ke backups/ demi keamanan lisensi.
const MODEL_PATH_NEW_DRC = "/models/hoodie-blue.glb?v=7";
const MODEL_PATH_NEW = "/models/hoodie-blue.glb?v=7";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

/**
 * Scale-up untuk Sketchfab premium_eco_hoodie (dengan kantong kanguru 3D timbul fisik):
 * Tinggi mentah 0.98m × 0.74 menghasilkan tinggi 0.725m (proporsi proporsional setara kaos).
 */
const HOODIE_BLUE_SCALE_UP = 0.74;

const GltfHoodieNew: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const invalidate = useThree((s) => s.invalidate);
  const { scene } = useGLTF(path);
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
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : 0;
  const roughness = 0.88;

  const material = useMemo(() => {
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

  const mergedBase = useMemo(() => {
    return extractApparelGeometry(scene, { scaleMultiplier: HOODIE_BLUE_SCALE_UP });
  }, [scene, path]);

  useEffect(() => {
    if (mergedBase) invalidate();
  }, [invalidate, mergedBase]);

  // Atribut warna vertex (multi-part) — mutasi mergedBase MILIK SENDIRI
  // (bukan cache GLB drei), tanpa merge ulang. FASE 13 ambang di ruang
  // render (collar terukur 0.31, jahitan bahu 0.21): y>0.27 kerah,
  // |x|>0.23 lengan. Lengan terentang jauh — cek visual.
  const mergedGeometry = useMemo(() => {
    if (!mergedBase) return null;
    if (activeColorMode !== "multi-part") {
      if (mergedBase.getAttribute("color")) mergedBase.deleteAttribute("color");
      return mergedBase;
    }
    const pos = mergedBase.attributes.position as THREE.BufferAttribute;
    if (pos) {
      const colBody = new THREE.Color(partColors.body || selectedColor);
      const colSleeve = new THREE.Color(partColors.sleeves || partColors.sleeve || selectedColor);
      const colCollar = new THREE.Color(partColors.collar || selectedColor);
      let attr = mergedBase.getAttribute("color") as THREE.BufferAttribute | null;
      if (!attr || attr.count !== pos.count) {
        attr = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
        mergedBase.setAttribute("color", attr);
      }
      const arr = attr.array as Float32Array;
      const tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        if (y > 0.27) tmp.copy(colCollar);
        else if (Math.abs(x) > 0.23) tmp.copy(colSleeve);
        else tmp.copy(colBody);
        arr[i * 3] = tmp.r;
        arr[i * 3 + 1] = tmp.g;
        arr[i * 3 + 2] = tmp.b;
      }
      attr.needsUpdate = true;
    }
    return mergedBase;
  }, [mergedBase, activeColorMode, partColors, selectedColor]);

  // Dispose via ResourceTracker terpisah per jenis (audit #6: effect gabungan
  // dispose geometri yang MASIH hidup saat material berubah mis. ganti warna
  // → mesh blank use-after-dispose). Geometri cache GLB milik drei — TIDAK
  // di-track (bukan milik sendiri), hanya merged + material milik sendiri.
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
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("hoodie")} surfaceZBack={surfaceZForApparel("hoodie")} />
      </mesh>
    </group>
  );
};

export const HoodieModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <SilentModelFallback fallback={<GltfHoodieNew path={MODEL_PATH_NEW_DRC} />}>
        <GltfHoodieNew path={MODEL_PATH_NEW} />
      </SilentModelFallback>
    </Suspense>
  );
};
