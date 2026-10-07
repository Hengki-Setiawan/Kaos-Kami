// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (TAB 1: PRODUK).
//
// Presentasional murni: JSX dipindah verbatim dari CustomizerDrawer.tsx,
// state berasal dari useConfiguratorStore yang sama via props (tanpa duplikasi).
// Tanpa ubah pricing/gate/stok/checkout/2D-dewire — hanya relokasi.

"use client";

import React from "react";
import { Check, Ruler } from "lucide-react";
import { PRODUCT_COLORS, APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import { getApparelIcon } from "@/components/ui/ApparelIcons";
import { formatQuickDimensions } from "@/lib/apparelSizing";
import type { VariantStockInfo } from "./studioDrawerTypes";

export interface ApparelTabContentProps {
  activeApparel: ApparelType;
  setActiveApparel: (apparel: ApparelType) => void;
  activeColorName: string;
  colorTreatmentSurchargeIdr: number;
  sizeSurchargeIdr: number;
  activeColorMode: "single" | "multi-part";
  partColors: Record<string, string>;
  selectedColor: string;
  activePartId: string;
  setActivePartId: (id: string) => void;
  setSelectedColor: (hex: string, name?: string) => void;
  setPartColor: (partId: string, hex: string) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  setIsSizeGuideOpen: (open: boolean) => void;
  currentVariantStock?: number;
  currentVariantSku?: string;
  currentApparelSizes: readonly string[];
  resolveVariantInfo: (
    apparel: string,
    colorHex: string,
    size: string
  ) => VariantStockInfo | undefined;
}

export const ApparelTabContent: React.FC<ApparelTabContentProps> = ({
  activeApparel,
  setActiveApparel,
  activeColorName,
  colorTreatmentSurchargeIdr,
  sizeSurchargeIdr,
  activeColorMode,
  partColors,
  selectedColor,
  activePartId,
  setActivePartId,
  setSelectedColor,
  setPartColor,
  selectedSize,
  setSelectedSize,
  setIsSizeGuideOpen,
  currentVariantStock,
  currentVariantSku,
  currentApparelSizes,
  resolveVariantInfo,
}) => {
  return (
    <>
      {/* 3D Mockup Apparel Switcher - Compact 4-Col Grid */}
      <div>
        <span className="block text-[11px] font-sans text-text-muted mb-2 font-bold uppercase tracking-wider">
          JENIS PAKAIAN:
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(APPAREL_CATALOG) as ApparelType[]).map((type) => {
            const info = APPAREL_CATALOG[type];
            const locked = !info.mockupEnabled;
            const comingSoon = !info.orderable;
            const isActive = activeApparel === type;
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

            const Icon = getApparelIcon(type);

            return (
              <button
                key={type}
                onClick={() => {
                  if (!locked) setActiveApparel(type);
                }}
                disabled={locked}
                title={
                  locked
                    ? `${info.name} — Segera hadir`
                    : comingSoon
                      ? `${info.name} — Mockup aktif, pemesanan segera dibuka`
                      : `${info.name} (Mulai Rp ${info.basePriceIdr.toLocaleString("id-ID")})`
                }
                aria-disabled={locked}
                className={`relative py-2 px-1 rounded-xl font-mono text-[10px] sm:text-[11px] font-bold border transition-all text-center flex flex-col items-center justify-center min-h-[58px] cursor-pointer group ${
                  isActive
                    ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.45)] scale-[1.02]"
                    : locked
                      ? "bg-surface/50 border-border-subtle text-text-muted/40 cursor-not-allowed"
                      : "bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-accent/50 hover:bg-surface-elevated"
                }`}
              >
                <Icon
                  size={17}
                  className={`mb-1 transition-transform group-hover:scale-110 shrink-0 ${
                    isActive ? "text-canvas" : "text-text-muted group-hover:text-text-primary"
                  }`}
                />
                <span className="font-bold uppercase tracking-wider truncate w-full text-center text-[10px] leading-tight">{label}</span>
                <span className={`text-[8px] font-bold tracking-tight mt-0.5 leading-none ${
                  isActive ? "text-canvas/90" : "text-brand-accent"
                }`}>
                  {info.basePriceIdr > 0 ? `Rp ${(info.basePriceIdr / 1000)}k` : "Mockup"}
                </span>
                {comingSoon && (
                  <span className="mt-1 px-1 py-px rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[7px] font-bold tracking-wider leading-none">
                    SEGERA
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colorway Picker */}
      <div>
        <div className="flex justify-between items-center text-xs font-mono mb-2">
          <span className="text-text-muted font-bold uppercase tracking-wider">WARNA PAKAIAN:</span>
          <span className="text-text-primary font-bold flex items-center gap-1.5">
            <span>{activeColorName}</span>
            {colorTreatmentSurchargeIdr > 0 ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/20 border border-brand-accent/40 text-brand-accent font-bold">
                +IDR {colorTreatmentSurchargeIdr.toLocaleString("id-ID")}
              </span>
            ) : (
              <span className="text-[9px] text-text-muted font-normal">(Standar)</span>
            )}
          </span>
        </div>

        {/* Multi-Part Target Selector (Afilah) */}
        {activeColorMode === "multi-part" && (
          <div className="p-3 rounded-xl bg-surface/80 border border-brand-accent/30 mb-3 space-y-2 font-mono text-xs animate-fadeIn">
            <span className="block text-[10px] text-text-muted font-bold uppercase">
              BAGIAN PAKAIAN:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "body", label: "BODI" },
                { id: "sleeves", label: "LENGAN" },
                { id: "collar", label: "KERAH" },
              ].map((part) => {
                const currentColor = partColors[part.id] || selectedColor;
                const isActive = activePartId === part.id;
                return (
                  <button
                    key={part.id}
                    onClick={() => setActivePartId(part.id)}
                    className={`py-1.5 px-1 rounded-lg border text-[10px] flex flex-col items-center justify-center space-y-1 transition-all ${
                      isActive
                        ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                        : "bg-surface border-border-subtle hover:border-brand-accent"
                    }`}
                  >
                    <span className="font-bold">{part.label}</span>
                    <span
                      className="w-4 h-4 rounded-full border border-border-strong"
                      style={{ backgroundColor: currentColor }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Colorway Palette */}
        <div className="flex flex-wrap gap-2 mb-1">
          {PRODUCT_COLORS.map((c) => {
            const isSelected =
              activeColorMode === "multi-part"
                ? (partColors[activePartId] || selectedColor).toLowerCase() === c.hex.toLowerCase()
                : selectedColor.toLowerCase() === c.hex.toLowerCase();

            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedColor(c.hex, c.name);
                  if (activeColorMode === "multi-part") {
                    setPartColor(activePartId, c.hex);
                  }
                }}
                style={{ backgroundColor: c.hex }}
                aria-label={c.name}
                title={`${c.name}${c.isSpecialPigment ? " (+IDR 15.000 Special Pigment)" : " (Standar)"}`}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative ${
                  isSelected
                    ? "border-brand-accent scale-110 shadow-[0_0_10px_rgba(230,81,0,0.6)]"
                    : "border-border-subtle hover:border-text-muted"
                }`}
              >
                {isSelected && (
                  <Check size={13} className={c.id === "chalk" ? "text-neutral-900 stroke-[3]" : "text-white stroke-[3]"} />
                )}
                {c.isSpecialPigment && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-accent border border-canvas shadow-xs"
                    title="Special Pigment Dye (+IDR 15.000)"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sizing Matrix */}
      <div>
        <div className="flex justify-between items-center text-xs font-mono mb-2">
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold uppercase">UKURAN:</span>
            <span className="font-bold text-text-primary">{selectedSize}</span>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="ml-2 flex items-center gap-1 text-[11px] font-mono text-brand-accent hover:underline font-bold cursor-pointer transition-colors"
              title="Buka tabel panduan ukuran fisik"
            >
              <Ruler size={12} />
              <span>PANDUAN UKURAN</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {currentVariantStock !== undefined && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                currentVariantStock <= 0
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : currentVariantStock <= 10
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  currentVariantStock === undefined ? "bg-emerald-400" : currentVariantStock <= 0 ? "bg-rose-400" : currentVariantStock <= 10 ? "bg-amber-400" : "bg-emerald-400"
                }`} />
                <span>{currentVariantStock !== undefined ? `Stok: ${currentVariantStock} pcs` : "Stok: Tersedia"}</span>
                {currentVariantSku && <span className="opacity-60 text-[9px]">({currentVariantSku})</span>}
              </span>
            )}
            {sizeSurchargeIdr > 0 && (
              <span className="text-brand-accent font-bold">+IDR {sizeSurchargeIdr.toLocaleString("id-ID")}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentApparelSizes.map((size) => {
            const vInfo = resolveVariantInfo(activeApparel, selectedColor, size);
            const szStock = vInfo?.stockQty;
            const isSzOut = szStock !== undefined && szStock <= 0;
            const isSzLow = szStock !== undefined && szStock > 0 && szStock <= 10;
            const isSelected = selectedSize === size;
            const szUpper = size.toUpperCase().trim();
            const szSurcharge = szUpper === "XXL" ? 10000 : szUpper === "XXXL" || szUpper === "3XL" ? 20000 : 0;

            return (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`relative py-1.5 px-3 min-w-[56px] rounded-xl font-mono text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? "bg-text-primary text-canvas border-text-primary shadow-sm"
                    : isSzOut
                    ? "bg-surface/50 border-border-subtle text-text-muted/40 line-through"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{size}</span>
                  {szSurcharge > 0 && (
                    <span className={`text-[8px] font-bold px-1 py-0.2 rounded-full ${
                      isSelected ? "bg-amber-400 text-neutral-900" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      +{szSurcharge / 1000}k
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-bold mt-0.5 tracking-tight ${
                  isSzOut
                    ? "text-rose-400 font-bold"
                    : isSzLow
                    ? "text-amber-400 font-bold"
                    : isSelected
                    ? "text-canvas/80 font-bold"
                    : "text-emerald-500/90 dark:text-emerald-400 font-semibold"
                }`}>
                  {szStock !== undefined ? (isSzOut ? "Habis" : `${szStock} pcs`) : "Tersedia"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Physical Dimension Strip (1-Baris Ringkas) */}
        <div className="mt-2.5 p-2.5 rounded-xl bg-surface/70 border border-border-subtle/80 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 truncate">
            <Ruler size={13} className="text-brand-accent shrink-0" />
            <div className="truncate">
              <strong className="text-text-primary font-bold">{selectedSize}: </strong>
              <span className="text-text-muted">{formatQuickDimensions(activeApparel, selectedSize)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSizeGuideOpen(true)}
            className="shrink-0 text-[10px] text-brand-accent font-bold hover:underline ml-2"
          >
            Detail
          </button>
        </div>
      </div>
    </>
  );
};
