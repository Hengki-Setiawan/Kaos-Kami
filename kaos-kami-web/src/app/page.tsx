"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
// P0 bundle: CanvasStage (three/fiber/drei/postprocessing) lazy client-only
// agar bundle awal home ringan; chunk 3D diunduh hanya bila WebGL didukung.
const CanvasStage = dynamic(
  () => import("@/components/3d/CanvasStage").then((m) => m.CanvasStage),
  { ssr: false }
);
// CWV: StaticShowcase (fallback no-WebGL) di-lazy agar tak membebani
// bundle awal home; hanya diunduh bila benar-benar dirender.
const StaticShowcase = dynamic(
  () => import("@/components/ui/StaticShowcase").then((m) => m.StaticShowcase),
  { ssr: false }
);
import { JsonLd, CanvasErrorBoundary } from "@/components/ui/JsonLd";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroOverlay } from "@/components/ui/HeroOverlay";
import { TechSpecsOverlay } from "@/components/ui/TechSpecsOverlay";
import { BackGraphicOverlay } from "@/components/ui/BackGraphicOverlay";
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { StoreShowcaseSection } from "@/components/ui/StoreShowcaseSection";
import { useScrollPhases } from "@/hooks/useScrollPhases";
import { useWebglSupport } from "@/hooks/useWebglSupport";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

export default function Home() {
  const { camPos, lookAtPos } = useScrollPhases();
  const webglSupported = useWebglSupport();
  const deviceTier = useDeviceTier();
  const { isHideWebsiteUI, setViewMode, setActivePhase } = useConfiguratorStore(
    useShallow((s) => ({
      isHideWebsiteUI: s.isHideWebsiteUI,
      setViewMode: s.setViewMode,
      setActivePhase: s.setActivePhase,
    }))
  );

  // Simpan viewMode sebelumnya; kembalikan saat unmount agar back-nav cepat
  // tidak menimpa state Studio (audit H1).
  const prevViewMode = useRef<"story" | "studio" | null>(null);

  const [deniedNote, setDeniedNote] = React.useState(false);

  // Reset to Story Mode on landing page mount
  useEffect(() => {
    prevViewMode.current = useConfiguratorStore.getState().viewMode;
    setViewMode("story");
    setActivePhase(1);
    // ?denied=admin (redirect gate admin): beri tahu jujur + bersihkan URL.
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("denied") === "admin") {
        setDeniedNote(true);
        q.delete("denied");
        const clean = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
        window.history.replaceState(null, "", clean);
      }
    } catch {}
    return () => {
      const prev = prevViewMode.current;
      if (prev) useConfiguratorStore.getState().setViewMode(prev);
    };
  }, [setViewMode, setActivePhase]);

  if (webglSupported === false || deviceTier.tier === "no-webgl") {
    return (
      <>
        <JsonLd />
        <Navbar />
        <StaticShowcase />
        <StoreShowcaseSection />
        <Footer />
      </>
    );
  }

  return (
    <main className="relative bg-canvas text-text-primary min-h-screen">
      {/* Schema.org Structured Data */}
      <JsonLd />

      <Navbar />

      {deniedNote && (
        <div className="relative z-30 mx-auto max-w-xl px-4 pt-20">
          <p className="rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs text-center px-4 py-2.5">
            Akses workshop ditolak — akun ini bukan admin/staff.
          </p>
        </div>
      )}

      {/* 3D WebGL Canvas Layer (boundary: crash = fallback statis, bukan hitam) */}
      <CanvasErrorBoundary fallback={<StaticShowcase />}>
        {webglSupported && <CanvasStage camPos={camPos} lookAtPos={lookAtPos} />}
      </CanvasErrorBoundary>

      {/* 4-Phase Story Scroll Container (Only mounted in story / normal mode) */}
      {!isHideWebsiteUI && (
        <div id="scroll-container" className="relative z-20">
          <HeroOverlay />
          <TechSpecsOverlay />
          <BackGraphicOverlay />
        </div>
      )}

      {/* Floating 3D Sandbox Studio Drawer */}
      <CustomizerDrawer />

      {/* Static Visual Sections, E-Commerce Showcase & Footer (Hidden in Clean Mockup Mode) */}
      {!isHideWebsiteUI && (
        <>
          <StoreShowcaseSection />
          <Footer />
        </>
      )}
    </main>
  );
}
