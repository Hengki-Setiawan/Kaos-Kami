"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Check,
  X,
  DollarSign,
  Package,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp,
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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Quick edit state per sel
  const [editingPriceVariantId, setEditingPriceVariantId] = useState<string | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>("");

  // Mobile Quick Accordion State
  const [expandedMobileColor, setExpandedMobileColor] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");

  // Batch states per baris warna
  const [batchRowInputs, setBatchRowInputs] = useState<Record<string, { stock: string; price: string }>>({});

  // Batch modal per kolom ukuran
  const [columnBatchModal, setColumnBatchModal] = useState<{ size: string } | null>(null);
  const [colBatchPrice, setColBatchPrice] = useState("");
  const [colBatchStock, setColBatchStock] = useState("");

  // Smart Categorized Category Batch Modal States
  const [isCategoryBatchOpen, setIsCategoryBatchOpen] = useState(false);
  const [catBatchTargetSizes, setCatBatchTargetSizes] = useState<string[]>([]); // empty = all
  const [catBatchTargetColors, setCatBatchTargetColors] = useState<string[]>([]); // empty = all
  const [catBatchCondition, setCatBatchCondition] = useState<"ALL" | "OUT" | "LOW">("ALL");

  const [catBatchPriceMode, setCatBatchPriceMode] = useState<"NONE" | "FIXED" | "OFFSET">("FIXED");
  const [catBatchPriceVal, setCatBatchPriceVal] = useState("59000");
  const [catBatchXxlMarkup, setCatBatchXxlMarkup] = useState("10000");

  const [catBatchStockMode, setCatBatchStockMode] = useState<"NONE" | "FIXED" | "ADD">("NONE");
  const [catBatchStockVal, setCatBatchStockVal] = useState("20");

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

  // Unique colors in active category
  const uniqueCategoryColors = Array.from(new Set(catVariants.map((v) => v.colorName)));

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

  const showToast = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Update single stock handler
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
      showToast("Stok berhasil diperbarui", "success");
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, "error");
    }
  };

  // 2. Quick Delta (+1 / -1)
  const handleDelta = async (variantId: string, delta: number) => {
    const current = variants.find((v) => v.id === variantId)?.stockQty ?? 0;
    await handleUpdateStock(variantId, current + delta);
  };

  // 3. Update single price handler (Inline price edit)
  const handleSavePrice = async (variantId: string) => {
    const val = parseInt(tempPriceInput.replace(/\D/g, ""), 10);
    if (isNaN(val) || val < 1000 || val > 100_000_000) {
      showToast("Harga tidak valid (minimal Rp 1.000)", "error");
      return;
    }

    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, priceIdr: val } : v))
    );
    setEditingPriceVariantId(null);

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, priceIdr: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah harga");
      showToast(`Harga berhasil diubah ke Rp ${val.toLocaleString("id-ID")}`, "success");
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, "error");
    }
  };

  // 4. Batch update per row (warna)
  const handleBatchRow = async (
    group: { sizeMap: Map<string, VariantItem> },
    rowKey: string,
    actionType: "stock" | "price"
  ) => {
    const rowInput = batchRowInputs[rowKey] || { stock: "", price: "" };
    const items = Array.from(group.sizeMap.values());

    if (actionType === "stock") {
      const val = parseInt(rowInput.stock, 10);
      if (isNaN(val) || val < 0) return showToast("Masukkan angka stok yang valid", "error");

      const batch = items.map((v) => ({ variantId: v.id, stockQty: val }));
      setVariants((prev) =>
        prev.map((v) => {
          const match = batch.find((b) => b.variantId === v.id);
          return match ? { ...v, stockQty: match.stockQty } : v;
        })
      );

      try {
        const res = await fetch("/api/admin/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchVariations: batch }),
        });
        if (!res.ok) throw new Error("Gagal menyimpan batch stok");
        showToast(`Stok semua ukuran warna ini di-set ke ${val} pcs`, "success");
        setBatchRowInputs((prev) => ({
          ...prev,
          [rowKey]: { ...rowInput, stock: "" },
        }));
      } catch (e: any) {
        showToast(e.message, "error");
      }
    } else {
      const val = parseInt(rowInput.price.replace(/\D/g, ""), 10);
      if (isNaN(val) || val < 1000) return showToast("Masukkan harga valid (min Rp 1.000)", "error");

      const batch = items.map((v) => ({ variantId: v.id, priceIdr: val }));
      setVariants((prev) =>
        prev.map((v) => {
          const match = batch.find((b) => b.variantId === v.id);
          return match ? { ...v, priceIdr: match.priceIdr } : v;
        })
      );

      try {
        const res = await fetch("/api/admin/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchVariations: batch }),
        });
        if (!res.ok) throw new Error("Gagal menyimpan batch harga");
        showToast(`Harga semua ukuran warna ini di-set ke Rp ${val.toLocaleString("id-ID")}`, "success");
        setBatchRowInputs((prev) => ({
          ...prev,
          [rowKey]: { ...rowInput, price: "" },
        }));
      } catch (e: any) {
        showToast(e.message, "error");
      }
    }
  };

  // 5. Batch update per kolom ukuran
  const handleApplyColumnBatch = async () => {
    if (!columnBatchModal) return;
    const targetSize = columnBatchModal.size.toUpperCase();
    const targetVariants = catVariants.filter((v) => v.size.toUpperCase() === targetSize);

    if (targetVariants.length === 0) return setColumnBatchModal(null);

    const priceVal = colBatchPrice ? parseInt(colBatchPrice.replace(/\D/g, ""), 10) : undefined;
    const stockVal = colBatchStock ? parseInt(colBatchStock, 10) : undefined;

    if (priceVal === undefined && stockVal === undefined) {
      return showToast("Isi harga atau stok untuk menerapkan batch", "error");
    }

    const batch = targetVariants.map((v) => ({
      variantId: v.id,
      ...(priceVal !== undefined ? { priceIdr: priceVal } : {}),
      ...(stockVal !== undefined ? { stockQty: stockVal } : {}),
    }));

    // Optimistic update
    setVariants((prev) =>
      prev.map((v) => {
        const match = batch.find((b) => b.variantId === v.id);
        if (!match) return v;
        return {
          ...v,
          ...(match.priceIdr !== undefined ? { priceIdr: match.priceIdr } : {}),
          ...(match.stockQty !== undefined ? { stockQty: match.stockQty } : {}),
        };
      })
    );
    setColumnBatchModal(null);
    setColBatchPrice("");
    setColBatchStock("");

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchVariations: batch }),
      });
      if (!res.ok) throw new Error("Gagal update kolom");
      showToast(`Berhasil update ${batch.length} varian ukuran ${targetSize}`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // 6. Smart Categorized Bulk Action Logic
  // Filter impacted variants based on categorization rules
  const matchedBatchVariants = React.useMemo(() => {
    return catVariants.filter((v) => {
      // 1. Filter Ukuran Target
      if (catBatchTargetSizes.length > 0 && !catBatchTargetSizes.includes(v.size.toUpperCase())) {
        return false;
      }
      // 2. Filter Warna Target
      if (catBatchTargetColors.length > 0 && !catBatchTargetColors.includes(v.colorName)) {
        return false;
      }
      // 3. Filter Kondisi Stok
      const stock = v.stockQty || 0;
      if (catBatchCondition === "OUT" && stock > 0) return false;
      if (catBatchCondition === "LOW" && (stock <= 0 || stock > 5)) return false;

      return true;
    });
  }, [catVariants, catBatchTargetSizes, catBatchTargetColors, catBatchCondition]);

  const handleApplySmartBatch = async () => {
    if (matchedBatchVariants.length === 0) {
      return showToast("Tidak ada varian yang cocok dengan kriteria filter yang dipilih", "error");
    }

    if (catBatchPriceMode === "NONE" && catBatchStockMode === "NONE") {
      return showToast("Pilih minimal satu aturan perubahan (Harga atau Stok)", "error");
    }

    const priceInputVal = catBatchPriceVal ? parseInt(catBatchPriceVal.replace(/\D/g, ""), 10) : 0;
    const markupVal = catBatchXxlMarkup ? parseInt(catBatchXxlMarkup.replace(/\D/g, ""), 10) : 0;
    const stockInputVal = catBatchStockVal ? parseInt(catBatchStockVal, 10) : 0;

    const batch = matchedBatchVariants.map((v) => {
      const updateObj: { variantId: string; priceIdr?: number; stockQty?: number } = {
        variantId: v.id,
      };

      // Rules Harga
      if (catBatchPriceMode === "FIXED") {
        let finalP = priceInputVal;
        if (v.size.toUpperCase() === "XXL" || v.size.toUpperCase() === "3XL") {
          finalP += markupVal;
        }
        updateObj.priceIdr = Math.max(1000, finalP);
      } else if (catBatchPriceMode === "OFFSET") {
        updateObj.priceIdr = Math.max(1000, v.priceIdr + priceInputVal);
      }

      // Rules Stok
      if (catBatchStockMode === "FIXED") {
        updateObj.stockQty = Math.max(0, stockInputVal);
      } else if (catBatchStockMode === "ADD") {
        updateObj.stockQty = Math.max(0, (v.stockQty || 0) + stockInputVal);
      }

      return updateObj;
    });

    // Optimistic Update
    setVariants((prev) =>
      prev.map((v) => {
        const match = batch.find((b) => b.variantId === v.id);
        if (!match) return v;
        return {
          ...v,
          ...(match.priceIdr !== undefined ? { priceIdr: match.priceIdr } : {}),
          ...(match.stockQty !== undefined ? { stockQty: match.stockQty } : {}),
        };
      })
    );

    setIsCategoryBatchOpen(false);

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchVariations: batch }),
      });
      if (!res.ok) throw new Error("Gagal menerapkan aksi massal");
      showToast(`Berhasil menerapkan aturan ke ${batch.length} varian SKU terpilih!`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
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
            Kelola persilangan <strong>Produk × Warna × Ukuran</strong>. Klik harga (<strong>Rp ...</strong>) untuk ubah satuan, tombol <strong>+/-</strong> untuk stok, atau gunakan <strong>Aksi Massal Cerdas</strong>.
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

      {/* APPAREL SELECTOR PILLS */}
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
                  ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_4px_16px_rgba(37,99,235,0.35)] scale-[1.02]"
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

      {/* CONTROLS: SEARCH, FILTER & BATCH ACTION BUTTON */}
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border-subtle rounded-xl text-[11px] overflow-x-auto max-w-full">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all whitespace-nowrap ${
                filterMode === "all" ? "bg-surface-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Semua ({colorGroups.length})
            </button>
            <button
              onClick={() => setFilterMode("low")}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1 whitespace-nowrap ${
                filterMode === "low" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-text-muted hover:text-amber-400"
              }`}
            >
              Menipis ({catLowCount})
            </button>
            <button
              onClick={() => setFilterMode("out")}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1 whitespace-nowrap ${
                filterMode === "out" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-text-muted hover:text-rose-400"
              }`}
            >
              Habis ({catOutCount})
            </button>
          </div>

          {/* Smart Categorized Batch Action Button */}
          <button
            onClick={() => {
              setCatBatchTargetSizes([]);
              setCatBatchTargetColors([]);
              setCatBatchCondition("ALL");
              setCatBatchPriceVal(activeCategory?.basePriceIdr?.toString() || "59000");
              setCatBatchPriceMode("FIXED");
              setCatBatchStockMode("NONE");
              setIsCategoryBatchOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs transition-all shadow-md hover:opacity-90 w-full sm:w-auto"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Aksi Massal Cerdas (Kategori)</span>
          </button>
        </div>
      </div>

      {/* MOBILE DISPLAY TOGGLE: Mode Kartu vs Matriks */}
      <div className="flex sm:hidden items-center justify-between p-2.5 rounded-xl bg-surface border border-border-subtle mb-3 text-xs">
        <span className="font-sans font-bold text-[10px] text-text-muted uppercase">Tampilan Mobile:</span>
        <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() => setMobileViewMode("card")}
            className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase transition-all ${
              mobileViewMode === "card"
                ? "bg-brand-accent text-canvas shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            🗂️ Kartu Warna
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode("table")}
            className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase transition-all ${
              mobileViewMode === "table"
                ? "bg-brand-accent text-canvas shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            📊 Matriks 2D
          </button>
        </div>
      </div>

      {/* MOBILE QUICK COLOR ACCORDION (Khusus layar < sm) */}
      {mobileViewMode === "card" && (
        <div className="block sm:hidden space-y-2.5 mb-4">
          {filteredGroups.map((group) => {
            const rowKey = `${group.colorHex}_${group.colorName}`;
            const isExpanded = expandedMobileColor === rowKey;
            const items = Array.from(group.sizeMap.values());
            const rowTotal = items.reduce((sum, v) => sum + (v.stockQty || 0), 0);
            const hasOut = items.some((v) => (v.stockQty || 0) <= 0);
            const hasLow = items.some((v) => (v.stockQty || 0) > 0 && (v.stockQty || 0) <= 5);

            return (
              <div
                key={rowKey}
                className="rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-xs transition-all"
              >
                {/* Header Kartu Warna */}
                <button
                  type="button"
                  onClick={() => setExpandedMobileColor(isExpanded ? null : rowKey)}
                  className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-surface-elevated/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg border border-border-strong shrink-0 shadow-xs"
                      style={{ backgroundColor: group.colorHex }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-text-primary block truncate">
                        {group.colorName}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {group.colorHex.toUpperCase()} · Total {rowTotal} pcs
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasOut ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Ada Habis
                      </span>
                    ) : hasLow ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Menipis
                      </span>
                    ) : null}
                    <div className="w-6 h-6 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </button>

                {/* Body Rincian Varian Ukuran */}
                {isExpanded && (
                  <div className="p-3 border-t border-border-subtle/80 bg-surface-elevated/20 space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      {activeSizes.map((sz) => {
                        const variant = group.sizeMap.get(sz.toUpperCase());
                        if (!variant) return null;

                        const stock = variant.stockQty ?? 0;
                        const isOut = stock <= 0;
                        const isLow = stock > 0 && stock <= 5;
                        const isEditingPrice = editingPriceVariantId === variant.id;

                        return (
                          <div
                            key={sz}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              isOut
                                ? "bg-rose-500/5 border-rose-500/25"
                                : isLow
                                ? "bg-amber-500/5 border-amber-500/25"
                                : "bg-surface border-border-subtle"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-text-primary">
                                  Size {sz}
                                </span>
                                <span
                                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                    isOut
                                      ? "bg-rose-500/20 text-rose-300"
                                      : isLow
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {isOut ? "HABIS" : isLow ? `SISA ${stock}` : "READY"}
                                </span>
                              </div>

                              {/* Price edit */}
                              <div className="mt-1">
                                {isEditingPrice ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={tempPriceInput}
                                      onChange={(e) => setTempPriceInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSavePrice(variant.id);
                                        if (e.key === "Escape") setEditingPriceVariantId(null);
                                      }}
                                      className="w-16 px-1 py-0.5 text-center font-mono font-bold text-[10px] bg-surface rounded border border-brand-accent text-text-primary"
                                    />
                                    <button
                                      onClick={() => handleSavePrice(variant.id)}
                                      className="p-1 text-emerald-400"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setEditingPriceVariantId(null)}
                                      className="p-1 text-rose-400"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingPriceVariantId(variant.id);
                                      setTempPriceInput(variant.priceIdr.toString());
                                    }}
                                    className="text-[10px] font-mono text-text-muted hover:text-brand-accent underline underline-offset-2"
                                  >
                                    Rp {(variant.priceIdr / 1000).toFixed(0)}k
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Stock Steppers */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDelta(variant.id, -1)}
                                disabled={stock <= 0}
                                className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                value={stock}
                                onChange={(e) => handleUpdateStock(variant.id, Number(e.target.value))}
                                className={`w-12 text-center font-mono font-bold text-xs py-1 rounded-lg border ${
                                  isOut
                                    ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                                    : isLow
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                    : "bg-surface border-border-subtle text-text-primary"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleDelta(variant.id, 1)}
                                className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredGroups.length === 0 && (
            <div className="p-6 text-center text-text-muted text-xs bg-surface rounded-2xl border border-border-subtle">
              Tidak ada varian yang cocok dengan filter.
            </div>
          )}
        </div>
      )}

      {/* MATRIX TABLE 2D */}
      <div className={`overflow-x-auto rounded-2xl border border-border-subtle bg-surface ${
        mobileViewMode === "card" ? "hidden sm:block" : "block"
      }`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-elevated/70 border-b border-border-subtle text-text-muted uppercase text-[10px] font-bold tracking-wider">
              <th className="p-3.5 pl-4 min-w-[200px]">WARNA & KODE</th>
              {activeSizes.map((sz) => (
                <th key={sz} className="p-3.5 text-center min-w-[150px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>UKURAN {sz}</span>
                    <button
                      onClick={() => setColumnBatchModal({ size: sz })}
                      className="p-1 rounded hover:bg-surface text-brand-accent hover:text-brand-accent/80 transition-colors"
                      title={`⚡ Atur Massal Kolom ${sz}`}
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="p-3.5 pr-4 text-center min-w-[220px]">AKSI CEPAT WARNA (BATCH)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {filteredGroups.map((group) => {
              const rowKey = `${group.colorHex}_${group.colorName}`;
              const rowTotal = Array.from(group.sizeMap.values()).reduce((sum, v) => sum + (v.stockQty || 0), 0);
              const rowInputs = batchRowInputs[rowKey] || { stock: "", price: "" };

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
                    const isEditingPrice = editingPriceVariantId === variant.id;

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
                          {/* SKU & EDITABLE PRICE */}
                          <div className="w-full flex justify-between items-center text-[9px] font-mono text-text-muted px-0.5">
                            <span className="truncate max-w-[60px]" title={variant.sku}>
                              {variant.sku.split("-").slice(-2).join("-")}
                            </span>

                            {isEditingPrice ? (
                              <div className="flex items-center gap-1 bg-surface p-0.5 rounded border border-brand-accent">
                                <input
                                  type="text"
                                  autoFocus
                                  value={tempPriceInput}
                                  onChange={(e) => setTempPriceInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSavePrice(variant.id);
                                    if (e.key === "Escape") setEditingPriceVariantId(null);
                                  }}
                                  className="w-14 text-center font-mono font-bold text-[10px] text-text-primary bg-transparent focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSavePrice(variant.id)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="Simpan"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingPriceVariantId(null)}
                                  className="text-rose-400 hover:text-rose-300"
                                  title="Batal"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPriceVariantId(variant.id);
                                  setTempPriceInput(variant.priceIdr.toString());
                                }}
                                className="font-bold text-text-primary hover:text-brand-accent underline-offset-2 hover:underline transition-colors flex items-center gap-0.5"
                                title="Klik untuk edit harga"
                              >
                                <span>Rp {(variant.priceIdr / 1000).toFixed(0)}k</span>
                              </button>
                            )}
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

                  {/* QUICK BATCH ROW ACTIONS (DUAL: STOK & HARGA) */}
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                      {/* Batch Stok */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Stok"
                          min={0}
                          value={rowInputs.stock}
                          onChange={(e) =>
                            setBatchRowInputs((prev) => ({
                              ...prev,
                              [rowKey]: { ...rowInputs, stock: e.target.value },
                            }))
                          }
                          className="w-16 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-mono text-xs text-text-primary focus:outline-none focus:border-brand-accent"
                        />
                        <button
                          onClick={() => handleBatchRow(group, rowKey, "stock")}
                          disabled={!rowInputs.stock}
                          className="flex-1 py-1 px-2 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Set Stok
                        </button>
                      </div>

                      {/* Batch Harga */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Rp Harga"
                          value={rowInputs.price}
                          onChange={(e) =>
                            setBatchRowInputs((prev) => ({
                              ...prev,
                              [rowKey]: { ...rowInputs, price: e.target.value },
                            }))
                          }
                          className="w-16 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-mono text-[10px] text-text-primary focus:outline-none focus:border-brand-accent"
                        />
                        <button
                          onClick={() => handleBatchRow(group, rowKey, "price")}
                          disabled={!rowInputs.price}
                          className="flex-1 py-1 px-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary hover:border-brand-accent font-bold text-[10px] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Set Harga
                        </button>
                      </div>
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

      {/* MODAL BATCH KOLOM (PER UKURAN) */}
      {columnBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-accent" />
                <h3 className="font-bold text-sm text-text-primary uppercase">
                  Atur Massal Kolom Ukuran {columnBatchModal.size}
                </h3>
              </div>
              <button
                onClick={() => setColumnBatchModal(null)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Terapkan perubahan serentak untuk <strong>semua warna</strong> pada ukuran <strong>{columnBatchModal.size}</strong> di kategori {activeCategory?.name}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Set Harga Baru (Rp)</label>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak diubah"
                  value={colBatchPrice}
                  onChange={(e) => setColBatchPrice(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Set Stok Baru (Pcs)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Kosongkan jika tidak diubah"
                  value={colBatchStock}
                  onChange={(e) => setColBatchStock(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setColumnBatchModal(null)}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted hover:text-text-primary font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyColumnBatch}
                className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-md"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART CATEGORIZED BULK RULE EDITOR MODAL */}
      {isCategoryBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-accent" />
                <div>
                  <h3 className="font-bold text-base text-text-primary uppercase tracking-wide">
                    AKSI MASSAL CERDAS — {activeCategory?.name}
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Filter target varian secara spesifik lalu terapkan aturan stok & harga.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryBatchOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE IMPACT COUNTER BADGE */}
            <div className="p-3 rounded-2xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-text-primary font-medium">
                <Filter className="w-4 h-4 text-brand-accent" />
                <span>Target Terpilih:</span>
              </div>
              <span className="font-mono font-bold text-xs text-brand-accent">
                {matchedBatchVariants.length} dari {catVariants.length} Varian SKU
              </span>
            </div>

            {/* STEP 1: SEGMENTASI TARGET (KATEGORISASI) */}
            <div className="space-y-3 p-4 rounded-2xl bg-surface-elevated/40 border border-border-subtle text-xs">
              <span className="font-bold text-text-primary uppercase tracking-wider block text-[11px]">
                1. FILTER TARGET VARIAN
              </span>

              {/* Ukuran Target */}
              <div>
                <span className="text-[11px] text-text-muted block mb-1">Target Ukuran:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatBatchTargetSizes([])}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-all ${
                      catBatchTargetSizes.length === 0
                        ? "bg-brand-accent text-canvas border-brand-accent"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Semua Ukuran
                  </button>
                  {activeSizes.map((sz) => {
                    const isSelected = catBatchTargetSizes.includes(sz.toUpperCase());
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => {
                          if (isSelected) {
                            setCatBatchTargetSizes(catBatchTargetSizes.filter((s) => s !== sz.toUpperCase()));
                          } else {
                            setCatBatchTargetSizes([...catBatchTargetSizes, sz.toUpperCase()]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border transition-all ${
                          isSelected
                            ? "bg-brand-accent text-canvas border-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Warna Target */}
              <div>
                <span className="text-[11px] text-text-muted block mb-1">Target Warna:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatBatchTargetColors([])}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-all ${
                      catBatchTargetColors.length === 0
                        ? "bg-brand-accent text-canvas border-brand-accent"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Semua Warna
                  </button>
                  {uniqueCategoryColors.map((cName) => {
                    const isSelected = catBatchTargetColors.includes(cName);
                    return (
                      <button
                        type="button"
                        key={cName}
                        onClick={() => {
                          if (isSelected) {
                            setCatBatchTargetColors(catBatchTargetColors.filter((c) => c !== cName));
                          } else {
                            setCatBatchTargetColors([...catBatchTargetColors, cName]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                          isSelected
                            ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {cName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kondisi Stok Target */}
              <div>
                <span className="text-[11px] text-text-muted block mb-1">Kondisi Stok:</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: "ALL", label: "Semua Kondisi" },
                    { id: "OUT", label: "Hanya yang Habis (0 pcs)" },
                    { id: "LOW", label: "Hanya yang Menipis (1–5 pcs)" },
                  ].map((cond) => (
                    <button
                      type="button"
                      key={cond.id}
                      onClick={() => setCatBatchCondition(cond.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        catBatchCondition === cond.id
                          ? "bg-surface-elevated text-text-primary font-bold border-brand-accent"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {cond.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 2: ATURAN HARGA */}
            <div className="space-y-3 p-4 rounded-2xl bg-surface-elevated/40 border border-border-subtle text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary uppercase tracking-wider block text-[11px]">
                  2. ATURAN HARGA
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatBatchPriceMode("FIXED")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchPriceMode === "FIXED" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Set Tetap
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBatchPriceMode("OFFSET")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchPriceMode === "OFFSET" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Naik/Turun (+/-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBatchPriceMode("NONE")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchPriceMode === "NONE" ? "bg-surface text-rose-400" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Jangan Ubah
                  </button>
                </div>
              </div>

              {catBatchPriceMode !== "NONE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-text-primary mb-1">
                      {catBatchPriceMode === "FIXED" ? "Harga Seragam (Rp)" : "Penyesuaian (+/- Rp)"}
                    </label>
                    <input
                      type="text"
                      value={catBatchPriceVal}
                      onChange={(e) => setCatBatchPriceVal(e.target.value)}
                      className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  {catBatchPriceMode === "FIXED" && (
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Markup Khusus XXL/3XL (+Rp)
                      </label>
                      <input
                        type="text"
                        value={catBatchXxlMarkup}
                        onChange={(e) => setCatBatchXxlMarkup(e.target.value)}
                        className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 3: ATURAN STOK */}
            <div className="space-y-3 p-4 rounded-2xl bg-surface-elevated/40 border border-border-subtle text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary uppercase tracking-wider block text-[11px]">
                  3. ATURAN STOK
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatBatchStockMode("FIXED")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchStockMode === "FIXED" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Set Qty Tetap
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBatchStockMode("ADD")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchStockMode === "ADD" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Tambah (+Pcs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBatchStockMode("NONE")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      catBatchStockMode === "NONE" ? "bg-surface text-rose-400" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Jangan Ubah
                  </button>
                </div>
              </div>

              {catBatchStockMode !== "NONE" && (
                <div className="pt-1">
                  <label className="block font-bold text-text-primary mb-1">
                    {catBatchStockMode === "FIXED" ? "Jumlah Stok Baru (Pcs)" : "Tambah Stok Masuk (+Pcs)"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={catBatchStockVal}
                    onChange={(e) => setCatBatchStockVal(e.target.value)}
                    className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsCategoryBatchOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted hover:text-text-primary font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplySmartBatch}
                disabled={matchedBatchVariants.length === 0}
                className="px-5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-md disabled:opacity-40"
              >
                Terapkan ke {matchedBatchVariants.length} Varian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
