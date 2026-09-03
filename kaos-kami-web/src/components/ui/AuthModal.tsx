"use client";

import React, { useState } from "react";
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";
import { RegisterPhoneSchema, LoginPhoneSchema } from "@/lib/schemas/auth";
import { X, User, Phone, Lock, Mail, ArrowRight, Loader2, CheckCircle2, LogOut, ShieldCheck, Chrome } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "login",
  onSuccess,
}) => {
  const { data: session, isPending: isSessionLoading } = useSession();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const validation = LoginPhoneSchema.safeParse({ phoneNumber, password });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0]?.message ?? "Input tidak valid");
      return;
    }

    try {
      setLoading(true);
      // Better auth email credentials: we map phone to email format if user inputted phone or email
      const identifier = phoneNumber.includes("@")
        ? phoneNumber
        : `${phoneNumber.replace(/[^0-9]/g, "")}@kaoskami.phone`;

      const result = await signIn.email({
        email: identifier,
        password,
      });

      if (result.error) {
        setErrorMessage(result.error.message || "Gagal masuk. Periksa nomor WhatsApp dan password Anda.");
      } else {
        setSuccessMessage("Berhasil masuk!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const validation = RegisterPhoneSchema.safeParse({ name, phoneNumber, email, password });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0]?.message ?? "Input tidak valid");
      return;
    }

    try {
      setLoading(true);
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
      const registeredEmail = email.trim() ? email.trim() : `${cleanPhone}@kaoskami.phone`;

      const result = await signUp.email({
        email: registeredEmail,
        password,
        name,
      });

      if (result.error) {
        setErrorMessage(result.error.message || "Gagal mendaftar. Nomor atau email mungkin sudah digunakan.");
      } else {
        setSuccessMessage("Pendaftaran berhasil! Selamat datang di Kaos Kami.");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat mendaftar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md animate-fadeIn flex min-h-full items-center justify-center p-4 sm:p-6">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#161619] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl text-text-primary my-auto">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:text-white hover:bg-white/5 transition-all z-10"
          aria-label="Tutup modal"
        >
          <X size={18} />
        </button>

        {session?.user ? (
          // Logged-in State Card
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center mx-auto text-brand-accent">
              <User size={30} />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-white">
                Halo, {session.user.name || "Pelanggan Kaos Kami"}
              </h3>
              <p className="font-mono text-xs text-text-muted mt-1">
                {session.user.email}
              </p>
            </div>

            <div className="bg-surface/50 border border-white/5 rounded-xl p-3 text-left space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted">
                <span>Status Akun</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={13} /> Terverifikasi
                </span>
              </div>
              <div className="flex items-center justify-between text-text-muted">
                <span>ID Sesi</span>
                <span className="text-text-primary truncate max-w-[160px]">{session.session.id}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={14} /> KELUAR
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-brand-accent text-canvas hover:brightness-110 transition-all"
              >
                SELESAI
              </button>
            </div>
          </div>
        ) : (
          // Auth Tabs & Form
          <>
            {/* Header & Brand */}
            <div className="mb-4 text-left">
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-mono tracking-wider uppercase mb-1.5">
                <span>Makassar DTF Sablon</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                {mode === "login" ? "Masuk Akun" : "Daftar Akun Baru"}
              </h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                {mode === "login"
                  ? "Akses desain tersimpan dan pantau status antrean produksi sablon Anda."
                  : "Buat akun untuk menyimpan rancangan 3D dan riwayat pemesanan."}
              </p>
            </div>

            {/* Google OAuth — 1-klik, verifikasi via Google (tanpa OTP WA) */}
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  await signIn.social({ provider: "google", callbackURL: "/" });
                } catch (e: any) {
                  setErrorMessage(e?.message || "Google login gagal — cek GOOGLE_CLIENT_ID");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full mb-3 py-2.5 sm:py-3 rounded-xl bg-white text-black font-mono font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-md"
            >
              <Chrome size={16} className="text-[#4285F4]" />
              <span>LANJUT DENGAN GOOGLE</span>
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-mono text-text-muted">ATAU EMAIL / NO. WA</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-surface rounded-xl border border-white/5 mb-4 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  resetForm();
                }}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg font-bold transition-all ${
                  mode === "login"
                    ? "bg-brand-accent text-canvas shadow"
                    : "text-text-muted hover:text-white"
                }`}
              >
                MASUK
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  resetForm();
                }}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg font-bold transition-all ${
                  mode === "register"
                    ? "bg-brand-accent text-canvas shadow"
                    : "text-text-muted hover:text-white"
                }`}
              >
                DAFTAR
              </button>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-sans flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3.5">
              {mode === "register" && (
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Andi Muhammad"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                    Email <span className="text-neutral-600">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>MEMPROSES...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "MASUK SEKARANG" : "BUAT AKUN"}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Guest Checkout Notice */}
            <div className="mt-5 pt-4 border-t border-white/5 text-center">
              <p className="font-mono text-[11px] text-text-muted">
                Pemesanan tanpa akun?{" "}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-brand-accent hover:underline font-bold ml-1"
                >
                  Lanjut sebagai Tamu (Guest)
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
