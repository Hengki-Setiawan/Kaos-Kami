"use client";

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';

export function AnimationController({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const activeAnimation = useMobileStudioStore((s) => s.activeAnimation);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    switch (activeAnimation) {
      case 'idle':
        // Gentle breathing and micro sway
        groupRef.current.position.y = Math.sin(time * 1.8) * 0.015;
        groupRef.current.rotation.y = Math.sin(time * 0.8) * 0.04;
        groupRef.current.rotation.z = Math.sin(time * 1.2) * 0.01;
        break;

      case 'walking':
        // Rhythmic walking bounce and twist
        groupRef.current.position.y = Math.abs(Math.sin(time * 3.5)) * 0.035;
        groupRef.current.rotation.y = Math.sin(time * 2.5) * 0.12;
        groupRef.current.rotation.x = Math.sin(time * 3.5) * 0.03;
        break;

      case 'waving':
        // Wind wave flutter effect
        groupRef.current.rotation.z = Math.sin(time * 4) * 0.025;
        groupRef.current.position.x = Math.sin(time * 2.5) * 0.02;
        groupRef.current.rotation.y = Math.sin(time * 1.5) * 0.06;
        break;

      case 'spin':
        // 360 Turntable rotation
        groupRef.current.rotation.y += delta * 0.85;
        groupRef.current.position.y = 0;
        break;

      case 'none':
      default:
        // Smooth return to resting pose
        groupRef.current.position.lerp(new THREE.Vector3(0, 0, 0), delta * 4);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 4);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 4);
        break;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
