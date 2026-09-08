"use client";

import React, { useState } from "react";

interface ReorderItem {
  productVariantId?: string | null;
  designId?: string | null;
  quantity: number;
  unitPriceIdr: number;
}

/** Pesan lagi: masukkan semua item order ini ke keranjang user. */
export function ReorderButton({ userId, items }: { userId: string; items: ReorderItem[] }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const reorder = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      for (const it of items) {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            productVariantId: it.productVariantId || undefined,
            designId: it.designId || undefined,
            quantity: it.quantity,
            unitPriceIdr: it.unitPriceIdr,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      }
      setState("done");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState((s) => (s === "busy" ? "idle" : s)), 100);
    }
  };

  return (
    <button
      onClick={reorder}
      disabled={state === "busy" || state === "done"}
      className="px-3.5 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold hover:text-brand-accent transition-all text-[11px] disabled:opacity-60"
    >
      {state === "busy" ? "MENAMBAH…" : state === "done" ? "✔ DI KERANJANG" : state === "error" ? "GAGAL, COBA LAGI" : "PESAN LAGI"}
    </button>
  );
}
