"use client";

import React, { useEffect, useRef, useState } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: any) => void;
  onExpire?: () => void;
  theme?: "dark" | "light" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: any) => void;
          "expired-callback"?: () => void;
          theme?: "dark" | "light" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Callback stabil via ref (audit #67 — deps inline bikin render ulang).
  const cbRef = useRef({ onVerify, onError, onExpire });
  cbRef.current = { onVerify, onError, onExpire };
  const [loadError, setLoadError] = useState(false);
  // P1-3: map studioTheme gallery→light else dark (obsidian/concrete→dark).
  // `theme` eksplisit ("dark"/"light") tetap dihormati; "auto" ikut tema studio.
  const studioTheme = useConfiguratorStore((s) => s.studioTheme);
  const resolvedTheme: "dark" | "light" =
    theme === "auto" ? (studioTheme === "gallery" ? "light" : "dark") : theme;

  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    // Cloudflare Default Always-Pass Testing Site Key (DEV ONLY —
    // server prod menolak token ini karena secret asli, jadi aman).
    "1x00000000000000000000AA";

  useEffect(() => {
    let isMounted = true;
    // Timeout muat script 15 detik (audit #67): gagal = visual error.
    const loadTimer = setTimeout(() => {
      if (isMounted && !window.turnstile) {
        setLoadError(true);
        cbRef.current.onError?.(new Error("Turnstile timeout"));
      }
    }, 15000);

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) cbRef.current.onVerify(token);
          },
          "error-callback": (err: any) => {
            if (isMounted) cbRef.current.onError?.(err);
          },
          "expired-callback": () => {
            if (isMounted) cbRef.current.onExpire?.();
          },
          theme: resolvedTheme,
          size,
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn("[Turnstile] Render error:", err);
      }
    };

    // Load Turnstile Script jika belum ada
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        clearTimeout(loadTimer);
        if (isMounted) renderWidget();
      };
      script.onerror = () => {
        clearTimeout(loadTimer);
        if (isMounted) {
          setLoadError(true);
          cbRef.current.onError?.(new Error("Turnstile gagal dimuat"));
        }
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      clearTimeout(loadTimer);
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          clearTimeout(loadTimer);
          if (isMounted) renderWidget();
        }
      }, 100);
      return () => {
        clearInterval(interval);
        clearTimeout(loadTimer);
      };
    }

    return () => {
      isMounted = false;
      clearTimeout(loadTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup error
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resolvedTheme, size]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[65px] flex items-center justify-center my-2 ${className}`}
    >
      {loadError && (
        <p className="font-mono text-[11px] text-amber-700 dark:text-amber-300">
          Verifikasi anti-bot gagal dimuat. Periksa koneksi lalu muat ulang halaman.
        </p>
      )}
    </div>
  );
};
