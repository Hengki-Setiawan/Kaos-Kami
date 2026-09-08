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
 * PrintZoneGuide — Garis Panduan Meja Cetak DTF Fisik per sisi+apparel.
 * Box dari spek SSOT (audit #11 — box 30×42 global = hijau palsu untuk
 * hoodie 28×26 / lengan). Label tampilkan angka sisi aktual.
 */
export const PrintZoneGuide: React.FC<PrintZoneGuideProps> = ({ surfaceZ = 0.155 }) => {
  const { viewMode, isHideWebsiteUI, isGizmoVisible, decals, selectedDecalId, activeApparel } = useConfiguratorStore();

  // Ukuran box per sisi dari spek — hook di atas semua early-return.
  const spec = APPAREL_PHYSICAL_SPECS[activeApparel];
  const mult = spec?.meshMultiplier ?? 101.8;
  const activeDecal = decals.find((d) => d.id === selectedDecalId) || decals[0];
  const targetSide = activeDecal?.targetSide || "front";
  const isBack = targetSide === "back";
  const boxCm =
    targetSide === "back"
      ? { w: spec?.maxBackWidthCm ?? 30.0, h: spec?.maxBackHeightCm ?? 42.0 }
      : targetSide === "hood"
        ? { w: spec?.maxHoodWidthCm ?? 18.0, h: spec?.maxHoodHeightCm ?? 14.0 }
        : { w: spec?.maxFrontWidthCm ?? 30.0, h: spec?.maxFrontHeightCm ?? 42.0 };
  const boxWidthUnits = boxCm.w / mult;
  const boxHeightUnits = boxCm.h / mult;
  const edgeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.PlaneGeometry(boxWidthUnits, boxHeightUnits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxWidthUnits, boxHeightUnits]);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  if (viewMode !== "studio" || isHideWebsiteUI || !isGizmoVisible) {
    return null;
  }

  // activeDecal/targetSide/isBack sudah dihitung di atas (sebelum hooks).
  // Hanya tampilkan di dada/punggung/tudung (lengan punya batas silindris sendiri).
  // Box tudung diposisikan di jangkar hood (belakang atas), bukan dada.
  const isHood = targetSide === "hood";
  if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    return null;
  }

  const hoodY = spec?.hoodAnchorY ?? 0.34;
  const hoodZ = spec?.hoodAnchorZ ?? 0.095;
  const zPos = isHood ? -(hoodZ + 0.002) : isBack ? -(surfaceZ + 0.002) : surfaceZ + 0.002;
  const rotY = isBack || isHood ? Math.PI : 0;
  const groupY = isHood ? hoodY + 0.02 : 0.02;

  // Cek apakah sablon aktif melampaui batas cetak SISI INI (bukan global).
  // Batas X = setengah lebar box sisi ini (konsisten-sendiri, bukan 0.08/0.35).
  const maxScale = maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");
  const maxHalfX = boxWidthUnits / 2;
  const isOutOfSafeZone = activeDecal && (activeDecal.scale > maxScale + 1e-6 || Math.abs(activeDecal.x) > maxHalfX);
  const lineColor = isOutOfSafeZone ? "#f43f5e" : "#10b981";

  return (
    <group position={[0, groupY, zPos]} rotation={[0, rotY, 0]}>
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
              Batas Cetak {boxCm.w}×{boxCm.h}cm
            </span>
          </div>
          {/* Peringatan jika melebihi batas */}
          {isOutOfSafeZone && (
            <div className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
              ⚠️ Sablon Melebihi Batas {boxCm.w}cm!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
