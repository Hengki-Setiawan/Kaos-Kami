import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq, inArray, like, ne, notInArray, sum, gte, lte } from "drizzle-orm";
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

  const revenueConditions = [
    notInArray(Order.status, ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"]),
  ];
  if (dateFilter) {
    revenueConditions.push(gte(Order.createdAt, dateFilter));
  }

  // Aggregate workshop statistics from Turso DB
  const [
    totalOrdersRows,
    totalRevenueRows,
    pendingProductionRows,
    expressOrdersRows,
    readyToShipRows,
    shippedRows,
    makassarReadyRows,
    recentOrders,
    lowStockVariants,
  ] = await Promise.all([
    db.select({ n: count() }).from(Order),
    db.select({ total: sum(Order.totalIdr) }).from(Order).where(and(...revenueConditions)),
    db
      .select({ n: count() })
      .from(ProductionTask)
      .where(
        inArray(ProductionTask.stage, ["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK"])
      ),
    db
      .select({ n: count() })
      .from(Order)
      .where(
        and(like(Order.courierNotes, "%EXPRESS%"), notInArray(Order.status, ["COMPLETED", "CANCELLED"]))
      ),
    db.select({ n: count() }).from(Order).where(eq(Order.status, "READY_TO_SHIP")),
    db.select({ n: count() }).from(Order).where(eq(Order.status, "SHIPPED")),
    db
      .select({ n: count() })
      .from(Order)
      .where(
        and(
          inArray(Order.status, ["READY_TO_SHIP", "SHIPPED"]),
          eq(Order.deliveryMethod, "FREE_MAKASSAR")
        )
      ),
    db.query.Order.findMany({
      limit: 6,
      orderBy: (t, { desc }) => desc(t.createdAt),
      with: { items: true, user: true },
    }),
    db.query.ProductVariant.findMany({
      where: (t, { lte: l, and: a, eq: e }) => a(l(t.stockQty, 5), e(t.isActive, true)),
      limit: 6,
      with: { category: true },
    }),
  ]);
  const totalOrders = totalOrdersRows[0]?.n || 0;
  const pendingProduction = pendingProductionRows[0]?.n || 0;
  const expressOrders = expressOrdersRows[0]?.n || 0;
  const readyToShip = readyToShipRows[0]?.n || 0;
  const shipped = shippedRows[0]?.n || 0;
  const makassarActive = makassarReadyRows[0]?.n || 0;

  const revenueIdr = Number(totalRevenueRows[0]?.total || 0);

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent font-mono text-[11px] font-bold uppercase tracking-widest mb-1">
            <span>PORTAL INTERNAL · KAOS KAMI MAKASSAR</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary">
            DASHBOARD EKSEKUTIF 3 PILAR
          </h1>
          <p className="text-text-muted mt-0.5">
            Kendali terpadu Produksi Sablon DTF, Pengiriman & Kurir Makassar, dan Manajemen E-Commerce.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/gang-sheet"
            className="py-2 px-3.5 rounded-xl bg-amber-400 text-black font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
          >
            <Layers size={14} />
            <span>GANG SHEET 100×58</span>
          </Link>
          <Link
            href="/admin/production"
            className="py-2 px-3.5 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(230,81,0,0.3)]"
          >
            <Layers size={14} />
            <span>BUKA KANBAN SABLON</span>
          </Link>
        </div>
      </div>

      {/* 3 PILAR OPERASIONAL STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PILAR 1: PRODUKSI */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-amber-500 font-bold uppercase text-[11px]">
              <span className="flex items-center gap-1.5">
                <Layers size={15} />
                <span>PILAR PRODUKSI WORKSHOP</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px]">
                DTF SABLON
              </span>
            </div>
            <div className="pt-1">
              <span className="font-display font-black text-2xl text-text-primary block">
                {pendingProduction} Tugas Cetak
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {expressOrders > 0 ? (
                  <span className="text-amber-500 font-bold">⚠️ {expressOrders} Pesanan SLA Express 24 Jam</span>
                ) : (
                  "Antrean sablon & heat press berjalan normal."
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
            <Link
              href="/admin/production"
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold text-center hover:bg-amber-500/25 transition-all"
            >
              Buka Kanban
            </Link>
            <Link
              href="/admin/gang-sheet"
              className="py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            >
              Gang Sheet
            </Link>
          </div>
        </div>

        {/* PILAR 2: PENGIRIMAN */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-blue-500 font-bold uppercase text-[11px]">
              <span className="flex items-center gap-1.5">
                <Truck size={15} />
                <span>PILAR PENGIRIMAN & KURIR</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-[10px]">
                LOGISTIK
              </span>
            </div>
            <div className="pt-1">
              <span className="font-display font-black text-2xl text-text-primary block">
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
              className="flex-1 py-2 px-3 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold text-center hover:bg-blue-500/25 transition-all"
            >
              Buka Hub Pengiriman
            </Link>
            <Link
              href="/admin/shipping"
              className="py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            >
              Zona Ongkir
            </Link>
          </div>
        </div>

        {/* PILAR 3: E-COMMERCE */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-brand-accent font-bold uppercase text-[11px]">
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={15} />
                <span>PILAR E-COMMERCE & ADMIN</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-brand-accent/15 border border-brand-accent/30 text-[10px]">
                TOKO & BISNIS
              </span>
            </div>
            <div className="pt-1">
              <span className="font-display font-black text-2xl text-text-primary block">
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
              className="flex-1 py-2 px-3 rounded-xl bg-brand-accent/15 text-brand-accent font-bold text-center hover:bg-brand-accent/25 transition-all"
            >
              Kelola Pesanan
            </Link>
            <Link
              href="/admin/catalog"
              className="py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            >
              Katalog Stok
            </Link>
          </div>
        </div>
      </div>

      {/* Date Range Selector for Revenue */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className="text-text-muted uppercase text-[11px] font-bold flex items-center gap-1.5">
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
              className={`px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold ${
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
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL OMSET</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-text-primary block">
              Rp {revenueIdr.toLocaleString("id-ID")}
            </span>
            <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp size={11} />
              <span>QRIS Duitku lunas-dulu</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Total Pesanan */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL PESANAN</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <Package size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-text-primary block">{totalOrders}</span>
            <span className="font-mono text-[10px] text-text-muted block mt-1">Semua status pesanan</span>
          </div>
        </div>

        {/* Metric 3: Antrean Sablon DTF Aktif */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
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
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider">SLA EXPRESS 24 JAM</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div>
            <span className="font-display font-black text-2xl text-amber-700 dark:text-amber-400 block">
              {expressOrders} Pesanan
            </span>
            <span className="font-mono text-[10px] text-amber-700/80 dark:text-amber-400/80 block mt-1">
              Prioritas tinggi (deadline hari ini)
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      {lowStockVariants.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">
                PERINGATAN STOK MENIPIS (BAHAN BAKU &le; 5 PCS)
              </span>
            </div>
            <Link
              href="/admin/catalog"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>TAMBAH STOK DI KATALOG</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockVariants.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-xl bg-surface/80 border border-amber-500/20 flex justify-between items-center"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-text-primary block truncate">
                    {v.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {v.category?.name || "Apparel"} · {v.size} · {v.colorName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 shrink-0">
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

        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle font-mono text-xs">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted">
                    <Package size={14} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-text-primary">{order.orderNumber}</span>
                      {order.courierNotes?.includes("EXPRESS") && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
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
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-border-subtle text-text-primary bg-surface">
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

