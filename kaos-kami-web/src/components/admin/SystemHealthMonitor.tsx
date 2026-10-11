"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Cloud,
  MessageSquare,
  Mail,
  CreditCard,
  Truck,
  ShieldCheck,
} from "lucide-react";
import type { ServiceHealth } from "@/app/api/admin/system/health/route";

export function SystemHealthMonitor() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system/health", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.services)) {
        setServices(data.services);
        setLastCheck(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } else {
        throw new Error(data?.error || "Gagal memverifikasi status layanan");
      }
    } catch (err: any) {
      setError(err?.message || "Koneksi ke endpoint diagnostik gagal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DATABASE":
        return <Database size={16} className="text-brand-accent shrink-0" />;
      case "STORAGE":
        return <Cloud size={16} className="text-blue-500 shrink-0" />;
      case "WHATSAPP":
        return <MessageSquare size={16} className="text-emerald-500 shrink-0" />;
      case "EMAIL":
        return <Mail size={16} className="text-purple-500 shrink-0" />;
      case "PAYMENT":
        return <CreditCard size={16} className="text-emerald-500 shrink-0" />;
      case "SHIPPING":
        return <Truck size={16} className="text-amber-500 shrink-0" />;
      default:
        return <ShieldCheck size={16} className="text-text-muted shrink-0" />;
    }
  };

  const getStatusBadge = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Aktif</span>
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Perhatian</span>
          </span>
        );
      case "STANDBY":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface border border-border-subtle text-text-muted text-[9px] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            <span>Standby</span>
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Gangguan</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
      <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider">
            Status Integrasi Layanan (Live Realtime)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {lastCheck && (
            <span className="text-[10px] text-text-muted font-mono hidden sm:inline">
              {lastCheck} WITA
            </span>
          )}
          <button
            type="button"
            onClick={() => void checkHealth()}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-canvas border border-border-subtle hover:border-brand-accent/50 text-text-primary text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Cek…" : "Uji Ulang"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <XCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {loading && services.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-xs flex items-center justify-center gap-2">
          <RefreshCw size={13} className="animate-spin text-brand-accent" />
          <span>Memeriksa status integrasi…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-2.5 rounded-xl bg-canvas border border-border-subtle/70 flex items-center justify-between gap-2.5 hover:border-border-strong transition-colors min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getCategoryIcon(svc.category)}
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-xs text-text-primary block truncate">
                    {svc.name.replace("libSQL Edge Database", "Turso DB").replace("Object Storage", "R2 Storage").replace("Transaksional", "").replace("Gateway", "WA").replace("Rate API", "API")}
                  </span>
                  <span className="text-[10px] text-text-muted truncate block">
                    {svc.latencyMs !== undefined ? `${svc.latencyMs}ms latency • ` : ""}{svc.detail.replace(/Koneksi libSQL HTTP aktif \(\d+ms latency\)\./, "HTTP Edge aktif")}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {getStatusBadge(svc.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
