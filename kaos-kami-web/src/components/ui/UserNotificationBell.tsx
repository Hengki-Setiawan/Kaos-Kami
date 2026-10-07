"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Package, MessageSquare, ExternalLink, Sparkles, X } from "lucide-react";

export interface UserNotifItem {
  id: string;
  type?: "order" | "chat";
  title?: string;
  message?: string;
  orderId?: string | null;
  orderNumber?: string | null;
  status?: string;
  note?: string | null;
  createdAt: string;
  isRead?: boolean;
}

const SEEN_KEY = "kaoskami_notif_seen";

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.floor(diffHours / 24)}h lalu`;
  } catch {
    return "";
  }
}

export function UserNotificationBell({
  onOpenChat,
}: {
  onOpenChat?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotifItem[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      // Defensif: abaikan bila gagal
    }
  };

  useEffect(() => {
    try {
      setSeenAt(Number(localStorage.getItem(SEEN_KEY) || 0));
    } catch {}

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Tutup popover bila klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const markAllRead = () => {
    const now = Date.now();
    try {
      localStorage.setItem(SEEN_KEY, String(now));
      setSeenAt(now);
    } catch {}
    void fetch("/api/notifications", { method: "POST" }).catch(() => {});
  };

  const unreadCount = items.filter((i) => {
    const itemTime = new Date(i.createdAt).getTime();
    return itemTime > seenAt && !i.isRead;
  }).length;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            void loadNotifications();
          }
        }}
        className={`relative w-10 h-10 rounded-full bg-surface border transition-all flex items-center justify-center ${
          open
            ? "border-brand-accent text-brand-accent shadow-[0_0_12px_rgba(217,119,6,0.25)]"
            : "border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40"
        }`}
        title="Notifikasi Pesanan & Pesan"
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-96 sm:w-96 sm:max-w-none rounded-2xl bg-surface/95 backdrop-blur-xl border border-border-strong shadow-2xl p-0 z-50 overflow-hidden text-text-primary animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-canvas/40">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-text-primary">
                NOTIFIKASI
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-mono font-bold text-brand-accent hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  <span>Tandai dibaca</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle/50">
            {items.length === 0 ? (
              <div className="p-8 text-center text-text-muted space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mascot/kamito-avatar.png"
                  alt="Kamito maskot Kaos Kami"
                  width={72}
                  height={72}
                  className="mx-auto w-[72px] h-[72px] object-contain rounded-2xl bg-brand-accent/10 border border-brand-accent/25 p-1.5"
                  loading="lazy"
                />
                <p className="text-xs font-bold text-text-primary">Belum ada notifikasi baru.</p>
                <p className="text-[11px] opacity-70">
                  Update pesanan sablon dan balasan chat Kamito akan muncul di sini.
                </p>
                <Link
                  href="/studio"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-[11px] uppercase tracking-wider hover:brightness-110 shadow-md transition-all"
                >
                  <Sparkles size={13} />
                  <span>Mulai Kustomisasi 3D</span>
                </Link>
              </div>
            ) : (
              items.slice(0, 10).map((item) => {
                const itemTime = new Date(item.createdAt).getTime();
                const isFresh = itemTime > seenAt && !item.isRead;
                const isChat = item.type === "chat";

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-canvas/60 ${
                      isFresh ? "bg-brand-accent/5 font-medium" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isChat
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {isChat ? <MessageSquare size={14} /> : <Package size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {item.title || (isChat ? "Pesan dari Kamito" : `Pesanan #${item.orderNumber || ""}`)}
                        </p>
                        <span className="text-[10px] font-mono text-text-muted shrink-0">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message || item.note || `Status: ${item.status || "Update terbaru"}`}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        {isChat ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              if (onOpenChat) onOpenChat();
                              window.dispatchEvent(new CustomEvent("open-kamito-chat"));
                            }}
                            className="text-[10px] font-mono font-bold text-brand-accent hover:underline flex items-center gap-1"
                          >
                            <span>Buka Chat</span>
                            <ExternalLink size={10} />
                          </button>
                        ) : (
                          <Link
                            href="/dashboard/orders"
                            onClick={() => setOpen(false)}
                            className="text-[10px] font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>Lihat Pesanan</span>
                            <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-canvas/60 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono">
            <Link
              href="/dashboard/orders"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Semua Pesanan
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (onOpenChat) onOpenChat();
                window.dispatchEvent(new CustomEvent("open-kamito-chat"));
              }}
              className="text-brand-accent hover:underline font-bold"
            >
              Tanya Kamito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
