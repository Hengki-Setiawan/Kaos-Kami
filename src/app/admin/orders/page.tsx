import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Package, Search, Filter, ExternalLink, Clock } from "lucide-react";

export const revalidate = 0;

export default async function AdminOrdersListPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      user: true,
      shippingAddress: true,
      payment: true,
    },
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            SEMUA PESANAN MASUK
          </h1>
          <p className="text-text-muted mt-0.5">
            Daftar lengkap pesanan sablon DTF, status pembayaran Midtrans & status pengiriman.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-text-muted uppercase tracking-wider bg-surface/50">
                <th className="p-4">NO. ORDER</th>
                <th className="p-4">TANGGAL</th>
                <th className="p-4">PELANGGAN</th>
                <th className="p-4">TOTAL ITEM</th>
                <th className="p-4">PENGIRIMAN</th>
                <th className="p-4">TOTAL (IDR)</th>
                <th className="p-4">STATUS ORDER</th>
                <th className="p-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-brand-accent">
                    {order.orderNumber}
                    {order.courierNotes?.includes("EXPRESS") && (
                      <span className="block text-[9px] text-amber-400 font-bold">⚡ EXPRESS 24H</span>
                    )}
                  </td>
                  <td className="p-4 text-text-muted">
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="p-4">
                    <span className="text-white font-bold block">{order.user.name || "Pelanggan"}</span>
                    <span className="text-[10px] text-text-muted">{order.user.phoneNumber || "-"}</span>
                  </td>
                  <td className="p-4 text-text-muted">{order.items.length} item</td>
                  <td className="p-4 text-text-muted">{order.deliveryMethod}</td>
                  <td className="p-4 font-bold text-white">
                    Rp {order.totalIdr.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-white/10 text-white bg-surface">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-brand-accent text-white font-bold hover:text-brand-accent transition-all inline-flex items-center gap-1"
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
            Belum ada pesanan dalam basis data.
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

