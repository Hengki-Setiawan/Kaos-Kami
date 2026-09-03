import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  DollarSign,
  Package,
  Layers,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Calendar,
} from "lucide-react";

export const revalidate = 0; // Dynamic server component

export default async function AdminDashboardPage() {
  // Aggregate workshop statistics from Turso DB
  const [totalOrders, totalRevenue, pendingProduction, expressOrders, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { totalIdr: true },
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.productionTask.count({
      where: { stage: { in: ["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK"] } },
    }),
    prisma.order.count({
      where: { courierNotes: { contains: "EXPRESS" }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: true },
    }),
  ]);

  const revenueIdr = totalRevenue._sum.totalIdr || 0;

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            OVERVIEW WORKSHOP & METRIK
          </h1>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Monitoring produksi sablon DTF Makassar & status pesanan harian.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <Link
            href="/admin/production"
            className="py-2 px-3.5 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(230,81,0,0.3)]"
          >
            <Layers size={14} />
            <span>BUKA KANBAN SABLON</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Omset */}
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL OMSET</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-white block">
              Rp {revenueIdr.toLocaleString("id-ID")}
            </span>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp size={11} />
              <span>Termasuk Midtrans & COD</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Total Pesanan */}
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL PESANAN</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Package size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-white block">{totalOrders}</span>
            <span className="font-mono text-[10px] text-text-muted block mt-1">Semua status pesanan</span>
          </div>
        </div>

        {/* Metric 3: Antrean Sablon DTF Aktif */}
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">ANTREAN SABLON AKTIF</span>
            <div className="w-7 h-7 rounded-lg bg-brand-accent/15 text-brand-accent flex items-center justify-center">
              <Layers size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-brand-accent block">
              {pendingProduction} Tugas
            </span>
            <span className="font-mono text-[10px] text-text-muted block mt-1">
              Sedang diproses di meja cetak / press
            </span>
          </div>
        </div>

        {/* Metric 4: SLA Express Alerts */}
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">SLA EXPRESS 24 JAM</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-amber-400 block">
              {expressOrders} Pesanan
            </span>
            <span className="font-mono text-[10px] text-amber-400/80 block mt-1">
              Prioritas tinggi (deadline hari ini)
            </span>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
            PESANAN TERAKHIR MASUK
          </h2>
          <Link
            href="/admin/orders"
            className="font-mono text-xs text-brand-accent hover:underline flex items-center gap-1"
          >
            <span>LIHAT SEMUA PESANAN</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 font-mono text-xs">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center text-text-muted">
                    <Package size={14} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{order.orderNumber}</span>
                      {order.courierNotes?.includes("EXPRESS") && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          EXPRESS 24H
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {order.user?.name || "Pelanggan"} · {order.items.length} item · {order.deliveryMethod}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <span className="font-bold text-brand-accent">
                    Rp {order.totalIdr.toLocaleString("id-ID")}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-white/10 text-white bg-surface">
                    {order.status}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-text-muted text-xs">
              Belum ada pesanan masuk. Mulai kustomisasi sablon di 3D Studio untuk membuat pesanan pertama!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

