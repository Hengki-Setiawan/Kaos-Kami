import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, desc, or, eq, inArray, gte, lt, like, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order, OrderItem, User, Address } from "@/lib/drizzle-schema";
import { Package, Search, Download, ShoppingBag, Layers, RefreshCw } from "lucide-react";
import { AdminOrdersManager, type OrderChannel } from "@/components/admin/AdminOrdersManager";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

// Escape karakter khusus LIKE (% _ \) — tanpa ini input pencarian menjadi wildcard.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// LIKE case-insensitive + ESCAPE eksplisit.
function ciLike(column: SQLWrapper, raw: string) {
  return sql`lower(${column}) like lower(${"%" + escapeLike(raw) + "%"}) escape '\\'`;
}

const STATUSES = [
  "DESIGN_REVIEW",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "REJECTED",
] as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    channel?: string;
    filter?: string;
    overdue?: string;
  }>;
}) {
  // Guard role: PRODUCTION_STAFF -> /admin/production, COURIER -> /admin/deliveries
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const userRole = ((session?.user as any)?.role || "ADMIN").toUpperCase();
    if (userRole === "PRODUCTION_STAFF") {
      redirect("/admin/production");
    }
    if (userRole === "COURIER") {
      redirect("/admin/deliveries");
    }
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") throw err;
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim().slice(0, 40);
  const status = (sp.status || "").trim();
  const rawChannel = (sp.channel || "all").toLowerCase();
  const channel: OrderChannel =
    rawChannel === "studio" || rawChannel === "ecommerce" ? rawChannel : "all";
  const filter = (sp.filter || "").trim();
  const overdue = (sp.overdue || "").trim();

  const conds: any[] = [];

  // Filter Jalur (Studio vs E-Commerce)
  if (channel === "studio") {
    conds.push(
      sql`${Order.id} IN (SELECT ${OrderItem.orderId} FROM ${OrderItem} WHERE ${OrderItem.designId} IS NOT NULL)`
    );
  } else if (channel === "ecommerce") {
    conds.push(
      sql`${Order.id} NOT IN (SELECT ${OrderItem.orderId} FROM ${OrderItem} WHERE ${OrderItem.designId} IS NOT NULL)`
    );
  }

  // Filter Pencarian Teks
  if (q) {
    const [matchingUsers, matchingAddresses] = await Promise.all([
      db
        .select({ id: User.id })
        .from(User)
        .where(
          or(
            ciLike(User.name, q),
            ciLike(User.phoneNumber, q),
            ciLike(User.email, q)
          )
        )
        .limit(50),
      db
        .select({ id: Address.id })
        .from(Address)
        .where(
          or(
            ciLike(Address.recipientName, q),
            ciLike(Address.phoneNumber, q),
            ciLike(Address.fullAddress, q)
          )
        )
        .limit(50),
    ]);

    const userIds = matchingUsers.map((u) => u.id);
    const addressIds = matchingAddresses.map((a) => a.id);

    const orClauses: any[] = [
      ciLike(Order.orderNumber, q),
      ciLike(Order.trackingNumber, q),
    ];
    if (userIds.length > 0) orClauses.push(inArray(Order.userId, userIds));
    if (addressIds.length > 0) orClauses.push(inArray(Order.shippingAddressId, addressIds));

    conds.push(or(...orClauses));
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    conds.push(eq(Order.status, status as any));
  }
  if (filter === "recent") {
    conds.push(gte(Order.createdAt, new Date(Date.now() - 3600 * 1000)));
  }
  if (filter === "express") {
    conds.push(like(Order.courierNotes, "%EXPRESS%"));
  }
  if (overdue === "true") {
    conds.push(lt(Order.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));
  }

  const where = conds.length > 0 ? and(...conds) : undefined;

  // Query Data & Perhitungan Jumlah
  const [
    [{ n = 0 } = { n: 0 }],
    studioCountRow,
    ecommerceCountRow,
  ] = await Promise.all([
    db.select({ n: count() }).from(Order).where(where as any),
    db
      .select({ n: count() })
      .from(Order)
      .where(
        sql`${Order.id} IN (SELECT ${OrderItem.orderId} FROM ${OrderItem} WHERE ${OrderItem.designId} IS NOT NULL)`
      ),
    db
      .select({ n: count() })
      .from(Order)
      .where(
        sql`${Order.id} NOT IN (SELECT ${OrderItem.orderId} FROM ${OrderItem} WHERE ${OrderItem.designId} IS NOT NULL)`
      ),
  ]);

  const totalCount = Number(n);
  const studioCount = Number(studioCountRow[0]?.n || 0);
  const ecommerceCount = Number(ecommerceCountRow[0]?.n || 0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const orders = await db.query.Order.findMany({
    where: where as any,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: PER_PAGE,
    offset: (safePage - 1) * PER_PAGE,
    with: {
      items: {
        with: {
          design: true,
        },
      },
      user: true,
      shippingAddress: true,
      payment: true,
    },
  });

  const pageLink = (p: number) => {
    const s = new URLSearchParams();
    if (channel && channel !== "all") s.set("channel", channel);
    if (q) s.set("q", q);
    if (status) s.set("status", status);
    if (filter) s.set("filter", filter);
    if (overdue) s.set("overdue", overdue);
    s.set("page", String(p));
    return `/admin?${s.toString()}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <ShoppingBag size={15} />
            <span>Pusat Manajemen Pesanan Masuk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary uppercase">
            Pusat Pesanan Toko
          </h1>
          <p className="text-text-muted text-xs mt-1">
            Kelola pesanan kustom sablon 3D Studio & pesanan produk jadi katalog e-commerce Kota Makassar secara terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/orders/export?${(() => {
              const s = new URLSearchParams();
              if (status) s.set("status", status);
              if (q) s.set("q", q);
              return s.toString();
            })()}`}
            download
            className="py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Download size={14} />
            <span>EKSPOR CSV</span>
          </a>
        </div>
      </div>

      {/* Form Pencarian Cepat */}
      <form method="get" className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nomor order (KK-2026...), nama pemesan, no. WhatsApp asli, nomor resi..."
            maxLength={40}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent text-xs"
          />
        </div>
        {status && <input type="hidden" name="status" value={status} />}
        {channel !== "all" && <input type="hidden" name="channel" value={channel} />}
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          CARI
        </button>
      </form>

      {/* Interactive Orders Manager (Top Channel Switcher + Dynamic Status Sub-Tabs + Table + Modal) */}
      <AdminOrdersManager
        orders={orders as any}
        totalCount={totalCount}
        studioCount={studioCount}
        ecommerceCount={ecommerceCount}
        currentPage={safePage}
        totalPages={totalPages}
        currentChannel={channel}
        currentStatus={status}
        currentQuery={q}
        baseUrl="/admin"
      />

      {/* Paginasi Bawah */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-subtle shadow-xs">
          {safePage > 1 ? (
            <Link
              href={pageLink(safePage - 1)}
              className="px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs transition-colors"
            >
              &larr; SEBELUMNYA
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-muted text-xs font-mono">
            Halaman {safePage} / {totalPages} ({totalCount} Pesanan)
          </span>
          {safePage < totalPages ? (
            <Link
              href={pageLink(safePage + 1)}
              className="px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs transition-colors"
            >
              SELANJUTNYA &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
