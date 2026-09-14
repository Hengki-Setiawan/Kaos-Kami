"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

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
  } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      isHideWebsiteUI: s.isHideWebsiteUI,
      isDrawerCollapsed: s.isDrawerCollapsed,
      drawerPosition: s.drawerPosition,
      interactionTool: s.interactionTool,
      isGizmoDragging: s.isGizmoDragging,
    }))
  );

  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  // Transisi preset sinematik (audit #2 — sebelumnya jump motong).
  const presetAnim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; fromLook: THREE.Vector3; t: number } | null>(null);

  // Quick Camera Presets
  // B-06: JANGAN clear preset di sini — CanvasStage frameloop="demand" hanya
  // memberi frame selama cameraPreset !== null. Clear instan = animasi 0.6s tak
  // pernah dapat frame (lompat diam / jump). Preset di-clear di useFrame saat
  // animasi tuntas, sehingga frameloop tetap "always" selama transisi.
  useEffect(() => {
    if (!cameraPreset) return;

    const dest = new THREE.Vector3(0, 0.05, 2.3);
    if (cameraPreset === "back") dest.set(0, 0.05, -2.3);
    else if (cameraPreset === "left") dest.set(-2.3, 0.05, 0);
    else if (cameraPreset === "right") dest.set(2.3, 0.05, 0);
    else if (cameraPreset === "iso") dest.set(1.6, 1.1, 1.8);
    // M4.4 — zoom kerah: dekat + sedikit dari atas agar rib kerah terbaca.
    else if (cameraPreset === "collar") dest.set(0, 0.32, 1.05);

    presetAnim.current = {
      from: camera.position.clone(),
      to: dest,
      fromLook: currentLookAt.current.clone(),
      t: 0,
    };
  }, [cameraPreset, camera]);

  // Pola eksklusif Sep 2026: busur kamera — preset naik y+0.25 di tengah
  // jalan (sinus), gerak story pakai damp λ=3 yang lembut. Gate cameraPreset
  // TETAP: preset baru di-clear saat animasi tuntas (frameloop demand aman).
  const tmpVec = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    // Mainkan animasi preset (±0.6 detik, ease-out + busur).
    const anim = presetAnim.current;
    if (anim) {
      anim.t = Math.min(1, anim.t + delta / 0.6);
      const k = 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.from, anim.to, k);
      // Busur: angkat y hingga +0.25 di tengah transisi agar tak menembus kain.
      camera.position.y += Math.sin(k * Math.PI) * 0.25;
      currentLookAt.current.lerpVectors(anim.fromLook, new THREE.Vector3(0, 0, 0), k);
      camera.lookAt(currentLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentLookAt.current);
        controlsRef.current.update();
      }
      // B-06: tuntas → baru clear preset (CanvasStage kembali demand).
      if (anim.t >= 1) {
        presetAnim.current = null;
        if (useConfiguratorStore.getState().cameraPreset !== null) {
          setCameraPreset(null);
        }
      }
      return;
    }
    if (viewMode === "story" && !isHideWebsiteUI) {
      // Damp λ=3: halus tanpa overshoot (ganti lerp kasar).
      const d = Math.min(delta, 0.05);
      tmpVec.current.copy(targetPosition);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, tmpVec.current.x, 3, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, tmpVec.current.y, 3, d);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, tmpVec.current.z, 3, d);
      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, 3, d);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, 3, d);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, 3, d);
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
        // TOUCH (cermin mobile TouchOrbitControls): 1 jari = rotate,
        // 2 jari = dolly+pan. touch-action:pan-y diatur di CanvasStage agar
        // scroll vertikal halaman tetap jalan di HP.
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
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
