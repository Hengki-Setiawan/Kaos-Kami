import React from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { count, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ProductVariant, CatalogProduct } from "@/lib/drizzle-schema";
import { AddProductModal } from "@/components/admin/AddProductModal";
import { CatalogPageTabs } from "@/components/admin/CatalogPageTabs";
import { ShoppingBag, Package, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Agregasi count per kategori di-cache 60 detik
const getVariantCounts = unstable_cache(
  async () =>
    db.select({ categoryId: ProductVariant.categoryId, n: count() }).from(ProductVariant).groupBy(ProductVariant.categoryId),
  ["admin-catalog-variant-counts"],
  { revalidate: 60 }
);

export default async function AdminCatalogPage() {
  const [categories, colors, materials, sablonMethods, allVariants, distroProducts] = await Promise.all([
    db.query.ApparelCategory.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
    db.query.ColorOption.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
    db.query.MaterialFinish.findMany(),
    db.query.SablonMethod.findMany(),
    db.query.ProductVariant.findMany({
      orderBy: (t, { asc }) => [asc(t.categoryId), asc(t.colorName), asc(t.size)],
    }),
    db.query.CatalogProduct.findMany({
      orderBy: (t, { asc }) => asc(t.sortOrder),
    }),
  ]);

  // Statistik Inventaris Nyata
  const totalQtyPhysical = allVariants.reduce((sum, v) => sum + (v.stockQty || 0), 0);
  const lowStockCount = allVariants.filter((v) => (v.stockQty || 0) > 0 && (v.stockQty || 0) <= 5).length;
  const outOfStockCount = allVariants.filter((v) => (v.stockQty || 0) === 0).length;

  const variantCounts = await getVariantCounts();
  const countMap = new Map(variantCounts.map((r) => [r.categoryId, r.n]));
  const categoriesWithCounts = categories.map((c: any) => ({
    ...c,
    _count: { variants: countMap.get(c.id) || 0 },
  }));

  const categoryOptions = categories.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }));

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* Header */}
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary">
            KATALOG & INVENTARIS
          </h1>
          <p className="text-text-muted mt-0.5 text-xs">
            Portal pusat kendali produk toko online Kaos Kami Makassar dan inventaris bahan apparel Studio 3D.
          </p>
        </div>
        <AddProductModal categories={categoryOptions} />
      </div>

      {/* 2 KARTU PINTASAN PEMISAHAN HALAMAN KHUSUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/distro-catalog"
          className="group p-5 rounded-2xl bg-gradient-to-br from-surface to-surface-elevated border border-border-subtle hover:border-brand-accent transition-all shadow-sm hover:shadow-md flex items-start gap-4"
        >
          <div className="p-3 rounded-xl bg-brand-accent/15 text-brand-accent shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-text-primary uppercase group-hover:text-brand-accent transition-colors">
                Katalog Produk Jadi E-Commerce
              </h3>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-brand-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-text-muted text-xs mt-1 leading-relaxed">
              Khusus mengelola produk siap jual di etalase toko online. Upload foto 2D etalase depan, harga jual, dan kustomisasi mockup 3D.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-brand-accent">
              <span>Buka Halaman Khusus Produk Jadi &rarr;</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/inventory"
          className="group p-5 rounded-2xl bg-gradient-to-br from-surface to-surface-elevated border border-border-subtle hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md flex items-start gap-4"
        >
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-text-primary uppercase group-hover:text-blue-400 transition-colors">
                Inventaris Stok Kaos Polos (Studio 3D)
              </h3>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-text-muted text-xs mt-1 leading-relaxed">
              Khusus mengelola persediaan fisik bahan baku apparel polos (kaos, hoodie, sweater) per warna & ukuran untuk Studio 3D + Data Master.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-blue-400">
              <span>Buka Halaman Khusus Stok Polos &rarr;</span>
            </div>
          </div>
        </Link>
      </div>

      {/* KPI INVENTARIS GLOBAL RINGKAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Total Varian SKU (3D)
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1">
            {allVariants.length} <span className="text-xs font-sans font-normal text-text-muted">kombinasi</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Total Stok Fisik Polos
          </span>
          <span className="text-xl font-bold font-mono text-brand-accent mt-1">
            {totalQtyPhysical.toLocaleString("id-ID")} <span className="text-xs font-sans font-normal text-text-muted">pcs</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Produk Distro Jadi
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {distroProducts.length} <span className="text-xs font-sans font-normal text-text-muted">koleksi</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Stok Kritis / Habis
          </span>
          <span className={`text-xl font-bold font-mono mt-1 ${lowStockCount + outOfStockCount > 0 ? "text-amber-500" : "text-emerald-400"}`}>
            {lowStockCount + outOfStockCount} <span className="text-xs font-sans font-normal text-text-muted">varian</span>
          </span>
        </div>
      </div>

      {/* TABS UTAMA: MATRIX KAOS POLOS 3D | PRODUK DISTRO E-COMMERCE | DATA MASTER REFERENSI */}
      <CatalogPageTabs
        categories={categories as any}
        variants={allVariants as any}
        distroProducts={distroProducts as any}
        categoriesWithCounts={categoriesWithCounts}
        colors={colors}
        materials={materials}
        sablonMethods={sablonMethods}
      />
    </div>
  );
}
