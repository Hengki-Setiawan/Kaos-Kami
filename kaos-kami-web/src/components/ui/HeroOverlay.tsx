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
        if (typeof d?.heroTitle === "string" && d.heroTitle && !d.heroTitle.startsWith("E2E ")) {
          setCmsTitle(d.heroTitle.slice(0, 80));
        } else if (d?.heroTitle?.startsWith("E2E ")) {
          sessionStorage.removeItem("kaos-hero-cms");
        }
        if (typeof d?.heroSubtitle === "string" && d.heroSubtitle && d.heroSubtitle !== "subtitle E2E") {
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
        // Sanitasi: abaikan teks pengujian otomatis E2E
        if (d?.heroTitle) {
          const v = String(d.heroTitle).slice(0, 80);
          if (!v.startsWith("E2E ")) {
            setCmsTitle(v);
            try {
              const prev = JSON.parse(sessionStorage.getItem("kaos-hero-cms") || "{}");
              sessionStorage.setItem("kaos-hero-cms", JSON.stringify({ ...prev, heroTitle: v }));
            } catch {}
          } else {
            try { sessionStorage.removeItem("kaos-hero-cms"); } catch {}
          }
        }
        if (d?.heroSubtitle) {
          const v = (d.heroSubtitle as string).slice(0, 200);
          if (v !== "subtitle E2E") {
            setCmsSubtitle(v);
            try {
              const prev = JSON.parse(sessionStorage.getItem("kaos-hero-cms") || "{}");
              sessionStorage.setItem("kaos-hero-cms", JSON.stringify({ ...prev, heroSubtitle: v }));
            } catch {}
          }
        }
      } catch {}
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  const isE2EText = (str: string | null) => !str || str.includes("E2E");
  const cleanTitle = cmsTitle && !isE2EText(cmsTitle) ? cmsTitle : "SABLON DTF PRESISI\n& APPAREL PREMIUM MAKASSAR";
  const titleLines = cleanTitle.split("\n");
  const subtitle = cmsSubtitle && !isE2EText(cmsSubtitle) ? cmsSubtitle : "Kaos katun combed 24s & sablon DTF presisi tanpa minimum order. Pesan satuan, pratinjau 360° akurat sebelum cetak.";

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
        <span className="font-sans text-xs sm:text-sm font-semibold text-brand-accent block">
          Kaos Kami // 3D DTF Studio Makassar
        </span>
      </div>

      {/* Main Editorial Title: Strict Left Column, perfectly balanced editorial typography */}
      <div className="my-auto max-w-lg lg:max-w-xl space-y-3.5 z-20">
        {/* CWV: min-h cadangkan slot judul agar swap teks CMS tak menggeser layout */}
        <h1 suppressHydrationWarning className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-display font-black uppercase tracking-tight leading-[1.04] text-text-primary min-h-[5rem] sm:min-h-[6rem]">
          {titleLines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <span className={i > 0 ? "text-text-primary/90" : undefined}>{line}</span>
            </React.Fragment>
          ))}
        </h1>
        <p className="font-sans tabular-nums text-xs sm:text-sm text-brand-accent tracking-wider uppercase font-bold">
          {`KATUN COMBED 24S · BEBAS SATUAN · MULAI ${apparel.formattedPrice}`}
        </p>

        {/* Action Buttons: Clean, Confident, Zero Gimmick */}
        <div className="pt-3 pointer-events-auto flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex items-center px-6 py-3 rounded-full bg-brand-accent text-canvas font-sans font-semibold text-sm hover:brightness-110 transition-all dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] active:scale-95"
          >
            <span>MULAI DESAIN 3D</span>
          </Link>
          <a
            href="#etalase"
            onClick={(e) => {
              const el = document.getElementById("etalase");
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="inline-flex items-center px-6 py-3 rounded-full bg-surface border border-border-subtle text-text-primary font-sans font-semibold text-sm hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95"
          >
            <span>BELANJA PRODUK SIAP PAKAI</span>
          </a>
        </div>
      </div>

      {/* Bottom Scroll Indicator: Siluet Elegan & Transparan, Kontras Terbaca */}
      <div className="pb-4 sm:pb-6 flex items-center justify-end pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
          }}
          className="group flex items-center gap-2 text-text-primary/75 hover:text-brand-accent transition-colors duration-300 cursor-pointer select-none py-1.5 px-2"
          aria-label="Gulir ke bawah"
          title="Klik untuk gulir ke bawah"
        >
          <span className="font-sans text-xs sm:text-sm font-semibold tracking-wide">
            Gulir ke bawah
          </span>
          <ChevronDown
            size={16}
            className="text-brand-accent animate-bounce transition-transform duration-300 group-hover:translate-y-0.5"
          />
        </button>
      </div>
    </section>
  );
};
