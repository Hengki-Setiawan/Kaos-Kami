"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  MapPin,
  MessageSquare,
  CheckCircle,
  Package,
  ExternalLink,
  RefreshCw,
  Phone,
  Bike,
  Store,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Printer,
  Link2,
  Copy,
  History,
} from "lucide-react";
import { ThermalShippingLabelModal } from "@/components/admin/ThermalShippingLabelModal";
import { ActivityHistoryModal } from "@/components/admin/ActivityHistoryModal";

export const dynamic = "force-dynamic";

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod?: string | null;
  trackingNumber?: string | null;
  courierNotes?: string | null;
  totalIdr?: number | null;
  createdAt: string;
  user?: {
    id?: string;
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
  shippingAddress?: {
    id?: string;
    recipientName?: string | null;
    phoneNumber?: string | null;
    fullAddress?: string | null;
    district?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    notes?: string | null;
  } | string | null;
  items?: Array<{
    id: string;
    quantity: number;
    snapshotName?: string | null;
    snapshotSize?: string | null;
    snapshotColorName?: string | null;
    size?: string | null;
    colorName?: string | null;
    productVariant?: {
      product?: {
        name: string;
      } | null;
    } | null;
  }> | null;
}

export default function AdminDeliveriesPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"makassar" | "expedition" | "pickup">("makassar");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [labelModalOrder, setLabelModalOrder] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setAlertState(null);
    try {
      const [resReady, resShipped] = await Promise.all([
        fetch("/api/admin/orders?status=READY_TO_SHIP&limit=50", { cache: "no-store" }),
        fetch("/api/admin/orders?status=SHIPPED&limit=50", { cache: "no-store" }),
      ]);
      const dataReady = await resReady.json().catch(() => ({ orders: [] }));
      const dataShipped = await resShipped.json().catch(() => ({ orders: [] }));

      const all = [
        ...(Array.isArray(dataReady?.orders) ? dataReady.orders : []),
        ...(Array.isArray(dataShipped?.orders) ? dataShipped.orders : []),
      ];
      setOrders(all);
    } catch (e: any) {
      setAlertState({ type: "error", text: e?.message || "Gagal memuat daftar pengiriman" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, nextStatus: "SHIPPED" | "DELIVERED" | "COMPLETED", trackingNo?: string) => {
    setBusyId(orderId);
    setAlertState(null);
    try {
      const body: any = { status: nextStatus };
      if (trackingNo) body.trackingNumber = trackingNo;
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) throw new Error(data?.error || "Gagal memperbarui status");
      setAlertState({ type: "success", text: `Status pesanan berhasil diperbarui ke ${nextStatus}` });
      await fetchOrders();
    } catch (e: any) {
      setAlertState({ type: "error", text: e?.message || "Gagal memperbarui status" });
    } finally {
      setBusyId(null);
    }
  };

  const updateStatusBatch = async (
    orderIds: string[],
    nextStatus: "SHIPPED" | "DELIVERED" | "COMPLETED",
    trackingNo?: string
  ) => {
    if (orderIds.length === 0) return;
    setBusyId(orderIds[0] ?? null);
    setAlertState(null);
    try {
      const promises = orderIds.map((id) => {
        const body: any = { status: nextStatus };
        if (trackingNo) body.trackingNumber = trackingNo;
        return fetch(`/api/admin/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      });
      const responses = await Promise.all(promises);
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} dari ${orderIds.length} pesanan gagal diperbarui`);
      }
      setAlertState({
        type: "success",
        text: `Sukses konsolidasi: ${orderIds.length} pesanan berhasil diperbarui ke ${nextStatus}${
          trackingNo ? ` (Resi: ${trackingNo})` : ""
        }`,
      });
      await fetchOrders();
    } catch (e: any) {
      setAlertState({ type: "error", text: e?.message || "Gagal memperbarui status masal" });
    } finally {
      setBusyId(null);
    }
  };

  // Filter orders by tab
  const makassarOrders = orders.filter((o) => (o.deliveryMethod || "").toUpperCase() === "FREE_MAKASSAR");
  const expeditionOrders = orders.filter(
    (o) =>
      (o.deliveryMethod || "").toUpperCase() !== "FREE_MAKASSAR" &&
      (o.deliveryMethod || "").toUpperCase() !== "PICKUP"
  );
  const pickupOrders = orders.filter((o) => (o.deliveryMethod || "").toUpperCase() === "PICKUP");

  const currentList =
    activeTab === "makassar"
      ? makassarOrders
      : activeTab === "expedition"
      ? expeditionOrders
      : pickupOrders;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Hub Pengiriman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <Truck size={15} />
            <span>Divisi Pengiriman & Logistik</span>
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl uppercase tracking-tight text-text-primary">
            Hub Pengiriman & Kurir
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Monitoring kurir pengantaran internal Kota Makassar dan ekspedisi reguler nasional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            title="Lihat Log Riwayat Status Pesanan & Pengiriman"
          >
            <History size={14} className="text-brand-accent" />
            <span>Riwayat Pengiriman</span>
          </button>
          <button
            onClick={() => void fetchOrders()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {alertState && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
            alertState.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          {alertState.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alertState.text}</span>
        </div>
      )}

      {/* Segmented Tabs: 3 Jalur Pengantaran */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab("makassar")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "makassar"
              ? "bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(230,81,0,0.15)]"
              : "bg-surface border-border-subtle text-text-muted hover:border-border-strong"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kurir Internal</span>
            <span className="font-mono text-xs font-bold tabular-nums text-text-primary">
              ({makassarOrders.length})
            </span>
          </div>
          <div className="font-bold text-base text-text-primary uppercase flex items-center gap-2">
            <Bike size={20} className="text-brand-accent shrink-0" />
            <span>Gratis Se-Makassar</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Antar langsung ke alamat pelanggan dalam kota oleh armada workshop.
          </p>
        </button>

        <button
          onClick={() => setActiveTab("expedition")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "expedition"
              ? "bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(230,81,0,0.15)]"
              : "bg-surface border-border-subtle text-text-muted hover:border-border-strong"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ekspedisi Nasional</span>
            <span className="font-mono text-xs font-bold tabular-nums text-text-primary">
              ({expeditionOrders.length})
            </span>
          </div>
          <div className="font-bold text-base text-text-primary uppercase flex items-center gap-2">
            <Package size={20} className="text-blue-400 shrink-0" />
            <span>JNE / J&T / SiCepat</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Input nomor resi pengiriman paket luar Kota Makassar.
          </p>
        </button>

        <button
          onClick={() => setActiveTab("pickup")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "pickup"
              ? "bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(230,81,0,0.15)]"
              : "bg-surface border-border-subtle text-text-muted hover:border-border-strong"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ambil di Workshop</span>
            <span className="font-mono text-xs font-bold tabular-nums text-text-primary">
              ({pickupOrders.length})
            </span>
          </div>
          <div className="font-bold text-base text-text-primary uppercase flex items-center gap-2">
            <Store size={20} className="text-emerald-400 shrink-0" />
            <span>Pickup Workshop</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Pesanan siap diambil customer di workshop Kaos Kami Tallo.
          </p>
        </button>
      </div>

      {/* List Antrean Pengiriman */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-text-muted bg-surface rounded-2xl border border-border-subtle">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-accent" />
            <p className="text-xs">Memuat antrean pengiriman...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-12 text-center text-text-muted bg-surface rounded-2xl border border-border-subtle">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="font-bold text-sm text-text-primary">Tidak Ada Antrean Pengiriman</p>
            <p className="text-xs mt-1">Semua pesanan pada kategori ini telah selesai diantar atau belum berstatus siap kirim.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map((order) => {
              // Extract unmasked recipient and contact info
              const recipientName =
                (typeof order.shippingAddress === "object" && order.shippingAddress?.recipientName) ||
                order.user?.name ||
                "Pelanggan";

              const rawPhone =
                (typeof order.shippingAddress === "object" && order.shippingAddress?.phoneNumber) ||
                order.user?.phoneNumber ||
                "";

              const fullAddress =
                typeof order.shippingAddress === "object" && order.shippingAddress
                  ? [
                      order.shippingAddress.fullAddress,
                      order.shippingAddress.district ? `Kec. ${order.shippingAddress.district}` : null,
                      order.shippingAddress.city || "Makassar",
                      order.shippingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : typeof order.shippingAddress === "string" && order.shippingAddress.trim()
                  ? order.shippingAddress
                  : "Alamat tidak dicantumkan";

              const googleMapsQuery = encodeURIComponent(
                fullAddress !== "Alamat tidak dicantumkan" ? fullAddress : "Kota Makassar"
              );
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`;

              const cleanPhone = rawPhone.replace(/\D/g, "");
              const formattedWa = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;

              const waMessage = encodeURIComponent(
                `Halo Kak ${recipientName}, saya kurir dari Kaos Kami Makassar. Saya sedang menuju ke lokasi untuk mengantar paket pesanan ${order.orderNumber}. Mohon pastikan ada penerima di alamat ya kak. Terima kasih!`
              );
              const waUrl = formattedWa ? `https://wa.me/${formattedWa}?text=${waMessage}` : null;

              const totalPcs =
                order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;

              // Deteksi pesanan lain milik penerima yang sama (konsolidasi resi)
              const relatedOrders = currentList.filter((o) => {
                if (o.id === order.id) return false;
                const oCleanPhone = (
                  (typeof o.shippingAddress === "object" && o.shippingAddress?.phoneNumber) ||
                  o.user?.phoneNumber ||
                  ""
                ).replace(/\D/g, "");
                if (cleanPhone && oCleanPhone && cleanPhone === oCleanPhone) return true;
                if (order.user?.id && o.user?.id && order.user.id === o.user.id) return true;
                return false;
              });

              const relatedTrackingNo = relatedOrders.find((ro) => ro.trackingNumber)?.trackingNumber;

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-center justify-between gap-2 border-b border-border-subtle/40 pb-3">
                      <div>
                        <span className="font-mono tabular-nums text-[11px] text-brand-accent font-bold tracking-wider">
                          {order.orderNumber}
                        </span>
                        <h3 className="font-bold text-sm text-text-primary mt-0.5">
                          {recipientName}
                        </h3>
                      </div>
                      <span className="font-mono text-[11px] text-text-muted">
                        {order.status === "READY_TO_SHIP" ? "Siap Antar" : "Dalam Pengantaran"}
                      </span>
                    </div>

                    {/* Banner Konsolidasi Penerima Sama */}
                    {relatedOrders.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-600 dark:text-blue-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Link2 size={13} className="shrink-0 text-blue-500" />
                          <span>Konsolidasi: Ada {relatedOrders.length} order lain penerima ini</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {relatedOrders.map((ro) => (
                            <span
                              key={ro.id}
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 font-bold"
                            >
                              #{ro.orderNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Informasi Alamat & Rute */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-text-muted">
                        <MapPin size={15} className="text-brand-accent shrink-0 mt-0.5" />
                        <span className="text-text-primary font-medium leading-relaxed">
                          {fullAddress}
                        </span>
                      </div>

                      {order.courierNotes && (
                        <div className="p-2.5 rounded-xl bg-canvas border border-border-subtle text-[11px] text-amber-600 dark:text-amber-300">
                          <span className="font-bold block text-[10px] uppercase text-text-muted">Catatan Pengantaran:</span>
                          {order.courierNotes}
                        </div>
                      )}

                      {rawPhone && (
                        <div className="flex items-center gap-2 text-text-muted text-xs">
                          <Phone size={13} className="text-emerald-500" />
                          <span className="font-mono font-bold text-text-primary">{rawPhone}</span>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="text-[10px] text-brand-accent hover:underline font-medium ml-1"
                          >
                            Panggil
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Rincian Ringkas Barang */}
                    <div className="p-2.5 rounded-xl bg-canvas border border-border-subtle text-[11px] text-text-muted">
                      <span className="font-bold text-text-primary flex items-center gap-1.5 text-[10px] uppercase mb-1">
                        <Package size={13} className="text-brand-accent shrink-0" />
                        <span>Isi Paket ({totalPcs} pcs):</span>
                      </span>
                      <ul className="space-y-0.5">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it, idx) => (
                            <li key={idx} className="line-clamp-1">
                              • {it.quantity}x {it.snapshotName || it.productVariant?.product?.name || "Kaos Sablon DTF"} ({it.snapshotSize || it.size || "-"} / {it.snapshotColorName || it.colorName || "-"})
                            </li>
                          ))
                        ) : (
                          <li>• 1x Pesanan Apparel Kustom Kaos Kami</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Tombol Aksi Lapangan Khusus Kurir */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle/40">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-500/25 transition-all"
                      >
                        <Navigation size={13} />
                        <span>Buka Google Maps</span>
                      </a>

                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/25 transition-all"
                        >
                          <MessageSquare size={13} />
                          <span>Chat WhatsApp</span>
                        </a>
                      ) : (
                        <span className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-muted text-xs flex items-center justify-center">
                          Tanpa No. WA
                        </span>
                      )}
                    </div>

                    {/* Tombol Update Status Pengantaran */}
                    {activeTab === "makassar" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          {order.status === "READY_TO_SHIP" ? (
                            <button
                              onClick={() => void updateStatus(order.id, "SHIPPED")}
                              disabled={busyId === order.id}
                              className="w-full py-2.5 rounded-xl bg-brand-accent text-white font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                              <Truck size={14} />
                              <span>{busyId === order.id ? "Memproses..." : "Mulai Berangkat (SHIPPED)"}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => void updateStatus(order.id, "DELIVERED")}
                              disabled={busyId === order.id}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                              <CheckCircle size={14} />
                              <span>{busyId === order.id ? "Menyelesaikan..." : "Paket Sudah Diterima (DELIVERED)"}</span>
                            </button>
                          )}
                        </div>

                        {relatedOrders.length > 0 && (
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => {
                              const allIds = [order.id, ...relatedOrders.map((ro) => ro.id)];
                              void updateStatusBatch(
                                allIds,
                                order.status === "READY_TO_SHIP" ? "SHIPPED" : "DELIVERED"
                              );
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Link2 size={12} />
                            <span>
                              {order.status === "READY_TO_SHIP"
                                ? `Mulai Antar Bersama (${relatedOrders.length + 1} Pesanan)`
                                : `Selesaikan Bersama (${relatedOrders.length + 1} Pesanan)`}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Aksi Ekspedisi Nasional */}
                    {activeTab === "expedition" && (
                      <div className="space-y-2">
                        {/* Tombol Salin Resi dari Pesanan Sebelah jika ada */}
                        {!order.trackingNumber && relatedTrackingNo && (
                          <button
                            type="button"
                            onClick={() =>
                              setTrackingInputs((prev) => ({ ...prev, [order.id]: relatedTrackingNo }))
                            }
                            className="w-full py-1 px-2.5 rounded-lg bg-canvas border border-dashed border-blue-400/40 text-blue-600 dark:text-blue-300 text-[11px] font-mono flex items-center justify-center gap-1.5 hover:bg-blue-500/10 transition-colors cursor-pointer"
                          >
                            <Copy size={11} />
                            <span>Salin Resi dari Pesanan Terkait: {relatedTrackingNo}</span>
                          </button>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Input nomor resi JNE/J&T/SiCepat..."
                            value={trackingInputs[order.id] ?? (order.trackingNumber || "")}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            className="flex-1 px-3 py-1.5 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none"
                          />
                          <button
                            onClick={() => {
                              const resi = trackingInputs[order.id] || order.trackingNumber || "";
                              if (!resi.trim()) {
                                alert("Nomor resi wajib diisi");
                                return;
                              }
                              void updateStatus(order.id, "SHIPPED", resi.trim());
                            }}
                            disabled={busyId === order.id}
                            className="px-3 py-1.5 rounded-xl bg-brand-accent text-white font-bold text-xs hover:brightness-110 disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            Kirim Resi
                          </button>
                        </div>

                        {relatedOrders.length > 0 && (
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => {
                              const resi = trackingInputs[order.id] || order.trackingNumber || "";
                              if (!resi.trim()) {
                                alert("Ketik nomor resi terlebih dahulu pada kolom di atas!");
                                return;
                              }
                              const allIds = [order.id, ...relatedOrders.map((ro) => ro.id)];
                              void updateStatusBatch(allIds, "SHIPPED", resi.trim());
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Link2 size={12} />
                            <span>
                              Terapkan Resi Ini ke Semua ({relatedOrders.length + 1} Pesanan Pelanggan)
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Aksi Ambil di Workshop */}
                    {activeTab === "pickup" && (
                      <div className="space-y-2">
                        <button
                          onClick={() => void updateStatus(order.id, "DELIVERED")}
                          disabled={busyId === order.id}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <CheckCircle size={14} />
                          <span>{busyId === order.id ? "Memproses..." : "Sudah Diambil"}</span>
                        </button>

                        {relatedOrders.length > 0 && (
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => {
                              const allIds = [order.id, ...relatedOrders.map((ro) => ro.id)];
                              void updateStatusBatch(allIds, "DELIVERED");
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Link2 size={12} />
                            <span>Ambil Semua Sekaligus ({relatedOrders.length + 1} Pesanan)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Tombol Cetak Thermal Label Pengiriman */}
                    <button
                      type="button"
                      onClick={() => setLabelModalOrder(order)}
                      className="w-full py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Printer size={13} className="text-brand-accent" />
                      <span>Cetak Label Resi (Thermal 100×150)</span>
                    </button>

                    <div className="text-center pt-1">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[11px] text-text-muted hover:text-brand-accent inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Lihat Detail Lengkap Order</span>
                        <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Cetak Label Pengiriman Thermal */}
      {labelModalOrder && (
        <ThermalShippingLabelModal
          order={labelModalOrder}
          onClose={() => setLabelModalOrder(null)}
        />
      )}

      {/* Modal Riwayat Pengiriman & Log Aktivitas */}
      {showHistoryModal && (
        <ActivityHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
}
