"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

interface CameraRigProps {
  targetPosition?: THREE.Vector3;
  targetLookAt?: THREE.Vector3;
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
    isStretchDragging,
    testLabMode,
    modelPosX,
    modelPosY,
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
      isStretchDragging: s.isStretchDragging,
      testLabMode: s.testLabMode,
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
    }))
  );

  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const isMobile = useConfiguratorStore((s) => s.isMobile);

  // Ukuran besar & megah: targetZ 1.46 untuk desktop, 1.82 untuk mobile dengan elevasi aman dari HUD dock
  const targetZ = isMobile ? 1.82 : 1.46;

  // Viewport Offset Dinamis via Three.js camera.setViewOffset:
  // - Panel di Kiri  -> Aset 3D otomatis bergeser ke panggung KANAN (+280px)
  // - Panel di Kanan -> Aset 3D otomatis bergeser ke panggung KIRI (-280px)
  // - Panel Ditutup / Tampil Bersih / Mobile -> Aset 3D tepat di TENGAH (0px)
  // Poros rotasi (OrbitControls) TETAP 100% tepat di tengah baju (0, -0.10, 0),
  // sehingga baju berputar mulus pada porosnya sendiri tanpa goyang/ayunan.
  const targetPixelOffset =
    isMobile || isHideWebsiteUI || isDrawerCollapsed || viewMode !== "studio"
      ? 0
      : drawerPosition === "left"
      ? 280
      : -280;

  const currentPixelOffset = useRef(targetPixelOffset);
  const currentLookAt = useRef(new THREE.Vector3(modelPosX, modelPosY - 0.10, 0));
  const presetAnim = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromLook: THREE.Vector3;
    toLook: THREE.Vector3;
    t: number;
  } | null>(null);

  // Trigger re-render instan saat posisi drawer berubah (menghilangkan bug macet/stuck di demand frameloop)
  useEffect(() => {
    invalidate();
  }, [targetPixelOffset, invalidate]);

  // Inisialisasi posisi kamera & viewOffset saat pertama kali mount
  useEffect(() => {
    const W = gl.domElement.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1920);
    const H = gl.domElement.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 1080);

    const initOffset =
      isMobile || isHideWebsiteUI || isDrawerCollapsed || viewMode !== "studio"
        ? 0
        : drawerPosition === "left"
        ? 280
        : -280;

    currentPixelOffset.current = initOffset;

    if (initOffset !== 0) {
      (camera as THREE.PerspectiveCamera).setViewOffset(W, H, -initOffset, 0, W, H);
    } else {
      (camera as THREE.PerspectiveCamera).clearViewOffset?.();
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix?.();
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(modelPosX, modelPosY - 0.10, 0);
      camera.position.set(modelPosX, modelPosY + 0.01, targetZ);
      camera.lookAt(modelPosX, modelPosY - 0.10, 0);
      controlsRef.current.update();
    }

    invalidate();

    return () => {
      try {
        (camera as THREE.PerspectiveCamera).clearViewOffset?.();
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix?.();
      } catch {}
    };
  }, []);

  // Quick Camera Presets
  // B-06: JANGAN clear preset di sini — CanvasStage frameloop="demand" hanya
  // memberi frame selama cameraPreset !== null. Clear instan = animasi 0.6s tak
  // pernah dapat frame (lompat diam / jump). Preset di-clear di useFrame saat
  // animasi tuntas, sehingga frameloop tetap "always" selama transisi.
  useEffect(() => {
    if (!cameraPreset) return;

    const baseDest = new THREE.Vector3(0, 0.01, targetZ);
    if (cameraPreset === "back") baseDest.set(0, 0.01, -targetZ);
    else if (cameraPreset === "left") baseDest.set(-targetZ, 0.01, 0);
    else if (cameraPreset === "right") baseDest.set(targetZ, 0.01, 0);
    else if (cameraPreset === "iso") baseDest.set(1.2, 0.75, 1.25);
    // M4.4 — zoom kerah: dekat + sedikit dari atas agar rib kerah terbaca.
    else if (cameraPreset === "collar") baseDest.set(0, 0.22, 0.78);

    const currentTarget = controlsRef.current
      ? controlsRef.current.target.clone()
      : new THREE.Vector3(modelPosX, modelPosY - 0.10, 0);
    const targetLook =
      cameraPreset === "collar"
        ? new THREE.Vector3(modelPosX, modelPosY + 0.12, 0)
        : new THREE.Vector3(modelPosX, modelPosY - 0.10, 0);
    const dest = baseDest.clone().add(targetLook);

    presetAnim.current = {
      from: camera.position.clone(),
      to: dest,
      fromLook: currentTarget,
      toLook: targetLook,
      t: 0,
    };
    invalidate();
  }, [cameraPreset, camera, modelPosX, modelPosY, targetZ, invalidate]);

  // Pola eksklusif: busur kamera — preset naik y+0.25 di tengah jalan (sinus)
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
      currentLookAt.current.lerpVectors(anim.fromLook, anim.toLook, k);
      camera.lookAt(currentLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentLookAt.current);
        controlsRef.current.update();
      }
      invalidate();
      // B-06: tuntas → baru clear preset (CanvasStage kembali demand).
      if (anim.t >= 1) {
        presetAnim.current = null;
        if (useConfiguratorStore.getState().cameraPreset !== null) {
          setCameraPreset(null);
        }
      }
      return;
    }

    if (viewMode === "studio") {
      const d = Math.min(delta, 0.05);

      // Smooth View Offset Gliding (transisi mulus ketika drawer dibuka/ditutup/dipindah)
      const diffOffset = targetPixelOffset - currentPixelOffset.current;
      if (Math.abs(diffOffset) > 0.5) {
        currentPixelOffset.current = THREE.MathUtils.damp(
          currentPixelOffset.current,
          targetPixelOffset,
          6.0,
          d
        );
        const W = gl.domElement.clientWidth || window.innerWidth;
        const H = gl.domElement.clientHeight || window.innerHeight;
        (camera as THREE.PerspectiveCamera).setViewOffset(
          W,
          H,
          -currentPixelOffset.current,
          0,
          W,
          H
        );
        // Terus minta render frame berikutnya sampai transisi konvergen (mengatasi bug macet tanpa klik!)
        invalidate();
      } else if (targetPixelOffset === 0 && (camera as any).view && (camera as any).view.enabled) {
        currentPixelOffset.current = 0;
        (camera as THREE.PerspectiveCamera).clearViewOffset?.();
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix?.();
        invalidate();
      }
    }

    if (viewMode === "story" && !isHideWebsiteUI && targetPosition && targetLookAt) {
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

  // Sinkronisasi target jika posisi model diubah dari tombol alignment drawer (⬅ KIRI, ⏺ TENGAH, KANAN ➡)
  const prevModelPos = useRef({ x: modelPosX, y: modelPosY });
  useEffect(() => {
    const dx = modelPosX - prevModelPos.current.x;
    const dy = modelPosY - prevModelPos.current.y;
    prevModelPos.current = { x: modelPosX, y: modelPosY };

    if (controlsRef.current && (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001)) {
      controlsRef.current.target.x += dx;
      controlsRef.current.target.y += dy;
      camera.position.x += dx;
      camera.position.y += dy;
      controlsRef.current.update();
    }
  }, [modelPosX, modelPosY, camera]);

  if (viewMode === "studio" || isHideWebsiteUI) {
    const isPanMode = interactionTool === "pan";
    const isStretchMode = testLabMode === "stretch";
    const canRotateOrPan = !isGizmoDragging && !isStretchDragging && !isStretchMode;

    return (
      <OrbitControls
        ref={controlsRef}
        enabled={!isGizmoDragging && !isStretchDragging}
        enableRotate={canRotateOrPan}
        enablePan={canRotateOrPan}
        enableZoom={true}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.75}
        zoomSpeed={0.85}
        panSpeed={0.8}
        // TOUCH: 1 jari di mode geser = pan, di mode rotate = putar 360. 2 jari = zoom & pan
        touches={{
          ONE: isPanMode ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        mouseButtons={{
          LEFT: isPanMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: isPanMode ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
        minDistance={0.25}
        maxDistance={4.8}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 1.7}
        makeDefault
      />
    );
  }

  return null;
};
