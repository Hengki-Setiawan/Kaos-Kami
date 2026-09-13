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
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.28, 0]} receiveShadow>
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
  const { studioTheme, lightingPreset, selectedColor } = useConfiguratorStore(
    useShallow((s) => ({
      studioTheme: s.studioTheme,
      lightingPreset: s.lightingPreset,
      selectedColor: s.selectedColor,
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

  // M2.4: rasio key:fill:rim ≈ 2.2 : 0.6 : 0.8 (rim = rear 0.8).
  // M2.1: ambient lama 1.05 → hemisphere 0.35–0.5; rear lama 1.3 → 0.8.
  // PERF: pasangan rim bahu 0.4+0.4 & point bawah DIHAPUS di semua tier
  // (2 draw-light + 1 point-light = −3 evaluasi cahaya per fragmen; siluet
  // dipegang rear 0.8 + spot kerah). Shadow-map DIKUNCI 1024 semua tier
  // (2048→1024 = −75% memori depth: 16MB→4MB).
  const hemiSky = lightingPreset === "cyber" ? "#1e293b" : isLightMode ? "#ffffff" : "#f1f3f9";
  const hemiGround = isLightMode ? "#d8d5cf" : "#2a2b30";
  const hemiIntensity = isLightMode ? 0.5 : 0.4;

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

      {/* 2. Key depan-kanan — inti rasio (2.2). Shadow 1024 semua tier. */}
      <directionalLight
        position={[3.5, 6, 4.5]}
        intensity={lightingPreset === "cyber" ? k(2.2) : isLightMode ? 2.2 : k(2.2)}
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

      {/* 3. Fill depan-kiri (0.6). */}
      <directionalLight
        position={[-3.5, 3, 3]}
        intensity={k(0.6)}
        color={lightingPreset === "cyber" ? "#38bdf8" : "#e2e8f0"}
      />

      {/* 4. Rim belakang (0.8) — punggung tetap terbaca tanpa mencuci hitam. */}
      <directionalLight
        position={[0, 4, -5]}
        intensity={k(0.8)}
        color={lightingPreset === "cyber" ? "#ff6a00" : "#f8fafc"}
      />

      {/* 6. Cahaya pemahat kerah/lipatan dari atas (dirampingkan 1.25→0.6). */}

      {/* PERF #5: pasangan rim bahu (dulu 0.4+0.4) SUDAH tak ada di pohon
          semua tier; spot kerah 0.6 DIPERTAHANKAN (pemahat lipatan). Blok
          lantai di bawah TAK tersentuh (kunci owner). */}
      {!isLow && (
        <spotLight position={[0, 6, 1]} intensity={k(0.6)} angle={0.6} penumbra={0.8} color="#ffffff" />
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
    </>
  );
};
