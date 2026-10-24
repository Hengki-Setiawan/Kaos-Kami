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
  AlertCircle,
  Bug,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  ZoomIn,
  CheckCircle2,
  ArrowLeft,
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
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Tab Mode: Chat CS vs Lapor Kendala / Bug
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat");

  // State Form Laporan Kendala & Bug
  const [reportCategory, setReportCategory] = useState<string>("BUG_APP");
  const [reportMessage, setReportMessage] = useState<string>("");
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [reportHoneypot, setReportHoneypot] = useState<string>("");
  const [reportCooldownSeconds, setReportCooldownSeconds] = useState<number>(0);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [reportSuccessBanner, setReportSuccessBanner] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countdown throttle cooldown (10 detik pasca kirim laporan)
  useEffect(() => {
    if (reportCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setReportCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [reportCooldownSeconds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guest ID persistent di browser untuk pengunjung tanpa login
  const [guestId, setGuestId] = useState<string>("");
  useEffect(() => {
    try {
      let g = localStorage.getItem("kaoskami_guest_chat_id") || "";
      // Server hanya menerima `guest_<8-32 alfanumerik>`; ID lama/rusak
      // dibuat ulang. CSPRNG (bukan Math.random) mempersulit tebak ID tamu.
      if (!/^guest_[a-z0-9]{8,32}$/.test(g)) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        g =
          "guest_" +
          Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("kaoskami_guest_chat_id", g);
      }
      setGuestId(g);
    } catch {}
  }, []);

  const userId = session?.user?.id;
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole);
  const effectiveId = userId || guestId;

  // Kirim detak kehadiran (heartbeat) — abaikan jika tab sedang di latar belakang
  useEffect(() => {
    if (!effectiveId) return;
    const sendHeartbeat = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        await fetch("/api/chat/presence", { method: "POST" });
      } catch {}
    };
    void sendHeartbeat();
    const intervalPresence = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(intervalPresence);
  }, [effectiveId]);

  // Muat status kehadiran admin dan Kamito (hanya saat tab aktif)
  const fetchPresence = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/chat/presence", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setPresence(data);
      }
    } catch {}
  }, []);

  const isOnlineNow = mounted && (isAdmin || Boolean(presence?.isAdminOnline));
  const statusText = isOnlineNow ? "Online Sekarang" : "Workshop Siap Melayani";

  // Muat riwayat pesan (mendukung akun login & tamu via guestId; dihentikan saat tab tidak terlihat)
  const fetchMessages = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
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

  // Polling pesan & presence: terbuka = 8 dtk, tertutup = 60 dtk (hemat beban DB Turso)
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
    const pollInterval = isOpen ? 8000 : 60000;
    const intervalMsg = setInterval(() => {
      void fetchMessages();
    }, pollInterval);
    return () => clearInterval(intervalMsg);
  }, [userId, guestId, isOpen, fetchMessages]);

  // VisibilityChange listener: seketika tab kembali aktif (fokus), ambil pesan & presence terbaru
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchPresence();
        void fetchMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchPresence, fetchMessages]);

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

  const handleReportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran berkas screenshot maksimal 3MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Format gambar harus JPG, PNG, atau WebP.");
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (guestId) formData.append("guestId", guestId);
      if (reportHoneypot) formData.append("website_hp", reportHoneypot);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setReportImages((prev) => [...prev, data.url].slice(0, 3));
      } else {
        alert(data?.error || "Gagal mengunggah gambar bukti screenshot.");
      }
    } catch {
      alert("Terjadi kendala jaringan saat mengunggah gambar bukti.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveReportImage = (idxToRemove: number) => {
    setReportImages((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportCooldownSeconds > 0) {
      alert(`Mohon tunggu ${reportCooldownSeconds} detik sebelum mengirim laporan berikutnya.`);
      return;
    }
    if (!reportMessage.trim()) {
      alert("Harap jelaskan kendala atau error yang dialami.");
      return;
    }

    setIsSending(true);
    try {
      const categoryLabels: Record<string, string> = {
        BUG_APP: "Bug / Error Tampilan",
        CHECKOUT: "Masalah Checkout & Pembayaran",
        DESIGN_3D: "Kendala Desain 3D / Sablon",
        SHIPPING: "Pengiriman / Ekspedisi",
        OTHER: "Kendala Teknis Lainnya",
      };
      const catLabel = categoryLabels[reportCategory] || reportCategory;
      const formattedContent = `[LAPORAN KENDALA / BUG: ${catLabel}]\n${reportMessage.trim()}`;

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formattedContent,
          isReport: true,
          attachments: reportImages,
          guestId: !userId ? guestId : undefined,
          website_hp: reportHoneypot,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setReportMessage("");
        setReportImages([]);
        setReportCooldownSeconds(10);
        setReportSuccessBanner(true);
        setActiveTab("chat");
        await fetchMessages();
        setTimeout(() => setReportSuccessBanner(false), 6000);
      } else {
        alert(data?.error || "Gagal mengirim laporan kendala.");
      }
    } catch {
      alert("Terjadi kendala jaringan saat mengirim laporan.");
    } finally {
      setIsSending(false);
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
      className={`fixed ${Z_CLASS_CHAT} font-sans select-none ${studioDockPosition} ${
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
              suppressHydrationWarning
              className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface ${
                isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
              }`}
            />
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
            {/* Tooltip on hover */}
            <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-surface/95 backdrop-blur-md border border-border-subtle text-[11px] font-sans font-bold text-text-primary shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
              Tanya Kamito CS · <span suppressHydrationWarning className="text-brand-accent">{isOnlineNow ? "Online" : "Workshop"}</span>
            </span>
          </button>
        </div>
      )}

      {/* Floating Chat Modal / Popup (Adaptive Theme Minimalist) */}
      {isOpen && (
        <div
          className={`w-[calc(100vw-2rem)] sm:w-[400px] rounded-2xl bg-surface border border-border-subtle shadow-[0_24px_60px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col transition-all duration-200 ${
            isMinimized ? "h-14" : "h-[560px] max-h-[85vh]"
          }`}
        >
          {/* Header Bar - Draggable, Minimalist & Clean */}
          <div
            onPointerDown={handlePointerDown}
            className="px-4 py-3 bg-surface border-b border-border-subtle flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="flex items-center gap-2.5 pointer-events-none">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mascot/kamito-avatar.png"
                  alt="Kamito Mascot"
                  className="w-full h-full object-cover"
                />
                <span
                  suppressHydrationWarning
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${
                    isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-bold text-xs text-text-primary">
                    Kamito CS
                  </span>
                  <span
                    suppressHydrationWarning
                    className="text-[9px] font-mono text-emerald-500 dark:text-emerald-400 font-medium"
                  >
                    · {isOnlineNow ? "Online" : "Workshop"}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted font-sans">
                  Makassar DTF Sablon
                </p>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
              <a
                href={shopWaLink("Halo CS Kaos Kami, saya ingin tanya pesanan / sablon.")}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors"
                title="Buka Chat via WhatsApp"
              >
                <PhoneCall size={14} />
              </a>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                aria-label="Minimize Chat"
              >
                <ChevronDown size={14} className={isMinimized ? "rotate-180" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Tutup Chat"
                aria-label="Tutup Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {reportSuccessBanner && (
                <div className="px-3.5 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-2 font-medium shrink-0 animate-fadeIn">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>Laporan kendala berhasil dikirim dan diteruskan ke tim teknis!</span>
                </div>
              )}

              {/* TAB 1: FORM LAPORAN KENDALA / BUG */}
              {activeTab === "report" ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas/30 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setActiveTab("chat")}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-bold transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Kembali ke Chat CS</span>
                    </button>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Lapor Kendala</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-text-primary space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px]">
                      <AlertCircle size={14} />
                      <span>Form Laporan Bug, Error & Kendala</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Mengalami tombol macet, bug checkout, atau kendala preview 3D? Laporkan di sini beserta tangkapan layar untuk segera diinvestigasi.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitReport} className="space-y-3">
                    {/* Honeypot field (tersembunyi anti-bot spam) */}
                    <input
                      type="text"
                      name="website_hp"
                      value={reportHoneypot}
                      onChange={(e) => setReportHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      style={{ display: "none", opacity: 0, position: "absolute", zIndex: -1 }}
                    />

                    {/* Kategori Kendala */}
                    <div>
                      <label className="block text-[11px] font-bold text-text-primary mb-1.5">
                        Kategori Masalah
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "BUG_APP", label: "Bug / Error Tampilan" },
                          { id: "CHECKOUT", label: "Kendala Bayar / Checkout" },
                          { id: "DESIGN_3D", label: "Studio 3D / Sablon" },
                          { id: "SHIPPING", label: "Pengiriman / Ongkir" },
                          { id: "OTHER", label: "Kendala Lainnya" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setReportCategory(cat.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border text-left transition-colors cursor-pointer ${
                              reportCategory === cat.id
                                ? "bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-xs"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Textarea Detail Masalah */}
                    <div>
                      <label className="block text-[11px] font-bold text-text-primary mb-1 flex items-center justify-between">
                        <span>Deskripsi Masalah / Error</span>
                        <span className="text-[10px] text-text-muted font-mono">{reportMessage.length}/1000</span>
                      </label>
                      <textarea
                        value={reportMessage}
                        onChange={(e) => setReportMessage(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Jelaskan kendala yang dialami..."
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-amber-500 resize-none leading-relaxed placeholder:text-neutral-500 font-sans"
                      />
                    </div>

                    {/* Lampirkan Foto / Screenshot */}
                    <div>
                      <label className="block text-[11px] font-bold text-text-primary mb-1.5 flex items-center justify-between">
                        <span>Lampiran Foto / Screenshot Bukti</span>
                        <span className="text-[10px] text-text-muted">Maks. 3 foto</span>
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleReportImageUpload}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                      />

                      <div className="flex flex-wrap gap-2 items-center">
                        {reportImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl border border-border-subtle overflow-hidden bg-surface group shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt="Bukti" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveReportImage(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                              title="Hapus foto"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}

                        {reportImages.length < 3 && (
                          <button
                            type="button"
                            disabled={isUploadingImage}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 rounded-xl border border-dashed border-border-subtle hover:border-amber-500 flex flex-col items-center justify-center gap-1 text-text-muted hover:text-amber-400 bg-surface/50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Unggah screenshot kendala"
                          >
                            {isUploadingImage ? (
                              <RefreshCw size={14} className="animate-spin text-amber-500" />
                            ) : (
                              <>
                                <UploadCloud size={16} />
                                <span className="text-[9px]">Pilih Foto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted mt-1.5 font-mono">
                        Format PNG/JPG/WebP (maks. 3MB per berkas).
                      </p>
                    </div>

                    {reportCooldownSeconds > 0 && (
                      <div className="flex items-center justify-end text-[10px] text-amber-400 font-mono font-bold pt-1">
                        <span>Tunggu {reportCooldownSeconds}s</span>
                      </div>
                    )}

                    {/* Tombol Kirim Laporan */}
                    <button
                      type="submit"
                      disabled={isSending || isUploadingImage || !reportMessage.trim() || reportCooldownSeconds > 0}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-canvas font-bold text-xs active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Mengirim Laporan...</span>
                        </>
                      ) : reportCooldownSeconds > 0 ? (
                        <span>Tunggu {reportCooldownSeconds} detik...</span>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Kirim Laporan Kendala</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* TAB 2: CHAT LANGSUNG KAMITO CS */
                <>
                  {/* Chat Message List - Luas, Mengalir & Responsif Tema */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-canvas/40 text-xs">
                    {/* Welcoming Message from Kamito */}
                    <div className="flex items-start gap-2.5 max-w-[88%]">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/30 shrink-0 mt-0.5 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/mascot/kamito-avatar.png"
                          alt="Kamito"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 rounded-2xl rounded-tl-sm bg-surface border border-border-subtle shadow-xs space-y-1">
                        <p className="text-[11px] leading-relaxed text-text-primary">
                          Halo! Ada yang bisa kami bantu seputar sablon DTF, bahan katun combed, atau pesananmu di workshop Makassar?
                        </p>
                      </div>
                    </div>

                    {/* Riwayat Pesan */}
                    {messages.map((m) => {
                      const isMine = m.senderId === effectiveId;
                      const isBugReport = m.content.startsWith("[LAPORAN KENDALA");

                      return (
                        <div
                          key={m.id}
                          className={`flex items-start gap-2.5 ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isMine && (
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/30 shrink-0 mt-0.5 shadow-xs">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/mascot/kamito-avatar.png"
                                alt="Kamito"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div
                            className={`p-3 rounded-2xl max-w-[82%] shadow-xs space-y-1 ${
                              isMine
                                ? "bg-brand-accent text-white rounded-tr-sm font-medium"
                                : "bg-surface border border-border-subtle text-text-primary rounded-tl-sm"
                            }`}
                          >
                            {isBugReport && (
                              <div className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 w-fit mb-1">
                                <Bug size={10} />
                                <span>Laporan Kendala / Bug</span>
                              </div>
                            )}

                            <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                              {m.content}
                            </p>

                            {/* Lampiran Foto / Screenshot Bukti */}
                            {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {m.attachments.map((attUrl, aIdx) => (
                                  <button
                                    key={aIdx}
                                    type="button"
                                    onClick={() => setPreviewModalUrl(attUrl)}
                                    className="group relative rounded-xl overflow-hidden border border-border-subtle bg-black/10 dark:bg-black/30 w-16 h-16 block cursor-pointer transition-transform hover:scale-105"
                                    title="Klik untuk memperbesar gambar"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={attUrl} alt="Bukti" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <ZoomIn size={12} />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 text-[9px] font-mono mt-1 ${
                                isMine ? "text-white/80" : "text-text-muted"
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
                    <div className="px-3 py-2 bg-surface border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void handleSendMessage(prompt)}
                          className="px-2.5 py-1 rounded-full bg-canvas/80 border border-border-subtle hover:border-brand-accent text-[10px] text-text-muted hover:text-text-primary whitespace-nowrap transition-colors cursor-pointer shrink-0"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Bar - Terbuka Untuk Semua Pengunjung (Tamu & Member) */}
                  <div className="p-2.5 bg-surface border-t border-border-subtle shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSendMessage();
                      }}
                      className="flex items-end gap-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab("report")}
                        className="p-2 rounded-xl text-text-muted hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                        title="Lapor kendala atau bug aplikasi"
                        aria-label="Lapor bug"
                      >
                        <Bug size={16} />
                      </button>

                      <textarea
                        ref={inputRef}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        maxLength={2000}
                        placeholder="Tulis pesan..."
                        className="flex-1 px-3 py-2 rounded-xl bg-canvas/60 border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none max-h-24 leading-relaxed font-sans placeholder:text-text-muted/60"
                      />

                      <button
                        type="submit"
                        disabled={isSending || !inputVal.trim()}
                        className="p-2 rounded-xl bg-brand-accent text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0 shadow-xs cursor-pointer"
                        title="Kirim pesan"
                        aria-label="Kirim pesan"
                      >
                        <Send size={15} />
                      </button>
                    </form>

                    {!userId && (
                      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Mode Tamu</span>
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
            </>
          )}

          {/* Modal Lightbox Perbesar Gambar / Screenshot */}
          {previewModalUrl && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setPreviewModalUrl(null)}
            >
              <div
                className="relative max-w-lg max-h-[85vh] rounded-2xl overflow-hidden border border-border-subtle bg-surface shadow-2xl p-2 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-10 cursor-pointer"
                  title="Tutup gambar"
                >
                  <X size={16} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewModalUrl}
                  alt="Bukti Screenshot"
                  className="max-w-full max-h-[75vh] rounded-xl object-contain mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
