"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Send,
  RefreshCw,
  Phone,
  Mail,
  User,
  Clock,
  Check,
  CheckCheck,
  Package,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export interface ChatThread {
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  userImage: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastMessage: {
    id: string;
    content: string;
    senderRole: string;
    senderName?: string;
    createdAt: string;
  };
  unreadCount: number;
}

export interface ChatMessageItem {
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

const ADMIN_TEMPLATES = [
  "Halo kak! Desain sablon sedang kami review di workshop ya.",
  "File gambarnya sedikit buram. Bisa kirimkan resolusi minimal 300 DPI?",
  "Sablon DTF sudah selesai dipres dan masuk tahap packing.",
  "Pesanan sudah diserahkan ke kurir pengiriman Kota Makassar.",
  "Ada yang bisa kami bantu terkait pesanan atau kustomisasi garmen?",
];

function formatTime(dateStr: string): string {
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

export function AdminChatManager() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Muat daftar threads
  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        // Otomatis pilih thread pertama bila belum ada yg dipilih
        if (!selectedUserId && data.threads.length > 0) {
          setSelectedUserId(data.threads[0].userId);
        }
      }
    } catch {
      // Defensif
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedUserId]);

  // Muat pesan percakapan yang dipilih
  const loadMessages = useCallback(async (targetUid: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?userId=${encodeURIComponent(targetUid)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.items)) {
        setMessages(data.items);
      }
    } catch {
      // Defensif
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    const interval = setInterval(() => {
      void loadThreads();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (selectedUserId) {
      void loadMessages(selectedUserId);
      const interval = setInterval(() => {
        void loadMessages(selectedUserId);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customContent?: string) => {
    const text = (customContent || inputText).trim();
    if (!text || !selectedUserId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUserId,
          content: text,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (!customContent) setInputText("");
        await loadMessages(selectedUserId);
        await loadThreads();
      } else {
        alert(data?.error || "Gagal mengirim balasan.");
      }
    } catch {
      alert("Kendala jaringan saat mengirim balasan.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.userName.toLowerCase().includes(q) ||
      (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
      (t.userPhone && t.userPhone.includes(q))
    );
  });

  const activeThread = threads.find((t) => t.userId === selectedUserId);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-canvas border border-border-subtle rounded-2xl overflow-hidden font-sans shadow-lg">
      <div className="flex flex-1 min-h-0 divide-x divide-border-subtle">
        {/* Kolom Kiri: Daftar Threads Pelanggan */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-surface">
          {/* Header & Search */}
          <div className="p-4 border-b border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm uppercase tracking-tight text-text-primary">
                  PESAN PELANGGAN
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent font-bold">
                  {threads.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void loadThreads()}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                title="Segarkan daftar"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, nomor..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>

          {/* List Threads */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/60">
            {loadingThreads ? (
              <div className="p-8 text-center text-xs text-text-muted">
                Memuat daftar percakapan...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted space-y-1">
                <p className="font-bold">Belum ada percakapan</p>
                <p className="text-[11px] opacity-70">
                  Pesan baru yang dikirim pelanggan via widget Kamito akan tampil di sini.
                </p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.userId === selectedUserId;
                return (
                  <button
                    key={t.userId}
                    type="button"
                    onClick={() => setSelectedUserId(t.userId)}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 hover:bg-canvas/50 ${
                      isSelected ? "bg-canvas border-l-4 border-l-brand-accent" : ""
                    }`}
                  >
                    {/* Avatar with presence */}
                    <div className="relative w-10 h-10 rounded-full bg-surface border border-border-subtle shrink-0 flex items-center justify-center overflow-hidden">
                      {t.userImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.userImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-text-muted" />
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${
                          t.isOnline ? "bg-emerald-500" : "bg-neutral-500"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {t.userName}
                        </p>
                        <span className="text-[10px] font-mono text-text-muted shrink-0">
                          {formatTime(t.lastMessage.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {t.lastMessage.senderRole === "ADMIN" ? "Anda: " : ""}
                        {t.lastMessage.content}
                      </p>

                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-mono text-text-muted">
                          {t.userPhone || t.userEmail || "Customer"}
                        </span>
                        {t.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold">
                            {t.unreadCount} baru
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tampilan Percakapan Aktif */}
        <div className="hidden md:flex flex-1 flex-col bg-canvas min-w-0">
          {activeThread ? (
            <>
              {/* Header Percakapan */}
              <div className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-canvas border border-border-subtle shrink-0 flex items-center justify-center overflow-hidden">
                    {activeThread.userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeThread.userImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-text-muted" />
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-canvas ${
                        activeThread.isOnline ? "bg-emerald-500" : "bg-neutral-500"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">
                        {activeThread.userName}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          activeThread.isOnline
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-surface text-text-muted border-border-subtle"
                        }`}
                      >
                        {activeThread.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5 font-mono">
                      {activeThread.userPhone && (
                        <a
                          href={`https://wa.me/${activeThread.userPhone.replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400 flex items-center gap-1"
                        >
                          <Phone size={11} />
                          <span>{activeThread.userPhone}</span>
                        </a>
                      )}
                      {activeThread.userEmail && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} />
                          <span>{activeThread.userEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/orders?search=${encodeURIComponent(activeThread.userName)}`}
                    className="px-3 py-1.5 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent text-xs font-bold text-text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <Package size={13} />
                    <span>Lihat Pesanan</span>
                  </Link>
                </div>
              </div>

              {/* Area Pesan Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/40 text-xs">
                {loadingMessages ? (
                  <div className="text-center text-text-muted py-12">Memuat riwayat chat...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-text-muted py-12">
                    Belum ada riwayat pesan dengan pelanggan ini.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFromAdmin = m.senderRole === "ADMIN";
                    const isFromBot = m.senderRole === "BOT";

                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-2.5 ${
                          isFromAdmin ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isFromAdmin && (
                          <div className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                            {isFromBot ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src="/mascot/mascot-primary.png"
                                alt="Kamito"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <User size={14} className="text-text-muted" />
                            )}
                          </div>
                        )}

                        <div
                          className={`p-3.5 rounded-2xl max-w-[75%] shadow-sm space-y-1.5 ${
                            isFromAdmin
                              ? "bg-amber-500/15 border border-amber-500/40 text-text-primary rounded-tr-sm"
                              : "bg-surface border border-border-subtle text-text-primary rounded-tl-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] font-mono">
                            <span className="font-bold text-brand-accent">
                              {isFromAdmin
                                ? "Kamito / Admin Workshop"
                                : isFromBot
                                ? "Kamito Bot"
                                : activeThread.userName}
                            </span>
                            <span className="text-text-muted">
                              {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                          </p>

                          {isFromAdmin && (
                            <div className="flex justify-end text-text-muted">
                              {m.isRead ? <CheckCheck size={12} className="text-emerald-400" /> : <Check size={12} />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Template Balasan Cepat */}
              <div className="px-4 py-2 bg-surface/70 border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-mono text-text-muted uppercase font-bold shrink-0">
                  TEMPLATE:
                </span>
                {ADMIN_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSend(tmpl)}
                    className="px-2.5 py-1 rounded-full bg-canvas border border-border-subtle hover:border-brand-accent text-[11px] text-text-muted hover:text-text-primary whitespace-nowrap transition-colors"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <div className="p-4 bg-surface border-t border-border-subtle shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSend();
                  }}
                  className="flex items-end gap-2.5"
                >
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    maxLength={2000}
                    placeholder={`Balas pesan ke ${activeThread.userName} (sebagai Kamito / Admin)...`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none max-h-32 leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  >
                    <span>KIRIM</span>
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted space-y-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mascot/mascot-primary.png"
                  alt="Kamito Mascot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-sm text-text-primary">
                  Pusat Komunikasi & Chat Kamito
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-sm">
                  Pilih salah satu percakapan pelanggan dari daftar di sebelah kiri untuk membaca dan membalas pesan.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
