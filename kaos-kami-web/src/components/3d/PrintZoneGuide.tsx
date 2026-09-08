"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
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

  // Ukuran Fisik Maksimal Meja Cetak DTF — hook di atas semua early-return.
  const mult = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
  const boxWidthUnits = 30.0 / mult;
  const boxHeightUnits = 42.0 / mult;
  const edgeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.PlaneGeometry(boxWidthUnits, boxHeightUnits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxWidthUnits, boxHeightUnits]);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

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

  // Cek apakah sablon aktif melampaui batas cetak
  const maxScale = maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");
  const isOutOfSafeZone = activeDecal && (activeDecal.scale > maxScale + 1e-6 || Math.abs(activeDecal.x) > 0.08);
  const lineColor = isOutOfSafeZone ? "#f43f5e" : "#10b981";

  return (
    <group position={[0, 0.02, zPos]} rotation={[0, rotY, 0]}>
      {/* Bingkai batas 3D — ukuran dunia nyata, ikut zoom dengan benar */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <lineSegments geometry={edgeGeometry}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <lineBasicMaterial color={lineColor} transparent opacity={0.85} />
      </lineSegments>
      {/* Label + peringatan (HTML kecil, tak mengklaim skala) */}
      <Html center position={[0, -boxHeightUnits / 2 - 0.02, 0]} zIndexRange={[50, 0]} pointerEvents="none">
        <div className="flex flex-col items-center gap-1 pointer-events-none">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-emerald-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-mono tracking-wider font-semibold text-emerald-400 uppercase">
              Batas Cetak DTF 30×42cm
            </span>
          </div>
          {/* Peringatan jika melebihi batas */}
          {isOutOfSafeZone && (
            <div className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
              ⚠️ Sablon Melebihi Batas Meja Cetak 30cm!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
