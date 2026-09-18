import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Order, User, Address } from "@/lib/drizzle-schema";
import { and, count, desc, ilike, or, eq, inArray } from "drizzle-orm";
import { Package, Search, ExternalLink, Download } from "lucide-react";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

// Mask WA di daftar (konsisten dengan /admin/customers + UU PDP).
function maskPhone(p?: string | null) {
  if (!p) return "-";
  return `${p.slice(0, 4)}****${p.slice(-2)}`;
}const STATUSES = [
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
] as const;

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim().slice(0, 40);
  const status = (sp.status || "").trim();

  const conds: any[] = [];
  if (q) {
    const [matchingUsers, matchingAddresses] = await Promise.all([
      db
        .select({ id: User.id })
        .from(User)
        .where(
          or(
            ilike(User.name, `%${q}%`),
            ilike(User.phoneNumber, `%${q}%`),
            ilike(User.email, `%${q}%`)
          )
        )
        .limit(50),
      db
        .select({ id: Address.id })
        .from(Address)
        .where(
          or(
            ilike(Address.recipientName, `%${q}%`),
            ilike(Address.phoneNumber, `%${q}%`),
            ilike(Address.fullAddress, `%${q}%`)
          )
        )
        .limit(50),
    ]);

    const userIds = matchingUsers.map((u) => u.id);
    const addressIds = matchingAddresses.map((a) => a.id);

    const orClauses: any[] = [
      ilike(Order.orderNumber, `%${q}%`),
      ilike(Order.trackingNumber, `%${q}%`),
    ];
    if (userIds.length > 0) orClauses.push(inArray(Order.userId, userIds));
    if (addressIds.length > 0) orClauses.push(inArray(Order.shippingAddressId, addressIds));

    conds.push(or(...orClauses));
  }
  if ((STATUSES as readonly string[]).includes(status)) conds.push(eq(Order.status, status as any));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const [{ n = 0 } = { n: 0 }] = await db.select({ n: count() }).from(Order).where(where as any);
  const totalPages = Math.max(1, Math.ceil(Number(n) / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const orders = await db.query.Order.findMany({
    where: where as any,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: PER_PAGE,
    offset: (safePage - 1) * PER_PAGE,
    with: { items: true, user: true, shippingAddress: true, payment: true },
  });

  const pageLink = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (status) s.set("status", status);
    s.set("page", String(p));
    return `/admin/orders?${s.toString()}`;
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary">
            SEMUA PESANAN MASUK
          </h1>
          <p className="text-text-muted mt-0.5">
            {Number(n)} pesanan · halaman {safePage}/{totalPages}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/admin/orders/export${status ? `?status=${encodeURIComponent(status)}` : ""}`}
            download
            className="py-2.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white text-emerald-400 font-bold transition-all flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>EKSPOR CSV LAPORAN</span>
          </a>
        </div>
      </div>

      {/* Search + filter (server-side, tanpa JS) */}
      <form method="get" className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari no. order / nama pemesan / no. WA / resi..."
            maxLength={40}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="px-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary focus:outline-none"
        >
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold"
        >
          CARI
        </button>
      </form>

      {/* Orders Table */}
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr className="border-b border-border-subtle text-[10px] text-text-muted uppercase tracking-wider bg-surface-elevated">
                <th className="p-4">NO. ORDER</th>
                <th className="p-4">TANGGAL</th>
                <th className="p-4">PELANGGAN</th>
                <th className="p-4">ITEM</th>
                <th className="p-4">KIRIM</th>
                <th className="p-4">TOTAL</th>
                <th className="p-4">BAYAR</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-brand-accent">
                    {order.orderNumber}
                    {order.courierNotes?.includes("EXPRESS") && (
                      <span className="block text-[9px] text-amber-700 dark:text-amber-400 font-bold">⚡ EXPRESS 24H</span>
                    )}
                  </td>
                  <td className="p-4 text-text-muted whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <span className="text-text-primary font-bold block">{order.user?.name || "Pelanggan"}</span>
                    <span className="text-[10px] text-text-muted">{maskPhone(order.user?.phoneNumber)}</span>
                  </td>
                  <td className="p-4 text-text-muted">{order.items.length}</td>
                  <td className="p-4 text-text-muted">{order.deliveryMethod}</td>
                  <td className="p-4 font-bold text-text-primary whitespace-nowrap">
                    Rp {order.totalIdr.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-text-muted">
                    {order.payment ? `${order.payment.method || "?"} · ${order.payment.status}` : "-"}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-border-subtle text-text-primary bg-surface whitespace-nowrap">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold hover:text-brand-accent transition-all inline-flex items-center gap-1"
                    >
                      <span>DETAIL</span>
                      <ExternalLink size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="p-12 text-center text-text-muted">
            {q || status ? "Tidak cocok dengan pencarian." : "Belum ada pesanan dalam basis data."}
          </div>
        )}

        {/* Paginasi */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-subtle">
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

      {orders.length === 0 && !q && !status && (
        <p className="text-center text-text-muted flex items-center justify-center gap-2">
          <Package size={14} /> Belum ada pesanan dalam basis data.
        </p>
      )}
    </div>
  );
}
