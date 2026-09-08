"use client";

import React, { useState } from "react";

/** Form hero CMS: simpan judul + deskripsi ke R2 (tampil di beranda). */
export function CmsHeroForm() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    if (title.trim().length < 2) {
      setMsg("❌ Judul minimal 2 karakter.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroTitle: title.trim(), heroSubtitle: subtitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal simpan");
      setMsg("✅ Tersimpan — beranda memakai judul baru (maks 5 menit cache).");
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-white">HERO & SEO (tersimpan ke R2, tanpa deploy)</h3>
      <div className="space-y-2">
        <label className="block text-[11px] text-text-muted">
          Judul Hero (baris baru = Enter)
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={2}
            maxLength={80}
            placeholder={"HEAVYWEIGHT\nBOXY TEE"}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white"
          />
        </label>
        <label className="block text-[11px] text-text-muted">
          Deskripsi SEO
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Engineered oversized streetwear…"
            className="mt-1 w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white"
          />
        </label>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "SIMPAN (R2 JSON)"}
        </button>
        {msg && <p className="text-[11px] text-text-muted">{msg}</p>}
        <p className="text-[10px] text-text-muted">Simpan ke R2 `cms/hero.json` → beranda membaca otomatis — tanpa redeploy.</p>
      </div>
    </div>
  );
}
