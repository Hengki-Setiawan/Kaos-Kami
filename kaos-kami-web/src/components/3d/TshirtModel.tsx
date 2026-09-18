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
import { getStretchFactors } from "@/lib/3d/stretchPhysics";

// FASE 13 (keputusan owner: mesh aktif DIGANTI): kaos → tee-basic.glb
// (basic_t-shirt Sketchfab; draco -18% bila decoder ada). Rantai fallback
// DIAM: draco → master → file lama (tanpa chrome error).
const MODEL_PATH_NEW = "/models/tee-basic.glb?v=7";
const MODEL_PATH_LEGACY = "/models/tshirt-heavyweight.glb?v=7";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

/** Ambil geometri mesh pertama (agnostik nama node Sketchfab). */
function firstMeshGeometry(nodes: any, scene?: any): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  if (found?.geometry) return found.geometry as THREE.BufferGeometry;
  let meshGeo: THREE.BufferGeometry | undefined;
  scene?.traverse?.((child: any) => {
    if (!meshGeo && child.isMesh && child.geometry) {
      meshGeo = child.geometry;
    }
  });
  return meshGeo;
}

const GltfTeeNew: React.FC<{ path: string }> = ({ path }) => {
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

  const { partColors, activeColorMode } = useConfiguratorStore(
    useShallow((s) => ({ partColors: s.partColors, activeColorMode: s.activeColorMode }))
  );
  const roughness = materialFinish === "french-terry" ? 0.88 : 0.84;

  const { animationPreset, animationSpeed, testLabMode, stretchIntensity, stretchDirection } = useConfiguratorStore(
    useShallow((s) => ({
      animationPreset: s.animationPreset,
      animationSpeed: s.animationSpeed,
      testLabMode: s.testLabMode,
      stretchIntensity: s.stretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );
  // Wind strength via animationPreset (BLUEPRINT-02 §4)
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  // baseGeometry: clone cache GLB + center + bobot wind — HANYA [nodes, path].
  // FASE 13: center() WAJIB (mesh Sketchfab mentah melayang Y 0.84–1.63);
  // kalibrasi collar/surfaceZ Fase 13 diukur di ruang centered ini.
  // selectedColor SENGAJA tak ada di sini: mode single-color tak butuh
  // atribut warna sama sekali (material.color via damp di useFrame), jadi
  // FASE KALIBRASI PROPORSIONAL (selaras Hoodie acuan emas):
  // scaleMultiplier 0.72 (lebar 51.5cm = Size L) & crownYOffset -0.12 (kerah turun ke pangkal leher, dada di Y=0).
  const baseGeometry = useMemo(() => {
    return extractApparelGeometry(scene, { scaleMultiplier: 0.72, crownYOffset: -0.12 });
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  // Multi-part fake by vertex position (ruang terkalibrasi: kerah y>0.12, lengan |x|>0.18)
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
      if (y > 0.12) tmp.copy(colCollar);
      else if (Math.abs(x) > 0.18) tmp.copy(colSleeve);
      else tmp.copy(colBody);
      arr[i * 3] = tmp.r;
      arr[i * 3 + 1] = tmp.g;
      arr[i * 3 + 2] = tmp.b;
    }
    attr.needsUpdate = true;
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "tshirt",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength, tier]);

  // Dispose via ResourceTracker (audit #6–#9): SEMUA generasi coloredGeometry
  // adalah clone milik sendiri (cache GLB tak pernah disentuh — lihat atas),
  // jadi aman dibuang saat diganti/unmount. Tracker TERPISAH per jenis agar
  // ganti material tak ikut membuang geometri yang masih hidup. (Di bawah
  // material — hook tak boleh pakai variabel sebelum deklarasi.)
  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, coloredGeometry);
  useTrackedResource(matTracker, material);

  useEffect(() => {
    // Multi-part color update
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
  }, [material, activeColorMode, partColors]);

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
      } else if (animationPreset === "wind") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.rotation.z = Math.sin(t * 1.8) * 0.02 * windStrength;
        meshRef.current.position.x = (viewMode === "story" ? 0 : modelPosX) + Math.sin(t * 1.3) * 0.015 * windStrength;
      }
    }
  });

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;

  // 🧲 Skala Elastisitas Kain Uji Tarik (Pull & Stretch Test)
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
        geometry={(coloredGeometry as any) || baseGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("tshirt")} surfaceZBack={surfaceZForApparel("tshirt")} />
      </mesh>
    </group>
  );
};

/** Fallback warisan: tshirt-heavyweight.glb (node T_Shirt_male, tanpa center). */
const GltfTeeLegacy: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const { nodes } = useGLTF(MODEL_PATH_LEGACY) as any;
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
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  const baseGeometry = useMemo(() => {
    const base = nodes?.T_Shirt_male?.geometry as THREE.BufferGeometry | undefined;
    if (!base) return null;
    const geo = base.clone();
    ensureWindWeights(geo);
    return geo;
  }, [nodes]);

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

  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "tshirt",
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
      } else if (animationPreset === "wind") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.rotation.z = Math.sin(t * 1.8) * 0.02 * windStrength;
        meshRef.current.position.x = (viewMode === "story" ? 0 : modelPosX) + Math.sin(t * 1.3) * 0.015 * windStrength;
      }
    }
  });

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
        geometry={(coloredGeometry as any) || nodes?.T_Shirt_male?.geometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("tshirt")} surfaceZBack={surfaceZForApparel("tshirt")} />
      </mesh>
    </group>
  );
};

export const TshirtModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <SilentModelFallback fallback={<GltfTeeLegacy />}>
        <GltfTeeNew path={MODEL_PATH_NEW} />
      </SilentModelFallback>
    </Suspense>
  );
};
