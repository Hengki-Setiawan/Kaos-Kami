"use client";

import React, { useEffect, useState } from "react";
import { Bell, MapPin, CheckCircle2, ExternalLink, X, Shield } from "lucide-react";
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
      }, 3500);

      return () => clearTimeout(timer);
    } catch {
      return;
    }
  }, []);

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

    // 2. Minta Izin Geolocation GPS Real-time.
    // Cek status izin dulu: bila "denied" di level browser, getCurrentPosition
    // langsung gagal tanpa prompt — arahkan user reset via ikon gembok.
    if (navigator.geolocation) {
      try {
        const ps = (navigator as any).permissions;
        if (ps?.query) {
          const st = await ps.query({ name: "geolocation" });
          if (st?.state === "denied") {
            setGpsError(
              "Lokasi diblokir di pengaturan browser situs ini. Klik ikon gembok di address bar → Location → Reset permissions, lalu coba lagi."
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
          setGpsError("Izin lokasi GPS belum diberikan / ditolak.");
          setIsDone(true);
        },
        { timeout: 15000, enableHighAccuracy: true }
      );
    } else {
      setIsDone(true);
    }
  };

  const googleMapsUrl = gpsData
    ? `https://www.google.com/maps?q=${gpsData.lat},${gpsData.lon}`
    : null;

  return (
    <div
      role="dialog"
      aria-label="Izin Notifikasi dan Lokasi Real-time"
      className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] animate-slideUp font-sans"
    >
      <div className="bg-surface/95 backdrop-blur-xl border border-brand-accent/40 rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.8)] space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center shrink-0">
              <Bell size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary leading-tight">
                Aktifkan Notifikasi & Lokasi
              </h4>
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                Kaos Kami Hyperlocal Makassar
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Value Proposition Items */}
        {!isDone ? (
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex items-start gap-2">
              <span className="text-brand-accent font-bold mt-0.5">•</span>
              <p>
                <strong className="text-text-primary">Notifikasi Produksi:</strong> Dapatkan update langsung di layar Anda saat sablon DTF dicetak, dipacking, atau siap diantar.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-brand-accent font-bold mt-0.5">•</span>
              <p>
                <strong className="text-text-primary">GPS & Google Maps:</strong> Pengisian alamat otomatis dan titik kurir akurat tanpa perlu ketik alamat panjang.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-xs bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={16} />
              <span>Pengaturan Berhasil Diterapkan!</span>
            </div>
            {notifGranted && (
              <p className="text-text-muted text-[11px]">
                ✓ Notifikasi browser aktif untuk memantau status pesanan.
              </p>
            )}
            {gpsData && (
              <div className="space-y-1 text-[11px]">
                <p className="text-text-muted">
                  📍 Lokasi GPS terdeteksi: <span className="text-text-primary font-medium">{gpsData.address || `${gpsData.lat}, ${gpsData.lon}`}</span>
                </p>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-accent hover:underline font-mono font-bold"
                  >
                    <span>Buka Titik di Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
            {gpsError && (
              <p className="text-amber-400 text-[11px] font-mono">
                {gpsError}
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!isDone ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleEnablePermissions}
              disabled={gpsLoading}
              className="flex-1 py-2 px-3.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Shield size={13} />
              <span>{gpsLoading ? "MEMBACA GPS..." : "IZINKAN SEKARANG"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary font-mono text-xs transition-colors"
            >
              NANTI
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <button
              onClick={() => setVisible(false)}
              className="w-full py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono font-bold text-xs hover:border-brand-accent transition-colors"
            >
              SELESAI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
