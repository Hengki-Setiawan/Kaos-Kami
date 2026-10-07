"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Eye, ArrowRight, X, Check, ShieldCheck, Truck, RotateCw, Sparkles, AlertCircle, Shirt } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import { isSafeImageUrl } from "@/lib/safeUrl";

const Showcase3DOrbitViewer = dynamic(
  () => import("@/components/3d/Showcase3DOrbitViewer").then((m) => m.Showcase3DOrbitViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/5] min-h-[420px] md:min-h-[500px] bg-gradient-to-b from-[#18181b] to-[#09090b] border border-border-subtle rounded-2xl flex flex-col items-center justify-center font-mono text-xs text-text-muted gap-2 animate-pulse">
        <RotateCw size={24} className="animate-spin text-brand-accent" />
        <span>Memuat Model 3D Interaktif...</span>
      </div>
    ),
  }
);

export interface ShowcaseSizeOption {
  size: string;
  priceIdr: number;
  stockQty: number;
  variantId: string;
  sku?: string;
}

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
  sizes: ShowcaseSizeOption[];
}

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  "cmtgx5tee000sush0grpi0mxp": "/products/coach-jacket-olive.jpg",
  "cmtgx5tab000qush0tyeaysce": "/products/hoodie-black.jpg",
  "cmtgx5thh000uush0930k82ml": "/products/hoodie-black.jpg",
  "cmtgx5t5b000oush0pgpjop1g": "/products/tshirt-orange-makassar.jpg",
  "cmtgx5t0q000mush0jv2muo0e": "/products/tshirt-white-ecru.jpg",
  "cmtgx5swk000kush0030f43il": "/products/tshirt-black.jpg",
  "cmtgx5tkk000wush019ak44op": "/products/crewneck-grey.jpg",
};

function getProductPhoto(id: string, apparelSlug: ApparelType, colorHex: string, rawImg?: string): string {
  if (PRODUCT_IMAGE_MAP[id]) return PRODUCT_IMAGE_MAP[id];
  if (rawImg && rawImg.startsWith("/products/")) return rawImg;

  const hex = (colorHex || "").toLowerCase();
  if (apparelSlug === "shirt") return "/products/coach-jacket-olive.jpg";
  if (apparelSlug === "hoodie") return "/products/hoodie-black.jpg";
  if (apparelSlug === "crewneck") return "/products/crewneck-grey.jpg";
  if (hex === "#efece6" || hex === "#ffffff" || hex === "#f7f5f0") return "/products/tshirt-white-ecru.jpg";
  if (hex === "#e65100") return "/products/tshirt-orange-makassar.jpg";
  if (hex === "#3b4435") return "/products/coach-jacket-olive.jpg";
  if (hex === "#9e9e9e" || hex === "#2a2b2e") return "/products/crewneck-grey.jpg";

  if (rawImg && (rawImg.startsWith("/") || isSafeImageUrl(rawImg)) && !rawImg.includes("look-01")) {
    return rawImg;
  }
  return "/products/tshirt-black.jpg";
}

function buildDefaultSizes(basePrice: number, baseStock: number, baseId: string): ShowcaseSizeOption[] {

  const sizes = ["S", "M", "L", "XL", "XXL"];
  return sizes.map((sz, idx) => {
    const delta = sz === "XL" ? 10000 : sz === "XXL" ? 20000 : 0;
    const stock = sz === "XXL" ? 0 : Math.max(5, baseStock - idx * 3);
    return {
      size: sz,
      priceIdr: basePrice + delta,
      stockQty: stock,
      variantId: `${baseId}-${sz.toLowerCase()}`,
      sku: `KK-${baseId.slice(0, 4).toUpperCase()}-${sz}`,
    };
  });
}

const DEFAULT_SHOWCASE: ShowcaseProduct[] = [
  {
    id: "cmtgx5tee000sush0grpi0mxp",
    name: "Coach Jacket Tactical - Hijau Olive",
    colorHex: "#3B4435",
    colorName: "Hijau Olive",
    size: "L",
    priceIdr: 320000,
    stockQty: 18,
    image: "/products/coach-jacket-olive.jpg",
    apparelSlug: "shirt",
    description: "Jaket coach kasual urban dengan material taslan water-repellent ringan dan furing katun nyaman. Dilengkapi kancing snap button tahan karat dan saku fungsional.",
    sizes: buildDefaultSizes(320000, 18, "cmtgx5tee000sush0grpi0mxp"),
  },
  {
    id: "cmtgx5tab000qush0tyeaysce",
    name: "Hoodie Boxy Fleece - Hitam",
    colorHex: "#121214",
    colorName: "Hitam",
    size: "XL",
    priceIdr: 285000,
    stockQty: 25,
    image: "/products/hoodie-black.jpg",
    apparelSlug: "hoodie",
    description: "Hoodie heavyweight katun fleece tebal 330gsm dengan kap ganda tegap. Hangat, lembut di dalam, dan tidak mudah berbulu. Potongan boxy streetwear modern.",
    sizes: buildDefaultSizes(285000, 25, "cmtgx5tab000qush0tyeaysce"),
  },
  {
    id: "cmtgx5t5b000oush0pgpjop1g",
    name: "Kaos Combed Grafis Makassar - Oranye",
    colorHex: "#E65100",
    colorName: "Oranye",
    size: "M",
    priceIdr: 195000,
    stockQty: 20,
    image: "/products/tshirt-orange-makassar.jpg",
    apparelSlug: "tshirt",
    description: "Rilisan grafis spesial edisi terbatas dengan warna oranye menyala khas Makassar. Sablon digital DTF premium presisi tinggi dengan tinta lentur yang tahan cuci berkali-kali.",
    sizes: buildDefaultSizes(195000, 20, "cmtgx5t5b000oush0pgpjop1g"),
  },
  {
    id: "cmtgx5t0q000mush0jv2muo0e",
    name: "Kaos Polos Combed 24s - Putih Ecru",
    colorHex: "#EFECE6",
    colorName: "Putih Ecru",
    size: "L",
    priceIdr: 165000,
    stockQty: 35,
    image: "/products/tshirt-white-ecru.jpg",
    apparelSlug: "tshirt",
    description: "Warna ecru alami katun tanpa pemutih kimia berlebih. Tekstur lembut dan adem dipakai seharian. Potongan drop-shoulder modern yang jatuh proporsional di badan.",
    sizes: buildDefaultSizes(165000, 35, "cmtgx5t0q000mush0jv2muo0e"),
  },
  {
    id: "cmtgx5swk000kush0030f43il",
    name: "Kaos Polos Combed 24s - Hitam",
    colorHex: "#121214",
    colorName: "Hitam",
    size: "L",
    priceIdr: 165000,
    stockQty: 48,
    image: "/products/tshirt-black.jpg",
    apparelSlug: "tshirt",
    description: "Kaos streetwear potongan boxy tegap dengan katun combed 24s berkarakter pekat. Sejuk untuk iklim tropis Makassar dengan jahitan rantai rapi dan rib kerah tebal tahan melar.",
    sizes: buildDefaultSizes(165000, 48, "cmtgx5swk000kush0030f43il"),
  },
  {
    id: "cmtgx5tkk000wush019ak44op",
    name: "Crewneck Fleece Classic - Abu Misty",
    colorHex: "#9E9E9E",
    colorName: "Abu Misty",
    size: "L",
    priceIdr: 245000,
    stockQty: 30,
    image: "/products/crewneck-grey.jpg",
    apparelSlug: "crewneck",
    description: "Sweater crewneck fleece katun berserat abu misty premium. Rib elastis di leher, ujung lengan, dan pinggang tidak mudah melar setelah dicuci berkali-kali.",
    sizes: buildDefaultSizes(245000, 30, "cmtgx5tkk000wush019ak44op"),
  },
];

export const StoreShowcaseSection: React.FC = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>(DEFAULT_SHOWCASE);
  const [totalCount, setTotalCount] = useState<number>(DEFAULT_SHOWCASE.length);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Product Detail Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<ShowcaseProduct | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [quantity, setQuantity] = useState<number>(1);
  const [modalAdded, setModalAdded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "tshirt") return p.apparelSlug === "tshirt" || p.apparelSlug === "longsleeve";
    if (selectedCategory === "hoodie") return p.apparelSlug === "hoodie" || p.apparelSlug === "crewneck";
    if (selectedCategory === "shirt") return p.apparelSlug === "shirt";
    if (selectedCategory === "accessory")
      return p.apparelSlug === "cap" || p.apparelSlug === "pants" || p.apparelSlug === "shorts";
    return true;
  });

  // ── Swatch warna interaktif per kartu (state lokal): varian 1 nama dasar
  // digabung jadi 1 kartu; klik lingkaran → ganti varian tampil (foto, warna,
  // harga, stok). Tampilan saja — fetch katalog & cart store TAK diubah. ──
  const baseKeyOf = (name: string) =>
    name.replace(/\s*-\s*[^-]+$/, "").trim().toLowerCase();
  const groupedProducts = React.useMemo(() => {
    const map = new Map<string, ShowcaseProduct[]>();
    for (const p of filteredProducts) {
      const k = baseKeyOf(p.name);
      const arr = map.get(k) || [];
      arr.push(p);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [filteredProducts]);
  // key = baseKey, value = id varian tampil. Belum diklik → varian pertama.
  const [swatchSel, setSwatchSel] = useState<Record<string, string>>({});

  // Scroll Container Refs & Focus Management
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Kunci scroll halaman belakang (html & body) saat modal detail aktif
  // dan nonaktifkan Lenis (Smooth Scroll) agar tidak membajak event mouse wheel
  useEffect(() => {
    if (activeModalProduct) {
      const origHtml = document.documentElement.style.overflow;
      const origBody = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // Hentikan Lenis background smooth scroll seketika
      if (typeof window !== "undefined" && (window as any).__lenis) {
        try {
          (window as any).__lenis.stop?.();
        } catch {}
      }

      // Alihkan fokus ke scroll body secara otomatis agar mouse wheel & keyboard langsung aktif di pop-up
      const timer = setTimeout(() => {
        scrollBodyRef.current?.focus({ preventScroll: true });
      }, 50);

      return () => {
        clearTimeout(timer);
        document.documentElement.style.overflow = origHtml;
        document.body.style.overflow = origBody;
        // Hidupkan kembali Lenis setelah modal ditutup
        if (typeof window !== "undefined" && (window as any).__lenis) {
          try {
            (window as any).__lenis.start?.();
          } catch {}
        }
      };
    }
  }, [activeModalProduct]);

  // Delegasikan event wheel dari seluruh area pop-up (termasuk header & padding) ke scroll body
  const handleModalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrollBodyRef.current) return;
    const target = e.target as Node;
    // Jika scroll wheel terjadi di header, margin, atau visual sticky, teruskan delta ke scrollBody
    if (!scrollBodyRef.current.contains(target)) {
      scrollBodyRef.current.scrollTop += e.deltaY;
    }
  };

  // Tombol Escape menutup modal secara instan
  useEffect(() => {
    if (!activeModalProduct) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetailModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeModalProduct]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    (async () => {
      try {
        const res = await fetch("/api/catalog/variants", { signal: ctrl.signal });
        const data = await res.json().catch(() => null);
        clearTimeout(t);
        if (res.ok && data?.success && Array.isArray(data.variants) && data.variants.length > 0) {
          // Kelompokkan varian berdasarkan nama + colorHex agar di etalase pembeli tampil 1 kartu per produk
          // yang menampung seluruh matriks ukuran S, M, L, XL, XXL (standar Shopee / Tokopedia).
          const seenGroupKeys = new Set<string>();
          const uniqueProducts: ShowcaseProduct[] = [];

          for (const v of data.variants) {
            const rawSlug = String(v.category?.slug || "").trim().toLowerCase();
            const apparelSlug: ApparelType = (Object.keys(APPAREL_CATALOG) as ApparelType[]).includes(rawSlug as ApparelType)
              ? (rawSlug as ApparelType)
              : rawSlug === "jacket"
              ? "shirt"
              : "tshirt";

            const cleanName = (v.name || "")
              .replace(/\s*\((?:S|M|L|XL|XXL|XXXL|3XL|All\s*Size|\d+)\)\s*$/i, "")
              .trim();
            const groupKey = `${cleanName.toLowerCase()}__${(v.colorHex || "").toLowerCase()}__${apparelSlug}`;
            if (seenGroupKeys.has(groupKey)) continue;
            seenGroupKeys.add(groupKey);

            const rawImg = Array.isArray(v.images) && v.images[0] ? v.images[0] : undefined;
            const finalImg = getProductPhoto(v.id, apparelSlug, v.colorHex, rawImg);

            // Varian sizes yang sudah diperkaya dari API
            const sizes: ShowcaseSizeOption[] = Array.isArray(v.sizes) && v.sizes.length > 0
              ? v.sizes.map((s: any) => ({
                  size: s.size,
                  priceIdr: Number(s.priceIdr),
                  stockQty: Number(s.stockQty),
                  variantId: s.variantId || s.id || v.id,
                  sku: s.sku,
                }))
              : buildDefaultSizes(Number(v.priceIdr) || 165000, Number(v.stockQty) || 20, v.id);

            const totalStock = sizes.reduce((sum, s) => sum + (s.stockQty || 0), 0);
            const defaultOpt = sizes.find((s) => s.size === "L" && s.stockQty > 0) || sizes.find((s) => s.stockQty > 0) || sizes[0];

            uniqueProducts.push({
              id: v.id,
              name: cleanName || v.name || "Produk Kaos Kami",
              colorHex: v.colorHex || "#121214",
              colorName: v.colorName || "Varian",
              size: defaultOpt?.size || v.size || "L",
              priceIdr: defaultOpt?.priceIdr || Number(v.priceIdr) || 165000,
              stockQty: totalStock,
              image: finalImg,
              apparelSlug,
              description: v.category?.description || "Koleksi pakaian jadi Kaos Kami dengan katun combed sejuk berkualitas, potongan tegap, dan sablon digital presisi.",
              sizes,
            });
          }

          setTotalCount(data.variants.length);
          // Di etalase beranda, tampilkan 6 model busana kurasi utama (2 baris x 3 kolom)
          setProducts(uniqueProducts.slice(0, 6));
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
    // Pilih ukuran yang ready stock terlebih dahulu jika ada
    const inStockSize = product.sizes?.find((s) => s.stockQty > 0)?.size;
    setSelectedSize(inStockSize || product.sizes?.[0]?.size || product.size || "L");
    setQuantity(1);
    setModalAdded(false);
    setViewMode(defaultMode);
  };

  const closeDetailModal = () => {
    setActiveModalProduct(null);
    setModalAdded(false);
  };

  const handleModalAddToCart = (directCheckout = false) => {
    if (!activeModalProduct) return;
    const activeOpt = activeModalProduct.sizes?.find((s) => s.size === selectedSize) || {
      size: selectedSize,
      priceIdr: activeModalProduct.priceIdr,
      stockQty: activeModalProduct.stockQty,
      variantId: activeModalProduct.id,
    };
    if (activeOpt.stockQty <= 0) return;

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${activeOpt.variantId}`,
        name: activeModalProduct.name,
        priceIdr: activeOpt.priceIdr,
        size: activeOpt.size,
        colorName: activeModalProduct.colorName,
        colorHex: activeModalProduct.colorHex,
        image: activeModalProduct.image,
        apparelSlug: activeModalProduct.apparelSlug,
        productVariantId: activeOpt.variantId,
        stockQty: activeOpt.stockQty,
      });
    }
    setModalAdded(true);
    setTimeout(() => {
      setModalAdded(false);
      closeDetailModal();
      openCart();
    }, directCheckout ? 200 : 400);
  };

  return (
    <section id="etalase" className="relative z-20 bg-canvas px-6 md:px-12 py-24 border-t border-border-subtle scroll-mt-24">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header (Minimalist & Premium) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-4 border-b border-border-subtle">
          <div>
            <span className="block text-[10px] font-sans text-brand-accent uppercase tracking-widest mb-1 font-bold">
              READY STOCK // MAKASSAR HYPERLOCAL
            </span>
            <h2 className="text-3xl sm:text-5xl font-sans font-extrabold uppercase text-text-primary">
              ETALASE PRODUK
            </h2>
            <p className="font-sans text-xs text-text-muted mt-1.5 max-w-xl leading-relaxed">
              Streetwear kurasi Kaos Kami dengan bahan katun combed adem & sablon DTF presisi.
            </p>
          </div>

          <Link
            href="/catalog"
            className="inline-flex items-center justify-center space-x-2 font-sans text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider shrink-0 py-2.5 px-5 rounded-xl border border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors shadow-sm"
          >
            <span>LIHAT SEMUA KOLEKSI</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "Semua" },
            { id: "tshirt", label: "Kaos Combed 24s" },
            { id: "hoodie", label: "Hoodie & Sweater" },
            { id: "shirt", label: "Coach Jacket" },
            { id: "accessory", label: "Aksesori" },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-sans font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                    : "bg-surface/80 text-text-muted border-border-subtle hover:text-text-primary hover:border-brand-accent/40"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Compact & Balanced Store Showcase Grid (Products Display) */}
        <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5 font-sans">
          {groupedProducts.map(([gkey, variants], idx) => {
            const p = variants.find((v) => v.id === swatchSel[gkey]) || variants[0]!;
            return (
            <div
              key={gkey}
              className="group relative rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md cursor-pointer"
              onClick={() => openDetailModal(p, "photo")}
            >
              {/* Product Visual Mockup */}
              <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={600}
                  height={750}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  priority={idx === 0}
                  loading={idx === 0 ? undefined : "lazy"}
                  unoptimized={true}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    const fallback = p.image || "/products/tshirt-black.jpg";
                    if (!t.src.endsWith(fallback)) t.src = fallback;
                  }}
                />

                {/* Hover Quick-View Hint */}
                <div className="absolute inset-0 bg-canvas/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="py-1.5 px-3 rounded-full bg-canvas/90 text-text-primary font-bold text-[10px] border border-border-subtle flex items-center gap-1.5 shadow-lg">
                    <RotateCw size={12} className="text-brand-accent" />
                    <span>PREVIEW 3D</span>
                  </span>
                </div>
              </div>

              {/* Product Meta Info */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[9px] tracking-wider text-text-muted uppercase block mb-0.5">
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
                  <h3 className="font-sans font-semibold text-xs sm:text-sm text-text-primary line-clamp-1 leading-snug group-hover:text-brand-accent transition-colors">
                    {p.name}
                  </h3>
                  <div className="mt-1 text-xs sm:text-sm font-bold text-brand-accent">
                    Rp {Number(p.priceIdr).toLocaleString("id-ID")}
                  </div>
                  {/* Swatch warna: klik lingkaran → ganti varian tampil (state lokal) */}
                  {variants.length > 1 && (
                    <div
                      className="mt-2 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      role="group"
                      aria-label={`Pilihan warna ${p.name}`}
                    >
                      <span className="text-[10px] text-text-muted mr-0.5">Warna:</span>
                      {variants.map((v) => {
                        const aktif = v.id === p.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSwatchSel((s) => ({ ...s, [gkey]: v.id }))}
                            title={v.colorName}
                            aria-label={`Tampilkan varian ${v.colorName}`}
                            aria-pressed={aktif}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              aktif
                                ? "border-brand-accent ring-2 ring-brand-accent/30 scale-110"
                                : "border-border-subtle hover:border-brand-accent/60 hover:scale-105"
                            }`}
                            style={{ backgroundColor: v.colorHex }}
                          />
                        );
                      })}
                      <span className="text-[10px] font-bold text-text-primary">{p.colorName}</span>
                    </div>
                  )}
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
                    onClick={() => openDetailModal(p, "photo")}
                    disabled={p.stockQty <= 0}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-brand-accent text-canvas font-bold hover:brightness-110 transition-all flex items-center justify-center space-x-1 disabled:opacity-40 min-w-0 shadow-sm"
                    title="Pilih ukuran dan beli produk"
                  >
                    <ShoppingBag size={12} className="shrink-0" />
                    <span className="truncate text-[11px]">
                      {p.stockQty <= 0 ? "HABIS" : "+ BELI"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            );
          })}
          {groupedProducts.length === 0 && (
            <div className="col-span-full p-8 text-center rounded-2xl bg-surface border border-border-subtle space-y-2">
              <p className="font-sans text-sm font-semibold text-text-primary">
                Belum ada produk ready stock pada kategori ini
              </p>
              <p className="font-sans text-xs text-text-muted">
                Kategori aksesori (topi & celana) masih tahap mockup 3D, atau kustom sablon desain sendiri di 3D Studio.
              </p>
              <button
                onClick={() => setSelectedCategory("all")}
                className="font-sans text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider"
              >
                Tampilkan Semua Produk
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ─── E-COMMERCE 3D ORBIT & DETAIL MODAL (PORTAL KE BODY) ─── */}
      {mounted && activeModalProduct && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          data-lenis-prevent="true"
          onClick={closeDetailModal}
        >
          <div
            ref={modalContainerRef}
            tabIndex={-1}
            data-lenis-prevent="true"
            onWheel={handleModalWheel}
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-surface border border-border-subtle rounded-3xl shadow-2xl font-mono text-xs overflow-hidden focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Sticky Modal Header (Never scrolls off screen) */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-border-subtle bg-surface/95 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-wider text-text-primary">
                  DETAIL PRODUK READY STOCK // {activeModalProduct.apparelSlug.toUpperCase()}
                </span>
                <span className="text-[10px] text-brand-accent font-bold bg-brand-accent/10 px-2.5 py-0.5 rounded-full border border-brand-accent/20">
                  KOTA MAKASSAR
                </span>
              </div>
              <button
                onClick={closeDetailModal}
                className="p-1.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent transition-colors shadow-sm"
                title="Tutup (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Content Body (Smooth Wheel & Keyboard Scrolling) */}
            <div
              ref={scrollBodyRef}
              tabIndex={0}
              data-lenis-prevent="true"
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain focus:outline-none p-5 sm:p-7 md:p-8 space-y-6 select-text"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255, 122, 26, 0.4) transparent",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                {/* Left Column: Interactive 3D Orbit Viewport OR Lookbook Photo (Sticky on Desktop) */}
                <div
                  className="space-y-3 md:sticky md:top-0"
                  data-lenis-prevent="true"
                  onWheel={(e) => {
                    e.stopPropagation();
                    // Pastikan scroll wheel di atas preview visual/3D tetap menggulirkan isi modal
                    if (scrollBodyRef.current) {
                      scrollBodyRef.current.scrollTop += e.deltaY;
                    }
                  }}
                >
                  {/* Media Switcher: Cleanly nested above media view */}
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <div className="flex items-center gap-1.5 p-1 bg-canvas rounded-xl border border-border-subtle">
                      <button
                        onClick={() => setViewMode("3d")}
                        className={`py-1.5 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          viewMode === "3d"
                            ? "bg-brand-accent text-canvas shadow-sm"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <RotateCw size={12} />
                        <span>MODEL 3D (360°)</span>
                      </button>
                      <button
                        onClick={() => setViewMode("photo")}
                        className={`py-1.5 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          viewMode === "photo"
                            ? "bg-brand-accent text-canvas shadow-sm"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <Eye size={12} />
                        <span>FOTO KATALOG</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-text-muted hidden sm:inline">
                      {viewMode === "3d" ? "Geser mouse untuk rotasi" : "Foto katalog asli"}
                    </span>
                  </div>

                  {viewMode === "3d" ? (
                    <Showcase3DOrbitViewer
                      apparelSlug={activeModalProduct.apparelSlug}
                      colorHex={activeModalProduct.colorHex}
                    />
                  ) : (
                    <div className="relative aspect-[4/5] min-h-[420px] md:min-h-[500px] rounded-2xl overflow-hidden bg-canvas border border-border-subtle">
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
                          style={{ backgroundColor: activeModalProduct.colorHex }}
                        />
                        <span>{activeModalProduct.colorName}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: E-Commerce Product Info & Config */}
                {(() => {
                  const activeSizeOption = activeModalProduct.sizes?.find((s) => s.size === selectedSize) || {
                    size: selectedSize,
                    priceIdr: activeModalProduct.priceIdr,
                    stockQty: activeModalProduct.stockQty,
                    variantId: activeModalProduct.id,
                  };
                  const currentPrice = activeSizeOption.priceIdr;
                  const currentStock = activeSizeOption.stockQty;
                  const isOutOfStock = currentStock <= 0;

                  return (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] tracking-widest text-brand-accent uppercase font-bold block mb-1">
                          READY STOCK MAKASSAR // {activeModalProduct.apparelSlug.toUpperCase()}
                        </span>
                        <h2 className="font-sans font-bold text-xl sm:text-2xl uppercase text-text-primary leading-tight">
                          {activeModalProduct.name}
                        </h2>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-brand-accent">
                            Rp {Number(currentPrice).toLocaleString("id-ID")}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            / Ukuran {selectedSize}
                          </span>
                        </div>
                      </div>

                      {/* Info Varian Warna Produk (Tetap Sesuai Stok Pilihan) */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-border-subtle">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-border-subtle shadow-inner shrink-0"
                            style={{ backgroundColor: activeModalProduct.colorHex }}
                          />
                          <span className="text-text-muted text-[11px]">Warna Produk:</span>
                          <strong className="text-text-primary text-[11px] font-bold">{activeModalProduct.colorName}</strong>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
                          isOutOfStock
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
                        }`}>
                          {isOutOfStock ? "STOK HABIS" : "READY STOCK"}
                        </span>
                      </div>

                      {/* Description & True Guarantees */}
                      <div className="p-3.5 rounded-xl bg-canvas border border-border-subtle space-y-2 text-text-muted leading-relaxed">
                        <p className="text-text-primary font-bold text-[11px]">
                          Spesifikasi & Keunggulan Produk:
                        </p>
                        <p className="text-[11px]">
                          {activeModalProduct.description || "Material pakaian pilihan berkualitas tinggi. Nyaman untuk iklim tropis, potongan rapi, dan jahitan kuat standar distro."}
                        </p>
                        <div className="pt-2 border-t border-border-subtle space-y-1.5 text-[11px]">
                          <div className="flex items-center gap-2 text-text-primary font-bold">
                            <Truck size={14} className="text-brand-accent shrink-0" />
                            <span>Gratis Pengiriman Langsung se-Kota Makassar</span>
                          </div>
                          <div className="flex items-center gap-2 text-text-primary font-bold">
                            <Check size={14} className="text-brand-accent shrink-0" />
                            <span>Proses Cepat & Siap Kirim Hari Ini</span>
                          </div>
                        </div>
                      </div>

                      {/* Size Selection (Matrix Ukuran S, M, L, XL, XXL) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-text-primary">PILIH UKURAN:</span>
                          <span className="text-text-muted">
                            Terpilih: <strong className="text-brand-accent">{selectedSize}</strong> ({isOutOfStock ? "HABIS" : `Sisa ${currentStock} pcs`})
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {(activeModalProduct.sizes || []).map((opt) => {
                            const isSelected = selectedSize === opt.size;
                            const isHabis = opt.stockQty <= 0;
                            return (
                              <button
                                key={opt.size}
                                onClick={() => {
                                  setSelectedSize(opt.size);
                                  setQuantity(1);
                                }}
                                className={`py-2 px-1 rounded-xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? "bg-brand-accent text-canvas border-brand-accent shadow-md ring-2 ring-brand-accent/30"
                                    : isHabis
                                    ? "bg-surface/40 border-border-subtle/50 text-text-muted/50 cursor-pointer hover:border-rose-500/40"
                                    : "bg-surface border-border-subtle text-text-primary hover:border-brand-accent/50"
                                }`}
                              >
                                <span className={`text-xs ${isHabis ? "line-through text-text-muted" : ""}`}>
                                  {opt.size}
                                </span>
                                <span className={`text-[9px] font-mono tracking-tight ${
                                  isSelected ? "text-canvas font-semibold" : isHabis ? "text-rose-400 font-bold" : "text-text-muted"
                                }`}>
                                  {isHabis ? "HABIS" : `${opt.stockQty} pcs`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {isOutOfStock && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2 animate-in fade-in duration-150">
                            <AlertCircle size={14} className="shrink-0 text-rose-400" />
                            <span>Stok ukuran <strong>{selectedSize}</strong> saat ini habis. Silakan pilih ukuran lain yang tersedia.</span>
                          </div>
                        )}
                      </div>

                      {/* Quantity & Stock */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-text-primary text-[11px]">JUMLAH (PCS):</span>
                        <div className="flex items-center border border-border-subtle rounded-xl bg-canvas overflow-hidden">
                          <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={isOutOfStock || quantity <= 1}
                            className="px-3.5 py-1.5 hover:bg-surface font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="px-4 font-bold">{isOutOfStock ? 0 : quantity}</span>
                          <button
                            onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                            disabled={isOutOfStock || quantity >= currentStock}
                            className="px-3.5 py-1.5 hover:bg-surface font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: Add To Cart & Quick Buy */}
                      <div className="pt-2 border-t border-border-subtle space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => handleModalAddToCart(false)}
                            disabled={isOutOfStock}
                            className="py-3 px-4 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShoppingBag size={14} />
                            <span>{isOutOfStock ? "STOK HABIS" : "KERANJANG"}</span>
                          </button>

                          <button
                            onClick={() => handleModalAddToCart(true)}
                            disabled={isOutOfStock}
                            className="py-3 px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Check size={14} />
                            <span>{isOutOfStock ? "STOK HABIS" : "BELI SEKARANG"}</span>
                          </button>
                        </div>

                        <p className="text-[10px] text-center text-text-muted">
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-bold">Ukuran {selectedSize} sedang kosong</span>
                          ) : (
                            <>Total: Rp {(currentPrice * quantity).toLocaleString("id-ID")} · Stok siap kirim: {currentStock} pcs</>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
