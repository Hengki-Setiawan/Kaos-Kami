"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { DecalLayerRenderer } from "./DecalLayerRenderer";
import { createClothPhysicalMaterial } from "@/lib/materials/clothPhysicalMaterial";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { useResourceTracker, useTrackedResource } from "@/lib/threeResourceTracker";
import { surfaceZForApparel } from "@/lib/scaleCalibration";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { applyStretchToMaterial, sharedStretchUniforms } from "@/lib/3d/stretchDeform";

// SWAP 20 Sep 2026: mesh = ex-sweater.glb (lengan panjang + rib cuff sejati,
// torso parity 2.6% vs longsleeve lama) — scale 0.72/crown -0.12 dipertahankan.
const MODEL_PATH = "/models/longsleeve.glb?v=16";

// PERF 14 Sep 2026: top-level useGLTF.preload DIHAPUS — preload terpusat
// HANYA via idle-preload di CanvasStage (aktif + tetangga katalog) agar tak
// berebut bandwidth first paint.

const GltfLongsleeve: React.FC<{ path: string }> = ({ path }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { tier } = useDeviceTier();
  const invalidate = useThree((s) => s.invalidate);
  const { scene } = useGLTF(path) as any;
  const {
    selectedColor,
    isRotating,
    isWireframe,
    materialFinish,
    modelPosX,
    modelPosY,
    modelScale,
    viewMode,
    partColors,
    activeColorMode,
    animationPreset,
    animationSpeed,
    testLabMode,
    stretchIntensity,
    stretchDirection,
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
      partColors: s.partColors,
      activeColorMode: s.activeColorMode,
      animationPreset: s.animationPreset,
      animationSpeed: s.animationSpeed,
      testLabMode: s.testLabMode,
      stretchIntensity: s.stretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );

  const windStrength =
    animationPreset === "wind"
      ? 0.8 * animationSpeed
      : animationPreset === "walking"
      ? 0.4 * animationSpeed
      : animationPreset === "knit"
      ? 0.2
      : 0;

  // Bangun geometri longsleeve seamless terkalibrasi proporsional (selaras Hoodie acuan emas):
  // scaleMultiplier 0.72 (lebar 51.5cm = Size L) & crownYOffset -0.12 (kerah turun ke pangkal leher, dada di Y=0).
  const baseGeometry = useMemo(() => {
    return extractApparelGeometry(scene, { scaleMultiplier: 0.72, crownYOffset: -0.12 });
  }, [scene, path]);

  useEffect(() => {
    if (baseGeometry) invalidate();
  }, [invalidate, baseGeometry]);

  // Pewarnaan badan & lengan untuk multi-part (ruang terkalibrasi: kerah y>0.12, lengan |x|>0.18)
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
      else if (Math.abs(x) > 0.18) tmp.copy(colSleeve);
      else tmp.copy(colBody);
      arr[i * 3] = tmp.r;
      arr[i * 3 + 1] = tmp.g;
      arr[i * 3 + 2] = tmp.b;
    }
    attr.needsUpdate = true;
    return baseGeometry;
  }, [baseGeometry, activeColorMode, partColors, selectedColor]);

  // Material kain fisik realistis
  const material = useMemo(() => {
    return createClothPhysicalMaterial({
      archetype: "longsleeve",
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

  // Uji Tarik REAL + bleed X-ray: hooks WAJIB sebelum early-return (rules-of-hooks).
  useEffect(() => {
    if (!baseGeometry) return;
    applyStretchToMaterial(material, sharedStretchUniforms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, baseGeometry]);
  // Mode inspeksi bleed X-ray: kain transparan, sablon tetap opak.
  const bleedCheck = useConfiguratorStore((s) => s.inspectMode === "bleed");
  useEffect(() => {
    if (!baseGeometry) return;
    material.transparent = bleedCheck;
    material.opacity = bleedCheck ? 0.15 : 1;
    material.depthWrite = !bleedCheck;
  }, [material, bleedCheck, baseGeometry]);

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;

  if (!baseGeometry) return null;

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
        geometry={coloredGeometry || baseGeometry}
        material={material}
      >
        <DecalLayerRenderer surfaceZFront={surfaceZForApparel("longsleeve")} surfaceZBack={surfaceZForApparel("longsleeve")} />
      </mesh>
    </group>
  );
};

export const LongsleeveModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <GltfLongsleeve path={MODEL_PATH} />
    </Suspense>
  );
};
