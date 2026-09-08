"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Aksi kartu desain: ganti nama + hapus (milik sendiri). */
export function DesignCardActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const rename = async () => {
    const next = prompt("Nama baru desain:", title);
    if (!next || next.trim() === title) return;
    setBusy(true);
    try {
      const res = await fetch("/api/designs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: next.trim().slice(0, 60) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Hapus desain "${title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/designs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={rename}
        disabled={busy}
        className="flex-1 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-brand-accent text-white text-[11px] font-bold disabled:opacity-50 transition-all"
      >
        ✏️ GANTI NAMA
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-[11px] font-bold disabled:opacity-50 transition-all"
      >
        🗑 HAPUS
      </button>
    </div>
  );
}
