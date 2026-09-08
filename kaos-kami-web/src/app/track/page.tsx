"use client";

import React, { useState } from "react";
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

/** Lacak pesanan tanpa daftar: WA → OTP → daftar order. */
export default function TrackPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  const sendOtp = async () => {
    if (phone.replace(/[^0-9]/g, "").length < 9) {
      setMsg("Nomor WA tidak valid.");
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
      const data = await res.json();
      if (!res.ok || (!data.success && !data.mock)) throw new Error(data.error || "Gagal kirim OTP");
      setStep(2);
      setMsg("Kode terkirim ke WA. Berlaku 5 menit.");
    } catch (e: any) {
      setMsg(e?.message || "Gagal kirim OTP.");
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (code.trim().length < 4) {
      setMsg("Isi kode OTP.");
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
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal lacak");
      setOrders(data.orders || []);
      setStep(3);
    } catch (e: any) {
      setMsg(e?.message || "Gagal lacak.");
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
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <label className="block font-mono text-xs text-text-muted">
            Nomor WhatsApp pesanan
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              inputMode="tel"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white"
            />
          </label>
          <button onClick={sendOtp} disabled={busy} className="w-full py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
            {busy ? "Mengirim…" : "Kirim kode OTP"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <label className="block font-mono text-xs text-text-muted">
            Kode OTP 6 digit
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white text-center text-xl tracking-[0.5em]"
            />
          </label>
          <button onClick={check} disabled={busy} className="w-full py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
            {busy ? "Memeriksa…" : "Lihat pesananku"}
          </button>
          <button onClick={() => setStep(1)} className="w-full font-mono text-[11px] text-text-muted hover:text-white">
            Ganti nomor
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="font-mono text-xs text-text-muted p-6 text-center border border-dashed border-white/10 rounded-2xl">
              Tidak ada pesanan untuk nomor ini.
            </p>
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
          <button onClick={() => { setStep(1); setCode(""); setOrders([]); }} className="w-full font-mono text-[11px] text-text-muted hover:text-white">
            Lacak nomor lain
          </button>
        </div>
      )}

      {msg && (
        <p className="font-mono text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">{msg}</p>
      )}
    </div>
  );
}
