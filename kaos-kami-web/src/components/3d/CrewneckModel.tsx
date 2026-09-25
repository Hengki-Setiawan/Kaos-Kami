"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { ensureWindWeights } from "@/lib/geometryPrep";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { SilentModelFallback } from "@/components/ui/ModelErrorBoundary";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { applyStretchToMaterial, sharedStretchUniforms } from "@/lib/3d/stretchDeform";
import { HoodieModel } from "./HoodieModel";

// FASE 13 — crewneck akhirnya punya mesh SENDIRI (sweater.glb, sweater_pack
// Sketchfab, TANPA tudung — bukan lagi pinjaman hoodie). Struktur meniru
// TshirtModel (single-mesh + center + cloth material + DecalLayerRenderer).
// Fallback DIAM ke mesh cadangan (HoodieModel / hoodie-blue) bila sweater gagal dimuat.
// SWAP 20 Sep 2026: sweater Tristen (CC-BY 4.0, low-poly 5.6k tris, Y-up native).
const MODEL_PATH_NEW = "/models/sweater.glb?v=16";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

/** Ambil geometri mesh pertama (agnostik nama node Sketchfab). */
function firstMeshGeometry(nodes: any, scene?: any): THREE.BufferGeometry | undefined {
  const found = Object.values(nodes ?? {}).find(
    (n: any) => n && (n as any).isMesh && (n as any).geometry
  ) as any;
  if (found?.geometry) return found.geometry as THREE.BufferGeometry;
  let meshGeo: THREE.BufferGeometry | undefined;
  scene?.traverse?.((child: any) => {
    if (!meshGeo && child.isMesh && child.geometry) {
      meshGeo = child.geometry;
    }
  });
  return meshGeo;
}

const GltfCrewneckNew: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const invalidate = useThree((s) => s.invalidate);
  const { nodes, scene } = useGLTF(path) as any;
  const {
    selectedColor,
    isRotating,
    isWireframe,
    materialFinish,
    modelPosX,
    modelPosY,
    modelScale,
    viewMode,
  } = useConfiguratorStore(
    useShallow((s) => ({
      selectedColor: s.selectedColor,
      isRotating: s.isRotating,
      isWireframe: s.isWireframe,
      materialFinish: s.materialFinish,
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
      modelScale: s.modelScale,
      viewMode: s.viewMode,
    }))
  );

  const { partColors, activeColorMode } = useConfiguratorStore(
    useShallow((s) => ({ partColors: s.partColors, activeColorMode: s.activeColorMode }))
  );

  const { animationPreset, animationSpeed, testLabMode, stretchIntensity, stretchDirection } = useConfiguratorStore(
    useShallow((s) => ({
      animationPreset: s.animationPreset,
      animationSpeed: s.animationSpeed,
      testLabMode: s.testLabMode,
      stretchIntensity: s.stretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );
  const windStrength =
    animationPreset === "wind" ? 0.8 * animationSpeed : animationPreset === "walking" ? 0.4 * animationSpeed : animationPreset === "knit" ? 0.2 : 0;

  // KALIBRASI 20 Sep 2026 (sweater Tristen, paritas hem 1:1 vs mesh lama):
  // hem baru 1.33324 × 0.1965 = hem lama 0.35404 × 0.74 = 0.262 → ruang
  // terkalibrasi IDENTIK (threshold multi-part y>0.12/|x|>0.16 tetap valid).
  // crownYOffset -0.093: kerah di +0.16, dada di Y=0.
  const baseGeometry = useMemo(() => {
    return extractApparelGeometry(scene, { scaleMultiplier: 0.1965, crownYOffset: -0.093 });
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  // Multi-part by vertex position (ruang terkalibrasi: kerah y>0.12, lengan |x|>0.16)
  const coloredGeometry = useMemo(() => {
    if (!baseGeometry) return null;
    if (activeColorMode !== "multi-part") {
      if (baseGeometry.getAttribute("color")) baseGeometry.deleteAttribute("color");
      return baseGeometry;
    }
    const pos = baseGeometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return baseGeometry;
    const colBody = new THREE.Color(partColors.body || selectedColor);
    const colSleeve = new THREE.Color(partColors.sleeves || partColors.sleeve || selectedColor);
    const colCollar = new THREE.Color(partColors.collar || selectedColor);
    let attr = baseGeometry.getAttribute("color") as THREE.BufferAttribute | null;
    if (!attr || attr.count !== pos.count) {
      attr = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
      baseGeometry.setAttribute("color", attr);
    }
    const arr = attr.array as Float32Array;
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.12) tmp.copy(colCollar);
      else if (Math.abs(x) > 0.16) tmp.copy(colSleeve);
      else tmp.copy(colBody);
      arr[i * 3] = tmp.r;
      arr[i * 3 + 1] = tmp.g;
      arr[i * 3 + 2] = tmp.b;
    }
    attr.needsUpdate = true;
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  const material = useMemo(() => {
    // Archetype hoodie = French Terry fleece (kontinuitas material crewneck
    // lama yang me-render via HoodieModel; tak ada archetype crewneck).
    return createClothPhysicalMaterial({
      archetype: "hoodie",
      color: selectedColor,
      isWireframe,
      isMultiPart: activeColorMode === "multi-part",
      materialFinish,
      windStrength,
      lowTier: tier === "low",
    });
  }, [selectedColor, isWireframe, activeColorMode, materialFinish, windStrength, tier]);

  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useTrackedResource(geoTracker, coloredGeometry);
  useTrackedResource(matTracker, material);

  useEffect(() => {
    if (activeColorMode === "multi-part" && Object.keys(partColors).length > 0) {
      const firstPartColor = Object.values(partColors)[0];
      if (firstPartColor) material.color.set(firstPartColor);
    }
  }, [material, activeColorMode, partColors]);

  useFrame((state, delta) => {
    if (activeColorMode !== "multi-part") {
      easing.dampC(material.color, new THREE.Color(selectedColor), 0.25, delta);
    } else {
      easing.dampC(material.color, new THREE.Color(0xffffff), 0.25, delta);
    }
    if ((material as any).userData?.shader?.uniforms?.uTime) {
      (material as any).userData.shader.uniforms.uTime.value += delta * animationSpeed;
    }
    if (meshRef.current) {
      if (isRotating) meshRef.current.rotation.y += delta * 0.75;
      if (animationPreset === "walking") {
        const t = state.clock.getElapsedTime() * animationSpeed;
        meshRef.current.position.y = Math.sin(t * 2.2) * 0.025;
        meshRef.current.rotation.z = Math.sin(t * 1.6) * 0.04;
      } else if (animationPreset === "knit") {
        const prog = Math.min(1, (state.clock.getElapsedTime() % 3) / 2);
        const s = 0.9 + prog * 0.1;
        meshRef.current.scale.set(s, s, s);
      }
    }
  });

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;

  // Uji Tarik REAL: deformasi per-vertex via shader (bukan group-scale affine).
  // Inject sekali per material; uniforms BERSAMA ditulis StretchPhysicsController.
  useEffect(() => {
    applyStretchToMaterial(material, sharedStretchUniforms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material]);
  // Mode inspeksi bleed X-ray: kain transparan, sablon tetap opak.
  const bleedCheck = useConfiguratorStore((s) => s.inspectMode === "bleed");
  useEffect(() => {
    material.transparent = bleedCheck;
    material.opacity = bleedCheck ? 0.15 : 1;
    material.depthWrite = !bleedCheck;
  }, [material, bleedCheck]);

  return (
    <group
      ref={meshRef}
      position={[posX, posY, 0]}
      scale={[scale, scale, scale]}
      dispose={null}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={(coloredGeometry as any) || baseGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("crewneck")} surfaceZBack={surfaceZForApparel("crewneck")} />
      </mesh>
    </group>
  );
};

export const CrewneckModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfCrewneckNew path={MODEL_PATH_NEW} />
    </Suspense>
  );
};
