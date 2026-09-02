"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { TshirtModel } from "./TshirtModel";
import { HoodieModel } from "./HoodieModel";
import { ShirtModel } from "./ShirtModel";

import { DecalGizmo } from "./DecalGizmo";

export const ApparelMeshRenderer: React.FC = () => {
  const { activeApparel, modelRotY, viewMode, activePhase, isMobile } = useConfiguratorStore();
  const groupRef = useRef<THREE.Group>(null);

  // Target coordinates for each Story Mode phase
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

  const renderModel = () => {
    switch (activeApparel) {
      case "hoodie":
        return <HoodieModel />;
      case "crewneck":
        return <HoodieModel />;
      case "shirt":
        return <ShirtModel />;
      case "longsleeve":
        return <TshirtModel />;
      case "tshirt":
      default:
        return <TshirtModel />;
    }
  };

  return (
    <group ref={groupRef}>
      {renderModel()}
      <DecalGizmo />
    </group>
  );
};
