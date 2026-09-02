"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { APPAREL_CATALOG } from "@/lib/constants";

export const HeroOverlay: React.FC = () => {
  const { activePhase, viewMode, activeApparel } = useConfiguratorStore();
  const isVisible = activePhase === 1 && viewMode === "story";
  const apparel = APPAREL_CATALOG[activeApparel];

  return (
    <section
      className={`h-screen w-full flex flex-col justify-between p-6 md:p-12 lg:p-16 pt-28 md:pt-36 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-12 pointer-events-none"
      }`}
    >
      {/* Top Clean Editorial Category */}
      <div className="max-w-xs sm:max-w-sm pt-2">
        <span className="font-mono text-xs text-brand-accent tracking-widest uppercase font-bold block mb-1">
          MAKASSAR STREETWEAR // {apparel.weightGsm}
        </span>
        <p className="font-sans text-xs text-text-muted leading-relaxed">
          Katun combed tebal berkarakter boxy tegap dengan pola drop-shoulder modern & sablon DTF resolusi tinggi.
        </p>
      </div>

      {/* Main Editorial Title: Strict Left 45% Column, zero collision with 3D garment */}
      <div className="my-auto max-w-sm sm:max-w-md space-y-3 z-20">
        <h1 className="text-3xl sm:text-4xl md:text-[44px] font-display font-black uppercase tracking-tight leading-[0.96] text-text-primary">
          HEAVYWEIGHT<br />
          <span className="text-text-primary opacity-90">
            BOXY TEE
          </span>
        </h1>
        <p className="font-mono text-xs sm:text-sm text-brand-accent tracking-wider uppercase font-bold">
          {`KATUN COMBED 240/280 GSM · ${apparel.formattedPrice}`}
        </p>

        {/* Action Buttons: Clean, Confident, Zero Gimmick */}
        <div className="pt-3 pointer-events-auto flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex items-center px-6 py-3 rounded-full bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] active:scale-95"
          >
            <span>KUSTOM SABLON 3D</span>
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center px-6 py-3 rounded-full bg-surface border border-white/15 text-white font-mono font-bold text-xs uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95"
          >
            <span>BELI KAOS POLOS</span>
          </Link>
        </div>
      </div>

      {/* Bottom Data Grid & Scroll Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-2 border-t border-border-subtle pt-4">
        <div className="flex gap-6 md:gap-10 font-mono text-xs">
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">POLA POTONGAN</span>
            <span className="font-bold text-text-primary">BOXY OVERSIZED</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">GRAMASI</span>
            <span className="font-bold text-brand-accent">{apparel.weightGsm}</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">ORIGIN</span>
            <span className="font-bold text-text-primary">MAKASSAR, ID</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs text-text-muted animate-bounce">
          <span className="tracking-widest uppercase">SCROLL TO EXPLORE STORY</span>
          <ChevronDown size={16} className="text-brand-accent" />
        </div>
      </div>
    </section>
  );
};
