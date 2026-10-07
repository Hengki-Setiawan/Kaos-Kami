"use client";

import React from "react";
import {
  ScanEye,
  Crosshair,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

/**
 * INSPEKSI DESAIN 3D — 3 Mode Pengetesan Presisi untuk Produksi DTF:
 * 1. TURNTABLE: Putar 360 derajat kontinu untuk inspeksi menyeluruh.
 * 2. CEK TEMBUS: X-ray kain transparan untuk cek tembus & presisi posisi.
 * 3. GRID SIMETRI: Garis laser centerline & crosshair simetri dada.
 */
export const InspectControls: React.FC = () => {
  const {
    inspectMode,
    setInspectMode,
    isRotating,
    setIsRotating,
  } = useConfiguratorStore(
    useShallow((s) => ({
      inspectMode: s.inspectMode,
      setInspectMode: s.setInspectMode,
      isRotating: s.isRotating,
      setIsRotating: s.setIsRotating,
    }))
  );

  const pick = (mode: typeof inspectMode) => {
    if (mode !== "turntable" && isRotating) setIsRotating(false);
    const nextMode = inspectMode === mode ? "none" : mode;
    setInspectMode(nextMode);
    if (mode === "turntable" && nextMode === "turntable" && !isRotating) {
      setIsRotating(true);
    }
  };

  const btn = (active: boolean) =>
    `py-2.5 px-2 rounded-xl font-mono text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 text-center min-h-[58px] ${
      active
        ? "bg-brand-accent text-canvas border-brand-accent shadow-md scale-[1.02]"
        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-border"
    }`;

  const getModeLabel = () => {
    switch (inspectMode) {
      case "turntable":
        return "TURNTABLE";
      case "bleed":
        return "CEK TEMBUS";
      case "grid":
        return "GRID SIMETRI";
      case "none":
      default:
        return "MATI";
    }
  };

  return (
    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
        <span className="text-xs font-mono font-bold tracking-wider text-text-primary flex items-center gap-1.5">
          <ScanEye size={15} className="text-brand-accent" />
          <span>INSPEKSI DESAIN 3D</span>
        </span>
        <span className="text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-full border border-border-subtle text-text-muted">
          {getModeLabel()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => pick("bleed")}
          aria-pressed={inspectMode === "bleed"}
          className={btn(inspectMode === "bleed")}
        >
          <ScanEye size={15} />
          <span>CEK TEMBUS</span>
        </button>

        <button
          type="button"
          onClick={() => pick("grid")}
          aria-pressed={inspectMode === "grid"}
          className={btn(inspectMode === "grid")}
        >
          <Crosshair size={15} />
          <span>GRID SIMETRI</span>
        </button>
      </div>
    </div>
  );
};
