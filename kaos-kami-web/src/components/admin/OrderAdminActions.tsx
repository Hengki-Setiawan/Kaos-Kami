"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Resi Indonesia: alfanumerik + beberapa tanda, 5–64 karakter.
const RESI_RE = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{3,62}[A-Za-z0-9]$/;

/** Aksi workshop di halaman detail order: isi resi + batalkan (dengan konfirmasi). */
export function OrderAdminActions({ orderId, currentTracking }: { orderId: string; currentTracking?: string | null }) {
  const router = useRouter();
  const [tracking, setTracking] = useState(currentTracking || "");
  // busy per aksi (audit #29 — sebelumnya satu busy mengunci 3 tombol).
  const [busyAction, setBusyAction] = useState<"resi" | "batal" | "refund" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [asking, setAsking] = useState<"batal" | "refund" | null>(null);

  const callApi = async (body: object) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal");
    } finally {
      clearTimeout(t);
    }
  };

  const saveTracking = async () => {
    const v = tracking.trim();
    if (v && !RESI_RE.test(v)) {
      setMsg("Format resi tidak valid (5–64 karakter alfanumerik).");
      return;
    }
    setBusyAction("resi");
    setMsg(null);
    try {
      await callApi({ trackingNumber: v || null });
      setMsg("✅ Resi tersimpan.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusyAction(null);
    }
  };

  const doAsk = async (kind: "batal" | "refund") => {
    setAsking(null);
    setBusyAction(kind);
    setMsg(null);
    try {
      if (kind === "batal") {
        await callApi({ cancel: true });
        setMsg("✅ Order dibatalkan.");
      } else {
        await callApi({ refund: true });
        setMsg("✅ Order ditandai REFUNDED.");
      }
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3 font-mono text-xs">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value.slice(0, 64))}
          placeholder="Nomor resi ekspedisi…"
          maxLength={64}
          aria-label="Nomor resi ekspedisi"
          className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-white/10 text-white placeholder:text-text-muted"
        />
        <button
          onClick={saveTracking}
          disabled={busyAction !== null}
          className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider text-[11px] hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {busyAction === "resi" ? "…" : "Simpan resi"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAsking("batal")}
          disabled={busyAction !== null}
          className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 font-bold uppercase tracking-wider text-[11px] hover:bg-red-500/20 disabled:opacity-50 transition-all"
        >
          {busyAction === "batal" ? "…" : "Batalkan order"}
        </button>
        <button
          onClick={() => setAsking("refund")}
          disabled={busyAction !== null}
          className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider text-[11px] hover:bg-amber-500/20 disabled:opacity-50 transition-all"
        >
          {busyAction === "refund" ? "…" : "Tandai refund (dana via Duitku)"}
        </button>
      </div>
      {msg && <p className="text-[11px] text-text-muted">{msg}</p>}

      <ConfirmDialog
        open={asking === "batal"}
        title="Batalkan order?"
        message="Hanya untuk status PENDING/CONFIRMED. Stok & kuota kupon dikembalikan server."
        confirmLabel="YA, BATALKAN"
        danger
        busy={busyAction === "batal"}
        onConfirm={() => doAsk("batal")}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "refund"}
        title="Tandai refund?"
        message="Pastikan dana SUDAH dikembalikan via dashboard Duitku — ini hanya pencatatan, bukan transfer otomatis."
        confirmLabel="YA, TANDAI REFUND"
        danger
        busy={busyAction === "refund"}
        onConfirm={() => doAsk("refund")}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
}
