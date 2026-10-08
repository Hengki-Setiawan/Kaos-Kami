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

  const getStatusBadge = (status: ServiceHealth["status"], latencyMs?: number) => {
    switch (status) {
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>TERHUBUNG</span>
            {latencyMs !== undefined && (
              <span className="font-mono opacity-80">({latencyMs}ms)</span>
            )}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
            <AlertTriangle size={11} />
            <span>PERLU PERHATIAN</span>
          </span>
        );
      case "STANDBY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-muted text-[10px] font-bold">
            <span>STANDBY / DEFAULT</span>
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[10px] font-bold">
            <XCircle size={11} />
            <span>GANGGUAN</span>
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/50 pb-3">
        <div>
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Status Integrasi Layanan (Live Realtime)</span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Pemeriksaan otomatis koneksi database, media cloud, gateway pesan & sistem pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastCheck && (
            <span className="text-[10px] text-text-muted font-mono">
              Dicek: {lastCheck} WITA
            </span>
          )}
          <button
            type="button"
            onClick={() => void checkHealth()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-canvas border border-border-subtle hover:border-brand-accent/50 text-text-primary text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Memeriksa..." : "Uji Ulang"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <XCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {loading && services.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-xs flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin text-brand-accent" />
          <span>Memeriksa status integrasi real-time...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-3.5 rounded-xl bg-canvas border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-border-strong transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3">
                {getCategoryIcon(svc.category)}
                <div>
                  <span className="font-bold text-xs text-text-primary block">
                    {svc.name}
                  </span>
                  <span className="text-[11px] text-text-muted leading-tight">
                    {svc.detail}
                  </span>
                </div>
              </div>
              <div className="self-end sm:self-auto">
                {getStatusBadge(svc.status, svc.latencyMs)}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-text-muted leading-relaxed border-t border-border-subtle/50 pt-2.5">
        Keamanan Server: Kunci rahasia API (secret token) diisolasi di lingkungan server dan tidak pernah diekspos ke antarmuka web.
      </p>
    </div>
  );
}
