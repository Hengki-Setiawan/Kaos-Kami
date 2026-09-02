import React from "react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCatalogPage() {
  const [categories, variants, colors, materials, sablonMethods] = await Promise.all([
    prisma.apparelCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { variants: true } } } as any }),
    prisma.productVariant.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { category: true } }),
    prisma.colorOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.materialFinish.findMany(),
    prisma.sablonMethod.findMany(),
  ]);

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">KATALOG MANAGEMENT (ADMIN)</h1>
        <p className="text-text-muted mt-1">CRUD ApparelCategory • ProductVariant • ColorOption • MaterialFinish • SablonMethod — sinkron dengan Turso DB</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-white uppercase">Apparel Categories ({categories.length})</h2>
        <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
          {categories.map((c: any) => (
            <div key={c.id} className="p-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block">{c.name} ({c.slug})</span>
                <span className="text-text-muted">{c.weightGsm} • Rp {c.basePriceIdr.toLocaleString("id-ID")} • {c.sizes} • 3D: {c.model3dPath}</span>
              </div>
              <span className="px-2 py-1 rounded bg-surface border border-white/10 text-white">{c._count?.variants ?? 0} varian</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-white uppercase">Product Variants (Ready Stock) — {variants.length}</h2>
        <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
          {variants.map((v: any) => (
            <div key={v.id} className="p-4 flex justify-between">
              <span className="text-white font-bold">{v.sku} — {v.name} ({v.size} • {v.colorName})</span>
              <span className="text-brand-accent font-bold">Rp {v.priceIdr.toLocaleString("id-ID")} • {v.stockQty} pcs</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-white">COLORS ({colors.length})</h3>
          {colors.map((c: any) => (
            <div key={c.id} className="flex justify-between text-[11px]"><span className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full border border-white/20" style={{ background: c.hex }} />{c.name}</span><span className="text-text-muted">{c.surchargeIdr>0?`+${c.surchargeIdr}`:""}</span></div>
          ))}
        </div>
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-white">MATERIALS ({materials.length})</h3>
          {materials.map((m: any) => (
            <div key={m.id} className="flex justify-between text-[11px]"><span>{m.name}</span><span className="text-text-muted">+{m.surchargeIdr}</span></div>
          ))}
        </div>
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-white">SABLON ({sablonMethods.length})</h3>
          {sablonMethods.map((s: any) => (
            <div key={s.id} className="text-[11px]"><span className="font-bold text-white">{s.name} ({s.slug})</span><span className="block text-text-muted">A6 {s.priceA6Idr} • A5 {s.priceA5Idr} • A4 {s.priceA4Idr} • A3 {s.priceA3Idr}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
