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

// FASE 13 (keputusan owner: mesh aktif DIGANTI): kaos → tee-basic.glb
// (basic_t-shirt Sketchfab; draco -18% bila decoder ada). Rantai fallback
// DIAM: draco → master → file lama (tanpa chrome error).
const MODEL_PATH_NEW_DRC = "/models/tee-basic.draco.glb";
const MODEL_PATH_NEW = "/models/tee-basic.glb";
const MODEL_PATH_LEGACY = "/models/tshirt-heavyweight.glb";
useGLTF.preload(MODEL_PATH_NEW_DRC);
useGLTF.preload(MODEL_PATH_NEW);
useGLTF.preload(MODEL_PATH_LEGACY);

/** Ambil geometri mesh pertama (agnostik nama node Sketchfab). */
function firstMeshGeometry(nodes: any): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  return found?.geometry as THREE.BufferGeometry | undefined;
}

const GltfTeeNew: React.FC<{ path: string }> = ({ path }) => {
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
  const roughness = materialFinish === "french-terry" ? 0.88 : 0.84;

  const { animationPreset, animationSpeed } = useConfiguratorStore(
    useShallow((s) => ({ animationPreset: s.animationPreset, animationSpeed: s.animationSpeed }))
  );
  // Wind strength via animationPreset (BLUEPRINT-02 §4)
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  // baseGeometry: clone cache GLB + center + bobot wind — HANYA [nodes, path].
  // FASE 13: center() WAJIB (mesh Sketchfab mentah melayang Y 0.84–1.63);
  // kalibrasi collar/surfaceZ Fase 13 diukur di ruang centered ini.
  // selectedColor SENGAJA tak ada di sini: mode single-color tak butuh
  // atribut warna sama sekali (material.color via damp di useFrame), jadi
  // geser warna tak lagi clone+wind-weight ulang tiap frame commit.
  const baseGeometry = useMemo(() => {
    const base = firstMeshGeometry(nodes);
    if (!base) return null;
    // JANGAN mutasi cache GLB drei (audit #6–#9): clone dulu, lalu ubah
    // clone milik sendiri. ensureWindWeights menambah atribut `windWeight`
    // ke geometri yang disentuh — bila base cache disentuh langsung, semua
    // pemakai cache ikut berubah dan tak bisa di-dispose dengan aman.
    const geo = base.clone();
    geo.center();
    // WAJIB: bobot wind per-vertex — tanpa ini preset wind diam total.
    ensureWindWeights(geo);
    return geo;
  }, [nodes, path]);

  // Multi-part fake by vertex position (tanpa Blender re-export) — body/sleeves/collar by |x|/y threshold.
  // FASE 13 ambang di ruang centered (collar terukur 0.34, jahitan bahu 0.24):
  // y>0.30 kerah, |x|>0.27 lengan. Cek visual bila mesh ganti lagi.
  // Atribut warna ditulis in-place di clone milik sendiri (+needsUpdate, tanpa
  // alokasi/merge ulang).
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
      if (y > 0.3) tmp.copy(colCollar);
      else if (Math.abs(x) > 0.27) tmp.copy(colSleeve);
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
    // Afilah multi-part: if multi-part mode, override with first part color
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
    // Wind sudah di-apply sekali di factory createClothPhysicalMaterial —
    // JANGAN applyWindToMaterial lagi di sini (apply ganda = replace
    // #include dobel + program cache bengkak). Di sini hanya bersihkan
    // onBeforeCompile basi saat preset kembali ke static (windStrength===0).
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
        geometry={(coloredGeometry as any) || firstMeshGeometry(nodes)}
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

  const { animationPreset, animationSpeed } = useConfiguratorStore(
    useShallow((s) => ({ animationPreset: s.animationPreset, animationSpeed: s.animationSpeed }))
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
      <SilentModelFallback
        fallback={
          <SilentModelFallback fallback={<GltfTeeLegacy />}>
            <GltfTeeNew path={MODEL_PATH_NEW} />
          </SilentModelFallback>
        }
      >
        <GltfTeeNew path={MODEL_PATH_NEW_DRC} />
      </SilentModelFallback>
    </Suspense>
  );
};
