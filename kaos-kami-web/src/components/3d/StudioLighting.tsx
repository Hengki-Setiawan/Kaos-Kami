"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import { Color } from "three";
import { ContactShadows, MeshReflectorMaterial } from "@react-three/drei";
import { StudioEnvironment } from "./StudioEnvironment";
import { useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useDeviceTier } from "@/hooks/useDeviceTier";

// B2: exposure reaktif terhadap store. Sejak M2.9 exposure DIKUNCI 1.0 semua
// tema (akurat cetak) — komponen ini mempertahankannya bila ada kode lain
// yang mengubah exposure di tengah jalan.
const ReactiveExposure: React.FC<{ value: number }> = ({ value }) => {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    try {
      gl.toneMappingExposure = value;
      invalidate();
    } catch {}
  }, [gl, value, invalidate]);
  return null;
};

// M2.6: lantai studio — lingkaran matte receiveShadow + refleksi TIPIS khusus
// high-tier (mixStrength 0.08 dalam rentang 0.05–0.12). Tier mid/low = matte
// polos (nol biaya shader reflektor di HP).
const StudioFloor: React.FC<{ color: string; reflective: boolean }> = ({ color, reflective }) => {
  const reflectorArgs = useMemo(
    () => ({
      blur: [280, 60] as [number, number],
      resolution: 1024,
      mixBlur: 1,
      mixStrength: 0.08, // M2.6: refleksi tipis high-tier saja
      roughness: 0.9,
      depthScale: 1,
      minDepthThreshold: 0.4,
      maxDepthThreshold: 1.4,
      color,
      metalness: 0,
      mirror: 0.5,
    }),
    [color]
  );
  return (
    <mesh name="studio-floor" rotation-x={-Math.PI / 2} position={[0, -1.28, 0]} receiveShadow>
      <circleGeometry args={[2.4, 64]} />
      {reflective ? (
        <MeshReflectorMaterial {...reflectorArgs} />
      ) : (
        // Matte polos tier-low/mid: 1 draw call, tanpa render-target ekstra.
        <meshStandardMaterial color={color} roughness={0.96} metalness={0} />
      )}
    </mesh>
  );
};

export const StudioLighting: React.FC = () => {
  const { studioTheme, lightingPreset, selectedColor, testLabMode } = useConfiguratorStore(
    useShallow((s) => ({
      studioTheme: s.studioTheme,
      lightingPreset: s.lightingPreset,
      selectedColor: s.selectedColor,
      testLabMode: s.testLabMode,
    }))
  );
  // Tiering HP: tier-low = rig ramping (hemi+key+fill+rear), TANPA spot /
  // IBL / reflektor / shadow-map agar HP kentang tetap ringan.
  const { tier } = useDeviceTier();
  const isLow = tier === "low" || tier === "no-webgl";
  const isHigh = tier === "high";

  const isLightMode = studioTheme === "gallery";
  const shadowColor = isLightMode ? "#707080" : "#050508";
  const floorColor =
    studioTheme === "gallery" ? "#E9E7E1" : studioTheme === "concrete" ? "#1B1C1E" : "#101012";

  // A1: lampu ADAPTIF warna kain — kain gelap "terbakar" jadi abu belang oleh
  // key+rim bila intensitas penuh. darkFactor 0.55 (hitam) → 1.0 (putih).
  const lum = (() => {
    try {
      const c = new Color(selectedColor as any);
      return c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    } catch {
      return 0.5;
    }
  })();
  const darkFactor = Math.min(1, Math.max(0.55, 0.55 + lum * 1.6));
  const k = (v: number) => v * (isLightMode ? 1 : darkFactor);

  // Redupkan pencahayaan ruangan saat mode Senter 3D aktif agar sorotan senter & pantulan 3M dramatis
  const isFlashlight = testLabMode === "flashlight";
  const testLabDim = isFlashlight ? 0.05 : 1.0;

  // Kalibrasi suhu warna lampu berdasarkan SUASANA CAHAYA (Golden, Sunset, Galeri)
  const isGolden = lightingPreset === "golden";
  const isSunset = lightingPreset === "sunset";

  const keyColor = isGolden ? "#fff4e5" : isSunset ? "#ffab7c" : "#ffffff";
  const fillColor = isGolden ? "#ffe8cc" : isSunset ? "#ffccbc" : lightingPreset === "cyber" ? "#38bdf8" : "#e2e8f0";
  const rimColor = isGolden ? "#ffd54f" : isSunset ? "#ff7043" : lightingPreset === "cyber" ? "#ff6a00" : "#f8fafc";

  const hemiSky = isGolden
    ? "#fff8f0"
    : isSunset
    ? "#ffedd5"
    : lightingPreset === "cyber"
    ? "#1e293b"
    : isLightMode
    ? "#eae7e1"
    : "#f1f3f9";

  const hemiGround = isGolden
    ? "#3a2b1c"
    : isSunset
    ? "#3a1d12"
    : isLightMode
    ? "#d4d0c7"
    : "#2a2b30";

  const hemiIntensity = (isLightMode ? 0.32 : 0.4) * testLabDim;

  const keyIntensity = (lightingPreset === "cyber" ? k(2.2) : isLightMode ? (lum > 0.6 ? 1.25 : 1.55) : k(2.2)) * testLabDim;
  const fillIntensity = (isLightMode ? (lum > 0.6 ? 0.35 : 0.45) : k(0.6)) * testLabDim;
  const spotIntensity = (isLightMode ? (lum > 0.6 ? 0.32 : 0.45) : k(0.6)) * testLabDim;
  const rimIntensity = (lightingPreset === "cyber" ? k(0.8) : isLightMode ? (lum > 0.6 ? 0.35 : 0.55) : k(0.8)) * testLabDim;

  return (
    <>
      {/* M2.9: exposure KUNCI 1.0 semua tema (gallery/obsidian/concrete). */}
      <ReactiveExposure value={1.0} />

      {/* M2.1 IBL prosedural TANPA unduhan (ganti preset CDN "city" yang
          gagal ERR_CONNECTION_RESET di jaringan terbatas — bukti QA headless).
          Nol byte, jalan offline, semua tier (PMREM sekali jalan, murah).
          background=false = hanya pantulan, backdrop studio tak berubah. */}
      <StudioEnvironment />

      {/* M2.4: ambient → hemisphere (langit vs tanah dibedakan agar lipatan
          terbaca, bukan flat seperti ambientLight tunggal). */}
      <hemisphereLight args={[hemiSky, hemiGround, hemiIntensity]} />

      {/* 2. Key depan-kanan — terkalibrasi agar kain putih tidak terbakar di mode terang */}
      <directionalLight
        position={[3.5, 6, 4.5]}
        intensity={keyIntensity}
        color={keyColor}
        castShadow={!isLow}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        shadow-radius={5}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
      />

      {/* 3. Fill depan-kiri */}
      <directionalLight
        position={[-3.5, 3, 3]}
        intensity={fillIntensity}
        color={fillColor}
      />

      {/* 4. Rim belakang (lembut di mode terang agar kain putih tidak berhalo) */}
      <directionalLight
        position={[0, 4, -5]}
        intensity={rimIntensity}
        color={rimColor}
      />

      {/* 6. Cahaya pemahat kerah/lipatan dari atas */}
      {!isLow && (
        <spotLight position={[0, 6, 1]} intensity={spotIntensity} angle={0.6} penumbra={0.8} color="#ffffff" />
      )}

      {/* 7. PERF #5: point bawah 0.25 HANYA mid — high DIHAPUS (−1 evaluasi
          cahaya per fragmen; siluet high dipegang rear 0.8 + spot kerah,
          beda visual ≈nol di mockup). */}
      {!isLow && !isHigh && (
        <pointLight
          position={[0, -2.5, 1.5]}
          intensity={0.25}
          color={lightingPreset === "cyber" ? "#ff4500" : isLightMode ? "#ffffff" : "#ffe8d6"}
        />
      )}

      {/* M2.6: lantai matte + ContactShadows lembut (blur 3.2, opacity 0.35,
          scale dirampingkan 6.5→4.5 agar kaki tak mengambang). frames={1} =
          dipanggang sekali (bukan tiap frame). */}
      <StudioFloor color={floorColor} reflective={isHigh} />
      <group name="studio-floor">
        <ContactShadows
          position={[0, -1.25, 0]}
          opacity={0.35}
          scale={4.5}
          blur={3.2}
          far={3.5}
          frames={1}
          resolution={isLow ? 256 : 512}
          color={shadowColor}
        />
      </group>
    </>
  );
};
