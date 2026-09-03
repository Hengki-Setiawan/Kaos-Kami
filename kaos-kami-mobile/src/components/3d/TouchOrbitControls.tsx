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
  const targetPosRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (cameraAngle && CAMERA_POSITIONS[cameraAngle]) {
      const pos = CAMERA_POSITIONS[cameraAngle];
      targetPosRef.current = new THREE.Vector3(...pos);
    }
  }, [cameraAngle]);

  useFrame((_, delta) => {
    if (targetPosRef.current && controlsRef.current) {
      camera.position.lerp(targetPosRef.current, Math.min(1, delta * 6));
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 6));
      controlsRef.current.update();

      if (camera.position.distanceTo(targetPosRef.current) < 0.01) {
        targetPosRef.current = null;
      }
    }
  });

  return (
    <DreiOrbitControls
      ref={controlsRef}
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
