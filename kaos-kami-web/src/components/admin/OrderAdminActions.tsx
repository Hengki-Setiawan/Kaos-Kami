"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Aksi workshop di halaman detail order: isi resi + batalkan (dengan konfirmasi). */
export function OrderAdminActions({ orderId, currentTracking }: { orderId: string; currentTracking?: string | null }) {
  const router = useRouter();
  const [tracking, setTracking] = useState(currentTracking || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveTracking = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: tracking.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal simpan resi");
      setMsg("✅ Resi tersimpan.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Batalkan order ini? Hanya untuk status PENDING/CONFIRMED.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal batalkan");
      setMsg("✅ Order dibatalkan.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  const refundOrder = async () => {
    if (!confirm("Tandai REFUND? Pastikan dana SUDAH dikembalikan via dashboard Duitku (tidak ada API refund — ini hanya pencatatan).")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal refund");
      setMsg("✅ Order ditandai REFUNDED.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3 font-mono text-xs">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Nomor resi ekspedisi…"
          maxLength={64}
          className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-white/10 text-white placeholder:text-text-muted"
        />
        <button
          onClick={saveTracking}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider text-[11px] hover:brightness-110 disabled:opacity-50 transition-all"
        >
          Simpan resi
        </button>
      </div>
      <button
        onClick={cancelOrder}
        disabled={busy}
        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 font-bold uppercase tracking-wider text-[11px] hover:bg-red-500/20 disabled:opacity-50 transition-all"
      >
        Batalkan order
      </button>
      <button
        onClick={refundOrder}
        disabled={busy}
        className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider text-[11px] hover:bg-amber-500/20 disabled:opacity-50 transition-all"
      >
        Tandai refund (dana via Duitku)
      </button>
      {msg && <p className="text-[11px] text-text-muted">{msg}</p>}
    </div>
  );
}
