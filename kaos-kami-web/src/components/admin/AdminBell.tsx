"use client";

/**
 * AdminBell — lonceng notifikasi workshop di panel admin.
 *
 * Sumber data (defensif, endpoint milik agent paralel):
 * 1. Primer: GET /api/admin/notifications/summary →
 *    {needsReview, needsReviewOverdue24h, newOrdersLastHour, oversellCount, expressOverdue}
 * 2. Fallback: GET /api/admin/orders?status=DESIGN_REVIEW → needsReview = jumlah
 *    item (metrik lain 0 + penanda "ringkas"). JANGAN buat API itu di sini.
 * 3. Keduanya 404/gagal = tampil "memuat…" + pesan data belum tersedia.
 *
 * Perilaku: poll tiap 60 detik, badge = needsReview, dropdown = 5 metrik,
 * bunyi sekali saat needsReview NAIK di atas 0 (bukan tiap poll, agar tak
 * mengganggu operator). Audio dibungkus try/catch (autoplay policy).
 *
 * Pemasangan (di luar cakupan file ini — butuh edit layout):
 *   import { AdminBell } from "@/components/admin/AdminBell";
 *   lalu render <AdminBell /> di header/sidebar admin.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export interface AdminSummary {
  needsReview: number | null;
  needsReviewOverdue24h: number | null;
  newOrdersLastHour: number | null;
  oversellCount: number | null;
  expressOverdue: number | null;
  complaintsOpen: number | null;
}

const EMPTY: AdminSummary = {
  needsReview: 0,
  needsReviewOverdue24h: 0,
  newOrdersLastHour: 0,
  oversellCount: 0,
  expressOverdue: 0,
  complaintsOpen: 0,
};

/** null = metrik gagal dibaca di server (bukan 0) — tampil "…". */
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** Parse defensif summary: terima {summary:{...}} atau objek datar. */
function parseSummary(json: unknown): AdminSummary | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const s = (o.summary && typeof o.summary === "object" ? o.summary : o) as Record<string, unknown>;
  if (
    s.needsReview === undefined &&
    s.needsReviewOverdue24h === undefined &&
    s.newOrdersLastHour === undefined &&
    s.oversellCount === undefined &&
    s.expressOverdue === undefined
  ) {
    return null;
  }
  return {
    needsReview: toNumOrNull(s.needsReview),
    needsReviewOverdue24h: toNumOrNull(s.needsReviewOverdue24h),
    newOrdersLastHour: toNumOrNull(s.newOrdersLastHour),
    oversellCount: toNumOrNull(s.oversellCount),
    expressOverdue: toNumOrNull(s.expressOverdue),
    complaintsOpen: toNumOrNull(s.complaintsOpen),
  };
}

function countItems(json: unknown): number | null {
  if (Array.isArray(json)) return json.length;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const k of ["orders", "items", "data"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
    if (typeof o.total === "number") return toNumOrNull(o.total);
    if (typeof o.count === "number") return toNumOrNull(o.count);
  }
  return null;
}

/** Bunyi pendek via WebAudio — gagal diam-diam (autoplay policy / SSR). */
function beep() {
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close().catch(() => undefined);
  } catch {
    // Abaikan — lonceng visual (badge) tetap jalan.
  }
}

export function AdminBell({ pollMs = 60000 }: { pollMs?: number }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [fallbackRingkas, setFallbackRingkas] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const prevNeeds = useRef<number | null>(null);

  const load = useCallback(async () => {
    // 1. Primer: summary endpoint.
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch("/api/admin/notifications/summary", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const parsed = parseSummary(await res.json().catch(() => null));
          if (parsed) {
            setSummary(parsed);
            setFallbackRingkas(false);
            setUnavailable(false);
            return;
          }
        } else if (res.status !== 404) {
          // Status non-404 tapi gagal → langsung ke fallback antrean.
        }
      } finally {
        clearTimeout(t);
      }
    } catch {
      // Lanjut ke fallback.
    }

    // 2. Fallback: hitung needsReview dari antrean (JANGAN buat API ini).
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch("/api/admin/orders?status=DESIGN_REVIEW", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const n = countItems(await res.json().catch(() => null));
          if (n !== null) {
            setSummary({ ...EMPTY, needsReview: n });
            setFallbackRingkas(true);
            setUnavailable(false);
            return;
          }
        }
      } finally {
        clearTimeout(t);
      }
    } catch {
      // Lanjut ke status unavailable.
    }

    // 3. Keduanya gagal.
    setUnavailable(true);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), Math.max(15000, pollMs));
    return () => clearInterval(id);
  }, [load, pollMs]);

  // Bunyi hanya saat needsReview NAIK dan > 0 (bukan tiap poll).
  useEffect(() => {
    if (!summary) return;
    const cur = summary.needsReview ?? 0;
    const prev = prevNeeds.current;
    prevNeeds.current = cur;
    if (prev !== null && cur > prev && cur > 0) {
      beep();
    }
  }, [summary]);

  const needs = summary?.needsReview ?? 0;

  const rows: Array<{ label: string; value: number | null; href: string; danger: boolean }> = [
    { label: "Perlu review desain", value: summary?.needsReview ?? null, href: "/admin/review", danger: needs > 0 },
    { label: "Review >24 jam", value: summary?.needsReviewOverdue24h ?? null, href: "/admin/review", danger: (summary?.needsReviewOverdue24h ?? 0) > 0 },
    { label: "Order baru 1 jam terakhir", value: summary?.newOrdersLastHour ?? null, href: "/admin/orders", danger: false },
    { label: "Indikasi oversell", value: summary?.oversellCount ?? null, href: "/admin/catalog", danger: (summary?.oversellCount ?? 0) > 0 },
    { label: "Express overdue", value: summary?.expressOverdue ?? null, href: "/admin/orders", danger: (summary?.expressOverdue ?? 0) > 0 },
    { label: "Komplain terbuka", value: summary?.complaintsOpen ?? null, href: "/admin/orders", danger: (summary?.complaintsOpen ?? 0) > 0 },
  ];

  return (
    <div className="relative font-mono text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={summary === null ? "Notifikasi (memuat…)" : `Notifikasi (${needs} perlu review)`}
        className="relative p-2.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary transition-all"
      >
        <Bell size={17} className={needs > 0 ? "text-amber-500" : ""} />
        {summary === null ? (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/10 border border-border-subtle text-text-muted">
            …
          </span>
        ) : (
          needs > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black bg-rose-500 text-white border border-rose-300 flex items-center justify-center animate-pulse">
              {needs > 99 ? "99+" : needs}
            </span>
          )
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent border-0 p-0"
          />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 rounded-2xl bg-surface border border-border-subtle shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <span className="font-bold uppercase text-text-primary">Notifikasi workshop</span>
              {fallbackRingkas && (
                <span className="text-[10px] text-text-muted">mode ringkas</span>
              )}
            </div>
            {summary === null ? (
              <div className="px-4 py-6 text-center text-text-muted">
                {unavailable ? "data belum tersedia — API summary + antrean 404" : "memuat…"}
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {rows.map((r) => (
                  <Link
                    key={r.label}
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className={r.danger ? "font-bold text-amber-600 dark:text-amber-300" : "text-text-muted"}>
                      {r.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        r.danger
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/40"
                          : "bg-black/5 dark:bg-white/5 text-text-primary border-border-subtle"
                      }`}
                    >
                      {r.value === null ? "…" : r.value}
                    </span>
                  </Link>
                ))}
                {fallbackRingkas && (
                  <p className="px-4 py-2.5 text-[10px] text-text-muted border-t border-border-subtle">
                    Ringkas: summary 404 → angka dari antrean DESIGN_REVIEW saja.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
