"use client";

import React from "react";
import { Sparkles, Layers, Headphones, Truck } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

const HIGHLIGHT_SPECS = [
  {
    icon: Sparkles,
    label: "BAHAN UTAMA",
    title: "Katun Combed Premium",
    desc: "100% serat alami sejuk, lembut & menyerap keringat",
  },
  {
    icon: Layers,
    label: "MOCKUP 3D",
    title: "Desain Sendiri dengan Mockup 3D",
    desc: "Pratinjau interaktif 360° real-time sebelum dicetak",
  },
  {
    icon: Headphones,
    label: "LAYANAN ADMIN",
    title: "Layanan Cepat dari Admin",
    desc: "Konsultasi sigap, panduan ramah & proses tepat waktu",
  },
  {
    icon: Truck,
    label: "GRATIS ONGKIR",
    title: "Gratis Pengiriman se-Makassar",
    desc: "Pengantaran langsung ke alamat Anda di area Makassar",
  },
];

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
          <span className="font-sans text-[10px] sm:text-xs text-brand-accent tracking-widest uppercase font-bold">
            SPESIFIKASI // STANDAR DISTRO
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-sans font-extrabold uppercase leading-[1.08] tracking-tight text-text-primary mt-1.5">
            KATUN COMBED NYAMAN
          </h2>
        </div>

        {/* Minimalist Icon-Driven Specification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-mono">
          {HIGHLIGHT_SPECS.map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.label}
                className="p-3.5 rounded-2xl bg-surface/75 border border-border-subtle hover:border-brand-accent/40 transition-colors space-y-1.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                    <Icon size={13} />
                  </div>
                  <span className="text-[9px] tracking-widest text-text-muted uppercase font-bold">
                    {spec.label}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{spec.title}</h4>
                  <p className="text-[10px] text-text-muted leading-tight mt-0.5 font-sans">
                    {spec.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
