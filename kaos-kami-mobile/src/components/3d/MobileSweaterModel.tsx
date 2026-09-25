"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { apparelToArchetype, createClothPhysicalMaterial } from '@/lib/materials/clothPhysicalMaterial';
import { ClothInertiaSimulator } from '@/lib/3d/clothInertiaPhysics';
import { applyMobileWind } from '@/lib/3d/windShader';
import { getStretchFactors } from '@/lib/3d/stretchPhysics';
import { registerMobileStretchGroup, unregisterMobileStretchGroup } from '@/lib/3d/mobileStretchRegistry';
import { extractMobileApparelGeometry } from '@/lib/3d/extractMobileApparelGeometry';
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';
import { DecalGizmoMobile } from './DecalGizmoMobile';
import {
  candidatesFor,
  probeFirstExistingUrlMobile,
  MOBILE_SWEATER_FALLBACK,
} from './MobileApparelMeshRenderer';

// MobileSweaterModel — cermin web `CrewneckModel.tsx` (sweater.glb,
// sweater_pack Sketchfab, TANPA tudung) di bawah batasan HP:
// - DPR rendah: tak ada logika DPR di sini (Canvas dpr per-tier +
//   AdaptiveDpr/PerformanceMonitor di CanvasStageMobile).
// - Tanpa reflektor: tak ada Environment/Reflector — hanya lampu studio
//   (MobileStudioLighting) + ContactShadows frames=1.
// - Dispose benar: geometri clone + material milik sendiri dibuang saat
//   ganti/unmount (cache useGLTF TAK PERNAH disentuh — tiru pola web
//   "JANGAN mutasi cache GLB drei").
// - DecalLayer + gizmo DI DALAM <mesh> (syarat drei Decal: parent HARUS
//   Mesh, kalau tidak throw) — cermin web, BUKAN sibling seperti renderer
//   generik (latent bug di sana, follow-up terpisah).
//
// KALIBRASI cermin web scaleCalibration.ts FASE 13 (TERUKUR, ruang centered):
// - units/cm 102.4 (via TINGGI 72.0/0.70304 — lengan terentang, preseden jacket)
// - maxFront 30×38 / maxBack 30×42 / lengan 9×40, surfaceZ 0.151,
//   collar 0.32, sleeveAnchor 0.19, clamp ±0.35 (semua di store/gizmo).
// - JANGAN ubah angka di atas tanpa ukur sweater fisik + banding visual web
//   (butuh sesi uji fisik manual) — TODO visual di bawah penanda resminya.
//
// PERBEDAAN SADAR vs web (bukan drift):
// 1. Orientasi: aset Z-up + node konversi (baked via matrixWorld, pola web
//    HoodieModel "merge+center"). Ekstraksi geometri mentah ala web
//    CrewneckModel (tanpa matrixWorld) membuat sweater BERBARING (tinggi di
//    sumbu Z) — TERUKUR Sep 2026: lokal X ±0.599 / Y −0.147…0.175 /
//    Z 0.921…1.624 vs world X ±0.599 / Y 0.921…1.624 / Z −0.175…0.147.
//    World-bake benar di varian draco MAUPUN master apa pun konvensinya.
//    TODO: uji visual HP — bandingkan dengan web (web belum QA visual 3 mesh
//    baru per tracker Fase 46).
// 2. Depan = +Z TERUKUR (kerah depan 1.581 vs belakang 1.624 — scoop 4.3cm),
//    jadi decal default +Z sudah di dada. TODO: verifikasi visual (bila
//    terbalik, putar grup π di sumbu Y).
// 3. Single-color SELALU (store mobile tak punya partColors; ambang multi-part
//    web y>0.28/|x|>0.21 tak dipakai). TODO: dukung bila UI part-color ada.
// 4. Tanpa knit/walking/isRotating per-komponen (AnimationController luar yang
//    menangani preset idle/walking/waving/spin/none) + wind tetap 0.25
//    (cermin renderer generik) + sway inersia yang sama.
// 5. Tanpa fallback mesh lain: primer 404 → master lokal non-Draco
//    (SOFT-DISABLE Draco 14 Sep 2026; varian draco diarsipkan ke
//    backups/draco-archive/). JANGAN fallback ke hoodie (siluet salah = menipu).
export function MobileSweaterModel() {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMobileStudioStore((s) => s.color);
  // F0 Test Lab stretch — pola group-scale SEMENTARA cermin web ShirtModel.
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const stretchIntensity = useMobileStudioStore((s) => s.stretchIntensity);
  const stretchDirection = useMobileStudioStore((s) => s.stretchDirection);
  const stretchFactors = getStretchFactors(testLabMode, stretchIntensity, stretchDirection);
  const { tier } = useMobileDeviceTier();

  useEffect(() => {
    const g = groupRef.current;
    registerMobileStretchGroup(g);
    return () => {
      unregisterMobileStretchGroup(g);
    };
  }, []);

  const clothPhysics = useMemo(() => new ClothInertiaSimulator({ stiffness: 38.0, damping: 7.2 }), []);

  // Rantai non-Draco cermin web (probe HEAD berlapis, tak pernah throw;
  // SOFT-DISABLE Draco 14 Sep 2026 — kandidat = master non-Draco saja).
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setResolvedPath(null);
    void probeFirstExistingUrlMobile(candidatesFor('sweater', tier)).then((url) => {
      if (alive) setResolvedPath(url);
    });
    return () => {
      alive = false;
    };
  }, [tier]);

  const modelPath = resolvedPath ?? MOBILE_SWEATER_FALLBACK;
  const { scene } = useGLTF(modelPath);

  // SWAP 20 Sep 2026 cermin web CrewneckModel: sweater Tristen —
  // scale 0.1965/crown -0.093 (paritas hem 1:1, ruang terkalibrasi identik).
  const baseGeometry = useMemo(() => {
    return extractMobileApparelGeometry(scene, { scaleMultiplier: 0.1965, crownYOffset: -0.093 });
  }, [scene]);

  const material = useMemo(() => {
    // Archetype hoodie = French Terry fleece (cermin web CrewneckModel).
    const mat = createClothPhysicalMaterial(color, apparelToArchetype('sweater'));
    applyMobileWind(mat, 0.25);
    return mat;
  }, [color]);

  // Dispose milik sendiri (klon geometri + material). Cache useGLTF + peta
  // weave/roughness prosedural SENGAJA tak disentuh (milik bersama).
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  const matRef = useRef<THREE.Material | null>(null);
  geoRef.current = baseGeometry;
  matRef.current = material;
  useEffect(() => {
    const stale = geoRef.current;
    return () => {
      try {
        stale?.dispose();
      } catch {}
    };
  }, [baseGeometry]);
  useEffect(() => {
    const stale = matRef.current;
    return () => {
      try {
        stale?.dispose();
      } catch {}
    };
  }, [material]);

  // Sway inersia cermin renderer generik (kain hidup saat diputar, tenang idle).
  useFrame((state, delta) => {
    void state;
    if (!groupRef.current) return;
    const currentY = groupRef.current.rotation.y;
    clothPhysics.reportRotation(currentY, delta);
    const swayAngle = clothPhysics.update(delta);
    groupRef.current.rotation.z = -swayAngle * 0.45;
    const sh = (matRef.current as any)?.userData?.shader?.uniforms;
    if (sh?.uWindStrength) {
      sh.uWindStrength.value = 0.2 + Math.min(1, Math.abs(swayAngle) * 6) * 0.9;
    }
    if (sh?.uTime) sh.uTime.value += delta;
  });

  return (
    <group
      ref={groupRef}
      scale={[1.4 * stretchFactors.stretchX, 1.4 * stretchFactors.stretchY, 1.4 * stretchFactors.stretchZ]}
      position={[0, -0.15, 0]}
    >
      <mesh castShadow receiveShadow geometry={baseGeometry ?? undefined} material={material}>
        <MobileDecalLayerRenderer />
      </mesh>
      <DecalGizmoMobile />
    </group>
  );
}
