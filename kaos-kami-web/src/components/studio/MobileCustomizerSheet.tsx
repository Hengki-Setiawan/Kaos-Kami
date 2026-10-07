// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (MOBILE BottomSheet).
//
// Presentasional murni: JSX mobile dipindah verbatim dari CustomizerDrawer.tsx,
// state berasal dari useConfiguratorStore yang sama via props (tanpa duplikasi).
// Footer order memakai ulang SimpanOrderFooter (varian mobile).
// Tanpa ubah pricing/gate/stok/checkout/2D-dewire — hanya relokasi.

"use client";

import React, { type Dispatch, type SetStateAction } from "react";
import {
  X,
  FlaskConical,
  PenTool,
  Trash2,
  Lock,
  Shirt,
  Copy,
  Download,
  Share2,
  Video,
} from "lucide-react";
import { APPAREL_CATALOG, type ApparelType, type DecalLayer, type SavedMockupDesign } from "@/lib/constants";
import { getApparelIcon } from "@/components/ui/ApparelIcons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SimpanOrderFooter } from "./SimpanOrderFooter";
import type { StudioTab, Export360Format, DrawerPricing } from "./studioDrawerTypes";

export interface MobileCustomizerSheetProps {
  isMobileCss: boolean;
  isDrawerHidden: boolean;
  toggleDrawerCollapsed: () => void;
  currentApparelName: string;
  activeTab: StudioTab;
  setActiveTab: (t: StudioTab) => void;
  handleTabChange: (t: StudioTab) => void;
  decals: DecalLayer[];
  selectedDecalId: string | null;
  setSelectedDecalId: (id: string | null) => void;
  activeApparel: ApparelType;
  setActiveApparel: (a: ApparelType) => void;
  decalSubMode: "standard" | "team";
  toggleClothLab: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  showTextInput: boolean;
  setShowTextInput: Dispatch<SetStateAction<boolean>>;
  customTextString: string;
  setCustomTextString: (v: string) => void;
  handleAddTextDecal: () => void;
  setIsImageEditorOpen: (open: boolean) => void;
  handleRemoveDecal: (id: string) => void;
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
  toggleExportModal: () => void;
  exportBgMode: "studio" | "transparent";
  setExportBgMode: (m: "studio" | "transparent") => void;
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
  pricing: DrawerPricing;
  selectedSize: string;
  showPriceBreakdown: boolean;
  setShowPriceBreakdown: (v: boolean) => void;
  openCheckoutWithMasterGate: () => void;
  isCurrentVariantOut: boolean;
}

export const MobileCustomizerSheet: React.FC<MobileCustomizerSheetProps> = ({
  isMobileCss,
  isDrawerHidden,
  toggleDrawerCollapsed,
  currentApparelName,
  activeTab,
  setActiveTab,
  handleTabChange,
  decals,
  selectedDecalId,
  setSelectedDecalId,
  activeApparel,
  setActiveApparel,
  decalSubMode,
  toggleClothLab,
  fileInputRef,
  showTextInput,
  setShowTextInput,
  customTextString,
  setCustomTextString,
  handleAddTextDecal,
  setIsImageEditorOpen,
  handleRemoveDecal,
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
  toggleExportModal,
  exportBgMode,
  setExportBgMode,
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
  pricing,
  selectedSize,
  showPriceBreakdown,
  setShowPriceBreakdown,
  openCheckoutWithMasterGate,
  isCurrentVariantOut,
}) => {
  return (
    <>
      {/* Mobile BottomSheet (vaul pattern) — SATU sumber: matchMedia 767px
          (useIsMobileCss), selaras `hidden md:block` drawer + `md:hidden` sheet. */}
      {isMobileCss && !isDrawerHidden && (
        <BottomSheet onClose={toggleDrawerCollapsed}>
          <div className="space-y-3 font-mono text-xs">
            {/* Header Mobile Sheet: Nama Produk + Tutup */}
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 animate-pulse" />
                <span className="font-sans font-bold text-xs uppercase text-text-primary truncate">
                  {currentApparelName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleDrawerCollapsed}
                  className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-[10px] font-bold flex items-center justify-center shrink-0"
                  title="Tutup sheet"
                  aria-label="Tutup panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* 3 Primary Tabs for Mobile */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-surface/80 rounded-xl border border-border-subtle" role="tablist" aria-label="Tab studio mobile">
              {[
                { id: "apparel", label: "PRODUK" },
                { id: "decals", label: `SABLON (${decals.length})` },
                { id: "options", label: "SIMPAN & EKSPOR" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => handleTabChange(t.id as any)}
                  className={`min-h-[38px] px-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center ${
                    activeTab === t.id
                      ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                      : "bg-surface border-transparent text-text-muted hover:text-text-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Isi tab di HP (audit #7 — sebelumnya cuma ringkasan). */}
            {activeTab === "apparel" && (
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(APPAREL_CATALOG) as Array<keyof typeof APPAREL_CATALOG>).map((type) => {
                  const info = APPAREL_CATALOG[type];
                  const locked = !info.mockupEnabled;
                  const comingSoon = !info.orderable;
                  const label =
                    type === "tshirt"
                      ? "T-Shirt"
                      : type === "longsleeve"
                      ? "Longsleeve"
                      : type === "crewneck"
                      ? "Sweater"
                      : type === "hoodie"
                      ? "Hoodie"
                      : type === "shirt"
                      ? "Jacket"
                      : type === "cap"
                      ? "Topi"
                      : type === "shorts"
                      ? "Shorts"
                      : "Celana";
                  const Icon = getApparelIcon(type as ApparelType);
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (!locked) setActiveApparel(type as any);
                      }}
                      disabled={locked}
                      aria-disabled={locked}
                      className={`relative min-h-[44px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 ${
                        activeApparel === type
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                          : locked
                            ? "bg-surface border-border-subtle text-text-muted opacity-40"
                            : "bg-surface border-border-subtle text-text-primary"
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="leading-tight">{label}</span>
                        <span className="text-[9px] font-bold text-brand-accent leading-none mt-0.5">
                          {info.basePriceIdr > 0 ? `Rp ${(info.basePriceIdr / 1000)}k` : "Mockup"}
                        </span>
                      </div>
                      {comingSoon && (
                        <span className="ml-1 px-1.5 py-px rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black inline-flex items-center gap-0.5">
                          {locked && <Lock size={8} />}
                          <span>SEGERA</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "decals" && (
              <div className="space-y-2">
                {/* Header Tab Sablon Mobile + Akses Cepat Lab Kain */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface/80 border border-border-subtle gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                    <span className="text-xs font-sans font-bold text-text-primary uppercase tracking-tight">
                      SABLON DTF ({decals.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleClothLab}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[10px] font-mono font-bold transition-all cursor-pointer"
                    title="Buka Lab Kain 3D & Simulasi Fisika"
                  >
                    <FlaskConical size={12} />
                    <span>LAB KAIN</span>
                  </button>
                </div>

                {/* Sub-mode 1: SABLON DTF Standard */}
                {((decalSubMode === "standard") || activeTab === "decals") && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-[11px] uppercase"
                      >
                        + UPLOAD LOGO
                      </button>
                      <button
                        onClick={() => setShowTextInput((v) => !v)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase"
                      >
                        + TEKS
                      </button>
                    </div>
                    {showTextInput && (
                      <div className="flex gap-2">
                        <input
                          value={customTextString}
                          onChange={(e) => setCustomTextString(e.target.value)}
                          placeholder="Tulis teks sablon…"
                          maxLength={24}
                          className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-base"
                        />
                        <button
                          onClick={handleAddTextDecal}
                          className="min-h-[44px] px-4 rounded-xl bg-brand-accent text-canvas font-bold text-[11px]"
                        >
                          OK
                        </button>
                      </div>
                    )}
                    {decals.length === 0 ? (
                      <p className="text-[11px] text-text-muted">Belum ada sablon. Upload logo atau tambah teks.</p>
                    ) : (
                      decals.map((d) => (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between p-2 rounded-xl border ${
                            selectedDecalId === d.id ? "border-brand-accent bg-brand-accent/10" : "border-border-subtle bg-surface"
                          }`}
                        >
                          <button onClick={() => setSelectedDecalId(d.id)} className="flex-1 text-left text-[11px] text-text-primary truncate min-h-[44px] flex items-center">
                            {d.name}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDecalId(d.id);
                              setIsImageEditorOpen(true);
                            }}
                            aria-label={`Edit gambar ${d.name}`}
                            title="Edit gambar (sesuaikan, potong, efek, hapus BG)"
                            className="min-w-[44px] min-h-[44px] px-2 text-brand-accent font-bold flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <PenTool size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveDecal(d.id)}
                            aria-label={`Hapus ${d.name}`}
                            className="min-w-[44px] min-h-[44px] px-2 text-rose-400 hover:text-rose-500 font-bold flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}


                {/* Banner & Trigger Lab Kain Fisika 3D di Mobile */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/25 flex items-center justify-between gap-3 my-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center shrink-0">
                      <FlaskConical size={16} className="text-brand-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-text-primary uppercase tracking-wider font-sans">
                        Lab Fisika & Uji Kain
                      </p>
                      <p className="text-[9px] text-text-muted truncate">
                        Simulasi angin, regang, senter & manekin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleClothLab}
                    className="px-3 py-1.5 rounded-lg bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-[10px] uppercase tracking-wider shrink-0 transition-transform active:scale-95 shadow-sm"
                  >
                    BUKA LAB
                  </button>
                </div>
              </div>
            )}

            {(activeTab === "options" || activeTab === "saved" || activeTab === "export") && (
              <div className="space-y-2">
                {/* Sub-mode Segmented Switcher on Mobile */}
                <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("options");
                      setOptionSubMode("saved");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      (optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
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
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      optionSubMode === "export" || activeTab === "export"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    EKSPOR MOCKUP
                  </button>
                </div>

            {/* Sub-mode: TERSIMPAN */}
            {((optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved") && (
              !session ? (
                <div className="p-5 rounded-2xl bg-surface/80 border border-brand-accent/30 shadow-lg text-center space-y-3 my-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_15px_rgba(230,81,0,0.2)]">
                    <Lock size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-text-primary font-mono tracking-wider">
                      LOGIN DIPERLUKAN
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                      Masuk ke akun Anda untuk menyimpan desain ke koleksi akun Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
                  >
                    MASUK / DAFTAR SEKARANG
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={designTitleInput}
                        onChange={(e) => setDesignTitleInput(e.target.value.slice(0, 60))}
                        placeholder="Nama desain…"
                        maxLength={60}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-base"
                      />
                      <button
                        onClick={handleSaveDesign}
                        className="min-h-[44px] px-4 rounded-xl bg-brand-accent text-canvas font-bold text-[11px]"
                      >
                        SIMPAN
                      </button>
                    </div>
                    {enhancementMessage && (
                      <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                        {enhancementMessage}
                      </div>
                    )}
                    {savedDesigns.length === 0 ? (
                      <p className="text-[11px] text-text-muted text-center py-4">Belum ada desain tersimpan.</p>
                    ) : (
                      savedDesigns.map((d) => (
                        <div
                          key={d.id}
                          className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            {d.previewUrl ? (
                              <img
                                src={d.previewUrl}
                                alt={d.title}
                                className="w-9 h-9 rounded-lg object-contain bg-canvas/80 border border-border-subtle shrink-0"
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded-lg border border-border-subtle flex items-center justify-center shrink-0"
                                style={{ backgroundColor: d.colorHex }}
                              >
                                <Shirt size={16} className="text-white/80" />
                              </div>
                            )}
                            <div className="overflow-hidden min-w-0">
                              <span className="block text-[11px] font-bold text-text-primary truncate">
                                {d.title}
                              </span>
                              <span className="block text-[9px] text-text-muted truncate">
                                {d.apparel.toUpperCase()} · {d.size}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => loadSavedDesign(d.id)}
                              className="px-2 py-1 rounded bg-brand-accent/15 text-brand-accent font-bold text-[10px]"
                            >
                              MUAT
                            </button>
                            <button
                              onClick={() => duplicateSavedDesign(d.id)}
                              className="p-1 rounded text-text-muted hover:text-text-primary"
                              title="Duplikat"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={() => deleteSavedDesign(d.id)}
                              className="p-1 rounded text-text-muted hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              )}

                {/* Sub-mode: EKSPOR */}
                {(optionSubMode === "export" || activeTab === "export") && (
                  <div className="space-y-2">
                    {/* Tombol Buka Studio Ekspor Terpadu Mobile */}
                    <button
                      type="button"
                      onClick={toggleExportModal}
                      className="w-full py-2.5 px-3 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-[10.5px] uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(230,81,0,0.3)] active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>BUKA STUDIO EKSPOR (2K / 360°)</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface/60 rounded-xl border border-border-subtle text-[10px]">
                      <button
                        type="button"
                        onClick={() => setExportBgMode("studio")}
                        className={`py-1 rounded-lg border text-center font-bold ${
                          exportBgMode === "studio"
                            ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted"
                        }`}
                      >
                        Latar Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportBgMode("transparent")}
                        className={`py-1 rounded-lg border text-center font-bold ${
                          exportBgMode === "transparent"
                            ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted"
                        }`}
                      >
                        Transparan (PNG)
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleExportFrontPNG("front-view")}
                        disabled={isExportingImage}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase disabled:opacity-50"
                      >
                        PNG DEPAN
                      </button>
                      <button
                        onClick={() => void handleExportBackPNG("back-view")}
                        disabled={isExportingImage}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase disabled:opacity-50"
                      >
                        PNG BELAKANG
                      </button>
                    </div>
                    <button
                      onClick={() => void handleExportCurrentPNG("current-view")}
                      disabled={isExportingImage}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-[11px] uppercase disabled:opacity-50"
                    >
                      {isExportingImage ? "MERENDER 2K HD..." : "UNDUH SAAT INI (2K HD)"}
                    </button>
                    <button
                      onClick={() => void handleShareMockup()}
                      disabled={isSharing}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Share2 size={13} />
                      <span>{isSharing ? "MENYIAPKAN KARTU…" : "BAGIKAN KARTU MOCKUP"}</span>
                    </button>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Format video 360">
                      {(["mp4", "webm", "gif"] as const).map((f) => (
                        <button
                          key={f}
                          role="radio"
                          aria-checked={export360Format === f}
                          onClick={() => setExport360Format(f)}
                          disabled={isRecording360}
                          className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-[11px] font-bold uppercase disabled:opacity-50 ${
                            export360Format === f
                              ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                              : "bg-surface border-border-subtle text-text-primary"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => void handleExport360Video()}
                      disabled={isRecording360}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Video size={13} />
                      <span>
                        {isRecording360
                          ? `MEREKAM 360° ${export360Format.toUpperCase()} (${recordingProgress}%)…`
                          : `EKSPOR 360° ${export360Format.toUpperCase()}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <SimpanOrderFooter
              variant="mobile"
              pricing={pricing}
              currentApparelName={currentApparelName}
              selectedSize={selectedSize}
              showPriceBreakdown={showPriceBreakdown}
              setShowPriceBreakdown={setShowPriceBreakdown}
              openCheckoutWithMasterGate={openCheckoutWithMasterGate}
              isCurrentVariantOut={isCurrentVariantOut}
            />
            <p className="text-[10px] text-text-muted text-center">Geser handle di atas untuk peek / half / full — vaul pattern aktif di mobile</p>
          </div>
        </BottomSheet>
      )}
    </>
  );
};
