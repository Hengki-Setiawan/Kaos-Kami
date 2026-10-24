import { and, count, inArray, like, notInArray, or, sum } from "drizzle-orm";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Design, Order, User } from "@/lib/drizzle-schema";
import { CustomerTableClient } from "@/components/admin/CustomerTableClient";
import { Users, Lock } from "lucide-react";
import { isDevOrTest } from "@/lib/envMode";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim().replace(/[%_\\]/g, "").slice(0, 64);

  let myRole: string | null = null;
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (isDevOrTest() && myRole !== "CUSTOMER") {
    myRole = "SUPER_ADMIN";
  }

  if (myRole === "PRODUCTION_STAFF") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/production");
  }
  if (myRole === "COURIER") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/deliveries");
  }
  if (!myRole || !["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
    const { redirect } = await import("next/navigation");
    redirect("/?denied=admin");
  }

  const where = q
    ? or(like(User.name, `%${q}%`), like(User.phoneNumber, `%${q}%`), like(User.email, `%${q}%`))
    : undefined;

  const [{ n = 0 } = { n: 0 }] = where
    ? await db.select({ n: count() }).from(User).where(where)
    : await db.select({ n: count() }).from(User);
  const totalPages = Math.max(1, Math.ceil(Number(n) / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const users = await db.query.User.findMany({
    where: where as any,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: PER_PAGE,
    offset: (safePage - 1) * PER_PAGE,
    columns: { id: true, name: true, email: true, phoneNumber: true, role: true, emailVerified: true, createdAt: true },
  });

  const pageIds = users.map((u) => u.id);
  const [orderData, designCounts] =
    pageIds.length > 0
      ? await Promise.all([
          db
            .select({
              userId: Order.userId,
              n: count(),
              totalSpent: sum(Order.totalIdr),
            })
            .from(Order)
            .where(
              and(
                inArray(Order.userId, pageIds),
                notInArray(Order.status, ["CANCELLED", "REFUNDED"])
              )
            )
            .groupBy(Order.userId),
          db
            .select({ userId: Design.userId, n: count() })
            .from(Design)
            .where(inArray(Design.userId, pageIds))
            .groupBy(Design.userId),
        ])
      : [[], []];

  const orderMap = new Map(
    orderData.map((r) => [r.userId, { n: r.n, totalSpent: Number(r.totalSpent ?? 0) }])
  );
  const designMap = new Map(designCounts.map((r) => [r.userId, r.n]));
  const usersWithCounts = users.map((u: any) => {
    const ord = orderMap.get(u.id);
    return {
      ...u,
      _count: { orders: ord?.n || 0, designs: designMap.get(u.id) || 0 },
      totalSpentIdr: ord?.totalSpent || 0,
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <Users size={15} />
            <span>Manajemen Pengguna & Pelanggan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary uppercase">
            Database Pelanggan
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            {Number(n)} akun terdaftar • Sinkronisasi Turso DB Edge • Lacak Lifetime Value (LTV) dan Riwayat Belanja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated text-text-primary font-semibold text-xs transition"
          >
            Kembali ke Pusat Pesanan
          </Link>
        </div>
      </div>

      {/* INTERACTIVE TABLE & FILTER CLIENT */}
      <CustomerTableClient
        initialUsers={usersWithCounts}
        myRole={myRole || "ADMIN"}
        totalCount={Number(n)}
        currentPage={safePage}
        totalPages={totalPages}
        searchQuery={q}
      />

      {/* PRIVACY FOOTER */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-text-muted text-[11px]">
        <div className="flex items-center gap-1.5">
          <Lock size={12} />
          <span>Privasi identitas dan kontak pelanggan dilindungi sesuai standar PDP.</span>
        </div>
      </div>
    </div>
  );
}
