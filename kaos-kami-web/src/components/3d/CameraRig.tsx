"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

interface CameraRigProps {
  targetPosition: THREE.Vector3;
  targetLookAt: THREE.Vector3;
}

export const CameraRig: React.FC<CameraRigProps> = ({ targetPosition, targetLookAt }) => {
  const {
    viewMode,
    cameraPreset,
    setCameraPreset,
    isHideWebsiteUI,
    isDrawerCollapsed,
    drawerPosition,
    interactionTool,
    isGizmoDragging,
  } = useConfiguratorStore();

  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  // Transisi preset sinematik (audit #2 — sebelumnya jump motong).
  const presetAnim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; fromLook: THREE.Vector3; t: number } | null>(null);

  // Quick Camera Presets
  useEffect(() => {
    if (!cameraPreset) return;

    const dest = new THREE.Vector3(0, 0.05, 2.3);
    if (cameraPreset === "back") dest.set(0, 0.05, -2.3);
    else if (cameraPreset === "left") dest.set(-2.3, 0.05, 0);
    else if (cameraPreset === "right") dest.set(2.3, 0.05, 0);
    else if (cameraPreset === "iso") dest.set(1.6, 1.1, 1.8);

    presetAnim.current = {
      from: camera.position.clone(),
      to: dest,
      fromLook: currentLookAt.current.clone(),
      t: 0,
    };
    setCameraPreset(null);
  }, [cameraPreset, camera, setCameraPreset]);

  useFrame((_, delta) => {
    // Mainkan animasi preset (±0.6 detik, ease-out).
    const anim = presetAnim.current;
    if (anim) {
      anim.t = Math.min(1, anim.t + delta / 0.6);
      const k = 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.from, anim.to, k);
      currentLookAt.current.lerpVectors(anim.fromLook, new THREE.Vector3(0, 0, 0), k);
      camera.lookAt(currentLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentLookAt.current);
        controlsRef.current.update();
      }
      if (anim.t >= 1) presetAnim.current = null;
      return;
    }
    if (viewMode === "story" && !isHideWebsiteUI) {
      const lerpSpeed = Math.min(delta * 4.5, 1);
      camera.position.lerp(targetPosition, lerpSpeed);
      currentLookAt.current.lerp(targetLookAt, lerpSpeed);
      camera.lookAt(currentLookAt.current);
    }
  });

  if (viewMode === "studio" || isHideWebsiteUI) {
    const isPanMode = interactionTool === "pan";
    // Calculated sweet-spot target offset based on drawer state
    const targetX = isHideWebsiteUI || isDrawerCollapsed ? 0 : drawerPosition === "left" ? 0.14 : -0.14;

    return (
      <OrbitControls
        ref={controlsRef}
        enabled={!isGizmoDragging}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.75}
        zoomSpeed={0.85}
        panSpeed={0.8}
        enablePan={!isGizmoDragging}
        mouseButtons={{
          LEFT: isPanMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: isPanMode ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
        minDistance={0.8}
        maxDistance={4.8}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 1.7}
        target={[targetX, 0, 0]}
        makeDefault
      />
    );
  }

  return null;
};
