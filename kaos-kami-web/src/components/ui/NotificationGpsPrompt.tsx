"use client";

import React, { useEffect, useState } from "react";
import { Bell, MapPin, CheckCircle2, ExternalLink, X, Shield, Loader2 } from "lucide-react";
import { isNotificationSupported, requestNotificationPermission } from "@/lib/browserNotifications";

const STORAGE_KEY = "kk-prompt-permissions-v1";
const COOLDOWN_DAYS = 7;

export function NotificationGpsPrompt() {
  const [visible, setVisible] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lon: number;
    address?: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Jangan munculkan di native Capacitor
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      return;
    }

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const time = parseInt(dismissed, 10);
        if (!isNaN(time) && Date.now() - time < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
          return;
        }
      }

      // Jika notifikasi sudah granted & GPS sudah pernah diizinkan, tak perlu tanya lagi
      if (isNotificationSupported() && Notification.permission === "granted") {
        const cachedGps = localStorage.getItem("kk-last-gps-coords");
        if (cachedGps) return;
      }

      // Delay pemunculan agar tidak mengagetkan user saat pertama buka website
      const timer = setTimeout(() => {
        setVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    } catch {
      return;
    }
  }, []);

  // Auto-tutup bila sudah selesai setelah 4.5 detik
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => setVisible(false), 4500);
      return () => clearTimeout(t);
    }
  }, [isDone]);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
    setVisible(false);
  };

  const handleEnablePermissions = async () => {
    // 1. Minta Izin Notifikasi Web
    if (isNotificationSupported()) {
      const perm = await requestNotificationPermission();
      if (perm === "granted") {
        setNotifGranted(true);
      }
    }

    // 2. Minta Izin Geolocation GPS Real-time
    if (navigator.geolocation) {
      try {
        const ps = (navigator as any).permissions;
        if (ps?.query) {
          const st = await ps.query({ name: "geolocation" });
          if (st?.state === "denied") {
            setGpsError(
              "Izin lokasi diblokir browser. Klik ikon gembok pada address bar untuk mengizinkan."
            );
            setIsDone(true);
            return;
          }
        }
      } catch {}
      setGpsLoading(true);
      setGpsError(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const displayName = data?.result?.displayName || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            setGpsData({ lat, lon, address: displayName });
            localStorage.setItem(
              "kk-last-gps-coords",
              JSON.stringify({ lat, lon, address: displayName, timestamp: Date.now() })
            );
          } catch {
            setGpsData({ lat, lon });
          } finally {
            setGpsLoading(false);
            setIsDone(true);
            try {
              localStorage.setItem(STORAGE_KEY, Date.now().toString());
            } catch {}
          }
        },
        (err) => {
          setGpsLoading(false);
          setGpsError("Izin GPS dilewati / ditolak.");
          setIsDone(true);
        },
        { timeout: 15000, enableHighAccuracy: true }
      );
    } else {
      setIsDone(true);
    }
  };

  return (
    <aside
      role="region"
      aria-label="Izin Notifikasi dan Lokasi Hyperlocal"
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[calc(100%-2rem)] animate-fadeIn font-sans pointer-events-auto"
    >
      {!isDone ? (
        <div className="bg-black/80 dark:bg-black/85 backdrop-blur-2xl border border-white/10 dark:border-white/15 rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2.5 sm:gap-4 transition-all duration-300 hover:border-brand-accent/40">
          {/* Left: Glowing Indicator & Icon */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-ping absolute opacity-75" />
              <span className="w-2 h-2 rounded-full bg-brand-accent" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-brand-accent shrink-0">
              <Bell size={13} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                <span>Update Notifikasi & Lokasi</span>
                <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">· Hyperlocal Makassar</span>
              </p>
              <p className="text-[10px] text-zinc-400 truncate hidden sm:block">
                Pantau antrean sablon DTF & pengisian alamat presisi kurir
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleEnablePermissions}
              disabled={gpsLoading}
              className="py-1.5 px-3.5 sm:px-4 rounded-full bg-brand-accent text-canvas font-bold text-[11px] sm:text-xs tracking-wide hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {gpsLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Membaca...</span>
                </span>
              ) : (
                <>
                  <Shield size={12} />
                  <span>Izinkan</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Tutup"
              className="w-7 h-7 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-black/85 backdrop-blur-2xl border border-emerald-500/30 rounded-full px-4 py-2 shadow-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-medium truncate">
              {gpsData
                ? `Lokasi terkunci: ${gpsData.address || `${gpsData.lat.toFixed(4)}, ${gpsData.lon.toFixed(4)}`}`
                : gpsError
                ? gpsError
                : "Pengaturan Berhasil Diterapkan!"}
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-zinc-400 hover:text-white text-[11px] font-bold px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}
    </aside>
  );
}
