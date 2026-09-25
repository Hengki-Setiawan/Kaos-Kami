import { db } from "@/lib/db";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CmsHeroForm } from "@/components/admin/CmsHeroForm";
import { LookbookManager } from "@/components/admin/LookbookManager";
export const dynamic = "force-dynamic";

// CMS kelola seluruh website — hero, lookbook, banner, SEO via R2 + DB (tanpa deploy)
export default async function AdminCMSPage() {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (myRole === "PRODUCTION_STAFF") {
    redirect("/admin/production");
  }
  if (myRole === "COURIER") {
    redirect("/admin/deliveries");
  }
  if (!myRole || !["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
    redirect("/?denied=admin");
  }

  const [cats, colors] = await Promise.all([
    db.query.ApparelCategory.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
    db.query.ColorOption.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) }),
  ]);
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto font-mono text-xs">
        <div className="pb-4 border-b border-border-subtle">
        <h1 className="font-display text-2xl font-black uppercase text-text-primary">CMS — KELOLA SELURUH WEBSITE</h1>
        <p className="text-text-muted">Hero, Lookbook, Banner, SEO, Katalog — edit tanpa deploy via R2 + Turso</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CmsHeroForm />

        <LookbookManager />
      </div>

      <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-text-primary">KATALOG CEPAT — {cats.length} kategori, {colors.length} warna</h3>
        <p className="text-text-muted">Kelola di <Link href="/admin/catalog" className="text-brand-accent underline">/admin/catalog</Link> — tambah varian, stok, harga, gambar R2</p>
        <div className="flex gap-2 flex-wrap">
          {cats.map((c:any)=>(<span key={c.id} className="px-2 py-1 rounded-full bg-surface border border-border-subtle text-text-primary text-[11px]">{c.slug} {(c.basePriceIdr ?? 0).toLocaleString("id-ID")}</span>))}
        </div>
      </div>
    </div>
  );
}
