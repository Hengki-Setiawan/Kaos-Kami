"use client";

import React, { useState, useMemo } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { HapticButton } from "@/components/ui/HapticButton";
import { Badge } from "@/components/ui/Badge";
import { haptic } from "@/lib/bridge/haptics";
import { Calculator, Sparkles, ArrowRight, Percent, Check } from "lucide-react";
import { useMobileStudioStore, ApparelType } from "@/store/useMobileStudioStore";

export interface MobileKalkulatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStudio?: () => void;
}

const APPAREL_PRICES: Record<ApparelType, { label: string; price: number }> = {
  tshirt: { label: "Kaos Combed 24s", price: 79000 },
  longsleeve: { label: "Longsleeve Combed 24s", price: 99000 },
  crewneck: { label: "Crewneck Fleece", price: 149000 },
  hoodie: { label: "Hoodie Jumper", price: 179000 },
  shirt: { label: "Coach Jacket", price: 189000 },
  sweater: { label: "Sweater Pack", price: 149000 },
  cap: { label: "Topi Baseball", price: 45000 },
  pants: { label: "Celana Cargo", price: 129000 },
  shorts: { label: "Celana Denim", price: 99000 },
};

const PRINT_TIERS = [
  { id: "A6", label: "A6 Pocket (≤10 cm)", cost: 10000, desc: "Saku dada / label lengan" },
  { id: "A5", label: "A5 Sedang (≤20 cm)", cost: 20000, desc: "Dada tengah / punggung atas" },
  { id: "A4", label: "A4 Dada (≤25 cm)", cost: 30000, desc: "Standar sablon depan distro" },
  { id: "A3", label: "A3 Besar (≤35 cm)", cost: 30000, desc: "Punggung penuh / A3 max maklon" },
];

export function MobileKalkulatorSheet({
  open,
  onOpenChange,
  onOpenStudio,
}: MobileKalkulatorSheetProps) {
  const [apparel, setApparel] = useState<ApparelType>("tshirt");
  const [printTier, setPrintTier] = useState<string>("A4");
  const [qty, setQty] = useState<number>(12);

  const setApparelType = useMobileStudioStore((s) => s.setApparelType);

  const calculation = useMemo(() => {
    const apparelData = APPAREL_PRICES[apparel] || APPAREL_PRICES.tshirt;
    const tierData = PRINT_TIERS.find((t) => t.id === printTier) || PRINT_TIERS[2];

    const unitBase = apparelData.price;
    const unitSablon = tierData.cost;
    const unitBefore = unitBase + unitSablon;

    let discountPct = 0;
    let tierName = "Satuan (Tanpa Min. Order)";
    if (qty > 50) {
      discountPct = 20;
      tierName = "Partai Besar (>50 Pcs) • Diskon 20%";
    } else if (qty >= 13) {
      discountPct = 12;
      tierName = "Komunitas (13-50 Pcs) • Diskon 12%";
    } else if (qty >= 6) {
      discountPct = 5;
      tierName = "Mini-Bulk (6-12 Pcs) • Diskon 5%";
    }

    const unitDiscount = Math.round((unitBefore * discountPct) / 100);
    const unitAfter = unitBefore - unitDiscount;
    const totalBefore = unitBefore * qty;
    const totalAfter = unitAfter * qty;
    const totalSavings = totalBefore - totalAfter;

    return {
      unitBase,
      unitSablon,
      unitBefore,
      unitAfter,
      totalBefore,
      totalAfter,
      totalSavings,
      discountPct,
      tierName,
    };
  }, [apparel, printTier, qty]);

  const handleApplyToStudio = () => {
    haptic.success();
    setApparelType(apparel);
    onOpenChange(false);
    onOpenStudio?.();
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Kalkulator Sablon DTF"
      description="Simulasi estimasi biaya sablon satuan & diskon partai lusinan Makassar."
    >
      <div className="space-y-4 py-2 font-sans select-none">
        {/* Pilih Pakaian */}
        <div>
          <label className="text-xs font-bold text-white block mb-2">
            1. Pilih Jenis Pakaian:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "tshirt", label: "Kaos Combed 24s", price: "Rp 79.000" },
                { id: "longsleeve", label: "Kaos Lengan Panjang", price: "Rp 99.000" },
                { id: "crewneck", label: "Crewneck Fleece", price: "Rp 149.000" },
                { id: "hoodie", label: "Hoodie Jumper", price: "Rp 179.000" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptic.selection();
                  setApparel(item.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  apparel === item.id
                    ? "bg-[#FF6B35]/15 border-[#FF6B35] text-white shadow-sm"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <p className="text-xs font-bold leading-tight truncate">{item.label}</p>
                <p className="text-[10px] text-[#FF6B35] font-mono mt-0.5">{item.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Pilih Ukuran Sablon */}
        <div>
          <label className="text-xs font-bold text-white block mb-2">
            2. Ukuran Area Sablon DTF:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRINT_TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  haptic.selection();
                  setPrintTier(tier.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  printTier === tier.id
                    ? "bg-[#FF6B35]/15 border-[#FF6B35] text-white shadow-sm"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold leading-tight">{tier.label}</p>
                  <span className="text-[10px] font-mono text-[#FF6B35] font-bold">
                    +Rp {tier.cost.toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{tier.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Jumlah Kaos (Quantity) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-white">
              3. Jumlah Pesanan (Pcs):
            </label>
            <span className="text-xs font-mono font-bold text-[#FF6B35] px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
              {qty} Pcs
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={100}
            value={qty}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setQty(val);
            }}
            className="w-full accent-[#FF6B35] cursor-pointer"
            aria-label="Jumlah pesanan"
          />

          {/* Quick Quantity Pills */}
          <div className="flex gap-1.5 mt-2">
            {[1, 6, 12, 24, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  haptic.tap();
                  setQty(num);
                }}
                className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  qty === num
                    ? "bg-[#FF6B35] text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Kotak Ringkasan & Estimasi Harga */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="text-zinc-400">Kategori Diskon:</span>
            <span className="font-bold text-amber-400 text-[11px] font-mono">
              {calculation.tierName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Harga Satuan (Normal):</span>
            <span className="font-mono line-through text-zinc-500 text-[11px]">
              {calculation.discountPct > 0
                ? `Rp ${calculation.unitBefore.toLocaleString("id-ID")}`
                : "-"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-white">
            <span>Harga per Pcs (Nett):</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              Rp {calculation.unitAfter.toLocaleString("id-ID")}
            </span>
          </div>

          {calculation.totalSavings > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
              <span className="flex items-center gap-1">
                <Percent size={12} /> Total Penghematan:
              </span>
              <span className="font-mono font-bold">
                Hemat Rp {calculation.totalSavings.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                Total Estimasi ({qty} Pcs):
              </span>
              <span className="text-base font-extrabold text-[#FF6B35] font-mono">
                Rp {calculation.totalAfter.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 text-right leading-tight">
              Maklon DTF 35cm
              <br />
              Makassar
            </span>
          </div>
        </div>

        {/* CTA Buka Studio 3D */}
        <HapticButton
          variant="primary"
          hapticStyle="tapHeavy"
          icon={<Sparkles size={16} />}
          onClick={handleApplyToStudio}
          className="w-full py-3.5 text-xs font-bold font-sans uppercase tracking-wider shadow-lg shadow-orange-600/30"
        >
          Desain Baju Ini di Studio 3D
        </HapticButton>

        <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
          *Estimasi dihitung lokal. Biaya final sablon dikonfirmasi otomatis oleh sistem saat checkout berdasarkan dimensi cetak riil di Studio 3D.
        </p>
      </div>
    </BottomSheet>
  );
}
