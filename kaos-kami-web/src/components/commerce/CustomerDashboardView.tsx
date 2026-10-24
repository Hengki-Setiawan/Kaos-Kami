"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Package,
  Layers,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Copy,
  Check,
  RotateCcw,
  Palette,
  ShieldCheck,
  Printer,
  MessageSquare,
  ShoppingBag,
  Tag,
  Download,
  Eye,
  X,
  FileText,
  Bell,
  CreditCard,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { ReorderButton } from "@/components/commerce/ReorderButton";
import { DesignCardActions } from "@/components/commerce/DesignCardActions";
import { AddressBook } from "@/components/commerce/AddressBook";
import { UserProfileCard } from "@/components/commerce/UserProfileCard";
import { RepayButton } from "@/components/commerce/RepayButton";
import { OrderDetailModal } from "@/components/commerce/OrderDetailModal";
import { CancelOrderButton } from "@/components/commerce/CancelOrderButton";
import { NotificationList } from "@/components/commerce/NotificationList";
import { VoucherShelf } from "@/components/commerce/VoucherShelf";
import { Z_CLASS_MODAL } from "@/lib/zIndex";

interface OrderItemData {
  id: string;
  productVariantId: string | null;
  designId: string | null;
  quantity: number;
  unitPriceIdr: number;
  lineTotalIdr: number;
  snapshotName: string;
  snapshotImageUrl?: string | null;
  snapshotSize: string;
  snapshotColorName: string;
}

interface OrderData {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  subtotalIdr: number;
  shippingCostIdr: number;
  discountIdr: number;
  totalIdr: number;
  trackingNumber: string | null;
  courierNotes: string | null;
  notes: string | null;
  reviewNote?: string | null;
  createdAt: string | Date;
  items: OrderItemData[];
  shippingAddress?: {
    recipientName?: string;
    fullAddress?: string;
    city?: string;
  } | null;
  payment?: {
    method?: string | null;
    status?: string;
  } | null;
}

interface DesignData {
  id: string;
  title: string;
  colorHex: string;
  colorName: string;
  size: string;
  calculatedPriceIdr: number;
  previewImageFrontUrl?: string | null;
  previewImageBackUrl?: string | null;
  decals?: any;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  category?: {
    name?: string;
    slug?: string;
  } | null;
}

interface CustomerDashboardViewProps {
  orders: OrderData[];
  designs: DesignData[];
  addresses: any[];
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    role?: string;
  } | null;
  ordersNextCursor?: string | null;
  designsNextCursor?: string | null;
  addressesNextCursor?: string | null;
  currentCursors?: {
    ordersCursor?: string | null;
    designsCursor?: string | null;
    addressesCursor?: string | null;
  };
  scope?: "mine" | "all";
  canSeeAll?: boolean;
}

// Tahapan pesanan kanonis untuk visual stepper (termasuk kurasi desain kustom)
const ORDER_STEPS = [
  { key: "DESIGN_REVIEW", label: "Review Desain", desc: "Kurasi artwork bengkel" },
  { key: "PENDING_PAYMENT", label: "Menunggu Bayar", desc: "Desain disetujui, siap bayar QRIS" },
  { key: "PAYMENT_CONFIRMED", label: "Lunas", desc: "Pembayaran terverifikasi" },
  { key: "PRINTING", label: "Cetak DTF", desc: "Proses film & oven sablon" },
  { key: "QUALITY_CHECK", label: "Quality Check", desc: "Inspeksi press & finis" },
  { key: "READY_TO_SHIP", label: "Siap / Dikirim", desc: "Siap ambil / bersama kurir" },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan telah diterima" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "DESIGN_REVIEW":
      return 0;
    case "PENDING_PAYMENT":
      return 1;
    case "PAYMENT_CONFIRMED":
    case "IN_PRODUCTION_QUEUE":
      return 2;
    case "PRINTING":
    case "PRESSING":
      return 3;
    case "QUALITY_CHECK":
    case "PACKAGING":
      return 4;
    case "READY_TO_SHIP":
    case "SHIPPED":
    case "DELIVERED":
      return 5;
    case "COMPLETED":
      return 6;
    default:
      return -1;
  }
}

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function getPreviewSrc(url: string | null | undefined, updatedAt?: string | Date | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const v = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}

function getSizeBreakdown(items: OrderItemData[]): string {
  const counts: Record<string, number> = {};
  for (const it of items) {
    const size = it.snapshotSize || "Std";
    counts[size] = (counts[size] || 0) + it.quantity;
  }
  return Object.entries(counts)
    .map(([size, qty]) => `${size} (${qty})`)
    .join(", ");
}

export function isExpressOrder(order: { courierNotes?: string | null }): boolean {
  const n = order.courierNotes || "";
  return n.includes("[TIER:EXPRESS_24H]") || n.includes("EXPRESS");
}

function getOrderEta(order: OrderData): { badge: string; isExpress: boolean } {
  if (isExpressOrder(order)) {
    return { badge: "Express: Siap dalam 24 Jam", isExpress: true };
  }
  const orderDate = new Date(order.createdAt);
  const targetDate = new Date(orderDate);
  targetDate.setDate(targetDate.getDate() + 2);
  if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
  const dateStr = targetDate.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return { badge: `Estimasi Selesai: ~${dateStr}`, isExpress: false };
}

export function CustomerDashboardView({
  orders,
  designs,
  addresses,
  user,
  ordersNextCursor,
  designsNextCursor,
  currentCursors,
  scope = "mine",
  canSeeAll = false,
}: CustomerDashboardViewProps) {
  const moreHref = (key: "ordersCursor" | "designsCursor" | "addressesCursor", val: string | null | undefined) => {
    if (!val) return null;
    const params = new URLSearchParams();
    if (currentCursors?.ordersCursor) params.set("ordersCursor", currentCursors.ordersCursor);
    if (currentCursors?.designsCursor) params.set("designsCursor", currentCursors.designsCursor);
    if (currentCursors?.addressesCursor) params.set("addressesCursor", currentCursors.addressesCursor);
    params.set(key, val);
    return `/dashboard/orders?${params.toString()}`;
  };

  const [currentUser, setCurrentUser] = useState(user);
  const [activeTab, setActiveTab] = useState<"orders" | "designs" | "addresses" | "notifs" | "vouchers">("orders");
  const [orderFilter, setOrderFilter] = useState<"ALL" | "ACTIVE" | "SHIPPED" | "COMPLETED" | "CANCELLED">("ALL");
  const [copiedResi, setCopiedResi] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1-Click Instant Add-to-Cart dari Wardrobe 3D
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [orderingDesign, setOrderingDesign] = useState<DesignData | null>(null);
  const [orderDesignSize, setOrderDesignSize] = useState("L");
  const [orderDesignQty, setOrderDesignQty] = useState(1);

  // Mini 3D viewer modal ringan
  const [previewDesign, setPreviewDesign] = useState<DesignData | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back" | "artwork">("front");

  // Modal detail order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) || null : null;

  const [copyError, setCopyError] = useState<string | null>(null);

  const copyResi = async (resi: string) => {
    setCopyError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resi);
      } else {
        throw new Error("no-clipboard");
      }
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = resi;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy-failed");
      } catch {
        setCopyError("Gagal menyalin otomatis — silakan salin manual.");
        return;
      }
    }
    setCopiedResi(resi);
    setTimeout(() => setCopiedResi(null), 2500);
  };

  const orderCounts = useMemo(() => {
    let active = 0;
    let shipped = 0;
    let completed = 0;
    let cancelled = 0;
    for (const o of orders) {
      if (["CANCELLED", "REFUNDED"].includes(o.status)) {
        cancelled++;
      } else if (o.status === "COMPLETED") {
        completed++;
      } else if (["READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(o.status)) {
        shipped++;
      } else {
        active++;
      }
    }
    return { all: orders.length, active, shipped, completed, cancelled };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "ACTIVE") {
      return orders.filter(
        (o) =>
          !["CANCELLED", "REFUNDED", "COMPLETED", "READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(
            o.status
          )
      );
    }
    if (orderFilter === "SHIPPED") {
      return orders.filter((o) => ["READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(o.status));
    }
    if (orderFilter === "COMPLETED") {
      return orders.filter((o) => o.status === "COMPLETED");
    }
    if (orderFilter === "CANCELLED") {
      return orders.filter((o) => ["CANCELLED", "REFUNDED"].includes(o.status));
    }
    return orders;
  }, [orders, orderFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* ============================================================== */}
      {/* 1. HEADER IDENTITAS AKUN — FRAMELESS LIQUID GLASS              */}
      {/* ============================================================== */}
      <section
        aria-label="Profil Pengguna"
        className="p-6 sm:p-7 rounded-3xl bg-surface/70 dark:bg-black/40 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden"
      >
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-4 relative z-10">
          {/* Avatar Simpel */}
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
            {(currentUser?.name || "K")[0]?.toUpperCase()}
          </div>

          {/* Nama & Kontak */}
          <div className="min-w-0">
            <h1 className="font-bold text-xl sm:text-2xl uppercase tracking-tight text-text-primary truncate">
              {currentUser?.name || "Pelanggan Kaos Kami"}
            </h1>
            <p className="text-xs text-text-muted mt-1 truncate">
              {currentUser?.email || "—"} · {currentUser?.phoneNumber || "No. WA Belum Terdaftar"}
            </p>
          </div>
        </div>

        {/* 1 Tombol Aksi Utama yang Jelas */}
        <div className="shrink-0 relative z-10">
          <Link
            href="/studio"
            className="py-2.5 px-5 rounded-full bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2"
          >
            <Sparkles size={14} />
            <span>Buat Desain 3D</span>
          </Link>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. RINGKASAN METRIK — 3 KARTU BERSIH & FOKUS                  */}
      {/* ============================================================== */}
      <section aria-label="Statistik Akun" className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Kartu 1: Pesanan Aktif */}
        <div
          onClick={() => {
            setActiveTab("orders");
            setOrderFilter("ACTIVE");
          }}
          className="p-5 rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/60 dark:border-white/10 hover:border-brand-accent/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Pesanan Aktif
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package size={15} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {orderCounts.active}
            </span>
            <span className="text-xs text-text-muted">dalam proses workshop</span>
          </div>
        </div>

        {/* Kartu 2: Wardrobe Desain 3D */}
        <div
          onClick={() => setActiveTab("designs")}
          className="p-5 rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/60 dark:border-white/10 hover:border-brand-accent/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Wardrobe 3D
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface-elevated text-text-muted flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers size={15} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {designs.length}
            </span>
            <span className="text-xs text-text-muted">dari 5 kuota cloud</span>
          </div>
        </div>

        {/* Kartu 3: Total Pesanan Selesai */}
        <div
          onClick={() => {
            setActiveTab("orders");
            setOrderFilter("COMPLETED");
          }}
          className="p-5 rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/60 dark:border-white/10 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Pesanan Selesai
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {orderCounts.completed}
            </span>
            <span className="text-xs text-text-muted">riwayat sukses</span>
          </div>
        </div>
      </section>

      {/* Floating Developer Persona Indicator */}
      {canSeeAll && (
        <aside
          aria-label="Mode Pengujian Persona"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 p-1.5 px-3 rounded-full bg-surface/90 border border-amber-500/40 backdrop-blur-xl shadow-2xl text-[11px] font-sans"
        >
          <span className="flex items-center gap-1.5 font-semibold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Mode Persona:</span>
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/orders?scope=mine"
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                scope !== "all"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Pesanan Saya
            </Link>
            <Link
              href="/dashboard/orders?scope=all"
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                scope === "all"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Semua Toko
            </Link>
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 3. TABS NAVIGASI FRAMELESS SEGMENTED PILL                      */}
      {/* ============================================================== */}
      <nav
        aria-label="Navigasi Menu Dashboard"
        className="p-1 sm:p-1.5 rounded-full bg-surface-elevated/40 dark:bg-black/40 border border-border-subtle/60 dark:border-white/10 backdrop-blur-xl flex items-center gap-1 sm:gap-1.5 text-xs overflow-x-auto no-scrollbar shadow-inner max-w-full"
      >
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`py-2 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "orders"
              ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          }`}
        >
          <Package size={14} />
          <span>Pesanan Saya ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designs")}
          className={`py-2 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "designs"
              ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          }`}
        >
          <Layers size={14} />
          <span>Koleksi Desain 3D ({designs.length}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`py-2 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "addresses"
              ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          }`}
        >
          <MapPin size={14} />
          <span>Profil & Alamat ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifs")}
          className={`py-2 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "notifs"
              ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          }`}
        >
          <Bell size={14} />
          <span>Notifikasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vouchers")}
          className={`py-2 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "vouchers"
              ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          }`}
        >
          <Tag size={14} />
          <span>Voucher Toko</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* TAB 1: DAFTAR PESANAN                                          */}
      {/* ============================================================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Filter Status Sederhana */}
          {orders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {[
                { key: "ALL", label: "Semua", count: orderCounts.all },
                { key: "ACTIVE", label: "Sedang Diproses", count: orderCounts.active },
                { key: "SHIPPED", label: "Siap & Dikirim", count: orderCounts.shipped },
                { key: "COMPLETED", label: "Selesai", count: orderCounts.completed },
                { key: "CANCELLED", label: "Dibatalkan", count: orderCounts.cancelled },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setOrderFilter(tab.key as any)}
                  className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                    orderFilter === tab.key
                      ? "bg-brand-accent text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
                      : "bg-surface/80 dark:bg-black/30 border border-border-subtle/80 dark:border-white/10 text-text-muted hover:text-text-primary hover:border-brand-accent/40"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      orderFilter === tab.key
                        ? "bg-black/20 text-white"
                        : "bg-black/5 dark:bg-white/10 text-text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {orders.length === 0 ? (
            <div className="p-8 sm:p-10 text-center rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 text-text-muted space-y-3 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              <Package size={32} className="mx-auto text-text-muted/60" />
              <p className="text-sm font-bold text-text-primary">Belum Ada Pesanan Aktif</p>
              <p className="text-xs max-w-sm mx-auto text-text-muted">
                Buka 3D Studio untuk mulai mendesain pakaian sablon DTF impian Anda.
              </p>
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-accent text-canvas text-xs font-bold uppercase hover:brightness-110 shadow-md transition-all"
              >
                <Sparkles size={13} />
                <span>Mulai Desain 3D</span>
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/80 dark:border-white/10 text-text-muted space-y-2">
              <p className="text-xs font-bold text-text-primary">
                Tidak ada pesanan dengan filter status ini.
              </p>
              <button
                type="button"
                onClick={() => setOrderFilter("ALL")}
                className="px-4 py-1.5 rounded-full bg-surface/80 border border-border-subtle hover:border-brand-accent text-brand-accent text-xs font-bold cursor-pointer transition-all"
              >
                Tampilkan Semua ({orders.length})
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);
              const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
              const isFinished = order.status === "COMPLETED";
              const eta = getOrderEta(order);
              const sizeBreakdown = getSizeBreakdown(order.items);
              const totalPcs = order.items.reduce((s, it) => s + it.quantity, 0);

              return (
                <div
                  key={order.id}
                  onClick={(e) => {
                    const t = e.target as HTMLElement | null;
                    if (t?.closest?.("button, a, input, textarea, select")) return;
                    setSelectedOrderId(order.id);
                  }}
                  className="rounded-3xl bg-surface/75 dark:bg-black/40 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-brand-accent/50 hover:shadow-[0_12px_36px_rgba(37,99,235,0.15)] transition-all cursor-pointer"
                  title="Klik untuk detail pesanan"
                >
                  {/* Top Bar: Nomor Pesanan, Status & Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-text-primary text-sm">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isCancelled
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                              : order.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : order.status === "DESIGN_REVIEW"
                              ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                              : order.status === "PENDING_PAYMENT"
                              ? "bg-sky-500/15 text-sky-500 border-sky-500/30"
                              : "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
                          }`}
                        >
                          {order.status === "DESIGN_REVIEW"
                            ? "Review Desain"
                            : order.status === "PENDING_PAYMENT"
                            ? "Menunggu Bayar"
                            : order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-text-muted text-[11px]">
                        Dipesan:{" "}
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · Pengiriman: <strong>{order.deliveryMethod}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-text-muted block">Total Pesanan:</span>
                      <span className="font-mono font-bold text-brand-accent text-base">
                        {formatRupiah(order.totalIdr)}
                      </span>
                    </div>
                  </div>

                  {/* Production ETA Badge (Hanya jika aktif) */}
                  {!isCancelled && !isFinished && (
                    <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                      <Clock size={13} className="shrink-0" />
                      <span>{eta.badge}</span>
                    </div>
                  )}

                  {/* Visual Stepper Ringkas */}
                  {!isCancelled && currentStepIdx >= 0 && (
                    <div className="py-1">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {ORDER_STEPS.map((step, idx) => {
                          const isDone = currentStepIdx > idx;
                          const isCurrent = currentStepIdx === idx;
                          return (
                            <div key={step.key} className="space-y-1 text-center">
                              <div className="flex items-center justify-center">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                    isDone
                                      ? "bg-emerald-500 text-white"
                                      : isCurrent
                                      ? "bg-brand-accent text-canvas ring-3 ring-brand-accent/20 animate-pulse font-black"
                                      : "bg-surface-elevated border border-border-subtle text-text-muted"
                                  }`}
                                >
                                  {isDone ? <Check size={12} /> : idx + 1}
                                </div>
                              </div>
                              <span
                                className={`block text-[10.5px] font-bold ${
                                  isCurrent
                                    ? "text-brand-accent"
                                    : isDone
                                    ? "text-text-primary"
                                    : "text-text-muted"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resi Box jika ada */}
                  {order.trackingNumber && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Truck size={15} className="text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-text-muted block text-[10px]">NOMOR RESI:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {order.trackingNumber}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyResi(order.trackingNumber!)}
                        className="py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedResi === order.trackingNumber ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedResi === order.trackingNumber ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                  )}

                  {/* Daftar Item */}
                  <div className="space-y-1.5">
                    <div className="divide-y divide-border-subtle bg-black/5 dark:bg-white/5 rounded-xl p-3 text-xs space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center gap-2">
                          <div>
                            <span className="font-bold text-text-primary block">
                              #{idx + 1}. {item.snapshotName}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Ukuran: <strong className="text-text-primary">{item.snapshotSize}</strong> · Warna:{" "}
                              <strong className="text-text-primary">{item.snapshotColorName}</strong> · Qty:{" "}
                              <strong className="text-brand-accent font-mono">{item.quantity} pcs</strong>
                            </span>
                          </div>
                          <span className="font-mono font-bold text-text-primary shrink-0">
                            {formatRupiah(item.lineTotalIdr)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/50">
                    <span className="text-[11px] font-mono text-text-muted">
                      ID: {order.id.slice(0, 8)}…
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === "PENDING_PAYMENT" && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer animate-pulse"
                        >
                          <CreditCard size={12} />
                          <span>Bayar QRIS</span>
                        </button>
                      )}

                      {order.status === "DESIGN_REVIEW" && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Clock size={12} />
                          <span>Kurasi Bengkel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="px-3.5 py-1.5 rounded-full bg-surface/90 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 hover:border-brand-accent text-text-primary font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <span>Detail</span>
                        <ChevronRight size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("open-kamito-chat", {
                              detail: { orderId: order.id, orderNumber: order.orderNumber },
                            })
                          );
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-surface/90 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 hover:border-amber-500 text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <MessageSquare size={12} className="text-amber-500" />
                        <span>Tanya CS</span>
                      </button>

                      <ReorderButton
                        userId={order.userId || user?.id || ""}
                        items={(order.items || []).map((it) => ({
                          productVariantId: it.productVariantId,
                          designId: it.designId,
                          quantity: it.quantity,
                          unitPriceIdr: it.unitPriceIdr,
                          name: it.snapshotName,
                          size: it.snapshotSize,
                          colorName: it.snapshotColorName,
                          image: it.snapshotImageUrl,
                        }))}
                      />

                      <Link
                        href={`/orders/${order.id}`}
                        className="px-3.5 py-1.5 rounded-full bg-surface/90 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 hover:border-brand-accent text-text-primary font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <Printer size={12} className="text-brand-accent" />
                        <span>{order.status === "PENDING_PAYMENT" ? "Tagihan" : "Invoice"}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Muat 25 berikutnya */}
          {(() => {
            const href = moreHref("ordersCursor", ordersNextCursor);
            if (!href) return null;
            return (
              <div className="pt-2 text-center">
                <Link
                  href={href}
                  className="inline-block px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent text-xs font-bold"
                >
                  Muat 25 Pesanan Berikutnya
                </Link>
              </div>
            );
          })()}

          {/* Modal detail */}
          {selectedOrder && (
            <OrderDetailModal
              order={selectedOrder}
              onClose={() => setSelectedOrderId(null)}
              isAdmin={canSeeAll}
            />
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: KOLEKSI DESAIN 3D WARDROBE                              */}
      {/* ============================================================== */}
      {activeTab === "designs" && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
            <span className="font-bold text-text-primary">
              Kapasitas Wardrobe Cloud: {Math.min(designs.length, 5)} / 5 Slot Terpakai
            </span>
            <span className="text-text-muted text-[11px]">
              Tersedia {Math.max(0, 5 - designs.length)} slot desain lagi
            </span>
          </div>

          {designs.length === 0 ? (
            <div className="p-8 sm:p-10 text-center rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 text-text-muted space-y-3 shadow-sm">
              <Layers size={32} className="mx-auto text-text-muted/60" />
              <p className="text-sm font-bold text-text-primary">Belum Ada Desain Tersimpan</p>
              <p className="text-xs max-w-sm mx-auto text-text-muted">
                Buka 3D Studio, posisikan artwork sablon kustom Anda, lalu klik Simpan ke Wardrobe!
              </p>
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-accent text-canvas text-xs font-bold uppercase hover:brightness-110 shadow-md transition-all"
              >
                <Sparkles size={13} />
                <span>Mulai Desain 3D</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="rounded-3xl bg-surface/75 dark:bg-black/40 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 overflow-hidden space-y-3.5 p-4 hover:border-brand-accent/50 hover:shadow-[0_12px_36px_rgba(37,99,235,0.12)] transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Visual 3D Preview Image Thumbnail (Hero Proportion) */}
                    <div className="w-full h-56 rounded-xl bg-black/10 dark:bg-black/25 border border-border-subtle overflow-hidden flex items-center justify-center relative">
                      {(design.previewImageFrontUrl || design.previewImageBackUrl) &&
                      /^(https?:\/\/|data:image\/|\/)/.test(
                        (design.previewImageFrontUrl || design.previewImageBackUrl) as string
                      ) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPreviewSrc(
                            design.previewImageFrontUrl || design.previewImageBackUrl,
                            design.updatedAt
                          )}
                          alt={design.title}
                          loading="lazy"
                          className="w-full h-full object-contain p-1.5 hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center space-y-1.5 p-3">
                          <div
                            className="w-10 h-10 rounded-xl mx-auto border border-border-strong shadow-sm"
                            style={{ backgroundColor: design.colorHex }}
                          />
                          <span className="text-[10px] text-text-muted block font-mono">
                            {design.colorName}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewSide("front");
                          setPreviewDesign(design);
                        }}
                        className="absolute bottom-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-brand-accent text-white text-[10px] font-bold uppercase backdrop-blur-xs transition-all cursor-pointer"
                        title="Intip pratinjau"
                      >
                        <Eye size={11} />
                        <span>Intip</span>
                      </button>
                    </div>

                    {/* Card Title & Specs */}
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-text-primary text-xs truncate" title={design.title}>
                        {design.title}
                      </h3>
                      <p className="text-[11px] text-text-muted truncate">
                        {design.size} · {design.colorName}
                      </p>
                    </div>

                    {/* Estimated Price */}
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle flex items-center justify-between text-xs">
                      <span className="text-text-muted text-[10px]">Estimasi:</span>
                      <span className="font-bold text-brand-accent font-mono">
                        {formatRupiah(design.calculatedPriceIdr)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderingDesign(design);
                        setOrderDesignSize(design.size || "L");
                        setOrderDesignQty(1);
                      }}
                      className="w-full py-2.5 px-4 rounded-full bg-brand-accent hover:brightness-110 active:scale-98 text-canvas font-bold text-center flex items-center justify-center gap-1.5 transition-all text-xs uppercase shadow-md cursor-pointer"
                    >
                      <ShoppingBag size={13} className="shrink-0" />
                      <span>Pesan Sekarang</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/studio?designId=${design.id}`}
                        className="py-2 px-3 rounded-full bg-surface/90 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 hover:border-brand-accent text-text-primary font-bold text-center flex items-center justify-center gap-1.5 transition-all text-[11px] uppercase hover:text-brand-accent cursor-pointer"
                      >
                        <Sparkles size={11} className="text-brand-accent shrink-0" />
                        <span>Edit 3D</span>
                      </Link>

                      {design.previewImageFrontUrl ? (
                        <a
                          href={design.previewImageFrontUrl}
                          download={`${design.title.toLowerCase().replace(/\s+/g, "-")}-mockup.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-full bg-surface/90 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 hover:border-brand-accent text-text-primary font-bold text-center flex items-center justify-center gap-1.5 transition-all text-[11px] uppercase hover:text-brand-accent cursor-pointer"
                        >
                          <Download size={11} className="text-brand-accent shrink-0" />
                          <span>Unduh</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="py-2 px-3 rounded-full bg-surface/40 border border-border-subtle/40 opacity-40 text-text-muted text-[11px] font-bold text-center flex items-center justify-center gap-1.5"
                        >
                          <Download size={11} />
                          <span>Unduh</span>
                        </button>
                      )}
                    </div>

                    <DesignCardActions id={design.id} title={design.title} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Muat 5 berikutnya */}
          {(() => {
            const href = moreHref("designsCursor", designsNextCursor);
            if (!href) return null;
            return (
              <div className="pt-2 text-center">
                <Link
                  href={href}
                  className="inline-block px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent text-xs font-bold"
                >
                  Muat 5 Desain Berikutnya
                </Link>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PROFIL & BUKU ALAMAT                                    */}
      {/* ============================================================== */}
      {activeTab === "addresses" && (
        <div className="space-y-6">
          <UserProfileCard
            user={currentUser}
            onProfileUpdated={(updated) => setCurrentUser((prev: any) => ({ ...prev, ...updated }))}
          />

          <AddressBook
            initial={addresses}
            defaultRecipientName={currentUser?.name || ""}
            defaultPhoneNumber={currentUser?.phoneNumber || ""}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: NOTIFIKASI STATUS PESANAN                               */}
      {/* ============================================================== */}
      {activeTab === "notifs" && (
        <div className="rounded-2xl bg-surface border border-border-subtle p-5 shadow-xs">
          <NotificationList />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: VOUCHER TOKO                                            */}
      {/* ============================================================== */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          <VoucherShelf />
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1-CLICK INSTANT ORDER DARI WARDROBE                     */}
      {/* ============================================================== */}
      {mounted && orderingDesign && createPortal(
        <div
          className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200`}
          onClick={() => setOrderingDesign(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pesan desain langsung"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface border border-border-subtle p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-brand-accent" />
                <h3 className="font-bold text-sm text-text-primary">Pesan Desain Langsung</h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderingDesign(null)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle">
              <div className="w-12 h-12 rounded-lg bg-black/20 border border-border-subtle overflow-hidden flex items-center justify-center shrink-0">
                {orderingDesign.previewImageFrontUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPreviewSrc(orderingDesign.previewImageFrontUrl, orderingDesign.updatedAt)}
                    alt={orderingDesign.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: orderingDesign.colorHex }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-text-primary truncate">{orderingDesign.title}</h4>
                <p className="text-[11px] text-text-muted">
                  {orderingDesign.colorName} · {orderingDesign.category?.name || "Kaos Sablon DTF"}
                </p>
                <p className="text-xs font-bold text-brand-accent mt-0.5 font-mono">
                  Rp {orderingDesign.calculatedPriceIdr.toLocaleString("id-ID")} / pcs
                </p>
              </div>
            </div>

            {/* Pilihan Ukuran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">PILIH UKURAN:</label>
              <div className="grid grid-cols-5 gap-1.5">
                {["S", "M", "L", "XL", "XXL"].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setOrderDesignSize(sz)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      orderDesignSize === sz
                        ? "bg-brand-accent text-canvas border-brand-accent"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Kuantitas */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">JUMLAH (PCS):</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderDesignQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent font-bold text-sm flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={orderDesignQty}
                  onChange={(e) => setOrderDesignQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-surface border border-border-subtle text-center font-mono font-bold text-sm text-text-primary focus:outline-none focus:border-brand-accent"
                />
                <button
                  type="button"
                  onClick={() => setOrderDesignQty((q) => Math.min(100, q + 1))}
                  className="w-9 h-9 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent font-bold text-sm flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Subtotal & Masuk Keranjang */}
            <div className="pt-2 border-t border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text-muted">Subtotal ({orderDesignQty} pcs):</span>
                <span className="text-brand-accent text-sm font-mono">
                  Rp {(orderingDesign.calculatedPriceIdr * orderDesignQty).toLocaleString("id-ID")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  addItem({
                    id: orderingDesign.id,
                    name: `${orderingDesign.title} (${orderDesignSize})`,
                    priceIdr: orderingDesign.calculatedPriceIdr,
                    size: orderDesignSize,
                    colorName: orderingDesign.colorName,
                    colorHex: orderingDesign.colorHex,
                    image: orderingDesign.previewImageFrontUrl || "/products/tshirt-black.jpg",
                    quantity: orderDesignQty,
                    isCustom: true,
                    apparelSlug: orderingDesign.category?.slug || "tshirt",
                    designId: orderingDesign.id,
                  });
                  setOrderingDesign(null);
                  openCart();
                }}
                className="w-full py-2.5 rounded-xl bg-brand-accent hover:brightness-110 active:scale-98 text-canvas font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag size={14} />
                <span>+ Tambahkan ke Keranjang</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* MODAL PRATINJAU MOCKUP RINGAN                                  */}
      {/* ============================================================== */}
      {mounted && previewDesign && createPortal(
        <div
          className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200`}
          onClick={() => setPreviewDesign(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau desain ${previewDesign.title}`}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface border border-border-subtle p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 min-w-0">
                <Eye size={16} className="text-brand-accent shrink-0" />
                <h3 className="font-bold text-sm text-text-primary truncate" title={previewDesign.title}>
                  {previewDesign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {(() => {
              const parsedDecals: any[] = (() => {
                if (!previewDesign.decals) return [];
                try {
                  return typeof previewDesign.decals === "string"
                    ? JSON.parse(previewDesign.decals)
                    : previewDesign.decals;
                } catch {
                  return [];
                }
              })();
              const primaryDecal = parsedDecals[0];

              return (
                <>
                  <div className="w-full h-72 sm:h-80 rounded-xl bg-black/20 border border-border-subtle overflow-hidden flex items-center justify-center relative">
                    {previewSide === "artwork" && primaryDecal?.url ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center space-y-2 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={primaryDecal.url}
                          alt={primaryDecal.name || "Artwork Sablon DTF"}
                          loading="lazy"
                          className="max-h-48 max-w-full object-contain drop-shadow-md"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-text-primary block">
                            {primaryDecal.name || "Desain DTF"}
                          </span>
                          <span className="text-[10px] text-brand-accent font-mono block">
                            {primaryDecal.widthCm && primaryDecal.heightCm
                              ? `${primaryDecal.widthCm} × ${primaryDecal.heightCm} cm`
                              : ""}{" "}
                            {primaryDecal.tier ? `(Tier ${primaryDecal.tier})` : ""}
                          </span>
                        </div>
                      </div>
                    ) : (() => {
                      const rawSrc =
                        previewSide === "back" && previewDesign.previewImageBackUrl
                          ? previewDesign.previewImageBackUrl
                          : previewDesign.previewImageFrontUrl || previewDesign.previewImageBackUrl;
                      const src = getPreviewSrc(rawSrc, previewDesign.updatedAt);
                      return src && /^(https?:\/\/|data:image\/|\/)/.test(src) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={`${previewDesign.title} — ${previewSide === "front" ? "depan" : "belakang"}`}
                          loading="lazy"
                          className="w-full h-full object-contain p-1.5"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl border border-border-strong"
                          style={{ backgroundColor: previewDesign.colorHex }}
                        />
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewSide("front")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                        previewSide === "front"
                          ? "bg-brand-accent text-canvas border-brand-accent"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      Depan
                    </button>
                    {previewDesign.previewImageBackUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewSide("back")}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                          previewSide === "back"
                            ? "bg-brand-accent text-canvas border-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Belakang
                      </button>
                    )}
                    {primaryDecal?.url && (
                      <button
                        type="button"
                        onClick={() => setPreviewSide("artwork")}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                          previewSide === "artwork"
                            ? "bg-brand-accent text-canvas border-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Artwork 2D
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

            <p className="text-[11px] text-text-muted">
              Ukuran: {previewDesign.size} · Warna: {previewDesign.colorName} ·{" "}
              {formatRupiah(previewDesign.calculatedPriceIdr)}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
              <Link
                href={`/studio?designId=${previewDesign.id}`}
                className="py-2 px-2 rounded-lg bg-brand-accent hover:brightness-110 text-canvas font-bold text-center flex items-center justify-center gap-1 transition-all text-[11px] uppercase cursor-pointer"
              >
                <Sparkles size={12} />
                <span>Edit 3D</span>
              </Link>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="py-2 px-2 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-center transition-all text-[11px] uppercase cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
