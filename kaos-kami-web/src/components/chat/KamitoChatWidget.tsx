"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  RefreshCw,
  PhoneCall,
  Check,
  CheckCheck,
  Sparkles,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Z_CLASS_CHAT } from "@/lib/zIndex";
import { shopWaLink } from "@/lib/shop";

export interface ChatMsg {
  id: string;
  senderId: string;
  senderName?: string;
  senderRole: "CUSTOMER" | "ADMIN" | "BOT";
  receiverId?: string | null;
  orderId?: string | null;
  content: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
}

interface PresenceData {
  isAdminOnline: boolean;
  lastSeenText: string;
  isShopOpen: boolean;
  shopHoursLabel: string;
  mascot: {
    name: string;
    role: string;
    avatarUrl: string;
    welcomeMessage: string;
  };
}

const QUICK_PROMPTS = [
  "Konsultasi sablon DTF satuan",
  "Bisa bantu cek resolusi gambar desain saya?",
  "Berapa lama proses sablon DTF pesanan saya?",
];

export function KamitoChatWidget() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Guest ID persistent di browser untuk pengunjung tanpa login
  const [guestId, setGuestId] = useState<string>("");
  useEffect(() => {
    try {
      let g = localStorage.getItem("kaoskami_guest_chat_id");
      if (!g) {
        g = "guest_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("kaoskami_guest_chat_id", g);
      }
      setGuestId(g);
    } catch {}
  }, []);

  const userId = session?.user?.id;
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole);
  const effectiveId = userId || guestId;

  // Kirim detak kehadiran (heartbeat)
  useEffect(() => {
    if (!effectiveId) return;
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/chat/presence", { method: "POST" });
      } catch {}
    };
    void sendHeartbeat();
    const intervalPresence = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(intervalPresence);
  }, [effectiveId]);

  // Muat status kehadiran admin dan Kamito
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/presence", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setPresence(data);
      }
    } catch {}
  }, []);

  const isOnlineNow = isAdmin || Boolean(presence?.isAdminOnline);
  const statusText = isOnlineNow ? "Online Sekarang" : "Workshop Siap Melayani";

  // Muat riwayat pesan (mendukung akun login & tamu via guestId)
  const fetchMessages = useCallback(async () => {
    const idToUse = userId || guestId;
    if (!idToUse) return;
    try {
      const url = userId
        ? "/api/chat/messages"
        : `/api/chat/messages?guestId=${encodeURIComponent(guestId)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.items)) {
        setMessages(data.items);
        if (!isOpen) {
          const unread = data.items.filter(
            (m: ChatMsg) => m.senderId !== idToUse && !m.isRead
          ).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch {}
  }, [userId, guestId, isOpen]);

  // Polling pesan & presence
  useEffect(() => {
    void fetchPresence();
    const intervalPresence = setInterval(() => {
      void fetchPresence();
    }, 60000);
    return () => clearInterval(intervalPresence);
  }, [fetchPresence]);

  useEffect(() => {
    const idToUse = userId || guestId;
    if (!idToUse) return;
    void fetchMessages();
    const intervalMsg = setInterval(() => {
      void fetchMessages();
    }, isOpen ? 8000 : 30000);
    return () => clearInterval(intervalMsg);
  }, [userId, guestId, isOpen, fetchMessages]);

  // Listener untuk membuka widget dari tombol eksternal
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ orderId?: string; orderNumber?: string; prompt?: string }>;
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
      if (customEvent.detail?.orderNumber) {
        setInputVal(`Halo Kamito, saya ingin tanya seputar Pesanan #${customEvent.detail.orderNumber}: `);
      } else if (customEvent.detail?.prompt) {
        setInputVal(customEvent.detail.prompt);
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    };

    window.addEventListener("open-kamito-chat", handleOpen);
    return () => window.removeEventListener("open-kamito-chat", handleOpen);
  }, []);

  // Gulir ke bawah setiap kali ada pesan baru
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Tangani kirim pesan (baik login maupun tamu)
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputVal).trim();
    if (!textToSend || isSending) return;

    const idToUse = userId || guestId;
    if (!idToUse) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToSend,
          guestId: !userId ? guestId : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (!customText) setInputVal("");
        await fetchMessages();
      } else {
        alert(data?.error || "Gagal mengirim pesan.");
      }
    } catch {
      alert("Terjadi kendala jaringan saat mengirim pesan.");
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Posisi dock studio
  const isStudioRoute = pathname?.startsWith("/studio");
  const isStudioMode = Boolean(isStudioRoute);
  const drawerPosition = useConfiguratorStore((s) => s.drawerPosition);
  const isDrawerCollapsed = useConfiguratorStore((s) => s.isDrawerCollapsed);

  // Kalkulasi batas aman agar kotak chat tidak terpotong ke kiri / atas layar
  const getSafeBounds = useCallback((open: boolean) => {
    if (typeof window === "undefined") return { minX: -400, maxX: 12, minY: -400, maxY: 12 };
    const w = open ? Math.min(420, window.innerWidth - 32) : 56;
    const h = open ? Math.min(580, window.innerHeight - 80) : 56;
    const minX = -Math.max(0, window.innerWidth - w - 40);
    const maxX = 12;
    const minY = -Math.max(0, window.innerHeight - h - 40);
    const maxY = 12;
    return { minX, maxX, minY, maxY };
  }, []);

  // Posisi drag tersimpan (inisialisasi 0,0 identik SSR & Client anti-hydration mismatch)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Muat offset tersimpan pasca-hidrasi di client
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kaoskami_chat_fab_offset");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.x === "number" &&
          typeof parsed?.y === "number" &&
          Math.abs(parsed.x) < 600 &&
          Math.abs(parsed.y) < 600
        ) {
          setDragOffset(parsed);
        }
      }
    } catch {}
  }, []);

  // Clamp otomatis posisi saat modal dibuka agar tidak pernah terpotong ke kiri
  useEffect(() => {
    if (isOpen) {
      setDragOffset((cur) => {
        const bounds = getSafeBounds(true);
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, cur.x));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, cur.y));
        if (clampedX !== cur.x || clampedY !== cur.y) {
          return { x: clampedX, y: clampedY };
        }
        return cur;
      });
    }
  }, [isOpen, getSafeBounds]);

  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragOffset.x,
      initY: dragOffset.y,
      moved: false,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;
      if (Math.hypot(dx, dy) > 4) {
        dragStartRef.current.moved = true;
        setIsDragging(true);
      }
      const bounds = getSafeBounds(isOpen);
      const newX = Math.max(bounds.minX, Math.min(bounds.maxX, dragStartRef.current.initX + dx));
      const newY = Math.max(bounds.minY, Math.min(bounds.maxY, dragStartRef.current.initY + dy));
      setDragOffset({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setIsDragging(false);
      if (dragStartRef.current?.moved) {
        setDragOffset((cur) => {
          try {
            localStorage.setItem("kaoskami_chat_fab_offset", JSON.stringify(cur));
          } catch {}
          return cur;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleLauncherClick = (e: React.MouseEvent) => {
    if (dragStartRef.current?.moved) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    void fetchMessages();
  };

  const studioDockPosition =
    isStudioMode && drawerPosition === "right" && !isDrawerCollapsed
      ? "bottom-28 right-4 md:right-[410px] md:bottom-24"
      : isStudioMode
      ? "bottom-28 right-4 md:right-8 md:bottom-24"
      : "bottom-6 right-6";

  // Jangan render tombol bila user di halaman admin (setelah seluruh hooks dieksekusi anti-Rules-of-Hooks)
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      suppressHydrationWarning
      className={`fixed ${isStudioMode ? Z_CLASS_CHAT : "z-50"} font-sans select-none ${studioDockPosition} ${
        isDragging ? "transition-none pointer-events-auto" : "transition-transform duration-200"
      }`}
      style={{
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Floating Trigger Button saat jendela ditutup */}
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onClick={handleLauncherClick}
          className="cursor-grab active:cursor-grabbing inline-block touch-none"
        >
          <button
            type="button"
            className="group relative w-14 h-14 rounded-full bg-surface/95 backdrop-blur-2xl border-2 border-border-strong text-text-primary shadow-2xl hover:border-brand-accent transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center pointer-events-auto ring-2 ring-brand-accent/20 hover:ring-brand-accent/40 cursor-pointer"
            aria-label="Buka Live Chat Kamito"
            title="Tanya Kamito CS (Klik untuk buka live chat)"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot/kamito-avatar.png"
                alt="Kamito Mascot"
                className="w-full h-full object-cover pointer-events-none"
              />
              <MessageCircle size={20} className="text-brand-accent absolute pointer-events-none opacity-40" />
            </div>
            <span
              className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface ${
                isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
              }`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
            {/* Tooltip on hover */}
            <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-surface/95 backdrop-blur-md border border-border-subtle text-[11px] font-sans font-bold text-text-primary shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
              Tanya Kamito CS · <span className="text-brand-accent">{isOnlineNow ? "Online" : "Workshop"}</span>
            </span>
          </button>
        </div>
      )}

      {/* Floating Chat Modal / Popup (Ukuran Luas & Bersih Tanpa Elemen Mubazir) */}
      {isOpen && (
        <div
          className={`w-[calc(100vw-2rem)] sm:w-[420px] rounded-2xl bg-surface/95 backdrop-blur-2xl border border-border-strong shadow-2xl overflow-hidden flex flex-col ${
            isMinimized ? "h-14" : "h-[580px] max-h-[86vh]"
          }`}
        >
          {/* Header Bar - Draggable & Minimalist */}
          <div
            onPointerDown={handlePointerDown}
            className="p-3.5 bg-canvas/90 border-b border-border-subtle flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mascot/kamito-avatar.png"
                  alt="Kamito Mascot"
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${
                    isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-bold text-xs uppercase tracking-tight text-text-primary">
                    KAMITO CS
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                    {statusText}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5 font-sans">
                  <span>Kaos Kami Workshop Makassar</span>
                </div>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <a
                href={shopWaLink("Halo CS Kaos Kami, saya ingin tanya pesanan / sablon.")}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-canvas transition-colors"
                title="Buka Chat via WhatsApp"
              >
                <PhoneCall size={14} />
              </a>
              <button
                type="button"
                onClick={() => void fetchMessages()}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors cursor-pointer"
                title="Segarkan pesan"
                aria-label="Segarkan pesan"
              >
                <RefreshCw size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors cursor-pointer"
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                aria-label="Minimize Chat"
              >
                <ChevronDown size={14} className={isMinimized ? "rotate-180" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors cursor-pointer"
                title="Tutup Chat"
                aria-label="Tutup Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat Message List - Luas & Mengalir */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas/30 text-xs">
                {/* Welcoming Message from Kamito */}
                <div className="flex items-start gap-2.5 max-w-[88%]">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0 mt-0.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/mascot/kamito-avatar.png"
                      alt="Kamito"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-surface border border-border-subtle shadow-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-brand-accent font-mono flex items-center gap-1.5">
                        <span>Kamito</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-normal border border-emerald-500/30">
                          CS Kaos Kami
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-text-primary">
                      Halo! Saya Kamito dari Customer Service Kaos Kami Makassar. Ada yang bisa kami bantu seputar sablon DTF, bahan katun combed, atau pesananmu?
                    </p>
                  </div>
                </div>

                {/* Riwayat Pesan */}
                {messages.map((m) => {
                  const isMine = m.senderId === effectiveId;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2.5 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0 mt-0.5 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/mascot/kamito-avatar.png"
                            alt="Kamito"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-2xl max-w-[82%] shadow-sm space-y-1 ${
                          isMine
                            ? "bg-brand-accent text-canvas rounded-tr-sm font-medium"
                            : "bg-surface border border-border-subtle text-text-primary rounded-tl-sm"
                        }`}
                      >
                        {!isMine && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-brand-accent font-bold">
                            <span>Kamito (CS Kaos Kami)</span>
                          </div>
                        )}

                        <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                          {m.content}
                        </p>

                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] font-mono mt-1 ${
                            isMine ? "text-canvas/80" : "text-text-muted"
                          }`}
                        >
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && (
                            <span>
                              {m.isRead ? <CheckCheck size={11} /> : <Check size={11} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Pills (Bila baru mulai) */}
              {messages.length <= 1 && (
                <div className="px-3.5 py-2 bg-canvas/50 border-t border-border-subtle/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void handleSendMessage(prompt)}
                      className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle hover:border-brand-accent text-[10px] text-text-muted hover:text-text-primary whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Bar - Terbuka Untuk Semua Pengunjung (Tamu & Member) */}
              <div className="p-3 bg-surface border-t border-border-subtle shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    ref={inputRef}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    maxLength={2000}
                    placeholder="Tulis pesan untuk CS Kamito..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none max-h-24 leading-relaxed font-sans placeholder:text-neutral-500"
                  />

                  <button
                    type="submit"
                    disabled={isSending || !inputVal.trim()}
                    className="p-2.5 rounded-xl bg-brand-accent text-canvas hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
                    title="Kirim pesan"
                    aria-label="Kirim pesan"
                  >
                    <Send size={15} />
                  </button>
                </form>

                {!userId && (
                  <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={11} className="text-emerald-500" />
                      <span>Mode Tamu · Chat langsung terhubung</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                      className="text-brand-accent hover:underline cursor-pointer font-medium"
                    >
                      Masuk akun
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
