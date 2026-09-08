import { count } from "drizzle-orm";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Design, Order, User } from "@/lib/drizzle-schema";
import { and, desc, ilike, or } from "drizzle-orm";
import { CustomerRoleSelect } from "@/components/admin/CustomerRoleSelect";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

function maskPhone(p?: string | null) {
  if (!p) return "-";
  return `${p.slice(0, 4)}****${p.slice(-2)}`;
}

function maskEmail(e?: string | null) {
  if (!e) return "-";
  const [u, d] = e.split("@");
  return `${(u || "").slice(0, 2)}***@${d || "***"}`;
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim().slice(0, 40);

  // Role pemanggil untuk filter opsi SUPER_ADMIN (server tetap guard final).
  let myRole = "ADMIN";
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = (session?.user as any)?.role || "ADMIN";
  } catch {}

  const where = q
    ? or(ilike(User.name, `%${q}%`), ilike(User.phoneNumber, `%${q}%`), ilike(User.email, `%${q}%`))
    : undefined;

  const [{ n = 0 } = { n: 0 }] = await db.select({ n: count() }).from(User).where(where as any);
  const totalPages = Math.max(1, Math.ceil(Number(n) / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const users = await db.query.User.findMany({
    where: where as any,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: PER_PAGE,
    offset: (safePage - 1) * PER_PAGE,
  });
  const orderCounts = await db.select({ userId: Order.userId, n: count() }).from(Order).groupBy(Order.userId);
  const designCounts = await db.select({ userId: Design.userId, n: count() }).from(Design).groupBy(Design.userId);
  const orderMap = new Map(orderCounts.map((r) => [r.userId, r.n]));
  const designMap = new Map(designCounts.map((r) => [r.userId, r.n]));
  const usersWithCounts = users.map((u: any) => ({
    ...u,
    _count: { orders: orderMap.get(u.id) || 0, designs: designMap.get(u.id) || 0 },
  }));

  const pageLink = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    s.set("page", String(p));
    return `/admin/customers?${s.toString()}`;
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">CUSTOMER DATABASE</h1>
        <p className="text-text-muted">
          {Number(n)} akun (hal. {safePage}/{totalPages}) • kontak dimask — klik baris untuk detail • UU PDP: gunakan seperlunya
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama / WA / email…"
          maxLength={40}
          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
        />
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold">
          CARI
        </button>
      </form>

      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
        {usersWithCounts.map((u: any) => (
          <div key={u.id} className="p-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <span className="font-bold text-white block truncate">
                {u.name || "-"} <CustomerRoleSelect userId={u.id} role={u.role} myRole={myRole} />
              </span>
              {/* Mask PII di daftar (audit H16); full hanya di invoice/detail order. */}
              <span className="text-text-muted">
                {maskPhone(u.phoneNumber)} • {maskEmail(u.email)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-white block">{u._count.orders} orders • {u._count.designs} designs</span>
              <span className="text-text-muted text-[11px]">{new Date(u.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        ))}
        {usersWithCounts.length === 0 && (
          <div className="p-12 text-center text-text-muted">
            {q ? "Tidak cocok dengan pencarian." : "Belum ada customer"}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {safePage > 1 ? (
            <Link href={pageLink(safePage - 1)} className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white font-bold">
              ← SEBELUM
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-muted">
            {safePage} / {totalPages}
          </span>
          {safePage < totalPages ? (
            <Link href={pageLink(safePage + 1)} className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white font-bold">
              LANJUT →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
