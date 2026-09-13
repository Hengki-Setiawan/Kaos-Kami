"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { apparelToArchetype, createClothPhysicalMaterial } from '@/lib/materials/clothPhysicalMaterial';
import { ClothInertiaSimulator } from '@/lib/3d/clothInertiaPhysics';
import { applyMobileWind, ensureWindWeights } from '@/lib/3d/windShader';
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';
import { DecalGizmoMobile } from './DecalGizmoMobile';
import {
  candidatesFor,
  probeFirstExistingUrlMobile,
  MOBILE_CAP_FALLBACK,
} from './MobileApparelMeshRenderer';

// Offset agar crown (bukan bbox-center) tepat di origin — CERMIN WEB
// CapModel.CAP_CROWN_Y_OFFSET (TERUKUR Fase 13): crown +0.113 pasca-center →
// −0.11 memanggang tengah crown ke origin agar decal default (y≈0) mendarat
// di crown, bukan di lidah. World TERUKUR ulang Sep 2026: Y 0.032–0.308
// (center 0.170, crown +0.138) — selisih 0.025 dari angka web (varian ukur);
// −0.11 DIPERTAHANKAN cermin web. TODO: cek visual HP bila decal meleset.
const CAP_CROWN_Y_OFFSET = -0.11;

// MobileCapModel — cermin web `CapModel.tsx` (baseball_cap Sketchfab,
// cap.draco.glb −92%) di bawah batasan HP (lihat MobileSweaterModel):
// DPR rendah (tier Canvas), tanpa reflektor, dispose milik-sendiri, decal
// DI DALAM <mesh> (syarat drei), single-color SELALU (satu panel; multi-part
// tak bermakna untuk topi — sama seperti web).
//
// KALIBRASI:
// - surfaceZ 0.091 CERMIN WEB (muka crown maxZ 0.1397 − centerZ 0.049 — depth
//   penuh 0.548 MENYESATKAN karena termasuk lidah; world TERUKUR: Z
//   −0.225…0.323, lidah +Z). RISIKO: lidah menjorok ke +Z hingga 0.274 di
//   depan bidang decal — sudut miring bisa menutupi bawah decal.
// - units/cm 50.0 = ASUMSI + TODO (web TAK PUNYA spek fisik cap — fallback
//   web = spek tshirt 78.4/30cm; crown span TERUKUR 0.4004u ≈ panel depan
//   snapback 20cm → 20/0.4004 = 49.95 → 50.0; ukur topi fisik menyusul).
// - maxWidth 12cm = ASUMSI + TODO (area DTF/bordir panel depan; bukan spek
//   web; orderable false → tak pernah ditagih).
// - JANGAN ubah angka 50.0/12/-0.11 tanpa ukur topi fisik + meteran
//   (sesi uji fisik manual) — komentar ASUMSI+TODO di atas penanda resminya.
// - Depan = +Z TERUKUR + cermin web ("lidah menghadap +Z (penonton) — decal
//   depan di +Z sudah benar").
// - validSidesFor(cap) web = ["front"] SAJA — mobile TAK validasi sisi
//   (activeFace back menaruh decal di −Z = dalam topi). TODO follow-up:
//   kunci sisi back untuk cap seperti PatternStudio web.
// - Tanpa fallback mesh lain: draco 404 → master lokal. JANGAN fallback ke
//   tshirt (bukan topi — menipu).
export function MobileCapModel() {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMobileStudioStore((s) => s.color);
  const { tier } = useMobileDeviceTier();

  const clothPhysics = useMemo(() => new ClothInertiaSimulator({ stiffness: 38.0, damping: 7.2 }), []);

  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setResolvedPath(null);
    void probeFirstExistingUrlMobile(candidatesFor('cap', tier)).then((url) => {
      if (alive) setResolvedPath(url);
    });
    return () => {
      alive = false;
    };
  }, [tier]);

  const modelPath = resolvedPath ?? MOBILE_CAP_FALLBACK;
  const { scene } = useGLTF(modelPath);

  // Geometri milik sendiri: clone + bake world (node skala ~195× + rotasi
  // Sketchfab) + center + wind. HANYA [scene] — stabil saat ganti warna.
  const baseGeometry = useMemo(() => {
    try {
      scene.updateMatrixWorld(true);
    } catch {}
    let picked: THREE.BufferGeometry | null = null;
    const spares: THREE.BufferGeometry[] = [];
    scene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        const g = (mesh.geometry as THREE.BufferGeometry).clone();
        try {
          g.applyMatrix4(mesh.matrixWorld);
        } catch {}
        if (!picked) picked = g;
        else spares.push(g);
      }
    });
    for (const g of spares) {
      try {
        g.dispose();
      } catch {}
    }
    if (!picked) return null;
    const geo: THREE.BufferGeometry = picked;
    geo.center();
    ensureWindWeights(geo);
    return geo;
  }, [scene]);

  const material = useMemo(() => {
    // Tak ada archetype topi — twill katun paling dekat "tshirt"
    // (cermin web CapModel).
    const mat = createClothPhysicalMaterial(color, apparelToArchetype('cap'));
    applyMobileWind(mat, 0.25);
    return mat;
  }, [color]);

  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  const matRef = useRef<THREE.Material | null>(null);
  geoRef.current = baseGeometry;
  matRef.current = material;
  useEffect(() => {
    const stale = geoRef.current;
    return () => {
      try {
        stale?.dispose();
      } catch {}
    };
  }, [baseGeometry]);
  useEffect(() => {
    const stale = matRef.current;
    return () => {
      try {
        stale?.dispose();
      } catch {}
    };
  }, [material]);

  useFrame((state, delta) => {
    void state;
    if (!groupRef.current) return;
    const currentY = groupRef.current.rotation.y;
    clothPhysics.reportRotation(currentY, delta);
    const swayAngle = clothPhysics.update(delta);
    groupRef.current.rotation.z = -swayAngle * 0.45;
    const sh = (matRef.current as any)?.userData?.shader?.uniforms;
    if (sh?.uWindStrength) {
      sh.uWindStrength.value = 0.2 + Math.min(1, Math.abs(swayAngle) * 6) * 0.9;
    }
    if (sh?.uTime) sh.uTime.value += delta;
  });

  return (
    <group
      ref={groupRef}
      scale={[1.4, 1.4, 1.4]}
      position={[0, -0.15 + CAP_CROWN_Y_OFFSET * 1.4, 0]}
    >
      <mesh castShadow receiveShadow geometry={baseGeometry ?? undefined} material={material}>
        <MobileDecalLayerRenderer />
      </mesh>
      <DecalGizmoMobile />
    </group>
  );
}
