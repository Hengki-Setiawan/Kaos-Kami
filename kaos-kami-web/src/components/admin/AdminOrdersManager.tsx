"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  FileText,
  ExternalLink,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  X,
  ChevronRight,
  Send,
  HelpCircle,
  Truck,
  Phone,
  User,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Layers,
  Boxes,
  Tag,
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";

const OrderInspector3D = dynamic(() => import("@/components/admin/OrderInspector3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-xs bg-black/40 gap-2">
      <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      <span>Memuat 3D Canvas...</span>
    </div>
  ),
});

export interface OrderItemRow {
  id: string;
  orderId: string;
  quantity: number;
  unitPriceIdr: number;
  lineTotalIdr: number;
  snapshotName: string;
  snapshotImageUrl?: string | null;
  snapshotSize: string;
  snapshotColorName: string;
  snapshotColorHex?: string | null;
  designId?: string | null;
  design?: any;
  productVariantId?: string | null;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  deliveryMethod: string;
  subtotalIdr: number;
  shippingCostIdr: number;
  discountIdr: number;
  totalIdr: number;
  courierNotes?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | Date | null;
  createdAt: string | Date;
  items: OrderItemRow[];
  user?: {
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
  shippingAddress?: {
    recipientName?: string | null;
    phoneNumber?: string | null;
    fullAddress?: string | null;
    city?: string | null;
    district?: string | null;
  } | null;
  payment?: {
    method?: string | null;
    status: string;
  } | null;
}

export type OrderChannel = "all" | "studio" | "ecommerce";

function isOrderStudio(order: OrderRow): boolean {
  return order.items.some((it) => Boolean(it.designId || it.design));
}

function getStatusBadge(status: string) {
  switch (status) {
    case "DESIGN_REVIEW":
      return {
        label: "Perlu Review Desain",
        bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500 animate-pulse",
      };
    case "PENDING_PAYMENT":
      return {
        label: "Menunggu Bayar",
        bg: "bg-stone-500/15 text-stone-600 dark:text-stone-300 border-stone-500/30",
        dot: "bg-stone-400",
      };
    case "PAYMENT_CONFIRMED":
      return {
        label: "Lunas / Siap Kemas",
        bg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        dot: "bg-cyan-500",
      };
    case "IN_PRODUCTION_QUEUE":
      return {
        label: "Antrean Sablon",
        bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dot: "bg-blue-500",
      };
    case "PRINTING":
      return {
        label: "Sedang Sablon DTF",
        bg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        dot: "bg-indigo-500 animate-ping",
      };
    case "QUALITY_CHECK":
      return {
        label: "Pemeriksaan QC",
        bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        dot: "bg-purple-500",
      };
    case "READY_TO_SHIP":
      return {
        label: "Siap Kirim / Diantar",
        bg: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
        dot: "bg-violet-500",
      };
    case "SHIPPED":
      return {
        label: "Dalam Pengiriman",
        bg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        dot: "bg-sky-500",
      };
    case "DELIVERED":
    case "COMPLETED":
      return {
        label: "Selesai",
        bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        label: "Desain Ditolak",
        bg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
        dot: "bg-rose-500",
      };
    case "CANCELLED":
    case "REFUNDED":
      return {
        label: "Dibatalkan",
        bg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        dot: "bg-rose-400",
      };
    default:
      return {
        label: status,
        bg: "bg-neutral-500/15 text-text-primary border-neutral-500/30",
        dot: "bg-neutral-400",
      };
  }
}

export function AdminOrdersManager({
  orders: initialOrders,
  totalCount,
  studioCount = 0,
  ecommerceCount = 0,
  currentPage,
  totalPages,
  currentChannel = "all",
  currentStatus,
  currentQuery,
  baseUrl = "/admin",
}: {
  orders: OrderRow[];
  totalCount: number;
  studioCount?: number;
  ecommerceCount?: number;
  currentPage: number;
  totalPages: number;
  currentChannel?: OrderChannel;
  currentStatus: string;
  currentQuery: string;
  baseUrl?: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");

  // State untuk quick action E-Commerce
  const [quickTracking, setQuickTracking] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // State untuk form aksi review Studio
  const [actionType, setActionType] = useState<"APPROVE" | "REVISE" | "REJECT" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const cleanPhoneForWa = (p?: string | null) => {
    if (!p) return "";
    const num = p.replace(/\D/g, "");
    return num.startsWith("0") ? `62${num.slice(1)}` : num;
  };

  const getInspectorSeed = (order: OrderRow | null) => {
    if (!order || !order.items || order.items.length === 0) return null;
    try {
      const first = order.items[0];
      const d: any = (first as any)?.design;
      if (d?.decals) {
        const decals = typeof d.decals === "string" ? JSON.parse(d.decals) : d.decals;
        if (Array.isArray(decals)) {
          const slug = String((d as any)?.category?.slug || "").toLowerCase();
          return {
            decals,
            colorHex: String((first as any)?.snapshotColorHex || d.colorHex || "#121214"),
            colorName: String((first as any)?.snapshotColorName || d.colorName || "Custom"),
            size: String((first as any)?.snapshotSize || "L"),
            apparel: (["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"].includes(slug) ? slug : "tshirt") as any,
          };
        }
      }
    } catch {}
    return null;
  };

  // Helper membuat URL navigasi filter
  const buildFilterUrl = (channelVal: string, statusVal?: string) => {
    const s = new URLSearchParams();
    if (channelVal && channelVal !== "all") s.set("channel", channelVal);
    if (statusVal) s.set("status", statusVal);
    if (currentQuery) s.set("q", currentQuery);
    return `${baseUrl}?${s.toString()}`;
  };

  // Sub-tabs status berdasarkan channel aktif
  const getSubTabs = () => {
    if (currentChannel === "ecommerce") {
      return [
        { id: "ALL", label: "Semua Produk Jadi", statusVal: "" },
        { id: "PENDING_PAYMENT", label: "Belum Bayar", statusVal: "PENDING_PAYMENT" },
        { id: "READY_TO_SHIP", label: "Siap Kemas & Kirim", statusVal: "READY_TO_SHIP" },
        { id: "SHIPPED", label: "Dalam Pengiriman", statusVal: "SHIPPED" },
        { id: "COMPLETED", label: "Selesai", statusVal: "COMPLETED" },
        { id: "CANCELLED", label: "Dibatalkan", statusVal: "CANCELLED" },
      ];
    }
    if (currentChannel === "studio") {
      return [
        { id: "ALL", label: "Semua Kustom Sablon", statusVal: "" },
        { id: "DESIGN_REVIEW", label: "Perlu Review Desain", statusVal: "DESIGN_REVIEW" },
        { id: "PENDING_PAYMENT", label: "Belum Bayar", statusVal: "PENDING_PAYMENT" },
        { id: "READY_PRODUCTION", label: "Siap Produksi", statusVal: "PAYMENT_CONFIRMED" },
        { id: "IN_PRODUCTION", label: "Proses Sablon / QC", statusVal: "PRINTING" },
        { id: "READY_TO_SHIP", label: "Siap Kirim / Kurir", statusVal: "READY_TO_SHIP" },
        { id: "COMPLETED", label: "Selesai", statusVal: "COMPLETED" },
        { id: "REJECTED", label: "Ditolak / Batal", statusVal: "REJECTED" },
      ];
    }
    // All channels
    return [
      { id: "ALL", label: "Semua Status", statusVal: "" },
      { id: "DESIGN_REVIEW", label: "Perlu Review", statusVal: "DESIGN_REVIEW" },
      { id: "PENDING_PAYMENT", label: "Belum Bayar", statusVal: "PENDING_PAYMENT" },
      { id: "READY_PRODUCTION", label: "Siap Kemas / Produksi", statusVal: "PAYMENT_CONFIRMED" },
      { id: "IN_PRODUCTION", label: "Sablon / QC", statusVal: "PRINTING" },
      { id: "READY_TO_SHIP", label: "Siap Kirim / Diantar", statusVal: "READY_TO_SHIP" },
      { id: "SHIPPED", label: "Di Jalan (Kurir)", statusVal: "SHIPPED" },
      { id: "COMPLETED", label: "Selesai", statusVal: "COMPLETED" },
      { id: "CANCELLED", label: "Batal / Tolak", statusVal: "CANCELLED" },
    ];
  };

  // Quick Action untuk mengubah status pesanan (khusus E-Commerce / Fast Track)
  const handleUpdateOrderStatus = async (newStatus: string, trackingNum?: string) => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    setStatusFeedback(null);

    const payload: Record<string, any> = { status: newStatus };
    if (trackingNum) {
      payload.trackingNumber = trackingNum.trim();
    }

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status pesanan.");
      }

      // Update state order lokal
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== selectedOrder.id) return o;
          return {
            ...o,
            status: newStatus,
            trackingNumber: trackingNum ? trackingNum.trim() : o.trackingNumber,
          };
        })
      );

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              trackingNumber: trackingNum ? trackingNum.trim() : prev.trackingNumber,
            }
          : null
      );

      setStatusFeedback({
        ok: true,
        msg: `Pesanan berhasil diubah menjadi: ${getStatusBadge(newStatus).label}`,
      });
      setTimeout(() => {
        setStatusFeedback(null);
      }, 2500);
      router.refresh();
    } catch (err: any) {
      setStatusFeedback({ ok: false, msg: err.message || "Gagal memproses aksi status." });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Review Desain (Khusus Studio 3D)
  const handleExecuteReview = async () => {
    if (!selectedOrder || !actionType) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    let payload: Record<string, any> = {};
    if (actionType === "APPROVE") {
      payload = { reviewAction: "APPROVE", reviewNote: actionReason.trim() || undefined };
    } else if (actionType === "REVISE") {
      if (!actionReason.trim()) {
        setActionFeedback({ ok: false, msg: "Mohon tuliskan instruksi saran revisi desain untuk pelanggan." });
        setIsSubmitting(false);
        return;
      }
      payload = { reviewAction: "REQUEST_REVISION", reviewNote: actionReason.trim() };
    } else if (actionType === "REJECT") {
      if (!actionReason.trim()) {
        setActionFeedback({ ok: false, msg: "Mohon tuliskan alasan penolakan pesanan." });
        setIsSubmitting(false);
        return;
      }
      payload = { reviewAction: "REJECT", reviewNote: actionReason.trim() };
    }

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses aksi review.");
      }

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== selectedOrder.id) return o;
          return {
            ...o,
            status: json.status || o.status,
            reviewNote: actionReason.trim() || o.reviewNote,
          };
        })
      );

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: json.status || prev.status,
              reviewNote: actionReason.trim() || prev.reviewNote,
            }
          : null
      );

      setActionFeedback({ ok: true, msg: json.message || "Aksi review berhasil diproses!" });
      setTimeout(() => {
        setActionType(null);
        setActionReason("");
        setActionFeedback(null);
      }, 1800);
      router.refresh();
    } catch (err: any) {
      setActionFeedback({ ok: false, msg: err.message || "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelectedStudio = selectedOrder ? isOrderStudio(selectedOrder) : false;

  return (
    <div className="space-y-5">
      {/* 1. TOP SEGMENTED JALUR SWITCHER (STUDIO vs E-COMMERCE) */}
      <div className="p-1.5 rounded-2xl bg-surface border border-border-subtle shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {/* Opsi 1: Semua Jalur */}
          <Link
            href={buildFilterUrl("all")}
            className={`p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
              currentChannel === "all"
                ? "bg-brand-accent text-canvas shadow-sm"
                : "bg-canvas hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-text-primary"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  currentChannel === "all"
                    ? "bg-white/20 text-canvas"
                    : "bg-brand-accent/10 text-brand-accent"
                }`}
              >
                <Boxes size={16} />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs block leading-tight truncate">
                  Semua Pesanan
                </span>
                <span
                  className={`text-[10px] block leading-tight mt-0.5 truncate ${
                    currentChannel === "all" ? "text-canvas/80" : "text-text-muted"
                  }`}
                >
                  Gabungan Studio & E-Commerce
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                currentChannel === "all"
                  ? "bg-white/25 text-canvas"
                  : "bg-surface border border-border-subtle text-text-muted"
              }`}
            >
              {totalCount}
            </span>
          </Link>

          {/* Opsi 2: Jalur 3D Studio (Custom DTF) */}
          <Link
            href={buildFilterUrl("studio")}
            className={`p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
              currentChannel === "studio"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-canvas hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-text-primary"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  currentChannel === "studio"
                    ? "bg-white/20 text-white"
                    : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                }`}
              >
                <Layers size={16} />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs block leading-tight truncate">
                  Jalur 3D Studio (Custom)
                </span>
                <span
                  className={`text-[10px] block leading-tight mt-0.5 truncate ${
                    currentChannel === "studio" ? "text-white/80" : "text-text-muted"
                  }`}
                >
                  Sablon DTF · Butuh Cetak Film
                </span>
              </div>
            </div>
            {studioCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                  currentChannel === "studio"
                    ? "bg-white/25 text-white"
                    : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                }`}
              >
                {studioCount}
              </span>
            )}
          </Link>

          {/* Opsi 3: Jalur E-Commerce (Produk Jadi) */}
          <Link
            href={buildFilterUrl("ecommerce")}
            className={`p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
              currentChannel === "ecommerce"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-canvas hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-text-primary"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  currentChannel === "ecommerce"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <ShoppingBag size={16} />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs block leading-tight truncate">
                  Jalur E-Commerce (Katalog)
                </span>
                <span
                  className={`text-[10px] block leading-tight mt-0.5 truncate ${
                    currentChannel === "ecommerce" ? "text-white/80" : "text-text-muted"
                  }`}
                >
                  Ready Stock · Siap Kemas & Kirim
                </span>
              </div>
            </div>
            {ecommerceCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                  currentChannel === "ecommerce"
                    ? "bg-white/25 text-white"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {ecommerceCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 2. SUB-TAB STATUS SESUAI JALUR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin border-b border-border-subtle text-xs font-sans">
        {getSubTabs().map((tab) => {
          const isActive = tab.id === "ALL" ? !currentStatus : currentStatus === tab.statusVal;
          const href = buildFilterUrl(currentChannel, tab.statusVal);
          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-brand-accent text-canvas shadow-xs"
                  : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* 3. TABEL PESANAN TERPADU */}
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-lg font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-[11px] text-text-muted font-bold uppercase tracking-wider bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="px-4 py-3.5">Pesanan & Jalur</th>
                <th className="px-4 py-3.5">Pemesan (WA Asli)</th>
                <th className="px-4 py-3.5">Apparel / Item</th>
                <th className="px-4 py-3.5">Total & Bayar</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const rawWa = order.user?.phoneNumber || order.shippingAddress?.phoneNumber || "";
                const waLink = rawWa ? `https://wa.me/${cleanPhoneForWa(rawWa)}` : null;
                const isStudio = isOrderStudio(order);

                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* No Order, Tanggal & Badge Jalur */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-brand-accent group-hover:underline">
                          {order.orderNumber}
                        </span>
                        {order.courierNotes?.includes("EXPRESS") && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                            Express
                          </span>
                        )}
                      </div>

                      {/* Tag Jalur */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {isStudio ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                            <Layers size={10} />
                            <span>3D STUDIO</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <ShoppingBag size={10} />
                            <span>E-COMMERCE</span>
                          </span>
                        )}

                        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                          <Clock size={10} />
                          <span>
                            {new Date(order.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Pemesan (Unmasked Phone + WhatsApp Link Langsung) */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-text-primary">
                        {order.user?.name || order.shippingAddress?.recipientName || "Pelanggan Tamu"}
                      </div>
                      {rawWa ? (
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="font-mono text-text-muted">{rawWa}</span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold flex items-center gap-0.5 text-[10px] transition-all"
                              title="Kirim pesan WhatsApp langsung"
                            >
                              <MessageCircle size={10} />
                              <span>WA</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-muted text-[11px]">—</span>
                      )}
                    </td>

                    {/* Apparel / Item Details */}
                    <td className="px-4 py-3.5">
                      <div className="text-text-primary font-medium truncate max-w-[220px]">
                        {order.items[0]?.snapshotName || "Kustom DTF Apparel"}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                        <span>{order.items.length} item</span>
                        <span>·</span>
                        <span>Size {order.items[0]?.snapshotSize || "L"}</span>
                        <span>·</span>
                        <span>{order.items[0]?.snapshotColorName || "Warna Standar"}</span>
                      </div>
                    </td>

                    {/* Total & Status Bayar Gateway iPaymu */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-text-primary">
                        Rp {order.totalIdr.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            order.payment?.status === "SETTLEMENT"
                              ? "bg-emerald-500"
                              : "bg-stone-400"
                          }`}
                        />
                        <span className="font-medium">
                          {order.payment?.status === "SETTLEMENT" ? "Lunas" : "Belum Bayar"}
                        </span>
                        <span>· {order.deliveryMethod}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Tindakan */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold hover:text-brand-accent transition-all inline-flex items-center gap-1 text-xs cursor-pointer shadow-xs"
                      >
                        <Eye size={12} />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="p-12 text-center text-text-muted space-y-2">
            <Package size={36} className="mx-auto opacity-30" />
            <p className="font-bold text-xs text-text-primary">Tidak ada pesanan ditemukan</p>
            <p className="text-[11px]">
              {currentQuery
                ? `Tidak ada hasil untuk pencarian "${currentQuery}".`
                : "Belum ada pesanan pada filter ini."}
            </p>
          </div>
        )}
      </div>

      {/* 4. MODAL / DRAWER RINCIAN & AKSI CEPAT IN-PAGE */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in font-sans text-xs"
          onClick={() => {
            setSelectedOrder(null);
            setActionType(null);
            setStatusFeedback(null);
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-border-subtle rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelectedStudio
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isSelectedStudio ? <Layers size={18} /> : <ShoppingBag size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-text-primary font-mono">
                      #{selectedOrder.orderNumber}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        getStatusBadge(selectedOrder.status).bg
                      }`}
                    >
                      {getStatusBadge(selectedOrder.status).label}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-2">
                    <span>
                      Jalur:{" "}
                      <strong>
                        {isSelectedStudio ? "3D Studio Sablon DTF" : "E-Commerce Produk Jadi"}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(selectedOrder.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setActionType(null);
                  setStatusFeedback(null);
                }}
                className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-all cursor-pointer"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable, 2 Kolom) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Kiri: Pratinjau Desain / Produk Jadi */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Eye size={14} className="text-brand-accent" />
                    <span>
                      {isSelectedStudio
                        ? "Pratinjau Desain & Sablon 3D"
                        : "Rincian Item Katalog Produk Jadi"}
                    </span>
                  </h3>

                  {/* Toggle 2D vs 3D Orbit (Khusus Studio) */}
                  {isSelectedStudio && (
                    <div className="flex items-center p-0.5 rounded-xl bg-black/10 dark:bg-white/10 border border-border-subtle text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("2d")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          previewMode === "2d"
                            ? "bg-brand-accent text-canvas shadow-xs"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        2D Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("3d")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          previewMode === "3d"
                            ? "bg-brand-accent text-canvas shadow-xs"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        3D Orbit
                      </button>
                    </div>
                  )}
                </div>

                {/* Tampilan 3D Orbit khusus Studio */}
                {isSelectedStudio && previewMode === "3d" ? (
                  <div className="space-y-2">
                    <div className="h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-border-subtle bg-[#0e0e10] relative">
                      <OrderInspector3D seed={getInspectorSeed(selectedOrder)} />
                      <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-black/75 text-[10px] text-white/80 font-mono text-center pointer-events-none">
                        Drag untuk putar 360° · Scroll untuk zoom
                      </div>
                    </div>
                    <p className="text-[10px] text-text-muted text-center">
                      Model 3D interaktif dari item pesanan #{selectedOrder.orderNumber}.
                    </p>
                  </div>
                ) : (
                  selectedOrder.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle space-y-3"
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/20 relative flex items-center justify-center border border-border-subtle">
                        {item.snapshotImageUrl ? (
                          <img
                            src={item.snapshotImageUrl}
                            alt={item.snapshotName}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-center p-4 text-text-muted">
                            <Package size={36} className="mx-auto mb-1 opacity-40" />
                            <span className="text-[11px]">Mockup snapshot otomatis</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-md">
                          {item.snapshotColorName} · Size {item.snapshotSize}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-text-primary">{item.snapshotName}</h4>
                        <p className="text-xs text-text-muted mt-0.5">
                          {item.quantity} pcs × Rp {item.unitPriceIdr.toLocaleString("id-ID")} ={" "}
                          <span className="font-bold text-text-primary">
                            Rp {item.lineTotalIdr.toLocaleString("id-ID")}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Catatan Khusus Pelanggan */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">
                    Catatan Khusus dari Pelanggan:
                  </span>
                  <p className="text-xs text-text-primary">
                    {selectedOrder.notes || selectedOrder.courierNotes || "Tidak ada catatan khusus dari pembeli."}
                  </p>
                </div>

                {/* Catatan Review Workshop (Bila Ada) */}
                {selectedOrder.reviewNote && (
                  <div className="p-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/30 space-y-1">
                    <span className="text-[11px] font-bold text-brand-accent block">
                      Catatan / Feedback Terakhir dari Workshop:
                    </span>
                    <p className="text-xs text-text-primary">{selectedOrder.reviewNote}</p>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Data Pelanggan, Logistik & Panel Aksi */}
              <div className="space-y-4">
                {/* Info Pemesan & Kontak */}
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <User size={14} className="text-brand-accent" />
                    <span>Kontak & Pengiriman</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Nama Pelanggan:</span>
                      <span className="font-bold text-text-primary">
                        {selectedOrder.user?.name || selectedOrder.shippingAddress?.recipientName || "Pelanggan Tamu"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Nomor WhatsApp:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">
                          {selectedOrder.user?.phoneNumber || selectedOrder.shippingAddress?.phoneNumber || "—"}
                        </span>
                        {selectedOrder.user?.phoneNumber && (
                          <a
                            href={`https://wa.me/${cleanPhoneForWa(selectedOrder.user.phoneNumber)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold transition-all flex items-center gap-1 text-[10px]"
                          >
                            <MessageCircle size={10} />
                            <span>Hubungi WA</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-text-muted">Metode Pengiriman:</span>
                      <span className="font-bold text-text-primary">{selectedOrder.deliveryMethod}</span>
                    </div>

                    {selectedOrder.trackingNumber && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
                        <span className="text-sky-700 dark:text-sky-300 font-bold">Nomor Resi:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {selectedOrder.trackingNumber}
                        </span>
                      </div>
                    )}

                    {selectedOrder.shippingAddress?.fullAddress && (
                      <div className="pt-2 border-t border-border-subtle">
                        <span className="text-text-muted block mb-1">Alamat Pengiriman:</span>
                        <p className="text-text-primary leading-relaxed bg-black/5 dark:bg-white/5 p-2.5 rounded-xl">
                          {selectedOrder.shippingAddress.fullAddress}
                          {selectedOrder.shippingAddress.district && `, ${selectedOrder.shippingAddress.district}`}
                          {selectedOrder.shippingAddress.city && `, ${selectedOrder.shippingAddress.city}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ringkasan Finansial */}
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal Produk:</span>
                    <span className="font-mono">Rp {selectedOrder.subtotalIdr.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Ongkos Kirim:</span>
                    <span className="font-mono">Rp {selectedOrder.shippingCostIdr.toLocaleString("id-ID")}</span>
                  </div>
                  {selectedOrder.discountIdr > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Potongan Diskon:</span>
                      <span className="font-mono">-Rp {selectedOrder.discountIdr.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border-subtle text-sm font-bold">
                    <span>Total Pembayaran:</span>
                    <span className="text-brand-accent font-mono">
                      Rp {selectedOrder.totalIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Feedback Toast */}
                {statusFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      statusFeedback.ok
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {statusFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{statusFeedback.msg}</span>
                  </div>
                )}

                {/* PANEL AKSI JALUR E-COMMERCE (PRODUK JADI · FAST TRACK) */}
                {!isSelectedStudio ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Zap size={14} />
                        <span>Aksi Cepat Jalur E-Commerce</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Bypass Sablon
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Produk jadi katalog siap diproses langsung tanpa melalui meja sablon kanban.
                    </p>

                    {/* Tombol Aksi Cepat E-Commerce */}
                    <div className="space-y-2 pt-1">
                      {selectedOrder.status !== "READY_TO_SHIP" && selectedOrder.status !== "SHIPPED" && selectedOrder.status !== "COMPLETED" && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleUpdateOrderStatus("READY_TO_SHIP")}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Check size={14} />
                          <span>Tandai Siap Kemas (Ready to Ship)</span>
                        </button>
                      )}

                      {/* Input Nomor Resi & Dispatch Kirim */}
                      {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                        <div className="p-3 rounded-xl bg-surface border border-border-subtle space-y-2">
                          <span className="font-bold text-[11px] text-text-primary block">
                            Kirim Paket & Input Nomor Resi Ekspedisi:
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={quickTracking}
                              onChange={(e) => setQuickTracking(e.target.value)}
                              placeholder={selectedOrder.trackingNumber || "Nomor Resi / Nama Kurir..."}
                              className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs focus:outline-none focus:border-brand-accent font-mono"
                            />
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleUpdateOrderStatus("SHIPPED", quickTracking || selectedOrder.trackingNumber || "DIANTAR_TIM_MAKASSAR")}
                              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Truck size={13} />
                              <span>Kirim</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === "SHIPPED" && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleUpdateOrderStatus("COMPLETED")}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 size={14} />
                          <span>Tandai Pesanan Selesai (Completed)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* PANEL AKSI JALUR STUDIO (SABLON DTF · WORKSHOP REVIEW) */
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-500" />
                        <span>Aksi Workshop & Sablon DTF</span>
                      </span>
                      <Link
                        href={`/admin/orders/${selectedOrder.id}/job-ticket`}
                        target="_blank"
                        className="text-[11px] font-bold text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <FileText size={12} />
                        <span>Job Ticket A4</span>
                      </Link>
                    </div>

                    {actionType ? (
                      <div className="space-y-3 pt-2 border-t border-border-subtle">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">
                            {actionType === "APPROVE" && "Konfirmasi Setujui Desain"}
                            {actionType === "REVISE" && "Minta Revisi Desain ke Pelanggan"}
                            {actionType === "REJECT" && "Tolak Pesanan Ini"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActionType(null);
                              setActionReason("");
                              setActionFeedback(null);
                            }}
                            className="text-text-muted hover:text-text-primary text-xs"
                          >
                            Batal
                          </button>
                        </div>

                        <textarea
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          placeholder={
                            actionType === "APPROVE"
                              ? "Catatan opsional untuk workshop sablon..."
                              : actionType === "REVISE"
                              ? "Tuliskan saran revisi desain (contoh: Resolusi gambar buram, upload PNG >300 DPI)..."
                              : "Tuliskan alasan penolakan pesanan..."
                          }
                          rows={3}
                          className="w-full p-3 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none"
                        />

                        {actionFeedback && (
                          <div
                            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                              actionFeedback.ok
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {actionFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            <span>{actionFeedback.msg}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleExecuteReview}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            actionType === "APPROVE"
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : actionType === "REVISE"
                              ? "bg-amber-600 hover:bg-amber-500"
                              : "bg-rose-600 hover:bg-rose-500"
                          } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <Send size={13} />
                          <span>{isSubmitting ? "Memproses..." : "Kirim Keputusan Workshop"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActionType("APPROVE");
                            setActionReason("");
                          }}
                          className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition-all text-xs flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 size={16} />
                          <span>Setujui</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionType("REVISE");
                            setActionReason("");
                          }}
                          className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500 hover:text-white transition-all text-xs flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={16} />
                          <span>Minta Revisi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionType("REJECT");
                            setActionReason("");
                          }}
                          className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500 hover:text-white transition-all text-xs flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <XCircle size={16} />
                          <span>Tolak</span>
                        </button>
                      </div>
                    )}

                    {/* Tautan ke Workshop Sablon & Gang Sheet */}
                    <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                      <Link
                        href="/admin/production"
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Layers size={12} />
                        <span>Ke Meja Sablon DTF</span>
                      </Link>
                      <Link
                        href="/admin/gang-sheet"
                        className="text-[11px] font-bold text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <Boxes size={12} />
                        <span>Ke Gang Sheet DTF</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-black/5 dark:bg-white/5 border-t border-border-subtle flex items-center justify-between shrink-0">
              <Link
                href={`/admin/orders/${selectedOrder.id}`}
                target="_blank"
                className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
              >
                <ExternalLink size={13} />
                <span>Buka Detail Halaman Penuh</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setActionType(null);
                  setStatusFeedback(null);
                }}
                className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold hover:border-brand-accent transition-all text-xs cursor-pointer"
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
