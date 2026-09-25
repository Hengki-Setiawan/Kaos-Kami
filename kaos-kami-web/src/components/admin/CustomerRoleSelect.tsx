"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ROLES = ["CUSTOMER", "ADMIN", "PRODUCTION_STAFF", "COURIER", "SUPER_ADMIN"] as const;

/** Ubah role customer (admin only, anti-lockout + anti-eskalasi di server). */
export function CustomerRoleSelect({
  userId,
  role,
  myRole,
}: {
  userId: string;
  role: string;
  myRole: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  // Opsi SUPER_ADMIN hanya terlihat oleh SUPER_ADMIN (audit #28).
  // Server tetap menolak eskalasi lateral — ini cuma UX.
  const visibleRoles = ROLES.filter((r) => r !== "SUPER_ADMIN" || myRole === "SUPER_ADMIN");

  const change = async (next: string) => {
    if (next === role || busy) return;
    setPending(null);
    setBusy(true);
    setMsg(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ userId, role: next }),
      });
      clearTimeout(t);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Gagal");
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
        onChange={(e) => setPending(e.target.value)}
        className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-[11px] disabled:opacity-50"
        aria-label="Ubah role"
      >
        {visibleRoles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {msg && <span className="text-[10px] text-text-muted">{msg}</span>}
      <ConfirmDialog
        open={pending !== null}
        title="Ubah role?"
        message={`Ubah role akun ini menjadi ${pending}? Pastikan kamu tahu dampaknya.`}
        confirmLabel="YA, UBAH"
        busy={busy}
        onConfirm={() => pending && void change(pending)}
        onCancel={() => setPending(null)}
      />
    </span>
  );
}
