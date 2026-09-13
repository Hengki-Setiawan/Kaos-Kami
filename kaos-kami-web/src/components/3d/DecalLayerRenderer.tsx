"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Decal, useTexture } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits, fitScaleToSideBox, REAL_WORLD_PRINT_LIMITS, surfaceZForApparel } from "@/lib/scaleCalibration";
import { isSafeImageUrl } from "@/lib/safeUrl";
import { getFabricNormalMapForArchetype } from "@/lib/proceduralTextures";
import type { DecalLayer } from "@/lib/constants";

const SingleDecalItem: React.FC<{
  decal: DecalLayer;
  surfaceZ: number;
  order: number;
}> = ({ decal, surfaceZ, order }) => {
  // URL DB tak tepercaya (audit B7) — tolak scheme aneh sebelum TextureLoader.
  const safeUrl = isSafeImageUrl(decal.url) ? decal.url : "";
  const uploaded = useTexture(safeUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

  // JANGAN dispose: drei useTexture cache per-URL dipakai bersama —
  // dispose di sini = flicker/use-after-dispose di decal lain (audit #5c).
  // Cache drei + unmount GC sudah cukup untuk sesi studio.

  const isBack = decal.targetSide === "back";
  const isLeftSleeve = decal.targetSide === "left_sleeve";
  const isRightSleeve = decal.targetSide === "right_sleeve";
  const isHood = decal.targetSide === "hood";

  // Jangkar lengan per-apparel dari hasil ukur mesh (bukan ±0.27 global)
  const apparel = useConfiguratorStore.getState().activeApparel;
  const spec = APPAREL_PHYSICAL_SPECS[apparel];
  const sleeveX = spec?.sleeveAnchorX ?? 0.27;

  let posX = decal.x;
  let posY = decal.y;
  let posZ = isBack ? -surfaceZ : surfaceZ;
  let rotY = isBack ? Math.PI : 0;
  const rotZ = (decal.rotation * Math.PI) / 180;
  // Epsilon sepanjang normal agar tak z-fight (riset three.js resmi).
  const EPS = 0.004;

  // Lengan: geser melingkar dibatasi ±0.12 (audit #5d — ±0.35 penuh bikin
  // bidang datar melayang dari lengkung lengan) + epsilon keluar permukaan.
  const sleeveSlide = Math.max(-0.12, Math.min(0.12, decal.x));
  if (isLeftSleeve) {
    // Proyeksi ke lengan kiri (X negatif)
    posX = -sleeveX - EPS;
    posZ = sleeveSlide;
    rotY = -Math.PI / 2;
  } else if (isRightSleeve) {
    // Proyeksi ke lengan kanan (X positif)
    posX = sleeveX + EPS;
    posZ = sleeveSlide;
    rotY = Math.PI / 2;
  } else if (isHood) {
    // Tudung belakang (hoodie saja): bidang menghadap -Z di tengah tudung.
    // Geser dibatasi area tudung (x ±0.09 ≈ ±8.5cm, y ±0.06) agar tak lepas
    // dari kain (jangkar terukur Fase 25).
    const hoodY = spec?.hoodAnchorY ?? 0.34;
    const hoodZ = spec?.hoodAnchorZ ?? 0.095;
    posX = Math.max(-0.09, Math.min(0.09, decal.x));
    posY = hoodY + Math.max(-0.06, Math.min(0.06, decal.y));
    posZ = -(hoodZ + EPS);
    rotY = Math.PI;
  } else {
    posZ = (isBack ? -surfaceZ : surfaceZ) + (isBack ? -EPS : EPS);
  }

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

  // M2.3: sablon MENYATU kain — MeshPhysicalMaterial mewarisi karakter kain:
  // roughness matte 0.92 (rentang 0.9–0.95), sheen lembut, weave normal 60%
  // (0.15 vs kain 0.3–0.45 — ikut serat tanpa menenggelamkan artwork),
  // envMapIntensity rendah 0.3 agar sablon tak mengkilap sendiri.
  // useMemo = onBeforeCompile dipasang SEKALI (tanpa ini compile ulang tiap
  // render = stutter, pola yang sama dengan guard anisotropy di atas).
  // PERF #7: weave decal = profil apparel AKTIF (bukan tshirt tetap) agar
  // share SATU slot normal dengan garment (tanpa ini slot tunggal thrash
  // dispose/re-upload tiap frame saat hoodie+decal beda profil).
  const decalMaterial = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: displayMap,
      transparent: true,
      opacity: decal.opacity,
      roughness: 0.92,
      metalness: 0,
      sheen: 0.5,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color("#ffffff"),
      normalMap: typeof window !== "undefined" ? getFabricNormalMapForArchetype(apparel) : null,
      normalScale: new THREE.Vector2(0.15, 0.15),
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      // M2.3: basis -2; minus order agar decal bertumpuk konsisten.
      polygonOffsetFactor: -2 - order,
      polygonOffsetUnits: -2,
      alphaTest: 0.01,
    });
    m.envMapIntensity = 0.3;
    // M2.3: alpha-feather tepi ±1–2px via shader — menghaluskan tangga piksel
    // cutout tanpa menulis ulang master (master tetap murni untuk cetak).
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n\tdiffuseColor.a = smoothstep(0.0, 0.08, diffuseColor.a);"
      );
    };
    m.customProgramCacheKey = () => "kaos-kami-decal-feather";
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMap, order, decal.opacity, apparel]);

  // Material milik sendiri → buang saat ganti (tekstur uploaded + weave milik
  // cache bersama — material.dispose() tak menyentuh tekstur, aman).
  useEffect(() => {
    return () => {
      try {
        decalMaterial.dispose();
      } catch {}
    };
  }, [decalMaterial]);

  return (
    <Decal
      position={[posX, posY, posZ]}
      rotation={[0, rotY, rotZ]}
      scale={[scaleX, scaleY, 0.35]}
    >
      <primitive object={decalMaterial} attach="material" />
    </Decal>
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
          surfaceZ={decal.targetSide === "front" ? zFront : zBack}
        />
      ))}
    </>
  );
};
