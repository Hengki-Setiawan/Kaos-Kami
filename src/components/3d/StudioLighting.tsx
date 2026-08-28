"use client";

import React from "react";
import { ContactShadows } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const StudioLighting: React.FC = () => {
  const { studioTheme, lightingPreset } = useConfiguratorStore();

  const isLightMode = studioTheme === "gallery";
  const shadowColor = isLightMode ? "#707080" : "#050508";

  return (
    <>
      {/* 1. Dynamic 360° Ambient Light Base */}
      <ambientLight
        intensity={isLightMode ? 1.05 : lightingPreset === "soft-daylight" ? 0.9 : 0.75}
        color={isLightMode ? "#ffffff" : lightingPreset === "cyber" ? "#1e293b" : "#f1f3f9"}
      />

      {/* 2. Primary Front-Right Key Light */}
      <directionalLight
        position={[3.5, 6, 4.5]}
        intensity={isLightMode ? 1.5 : lightingPreset === "cyber" ? 1.2 : 1.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
      />

      {/* 3. Front-Left Fill Light */}
      <directionalLight
        position={[-3.5, 3, 3]}
        intensity={lightingPreset === "soft-daylight" ? 0.95 : 0.7}
        color={lightingPreset === "cyber" ? "#38bdf8" : "#e2e8f0"}
      />

      {/* 4. REAR-FILL DIRECTIONAL LIGHT (Ensures the back of the apparel is bright and evenly lit) */}
      <directionalLight
        position={[0, 4, -5]}
        intensity={isLightMode ? 1.3 : lightingPreset === "cyber" ? 1.5 : 1.15}
        color={lightingPreset === "cyber" ? "#ff6a00" : "#f8fafc"}
      />

      {/* 5. Rim Spotlight */}
      <spotLight
        position={[0, 5, -3.5]}
        intensity={lightingPreset === "cyber" ? 2.8 : 1.4}
        angle={0.8}
        penumbra={1}
        color={lightingPreset === "cyber" ? "#ff6a00" : "#ffffff"}
      />

      {/* 6. Soft Bottom Bounce */}
      <pointLight
        position={[0, -2.5, 1.5]}
        intensity={0.4}
        color={lightingPreset === "cyber" ? "#ff4500" : isLightMode ? "#ffffff" : "#ffe8d6"}
      />

      {/* 7. Ground Contact Shadow */}
      <ContactShadows
        position={[0, -1.25, 0]}
        opacity={isLightMode ? 0.45 : 0.7}
        scale={6.5}
        blur={2.4}
        far={3.5}
        resolution={512}
        color={shadowColor}
      />
    </>
  );
};
