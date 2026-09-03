"use client";

import React, { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { StudioLighting } from "./StudioLighting";
import { ApparelMeshRenderer } from "./ApparelMeshRenderer";
import { CameraRig } from "./CameraRig";
import { Preloader } from "@/components/ui/Preloader";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useDeviceTier } from "@/hooks/useDeviceTier";

// Draco decoder path for KHR_draco_mesh_compression (hoodie/jacket optimized glbs)
if (typeof window !== "undefined") {
  try {
    (useGLTF as any).setDecoderPath?.("/decoders/draco/");
  } catch {}
}

interface CanvasStageProps {
  camPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ camPos, lookAtPos }) => {
  const { viewMode, studioTheme, isHideWebsiteUI } = useConfiguratorStore();
  const deviceTier = useDeviceTier();

  const themeBgHex =
    studioTheme === "gallery"
      ? "#F5F4F0"
      : studioTheme === "concrete"
      ? "#222326"
      : "#121214";

  const isInteractive = viewMode === "studio" || isHideWebsiteUI;

  return (
    <>
      <Preloader />
      <div
        className={`webgl-canvas-container transition-colors duration-500 ${
          isInteractive ? "interactive cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ backgroundColor: themeBgHex }}
      >
        <Canvas
          shadows={deviceTier.enableShadows}
          dpr={[1, deviceTier.maxDpr]}
          camera={{ position: [0, 0, 3.4], fov: 40 }}
          gl={{
            antialias: deviceTier.tier !== "low",
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: studioTheme === "gallery" ? 1.05 : 1.15,
            preserveDrawingBuffer: true,
          }}
        >
          <Suspense fallback={null}>
            <StudioLighting />
            <ApparelMeshRenderer />
            <CameraRig targetPosition={camPos} targetLookAt={lookAtPos} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
};
