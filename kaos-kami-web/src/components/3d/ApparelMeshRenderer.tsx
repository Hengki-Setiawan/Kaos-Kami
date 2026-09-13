"use client";

import React, { useRef, lazy, Suspense } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
// PERF: lazy per-apparel — chunk GLB + decoder tiap model HANYA diunduh saat
// apparel itu (atau tetangganya via idle-preload CanvasStage) dirender.
// Sebelumnya 7 import statis = seluruh rantai preload modul (mis. 3× preload
// di TshirtModel) jalan di first paint walau user hanya buka kaos.
const TshirtModel = lazy(() => import("./TshirtModel").then((m) => ({ default: m.TshirtModel })));
const LongsleeveModel = lazy(() => import("./LongsleeveModel").then((m) => ({ default: m.LongsleeveModel })));
const HoodieModel = lazy(() => import("./HoodieModel").then((m) => ({ default: m.HoodieModel })));
const ShirtModel = lazy(() => import("./ShirtModel").then((m) => ({ default: m.ShirtModel })));
const CrewneckModel = lazy(() => import("./CrewneckModel").then((m) => ({ default: m.CrewneckModel })));
const CapModel = lazy(() => import("./CapModel").then((m) => ({ default: m.CapModel })));
const PantsModel = lazy(() => import("./PantsModel").then((m) => ({ default: m.PantsModel })));
const ShortsModel = lazy(() => import("./ShortsModel").then((m) => ({ default: m.ShortsModel })));
const MannequinModel = lazy(() => import("./MannequinModel").then((m) => ({ default: m.MannequinModel })));

import { DecalGizmo } from "./DecalGizmo";
import { PrintZoneGuide } from "./PrintZoneGuide";
import { surfaceZForApparel } from "@/lib/scaleCalibration";

export const ApparelMeshRenderer: React.FC = () => {
  const { activeApparel, modelRotY, viewMode, activePhase, isMobile, modelMode } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      modelRotY: s.modelRotY,
      viewMode: s.viewMode,
      activePhase: s.activePhase,
      isMobile: s.isMobile,
      modelMode: s.modelMode,
    }))
  );
  const groupRef = useRef<THREE.Group>(null);

  // Target coordinates for each Story Mode phase (EDITORIAL, bukan fisika —
  // angka per fase disengaja untuk framing story-scroll; modelRotY manual
  // hanya berlaku di studio. Faktor mobile 0.85 di luar × modelScale user
  // di dalam — keduanya dikali, bukan duplikat (audit #1).
  const targetStoryPos = useRef(new THREE.Vector3(0.68, -0.05, 0));
  const targetStoryRot = useRef(new THREE.Euler(0, -0.28, 0));
  const targetStoryScale = useRef(1.35);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (viewMode === "story") {
      const time = state.clock.getElapsedTime();
      // Gentle organic breathing float in story mode
      const floatY = Math.sin(time * 1.8) * 0.025;

      if (activePhase === 1) {
        // Phase 1 (Hero): Prominent, center-right stage (X: +0.52), scale 1.50 with clear negative space
        targetStoryPos.current.set(0.52, -0.04 + floatY, 0);
        targetStoryRot.current.set(0.04, -0.24, 0);
        targetStoryScale.current = 1.50;
      } else if (activePhase === 2) {
        // Phase 2 (Macro Weave): Docked on Left Screen (X: -0.55), framing right tech specs
        targetStoryPos.current.set(-0.55, 0.12 + floatY * 0.5, 0.45);
        targetStoryRot.current.set(0.12, 0.45, -0.05);
        targetStoryScale.current = 1.70;
      } else if (activePhase === 3) {
        // Phase 3 (180° Rear Reveal): Docked on Right Screen (X: +0.48), rotated 180°
        targetStoryPos.current.set(0.48, -0.04 + floatY, 0);
        targetStoryRot.current.set(0.04, Math.PI, 0);
        targetStoryScale.current = 1.55;
      } else {
        // Phase 4 (Lookbook & Studio CTA): Centered Hero (X: 0)
        targetStoryPos.current.set(0, -0.02 + floatY, 0);
        targetStoryRot.current.set(0, 0, 0);
        targetStoryScale.current = 1.38;
      }

      // Smooth kinematic lerp for editorial motion
      const lerpFactor = Math.min(delta * 5.0, 1.0);
      groupRef.current.position.lerp(targetStoryPos.current, lerpFactor);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetStoryRot.current.x, lerpFactor);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetStoryRot.current.y, lerpFactor);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetStoryRot.current.z, lerpFactor);
      
      const currentScale = groupRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetStoryScale.current, lerpFactor);
      groupRef.current.scale.set(nextScale, nextScale, nextScale);
    } else {
      // Studio Sandbox Mode: full manual transforms — ariyan isMobile 6 vs 9
      const mobileFactor = isMobile ? 0.85 : 1;
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, (modelRotY * Math.PI) / 180, 0);
      groupRef.current.scale.set(mobileFactor, mobileFactor, mobileFactor);
    }
  });

  // MODE MANEKIN BERJALAN (in-place): bila modelMode === "mannequin",
  // render MannequinModel SAJA — gizmo/guide/decal DISEMBUNYIKAN (decal di
  // badan butuh skinning agar ikut tulang; itu follow-up jujur, bukan
  // dipasang miring). Default "garment" = perilaku lama tak berubah.
  const isMannequin = modelMode === "mannequin";

  // CELANA coming-soon (pola cap): pants → PantsModel, shorts →
  // ShortsModel (mockup AKTIF, order BELUM — guard orderable di checkout).
  const renderModel = () => {
    if (isMannequin) return <MannequinModel />;
    switch (activeApparel) {
      case "hoodie":
        return <HoodieModel />;
      case "crewneck":
        return <CrewneckModel />;
      case "cap":
        return <CapModel />;
      case "shirt":
        return <ShirtModel />;
      case "longsleeve":
        return <LongsleeveModel />;
      case "pants":
        return <PantsModel />;
      case "shorts":
        return <ShortsModel />;
      case "tshirt":
      default:
        return <TshirtModel />;
    }
  };

  // surfaceZ per apparel — SATU angka dipakai renderer+gizmo+guide (SSOT
  // surfaceZForApparel; audit #6: sebelumnya renderer 0.176/0.24, gizmo
  // default 0.18, guide 0.155 = selisih s/d 6cm). Nilai = ketebalan dada
  // terukur per mesh (0.176 kaos/hoodie, 0.24 coach jacket) — literal lama
  // diganti pemanggilan SSOT agar tak drift lagi bila kalibrasi berubah.
  const surfaceZ = surfaceZForApparel(activeApparel);

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        {renderModel()}
      </Suspense>
      {!isMannequin && <PrintZoneGuide surfaceZ={surfaceZ} />}
      {!isMannequin && <DecalGizmo surfaceZ={surfaceZ} />}
    </group>
  );
};
