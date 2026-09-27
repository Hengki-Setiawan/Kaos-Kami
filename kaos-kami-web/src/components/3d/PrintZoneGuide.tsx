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
 * PrintZoneGuide — Garis Panduan Meja Cetak DTF & Grid Simetri Centerline:
 * - Mode 'bounds': Bingkai batas cetak fisik DTF per sisi+apparel.
 * - Mode 'grid': Garis laser centerline tengah pakaian & crosshair alignment.
 */
export const PrintZoneGuide: React.FC<PrintZoneGuideProps> = (props) => {
  const inspectMode = useConfiguratorStore((s) => s.inspectMode);
  if (inspectMode !== "bounds" && inspectMode !== "grid") return null;
  return <PrintZoneGuideInner {...props} isGridMode={inspectMode === "grid"} />;
};

interface PrintZoneGuideInnerProps extends PrintZoneGuideProps {
  isGridMode?: boolean;
}

const PrintZoneGuideInner: React.FC<PrintZoneGuideInnerProps> = ({ surfaceZ, isGridMode = false }) => {
  const { viewMode, isHideWebsiteUI, decals, selectedDecalId, activeApparel } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      isHideWebsiteUI: s.isHideWebsiteUI,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      activeApparel: s.activeApparel,
    }))
  );

  // Ukuran box per sisi dari spek SSOT
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

  const zBase = surfaceZ ?? surfaceZForApparel(activeApparel);
  const boxWidthUnits = boxCm.w / mult;
  const boxHeightUnits = boxCm.h / mult;

  // Bingkai batas luar
  const edgeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.PlaneGeometry(boxWidthUnits, boxHeightUnits));
  }, [boxWidthUnits, boxHeightUnits]);

  // Garis laser crosshair (Centerline vertikal & garis dada horizontal)
  const crosshairGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    // Garis vertikal sumbu tengah pakaian (X = 0)
    points.push(new THREE.Vector3(0, -boxHeightUnits * 0.58, 0.001));
    points.push(new THREE.Vector3(0, boxHeightUnits * 0.58, 0.001));
    // Garis horizontal simetri dada (Y = 0)
    points.push(new THREE.Vector3(-boxWidthUnits * 0.55, 0, 0.001));
    points.push(new THREE.Vector3(boxWidthUnits * 0.55, 0, 0.001));
    // Garis horizontal dada atas / level saku (Y = +0.18 height)
    points.push(new THREE.Vector3(-boxWidthUnits * 0.35, boxHeightUnits * 0.22, 0.001));
    points.push(new THREE.Vector3(boxWidthUnits * 0.35, boxHeightUnits * 0.22, 0.001));
    // Garis horizontal dada bawah (Y = -0.18 height)
    points.push(new THREE.Vector3(-boxWidthUnits * 0.35, -boxHeightUnits * 0.22, 0.001));
    points.push(new THREE.Vector3(boxWidthUnits * 0.35, -boxHeightUnits * 0.22, 0.001));

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [boxWidthUnits, boxHeightUnits]);

  useEffect(() => () => {
    edgeGeometry.dispose();
    crosshairGeometry.dispose();
  }, [edgeGeometry, crosshairGeometry]);

  if (viewMode !== "studio" || isHideWebsiteUI) {
    return null;
  }

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

  const maxScale = maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");
  const maxHalfX = boxWidthUnits / 2;
  const isOutOfSafeZone = activeDecal && (activeDecal.scale > maxScale + 1e-6 || Math.abs(activeDecal.x) > maxHalfX);
  const boundaryColor = isOutOfSafeZone ? "#f43f5e" : isGridMode ? "#06b6d4" : "#10b981";

  return (
    <group position={[0, groupY, zPos]} rotation={[0, rotY, 0]}>
      {/* Bingkai batas 3D */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <lineSegments geometry={edgeGeometry}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <lineBasicMaterial
          color={boundaryColor}
          transparent
          opacity={isGridMode ? 0.45 : 0.85}
        />
      </lineSegments>

      {/* Grid crosshair laser saat mode grid simetri aktif */}
      {isGridMode && (
        // eslint-disable-next-line react/no-unknown-property
        <lineSegments geometry={crosshairGeometry}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <lineBasicMaterial color="#06b6d4" transparent opacity={0.9} linewidth={1.5} />
        </lineSegments>
      )}

      {/* Label simetri / batas cetak */}
      <Html center position={[0, -boxHeightUnits / 2 - 0.02, 0]} zIndexRange={[50, 0]} pointerEvents="none">
        <div className="flex flex-col items-center gap-1 pointer-events-none">
          {isGridMode ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface/90 backdrop-blur-sm border border-cyan-500/40 whitespace-nowrap shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[8px] font-mono tracking-wider font-semibold text-cyan-300 uppercase">
                Laser Simetri &amp; Garis Tengah
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-sm border border-emerald-500/30 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] font-mono tracking-wider font-semibold text-emerald-400 uppercase">
                Batas Cetak {boxCm.w}×{boxCm.h}cm
              </span>
            </div>
          )}

          {isOutOfSafeZone && (
            <div className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
              Sablon Melebihi Batas {boxCm.w}cm!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
