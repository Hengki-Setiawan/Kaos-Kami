"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Panel kelola kupon: buat baru + aktif/nonaktif + hapus. */
export function CouponAdminPanel() {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", discountType: "PERCENT", discountValue: 10, minSpendIdr: 0, maxUses: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minSpendIdr: Number(form.minSpendIdr) || 0,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      setMsg("✅ Kupon dibuat.");
      setForm({ code: "", discountType: "PERCENT", discountValue: 10, minSpendIdr: 0, maxUses: "" });
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-white">BUAT KUPON BARU</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="KODE" maxLength={32} aria-label="Kode kupon" className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white col-span-2 sm:col-span-1" />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} aria-label="Jenis diskon" className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white">
          <option value="PERCENT">% persen</option>
          <option value="FIXED">Rp tetap</option>
        </select>
        <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} placeholder="Nilai" min={1} aria-label="Nilai diskon" className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white" />
        <input type="number" value={form.minSpendIdr} onChange={(e) => setForm({ ...form, minSpendIdr: Number(e.target.value) })} placeholder="Min belanja" min={0} aria-label="Minimal belanja" className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white" />
        <input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/[^0-9]/g, "") })} placeholder="Kuota (opsional)" inputMode="numeric" aria-label="Kuota pemakaian" className="px-3 py-2 rounded-xl bg-surface border border-white/10 text-white" />
      </div>
      <button onClick={create} disabled={busy || form.code.length < 3} className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
        {busy ? "Menyimpan…" : "Buat kupon"}
      </button>
      {msg && <p className="text-[11px] text-text-muted">{msg}</p>}
    </div>
  );
}

/** Aksi per baris kupon: aktif/nonaktif + hapus. */
export function CouponRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const act = async (body: object) => {
    setBusy(true);
    setMsg(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ id, ...body }),
      });
      clearTimeout(t);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal");
      router.refresh();
    } catch (e: any) {
      // Gagal diam (audit #27) → tampilkan pesan, bukan diam.
      setMsg(e?.message || "Gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <button onClick={() => void act({ isActive: !isActive })} disabled={busy} className="px-2.5 py-1 rounded-lg bg-surface border border-white/10 text-white text-[11px] font-bold disabled:opacity-50">
        {isActive ? "NONAKTIFKAN" : "AKTIFKAN"}
      </button>
      <button onClick={() => setAskingDelete(true)} disabled={busy} className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-[11px] font-bold disabled:opacity-50">
        HAPUS
      </button>
      {msg && <span className="text-[11px] text-amber-300">{msg}</span>}
      <ConfirmDialog
        open={askingDelete}
        title="Hapus kupon?"
        message="Kode ini tak bisa dipakai lagi. Order lama tidak terpengaruh."
        confirmLabel="YA, HAPUS"
        danger
        busy={busy}
        onConfirm={() => {
          setAskingDelete(false);
          void act({ delete: true });
        }}
        onCancel={() => setAskingDelete(false)}
      />
    </div>
  );
}
