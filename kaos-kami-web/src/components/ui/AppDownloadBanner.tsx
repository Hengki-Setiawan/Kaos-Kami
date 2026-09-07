"use client";

import { useEffect, useState } from "react";

// URL unduhan APK rilis (di-host di R2 publik, diunggah tiap rilis via
// `npm run cap:build:apk` + upload ke kaos-kami-assets/aplikasi/).
const APK_URL =
  "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/aplikasi/kaos-kami.apk";
const DISMISS_KEY = "kk-app-banner-dismissed";

/**
 * Banner "Download Aplikasi" pengganti PWA (keputusan Sep 2026):
 * - Hanya tampil di browser Android (bukan di dalam aplikasi Capacitor,
 *   bukan iOS/desktop).
 * - Sekali ditutup → ingat selamanya (localStorage).
 */
export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // Di dalam aplikasi Capacitor: jangan tampilkan.
      const w = window as any;
      if (w.Capacitor?.isNativePlatform?.()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      const ua = navigator.userAgent || "";
      const isAndroid = /Android/i.test(ua);
      if (!isAndroid) return;
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    } catch {
      return;
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Unduh aplikasi Kaos Kami"
      className="fixed bottom-0 left-0 right-0 z-50 px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#141416]/95 backdrop-blur p-3.5 flex items-center gap-3 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-white-clean.png"
          alt="Kaos Kami"
          className="h-10 w-10 rounded-xl object-contain bg-black/40 border border-white/10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">
            Buka di Aplikasi Kaos Kami
          </p>
          <p className="font-mono text-[11px] text-text-muted leading-tight mt-0.5">
            Lebih cepat, hemat kuota + notifikasi status pesanan.
          </p>
        </div>
        <a
          href={APK_URL}
          className="shrink-0 px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
        >
          Unduh
        </a>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="shrink-0 w-8 h-8 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
