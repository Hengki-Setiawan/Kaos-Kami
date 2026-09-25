"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Panel kelola kupon: buat baru (kode, jenis, nilai, min belanja, kuota, kedaluwarsa, status). */
export function CouponAdminPanel() {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: 10,
    minSpendIdr: 0,
    maxUses: "",
    expiresAt: "",
    isActive: true,
  });
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
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      setMsg("✅ Kupon dibuat.");
      setForm({ code: "", discountType: "PERCENT", discountValue: 10, minSpendIdr: 0, maxUses: "", expiresAt: "", isActive: true });
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-text-primary">BUAT KUPON BARU</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="KODE" maxLength={32} aria-label="Kode kupon" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary col-span-2 sm:col-span-1" />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} aria-label="Jenis diskon" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary">
          <option value="PERCENT">% persen</option>
          <option value="FIXED">Rp tetap</option>
        </select>
        <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} placeholder="Nilai" min={1} aria-label="Nilai diskon" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary" />
        <input type="number" value={form.minSpendIdr} onChange={(e) => setForm({ ...form, minSpendIdr: Number(e.target.value) })} placeholder="Min belanja" min={0} aria-label="Minimal belanja" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary" />
        <input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/[^0-9]/g, "") })} placeholder="Kuota (opsional)" inputMode="numeric" aria-label="Kuota pemakaian" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary" />
        <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} aria-label="Tanggal kedaluwarsa" className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary" />
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} aria-label="Langsung aktif" />
          LANGSUNG AKTIF
        </label>
      </div>
      <button onClick={create} disabled={busy || form.code.length < 3} className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50">
        {busy ? "Menyimpan…" : "Buat kupon"}
      </button>
      {msg && <p className="text-[11px] text-text-muted">{msg}</p>}
    </div>
  );
}

/** Aksi per baris kupon: aktif/nonaktif + edit kuota/kedaluwarsa + reset pemakaian + hapus (via DELETE). */
export function CouponRowActions({
  id,
  isActive,
  usedCount,
  maxUses,
  expiresAt,
}: {
  id: string;
  isActive: boolean;
  usedCount: number;
  maxUses: number | null;
  expiresAt: string | Date | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMaxUses, setEditMaxUses] = useState(maxUses ? String(maxUses) : "");
  const [editExpiresAt, setEditExpiresAt] = useState(
    expiresAt ? new Date(expiresAt).toISOString().slice(0, 10) : ""
  );
  const [msg, setMsg] = useState<string | null>(null);

  const patch = async (body: object) => {
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
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal");
    } finally {
      setBusy(false);
    }
  };

  // SATU jalur hapus: DELETE + 404 bila tak ada.
  const remove = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal hapus");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal hapus");
    } finally {
      setBusy(false);
      setAskingDelete(false);
    }
  };

  const saveEdit = () =>
    patch({
      maxUses: editMaxUses ? Number(editMaxUses) : null,
      expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
    });

  return (
    <div className="flex gap-2 items-center flex-wrap justify-end">
      <span className="text-[11px] text-text-muted">
        dipakai {usedCount ?? 0}/{maxUses || "∞"}
      </span>
      <button onClick={() => void patch({ isActive: !isActive })} disabled={busy} className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px] font-bold disabled:opacity-50">
        {isActive ? "NONAKTIFKAN" : "AKTIFKAN"}
      </button>
      <button onClick={() => setEditing((v) => !v)} disabled={busy} className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px] font-bold disabled:opacity-50">
        {editing ? "TUTUP" : "EDIT"}
      </button>
      {(usedCount ?? 0) > 0 && (
        <button onClick={() => void patch({ resetUsage: true })} disabled={busy} title="Nolkan hitungan pemakaian (kuota kembali penuh)" className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px] font-bold disabled:opacity-50">
          RESET KUOTA
        </button>
      )}
      <button onClick={() => setAskingDelete(true)} disabled={busy} className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-[11px] font-bold disabled:opacity-50">
        HAPUS
      </button>
      {msg && <span className="text-[11px] text-amber-300 w-full text-right">{msg}</span>}
      {editing && (
        <div className="flex gap-2 items-center w-full justify-end">
          <input
            value={editMaxUses}
            onChange={(e) => setEditMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Kuota (kosong = ∞)"
            inputMode="numeric"
            aria-label="Kuota pemakaian"
            className="w-32 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px]"
          />
          <input
            type="date"
            value={editExpiresAt}
            onChange={(e) => setEditExpiresAt(e.target.value)}
            aria-label="Tanggal kedaluwarsa"
            className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px]"
          />
          <button onClick={saveEdit} disabled={busy} className="px-2.5 py-1 rounded-lg bg-brand-accent text-canvas text-[11px] font-bold disabled:opacity-50">
            SIMPAN
          </button>
        </div>
      )}
      <ConfirmDialog
        open={askingDelete}
        title="Hapus kupon?"
        message="Kode ini tak bisa dipakai lagi. Order lama tidak terpengaruh."
        confirmLabel="YA, HAPUS"
        danger
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setAskingDelete(false)}
      />
    </div>
  );
}
