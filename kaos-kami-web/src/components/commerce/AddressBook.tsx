"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fetchJson } from "@/lib/fetchJson";

export interface AddressRow {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  city: string | null;
  district: string | null;
  fullAddress: string;
}

/** Buku alamat: daftar + hapus milik sendiri (tanpa confirm/alert native). */
export function AddressBook({ initial }: { initial: AddressRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [askingId, setAskingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const remove = async (id: string) => {
    setAskingId(null);
    setBusyId(id);
    setMsg(null);
    try {
      await fetchJson("/api/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }, 15000);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Gagal hapus alamat");
    } finally {
      setBusyId(null);
    }
  };

  if (initial.length === 0) {
    return (
      <p className="text-text-muted text-xs font-mono">
        Belum ada alamat tersimpan. Alamat otomatis tersimpan setiap checkout.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {initial.map((a) => (
          <div key={a.id} className="p-4 rounded-2xl bg-[#141416] border border-white/5 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{a.label}</span>
              <button
                onClick={() => setAskingId(a.id)}
                disabled={busyId === a.id}
                className="min-h-[44px] px-3 text-[11px] text-red-300 hover:text-red-200 disabled:opacity-50"
              >
                {busyId === a.id ? "…" : "Hapus"}
              </button>
            </div>
            <p className="text-white">{a.recipientName} • {a.phoneNumber}</p>
            <p className="text-text-muted text-[11px]">
              {[a.district, a.city].filter(Boolean).join(", ")}
            </p>
            <p className="text-text-muted text-[11px]">{a.fullAddress}</p>
          </div>
        ))}
      </div>
      {msg && <p className="font-mono text-[11px] text-amber-300">{msg}</p>}
      <ConfirmDialog
        open={askingId !== null}
        title="Hapus alamat?"
        message="Alamat ini tidak bisa dipakai checkout lagi."
        confirmLabel="YA, HAPUS"
        danger
        busy={busyId !== null}
        onConfirm={() => askingId && void remove(askingId)}
        onCancel={() => setAskingId(null)}
      />
    </div>
  );
}
