"use client";

import React, { useState } from "react";
import { X, Ruler, Check, Info } from "lucide-react";
import {
  getApparelSizing,
  APPAREL_SIZING_DATA,
  type ApparelSizingSpec,
  type GarmentDimensions,
} from "@/lib/3d/mobileApparelSizing";
import { Z_CLASS_MODAL } from "@/lib/zIndex";

interface MobileSizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeApparel: string;
  selectedSize: string;
  onSelectSize: (size: 'S' | 'M' | 'L' | 'XL' | 'XXL') => void;
}

const APPAREL_TABS: { slug: string; label: string }[] = [
  { slug: "tshirt", label: "Kaos" },
  { slug: "hoodie", label: "Hoodie" },
  { slug: "longsleeve", label: "Longsleeve" },
  { slug: "crewneck", label: "Crewneck" },
  { slug: "shirt", label: "Jacket" },
  { slug: "pants", label: "Celana" },
  { slug: "shorts", label: "Shorts" },
  { slug: "cap", label: "Topi" },
];

export function MobileSizeGuideModal({
  isOpen,
  onClose,
  activeApparel,
  selectedSize,
  onSelectSize,
}: MobileSizeGuideModalProps) {
  const [currentApparel, setCurrentApparel] = useState<string>(activeApparel || "tshirt");

  if (!isOpen) return null;

  const spec: ApparelSizingSpec = getApparelSizing(currentApparel);
  const sizeKeys = spec.sizeList;

  return (
    <div className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`}>
      <div
        className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#FF6B35]">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-sans">Panduan Ukuran Fisik</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Standar Konveksi Kaos Kami Makassar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Apparel Horizontal Scroll Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/80 overflow-x-auto no-scrollbar shrink-0">
          {APPAREL_TABS.map((tab) => {
            const isSelected = currentApparel === tab.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => setCurrentApparel(tab.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#FF6B35] text-white shadow-sm shadow-orange-600/30"
                    : "bg-zinc-850 bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Spec Summary Card */}
          <div className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-sans">{spec.displayName}</span>
              <span className="text-[10px] text-zinc-400 font-mono">Toleransi Jahitan: {spec.toleranceCm}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-orange-400">
              Satuan: Centimeter (cm)
            </div>
          </div>

          {/* Size Dimensions Table */}
          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-850 bg-zinc-900/80 text-[11px] text-zinc-400 font-mono">
                  <th className="py-2.5 px-3">Ukuran</th>
                  {spec.category === "tops" && (
                    <>
                      <th className="py-2.5 px-2">Lebar Dada</th>
                      <th className="py-2.5 px-2">Panjang</th>
                      <th className="py-2.5 px-2">Lengan</th>
                    </>
                  )}
                  {spec.category === "bottoms" && (
                    <>
                      <th className="py-2.5 px-2">Pinggang</th>
                      <th className="py-2.5 px-2">Panjang</th>
                      <th className="py-2.5 px-2">Paha</th>
                    </>
                  )}
                  {spec.category === "headwear" && (
                    <>
                      <th className="py-2.5 px-2">Lingkar Kepala</th>
                      <th className="py-2.5 px-2">Visor</th>
                      <th className="py-2.5 px-2">Tinggi</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">Pilih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 divide-zinc-800/60 font-mono text-[11px]">
                {sizeKeys.map((sz) => {
                  const dims: GarmentDimensions = spec.dimensions[sz] || { size: sz, bodyLengthCm: 0 };
                  const isCurrent = selectedSize === sz;

                  return (
                    <tr
                      key={sz}
                      onClick={() => {
                        if (['S', 'M', 'L', 'XL', 'XXL'].includes(sz)) {
                          onSelectSize(sz as 'S' | 'M' | 'L' | 'XL' | 'XXL');
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-orange-500/10 text-white font-bold"
                          : "hover:bg-zinc-800/40 text-zinc-300"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        {sz}
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#FF6B35]" />}
                      </td>

                      {spec.category === "tops" && (
                        <>
                          <td className="py-2.5 px-2 text-zinc-300">{dims.chestWidthCm ?? "-"} cm</td>
                          <td className="py-2.5 px-2 text-zinc-300">{dims.bodyLengthCm ?? "-"} cm</td>
                          <td className="py-2.5 px-2 text-zinc-400">{dims.sleeveLengthCm ?? "-"} cm</td>
                        </>
                      )}

                      {spec.category === "bottoms" && (
                        <>
                          <td className="py-2.5 px-2 text-zinc-300">
                            {dims.waistMinCm ? `${dims.waistMinCm}-${dims.waistMaxCm}` : "-"} cm
                          </td>
                          <td className="py-2.5 px-2 text-zinc-300">{dims.bodyLengthCm ?? "-"} cm</td>
                          <td className="py-2.5 px-2 text-zinc-400">{dims.thighCircumferenceCm ?? "-"} cm</td>
                        </>
                      )}

                      {spec.category === "headwear" && (
                        <>
                          <td className="py-2.5 px-2 text-zinc-300">
                            {dims.headCircumferenceMinCm ? `${dims.headCircumferenceMinCm}-${dims.headCircumferenceMaxCm}` : "-"} cm
                          </td>
                          <td className="py-2.5 px-2 text-zinc-300">{dims.visorLengthCm ?? "-"} cm</td>
                          <td className="py-2.5 px-2 text-zinc-400">{dims.crownHeightCm ?? "-"} cm</td>
                        </>
                      )}

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            isCurrent
                              ? "bg-[#FF6B35] text-white"
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {isCurrent ? "Dipilih" : "Gunakan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Measuring Tips Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-800/40 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-xs font-sans">
              <Info className="w-3.5 h-3.5" />
              <span>Cara Mengukur Baju Sendiri di Rumah:</span>
            </div>
            <ul className="space-y-1.5 text-zinc-300 text-[11px] leading-relaxed">
              {spec.measuringGuide.map((g, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong className="text-white">{g.point}:</strong> {g.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-mono">
            Ukuran aktif: <strong className="text-white">{selectedSize}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-bold shadow-lg shadow-orange-600/25 active:scale-95 transition-transform"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
