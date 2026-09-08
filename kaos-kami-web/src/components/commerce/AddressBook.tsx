"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface AddressRow {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  city: string | null;
  district: string | null;
  fullAddress: string;
}

/** Buku alamat: daftar + hapus milik sendiri. */
export function AddressBook({ initial }: { initial: AddressRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Hapus alamat ini?")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Gagal hapus alamat");
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {initial.map((a) => (
        <div key={a.id} className="p-4 rounded-2xl bg-[#141416] border border-white/5 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white">{a.label}</span>
            <button
              onClick={() => void remove(a.id)}
              disabled={busyId === a.id}
              className="text-[11px] text-red-300 hover:text-red-200 disabled:opacity-50"
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
  );
}
