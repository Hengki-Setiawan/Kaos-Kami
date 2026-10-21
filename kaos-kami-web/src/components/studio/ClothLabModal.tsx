"use client";

import React, { useEffect, useState } from "react";
import {
  FlaskConical,
  X,
  Sun,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { TestLabControls } from "@/components/ui/TestLabControls";
import { STUDIO_MOODS, APPAREL_CATALOG } from "@/lib/constants";

export const ClothLabModal: React.FC = () => {
  const {
    isClothLabOpen,
    setIsClothLabOpen,
    activeApparel,
    activeColorName,
    lightingPreset,
    setLightingPreset,
    isWireframe,
    toggleWireframe,
    drawerPosition,
  } = useConfiguratorStore(
    useShallow((s) => ({
      isClothLabOpen: s.isClothLabOpen,
      setIsClothLabOpen: s.setIsClothLabOpen,
      activeApparel: s.activeApparel,
      activeColorName: s.activeColorName,
      lightingPreset: s.lightingPreset,
      setLightingPreset: s.setLightingPreset,
      isWireframe: s.isWireframe,
      toggleWireframe: s.toggleWireframe,
      drawerPosition: s.drawerPosition,
    }))
  );

  const [activeSection, setActiveSection] = useState<"physics" | "lighting">("physics");

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
    <aside
      aria-label="Panel Uji Fisika Kain"
      className={`fixed top-[68px] bottom-4 ${
        drawerPosition === "left" ? "left-4 sm:left-5 right-auto" : "right-4 sm:right-5 left-auto"
      } z-[55] max-w-[385px] w-[calc(100%-2rem)] sm:w-[385px] flex flex-col rounded-3xl bg-surface/95 border border-border-subtle shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto`}
    >
      {/* Back to Main Customizer Navigation Bar */}
      <div className="px-4 py-2.5 bg-canvas/80 border-b border-border-subtle flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => setIsClothLabOpen(false)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-brand-accent hover:text-white border border-border-subtle text-text-primary text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 text-brand-accent group-hover:text-white" />
          <span>Kembali ke Menu Utama</span>
        </button>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
          Mode Lab
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface/80 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
            <FlaskConical size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-text-primary font-sans truncate">
              Laboratorium Fisika Kain
            </h3>
            <p className="text-[10px] text-text-muted font-sans truncate">
              {APPAREL_CATALOG[activeApparel]?.name ?? "Pakaian 3D"} · {activeColorName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsClothLabOpen(false)}
          className="w-7 h-7 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface/80 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          aria-label="Tutup Panel Lab Kain"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2 Primary Tabs */}
      <div className="flex border-b border-border-subtle px-3 py-1.5 bg-surface/40 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSection("physics")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl font-sans text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "physics"
              ? "bg-brand-accent text-canvas shadow-sm font-bold"
              : "text-text-muted hover:text-text-primary hover:bg-surface/60"
          }`}
        >
          <Sparkles size={12} />
          <span>Simulasi Fisika</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("lighting")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl font-sans text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "lighting"
              ? "bg-brand-accent text-canvas shadow-sm font-bold"
              : "text-text-muted hover:text-text-primary hover:bg-surface/60"
          }`}
        >
          <Sun size={12} />
          <span>Pencahayaan</span>
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-text-primary">
        {/* TAB 1: FISIKA KAIN */}
        {activeSection === "physics" && (
          <div className="space-y-3">
            <TestLabControls />
          </div>
        )}

        {/* TAB 2: PENCAHAYAAN STUDIO */}
        {activeSection === "lighting" && (
          <div className="p-3.5 rounded-2xl bg-surface/80 border border-border-subtle space-y-3 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
              <span className="text-xs font-sans font-bold text-text-primary flex items-center space-x-1.5">
                <Sun size={13} className="text-brand-accent" />
                <span>Preset Pencahayaan Studio</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {STUDIO_MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLightingPreset(m.id)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    lightingPreset === m.id
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="block text-xs font-sans font-bold truncate">{m.label}</span>
                  <span className="block text-[9px] text-text-muted truncate mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Mode Kerangka (Wireframe) */}
            <div className="pt-2.5 border-t border-border-subtle/50 flex justify-between items-center">
              <div>
                <span className="text-xs font-sans text-text-primary font-bold block">Mode Kerangka</span>
                <span className="text-[10px] font-sans text-text-muted block">Inspeksi wireframe mesh</span>
              </div>
              <button
                type="button"
                onClick={toggleWireframe}
                className={`px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
                  isWireframe
                    ? "bg-brand-accent text-canvas shadow-sm"
                    : "bg-surface text-text-muted border border-border-subtle hover:text-text-primary"
                }`}
              >
                {isWireframe ? "Aktif" : "Nonaktif"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border-subtle bg-surface/80 flex justify-between items-center text-xs font-sans text-text-muted shrink-0">
        <span className="text-[10px]">ESC untuk menutup</span>
        <button
          type="button"
          onClick={() => setIsClothLabOpen(false)}
          className="px-3 py-1 rounded-xl bg-surface border border-border-subtle hover:bg-surface/80 text-text-primary font-sans text-xs font-semibold cursor-pointer transition-all shadow-sm"
        >
          Tutup Panel
        </button>
      </div>
    </aside>
  );
};
