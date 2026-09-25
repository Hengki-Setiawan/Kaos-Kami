import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CouponAdminPanel, CouponRowActions } from "@/components/admin/CouponAdminPanel";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const SORTS = ["code_desc", "code_asc", "used_desc", "used_asc"] as const;
type Sort = (typeof SORTS)[number];

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
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

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "code_desc";

  const coupons = await db.query.Coupon.findMany({
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

  const link = (p: number, s: Sort) => `/admin/coupons?page=${p}&sort=${s}`;

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-text-primary">VOUCHER & COUPON</h1>
          <p className="text-text-muted">Kelola kode diskon grosir komunitas/event • hal. {page}{hasMore ? "+" : ""} • sortir: {sort}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold">{activeCount} kode aktif / {rows.length} tampil</span>
        </div>
      </div>
      <div className="flex gap-2 text-[11px]">
        {SORTS.map((s) => (
          <Link key={s} href={link(1, s)} className={`px-2.5 py-1 rounded-lg border font-bold ${s === sort ? "bg-brand-accent/15 border-brand-accent/40 text-brand-accent" : "bg-surface border-border-subtle text-text-muted"}`}>
            {s}
          </Link>
        ))}
      </div>
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle">
        {rows.length? rows.map((c:any)=>(
          <div key={c.id} className={`p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${c.isActive ? "" : "opacity-50"}`}>
            <div>
              <span className="font-bold text-brand-accent">{c.code} ({c.discountType} {c.discountValue}{c.discountType==="PERCENT"?"%":""})</span>
              <span className="text-text-muted block text-[11px]">
                min Rp {(c.minSpendIdr ?? 0).toLocaleString("id-ID")} • dipakai {c.usedCount ?? 0}/{c.maxUses||"∞"} • {c.isActive?"AKTIF":"NONAKTIF"}
                {c.expiresAt ? ` • s/d ${new Date(c.expiresAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}` : " • tanpa kedaluwarsa"}
              </span>
            </div>
            <CouponRowActions id={c.id} isActive={!!c.isActive} usedCount={c.usedCount ?? 0} maxUses={c.maxUses ?? null} expiresAt={c.expiresAt ?? null} />
          </div>
        )): <div className="p-12 text-center text-text-muted">Belum ada voucher — buat via form di bawah.</div>}
      </div>
      <div className="flex items-center justify-between">
        {page > 1 ? (
          <Link href={link(page - 1, sort)} className="px-4 py-2 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold">← SEBELUM</Link>
        ) : <span />}
        <span className="text-text-muted">hal. {page}{hasMore ? " → masih ada" : " (terakhir)"}</span>
        {hasMore ? (
          <Link href={link(page + 1, sort)} className="px-4 py-2 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold">LANJUT →</Link>
        ) : <span />}
      </div>
      <CouponAdminPanel />
    </div>
  );
}
