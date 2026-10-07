"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Resi Indonesia: alfanumerik + beberapa tanda, 5–64 karakter.
const RESI_RE = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{3,62}[A-Za-z0-9]$/;

const TERMINAL = ["COMPLETED", "CANCELLED", "REFUNDED"];
// Cermin guard refund server (route admin): refund hanya untuk order berbayar yg belum selesai.
const REFUNDABLE = [
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
];
// COMPLETED hanya dari state akhir pengiriman/ambil (cermin mesin transisi).
const COMPLETABLE = ["READY_TO_SHIP", "SHIPPED", "DELIVERED"];

/** Aksi workshop di halaman detail order: isi resi + batalkan + selesaikan order. */
export function OrderAdminActions({
  orderId,
  currentTracking,
  orderStatus,
  deliveryMethod,
}: {
  orderId: string;
  currentTracking?: string | null;
  orderStatus?: string;
  deliveryMethod?: string;
}) {
  const router = useRouter();
  const [tracking, setTracking] = useState(currentTracking || "");
  const [busyAction, setBusyAction] = useState<"resi" | "batal" | "refund" | "completed" | "ready" | "shipped" | "delivered" | "sync" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [asking, setAsking] = useState<"batal" | "refund" | "completed" | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  // Kelayakan aksi per status — tombol ilegal disembunyikan (server tetap memvalidasi).
  const isTerminal = TERMINAL.includes(orderStatus || "");
  const canCancel = orderStatus === "PENDING_PAYMENT" || orderStatus === "PAYMENT_CONFIRMED";
  const canSyncPayment = orderStatus === "PENDING_PAYMENT";
  const canRefund = REFUNDABLE.includes(orderStatus || "");
  const canComplete = COMPLETABLE.includes(orderStatus || "");
  const canReady = orderStatus === "PRINTING" || orderStatus === "QUALITY_CHECK";
  const canShip = orderStatus === "READY_TO_SHIP";
  const canDeliver = orderStatus === "SHIPPED";
  // I4 cermin server: resi hanya bila lunas + bukan PICKUP.
  const showResi =
    !isTerminal && orderStatus !== "PENDING_PAYMENT" && deliveryMethod !== "PICKUP";
  const showQuickAdvance = !isTerminal && (canReady || canShip || canDeliver || canComplete);

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
      return data;
    } finally {
      clearTimeout(t);
    }
  };

  const syncDuitku = async () => {
    setBusyAction("sync");
    setMsg(null);
    try {
      const res = await callApi({ syncPayment: true });
      if (res?.message) setMsg(res.message);
      if (res?.synced) router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal sinkronisasi Duitku");
    } finally {
      setBusyAction(null);
    }
  };

  const saveTracking = async () => {
    const v = tracking.trim();
    if (!v) {
      setMsg("Nomor resi tidak boleh kosong.");
      return;
    }
    if (!RESI_RE.test(v)) {
      setMsg("Format resi tidak valid (5–64 karakter alfanumerik).");
      return;
    }
    setBusyAction("resi");
    setMsg(null);
    try {
      await callApi({ trackingNumber: v });
      setMsg("✅ Resi tersimpan.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusyAction(null);
    }
  };

  const BUSY_BY_STATUS: Record<string, typeof busyAction> = {
    COMPLETED: "completed",
    READY_TO_SHIP: "ready",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
  };

  const doSetStatus = async (status: string) => {
    setAsking(null);
    setBusyAction(BUSY_BY_STATUS[status] ?? "ready");
    setMsg(null);
    try {
      await callApi({ status });
      setMsg(`✅ Status pesanan diubah ke ${status}.`);
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal update status"}`);
    } finally {
      setBusyAction(null);
    }
  };

  const doAsk = async (kind: "batal" | "refund") => {
    const reason = reasonInput.trim();
    setAsking(null);
    setBusyAction(kind);
    setMsg(null);
    try {
      if (kind === "batal") {
        await callApi({
          cancel: true,
          cancelReason: reason || "Dibatalkan oleh workshop via admin.",
        });
        setMsg("✅ Order dibatalkan.");
      } else {
        await callApi({
          refund: true,
          refundReason: reason || "Dana dikembalikan manual via transfer/QRIS oleh admin.",
        });
        setMsg("✅ Order ditandai REFUNDED.");
      }
      setReasonInput("");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusyAction(null);
    }
  };

  if (isTerminal) {
    return (
      <div className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3 font-sans text-sm">
        <p className="text-[11px] text-text-muted">
          Order {orderStatus} bersifat final — tidak ada aksi workshop yang tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3 font-sans text-sm">
      {/* Quick Status Advance Buttons */}
      {showQuickAdvance && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
          {canComplete && (
            <button
              onClick={() => setAsking("completed")}
              disabled={busyAction !== null}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-canvas text-emerald-300 font-bold uppercase tracking-wider text-[11px] disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <span>{busyAction === "completed" ? "…" : "✔ Tandai Selesai / Diambil (COMPLETED)"}</span>
            </button>
          )}

          {canReady && (
            <button
              onClick={() => void doSetStatus("READY_TO_SHIP")}
              disabled={busyAction !== null}
              className="px-3.5 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500 hover:text-white text-blue-300 font-bold uppercase tracking-wider text-[11px] disabled:opacity-50 transition-all"
            >
              <span>{busyAction === "ready" ? "…" : "📦 Tandai Siap Kirim / Ambil"}</span>
            </button>
          )}

          {canShip && (
            <button
              onClick={() => void doSetStatus("SHIPPED")}
              disabled={busyAction !== null}
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500 hover:text-white text-sky-300 font-bold uppercase tracking-wider text-[11px] disabled:opacity-50 transition-all"
            >
              <span>{busyAction === "shipped" ? "…" : "🚚 Tandai Dikirim (SHIPPED)"}</span>
            </button>
          )}

          {canDeliver && (
            <button
              onClick={() => void doSetStatus("DELIVERED")}
              disabled={busyAction !== null}
              className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:border-emerald-500/50 text-text-primary font-bold uppercase tracking-wider text-[11px] disabled:opacity-50 transition-all"
            >
              <span>{busyAction === "delivered" ? "…" : "📬 Tandai Diterima (DELIVERED)"}</span>
            </button>
          )}
        </div>
      )}

      {/* Input Resi */}
      {showResi && (
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
      )}

      {/* Cek & sinkronkan status pembayaran */}
      {canSyncPayment && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void syncDuitku()}
            disabled={busyAction !== null}
            className="px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-bold uppercase tracking-wider text-[11px] hover:bg-blue-500/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span>{busyAction === "sync" ? "Menghubungi Duitku…" : "🔄 Sinkronkan Status Duitku"}</span>
          </button>
        </div>
      )}

      {/* Batal / Refund */}
      {(canCancel || canRefund) && (
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <button
              onClick={() => setAsking("batal")}
              disabled={busyAction !== null}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 font-bold uppercase tracking-wider text-[11px] hover:bg-red-500/20 disabled:opacity-50 transition-all"
            >
              {busyAction === "batal" ? "…" : "Batalkan order"}
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => setAsking("refund")}
              disabled={busyAction !== null}
              className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider text-[11px] hover:bg-amber-500/20 disabled:opacity-50 transition-all"
            >
              {busyAction === "refund" ? "…" : "Tandai refund (iPaymu / Transfer)"}
            </button>
          )}
        </div>
      )}
      {msg && <p className="text-[11px] text-text-muted">{msg}</p>}

      <ConfirmDialog
        open={asking === "completed"}
        title="Tandai pesanan selesai?"
        message="Pastikan SEMUA task produksi sudah PACKAGING/DONE (cek kanban). PICKUP = sudah diambil pembeli; ekspedisi = paket terkirim/diterima. Server menolak COMPLETED bila masih ada task terbuka."
        confirmLabel="YA, SELESAIKAN"
        busy={busyAction === "completed"}
        onConfirm={() => void doSetStatus("COMPLETED")}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "batal"}
        title="Batalkan order?"
        message="Hanya untuk status PENDING/CONFIRMED. Masukkan alasan pembatalan agar pembeli mengetahui penjelasannya di halaman pesanan:"
        confirmLabel="YA, BATALKAN"
        danger
        busy={busyAction === "batal"}
        onConfirm={() => doAsk("batal")}
        onCancel={() => {
          setAsking(null);
          setReasonInput("");
        }}
      >
        <div className="space-y-1.5 mt-2">
          <label className="block text-[11px] font-mono text-zinc-400">
            Alasan Pembatalan (Dilihat Pelanggan):
          </label>
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value.slice(0, 300))}
            placeholder="Contoh: Stok warna kain habis di distributor / Permintaan pembeli via WhatsApp"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "refund"}
        title="Tandai refund dana?"
        message="Pastikan dana SUDAH ditransfer balik ke pembeli via transfer bank / QRIS iPaymu. Masukkan catatan refund:"
        confirmLabel="YA, TANDAI REFUND"
        danger
        busy={busyAction === "refund"}
        onConfirm={() => doAsk("refund")}
        onCancel={() => {
          setAsking(null);
          setReasonInput("");
        }}
      >
        <div className="space-y-1.5 mt-2">
          <label className="block text-[11px] font-mono text-zinc-400">
            Keterangan Refund (Dilihat Pelanggan):
          </label>
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value.slice(0, 300))}
            placeholder="Contoh: Pengembalian dana Rp 150.000 ke Rek BCA pembeli karena kendala file cetak"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
