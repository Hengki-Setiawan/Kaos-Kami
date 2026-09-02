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
            AREA CETAK SABLON PUNGGUNG
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black uppercase tracking-tight text-text-primary mt-2">
            AREA SABLON<br />BESAR HINGGA A3+
          </h2>
          <p className="text-sm font-mono text-text-muted mt-3 leading-relaxed">
            Bidang punggung luas terkalibrasi khusus untuk cetak sablon DTF resolusi tinggi 300 DPI. Tinta merekat lentur dan anti-retak saat ditarik.
          </p>
        </div>

        {/* Back Print Specs Box */}
        <div className="p-5 rounded-2xl glass-panel border border-border-subtle space-y-4 inline-block text-left w-full">
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">AREA CETAK MAKSIMAL:</span>
            <span className="text-xs font-mono font-bold text-text-primary">30 cm × 42 cm (A3+)</span>
          </div>
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">TEKNIK PRODUKSI:</span>
            <span className="text-xs font-mono font-bold text-brand-accent">SABLON DIGITAL DTF PREMIUM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-muted">JAHITAN PUNDAK & LEHER:</span>
            <span className="text-xs font-mono font-bold text-text-primary">JAHIT RANTAI STANDAR DISTRO</span>
          </div>
        </div>
      </div>
    </section>
  );
};
