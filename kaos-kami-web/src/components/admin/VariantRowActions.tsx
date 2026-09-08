"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Kelola varian: stok +/-, harga, aktif/nonaktif (admin only). */
export function VariantRowActions({
  id,
  stockQty,
  priceIdr,
  isActive,
}: {
  id: string;
  stockQty: number;
  priceIdr: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(String(priceIdr));

  const patch = async (body: object) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: id, ...body }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div className="flex items-center gap-1">
        <button
          onClick={() => void patch({ stockQty: Math.max(0, stockQty - 1) })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold disabled:opacity-50"
          aria-label="Kurangi stok"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-brand-accent font-bold">{stockQty} pcs</span>
        <button
          onClick={() => void patch({ stockQty: stockQty + 1 })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold disabled:opacity-50"
          aria-label="Tambah stok"
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Rp</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))}
          onBlur={() => {
            const n = Number(price);
            if (n > 0 && n !== priceIdr) void patch({ priceIdr: n });
            else setPrice(String(priceIdr));
          }}
          inputMode="numeric"
          className="w-24 px-2 py-1 rounded-lg bg-surface border border-white/10 text-white text-right"
          aria-label="Harga"
        />
      </div>
      <button
        onClick={() => void patch({ isActive: !isActive })}
        disabled={busy}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border disabled:opacity-50 ${
          isActive
            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
            : "bg-surface border-white/10 text-text-muted"
        }`}
      >
        {isActive ? "AKTIF" : "MATI"}
      </button>
    </div>
  );
}
