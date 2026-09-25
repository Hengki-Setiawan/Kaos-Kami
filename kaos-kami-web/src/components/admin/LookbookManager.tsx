"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface LookItem {
  key: string;
  url: string;
}

/** Manager Lookbook R2: list + upload + hapus (ganti panel palsu audit H18). */
export function LookbookManager() {
  const [items, setItems] = useState<LookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [askingDelete, setAskingDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/lookbook");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal muat");
      setItems(data.items || []);
    } catch (e: any) {
      setMsg(e?.message || "Gagal muat lookbook");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Maksimal 5MB.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/admin/cms/lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setItems((it) => [...it, data.item]);
      setMsg("Foto terupload ke R2 lookbook/.");
    } catch (e: any) {
      setMsg(e?.message || "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cms/lookbook?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Hapus gagal");
      setItems((it) => it.filter((x) => x.key !== key));
    } catch (e: any) {
      setMsg(e?.message || "Hapus gagal");
    } finally {
      setBusy(false);
      setAskingDelete(null);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-text-primary">LOOKBOOK (R2 live — {items.length} foto)</h3>
      {loading ? (
        <p className="text-text-muted">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="text-text-muted">Belum ada foto. Upload pertama di bawah.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <div key={it.key} className="relative aspect-[4/5] bg-black/40 border border-border-subtle rounded-xl overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={it.key} className="w-full h-full object-cover" loading="lazy" />
              <button
                onClick={() => setAskingDelete(it.key)}
                disabled={busy}
                aria-label={`Hapus ${it.key}`}
                className="absolute top-1 right-1 px-2 py-1 rounded-lg bg-rose-600/90 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
              >
                HAPUS
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="block">
        <span className="font-mono text-[11px] text-text-muted">Upload foto baru (maks 5MB, JPG/PNG/WebP):</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-1 w-full text-xs text-text-muted"
        />
      </label>
      {msg && <p className="font-mono text-[11px] text-amber-300">{msg}</p>}
      <ConfirmDialog
        open={askingDelete !== null}
        title="Hapus foto?"
        message={askingDelete ? `Hapus ${askingDelete} dari R2? Foto hilang dari lookbook publik.` : ""}
        confirmLabel="YA, HAPUS"
        danger
        busy={busy}
        onConfirm={() => askingDelete && void remove(askingDelete)}
        onCancel={() => setAskingDelete(null)}
      />
    </div>
  );
}
