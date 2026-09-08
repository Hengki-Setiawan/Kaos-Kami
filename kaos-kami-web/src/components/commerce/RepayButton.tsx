"use client";

import React, { useState } from "react";

/** Bayar ulang: minta link Duitku baru lalu buka. Gagal → arahkan ke WA admin. */
export function RepayButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");

  const repay = async () => {
    if (state === "busy") return;
    setState("busy");
    setMsg("");
    try {
      const res = await fetch(`/api/orders/${orderId}/repay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error || !data.paymentUrl) {
        throw new Error(data.error || "Gagal buat link baru");
      }
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      setState("error");
      setMsg(e?.message || "Gagal. Minta link via WA di bawah.");
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={repay}
        disabled={state === "busy"}
        className="w-full py-3 px-4 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all"
      >
        {state === "busy" ? "MEMBUAT LINK BARU…" : "💳 BAYAR ULANG SEKARANG"}
      </button>
      <p className="font-mono text-[10px] text-text-muted text-center">
        Link lama otomatis hangus. Bayar SATU link saja.
      </p>
      {msg && <p className="font-mono text-[11px] text-amber-300 text-center">{msg}</p>}
    </div>
  );
}
