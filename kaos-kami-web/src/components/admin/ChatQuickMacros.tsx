"use client";

import React from "react";

/**
 * Macro balasan cepat admin chat (UI-only).
 * Sekadar mengisi composer via onPick — TIDAK mengirim langsung,
 * TIDAK menyentuh thread/message API. Pengiriman tetap via
 * handleSend() existing di AdminChatManager.
 */
export const CHAT_QUICK_MACROS = [
  "File sablon sedang dicetak",
  "Paket diserahkan ke kurir",
] as const;

export function ChatQuickMacros({
  onPick,
  disabled = false,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="px-4 py-2 bg-surface/70 border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
      aria-label="Macro balasan cepat"
    >
      <span className="text-[10px] font-sans text-text-muted uppercase font-bold shrink-0">
        MACRO:
      </span>
      {CHAT_QUICK_MACROS.map((macro) => (
        <button
          key={macro}
          type="button"
          disabled={disabled}
          onClick={() => onPick(macro)}
          title={`Isi pesan: ${macro}`}
          className="px-2.5 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/30 hover:border-brand-accent text-[11px] text-text-primary whitespace-nowrap transition-colors disabled:opacity-40"
        >
          {macro}
        </button>
      ))}
    </div>
  );
}
