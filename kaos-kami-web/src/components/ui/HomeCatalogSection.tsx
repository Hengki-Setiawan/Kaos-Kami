"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const HomeCatalogSection: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [failed, setFailed] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { setSelectedColor, setSelectedSize, setViewMode } = useConfiguratorStore();

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    (async () => {
      try {
        const res = await fetch("/api/catalog/variants", { signal: ctrl.signal });
        const data = await res.json().catch(() => null);
        clearTimeout(t);
        // Gagal fetch = sembunyikan section diam-diam? TIDAK (audit #12):
        // tampilkan fallback link katalog agar beranda tak bolong.
        if (!res.ok || !data?.success || !Array.isArray(data.variants)) {
          setFailed(true);
          return;
        }
        setProducts(data.variants.slice(0, 3));
      } catch {
        clearTimeout(t);
        setFailed(true);
      }
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  if (failed) {
    return (
      <section className="relative z-20 bg-[#0E0E10] px-6 md:px-12 py-16 border-t border-border-subtle text-center font-mono text-xs">
        <p className="text-text-muted mb-3">Katalog tidak bisa dimuat saat ini.</p>
        <Link
          href="/catalog"
          className="inline-block px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold uppercase"
        >
          BUKA KATALOG
        </Link>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="relative z-20 bg-[#0E0E10] px-6 md:px-12 py-24 border-t border-border-subtle">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="block text-[11px] font-mono text-brand-accent uppercase tracking-widest mb-1 font-bold">
              PRODUK READY STOCK MAKASSAR
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black uppercase text-white">
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
          {products.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-surface/70 border border-white/5 hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-black/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={Array.isArray(p.images) && p.images[0] ? p.images[0] : "/lookbook/look-01.jpg"}
                  alt={p.name || "Produk Kaos Kami"}
                  width={600}
                  height={750}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-bold border border-white/10">
                  {p.colorName} · Size {p.size}
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-white line-clamp-1">
                  {p.name}
                </h3>
                <div className="mt-1 text-lg font-bold text-brand-accent">
                  Rp {p.priceIdr.toLocaleString("id-ID")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <button
                  onClick={() => {
                    if ((p.stockQty ?? 1) <= 0) return;
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
                    });
                    setAddedId(p.id);
                    setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 2000);
                  }}
                  disabled={(p.stockQty ?? 1) <= 0}
                  className="py-2.5 px-3 rounded-xl bg-surface border border-white/10 text-white font-bold hover:bg-brand-accent hover:text-canvas transition-all flex items-center justify-center space-x-1 disabled:opacity-40"
                >
                  <ShoppingBag size={12} />
                  <span>{(p.stockQty ?? 1) <= 0 ? "HABIS" : addedId === p.id ? "✓ DITAMBAH" : "+ BELI"}</span>
                </button>

                <Link
                  href="/studio"
                  onClick={() => {
                    setSelectedColor(p.colorHex);
                    setSelectedSize(p.size);
                    setViewMode("studio");
                  }}
                  className="py-2.5 px-3 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent font-bold hover:bg-brand-accent hover:text-canvas transition-all flex items-center justify-center space-x-1"
                >
                  <Sparkles size={12} />
                  <span>SABLON 3D</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
