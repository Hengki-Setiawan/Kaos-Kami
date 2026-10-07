"use client";

import React, { useState, useMemo } from "react";
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
  createdAt: string | Date;
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
  /** U3 paginasi: cursor halaman berikut (null = habis). */
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

// Tahapan pesanan untuk visual stepper (UI 6 tahap).
// SSOT Blueprint (Bab 5/20/36/49/50/51): mesin status = 5 status kanonis.
// Pemetaan UI→mesin (JANGAN ubah mesin; getStepIndex di bawah hanya lipat status mesin ke tahap UI):
//   UI[0] Dipesan         ← PENDING_PAYMENT
//   UI[1] Lunas           ← PAYMENT_CONFIRMED + IN_PRODUCTION_QUEUE
//   UI[2] Cetak DTF       ← PRINTING + PRESSING
//   UI[3] Quality Check   ← QUALITY_CHECK + PACKAGING
//   UI[4] Siap / Dikirim  ← READY_TO_SHIP + SHIPPED + DELIVERED
//   UI[5] Selesai         ← COMPLETED
// (CANCELLED/REFUNDED di luar stepper — ditangani badge terpisah, bukan tahap maju.)
const ORDER_STEPS = [
  { key: "PENDING_PAYMENT", label: "Dipesan", desc: "Menunggu pembayaran" },
  { key: "PAYMENT_CONFIRMED", label: "Lunas", desc: "Pembayaran terverifikasi" },
  { key: "PRINTING", label: "Cetak DTF", desc: "Proses film & oven sablon" },
  { key: "QUALITY_CHECK", label: "Quality Check", desc: "Inspeksi press & finis" },
  { key: "READY_TO_SHIP", label: "Siap / Dikirim", desc: "Siap ambil / bersama kurir" },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan telah diterima" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
      return 0;
    case "PAYMENT_CONFIRMED":
    case "IN_PRODUCTION_QUEUE":
      return 1;
    case "PRINTING":
    case "PRESSING":
      return 2;
    case "QUALITY_CHECK":
    case "PACKAGING":
      return 3;
    case "READY_TO_SHIP":
    case "SHIPPED":
    case "DELIVERED":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      // U6: status tak dikenal JANGAN default "Lunas" — kembalikan -1 (netral).
      return -1;
  }
}

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
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

/** U5: marker kanonis [TIER:EXPRESS_24H] dulu (fallback substring lama). */
export function isExpressOrder(order: { courierNotes?: string | null }): boolean {
  const n = order.courierNotes || "";
  return n.includes("[TIER:EXPRESS_24H]") || n.includes("EXPRESS");
}

function getOrderEta(order: OrderData): { badge: string; isExpress: boolean } {
  if (isExpressOrder(order)) {
    return { badge: "Prioritas Express: Siap dalam 24 Jam", isExpress: true };
  }
  const orderDate = new Date(order.createdAt);
  const targetDate = new Date(orderDate);
  targetDate.setDate(targetDate.getDate() + 2);
  // Lewati hari Minggu (workshop tutup) agar estimasi jujur.
  if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
  const dateStr = targetDate.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return { badge: `Estimasi Pengerjaan: ~${dateStr} (1–2 Hari Kerja)`, isExpress: false };
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
  // U3: link muat-lagi mempertahankan cursor lain yg aktif.
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

  // 1-Click Instant Add-to-Cart dari Wardrobe 3D
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [orderingDesign, setOrderingDesign] = useState<DesignData | null>(null);
  const [orderDesignSize, setOrderDesignSize] = useState("L");
  const [orderDesignQty, setOrderDesignQty] = useState(1);
  // Bab 52/53 (1) — Mini 3D viewer ringan: modal <img> statis, TANPA canvas Three.js.
  const [previewDesign, setPreviewDesign] = useState<DesignData | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");

  // Pesanan aktif yang sedang diproses untuk highlight tracker di Welcome Hub
  const mostActiveOrder = useMemo(() => {
    return orders.find(
      (o) => !["CANCELLED", "REFUNDED", "COMPLETED"].includes(o.status)
    );
  }, [orders]);
  // Modal detail order (klik kartu → jendela status review/alasan/bayar).
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) || null : null;

  const [copyError, setCopyError] = useState<string | null>(null);

  // U7: fallback salin untuk HTTP / permission ditolak + pesan jujur.
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
        setCopyError("Gagal menyalin otomatis — salin manual nomor di atas.");
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
    <div className="space-y-8 font-sans">
      {/* Header Info Akun Pelanggan */}
      <div className="p-6 rounded-2xl bg-surface border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-sans font-extrabold text-2xl shadow-inner">
            {(currentUser?.name || "K")[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-sans text-xl sm:text-2xl font-bold uppercase tracking-tight text-text-primary">
                {currentUser?.name || "Pelanggan Kaos Kami"}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-accent/15 text-brand-accent border border-brand-accent/30 font-sans">
                {currentUser?.role || "CUSTOMER"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {currentUser?.email || "—"} · {currentUser?.phoneNumber || "No. WA Belum Terdaftar"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/studio"
            className="py-2.5 px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(230,81,0,0.3)] flex items-center gap-2"
          >
            <Sparkles size={15} />
            <span>BUAT KUSTOM BARU</span>
          </Link>
        </div>
      </div>

      {/* Welcome Hub & Quick Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bento 1: Pesanan Aktif */}
        <div
          onClick={() => {
            setActiveTab("orders");
            setOrderFilter("ACTIVE");
          }}
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-brand-accent/40 transition-all cursor-pointer shadow-sm group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Pesanan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">{orderCounts.active}</span>
            <span className="text-xs text-text-muted">dalam proses workshop</span>
          </div>
        </div>

        {/* Bento 2: Wardrobe Desain 3D */}
        <div
          onClick={() => setActiveTab("designs")}
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-brand-accent/40 transition-all cursor-pointer shadow-sm group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Wardrobe 3D</span>
            <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle text-text-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">{designs.length}</span>
            <span className="text-xs text-text-muted">dari 5 kuota cloud</span>
          </div>
        </div>

        {/* Bento 3: Promo & Voucher */}
        <div
          onClick={() => setActiveTab("vouchers")}
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-brand-accent/40 transition-all cursor-pointer shadow-sm group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Voucher Toko</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Tag size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-emerald-400">Gratis Ongkir & Potongan</span>
            <span className="text-xs text-text-muted">Makassar</span>
          </div>
        </div>
      </div>

      {/* Real-Time DTF Order Tracker Highlight Banner */}
      {mostActiveOrder && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-brand-accent/10 via-surface to-surface border border-brand-accent/30 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent text-canvas flex items-center justify-center font-bold shadow-[0_0_15px_rgba(230,81,0,0.4)]">
                <Printer size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-text-primary tracking-wide">
                    {mostActiveOrder.orderNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-brand-accent/20 text-brand-accent border border-brand-accent/30 font-sans animate-pulse">
                    {mostActiveOrder.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {mostActiveOrder.items?.[0]?.snapshotName || "Pakaian Kustom"} ({mostActiveOrder.items?.reduce((a, it) => a + it.quantity, 0)} pcs)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/orders/${mostActiveOrder.id}`}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>Lihat Faktur</span>
                <ExternalLink size={12} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("open-kamito-chat", {
                      detail: { orderId: mostActiveOrder.id, orderNumber: mostActiveOrder.orderNumber },
                    })
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Tanya CS Workshop</span>
              </button>
            </div>
          </div>

          {/* Stepper Ringkas 6 Tahap */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
            {ORDER_STEPS.map((step, idx) => {
              const currentStepIdx = getStepIndex(mostActiveOrder.status);
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
                          ? "bg-brand-accent text-canvas ring-4 ring-brand-accent/20 animate-pulse font-black"
                          : "bg-surface border border-border-subtle text-text-muted"
                      }`}
                    >
                      {isDone ? <Check size={12} /> : idx + 1}
                    </div>
                  </div>
                  <span className={`block text-[10.5px] font-bold ${isCurrent ? "text-brand-accent" : isDone ? "text-text-primary" : "text-text-muted"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Developer Persona Indicator (Dosa 6 & Bab 33: Non-intrusive floating pill) */}
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

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-border-subtle gap-2 text-xs">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 flex items-center gap-2 font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
            activeTab === "orders"
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Package size={15} />
          <span>Pesanan Saya ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("designs")}
          className={`pb-3 px-4 flex items-center gap-2 font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
            activeTab === "designs"
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Layers size={15} />
          <span>Koleksi Desain 3D ({designs.length}/5)</span>
        </button>

        <button
          onClick={() => setActiveTab("addresses")}
          className={`pb-3 px-4 flex items-center gap-2 font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
            activeTab === "addresses"
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <MapPin size={15} />
          <span>Profil & Alamat ({addresses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("notifs")}
          className={`pb-3 px-4 flex items-center gap-2 font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
            activeTab === "notifs"
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Notifikasi</span>
        </button>


        <button
          onClick={() => setActiveTab("vouchers")}
          className={`pb-3 px-4 flex items-center gap-2 font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
            activeTab === "vouchers"
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Voucher</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PESANAN + VISUAL STEPPER */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Status Quick Filter Tabs */}
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
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    orderFilter === tab.key
                      ? "bg-brand-accent text-canvas shadow-sm"
                      : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      orderFilter === tab.key
                        ? "bg-black/20 text-white font-black"
                        : "bg-black/5 dark:bg-white/10 text-text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-border-subtle text-text-muted space-y-4">
              <Package size={36} className="mx-auto text-text-muted/60" />
              <p className="text-sm font-bold text-text-primary">Belum Ada Pesanan Aktif</p>
              <p className="text-xs max-w-sm mx-auto">
                Anda belum melakukan pemesanan sablon DTF kustom. Buka 3D Studio untuk mulai mendesain kaos impian Anda!
              </p>
              <Link
                href="/studio"
                className="inline-block px-4 py-2 rounded-xl bg-brand-accent text-canvas text-xs font-bold uppercase hover:brightness-110 transition-all"
              >
                Mulai Desain Sekarang
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-surface border border-border-subtle text-text-muted space-y-3">
              <p className="text-xs font-bold text-text-primary">
                Tidak ada pesanan dengan filter status ini.
              </p>
              <button
                type="button"
                onClick={() => setOrderFilter("ALL")}
                className="px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent text-xs font-bold"
              >
                Tampilkan Semua Pesanan ({orders.length})
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
                    // Klik kartu → modal; abaikan klik dari tombol/aksi existing
                    // agar Repay/Cancel/Reorder/Invoice tetap berfungsi langsung.
                    const t = e.target as HTMLElement | null;
                    if (t?.closest?.("button, a, input, textarea, select")) return;
                    setSelectedOrderId(order.id);
                  }}
                  className="rounded-2xl bg-surface border border-border-subtle p-5 sm:p-6 space-y-5 shadow-sm hover:border-border-strong transition-all cursor-pointer"
                  title="Klik untuk detail status review"
                >
                  {/* Order Top Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-bold text-text-primary text-sm sm:text-base">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isCancelled
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                              : order.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                        {isExpressOrder(order) && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-surface text-text-muted border border-border-subtle">
                            ⚡ EXPRESS 24H
                          </span>
                        )}
                        {(order.notes?.includes("TEST_ORDER") || order.courierNotes?.includes("UJI COBA")) && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-surface text-text-muted border border-border-subtle">
                            🧪 UJI COBA ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-[11px]">
                        Dipesan:{" "}
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · Pengiriman: <strong>{order.deliveryMethod}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-text-muted block">Total Pesanan:</span>
                      <span className="font-bold text-brand-accent text-base sm:text-lg">
                        {formatRupiah(order.totalIdr)}
                      </span>
                    </div>
                  </div>

                  {/* Production ETA Badge (Hanya tampil pada order aktif) */}
                  {!isCancelled && !isFinished && (
                    <div
                      className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                        eta.isExpress
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold"
                          : "bg-brand-accent/10 border-brand-accent/20 text-brand-accent"
                      }`}
                    >
                      <Clock size={14} className="shrink-0" />
                      <span>{eta.badge}</span>
                    </div>
                  )}

                  {/* Banner Alasan Workshop bila Batal / Tolak / Refund */}
                  {(isCancelled || order.status === "REJECTED") && (
                    <div className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                      order.status === "REFUNDED"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] tracking-wider">
                        <AlertCircle size={14} className={order.status === "REFUNDED" ? "text-amber-400 shrink-0" : "text-rose-400 shrink-0"} />
                        <span>
                          {order.status === "REJECTED" && "Desain Ditolak oleh Workshop Kaos Kami"}
                          {order.status === "CANCELLED" && "Pesanan Dibatalkan oleh Workshop"}
                          {order.status === "REFUNDED" && "Dana Telah Dikembalikan (Refund Selesai)"}
                        </span>
                      </div>
                      <p className="text-zinc-200 bg-black/40 p-2.5 rounded-lg border border-white/5 font-sans leading-relaxed text-xs">
                        <span className="text-zinc-400 font-medium">Alasan / Catatan: </span>
                        <span className="font-semibold">{order.reviewNote || "Tidak ada catatan spesifik. Hubungi WhatsApp CS Kaos Kami bila ada pertanyaan."}</span>
                      </p>
                    </div>
                  )}

                  {/* Visual Stepper Tracker (Hanya tampil jika tidak dibatalkan) */}
                  {!isCancelled ? (
                    currentStepIdx < 0 ? (
                      order.status !== "REJECTED" && (
                        <div className="p-3 rounded-xl bg-surface border border-border-subtle text-text-muted text-xs flex items-center gap-2">
                          <AlertCircle size={15} />
                          <span>Status: {order.status.replace(/_/g, " ")} — hubungi CS bila perlu.</span>
                        </div>
                      )
                    ) : (
                    <div className="py-2">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {ORDER_STEPS.map((step, idx) => {
                          const isDone = currentStepIdx > idx;
                          const isCurrent = currentStepIdx === idx;

                          return (
                            <div key={step.key} className="space-y-1.5 text-center">
                              <div className="flex items-center justify-center">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                    isDone
                                      ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                      : isCurrent
                                      ? "bg-brand-accent text-canvas ring-4 ring-brand-accent/20 animate-pulse font-black"
                                      : "bg-black/10 dark:bg-white/10 text-text-muted"
                                  }`}
                                >
                                  {isDone ? <Check size={14} /> : idx + 1}
                                </div>
                              </div>
                              <span
                                className={`block text-[11px] font-bold ${
                                  isCurrent
                                    ? "text-brand-accent"
                                    : isDone
                                    ? "text-text-primary"
                                    : "text-text-muted"
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="hidden sm:block text-[9px] text-text-muted/70 leading-tight">
                                {step.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>Pesanan ini telah dibatalkan / direfund. Silakan hubungi CS jika ada kendala.</span>
                    </div>
                  )}

                  {/* Resi Box jika ada */}
                  {order.trackingNumber && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <Truck size={16} className="text-emerald-500 shrink-0" />
                        <div>
                          <span className="text-text-muted block text-[10px]">NOMOR RESI PENGIRIMAN:</span>
                          <span className="font-bold text-emerald-400 text-sm tracking-wider">
                            {order.trackingNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 w-fit">
                        <button
                          onClick={() => copyResi(order.trackingNumber!)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 w-fit transition-all"
                        >
                          {copiedResi === order.trackingNumber ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copiedResi === order.trackingNumber ? "Tersalin!" : "Salin Resi"}</span>
                        </button>
                        {copyError && <span className="text-[10px] text-amber-400">{copyError}</span>}
                      </div>
                    </div>
                  )}

                  {/* Items List with Size Breakdown Summary */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-text-muted">
                      <span>
                        {order.items.length} jenis item ({totalPcs} pcs)
                      </span>
                      {sizeBreakdown && (
                        <span className="font-bold text-text-primary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md border border-border-subtle">
                          Ukuran: {sizeBreakdown}
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-border-subtle bg-black/5 dark:bg-white/5 rounded-xl p-3 text-xs space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className="font-bold text-text-primary block">
                              #{idx + 1}. {item.snapshotName}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Ukuran: <strong className="text-text-primary">{item.snapshotSize}</strong> · Warna:{" "}
                              <strong className="text-text-primary">{item.snapshotColorName}</strong> · Qty:{" "}
                              <strong className="text-brand-accent">{item.quantity} pcs</strong>
                            </span>
                          </div>
                          <span className="font-bold text-text-primary">
                            {formatRupiah(item.lineTotalIdr)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-text-muted">
                      ID: {order.id.slice(0, 8)}…
                    </span>

                    {/* U10: order PENDING bisa bayar-ulang & batal langsung dari sini. */}
                    {order.status === "PENDING_PAYMENT" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <p className="text-[11px] font-bold text-amber-400">
                          Menunggu pembayaran — selesaikan di sini atau batalkan:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <RepayButton orderId={order.id} />
                          <CancelOrderButton orderId={order.id} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Aksesibel: tombol detail eksplisit (selain klik kartu). */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-brand-accent/15 border border-brand-accent/40 text-brand-accent font-bold transition-all flex items-center gap-1.5 text-xs hover:brightness-110"
                        title="Detail status review & alasan"
                      >
                        <span>DETAIL</span>
                        <ChevronRight size={12} />
                      </button>

                      {/* Tombol tanya Kamito seputar pesanan ini */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("open-kamito-chat", {
                              detail: { orderId: order.id, orderNumber: order.orderNumber },
                            })
                          );
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-amber-500 text-text-primary font-bold hover:text-amber-400 transition-all flex items-center gap-1.5 text-xs"
                        title="Tanya Kamito seputar pesanan ini"
                      >
                        <MessageSquare size={13} className="text-amber-500" />
                        <span>TANYA CS</span>
                      </button>

                      <ReorderButton
                        userId={order.userId || user?.id || ""}
                        items={order.items.map((it) => ({
                          productVariantId: it.productVariantId,
                          designId: it.designId,
                          quantity: it.quantity,
                          unitPriceIdr: it.unitPriceIdr,
                        }))}
                      />

                      {/* U11: satu CTA invoice (dulu dua href identik). */}
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold hover:text-brand-accent transition-all flex items-center gap-1.5 text-xs"
                        title="Buka invoice / cetak nota resmi"
                      >
                        <Printer size={13} className="text-brand-accent" />
                        <span>LIHAT INVOICE</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* U3: muat 25 berikutnya (server cursor). */}
          {(() => {
            const href = moreHref("ordersCursor", ordersNextCursor);
            if (!href) return null;
            return (
              <div className="pt-1 text-center">
                <Link
                  href={href}
                  className="inline-block px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent text-xs font-bold"
                >
                  Muat 25 Pesanan Berikutnya
                </Link>
              </div>
            );
          })()}
          {/* Modal detail (klik kartu / tombol DETAIL): review + alasan + bayar. */}
          {selectedOrder && (
            <OrderDetailModal
              order={selectedOrder}
              onClose={() => setSelectedOrderId(null)}
              isAdmin={canSeeAll}
            />
          )}
        </div>
      )}

      {/* TAB 2: KOLEKSI DESAIN 3D TERSIMPAN */}
      {activeTab === "designs" && (
        <div className="space-y-6">
          {/* Quota Indicator */}
          <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-text-primary block">
                Kapasitas Cloud Storage Akun: {Math.min(designs.length, 5)} / 5 Slot Terpakai
              </span>
              <p className="text-text-muted text-[11px] mt-0.5">
                Setiap akun dialokasikan 5 slot desain cloud. Server menolak simpanan ke-6+.
                {designs.length > 5 && (
                  <span className="text-amber-400 font-bold"> Ada {designs.length - 5} arsip lama di bawah (dibuat sebelum kuota).</span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5 min-w-[140px]">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                  designs.length >= 5
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {designs.length >= 5 ? "Koleksi penuh (5/5) — hapus 1 untuk tambah baru" : `Tersedia ${5 - designs.length} slot lagi`}
              </span>
              {/* Progress-bar tipis kuota cloud (presentasi saja) */}
              <div
                className="w-full max-w-[140px] h-1 rounded-full bg-surface-elevated overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.min(designs.length, 5)}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-label="Kuota desain cloud"
              >
                <div
                  className={`h-full rounded-full transition-all ${designs.length >= 5 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${(Math.min(designs.length, 5) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {designs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-border-subtle text-text-muted space-y-4">
              <Layers size={36} className="mx-auto text-text-muted/60" />
              <p className="text-sm font-bold text-text-primary">Belum Ada Desain Tersimpan</p>
              <p className="text-xs max-w-sm mx-auto">
                Buka 3D Studio, buat grafis sablon kustom Anda, lalu klik tombol Simpan & Ekspor di panel studio!
              </p>
              <Link
                href="/studio"
                className="inline-block px-4 py-2 rounded-xl bg-brand-accent text-canvas text-xs font-bold uppercase hover:brightness-110 transition-all"
              >
                Mulai Desain 3D
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="rounded-2xl bg-surface border border-border-subtle overflow-hidden space-y-3 p-4 hover:border-border-strong transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Visual 3D Preview Image Thumbnail — render snapshot 3D, bukan placeholder */}
                    <div className="w-full h-48 rounded-xl bg-black/20 border border-border-subtle overflow-hidden flex items-center justify-center relative group">
                      {(design.previewImageFrontUrl || design.previewImageBackUrl) &&
                      /^(https?:\/\/|data:image\/)/.test(
                        (design.previewImageFrontUrl || design.previewImageBackUrl) as string
                      ) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(design.previewImageFrontUrl || design.previewImageBackUrl) as string}
                          alt={design.title}
                          loading="lazy"
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center space-y-2 p-4">
                          <div className="w-12 h-12 rounded-2xl mx-auto bg-gradient-to-br from-brand-accent/20 to-transparent border border-border-subtle flex items-center justify-center">
                            <Palette size={20} className="text-text-muted" />
                          </div>
                          <div
                            className="w-10 h-10 rounded-full mx-auto border border-border-strong shadow-md"
                            style={{ backgroundColor: design.colorHex }}
                          />
                          <span className="text-[10px] text-text-muted block font-medium">
                            Preview 3D belum tersedia
                          </span>
                          <span className="text-[10px] text-text-muted/70 block">
                            Warna: {design.colorName} ({design.colorHex})
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] text-white font-bold uppercase">
                        {design.category?.slug || "apparel"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewSide("front");
                          setPreviewDesign(design);
                        }}
                        className="absolute bottom-2 left-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-brand-accent text-white text-[10px] font-bold uppercase backdrop-blur-sm transition-all cursor-pointer"
                        title="Intip mockup 3D ringan (tanpa memuat canvas 3D)"
                      >
                        <Eye size={12} />
                        <span>Intip 3D</span>
                      </button>
                    </div>

                    {/* Card Title & Specs */}
                    <div>
                      <h3 className="font-bold text-text-primary text-sm truncate" title={design.title}>
                        {design.title}
                      </h3>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Ukuran: {design.size} · Warna: {design.colorName}
                      </p>
                    </div>

                    {/* Estimated Price */}
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle flex items-center justify-between text-xs">
                      <span className="text-text-muted text-[11px]">Estimasi Sablon:</span>
                      <span className="font-bold text-brand-accent">
                        {formatRupiah(design.calculatedPriceIdr)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: 1-Click Pesan Sekarang + Buka di 3D Studio + Unduh Mockup */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderingDesign(design);
                        setOrderDesignSize(design.size || "L");
                        setOrderDesignQty(1);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-brand-accent hover:brightness-110 active:scale-98 text-canvas font-bold text-center flex items-center justify-center gap-1.5 transition-all text-xs uppercase shadow-md cursor-pointer"
                      title="Pesan langsung tanpa membuka 3D studio"
                    >
                      <ShoppingBag size={14} />
                      <span>PESAN SEKARANG</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/studio?designId=${design.id}`}
                        className="py-2 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-center flex items-center justify-center gap-1 transition-all text-[11px] uppercase hover:text-brand-accent cursor-pointer"
                        title="Buka dan edit desain di 3D Studio"
                      >
                        <Sparkles size={12} className="text-brand-accent" />
                        <span>EDIT 3D</span>
                      </Link>

                      {design.previewImageFrontUrl ? (
                        <a
                          href={design.previewImageFrontUrl}
                          download={`${design.title.toLowerCase().replace(/\s+/g, "-")}-mockup.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-center flex items-center justify-center gap-1 transition-all text-[11px] uppercase hover:text-brand-accent cursor-pointer"
                          title="Unduh foto mockup 2K"
                        >
                          <Download size={12} className="text-brand-accent" />
                          <span>UNDUH</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="py-2 px-2 rounded-xl bg-surface border border-border-subtle opacity-40 text-text-muted text-[11px] font-bold text-center flex items-center justify-center gap-1"
                        >
                          <Download size={12} />
                          <span>UNDUH</span>
                        </button>
                      )}
                    </div>

                    <DesignCardActions id={design.id} title={design.title} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* U3: muat 5 desain berikutnya (server cursor). */}
          {(() => {
            const href = moreHref("designsCursor", designsNextCursor);
            if (!href) return null;
            return (
              <div className="pt-1 text-center">
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

      {/* TAB 3: PROFIL & BUKU ALAMAT */}
      {activeTab === "addresses" && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. Pengelolaan Identitas Profil */}
          <UserProfileCard
            user={currentUser}
            onProfileUpdated={(updated) => setCurrentUser((prev: any) => ({ ...prev, ...updated }))}
          />

          {/* 2. Pengelolaan Buku Alamat Interaktif dengan GPS */}
          <AddressBook
            initial={addresses}
            defaultRecipientName={currentUser?.name || ""}
            defaultPhoneNumber={currentUser?.phoneNumber || ""}
          />
        </div>
      )}

      {/* TAB 4: NOTIFIKASI STATUS PESANAN */}
      {activeTab === "notifs" && (
        <div className="rounded-2xl bg-surface border border-border-subtle p-5 sm:p-6">
          <NotificationList />
        </div>
      )}

      {/* TAB 5: VOUCHER SAYA */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          <VoucherShelf />
        </div>
      )}

      {/* Modal 1-Click Instant Order for Wardrobe Design */}
      {orderingDesign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOrderingDesign(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pesan desain langsung"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface border border-border-subtle p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-brand-accent" />
                <h3 className="font-bold text-base text-text-primary">Pesan Desain Langsung</h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderingDesign(null)}
                className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border-subtle">
              <div className="w-14 h-14 rounded-lg bg-black/20 border border-border-subtle overflow-hidden flex items-center justify-center shrink-0">
                {orderingDesign.previewImageFrontUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={orderingDesign.previewImageFrontUrl}
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
                <h4 className="font-bold text-sm text-text-primary truncate">{orderingDesign.title}</h4>
                <p className="text-xs text-text-muted">{orderingDesign.colorName} · {orderingDesign.category?.name || "Kaos Sablon"}</p>
                <p className="text-xs font-bold text-brand-accent mt-0.5 font-mono">
                  Rp {orderingDesign.calculatedPriceIdr.toLocaleString("id-ID")} / pcs
                </p>
              </div>
            </div>

            {/* Pilihan Ukuran */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted block">PILIH UKURAN:</label>
              <div className="grid grid-cols-5 gap-2">
                {["S", "M", "L", "XL", "XXL"].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setOrderDesignSize(sz)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      orderDesignSize === sz
                        ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Kuantitas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted block">JUMLAH (PCS):</label>
                {orderDesignQty >= 6 && (
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                    Diskon grosir aktif ({orderDesignQty >= 13 ? "12%" : "5%"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOrderDesignQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent font-bold text-base flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={orderDesignQty}
                  onChange={(e) => setOrderDesignQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="flex-1 py-2 px-3 rounded-xl bg-surface border border-border-subtle text-center font-mono font-bold text-base text-text-primary focus:outline-none focus:border-brand-accent"
                />
                <button
                  type="button"
                  onClick={() => setOrderDesignQty((q) => Math.min(100, q + 1))}
                  className="w-10 h-10 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent font-bold text-base flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Perkiraan & Tombol Masuk Keranjang */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-text-muted">Subtotal ({orderDesignQty} pcs):</span>
                <span className="text-brand-accent text-base font-mono">
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
                  });
                  setOrderingDesign(null);
                  openCart();
                }}
                className="w-full py-3 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag size={15} />
                <span>+ TAMBAHKAN KE KERANJANG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bab 52/53 (1) — Mini 3D viewer ringan: <img> mockup statis + toggle depan/belakang.
          SENGAJA tanpa canvas Three.js agar ringan (hover-zoom CSS sebagai "rotatable" minimal). */}
      {previewDesign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewDesign(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau desain ${previewDesign.title}`}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface border border-border-subtle p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2 min-w-0">
                <Eye size={18} className="text-brand-accent shrink-0" />
                <h3 className="font-bold text-base text-text-primary truncate" title={previewDesign.title}>
                  {previewDesign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary cursor-pointer"
                aria-label="Tutup pratinjau"
              >
                <X size={16} />
              </button>
            </div>

            <div className="w-full h-64 rounded-xl bg-black/20 border border-border-subtle overflow-hidden flex items-center justify-center group">
              {(() => {
                const src =
                  previewSide === "back" && previewDesign.previewImageBackUrl
                    ? previewDesign.previewImageBackUrl
                    : previewDesign.previewImageFrontUrl || previewDesign.previewImageBackUrl;
                return src && /^(https?:\/\/|data:image\/)/.test(src) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={`${previewDesign.title} — ${previewSide === "front" ? "depan" : "belakang"}`}
                    loading="lazy"
                    className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full border border-border-strong shadow-md"
                    style={{ backgroundColor: previewDesign.colorHex }}
                  />
                );
              })()}
            </div>

            {previewDesign.previewImageFrontUrl && previewDesign.previewImageBackUrl && (
              <div className="grid grid-cols-2 gap-2">
                {(["front", "back"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPreviewSide(s)}
                    className={`py-2 rounded-xl text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                      previewSide === s
                        ? "bg-brand-accent text-canvas border-brand-accent"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {s === "front" ? "Depan" : "Belakang"}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] text-text-muted">
              Ukuran: {previewDesign.size} · Warna: {previewDesign.colorName} ·{" "}
              {formatRupiah(previewDesign.calculatedPriceIdr)}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
              <Link
                href={`/studio?designId=${previewDesign.id}`}
                className="py-2.5 px-2 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-bold text-center flex items-center justify-center gap-1 transition-all text-[11px] uppercase cursor-pointer"
                title="Buka dan edit desain di 3D Studio"
              >
                <Sparkles size={12} />
                <span>EDIT 3D</span>
              </Link>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-center transition-all text-[11px] uppercase cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
