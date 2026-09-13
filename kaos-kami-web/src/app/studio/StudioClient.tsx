"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Sparkles, Sun, Moon, Maximize2, Minimize2, Move, CircleHelp } from "lucide-react";
// P0 bundle: CanvasStage (three/fiber/drei) + three lazy client-only agar
// chunk 3D tak masuk bundle awal. Vector3 dibuat via dynamic import("three").
const CanvasStage = dynamic(
  () => import("@/components/3d/CanvasStage").then((m) => m.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-muted">
        Memuat 3D…
      </div>
    ),
  }
);
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { StudioDesignLoader } from "@/components/studio/StudioDesignLoader";
import { StudioTour, openStudioTour } from "@/components/studio/StudioTour";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useWebglSupport } from "@/hooks/useWebglSupport";

export function StudioClient() {
  const {
    setViewMode,
    studioTheme,
    setStudioTheme,
    isHideWebsiteUI,
    toggleHideWebsiteUI,
    activeApparel,
    decals,
    isGizmoVisible,
    toggleGizmoVisible,
    syncStatus,
    cameraPreset,
    setCameraPreset,
    modelMode,
    motionClip,
    setMotionClip,
  } = useConfiguratorStore(
    useShallow((s) => ({
      setViewMode: s.setViewMode,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
      activeApparel: s.activeApparel,
      decals: s.decals,
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
      syncStatus: s.syncStatus,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      modelMode: s.modelMode,
      motionClip: s.motionClip,
      setMotionClip: s.setMotionClip,
    }))
  );
  const webglSupported = useWebglSupport();
  // M4.4 — tombol LENGAN bergantian kiri/kanan tiap klik (hemat tempat header).
  const [sisiLengan, setSisiLengan] = useState<"left" | "right">("left");

  useEffect(() => {
    setViewMode("studio");
  }, [setViewMode]);

  const isLight = studioTheme === "gallery";
  // Stabil + P0 bundle: Vector3 dari dynamic import("three") (tanpa import
  // statis three). Render CanvasStage setelah vektor siap; sebelumnya fallback.
  const [studioVecs, setStudioVecs] = useState<{ cam: any; look: any } | null>(null);
  useEffect(() => {
    let live = true;
    import("three").then(({ Vector3 }) => {
      if (!live) return;
      setStudioVecs({ cam: new Vector3(0, 0.05, 2.3), look: new Vector3(0, 0, 0) });
    });
    return () => {
      live = false;
    };
  }, []);

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
            <span>KEMBALI</span>
          </Link>

          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
            <img
              src={isLight ? "/brand/logo-black-clean.png" : "/brand/logo-white-clean.png"}
              alt="Kaos Kami"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>

          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-surface border border-border-subtle text-text-muted font-bold">
            STUDIO KUSTOM MAKASSAR
          </span>

          {/* Indikator autosave (audit #32) */}
          <span
            role="status"
            title={
              syncStatus === "saving"
                ? "Menyimpan desain…"
                : syncStatus === "saved"
                  ? "Desain tersimpan"
                  : syncStatus === "error"
                    ? "Gagal sinkron — tersimpan lokal, coba lagi nanti"
                    : "Autosave aktif"
            }
            className={`hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase border font-bold ${
              syncStatus === "saving"
                ? "border-amber-500/40 text-amber-400"
                : syncStatus === "saved"
                  ? "border-emerald-500/40 text-emerald-400"
                  : syncStatus === "error"
                    ? "border-rose-500/40 text-rose-300"
                    : "border-border-subtle text-text-muted"
            }`}
          >
            {syncStatus === "saving" ? "● MENYIMPAN…" : syncStatus === "saved" ? "● TERSIMPAN" : syncStatus === "error" ? "● OFFLINE" : "○ AUTO-SAVE"}
          </span>
        </div>

        {/* Right: Quick Studio Controls */}
        <div className="flex items-center space-x-2">
          {/* M4.4 + pola eksklusif Sep 2026 — jalan pintas kamera: ikon +
              status aktif + Detail Makro kerah (cek rib dari dekat). */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface border border-border-subtle" role="group" aria-label="Jalan pintas tampilan kamera">
            {(
              [
                { label: "DEPAN", preset: "front", ikon: "👕", judul: "Lihat dari depan" },
                { label: "BLKNG", preset: "back", ikon: "🔙", judul: "Lihat dari belakang" },
                { label: "KERAH ⌕", preset: "collar", ikon: "🔍", judul: "Detail makro kerah — cek jahitan rib dari dekat" },
              ] as const
            ).map((b) => (
              <button
                key={b.label}
                onClick={() => setCameraPreset(b.preset)}
                aria-pressed={cameraPreset === b.preset}
                className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] uppercase font-bold transition-colors ${
                  cameraPreset === b.preset
                    ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                    : "text-text-muted hover:text-brand-accent"
                }`}
                title={b.judul}
              >
                <span aria-hidden="true">{b.ikon} </span>{b.label}
              </button>
            ))}
            <button
              onClick={() => {
                setCameraPreset(sisiLengan);
                setSisiLengan((s) => (s === "left" ? "right" : "left"));
              }}
              aria-pressed={cameraPreset === "left" || cameraPreset === "right"}
              className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] uppercase font-bold transition-colors ${
                cameraPreset === "left" || cameraPreset === "right"
                  ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                  : "text-text-muted hover:text-brand-accent"
              }`}
              title="Lihat lengan (bergantian kiri/kanan)"
            >
              💪 LNGN
            </button>
          </div>

          {/* M4.3 — Buka ulang tur panduan */}
          <button
            onClick={openStudioTour}
            className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent transition-all"
            title="Panduan 3 langkah"
            aria-label="Buka panduan studio 3 langkah"
          >
            <CircleHelp size={14} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
            className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            title={isLight ? "Mode gelap" : "Mode terang"}
            aria-label={isLight ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
          >
            {isLight ? <Moon size={14} className="text-neutral-800" /> : <Sun size={14} className="text-brand-accent" />}
          </button>

          {/* Quick Gizmo Toggle Button */}
          {decals.length > 0 && (
            <button
              onClick={toggleGizmoVisible}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all ${
                isGizmoVisible
                  ? "bg-surface border-brand-accent/60 text-brand-accent font-bold shadow-[0_0_8px_rgba(230,81,0,0.25)]"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
              }`}
              title={isGizmoVisible ? "Sembunyikan alat bantu 3D" : "Tampilkan alat bantu 3D"}
            >
              <Move size={12} />
              <span className="text-[11px] font-bold">{isGizmoVisible ? "GIZMO NYALA" : "GIZMO MATI"}</span>
            </button>
          )}

          {/* DANSAS — manekin-only: retarget rumba in-place (fallback idle, tak pernah blank) */}
          {modelMode === "mannequin" && (
            <button
              onClick={() => setMotionClip(motionClip === "dance" ? "idle" : "dance")}
              aria-pressed={motionClip === "dance"}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all ${
                motionClip === "dance"
                  ? "bg-brand-accent text-canvas border-brand-accent font-bold shadow-[0_0_8px_rgba(230,81,0,0.4)]"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
              }`}
              title="Putar dansa rumba (retarget in-place, manekin tetap di tempat)"
            >
              <span aria-hidden="true">💃</span>
              <span className="text-[11px] font-bold">{motionClip === "dance" ? "BERHENTI" : "DANSAS"}</span>
            </button>
          )}

          {/* Clean Mockup View Toggle */}
          <button
            onClick={toggleHideWebsiteUI}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all ${
              isHideWebsiteUI
                ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
            title="Tampilan bersih"
          >
            {isHideWebsiteUI ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="text-[11px] font-bold">{isHideWebsiteUI ? "KELUAR" : "TAMPIL BERSIH"}</span>
          </button>
        </div>
      </header>

      {/* Fullscreen 3D WebGL Canvas Layer — dengan fallback non-WebGL (audit H5) */}
      {webglSupported === false ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-3 font-mono text-xs">
            <p className="text-white font-bold text-sm">Perangkat tidak mendukung 3D</p>
            <p className="text-text-muted">
              Studio 3D butuh WebGL yang tidak tersedia di browser ini. Kamu tetap bisa pesan via katalog atau hubungi workshop langsung.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/catalog" className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold">
                BUKA KATALOG
              </Link>
              <Link href="/" className="px-5 py-2.5 rounded-xl bg-surface border border-white/10 text-white font-bold">
                BERANDA
              </Link>
            </div>
          </div>
        </div>
      ) : studioVecs ? (
        <CanvasStage camPos={studioVecs.cam} lookAtPos={studioVecs.look} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-muted">
          Memuat 3D…
        </div>
      )}

      {/* Deep-link desain tersimpan (?designId=) */}
      <Suspense fallback={null}>
        <StudioDesignLoader />
      </Suspense>

      {/* M4.3 — Tur panduan 3 langkah (upload → atur → order) */}
      <StudioTour />

      {/* Floating Customizer Drawer */}
      <CustomizerDrawer />
    </main>
  );
}
