import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

// CMS kelola seluruh website — hero, lookbook, banner, SEO via R2 + DB (tanpa deploy)
export default async function AdminCMSPage() {
  const [cats, colors] = await Promise.all([
    prisma.apparelCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.colorOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl font-black uppercase text-white">CMS — KELOLA SELURUH WEBSITE</h1>
        <p className="text-text-muted">Hero, Lookbook, Banner, SEO, Katalog — edit tanpa deploy via R2 + Turso</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">HERO & SEO</h3>
          <div className="space-y-2">
            <label className="block text-[11px] text-text-muted">Judul Hero (HeroOverlay)</label>
            <input defaultValue="HEAVYWEIGHT BOXY TEE — 240 & 280 GSM" className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white" />
            <label className="block text-[11px] text-text-muted">Deskripsi SEO</label>
            <textarea defaultValue="Engineered oversized streetwear. 240 & 280 GSM combed cotton." rows={2} className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white" />
            <button className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold">SIMPAN (R2 JSON)</button>
            <p className="text-[10px] text-text-muted">Simpan ke R2 `cms/hero.json` → `page.tsx` fetch via `getR2PublicUrl` — tanpa redeploy</p>
          </div>
        </div>

        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">LOOKBOOK (R2)</h3>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4].map(i=>(
              <div key={i} className="aspect-[4/5] bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-text-muted">
                look-0{i}.jpg
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" className="w-full text-xs text-text-muted" />
          <button className="px-4 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold">UPLOAD KE R2 `lookbook/`</button>
        </div>
      </div>

      <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white">KATALOG CEPAT — {cats.length} kategori, {colors.length} warna</h3>
        <p className="text-text-muted">Kelola di <a href="/admin/catalog" className="text-brand-accent underline">/admin/catalog</a> — tambah varian, stok, harga, gambar R2</p>
        <div className="flex gap-2 flex-wrap">
          {cats.map((c:any)=>(<span key={c.id} className="px-2 py-1 rounded-full bg-surface border border-white/10 text-white text-[11px]">{c.slug} {c.basePriceIdr.toLocaleString("id-ID")}</span>))}
        </div>
      </div>
    </div>
  );
}
