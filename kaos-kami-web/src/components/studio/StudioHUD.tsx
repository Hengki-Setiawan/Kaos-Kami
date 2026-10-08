"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Maximize2,
  Scan,
  ArrowRightLeft,
  ChevronDown,
  Compass,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import type { DecalTargetSide } from "@/lib/constants";
import {
  maxDecalScaleUnits,
  fitScaleToSideBox,
  getDecalAspect,
} from "@/lib/scaleCalibration";

/**
 * Studio HUD (Quick Switcher Dock & Viewport Controls):
 * - Panel Alih Sisi 1-Klik Ringkas: Depan · Punggung · Lengan Kiri · Lengan Kanan (Bebas Emoticon)
 * - Tombol Cepat: "Pindahkan Desain ke Sisi Ini"
 * - Kontrol Kamera: Auto 360°, Reset, Saklar Kotak Sablon
 * - Tombol Perkecil (Minimize) Dock untuk tampilan kanvas 3D leluasa
 */
export function StudioHUD() {
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    activeApparel,
    cameraPreset,
    setCameraPreset,
    activeViewSide,
    setActiveViewSide,
    isRotating,
    toggleRotating,
    isGizmoVisible,
    toggleGizmoVisible,
    decals,
    selectedDecalId,
    updateDecal,
    drawerPosition,
    isDrawerCollapsed,
    isHideWebsiteUI,
    setModelRotY,
    setModelScale,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      activeViewSide: s.activeViewSide,
      setActiveViewSide: s.setActiveViewSide,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      updateDecal: s.updateDecal,
      drawerPosition: s.drawerPosition,
      isDrawerCollapsed: s.isDrawerCollapsed,
      isHideWebsiteUI: s.isHideWebsiteUI,
      setModelRotY: s.setModelRotY,
      setModelScale: s.setModelScale,
    }))
  );

  const currentViewSide: DecalTargetSide =
    cameraPreset === "left"
      ? "left_sleeve"
      : cameraPreset === "right"
      ? "right_sleeve"
      : cameraPreset === "back"
      ? "back"
      : cameraPreset === "front"
      ? "front"
      : activeViewSide;

  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];
  const canMoveDecalToCurrentSide =
    Boolean(activeDecal) &&
    activeDecal?.targetSide !== currentViewSide &&
    (currentViewSide === "front" ||
      currentViewSide === "back" ||
      currentViewSide === "left_sleeve" ||
      currentViewSide === "right_sleeve");

  const handleMoveDecalToCurrentSide = () => {
    if (!activeDecal) return;
    const targetSide = currentViewSide;
    const maxScale = maxDecalScaleUnits(activeApparel, targetSide);
    const realAspect = getDecalAspect(activeDecal);
    let nextScale = Math.min(activeDecal.scale, maxScale);
    const fitFactor = fitScaleToSideBox(activeApparel, targetSide, nextScale, realAspect);
    nextScale = nextScale * fitFactor;

    updateDecal(activeDecal.id, {
      targetSide,
      x: 0,
      y: targetSide.includes("sleeve") ? 0.02 : -0.05,
      scale: Number(nextScale.toFixed(4)),
    });
  };

  const handleResetPosition = () => {
    setCameraPreset("front");
    setActiveViewSide("front");
    setModelRotY(0);
    setModelScale(1.0);
  };

  const getSideLabel = (side: DecalTargetSide) => {
    switch (side) {
      case "front":
        return "Dada Depan";
      case "back":
        return "Punggung";
      case "left_sleeve":
        return "Lengan Kiri";
      case "right_sleeve":
        return "Lengan Kanan";
      default:
        return "Depan";
    }
  };

  return (
    <aside
      aria-label="Kontrol 3D Viewport"
      className={`fixed z-30 pointer-events-auto transition-all duration-300 ${
        isHideWebsiteUI ? "opacity-20 hover:opacity-100" : "opacity-100"
      } ${
        drawerPosition === "right" || isDrawerCollapsed
          ? "md:left-6 md:right-auto md:max-w-[calc(100vw-420px)]"
          : "md:right-6 md:left-auto md:max-w-[calc(100vw-420px)]"
      } md:bottom-6 md:top-auto top-[76px] right-2 left-auto translate-x-0 md:translate-x-0`}
    >
      {isMinimized ? (
        /* Minimized Dock Button */
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-panel-elevated shadow-xl border border-white/20 dark:border-white/10 backdrop-blur-2xl bg-surface/90 text-text-primary hover:bg-surface active:scale-95 transition-all cursor-pointer font-sans text-xs font-semibold"
          title="Buka panel kontrol sudut & kamera 3D"
        >
          <Compass size={14} className="text-brand-accent animate-pulse" />
          <span>Sisi: {getSideLabel(currentViewSide)}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
        </button>
      ) : (
        /* Full Expanded Dock Bar */
        <div className="flex flex-col md:flex-row md:items-center items-stretch gap-1 sm:gap-1.5 p-1 rounded-2xl glass-panel-elevated shadow-2xl border border-white/15 dark:border-white/10 backdrop-blur-2xl bg-surface/90 overflow-y-auto md:overflow-x-auto no-scrollbar max-md:max-h-[60vh]">
          {/* GRUP 1: Panel Alih Sisi 1-Klik Ringkas (Segmented Controls) */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-surface-elevated/40 p-0.5 rounded-xl border border-border-subtle/40" role="group" aria-label="Alih Sisi Pakaian">
            {[
              { id: "front", label: "Dada", fullLabel: "Dada Depan", preset: "front", side: "front" },
              { id: "back", label: "Punggung", fullLabel: "Punggung", preset: "back", side: "back" },
              { id: "left_sleeve", label: "Lengan Kiri", fullLabel: "Lengan Kiri", preset: "left", side: "left_sleeve" },
              { id: "right_sleeve", label: "Lengan Kanan", fullLabel: "Lengan Kanan", preset: "right", side: "right_sleeve" },
            ].map((item) => {
              const isActive = currentViewSide === item.side;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCameraPreset(item.preset as any);
                    setActiveViewSide(item.side as any);
                  }}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-brand-accent text-canvas shadow-[0_0_12px_rgba(230,81,0,0.45)]"
                      : "text-text-muted hover:text-text-primary hover:bg-surface/70"
                  }`}
                  title={`Lihat tampak ${item.fullLabel} tegak lurus`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-text-muted/40"}`} />
                  <span className="hidden sm:inline">{item.fullLabel}</span>
                  <span className="sm:hidden">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tombol Cepat: Pindahkan Desain ke Sisi Ini */}
          {canMoveDecalToCurrentSide && (
            <>
              <div className="h-px w-full md:h-5 md:w-px bg-border-subtle mx-0.5 sm:mx-1 my-0.5 md:my-0 shrink-0" />
              <button
                type="button"
                onClick={handleMoveDecalToCurrentSide}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-sans text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-[0_0_14px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer animate-pulse whitespace-nowrap"
                title="Pindahkan posisi sablon aktif langsung ke sisi yang sedang dilihat ini"
              >
                <ArrowRightLeft size={13} className="stroke-[2.5]" />
                <span>Pindahkan ke Sisi Ini</span>
              </button>
            </>
          )}

          {/* Divider Elegan */}
          <div className="h-px w-full md:h-5 md:w-px bg-border-subtle mx-0.5 sm:mx-1 my-0.5 md:my-0 shrink-0" />

          {/* GRUP 2: Rotasi Otomatis & Reset Posisi */}
          <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Alat Kamera">
            <button
              type="button"
              onClick={toggleRotating}
              aria-pressed={isRotating}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                isRotating
                  ? "bg-brand-accent text-canvas shadow-[0_0_12px_rgba(230,81,0,0.45)]"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/70"
              }`}
              title={isRotating ? "Hentikan putaran otomatis" : "Mulai putaran otomatis 360°"}
            >
              <RotateCcw size={13} className={isRotating ? "animate-spin" : ""} />
              <span className="hidden md:inline">{isRotating ? "Berputar" : "Auto 360°"}</span>
            </button>

            <button
              type="button"
              onClick={handleResetPosition}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all active:scale-95 cursor-pointer text-text-muted hover:text-text-primary hover:bg-surface/70"
              title="Kembalikan posisi & sudut pakaian ke depan (Reset)"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* GRUP 3: Saklar Kotak Gizmo (jika ada sablon aktif) */}
          {decals.length > 0 && (
            <>
              <div className="h-px w-full md:h-5 md:w-px bg-border-subtle mx-0.5 sm:mx-1 my-0.5 md:my-0 shrink-0" />
              <button
                type="button"
                onClick={toggleGizmoVisible}
                aria-pressed={isGizmoVisible}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  isGizmoVisible
                    ? "bg-brand-accent/20 border border-brand-accent text-brand-accent shadow-[0_0_10px_rgba(230,81,0,0.3)]"
                    : "text-text-muted hover:text-text-primary hover:bg-surface/70"
                }`}
                title={isGizmoVisible ? "Sembunyikan kotak kontrol sablon" : "Tampilkan kotak kontrol sablon"}
              >
                <Scan size={13} />
                <span className="hidden sm:inline">{isGizmoVisible ? "Kotak Aktif" : "Kotak Sablon"}</span>
              </button>
            </>
          )}

          {/* GRUP 4: Tombol Minimize Dock */}
          <div className="h-px w-full md:h-5 md:w-px bg-border-subtle mx-0.5 sm:mx-1 my-0.5 md:my-0 shrink-0" />
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface/70 transition-all cursor-pointer flex items-center justify-center"
            title="Perkecil panel kontrol bawah"
            aria-label="Perkecil panel kontrol"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
