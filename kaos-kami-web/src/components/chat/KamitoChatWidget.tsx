"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  RefreshCw,
  PhoneCall,
  Clock,
  Check,
  CheckCheck,
  Sparkles,
  ChevronDown,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

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
  "Berapa lama proses sablon DTF pesanan saya?",
  "Bisa bantu cek resolusi gambar desain saya?",
  "Bagaimana cara klaim gratis ongkir Makassar?",
  "Apakah sablon bisa full sampai ke lengan?",
];

export function KamitoChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = session?.user?.id;
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole);

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

  // Muat riwayat pesan
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/chat/messages", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.items)) {
        setMessages(data.items);
        if (!isOpen) {
          const unread = data.items.filter(
            (m: ChatMsg) => m.senderId !== userId && !m.isRead
          ).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch {}
  }, [userId, isOpen]);

  // Kirim heartbeat kehadiran saat widget terbuka
  useEffect(() => {
    void fetchPresence();
    const intervalPresence = setInterval(() => {
      void fetchPresence();
    }, 60000);
    return () => clearInterval(intervalPresence);
  }, [fetchPresence]);

  // Listener untuk membuka widget dari lonceng atau tombol eksternal
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

  useEffect(() => {
    if (!userId) return;
    void fetchMessages();
    const intervalMsg = setInterval(() => {
      void fetchMessages();
    }, isOpen ? 8000 : 30000);
    return () => clearInterval(intervalMsg);
  }, [userId, isOpen, fetchMessages]);

  // Gulir ke bawah setiap kali ada pesan baru
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Tangani kirim pesan
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputVal).trim();
    if (!textToSend || isSending) return;

    if (!userId) {
      alert("Silakan masuk atau buat akun terlebih dahulu untuk mengirim pesan ke admin.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToSend }),
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

  // Jangan render tombol bila user di halaman admin (admin memiliki admin chat hub)
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 font-sans">
      {/* Floating Trigger Button saat jendela ditutup */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setUnreadCount(0);
            void fetchMessages();
          }}
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-full bg-surface/95 backdrop-blur-xl border border-border-strong text-text-primary shadow-2xl hover:border-brand-accent transition-all duration-300 hover:scale-105 active:scale-95"
          aria-label="Buka Live Chat Kamito"
        >
          {/* Avatar Kamito */}
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/mascot-primary.png"
              alt="Kamito Mascot"
              className="w-full h-full object-cover"
            />
            {/* Indikator Online */}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${
                presence?.isAdminOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
              }`}
            />
          </div>

          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-text-primary">
                TANYA KAMITO
              </span>
              <span className="text-[9px] font-mono px-1 rounded bg-brand-accent/20 text-brand-accent font-bold">
                CS
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5 font-mono">
              {presence?.isAdminOnline ? "Online sekarang" : presence?.lastSeenText || "Asisten Sablon"}
            </p>
          </div>

          {unreadCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Modal / Popup */}
      {isOpen && (
        <div
          className={`w-[calc(100vw-2.5rem)] sm:w-96 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-border-strong shadow-2xl overflow-hidden transition-all duration-300 flex flex-col ${
            isMinimized ? "h-14" : "h-[540px] max-h-[85vh]"
          }`}
        >
          {/* Header Bar */}
          <div className="p-3.5 bg-canvas/60 border-b border-border-subtle flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mascot/mascot-primary.png"
                  alt="Kamito Mascot"
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${
                    presence?.isAdminOnline ? "bg-emerald-500" : "bg-neutral-500"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-xs uppercase tracking-tight text-text-primary">
                    KAMITO
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    WORKSHOP MAKASSAR
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      presence?.isAdminOnline ? "bg-emerald-400" : "bg-neutral-400"
                    }`}
                  />
                  <span>
                    {presence?.isAdminOnline ? "Online sekarang" : presence?.lastSeenText || "09:00 - 21:00 WITA"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void fetchMessages()}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                title="Segarkan pesan"
                aria-label="Segarkan pesan"
              >
                <RefreshCw size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                aria-label="Minimize Chat"
              >
                <ChevronDown size={14} className={isMinimized ? "rotate-180" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                title="Tutup Chat"
                aria-label="Tutup Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Jam Operasional Notice */}
              <div className="px-3.5 py-2 bg-brand-accent/5 border-b border-border-subtle/60 flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Clock size={11} className="text-brand-accent" />
                  <span>Workshop: 09.00 - 21.00 WITA</span>
                </span>
                <a
                  href="https://wa.me/62895803463032?text=Halo%20Admin%20Kaos%20Kami,%20saya%20ingin%20tanya%20seputar%20pesanan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  title="Hubungi CS via WhatsApp"
                >
                  <PhoneCall size={10} />
                  <span>WhatsApp CS</span>
                </a>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas/30 text-xs">
                {/* Welcoming Message from Kamito */}
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0 mt-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/mascot/mascot-primary.png"
                      alt="Kamito"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-surface border border-border-subtle shadow-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-brand-accent font-mono">
                        Kamito • Asisten Sablon
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-text-primary">
                      Halo! Saya Kamito dari konveksi Kaos Kami Makassar. Ada yang bisa saya bantu terkait sablon DTF, pilihan bahan combed, atau konfirmasi pesananmu?
                    </p>
                  </div>
                </div>

                {/* Riwayat Pesan */}
                {messages.map((m) => {
                  const isMine = m.senderId === userId;
                  const isBot = m.senderRole === "BOT";
                  const isAdminRole = m.senderRole === "ADMIN";

                  return (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2.5 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMine && (
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 shrink-0 mt-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/mascot/mascot-primary.png"
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
                            <span>{isAdminRole ? "Admin Workshop" : "Kamito"}</span>
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
                      className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle hover:border-brand-accent text-[10px] text-text-muted hover:text-text-primary whitespace-nowrap transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Bar */}
              <div className="p-3 bg-surface border-t border-border-subtle shrink-0">
                {!userId ? (
                  <div className="p-2.5 rounded-xl bg-canvas border border-border-subtle text-center space-y-1">
                    <p className="text-[11px] text-text-muted">
                      Masuk untuk terhubung langsung dengan operator workshop kami.
                    </p>
                    <Link
                      href="/login"
                      className="inline-block px-3 py-1 rounded-lg bg-brand-accent text-canvas text-xs font-bold uppercase tracking-wider"
                    >
                      Masuk Sekarang
                    </Link>
                  </div>
                ) : (
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
                      placeholder="Tanya Kamito atau admin..."
                      className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none max-h-24 leading-relaxed"
                    />

                    <button
                      type="submit"
                      disabled={isSending || !inputVal.trim()}
                      className="p-2.5 rounded-xl bg-brand-accent text-canvas hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
                      title="Kirim pesan"
                      aria-label="Kirim pesan"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
