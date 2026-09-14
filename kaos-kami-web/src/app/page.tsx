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
import { EditorialLookbook } from "@/components/ui/EditorialLookbook";
import { HomeCatalogSection } from "@/components/ui/HomeCatalogSection";
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

  // Reset to Story Mode on landing page mount
  useEffect(() => {
    prevViewMode.current = useConfiguratorStore.getState().viewMode;
    setViewMode("story");
    setActivePhase(1);
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
        <Footer />
      </>
    );
  }

  return (
    <main className="relative bg-canvas text-text-primary min-h-screen">
      {/* Schema.org Structured Data */}
      <JsonLd />

      <Navbar />

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
          <HomeCatalogSection />
          <EditorialLookbook />
          <Footer />
        </>
      )}
    </main>
  );
}
