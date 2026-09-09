"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalIdr: number;
  createdAt: string;
  deliveryMethod: string;
  items: { quantity: number; snapshotName: string }[];
}

const OTP_VALID_SECONDS = 5 * 60;

/** Lacak pesanan tanpa daftar: WA → OTP → daftar order. */
export default function TrackPage() {
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
    if (phone.replace(/[^0-9]/g, "").length < 9) {
      say("err", "Nomor WA tidak valid.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || (!data.success && !data.mock)) throw new Error(data?.error || "Gagal kirim OTP");
      setOtpSentAt(Date.now());
      setNowTs(Date.now());
      setCode("");
      setStep(2);
      say("ok", `Kode terkirim ke ${phone}. Berlaku 5 menit.`);
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
      const res = await fetch("/api/track/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, code: code.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal lacak");
      setOrders(data.orders || []);
      setStep(3);
      say("ok", `Ditemukan ${(data.orders || []).length} pesanan untuk ${phone}.`);
    } catch (e: any) {
      say("err", e?.message || "Gagal lacak.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-12 max-w-xl mx-auto space-y-6">
      <Link href="/" className="font-mono text-xs text-text-muted hover:text-brand-accent">
        ← KEMBALI KE BERANDA
      </Link>
      <div>
        <h1 className="font-display text-2xl font-black uppercase text-white">Lacak Pesanan</h1>
        <p className="font-mono text-xs text-text-muted mt-1">Tanpa daftar — cukup nomor WA + kode OTP.</p>
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp();
          }}
          className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3"
        >
          <label className="block font-mono text-xs text-text-muted">
            Nomor WhatsApp pesanan
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white"
            />
          </label>
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
            {busy ? "Mengirim…" : "Kirim kode OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={check} className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <p className="font-mono text-[11px] text-text-muted">
            Kode dikirim ke <span className="text-white font-bold">{phone}</span>
          </p>
          <label className="block font-mono text-xs text-text-muted">
            Kode OTP 6 digit
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white text-center text-xl tracking-[0.5em]"
            />
          </label>
          <p className={`font-mono text-[11px] ${otpExpired ? "text-rose-300" : "text-text-muted"}`}>
            {otpExpired ? "Kode kedaluwarsa — kirim ulang." : `Berlaku ${mm}:${ss}`}
          </p>
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
            {busy ? "Memeriksa…" : "Lihat pesananku"}
          </button>
          <div className="flex justify-between">
            <button type="button" onClick={sendOtp} disabled={busy || otpLeft > 240} className="font-mono text-[11px] text-brand-accent hover:underline disabled:opacity-50">
              {otpLeft > 240 ? `Kirim ulang (${mm}:${ss})` : "Kirim ulang kode"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="font-mono text-[11px] text-text-muted hover:text-white">
              Ganti nomor
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
              <p className="font-mono text-xs text-text-muted">Tidak ada pesanan untuk nomor ini.</p>
              <Link href="/catalog" className="inline-block px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase">
                MULAI PESAN KAOS
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl bg-[#141416] border border-white/5 font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{o.orderNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-text-muted text-[11px]">
                  {o.items.reduce((a, it) => a + it.quantity, 0)} item · {o.deliveryMethod} · Rp {o.totalIdr.toLocaleString("id-ID")}
                </p>
                <Link href={`/orders/${o.id}`} className="text-brand-accent text-[11px] font-bold hover:underline">
                  BUKA INVOICE →
                </Link>
              </div>
            ))
          )}
          <button onClick={() => { setStep(1); setCode(""); setOrders([]); setOtpSentAt(null); }} className="w-full font-mono text-[11px] text-text-muted hover:text-white">
            Lacak nomor lain
          </button>
        </div>
      )}

      {msg && (
        <p
          role={msgKind === "err" ? "alert" : "status"}
          className={`font-mono text-xs rounded-xl p-3 border ${
            msgKind === "ok"
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
              : "text-amber-300 bg-amber-500/10 border-amber-500/30"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
