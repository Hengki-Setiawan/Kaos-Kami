"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Truck, MapPin, MessageSquare, CheckCircle, Package, Clock, ExternalLink, RefreshCw, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod?: string | null;
  trackingNumber?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingProvince?: string | null;
  shippingPostal?: string | null;
  courierNotes?: string | null;
  totalIdr?: number | null;
  createdAt: string;
  user?: {
    name?: string | null;
    phoneNumber?: string | null;
  } | null;
  items?: Array<{
    id: string;
    quantity: number;
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
  const [msg, setMsg] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setMsg(null);
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
      setMsg(e?.message || "Gagal memuat daftar pengiriman");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, nextStatus: "SHIPPED" | "DELIVERED" | "COMPLETED", trackingNo?: string) => {
    setBusyId(orderId);
    setMsg(null);
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
      setMsg(`✅ Status berhasil diperbarui ke ${nextStatus}`);
      await fetchOrders();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Hub Pengiriman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 text-brand-accent font-mono text-xs font-bold uppercase tracking-widest mb-1">
            <Truck size={16} />
            <span>DIVISI PENGIRIMAN & LOGISTIK</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-text-primary">
            HUB PENGIRIMAN & KURIR
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Monitoring kurir hyperlocal internal Makassar & ekspedisi reguler nasional.
          </p>
        </div>

        <button
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 text-text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-bold ${msg.startsWith("✅") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
          {msg}
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">KURIR INTERNAL</span>
            <span className="px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-black">
              {makassarOrders.length}
            </span>
          </div>
          <div className="font-display font-black text-base text-text-primary uppercase">
            🛵 Gratis Se-Makassar
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Antar langsung ke alamat pelanggan dalam kota.
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">EKSPEDISI NASIONAL</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black">
              {expeditionOrders.length}
            </span>
          </div>
          <div className="font-display font-black text-base text-text-primary uppercase">
            📦 JNE / J&T / SiCepat
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Input resi & pengiriman paket luar kota Makassar.
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">AMBIL DI WORKSHOP</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black">
              {pickupOrders.length}
            </span>
          </div>
          <div className="font-display font-black text-base text-text-primary uppercase">
            🏬 Pickup Tamalanrea
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Pesanan siap diambil customer di Jl. Perintis KM 10.
          </p>
        </button>
      </div>

      {/* List Antrean Pengiriman */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-text-muted bg-surface rounded-2xl border border-border-subtle">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-accent" />
            <p className="text-xs">Memuat antrean pengiriman…</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-12 text-center text-text-muted bg-surface rounded-2xl border border-border-subtle">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="font-bold text-sm text-text-primary">Tidak Ada Antrean Pengiriman</p>
            <p className="text-xs mt-1">Semua pesanan di kategori ini telah selesai diantar atau belum siap kirim.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map((order) => {
              const fullAddress = [
                order.shippingAddress,
                order.shippingCity,
                order.shippingProvince,
                order.shippingPostal,
              ]
                .filter(Boolean)
                .join(", ");

              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                fullAddress || "Makassar"
              )}`;

              const cleanPhone = (order.user?.phoneNumber || "").replace(/\D/g, "");
              const formattedWa = cleanPhone.startsWith("0")
                ? `62${cleanPhone.slice(1)}`
                : cleanPhone;

              const waMessage = encodeURIComponent(
                `Halo Kak ${order.user?.name || ""}, saya kurir dari Kaos Kami Makassar. Saya sedang menuju ke lokasi untuk mengantar paket pesanan ${order.orderNumber}. Mohon pastikan ada penerima di alamat ya kak. Terima kasih!`
              );
              const waUrl = `https://wa.me/${formattedWa}?text=${waMessage}`;

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <span className="font-mono text-[11px] text-brand-accent font-bold tracking-wider">
                          {order.orderNumber}
                        </span>
                        <h3 className="font-bold text-sm text-text-primary mt-0.5">
                          {order.user?.name || "Pelanggan Tanpa Nama"}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                          order.status === "READY_TO_SHIP"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {order.status === "READY_TO_SHIP" ? "Siap Antar" : "Dalam Pengantaran"}
                      </span>
                    </div>

                    {/* Informasi Alamat & Rute */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2 text-text-muted">
                        <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                        <span className="text-text-primary font-medium line-clamp-2">
                          {fullAddress || "Alamat tidak dicantumkan"}
                        </span>
                      </div>

                      {order.courierNotes && (
                        <div className="p-2.5 rounded-xl bg-canvas border border-white/5 text-[11px] text-amber-300">
                          <span className="font-bold block text-[10px] uppercase text-text-muted">Catatan Kurir:</span>
                          {order.courierNotes}
                        </div>
                      )}

                      {order.user?.phoneNumber && (
                        <div className="flex items-center gap-2 text-text-muted text-[11px]">
                          <Phone size={13} className="text-emerald-400" />
                          <span>{order.user.phoneNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Rincian Ringkas Barang */}
                    <div className="p-2.5 rounded-xl bg-canvas border border-white/5 text-[11px] text-text-muted">
                      <span className="font-bold text-text-primary block text-[10px] uppercase mb-1">
                        📦 Isi Paket ({order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1} pcs):
                      </span>
                      <ul className="space-y-0.5">
                        {order.items?.map((it, idx) => (
                          <li key={idx} className="line-clamp-1">
                            • {it.quantity}x {it.productVariant?.product?.name || "Kaos Sablon DTF"} ({it.size || "-"} / {it.colorName || "-"})
                          </li>
                        )) || <li>• 1x Pesanan Apparel Kustom</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Tombol Aksi Lapangan Khusus Kurir */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {activeTab === "makassar" && (
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-500/25 transition-all"
                        >
                          <MapPin size={13} />
                          <span>Peta GPS</span>
                        </a>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/25 transition-all"
                        >
                          <MessageSquare size={13} />
                          <span>Chat WA</span>
                        </a>
                      </div>
                    )}

                    {/* Tombol Update Status Pengantaran */}
                    {activeTab === "makassar" && (
                      <div className="flex gap-2">
                        {order.status === "READY_TO_SHIP" ? (
                          <button
                            onClick={() => void updateStatus(order.id, "SHIPPED")}
                            disabled={busyId === order.id}
                            className="w-full py-2.5 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          >
                            <Truck size={14} />
                            <span>{busyId === order.id ? "Memproses…" : "Mulai Berangkat (SHIPPED)"}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => void updateStatus(order.id, "DELIVERED")}
                            disabled={busyId === order.id}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 text-canvas font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={14} />
                            <span>{busyId === order.id ? "Menyelesaikan…" : "Paket Sudah Diterima (DELIVERED)"}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Aksi Ekspedisi Nasional */}
                    {activeTab === "expedition" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Input nomor resi JNE/J&T…"
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
                            className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:brightness-110 disabled:opacity-50"
                          >
                            Kirim
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Aksi Ambil di Workshop */}
                    {activeTab === "pickup" && (
                      <button
                        onClick={() => void updateStatus(order.id, "DELIVERED")}
                        disabled={busyId === order.id}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 text-canvas font-bold uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} />
                        <span>{busyId === order.id ? "Memproses…" : "Customer Sudah Ambil (SELESAI)"}</span>
                      </button>
                    )}

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
    </div>
  );
}
