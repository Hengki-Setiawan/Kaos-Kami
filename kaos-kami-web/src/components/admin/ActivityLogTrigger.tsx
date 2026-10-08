"use client";

import React, { useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import { ActivityHistoryModal } from "./ActivityHistoryModal";

export function ActivityLogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <History size={15} className="text-brand-accent" />
            <span>Audit Trail & Log Aktivitas Toko</span>
          </h3>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 font-mono">
            <ShieldCheck size={12} />
            <span>Audit Live</span>
          </span>
        </div>
        <p className="text-text-muted text-xs leading-relaxed">
          Seluruh rekaman perubahan status pesanan, perpindahan tahap produksi workshop, dan catatan kurir tersimpan dalam audit log Turso secara real-time.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <History size={14} className="text-brand-accent" />
          <span>Buka Log Riwayat Aktivitas Lengkap →</span>
        </button>
      </div>

      {open && <ActivityHistoryModal onClose={() => setOpen(false)} />}
    </>
  );
}
