"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
// Normalisasi phone ID (08…/62…) SEBELUM kirim/cek OTP — selaras CheckoutModal.
import { normalizePhoneId } from "@/lib/phone";
import { ArrowLeft, Search, ShieldCheck, KeyRound, Clock, Package, ArrowRight, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, Truck } from "lucide-react";

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalIdr: number;
  createdAt: string;
  deliveryMethod: string;
  // Opsional defensif: API /api/track/orders existing BELUM mengembalikan
  // kolom ini (tanpa ubah API) — bila backend kelak menyertakan, UI langsung tampil.
  trackingNumber?: string | null;
  courierNotes?: string | null;
  reviewNote?: string | null;
  items: { quantity: number; snapshotName: string }[];
}

/** Cermin orders/[id] I6: tautan lacak kurir dari info ekspedisi (tampilan saja). */
function buildTrackingUrl(resi: string, hint: string): string | null {
  const r = resi.trim();
  if (!r) return null;
  const notes = (hint || "").toUpperCase();
  const map: Array<[RegExp, (v: string) => string]> = [
    [/JNE/, (v) => `https://www.jne.co.id/id/tracking/trace/${encodeURIComponent(v)}`],
    [/J&T|JNT/, (v) => `https://jet.co.id/track?awb=${encodeURIComponent(v)}`],
    [/SICEPAT/, (v) => `https://www.sicepat.com/checkAwb/${encodeURIComponent(v)}`],
    [/NINJA/, (v) => `https://www.ninjavan.co/id-id/tracking?id=${encodeURIComponent(v)}`],
    [/GOSEND|GOJEK/, () => `https://gojek.com/id-id/gosend/`],
    [/GRAB/, () => `https://www.grab.com/id/express/`],
    [/ANTER/, (v) => `https://anteraja.id/tracking/search/${encodeURIComponent(v)}`],
    [/LION|JAGOPACK/, (v) => `https://lionparcel.com/track?stt_no=${encodeURIComponent(v)}`],
    [/\bPOS\b|POS INDONESIA/, (v) => `https://www.posindonesia.co.id/id/tracking?awb=${encodeURIComponent(v)}`],
    [/TIKI/, (v) => `https://tiki.id/id/tracking?cnno=${encodeURIComponent(v)}`],
  ];
  for (const [re, build] of map) {
    if (re.test(notes)) return build(r);
  }
  return null;
}

const OTP_VALID_SECONDS = 5 * 60;

function getStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s.includes("DELIVERED") || s.includes("COMPLETED")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
  if (s.includes("PRODUC") || s.includes("PRINT") || s.includes("PROCESS") || s.includes("SHIPPED")) {
    return "bg-sky-500/15 text-sky-400 border-sky-500/30";
  }
  if (s.includes("CANCEL") || s.includes("REJECT") || s.includes("EXPIRED")) {
    return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  }
  return "bg-amber-500/15 text-amber-400 border-amber-500/30";
}

/** Lacak pesanan tanpa daftar: WA → OTP → daftar order. */

/** Timeline vertikal perjalanan pesanan dari status existing (tampilan saja).
 *  Rantai SSOT: DESIGN_REVIEW → PENDING_PAYMENT → PAYMENT_CONFIRMED →
 *  IN_PRODUCTION_QUEUE → PRINTING → QUALITY_CHECK → READY_TO_SHIP →
 *  SHIPPED → DELIVERED → COMPLETED. */
const JOURNEY_STEPS = ["Dipesan", "Dibayar", "Produksi", "Dikirim", "Diterima"] as const;

function journeyIndex(status: string): number {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "DELIVERED") return 4;
  if (s === "SHIPPED" || s === "READY_TO_SHIP") return 3;
  if (["PAYMENT_CONFIRMED", "IN_PRODUCTION_QUEUE", "PRINTING", "QUALITY_CHECK"].includes(s)) return 2;
  if (["DESIGN_REVIEW", "PENDING_PAYMENT", "PENDING"].includes(s)) return 0;
  return -1; // terminal batal: CANCELLED / REJECTED / REFUNDED / EXPIRED
}

function JourneyTimeline({ status }: { status: string }) {
  const idx = journeyIndex(status);
  if (idx < 0) {
    return (
      <p className="font-sans text-[11px] text-rose-400 font-bold px-1">
        Pesanan {status.replace(/_/g, " ").toLowerCase()} (perjalanan dihentikan).
      </p>
    );
  }
  return (
    <ol aria-label="Perjalanan pesanan" className="relative ml-1.5 border-l-2 border-border-subtle">
      {JOURNEY_STEPS.map((label, i) => {
        const isNow = i === idx;
        const todo = i > idx;
        return (
          <li key={label} className="relative flex items-start gap-2.5 pb-3 pl-4 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute -left-[7px] top-0.5 w-3 h-3 rounded-full border-2 ${
                todo
                  ? "bg-surface border-border-subtle"
                  : isNow
                    ? "bg-brand-accent border-brand-accent shadow-[0_0_8px_rgba(230,81,0,0.6)] animate-pulse"
                    : "bg-emerald-500 border-emerald-500"
              }`}
            />
            <div className="flex-1 flex items-center justify-between gap-2">
              <span
                className={`font-sans text-[11px] font-bold ${
                  todo ? "text-text-muted" : isNow ? "text-brand-accent" : "text-text-primary"
                }`}
              >
                {label}
                {isNow && <span className="ml-1.5 text-[9px] uppercase tracking-wider">← posisi kini</span>}
              </span>
              {!todo && !isNow && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export function TrackClient() {
  // ?needLogin=1 (redirect dashboard tamu): jelaskan kenapa mendarat di sini.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("needLogin") === "1") {
        say("ok", "Riwayat pesanan butuh login. Masuk dulu, atau lacak via WA+OTP di bawah.");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // msgKind: sukses hijau vs error amber (audit H4 — sebelumnya sama-sama amber).
  const [msgKind, setMsgKind] = useState<"ok" | "err">("err");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  // Countdown OTP 5 menit + kirim ulang.
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  // State lokal salin resi (tampilan saja — cermin CustomerDashboardView).
  const [copiedResi, setCopiedResi] = useState<string | null>(null);

  const copyResi = async (resi: string) => {
    try {
      await navigator.clipboard.writeText(resi);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = resi;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        // abaikan — pesan Tersalin tetap jujur hanya bila sukses di atas
        return;
      }
    }
    setCopiedResi(resi);
    window.setTimeout(() => setCopiedResi((v) => (v === resi ? null : v)), 2000);
  };

  useEffect(() => {
    if (step !== 2) return;
    codeRef.current?.focus();
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const otpLeft = otpSentAt ? Math.max(0, OTP_VALID_SECONDS - Math.floor((nowTs - otpSentAt) / 1000)) : 0;
  const otpExpired = step === 2 && otpSentAt !== null && otpLeft <= 0;
  const mm = String(Math.floor(otpLeft / 60)).padStart(2, "0");
  const ss = String(otpLeft % 60).padStart(2, "0");

  const say = (kind: "ok" | "err", text: string) => {
    setMsgKind(kind);
    setMsg(text);
  };

  const sendOtp = async () => {
    // Strip spasi/strip/+/kurung dulu ("+62 812-…" umum dari keyboard HP).
    const norm = normalizePhoneId(phone);
    if (norm) setPhone(norm);
    if (norm.replace(/[^0-9]/g, "").length < 9) {
      say("err", "Nomor WA tidak valid (contoh: 081234567890).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: norm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || (!data.success && !data.mock)) throw new Error(data?.error || "Gagal kirim OTP");
      setOtpSentAt(Date.now());
      setNowTs(Date.now());
      setCode("");
      setStep(2);
      say("ok", `Kode terkirim ke ${norm}. Berlaku 5 menit.`);
    } catch (e: any) {
      say("err", e?.message || "Gagal kirim OTP.");
    } finally {
      setBusy(false);
    }
  };

  const check = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.trim().length !== 6) {
      say("err", "Kode OTP harus 6 digit.");
      return;
    }
    if (otpExpired) {
      say("err", "Kode kedaluwarsa. Kirim ulang kode baru.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      // Nomor yang sama dengan saat kirim OTP (server kunci `otp:<clean>`).
      const norm = normalizePhoneId(phone) || phone;
      const res = await fetch("/api/track/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: norm, code: code.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal lacak");
      setOrders(data.orders || []);
      setStep(3);
      say("ok", `Ditemukan ${(data.orders || []).length} pesanan untuk ${norm}.`);
    } catch (e: any) {
      say("err", e?.message || "Gagal lacak.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-12 max-w-xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-text-muted hover:text-brand-accent transition-colors">
        <ArrowLeft size={14} />
        <span>Kembali ke Beranda</span>
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
            <Search size={18} />
          </span>
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-text-primary">
              Lacak Pesanan
            </h1>
            <p className="font-sans text-xs text-text-muted mt-0.5">
              Akses cepat tanpa login. Cukup verifikasi nomor WhatsApp dan kode OTP resmi.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Step Indicator */}
      <div className="grid grid-cols-3 gap-2 text-center font-sans text-[11px] font-bold">
        <div className={`p-2 rounded-xl border transition-all ${step >= 1 ? "bg-brand-accent/10 border-brand-accent text-brand-accent" : "bg-surface border-border-subtle text-text-muted"}`}>
          1. Nomor WA
        </div>
        <div className={`p-2 rounded-xl border transition-all ${step >= 2 ? "bg-brand-accent/10 border-brand-accent text-brand-accent" : "bg-surface border-border-subtle text-text-muted"}`}>
          2. Kode OTP
        </div>
        <div className={`p-2 rounded-xl border transition-all ${step === 3 ? "bg-brand-accent/10 border-brand-accent text-brand-accent" : "bg-surface border-border-subtle text-text-muted"}`}>
          3. Riwayat Order
        </div>
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp();
          }}
          className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4 shadow-sm"
        >
          <label className="block space-y-1.5">
            <span className="font-sans text-xs font-bold text-text-primary">
              Nomor WhatsApp Pemesanan
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              inputMode="tel"
              autoComplete="tel"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent transition-colors"
            />
            <span className="font-sans text-[11px] text-text-muted block">
              Gunakan nomor WhatsApp aktif yang Anda daftarkan saat checkout pesanan.
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider disabled:opacity-50 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
          >
            {busy ? "Mengirim Kode…" : "Kirim Kode OTP WhatsApp"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={check} className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs text-text-muted">
              Kode OTP dikirim ke <span className="text-text-primary font-mono font-bold">{phone}</span>
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-sans text-xs text-brand-accent hover:underline font-semibold"
            >
              Ubah Nomor
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="font-sans text-xs font-bold text-text-primary">
              Kode OTP 6 Digit
            </span>
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-center font-mono text-2xl tracking-[0.4em] focus:outline-none focus:border-brand-accent transition-colors"
            />
          </label>

          <p className={`font-mono text-xs flex items-center gap-1.5 ${otpExpired ? "text-rose-400 font-bold" : "text-text-muted"}`}>
            <Clock size={13} />
            <span>{otpExpired ? "Kode OTP kedaluwarsa, silakan minta kode baru." : `Berlaku: ${mm}:${ss}`}</span>
          </p>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider disabled:opacity-50 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
          >
            {busy ? "Memeriksa…" : "Verifikasi & Buka Pesanan"}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={sendOtp}
              disabled={busy || otpLeft > 240}
              className="font-sans text-xs text-brand-accent hover:underline disabled:opacity-40 font-semibold"
            >
              {otpLeft > 240 ? `Kirim ulang kode dalam ${mm}:${ss}` : "Kirim ulang kode baru"}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border-subtle rounded-2xl space-y-3 bg-surface/40">
              <Package size={36} className="mx-auto text-text-muted opacity-40" />
              <p className="font-sans text-sm font-bold text-text-primary">Tidak Ada Pesanan Ditemukan</p>
              <p className="font-sans text-xs text-text-muted">
                Belum ada pesanan aktif atau selesai yang terdaftar dengan nomor WhatsApp ini.
              </p>
              <Link
                href="/catalog"
                className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-md transition-all"
              >
                Mulai Belanja Kaos
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/40 transition-all space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono tabular-nums text-sm font-extrabold text-text-primary">
                      {o.orderNumber}
                    </span>
                    <p className="font-mono text-[11px] text-text-muted">
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider border ${getStatusBadge(o.status)}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Timeline vertikal perjalanan (order → bayar → produksi → kirim → terima) */}
                <div className="py-1">
                  <JourneyTimeline status={o.status} />
                </div>

                {/* Banner Alasan Workshop bila Batal / Tolak / Refund */}
                {(o.status === "REJECTED" || o.status === "CANCELLED" || o.status === "REFUNDED") && (
                  <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
                    o.status === "REFUNDED"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <AlertCircle size={13} className={o.status === "REFUNDED" ? "text-amber-400 shrink-0" : "text-rose-400 shrink-0"} />
                      <span>
                        {o.status === "REJECTED" && "Alasan Desain Ditolak:"}
                        {o.status === "CANCELLED" && "Alasan Pesanan Dibatalkan:"}
                        {o.status === "REFUNDED" && "Keterangan Pengembalian Dana:"}
                      </span>
                    </p>
                    <p className="text-zinc-200 bg-black/40 p-2 rounded-lg border border-white/5 font-sans leading-relaxed text-[11px]">
                      {o.reviewNote || "Tidak ada catatan spesifik. Silakan hubungi WhatsApp CS Kaos Kami."}
                    </p>
                  </div>
                )}

                {/* Nomor resi + salin + link lacak ekspedisi (tampil bila API menyertakan trackingNumber) */}
                {o.trackingNumber?.trim() && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Truck size={15} className="text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-sans text-[10px] text-text-muted block">NOMOR RESI:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider break-all">
                          {o.trackingNumber.trim()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => void copyResi(o.trackingNumber!.trim())}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-sans font-bold text-[11px] flex items-center gap-1.5 transition-all"
                      >
                        {copiedResi === o.trackingNumber!.trim() ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedResi === o.trackingNumber!.trim() ? "Tersalin!" : "Salin Resi"}</span>
                      </button>
                      <a
                        href={
                          buildTrackingUrl(
                            o.trackingNumber.trim(),
                            `${o.deliveryMethod || ""} ${o.courierNotes || ""}`
                          ) || `/orders/${o.id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent font-sans font-bold text-[11px] flex items-center gap-1.5 transition-all"
                        title="Lacak paket di situs ekspedisi (atau invoice bila kurir tak dikenali)"
                      >
                        <span>Lacak Ekspedisi</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle font-sans text-xs">
                  <span className="text-text-muted">
                    {o.items.reduce((a, it) => a + it.quantity, 0)} Pcs · {o.deliveryMethod}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-brand-accent">
                    Rp {o.totalIdr.toLocaleString("id-ID")}
                  </span>
                </div>

                <Link
                  href={`/orders/${o.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface/80 border border-border-subtle hover:border-brand-accent text-brand-accent font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Buka Status & Invoice</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))
          )}

          <button
            onClick={() => {
              setStep(1);
              setCode("");
              setOrders([]);
              setOtpSentAt(null);
            }}
            className="w-full py-2.5 rounded-xl border border-dashed border-border-subtle hover:border-brand-accent/50 font-sans text-xs text-text-muted hover:text-text-primary font-semibold transition-all"
          >
            Lacak dengan Nomor Lain
          </button>
        </div>
      )}

      {msg && (
        <div
          role={msgKind === "err" ? "alert" : "status"}
          className={`font-sans text-xs rounded-xl p-3.5 border flex items-center gap-2 ${
            msgKind === "ok"
              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
              : "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30"
          }`}
        >
          {msgKind === "ok" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{msg}</span>
        </div>
      )}
    </div>
  );
}

