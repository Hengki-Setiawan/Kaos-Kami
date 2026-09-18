"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_CATALOG } from "@/lib/constants";

export const HeroOverlay: React.FC = () => {
  const { activePhase, viewMode, activeApparel } = useConfiguratorStore(
    useShallow((s) => ({
      activePhase: s.activePhase,
      viewMode: s.viewMode,
      activeApparel: s.activeApparel,
    }))
  );
  const isVisible = activePhase === 1 && viewMode === "story";
  const apparel = APPAREL_CATALOG[activeApparel];
  // Judul hero dari CMS (R2) — gagal = default editorial.
  // Inisialisasi null di SSR agar markup server & client identik (0 hydration mismatch),
  // lalu baca cache sessionStorage dan revalidasi CMS di useEffect.
  const [cmsTitle, setCmsTitle] = React.useState<string | null>(null);
  const [cmsSubtitle, setCmsSubtitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kaos-hero-cms");
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d?.heroTitle === "string" && d.heroTitle) {
          setCmsTitle(d.heroTitle.slice(0, 80));
        }
        if (typeof d?.heroSubtitle === "string" && d.heroSubtitle) {
          setCmsSubtitle(String(d.heroSubtitle).slice(0, 200));
        }
      }
    } catch {}

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    (async () => {
      try {
        const r = await fetch("/api/admin/cms", { signal: ctrl.signal });
        const d = await r.json().catch(() => null);
        clearTimeout(t);
        if (!r.ok || !d) return;
        // Sanitasi panjang (audit #11): judul CMS tak boleh merusak layout.
        if (d?.heroTitle) {
          const v = String(d.heroTitle).slice(0, 80);
          setCmsTitle(v);
          try {
            const prev = JSON.parse(sessionStorage.getItem("kaos-hero-cms") || "{}");
            sessionStorage.setItem("kaos-hero-cms", JSON.stringify({ ...prev, heroTitle: v }));
          } catch {}
        }
        if (typeof d?.heroSubtitle === "string" && d.heroSubtitle) {
          const v = (d.heroSubtitle as string).slice(0, 200);
          setCmsSubtitle(v);
          try {
            const prev = JSON.parse(sessionStorage.getItem("kaos-hero-cms") || "{}");
            sessionStorage.setItem("kaos-hero-cms", JSON.stringify({ ...prev, heroSubtitle: v }));
          } catch {}
        }
      } catch {}
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  const titleLines = (cmsTitle || "BIKIN KAOS IMPIANMU\nDENGAN MOCKUP 3D").split("\n");
  const subtitle = cmsSubtitle || "Platform sablon DTF kustom satuan & kaos polos katun combed berkualitas di Makassar. Simulasikan desainmu 360° secara akurat.";

  return (
    <section
      className={`h-screen w-full flex flex-col justify-between p-6 md:p-12 lg:p-16 pt-28 md:pt-36 relative pointer-events-none select-none transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-12 pointer-events-none"
      }`}
    >
      {/* Top Clean Editorial Category */}
      <div className="max-w-xs sm:max-w-md pt-2">
        <span className="font-mono text-xs text-brand-accent tracking-widest uppercase font-bold block mb-1">
          KAOS KAMI · SABLON DTF & KAOS CUSTOM MAKASSAR
        </span>
        <p suppressHydrationWarning className="font-sans text-xs text-text-muted leading-relaxed min-h-[3rem]">
          {subtitle}
        </p>
      </div>

      {/* Main Editorial Title: Strict Left 45% Column, zero collision with 3D garment */}
      <div className="my-auto max-w-sm sm:max-w-md space-y-3 z-20">
        {/* CWV: min-h cadangkan slot judul agar swap teks CMS
            (stale→fresh) tak menggeser layout (CLS). */}
        <h1 suppressHydrationWarning className="text-[clamp(1.65rem,7.5vw,2.25rem)] sm:text-4xl md:text-[44px] font-display font-black uppercase tracking-tight leading-[0.96] text-text-primary min-h-[5.5rem] sm:min-h-[6rem]">
          {titleLines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <span className={i > 0 ? "text-text-primary opacity-90" : undefined}>{line}</span>
            </React.Fragment>
          ))}
        </h1>
        <p className="font-mono text-xs sm:text-sm text-brand-accent tracking-wider uppercase font-bold">
          {`KATUN COMBED ADEM · MULAI ${apparel.formattedPrice}`}
        </p>

        {/* Action Buttons: Clean, Confident, Zero Gimmick */}
        <div className="pt-3 pointer-events-auto flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex items-center px-6 py-3 rounded-full bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] active:scale-95"
          >
            <span>KUSTOM DESAIN (3D)</span>
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center px-6 py-3 rounded-full bg-surface border border-border-subtle text-text-primary font-mono font-bold text-xs uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95"
          >
            <span>KATALOG SIAP BELI</span>
          </Link>
        </div>
      </div>

      {/* Bottom Data Grid & Scroll Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-2 border-t border-border-subtle pt-4">
        <div className="flex gap-6 md:gap-10 font-mono text-xs">
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">LAYANAN</span>
            <span className="font-bold text-text-primary">SABLON DTF & POLOS</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">MINIMAL ORDER</span>
            <span className="font-bold text-brand-accent">BEBAS SATUAN (0 MIN)</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">LOKASI</span>
            <span className="font-bold text-text-primary">KOTA MAKASSAR, ID</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs text-text-muted animate-bounce">
          <span className="tracking-widest uppercase">GULIR UNTUK JELAJAHI FITUR</span>
          <ChevronDown size={16} className="text-brand-accent" />
        </div>
      </div>
    </section>
  );
};
