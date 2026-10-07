"use client";

/**
 * AdminHealthPill — pill status live Turso(DB)/R2 via GET /api/health existing.
 * UI-only read-only (cache no-store, poll 60s). TANPA API baru.
 * Fonnte: /api/health existing TAK punya cek Fonnte → dot statis abu 🟡
 * dengan tooltip jujur + link ke /api/health.
 */

import React, { useCallback, useEffect, useState } from "react";

type Dot = "ok" | "down" | "unknown";

function DotSpan({ s, label }: { s: Dot; label: string }) {
  const cls =
    s === "ok"
      ? "bg-emerald-500"
      : s === "down"
        ? "bg-rose-500"
        : "bg-neutral-400";
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls} shrink-0`} />
    </span>
  );
}

export function AdminHealthPill() {
  const [db, setDb] = useState<Dot>("unknown");
  const [ms, setMs] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("/api/health", { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      const j = await res.json().catch(() => null);
      const dbOk = (j as any)?.checks?.db?.ok;
      setDb(dbOk === true ? "ok" : dbOk === false ? "down" : "unknown");
      const lat = (j as any)?.checks?.db?.ms ?? (j as any)?.latencyMs ?? null;
      setMs(typeof lat === "number" ? lat : null);
    } catch {
      setDb("unknown");
    }
  }, []);

  useEffect(() => {
    void load();
    const iv = setInterval(() => void load(), 60000);
    return () => clearInterval(iv);
  }, [load]);

  const dbLabel =
    db === "ok"
      ? `Turso DB OK${ms != null ? ` · ${ms}ms` : ""} (via /api/health)`
      : db === "down"
        ? "Turso DB DOWN (via /api/health)"
        : "Status DB belum termuat (via /api/health)";

  return (
    <a
      href="/api/health"
      target="_blank"
      rel="noopener noreferrer"
      title="Buka /api/health (JSON mentah)"
      className="hidden xl:inline-flex items-center gap-2 px-2 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle font-mono text-[10px] text-text-muted hover:text-text-primary hover:border-brand-accent/50 transition-all"
    >
      <span className="inline-flex items-center gap-1">
        <DotSpan s={db} label={dbLabel} />
        <span>Turso</span>
      </span>
      <span className="opacity-40">·</span>
      <span className="inline-flex items-center gap-1" title="Fonnte tak ada cek di /api/health existing — dot statis (tak buat API baru)">
        <DotSpan s="unknown" label="Fonnte: tak ada cek di /api/health — statis" />
        <span>Fonnte</span>
      </span>
    </a>
  );
}
