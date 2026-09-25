"use client";

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Decal, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
  useMobileStudioStore,
  type ApparelType,
  type MobileDecalLayer,
  type SpecialInkEffect,
} from '@/store/useMobileStudioStore';
import {
  clampMobileDecalXY,
  mobileDecalPlacement,
  mobileFitScaleToSideBox,
  mobileMaxDecalScaleUnits,
  surfaceZForMobileApparel,
  MOBILE_MIN_DECAL_SCALE,
} from '@/lib/3d/mobileScaleCalibration';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { getStretchFactors } from '@/lib/3d/stretchPhysics';
import { getProceduralWeaveTexture } from '@/lib/materials/clothMaterialMobile';

/**
 * F2 Test Lab — tinta spesial MURAH via meshStandardMaterial (tanpa
 * MeshPhysicalMaterial/clearcoat/iridescence = hemat shader HP).
 * standard/reflective/glow semua tier; goldfoil/holo high/mid saja (low
 * jatuh ke standard — gating ganda: UI menyembunyikan + renderer fallback).
 */
function resolveMobileInkEffect(
  effect: SpecialInkEffect,
  tier: string
): SpecialInkEffect {
  if ((effect === 'goldfoil' || effect === 'holographic') && tier !== 'high' && tier !== 'mid') {
    return 'standard';
  }
  return effect;
}

function mobileInkMaterialProps(effect: SpecialInkEffect): {
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
} {
  switch (effect) {
    case 'reflective3m':
      return { roughness: 0.15, metalness: 0.85, emissive: '#ffffff', emissiveIntensity: 0.25 };
    case 'glow':
      return { roughness: 0.4, metalness: 0.1, emissive: '#10e870', emissiveIntensity: 1.0 };
    case 'goldfoil':
      return { roughness: 0.22, metalness: 0.95, emissive: '#201503', emissiveIntensity: 0.6 };
    case 'holographic':
      return { roughness: 0.12, metalness: 0.82, emissive: '#16233f', emissiveIntensity: 0.8 };
    case 'standard':
    default:
      return { roughness: 0.4, metalness: 0.1, emissive: '#000000', emissiveIntensity: 0 };
  }
}

/**
 * P6 — props premium cermin web DecalLayerRenderer (singleDecalItem):
 * roughness/metalness/sheen/clearcoat/iridescence/emissive/envMapIntensity
 * per efek tinta. Angka = salinan web (bukan tuning baru) agar rasa
 * reflective3m/glow/goldfoil/holographic mobile = web.
 */
function premiumInkProps(effect: SpecialInkEffect): {
  roughness: number;
  metalness: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: string;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  iridescenceIOR: number;
  emissive: string;
  emissiveIntensity: number;
  envMapIntensity: number;
} {
  switch (effect) {
    case 'reflective3m':
      return { roughness: 0.15, metalness: 0.88, sheen: 1.0, sheenRoughness: 0.1, sheenColor: '#ffffff', clearcoat: 1.0, clearcoatRoughness: 0.1, iridescence: 0.0, iridescenceIOR: 1.0, emissive: '#000000', emissiveIntensity: 0.0, envMapIntensity: 2.5 };
    case 'goldfoil':
      return { roughness: 0.22, metalness: 0.95, sheen: 0.5, sheenRoughness: 0.7, sheenColor: '#ffe099', clearcoat: 0.85, clearcoatRoughness: 0.1, iridescence: 0.0, iridescenceIOR: 1.0, emissive: '#000000', emissiveIntensity: 0.0, envMapIntensity: 2.2 };
    case 'holographic':
      return { roughness: 0.12, metalness: 0.82, sheen: 1.0, sheenRoughness: 0.2, sheenColor: '#93c5fd', clearcoat: 1.0, clearcoatRoughness: 0.1, iridescence: 1.0, iridescenceIOR: 1.35, emissive: '#000000', emissiveIntensity: 0.0, envMapIntensity: 2.8 };
    case 'glow':
      return { roughness: 0.92, metalness: 0.0, sheen: 0.5, sheenRoughness: 0.7, sheenColor: '#ffffff', clearcoat: 0.0, clearcoatRoughness: 0.1, iridescence: 0.0, iridescenceIOR: 1.0, emissive: '#10e870', emissiveIntensity: 1.0, envMapIntensity: 0.3 };
    case 'standard':
    default:
      return { roughness: 0.92, metalness: 0.0, sheen: 0.5, sheenRoughness: 0.7, sheenColor: '#ffffff', clearcoat: 0.0, clearcoatRoughness: 0.1, iridescence: 0.0, iridescenceIOR: 1.0, emissive: '#000000', emissiveIntensity: 0.0, envMapIntensity: 0.3 };
  }
}

function DecalItem({
  decal,
  apparel,
  surfaceZ,
  order,
}: {
  decal: MobileDecalLayer;
  apparel: ApparelType;
  surfaceZ: number;
  order: number;
}) {
  const texture = useTexture(decal.url);
  const gl = useThree((s) => s.gl);
  // Cap tekstur per-tier (useMobileDeviceTier): low 512 / mid 1024 / high 2048
  // → cap anisotropy 2 / 4 / 8 (hemat VRAM & bandwidth HP low-end).
  const { maxTextureSize, tier } = useMobileDeviceTier();

  // P6 — tier-gating material premium (cermin web DecalLayerRenderer):
  // high/mid = MeshPhysicalMaterial + normal + feather; low/no-webgl = tetap
  // meshStandardMaterial murah (satu sampler, tanpa varian shader feather).
  //
  // UJI ALASAN VRAM (angka, bukan rasa):
  // - displayMap preview di-cap sisi-panjang 1024 → RGBA 1024² ≈ 4.0MB +
  //   mipmap ≈ +33% ≈ 5.3MB per decal. Di atas itu (2048² ≈ 16MB + mip ≈
  //   21MB) HP low (RAM 2–3GB, GPU shared, Mali-G52/PowerVR GE83xx) mudah
  //   kena context-loss saat katalog + model + weave hidup bersamaan.
  // - normalMap weave prosedural 256² ≈ 0.25MB + mip ≈ 0.33MB (satu sampler
  //   tambahan). Murah sendiri, TAPI di low ia memaksa varian shader kedua
  //   (physical + normal + onBeforeCompile feather) → kompilasi + register
  //   ALU naik, dan digabung anisotropy 2 + DPR 1 hasilnya nyaris tak beda
  //   dari standard di layar 6 inci. Jadi low SENGAJA tak bayar biaya itu.
  // - high (Adreno 7xx/Apple, DPR ≤2, 6GB+) & mid (4GB, Mali-G68) lolos:
  //   total ±6MB + 2 sampler masih jauh di bawah budget, imbalannya tepi
  //   sablon bebas tangga piksel (feather) + relief serat di grazing angle.
  // UJI MANUAL: HP low (Helio G35/MT6765) — buka studio, tempel logo 1024,
  //   putar miring + cubit zoom; lolos bila tak ada flicker/hang. REVERT:
  //   paksa `premium = false` (standard semua tier) — satu baris di bawah.
  const premium = tier === 'high' || tier === 'mid';

  // PERF 14 Sep 2026 cermin web DecalLayerRenderer: guard set-sekali agar tak
  // re-upload GPU tiap render. JANGAN texture.dispose — cache drei per-URL
  // dipakai bersama; dispose = flicker/use-after-dispose di decal lain.
  useEffect(() => {
    if (!texture) return;
    try {
      const tierCap = maxTextureSize >= 2048 ? 8 : maxTextureSize >= 1024 ? 4 : 2;
      let rendererMax = 8;
      try {
        rendererMax = gl.capabilities.getMaxAnisotropy();
      } catch {}
      const target = Math.min(8, tierCap, rendererMax);
      if ((texture as any).anisotropy !== target) {
        texture.anisotropy = target;
        texture.needsUpdate = true;
      }
      if (
        (texture as any).colorSpace !== undefined &&
        (texture as any).colorSpace !== THREE.SRGBColorSpace
      ) {
        (texture as any).colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
      }
    } catch {}
  }, [texture, maxTextureSize, gl]);

  // PERF 14 Sep 2026 cermin web DecalLayerRenderer.tsx:131-156: downscale
  // artwork >1024 ke sisi-panjang 1024 untuk PREVIEW 3D saja (master cetak
  // tak tersentuh). 2048²→1024² = −75% VRAM; di layar HP 1024 sudah >2×
  // oversample. Kecil (≤1024) = pakai asli (nol copy). Copy hasil di-dispose
  // saat ganti; cache drei tak disentuh.
  const displayMap = useMemo(() => {
    try {
      const img = (texture.image as unknown as { width?: number; height?: number }) || {};
      const w = Number((img as { width?: number }).width) || 0;
      const h = Number((img as { height?: number }).height) || 0;
      if (!w || !h || (w <= 1024 && h <= 1024)) return texture;
      if (typeof document === 'undefined') return texture;
      const s = Math.min(1024 / w, 1024 / h);
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return texture;
      ctx.drawImage(texture.image as unknown as CanvasImageSource, 0, 0, cw, ch);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      try {
        tex.anisotropy = texture.anisotropy;
      } catch {}
      tex.needsUpdate = true;
      return tex;
    } catch {
      return texture;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture]);

  useEffect(() => {
    return () => {
      try {
        if (displayMap !== texture) (displayMap as unknown as { dispose?: () => void }).dispose?.();
      } catch {}
    };
  }, [displayMap, texture]);

  // Aspect ratio preservation (dari displayMap agar ikut ukuran downscale)
  const aspect = useMemo(() => {
    const img = displayMap.image as HTMLImageElement | undefined;
    if (img && img.width > 0 && img.height > 0) {
      return img.width / img.height;
    }
    return 1;
  }, [displayMap]);

  // Clamp skala pada batas cetak AKTUAL per apparel+per sisi (terkalibrasi
  // ukur, cermin web SingleDecalItem). Bawah selaras Zod web
  // DecalLayerSchema.scale min 0.02.
  // F0/F2 Test Lab: deformasi sablon mengikuti regangan kain (cermin web
  // DecalLayerRenderer) + tinta spesial murah.
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const stretchIntensity = useMobileStudioStore((s) => s.stretchIntensity);
  const stretchDirection = useMobileStudioStore((s) => s.stretchDirection);
  const specialInkEffect = useMobileStudioStore((s) => s.specialInkEffect);
  // P1 parity — jepit + fit PER SISI: posisi dijepit batas SSOT sisi, skala
  // dijepit 0.02…maks sisi lalu di-fit proporsional ke box sisi (tampil =
  // produksi, audit web). Opasitas per-decal (kontrak decals[]).
  const clampedXY = clampMobileDecalXY(decal.targetSide, decal.x, decal.y);
  const maxScale = Math.max(MOBILE_MIN_DECAL_SCALE, mobileMaxDecalScaleUnits(apparel, decal.targetSide));
  const baseScale = Math.max(MOBILE_MIN_DECAL_SCALE, Math.min(maxScale, decal.scale));
  const normalizedScale =
    baseScale * mobileFitScaleToSideBox(apparel, decal.targetSide, baseScale, aspect);
  const opacity = Math.max(0, Math.min(1, decal.opacity));
  // Penempatan 3D presisi per sisi (anti-tembus torso, anti-shearing rusuk,
  // kontur lengan) — cermin web getDecal3DPlacement.
  const placement = mobileDecalPlacement(apparel, decal.targetSide, clampedXY.x, clampedXY.y, surfaceZ);
  // Rotasi terpadu: basis orientasi permukaan × rotasi pengguna (cermin web).
  const finalRotation = useMemo(() => {
    const qBase = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(placement.rotation[0], placement.rotation[1], placement.rotation[2], 'XYZ')
    );
    const qUser = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      (-decal.rotation * Math.PI) / 180
    );
    const e = new THREE.Euler().setFromQuaternion(qBase.multiply(qUser), 'XYZ');
    return [e.x, e.y, e.z] as [number, number, number];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement.rotation[0], placement.rotation[1], placement.rotation[2], decal.rotation]);
  let sx = normalizedScale;
  let sy = normalizedScale;
  if (aspect >= 1) {
    // Landscape/square: lebar dasar, tinggi proporsional (cermin web DecalLayerRenderer).
    sy = normalizedScale / aspect;
  } else {
    // Portrait: tinggi dasar, lebar proporsional (cermin web DecalLayerRenderer).
    sx = normalizedScale * aspect;
  }
  if (testLabMode === 'stretch' && stretchIntensity > 0) {
    const factors = getStretchFactors(testLabMode, stretchIntensity, stretchDirection);
    sx *= factors.stretchX;
    sy *= factors.stretchY;
  }
  const finalScale: [number, number, number] = [sx, sy, placement.projectionDepth];
  const resolvedEffect = resolveMobileInkEffect(specialInkEffect, tier);
  const inkProps = mobileInkMaterialProps(resolvedEffect);

  // P6 — material premium high/mid (cermin web SingleDecalItem):
  // MeshPhysicalMaterial + normalMap weave + alpha-feather ±1–2px via
  // onBeforeCompile (smoothstep 0.0→0.08). normalScale 0.15 = salinan web
  // (bukan 0.44 kain — decal hanya butuh relief tipis agar tak emboss).
  // polygonOffsetFactor -4-order: lapis bertumpuk tak z-fight (web -6-order;
  // mobile N decal = tiap lapis offset sendiri).
  const premiumMaterial = useMemo(() => {
    if (!premium) return null;
    if (typeof window === 'undefined') return null;
    try {
      const p = premiumInkProps(resolvedEffect);
      const weave = getProceduralWeaveTexture('tshirt');
      const m = new THREE.MeshPhysicalMaterial({
        map: displayMap,
        transparent: true,
        opacity,
        roughness: p.roughness,
        metalness: p.metalness,
        sheen: p.sheen,
        sheenRoughness: p.sheenRoughness,
        sheenColor: new THREE.Color(p.sheenColor),
        clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        iridescence: p.iridescence,
        iridescenceIOR: p.iridescenceIOR,
        emissive: new THREE.Color(p.emissive),
        emissiveIntensity: p.emissiveIntensity,
        normalMap: weave,
        normalScale: new THREE.Vector2(0.15, 0.15),
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4 - order,
        polygonOffsetUnits: -4,
        alphaTest: 0.01,
      });
      m.envMapIntensity = p.envMapIntensity;
      // Feather tepi cermin web (M2.3): haluskan tangga piksel tepi decal.
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n\tdiffuseColor.a = smoothstep(0.0, 0.08, diffuseColor.a);'
        );
      };
      m.customProgramCacheKey = () => `kk-mobile-decal-premium-${resolvedEffect}`;
      return m;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premium, displayMap, resolvedEffect, opacity, order]);

  // Material premium milik sendiri → dispose saat ganti (displayMap milik
  // cache drei / copy lokal yang di-dispose di atas — material.dispose()
  // tak menyentuh tekstur, aman; weave milik cache bersama, aman).
  useEffect(() => {
    return () => {
      try {
        premiumMaterial?.dispose();
      } catch {}
    };
  }, [premiumMaterial]);

  return (
    <Decal
      position={placement.position}
      rotation={finalRotation}
      scale={finalScale}
    >
      {premium && premiumMaterial ? (
        <primitive object={premiumMaterial} attach="material" />
      ) : (
        <meshStandardMaterial
          map={displayMap}
          transparent
          opacity={opacity}
          polygonOffset
          polygonOffsetFactor={-4 - order}
          roughness={inkProps.roughness}
          metalness={inkProps.metalness}
          emissive={inkProps.emissive}
          emissiveIntensity={inkProps.emissiveIntensity}
          depthTest={true}
          depthWrite={false}
        />
      )}
    </Decal>
  );
}

export function MobileDecalLayerRenderer() {
  const decals = useMobileStudioStore((s) => s.decals);
  const apparel = useMobileStudioStore((s) => s.apparelType);
  const surfaceZ = surfaceZForMobileApparel(apparel);

  if (!decals || decals.length === 0) return null;

  return (
    <>
      {decals.map((decal, i) => (
        <DecalItem key={decal.id} decal={decal} apparel={apparel} surfaceZ={surfaceZ} order={i} />
      ))}
    </>
  );
}
