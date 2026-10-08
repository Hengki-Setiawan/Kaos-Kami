"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  History,
  X,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  Flame,
  Truck,
  ExternalLink,
} from "lucide-react";

export interface ActivityEvent {
  id: string;
  orderId: string;
  status: string;
  note?: string | null;
  actorUserId?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    totalIdr: number;
    status: string;
    deliveryMethod?: string | null;
    userName: string;
    phoneNumber?: string | null;
  } | null;
}

interface ActivityHistoryModalProps {
  onClose: () => void;
  title?: string;
  orderIdFilter?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PAID":
    case "CONFIRMED":
      return { label: "Dikonfirmasi", bg: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: CheckCircle2 };
    case "PRINTING":
    case "IN_PRODUCTION":
      return { label: "Produksi Sablon", bg: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Flame };
    case "READY_TO_SHIP":
      return { label: "Siap Kirim", bg: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: Package };
    case "SHIPPED":
      return { label: "Dalam Pengantaran", bg: "bg-sky-500/15 text-sky-400 border-sky-500/30", icon: Truck };
    case "DELIVERED":
    case "COMPLETED":
      return { label: "Selesai", bg: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 };
    default:
      return { label: status, bg: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30", icon: Clock };
  }
}

export function ActivityHistoryModal({
  onClose,
  title = "Log Riwayat Proses & Aktivitas Operasional",
  orderIdFilter,
}: ActivityHistoryModalProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const url = orderIdFilter
        ? `/api/admin/activity-logs?orderId=${encodeURIComponent(orderIdFilter)}`
        : "/api/admin/activity-logs?limit=150";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [orderIdFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        (e.order?.orderNumber && e.order.orderNumber.toLowerCase().includes(q)) ||
        (e.order?.userName && e.order.userName.toLowerCase().includes(q)) ||
        (e.note && e.note.toLowerCase().includes(q)) ||
        e.status.toLowerCase().includes(q)
    );
  }, [events, search]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-canvas/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
              <History size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-text-primary">{title}</h2>
              <p className="text-xs text-text-muted">
                Jejak audit alur produksi, pencetakan film, dan status pengiriman pesanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchEvents}
              disabled={loading}
              className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer"
              title="Segarkan Riwayat"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border-subtle bg-surface">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor pesanan / nama pelanggan / catatan log..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
        </div>

        {/* Body List Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-canvas/30 text-xs">
          {loading ? (
            <div className="p-12 text-center text-text-muted space-y-2">
              <RefreshCw size={24} className="animate-spin mx-auto text-brand-accent" />
              <p>Memuat rekam jejak aktivitas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-text-muted space-y-2">
              <History size={32} className="mx-auto opacity-40" />
              <p className="font-bold">Belum Ada Riwayat Aktivitas</p>
              <p className="text-[11px]">Setiap perubahan status produksi dan pengiriman akan otomatis dicatat di sini.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const badge = getStatusBadge(item.status);
              const Icon = badge.icon;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-2 hover:border-border-strong transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
                      >
                        <Icon size={11} />
                        <span>{badge.label}</span>
                      </span>
                      {item.order && (
                        <Link
                          href={`/admin/orders/${item.order.id}`}
                          className="font-mono font-bold text-xs text-brand-accent hover:underline flex items-center gap-1"
                        >
                          <span>#{item.order.orderNumber}</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </Link>
                      )}
                      {item.order?.userName && (
                        <span className="text-text-muted font-medium">({item.order.userName})</span>
                      )}
                    </div>

                    <div className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(item.createdAt).toLocaleString("id-ID")} WITA</span>
                    </div>
                  </div>

                  {item.note && (
                    <p className="text-text-primary leading-relaxed bg-canvas/60 p-2.5 rounded-lg border border-border-subtle/70 whitespace-pre-wrap font-sans text-xs">
                      {item.note}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border-subtle bg-surface flex items-center justify-between text-xs text-text-muted">
          <span>Total {filtered.length} riwayat peristiwa</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-canvas border border-border-subtle hover:text-text-primary text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
