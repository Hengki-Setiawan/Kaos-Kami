"use client";

import React, { useEffect } from "react";
import { CanvasStage } from "@/components/3d/CanvasStage";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroOverlay } from "@/components/ui/HeroOverlay";
import { TechSpecsOverlay } from "@/components/ui/TechSpecsOverlay";
import { BackGraphicOverlay } from "@/components/ui/BackGraphicOverlay";
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { StaticShowcase } from "@/components/ui/StaticShowcase";
import { EditorialLookbook } from "@/components/ui/EditorialLookbook";
import { useScrollPhases } from "@/hooks/useScrollPhases";
import { useWebglSupport } from "@/hooks/useWebglSupport";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { PRODUCT_DETAILS } from "@/lib/constants";

export default function Home() {
  const { camPos, lookAtPos } = useScrollPhases();
  const webglSupported = useWebglSupport();
  const { isHideWebsiteUI, setViewMode, setActivePhase } = useConfiguratorStore();

  // Reset to Story Mode on landing page mount
  useEffect(() => {
    setViewMode("story");
    setActivePhase(1);
  }, [setViewMode, setActivePhase]);

  // Structured Data (JSON-LD) for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: PRODUCT_DETAILS.productTitle,
    description: "Heavyweight 240 & 280 GSM Cotton Combed Oversized Streetwear Apparel 3D Sandbox.",
    brand: {
      "@type": "Brand",
      name: PRODUCT_DETAILS.brand,
    },
    sku: PRODUCT_DETAILS.sku,
    offers: {
      "@type": "Offer",
      url: "https://kaoskami.com",
      priceCurrency: PRODUCT_DETAILS.currency,
      price: PRODUCT_DETAILS.priceIdr,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (webglSupported === false) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <StaticShowcase />
        <Footer />
      </>
    );
  }

  return (
    <main className="relative bg-canvas text-text-primary min-h-screen">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* 3D WebGL Canvas Layer */}
      {webglSupported && <CanvasStage camPos={camPos} lookAtPos={lookAtPos} />}

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

      {/* Static Visual Sections & Footer (Hidden in Clean Mockup Mode) */}
      {!isHideWebsiteUI && (
        <>
          <EditorialLookbook />
          <Footer />
        </>
      )}
    </main>
  );
}
