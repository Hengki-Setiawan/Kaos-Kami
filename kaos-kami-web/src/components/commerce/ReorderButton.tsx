"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ReorderItem {
  productVariantId?: string | null;
  designId?: string | null;
  quantity: number;
}

/** Pesan lagi: 1 request batch → harga 100% server (audit #24). */
export function ReorderButton({ userId, items }: { userId: string; items: ReorderItem[] }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [detail, setDetail] = useState("");

  const reorder = async () => {
    if (state === "busy") return;
    setState("busy");
    setDetail("");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch("/api/cart/items/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          userId,
          items: items.map((it) => ({
            productVariantId: it.productVariantId || undefined,
            designId: it.designId || undefined,
            quantity: it.quantity,
          })),
        }),
      });
      clearTimeout(t);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal");
      setDetail(data.skipped > 0 ? `${data.added} masuk, ${data.skipped} tak tersedia` : `${data.added} item masuk keranjang`);
      setState("done");
    } catch (e: any) {
      setDetail(e?.message || "Gagal");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-2 text-[11px]">
        <span className="text-emerald-400 font-bold">✔ {detail}</span>
        <Link href="/catalog" className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold hover:brightness-110">
          BUKA KERANJANG
        </Link>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={reorder}
        disabled={state === "busy"}
        className="px-3.5 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold hover:text-brand-accent transition-all text-[11px] disabled:opacity-60"
      >
        {state === "busy" ? "MENAMBAH…" : "PESAN LAGI"}
      </button>
      {state === "error" && <span className="text-rose-300 text-[11px]">{detail || "Gagal, coba lagi"}</span>}
    </span>
  );
}
