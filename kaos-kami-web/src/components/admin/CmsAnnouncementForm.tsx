"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

const PROMO_PRESETS = [
  "PROMO MAHASISWA & KOMUNITAS: GRATIS ONGKIR SE-MAKASSAR | WORKSHOP TALLO",
  "FLASH SALE SABLON DTF: DISKON 10% KODE 'MAKASSAR10' | BISA CETAK SATUAN",
  "ORDER HARI INI KIRIM BESOK: LAYANAN SABLON DTF KILAT 24 JAM MAKASSAR",
];

export function CmsAnnouncementForm() {
  const [announcementText, setAnnouncementText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/shop-config");
        const d = await res.json().catch(() => null);
        if (alive && res.ok && d?.config) {
          if (d.config.announcementText) setAnnouncementText(d.config.announcementText);
          if (d.config.announcementActive !== undefined) setIsActive(d.config.announcementActive === "true");
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/shop-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementText: announcementText.trim(),
          announcementActive: isActive ? "true" : "false",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan pengumuman");
      setMsg({ type: "success", text: "Banner pengumuman berhasil disimpan ke database Turso." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Gagal menyimpan pengaturan" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold">
              <Megaphone size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Banner Pengumuman Berjalan</h3>
              <p className="text-[11px] text-text-muted">Pesan teks ticker di bilah paling atas situs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              isActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-surface border-border-subtle text-text-muted"
            }`}
          >
            {isActive ? "Aktif Tayang" : "Nonaktif"}
          </button>
        </div>

        <div className="space-y-3 pt-3">
          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted block mb-1.5 flex items-center gap-1">
              <Sparkles size={11} />
              <span>Gunakan Template Cepat:</span>
            </span>
            <div className="flex flex-col gap-1.5">
              {PROMO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAnnouncementText(p)}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-surface-elevated border border-border-subtle text-[11px] text-text-muted hover:text-text-primary transition truncate"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
              Isi Teks Pengumuman Promo
            </label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              rows={3}
              maxLength={180}
              placeholder="Ketik teks pengumuman promo toko atau workshop..."
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition leading-relaxed"
            />
            <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
              <span>Tampil animasi berjalan di header semua halaman</span>
              <span>{announcementText.length}/180</span>
            </div>
          </div>

          {/* Live Marquee Preview Box */}
          {isActive && announcementText && (
            <div className="p-2.5 rounded-xl bg-brand-accent/5 border border-brand-accent/20">
              <span className="text-[10px] font-bold text-brand-accent uppercase block mb-1">
                Pratinjau Bilah Atas:
              </span>
              <div className="overflow-hidden whitespace-nowrap text-xs font-semibold text-text-primary">
                {announcementText}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-border-subtle">
        {msg ? (
          <span
            className={`text-xs flex items-center gap-1.5 ${
              msg.type === "success"
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-rose-500 font-medium"
            }`}
          >
            {msg.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{msg.text}</span>
          </span>
        ) : (
          <span className="text-[11px] text-text-muted">Perubahan langsung aktif di website</span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:opacity-95 transition disabled:opacity-50 shadow-xs"
        >
          {busy ? "Menyimpan..." : "Simpan Pengumuman"}
        </button>
      </div>
    </div>
  );
}
