"use client";

import React, { useEffect, useState } from "react";
import {
  FlaskConical,
  X,
  Compass,
  RotateCcw,
  ZoomIn,
  Sun,
  Moon,
  Box,
  Layers,
  Sparkles,
  Eye,
  Sliders,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { TestLabControls } from "@/components/ui/TestLabControls";
import { InspectControls } from "@/components/ui/InspectControls";
import { STUDIO_MOODS, APPAREL_CATALOG, type StudioTheme } from "@/lib/constants";

export const ClothLabModal: React.FC = () => {
  const {
    isClothLabOpen,
    setIsClothLabOpen,
    activeApparel,
    activeColorName,
    decals,
    modelRotY,
    setModelRotY,
    isRotating,
    toggleRotating,
    modelScale,
    setModelScale,
    lightingPreset,
    setLightingPreset,
    studioTheme,
    setStudioTheme,
    isWireframe,
    toggleWireframe,
  } = useConfiguratorStore(
    useShallow((s) => ({
      isClothLabOpen: s.isClothLabOpen,
      setIsClothLabOpen: s.setIsClothLabOpen,
      activeApparel: s.activeApparel,
      activeColorName: s.activeColorName,
      decals: s.decals,
      modelRotY: s.modelRotY,
      setModelRotY: s.setModelRotY,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      modelScale: s.modelScale,
      setModelScale: s.setModelScale,
      lightingPreset: s.lightingPreset,
      setLightingPreset: s.setLightingPreset,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isWireframe: s.isWireframe,
      toggleWireframe: s.toggleWireframe,
    }))
  );

  const [activeSection, setActiveSection] = useState<"physics" | "inspect" | "camera" | "lighting">("physics");

  // Escape key listener
  useEffect(() => {
    if (!isClothLabOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsClothLabOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isClothLabOpen, setIsClothLabOpen]);

  if (!isClothLabOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloth-lab-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => setIsClothLabOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-3xl bg-surface/95 border border-border-subtle shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.25)]">
              <FlaskConical size={20} />
            </div>
            <div>
              <h3 id="cloth-lab-title" className="text-sm sm:text-base font-bold text-text-primary font-mono tracking-tight flex items-center gap-2">
                <span>LABORATORIUM KAIN & SIMULASI 3D</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-brand-accent text-canvas">
                  STUDIO LAB
                </span>
              </h3>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                {APPAREL_CATALOG[activeApparel]?.name ?? "Apparel 3D"} · {activeColorName} · {decals.length} Sablon Terpasang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsClothLabOpen(false)}
            className="w-8 h-8 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface/80 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tutup Lab Kain"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border-subtle px-4 py-2 bg-surface/40 gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "physics", label: "FISIKA KAIN", icon: Sparkles },
            { id: "inspect", label: "INSPEKSI 3D", icon: Eye },
            { id: "camera", label: "KAMERA & SUDUT", icon: Compass },
            { id: "lighting", label: "PENCAHAYAAN", icon: Sun },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === id
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/60"
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0 text-text-primary">
          {/* TAB 1: FISIKA KAIN & LINGKUNGAN */}
          {activeSection === "physics" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                <p className="text-xs text-text-muted leading-relaxed">
                  Uji ketahanan kain dan sablon DTF secara interaktif: simulasi hembusan angin (*wind tunnel*), uji elastisitas regangan kain (*tensile stretch*), dan inspeksi pantulan grazing dengan senter 3D.
                </p>
              </div>
              <TestLabControls />
            </div>
          )}

          {/* TAB 2: INSPEKSI DESAIN 3D */}
          {activeSection === "inspect" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                <p className="text-xs text-text-muted leading-relaxed">
                  Periksa presisi cetak DTF melalui layer inspeksi teknis: garis laser simetri dada, visualisasi bleed area, kilau glaze tinta, dan pratinjau manekin 3D.
                </p>
              </div>
              <InspectControls />
            </div>
          )}

          {/* TAB 3: KAMERA & SUDUT PANDANG */}
          {activeSection === "camera" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3.5 shadow-sm">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
                  <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                    <Compass size={14} className="text-brand-accent" />
                    <span>UJI SUDUT PANDANG (360°)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md border border-brand-accent/20">
                      {modelRotY}°
                    </span>
                  </div>
                </div>

                {/* 4 Quick Angle Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "DEPAN", deg: 0 },
                    { label: "SERONG", deg: 45 },
                    { label: "SAMPING", deg: 90 },
                    { label: "BELAKANG", deg: 180 },
                  ].map(({ label, deg }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setModelRotY(deg)}
                      className={`py-2 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all truncate text-center cursor-pointer ${
                        modelRotY === deg
                          ? "bg-brand-accent text-canvas border-brand-accent shadow-sm scale-[1.02]"
                          : "bg-surface/70 border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Continuous Rotation Slider */}
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={modelRotY}
                  onChange={(e) => setModelRotY(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-accent cursor-pointer"
                  aria-label="Rotasi model 3D"
                />

                {/* Skala Zoom Mockup */}
                <div className="pt-2 border-t border-border-subtle/50 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
                    <span className="flex items-center space-x-1">
                      <ZoomIn size={11} /> <span>SKALA ZOOM MOCKUP</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setModelScale(1.0)}
                      title="Klik untuk reset zoom ke 100%"
                      className="font-bold text-text-primary hover:text-brand-accent transition-colors cursor-pointer"
                    >
                      {Math.round(modelScale * 100)}%
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="2.4"
                    step="0.02"
                    value={modelScale}
                    onChange={(e) => setModelScale(parseFloat(e.target.value))}
                    className="w-full accent-brand-accent cursor-pointer"
                    aria-label="Zoom model 3D"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENCAHAYAAN & TEMA STUDIO */}
          {activeSection === "lighting" && (
            <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
                <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                  <Sun size={14} className="text-brand-accent" />
                  <span>SUASANA PENCAHAYAAN STUDIO</span>
                </span>
              </div>

              {/* Pilihan Mood Pencahayaan */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-sans text-text-muted font-bold uppercase">PRESET CAHAYA:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STUDIO_MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLightingPreset(m.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        lightingPreset === m.id
                          ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold shadow-[0_0_10px_rgba(230,81,0,0.3)]"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface/80"
                      }`}
                    >
                      <span className="block text-[11px] font-sans font-bold uppercase truncate">{m.label}</span>
                      <span className="block text-[9px] text-text-muted truncate mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Kerangka (Wireframe) */}
              <div className="pt-3 border-t border-border-subtle/50 flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono text-text-primary font-bold block">MODE KERANGKA (WIREFRAME)</span>
                  <span className="text-[10px] text-text-muted block">Inspeksi topologi mesh 3D</span>
                </div>
                <button
                  type="button"
                  onClick={toggleWireframe}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    isWireframe
                      ? "bg-brand-accent text-canvas shadow-sm"
                      : "bg-surface text-text-muted border border-border-subtle hover:text-text-primary"
                  }`}
                >
                  {isWireframe ? "AKTIF" : "NONAKTIF"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface/80 flex justify-between items-center text-[11px] font-mono text-text-muted">
          <span>Tekan ESC untuk menutup</span>
          <button
            type="button"
            onClick={() => setIsClothLabOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-surface border border-border-subtle hover:bg-surface/80 text-text-primary font-bold cursor-pointer transition-all"
          >
            SELESAI
          </button>
        </div>
      </div>
    </div>
  );
};
