"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Z_CLASS_MODAL } from "@/lib/zIndex";
import { CouponAdminPanel } from "@/components/admin/CouponAdminPanel";

/**
 * Modal pembungkus form buat-kupon (UI-only).
 * Form + POST tetap milik CouponAdminPanel (/api/admin/coupons) —
 * komponen ini hanya memindahkan render-nya ke dalam dialog modal.
 */
export function CouponCreateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase"
      >
        + BUAT KUPON
      </button>
      {open && (
        <div
          className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm`}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Buat kupon baru"
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-canvas border border-border-subtle p-4 space-y-3 shadow-2xl max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-sm text-text-primary uppercase">
                Buat kupon baru
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup modal kupon"
                className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-surface-elevated transition-colors"
              >
                <span>TUTUP</span>
                <X size={13} />
              </button>
            </div>
            <CouponAdminPanel />
          </div>
        </div>
      )}
    </>
  );
}
