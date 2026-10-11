import React from "react";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { CatalogProduct } from "@/lib/drizzle-schema";
import { DistroCatalogManager } from "@/components/admin/DistroCatalogManager";
import { ShoppingBag, ArrowUpRight, Package, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDistroCatalogPage() {
  const distroProducts = await db.query.CatalogProduct.findMany({
    orderBy: (t, { asc: ascc }) => ascc(t.sortOrder),
  });

  const activeCount = distroProducts.filter((p) => p.isActive).length;
  const featuredCount = distroProducts.filter((p) => p.isFeatured).length;

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* Header Halaman */}
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <ShoppingBag size={14} />
            <span>Manajemen Etalase Toko Online</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary">
            KATALOG PRODUK JADI E-COMMERCE
          </h1>
          <p className="text-text-muted mt-0.5 text-xs max-w-2xl leading-relaxed">
            Kelola produk busana pakaian jadi yang tampil langsung di etalase beranda (<code>#etalase</code>) dan katalog e-commerce (<code>/catalog</code>). Atur foto 2D etalase, harga jual, dan mockup 3D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/inventory"
            className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-muted font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="Kelola stok fisik bahan baku kaos polos Studio 3D"
          >
            <Package size={14} />
            <span>Stok Kaos Polos Studio</span>
          </Link>

          <Link
            href="/#etalase"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>Lihat Etalase Toko</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Ringkasan Produk Jadi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Total Produk Jadi
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1">
            {distroProducts.length} <span className="text-xs font-sans font-normal text-text-muted">item</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Aktif di Etalase
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {activeCount} <span className="text-xs font-sans font-normal text-text-muted">tampil</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Produk Pilihan (Featured)
          </span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1">
            {featuredCount} <span className="text-xs font-sans font-normal text-text-muted">unggulan</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Model 3D Terintegrasi
          </span>
          <span className="text-xl font-bold font-mono text-brand-accent mt-1 flex items-center gap-1">
            <Sparkles size={14} />
            <span>100% Siap</span>
          </span>
        </div>
      </div>

      {/* Komponen Pengelola Katalog Distro */}
      <div className="rounded-2xl bg-surface/50 border border-border-subtle p-4 sm:p-6 shadow-sm">
        <DistroCatalogManager initialProducts={distroProducts as any} />
      </div>
    </div>
  );
}
