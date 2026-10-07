"use client";

import React, { useEffect } from "react";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { Z_CLASS_CONFIRM } from "@/lib/zIndex";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // 1 Event listener tunggal dan bersih (bug duplikasi dihapus)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${Z_CLASS_CONFIRM} flex items-center justify-center p-4 bg-black/75 backdrop-blur-md dialog-overlay-expo duration-200 ease-out-expo`}
      onClick={busy ? undefined : onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#141418] border border-white/[0.12] p-6 space-y-4 shadow-2xl relative overflow-hidden dialog-spring-in duration-200 ease-out-expo"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            danger ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]"
          }`}
        />

        {/* Header dengan Ikon Semantik */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              danger
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
            }`}
          >
            {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div className="space-y-1">
            <h3 className="font-sans font-semibold text-base text-zinc-100 leading-snug">
              {title}
            </h3>
            <p className="font-sans text-sm text-zinc-400 leading-relaxed">
              {message}
            </p>
            {children && <div className="pt-2">{children}</div>}
          </div>
        </div>

        {/* Tombol Aksi Taktil 4-Tier Button Architecture */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/[0.08] font-sans font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`flex-1 py-2.5 rounded-xl font-sans font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
              danger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                : "bg-orange-500 hover:bg-orange-400 text-white shadow-orange-950/50"
            }`}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

