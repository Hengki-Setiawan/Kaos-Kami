"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["CUSTOMER", "ADMIN", "PRODUCTION_STAFF", "SUPER_ADMIN"] as const;

/** Ubah role customer (admin only, anti-lockout di server). */
export function CustomerRoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const change = async (next: string) => {
    if (next === role || busy) return;
    if (!confirm(`Ubah role ke ${next}?`)) {
      router.refresh();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: next }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal");
      setMsg("✅ Role diubah.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={role}
        disabled={busy}
        onChange={(e) => void change(e.target.value)}
        className="px-2 py-1 rounded-lg bg-surface border border-white/10 text-white text-[11px] disabled:opacity-50"
        aria-label="Ubah role"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {msg && <span className="text-[10px] text-text-muted">{msg}</span>}
    </span>
  );
}
