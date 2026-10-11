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
      if (!res.ok || data.error) throw new Error(data.error || "Gagal membuat kupon");
      setMsg("Kupon berhasil dibuat.");
      setForm({ code: "", discountType: "PERCENT", discountValue: 10, minSpendIdr: 0, maxUses: "", expiresAt: "", isActive: true });
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal membuat kupon");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <div>
          <h3 className="font-bold text-sm text-text-primary tracking-wide">Buat Kupon Promo Baru</h3>
          <p className="text-[11px] text-text-muted">Tambahkan kode voucher diskon untuk promosi atau event Makassar</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="col-span-2 sm:col-span-2">
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Kode Kupon</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            placeholder="MISAL: PROMO10"
            maxLength={32}
            aria-label="Kode kupon"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-brand-accent transition"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Tipe Diskon</label>
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            aria-label="Jenis diskon"
            className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
          >
            <option value="PERCENT">% Persen</option>
            <option value="FIXED">Rp Tetap</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Nilai Diskon</label>
          <input
            type="number"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
            placeholder="Nilai"
            min={1}
            aria-label="Nilai diskon"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Min. Belanja (Rp)</label>
          <input
            type="number"
            value={form.minSpendIdr}
            onChange={(e) => setForm({ ...form, minSpendIdr: Number(e.target.value) })}
            placeholder="0"
            min={0}
            aria-label="Minimal belanja"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Kuota Pakai</label>
          <input
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="Tak terbatas"
            inputMode="numeric"
            aria-label="Kuota pemakaian"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
          />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Kedaluwarsa (Opsional)</label>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            aria-label="Tanggal kedaluwarsa"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
          />
        </div>
        <div className="col-span-2 sm:col-span-3 flex items-center justify-between pt-5">
          <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              aria-label="Langsung aktif"
              className="rounded border-border-subtle text-brand-accent focus:ring-0"
            />
            Langsung Aktifkan Kupon
          </label>
          <button
            onClick={create}
            disabled={busy || form.code.length < 3}
            className="px-5 py-2 rounded-xl bg-brand-accent text-canvas font-semibold text-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Menyimpan…" : "Simpan Kupon"}
          </button>
        </div>
      </div>
      {msg && <p className="text-xs text-brand-accent font-medium">{msg}</p>}
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
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.message?.includes("aborted")) return;
      setMsg(e?.message || "Gagal memperbarui status");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal hapus");
      router.refresh();
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.message?.includes("aborted")) return;
      setMsg(e?.message || "Gagal menghapus kupon");
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
    <div className="flex flex-col sm:items-end gap-2">
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <button
          onClick={() => void patch({ isActive: !isActive })}
          disabled={busy}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
            isActive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
              : "bg-surface text-text-muted border-border-subtle hover:text-text-primary"
          } disabled:opacity-50`}
        >
          {isActive ? "Aktif" : "Nonaktifkan"}
        </button>

        <button
          onClick={() => setEditing((v) => !v)}
          disabled={busy}
          className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-secondary hover:text-text-primary text-[11px] font-medium transition disabled:opacity-50"
        >
          {editing ? "Tutup" : "Edit"}
        </button>

        {(usedCount ?? 0) > 0 && (
          <button
            onClick={() => void patch({ resetUsage: true })}
            disabled={busy}
            title="Nolkan hitungan pemakaian (kuota kembali penuh)"
            className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-brand-accent text-[11px] transition disabled:opacity-50"
          >
            Reset
          </button>
        )}

        <button
          onClick={() => setAskingDelete(true)}
          disabled={busy}
          className="px-2 py-1 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 text-[11px] font-medium transition disabled:opacity-50"
        >
          Hapus
        </button>
      </div>

      {msg && <span className="text-[11px] text-amber-500">{msg}</span>}

      {editing && (
        <div className="flex gap-2 items-center w-full justify-end pt-1">
          <input
            value={editMaxUses}
            onChange={(e) => setEditMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Kuota (kosong = ∞)"
            inputMode="numeric"
            aria-label="Kuota pemakaian"
            className="w-28 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-xs"
          />
          <input
            type="date"
            value={editExpiresAt}
            onChange={(e) => setEditExpiresAt(e.target.value)}
            aria-label="Tanggal kedaluwarsa"
            className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-xs"
          />
          <button
            onClick={saveEdit}
            disabled={busy}
            className="px-3 py-1 rounded-lg bg-brand-accent text-canvas text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      )}

      <ConfirmDialog
        open={askingDelete}
        title="Hapus kupon promo?"
        message="Voucher ini tidak akan bisa digunakan lagi oleh pelanggan. Data pesanan lama yang telah memakai kupon ini tetap aman."
        confirmLabel="Ya, Hapus Kupon"
        danger
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setAskingDelete(false)}
      />
    </div>
  );
}
