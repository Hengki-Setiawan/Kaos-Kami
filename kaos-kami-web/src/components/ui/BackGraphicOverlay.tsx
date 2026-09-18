"use client";

import React from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_PHYSICAL_SPECS } from "@/lib/scaleCalibration";

export const BackGraphicOverlay: React.FC = () => {
  const { activePhase, viewMode, activeApparel } = useConfiguratorStore(
    useShallow((s) => ({
      activePhase: s.activePhase,
      viewMode: s.viewMode,
      activeApparel: s.activeApparel,
    }))
  );
  const isVisible = (activePhase === 3 || activePhase === 4) && viewMode === "story";
  const spec = APPAREL_PHYSICAL_SPECS[activeApparel];
  const maxW = spec?.maxBackWidthCm ?? 30;
  const maxH = spec?.maxBackHeightCm ?? 42;

  return (
    <section
      aria-hidden={!isVisible}
      className={`min-h-screen w-full flex flex-col justify-center items-start md:items-end p-6 md:p-10 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12 pointer-events-none"
      }`}
    >
      <div className="max-w-md lg:max-w-lg space-y-4 text-left md:text-right z-20">
        <div>
          <span className="font-mono text-[11px] sm:text-xs text-brand-accent tracking-widest uppercase font-bold">
            AREA CETAK FLEKSIBEL
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-[34px] lg:text-[40px] font-display font-black uppercase leading-[1.08] tracking-tight text-text-primary mt-2">
            SABLON BESAR<br />HINGGA UKURAN A3+
          </h2>
          <p className="text-xs sm:text-sm font-mono text-text-muted mt-2.5 leading-relaxed">
            Bebas posisikan desain di dada depan, punggung, maupun lengan lewat mockup 3D 360°. Ukuran cetak presisi hingga A3+ dengan tinta DTF lentur yang tahan lama.
          </p>
        </div>

        {/* Back Print Specs Box */}
        <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3 inline-block text-left w-full">
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">AREA CETAK MAKSIMAL:</span>
            <span className="text-xs font-mono font-bold text-text-primary">{maxW} cm × {maxH} cm (A3+)</span>
          </div>
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="text-xs font-mono text-text-muted">TEKNOLOGI CETAK:</span>
            <span className="text-xs font-mono font-bold text-brand-accent">SABLON DIGITAL DTF PREMIUM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-muted">SIMULASI DESAIN:</span>
            <span className="text-xs font-mono font-bold text-text-primary">MOCKUP 3D REAL-TIME 360°</span>
          </div>
        </div>
      </div>
    </section>
  );
};
