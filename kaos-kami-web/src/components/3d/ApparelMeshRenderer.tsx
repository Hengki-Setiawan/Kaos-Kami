"use client";

import React, { useRef, lazy, Suspense } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
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

import { DecalGizmo } from "./DecalGizmo";
import { surfaceZForApparel } from "@/lib/scaleCalibration";

export const ApparelMeshRenderer: React.FC = () => {
  const {
    activeApparel,
    modelRotY,
    viewMode,
    activePhase,
    isMobile,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      modelRotY: s.modelRotY,
      viewMode: s.viewMode,
      activePhase: s.activePhase,
      isMobile: s.isMobile,
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
        targetStoryPos.current.set(0.65, -0.04 + floatY, 0);
        targetStoryRot.current.set(0.04, -0.22, 0);
        targetStoryScale.current = 1.45;
      } else if (activePhase === 2) {
        targetStoryPos.current.set(0.78, 0.02 + floatY * 0.5, 0.05);
        targetStoryRot.current.set(0.04, -Math.PI, 0);
        targetStoryScale.current = 1.48;
      } else if (activePhase === 3) {
        targetStoryPos.current.set(-0.82, -0.04 + floatY, 0);
        targetStoryRot.current.set(0.04, 0.18, 0);
        targetStoryScale.current = 1.48;
      } else {
        targetStoryPos.current.set(0, -0.02 + floatY, 0);
        targetStoryRot.current.set(0, 0, 0);
        targetStoryScale.current = 1.38;
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
      const targetRad = (modelRotY * Math.PI) / 180;
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetRad,
        16,
        delta
      );
      groupRef.current.scale.set(mobileFactor, mobileFactor, mobileFactor);
    }

    if (apparelMotionGroupRef.current) {
      apparelMotionGroupRef.current.position.set(0, 0, 0);
      apparelMotionGroupRef.current.rotation.set(0, 0, 0);
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
      <Suspense fallback={null}>
        <group ref={apparelMotionGroupRef}>
          {renderApparel()}
        </group>
      </Suspense>
      <DecalGizmo surfaceZ={surfaceZ} />
    </group>
  );
};
