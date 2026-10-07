"use client";

import React from "react";

/**
 * Mini-preview hero CMS (read-only render, UI-only).
 * Menampilkan judul + deskripsi yang sedang diedit persis gaya hero
 * beranda (font-sans + tabular) — tanpa fetch, tanpa POST, tanpa iframe.
 */
export function CmsHeroPreview({ title, subtitle }: { title: string; subtitle: string }) {
  const lines = (title || "").split("\n").filter((l) => l.trim().length > 0);
  return (
    <div
      aria-label="Pratinjau hero"
      className="rounded-xl border border-border-subtle bg-canvas p-4 space-y-2"
    >
      <p className="font-sans text-[10px] uppercase tracking-wider text-text-muted font-bold">
        LIVE PREVIEW (read-only)
      </p>
      <div className="rounded-lg bg-surface border border-border-subtle p-4 space-y-2">
        <p className="font-sans text-[10px] font-semibold text-brand-accent">
          Kaos Kami // 3D DTF Studio Makassar
        </p>
        <h4 className="font-sans font-black uppercase tracking-tight leading-tight text-text-primary text-lg whitespace-pre-line">
          {lines.length > 0 ? lines.join("\n") : "— judul hero —"}
        </h4>
        <p className="font-sans tabular-nums text-[11px] text-text-muted leading-relaxed">
          {subtitle.trim() || "— deskripsi SEO —"}
        </p>
      </div>
    </div>
  );
}
