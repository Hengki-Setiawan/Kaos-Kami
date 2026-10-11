import React from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { count, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ProductVariant } from "@/lib/drizzle-schema";
import { AddProductModal } from "@/components/admin/AddProductModal";
import { InventoryPageTabs } from "@/components/admin/CatalogPageTabs";
import { Package, ShoppingBag, Layers, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getVariantCounts = unstable_cache(
  async () =>
    db.select({ categoryId: ProductVariant.categoryId, n: count() }).from(ProductVariant).groupBy(ProductVariant.categoryId),
  ["admin-inventory-variant-counts"],
  { revalidate: 60 }
);

export default async function AdminInventoryPage() {
  const [categories, colors, materials, sablonMethods, allVariants] = await Promise.all([
    db.query.ApparelCategory.findMany({ orderBy: (t, { asc: ascc }) => ascc(t.sortOrder) }),
    db.query.ColorOption.findMany({ orderBy: (t, { asc: ascc }) => ascc(t.sortOrder) }),
    db.query.MaterialFinish.findMany(),
    db.query.SablonMethod.findMany(),
    db.query.ProductVariant.findMany({
      orderBy: (t, { asc: ascc }) => [ascc(t.categoryId), ascc(t.colorName), ascc(t.size)],
    }),
  ]);

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
      {/* Header Halaman */}
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <Package size={14} />
            <span>Inventaris Bahan Baku Workshop</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary">
            STOK BAHAN KAOS POLOS (STUDIO 3D)
          </h1>
          <p className="text-text-muted mt-0.5 text-xs max-w-2xl leading-relaxed">
            Pusat kendali persediaan bahan kaos polos, hoodie, dan sweater Makassar per warna dan ukuran untuk perakitan di Studio 3D, serta konfigurasi Data Master apparel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/distro-catalog"
            className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-muted font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="Buka katalog produk jadi e-commerce yang dijual di etalase"
          >
            <ShoppingBag size={14} />
            <span>Katalog Produk Jadi Toko</span>
          </Link>

          <AddProductModal categories={categoryOptions} />
        </div>
      </div>

      {/* KPI Inventaris Kaos Polos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Total Kombinasi SKU (3D)
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1">
            {allVariants.length} <span className="text-xs font-sans font-normal text-text-muted">varian</span>
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
            Stok Menipis (&le; 5 pcs)
          </span>
          <span className={`text-xl font-bold font-mono mt-1 ${lowStockCount > 0 ? "text-amber-500" : "text-emerald-400"}`}>
            {lowStockCount} <span className="text-xs font-sans font-normal text-text-muted">item</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle/80 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
            Stok Habis (0 pcs)
          </span>
          <span className={`text-xl font-bold font-mono mt-1 ${outOfStockCount > 0 ? "text-rose-500" : "text-emerald-400"}`}>
            {outOfStockCount} <span className="text-xs font-sans font-normal text-text-muted">item</span>
          </span>
        </div>
      </div>

      {/* TABS INVENTARIS: MATRIKS STOK KAOS POLOS & DATA MASTER */}
      <InventoryPageTabs
        categories={categories as any}
        variants={allVariants as any}
        categoriesWithCounts={categoriesWithCounts}
        colors={colors}
        materials={materials}
        sablonMethods={sablonMethods}
      />
    </div>
  );
}
