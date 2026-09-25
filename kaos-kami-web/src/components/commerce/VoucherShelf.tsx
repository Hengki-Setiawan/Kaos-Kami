"use client";

import React, { useEffect, useState } from "react";
import { TicketPercent, Copy, Check } from "lucide-react";

interface Voucher {
  code: string;
  discountType: string;
  discountValue: number;
  minSpendIdr: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
}

/** U16: etalase voucher aktif + syarat + salin kode. */
export function VoucherShelf() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/coupons", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.coupons)) setItems(data.coupons);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const copy = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      else throw new Error("no-clipboard");
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2500);
    } catch {
      setCopied(null);
    }
  };

  const desc = (v: Voucher) => {
    const disc =
      v.discountType === "PERCENT" ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString("id-ID")}`;
    const parts = [`Potongan ${disc}`];
    if (v.minSpendIdr > 0) parts.push(`min. belanja Rp ${v.minSpendIdr.toLocaleString("id-ID")}`);
    if (v.maxUses != null) parts.push(`sisa ${Math.max(0, v.maxUses - v.usedCount)}x pakai`);
    if (v.expiresAt) {
      parts.push(
        `s/d ${new Date(v.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
      );
    }
    return parts.join(" · ");
  };

  if (loading) return <p className="text-xs text-text-muted text-center py-8">Memuat voucher…</p>;
  if (items.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-surface border border-border-subtle text-text-muted text-xs">
        Belum ada voucher aktif. Pantau Instagram / WhatsApp workshop untuk kode promo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((v) => (
        <div key={v.code} className="p-4 rounded-2xl bg-surface border border-dashed border-brand-accent/50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold text-text-primary text-sm">
              <TicketPercent size={15} className="text-brand-accent" />
              <span className="tracking-widest">{v.code}</span>
            </span>
            <button
              type="button"
              onClick={() => void copy(v.code)}
              className="px-2.5 py-1.5 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent text-[11px] font-bold flex items-center gap-1"
            >
              {copied === v.code ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied === v.code ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
          <p className="text-[11px] text-text-muted">{desc(v)}</p>
          <p className="text-[10px] text-text-muted/70 italic">Masukkan kode saat checkout (kolom kupon).</p>
        </div>
      ))}
    </div>
  );
}
