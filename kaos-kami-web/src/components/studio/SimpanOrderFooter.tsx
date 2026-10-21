// Blueprint Bab 53 Fase 5 — pecahan CustomizerDrawer (FOOTER: estimasi + PESAN).
//
// Presentasional murni: JSX dipindah verbatim dari CustomizerDrawer.tsx
// (varian desktop + mobile), state pricing/checkout/stok via props (tanpa duplikasi).
// Tanpa ubah pricing/gate/stok/checkout/2D-dewire — hanya relokasi.

"use client";

import React from "react";
import { Info, ShoppingCart } from "lucide-react";
import type { DrawerPricing } from "./studioDrawerTypes";

export interface SimpanOrderFooterProps {
  variant: "desktop" | "mobile";
  pricing: DrawerPricing;
  currentApparelName: string;
  selectedSize: string;
  showPriceBreakdown: boolean;
  setShowPriceBreakdown: (v: boolean) => void;
  openCheckoutWithMasterGate: () => void;
  isCurrentVariantOut: boolean;
}

export const SimpanOrderFooter: React.FC<SimpanOrderFooterProps> = ({
  variant,
  pricing,
  currentApparelName,
  selectedSize,
  showPriceBreakdown,
  setShowPriceBreakdown,
  openCheckoutWithMasterGate,
  isCurrentVariantOut,
}) => {
  if (variant === "mobile") {
    return (
      <>
        <div className="p-2.5 rounded-xl bg-surface/60 border border-border-subtle flex justify-between items-center">
          <span className="text-[10px] font-sans text-text-muted uppercase">ESTIMASI TOTAL</span>
          <span className="font-mono font-bold text-sm text-brand-accent">{pricing.formattedTotal}</span>
        </div>
        <button
          onClick={openCheckoutWithMasterGate}
          disabled={isCurrentVariantOut}
          className={`w-full min-h-[44px] py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all flex items-center justify-center space-x-2 ${
            isCurrentVariantOut
              ? "bg-surface border border-border-subtle text-text-muted cursor-not-allowed opacity-60"
              : "bg-brand-accent text-white"
          }`}
        >
          <ShoppingCart size={14} />
          <span>{isCurrentVariantOut ? "STOK HABIS" : "PESAN SEKARANG"}</span>
        </button>
      </>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-border-subtle bg-surface/95 backdrop-blur-md flex flex-col space-y-2 shrink-0">
      {/* Price Breakdown Tooltip / Accordion */}
      {showPriceBreakdown && (
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle text-xs font-mono space-y-1.5 mb-1 animate-in fade-in">
          <div className="flex justify-between text-text-muted">
            <span>Base {currentApparelName}:</span>
            <span>IDR {pricing.basePriceIdr.toLocaleString("id-ID")}</span>
          </div>
          {pricing.fabricThicknessSurchargeIdr > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Bahan & Ketebalan {pricing.fabricThicknessSlug}:</span>
              <span>+IDR {pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          {pricing.sleeveSurchargeIdr > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Lengan panjang:</span>
              <span>+IDR {pricing.sleeveSurchargeIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          {pricing.colorTreatmentSurchargeIdr > 0 && (
            <div className="flex justify-between text-brand-accent">
              <span>Special Pigment Dye:</span>
              <span>+IDR {pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          {pricing.sizeSurchargeIdr > 0 && (
            <div className="flex justify-between text-brand-accent">
              <span>Extra Fabric ({selectedSize}):</span>
              <span>+IDR {pricing.sizeSurchargeIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          {pricing.decalLayers.map((s) => (
            <div key={s.id} className="flex justify-between text-text-muted">
              <span className="truncate pr-2">{s.name} ({s.tier} {s.widthCm.toFixed(1)}×{s.heightCm.toFixed(1)}cm):</span>
              <span>+IDR {s.costIdr.toLocaleString("id-ID")}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-sans font-medium text-text-muted">Total:</span>
            <span className="font-mono font-bold text-base text-text-primary">
              {pricing.formattedTotal}
            </span>
            <button
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="text-text-muted hover:text-brand-accent transition-colors cursor-pointer p-0.5"
              title="Lihat rincian kalkulasi harga"
              aria-label="Rincian harga"
            >
              <Info size={12} />
            </button>
          </div>
        </div>

        <div className="shrink-0">
          <button
            id="studio-btn-pesan"
            type="button"
            onClick={openCheckoutWithMasterGate}
            disabled={isCurrentVariantOut}
            className={`py-2.5 px-4 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              isCurrentVariantOut
                ? "bg-surface border border-border-subtle text-text-muted cursor-not-allowed opacity-60"
                : "bg-brand-accent hover:brightness-110 active:scale-95 text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] cursor-pointer"
            }`}
          >
            <ShoppingCart size={14} />
            <span>{isCurrentVariantOut ? "STOK HABIS" : "PESAN SEKARANG"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
