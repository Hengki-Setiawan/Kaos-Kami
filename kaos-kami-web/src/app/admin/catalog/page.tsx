import React from "react";
import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { ProductVariant } from "@/lib/drizzle-schema";
import { VariantRowActions } from "@/components/admin/VariantRowActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PER_PAGE = 20;

const idr = (v: number | null | undefined) =>
  v == null ? "—" : `Rp ${Number(v).toLocaleString("id-ID")}`;

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ vpage?: string }>;
}) {
  const sp = await searchParams;
  const vpage = Math.max(1, Number(sp.vpage) || 1);
  const [categories, colors, materials, sablonMethods] = await Promise.all([
    db.query.ApparelCategory.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
    db.query.ColorOption.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
    db.query.MaterialFinish.findMany(),
    db.query.SablonMethod.findMany(),
  ]);
  const variantTotal = (await db.select({ n: count() }).from(ProductVariant))[0]?.n ?? 0;
  const variantPages = Math.max(1, Math.ceil(Number(variantTotal) / PER_PAGE));
  const safeVPage = Math.min(vpage, variantPages);
  const variants = await db.query.ProductVariant.findMany({
    limit: PER_PAGE,
    offset: (safeVPage - 1) * PER_PAGE,
    orderBy: (t, { desc }) => desc(t.createdAt),
    with: { category: true },
  });
  const variantCounts = await db
    .select({ categoryId: ProductVariant.categoryId, n: count() })
    .from(ProductVariant)
    .groupBy(ProductVariant.categoryId);
  const countMap = new Map(variantCounts.map((r) => [r.categoryId, r.n]));
  const categoriesWithCounts = categories.map((c: any) => ({
    ...c,
    _count: { variants: countMap.get(c.id) || 0 },
  }));

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">KATALOG MANAGEMENT (ADMIN)</h1>
        <p className="text-text-muted mt-1">CRUD ApparelCategory • ProductVariant • ColorOption • MaterialFinish • SablonMethod — sinkron dengan Turso DB</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-white uppercase">Apparel Categories ({categories.length})</h2>
        <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
          {categoriesWithCounts.map((c: any) => (
            <div key={c.id} className="p-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block">{c.name || "Tanpa nama"} ({c.slug || "?"})</span>
                <span className="text-text-muted">{c.weightGsm || "?"} • {idr(c.basePriceIdr)} • {c.sizes || "?"} • 3D: {c.model3dPath || "—"}</span>
              </div>
              <span className="px-2 py-1 rounded bg-surface border border-white/10 text-white">{c._count?.variants ?? 0} varian</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-white uppercase">
          Product Variants (Ready Stock) — {Number(variantTotal)} total · hal. {safeVPage}/{variantPages}
        </h2>
        <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
          {variants.map((v: any) => (
            <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="text-white font-bold">{v.sku || v.id} — {v.name || "Tanpa nama"} ({v.size || "?"} • {v.colorName || "?"})</span>
              <VariantRowActions id={v.id} stockQty={v.stockQty} priceIdr={v.priceIdr} isActive={!!v.isActive} />
            </div>
          ))}
          {variants.length === 0 && <div className="p-8 text-center text-text-muted">Belum ada varian.</div>}
        </div>
        {variantPages > 1 && (
          <div className="flex items-center justify-between">
            {safeVPage > 1 ? (
              <Link href={`/admin/catalog?vpage=${safeVPage - 1}`} className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white font-bold">
                ← SEBELUM
              </Link>
            ) : (
              <span />
            )}
            <span className="text-text-muted">
              {safeVPage} / {variantPages}
            </span>
            {safeVPage < variantPages ? (
              <Link href={`/admin/catalog?vpage=${safeVPage + 1}`} className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white font-bold">
                LANJUT →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
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
            <div key={s.id} className="text-[11px]"><span className="font-bold text-white">{s.name || "?"} ({s.slug || "?"})</span><span className="block text-text-muted">A6 {s.priceA6Idr ?? "—"} • A5 {s.priceA5Idr ?? "—"} • A4 {s.priceA4Idr ?? "—"} • A3 {s.priceA3Idr ?? "—"}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
