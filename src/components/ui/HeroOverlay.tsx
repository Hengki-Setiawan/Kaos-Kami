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
      className={`h-screen w-full flex flex-col justify-between p-6 md:p-12 lg:p-16 pt-24 md:pt-28 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-12 pointer-events-none"
      }`}
    >
      {/* Top Tagline (Left Column) */}
      <div className="max-w-sm">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface border border-border-subtle mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
          <span className="font-mono text-[11px] text-text-muted tracking-widest uppercase">
            {apparel.weightGsm} ARCHITECTURAL SERIES
          </span>
        </div>
        <p className="font-mono text-xs md:text-sm text-text-muted leading-relaxed">
          Engineered in Makassar & Jakarta. Crafted from heavyweight long-staple combed cotton with oversized boxy proportions.
        </p>
      </div>

      {/* Main Editorial Title docked strictly on Left 45% Column */}
      <div className="my-auto max-w-lg lg:max-w-md xl:max-w-lg space-y-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-black uppercase tracking-tighter leading-[0.88] text-text-primary">
          OVERSIZED<br />
          <span className="text-text-primary opacity-85">
            HEAVY-KNIT
          </span>
        </h1>
        <p className="font-mono text-xs text-brand-accent tracking-widest uppercase font-bold">
          {`// ${apparel.name} · ${apparel.formattedPrice}`}
        </p>

        {/* 1-Click Launch Studio Link to /studio */}
        <div className="pt-2 pointer-events-auto">
          <Link
            href="/studio"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-full bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.4)] active:scale-95"
          >
            <Sparkles size={14} />
            <span>LAUNCH 3D MOCKUP STUDIO</span>
          </Link>
        </div>
      </div>

      {/* Bottom Data Grid & Scroll Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-2 border-t border-border-subtle pt-4">
        <div className="flex gap-6 md:gap-10 font-mono text-xs">
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">CUT SPEC</span>
            <span className="font-bold text-text-primary">BOXY STREET-CUT</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">WEIGHT</span>
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
