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
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";

const MODEL_PATH = "/models/longsleeve.glb?v=7";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

/** Ambil geometri mesh (bisa T_Shirt_male atau mesh pertama di scene). */
function firstMeshGeometry(nodes: any, scene?: THREE.Group): THREE.BufferGeometry | undefined {
  if (nodes?.T_Shirt_male?.geometry) return nodes.T_Shirt_male.geometry as THREE.BufferGeometry;
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

const GltfLongsleeve: React.FC<{ path: string }> = ({ path }) => {
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
    partColors,
    activeColorMode,
    animationPreset,
    animationSpeed,
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
      partColors: s.partColors,
      activeColorMode: s.activeColorMode,
      animationPreset: s.animationPreset,
      animationSpeed: s.animationSpeed,
    }))
  );

  const windStrength =
    animationPreset === "wind"
      ? 0.8 * animationSpeed
      : animationPreset === "walking"
      ? 0.4 * animationSpeed
      : animationPreset === "knit"
      ? 0.2
      : 0;

  const baseGeometry = useMemo(() => {
    return extractApparelGeometry(scene);
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  // Multi-part coloring for longsleeve (collar, sleeves including cuffs, body).
  // Atribut warna ditulis in-place di clone milik sendiri (+needsUpdate, tanpa
  // alokasi/merge ulang). Ambang (y>0.16 kerah, |x|>0.14 lengan) TAK DIUBAH.
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
      if (y > 0.16) tmp.copy(colCollar);
      else if (Math.abs(x) > 0.14) tmp.copy(colSleeve);
      else tmp.copy(colBody);
      arr[i * 3] = tmp.r;
      arr[i * 3 + 1] = tmp.g;
      arr[i * 3 + 2] = tmp.b;
    }
    attr.needsUpdate = true;
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  // Use realistic cloth physical material with sheen & peach fuzz
  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "longsleeve",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength, tier]);

  // Dispose via ResourceTracker (audit #6–#9): SEMUA generasi coloredGeometry
  // adalah clone milik sendiri (cache GLB tak pernah disentuh — lihat atas).
  // Tracker TERPISAH per jenis agar ganti material tak ikut membuang
  // geometri yang masih hidup. (Di bawah material — hook tak boleh pakai
  // variabel sebelum deklarasi.)
  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, coloredGeometry);
  useTrackedResource(matTracker, material);

  useEffect(() => {
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
    // Dispose material ditangani ResourceTracker (lihat atas) — bukan di
    // sini, agar ganti partColors tak membuang material yang masih dipakai.
  }, [material, activeColorMode, partColors]);

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
        geometry={(coloredGeometry as any) || baseGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("longsleeve")} surfaceZBack={surfaceZForApparel("longsleeve")} />
      </mesh>
    </group>
  );
};

export const LongsleeveModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfLongsleeve path={MODEL_PATH} />
    </Suspense>
  );
};
