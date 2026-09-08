import { db } from "@/lib/db";
import { CouponAdminPanel, CouponRowActions } from "@/components/admin/CouponAdminPanel";
export const dynamic = "force-dynamic";
export default async function AdminCouponsPage() {
  const coupons = await db.query.Coupon.findMany();
  const activeCount = coupons.filter((c: any) => c.isActive).length;
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5 flex justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">VOUCHER & COUPON</h1>
          <p className="text-text-muted">Kelola kode diskon grosir komunitas/event</p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold">{activeCount} kode aktif / {coupons.length} total</div>
      </div>
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
        {coupons.length? coupons.map((c:any)=>(
          <div key={c.id} className={`p-4 flex justify-between items-center gap-3 ${c.isActive ? "" : "opacity-50"}`}>
            <div>
              <span className="font-bold text-brand-accent">{c.code} ({c.discountType} {c.discountValue}{c.discountType==="PERCENT"?"%":""})</span>
              <span className="text-text-muted block text-[11px]">
                min Rp {(c.minSpendIdr ?? 0).toLocaleString("id-ID")} • {c.usedCount ?? 0}/{c.maxUses||"∞"} • {c.isActive?"AKTIF":"NONAKTIF"}
                {c.expiresAt ? ` • s/d ${new Date(c.expiresAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}` : " • tanpa kedaluwarsa"}
              </span>
            </div>
            <CouponRowActions id={c.id} isActive={!!c.isActive} />
          </div>
        )): <div className="p-12 text-center text-text-muted">Belum ada voucher — buat via form di bawah.</div>}
      </div>
      <CouponAdminPanel />
    </div>
  );
}
