// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (TAB 3: SIMPAN & EKSPOR).
// Presentasional murni: state berasal dari useConfiguratorStore via props.
// Desain Tier-1 Startup Studio: Bersih, langsung pada fungsi ekspor, zero AI-slop, zero marketing fluff.

"use client";

import React from "react";
import {
  Lock,
  Bookmark,
  Shirt,
  Copy,
  Trash2,
  Building2,
  Scissors,
  Download,
  Camera,
  Video,
  FolderOpen,
  ArrowUpRight,
} from "lucide-react";
import type { SavedMockupDesign } from "@/lib/constants";
import type { StudioTab, Export360Format } from "./studioDrawerTypes";

export interface SimpanEksporTabContentProps {
  activeTab: StudioTab;
  setActiveTab: (t: StudioTab) => void;
  optionSubMode: "saved" | "export";
  setOptionSubMode: (m: "saved" | "export") => void;
  savedDesigns: SavedMockupDesign[];
  session: unknown;
  setIsAuthOpen: (open: boolean) => void;
  designTitleInput: string;
  setDesignTitleInput: (v: string) => void;
  handleSaveDesign: () => void;
  enhancementMessage: string | null;
  loadSavedDesign: (id: string) => void;
  duplicateSavedDesign: (id: string) => void;
  deleteSavedDesign: (id: string) => void;
  exportBgMode: "studio" | "transparent";
  setExportBgMode: (m: "studio" | "transparent") => void;
  exportResolution: "standard" | "hd" | "2k";
  setExportResolution: (r: "standard" | "hd" | "2k") => void;
  toggleExportModal: () => void;
  handleExportFrontPNG: (viewName: string) => void;
  handleExportBackPNG: (viewName: string) => void;
  handleExportCurrentPNG: (viewName: string) => void;
  isExportingImage: boolean;
  handleShareMockup: () => void;
  isSharing: boolean;
  export360Format: Export360Format;
  setExport360Format: (f: Export360Format) => void;
  isRecording360: boolean;
  recordingProgress: number;
  handleExport360Video: () => void;
  handleCopyShareLink: () => void;
  copiedLink: boolean;
  handleSendToWhatsApp: () => void;
}

export const SimpanEksporTabContent: React.FC<SimpanEksporTabContentProps> = ({
  activeTab,
  setActiveTab,
  optionSubMode,
  setOptionSubMode,
  savedDesigns,
  session,
  setIsAuthOpen,
  designTitleInput,
  setDesignTitleInput,
  handleSaveDesign,
  enhancementMessage,
  loadSavedDesign,
  duplicateSavedDesign,
  deleteSavedDesign,
  exportBgMode,
  setExportBgMode,
  exportResolution,
  setExportResolution,
  toggleExportModal,
  handleExportFrontPNG,
  handleExportBackPNG,
  handleExportCurrentPNG,
  isExportingImage,
  export360Format,
  setExport360Format,
  isRecording360,
  recordingProgress,
  handleExport360Video,
}) => {
  const isExportActive = optionSubMode === "export" || activeTab === "export";

  return (
    <div className="space-y-3 pb-3">
      {/* Top Segmented Control (Pill switcher) */}
      <div className="flex p-1 bg-surface/90 rounded-xl border border-border-subtle gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setActiveTab("options");
            setOptionSubMode("export");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            isExportActive
              ? "bg-brand-accent text-canvas shadow-sm font-bold"
              : "text-text-muted hover:text-text-primary hover:bg-surface/50"
          }`}
        >
          <Download size={13} />
          <span>Ekspor Mockup</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("options");
            setOptionSubMode("saved");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            !isExportActive
              ? "bg-brand-accent text-canvas shadow-sm font-bold"
              : "text-text-muted hover:text-text-primary hover:bg-surface/50"
          }`}
        >
          <FolderOpen size={13} />
          <span>Desain Saya</span>
          {savedDesigns.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                !isExportActive ? "bg-white/20 text-white" : "bg-surface text-text-muted border border-border-subtle"
              }`}
            >
              {savedDesigns.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUBMODE: EKSPOR MOCKUP                                   */}
      {/* ======================================================== */}
      {isExportActive && (
        <div className="space-y-3">
          {/* Quick Image Export Panel */}
          <div className="p-3.5 rounded-2xl bg-surface/80 border border-border-subtle space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono text-text-primary flex items-center gap-1.5">
                <Camera size={13} className="text-brand-accent" />
                <span>EKSPOR GAMBAR (PNG)</span>
              </span>
            </div>

            {/* Background Mode Toggle */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-sans font-medium text-text-muted">
                Latar Belakang:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportBgMode("studio")}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-all border flex items-center justify-center gap-1.5 ${
                    exportBgMode === "studio"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold"
                      : "bg-surface/50 border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Building2 size={12} />
                  <span>Latar Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportBgMode("transparent")}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-all border flex items-center justify-center gap-1.5 ${
                    exportBgMode === "transparent"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold"
                      : "bg-surface/50 border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Scissors size={12} />
                  <span>Transparan</span>
                </button>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-sans font-medium text-text-muted">
                Resolusi Render:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "standard", label: "1K", sub: "1000px" },
                    { id: "hd", label: "HD", sub: "1920px" },
                    { id: "2k", label: "2K Ultra", sub: "2048px" },
                  ] as const
                ).map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setExportResolution(res.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all border ${
                      exportResolution === res.id
                        ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold"
                        : "bg-surface/50 border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <div className="text-[10.5px] font-mono leading-tight">{res.label}</div>
                    <div className="text-[9px] opacity-65 leading-tight">{res.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Angle Preset Capture Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleExportFrontPNG("front-view")}
                disabled={isExportingImage}
                className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-xs font-medium text-text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                <Camera size={13} className="text-brand-accent" />
                <span>Tampak Depan</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportBackPNG("back-view")}
                disabled={isExportingImage}
                className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-xs font-medium text-text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                <Camera size={13} className="text-brand-accent" />
                <span>Tampak Belakang</span>
              </button>
            </div>

            {/* Direct Download Angle Button */}
            <button
              type="button"
              onClick={() => void handleExportCurrentPNG("current-view")}
              disabled={isExportingImage}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-semibold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={14} />
              <span>
                {isExportingImage
                  ? "Merender Foto Mockup..."
                  : `Unduh Sudut Saat Ini (${exportResolution.toUpperCase()})`}
              </span>
            </button>
          </div>

          {/* Quick Turntable Video Section */}
          <div className="p-3.5 rounded-2xl bg-surface/80 border border-border-subtle space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono text-text-primary flex items-center gap-1.5">
                <Video size={13} className="text-purple-400" />
                <span>VIDEO PUTAR 360° (TURNTABLE)</span>
              </span>
            </div>

            {/* Format Choice */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "mp4", label: "MP4", hint: "IG / Reels" },
                  { id: "webm", label: "WebM", hint: "Web" },
                  { id: "gif", label: "GIF", hint: "Stiker" },
                ] as Array<{ id: Export360Format; label: string; hint: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setExport360Format(f.id)}
                  disabled={isRecording360}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all disabled:opacity-50 ${
                    export360Format === f.id
                      ? "bg-purple-500/15 border-purple-500 text-purple-400 font-bold"
                      : "bg-surface/50 border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="block text-[10.5px] font-mono leading-tight">{f.label}</span>
                  <span className="block text-[9px] opacity-70 leading-tight">{f.hint}</span>
                </button>
              ))}
            </div>

            {/* Video Record Button with Live Progress */}
            <button
              type="button"
              onClick={handleExport360Video}
              disabled={isRecording360}
              className="w-full py-2.5 px-4 rounded-xl bg-surface/90 border border-purple-500/40 hover:bg-purple-500/10 text-purple-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
            >
              <Video size={14} className={isRecording360 ? "animate-spin text-purple-400" : ""} />
              <span>
                {isRecording360
                  ? `Merekam 360° (${recordingProgress}%)...`
                  : `Rekam Video 360° ${export360Format.toUpperCase()}`}
              </span>
            </button>
            {isRecording360 && (
              <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-150 rounded-full"
                  style={{ width: `${recordingProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Clean Dialog Launcher Button */}
          <button
            type="button"
            onClick={toggleExportModal}
            className="w-full py-2 px-3 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/40 text-text-muted hover:text-text-primary text-xs font-medium transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <span>Buka Studio Ekspor Lengkap</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMODE: DESAIN TERSIMPAN                                */}
      {/* ======================================================== */}
      {!isExportActive && (
        <>
          {!session ? (
            <div className="p-6 rounded-2xl bg-surface/80 border border-brand-accent/20 shadow-lg text-center space-y-4 my-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                <Lock size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text-primary font-mono tracking-wide">
                  LOGIN DIPERLUKAN
                </h4>
                <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                  Masuk ke akun Anda untuk menyimpan konfigurasi sablon dan mengakses mockup kapan saja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-semibold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                Masuk / Daftar Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Save Current Design Box */}
              <div className="p-3.5 rounded-2xl bg-surface/80 border border-border-subtle space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-text-primary">
                    SIMPAN DESAIN SAAT INI:
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {savedDesigns.length}/20 tersimpan
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={designTitleInput}
                    onChange={(e) => setDesignTitleInput(e.target.value)}
                    placeholder="Nama desain"
                    maxLength={60}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDesign}
                    className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-semibold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Bookmark size={13} />
                    <span>SIMPAN</span>
                  </button>
                </div>
                {enhancementMessage && (
                  <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                    {enhancementMessage}
                  </div>
                )}
              </div>

              {/* Saved Designs List */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-text-muted block font-bold">
                  KOLEKSI DESAIN ({savedDesigns.length}):
                </span>
                {savedDesigns.length > 0 ? (
                  savedDesigns.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-surface/90 border border-border-subtle flex items-center justify-between gap-3 hover:border-brand-accent/40 transition-all group shadow-sm"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                        {d.previewUrl ? (
                          <img
                            src={d.previewUrl}
                            alt={d.title}
                            className="w-12 h-12 rounded-lg object-contain bg-canvas/80 border border-border-subtle shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-lg border border-border-subtle flex items-center justify-center shrink-0"
                            style={{ backgroundColor: d.colorHex }}
                          >
                            <Shirt size={20} className="text-white/80" />
                          </div>
                        )}
                        <div className="overflow-hidden min-w-0">
                          <span className="block text-xs font-mono font-bold text-text-primary truncate">
                            {d.title}
                          </span>
                          <span className="block text-[10px] font-mono text-text-muted truncate">
                            {d.apparel.toUpperCase()} · {d.size} · {d.decals.length} Sablon
                          </span>
                          <span className="block text-[10px] font-mono text-brand-accent">
                            {d.savedAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadSavedDesign(d.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-[11px] font-mono font-bold text-brand-accent hover:bg-brand-accent hover:text-canvas transition-colors"
                          title="Muat ke Studio 3D"
                        >
                          MUAT
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateSavedDesign(d.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-subtle transition-all"
                          title="Duplikat Desain"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedDesign(d.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus Desain"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border-subtle text-text-muted font-mono text-xs">
                    Belum ada desain tersimpan. Kustomisasi mockup Anda lalu tekan SIMPAN di atas!
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
