"use client";

import React, { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { easing } from "maath";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";
import { ensureWindWeights, ensureBoxUV } from "@/lib/geometryPrep";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";

const MODEL_PATH_HIGH = "/models/jacket.glb";
const MODEL_PATH_LOW = "/models/jacket.lod1.glb";
useGLTF.preload(MODEL_PATH_HIGH);
useGLTF.preload(MODEL_PATH_LOW);

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
  const roughness = materialFinish === "poplin" ? 0.78 : 0.86;

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

  // mergedBase: merge 10 sub-mesh jaket + center + wind + UV — HANYA [scene].
  // Dipisah dari atribut warna (sebelumnya merge+traverse ulang tiap ganti
  // warna/partColors = spike CPU + churn VRAM tiap geser slider warna).
  const mergedBase = useMemo(() => {
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
      // Clone perantara dibuang setelah merge (audit #6 — leak VRAM).
      for (const g of geoms) {
        try {
          g.dispose();
        } catch {}
      }
      if (merged) {
        merged.center();
        merged.computeVertexNormals();
        ensureWindWeights(merged);
        ensureBoxUV(merged);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to merge jacket geometries:", e);
    }
    return null;
  }, [scene]);

  // Atribut warna vertex (multi-part) — mutasi mergedBase MILIK SENDIRI
  // (bukan cache GLB drei), tanpa merge ulang. Atribut dipakai ulang in-place
  // + needsUpdate agar buffer GPU tak bocor tiap ganti warna. Single-color:
  // material.color yang bicara (useFrame damp) — buang atribut basi.
  // Ambang part (y>0.22 kerah, |x|>0.18 lengan) TAK DIUBAH — kalibrasi visual.
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
        if (y > 0.22) tmp.copy(colCollar);
        else if (Math.abs(x) > 0.18) tmp.copy(colSleeve);
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
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("shirt")} surfaceZBack={surfaceZForApparel("shirt")} />
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
