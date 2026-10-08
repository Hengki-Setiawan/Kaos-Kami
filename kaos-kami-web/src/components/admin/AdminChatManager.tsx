"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChatQuickMacros } from "@/components/admin/ChatQuickMacros";
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
  Shield,
  Bot,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";

export interface ComplaintItem {
  id: string;
  orderId: string;
  userId: string;
  category: string;
  message: string;
  photoUrls?: string | null;
  status: string;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    totalIdr: number;
    status: string;
    deliveryMethod?: string | null;
    trackingNumber?: string | null;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
}

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



function parsePhotoUrls(photoUrls?: string | null): string[] {
  if (!photoUrls) return [];
  try {
    const parsed = JSON.parse(photoUrls);
    if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === "string");
  } catch {
    if (photoUrls.includes(",")) {
      return photoUrls.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [photoUrls.trim()];
  }
  return [];
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

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
  // Mode CS lokal saja (tanpa ubah API/DB): false = Kamito AI aktif,
  // true = Human CS ambil alih balasan thread ini.
  const [humanTakeover, setHumanTakeover] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "complaints">("chat");
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [resolutionInput, setResolutionInput] = useState("");
  const [updatingComplaint, setUpdatingComplaint] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("filter") === "complaint") {
        setActiveTab("complaints");
      }
    } catch {}
  }, []);

  const loadComplaints = useCallback(async () => {
    setLoadingComplaints(true);
    try {
      const res = await fetch("/api/admin/complaints", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.items)) {
        setComplaints(data.items);
        if (!selectedComplaintId && data.items.length > 0) {
          setSelectedComplaintId(data.items[0].id);
        }
      }
    } catch {}
    finally {
      setLoadingComplaints(false);
    }
  }, [selectedComplaintId]);

  useEffect(() => {
    if (activeTab === "complaints") {
      void loadComplaints();
      const interval = setInterval(() => {
        void loadComplaints();
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadComplaints]);

  const handleUpdateComplaintStatus = async (newStatus: string) => {
    if (!selectedComplaintId) return;
    setUpdatingComplaint(true);
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedComplaintId,
          status: newStatus,
          resolutionNote: resolutionInput,
        }),
      });
      if (res.ok) {
        setResolutionInput("");
        await loadComplaints();
      }
    } catch {}
    finally {
      setUpdatingComplaint(false);
    }
  };

  const openComplaintsCount = complaints.filter((c) => c.status === "OPEN").length;

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

  const parsePhotoUrls = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === "string");
    } catch {}
    if (raw.startsWith("http")) return [raw];
    return [];
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.order?.orderNumber && c.order.orderNumber.toLowerCase().includes(q)) ||
      (c.user?.name && c.user.name.toLowerCase().includes(q)) ||
      (c.user?.phoneNumber && c.user.phoneNumber.includes(q)) ||
      c.category.toLowerCase().includes(q) ||
      c.message.toLowerCase().includes(q)
    );
  });

  const activeThread = threads.find((t) => t.userId === selectedUserId);
  const activeComplaint = complaints.find((c) => c.id === selectedComplaintId);

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] bg-canvas border border-border-subtle rounded-2xl overflow-hidden font-sans shadow-lg">
      <div className="flex flex-1 min-h-0 divide-x divide-border-subtle">
        {/* Kolom Kiri: Daftar Chat / Komplain Pelanggan */}
        <div className={`${(activeTab === "chat" ? selectedUserId : selectedComplaintId) ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-surface`}>
          {/* Header & Tabs */}
          <div className="p-4 border-b border-border-subtle space-y-3">
            {/* Tab Navigasi: Chat vs Komplain Resmi */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-border-subtle text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-brand-accent text-canvas shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <MessageSquare size={13} />
                <span>Chat ({threads.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("complaints");
                  void loadComplaints();
                }}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "complaints"
                    ? "bg-amber-500 text-canvas shadow-xs font-bold"
                    : openComplaintsCount > 0
                    ? "text-amber-500 hover:text-amber-400 font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <AlertTriangle size={13} />
                <span>Komplain ({openComplaintsCount})</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-xs uppercase tracking-tight text-text-primary">
                {activeTab === "chat" ? "DAFTAR PERCAKAPAN" : "DAFTAR KOMPLAIN MASUK"}
              </span>
              <button
                type="button"
                onClick={() => (activeTab === "chat" ? void loadThreads() : void loadComplaints())}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors cursor-pointer"
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
                placeholder={activeTab === "chat" ? "Cari nama, email, nomor..." : "Cari no. order, keluhan, nama..."}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>

          {/* List Threads atau Komplain */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/60">
            {activeTab === "chat" ? (
              loadingThreads ? (
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
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 hover:bg-canvas/50 cursor-pointer ${
                        isSelected ? "bg-canvas border-l-2 border-l-brand-accent" : ""
                      }`}
                    >
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
              )
            ) : (
              /* TAB KOMPLAIN */
              loadingComplaints ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Memuat daftar komplain...
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted space-y-1">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500/60 mb-2" />
                  <p className="font-bold">Tidak ada komplain</p>
                  <p className="text-[11px] opacity-70">
                    Semua pesanan pelanggan saat ini berjalan lancar tanpa laporan komplain.
                  </p>
                </div>
              ) : (
                filteredComplaints.map((c) => {
                  const isSelected = c.id === selectedComplaintId;
                  const hasPhotos = parsePhotoUrls(c.photoUrls).length > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedComplaintId(c.id)}
                      className={`w-full p-3.5 text-left transition-colors flex flex-col gap-1.5 hover:bg-canvas/50 cursor-pointer ${
                        isSelected ? "bg-canvas border-l-2 border-l-amber-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-accent">
                          #{c.order?.orderNumber || c.orderId.slice(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === "OPEN"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                              : c.status === "RESOLVED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary truncate">
                          {c.user?.name || "Pelanggan"}
                        </span>
                        <span className="text-[10px] text-text-muted shrink-0 font-mono">
                          {formatTime(c.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted line-clamp-1">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          [{c.category}]
                        </span>
                        <span>{c.message}</span>
                      </div>

                      {hasPhotos && (
                        <div className="flex items-center gap-1 text-[10px] text-brand-accent font-semibold">
                          <ImageIcon size={11} />
                          <span>Bukti Foto Dilampirkan</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tampilan Percakapan Aktif / Detail Komplain */}
        <div
          className={`${
            (activeTab === "chat" ? selectedUserId : selectedComplaintId) ? "flex" : "hidden md:flex"
          } flex-1 flex-col bg-canvas min-w-0`}
        >
          {activeTab === "complaints" ? (
            activeComplaint ? (
              <>
                {/* Header Komplain */}
                <div className="p-4 border-b border-border-subtle bg-surface flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintId(null)}
                      className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas mr-0.5 cursor-pointer"
                      title="Kembali ke daftar komplain"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-text-primary">
                          #{activeComplaint.order?.orderNumber || activeComplaint.orderId.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-500 border-amber-500/30">
                          {activeComplaint.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            activeComplaint.status === "OPEN"
                              ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                              : activeComplaint.status === "IN_PROGRESS"
                              ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                              : activeComplaint.status === "RESOLVED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-neutral-500/15 text-neutral-400 border-neutral-500/30"
                          }`}
                        >
                          {activeComplaint.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1 font-mono">
                        <span>Diajukan: {new Date(activeComplaint.createdAt).toLocaleString("id-ID")}</span>
                        {activeComplaint.resolvedAt && (
                          <span>• Diselesaikan: {new Date(activeComplaint.resolvedAt).toLocaleString("id-ID")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeComplaint.order && (
                      <Link
                        href={`/admin/orders/${activeComplaint.order.id}`}
                        className="px-3 py-1.5 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent text-xs font-bold text-text-primary flex items-center gap-1.5 transition-colors"
                      >
                        <Package size={13} />
                        <span>Buka Order</span>
                        <ExternalLink size={12} className="opacity-60" />
                      </Link>
                    )}
                    {activeComplaint.user?.phoneNumber && (
                      <a
                        href={`https://wa.me/${activeComplaint.user.phoneNumber.replace(/^0/, "62")}?text=${encodeURIComponent(
                          `Halo Kak ${activeComplaint.user.name || ""}, kami dari Workshop Kaos Kami ingin menindaklanjuti komplain terkait pesanan #${activeComplaint.order?.orderNumber || activeComplaint.orderId.slice(0, 8)} (${activeComplaint.category}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-colors"
                      >
                        <Phone size={13} />
                        <span>Hubungi via WA</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Body Detail Komplain */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-canvas/40 text-xs">
                  {/* Info Pelanggan & Pesanan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                        <User size={12} />
                        <span>Data Pelanggan</span>
                      </div>
                      <div className="font-bold text-sm text-text-primary">
                        {activeComplaint.user?.name || "Nama Tidak Diketahui"}
                      </div>
                      <div className="text-text-muted space-y-0.5 font-mono text-[11px]">
                        <div>Telp: {activeComplaint.user?.phoneNumber || "-"}</div>
                        <div>Email: {activeComplaint.user?.email || "-"}</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                        <Package size={12} />
                        <span>Ringkasan Order</span>
                      </div>
                      <div className="font-bold text-sm text-brand-accent">
                        {activeComplaint.order ? formatRupiah(activeComplaint.order.totalIdr) : "-"}
                      </div>
                      <div className="text-text-muted space-y-0.5 font-mono text-[11px]">
                        <div>Status Order: <span className="text-text-primary font-bold">{activeComplaint.order?.status || "-"}</span></div>
                        <div>Metode Kirim: {activeComplaint.order?.deliveryMethod || "-"}</div>
                        {activeComplaint.order?.trackingNumber && (
                          <div>No. Resi: {activeComplaint.order.trackingNumber}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Isi Pesan Komplain */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle size={14} />
                      <span>Keluhan / Deskripsi Kendala ({activeComplaint.category}):</span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap bg-surface/70 p-3.5 rounded-lg border border-border-subtle">
                      {activeComplaint.message}
                    </p>
                  </div>

                  {/* Lampiran Foto Bukti */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-brand-accent" />
                      <span>Bukti Foto Kerusakan / Kendala</span>
                    </div>
                    {parsePhotoUrls(activeComplaint.photoUrls).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {parsePhotoUrls(activeComplaint.photoUrls).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square rounded-xl overflow-hidden border border-border-subtle bg-surface hover:border-brand-accent transition-all block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Bukti komplain ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                              <ExternalLink size={12} />
                              <span>Lihat Penuh</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-border-subtle text-text-muted text-center text-xs">
                        Pelanggan tidak melampirkan foto pada komplain ini.
                      </div>
                    )}
                  </div>

                  {/* Catatan Penyelesaian / Riwayat Penanganan */}
                  {activeComplaint.resolutionNote && (
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        <span>Catatan Investigasi / Resolusi Terakhir:</span>
                      </div>
                      <p className="text-xs text-text-primary whitespace-pre-wrap font-mono bg-canvas p-2.5 rounded-lg border border-border-subtle">
                        {activeComplaint.resolutionNote}
                      </p>
                    </div>
                  )}

                  {/* Form Update Resolusi */}
                  <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
                    <label className="block text-xs font-bold text-text-primary">
                      Tulis Catatan / Tindak Lanjut Komplain
                    </label>
                    <textarea
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      placeholder="Contoh: Baju cacat jahitan disetujui untuk dicetak ulang & dikirim ulang gratis..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent resize-none leading-relaxed"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={updatingComplaint}
                        onClick={() => handleUpdateComplaintStatus("IN_PROGRESS")}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-bold text-xs hover:bg-sky-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Set Dalam Investigasi
                      </button>
                      <button
                        type="button"
                        disabled={updatingComplaint}
                        onClick={() => handleUpdateComplaintStatus("RESOLVED")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:brightness-110 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Selesaikan Komplain</span>
                      </button>
                      <button
                        type="button"
                        disabled={updatingComplaint}
                        onClick={() => handleUpdateComplaintStatus("REJECTED")}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Tolak Komplain
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted space-y-3">
                <AlertTriangle size={36} className="text-amber-500/60" />
                <div>
                  <p className="font-bold text-sm text-text-primary">Pilih Komplain Pelanggan</p>
                  <p className="text-xs text-text-muted mt-1 max-w-sm">
                    Pilih salah satu laporan komplain dari daftar sebelah kiri untuk melihat rincian kendala dan bukti foto.
                  </p>
                </div>
              </div>
            )
          ) : activeThread ? (
            <>
              {/* Header Percakapan */}
              <div className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas mr-0.5 cursor-pointer"
                    title="Kembali ke daftar pesan"
                  >
                    <ChevronLeft size={20} />
                  </button>
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
                  {/* Status mode CS (state lokal saja — tanpa ubah API/DB) */}
                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded-full font-bold border ${
                      humanTakeover
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                    }`}
                    title={humanTakeover ? "Balasan manual Human CS (lokal)" : "Balasan otomatis Kamito AI aktif (lokal)"}
                  >
                    {humanTakeover ? "Human CS Aktif" : "Kamito AI Aktif"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHumanTakeover((v) => !v)}
                    aria-pressed={humanTakeover}
                    title="Alihkan balasan antara Kamito AI dan Human CS (lokal saja)"
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      humanTakeover
                        ? "bg-canvas border-border-subtle text-text-muted hover:text-text-primary"
                        : "bg-brand-accent/15 border-brand-accent/40 text-brand-accent hover:brightness-110"
                    }`}
                  >
                    {humanTakeover ? "Kembalikan ke Kamito AI" : "Ambil Alih Human CS"}
                  </button>
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
                                src="/mascot/kamito-avatar.png"
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
                          <div className="flex items-center justify-between gap-4 text-[10px] font-mono border-b border-white/5 pb-1">
                            <span className="font-bold flex items-center gap-1.5 text-brand-accent">
                              {isFromAdmin ? (
                                <>
                                  <Shield size={11} className="text-amber-500 shrink-0" />
                                  <span>Staff Workshop Kaos Kami</span>
                                </>
                              ) : isFromBot ? (
                                <>
                                  <Bot size={11} className="text-blue-400 shrink-0" />
                                  <span>Asisten AI Kamito</span>
                                </>
                              ) : (
                                <>
                                  <User size={11} className="text-sky-400 shrink-0" />
                                  <span>{m.senderName || activeThread.userName} (Pelanggan)</span>
                                </>
                              )}
                            </span>
                            <span className="text-text-muted shrink-0">
                              {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              WITA
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                          </p>

                          {m.orderId && (
                            <div className="pt-1">
                              <Link
                                href={`/admin/orders/${m.orderId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-mono text-brand-accent hover:underline"
                              >
                                <Package size={10} />
                                <span>No. Order: {m.orderId}</span>
                              </Link>
                            </div>
                          )}

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

              {/* Macro & Template Balasan Cepat Ringkas */}
              <ChatQuickMacros
                disabled={!activeThread}
                onPick={(t) => {
                  setInputText(t);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              />

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
                    className="px-4 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shrink-0 cursor-pointer"
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
                  src="/mascot/kamito-avatar.png"
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
