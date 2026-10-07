import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq, inArray, like, ne, notInArray, sum, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order, ProductionTask, ProductVariant } from "@/lib/drizzle-schema";
import {
  DollarSign,
  Package,
  Layers,
  Clock,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  SlidersHorizontal,
  Truck,
  ShoppingBag,
} from "lucide-react";

export const revalidate = 0; // Dynamic server component

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
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
  const range = sp.range || "all";

  let dateFilter: Date | null = null;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    dateFilter = d;
  } else if (range === "7d") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Aggregate workshop statistics from Turso DB in consolidated parallel queries
  const [
    orderStatsRows,
    pendingProductionRows,
    recentOrders,
    lowStockVariants,
  ] = await Promise.all([
    db
      .select({
        totalOrders: count(),
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${Order.status} NOT IN ('PENDING_PAYMENT', 'CANCELLED', 'REFUNDED') ${
          dateFilter ? sql`AND ${Order.createdAt} >= ${dateFilter.toISOString()}` : sql``
        } THEN ${Order.totalIdr} ELSE 0 END), 0)`,
        expressOrders: sql<number>`COALESCE(SUM(CASE WHEN ${Order.courierNotes} LIKE '%EXPRESS%' AND ${Order.status} NOT IN ('COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END), 0)`,
        readyToShip: sql<number>`COALESCE(SUM(CASE WHEN ${Order.status} = 'READY_TO_SHIP' THEN 1 ELSE 0 END), 0)`,
        shipped: sql<number>`COALESCE(SUM(CASE WHEN ${Order.status} = 'SHIPPED' THEN 1 ELSE 0 END), 0)`,
        makassarActive: sql<number>`COALESCE(SUM(CASE WHEN ${Order.status} IN ('READY_TO_SHIP', 'SHIPPED') AND ${Order.deliveryMethod} = 'FREE_MAKASSAR' THEN 1 ELSE 0 END), 0)`,
      })
      .from(Order),
    db
      .select({ n: count() })
      .from(ProductionTask)
      .where(
        inArray(ProductionTask.stage, ["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK"])
      ),
    db.query.Order.findMany({
      limit: 6,
      orderBy: (t, { desc }) => desc(t.createdAt),
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        totalIdr: true,
        deliveryMethod: true,
        courierNotes: true,
        createdAt: true,
      },
      with: {
        items: {
          columns: { id: true },
        },
        user: {
          columns: { name: true },
        },
      },
    }),
    db.query.ProductVariant.findMany({
      where: (t, { lte: l, and: a, eq: e }) => a(l(t.stockQty, 5), e(t.isActive, true)),
      limit: 6,
      with: { category: true },
    }),
  ]);

  const orderStats = orderStatsRows[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    expressOrders: 0,
    readyToShip: 0,
    shipped: 0,
    makassarActive: 0,
  };

  const totalOrders = Number(orderStats.totalOrders || 0);
  const revenueIdr = Number(orderStats.totalRevenue || 0);
  const expressOrders = Number(orderStats.expressOrders || 0);
  const readyToShip = Number(orderStats.readyToShip || 0);
  const shipped = Number(orderStats.shipped || 0);
  const makassarActive = Number(orderStats.makassarActive || 0);
  const pendingProduction = Number(pendingProductionRows[0]?.n || 0);

  return (
    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Portal Operasional Workshop</span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Ringkasan Operasional
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Workshop Makassar • Real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/gang-sheet"
            className="py-2 px-3 rounded-lg bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary font-medium text-xs transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <Layers size={14} className="text-amber-500" />
            <span>Gang Sheet 100×58</span>
          </Link>
          <Link
            href="/admin/production"
            className="py-2 px-3.5 rounded-lg bg-brand-accent text-canvas font-medium text-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Layers size={14} />
            <span>Buka Kanban Sablon</span>
          </Link>
        </div>
      </div>

      {/* 3 PILAR OPERASIONAL STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PILAR 1: PRODUKSI */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5">
                <Layers size={14} />
                <span>Pilar Produksi Workshop</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium">
                DTF Sablon
              </span>
            </div>
            <div className="pt-1">
              <span className="font-sans font-bold text-xl sm:text-2xl text-text-primary tracking-tight block">
                {pendingProduction} Tugas Cetak
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {expressOrders > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{expressOrders} Pesanan SLA Express 24 Jam</span>
                  </span>
                ) : (
                  "Antrean sablon & heat press berjalan normal."
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
            <Link
              href="/admin/production"
              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium text-xs text-center hover:bg-amber-500/20 transition-all"
            >
              Buka Kanban
            </Link>
            <Link
              href="/admin/gang-sheet"
              className="py-1.5 px-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle text-text-muted hover:text-text-primary transition-all text-xs"
            >
              Gang Sheet
            </Link>
          </div>
        </div>

        {/* PILAR 2: PENGIRIMAN */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5">
                <Truck size={14} />
                <span>Pilar Pengiriman & Kurir</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium">
                Logistik
              </span>
            </div>
            <div className="pt-1">
              <span className="font-sans font-bold text-xl sm:text-2xl text-text-primary tracking-tight block">
                {readyToShip + shipped} Paket Antar
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {readyToShip} Siap Antar · {shipped} Dalam Perjalanan ({makassarActive} Kurir Makassar)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
            <Link
              href="/admin/deliveries"
              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium text-xs text-center hover:bg-blue-500/20 transition-all"
            >
              Buka Hub Pengiriman
            </Link>
            <Link
              href="/admin/shipping"
              className="py-1.5 px-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle text-text-muted hover:text-text-primary transition-all text-xs"
            >
              Zona Ongkir
            </Link>
          </div>
        </div>

        {/* PILAR 3: E-COMMERCE */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-brand-accent font-semibold text-xs">
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={14} />
                <span>Pilar E-Commerce & Toko</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-medium">
                Toko & Bisnis
              </span>
            </div>
            <div className="pt-1">
              <span
                className="font-sans font-bold text-xl sm:text-2xl text-text-primary tracking-tight block truncate"
                title={`Rp ${revenueIdr.toLocaleString("id-ID")}`}
              >
                Rp {revenueIdr.toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {totalOrders} Total Pesanan Masuk · {lowStockVariants.length} Varian Menipis
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
            <Link
              href="/admin/orders"
              className="flex-1 py-1.5 px-3 rounded-lg bg-brand-accent/10 text-brand-accent font-medium text-xs text-center hover:bg-brand-accent/20 transition-all"
            >
              Kelola Pesanan
            </Link>
            <Link
              href="/admin/catalog"
              className="py-1.5 px-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle text-text-muted hover:text-text-primary transition-all text-xs"
            >
              Katalog Stok
            </Link>
          </div>
        </div>
      </div>

      {/* Date Range Selector for Revenue */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className="text-text-muted text-xs font-medium flex items-center gap-1.5">
          <SlidersHorizontal size={13} />
          <span>Filter Periode Omset:</span>
        </span>
        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: "Semua Waktu" },
            { id: "today", label: "Hari Ini" },
            { id: "7d", label: "7 Hari Terakhir" },
            { id: "30d", label: "Bulan Ini (30H)" },
          ].map((r) => (
            <Link
              key={r.id}
              href={`/admin?range=${r.id}`}
              className={`px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
                range === r.id
                  ? "bg-brand-accent text-canvas border-brand-accent"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Omset */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Omset</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <span
              className="font-sans font-bold text-xl sm:text-2xl text-text-primary tracking-tight block truncate"
              title={`Rp ${revenueIdr.toLocaleString("id-ID")}`}
            >
              Rp {revenueIdr.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp size={11} />
              <span>QRIS iPaymu lunas-dulu</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Total Pesanan */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Pesanan</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package size={15} />
            </div>
          </div>
          <div>
            <span className="font-sans font-bold text-xl sm:text-2xl text-text-primary tracking-tight block">
              {totalOrders}
            </span>
            <span className="text-[11px] text-text-muted block mt-1">Semua status pesanan</span>
          </div>
        </div>

        {/* Metric 3: Antrean Sablon DTF Aktif */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Antrean Sablon Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center">
              <Layers size={15} />
            </div>
          </div>
          <div>
            <span className="font-sans font-bold text-xl sm:text-2xl text-brand-accent tracking-tight block">
              {pendingProduction} Tugas
            </span>
            <span className="text-[11px] text-text-muted block mt-1">
              Sedang diproses meja cetak / press
            </span>
          </div>
        </div>

        {/* Metric 4: SLA Express Alerts */}
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">SLA Express 24 Jam</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div>
            <span className="font-sans font-bold text-xl sm:text-2xl text-amber-600 dark:text-amber-400 tracking-tight block">
              {expressOrders} Pesanan
            </span>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block mt-1">
              Prioritas tinggi (deadline hari ini)
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      {lowStockVariants.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={15} />
              <span className="font-semibold text-xs">
                Peringatan Stok Menipis (Bahan Baku &le; 5 pcs)
              </span>
            </div>
            <Link
              href="/admin/catalog"
              className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Tambah Stok di Katalog</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockVariants.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-lg bg-surface border border-amber-500/20 flex justify-between items-center shadow-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-medium text-text-primary block truncate text-xs">
                    {v.name}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {v.category?.name || "Apparel"} · {v.size} · {v.colorName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-semibold text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  {v.stockQty} pcs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pesanan Terakhir Masuk
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-medium"
          >
            <span>Lihat Semua Pesanan</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle text-xs">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
                    <Package size={14} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-text-primary font-mono text-[11px]">{order.orderNumber}</span>
                      {order.courierNotes?.includes("EXPRESS") && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          Express 24H
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {order.user?.name || "Pelanggan"} · {order.items.length} item · {order.deliveryMethod}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <span className="font-semibold text-brand-accent">
                    Rp {order.totalIdr.toLocaleString("id-ID")}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase border border-border-subtle text-text-muted bg-black/[0.02] dark:bg-white/[0.02]">
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

export const dynamic = "force-dynamic";
