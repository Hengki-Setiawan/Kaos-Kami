// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (TAB 2: SABLON DTF).
//
// Presentasional murni: JSX dipindah verbatim dari CustomizerDrawer.tsx,
// state berasal dari useConfiguratorStore yang sama via props (tanpa duplikasi).
// Tanpa ubah pricing/gate/stok/checkout/2D-dewire — hanya relokasi.

"use client";

import React, { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Upload,
  Trash2,
  Copy,
  FlaskConical,
  Type,
  Sparkles,
  ShieldCheck,
  Wand2,
  Loader2,
  Sliders,
  Move,
  RotateCw,
  ChevronDown,
  Ruler,
} from "lucide-react";
import {
  validSidesFor,
  type ApparelType,
  type CameraViewPreset,
  type DecalLayer,
  type DecalTargetSide,
} from "@/lib/constants";
import {
  maxDecalScaleUnits,
  fitScaleToSideBox,
  getDecalAspect,
  APPAREL_PHYSICAL_SPECS,
  DECAL_MOVE_LIMITS,
  clampDecalXY,
} from "@/lib/scaleCalibration";
import { classifyPrintTierByCm, printTierCost, PRINT_TIER_LABEL } from "@/lib/printTiers";
import { FONT_PRESETS, type TextDecalOptions } from "@/lib/typography/textDecalGenerator";
import type { LogoPresetIndex } from "@/store/useConfiguratorStore";
import type {
  StudioTab,
  DrawerPricing,
  DrawerPhysicalDimensions,
  DrawerQualityReport,
} from "./studioDrawerTypes";

export interface SablonTabContentProps {
  activeTab: StudioTab;
  decalSubMode: "standard" | "team";
  decals: DecalLayer[];
  selectedDecalId: string | null;
  setSelectedDecalId: (id: string | null) => void;
  activeDecal: DecalLayer | undefined;
  activeApparel: ApparelType;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showTextInput: boolean;
  setShowTextInput: Dispatch<SetStateAction<boolean>>;
  customTextString: string;
  setCustomTextString: (v: string) => void;
  customTextFont: TextDecalOptions["fontFamily"];
  setCustomTextFont: (f: TextDecalOptions["fontFamily"]) => void;
  customTextColor: string;
  setCustomTextColor: (c: string) => void;
  setHasManuallyPickedTextColor: (b: boolean) => void;
  customTextShadow: boolean;
  setCustomTextShadow: (b: boolean) => void;
  handleAddTextDecal: () => void;
  pricingDecalLayers: DrawerPricing["decalLayers"];
  updateDecal: (id: string, partial: Partial<DecalLayer>) => void;
  setCameraPreset: (preset: CameraViewPreset | null) => void;
  physicalDimensions: DrawerPhysicalDimensions | null;
  qualityReport: DrawerQualityReport | null;
  enhancementMessage: string | null;
  setIsImageEditorOpen: (open: boolean) => void;
  showBgRemover: boolean;
  setShowBgRemover: Dispatch<SetStateAction<boolean>>;
  bgTarget: "white" | "black";
  setBgTarget: (t: "white" | "black") => void;
  bgTolerance: number;
  setBgTolerance: (n: number) => void;
  isEnhancingImage: boolean;
  handleRemoveWhiteBg: () => void;
  handleRestoreOriginal: () => void;
  hasOriginalMaster: (id: string) => boolean;
  applyLogoPreset: (posIndex?: LogoPresetIndex) => void;
  handleRemoveDecal: (id: string) => void;
  handleDuplicateDecal: (id: string) => void;
  handleEditTextDecal: (id: string) => void;
  toggleClothLab: () => void;
}

export const SablonTabContent: React.FC<SablonTabContentProps> = ({
  activeTab,
  decalSubMode,
  decals,
  selectedDecalId,
  setSelectedDecalId,
  activeDecal,
  activeApparel,
  fileInputRef,
  handleFileUpload,
  showTextInput,
  setShowTextInput,
  customTextString,
  setCustomTextString,
  customTextFont,
  setCustomTextFont,
  customTextColor,
  setCustomTextColor,
  setHasManuallyPickedTextColor,
  customTextShadow,
  setCustomTextShadow,
  handleAddTextDecal,
  pricingDecalLayers,
  updateDecal,
  setCameraPreset,
  physicalDimensions,
  qualityReport,
  enhancementMessage,
  setIsImageEditorOpen,
  showBgRemover,
  setShowBgRemover,
  bgTarget,
  setBgTarget,
  bgTolerance,
  setBgTolerance,
  isEnhancingImage,
  handleRemoveWhiteBg,
  handleRestoreOriginal,
  hasOriginalMaster,
  applyLogoPreset,
  handleRemoveDecal,
  handleDuplicateDecal,
  handleEditTextDecal,
  toggleClothLab,
}) => {
  // Bab 52/53 (4) — Smart Zone: tooltip saat seret melewati batas dada.
  const [smartZoneHint, setSmartZoneHint] = useState<string | null>(null);
  const smartZoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSmartZone = () => {
    setSmartZoneHint("Maksimal Lebar Sablon A3 (30 cm)");
    if (smartZoneTimer.current) clearTimeout(smartZoneTimer.current);
    smartZoneTimer.current = setTimeout(() => setSmartZoneHint(null), 2500);
  };
  return (
    <>
      {/* Header Tab Sablon + Akses Cepat Lab Kain */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface/80 border border-border-subtle gap-2 mb-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          <span className="text-xs font-sans font-bold text-text-primary uppercase tracking-tight">
            SABLON DTF ({decals.length})
          </span>
        </div>
        <button
          type="button"
          onClick={toggleClothLab}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[11px] font-mono font-bold transition-all cursor-pointer"
          title="Buka Lab Kain 3D & Simulasi Fisika"
        >
          <FlaskConical size={12} />
          <span>LAB KAIN</span>
        </button>
      </div>

      {/* Sub-mode 1: SABLON DTF Standard */}
      {((decalSubMode === "standard") || activeTab === "decals") && (
        <>
      {/* Add Decal & Text Creation Suite */}
      <div className="space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl border border-dashed border-border-subtle hover:border-brand-accent bg-surface/50 text-[11px] font-mono text-text-primary transition-all hover:bg-surface font-bold shadow-sm cursor-pointer"
          >
            <Upload size={13} className="text-brand-accent" />
            <span>+ UPLOAD GAMBAR</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTextInput(!showTextInput)}
            className={`flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl border border-dashed text-[11px] font-mono transition-all font-bold shadow-sm cursor-pointer ${
              showTextInput
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                : "border-border-subtle hover:border-brand-accent bg-surface/50 text-text-primary hover:bg-surface"
            }`}
          >
            <Type size={13} className="text-brand-accent" />
            <span>+ TULIS TEKS 3D</span>
          </button>
        </div>

        {/* Interactive Text Generator Drawer Input */}
        {showTextInput && (
          <div className="p-3.5 rounded-xl bg-surface/80 border border-brand-accent/30 space-y-3 animate-fadeIn font-mono text-xs">
            <div>
              <label className="block text-[10px] text-text-muted uppercase mb-1 font-bold">
                Ketik Tulisan / Quotes / Nama:
              </label>
              <input
                type="text"
                value={customTextString}
                onChange={(e) => setCustomTextString(e.target.value)}
                placeholder="mis. MAKASSAR NEVER DIES"
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted uppercase mb-1">
                  Pilihan Font:
                </label>
                <select
                  value={customTextFont}
                  onChange={(e) => setCustomTextFont(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-canvas border border-border-subtle text-text-primary text-[10px] focus:outline-none focus:border-brand-accent"
                >
                  {FONT_PRESETS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted uppercase mb-1">
                  Warna Font:
                </label>
                <div className="flex items-center space-x-1.5">
                  {["#FFFFFF", "#000000", "#E65100", "#FFD700", "#E53935", "#1E88E5"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCustomTextColor(c);
                        setHasManuallyPickedTextColor(true);
                      }}
                      className={`w-5 h-5 rounded-full border ${
                        customTextColor === c ? "border-brand-accent ring-2 ring-brand-accent/40" : "border-border-strong"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* M3.4 — Shadow teks opsional, default MATI (DTF jujur). */}
            <label className="flex items-center gap-2 text-[11px] text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customTextShadow}
                onChange={(e) => setCustomTextShadow(e.target.checked)}
                className="accent-brand-accent w-4 h-4"
              />
              <span>Bayangan Teks (Shadow)</span>
            </label>

            <button
              type="button"
              onClick={handleAddTextDecal}
              className="w-full py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>PASANG TEKS DI KAOS 3D</span>
            </button>
          </div>
        )}
      </div>

      {/* Decal Layer List */}
      {decals.length > 0 ? (
        <div className="space-y-3">
          <span className="block text-[11px] font-sans text-text-muted font-bold uppercase tracking-wider">
            LAPISAN SABLON AKTIF ({decals.length}):
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {decals.map((d, index) => {
              const sablonInfo = pricingDecalLayers.find((s) => s.id === d.id);
              const isSelected = (selectedDecalId ?? decals[0]?.id) === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDecalId(d.id);
                    // Klik layer → auto-pivot kamera ke sisi sablon (UI-only;
                    // pakai setCameraPreset existing, logika sama dengan
                    // tombol posisi :394-400).
                    if (d.targetSide === "left_sleeve" || d.targetSide === "side_left") {
                      setCameraPreset("left");
                    } else if (d.targetSide === "right_sleeve" || d.targetSide === "side_right") {
                      setCameraPreset("right");
                    } else if (d.targetSide === "back" || d.targetSide === "hood") {
                      setCameraPreset("back");
                    } else {
                      setCameraPreset("front");
                    }
                  }}
                  title={`Pilih layer #${index + 1} & arahkan kamera ke ${d.targetSide}`}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all shrink-0 ${
                    isSelected
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>#{index + 1} {d.targetSide.toUpperCase()}</span>
                  {sablonInfo?.tier && (
                    <span className="text-[10px] opacity-75 font-normal">({sablonInfo.tier})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Decal Transformation & Inspector Card */}
          {activeDecal && (
            <div className="p-3.5 rounded-2xl glass-panel border border-border-subtle space-y-3.5">
              {/* Header: Decal Name + Delete (Saklar Gizmo SSOT tunggal di StudioHUD) */}
              <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                <span className="font-mono text-xs font-bold text-text-primary truncate max-w-[170px]" title={activeDecal.name}>
                  {activeDecal.name}
                </span>
                <div className="flex items-center space-x-1.5">
                  {activeDecal.textMetadata && (
                    <button
                      type="button"
                      onClick={() => handleEditTextDecal(activeDecal.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all cursor-pointer text-[10px] font-mono font-bold"
                      title={`Edit teks: "${activeDecal.textMetadata.text}"`}
                    >
                      <Type size={13} />
                      <span>EDIT TEKS</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDuplicateDecal(activeDecal.id)}
                    className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all cursor-pointer"
                    title="Duplikat lapisan ini (geser X+0.05)"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveDecal(activeDecal.id)}
                    className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-rose-400 hover:border-rose-400/40 transition-all cursor-pointer"
                    title="Hapus sablon ini"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Placement Selector & Real Dimensions — SSOT validSidesFor (Depan, Belakang, Samping Kiri/Kanan, Lengan, Tudung) */}
              <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-sans text-text-muted font-bold uppercase tracking-wider">
                    POSISI SABLON:
                  </span>
                  {physicalDimensions && (
                    <span className="text-[11px] font-mono font-bold text-brand-accent">
                      {physicalDimensions.widthCm} × {physicalDimensions.heightCm} cm
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 font-mono text-[10px]">
                  {(
                    [
                      {
                        id: "front" as DecalTargetSide,
                        label: activeApparel === "cap" ? "MAHKOTA DPN" : activeApparel === "pants" || activeApparel === "shorts" ? "PAHA DPN" : "DADA",
                      },
                      {
                        id: "back" as DecalTargetSide,
                        label: activeApparel === "cap" ? "MAHKOTA BLK" : activeApparel === "pants" || activeApparel === "shorts" ? "PAHA BLK" : "PUNGGUNG",
                      },
                      { id: "side_left" as DecalTargetSide, label: activeApparel === "pants" || activeApparel === "shorts" ? "STRIP KIRI" : "SMPG KIRI" },
                      { id: "side_right" as DecalTargetSide, label: activeApparel === "pants" || activeApparel === "shorts" ? "STRIP KANAN" : "SMPG KANAN" },
                      { id: "left_sleeve" as DecalTargetSide, label: "LGN KIRI" },
                      { id: "right_sleeve" as DecalTargetSide, label: "LGN KANAN" },
                      { id: "hood" as DecalTargetSide, label: "TUDUNG" },
                    ]
                  )
                    .filter((side) =>
                      (validSidesFor(activeApparel) as string[]).includes(side.id)
                    )
                    .map((side) => (
                      <button
                        key={side.id}
                        type="button"
                        onClick={() => {
                          // Auto-frame kamera ke sisi yang dipilih agar pengguna langsung melihat hasilnya
                          if (side.id === "left_sleeve" || side.id === "side_left") {
                            setCameraPreset("left");
                          } else if (side.id === "right_sleeve" || side.id === "side_right") {
                            setCameraPreset("right");
                          } else if (side.id === "back" || side.id === "hood") {
                            setCameraPreset("back");
                          } else if (side.id === "front") {
                            setCameraPreset("front");
                          }

                          // Koordinat awal cerdas: pusatkan decal di area sablon sisi yang dipilih
                          let newX = 0;
                          let newY = 0;
                          if (side.id === "side_left" || side.id === "side_right") {
                            newY = activeApparel === "pants" ? 0.0 : -0.05;
                          } else if (side.id === "left_sleeve" || side.id === "right_sleeve") {
                            newY = 0.02;
                          } else if (side.id === "front" || side.id === "back") {
                            if (activeApparel === "pants" || activeApparel === "shorts") {
                              newX = -0.11; // Presisi paha kiri (menghindari celah selangkangan)
                              newY = activeApparel === "pants" ? 0.05 : 0.0;
                            } else if (activeApparel === "cap") {
                              newX = 0;
                              newY = side.id === "front" ? -0.01 : 0.0;
                            } else {
                              newY = -0.05;
                            }
                          }

                          updateDecal(activeDecal.id, {
                            targetSide: side.id,
                            x: newX,
                            y: newY,
                          });
                        }}
                        className={`py-1.5 px-1 rounded-lg border font-bold text-center transition-all ${
                          activeDecal.targetSide === side.id
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
                        }`}
                      >
                        {side.label}
                      </button>
                    ))}
                </div>

                {/* Detail dimensi fisik terpadu di dalam kartu posisi sablon */}
                {physicalDimensions && (
                  <div className="space-y-1 pt-1.5 border-t border-border-subtle/50 text-[10.5px] font-mono text-text-muted">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Ruler size={12} className="text-brand-accent" />
                        Ukuran Cetak DTF:
                      </span>
                      <span className="font-bold text-brand-accent">
                        {physicalDimensions.widthCm.toFixed(1)} × {physicalDimensions.heightCm.toFixed(1)} cm
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span>Jarak dari kerah:</span>
                      <span className="font-bold text-text-primary">
                        ↓ {physicalDimensions.offsetFromCollarCm} cm
                      </span>
                    </div>
                  </div>
                )}

                {qualityReport && (
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[11px] font-mono">
                    <span className="text-text-muted">Kualitas Cetak:</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${qualityReport.badgeColor}`}>
                      {qualityReport.badgeLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Enhancement Message Notification */}
              {enhancementMessage && (
                <div className="p-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-mono flex items-center gap-1.5 animate-fadeIn">
                  <ShieldCheck size={14} />
                  <span>{enhancementMessage}</span>
                </div>
              )}

              {/* Quick Edit Actions: Studio Image Editor & Clean Background Remover */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsImageEditorOpen(true)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 hover:bg-brand-accent/20 text-[11px] font-mono font-bold text-brand-accent transition-all shadow-sm"
                  title="Buka studio edit gambar lengkap (crop, filter, AI background, warna)"
                >
                  <Sparkles size={13} />
                  <span>EDIT GAMBAR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBgRemover((v) => !v)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-[11px] font-mono font-bold transition-all shadow-sm ${
                    showBgRemover
                      ? "bg-surface border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
                  }`}
                  title="Hapus background putih atau hitam secara instan"
                >
                  <Wand2 size={13} />
                  <span>HAPUS LATAR</span>
                </button>
              </div>

              {/* Collapsible Background Remover Panel */}
              {showBgRemover && (
                <div className="p-3 rounded-xl bg-surface border border-brand-accent/30 space-y-2.5 animate-fadeIn">
                  <span className="block text-[10px] font-sans text-text-muted font-bold uppercase">
                    PILIHAN HAPUS WARNA LATAR:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBgTarget("white")}
                      aria-pressed={bgTarget === "white"}
                      className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                        bgTarget === "white"
                          ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      ⬜ LATAR PUTIH
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgTarget("black")}
                      aria-pressed={bgTarget === "black"}
                      className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                        bgTarget === "black"
                          ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      ⬛ LATAR HITAM
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
                      <span className="font-bold">Toleransi Pembersihan</span>
                      <span className="text-text-primary font-bold">{bgTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={1}
                      value={bgTolerance}
                      onChange={(e) => setBgTolerance(parseInt(e.target.value, 10))}
                      className="w-full accent-brand-accent cursor-pointer"
                      aria-label="Toleransi hapus background"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isEnhancingImage}
                      onClick={handleRemoveWhiteBg}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-brand-accent text-canvas text-[10px] font-mono font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {isEnhancingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      <span>TERAPKAN</span>
                    </button>
                    {(() => {
                      try {
                        if (!hasOriginalMaster(activeDecal.id)) return null;
                      } catch { return null; }
                      return (
                        <button
                          type="button"
                          onClick={() => void handleRestoreOriginal()}
                          className="py-1.5 px-2 rounded-lg bg-surface border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-500/10 transition-all"
                          title="Pulihkan file upload awal"
                        >
                          ↩ ASLI
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 3-Position Fast Alignment */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-[10px] font-sans text-text-muted font-bold uppercase">
                  POSISI CEPAT:
                </span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => applyLogoPreset(0)}
                    className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                    title="Posisikan logo di saku dada kiri"
                  >
                    SAKU KIRI
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLogoPreset(1)}
                    className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                    title="Posisikan logo di tengah dada"
                  >
                    TENGAH
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLogoPreset(2)}
                    className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                    title="Posisikan logo di saku dada kanan"
                  >
                    SAKU KANAN
                  </button>
                </div>
              </div>

              {/* Collapsible Manual Sliders */}
              <details className="group border border-border-subtle rounded-xl p-3 bg-surface/45 transition-all">
                <summary className="cursor-pointer flex items-center justify-between text-[11px] font-mono font-bold text-text-muted hover:text-text-primary list-none select-none">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={12} className="text-brand-accent" />
                    <span>PENGATURAN DETAIL (SLIDER)</span>
                  </span>
                  <ChevronDown size={13} className="transition-transform group-open:rotate-180 text-text-muted" />
                </summary>
                <div className="space-y-3 pt-3 mt-2 border-t border-border-subtle/50">
                  {smartZoneHint && (
                    <div
                      role="status"
                      className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1.5 animate-fadeIn"
                      title="Zona aman sablon dada"
                    >
                      <Ruler size={12} />
                      <span>{smartZoneHint}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[11px] font-sans text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER KIRI-KANAN</span></span>
                      <span className="font-mono tabular-nums">{activeDecal.x.toFixed(2)}</span>
                    </div>
                    {(() => {
                      const limX =
                        activeDecal.targetSide === "hood"
                          ? DECAL_MOVE_LIMITS.hoodX
                          : activeDecal.targetSide === "left_sleeve" || activeDecal.targetSide === "right_sleeve"
                          ? DECAL_MOVE_LIMITS.sleeveSlideX
                          : DECAL_MOVE_LIMITS.frontBackX;
                      return (
                        <input
                          type="range"
                          min={-limX}
                          max={limX}
                          step="0.01"
                          value={activeDecal.x}
                          onChange={(e) => {
                            const rawX = parseFloat(e.target.value);
                            const jepit = clampDecalXY(activeDecal.targetSide, rawX, activeDecal.y);
                            if (
                              (activeDecal.targetSide === "front" || activeDecal.targetSide === "back") &&
                              jepit.x !== rawX
                            ) {
                              flashSmartZone();
                            }
                            updateDecal(activeDecal.id, { x: jepit.x, y: jepit.y });
                          }}
                          className="w-full accent-brand-accent cursor-pointer"
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-sans text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER ATAS-BAWAH</span></span>
                      <span className="font-mono tabular-nums">{activeDecal.y.toFixed(2)}</span>
                    </div>
                    {(() => {
                      const limY =
                        activeDecal.targetSide === "hood"
                          ? DECAL_MOVE_LIMITS.hoodY
                          : activeDecal.targetSide === "left_sleeve" || activeDecal.targetSide === "right_sleeve"
                          ? DECAL_MOVE_LIMITS.sleeveY
                          : DECAL_MOVE_LIMITS.frontBackY;
                      return (
                        <input
                          type="range"
                          min={-limY}
                          max={limY}
                          step="0.01"
                          value={activeDecal.y}
                          onChange={(e) => {
                            const rawY = parseFloat(e.target.value);
                            const jepit = clampDecalXY(activeDecal.targetSide, activeDecal.x, rawY);
                            if (
                              (activeDecal.targetSide === "front" || activeDecal.targetSide === "back") &&
                              jepit.y !== rawY
                            ) {
                              flashSmartZone();
                            }
                            updateDecal(activeDecal.id, { x: jepit.x, y: jepit.y });
                          }}
                          className="w-full accent-brand-accent cursor-pointer"
                        />
                      );
                    })()}
                  </div>

                  {/* Scale / Size (Directly affects DTF print cost) */}
                  <div>
                    <div className="flex justify-between items-baseline text-[11px] font-mono text-text-muted mb-1">
                      <span>DIMENSI SABLON (DTF):</span>
                      <span className="text-brand-accent font-bold">
                        {(() => {
                          if (!activeDecal || !physicalDimensions) return "—";
                          if (activeDecal.targetSide.includes("sleeve")) {
                            return `Maks ${(physicalDimensions.maxWidthCm ?? 8.5).toFixed(1)} cm (Lengan) · ${physicalDimensions.widthCm.toFixed(1)} × ${physicalDimensions.heightCm.toFixed(1)} cm`;
                          }
                          const tier = classifyPrintTierByCm(
                            Math.max(physicalDimensions.widthCm, physicalDimensions.heightCm)
                          );
                          return `${PRINT_TIER_LABEL[tier]} (${physicalDimensions.widthCm.toFixed(1)} × ${physicalDimensions.heightCm.toFixed(1)} cm)`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-text-muted/75 mb-1.5">
                      <span>Kerah ke sablon: ~{physicalDimensions?.offsetFromCollarCm?.toFixed(1) ?? "0.0"} cm</span>
                      <span className="text-emerald-400 font-semibold">
                        {(() => {
                          if (!activeDecal || !physicalDimensions) return "";
                          const tier = classifyPrintTierByCm(
                            Math.max(physicalDimensions.widthCm, physicalDimensions.heightCm)
                          );
                          return `+Rp ${(printTierCost(tier)).toLocaleString("id-ID")}`;
                        })()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max={activeDecal ? maxDecalScaleUnits(activeApparel, activeDecal.targetSide) : 0.3}
                      step="0.002"
                      value={activeDecal.scale}
                      onChange={(e) => {
                        const rawScale = parseFloat(e.target.value);
                        const maxS = maxDecalScaleUnits(activeApparel, activeDecal.targetSide);
                        const realAspect = getDecalAspect(activeDecal);
                        const fitFactor = fitScaleToSideBox(activeApparel, activeDecal.targetSide, rawScale, realAspect);
                        const safeScale = Number((Math.min(rawScale, maxS) * fitFactor).toFixed(4));
                        updateDecal(activeDecal.id, { scale: safeScale });
                      }}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                    {/* DTF Standard Size Presets (Kontekstual Area Lengan vs Dada) */}
                    <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[9px]">
                      {(() => {
                        const isSleeve = activeDecal.targetSide.includes("sleeve");
                        const mm = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
                        const presets = isSleeve
                          ? [
                              { label: "Mini (4cm)", cm: 4 },
                              { label: "Sedang (6cm)", cm: 6 },
                              { label: `Maks (${(physicalDimensions?.maxWidthCm ?? 8.5).toFixed(1)}cm)`, cm: physicalDimensions?.maxWidthCm ?? 8.5 },
                            ].map((p) => ({ ...p, scale: p.cm / mm }))
                          : [
                              { label: "A6 (9cm)", cm: 9 },
                              { label: "A5 (15cm)", cm: 15 },
                              { label: "A4 (21cm)", cm: 21 },
                              { label: "A3 (29cm)", cm: 29 },
                            ].map((p) => ({ ...p, scale: p.cm / mm }));
                        return presets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const realAspect = getDecalAspect(activeDecal);
                              const fitFactor = fitScaleToSideBox(activeApparel, activeDecal.targetSide, preset.scale, realAspect);
                              updateDecal(activeDecal.id, { scale: Number((preset.scale * fitFactor).toFixed(4)) });
                            }}
                            className={`py-1 rounded bg-surface border text-center transition-all ${
                              Math.abs(activeDecal.scale - preset.scale) < preset.scale * 0.15
                                ? "border-brand-accent text-brand-accent font-bold"
                                : "border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-[11px] font-sans text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><RotateCw size={11} /> <span>PUTAR</span></span>
                      <span className="font-mono tabular-nums">{activeDecal.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={activeDecal.rotation}
                      onChange={(e) => updateDecal(activeDecal.id, { rotation: parseInt(e.target.value, 10) })}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>

                  {/* Opacity */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                      <span>TRANSPARANSI</span>
                      <span>{Math.round(activeDecal.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={activeDecal.opacity}
                      onChange={(e) => updateDecal(activeDecal.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl border border-dashed border-border-subtle text-text-muted font-mono text-xs space-y-1 bg-surface/30">
          <p className="font-bold text-text-primary">Belum ada sablon</p>
          <p className="text-[10px]">Unggah gambar atau tambahkan teks di atas.</p>
        </div>
      )}
        </>
      )}

      {/* Akses Cepat Lab Kain 3D */}
      <div className="p-3.5 rounded-2xl bg-surface/60 border border-border-subtle flex items-center justify-between shadow-sm mt-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
            <FlaskConical size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-mono font-bold text-text-primary block truncate">
              Uji Fisika Kain & Simulasi 3D
            </span>
            <span className="text-[10px] font-mono text-text-muted block truncate">
              Angin, stretch elastisitas, senter & pencahayaan
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleClothLab}
          className="px-3 py-1.5 rounded-xl bg-brand-accent/15 hover:bg-brand-accent hover:text-canvas border border-brand-accent/30 text-brand-accent text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
        >
          BUKA LAB
        </button>
      </div>
    </>
  );
};
