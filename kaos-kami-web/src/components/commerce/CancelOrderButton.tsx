"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Pelanggan batalkan order PENDING miliknya (butuh sesi login pemilik). */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const cancel = async () => {
    if (state === "busy" || state === "done") return;
    if (!confirm("Batalkan pesanan ini?")) return;
    setState("busy");
    setMsg("");
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal batalkan");
      setState("done");
      router.refresh();
    } catch (e: any) {
      setState("error");
      setMsg(e?.message || "Gagal. Login dulu / hubungi workshop.");
    }
  };

  if (state === "done") {
    return <p className="font-mono text-xs text-text-muted text-center">Order dibatalkan.</p>;
  }

  return (
    <div className="space-y-1">
      <button
        onClick={cancel}
        disabled={state === "busy"}
        className="w-full py-2.5 px-4 rounded-xl bg-surface border border-white/10 text-text-muted hover:text-red-300 hover:border-red-500/40 font-mono font-bold text-[11px] uppercase tracking-wider disabled:opacity-50 transition-all"
      >
        {state === "busy" ? "MEMBATALKAN…" : "Batalkan pesanan ini"}
      </button>
      {msg && <p className="font-mono text-[11px] text-amber-300 text-center">{msg}</p>}
    </div>
  );
}
