"use client";

import React, { useState } from "react";
import { MessageCircleWarning } from "lucide-react";

const CATEGORIES = [
  { id: "SABLON_CACAT", label: "Sablon cacat / retak / luntur" },
  { id: "SALAH_UKURAN", label: "Ukuran tak sesuai pesanan" },
  { id: "WARNA_BEDA", label: "Warna beda dari mockup" },
  { id: "KETERLAMBATAN", label: "Keterlambatan pengiriman" },
  { id: "LAINNYA", label: "Lainnya" },
];

/** U15: form komplain terstruktur per order (tercatat + ditindaklanjuti). */
export function ComplaintForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("SABLON_CACAT");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    if (message.trim().length < 10) {
      setResult("Ceritakan masalahnya minimal 10 karakter agar workshop paham.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, category, message: message.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal mengirim komplain");
      setResult("✅ Komplain tercatat. Workshop menindaklanjuti via WhatsApp.");
      setMessage("");
      setOpen(false);
    } catch (e: any) {
      setResult(e?.message || "Gagal mengirim komplain");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-amber-500 text-text-muted hover:text-amber-400 font-bold transition-all flex items-center gap-1.5 text-xs"
      >
        <MessageCircleWarning size={13} />
        <span>LAPOR MASALAH</span>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface border border-amber-500/40 space-y-3">
      <p className="text-xs font-bold text-text-primary">Lapor masalah pesanan ini</p>
      <div className="grid grid-cols-1 gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
            className={`text-left px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${
              category === c.id
                ? "bg-amber-500/15 border-amber-500 text-amber-300"
                : "bg-canvas border-border-subtle text-text-muted hover:text-text-primary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Ceritakan: bagian mana yg cacat, sejak kapan, dsb. (min. 10 karakter)"
        className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase disabled:opacity-50"
        >
          {busy ? "Mengirim…" : "Kirim Komplain"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-muted"
        >
          Batal
        </button>
      </div>
      {result && <p className="text-[11px] text-amber-300">{result}</p>}
    </div>
  );
}
