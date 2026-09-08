"use client";

import React, { useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits } from "@/lib/scaleCalibration";

interface PrintZoneGuideProps {
  surfaceZ?: number;
}

/**
 * PrintZoneGuide — Garis Panduan Meja Cetak DTF Fisik (Max 30cm x 42cm)
 * Menampilkan batas fisik area cetak nyata di dada dan punggung baju 3D.
 * Memberi kepastian 100% kepada pengguna dan UMKM bahwa sablon tidak akan meluber.
 */
export const PrintZoneGuide: React.FC<PrintZoneGuideProps> = ({ surfaceZ = 0.155 }) => {
  const { viewMode, isHideWebsiteUI, isGizmoVisible, decals, selectedDecalId, activeApparel } = useConfiguratorStore();

  // Hooks WAJIB di atas semua early-return (aturan React).
  const camera = useThree((s) => s.camera);
  const [zoomComp, setZoomComp] = useState(1);
  useFrame(() => {
    const targetObj = (camera as any).target;
    const d =
      targetObj && isFinite(targetObj.x)
        ? camera.position.distanceTo(targetObj)
        : camera.position.length();
    const target = (isFinite(d) && d > 0 ? d : 2.2) / 2.2;
    setZoomComp((prev) => (Math.abs(target - prev) > 0.01 ? target : prev));
  });

  if (viewMode !== "studio" || isHideWebsiteUI || !isGizmoVisible) {
    return null;
  }

  const activeDecal = decals.find((d) => d.id === selectedDecalId) || decals[0];
  const targetSide = activeDecal?.targetSide || "front";
  const isBack = targetSide === "back";

  // Hanya tampilkan di dada atau punggung (karena lengan memiliki batas silindris sendiri)
  if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    return null;
  }

  const zPos = isBack ? -(surfaceZ + 0.002) : surfaceZ + 0.002;
  const rotY = isBack ? Math.PI : 0;

  // Ukuran Fisik Maksimal Meja Cetak DTF — dikonversi via multiplier TERUKUR
  // per apparel (30cm ÷ unitsToCm), bukan 0.162 global. Tinggi 42cm serupa.
  const mult = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
  const boxWidthUnits = 30.0 / mult;
  const boxHeightUnits = 42.0 / mult;

  // A2 (Fase 19): kotak HTML memakai distanceFactor tetap (2.2) sehingga ukuran
  // px-nya konstan di layar — padahal baju MEMBESAR saat zoom. Kompensasi
  // zoomComp (dihitung di atas tiap frame): skala px dengan
  // (jarakKameraAktual / 2.2) agar kotak SELALU mewakili 30×42cm fisik.
  const boxWidthPx = boxWidthUnits * 600 * zoomComp;
  const boxHeightPx = boxHeightUnits * 600 * zoomComp;

  // Cek apakah sablon aktif melampaui batas cetak
  const maxScale = maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");
  const isOutOfSafeZone = activeDecal && (activeDecal.scale > maxScale + 1e-6 || Math.abs(activeDecal.x) > 0.08);

  return (
    <group position={[0, 0.02, zPos]} rotation={[0, rotY, 0]}>
      <Html center transform distanceFactor={2.2} zIndexRange={[50, 0]} pointerEvents="none">
        <div
          className={`relative border border-dashed rounded-sm transition-colors duration-200 pointer-events-none ${
            isOutOfSafeZone
              ? "border-rose-500/80 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              : "border-emerald-500/40 bg-emerald-500/[0.02]"
          }`}
          style={{
            width: `${boxWidthPx}px`,
            height: `${boxHeightPx}px`,
          }}
        >
          {/* Pojok Penanda Arsitektur (Corner Viewfinders) */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />

          {/* Label Batas Maksimal Fisik DTF */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-emerald-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-mono tracking-wider font-semibold text-emerald-400 uppercase">
              Batas Cetak DTF 30×42cm
            </span>
          </div>

          {/* Peringatan jika melebihi batas */}
          {isOutOfSafeZone && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
              ⚠️ Sablon Melebihi Batas Meja Cetak 30cm!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
