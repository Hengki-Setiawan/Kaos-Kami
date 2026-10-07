"use client";

import React from "react";
import { Maximize2, RotateCw, Layers } from "lucide-react";
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
          <span className="font-sans text-[10px] sm:text-xs text-brand-accent tracking-widest uppercase font-bold">
            INSPEKSI 360° // TANPA SALAH CETAK
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-sans font-extrabold uppercase leading-[1.08] tracking-tight text-text-primary mt-1.5">
            LIHAT HASILNYA<br />SEBELUM DICETAK
          </h2>
        </div>

        {/* Minimalist 3-Pill Specs Grid */}
        <div className="p-4 rounded-2xl bg-surface/75 border border-border-subtle backdrop-blur-sm space-y-2.5 inline-block text-left w-full font-sans text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-text-muted">
              <RotateCw size={13} className="text-brand-accent" />
              <span>PRATINJAU REALISTIS:</span>
            </div>
            <strong className="text-text-primary">Inspeksi Depan & Punggung 360°</strong>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-text-muted">
              <Maximize2 size={13} className="text-brand-accent" />
              <span>SKALA SENTIMETER NYATA:</span>
            </div>
            <strong className="text-brand-accent">{maxW} × {maxH} cm (Terkalibrasi 1:1)</strong>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-text-muted">
              <Layers size={13} className="text-brand-accent" />
              <span>JAMINAN PRODUKSI:</span>
            </div>
            <strong className="text-text-primary">Cetak Tepat Sesuai Mockup</strong>
          </div>
        </div>
      </div>
    </section>
  );
};
