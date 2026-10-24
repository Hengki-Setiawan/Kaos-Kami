"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { useCartStore } from "@/store/useCartStore";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import {
  ShoppingBag,
  Filter,
  Search,
  Box,
  Eye,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Minus,
  Plus,
  Shirt,
  SlidersHorizontal,
} from "lucide-react";

// Lazy-load 3D Orbit Viewer (Cloudflare Rule 6: Worker lean < 1.2MB, zero SSR Three.js)
const Showcase3DOrbitViewer = dynamic(
  () => import("@/components/3d/Showcase3DOrbitViewer").then((m) => m.Showcase3DOrbitViewer),
  { ssr: false }
);

interface ProductSizeOption {
  size: string;
  priceIdr: number;
  stockQty: number;
  variantId?: string;
  sku?: string;
}

interface ProductVariantItem {
  id: string;
  name: string;
  priceIdr: number;
  colorName: string;
  colorHex: string;
  size: string;
  stockQty: number;
  images: string[];
  isPreDesigned: boolean;
  tagline?: string;
  description?: string;
  sizes?: ProductSizeOption[];
  mockup3D?: {
    frontDecalUrl?: string;
    backDecalUrl?: string;
  };
  category?: {
    slug: string;
    name: string;
    weightGsm?: string;
  };
}

const APPAREL_SLUG_ALIASES: Record<string, ApparelType> = {
  jacket: "shirt",
  shirt: "shirt",
};

// Helper deskripsi bahan dinamis akurat sesuai jenis pakaian (bukan hardcode Combed 24s untuk hoodie!)
function getApparelSpecs(slug: string) {
  switch (slug) {
    case "hoodie":
      return {
        fabric: "Cotton Fleece 330 GSM Heavyweight",
        curing: "Sablon DTF HD Curing Oven (Tahan Cuci 50x+)",
        fit: "Boxy Oversize Drop-Shoulder Distro Fit",
      };
    case "shirt":
      return {
        fabric: "Micro Taslan Parasut Windproof + Furing Peles",
        curing: "Sablon DTF High-Density Waterproof",
        fit: "Street Tactical Cut dengan Kancing Snap Anti Karat",
      };
    case "crewneck":
      return {
        fabric: "French Terry 320 GSM Premium Soft-Touch",
        curing: "Sablon DTF HD Curing Oven Presisi",
        fit: "Relaxed Distro Cut dengan Rib Katun Spandex Elastis",
      };
    case "longsleeve":
      return {
        fabric: "Katun Combed 24s (190 GSM) Reactive Grade A",
        curing: "Sablon DTF HD Curing Oven (Tahan Cuci 50x+)",
        fit: "Lengan Panjang Rib Elastis Standar Ekspor",
      };
    default:
      return {
        fabric: "Katun Combed 24s (190 GSM) Reactive Grade A",
        curing: "Sablon DTF HD Curing Oven (Tahan Cuci 50x+)",
        fit: "Jahitan Rantai Pundak & Overdeck 3 Jarum Standar Distro",
      };
  }
}

export function CatalogClient() {
  const [products, setProducts] = useState<ProductVariantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "stock-desc">("default");

  // Per-card selected size state
  const [cardSelectedSizes, setCardSelectedSizes] = useState<Record<string, string>>({});
  // Feedback animasi sukses add-to-cart per card
  const [addedCardId, setAddedCardId] = useState<string | null>(null);

  // Quick View / 3D Detail Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<ProductVariantItem | null>(null);
  const [modalMode, setModalMode] = useState<"photo" | "3d">("photo");
  const [modalSize, setModalSize] = useState<string>("L");
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalAdded, setModalAdded] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const { setActiveApparel, setSelectedColor, setSelectedSize, setViewMode } = useConfiguratorStore(
    useShallow((s) => ({
      setActiveApparel: s.setActiveApparel,
      setSelectedColor: s.setSelectedColor,
      setSelectedSize: s.setSelectedSize,
      setViewMode: s.setViewMode,
    }))
  );

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`/api/catalog/variants?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.variants)) {
          setProducts(data.variants);
        } else {
          setFetchError(data?.error || `Server katalog bermasalah (HTTP ${res.status}). Coba muat ulang.`);
        }
      } catch (err) {
        console.error("Gagal mengambil data produk katalog:", err);
        setFetchError("Koneksi ke server putus. Periksa internet lalu muat ulang.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Lock scroll background saat Quick View Modal terbuka & hentikan Lenis agar tidak membajak mouse wheel
  useEffect(() => {
    if (!quickViewProduct) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Hentikan Lenis smooth scroll seketika saat popup terbuka
    if (typeof window !== "undefined" && (window as any).__lenis) {
      try {
        (window as any).__lenis.stop?.();
      } catch (err) {
        console.warn("[CatalogClient] Gagal stop Lenis:", err);
      }
    }

    return () => {
      document.body.style.overflow = origOverflow;
      // Aktifkan kembali Lenis setelah popup ditutup
      if (typeof window !== "undefined" && (window as any).__lenis) {
        try {
          (window as any).__lenis.start?.();
        } catch (err) {
          console.warn("[CatalogClient] Gagal start Lenis:", err);
        }
      }
    };
  }, [quickViewProduct]);

  // Normalisasi slug apparel
  const canonicalSlugOf = (p: ProductVariantItem): ApparelType => {
    const raw = (p.category?.slug || "").trim().toLowerCase();
    if ((Object.keys(APPAREL_CATALOG) as string[]).includes(raw)) return raw as ApparelType;
    return APPAREL_SLUG_ALIASES[raw] || "tshirt";
  };

  const matchesCategory = (p: ProductVariantItem): boolean => {
    if (selectedCategory === "ALL") return true;
    const slug = canonicalSlugOf(p);
    if (selectedCategory === "KAOS") return slug === "tshirt" || slug === "longsleeve";
    if (selectedCategory === "HOODIE") return slug === "hoodie" || slug === "crewneck";
    if (selectedCategory === "JAKET") return slug === "shirt";
    if (selectedCategory === "AKSESORI") return slug === "cap" || slug === "pants" || slug === "shorts";
    return true;
  };

  // Filter & Search & Sort pipeline
  const processedProducts = useMemo(() => {
    let result = products.filter((p) => {
      // 1. Category Filter
      if (!matchesCategory(p)) return false;

      // 2. Size Filter
      if (selectedSizeFilter !== "ALL") {
        const sizesArr = p.sizes;
        const hasSize = Array.isArray(sizesArr) && sizesArr.length > 0
          ? sizesArr.some((s) => s.size === selectedSizeFilter && (s.stockQty ?? 0) > 0)
          : p.size === selectedSizeFilter;
        if (!hasSize) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const colorMatch = (p.colorName || "").toLowerCase().includes(q);
        const catMatch = (p.category?.name || "").toLowerCase().includes(q);
        if (!nameMatch && !colorMatch && !catMatch) return false;
      }

      return true;
    });

    // 4. Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.priceIdr - b.priceIdr);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.priceIdr - a.priceIdr);
    } else if (sortBy === "stock-desc") {
      result.sort((a, b) => (b.stockQty ?? 0) - (a.stockQty ?? 0));
    }

    return result;
  }, [products, selectedCategory, selectedSizeFilter, searchQuery, sortBy]);

  // Handler Beli Cepat dari Kartu
  const handleCardQuickBuy = (product: ProductVariantItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const chosenSize = cardSelectedSizes[product.id] || product.size || "L";
    
    // Cari varian size yang sesuai
    let matchedStock = product.stockQty ?? 0;
    let matchedVariantId = product.id;
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      const found = product.sizes.find((s) => s.size === chosenSize);
      if (found) {
        matchedStock = found.stockQty;
        matchedVariantId = found.variantId || product.id;
      }
    }

    if (matchedStock <= 0) {
      setNotice(`Stok ${product.name} (Ukuran ${chosenSize}) saat ini habis.`);
      return;
    }

    addItem({
      id: matchedVariantId,
      name: product.name,
      priceIdr: product.priceIdr,
      size: chosenSize,
      colorName: product.colorName,
      colorHex: product.colorHex,
      image: (Array.isArray(product.images) && product.images[0]) || "/products/tshirt-orange-makassar.jpg",
      apparelSlug: canonicalSlugOf(product),
      productVariantId: matchedVariantId,
      stockQty: matchedStock,
      quantity: 1,
    });

    // Visual feedback
    setAddedCardId(product.id);
    setTimeout(() => setAddedCardId(null), 1400);

    // Buka cart drawer agar pembeli langsung melihat item masuk
    openCart();
  };

  // Handler Buka Modal Quick View / Preview 3D
  const handleOpenQuickView = (product: ProductVariantItem, initialMode: "photo" | "3d" = "photo") => {
    const defaultSize = cardSelectedSizes[product.id] || product.size || "L";
    setQuickViewProduct(product);
    setModalMode(initialMode);
    setModalSize(defaultSize);
    setModalQty(1);
    setActivePhotoIndex(0);
    setModalAdded(false);
  };

  // Handler Add to Cart dari dalam Modal Quick View
  const handleModalAddToCart = () => {
    if (!quickViewProduct) return;
    let matchedStock = quickViewProduct.stockQty ?? 0;
    let matchedVariantId = quickViewProduct.id;
    if (Array.isArray(quickViewProduct.sizes) && quickViewProduct.sizes.length > 0) {
      const found = quickViewProduct.sizes.find((s) => s.size === modalSize);
      if (found) {
        matchedStock = found.stockQty;
        matchedVariantId = found.variantId || quickViewProduct.id;
      }
    }

    if (matchedStock <= 0) {
      setNotice(`Ukuran ${modalSize} sedang habis stok.`);
      return;
    }

    addItem({
      id: matchedVariantId,
      name: quickViewProduct.name,
      priceIdr: quickViewProduct.priceIdr,
      size: modalSize,
      colorName: quickViewProduct.colorName,
      colorHex: quickViewProduct.colorHex,
      image: (Array.isArray(quickViewProduct.images) && quickViewProduct.images[0]) || "/products/tshirt-orange-makassar.jpg",
      apparelSlug: canonicalSlugOf(quickViewProduct),
      productVariantId: matchedVariantId,
      stockQty: matchedStock,
      quantity: modalQty,
    });

    setModalAdded(true);
    setQuickViewProduct(null);
    openCart();
  };

  // Handler Buka di Studio 3D Desain Penuh
  const handleOpenInStudio = (product: ProductVariantItem) => {
    const slug = canonicalSlugOf(product);
    setActiveApparel(slug);
    setSelectedColor(product.colorHex);
    setSelectedSize(cardSelectedSizes[product.id] || product.size || "L");
    setViewMode("studio");
  };

  // Reset semua filter
  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedSizeFilter("ALL");
    setSortBy("default");
  };

  const isFilterActive = searchQuery !== "" || selectedCategory !== "ALL" || selectedSizeFilter !== "ALL" || sortBy !== "default";

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col selection:bg-brand-accent selection:text-canvas">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 space-y-5">
        {/* Header Bersih & Ringkas — Standar E-Commerce Startup */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 pb-4 border-b border-border-subtle/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-brand-accent font-bold tracking-widest uppercase">
                KATALOG STREETWEAR MAKASSAR
              </span>
              <span className="text-[10px] text-text-muted">·</span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ready Stock
              </span>
            </div>
            <h1 className="font-sans font-black text-xl sm:text-2xl tracking-tight text-text-primary uppercase">
              Koleksi Pakaian Jadi
            </h1>
          </div>

          <div className="text-right">
            <span className="font-mono text-[11px] text-text-muted">
              Menampilkan <span className="text-text-primary font-bold">{processedProducts.length}</span> produk
            </span>
          </div>
        </div>

        {/* Filter Bar: Clean, Minimal, Startup Tech Style */}
        <div className="space-y-2.5 bg-surface/50 border border-border-subtle p-2.5 sm:p-3 rounded-xl backdrop-blur-sm">
          {/* Baris 1: Search & Sortir */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pakaian, oranye, hitam, hoodie..."
                className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-brand-accent/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                  aria-label="Bersihkan pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-lg bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent font-sans font-medium"
                aria-label="Urutkan produk"
              >
                <option value="default">Rekomendasi</option>
                <option value="price-asc">Harga: Termurah</option>
                <option value="price-desc">Harga: Termahal</option>
                <option value="stock-desc">Stok Terbanyak</option>
              </select>

              {isFilterActive && (
                <button
                  onClick={resetAllFilters}
                  className="px-2 py-1 rounded-lg text-[11px] font-sans font-bold text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Baris 2: Kategori & Ukuran */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/40 font-sans text-xs">
            {/* Kategori Pills */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
              {[
                { id: "ALL", label: "Semua" },
                { id: "KAOS", label: "Kaos" },
                { id: "HOODIE", label: "Hoodie" },
                { id: "JAKET", label: "Jaket" },
                { id: "AKSESORI", label: "Aksesori" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
                    selectedCategory === c.id
                      ? "bg-brand-accent text-canvas font-bold shadow-xs"
                      : "text-text-muted hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Ukuran Filter */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <span className="text-[10px] font-mono text-text-muted mr-0.5">SIZE:</span>
              {["ALL", "S", "M", "L", "XL", "XXL"].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSizeFilter(sz)}
                  className={`min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition-all flex items-center justify-center ${
                    selectedSizeFilter === sz
                      ? "bg-brand-accent text-canvas"
                      : "text-text-muted hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Notice Toast / Alert */}
        {notice && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 font-sans text-xs text-amber-300 flex justify-between items-center animate-fadeIn">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="font-bold px-2 hover:text-white" aria-label="Tutup pemberitahuan">
              ✕
            </button>
          </div>
        )}

        {/* Products Grid: 4 Kolom di Desktop (lg:grid-cols-4), Ramping, Kompak, Tanpa Badge Mengganggu */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="rounded-xl bg-surface/60 border border-border-subtle overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-black/10 dark:bg-white/10" />
                <div className="p-3 space-y-2">
                  <div className="h-2.5 rounded bg-black/10 dark:bg-white/10 w-2/3" />
                  <div className="h-4 rounded bg-black/10 dark:bg-white/10 w-1/2" />
                  <div className="h-8 rounded-lg bg-black/10 dark:bg-white/10 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center font-sans text-xs text-rose-300 p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <p className="font-bold text-sm">Katalog Belum Bisa Dimuat</p>
            <p className="text-text-muted max-w-md mx-auto">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs"
            >
              MUAT ULANG
            </button>
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="py-16 text-center font-sans text-xs text-text-muted p-8 rounded-2xl bg-surface/50 border border-border-subtle space-y-3">
            <p className="text-sm font-semibold text-text-primary">Tidak Ada Produk yang Cocok</p>
            <p>Cobalah mengganti kata kunci pencarian atau reset filter kategori & ukuran Anda.</p>
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 rounded-xl bg-surface border border-border-strong text-text-primary font-bold text-xs hover:border-brand-accent"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {processedProducts.map((p, idx) => {
              const activeSize = cardSelectedSizes[p.id] || p.size || "L";
              const isAdded = addedCardId === p.id;
              const hasSizesArr = Array.isArray(p.sizes) && p.sizes.length > 0;
              const currentStock = hasSizesArr
                ? p.sizes?.find((s) => s.size === activeSize)?.stockQty ?? p.stockQty ?? 0
                : p.stockQty ?? 0;
              const isOutOfStock = currentStock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenQuickView(p, "photo")}
                  className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-surface/70 dark:bg-zinc-950/60 border border-border-subtle hover:border-brand-accent/50 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  {/* Foto Produk Murni & Bersih (Zero Clutter — Tanpa Badge 'PRODUK JADI') */}
                  <div className="relative aspect-[4/5] bg-surface overflow-hidden">
                    <Image
                      src={(Array.isArray(p.images) && p.images[0]) || "/products/tshirt-orange-makassar.jpg"}
                      alt={p.name}
                      width={500}
                      height={625}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={idx < 4}
                      loading={idx < 4 ? undefined : "lazy"}
                      unoptimized={true}
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        const fallback = "/products/tshirt-orange-makassar.jpg";
                        if (!t.src.endsWith(fallback)) t.src = fallback;
                      }}
                    />

                    {/* Titik Warna Minimalis di Sudut Kanan Atas */}
                    <div className="absolute top-2.5 right-2.5 pointer-events-none">
                      <span
                        className="block w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: p.colorHex }}
                        title={p.colorName}
                      />
                    </div>

                    {/* Tag Stok Halus Hanya Jika Habis atau Sedikit */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                        <span className="px-2.5 py-1 rounded-md bg-rose-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                          HABIS
                        </span>
                      </div>
                    )}

                    {/* Hover Quick View Pill */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-canvas/90 text-text-primary text-[10px] font-sans font-bold flex items-center gap-1 shadow-md border border-border-subtle">
                        <Eye size={11} className="text-brand-accent" />
                        Detail & 3D
                      </span>
                    </div>
                  </div>

                  {/* Body Kartu: Ramping, Elegan & Proporsional */}
                  <div className="p-3 sm:p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Kategori & Warna Minimalis */}
                      <span className="block text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
                        {p.category?.name || "Distro"} · {p.colorName}
                      </span>

                      {/* Judul Produk Ramping 1-2 baris */}
                      <h3 className="font-sans font-bold text-xs sm:text-[13px] text-text-primary mt-0.5 group-hover:text-brand-accent transition-colors line-clamp-1 leading-snug">
                        {p.name}
                      </h3>

                      {/* Harga Monospace */}
                      <div className="mt-1 text-xs sm:text-sm font-mono tabular-nums font-bold text-text-primary">
                        Rp {p.priceIdr.toLocaleString("id-ID")}
                      </div>
                    </div>

                    {/* Selector Ukuran Ringkas (S, M, L, XL, XXL) */}
                    {hasSizesArr && (
                      <div
                        className="pt-1 flex items-center gap-1 overflow-x-auto scrollbar-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.sizes?.map((sz) => {
                          const isSelected = activeSize === sz.size;
                          const isAvail = (sz.stockQty ?? 0) > 0;
                          return (
                            <button
                              key={sz.size}
                              type="button"
                              onClick={() => {
                                setCardSelectedSizes((prev) => ({ ...prev, [p.id]: sz.size }));
                              }}
                              disabled={!isAvail}
                              className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all flex items-center justify-center ${
                                isSelected
                                  ? "bg-text-primary text-canvas font-black shadow-xs"
                                  : isAvail
                                  ? "bg-canvas border border-border-subtle text-text-muted hover:text-text-primary"
                                  : "text-text-muted/30 line-through"
                              }`}
                            >
                              {sz.size}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Baris Tombol Aksi 1 Baris: [+ KERANJANG] dan [3D] */}
                    <div
                      className="flex items-center gap-1.5 pt-1.5 border-t border-border-subtle/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Tombol Utama: + Keranjang */}
                      <button
                        type="button"
                        onClick={(e) => handleCardQuickBuy(p, e)}
                        disabled={isOutOfStock}
                        className={`flex-1 h-8 px-2 rounded-lg text-[10px] sm:text-[11px] font-sans font-bold uppercase transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                          isAdded
                            ? "bg-emerald-500 text-white"
                            : "bg-brand-accent text-canvas hover:brightness-110 shadow-xs"
                        }`}
                        title="Masukkan ke keranjang"
                      >
                        {isAdded ? (
                          <>
                            <Check size={12} />
                            <span>✓ Masuk</span>
                          </>
                        ) : isOutOfStock ? (
                          <span>Habis</span>
                        ) : (
                          <>
                            <ShoppingBag size={12} className="shrink-0" />
                            <span>+ Keranjang</span>
                          </>
                        )}
                      </button>

                      {/* Tombol Kedua: Preview 3D (Ikon Kubus 3D Kompak) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuickView(p, "3d");
                        }}
                        className="w-8 h-8 rounded-lg bg-canvas border border-border-subtle hover:border-brand-accent text-text-muted hover:text-brand-accent transition-all flex items-center justify-center shrink-0 active:scale-95"
                        title="Lihat model 3D baju ini berputar 360°"
                      >
                        <Box size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* QUICK VIEW & 3D DETAIL MODAL (RESPONSIF, ANTI-TERPOTONG DI LAPTOP 100%) */}
      {quickViewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          onClick={() => setQuickViewProduct(null)}
        >
          <div
            className="relative w-full max-w-2xl lg:max-w-3xl max-h-[85vh] sm:max-h-[88vh] flex flex-col bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl shadow-2xl text-text-primary overflow-hidden my-auto"
            data-lenis-prevent="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Ringkas */}
            <div className="px-4 sm:px-5 py-3 border-b border-border-subtle flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-brand-accent font-bold uppercase tracking-wider">
                  DISTRO READY STOCK
                </span>
                <span className="text-text-muted text-xs hidden sm:inline">·</span>
                <span className="text-xs text-text-muted truncate max-w-xs hidden sm:inline">
                  {quickViewProduct.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="w-7 h-7 rounded-full bg-canvas border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label="Tutup modal"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body Modal dengan Inner Scroll (Mencegah Terpotong di Layar Kecil & Mencegah Scroll Background) */}
            <div
              ref={modalScrollRef}
              data-lenis-prevent="true"
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 items-start focus:outline-none"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255, 122, 26, 0.4) transparent",
              }}
            >
              {/* Kolom Kiri: Visual (Foto vs 3D Orbit Viewer) */}
              <div className="space-y-3">
                {/* Switcher Foto vs 3D */}
                <div className="inline-flex items-center gap-1 bg-canvas border border-border-subtle p-0.5 rounded-lg text-xs font-sans font-bold">
                  <button
                    type="button"
                    onClick={() => setModalMode("photo")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                      modalMode === "photo"
                        ? "bg-brand-accent text-canvas shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Eye size={12} />
                    Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode("3d")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                      modalMode === "3d"
                        ? "bg-brand-accent text-canvas shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Box size={12} />
                    3D Orbit
                  </button>
                </div>

                {/* Box Gambar / 3D Canvas */}
                <div
                  className="relative aspect-[4/5] w-full max-h-[350px] sm:max-h-[380px] rounded-2xl overflow-hidden bg-canvas border border-border-subtle flex items-center justify-center shadow-xs"
                  data-lenis-prevent="true"
                  onWheel={(e) => {
                    e.stopPropagation();
                    if (modalScrollRef.current) {
                      modalScrollRef.current.scrollTop += e.deltaY;
                    }
                  }}
                >
                  {modalMode === "photo" ? (
                    <Image
                      src={
                        (Array.isArray(quickViewProduct.images) && quickViewProduct.images[activePhotoIndex]) ||
                        "/products/tshirt-orange-makassar.jpg"
                      }
                      alt={quickViewProduct.name}
                      width={500}
                      height={625}
                      className="w-full h-full object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    <div className="w-full h-full relative" data-lenis-prevent="true">
                      <Showcase3DOrbitViewer
                        apparelSlug={canonicalSlugOf(quickViewProduct)}
                        colorHex={quickViewProduct.colorHex}
                        frontDecalUrl={quickViewProduct.mockup3D?.frontDecalUrl || null}
                        className="h-full min-h-0 border-none rounded-none"
                      />
                    </div>
                  )}
                </div>

                {/* Thumbnail Galeri Foto jika ada */}
                {modalMode === "photo" && Array.isArray(quickViewProduct.images) && quickViewProduct.images.length > 1 && (
                  <div className="flex items-center gap-2">
                    {quickViewProduct.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhotoIndex(i)}
                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          activePhotoIndex === i ? "border-brand-accent" : "border-border-subtle opacity-70"
                        }`}
                      >
                        <Image src={img} alt={`Thumb ${i}`} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Rincian Produk, Spesifikasi Otentik, & Form Beli */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                    {quickViewProduct.category?.name || "Distro"} · {quickViewProduct.colorName}
                  </span>
                  <h2 className="font-sans font-black text-base sm:text-lg text-text-primary uppercase leading-tight mt-0.5">
                    {quickViewProduct.name}
                  </h2>
                  <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-black text-brand-accent">
                    Rp {quickViewProduct.priceIdr.toLocaleString("id-ID")}
                  </div>
                </div>

                {/* Spesifikasi Kain Otentik Sesuai Jenis Apparel (Bukan Combed 24s di Hoodie!) */}
                {(() => {
                  const specs = getApparelSpecs(canonicalSlugOf(quickViewProduct));
                  return (
                    <div className="p-3 rounded-xl bg-canvas border border-border-subtle space-y-1.5 text-xs font-sans">
                      <div className="flex items-start gap-2 text-text-muted">
                        <Shirt size={13} className="text-brand-accent shrink-0 mt-0.5" />
                        <span>Kain: <strong className="text-text-primary">{specs.fabric}</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-text-muted">
                        <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>Sablon: <strong className="text-text-primary">{specs.curing}</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-text-muted">
                        <Check size={13} className="text-brand-accent shrink-0 mt-0.5" />
                        <span>Model: <strong className="text-text-primary">{specs.fit}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Pilihan Ukuran */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-sans font-bold text-text-primary">Pilih Ukuran:</span>
                    <span className="text-[11px] font-mono text-brand-accent">
                      Terpilih: <strong>{modalSize}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {["S", "M", "L", "XL", "XXL"].map((sz) => {
                      const szObj = quickViewProduct.sizes?.find((s) => s.size === sz);
                      const isAvail = szObj ? (szObj.stockQty ?? 0) > 0 : true;
                      const isSelected = modalSize === sz;

                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => isAvail && setModalSize(sz)}
                          disabled={!isAvail}
                          className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-brand-accent text-canvas border-brand-accent font-black shadow-xs"
                              : isAvail
                              ? "bg-canvas border-border-subtle text-text-primary hover:border-brand-accent/50"
                              : "bg-canvas/30 text-text-muted/30 border-transparent line-through cursor-not-allowed"
                          }`}
                        >
                          <span>{sz}</span>
                          <span className="text-[8px] opacity-75">
                            {szObj ? `${szObj.stockQty}` : "Ready"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kuantitas Stepper */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-bold text-text-primary">Jumlah:</span>
                  <div className="flex items-center border border-border-subtle rounded-lg bg-canvas overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs tabular-nums">
                      {modalQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => Math.min(25, q + 1))}
                      className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Tombol Aksi di Modal (Selalu Terlihat, Tidak Pernah Terpotong) */}
                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={handleModalAddToCart}
                    className={`w-full py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] ${
                      modalAdded
                        ? "bg-emerald-500 text-white"
                        : "bg-brand-accent text-canvas hover:brightness-110"
                    }`}
                  >
                    {modalAdded ? (
                      <>
                        <Check size={14} />
                        <span>Berhasil Masuk Keranjang!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} />
                        <span>+ Masukkan Keranjang (Rp {(quickViewProduct.priceIdr * modalQty).toLocaleString("id-ID")})</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/studio?apparel=${encodeURIComponent(canonicalSlugOf(quickViewProduct))}&color=${encodeURIComponent(quickViewProduct.colorHex)}&title=${encodeURIComponent(quickViewProduct.name)}`}
                    onClick={() => handleOpenInStudio(quickViewProduct)}
                    className="w-full py-2 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent text-text-muted hover:text-brand-accent font-sans text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span>Buka Penuh di Studio 3D</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
