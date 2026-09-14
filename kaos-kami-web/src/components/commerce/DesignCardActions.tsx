"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Aksi kartu desain: ganti nama + hapus (milik sendiri). Tanpa prompt/confirm native. */
export function DesignCardActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nextTitle, setNextTitle] = useState(title);

  const callApi = async (method: string, body: object) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch("/api/designs", {
        method,
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

  const doRename = async () => {
    const t = nextTitle.trim().slice(0, 60);
    if (!t || t === title) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await callApi("PATCH", { id, title: t });
      setRenaming(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal ganti nama");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await callApi("DELETE", { id });
      setDeleting(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal hapus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          setNextTitle(title);
          setRenaming(true);
        }}
        disabled={busy}
        className="flex-1 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-text-primary text-[11px] font-bold disabled:opacity-50 transition-all"
      >
        ✏️ GANTI NAMA
      </button>
      <button
        onClick={() => setDeleting(true)}
        disabled={busy}
        className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-[11px] font-bold disabled:opacity-50 transition-all"
      >
        🗑 HAPUS
      </button>
      {msg && <p className="w-full font-mono text-[11px] text-amber-300">{msg}</p>}

      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRenaming(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ganti nama desain"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface border border-border-subtle p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-black text-base uppercase text-text-primary">Ganti nama desain</h3>
            <input
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value.slice(0, 60))}
              maxLength={60}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") doRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRenaming(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase"
              >
                Batal
              </button>
              <button
                onClick={doRename}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        title="Hapus desain?"
        message={`"${title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="YA, HAPUS"
        danger
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
