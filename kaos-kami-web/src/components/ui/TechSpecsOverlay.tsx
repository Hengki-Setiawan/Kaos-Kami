"use client";

import React from "react";
import { TECHNICAL_SPECS } from "@/lib/constants";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

export const TechSpecsOverlay: React.FC = () => {
  const { activePhase, viewMode } = useConfiguratorStore(
    useShallow((s) => ({ activePhase: s.activePhase, viewMode: s.viewMode }))
  );
  const isVisible = activePhase === 2 && viewMode === "story";

  return (
    <section
      className={`min-h-screen w-full flex flex-col justify-center p-6 md:p-12 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12 pointer-events-none"
      }`}
    >
      <div className="max-w-md lg:max-w-lg space-y-5 z-20">
        <div>
          <span className="font-mono text-[11px] sm:text-xs text-brand-accent tracking-widest uppercase font-bold">
            KUALITAS BAHAN & SABLON
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-[34px] lg:text-[40px] font-display font-black uppercase leading-[1.08] tracking-tight text-text-primary mt-2">
            KAOS COMBED ADEM<br />& SABLON DTF AWET
          </h2>
          <p className="text-xs sm:text-sm font-mono text-text-muted mt-2.5 leading-relaxed">
            Karakter katun combed sejuk yang nyaman untuk iklim tropis, dipadukan teknologi sablon digital DTF presisi. Warna cerah, lentur, dan tahan cuci berkali-kali.
          </p>
        </div>

        {/* Technical Specification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {TECHNICAL_SPECS.map((spec) => (
            <div
              key={spec.label}
              className="p-3.5 rounded-xl glass-panel border border-border-subtle hover:border-brand-accent/40 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
                  {spec.label}
                </span>
                <span className="text-xs font-mono font-bold text-brand-accent">
                  {spec.value}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-text-muted leading-relaxed">
                {spec.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
