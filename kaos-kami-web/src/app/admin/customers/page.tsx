import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { Design, Order } from "@/lib/drizzle-schema";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const users = await db.query.User.findMany({ orderBy: (t, { desc }) => desc(t.createdAt), limit: 50 });
  const orderCounts = await db.select({ userId: Order.userId, n: count() }).from(Order).groupBy(Order.userId);
  const designCounts = await db.select({ userId: Design.userId, n: count() }).from(Design).groupBy(Design.userId);
  const orderMap = new Map(orderCounts.map((r) => [r.userId, r.n]));
  const designMap = new Map(designCounts.map((r) => [r.userId, r.n]));
  const usersWithCounts = users.map((u: any) => ({
    ...u,
    _count: { orders: orderMap.get(u.id) || 0, designs: designMap.get(u.id) || 0 },
  }));
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">CUSTOMER DATABASE</h1>
        <p className="text-text-muted">PII lookup • total {users.length} akun • gunakan dengan UU PDP compliance</p>
      </div>
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
        {usersWithCounts.map((u: any) => (
          <div key={u.id} className="p-4 flex justify-between items-center">
            <div>
              <span className="font-bold text-white block">{u.name || "-"} ({u.role})</span>
              <span className="text-text-muted">{u.phoneNumber || "-"} • {u.email || "-"}</span>
            </div>
            <div className="text-right">
              <span className="text-white block">{u._count.orders} orders • {u._count.designs} designs</span>
              <span className="text-text-muted text-[11px]">{new Date(u.createdAt).toLocaleDateString("id-ID")}</span>
            </div>
          </div>
        ))}
        {usersWithCounts.length===0 && <div className="p-12 text-center text-text-muted">Belum ada customer</div>}
      </div>
    </div>
  );
}
