"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits, surfaceZForApparel, computePhysicalPrintDimensions } from "@/lib/scaleCalibration";

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
  return null;
};
const _UnusedPrintZoneGuide: React.FC<PrintZoneGuideProps> = ({ surfaceZ }) => {
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

  // B-07 — COACH JACKET (shirt) + RESLETING TENGAH. KEPUTUSAN DESAIN
  // (baca sebelum ubah):
  // - Fisik: resleting depan membelah dada jadi DUA panel sablon 14×26cm
  //   (spek maxFrontWidthCm=14). Box TUNGGAL terpusat 14cm = hijau palsu:
  //   user menaruh desain di tengah → produksi menabrak hardware.
  // - Keputusan: panduan = DUA box panel (kiri+kanan, offset dari SSOT di
  //   bawah) + strip resleting di tengah + label jujur. Alternatif yang
  //   DITOLAK: (a) box terpusat — menutupi resleting; (b) single-box geser ke
  //   satu panel — menyiratkan panel lain tak bisa disablon, padahal keduanya
  //   14×26. Rumus cm tak diubah; hanya geometri panduan.
  // - Offset panel HANYA dari angka SSOT: tengah panel = setengah lebar box +
  //   setengah lebar hardware (±2cm asumsi resleting standar; ukur ulang bila
  //   spec hardware berubah). Renderer masih menaruh decal di decal.x — user
  //   WAJIB geser ke panel; peringatan resleting menyala bila artwork
  //   menyentuh strip tengah.
  const isShirtFront = activeApparel === "shirt" && targetSide === "front";
  const ZIPPER_HALF_CM = 1.0; // setengah lebar hardware resleting (asumsi ±2cm)
  const zipperHalfUnits = ZIPPER_HALF_CM / mult;
  const panelCenterX = boxWidthUnits / 2 + zipperHalfUnits;
  let zipperOverlap = false;
  if (isShirtFront && activeDecal) {
    // Aspek riil SSOT (SAMA dengan badge DecalGizmo B-05 + pricing) agar
    // setengah-lebar artwork = render = cetak.
    const apw = Number((activeDecal as any)?.printPx?.w);
    const aph = Number((activeDecal as any)?.printPx?.h);
    const aasp = apw > 0 && aph > 0 ? apw / aph : 1.0;
    const dims = computePhysicalPrintDimensions(activeApparel, activeDecal.scale, activeDecal.y, aasp, "front");
    const halfW = dims.widthCm / mult / 2;
    zipperOverlap = Math.abs(activeDecal.x) < zipperHalfUnits + halfW;
    // Aman = muat di SALAH SATU panel (bukan |x| < setengah box terpusat —
    // decal tepat di tengah panel (±0.115) justru > maxHalfX dan akan
    // ditandai salah oleh cek generik di atas).
    const distFromPanel = Math.abs(Math.abs(activeDecal.x) - panelCenterX);
    isOutOfSafeZone = activeDecal.scale > maxScale + 1e-6 || zipperOverlap || distFromPanel + halfW > maxHalfX + 1e-6;
  }

  if (isShirtFront) {
    const shirtLineColor = isOutOfSafeZone || zipperOverlap ? "#f43f5e" : "#10b981";
    return (
      <group position={[0, groupY, zPos]} rotation={[0, rotY, 0]}>
        {/* Dua panel dada kiri+kanan — ukuran dunia nyata, ikut zoom */}
        <group position={[-panelCenterX, 0, 0]}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <lineSegments geometry={edgeGeometry}>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <lineBasicMaterial color={shirtLineColor} transparent opacity={0.85} />
          </lineSegments>
        </group>
        <group position={[panelCenterX, 0, 0]}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <lineSegments geometry={edgeGeometry}>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <lineBasicMaterial color={shirtLineColor} transparent opacity={0.85} />
          </lineSegments>
        </group>
        {/* Strip resleting tengah (tak bisa disablon) */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <mesh position={[0, 0, 0.001]}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <planeGeometry args={[zipperHalfUnits * 2, boxHeightUnits]} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <meshBasicMaterial color="#71717a" transparent opacity={0.85} />
        </mesh>
        <Html center position={[0, -boxHeightUnits / 2 - 0.02, 0]} zIndexRange={[50, 0]} pointerEvents="none">
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-sm border border-emerald-500/30 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] font-mono tracking-wider font-semibold text-emerald-400 uppercase">
                2× Panel {boxCm.w}×{boxCm.h}cm — resleting tengah
              </span>
            </div>
            {zipperOverlap && (
              <div className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
                ⚠️ Sablon menyentuh resleting — geser ke panel kiri/kanan!
              </div>
            )}
            {!zipperOverlap && isOutOfSafeZone && (
              <div className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 text-[8px] font-bold tracking-wide whitespace-nowrap shadow-lg">
                ⚠️ Sablon Melebihi Panel {boxCm.w}cm!
              </div>
            )}
          </div>
        </Html>
      </group>
    );
  }

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
