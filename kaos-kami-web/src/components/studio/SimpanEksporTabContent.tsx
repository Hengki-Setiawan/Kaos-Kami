// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (TAB 3: SIMPAN & EKSPOR).
//
// Presentasional murni: JSX dipindah verbatim dari CustomizerDrawer.tsx,
// state berasal dari useConfiguratorStore yang sama via props (tanpa duplikasi).
// Tanpa ubah pricing/gate/stok/checkout/2D-dewire — hanya relokasi.

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
  Sparkles,
  Download,
  Camera,
  Share2,
  Video,
  Check,
  MessageCircle,
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
  handleShareMockup,
  isSharing,
  export360Format,
  setExport360Format,
  isRecording360,
  recordingProgress,
  handleExport360Video,
  handleCopyShareLink,
  copiedLink,
  handleSendToWhatsApp,
}) => {
  return (
    <>
      {/* Sub-mode Segmented Pill Switcher */}
      <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1 mb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("options");
            setOptionSubMode("saved");
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
            (optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-surface"
          }`}
        >
          DESAIN SAYA ({savedDesigns.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("options");
            setOptionSubMode("export");
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
            optionSubMode === "export" || activeTab === "export"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-surface"
          }`}
        >
          EKSPOR MOCKUP
        </button>
      </div>

      {/* Sub-mode: TERSIMPAN (DESAIN SAYA) */}
      {((optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved") && (
        !session ? (
          <div className="p-6 rounded-2xl bg-surface/80 border border-brand-accent/30 shadow-xl text-center space-y-4 my-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_20px_rgba(230,81,0,0.2)]">
              <Lock size={26} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-text-primary font-mono tracking-wider">
                LOGIN DIPERLUKAN
              </h4>
              <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                Masuk ke akun Anda untuk menyimpan mockup ke koleksi akun Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] active:scale-98 flex items-center justify-center space-x-2"
            >
              <span>MASUK / DAFTAR SEKARANG</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
              {/* Save Current Design Box */}
              <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-text-primary">
                    SIMPAN DESAIN SAAT INI:
                  </span>
                  <span className="text-[10px] font-mono text-text-muted text-right leading-tight">
                    {savedDesigns.length}/20 lokal
                    <br />
                    <span className="opacity-75">server: maks 5/akun</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={designTitleInput}
                    onChange={(e) => setDesignTitleInput(e.target.value)}
                    placeholder="mis. Kaos Komunitas Makassar 01"
                    maxLength={60}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                  <button
                    onClick={handleSaveDesign}
                    className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-md active:scale-95"
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
                  DESAIN TERSIMPAN ({savedDesigns.length}):
                </span>
                {savedDesigns.length > 0 ? (
                  savedDesigns.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-3 hover:border-brand-accent/40 transition-all group"
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
                          onClick={() => loadSavedDesign(d.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-[11px] font-mono font-bold text-brand-accent hover:bg-brand-accent hover:text-canvas transition-colors"
                          title="Muat ke Studio 3D"
                        >
                          MUAT
                        </button>
                        <button
                          onClick={() => duplicateSavedDesign(d.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-subtle transition-all"
                          title="Duplikat Desain"
                        >
                          <Copy size={13} />
                        </button>
                        <button
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
          )
        )}

        {/* Sub-mode: EKSPOR MOCKUP */}
        {(optionSubMode === "export" || activeTab === "export") && (
          <div className="space-y-4 py-1">
            {/* Opsi Format & Kualitas */}
            <div className="p-3.5 rounded-xl bg-surface/70 border border-border-subtle space-y-2.5">
              <span className="text-[10px] font-sans font-bold text-text-muted uppercase tracking-wider block">
                PENGATURAN EKSPOR GAMBAR:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportBgMode("studio")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border text-center ${
                    exportBgMode === "studio"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Building2 size={13} />
                    <span>Latar Studio</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportBgMode("transparent")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border text-center ${
                    exportBgMode === "transparent"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Scissors size={13} />
                    <span>Transparan (PNG)</span>
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportResolution("standard")}
                  aria-pressed={exportResolution === "standard"}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all border text-center ${
                    exportResolution === "standard"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  Standar (1K)
                </button>
                <button
                  type="button"
                  onClick={() => setExportResolution("hd")}
                  aria-pressed={exportResolution === "hd"}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all border text-center ${
                    exportResolution === "hd"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  HD (1920)
                </button>
                <button
                  type="button"
                  onClick={() => setExportResolution("2k")}
                  aria-pressed={exportResolution === "2k"}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all border text-center ${
                    exportResolution === "2k"
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Sparkles size={11} />
                    <span>Ultra HD (2K)</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Tombol Buka Studio Ekspor Terpadu */}
            <button
              type="button"
              onClick={toggleExportModal}
              className="w-full py-3 px-4 rounded-2xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(230,81,0,0.35)] active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Download size={14} />
              <span>BUKA STUDIO EKSPOR (2K / MEDSOS / 360°)</span>
            </button>

            {/* Unduh Gambar Mockup */}
            <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
              <span className="text-xs font-mono font-bold text-text-primary block">
                UNDUH GAMBAR MOCKUP HD:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => void handleExportFrontPNG("front-view")}
                  disabled={isExportingImage}
                  className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1 disabled:opacity-50"
                >
                  <Camera size={16} className="text-brand-accent" />
                  <span>TAMPAK DEPAN</span>
                </button>

                <button
                  onClick={() => void handleExportBackPNG("back-view")}
                  disabled={isExportingImage}
                  className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1 disabled:opacity-50"
                >
                  <Camera size={16} className="text-brand-accent" />
                  <span>TAMPAK BELAKANG</span>
                </button>
              </div>

              <button
                onClick={() => void handleExportCurrentPNG("current-view")}
                disabled={isExportingImage}
                className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] disabled:opacity-50"
              >
                {isExportingImage ? "MERENDER 2K HD..." : "UNDUH TAMPILAN INI (2K HD)"}
              </button>

              <button
                onClick={() => void handleShareMockup()}
                disabled={isSharing}
                className="w-full py-3.5 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-sans font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Share2 size={15} />
                <span>{isSharing ? "MENYIAPKAN KARTU…" : "BAGIKAN KARTU MOCKUP"}</span>
              </button>

              {/* 360° Turntable Video Exporter */}
              <div className="space-y-2 pt-1 border-t border-border-subtle/50">
                <span className="block text-[10px] font-sans text-text-muted font-bold uppercase">
                  FORMAT VIDEO 360°:
                </span>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Format video 360">
                  {(
                    [
                      { id: "mp4", label: "MP4", hint: "TikTok/IG" },
                      { id: "webm", label: "WebM", hint: "Web" },
                      { id: "gif", label: "GIF", hint: "Chat/Stiker" },
                    ] as Array<{ id: Export360Format; label: string; hint: string }>
                  ).map((f) => (
                    <button
                      key={f.id}
                      role="radio"
                      aria-checked={export360Format === f.id}
                      onClick={() => setExport360Format(f.id)}
                      disabled={isRecording360}
                      className={`py-2 px-1 rounded-xl border text-center transition-all disabled:opacity-50 ${
                        export360Format === f.id
                          ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <span className="block text-[11px] font-mono font-bold">{f.label}</span>
                      <span className="block text-[9px] font-mono opacity-75">{f.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExport360Video}
                disabled={isRecording360}
                className="w-full py-3.5 px-4 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-sans font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Video size={16} className={isRecording360 ? "animate-pulse text-red-500" : ""} />
                <span>
                  {isRecording360
                    ? `MEREKAM 360° ${export360Format.toUpperCase()} (${recordingProgress}%)...`
                    : `EKSPOR 360° ${export360Format.toUpperCase()} (±5 DETIK)`}
                </span>
              </button>
            </div>

            {/* 2. Share & Order Inquiry Suite */}
            <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
              <span className="text-xs font-mono font-bold text-text-primary block">
                BAGIKAN DESAIN:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyShareLink}
                  className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex items-center justify-center space-x-1.5"
                >
                  {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  <span>{copiedLink ? "LINK TERSALIN!" : "SALIN LINK"}</span>
                </button>

                <button
                  onClick={handleSendToWhatsApp}
                  className="py-2.5 px-2 rounded-xl bg-[#25D366]/20 border border-[#25D366]/50 hover:bg-[#25D366] text-text-primary hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5"
                >
                  <MessageCircle size={14} className="text-[#25D366] group-hover:text-white" />
                  <span>PESAN VIA WA</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};
