"use client";

import { useEffect, useState } from "react";

// URL unduhan APK rilis (SSOT lib/shop.ts — JANGAN hardcode ganda).
import { APK_DOWNLOAD_URL as APK_URL } from "@/lib/shop";
const DISMISS_KEY = "kk-app-banner-dismissed";

/**
 * Banner "Download Aplikasi" pengganti PWA (keputusan Sep 2026):
 * - Android: tawarkan APK (cek HEAD dulu — sembunyi bila file hilang).
 * - iOS: tak ada APK → tawarkan versi web + "Add to Home Screen".
 * - Di dalam aplikasi Capacitor: jangan tampilkan.
 * - Sekali ditutup → ingat selamanya (localStorage).
 */
export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [apkOk, setApkOk] = useState(true);

  useEffect(() => {
    try {
      // Di dalam aplikasi Capacitor: jangan tampilkan.
      const w = window as any;
      if (w.Capacitor?.isNativePlatform?.()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      const ua = navigator.userAgent || "";
      const ios = /iPhone|iPad|iPod/i.test(ua);
      const isAndroid = /Android/i.test(ua);
      if (!isAndroid && !ios) return;
      setIsIOS(ios && !isAndroid);
      const t = setTimeout(() => setVisible(true), 2500);
      // Cek ketersediaan APK (HEAD) agar tombol tak menunjuk file mati.
      if (isAndroid) {
        const ctrl = new AbortController();
        const t2 = setTimeout(() => ctrl.abort(), 8000);
        fetch(APK_URL, { method: "HEAD", signal: ctrl.signal })
          .then((r) => {
            clearTimeout(t2);
            if (!r.ok) setApkOk(false);
          })
          .catch(() => clearTimeout(t2));
      }
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
      <div className="mx-auto max-w-xl rounded-2xl border border-border-subtle bg-surface/95 backdrop-blur p-3.5 flex items-center gap-3 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-white-clean.png"
          alt="Kaos Kami"
          className="h-10 w-10 rounded-xl object-contain bg-surface border border-border-subtle shrink-0 logo-dark-mode"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-black-clean.png"
          alt="Kaos Kami"
          className="h-10 w-10 rounded-xl object-contain bg-surface border border-border-subtle shrink-0 logo-light-mode"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary text-sm leading-tight">
            {isIOS ? "Kaos Kami di iPhone" : "Buka di Aplikasi Kaos Kami"}
          </p>
          <p className="font-mono text-[11px] text-text-muted leading-tight mt-0.5">
            {isIOS
              ? "Aplikasi iOS belum tersedia — pakai versi web + Add to Home Screen."
              : "Lebih cepat, hemat kuota + notifikasi status pesanan."}
          </p>
        </div>
        {!isIOS && apkOk && (
          <a
            href={APK_URL}
            className="shrink-0 px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
          >
            Unduh
          </a>
        )}
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="shrink-0 w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
