"use client";

import React, { useState } from "react";
import {
  Shirt,
  RotateCw,
  ZoomIn,
  Layers,
  Compass,
  Hand,
  RotateCcw,
  Move,
  Ruler,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

export function StudioHUD() {
  const {
    cameraPreset,
    setCameraPreset,
    interactionTool,
    setInteractionTool,
    isRotating,
    toggleRotating,
    isGizmoVisible,
    toggleGizmoVisible,
    isSizeGuideOpen,
    toggleSizeGuide,
    selectedSize,
    decals,
    drawerPosition,
    isDrawerCollapsed,
    isHideWebsiteUI,
  } = useConfiguratorStore(
    useShallow((s) => ({
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      interactionTool: s.interactionTool,
      setInteractionTool: s.setInteractionTool,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
      isSizeGuideOpen: s.isSizeGuideOpen,
      toggleSizeGuide: s.toggleSizeGuide,
      selectedSize: s.selectedSize,
      decals: s.decals,
      drawerPosition: s.drawerPosition,
      isDrawerCollapsed: s.isDrawerCollapsed,
      isHideWebsiteUI: s.isHideWebsiteUI,
    }))
  );

  const [sisiLengan, setSisiLengan] = useState<"left" | "right">("left");

  return (
    <aside
      aria-label="Kontrol 3D Viewport"
      className={`fixed z-30 pointer-events-auto transition-all duration-300 ${
        isHideWebsiteUI ? "opacity-20 hover:opacity-100" : "opacity-100"
      } ${
        // Desktop positioning: berlawanan arah dengan Drawer agar panggung 3D lapang dan tidak menutupi drawer
        drawerPosition === "right" || isDrawerCollapsed
          ? "md:left-6 md:right-auto md:max-w-[calc(100vw-420px)]"
          : "md:right-6 md:left-auto md:max-w-[calc(100vw-420px)]"
      } md:bottom-6 bottom-[84px] left-1/2 -translate-x-1/2 md:translate-x-0`}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-full sm:rounded-2xl glass-panel-elevated shadow-2xl border border-white/15 dark:border-white/10 backdrop-blur-2xl bg-surface/85 overflow-x-auto no-scrollbar">
        {/* GRUP 1: Sudut Pandang Kamera Presets */}
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Preset Kamera">
          <button
            type="button"
            onClick={() => setCameraPreset("front")}
            aria-pressed={cameraPreset === "front"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              cameraPreset === "front"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title="Lihat tampak depan"
          >
            <Shirt size={13} />
            <span className="hidden sm:inline">DEPAN</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraPreset("back")}
            aria-pressed={cameraPreset === "back"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              cameraPreset === "back"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title="Lihat tampak belakang"
          >
            <RotateCw size={13} />
            <span className="hidden sm:inline">BLKNG</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraPreset("collar")}
            aria-pressed={cameraPreset === "collar"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              cameraPreset === "collar"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title="Detail makro kerah (cek tekstur rib)"
          >
            <ZoomIn size={13} />
            <span className="hidden sm:inline">KERAH</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCameraPreset(sisiLengan);
              setSisiLengan((s) => (s === "left" ? "right" : "left"));
            }}
            aria-pressed={cameraPreset === "left" || cameraPreset === "right"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              cameraPreset === "left" || cameraPreset === "right"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title={`Lihat lengan (${sisiLengan === "left" ? "kiri" : "kanan"})`}
          >
            <Layers size={13} />
            <span className="hidden sm:inline">LNGN</span>
          </button>
        </div>

        {/* Divider Elegan */}
        <div className="w-px h-5 bg-border-subtle mx-0.5 sm:mx-1 shrink-0" />

        {/* GRUP 2: Mode Interaksi 3D & Putar 360 */}
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Alat Interaksi 3D">
          <button
            type="button"
            onClick={() => setInteractionTool("rotate")}
            aria-pressed={interactionTool === "rotate"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              interactionTool === "rotate"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title="Mode Putar (Drag mouse untuk memutar 360°)"
          >
            <Compass size={13} />
            <span className="hidden sm:inline">PUTAR</span>
          </button>

          <button
            type="button"
            onClick={() => setInteractionTool("pan")}
            aria-pressed={interactionTool === "pan"}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              interactionTool === "pan"
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title="Mode Geser (Drag mouse untuk memindahkan posisi pakaian)"
          >
            <Hand size={13} />
            <span className="hidden sm:inline">GESER</span>
          </button>

          <button
            type="button"
            onClick={toggleRotating}
            aria-pressed={isRotating}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
              isRotating
                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                : "text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
            title={isRotating ? "Hentikan putaran otomatis" : "Mulai putaran otomatis 360°"}
          >
            <RotateCcw size={13} className={isRotating ? "animate-spin" : ""} />
            <span className="hidden md:inline">{isRotating ? "BERPUTAR" : "AUTO"}</span>
          </button>
        </div>

        {/* GRUP 3: Gizmo Decal (jika ada sablon aktif) */}
        {decals.length > 0 && (
          <>
            <div className="w-px h-5 bg-border-subtle mx-0.5 sm:mx-1 shrink-0" />
            <button
              type="button"
              onClick={toggleGizmoVisible}
              aria-pressed={isGizmoVisible}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
                isGizmoVisible
                  ? "bg-brand-accent/20 border border-brand-accent text-brand-accent shadow-[0_0_8px_rgba(230,81,0,0.3)]"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/60"
              }`}
              title={isGizmoVisible ? "Sembunyikan panah alat bantu 3D" : "Tampilkan panah alat bantu 3D"}
            >
              <Move size={12} />
              <span className="hidden lg:inline">{isGizmoVisible ? "GIZMO ON" : "GIZMO"}</span>
            </button>
          </>
        )}

        {/* GRUP 4: Panduan Ukuran Nyata (Size Guide) */}
        <div className="w-px h-5 bg-border-subtle mx-0.5 sm:mx-1 shrink-0" />
        <button
          type="button"
          onClick={toggleSizeGuide}
          aria-pressed={isSizeGuideOpen}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase font-bold transition-all active:scale-95 cursor-pointer ${
            isSizeGuideOpen
              ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
              : "text-text-muted hover:text-text-primary hover:bg-surface/60"
          }`}
          title="Buka panduan ukuran fisik apparel & sablon"
        >
          <Ruler size={13} />
          <span className="hidden sm:inline">SIZE: {selectedSize || "L"}</span>
          <span className="sm:hidden">{selectedSize || "L"}</span>
        </button>
      </div>
    </aside>
  );
}
