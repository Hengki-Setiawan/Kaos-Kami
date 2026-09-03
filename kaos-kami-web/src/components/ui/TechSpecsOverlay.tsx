"use client";

import React from "react";
import { TECHNICAL_SPECS } from "@/lib/constants";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const TechSpecsOverlay: React.FC = () => {
  const { activePhase, viewMode } = useConfiguratorStore();
  const isVisible = activePhase === 2 && viewMode === "story";

  return (
    <section
      className={`min-h-screen w-full flex flex-col justify-center p-6 md:p-12 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12 pointer-events-none"
      }`}
    >
      <div className="max-w-xl space-y-6">
        <div>
          <span className="font-mono text-xs text-brand-accent tracking-widest uppercase">
            FAKTOR KUALITAS & MATERIAL
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black uppercase tracking-tight text-text-primary mt-2">
            KATUN COMBED<br />HEAVYWEIGHT 16S
          </h2>
          <p className="text-sm font-mono text-text-muted mt-3 leading-relaxed">
            Serat benang katun combed pilihan dengan gramasi tebal 240 & 280 GSM. Siluet jatuh tegap, jahitan ganda rapi, dan tahan cuci tanpa melar.
          </p>
        </div>

        {/* Technical Specification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {TECHNICAL_SPECS.map((spec) => (
            <div
              key={spec.label}
              className="p-4 rounded-xl glass-panel border border-border-subtle hover:border-brand-accent/40 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
                  {spec.label}
                </span>
                <span className="text-xs font-mono font-bold text-brand-accent">
                  {spec.value}
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted leading-relaxed">
                {spec.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
