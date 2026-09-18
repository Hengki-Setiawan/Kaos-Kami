"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import { isSafeImageUrl } from "@/lib/safeUrl";

// Alias dua arah legacy ↔ kanonis (tiru handleOpenInStudio di catalog/page.tsx
// + normalizeApparelSlug server): "jacket" (nama file jacket.glb + data lama)
// ↔ "shirt" (slug kanonis DB); keduanya resolve ke "shirt".
const APPAREL_SLUG_ALIASES: Record<string, ApparelType> = {
  jacket: "shirt",
  shirt: "shirt",
};

const FALLBACK_PRODUCTS = [
  {
    id: "fb-tshirt-1",
    name: "Heavyweight Boxy Tee — Chalk Ecru (Polos)",
    colorHex: "#EFECE6",
    colorName: "Chalk Ecru",
    size: "L",
    priceIdr: 165000,
    stockQty: 35,
    images: ["/lookbook/look-02.jpg"],
    category: { slug: "tshirt" },
  },
  {
    id: "fb-hoodie-1",
    name: "Fleece Heavyweight Oversized Hoodie — Obsidian Black",
    colorHex: "#121214",
    colorName: "Obsidian Black",
    size: "XL",
    priceIdr: 285000,
    stockQty: 25,
    images: ["/lookbook/look-01.jpg"],
    category: { slug: "hoodie" },
  },
  {
    id: "fb-jacket-1",
    name: "Tactical Urban Coach Jacket — Military Olive",
    colorHex: "#3B4435",
    colorName: "Military Olive",
    size: "L",
    priceIdr: 320000,
    stockQty: 18,
    images: ["/lookbook/look-04.jpg"],
    category: { slug: "shirt" },
  },
];

export const HomeCatalogSection: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const { setActiveApparel, setSelectedColor, setSelectedSize, setViewMode } = useConfiguratorStore(
    useShallow((s) => ({
      setActiveApparel: s.setActiveApparel,
      setSelectedColor: s.setSelectedColor,
      setSelectedSize: s.setSelectedSize,
      setViewMode: s.setViewMode,
    }))
  );

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    (async () => {
      try {
        const res = await fetch("/api/catalog/variants", { signal: ctrl.signal });
        const data = await res.json().catch(() => null);
        clearTimeout(t);
        if (res.ok && data?.success && Array.isArray(data.variants) && data.variants.length > 0) {
          setProducts(data.variants.slice(0, 3));
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch {
        clearTimeout(t);
        setProducts(FALLBACK_PRODUCTS);
      }
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  // CWV: skeleton tiru grid 3 kartu (image aspect-4/5) ganti null agar
  // section tak pop-in (CLS) saat varian tiba.
  if (products.length === 0) {
    return (
      <section
        className="relative z-20 bg-canvas px-6 md:px-12 py-24 border-t border-border-subtle"
        aria-busy="true"
        aria-label="Memuat koleksi siap beli"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="pb-4 border-b border-border-subtle space-y-3">
            <div className="h-3 w-48 rounded bg-border-subtle/60 animate-pulse" />
            <div className="h-8 w-72 rounded bg-border-subtle/60 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-surface/70 border border-border-subtle space-y-4 animate-pulse"
              >
                <div className="aspect-[4/5] rounded-xl bg-border-subtle/40" />
                <div className="h-4 w-2/3 rounded bg-border-subtle/60" />
                <div className="h-10 rounded-xl bg-border-subtle/40" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-20 bg-canvas px-6 md:px-12 py-24 border-t border-border-subtle">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-border-subtle">
          <div>
            <span className="block text-[11px] font-mono text-brand-accent uppercase tracking-widest mb-1 font-bold">
              PRODUK READY STOCK MAKASSAR
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black uppercase text-text-primary">
              KOLEKSI SIAP BELI
            </h2>
            <p className="font-mono text-xs text-text-muted mt-2 max-w-lg">
              Langsung diantar gratis hari ini se-Kota Makassar atau ekspedisi nasional.
            </p>
          </div>

          <Link
            href="/catalog"
            className="flex items-center space-x-1.5 font-mono text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider"
          >
            <span>LIHAT SEMUA KATALOG ({products.length}+ PRODUK)</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 3 Featured Products Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          {products.map((p, idx) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-surface/70 border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface">
                {/* CWV: next/image + sizes; kartu pertama priority (LCP). */}
                <Image
                  src={Array.isArray(p.images) && p.images[0] && isSafeImageUrl(p.images[0]) ? p.images[0] : "/lookbook/look-01.jpg"}
                  alt={p.name || "Produk Kaos Kami"}
                  width={600}
                  height={750}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={idx === 0}
                  loading={idx === 0 ? undefined : "lazy"}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (!t.src.endsWith("/lookbook/look-01.jpg")) t.src = "/lookbook/look-01.jpg";
                  }}
                />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-canvas/60 backdrop-blur-md text-[10px] text-text-primary font-bold border border-border-subtle">
                  {p.colorName} · Size {p.size}
                </span>
              </div>

              <div className="min-w-0">
                <h3 className="font-display font-bold text-base text-text-primary truncate">
                  {p.name}
                </h3>
                <div className="mt-1 text-lg font-bold text-brand-accent">
                  Rp {Number(p.priceIdr || 0).toLocaleString("id-ID")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-xs min-w-0">
                <button
                  onClick={() => {
                    // Stok jujur: guard ?? 0 (jangan ?? 1 — stok unknown ≠ ada 1).
                    // unknown/undefined = anggap 0 agar tak oversell sebelum server menolak.
                    if ((p.stockQty ?? 0) <= 0) return;
                    addItem({
                      id: p.id,
                      name: p.name,
                      priceIdr: p.priceIdr,
                      size: p.size,
                      colorName: p.colorName,
                      colorHex: p.colorHex,
                      image: Array.isArray(p.images) && p.images[0] ? p.images[0] : "/lookbook/look-01.jpg",
                      apparelSlug: p.category?.slug || "tshirt",
                      productVariantId: p.id,
                      // Bawa stok varian ke cart agar drawer bisa kunci tombol +.
                      stockQty: p.stockQty ?? 0,
                    });
                    setAddedId(p.id);
                    setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 2000);
                  }}
                  disabled={(p.stockQty ?? 0) <= 0}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold hover:bg-brand-accent hover:text-canvas transition-all flex items-center justify-center space-x-1 disabled:opacity-40 min-w-0"
                >
                  <ShoppingBag size={12} className="shrink-0" />
                  <span className="truncate">{(p.stockQty ?? 0) <= 0 ? "HABIS" : addedId === p.id ? "✓ DITAMBAH" : "+ BELI"}</span>
                </button>

                <Link
                  href="/studio"
                  onClick={() => {
                    // Teruskan apparel katalog ke Studio (tiru handleOpenInStudio
                    // di catalog/page.tsx): SSOT slug = kunci APPAREL_CATALOG,
                    // bukan category.slug mentah (dulu "shirt"/asing jatuh ke
                    // default tshirt → harga/jenis salah di studio).
                    const rawSlug = String(p.category?.slug || "").trim().toLowerCase();
                    const canonical: ApparelType | undefined = (
                      Object.keys(APPAREL_CATALOG) as ApparelType[]
                    ).includes(rawSlug as ApparelType)
                      ? (rawSlug as ApparelType)
                      : APPAREL_SLUG_ALIASES[rawSlug];
                    if (!canonical) {
                      console.warn(
                        `[home-catalog] slug apparel tak dikenal "${p.category?.slug}" pada produk ${p.id} — fallback ke "tshirt".`
                      );
                    }
                    setActiveApparel(canonical ?? "tshirt");
                    setSelectedColor(p.colorHex);
                    setSelectedSize(p.size);
                    setViewMode("studio");
                  }}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent font-bold hover:bg-brand-accent hover:text-canvas transition-all flex items-center justify-center space-x-1 min-w-0"
                >
                  <Sparkles size={12} className="shrink-0" />
                  <span className="truncate">SABLON 3D</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
