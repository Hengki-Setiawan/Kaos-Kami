"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  Sparkles,
  ArrowUpDown,
  Filter,
  Save,
  RotateCcw,
} from "lucide-react";
import { getApparelIcon } from "@/components/ui/ApparelIcons";
import type { ApparelType } from "@/lib/constants";

export interface VariantItem {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  colorHex: string;
  colorName: string;
  size: string;
  priceIdr: number;
  stockQty: number;
  isActive: boolean | number;
}

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  basePriceIdr: number;
  sizes: string; // JSON string: '["S","M","L","XL","XXL"]'
}

interface MatrixStockGridProps {
  categories: CategoryItem[];
  initialVariants: VariantItem[];
}

export function MatrixStockGrid({ categories, initialVariants }: MatrixStockGridProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "");
  const [variants, setVariants] = useState<VariantItem[]>(initialVariants);
  const [filterMode, setFilterMode] = useState<"all" | "low" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [batchInputs, setBatchInputs] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCategory = categories.find((c) => c.id === selectedCatId) || categories[0];

  // Parse sizes for active category
  let activeSizes: string[] = ["S", "M", "L", "XL", "XXL"];
  try {
    if (activeCategory?.sizes) {
      activeSizes = JSON.parse(activeCategory.sizes);
    }
  } catch {
    // fallback
  }

  // Filter variants for current category
  const catVariants = variants.filter((v) => v.categoryId === activeCategory?.id);

  // Group variants by colorHex & colorName
  const colorGroups = React.useMemo(() => {
    const map = new Map<string, { colorHex: string; colorName: string; sizeMap: Map<string, VariantItem> }>();
    for (const v of catVariants) {
      const key = `${v.colorHex.toLowerCase()}__${v.colorName.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { colorHex: v.colorHex, colorName: v.colorName, sizeMap: new Map() });
      }
      map.get(key)!.sizeMap.set(v.size.toUpperCase(), v);
    }
    return Array.from(map.values());
  }, [catVariants]);

  // Overall KPIs for active category
  const catTotalStock = catVariants.reduce((sum, v) => sum + (v.stockQty || 0), 0);
  const catOutCount = catVariants.filter((v) => (v.stockQty || 0) <= 0).length;
  const catLowCount = catVariants.filter((v) => (v.stockQty || 0) > 0 && (v.stockQty || 0) <= 5).length;

  // Filter color groups by search & low/out filter
  const filteredGroups = colorGroups.filter((group) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchColor = group.colorName.toLowerCase().includes(q);
      const matchSku = Array.from(group.sizeMap.values()).some((v) => v.sku.toLowerCase().includes(q));
      if (!matchColor && !matchSku) return false;
    }

    // Filter mode
    if (filterMode === "out") {
      return Array.from(group.sizeMap.values()).some((v) => (v.stockQty || 0) <= 0);
    }
    if (filterMode === "low") {
      return Array.from(group.sizeMap.values()).some(
        (v) => (v.stockQty || 0) > 0 && (v.stockQty || 0) <= 5
      );
    }
    return true;
  });

  // Update stock handler (optimistic + API)
  const handleUpdateStock = async (variantId: string, newStock: number) => {
    const clamped = Math.max(0, Math.min(100000, Math.floor(newStock)));

    // Optimistic state
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, stockQty: clamped } : v))
    );

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, stockQty: clamped }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan stok");

      setStatusMessage({ text: "Stok tersimpan di database", type: "success" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      setStatusMessage({ text: `Gagal: ${e.message}`, type: "error" });
    }
  };

  // Quick Delta (+1 / -1)
  const handleDelta = async (variantId: string, delta: number) => {
    const current = variants.find((v) => v.id === variantId)?.stockQty ?? 0;
    await handleUpdateStock(variantId, current + delta);
  };

  // Batch Fill for a color row
  const handleBatchFill = async (group: { sizeMap: Map<string, VariantItem> }, key: string) => {
    const val = parseInt(batchInputs[key] || "", 10);
    if (isNaN(val) || val < 0) return;

    const itemsToUpdate = Array.from(group.sizeMap.values()).map((v) => ({
      variantId: v.id,
      stockQty: val,
    }));

    // Optimistic update
    setVariants((prev) =>
      prev.map((v) => {
        const match = itemsToUpdate.find((u) => u.variantId === v.id);
        return match ? { ...v, stockQty: match.stockQty } : v;
      })
    );

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchVariations: itemsToUpdate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan batch");

      setStatusMessage({ text: `Berhasil update ${itemsToUpdate.length} ukuran ke ${val} pcs`, type: "success" });
      setBatchInputs((prev) => ({ ...prev, [key]: "" }));
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      setStatusMessage({ text: `Gagal: ${e.message}`, type: "error" });
    }
  };

  return (
    <div className="bg-surface-elevated/40 border border-border-subtle rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-subtle/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-brand-accent/10 text-brand-accent">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="font-sans text-xl sm:text-2xl font-bold uppercase text-text-primary tracking-wide">
              INVENTORY MATRIX GRID (MULTI-DIMENSI)
            </h2>
          </div>
          <p className="text-text-muted text-xs">
            Kelola stok real-time persilangan <strong>Produk × Warna × Ukuran</strong>. Klik angka stok untuk edit instan atau gunakan tombol quick-adjust.
          </p>
        </div>

        {/* Global Toast Indicator */}
        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all animate-fade-in flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
            }`}
          >
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* APPAREL SELECTOR PILLS (8 KATEGORI) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = cat.id === selectedCatId;
          const count = variants.filter((v) => v.categoryId === cat.id).length;
          const Icon = getApparelIcon(cat.slug as ApparelType);

          const apparelLabels: Record<string, string> = {
            tshirt: "T-Shirt",
            longsleeve: "Longsleeve",
            crewneck: "Sweater",
            hoodie: "Hoodie",
            shirt: "Jacket",
            cap: "Topi",
            pants: "Celana",
            shorts: "Shorts",
          };
          const label = apparelLabels[cat.slug] || cat.name.split(" ")[0];

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-all border shrink-0 ${
                isActive
                  ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_4px_16px_rgba(230,81,0,0.35)] scale-[1.02]"
                  : "bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-accent/40 hover:bg-surface-elevated"
              }`}
            >
              <Icon size={16} className={isActive ? "text-canvas" : "text-text-muted"} />
              <span>{label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-canvas/20 text-canvas font-bold" : "bg-surface-elevated text-text-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE CATEGORY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex flex-col justify-between">
          <span className="text-text-muted uppercase text-[10px] font-bold">TOTAL STOK FISIK</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-text-primary mt-1">
            {catTotalStock.toLocaleString("id-ID")} <span className="text-xs font-mono font-normal text-text-muted">pcs</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex flex-col justify-between">
          <span className="text-text-muted uppercase text-[10px] font-bold">JUMLAH SKU VARIAN</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-brand-accent mt-1">
            {catVariants.length} <span className="text-xs font-mono font-normal text-text-muted">SKU</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex flex-col justify-between">
          <span className="text-text-muted uppercase text-[10px] font-bold">STOK MENIPIS (1-5 PCS)</span>
          <span className={`font-mono text-2xl font-bold tabular-nums mt-1 ${catLowCount > 0 ? "text-amber-400" : "text-text-muted"}`}>
            {catLowCount} <span className="text-xs font-mono font-normal text-text-muted">varian</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex flex-col justify-between">
          <span className="text-text-muted uppercase text-[10px] font-bold">STOK HABIS (0 PCS)</span>
          <span className={`font-mono text-2xl font-bold tabular-nums mt-1 ${catOutCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {catOutCount} <span className="text-xs font-mono font-normal text-text-muted">varian</span>
          </span>
        </div>
      </div>

      {/* CONTROLS: SEARCH & FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari warna atau kode SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent placeholder:text-text-muted/60"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border-subtle rounded-xl text-[11px] self-start sm:self-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
              filterMode === "all" ? "bg-surface-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Semua ({colorGroups.length})
          </button>
          <button
            onClick={() => setFilterMode("low")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1 ${
              filterMode === "low" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-text-muted hover:text-amber-400"
            }`}
          >
            Menipis ({catLowCount})
          </button>
          <button
            onClick={() => setFilterMode("out")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1 ${
              filterMode === "out" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-text-muted hover:text-rose-400"
            }`}
          >
            Habis ({catOutCount})
          </button>
        </div>
      </div>

      {/* MATRIX TABLE 2D */}
      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-elevated/70 border-b border-border-subtle text-text-muted uppercase text-[10px] font-bold tracking-wider">
              <th className="p-3.5 pl-4 min-w-[200px]">WARNA & KODE</th>
              {activeSizes.map((sz) => (
                <th key={sz} className="p-3.5 text-center min-w-[140px]">
                  UKURAN {sz}
                </th>
              ))}
              <th className="p-3.5 pr-4 text-center min-w-[180px]">QUICK BATCH FILL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {filteredGroups.map((group) => {
              const rowKey = `${group.colorHex}_${group.colorName}`;
              const rowTotal = Array.from(group.sizeMap.values()).reduce((sum, v) => sum + (v.stockQty || 0), 0);

              return (
                <tr key={rowKey} className="hover:bg-surface-elevated/30 transition-colors">
                  {/* COLOR IDENTITY CELL */}
                  <td className="p-3.5 pl-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-xl border border-border-strong shadow-sm shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: group.colorHex }}
                      />
                      <div>
                        <span className="font-bold text-text-primary block text-xs">{group.colorName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono tabular-nums text-text-muted">{group.colorHex.toUpperCase()}</span>
                          <span className="text-[9px] px-1.5 py-px rounded bg-surface-elevated border border-border-subtle text-text-muted font-bold">
                            Total: {rowTotal} pcs
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SIZES MATRIX CELLS */}
                  {activeSizes.map((sz) => {
                    const variant = group.sizeMap.get(sz.toUpperCase());
                    if (!variant) {
                      return (
                        <td key={sz} className="p-3 text-center text-text-muted/40 font-mono text-[11px]">
                          —
                        </td>
                      );
                    }

                    const stock = variant.stockQty ?? 0;
                    const isOut = stock <= 0;
                    const isLow = stock > 0 && stock <= 5;

                    return (
                      <td key={sz} className="p-2.5 text-center">
                        <div
                          className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                            isOut
                              ? "bg-rose-500/5 border-rose-500/25"
                              : isLow
                              ? "bg-amber-500/5 border-amber-500/25"
                              : "bg-surface-elevated/40 border-border-subtle/80 hover:border-brand-accent/40"
                          }`}
                        >
                          {/* SKU & Price */}
                          <div className="w-full flex justify-between items-center text-[9px] font-mono text-text-muted px-0.5">
                            <span className="truncate max-w-[70px]">{variant.sku.split("-").slice(-2).join("-")}</span>
                            <span className="font-bold text-text-primary">
                              Rp {(variant.priceIdr / 1000).toFixed(0)}k
                            </span>
                          </div>

                          {/* Quick Input & Steppers */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelta(variant.id, -1)}
                              disabled={stock <= 0}
                              className="w-6 h-6 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Kurang 1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={100000}
                              value={stock}
                              onChange={(e) => handleUpdateStock(variant.id, Number(e.target.value))}
                              className={`w-14 text-center font-mono font-bold text-xs py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-brand-accent ${
                                isOut
                                  ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                                  : isLow
                                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                  : "bg-surface border-border-subtle text-text-primary"
                              }`}
                            />

                            <button
                              onClick={() => handleDelta(variant.id, 1)}
                              className="w-6 h-6 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                              title="Tambah 1"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`text-[8px] font-bold px-1.5 py-px rounded-full uppercase tracking-wider ${
                              isOut
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : isLow
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "text-emerald-400 bg-emerald-500/10"
                            }`}
                          >
                            {isOut ? "HABIS" : isLow ? `SISA ${stock}` : "READY"}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* QUICK BATCH FILL FOR THIS COLOR */}
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Qty"
                        min={0}
                        max={100000}
                        value={batchInputs[rowKey] || ""}
                        onChange={(e) =>
                          setBatchInputs((prev) => ({ ...prev, [rowKey]: e.target.value }))
                        }
                        className="w-14 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-mono text-xs text-text-primary focus:outline-none focus:border-brand-accent"
                      />
                      <button
                        onClick={() => handleBatchFill(group, rowKey)}
                        disabled={!batchInputs[rowKey]}
                        className="px-2.5 py-1 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Set All
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredGroups.length === 0 && (
              <tr>
                <td colSpan={activeSizes.length + 2} className="p-8 text-center text-text-muted">
                  Tidak ada varian yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
