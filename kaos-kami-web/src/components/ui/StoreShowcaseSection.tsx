"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Eye, ArrowRight, X, Check, ShieldCheck, Truck, RotateCw, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import { isSafeImageUrl } from "@/lib/safeUrl";

const Showcase3DOrbitViewer = dynamic(
  () => import("@/components/3d/Showcase3DOrbitViewer").then((m) => m.Showcase3DOrbitViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] md:min-h-[460px] bg-gradient-to-b from-[#18181b] to-[#09090b] border border-border-subtle rounded-2xl flex flex-col items-center justify-center font-mono text-xs text-text-muted gap-2 animate-pulse">
        <RotateCw size={24} className="animate-spin text-brand-accent" />
        <span>Memuat Model 3D Interaktif...</span>
      </div>
    ),
  }
);

const SHOWCASE_COLOR_PALETTE = [
  { name: "Hitam Pekat", hex: "#121214" },
  { name: "Putih Ecru", hex: "#EFECE6" },
  { name: "Oranye Makassar", hex: "#E65100" },
  { name: "Hijau Olive", hex: "#3B4435" },
  { name: "Navy Gelap", hex: "#1B2A4A" },
  { name: "Abu Misty", hex: "#9E9E9E" },
];

interface ShowcaseProduct {
  id: string;
  name: string;
  colorHex: string;
  colorName: string;
  size: string;
  priceIdr: number;
  stockQty: number;
  image: string;
  apparelSlug: ApparelType;
  description?: string;
}

const DEFAULT_SHOWCASE: ShowcaseProduct[] = [
  {
    id: "cmtgx5swk000kush0030f43il",
    name: "Kaos Polos Boxy Combed 24s - Hitam",
    colorHex: "#121214",
    colorName: "Hitam",
    size: "L",
    priceIdr: 165000,
    stockQty: 48,
    image: "/lookbook/look-01.jpg",
    apparelSlug: "tshirt",
    description: "Kaos streetwear potongan boxy tegap dengan katun combed 24s berkarakter pekat. Sejuk untuk iklim tropis Makassar dengan jahitan rantai rapi dan rib kerah tebal tahan melar.",
  },
  {
    id: "cmtgx5t0q000mush0jv2muo0e",
    name: "Kaos Polos Boxy Combed 24s - Putih Ecru",
    colorHex: "#EFECE6",
    colorName: "Putih Ecru",
    size: "L",
    priceIdr: 165000,
    stockQty: 35,
    image: "/lookbook/look-02.jpg",
    apparelSlug: "tshirt",
    description: "Warna ecru alami katun tanpa pemutih kimia berlebih. Tekstur lembut dan adem dipakai seharian. Potongan drop-shoulder modern yang jatuh proporsional di badan.",
  },
  {
    id: "cmtgx5t5b000oush0pgpjop1g",
    name: "Kaos Streetwear Grafis Makassar - Oranye",
    colorHex: "#E65100",
    colorName: "Oranye",
    size: "M",
    priceIdr: 195000,
    stockQty: 20,
    image: "/lookbook/look-03.jpg",
    apparelSlug: "tshirt",
    description: "Rilisan grafis spesial edisi terbatas dengan warna oranye menyala khas Makassar. Sablon digital DTF premium presisi tinggi dengan tinta lentur yang tahan cuci berkali-kali.",
  },
  {
    id: "cmtgx5tee000sush0grpi0mxp",
    name: "Jaket Coach Urban - Hijau Olive",
    colorHex: "#3B4435",
    colorName: "Hijau Olive",
    size: "L",
    priceIdr: 320000,
    stockQty: 18,
    image: "/lookbook/look-04.jpg",
    apparelSlug: "shirt",
    description: "Jaket coach kasual urban dengan material taslan water-repellent ringan dan furing katun nyaman. Dilengkapi kancing snap button tahan karat dan saku fungsional.",
  },
  {
    id: "cmtgx5thh000uush0930k82ml",
    name: "Hoodie Heavyweight Boxy Fleece - Hitam Pekat",
    colorHex: "#121214",
    colorName: "Hitam",
    size: "L",
    priceIdr: 285000,
    stockQty: 25,
    image: "/lookbook/look-01.jpg",
    apparelSlug: "hoodie",
    description: "Hoodie heavyweight katun fleece tebal 330gsm dengan kap ganda tegap. Hangat, lembut di dalam, dan tidak mudah berbulu. Potongan boxy streetwear modern.",
  },
  {
    id: "cmtgx5tkk000wush019ak44op",
    name: "Crewneck Classic Pullover - Abu Misty",
    colorHex: "#9E9E9E",
    colorName: "Abu Misty",
    size: "L",
    priceIdr: 245000,
    stockQty: 30,
    image: "/lookbook/look-02.jpg",
    apparelSlug: "crewneck",
    description: "Sweater crewneck fleece katun berserat abu misty premium. Rib elastis di leher, ujung lengan, dan pinggang tidak mudah melar setelah dicuci berkali-kali.",
  },
];

const AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL"];

export const StoreShowcaseSection: React.FC = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>(DEFAULT_SHOWCASE);
  const [totalCount, setTotalCount] = useState<number>(DEFAULT_SHOWCASE.length);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Product Detail Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<ShowcaseProduct | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");
  const [activeColorHex, setActiveColorHex] = useState<string>("#121214");
  const [activeColorName, setActiveColorName] = useState<string>("Hitam");
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [quantity, setQuantity] = useState<number>(1);
  const [modalAdded, setModalAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    (async () => {
      try {
        const res = await fetch("/api/catalog/variants", { signal: ctrl.signal });
        const data = await res.json().catch(() => null);
        clearTimeout(t);
        if (res.ok && data?.success && Array.isArray(data.variants) && data.variants.length > 0) {
          setTotalCount(data.variants.length);
          const mapped: ShowcaseProduct[] = data.variants.slice(0, 6).map((v: any, i: number) => {
            const rawSlug = String(v.category?.slug || "").trim().toLowerCase();
            const apparelSlug: ApparelType = (Object.keys(APPAREL_CATALOG) as ApparelType[]).includes(rawSlug as ApparelType)
              ? (rawSlug as ApparelType)
              : rawSlug === "jacket"
              ? "shirt"
              : "tshirt";

            const fallbackImg = `/lookbook/look-0${(i % 4) + 1}.jpg`;
            const firstImg = Array.isArray(v.images) && v.images[0] && isSafeImageUrl(v.images[0]) ? v.images[0] : fallbackImg;

            return {
              id: v.id,
              name: v.name || "Produk Kaos Kami",
              colorHex: v.colorHex || "#121214",
              colorName: v.colorName || "Varian",
              size: v.size || "L",
              priceIdr: Number(v.priceIdr) || 165000,
              stockQty: Number(v.stockQty) || 0,
              image: firstImg,
              apparelSlug,
              description: v.category?.description || "Koleksi pakaian jadi Kaos Kami dengan katun combed sejuk berkualitas, potongan tegap, dan sablon digital presisi.",
            };
          });
          setProducts(mapped);
        }
      } catch {
        clearTimeout(t);
      }
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  const openDetailModal = (product: ShowcaseProduct, defaultMode: "3d" | "photo" = "3d") => {
    setActiveModalProduct(product);
    setSelectedSize(product.size || "L");
    setQuantity(1);
    setModalAdded(false);
    setViewMode(defaultMode);
    setActiveColorHex(product.colorHex || "#121214");
    setActiveColorName(product.colorName || "Hitam");
  };

  const closeDetailModal = () => {
    setActiveModalProduct(null);
    setModalAdded(false);
  };

  const handleModalAddToCart = (directCheckout = false) => {
    if (!activeModalProduct || activeModalProduct.stockQty <= 0) return;
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${activeModalProduct.id}-${selectedSize}-${activeColorHex.replace('#', '')}`,
        name: activeColorHex !== activeModalProduct.colorHex
          ? `${activeModalProduct.name} - ${activeColorName}`
          : activeModalProduct.name,
        priceIdr: activeModalProduct.priceIdr,
        size: selectedSize,
        colorName: activeColorName,
        colorHex: activeColorHex,
        image: activeModalProduct.image,
        apparelSlug: activeModalProduct.apparelSlug,
        productVariantId: activeModalProduct.id,
        stockQty: activeModalProduct.stockQty,
      });
    }
    setModalAdded(true);
    setTimeout(() => {
      setModalAdded(false);
      closeDetailModal();
      openCart();
    }, directCheckout ? 200 : 500);
  };

  return (
    <section id="etalase" className="relative z-20 bg-canvas px-6 md:px-12 py-24 border-t border-border-subtle scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-border-subtle">
          <div>
            <span className="block text-[11px] font-mono text-brand-accent uppercase tracking-widest mb-1.5 font-bold">
              KOLEKSI SIAP BELI · READY STOCK MAKASSAR
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black uppercase text-text-primary">
              ETALASE PRODUK KAOS KAMI
            </h2>
            <p className="font-mono text-xs text-text-muted mt-2 max-w-xl leading-relaxed">
              Pilihan pakaian streetwear hasil kurasi Kaos Kami siap kirim se-Makassar. Klik produk untuk melihat detail spesifikasi bahan combed, ukuran, dan beli langsung.
            </p>
          </div>

          <Link
            href="/catalog"
            className="inline-flex items-center space-x-2 font-mono text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider shrink-0 py-2 px-4 rounded-xl border border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors"
          >
            <span>LIHAT SEMUA KATALOG ({totalCount}+ PRODUK)</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 3-Column Editorial Store Showcase Grid (6 Items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
          {products.map((p, idx) => (
            <div
              key={p.id}
              className="group relative rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md cursor-pointer"
              onClick={() => openDetailModal(p, "3d")}
            >
              {/* Product Visual Mockup */}
              <div className="relative aspect-[3/4] overflow-hidden bg-surface">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={600}
                  height={800}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  priority={idx === 0}
                  loading={idx === 0 ? undefined : "lazy"}
                  unoptimized={true}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    const fallback = `/lookbook/look-0${(idx % 4) + 1}.jpg`;
                    if (!t.src.endsWith(fallback)) t.src = fallback;
                  }}
                />

                {/* Top Left Badge: Color & Size */}
                <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-canvas/75 backdrop-blur-md text-[10px] text-text-primary font-bold border border-border-subtle">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-border-subtle"
                    style={{ backgroundColor: p.colorHex }}
                  />
                  <span>{p.colorName} · Size {p.size}</span>
                </div>

                {/* Top Right Badge: 3D 360° Ready */}
                <div className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-brand-accent font-bold border border-brand-accent/40 shadow-sm">
                  <RotateCw size={11} className="animate-spin-slow" />
                  <span>3D 360°</span>
                </div>

                {/* Hover Quick-View Hint */}
                <div className="absolute inset-0 bg-canvas/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="py-2 px-4 rounded-full bg-canvas/90 text-text-primary font-bold text-[11px] border border-border-subtle flex items-center gap-1.5 shadow-lg">
                    <RotateCw size={13} className="text-brand-accent" />
                    <span>PREVIEW 3D (360°)</span>
                  </span>
                </div>
              </div>

              {/* Product Meta Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] tracking-wider text-text-muted uppercase block mb-1">
                    {`#0${idx + 1} · ${
                      p.apparelSlug === "shirt"
                        ? "JAKET COACH"
                        : p.apparelSlug === "hoodie"
                        ? "HOODIE"
                        : p.apparelSlug === "crewneck"
                        ? "CREWNECK"
                        : p.apparelSlug === "longsleeve"
                        ? "KAOS PANJANG"
                        : "KAOS COMBED"
                    }`}
                  </span>
                  <h3 className="font-display font-bold text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-brand-accent transition-colors">
                    {p.name}
                  </h3>
                  <div className="mt-1.5 text-base font-bold text-brand-accent">
                    Rp {Number(p.priceIdr).toLocaleString("id-ID")}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-xs" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openDetailModal(p, "3d")}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center space-x-1.5 min-w-0"
                    title="Buka 3D Orbit 360° & spesifikasi produk"
                  >
                    <RotateCw size={12} className="shrink-0 text-brand-accent" />
                    <span className="truncate text-[11px]">3D ORBIT</span>
                  </button>

                  <button
                    onClick={() => {
                      if (p.stockQty <= 0) return;
                      addItem({
                        id: p.id,
                        name: p.name,
                        priceIdr: p.priceIdr,
                        size: p.size,
                        colorName: p.colorName,
                        colorHex: p.colorHex,
                        image: p.image,
                        apparelSlug: p.apparelSlug,
                        productVariantId: p.id,
                        stockQty: p.stockQty,
                      });
                      setAddedId(p.id);
                      openCart();
                      setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 2000);
                    }}
                    disabled={p.stockQty <= 0}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-brand-accent text-canvas font-bold hover:brightness-110 transition-all flex items-center justify-center space-x-1 disabled:opacity-40 min-w-0 shadow-sm"
                    title="Beli langsung produk siap pakai"
                  >
                    <ShoppingBag size={12} className="shrink-0" />
                    <span className="truncate text-[11px]">
                      {p.stockQty <= 0 ? "HABIS" : addedId === p.id ? "✓ MASUK" : "+ BELI"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── E-COMMERCE 3D ORBIT & DETAIL MODAL ─── */}
      {activeModalProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeDetailModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-surface border border-border-subtle rounded-3xl p-5 sm:p-7 md:p-8 font-mono text-xs shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeDetailModal}
              className="absolute top-5 right-5 p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-colors z-20"
              title="Tutup"
            >
              <X size={18} />
            </button>

            {/* View Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1 bg-canvas rounded-xl border border-border-subtle w-full sm:w-auto sm:inline-flex">
              <button
                onClick={() => setViewMode("3d")}
                className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  viewMode === "3d"
                    ? "bg-brand-accent text-canvas shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <RotateCw size={13} />
                <span>3D ORBIT 360°</span>
              </button>
              <button
                onClick={() => setViewMode("photo")}
                className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  viewMode === "photo"
                    ? "bg-brand-accent text-canvas shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Eye size={13} />
                <span>FOTO LOOKBOOK</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
              {/* Left Column: Interactive 3D Orbit Viewport OR Lookbook Photo */}
              <div className="w-full">
                {viewMode === "3d" ? (
                  <Showcase3DOrbitViewer
                    apparelSlug={activeModalProduct.apparelSlug}
                    colorHex={activeColorHex}
                  />
                ) : (
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-canvas border border-border-subtle">
                    <Image
                      src={activeModalProduct.image}
                      alt={activeModalProduct.name}
                      width={800}
                      height={1000}
                      className="w-full h-full object-cover"
                      unoptimized={true}
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-canvas/80 backdrop-blur-md text-[10px] font-bold border border-border-subtle flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-border-subtle"
                        style={{ backgroundColor: activeColorHex }}
                      />
                      <span>{activeColorName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: E-Commerce Product Info & Config */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] tracking-widest text-brand-accent uppercase font-bold block mb-1">
                    READY STOCK MAKASSAR // {activeModalProduct.apparelSlug.toUpperCase()}
                  </span>
                  <h2 className="font-display font-black text-xl sm:text-2xl uppercase text-text-primary leading-tight">
                    {activeModalProduct.name}
                  </h2>
                  <div className="mt-2 text-2xl font-bold text-brand-accent">
                    Rp {Number(activeModalProduct.priceIdr).toLocaleString("id-ID")}
                  </div>
                </div>

                {/* Color Selector (Live Updates 3D Orbit Model) */}
                <div className="space-y-2 p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      <Sparkles size={12} className="text-brand-accent" />
                      <span>WARNA 3D:</span>
                    </span>
                    <span className="text-text-muted">
                      Warna aktif: <strong className="text-brand-accent">{activeColorName}</strong>
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {SHOWCASE_COLOR_PALETTE.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => {
                          setActiveColorHex(col.hex);
                          setActiveColorName(col.name);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          activeColorHex.toLowerCase() === col.hex.toLowerCase()
                            ? "scale-110 border-brand-accent ring-2 ring-brand-accent/30 shadow-md"
                            : "border-white/20 hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted">
                    💡 Klik warna di atas untuk melihat model 3D berubah secara langsung.
                  </p>
                </div>

                {/* Description & Material Specs */}
                <div className="p-3.5 rounded-xl bg-canvas border border-border-subtle space-y-2 text-text-muted leading-relaxed">
                  <p className="text-text-primary font-bold text-[11px]">
                    Spesifikasi & Keunggulan Bahan:
                  </p>
                  <p className="text-[11px]">
                    {activeModalProduct.description || "Material Katun Combed pilihan dengan daya serap keringat tinggi. Nyaman untuk iklim tropis, potongan boxy rapi, dan jahitan kuat standar distro."}
                  </p>
                  <div className="pt-2 border-t border-border-subtle space-y-1 text-[10px]">
                    <div className="flex items-center gap-1.5 text-text-primary">
                      <ShieldCheck size={13} className="text-brand-accent" />
                      <span>Garansi Sablon DTF Anti-Retak & Tahan Cuci</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-primary">
                      <Truck size={13} className="text-brand-accent" />
                      <span>Pengiriman Kilat Hari Ini se-Kota Makassar</span>
                    </div>
                  </div>
                </div>

                {/* Size Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-text-primary">PILIH UKURAN:</span>
                    <span className="text-text-muted">Ukuran terpilih: <strong className="text-brand-accent">{selectedSize}</strong></span>
                  </div>
                  <div className="flex gap-2">
                    {AVAILABLE_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`flex-1 py-2 rounded-xl font-bold text-xs border transition-all ${
                          selectedSize === size
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-primary hover:border-brand-accent/50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity & Stock */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-text-primary text-[11px]">JUMLAH (PCS):</span>
                  <div className="flex items-center border border-border-subtle rounded-xl bg-canvas overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 hover:bg-surface font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(activeModalProduct.stockQty || 10, q + 1))}
                      className="px-3 py-1.5 hover:bg-surface font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Add To Cart & Quick Buy Duitku */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleModalAddToCart(false)}
                      disabled={activeModalProduct.stockQty <= 0}
                      className="py-3 px-4 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <ShoppingBag size={14} />
                      <span>KERANJANG</span>
                    </button>

                    <button
                      onClick={() => handleModalAddToCart(true)}
                      disabled={activeModalProduct.stockQty <= 0}
                      className="py-3 px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40"
                    >
                      <Check size={14} />
                      <span>BELI SEKARANG</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-text-muted">
                    Total: Rp {(activeModalProduct.priceIdr * quantity).toLocaleString("id-ID")} · Stok siap kirim: {activeModalProduct.stockQty} pcs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
