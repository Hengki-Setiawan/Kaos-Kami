"use client";

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { apparelToArchetype, createClothPhysicalMaterial } from '@/lib/materials/clothPhysicalMaterial';
import { ClothInertiaSimulator } from '@/lib/3d/clothInertiaPhysics';
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';
import { DecalGizmoMobile } from './DecalGizmoMobile';

// Preload mobile models
useGLTF.preload('/models/tshirt-heavyweight.glb');
useGLTF.preload('/models/hoodie.optimized.glb');
useGLTF.preload('/models/jacket.optimized.glb');
useGLTF.preload('/models/longsleeve.glb');
useGLTF.preload('/models/hoodie.lod1.glb');
useGLTF.preload('/models/jacket.lod1.glb');

export function MobileApparelMeshRenderer({
  externalTransform,
}: {
  externalTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const color = useMobileStudioStore((s) => s.color);
  const { tier } = useMobileDeviceTier();

  // Initialize rotational cloth inertia simulator
  const clothPhysics = useMemo(() => new ClothInertiaSimulator({ stiffness: 38.0, damping: 7.2 }), []);
  const lastYRotation = useRef<number>(0);

  // Model path selection — tier low memakai varian LOD ringan (hemat VRAM/RAM).
  const modelPath = useMemo(() => {
    const low = tier === 'low';
    switch (apparelType) {
      case 'hoodie':
        return low ? '/models/hoodie.lod1.glb' : '/models/hoodie.optimized.glb';
      case 'jacket':
        return low ? '/models/jacket.lod1.glb' : '/models/jacket.optimized.glb';
      case 'longsleeve':
        return '/models/longsleeve.glb';
      case 'tshirt':
      default:
        return '/models/tshirt-heavyweight.glb';
    }
  }, [apparelType, tier]);

  const { scene } = useGLTF(modelPath);

  // Clone scene & apply PBR cloth materials
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    const material = createClothPhysicalMaterial(color, apparelToArchetype(apparelType));

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene, color, apparelType]);

  // Inertial physics simulation step per frame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (externalTransform) {
      // If controlled by MediaPipe AR
      if (externalTransform.position) {
        groupRef.current.position.set(...externalTransform.position);
      }
      if (externalTransform.rotation) {
        groupRef.current.rotation.set(...externalTransform.rotation);
      }
      if (externalTransform.scale) {
        const s = externalTransform.scale * 1.4;
        groupRef.current.scale.set(s, s, s);
      }
    } else {
      // Standard Studio 3D: Apply Rotational Spring Inertia
      const currentY = groupRef.current.rotation.y;
      clothPhysics.reportRotation(currentY, delta);
      const swayAngle = clothPhysics.update(delta);

      // Apply subtle dynamic inertial lean to lower hem (Z-axis sway)
      groupRef.current.rotation.z = -swayAngle * 0.45;
      lastYRotation.current = currentY;
    }
  });

  return (
    <group ref={groupRef} scale={[1.4, 1.4, 1.4]} position={[0, -0.15, 0]}>
      <primitive object={clonedScene} />
      <MobileDecalLayerRenderer />
      <DecalGizmoMobile />
    </group>
  );
}
