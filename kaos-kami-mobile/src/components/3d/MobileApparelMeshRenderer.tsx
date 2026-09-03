"use client";

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { createMobileClothMaterial } from '@/lib/materials/clothMaterialMobile';
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';

// Preload mobile models
useGLTF.preload('/models/tshirt-heavyweight.glb');
useGLTF.preload('/models/hoodie.optimized.glb');
useGLTF.preload('/models/jacket.optimized.glb');
useGLTF.preload('/models/longsleeve.glb');

export function MobileApparelMeshRenderer() {
  const groupRef = useRef<THREE.Group>(null);
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const color = useMobileStudioStore((s) => s.color);

  // Model path selection
  const modelPath = useMemo(() => {
    switch (apparelType) {
      case 'hoodie':
        return '/models/hoodie.optimized.glb';
      case 'jacket':
        return '/models/jacket.optimized.glb';
      case 'longsleeve':
        return '/models/longsleeve.glb';
      case 'tshirt':
      default:
        return '/models/tshirt-heavyweight.glb';
    }
  }, [apparelType]);

  const { scene } = useGLTF(modelPath);

  // Clone scene & apply PBR cloth materials
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    const material = createMobileClothMaterial(color);

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene, color]);

  return (
    <group ref={groupRef} scale={[1.4, 1.4, 1.4]} position={[0, -0.15, 0]}>
      <primitive object={clonedScene} />
      <MobileDecalLayerRenderer />
    </group>
  );
}
