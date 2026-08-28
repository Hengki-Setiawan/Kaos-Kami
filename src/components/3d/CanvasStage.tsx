"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLighting } from "./StudioLighting";
import { ApparelMeshRenderer } from "./ApparelMeshRenderer";
import { CameraRig } from "./CameraRig";
import { Preloader } from "@/components/ui/Preloader";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

interface CanvasStageProps {
  camPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ camPos, lookAtPos }) => {
  const { viewMode, studioTheme, isHideWebsiteUI } = useConfiguratorStore();

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
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 3.4], fov: 40 }}
          gl={{
            antialias: true,
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
