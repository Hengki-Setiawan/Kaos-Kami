"use client";

import React, { useEffect, useRef } from "react";
import {
  RotateCw,
  ScanEye,
  ZoomIn,
  SunMedium,
  Ruler,
  Square,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import type { LightingPreset } from "@/lib/constants";

const MOOD_ORDER: LightingPreset[] = ["editorial", "golden", "sunset", "gallery"];

/**
 * INSPEKSI DESAIN — toggle murni pengetesan visual (turntable, X-ray bleed,
 * macro, lintas-cahaya, batas cetak). TIDAK mengubah data desain/cm/produksi:
 * setiap mode mengembalikan state semula saat dimatikan.
 */
export const InspectControls: React.FC = () => {
  const {
    inspectMode,
    setInspectMode,
    isRotating,
    setIsRotating,
    modelScale,
    setModelScale,
    cameraPreset,
    setCameraPreset,
    lightingPreset,
    setLightingPreset,
    studioTheme,
    setStudioTheme,
  } = useConfiguratorStore(
    useShallow((s) => ({
      inspectMode: s.inspectMode,
      setInspectMode: s.setInspectMode,
      isRotating: s.isRotating,
      setIsRotating: s.setIsRotating,
      modelScale: s.modelScale,
      setModelScale: s.setModelScale,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      lightingPreset: s.lightingPreset,
      setLightingPreset: s.setLightingPreset,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
    }))
  );

  // Simpan state semula untuk macro (scale + kamera) agar kembali 1:1.
  const savedMacro = useRef<{ scale: number; cam: typeof cameraPreset } | null>(null);

  const pick = (mode: typeof inspectMode) => {
    if (mode !== "turntable" && isRotating) setIsRotating(false);
    if (mode !== "macro" && savedMacro.current) {
      setModelScale(savedMacro.current.scale);
      setCameraPreset(savedMacro.current.cam);
      savedMacro.current = null;
    }
    setInspectMode(inspectMode === mode ? "none" : mode);
    if (mode === "turntable" && inspectMode !== "turntable" && !isRotating) {
      setIsRotating(true);
    }
  };

  // Keluar mode makro = kembalikan zoom & kamera semula (efek di atas juga
  // menangani saat pindah mode; ini pengaman unmount).
  useEffect(() => {
    return () => {
      if (savedMacro.current) {
        try {
          useConfiguratorStore.getState().setModelScale(savedMacro.current.scale);
          useConfiguratorStore.getState().setCameraPreset(savedMacro.current.cam);
        } catch {
          // Abaikan — studio sedang unmount.
        }
      }
    };
  }, []);

  const enterMacro = () => {
    if (inspectMode === "macro") {
      pick("macro");
      return;
    }
    if (isRotating) setIsRotating(false);
    savedMacro.current = { scale: modelScale, cam: cameraPreset };
    setModelScale(1.8);
    setCameraPreset("front");
    setInspectMode("macro");
  };

  const cycleMood = () => {
    if (isRotating) setIsRotating(false);
    const idx = MOOD_ORDER.indexOf(lightingPreset as LightingPreset);
    const next = MOOD_ORDER[(idx + 1) % MOOD_ORDER.length] ?? "editorial";
    setLightingPreset(next);
    setInspectMode("mood");
  };

  const toggleTheme = () => {
    setStudioTheme(studioTheme === "gallery" ? "obsidian" : "gallery");
    setInspectMode("mood");
  };

  const btn = (active: boolean) =>
    `py-2 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all flex flex-col items-center gap-1 text-center ${
      active
        ? "bg-brand-accent text-canvas border-brand-accent shadow-md scale-[1.02]"
        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-border"
    }`;

  return (
    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
        <span className="text-xs font-mono font-bold tracking-wider text-text-primary flex items-center gap-1.5">
          <ScanEye size={15} className="text-brand-accent" />
          <span>INSPEKSI DESAIN 3D</span>
        </span>
        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-border-subtle text-text-muted">
          {inspectMode === "none" ? "MATI" : inspectMode.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => pick("turntable")} aria-pressed={inspectMode === "turntable"} className={btn(inspectMode === "turntable")}>
          <RotateCw size={14} />
          <span>TURNTABLE</span>
        </button>
        <button type="button" onClick={() => pick("bleed")} aria-pressed={inspectMode === "bleed"} className={btn(inspectMode === "bleed")}>
          <ScanEye size={14} />
          <span>CEK TEMBUS</span>
        </button>
        <button type="button" onClick={enterMacro} aria-pressed={inspectMode === "macro"} className={btn(inspectMode === "macro")}>
          <ZoomIn size={14} />
          <span>MACRO</span>
        </button>
        <button type="button" onClick={cycleMood} aria-pressed={inspectMode === "mood"} className={btn(inspectMode === "mood")}>
          <SunMedium size={14} />
          <span>GANTI CAHAYA</span>
        </button>
        <button type="button" onClick={toggleTheme} aria-pressed={studioTheme === "obsidian"} className={btn(studioTheme === "obsidian")}>
          <Square size={14} />
          <span>{studioTheme === "gallery" ? "MODE GELAP" : "MODE TERANG"}</span>
        </button>
        <button type="button" onClick={() => pick("bounds")} aria-pressed={inspectMode === "bounds"} className={btn(inspectMode === "bounds")}>
          <Ruler size={14} />
          <span>BATAS 30CM</span>
        </button>
      </div>

      <p className="text-[9.5px] text-text-muted/80 leading-relaxed italic">
        Mode tes murni: turntable memutar 360°, cek tembus membuat kain transparan (sablon tetap),
        macro mendekatkan kamera, ganti cahaya memutar mood lampu, batas 30cm menampilkan kotak cetak + peringatan merah bila sablon keluar.
      </p>
    </div>
  );
};
