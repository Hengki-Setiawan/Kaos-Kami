"use client";

import React, { useRef, useEffect } from 'react';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useMobileStudioStore, CameraAngle } from '@/store/useMobileStudioStore';

const CAMERA_POSITIONS: Record<CameraAngle, [number, number, number]> = {
  front: [0, 0, 2.5],
  back: [0, 0, -2.5],
  left: [-2.5, 0, 0],
  right: [2.5, 0, 0],
  perspective: [1.2, 0.6, 2.2],
};

export function TouchOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraAngle = useMobileStudioStore((s) => s.cameraAngle);
  const isGizmoDragging = useMobileStudioStore((s) => s.isGizmoDragging);
  // F3 Test Lab arbitrasi sentuh: mode stretch = orbit MATI (drag = tarik
  // kain via MobileStretchController); isStretchDragging = kunci tambahan
  // saat jari menempel. Mode senter = gyro parallax MATI (sorotan milik pointer).
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const isStretchDragging = useMobileStudioStore((s) => s.isStretchDragging);
  const isStretchMode = testLabMode === 'stretch';
  const isFlashlightMode = testLabMode === 'flashlight';
  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const gyroOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (cameraAngle && CAMERA_POSITIONS[cameraAngle]) {
      const pos = CAMERA_POSITIONS[cameraAngle];
      targetPosRef.current = new THREE.Vector3(...pos);
    }
  }, [cameraAngle]);

  // Sensor DeviceOrientation: Parallax kemiringan HP halus saat memegang perangkat
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // F3: gyro off saat senter (sorotan milik pointer) & stretch (milik drag).
      if (isGizmoDragging || isStretchDragging || isStretchMode || isFlashlightMode || targetPosRef.current) return;
      // gamma: kiri/kanan (-90 ke 90), beta: depan/belakang (-180 ke 180)
      const gamma = e.gamma ?? 0;
      const beta = (e.beta ?? 45) - 45; // normalisasi posisi pegang ~45 deg
      const clampX = Math.max(-20, Math.min(20, gamma)) / 20; // -1 to 1
      const clampY = Math.max(-20, Math.min(20, beta)) / 20;  // -1 to 1
      gyroOffsetRef.current = {
        x: clampX * 0.08,
        y: clampY * 0.06,
      };
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isGizmoDragging, isStretchDragging, isStretchMode, isFlashlightMode]);

  useFrame((_, delta) => {
    if (targetPosRef.current && controlsRef.current) {
      camera.position.lerp(targetPosRef.current, Math.min(1, delta * 6));
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 6));
      controlsRef.current.update();

      if (camera.position.distanceTo(targetPosRef.current) < 0.01) {
        targetPosRef.current = null;
      }
    } else if (controlsRef.current && !isGizmoDragging && !isStretchDragging && !isStretchMode) {
      // Subtle gyro parallax response
      const targetX = gyroOffsetRef.current.x;
      const targetY = gyroOffsetRef.current.y;
      controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, targetX, Math.min(1, delta * 3));
      controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, targetY, Math.min(1, delta * 3));
    }
  });

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enabled={!isGizmoDragging && !isStretchDragging && !isStretchMode}
      enablePan={false}
      enableZoom={true}
      rotateSpeed={0.75}
      zoomSpeed={0.55}
      enableDamping={true}
      dampingFactor={0.08}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.75}
      minDistance={1.6}
      maxDistance={4.2}
      makeDefault
    />
  );
}

