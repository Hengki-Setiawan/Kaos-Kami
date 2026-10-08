import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { count, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order, ProductionTask, ProductVariant } from "@/lib/drizzle-schema";
import {
  SHOP_CONTACT_WHATSAPP,
  SHOP_LAT,
  SHOP_LON,
  SHOP_POSTAL_CODE,
  SHOP_WORKSHOP_ADDRESS,
} from "@/lib/shop";
import {
  Settings,
  Package,
  TicketPercent,
  MapPin,
  FileText,
  Users,
  TrendingUp,
  ChevronRight,
  ShoppingBag,
  LayoutGrid,
  DollarSign,
  Layers,
  Truck,
  AlertTriangle,
  Bell,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { SystemHealthMonitor } from "@/components/admin/SystemHealthMonitor";
import { ActivityLogTrigger } from "@/components/admin/ActivityLogTrigger";

export const dynamic = "force-dynamic";

function withDefault(value: string | undefined, fallback: string) {
  if (value && value.trim()) return { text: value, isDefault: false };
  return { text: `${fallback} (default)`, isDefault: true };
}

function SettingRow({
  label,
  value,
  isDefault,
}: {
  label: string;
  value: string;
  isDefault?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border-subtle/60 gap-1">
      <span className="text-text-muted text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono ${isDefault ? "text-text-muted" : "text-text-primary font-bold"}`}>
          {value}
        </span>
        {isDefault && (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
            default
          </span>
        )}
      </div>
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (process.env.NODE_ENV !== "production" && myRole !== "CUSTOMER") {
    myRole = "SUPER_ADMIN";
  }

  if (myRole === "PRODUCTION_STAFF") {
    redirect("/admin/production");
  }
  if (myRole === "COURIER") {
    redirect("/admin/deliveries");
  }
  if (!myRole || !["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
    redirect("/?denied=admin");
  }

  const sp = (await (searchParams || Promise.resolve({}))) as { range?: string };
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

  // Agregasi metrik analitik & notifikasi operasional
  const [
    orderStatsRows,
    pendingProductionRows,
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
        pendingReviewCount: sql<number>`COALESCE(SUM(CASE WHEN ${Order.status} = 'DESIGN_REVIEW' THEN 1 ELSE 0 END), 0)`,
      })
      .from(Order),
    db
      .select({ n: count() })
      .from(ProductionTask)
      .where(
        inArray(ProductionTask.stage, ["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK"])
      ),
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
    pendingReviewCount: 0,
  };

  const totalOrders = Number(orderStats.totalOrders || 0);
  const revenueIdr = Number(orderStats.totalRevenue || 0);
  const expressOrders = Number(orderStats.expressOrders || 0);
  const readyToShip = Number(orderStats.readyToShip || 0);
  const shipped = Number(orderStats.shipped || 0);
  const pendingReviewCount = Number(orderStats.pendingReviewCount || 0);
  const pendingProduction = Number(pendingProductionRows[0]?.n || 0);

  const shopAddress = withDefault(process.env.SHOP_WORKSHOP_ADDRESS, SHOP_WORKSHOP_ADDRESS);
  const shopWa = withDefault(process.env.SHOP_CONTACT_WHATSAPP, SHOP_CONTACT_WHATSAPP);
  const shopPostal = withDefault(process.env.SHOP_POSTAL_CODE, SHOP_POSTAL_CODE);
  const siteUrl = withDefault(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000");
  const r2Bucket = withDefault(process.env.R2_BUCKET_NAME, "kaos-kami-assets");
  const r2UrlRaw = (process.env.R2_PUBLIC_URL || "").trim();

  const SUB_MODULES = [
    { href: "/admin", label: "Pusat Pesanan (Studio & E-Commerce)", icon: ShoppingBag },
    { href: "/admin/gang-sheet", label: "Gang Sheet DTF", icon: LayoutGrid },
    { href: "/admin/catalog", label: "Katalog & Stok", icon: Package },
    { href: "/admin/coupons", label: "Kupon Promo", icon: TicketPercent },
    { href: "/admin/shipping", label: "Tarif & Zona Ongkir", icon: MapPin },
    { href: "/admin/cms", label: "Konten Website", icon: FileText },
    { href: "/admin/customers", label: "Database Pelanggan", icon: Users },
    { href: "/admin/laporan", label: "Laporan Finansial", icon: TrendingUp },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <Settings size={15} />
            <span>Pusat Kendali Konfigurasi & Analitik</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary uppercase">
            Pengaturan & Ringkasan Toko
          </h1>
          <p className="text-text-muted text-xs mt-1">
            Ringkasan omset penjualan, notifikasi operasional, dan parameter konfigurasi sistem Kaos Kami Makassar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="py-2.5 px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs hover:opacity-95"
          >
            <ShoppingBag size={14} />
            <span>Buka Pusat Pesanan</span>
          </Link>
        </div>
      </div>

      {/* SEKSI 1: RINGKASAN ANALITIK OPERASIONAL & OMSET */}
      <div className="space-y-4 p-5 sm:p-6 rounded-2xl bg-surface border border-border-subtle shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-border-subtle/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Ringkasan Analitik & Kinerja Toko
              </h2>
              <span className="text-[11px] text-text-muted">
                Statistik real-time omset, pesanan masuk, antrean sablon, dan logistik antar Makassar.
              </span>
            </div>
          </div>

          {/* Filter Periode Omset */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-canvas border border-border-subtle shrink-0">
            {[
              { id: "all", label: "Semua Waktu" },
              { id: "today", label: "Hari Ini" },
              { id: "7d", label: "7 Hari" },
              { id: "30d", label: "30 Hari" },
            ].map((r) => (
              <Link
                key={r.id}
                href={`/admin/settings?range=${r.id}`}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-semibold ${
                  range === r.id
                    ? "bg-brand-accent text-canvas shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 4 Kartu KPI Analitik Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* KPI 1: Omset Terkonfirmasi */}
          <div className="p-4 rounded-xl bg-canvas border border-border-subtle flex flex-col justify-between space-y-3">
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Omset Terkonfirmasi</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign size={15} />
              </div>
            </div>
            <div>
              <span
                className="font-sans font-bold text-xl text-text-primary tracking-tight block truncate"
                title={`Rp ${revenueIdr.toLocaleString("id-ID")}`}
              >
                Rp {revenueIdr.toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                <ShieldCheck size={12} />
                <span>Terverifikasi Gateway iPaymu</span>
              </span>
            </div>
          </div>

          {/* KPI 2: Total Pesanan Masuk */}
          <Link
            href="/admin"
            className="p-4 rounded-xl bg-canvas border border-border-subtle hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Pesanan</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package size={15} />
              </div>
            </div>
            <div>
              <span className="font-sans font-bold text-xl text-text-primary tracking-tight block">
                {totalOrders} Pesanan
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium">
                <span>Kelola di Pusat Pesanan</span>
                <ChevronRight size={12} />
              </span>
            </div>
          </Link>

          {/* KPI 3: Antrean Sablon DTF */}
          <Link
            href="/admin/production"
            className="p-4 rounded-xl bg-canvas border border-border-subtle hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Antrean Sablon DTF</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers size={15} />
              </div>
            </div>
            <div>
              <span className="font-sans font-bold text-xl text-text-primary tracking-tight block">
                {pendingProduction} Tugas Cetak
              </span>
              <span className="text-[11px] mt-1 block">
                {expressOrders > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{expressOrders} Pesanan SLA Express</span>
                  </span>
                ) : (
                  <span className="text-text-muted">Proses workshop sablon normal</span>
                )}
              </span>
            </div>
          </Link>

          {/* KPI 4: Logistik & Antar */}
          <Link
            href="/admin/deliveries"
            className="p-4 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Logistik & Antar</span>
              <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                <Truck size={15} />
              </div>
            </div>
            <div>
              <span className="font-sans font-bold text-xl text-text-primary tracking-tight block">
                {readyToShip + shipped} Paket
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {readyToShip} Siap Antar · {shipped} Di Jalan
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* SEKSI 2: PUSAT NOTIFIKASI OPERASIONAL & PERINGATAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifikasi Ringkasan Operasional */}
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider border-b border-border-subtle/50 pb-2.5">
            <Bell size={15} className="text-brand-accent" />
            <span>Notifikasi Operasional Toko</span>
          </div>

          <div className="space-y-2">
            {pendingReviewCount > 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-700 dark:text-amber-300 block text-xs">
                    {pendingReviewCount} Pesanan Studio Menunggu Review Desain
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Perlu diverifikasi artwork 300 DPI sebelum pelanggan membayar.
                  </p>
                  <Link
                    href="/admin?status=DESIGN_REVIEW"
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline mt-1 inline-block"
                  >
                    Buka antrean review &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-canvas border border-border-subtle/60 flex items-center gap-2 text-text-muted text-[11px]">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Semua review desain studio telah selesai diverifikasi.</span>
              </div>
            )}

            {expressOrders > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-700 dark:text-rose-300 block text-xs">
                    {expressOrders} Pesanan Memiliki SLA Express 24 Jam!
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Prioritaskan di meja press cetak workshop untuk mencegah keterlambatan.
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-canvas border border-border-subtle/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-text-primary text-xs block">
                  Jalur Cepat E-Commerce Aktif
                </span>
                <span className="text-[11px] text-text-muted">
                  Pembelian produk jadi katalog bypass sablon kanban secara otomatis.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                AKTIF
              </span>
            </div>
          </div>
        </div>

        {/* Peringatan Stok Menipis */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2.5">
            <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider">
              <AlertTriangle size={15} className="text-amber-500" />
              <span>Peringatan Stok Menipis (&le; 5 pcs)</span>
            </div>
            <Link
              href="/admin/catalog"
              className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-bold"
            >
              <span>Kelola Stok Katalog</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {lowStockVariants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {lowStockVariants.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-canvas border border-amber-500/20 flex justify-between items-center shadow-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-text-primary block truncate text-xs">
                      {v.name}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {v.category?.name || "Apparel"} · {v.size} · {v.colorName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    {v.stockQty} pcs
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted text-xs bg-canvas rounded-xl border border-border-subtle">
              Semua bahan baku kaos dan varian apparel dalam kondisi aman (&gt; 5 pcs).
            </div>
          )}
        </div>
      </div>

      {/* Sub-Modul Navigasi Cepat */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
          Pintasan Sub-Modul Admin:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUB_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Icon size={14} className="text-brand-accent" />
                <span>{m.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Identitas Workshop & Monitoring Integrasi Live */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identitas Workshop Kaos Kami */}
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
              <MapPin size={15} className="text-brand-accent" />
              <span>Identitas Workshop Makassar</span>
            </h3>
            <span className="text-text-muted text-[11px] font-mono">
              Kota Makassar
            </span>
          </div>

          <div className="space-y-0.5">
            <SettingRow label="Alamat Workshop" value={shopAddress.text} isDefault={shopAddress.isDefault} />
            <SettingRow label="Kode Pos Asal" value={shopPostal.text} isDefault={shopPostal.isDefault} />
            <SettingRow label="WhatsApp Resmi CS" value={shopWa.text} isDefault={shopWa.isDefault} />
            <SettingRow label="Site URL Publik" value={siteUrl.text} isDefault={siteUrl.isDefault} />
            <SettingRow label="R2 Assets Bucket" value={r2Bucket.text} isDefault={r2Bucket.isDefault} />
            <SettingRow label="R2 Public Gateway" value={r2UrlRaw || "Default Terproteksi"} isDefault={!r2UrlRaw} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-1">
              <span className="text-text-muted text-xs font-medium">Titik GPS Workshop (Lat, Lon)</span>
              <span className="text-xs font-mono text-text-primary font-bold">
                {SHOP_LAT}, {SHOP_LON}
              </span>
            </div>
          </div>
        </div>

        {/* Real Live Integration Status Checker (iPaymu, R2, Turso, Fonnte) */}
        <SystemHealthMonitor />
      </div>

      {/* Audit Trail & Log Riwayat Aktivitas Toko */}
      <ActivityLogTrigger />
    </div>
  );
}
