"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Images, UploadCloud, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface LookItem {
  key: string;
  url: string;
}

export function LookbookManager() {
  const [items, setItems] = useState<LookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [askingDelete, setAskingDelete] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/lookbook");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal muat data lookbook");
      setItems(data.items || []);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Gagal muat lookbook" });
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
      setMsg({ type: "error", text: "Ukuran file melebihi batas maksimal 5MB." });
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
      setMsg({ type: "success", text: "Foto berhasil diunggah ke Cloudflare R2 Storage." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Gagal mengunggah foto" });
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
      setMsg({ type: "success", text: "Foto berhasil dihapus." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Gagal menghapus foto" });
    } finally {
      setBusy(false);
      setAskingDelete(null);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold">
            <Images size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text-primary">Galeri Lookbook Portofolio Sablon</h3>
            <p className="text-[11px] text-text-muted">Koleksi foto hasil sablon nyata yang tampil di halaman depan website</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-elevated border border-border-subtle text-text-secondary">
          {items.length} Foto Aktif
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted text-xs">Memuat galeri foto...</div>
      ) : items.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border-subtle text-center space-y-2">
          <UploadCloud size={24} className="mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">Belum ada foto lookbook. Tambahkan foto portofolio hasil sablon pertama di bawah.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((it) => (
            <div key={it.key} className="relative aspect-[4/5] bg-black/30 border border-border-subtle rounded-xl overflow-hidden group shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={it.key} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                <span className="text-[10px] text-white/90 truncate max-w-[80px] font-mono">
                  {it.key.replace("lookbook/", "")}
                </span>
                <button
                  type="button"
                  onClick={() => setAskingDelete(it.key)}
                  disabled={busy}
                  aria-label={`Hapus ${it.key}`}
                  className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition disabled:opacity-50"
                  title="Hapus foto ini"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODERN DRAG & DROP UPLOAD ZONE */}
      <div className="pt-2">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
          }}
          className={`relative flex flex-col items-center justify-center p-6 rounded-xl border border-dashed cursor-pointer transition text-center group ${
            dragOver
              ? "border-brand-accent bg-brand-accent/5"
              : "border-border-subtle hover:border-brand-accent/50 bg-surface-elevated/20 hover:bg-surface-elevated/40"
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="sr-only"
          />
          <div className="flex flex-col items-center gap-1.5 text-xs text-text-primary">
            <UploadCloud size={20} className="text-brand-accent group-hover:scale-110 transition" />
            <span className="font-semibold">
              {busy ? "Sedang mengunggah foto ke R2..." : "Klik atau seret foto ke sini untuk mengunggah"}
            </span>
            <span className="text-[11px] text-text-muted">Mendukung format JPG, PNG, atau WebP (Maksimal 5MB)</span>
          </div>
        </label>
      </div>

      {msg && (
        <p
          className={`text-xs text-center flex items-center justify-center gap-1.5 ${
            msg.type === "success" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-500 font-medium"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{msg.text}</span>
        </p>
      )}

      <ConfirmDialog
        open={askingDelete !== null}
        title="Hapus foto dari lookbook?"
        message={askingDelete ? `Hapus foto "${askingDelete}" dari Cloudflare R2? Foto ini akan langsung hilang dari galeri beranda.` : ""}
        confirmLabel="Ya, Hapus Foto"
        danger
        busy={busy}
        onConfirm={() => askingDelete && void remove(askingDelete)}
        onCancel={() => setAskingDelete(null)}
      />
    </div>
  );
}
