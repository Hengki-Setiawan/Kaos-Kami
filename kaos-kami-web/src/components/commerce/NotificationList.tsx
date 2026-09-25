"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";

interface NotifItem {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  note?: string | null;
  createdAt: string;
}

const SEEN_KEY = "kaoskami_notif_seen";

/** U14+I8: daftar notifikasi status order milik sendiri + badge belum-dibaca. */
export function NotificationList() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [seenAt, setSeenAt] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal memuat notifikasi");
      setItems(Array.isArray(data.items) ? data.items : []);
      try {
        setSeenAt(Number(localStorage.getItem(SEEN_KEY) || 0));
      } catch {}
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
      setSeenAt(Date.now());
    } catch {}
  };

  const unread = items.filter((i) => new Date(i.createdAt).getTime() > seenAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted flex items-center gap-2">
          <Bell size={14} className="text-brand-accent" />
          <span>
            {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            <span>Segarkan</span>
          </button>
          {unread > 0 && (
            <button
              type="button"
              onClick={markRead}
              className="px-3 py-1.5 rounded-xl bg-brand-accent/15 border border-brand-accent/40 text-brand-accent text-xs font-bold"
            >
              Tandai dibaca
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted text-center py-8">Memuat notifikasi…</p>
      ) : err ? (
        <p className="text-xs text-amber-400 text-center py-8">{err}</p>
      ) : items.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-surface border border-border-subtle text-text-muted text-xs">
          Belum ada notifikasi. Setiap perubahan status pesanan tercatat di sini.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const fresh = new Date(n.createdAt).getTime() > seenAt;
            return (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border flex justify-between gap-3 ${
                  fresh ? "bg-brand-accent/10 border-brand-accent/40" : "bg-surface border-border-subtle"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary">
                    {n.orderNumber} · {n.status.replace(/_/g, " ")}
                    {fresh && <span className="ml-2 text-[9px] text-brand-accent">BARU</span>}
                  </p>
                  {n.note && <p className="text-[11px] text-text-muted mt-0.5 break-words">{n.note}</p>}
                  <p className="text-[10px] text-text-muted mt-1">
                    {new Date(n.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
