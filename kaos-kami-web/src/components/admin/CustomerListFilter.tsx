"use client";

import React, { useEffect, useState } from "react";

/**
 * Filter client-side di atas data existing admin/customers (UI-only).
 * Tidak mengubah query DB/API — hanya menyembunyikan baris yang sudah
 * dirender via atribut data-customer-row / data-is-e2e / data-role.
 */
export function CustomerListFilter() {
  const [hideE2E, setHideE2E] = useState(false);
  const [role, setRole] = useState("ALL");

  useEffect(() => {
    const rows = document.querySelectorAll<HTMLElement>("[data-customer-row]");
    rows.forEach((row) => {
      const isE2E = row.dataset.isE2e === "true";
      const rowRole = (row.dataset.role || "").toUpperCase();
      const hideByBot = hideE2E && isE2E;
      const hideByRole = role !== "ALL" && rowRole !== role;
      row.style.display = hideByBot || hideByRole ? "none" : "";
    });
  }, [hideE2E, role]);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filter daftar customer">
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold cursor-pointer">
        <input
          type="checkbox"
          checked={hideE2E}
          onChange={(e) => setHideE2E(e.target.checked)}
          aria-label="Sembunyikan bot e2e"
        />
        SEMBUNYIKAN BOT E2E
      </label>
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold">
        ROLE:
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter role"
          className="bg-canvas border border-border-subtle rounded-lg px-2 py-1 text-text-primary text-[11px]"
        >
          <option value="ALL">Semua</option>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="PRODUCTION_STAFF">PRODUCTION_STAFF</option>
          <option value="COURIER">COURIER</option>
        </select>
      </label>
    </div>
  );
}
