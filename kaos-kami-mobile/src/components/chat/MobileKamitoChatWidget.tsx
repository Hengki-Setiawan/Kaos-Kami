"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, ShieldCheck, Clock, ExternalLink, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/mobileApiClient";
import { haptic } from "@/lib/bridge/haptics";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isAdmin?: boolean;
}

interface AdminPresence {
  isAdminOnline: boolean;
  statusText: string;
  operatingHours: string;
}

const QUICK_QUESTIONS = [
  "Berapa lama proses sablon DTF?",
  "Bisa pesan satuan atau harus grosir?",
  "Alamat workshop konveksi Makassar?",
  "Bantu cek resolusi file desain saya",
];

export function MobileKamitoChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [presence, setPresence] = useState<AdminPresence>({
    isAdminOnline: true,
    statusText: "Online sekarang",
    operatingHours: "09.00 - 21.00 WITA",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ambil userId lokal atau buat tamu
  const getUserId = () => {
    try {
      let uid = localStorage.getItem("kaoskami_user_id");
      if (!uid) {
        uid = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem("kaoskami_user_id", uid);
      }
      return uid;
    } catch {
      return "guest_mobile";
    }
  };

  // Muat status kehadiran
  useEffect(() => {
    let alive = true;
    const checkPresence = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/presence`);
        if (res.ok) {
          const data = await res.json();
          if (alive && data) {
            setPresence({
              isAdminOnline: data.isAdminOnline ?? true,
              statusText: data.statusText || (data.isAdminOnline ? "Online sekarang" : "Aktif beberapa saat lalu"),
              operatingHours: data.operatingHours || "09.00 - 21.00 WITA",
            });
          }
        }
      } catch {
        // Fallback default
      }
    };

    void checkPresence();
    const interval = setInterval(checkPresence, 60000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Muat riwayat pesan
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kaoskami_mobile_chat_history");
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // Pesan sambutan perdana dari Kamito
        const welcome: ChatMessage = {
          id: "welcome_0",
          senderId: "kamito_mascot",
          senderName: "Kamito • Asisten Sablon",
          content: "Halo! Saya Kamito dari konveksi Kaos Kami Makassar. Ada yang bisa saya bantu seputar sablon DTF, pilihan bahan combed, atau konfirmasi pesananmu?",
          createdAt: new Date().toISOString(),
          isAdmin: true,
        };
        setMessages([welcome]);
      }
    } catch {}
  }, []);

  // Simpan riwayat
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("kaoskami_mobile_chat_history", JSON.stringify(messages.slice(-50)));
      } catch {}
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Listener event eksternal: buka chat dengan nomor pesanan
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ orderNumber?: string; message?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.orderNumber) {
        setInputVal(`Halo Kamito, saya ingin tanya seputar Pesanan #${customEvent.detail.orderNumber}: `);
      } else if (customEvent.detail?.message) {
        setInputVal(customEvent.detail.message);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    };

    window.addEventListener("open-kamito-chat", handleOpen);
    return () => window.removeEventListener("open-kamito-chat", handleOpen);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const raw = textToSend || inputVal;
    if (!raw.trim() || isSending) return;

    // Batas karakter & sanitasi XSS
    if (raw.length > 2000) {
      alert("Pesan maksimal 2000 karakter.");
      return;
    }

    const clean = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    const uid = getUserId();
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: uid,
      senderName: "Saya",
      content: clean,
      createdAt: new Date().toISOString(),
      isAdmin: false,
    };

    haptic.tap();
    setMessages((prev) => [...prev, newMsg]);
    setInputVal("");
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: uid,
          senderName: "Pelanggan Mobile",
          content: clean,
          receiverId: "kamito_mascot",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setTimeout(() => {
            const replyMsg: ChatMessage = {
              id: `reply_${Date.now()}`,
              senderId: "kamito_mascot",
              senderName: "Kamito / Admin Workshop",
              content: data.reply.content || "Pesan kamu sudah diterima operator workshop Kaos Kami Makassar.",
              createdAt: new Date().toISOString(),
              isAdmin: true,
            };
            setMessages((prev) => [...prev, replyMsg]);
            void haptic.success();
          }, 600);
        }
      }
    } catch {
      // Fallback ramah jika server offline
      setTimeout(() => {
        const fallbackMsg: ChatMessage = {
          id: `reply_${Date.now()}`,
          senderId: "kamito_mascot",
          senderName: "Kamito (Offline Bot)",
          content: "Pesanmu sudah tercatat. Bila butuh respon cepat, kamu juga bisa langsung menghubungi WhatsApp workshop kami.",
          createdAt: new Date().toISOString(),
          isAdmin: true,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }, 700);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Kamito Pill */}
      {!isOpen && (
        <button
          onClick={() => {
            haptic.tap();
            setIsOpen(true);
          }}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl text-white hover:border-[#FF6B35] transition-transform active:scale-95"
          aria-label="Tanya Kamito"
        >
          <div className="relative w-7 h-7 rounded-full overflow-hidden bg-orange-500/20 border border-orange-500/40 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/mascot-primary.png"
              alt="Kamito"
              className="w-full h-full object-cover"
            />
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${
                presence.isAdminOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
              }`}
            />
          </div>
          <div className="text-left">
            <span className="text-[11px] font-bold block leading-tight font-['Syne'] text-[#FF6B35]">
              Tanya Kamito
            </span>
            <span className="text-[9px] text-zinc-400 block leading-none font-mono">
              {presence.statusText}
            </span>
          </div>
        </button>
      )}

      {/* Slide-Up Chat Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md h-[85dvh] max-h-[640px] flex flex-col rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-orange-500/20 border border-orange-500/40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascot/mascot-primary.png"
                    alt="Kamito Mascot"
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-900 ${
                      presence.isAdminOnline ? "bg-emerald-500" : "bg-zinc-500"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold font-['Syne']">KAMITO</h3>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-500/15 text-[#FF6B35] border border-orange-500/30">
                      AI & Workshop
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-zinc-500" />
                    <span>{presence.operatingHours} • {presence.statusText}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href="https://wa.me/62895803463032?text=Halo%20Admin%20Kaos%20Kami%20Makassar,%20saya%20ingin%20konsultasi%20sablon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                  title="WhatsApp Workshop"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Message History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/40 text-xs">
              {messages.map((m) => {
                const isMe = !m.isAdmin;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[9px] text-zinc-500 font-mono mb-1 px-1">
                      {m.senderName}
                    </span>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-[#FF6B35] text-white rounded-br-none shadow-md shadow-orange-600/20 font-sans"
                          : "bg-zinc-800/90 text-zinc-200 rounded-bl-none border border-zinc-700/60 font-sans"
                      }`}
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                    <span className="text-[8px] text-zinc-600 font-mono mt-0.5 px-1">
                      {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
              {isSending && (
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono italic">
                  <span>Kamito sedang mengetik</span>
                  <span className="animate-pulse">...</span>
                </div>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-3 py-2 border-t border-zinc-800/60 bg-zinc-900/90 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#FF6B35] transition-colors shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Tanya Kamito seputar sablon atau order..."
                maxLength={2000}
                className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6B35]"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isSending}
                className="w-9 h-9 rounded-xl bg-[#FF6B35] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-md shadow-orange-600/30 transition-transform active:scale-95"
                aria-label="Kirim Pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
