import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { orders: true, designs: true } } as any } });
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">CUSTOMER DATABASE</h1>
        <p className="text-text-muted">PII lookup • total {users.length} akun • gunakan dengan UU PDP compliance</p>
      </div>
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
        {users.map((u: any) => (
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
        {users.length===0 && <div className="p-12 text-center text-text-muted">Belum ada customer</div>}
      </div>
    </div>
  );
}
