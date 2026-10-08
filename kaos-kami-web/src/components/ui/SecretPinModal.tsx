"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Lock, X, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export function SecretPinModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setPin("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    window.addEventListener("open-secret-pin-modal", handleOpen);
    return () => window.removeEventListener("open-secret-pin-modal", handleOpen);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 6 || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/pin-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "PIN Salah! Akses ditolak.");
      }

      setSuccessMsg(data.message || "Akses Berhasil Dibuka!");

      // Simpan session cache ke localStorage agar authClient segera mengenali sesi
      if (data.sessionUser) {
        try {
          const { setCachedSession } = await import("@/lib/auth-client");
          setCachedSession({
            user: data.sessionUser,
            session: { id: "dev-session", userId: data.sessionUser.id },
          });
        } catch {}
      }

      // Redirect otomatis ke target
      setTimeout(() => {
        window.location.href = data.redirectUrl || "/admin";
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "PIN Salah. Coba lagi.");
      setPin("");
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (code: string) => {
    setPin(code);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-surface border border-border-strong shadow-2xl p-6 sm:p-8 space-y-6 text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header Ikon & Judul */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-accent/15 border border-brand-accent/40 flex items-center justify-center text-brand-accent shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight uppercase">
            Akses Otorisasi Rahasia
          </h2>
          <p className="text-xs text-text-muted">
            Klik 5x Terdeteksi. Masukkan PIN untuk membuka portal:
          </p>
        </div>

        {/* Form Input PIN */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPin(val);
                  if (val.length === 6) {
                    setErrorMsg(null);
                  }
                }}
                placeholder="••••••"
                className="w-full text-center text-2xl font-mono tracking-[0.6em] py-3.5 px-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-strong focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all text-text-primary"
                autoComplete="off"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Sparkles size={15} className="shrink-0" />
                <span>{successMsg} Mengarahkan...</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length < 6 || isLoading}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pin.length === 6 && !isLoading
                ? "bg-brand-accent text-canvas shadow-lg hover:opacity-90 active:scale-[0.98]"
                : "bg-black/10 dark:bg-white/10 text-text-muted cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Buka Akses</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Petunjuk PIN Cepat */}
        <div className="pt-4 border-t border-border-subtle space-y-2 text-xs">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            Pilihan Otorisasi:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("164164")}
              className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle hover:border-brand-accent/50 text-left transition-all group"
            >
              <span className="font-bold text-text-primary block text-[11px] group-hover:text-brand-accent">
                Super Admin Utama
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                PIN: <strong className="text-brand-accent">164164</strong>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("461461")}
              className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle hover:border-cyan-500/50 text-left transition-all group"
            >
              <span className="font-bold text-text-primary block text-[11px] group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Akun Pelanggan
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                PIN: <strong className="text-cyan-600 dark:text-cyan-400">461461</strong>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
