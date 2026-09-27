"use client";

import React, { useRef, lazy, Suspense, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

// PERF: lazy per-apparel — chunk GLB + decoder tiap model HANYA diunduh saat
// apparel itu (atau tetangganya via idle-preload CanvasStage) dirender.
const TshirtModel = lazy(() => import("./TshirtModel").then((m) => ({ default: m.TshirtModel })));
const LongsleeveModel = lazy(() => import("./LongsleeveModel").then((m) => ({ default: m.LongsleeveModel })));
const HoodieModel = lazy(() => import("./HoodieModel").then((m) => ({ default: m.HoodieModel })));
const ShirtModel = lazy(() => import("./ShirtModel").then((m) => ({ default: m.ShirtModel })));
const CrewneckModel = lazy(() => import("./CrewneckModel").then((m) => ({ default: m.CrewneckModel })));
const CapModel = lazy(() => import("./CapModel").then((m) => ({ default: m.CapModel })));
const PantsModel = lazy(() => import("./PantsModel").then((m) => ({ default: m.PantsModel })));
const ShortsModel = lazy(() => import("./ShortsModel").then((m) => ({ default: m.ShortsModel })));

import { Html } from "@react-three/drei";
import { RotateCw } from "lucide-react";
import { DecalGizmo } from "./DecalGizmo";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { getApparelSizeScaleFactors } from "@/lib/apparelSizing";

function ApparelLoadingFallback() {
  return (
    <Html center pointerEvents="none" zIndexRange={[60, 0]}>
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/85 backdrop-blur-md border border-brand-accent/40 text-text-primary font-mono text-xs shadow-lg animate-pulse whitespace-nowrap">
        <RotateCw size={13} className="animate-spin text-brand-accent" />
        <span className="font-bold text-[11px]">Memuat Model 3D…</span>
      </div>
    </Html>
  );
}

/** Melaporkan kesiapan model 3D aktual pasca-WebGL benar-benar merender frame ke GPU */
function ModelReadyReporter() {
  const setIsStudio3DReady = useConfiguratorStore((s) => s.setIsStudio3DReady);
  const invalidate = useThree((s) => s.invalidate);
  const renderedFrames = useRef(0);

  useFrame(() => {
    if (renderedFrames.current < 2) {
      renderedFrames.current++;
      if (renderedFrames.current === 2) {
        setIsStudio3DReady(true);
      }
    }
  });

  useEffect(() => {
    renderedFrames.current = 0;
    // Paksa invalidate agar useFrame terpicu render frame 1 & 2
    invalidate();
    return () => {
      setIsStudio3DReady(false);
    };
  }, [setIsStudio3DReady, invalidate]);

  return null;
}

export const ApparelMeshRenderer: React.FC = () => {
  const {
    activeApparel,
    modelRotY,
    viewMode,
    activePhase,
    isMobile,
    isRotating,
    selectedSize,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      modelRotY: s.modelRotY,
      viewMode: s.viewMode,
      activePhase: s.activePhase,
      isMobile: s.isMobile,
      isRotating: s.isRotating,
      selectedSize: s.selectedSize,
    }))
  );

  const groupRef = useRef<THREE.Group>(null);
  const apparelMotionGroupRef = useRef<THREE.Group>(null);

  const targetStoryPos = useRef(new THREE.Vector3(0.68, -0.05, 0));
  const targetStoryRot = useRef(new THREE.Euler(0, -0.28, 0));
  const targetStoryScale = useRef(1.35);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (viewMode === "story") {
      const time = state.clock.getElapsedTime();
      const floatY = Math.sin(time * 1.8) * 0.025;

      if (activePhase === 1) {
        const posX = isMobile ? 0 : 0.65;
        const posY = isMobile ? -0.02 : 0.08;
        const scale = isMobile ? 1.35 : 1.70;
        targetStoryPos.current.set(posX, posY + floatY, 0);
        targetStoryRot.current.set(0.04, -0.22, 0);
        targetStoryScale.current = scale;
      } else if (activePhase === 2) {
        targetStoryPos.current.set(0.78, 0.06 + floatY * 0.5, 0.05);
        targetStoryRot.current.set(0.04, -Math.PI, 0);
        targetStoryScale.current = 1.55;
      } else if (activePhase === 3) {
        targetStoryPos.current.set(-0.82, 0.04 + floatY, 0);
        targetStoryRot.current.set(0.04, 0.18, 0);
        targetStoryScale.current = 1.55;
      } else {
        targetStoryPos.current.set(0, 0.02 + floatY, 0);
        targetStoryRot.current.set(0, 0, 0);
        targetStoryScale.current = 1.45;
      }

      const lerpFactor = Math.min(delta * 5.0, 1.0);
      groupRef.current.position.lerp(targetStoryPos.current, lerpFactor);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetStoryRot.current.x, lerpFactor);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetStoryRot.current.y, lerpFactor);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetStoryRot.current.z, lerpFactor);

      const currentScale = groupRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetStoryScale.current, lerpFactor);
      groupRef.current.scale.set(nextScale, nextScale, nextScale);
    } else {
      const mobileFactor = isMobile ? 0.85 : 1;
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;

      if (isRotating) {
        // Rotasi bersama (model + gizmo + sablon) dalam 1 parent group sinkron
        groupRef.current.rotation.y += delta * 0.75;
      } else {
        const targetRad = (modelRotY * Math.PI) / 180;
        groupRef.current.rotation.y = THREE.MathUtils.damp(
          groupRef.current.rotation.y,
          targetRad,
          16,
          delta
        );
      }
      groupRef.current.scale.set(mobileFactor, mobileFactor, mobileFactor);
    }

    if (apparelMotionGroupRef.current) {
      apparelMotionGroupRef.current.position.set(0, 0, 0);
      apparelMotionGroupRef.current.rotation.set(0, 0, 0);

      // FASE 2: Interaktivitas Skala Ukuran Garmen Nyata (S, M, L, XL, XXL)
      // Menyesuaikan dimensi model 3D (lebar dada, panjang badan, kedalaman) secara visual
      // identik dengan tabel panduan ukuran fisik UMKM Kaos Kami Makassar
      const sizeFactors = getApparelSizeScaleFactors(activeApparel, selectedSize);
      apparelMotionGroupRef.current.scale.x = THREE.MathUtils.damp(
        apparelMotionGroupRef.current.scale.x,
        sizeFactors.scaleX,
        10,
        delta
      );
      apparelMotionGroupRef.current.scale.y = THREE.MathUtils.damp(
        apparelMotionGroupRef.current.scale.y,
        sizeFactors.scaleY,
        10,
        delta
      );
      apparelMotionGroupRef.current.scale.z = THREE.MathUtils.damp(
        apparelMotionGroupRef.current.scale.z,
        sizeFactors.scaleZ,
        10,
        delta
      );
    }
  });

  const renderApparel = () => {
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

  const surfaceZ = surfaceZForApparel(activeApparel);

  return (
    <group ref={groupRef}>
      <Suspense fallback={<ApparelLoadingFallback />}>
        <group ref={apparelMotionGroupRef}>
          {renderApparel()}
        </group>
        <ModelReadyReporter />
      </Suspense>
      <DecalGizmo surfaceZ={surfaceZ} />
    </group>
  );
};
