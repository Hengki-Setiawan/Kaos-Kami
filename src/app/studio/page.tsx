"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Sun, Moon, Maximize2, Minimize2 } from "lucide-react";
import { CanvasStage } from "@/components/3d/CanvasStage";
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useWebglSupport } from "@/hooks/useWebglSupport";
import * as THREE from "three";

export default function StudioPage() {
  const {
    setViewMode,
    studioTheme,
    setStudioTheme,
    isHideWebsiteUI,
    toggleHideWebsiteUI,
    activeApparel,
  } = useConfiguratorStore();
  const webglSupported = useWebglSupport();

  useEffect(() => {
    setViewMode("studio");
  }, [setViewMode]);

  const isLight = studioTheme === "gallery";
  const defaultCamPos = new THREE.Vector3(0, 0.05, 2.3);
  const defaultLookAt = new THREE.Vector3(0, 0, 0);

  return (
    <main className="relative bg-canvas text-text-primary h-screen w-screen overflow-hidden select-none">
      {/* Studio Top Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-auto backdrop-blur-xl border-b transition-all duration-500 ${
          isLight
            ? "bg-[#F5F4F0]/80 border-black/10 text-neutral-900"
            : "bg-[#121214]/80 border-border-subtle text-text-primary"
        } ${isHideWebsiteUI ? "opacity-20 hover:opacity-100" : "opacity-100"}`}
      >
        {/* Left: Back to Home & Brand */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            onClick={() => setViewMode("story")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent transition-all text-xs font-mono font-bold uppercase"
          >
            <ArrowLeft size={13} />
            <span>BACK TO STORY</span>
          </Link>

          <span className="font-display font-black text-lg tracking-tighter uppercase">
            kaos kami<span className="text-brand-accent">.</span>
          </span>

          <span className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-brand-accent/20 border border-brand-accent/40 text-brand-accent font-bold">
            <Sparkles size={11} />
            <span>3D PRO STUDIO WORKSPACE</span>
          </span>
        </div>

        {/* Right: Quick Studio Controls */}
        <div className="flex items-center space-x-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
            className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            title={isLight ? "Obsidian Dark Mode" : "Gallery Light Mode"}
          >
            {isLight ? <Moon size={14} className="text-neutral-800" /> : <Sun size={14} className="text-brand-accent" />}
          </button>

          {/* Clean Mockup View Toggle */}
          <button
            onClick={toggleHideWebsiteUI}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all ${
              isHideWebsiteUI
                ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
            title="Toggle Clean Mockup View"
          >
            {isHideWebsiteUI ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="text-[11px] font-bold">{isHideWebsiteUI ? "EXIT CLEAN" : "CLEAN VIEW"}</span>
          </button>
        </div>
      </header>

      {/* Fullscreen 3D WebGL Canvas Layer */}
      {webglSupported && <CanvasStage camPos={defaultCamPos} lookAtPos={defaultLookAt} />}

      {/* Floating Customizer Drawer */}
      <CustomizerDrawer />
    </main>
  );
}
