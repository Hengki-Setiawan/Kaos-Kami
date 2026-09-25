"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Batas harga selaras API (POST = PATCH): floor Rp 1.000, cap Rp 100 jt.
const PRICE_FLOOR_IDR = 1000;
const PRICE_CAP_IDR = 100_000_000;

/** Kelola varian: stok +/- (delta server-side), harga, aktif/nonaktif, hapus (soft-off). */
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
  const [msg, setMsg] = useState<string | null>(null);
  const [askingDelete, setAskingDelete] = useState(false);

  const patch = async (body: object) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ variantId: id, ...body }),
      });
      clearTimeout(t);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal");
      router.refresh();
    } catch (e: any) {
      // Error diam (audit #31) → tampilkan + kembalikan harga.
      setMsg(e?.message || "Gagal simpan");
      setPrice(String(priceIdr));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/catalog?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || (data as any).error) throw new Error((data as any)?.error || "Gagal hapus");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal hapus");
    } finally {
      setBusy(false);
      setAskingDelete(false);
    }
  };

  const commitPrice = () => {
    // Clamp client selaras API: floor 1.000, cap 100 jt.
    const n = Math.max(0, Math.min(PRICE_CAP_IDR, Number(price) || 0));
    if (n < PRICE_FLOOR_IDR) {
      setMsg(`Harga minimal Rp ${PRICE_FLOOR_IDR.toLocaleString("id-ID")}`);
      setPrice(String(priceIdr));
      return;
    }
    if (n !== priceIdr) void patch({ priceIdr: n });
    else if (String(n) !== price) setPrice(String(priceIdr));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div className="flex items-center gap-1">
        <button
          onClick={() => void patch({ delta: -1 })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold disabled:opacity-50"
          aria-label="Kurangi stok"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-brand-accent font-bold">{stockQty} pcs</span>
        <button
          onClick={() => void patch({ delta: 1 })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold disabled:opacity-50"
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
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setPrice(String(priceIdr));
          }}
          inputMode="numeric"
          className="w-24 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-right"
          aria-label="Harga, Enter untuk simpan"
        />
      </div>
      <button
        onClick={() => void patch({ isActive: !isActive })}
        disabled={busy}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border disabled:opacity-50 ${
          isActive
            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
            : "bg-surface border-border-subtle text-text-muted"
        }`}
      >
        {isActive ? "AKTIF" : "MATI"}
      </button>
      <button
        onClick={() => setAskingDelete(true)}
        disabled={busy}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-red-500/40 bg-red-500/10 text-red-300 disabled:opacity-50"
        aria-label="Hapus produk dari katalog"
      >
        HAPUS
      </button>
      {msg && <span className="text-[11px] text-amber-300 w-full text-right">{msg}</span>}
      <ConfirmDialog
        open={askingDelete}
        title="Hapus produk?"
        message="Produk dinonaktifkan dari katalog (soft-off) dan hilang dari etalase. Data order lama tidak terpengaruh."
        confirmLabel="YA, HAPUS"
        danger
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setAskingDelete(false)}
      />
    </div>
  );
}
