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

// M-sisa (11 Sep 2026): swap ke .draco.glb teroptimasi (-44%, 1204KB→673KB).
// Node T_Shirt_male + material 0 + atribut identik (terverifikasi header GLB,
// selisih +13 vertex jahitan ≈0.1% — aman). Rantai fallback draco→legacy ada
// di LONGSLEEVE_MODEL_CANDIDATES (useDeviceTier) + probe CanvasStage.
const MODEL_PATH = "/models/longsleeve.draco.glb";
useGLTF.preload(MODEL_PATH);

const GltfLongsleeve: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const { nodes } = useGLTF(MODEL_PATH) as any;
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

  // baseGeometry: clone cache GLB + bobot wind — HANYA [nodes].
  // selectedColor SENGAJA tak ada di sini: mode single-color tak butuh
  // atribut warna sama sekali (material.color via damp di useFrame), jadi
  // geser warna tak lagi clone+wind-weight ulang tiap frame commit.
  const baseGeometry = useMemo(() => {
    const base = nodes?.T_Shirt_male?.geometry as THREE.BufferGeometry | undefined;
    if (!base) return null;
    // JANGAN mutasi cache GLB drei (audit #6–#9): clone dulu, lalu ubah
    // clone milik sendiri (lihat TshirtModel — alasan sama).
    const geo = base.clone();
    // WAJIB: bobot wind per-vertex — tanpa ini preset wind diam total.
    ensureWindWeights(geo);
    return geo;
  }, [nodes]);

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
        geometry={(coloredGeometry as any) || nodes?.T_Shirt_male?.geometry}
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
      <GltfLongsleeve />
    </Suspense>
  );
};
