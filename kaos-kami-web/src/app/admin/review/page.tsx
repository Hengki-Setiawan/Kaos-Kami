"use client";

/**
 * Antrean review desain (status DESIGN_REVIEW) — halaman client.
 *
 * Alasan client (bukan server-query seperti /admin/orders):
 * antrean + aksi TERIMA/TOLAK bergantung pada endpoint milik agent paralel
 * (GET /api/admin/orders?status=... dan POST /api/admin/orders/[id]/review)
 * yang saat ditulis (21 Sep 2026) BELUM ADA di server. Semua fetch defensif:
 * gagal/404 = panel fallback "memuat…" + tautan filter manual, bukan crash.
 *
 * Template preset: SSOT dari @/lib/reviewTemplates (REVIEW_REJECT_TEMPLATES,
 * dibuat agent paralel — id SAMA PERSIS: resolusi-kurang, luar-area-cetak,
 * warna-tak-cetak, font-tipis, lainnya). Jangan duplikasi array lokal agar
 * teks preset tak divergen dari yang dipakai API review.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ImageIcon, RefreshCw } from "lucide-react";
import { REVIEW_REJECT_TEMPLATES } from "@/lib/reviewTemplates";
import { maskPhone as maskPhoneLib } from "@/lib/mask"; // SSOT PII (S-045)

export const dynamic = "force-dynamic";

// Alias lokal agar JSX di bawah tetap ringkas — SSOT tetap file lib.
const REVIEW_TEMPLATES = REVIEW_REJECT_TEMPLATES;

interface QueueItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalIdr?: number;
  user?: { name?: string | null; phoneNumber?: string | null } | null;
  items?: Array<{
    snapshotName?: string | null;
    snapshotImageUrl?: string | null;
    snapshotSize?: string | null;
    snapshotColorName?: string | null;
    quantity?: number | null;
  }> | null;
  // Bentuk alternatif dari API paralel (defensif — salah satu yang dipakai).
  designThumbnail?: string | null;
  customerName?: string | null;
}

function maskPhone(p?: string | null) {
  if (!p) return "-";
  return maskPhoneLib(p) || "-";
}

function isOverdue24h(createdAt: string) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 24 * 60 * 60 * 1000;
}

/** Parse defensif: terima {orders|items|data|[]} atau array mentah. */
function parseQueue(json: unknown): QueueItem[] {
  if (Array.isArray(json)) return json as QueueItem[];
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const k of ["orders", "items", "data"]) {
      if (Array.isArray(o[k])) return o[k] as QueueItem[];
    }
  }
  return [];
}

export default function AdminReviewQueuePage() {
  const [orders, setOrders] = useState<QueueItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiMissing, setApiMissing] = useState(false);
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setGlobalMsg(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch("/api/admin/orders?status=DESIGN_REVIEW", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (res.status === 404) {
          // Endpoint agent paralel belum tersedia.
          setApiMissing(true);
          setOrders([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json().catch(() => null);
        setApiMissing(false);
        setOrders(parseQueue(json));
      } finally {
        clearTimeout(t);
      }
    } catch {
      setApiMissing(true);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary">
            ANTREAN REVIEW DESAIN
          </h1>
          <p className="text-text-muted mt-0.5">
            {loading
              ? "memuat…"
              : `${orders?.length || 0} order menunggu (DESIGN_REVIEW) · tertua diproses dulu`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="py-2.5 px-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>MUAT ULANG</span>
          </button>
          <Link
            href="/admin/orders"
            className="py-2.5 px-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold transition-all"
          >
            SEMUA PESANAN
          </Link>
        </div>
      </div>

      {globalMsg && (
        <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-text-primary font-bold">
          {globalMsg}
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-text-muted">memuat…</div>
      )}

      {!loading && apiMissing && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <p className="font-bold text-amber-600 dark:text-amber-300">
            API antrean belum tersedia (GET /api/admin/orders?status=DESIGN_REVIEW → 404).
          </p>
          <p className="text-text-muted">
            Endpoint milik agent paralel belum live. Sementara itu saring manual lewat
            daftar pesanan atau muat ulang setelah API tersedia.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/admin/orders"
              className="py-2 px-4 rounded-xl bg-brand-accent text-canvas font-bold"
            >
              BUKA DAFTAR PESANAN
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="py-2 px-4 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold"
            >
              COBA LAGI
            </button>
          </div>
        </div>
      )}

      {!loading && !apiMissing && orders?.length === 0 && (
        <div className="p-12 text-center text-text-muted">
          Antrean kosong — tidak ada order berstatus DESIGN_REVIEW.
        </div>
      )}

      {!loading && !apiMissing && (orders?.length || 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders!.map((o) => (
            <ReviewCard
              key={o.id}
              order={o}
              onDone={(msg) => {
                setOrders((prev) => (prev || []).filter((x) => x.id !== o.id));
                setGlobalMsg(msg);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ order, onDone }: { order: QueueItem; onDone: (msg: string) => void }) {
  const first = order.items?.[0];
  const thumb = first?.snapshotImageUrl || order.designThumbnail || null;
  const overdue = isOverdue24h(order.createdAt);
  const [templateId, setTemplateId] = useState<string>("resolusi-kurang");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const template = REVIEW_TEMPLATES.find((t) => t.id === templateId);
  const effectiveNote = note.trim() || template?.text || "";

  const submit = async (action: "approve" | "reject") => {
    setErr(null);
    // Tolak wajib alasan (template preset atau teks manual).
    if (action === "reject" && !effectiveNote) {
      setErr("Alasan wajib diisi saat menolak: pilih template atau tulis catatan manual.");
      return;
    }
    setBusy(action);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(`/api/admin/orders/${order.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            action,
            note: action === "approve" ? effectiveNote || "Disetujui — lanjut produksi." : effectiveNote,
            templateId: action === "reject" ? templateId : undefined,
          }),
        });
        if (res.status === 404) {
          setErr("Endpoint review belum tersedia (404) — coba lagi setelah API agent paralel live.");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.error)) throw new Error(data?.error || `Gagal (${res.status})`);
      } finally {
        clearTimeout(t);
      }
      onDone(
        action === "approve"
          ? `Order ${order.orderNumber} DITERIMA — dibuka untuk pembayaran via dashboard customer.`
          : `Order ${order.orderNumber} DITOLAK — catatan terkirim ke customer.`
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal mengirim keputusan.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-xl space-y-3">
      <div className="flex gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL pratinjau dinamis; unoptimized
          <img
            src={thumb}
            alt={`Desain ${order.orderNumber}`}
            className="w-24 h-24 rounded-xl object-cover border border-border-subtle shrink-0 bg-black/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl border border-border-subtle shrink-0 flex items-center justify-center text-text-muted bg-black/5 dark:bg-white/5">
            <ImageIcon size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-bold text-brand-accent hover:underline"
            >
              {order.orderNumber}
            </Link>
            {overdue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <Clock size={10} />
                <span>menunggu &gt;24 jam</span>
              </span>
            )}
          </div>
          <p className="text-text-primary font-bold truncate mt-1">
            {order.user?.name || order.customerName || "Pelanggan"}
            <span className="text-text-muted font-normal"> · {maskPhone(order.user?.phoneNumber)}</span>
          </p>
          <p className="text-text-muted">
            {first?.snapshotName || "Desain kustom"}
            {first?.snapshotSize ? ` · Size ${first.snapshotSize}` : ""}
            {first?.snapshotColorName ? ` · ${first.snapshotColorName}` : ""}
            {typeof first?.quantity === "number" ? ` · ${first.quantity} pcs` : ""}
          </p>
          <p className="text-text-muted">
            Masuk:{" "}
            {(() => {
              const t = new Date(order.createdAt).getTime();
              return Number.isNaN(t) ? "-" : new Date(order.createdAt).toLocaleString("id-ID");
            })()}
            {typeof order.totalIdr === "number" ? ` · Rp ${order.totalIdr.toLocaleString("id-ID")}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="block text-text-muted text-[10px] font-bold uppercase mb-1">
            Template alasan penolakan:
          </span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent"
          >
            {REVIEW_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {template?.text && (
          <p className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted leading-relaxed">
            {template.text}
          </p>
        )}
        <label className="block">
          <span className="block text-text-muted text-[10px] font-bold uppercase mb-1">
            Catatan kustom {templateId === "lainnya" ? "(wajib)" : "(opsional — menimpa template bila diisi)"}:
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            rows={3}
            maxLength={1000}
            placeholder="Tulis alasan spesifik untuk customer…"
            className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent resize-y"
          />
        </label>
      </div>

      {err && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold">
          {err}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submit("approve")}
          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-300 font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <CheckCircle2 size={15} />
          <span>{busy === "approve" ? "MEMPROSES…" : "TERIMA"}</span>
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submit("reject")}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-300 font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <XCircle size={15} />
          <span>{busy === "reject" ? "MEMPROSES…" : "TOLAK"}</span>
        </button>
      </div>
    </div>
  );
}
