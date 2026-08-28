"use client";

import React from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const BackGraphicOverlay: React.FC = () => {
  const { activePhase, viewMode } = useConfiguratorStore();
  const isVisible = activePhase === 3 && viewMode === "story";

  return (
    <section
      className={`min-h-screen w-full flex flex-col justify-center items-start md:items-end p-6 md:p-12 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12 pointer-events-none"
      }`}
    >
      <div className="max-w-lg space-y-6 text-left md:text-right">
        <div>
          <span className="font-mono text-xs text-brand-accent tracking-widest uppercase">
            {"// PHASE 03 — REAR ARCHITECTURE"}
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black uppercase tracking-tight text-text-primary mt-2">
            180° REAR<br />SABLON CANVAS
          </h2>
          <p className="text-sm font-mono text-text-muted mt-3 leading-relaxed">
            Expansive back real-estate calibrated for high-density discharge and high-mesh screen prints with zero cracking under tension.
          </p>
        </div>

        {/* Back Print Specs Box */}
        <div className="p-5 rounded-2xl glass-panel border border-border-subtle space-y-4 inline-block text-left w-full">
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">PRINT REAL-ESTATE:</span>
            <span className="text-xs font-mono font-bold text-text-primary">38cm × 48cm MAX</span>
          </div>
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">CURING TECHNIQUE:</span>
            <span className="text-xs font-mono font-bold text-brand-accent">HYBRID PLASTISOL / DISCHARGE</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-muted">SEAM STRENGTH:</span>
            <span className="text-xs font-mono font-bold text-text-primary">FOUR-THREAD OVERLOCK</span>
          </div>
        </div>
      </div>
    </section>
  );
};
