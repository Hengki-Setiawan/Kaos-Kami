import { count, inArray, like, or } from "drizzle-orm";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Design, Order, User } from "@/lib/drizzle-schema";
import { CustomerRoleSelect } from "@/components/admin/CustomerRoleSelect";
import { maskPhone as maskPhoneLib, maskEmail as maskEmailLib } from "@/lib/mask"; // SSOT PII (S-045)

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

function maskPhone(p?: string | null) {
  if (!p) return "-";
  return maskPhoneLib(p) || "-";
}

function maskEmail(e?: string | null) {
  if (!e) return "-";
  return maskEmailLib(e) || "-";
}

function formatDate(v: unknown) {
  if (!v) return "—";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  // Sanitasi cermin API: buang wildcard LIKE (%_) + backslash, batasi 64 char.
  const q = (sp.q || "").trim().replace(/[%_\\]/g, "").slice(0, 64);

  // Role pemanggil untuk filter opsi SUPER_ADMIN (server tetap guard final).
  // Fallback jujur: null bila sesi tak terbaca (bukan klaim "ADMIN").
  let myRole: string | null = null;
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
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

  // Selaras API: `like` (libSQL/SQLite — `ilike` hanya Postgres, rawan gagal).
  const where = q
    ? or(like(User.name, `%${q}%`), like(User.phoneNumber, `%${q}%`), like(User.email, `%${q}%`))
    : undefined;

  const [{ n = 0 } = { n: 0 }] = await db.select({ n: count() }).from(User).where(where as any);
  const totalPages = Math.max(1, Math.ceil(Number(n) / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const users = await db.query.User.findMany({
    where: where as any,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: PER_PAGE,
    offset: (safePage - 1) * PER_PAGE,
    // Eksplisit tanpa passwordHash — jangan pernah tarik hash ke halaman daftar.
    columns: { id: true, name: true, email: true, phoneNumber: true, role: true, emailVerified: true, createdAt: true },
  });
  // Agregasi dibatasi ke userId satu halaman (bukan seluruh tabel).
  const pageIds = users.map((u) => u.id);
  const [orderCounts, designCounts] =
    pageIds.length > 0
      ? await Promise.all([
          db.select({ userId: Order.userId, n: count() }).from(Order).where(inArray(Order.userId, pageIds)).groupBy(Order.userId),
          db.select({ userId: Design.userId, n: count() }).from(Design).where(inArray(Design.userId, pageIds)).groupBy(Design.userId),
        ])
      : [[], []];
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
      <div className="pb-4 border-b border-border-subtle">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-text-primary">CUSTOMER DATABASE</h1>
        <p className="text-text-muted">
          {Number(n)} akun (hal. {safePage}/{totalPages}) • kontak dimask — klik baris untuk detail • UU PDP: gunakan seperlunya
          {myRole ? "" : " • sesi tak terbaca (mode baca, opsi role dibatasi)"}
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama / WA / email…"
          maxLength={64}
          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
        />
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold">
          CARI
        </button>
      </form>

      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle">
        {usersWithCounts.map((u: any) => (
          <div key={u.id} className="p-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <span className="font-bold text-text-primary block truncate">
                {u.name || "-"} <CustomerRoleSelect userId={u.id} role={u.role} myRole={myRole ?? ""} />
              </span>
              {/* Mask PII di daftar (audit H16); full hanya di invoice/detail order. */}
              <span className="text-text-muted">
                {maskPhone(u.phoneNumber)} • {maskEmail(u.email)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-text-primary block">{u._count.orders} orders • {u._count.designs} designs</span>
              <span className="text-text-muted text-[11px]">{formatDate(u.createdAt)}</span>
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
            <Link href={pageLink(safePage - 1)} className="px-4 py-2 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold">
              ← SEBELUM
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-muted">
            {safePage} / {totalPages}
          </span>
          {safePage < totalPages ? (
            <Link href={pageLink(safePage + 1)} className="px-4 py-2 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold">
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
