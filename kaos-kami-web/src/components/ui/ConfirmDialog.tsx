"use client";

import React, { useEffect } from "react";

// Pengganti window.confirm (audit #21-23, #27-29): bekerja di semua browser
// + WebView, bisa di-style, ada ESC/backdrop, tanpa string native Inggris.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "YA, LANJUTKAN",
  cancelLabel = "BATAL",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#141416] border border-white/10 p-5 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-black text-base uppercase text-white">{title}</h3>
        <p className="font-mono text-xs text-text-muted leading-relaxed">{message}</p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-surface border border-white/10 text-white font-bold text-xs uppercase disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase disabled:opacity-50 ${
              danger ? "bg-rose-600 text-white" : "bg-brand-accent text-canvas"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
