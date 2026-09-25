"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits, surfaceZForApparel } from "@/lib/scaleCalibration";

interface PrintZoneGuideProps {
  surfaceZ?: number;
}

/**
 * PrintZoneGuide — Garis Panduan Meja Cetak DTF Fisik per sisi+apparel.
 * Box dari spek SSOT per sisi (audit #11 — box 30×42 global = hijau palsu:
 * hoodie-front 28×26, shirt-front 14×26, lengan 8.5×12, tudung 18×14).
 * Label tampilkan angka sisi aktual. surfaceZ dari SSOT (audit #6).
 */
export const PrintZoneGuide: React.FC<PrintZoneGuideProps> = () => {
  // Mode inspeksi "bounds": panduan batas cetak MUNCUL hanya saat mode tes aktif
  // (pengganti garis hijau permanen yg dimatikan 15 Sep 2026 — tampil on-demand).
  const inspectMode = useConfiguratorStore((s) => s.inspectMode);
  if (inspectMode !== "bounds") return null;
  return <PrintZoneGuideInner />;
};
const PrintZoneGuideInner: React.FC<PrintZoneGuideProps> = ({ surfaceZ }) => {
  const { viewMode, isHideWebsiteUI, isGizmoVisible, decals, selectedDecalId, activeApparel } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      isHideWebsiteUI: s.isHideWebsiteUI,
      isGizmoVisible: s.isGizmoVisible,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      activeApparel: s.activeApparel,
    }))
  );

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
        : targetSide === "side_left" || targetSide === "side_right"
          ? { w: spec?.maxSideWidthCm ?? 14.0, h: spec?.maxSideHeightCm ?? 32.0 }
          : targetSide === "left_sleeve" || targetSide === "right_sleeve"
            ? { w: spec?.maxSleeveWidthCm ?? 8.5, h: spec?.maxSleeveHeightCm ?? 12.0 }
            : { w: spec?.maxFrontWidthCm ?? 30.0, h: spec?.maxFrontHeightCm ?? 42.0 };
  // surfaceZ SSOT per apparel (audit #6 — default lama 0.155 beda dari gizmo
  // 0.18 & renderer shirt 0.24). Prop parent menang bila ada.
  const zBase = surfaceZ ?? surfaceZForApparel(activeApparel);
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

  // Lengan & samping: bidang melengkung silindris, batas dijaga clampDecalXY SSOT
  // dan DecalGizmo 3D surface-bound (panduan kotak datar diabaikan agar tak melayang).
  const isHood = targetSide === "hood";
  if (
    targetSide === "left_sleeve" ||
    targetSide === "right_sleeve" ||
    targetSide === "side_left" ||
    targetSide === "side_right"
  ) {
    return null;
  }

  const hoodY = spec?.hoodAnchorY ?? 0.34;
  const hoodZ = spec?.hoodAnchorZ ?? 0.095;
  const zPos = isHood ? -(hoodZ + 0.002) : isBack ? -(zBase + 0.002) : zBase + 0.002;
  const rotY = isBack || isHood ? Math.PI : 0;
  const groupY = isHood ? hoodY + 0.02 : 0.02;

  // Cek apakah sablon aktif melampaui batas cetak SISI INI (bukan global).
  // Batas X = setengah lebar box sisi ini (konsisten-sendiri, bukan 0.08/0.35).
  const maxScale = maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");
  const maxHalfX = boxWidthUnits / 2;
  let isOutOfSafeZone = activeDecal && (activeDecal.scale > maxScale + 1e-6 || Math.abs(activeDecal.x) > maxHalfX);
  const lineColor = isOutOfSafeZone ? "#f43f5e" : "#10b981";

  // SWAP 20 Sep 2026: mesh shirt = hoodie pullover TANPA resleting (Pieter
  // Ferreira) — panduan panel-ganda + strip resleting B-07 DIHAPUS. Box tunggal
  // 28×26cm dari SSOT maxFrontWidthCm (pullover full, cermin hoodie).
  // Arsip keputusan lama: git log PrintZoneGuide.tsx (B-07).
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
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-sm border border-emerald-500/30 whitespace-nowrap">
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
