"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const HomeCatalogSection: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const { addItem } = useCartStore();
  const { setSelectedColor, setSelectedSize, setViewMode } = useConfiguratorStore();

  useEffect(() => {
    fetch("/api/catalog/variants")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.variants)) {
          setProducts(data.variants.slice(0, 3));
        }
      })
      .catch((err) => console.warn("Catalog fetch:", err));
  }, []);

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
              Langsung diantar hari ini via kurir instan Maxim Makassar atau ekspedisi se-Sulawesi.
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
                  src={p.images[0] || "/lookbook/look-01.jpg"}
                  alt={p.name}
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
                  onClick={() =>
                    addItem({
                      id: p.id,
                      name: p.name,
                      priceIdr: p.priceIdr,
                      size: p.size,
                      colorName: p.colorName,
                      colorHex: p.colorHex,
                      image: p.images[0] || "/lookbook/look-01.jpg",
                    })
                  }
                  className="py-2.5 px-3 rounded-xl bg-surface border border-white/10 text-white font-bold hover:bg-brand-accent hover:text-canvas transition-all flex items-center justify-center space-x-1"
                >
                  <ShoppingBag size={12} />
                  <span>+ BELI</span>
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
