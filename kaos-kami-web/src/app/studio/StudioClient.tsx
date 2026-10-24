"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  FlaskConical,
  Download,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { AuthModal } from "@/components/ui/AuthModal";
import { ClothLabModal } from "@/components/studio/ClothLabModal";
import { ExportStudioModal } from "@/components/studio/ExportStudioModal";
import { CanvasErrorBoundary } from "@/components/ui/JsonLd";
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
import { CartDrawer } from "@/components/ui/CartDrawer";
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
    toggleClothLab,
    toggleExportModal,
    activeApparel,
    decals,
    selectedDecalId,
  } = useConfiguratorStore(
    useShallow((s) => ({
      setViewMode: s.setViewMode,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
      syncStatus: s.syncStatus,
      toggleClothLab: s.toggleClothLab,
      toggleExportModal: s.toggleExportModal,
      activeApparel: s.activeApparel,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
    }))
  );
  const webglSupported = useWebglSupport();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pesanGangSheet, setPesanGangSheet] = useState<string | null>(null);

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin =
    ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole) ||
    session?.user?.email === "hengkishadow@gmail.com" ||
    session?.user?.email === "admin@kaoskami.biz.id";

  useEffect(() => {
    setViewMode("studio");
  }, [setViewMode]);

  const searchParams = useSearchParams();
  const editCatalogId = searchParams.get("editCatalogId");
  const mode = searchParams.get("mode");
  const isGangsheetMode = mode === "gangsheet" || searchParams.get("from") === "gangsheet";

  // Simpan konfigurasi 3D ke Bank Desain Gang Sheet (Offline Vault)
  const handleSimpanKeGangSheetVault = () => {
    if (decals.length === 0) {
      alert("Silakan unggah atau tambahkan gambar desain pada baju 3D terlebih dahulu!");
      return;
    }
    const targetDecal = decals.find((d) => d.id === selectedDecalId) || decals[0];
    if (!targetDecal) {
      alert("Silakan unggah atau tambahkan gambar desain pada baju 3D terlebih dahulu!");
      return;
    }
    const defaultW = 28.0;
    const aspect = targetDecal.printPx ? targetDecal.printPx.w / targetDecal.printPx.h : 28.0 / 35.0;
    const defaultH = Math.max(2, Math.round((defaultW / aspect) * 10) / 10);

    const vaultItem = {
      id: `studio-${Date.now().toString(36)}`,
      title: targetDecal.name || `Desain 3D ${activeApparel.toUpperCase()}`,
      customerName: "Studio 3D Kustom",
      orderRef: "STUDIO-3D",
      imageUrl: targetDecal.url,
      widthCm: defaultW,
      heightCm: defaultH,
      aspectRatio: aspect,
      placementSide: targetDecal.targetSide === "back" ? "back" : targetDecal.targetSide.includes("sleeve") ? "sleeve" : "front",
      apparel: activeApparel,
      createdAt: new Date().toISOString(),
    };

    try {
      const STORAGE_VAULT_KEY = "kaoskami_offline_print_vault";
      const raw = localStorage.getItem(STORAGE_VAULT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const updated = [vaultItem, ...(Array.isArray(list) ? list : [])];
      localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("kaoskami_vault_updated"));
      setPesanGangSheet(`✓ Desain '${vaultItem.title}' berhasil disimpan ke Bank Desain Gang Sheet (${defaultW} × ${defaultH} cm)!`);
      setTimeout(() => setPesanGangSheet(null), 6000);
    } catch (e: any) {
      alert(`Gagal menyimpan: ${e.message}`);
    }
  };

  const isLight = studioTheme === "gallery";

  return (
    <main className="relative bg-canvas text-text-primary h-screen w-screen overflow-hidden select-none">
      {/* Toast Notifikasi Khusus Gang Sheet */}
      {pesanGangSheet && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-60 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-black text-xs shadow-2xl flex items-center gap-3 border border-amber-500">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{pesanGangSheet}</span>
            <Link
              href="/admin/gang-sheet"
              className="ml-2 px-3 py-1 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-[11px] transition-all"
            >
              Buka Lembar Gang Sheet ➔
            </Link>
          </div>
        </div>
      )}

      {/* Studio Top Navigation Bar: Edge-to-Edge Sticky Top Header */}
      <header
        className={`fixed top-0 inset-x-0 w-full z-50 h-14 pointer-events-auto backdrop-blur-2xl border-b transition-all duration-300 ${
          isLight
            ? "bg-surface/90 border-border-subtle text-text-primary shadow-sm"
            : "bg-canvas/90 dark:bg-black/85 border-border-subtle text-text-primary shadow-sm"
        } ${isHideWebsiteUI ? "opacity-20 hover:opacity-100" : "opacity-100"}`}
      >
        <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Left: Back to Home / Admin & Brand & Autosave */}
          <div className="flex items-center space-x-3">
          {isGangsheetMode ? (
            <Link
              href="/admin/gang-sheet"
              className="flex items-center space-x-1.5 px-3.5 h-9 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-500 hover:bg-amber-500 hover:text-black transition-all text-xs font-sans font-bold uppercase active:scale-95 cursor-pointer shadow-sm"
              title="Kembali ke Lembar Gang Sheet"
            >
              <ArrowLeft size={13} />
              <span>KE GANG SHEET</span>
            </Link>
          ) : editCatalogId ? (
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  if (window.opener && !window.opener.closed) {
                    try {
                      window.opener.location.reload();
                    } catch {}
                    try {
                      window.close();
                      return;
                    } catch {}
                  }
                  window.location.href = "/admin/catalog";
                }
              }}
              className="flex items-center space-x-1.5 px-3 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-black transition-all text-xs font-sans font-bold uppercase active:scale-95 cursor-pointer shadow-sm"
              title="Tutup Studio & Kembali ke Admin Catalog"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">KEMBALI KE ADMIN</span>
            </button>
          ) : (
            <Link
              href="/"
              prefetch={true}
              className="flex items-center space-x-1.5 px-3 h-9 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent transition-all text-xs font-sans font-bold uppercase active:scale-95 cursor-pointer shadow-sm"
              title="Kembali ke Beranda"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">KEMBALI</span>
            </Link>
          )}

          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
            <img
              src={isLight ? "/brand/logo-black-clean.png" : "/brand/logo-white-clean.png"}
              alt="Kaos Kami"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>

          {/* Indikator autosave minimalis & modern (Bab 51 §3.3) */}
          <span
            role="status"
            title={
              syncStatus === "saving"
                ? "Menyimpan desain ke cloud…"
                : syncStatus === "saved"
                  ? "Desain tersimpan aman di cloud"
                  : syncStatus === "error"
                    ? "Gagal sinkron: tersimpan di penyimpanan lokal"
                    : "Autosave aktif"
            }
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-surface/70 border border-border-subtle shadow-sm"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncStatus === "saving"
                  ? "bg-amber-400 animate-ping"
                  : syncStatus === "saved"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : syncStatus === "error"
                      ? (typeof navigator !== "undefined" && !navigator.onLine ? "bg-rose-400" : "bg-sky-400")
                      : "bg-text-muted"
              }`}
            />
            <span className="text-text-muted text-xs">
              {syncStatus === "saving"
                ? "Menyimpan…"
                : syncStatus === "saved"
                  ? "Tersimpan di Cloud"
                  : syncStatus === "error"
                    ? (typeof navigator !== "undefined" && !navigator.onLine ? "Offline" : "Draft Lokal")
                    : "Autosave"}
            </span>
          </span>
        </div>

        {/* Right: Essential Studio Actions */}
        <div className="flex items-center space-x-2">
          {/* Buka ulang tur panduan */}
          <button
            id="studio-guide-btn"
            onClick={openStudioTour}
            className="hidden sm:flex p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent transition-all cursor-pointer shadow-sm active:scale-95"
            title="Panduan Studio"
            aria-label="Buka panduan studio interaktif"
          >
            <CircleHelp size={14} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
            className="hidden sm:flex p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer shadow-sm active:scale-95"
            title={isLight ? "Mode gelap" : "Mode terang"}
            aria-label={isLight ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
          >
            {isLight ? <Moon size={14} className="text-neutral-800" /> : <Sun size={14} className="text-brand-accent" />}
          </button>

          {/* Clean Mockup View Toggle */}
          <button
            onClick={toggleHideWebsiteUI}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-sans text-xs font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 ${
              isHideWebsiteUI
                ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
            title="Tampilan bersih (fullscreen mockup)"
          >
            {isHideWebsiteUI ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isHideWebsiteUI ? "Keluar" : "Tampil Bersih"}</span>
          </button>

          {/* Admin Studio Publish to Showcase */}
          {isAdmin && <StudioPublishModal />}

          {/* Admin Quick Jump Pill (Executive Dual-Tone Badge) */}
          {isAdmin && (
            <Link
              href="/admin"
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs font-bold border transition-all duration-200 active:scale-95 shadow-sm
                bg-white text-neutral-900 border-amber-500/70 hover:bg-amber-500 hover:text-black hover:border-amber-600 hover:shadow-[0_0_14px_rgba(245,158,11,0.3)]
                dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/50 dark:hover:bg-amber-500 dark:hover:text-black dark:hover:border-amber-400"
              title="Buka Dashboard Admin & Workshop DTF"
            >
              <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-black/20 group-hover:text-black flex items-center justify-center transition-colors">
                <ShieldCheck size={12} className="stroke-[2.5]" />
              </div>
              <span className="hidden sm:inline font-extrabold tracking-tight">Panel Admin</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black font-mono">OPS</span>
            </Link>
          )}

          {/* Lab Kain 3D Modal Trigger */}
          <button
            id="studio-btn-labkain"
            onClick={toggleClothLab}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent transition-all font-sans text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
            title="Laboratorium Uji Kain 3D & Simulasi Fisika"
            aria-label="Buka Laboratorium Kain 3D"
          >
            <FlaskConical size={14} className="text-brand-accent" />
            <span className="hidden md:inline">Lab Kain</span>
          </button>

          {/* Tombol Simpan ke Gang Sheet (Bila dibuka dari mode Gang Sheet atau Admin) */}
          {isGangsheetMode && (
            <button
              onClick={handleSimpanKeGangSheetVault}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black transition-all font-sans text-xs font-black cursor-pointer shadow-md active:scale-95 border border-amber-500"
              title="Simpan desain aktif ini ke Bank Desain Gang Sheet"
              aria-label="Simpan ke Gang Sheet"
            >
              <Printer size={14} />
              <span className="inline font-black">Simpan ke Gang Sheet</span>
            </button>
          )}

          {/* Ekspor Studio Modal Trigger */}
          <button
            id="studio-btn-ekspor"
            onClick={toggleExportModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-brand-accent text-canvas hover:brightness-110 transition-all font-sans text-xs font-semibold cursor-pointer shadow-[0_0_12px_rgba(37,99,235,0.35)] active:scale-95"
            title="Ekspor Mockup 2K & Kartu Medsos"
            aria-label="Buka Ekspor Mockup"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Ekspor</span>
          </button>

          {/* User Account: Langsung ke Dashboard saat login, atau buka modal saat belum login */}
          {session?.user ? (
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-sans text-xs font-semibold border bg-surface border-brand-accent/40 text-brand-accent font-bold hover:bg-brand-accent/10 transition-all cursor-pointer active:scale-95 shadow-sm"
              title={`Dashboard Pesanan: ${session.user.name}`}
              aria-label="Buka Dashboard Pesanan"
            >
              <UserIcon size={14} />
              <span className="hidden sm:inline">
                {session.user.name?.split(" ")[0]}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-sans text-xs font-semibold border bg-surface border-border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Masuk / Akun Saya"
              aria-label="Masuk Akun Pengguna"
            >
              <UserIcon size={14} />
              <span className="hidden sm:inline">Masuk</span>
            </button>
          )}
        </div>
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
        <div id="studio-canvas-stage" className="contents">
          <CanvasErrorBoundary
            fallback={
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-canvas">
                <div className="max-w-md p-6 rounded-3xl bg-surface/80 border border-border-subtle shadow-xl backdrop-blur-md space-y-3">
                  <p className="text-sm font-bold text-amber-400">Akselerasi Grafis 3D Mengalami Kendala</p>
                  <p className="text-xs text-text-muted">
                    WebGL driver browser sempat mereset kanvas 3D. Segarkan tampilan untuk melanjutkan kustomisasi desain Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md"
                  >
                    Segarkan Studio 3D (F5)
                  </button>
                </div>
              </div>
            }
          >
            <CanvasStage />
          </CanvasErrorBoundary>
        </div>
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

      {/* Cart Drawer for Studio Order Checkout */}
      <CartDrawer />

      {/* User Auth & Dashboard Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Laboratorium Kain 3D Modal */}
      <ClothLabModal />

      {/* Unified Export Studio Modal */}
      <ExportStudioModal />
    </main>
  );
}
