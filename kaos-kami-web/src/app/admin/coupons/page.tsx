import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { like, desc, sum, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Coupon } from "@/lib/drizzle-schema";
import { CouponRowActions } from "@/components/admin/CouponAdminPanel";
import { CouponCreateModal } from "@/components/admin/CouponCreateModal";
import { isDevOrTest } from "@/lib/envMode";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const SORTS = ["code_desc", "code_asc", "used_desc", "used_asc"] as const;
type Sort = (typeof SORTS)[number];

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; q?: string }>;
}) {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (isDevOrTest() && myRole !== "CUSTOMER") {
    myRole = "SUPER_ADMIN";
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

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "code_desc";
  const q = (sp.q || "").trim().slice(0, 32);

  const where = q ? like(Coupon.code, `%${q.toUpperCase()}%`) : undefined;

  // Metrik ringkasan kupon
  const [totalRes, sumUsedRes, mostUsedRes] = await Promise.all([
    db.select({ total: count() }).from(Coupon),
    db.select({ totalUsed: sum(Coupon.usedCount) }).from(Coupon),
    db.select().from(Coupon).orderBy(desc(Coupon.usedCount)).limit(1),
  ]);
  const totalCoupons = Number(totalRes[0]?.total ?? 0);
  const totalUsedCount = Number(sumUsedRes[0]?.totalUsed ?? 0);
  const topCoupon = mostUsedRes[0];

  const coupons = await db.query.Coupon.findMany({
    where: where as any,
    orderBy: (t, { asc, desc }) =>
      sort === "code_asc"
        ? [asc(t.code)]
        : sort === "used_desc"
          ? [desc(t.usedCount)]
          : sort === "used_asc"
            ? [asc(t.usedCount)]
            : [desc(t.code)],
    limit: PER_PAGE + 1,
    offset: (page - 1) * PER_PAGE,
  });
  const hasMore = coupons.length > PER_PAGE;
  const rows = hasMore ? coupons.slice(0, PER_PAGE) : coupons;
  const activeCount = rows.filter((c: any) => c.isActive).length;

  const link = (p: number, s: Sort) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (s !== "code_desc") params.set("sort", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/admin/coupons${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* HEADER */}
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Voucher & Kupon Promo</h1>
          <p className="text-text-muted text-xs mt-0.5">Kelola diskon grosir, promo komunitas & event Makassar (sinkron live Turso DB)</p>
        </div>
        <div className="flex items-center gap-2">
          <CouponCreateModal />
        </div>
      </div>

      {/* METRIK KARTU RINGKAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-text-muted">Total Voucher</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-text-primary tracking-tight">{totalCoupons}</span>
            <span className="text-[11px] text-text-muted">kode</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-text-muted">Voucher Aktif</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCount}</span>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">halaman ini</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-text-muted">Total Pemakaian</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-brand-accent tracking-tight">{totalUsedCount.toLocaleString("id-ID")}</span>
            <span className="text-[11px] text-text-muted">kali ditebus</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-text-muted">Paling Sering Dipakai</span>
          <div className="mt-2">
            <span className="text-sm font-bold text-text-primary truncate block font-mono">
              {topCoupon ? `${topCoupon.code} (${topCoupon.usedCount}x)` : "Belum ada"}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH & SORT BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <form method="get" className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari kode promo..."
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-brand-accent uppercase font-mono tracking-wider transition"
            />
            {q && (
              <Link href="/admin/coupons" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs">
                ✕
              </Link>
            )}
          </div>
          {sort !== "code_desc" && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className="px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated font-medium text-xs text-text-primary transition">
            Cari
          </button>
        </form>

        <div className="flex gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0 items-center">
          <span className="text-[11px] text-text-muted mr-1 hidden sm:inline">Urutan:</span>
          {SORTS.map((s) => (
            <Link
              key={s}
              href={link(1, s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition ${
                s === sort
                  ? "bg-brand-accent/10 border-brand-accent text-brand-accent"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-border-default"
              }`}
            >
              {s === "code_desc" ? "Kode (Z-A)" : s === "code_asc" ? "Kode (A-Z)" : s === "used_desc" ? "Terbanyak" : "Tersedikit"}
            </Link>
          ))}
        </div>
      </div>

      {/* DAFTAR KUPON */}
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle shadow-sm">
        {rows.length ? (
          rows.map((c: any) => (
            <div key={c.id} className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition hover:bg-surface-elevated/40 ${c.isActive ? "" : "opacity-60 bg-surface/40"}`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle font-bold font-mono text-xs text-brand-accent tracking-wider">
                    {c.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-accent/10 text-brand-accent">
                    {c.discountType === "PERCENT" ? `Diskon ${c.discountValue}%` : `Diskon Rp ${Number(c.discountValue).toLocaleString("id-ID")}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-500/10 text-text-muted"}`}>
                    {c.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="text-text-muted text-[11px] flex items-center gap-3 flex-wrap">
                  <span>Min. belanja: <strong className="text-text-primary font-normal">Rp {(c.minSpendIdr ?? 0).toLocaleString("id-ID")}</strong></span>
                  <span>•</span>
                  <span>Dipakai: <strong className="text-text-primary font-mono">{c.usedCount ?? 0}</strong> / {c.maxUses || "∞"} kali</span>
                  <span>•</span>
                  <span>{c.expiresAt ? `Kedaluwarsa: ${new Date(c.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : "Masa berlaku selamanya"}</span>
                </div>
              </div>
              <CouponRowActions id={c.id} isActive={!!c.isActive} usedCount={c.usedCount ?? 0} maxUses={c.maxUses ?? null} expiresAt={c.expiresAt ?? null} />
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-text-muted">
            {q ? `Tidak ada kupon dengan kata kunci "${q}".` : "Belum ada voucher promo — klik tombol '+ Buat Kupon' di atas untuk memulai promosi."}
          </div>
        )}
      </div>

      {/* PAGINASI */}
      <div className="flex items-center justify-between text-xs pt-1">
        {page > 1 ? (
          <Link href={link(page - 1, sort)} className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-medium hover:bg-surface-elevated transition">
            ← Sebelumnya
          </Link>
        ) : <span />}
        <span className="text-text-muted text-xs">Halaman {page}{hasMore ? " (Ada data berikutnya)" : " (Halaman terakhir)"}</span>
        {hasMore ? (
          <Link href={link(page + 1, sort)} className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-medium hover:bg-surface-elevated transition">
            Berikutnya →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
