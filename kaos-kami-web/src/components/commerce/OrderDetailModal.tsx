"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, CreditCard, MessageCircleWarning } from "lucide-react";
import { RepayButton } from "@/components/commerce/RepayButton";
import { ComplaintForm } from "@/components/commerce/ComplaintForm";

/**
 * OrderDetailModal — jendela detail order (klik kartu di CustomerDashboardView).
 *
 * SUMBER reviewNote/reviewedAt (kontrak agent paralel, defensif):
 * - Kolom `reviewNote`/`reviewedAt` BELUM ADA di skema (verifikasi 21 Sep 2026:
 *   tabel Order/Design/OrderStatusEvent di drizzle-schema.ts tak punya kolom itu).
 * - Maka dipakai FALLBACK string-match atas:
 *   1. Order.courierNotes / Order.notes (marker [REVIEW...]/[DITOLAK...]), dan
 *   2. OrderStatusEvent.note via GET /api/notifications (existing) difilter orderId.
 * - Marker yang dikenali: [REVIEW...], REVIEW:, OVERSELL, "triase manual",
 *   callback non-PENDING (webhook), [DITOLAK...]/"ditolak", "disetujui/diterima".
 *
 * KONTRAK BAYAR (defensif): coba POST /api/orders/[id]/request-payment →
 * {paymentUrl, reference}. Endpoint itu BELUM ADA di server (21 Sep 2026, hanya
 * ada POST /api/orders/[id]/repay bergerbang OTP) → 404 = fallback ke
 * <RepayButton/> existing (alur OTP WA, terbukti). Jangan hapus fallback ini
 * sampai request-payment benar-benar live.
 */

export interface ModalOrderItem {
  id: string;
  snapshotName: string;
  snapshotSize: string;
  snapshotColorName: string;
  quantity: number;
  lineTotalIdr: number;
}

export interface ModalOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalIdr: number;
  courierNotes?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  items: ModalOrderItem[];
}

export type ReviewKind = "REVIEW" | "REJECTED" | "APPROVED" | "NONE";

export interface ReviewInfo {
  kind: ReviewKind;
  /** Teks alasan admin (note mentah yang cocok, dipotong wajar). */
  reason: string | null;
}

const RE_REVIEW = /(\[REVIEW|REVIEW:|OVERSELL|triase manual|perlu triase|non-PENDING.*triase)/i;
const RE_REJECT = /(\[DITOLAK|ditolak|REJECTED)/i;
const RE_APPROVE = /(disetujui|diterima|siap dibayar|telah disetujui|pembayaran.*lunas)/i;

/** Fallback string-match review dari courierNotes/notes + note event. */
export function parseReviewInfo(
  order: Pick<ModalOrder, "status" | "courierNotes" | "notes">,
  eventNotes: string[] = []
): ReviewInfo {
  const haystacks = [order.courierNotes || "", order.notes || "", ...eventNotes];
  const joined = haystacks.filter(Boolean).join("\n");
  const firstMatch = (re: RegExp): string | null => {
    for (const h of haystacks) {
      if (!h) continue;
      const m = h.match(re);
      if (m) {
        // Kembalikan kalimat sekitar kecocokan (maks 280 char) sebagai alasan.
        const idx = h.search(re);
        const start = Math.max(0, idx - 60);
        return h.slice(start, start + 280).trim();
      }
    }
    return null;
  };
  // REJECTED eksplisit (status server REJECTED tak ada di enum — defensif).
  if (order.status === "REJECTED" || RE_REJECT.test(joined)) {
    return { kind: "REJECTED", reason: firstMatch(RE_REJECT) || firstMatch(/ditolak.{0,200}/i) };
  }
  if (RE_REVIEW.test(joined)) {
    return { kind: "REVIEW", reason: firstMatch(RE_REVIEW) };
  }
  if (order.status === "PAYMENT_CONFIRMED" || RE_APPROVE.test(joined)) {
    const r = firstMatch(RE_APPROVE);
    return { kind: "APPROVED", reason: r };
  }
  // PENDING_PAYMENT = ter-ACC untuk dibayar (siap bayar) — tanpa alasan.
  if (order.status === "PENDING_PAYMENT") {
    return { kind: "APPROVED", reason: null };
  }
  return { kind: "NONE", reason: null };
}

function formatRupiah(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

export function OrderDetailModal({
  order,
  onClose,
}: {
  order: ModalOrder;
  onClose: () => void;
}) {
  const [eventNotes, setEventNotes] = useState<string[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  // Alur bayar cepat defensif (request-payment) — fallback RepayButton.
  const [payBusy, setPayBusy] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [payRef, setPayRef] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [payFallback, setPayFallback] = useState(false);

  // Ambil note review dari /api/notifications (existing) — filter order ini.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && data?.success && Array.isArray(data.items)) {
          const mine = (data.items as any[])
            .filter((i) => i?.orderId === order.id && typeof i?.note === "string" && i.note.trim())
            .map((i) => String(i.note));
          setEventNotes(mine.slice(0, 10));
        }
      } catch {
        /* defensif: modal tetap tampil tanpa note event */
      } finally {
        if (alive) setNotesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [order.id]);

  // Tutup via Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const review = parseReviewInfo(order, eventNotes);
  const canPay = order.status === "PENDING_PAYMENT";

  const tryQuickPay = async () => {
    setPayBusy(true);
    setPayMsg(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/request-payment`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.status === 404) {
        // Endpoint belum ada (agent paralel) → fallback RepayButton OTP.
        setPayFallback(true);
        setPayMsg("Link cepat belum tersedia (404) — gunakan tombol BAYAR ULANG (OTP WA) di bawah.");
        return;
      }
      if (!res.ok || !data?.paymentUrl) {
        throw new Error(data?.error || `Gagal (${res.status}) — gunakan BAYAR ULANG di bawah.`);
      }
      setPayUrl(String(data.paymentUrl));
      if (data.reference) setPayRef(String(data.reference));
    } catch (e: any) {
      setPayFallback(true);
      setPayMsg(e?.message || "Gagal membuat link cepat — gunakan BAYAR ULANG di bawah.");
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail pesanan ${order.orderNumber}`}
    >
      <button
        type="button"
        aria-label="Tutup detail pesanan"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface border border-border-subtle shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-text-primary text-base">{order.orderNumber}</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Dipesan:{" "}
              {(() => {
                try {
                  return new Date(order.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                } catch {
                  return String(order.createdAt);
                }
              })()}{" "}
              · Status: <strong className="text-text-primary">{order.status.replace(/_/g, " ")}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="p-2 rounded-full bg-canvas border border-border-subtle text-text-muted hover:text-text-primary"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status review + alasan tolak (teks admin mentah, fallback string-match). */}
        {review.kind === "REJECTED" ? (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1.5">
            <p className="font-bold text-rose-400">❌ Desain / pesanan DITOLAK workshop</p>
            {review.reason ? (
              <p className="text-rose-200/90 break-words">Alasan admin: “{review.reason}”</p>
            ) : (
              <p className="text-rose-200/70">Alasan belum tercatat — hubungi workshop via WhatsApp.</p>
            )}
          </div>
        ) : review.kind === "REVIEW" ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
            <p className="font-bold text-amber-400">🔍 Sedang dalam peninjauan workshop (REVIEW)</p>
            {review.reason ? (
              <p className="text-amber-200/90 break-words">Catatan: “{review.reason}”</p>
            ) : (
              <p className="text-amber-200/70">Tim memeriksa pesanan Anda — status diperbarui otomatis.</p>
            )}
          </div>
        ) : review.kind === "APPROVED" ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
            <p className="font-bold text-emerald-400">✅ Disetujui — siap dibayar</p>
            {review.reason && <p className="text-emerald-200/80 break-words">{review.reason}</p>}
            {!canPay && (
              <p className="text-emerald-200/70">Pesanan sudah melewati tahap pembayaran.</p>
            )}
          </div>
        ) : notesLoading ? (
          <p className="text-[11px] text-text-muted">Memuat catatan status…</p>
        ) : null}

        {/* Ringkasan item */}
        <div className="rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle p-3 text-xs space-y-1.5">
          {order.items.map((it, idx) => (
            <div key={it.id} className="flex justify-between gap-3">
              <span className="text-text-primary font-bold">
                #{idx + 1} {it.snapshotName}{" "}
                <span className="font-normal text-text-muted">
                  ({it.snapshotSize} · {it.snapshotColorName} × {it.quantity})
                </span>
              </span>
              <span className="font-bold text-text-primary shrink-0">{formatRupiah(it.lineTotalIdr)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1.5 border-t border-border-subtle font-bold">
            <span className="text-text-muted">Total</span>
            <span className="text-brand-accent">{formatRupiah(order.totalIdr)}</span>
          </div>
        </div>

        {/* Aksi: BAYAR (bila PENDING_PAYMENT ter-ACC) / INVOICE / KOMPLAIN */}
        {canPay && (
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2.5">
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CreditCard size={14} /> Selesaikan pembayaran
            </p>
            {!payUrl ? (
              <button
                type="button"
                onClick={() => void tryQuickPay()}
                disabled={payBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {payBusy ? "MEMBUAT LINK…" : "BUAT LINK BAYAR CEPAT"}
              </button>
            ) : (
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
              >
                BAYAR SEKARANG {payRef ? `(${payRef})` : ""}
              </a>
            )}
            {payMsg && (
              <p role="status" className="text-[11px] text-amber-300 text-center">
                {payMsg}
              </p>
            )}
            {/* Fallback permanen: RepayButton OTP (existing, jangan dihapus). */}
            {(payFallback || !payUrl) && <RepayButton orderId={order.id} />}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orders/${order.id}`}
            className="flex-1 min-w-[140px] px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent text-text-primary font-bold hover:text-brand-accent transition-all flex items-center justify-center gap-1.5 text-xs"
            title="Buka invoice / cetak nota resmi"
          >
            <ExternalLink size={13} className="text-brand-accent" />
            <span>LIHAT INVOICE</span>
          </Link>
          <a
            href={`https://wa.me/6281244002026?text=${encodeURIComponent(`Halo Admin Kaos Kami! Saya ingin menanyakan pesanan ${order.orderNumber}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px] px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-emerald-500 text-text-primary font-bold hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 text-xs"
          >
            <MessageCircleWarning size={13} className="text-emerald-400" />
            <span>TANYA ADMIN</span>
          </a>
        </div>

        <ComplaintForm orderId={order.id} />
        <p className="text-[10px] text-text-muted text-center">
          Alasan penolakan di atas adalah teks admin (fallback string-match OrderStatusEvent — lihat komentar kode).
        </p>
      </div>
    </div>
  );
}
