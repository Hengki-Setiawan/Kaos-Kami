"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, MessageSquare, Package, ChevronRight, X, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/mobileApiClient";
import { haptic } from "@/lib/bridge/haptics";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "ORDER" | "CHAT" | "SYSTEM";
  read: boolean;
  createdAt: string;
  orderNumber?: string;
}

export function MobileNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Ambil notifikasi dari server / local cache
  useEffect(() => {
    let alive = true;
    const fetchNotifications = async () => {
      try {
        const uid = localStorage.getItem("kaoskami_user_id");
        const activeOrder = localStorage.getItem("kaoskami_active_order");

        const res = await fetch(`${API_BASE_URL}/api/notifications?userId=${uid || ""}&activeOrder=${activeOrder || ""}`);
        if (res.ok) {
          const data = await res.json();
          if (alive && data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount ?? data.notifications.filter((n: NotificationItem) => !n.read).length);
            return;
          }
        }
      } catch {
        // Fallback ke cache lokal
      }

      // Default notification items
      if (alive) {
        const defaultItems: NotificationItem[] = [
          {
            id: "notif_welcome",
            title: "Selamat Datang di Kaos Kami",
            message: "Platform sablon DTF & 3D Interactive Apparel Kota Makassar siap melayani kebutuhan kaos custom Anda.",
            type: "SYSTEM",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ];
        setNotifications(defaultItems);
        setUnreadCount(1);
      }
    };

    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const markAllRead = () => {
    haptic.selection();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleItemClick = (item: NotificationItem) => {
    haptic.tap();
    // Tandai dibaca
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    if (item.type === "CHAT" || item.type === "SYSTEM") {
      setIsOpen(false);
      window.dispatchEvent(
        new CustomEvent("open-kamito-chat", {
          detail: { orderNumber: item.orderNumber },
        })
      );
    }
  };

  return (
    <>
      <button
        onClick={() => {
          haptic.tap();
          setIsOpen(true);
        }}
        className="relative w-8 h-8 rounded-xl bg-[#18181B] border border-zinc-700/60 flex items-center justify-center text-white active:scale-95 transition-transform"
        aria-label="Pemberitahuan"
      >
        <Bell className="w-4 h-4 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Up Notifications Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md max-h-[80dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#FF6B35]">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-['Syne']">Pusat Notifikasi</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua notifikasi telah dibaca"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white text-[10px] font-mono flex items-center gap-1"
                    title="Tandai Semua Dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Baca Semua</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs bg-zinc-950/30">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  Belum ada notifikasi baru.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      n.read
                        ? "bg-zinc-850/40 bg-zinc-900/40 border-zinc-800/80 text-zinc-400"
                        : "bg-zinc-850 bg-zinc-900 border-zinc-700/80 text-white shadow-sm"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                        n.type === "ORDER"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : n.type === "CHAT"
                          ? "bg-orange-500/10 text-[#FF6B35] border border-orange-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {n.type === "ORDER" ? (
                        <Package className="w-4 h-4" />
                      ) : n.type === "CHAT" ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold truncate text-white font-['Syne']">
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                        {new Date(n.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 self-center" />
                  </div>
                ))
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent("open-kamito-chat"));
                }}
                className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-[#FF6B35] hover:bg-orange-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Konsultasi Sablon via Kamito</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
