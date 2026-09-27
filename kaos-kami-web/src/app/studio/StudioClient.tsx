"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  CircleHelp,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { AuthModal } from "@/components/ui/AuthModal";
// P0 bundle: CanvasStage (three/fiber/drei) lazy client-only agar
// chunk 3D tak masuk bundle awal.
const CanvasStage = dynamic(
  () => import("@/components/3d/CanvasStage").then((m) => m.CanvasStage),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-canvas pointer-events-none" />,
  }
);
import { StudioHUD } from "@/components/studio/StudioHUD";
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { StudioDesignLoader } from "@/components/studio/StudioDesignLoader";
import { StudioTour, openStudioTour } from "@/components/studio/StudioTour";
import { StudioPublishModal } from "@/components/studio/StudioPublishModal";
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
    syncStatus,
  } = useConfiguratorStore(
    useShallow((s) => ({
      setViewMode: s.setViewMode,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
      syncStatus: s.syncStatus,
    }))
  );
  const webglSupported = useWebglSupport();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin =
    ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole) ||
    session?.user?.email === "hengkishadow@gmail.com" ||
    session?.user?.email === "admin@kaoskami.biz.id";

  useEffect(() => {
    setViewMode("studio");
  }, [setViewMode]);

  const isLight = studioTheme === "gallery";

  return (
    <main className="relative bg-canvas text-text-primary h-screen w-screen overflow-hidden select-none">
      {/* Studio Top Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-auto backdrop-blur-xl border-b transition-all duration-500 ${
          isLight
            ? "bg-[#F5F4F0]/80 border-black/10 text-neutral-900"
            : "bg-surface/80 border-border-subtle text-text-primary"
        } ${isHideWebsiteUI ? "opacity-20 hover:opacity-100" : "opacity-100"}`}
      >
        {/* Left: Back to Home & Brand & Autosave */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            prefetch={true}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent transition-all text-xs font-mono font-bold uppercase active:scale-95 cursor-pointer shadow-sm"
            title="Kembali ke Beranda"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">KEMBALI</span>
          </Link>

          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
            <img
              src={isLight ? "/brand/logo-black-clean.png" : "/brand/logo-white-clean.png"}
              alt="Kaos Kami"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>

          {/* Indikator autosave minimalis & modern */}
          <span
            role="status"
            title={
              syncStatus === "saving"
                ? "Menyimpan desain ke cloud…"
                : syncStatus === "saved"
                  ? "Desain tersimpan aman"
                  : syncStatus === "error"
                    ? "Gagal sinkron — tersimpan lokal"
                    : "Autosave aktif"
            }
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase bg-surface/60 border border-border-subtle"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                syncStatus === "saving"
                  ? "bg-amber-400 animate-ping"
                  : syncStatus === "saved"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    : syncStatus === "error"
                      ? (typeof navigator !== "undefined" && !navigator.onLine ? "bg-rose-400" : "bg-sky-400")
                      : "bg-text-muted"
              }`}
            />
            <span className="font-bold text-text-muted text-[9px] sm:text-[10px]">
              {syncStatus === "saving"
                ? "MENYIMPAN…"
                : syncStatus === "saved"
                  ? "TERSIMPAN"
                  : syncStatus === "error"
                    ? (typeof navigator !== "undefined" && !navigator.onLine ? "OFFLINE" : "DRAFT LOKAL")
                    : "AUTO-SAVE"}
            </span>
          </span>
        </div>

        {/* Right: Essential Studio Actions */}
        <div className="flex items-center space-x-2">
          {/* Buka ulang tur panduan */}
          <button
            onClick={openStudioTour}
            className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent transition-all cursor-pointer shadow-sm active:scale-95"
            title="Panduan 3 langkah"
            aria-label="Buka panduan studio 3 langkah"
          >
            <CircleHelp size={14} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
            className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer shadow-sm active:scale-95"
            title={isLight ? "Mode gelap" : "Mode terang"}
            aria-label={isLight ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
          >
            {isLight ? <Moon size={14} className="text-neutral-800" /> : <Sun size={14} className="text-brand-accent" />}
          </button>

          {/* Clean Mockup View Toggle */}
          <button
            onClick={toggleHideWebsiteUI}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all cursor-pointer shadow-sm active:scale-95 ${
              isHideWebsiteUI
                ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
            title="Tampilan bersih (fullscreen mockup)"
          >
            {isHideWebsiteUI ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="text-[11px] font-bold hidden sm:inline">{isHideWebsiteUI ? "KELUAR" : "TAMPIL BERSIH"}</span>
          </button>

          {/* Admin Studio Publish to Showcase */}
          {isAdmin && <StudioPublishModal />}

          {/* Admin Quick Jump Pill (Executive Dual-Tone Badge) */}
          {isAdmin && (
            <Link
              href="/admin"
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold border transition-all duration-200 active:scale-95 shadow-sm
                bg-white text-neutral-900 border-amber-500/70 hover:bg-amber-500 hover:text-black hover:border-amber-600 hover:shadow-[0_0_14px_rgba(245,158,11,0.3)]
                dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/50 dark:hover:bg-amber-500 dark:hover:text-black dark:hover:border-amber-400"
              title="Buka Dashboard Admin & Workshop DTF"
            >
              <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-black/20 group-hover:text-black flex items-center justify-center transition-colors">
                <ShieldCheck size={12} className="stroke-[2.5]" />
              </div>
              <span className="hidden sm:inline font-extrabold tracking-tight">PANEL ADMIN</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">OPS</span>
            </Link>
          )}

          {/* User Account / Dashboard Modal Trigger */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs border transition-all cursor-pointer active:scale-95 shadow-sm ${
              session?.user
                ? "bg-surface border-brand-accent/40 text-brand-accent font-bold"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
            title={session?.user ? `Akun: ${session.user.name}` : "Masuk / Akun Saya"}
            aria-label="Akun Pengguna & Dashboard"
          >
            <UserIcon size={13} />
            <span className="hidden sm:inline font-bold">
              {session?.user ? session.user.name?.split(" ")[0] : "MASUK"}
            </span>
          </button>
        </div>
      </header>

      {/* Fullscreen 3D WebGL Canvas Layer — dengan fallback non-WebGL (audit H5) */}
      {webglSupported === false ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-3 font-mono text-xs">
            <p className="text-text-primary font-bold text-sm">Perangkat tidak mendukung 3D</p>
            <p className="text-text-muted">
              Studio 3D butuh WebGL yang tidak tersedia di browser ini. Kamu tetap bisa pesan via katalog atau hubungi workshop langsung.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/catalog" className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold">
                BUKA KATALOG
              </Link>
              <Link href="/" className="px-5 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold">
                BERANDA
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <CanvasStage />
      )}

      {/* Deep-link desain tersimpan (?designId=) */}
      <Suspense fallback={null}>
        <StudioDesignLoader />
      </Suspense>

      {/* M4.3 — Tur panduan 3 langkah (upload → atur → order) */}
      <StudioTour />

      {/* Unified 3D Viewport HUD Dock */}
      <StudioHUD />

      {/* Floating Customizer Drawer */}
      <CustomizerDrawer />

      {/* User Auth & Dashboard Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
