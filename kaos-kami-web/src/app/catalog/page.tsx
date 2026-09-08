"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { useCartStore } from "@/store/useCartStore";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { ShoppingBag, Filter } from "lucide-react";

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
  category?: {
    slug: string;
    name: string;
    weightGsm?: string;
  };
}

export default function CatalogPage() {
  const [products, setProducts] = useState<ProductVariantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("ALL");

  const { addItem } = useCartStore();
  const { setActiveApparel, setSelectedColor, setSelectedSize, setViewMode } = useConfiguratorStore();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/catalog/variants");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.variants)) {
          setProducts(data.variants);
        } else {
          // Jujur: bedakan API down vs filter kosong (audit H2).
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

  const filteredProducts = products.filter((p) => {
    if (selectedFilter === "READY_MADE" && p.isPreDesigned) return false;
    if (selectedFilter === "LIMITED_DROP" && !p.isPreDesigned) return false;
    if (selectedSizeFilter !== "ALL" && p.size !== selectedSizeFilter) return false;
    return true;
  });

  const handleQuickBuy = (product: ProductVariantItem) => {
    // Jangan biarkan stok habis masuk keranjang (server tetap menolak,
    // tapi UX harus jujur di depan, bukan gagal diam-diam saat bayar).
    if ((product.stockQty || 0) <= 0) {
      setNotice(`Stok ${product.name} (${product.size}) habis. Pilih ukuran lain.`);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      priceIdr: product.priceIdr,
      size: product.size,
      colorName: product.colorName,
      colorHex: product.colorHex,
      image: product.images[0] || "/lookbook/look-01.jpg",
                      apparelSlug: product.category?.slug || "tshirt",
      productVariantId: product.id,
    });
  };

  const handleOpenInStudio = (product: ProductVariantItem) => {
    // Teruskan pilihan katalog ke Studio (warna + ukuran + jenis apparel).
    const slug = (product.category?.slug || "").toLowerCase();
    const apparel = (["tshirt", "longsleeve", "crewneck", "hoodie"].includes(slug)
      ? slug
      : slug === "jacket"
        ? "shirt"
        : "tshirt") as "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt";
    setActiveApparel(apparel);
    setSelectedColor(product.colorHex);
    setSelectedSize(product.size);
    setViewMode("studio");
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-28 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-border-subtle">
          <div>
            <span className="block text-xs font-mono text-brand-accent uppercase tracking-widest mb-1 font-bold">
              KATALOG RESMI MAKASSAR
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-text-primary">
              KOLEKSI PAKAIAN JADI
            </h1>
            <p className="font-mono text-xs text-text-muted mt-2 max-w-xl leading-relaxed">
              Pilihan pakaian siap kirim hari ini se-Makassar. Katun combed tebal 240 & 280 GSM polos berkualitas tinggi atau edisi grafis terbatas.
            </p>
          </div>

          <Link
            href="/studio"
            className="flex items-center space-x-2 px-5 py-3 rounded-full bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)]"
          >
            <span>KUSTOM SABLON DTF</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <Filter size={13} className="text-text-muted" />
            <span className="text-text-muted font-bold mr-1">KATEGORI:</span>
            {[
              { id: "ALL", label: "SEMUA PRODUK" },
              { id: "READY_MADE", label: "KAOS POLOS (BLANK)" },
              { id: "LIMITED_DROP", label: "EDISI GRAFIS DROP" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                aria-pressed={selectedFilter === f.id}
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  selectedFilter === f.id
                    ? "bg-brand-accent text-canvas border-brand-accent font-bold"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Size Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-muted font-bold mr-1">UKURAN:</span>
            {["ALL", "S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
              <button
                key={sz}
                onClick={() => setSelectedSizeFilter(sz)}
                aria-pressed={selectedSizeFilter === sz}
                aria-label={sz === "ALL" ? "Semua ukuran" : `Ukuran ${sz}`}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-[11px] transition-all ${
                  selectedSizeFilter === sz
                    ? "bg-brand-accent text-canvas border-brand-accent"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {notice && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono text-xs text-amber-300 flex justify-between items-center">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="font-bold px-2" aria-label="Tutup peringatan">
              ✕
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="py-24 text-center font-mono text-xs text-text-muted space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin mx-auto" />
            <p>Memuat koleksi produk pakaian...</p>
          </div>
        ) : fetchError ? (
          <div className="py-24 text-center font-mono text-xs text-rose-300 p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <p className="font-bold">Katalog tidak bisa dimuat</p>
            <p className="text-text-muted">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold"
            >
              MUAT ULANG
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center font-mono text-xs text-text-muted p-8 rounded-2xl bg-surface/50 border border-border-subtle">
            <p>Belum ada produk yang sesuai dengan filter pilihan Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl bg-surface/60 border border-border-subtle hover:border-brand-accent/50 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-2xl"
              >
                {/* Product Image & Badges */}
                <div className="relative aspect-[4/5] bg-[#0E0E10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.images[0] || "/lookbook/look-01.jpg"}
                    alt={p.name}
                    width={800}
                    height={1000}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Top Badges (Clean, No Emoji Slop) */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white font-bold uppercase">
                      {p.isPreDesigned ? "EDISI GRAFIS DROP" : "KATUN POLOS HEAVYWEIGHT"}
                    </span>
                    <span className="w-5 h-5 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: p.colorHex }} title={p.colorName} />
                  </div>

                  {/* Bottom Stock & Size Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-black/70 text-brand-accent font-bold border border-white/10">
                      SIZE: {p.size}
                    </span>
                    <span className="text-text-muted text-[10px]">
                      Stok: {p.stockQty} pcs
                    </span>
                  </div>
                </div>

                {/* Card Body & Purchase Actions */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] font-mono text-text-muted uppercase">
                      {p.colorName} · Ready Makassar
                    </span>
                    <h3 className="font-display font-black text-lg uppercase text-white mt-1 group-hover:text-brand-accent transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    <div className="mt-2 text-xl font-mono font-bold text-brand-accent">
                      Rp {p.priceIdr.toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Dual Action Buttons (E-Commerce Journey A & B) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-subtle">
                    <button
                      onClick={() => handleQuickBuy(p)}
                      disabled={(p.stockQty || 0) <= 0}
                      className="py-2.5 px-3 rounded-xl bg-surface border border-white/10 hover:border-brand-accent hover:text-brand-accent text-white font-mono text-[11px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ShoppingBag size={13} />
                      <span>{(p.stockQty || 0) <= 0 ? "HABIS" : "+ KERANJANG"}</span>
                    </button>

                    <Link
                      href="/studio"
                      onClick={() => handleOpenInStudio(p)}
                      className="py-2.5 px-3 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-canvas font-mono text-[11px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <span>KUSTOM SABLON</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
