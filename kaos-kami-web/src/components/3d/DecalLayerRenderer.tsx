"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { CleanDecal } from "@/components/3d/CleanDecal";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  APPAREL_PHYSICAL_SPECS,
  maxDecalScaleUnits,
  fitScaleToSideBox,
  REAL_WORLD_PRINT_LIMITS,
  surfaceZForApparel,
  getDecal3DPlacement,
} from "@/lib/scaleCalibration";
import { isSafeImageUrl } from "@/lib/safeUrl";
import { getFabricNormalMapForArchetype } from "@/lib/proceduralTextures";
import { getStretchFactors } from "@/lib/3d/stretchPhysics";
import type { DecalLayer } from "@/lib/constants";

const SingleDecalItem: React.FC<{
  decal: DecalLayer;
  surfaceZ: number;
  order: number;
}> = ({ decal, surfaceZ, order }) => {
  const uploaded = useTexture(isSafeImageUrl(decal.url) ? decal.url : "/textures/fallback-transparent.png");

  // JANGAN dispose: drei useTexture cache per-URL dipakai bersama —
  // dispose di sini = flicker/use-after-dispose di decal lain (audit #5c).
  // Cache drei + unmount GC sudah cukup untuk sesi studio.

  const apparel = useConfiguratorStore.getState().activeApparel;
  const { animationPreset, animationSpeed, specialInkEffect, testLabMode, stretchIntensity, stretchDirection } =
    useConfiguratorStore(
      useShallow((s) => ({
        animationPreset: s.animationPreset,
        animationSpeed: s.animationSpeed,
        specialInkEffect: s.specialInkEffect,
        testLabMode: s.testLabMode,
        stretchIntensity: s.stretchIntensity,
        stretchDirection: s.stretchDirection,
      }))
    );

  // Parameter penempatan 3D terkalibrasi presisi (anti-tembus torso, anti-shearing samping)
  const placement = getDecal3DPlacement(apparel, decal.targetSide, decal.x, decal.y, surfaceZ);
  const posX = placement.position[0];
  const posY = placement.position[1];
  const posZ = placement.position[2];
  // Depth terkalibrasi: CleanDecal secara geometris memfilter segitiga yang tidak menghadap proyektor
  const depthZ = placement.projectionDepth;

  // Komputasi rotasi terpadu: basis orientasi permukaan 3D (kemiringan lengan/rusuk) dikombinasikan dengan rotasi pengguna
  const finalRotation = useMemo(() => {
    const baseEuler = new THREE.Euler(placement.rotation[0], placement.rotation[1], placement.rotation[2], "XYZ");
    const qBase = new THREE.Quaternion().setFromEuler(baseEuler);
    const qUser = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (-decal.rotation * Math.PI) / 180);
    const qFinal = qBase.multiply(qUser);
    const e = new THREE.Euler().setFromQuaternion(qFinal, "XYZ");
    return [e.x, e.y, e.z] as [number, number, number];
  }, [placement.rotation, decal.rotation]);

  // PERF #6: Starklord anisotropy 16→8 + depth tuning. 8× cukup untuk decal
  // tegak di dada (grazing ekstrem dipegang weave kain, bukan decal); 16× =
  // 2× tap sampler tanpa beda visual di mockup. Guard set-sekali — tanpa ini
  // needsUpdate=true tiap render memaksa re-upload GPU tiap frame (stutter).
  if ((uploaded as any).anisotropy !== undefined && (uploaded as any).anisotropy !== 8) {
    (uploaded as any).anisotropy = 8;
    uploaded.needsUpdate = true;
  }
  // M2.8: decal = gambar warna → SRGB eksplisit agar warna layar = file
  // (uji: chart abu + merah/oranye vs file asli). Guard set-sekali seperti
  // anisotropy di atas agar tak re-upload GPU tiap frame.
  if (
    (uploaded as any).colorSpace !== undefined &&
    (uploaded as any).colorSpace !== THREE.SRGBColorSpace
  ) {
    (uploaded as any).colorSpace = THREE.SRGBColorSpace;
    uploaded.needsUpdate = true;
  }

  // Presisi Rasio Aspek Alami & Normalisasi Skala Fisik Nyata (Maksimal 30.0 cm DTF)
  const imgWidth = (uploaded.image as any)?.width || 1;
  const imgHeight = (uploaded.image as any)?.height || 1;
  const aspect = imgWidth > 0 && imgHeight > 0 ? imgWidth / imgHeight : 1;

  let normalizedScale = decal.scale;
  // Kunci keras pada batas fisik printhead roll DTF workshop Makassar —
  // batas UNIT dihitung dari multiplier terukur agar 30cm benar-benar tercapai.
  const maxScale = maxDecalScaleUnits(
    useConfiguratorStore.getState().activeApparel,
    decal.targetSide
  );
  normalizedScale = Math.max(
    REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits,
    Math.min(maxScale, normalizedScale)
  );
  // Fit proporsional ke box sisi (SAMA dengan produksi — audit: tampil beda
  // dengan yang dicetak untuk artwork portrait oversize).
  normalizedScale = normalizedScale * fitScaleToSideBox(
    useConfiguratorStore.getState().activeApparel,
    decal.targetSide,
    normalizedScale,
    aspect
  );

  let scaleX = normalizedScale;
  let scaleY = normalizedScale;
  if (aspect >= 1) {
    // Landscape atau Square: lebar dasar, tinggi proporsional
    scaleY = normalizedScale / aspect;
  } else {
    // Portrait: tinggi dasar, lebar proporsional
    scaleX = normalizedScale * aspect;
  }

  // 🧲 FISIKA ELASTISITAS DTF (Pull & Stretch Test):
  // Deformasi sablon mengikuti arah regangan kain (horizontal, vertical, biaxial)
  if (testLabMode === "stretch" && stretchIntensity > 0) {
    const factors = getStretchFactors(testLabMode, stretchIntensity, stretchDirection);
    scaleX *= factors.stretchX;
    scaleY *= factors.stretchY;
  }

  // PERF #6: downscale artwork >1024 ke sisi-panjang 1024 untuk PREVIEW 3D
  // saja (master cetak 300 DPI tak tersentuh — tersimpan terpisah untuk
  // produksi). 2048²→1024² = −75% VRAM (16MB→4MB RGBA), upload GPU + filter
  // fragmen jauh lebih murah; di mockup ±600px layar, 1024 sudah >2×
  // oversample (bedanya dengan 2K/4K ≈nol). Kecil (≤1024) = pakai asli
  // (nol copy). Copy hasil di-dispose saat ganti; cache drei tak disentuh.
  const displayMap = useMemo(() => {
    try {
      const img = (uploaded.image as unknown as { width?: number; height?: number }) || {};
      const w = Number((img as { width?: number }).width) || 0;
      const h = Number((img as { height?: number }).height) || 0;
      if (!w || !h || (w <= 1024 && h <= 1024)) return uploaded;
      if (typeof document === "undefined") return uploaded;
      const s = Math.min(1024 / w, 1024 / h);
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return uploaded;
      ctx.drawImage(uploaded.image as unknown as CanvasImageSource, 0, 0, cw, ch);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    } catch {
      return uploaded;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploaded]);

  useEffect(() => {
    return () => {
      try {
        if (displayMap !== uploaded) (displayMap as unknown as { dispose?: () => void }).dispose?.();
      } catch {}
    };
  }, [displayMap, uploaded]);

  // 🔦 & 🖨️ TINTA SPESIAL DTF & MATERIAL ANTI-CLIPPING:
  // - 3M Reflective: metalness tinggi, clearcoat glossy tajam, specular perak memantul saat kena senter
  // - Glow-in-the-Dark: fosfor neon hijau/cyan berpendar mandiri di ruang gelap
  // - Gold Foil: kilau logam emas metalik mewah
  // - Holographic: pelangi tipis thin-film iridescence
  // - Standard DTF: matte halus bersatu dengan serat kain
  const is3M = specialInkEffect === "reflective3m";
  const isGlow = specialInkEffect === "glow";
  const isGold = specialInkEffect === "goldfoil";
  const isHolo = specialInkEffect === "holographic";

  const decalMaterial = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: displayMap,
      transparent: true,
      opacity: decal.opacity,
      roughness: is3M ? 0.15 : isGold ? 0.22 : isHolo ? 0.12 : 0.92,
      metalness: is3M ? 0.88 : isGold ? 0.95 : isHolo ? 0.82 : 0,
      sheen: is3M ? 1.0 : isHolo ? 1.0 : 0.5,
      sheenRoughness: is3M ? 0.1 : isHolo ? 0.2 : 0.7,
      sheenColor: is3M
        ? new THREE.Color("#ffffff")
        : isGold
        ? new THREE.Color("#ffe099")
        : isHolo
        ? new THREE.Color("#93c5fd")
        : new THREE.Color("#ffffff"),
      clearcoat: is3M ? 1.0 : isGold ? 0.85 : isHolo ? 1.0 : 0.0,
      clearcoatRoughness: 0.1,
      iridescence: isHolo ? 1.0 : 0.0,
      iridescenceIOR: isHolo ? 1.35 : 1.0,
      iridescenceThicknessRange: isHolo ? [120, 420] : [100, 400],
      emissive: isGlow ? new THREE.Color("#10e870") : new THREE.Color(0x000000),
      emissiveIntensity: isGlow ? 1.0 : 0.0,
      normalMap: typeof window !== "undefined" ? getFabricNormalMapForArchetype(apparel) : null,
      normalScale: new THREE.Vector2(0.15, 0.15),
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6 - order,
      polygonOffsetUnits: -6,
      alphaTest: 0.01,
    });
    m.envMapIntensity = is3M ? 2.5 : isGold ? 2.2 : isHolo ? 2.8 : 0.3;

    // M2.3: alpha-feather tepi ±1–2px via shader — menghaluskan tangga piksel
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n\tdiffuseColor.a = smoothstep(0.0, 0.08, diffuseColor.a);"
      );
    };
    m.customProgramCacheKey = () =>
      `kaos-kami-decal-v2-${specialInkEffect}-${order}`;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMap, order, decal.opacity, apparel, specialInkEffect]);

  // Material milik sendiri → buang saat ganti (tekstur uploaded + weave milik
  // cache bersama — material.dispose() tak menyentuh tekstur, aman).
  useEffect(() => {
    return () => {
      try {
        decalMaterial.dispose();
      } catch {}
    };
  }, [decalMaterial]);



  const setSelectedDecalId = useConfiguratorStore((s) => s.setSelectedDecalId);

  return (
    <CleanDecal
      targetSide={decal.targetSide}
      position={[posX, posY, posZ]}
      rotation={finalRotation}
      scale={[scaleX, scaleY, depthZ]}
      onPointerDown={(e) => {
        e.stopPropagation();
        setSelectedDecalId(decal.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={decalMaterial} attach="material" />
    </CleanDecal>
  );
};

export const DecalLayerRenderer: React.FC<{
  surfaceZFront?: number;
  surfaceZBack?: number;
}> = ({
  surfaceZFront,
  surfaceZBack,
}) => {
  const { decals, activeApparel } = useConfiguratorStore(
    useShallow((s) => ({ decals: s.decals, activeApparel: s.activeApparel }))
  );
  // surfaceZ SSOT per apparel (audit #6 — fallback literal lama 0.176 salah
  // untuk shirt 0.24). Model selalu kirim prop SSOT; fallback ini pengaman
  // bila dipakai tanpa prop. Blok skala/cm di bawah TIDAK diubah (SUCI).
  const zFront = surfaceZFront ?? surfaceZForApparel(activeApparel);
  const zBack = surfaceZBack ?? surfaceZForApparel(activeApparel);

  if (!decals || decals.length === 0) {
    return null;
  }

  return (
    <>
      {decals.map((decal, i) => (
        <SingleDecalItem
          key={decal.id}
          decal={decal}
          order={i}
          surfaceZ={decal.targetSide === "back" ? zBack : zFront}
        />
      ))}
    </>
  );
};
