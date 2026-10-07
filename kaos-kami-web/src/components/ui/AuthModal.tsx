"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";
import {
  X,
  User,
  Phone,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Chrome,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { shopWaLink } from "@/lib/shop";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Z_CLASS_AUTH } from "@/lib/zIndex";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register" | "forgot-password";
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "login",
  onSuccess,
}) => {
  const { data: session } = useSession();
  const adminViewMode = useConfiguratorStore((s) => s.adminViewMode);
  const setAdminViewMode = useConfiguratorStore((s) => s.setAdminViewMode);
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">(defaultMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1); // 1 = Form Input, 2 = OTP Email
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form States (Multi-Identifier: Email / WA / Username)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTurnstileToken, setLoginTurnstileToken] = useState<string | null>(null);

  // Register Form States (Email-First + OTP)
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerOtpCode, setRegisterOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [registerTurnstileToken, setRegisterTurnstileToken] = useState<string | null>(null);

  // Forgot Password Form States (Email-First + OTP Reset)
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1 = Input Email, 2 = OTP + New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotTurnstileToken, setForgotTurnstileToken] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  const mounted = useRef(true);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    setIsClient(true);
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Cooldown countdown untuk kirim ulang OTP Register
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Cooldown countdown untuk kirim ulang OTP Reset Password
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const prevIsOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sinkron mode tiap dibuka & pulihkan sesi verifikasi OTP jika masih berlaku (<10 menit)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      resetMessages();

      let hasPendingOtp = false;
      if (typeof window !== "undefined") {
        try {
          const raw = sessionStorage.getItem("kaoskami_pending_reg");
          if (raw) {
            const saved = JSON.parse(raw);
            const elapsed = Date.now() - (saved.timestamp || 0);
            // OTP berlaku selama 10 menit
            if (elapsed < 10 * 60 * 1000 && saved.email) {
              setMode("register");
              setRegisterStep(2);
              setRegisterName(saved.name || "");
              setRegisterEmail(saved.email || "");
              setRegisterPhone(saved.phone || "");
              // A6 keamanan: password TIDAK PERNAH disimpan — user ketik ulang.
              setRegisterPassword("");
              setRegisterConfirmPassword("");
              const remainingCooldown = Math.max(0, 60 - Math.floor(elapsed / 1000));
              setOtpCooldown(remainingCooldown);
              setSuccessMessage(`Kode verifikasi telah dikirim ke ${saved.email}. Silakan masukkan OTP Anda.`);
              hasPendingOtp = true;
            } else {
              sessionStorage.removeItem("kaoskami_pending_reg");
            }
          }
        } catch {
          // Abaikan kesalahan pembacaan cache
        }
      }

      if (!hasPendingOtp) {
        setMode(defaultMode);
        setRegisterStep(1);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, defaultMode]);

  // Kunci scroll body & listener ESC (terisolasi dari re-render onClose)
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  if (!isOpen || !isClient || typeof document === "undefined") return null;

  const later = (fn: () => void, ms: number) => {
    setTimeout(() => {
      if (mounted.current) fn();
    }, ms);
  };

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // -------------------------------------------------------------------
  // 1. LOGIN HANDLER (MULTI-IDENTIFIER: EMAIL / WA / USERNAME)
  // -------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const rawId = loginIdentifier.trim();
    if (!rawId) {
      setErrorMessage("Masukkan email, username, atau nomor WhatsApp Anda.");
      return;
    }
    if (loginPassword.length < 6) {
      setErrorMessage("Password minimal 6 karakter.");
      return;
    }

    try {
      setLoading(true);

      // A5: hasil Turnstile WAJIB dicek — gagal/tak-valid = tolak login (anti-bot).
      if (loginTurnstileToken) {
        try {
          const tsRes = await fetch("/api/auth/verify-turnstile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: loginTurnstileToken }),
          });
          const tsData = await tsRes.json().catch(() => null);
          if (!tsRes.ok || (tsData as any)?.success !== true) {
            setErrorMessage("Verifikasi anti-bot gagal. Muat ulang dan coba lagi.");
            try {
              console.warn("[auth] turnstile ditolak", (tsData as any)?.error || tsRes.status);
            } catch {}
            setLoading(false);
            return;
          }
        } catch {
          setErrorMessage("Verifikasi anti-bot gagal. Muat ulang dan coba lagi.");
          setLoading(false);
          return;
        }
      }

      // Resolusi identifier ke canonical email akun
      let targetEmail = rawId;
      try {
        const resolveRes = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: rawId }),
        });
        const resolveData = await resolveRes.json();
        if (resolveData?.email) {
          targetEmail = resolveData.email;
        }
      } catch {
        // Fallback langsung ke input user
      }

      // Masuk via Better Auth Email credentials
      const result = await signIn.email({
        email: targetEmail,
        password: loginPassword,
      });

      if (result.error) {
        setErrorMessage(result.error.message || "Gagal masuk. Periksa kembali identifier dan password Anda.");
      } else {
        setSuccessMessage("Berhasil masuk! Memuat dashboard Anda...");
        later(() => {
          onSuccess?.();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 2. REGISTER STEP 1: KIRIM OTP EMAIL
  // -------------------------------------------------------------------
  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!registerName.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail.trim())) {
      setErrorMessage("Masukkan alamat email yang valid untuk menerima kode verifikasi OTP.");
      return;
    }
    if (!registerPhone.trim()) {
      setErrorMessage("Nomor WhatsApp wajib diisi.");
      return;
    }
    if (registerPassword.length < 6) {
      setErrorMessage("Password minimal 6 karakter.");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok dengan password yang Anda masukkan.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail.trim(),
          name: registerName.trim(),
          turnstileToken: registerTurnstileToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal mengirim kode verifikasi email.");
        return;
      }

      // Lanjut ke Step 2: Masukkan OTP
      setRegisterStep(2);
      setOtpCooldown(60);
      setSuccessMessage(data.message || `Kode OTP telah dikirim ke ${registerEmail.trim()}.`);

      if (typeof window !== "undefined") {
        try {
          // A6: password TIDAK disimpan (hanya di memori sampai verifikasi).
          sessionStorage.setItem(
            "kaoskami_pending_reg",
            JSON.stringify({
              name: registerName.trim(),
              email: registerEmail.trim(),
              phone: registerPhone.trim(),
              timestamp: Date.now(),
            })
          );
        } catch {
          // Abaikan jika storage penuh
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal mengirim kode OTP email.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 3. REGISTER STEP 2: VERIFIKASI OTP EMAIL & BUAT AKUN
  // -------------------------------------------------------------------
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanOtp = registerOtpCode.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Masukkan 6 digit angka kode verifikasi OTP.");
      return;
    }

    try {
      setLoading(true);

      // Verifikasi OTP di server
      const verifyRes = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail.trim(),
          code: cleanOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.error || "Kode verifikasi salah atau sudah kadaluarsa.");
        return;
      }

      // Buat akun via Better Auth
      const cleanEmail = registerEmail.trim().toLowerCase();
      const signUpResult = await signUp.email({
        email: cleanEmail,
        password: registerPassword,
        name: registerName.trim(),
      });

      if (signUpResult.error) {
        setErrorMessage(signUpResult.error.message || "Gagal membuat akun.");
        return;
      }

      // Tautkan nomor WhatsApp (opsional) jika pengguna mengisinya
      if (registerPhone.trim()) {
        await fetch("/api/auth/update-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: registerPhone.trim() }),
        }).catch(() => null);
      }

      setSuccessMessage("Pendaftaran berhasil! Akun Anda telah aktif dan terverifikasi.");
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("kaoskami_pending_reg");
        } catch {}
      }
      later(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 4. FORGOT PASSWORD STEP 1: KIRIM KODE OTP RESET KE EMAIL
  // -------------------------------------------------------------------
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Masukkan alamat email yang valid untuk menerima kode verifikasi.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/reset-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          turnstileToken: forgotTurnstileToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal mengirim kode verifikasi reset password.");
        return;
      }

      setForgotStep(2);
      setForgotCooldown(60);
      setSuccessMessage(data.message || `Kode OTP verifikasi telah dikirim ke ${cleanEmail}.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menghubungi server reset password.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // 5. FORGOT PASSWORD STEP 2: VERIFIKASI OTP & SIMPAN PASSWORD BARU
  // -------------------------------------------------------------------
  const handleConfirmForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanOtp = forgotOtp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Masukkan 6 digit angka kode verifikasi OTP.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setErrorMessage("Password baru minimal 6 karakter.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: cleanOtp,
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal memperbarui password.");
        return;
      }

      setSuccessMessage(data.message || "Password berhasil diubah! Silakan masuk dengan password baru.");
      setLoginIdentifier(forgotEmail.trim().toLowerCase());
      setLoginPassword("");
      setMode("login");
      setForgotStep(1);
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 ${Z_CLASS_AUTH} flex items-center justify-center p-3 sm:p-4 md:p-6 bg-canvas/70 dark:bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Jangan tutup bila sedang mengisi OTP untuk mencegah hilangnya form
          if (registerStep === 2 || (mode === "forgot-password" && forgotStep === 2)) return;
          onClose();
        }
      }}
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Masuk atau daftar akun"
    >
      <div className="min-h-full flex items-center justify-center w-full py-4 text-center">
        {/* Modal Dialog Card */}
        <div
          className="relative w-full max-w-md max-h-[min(85vh,560px)] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden text-left"
          onClick={(e) => e.stopPropagation()}
          data-lenis-prevent="true"
        >
          {/* Garis aksen atas standar */}
          <div className="absolute top-0 left-0 right-0 h-px bg-border-subtle z-20 pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all z-20 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>

          {/* Scrollable Container */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-4 focus:outline-none [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
            data-lenis-prevent="true"
          >
            {session?.user ? (() => {
              const userRole = (session.user as any)?.role || "CUSTOMER";
              const isAdmin =
                ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole) ||
                session.user.email === "hengkishadow@gmail.com" ||
                session.user.email === "admin@kaoskami.biz.id";

              return (
                // -------------------------------------------------------------
                // LOGGED-IN CARD
                // -------------------------------------------------------------
                <div className="text-center py-2 space-y-4">
                  <div className="relative inline-block mx-auto">
                    <div className="w-16 h-16 rounded-full bg-brand-accent/20 border-2 border-brand-accent/40 flex items-center justify-center mx-auto text-brand-accent">
                      <User size={30} />
                    </div>
                    {isAdmin && (
                      <span
                        className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-black shadow-md"
                        title="Hak Akses Administrator"
                      >
                        <ShieldCheck size={14} className="stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-sans text-xl font-bold tracking-tight text-text-primary">
                      Halo, {session.user.name || "Pelanggan Kaos Kami"}
                    </h3>
                    <p className="font-sans text-xs text-text-muted mt-1">
                      {(session.user.email || "").includes("@kaoskami.phone")
                        ? "Akun WhatsApp terverifikasi"
                        : session.user.email}
                    </p>
                  </div>

                  <div className="bg-surface/50 border border-border-subtle rounded-xl p-3 text-left space-y-2 font-sans text-xs">
                    <div className="flex items-center justify-between text-text-muted">
                      <span>Status Akun</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <ShieldCheck size={13} /> Terverifikasi
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-text-muted pt-1.5 border-t border-border-subtle/50">
                      <span>Hak Akses</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isAdmin
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-surface-elevated text-text-primary"
                        }`}
                      >
                        {isAdmin ? userRole.replace(/_/g, " ") : "PELANGGAN"}
                      </span>
                    </div>
                  </div>

                  {/* Mode Tampilan Switcher (Khusus Admin / Staff) */}
                  {isAdmin && (
                    <div className="p-3 rounded-xl bg-surface/80 border border-border-subtle flex items-center justify-between font-sans text-xs text-left">
                      <div>
                        <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wide">
                          Mode Tampilan
                        </span>
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          {adminViewMode === "admin"
                            ? "Mode Admin (Panel & Akses Penuh)"
                            : "Mode Pelanggan (Simulasi Pembeli)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-canvas p-1 rounded-lg border border-border-subtle shrink-0">
                        <button
                          type="button"
                          onClick={() => setAdminViewMode("admin")}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            adminViewMode === "admin"
                              ? "bg-amber-500 text-black shadow-sm"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminViewMode("customer")}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            adminViewMode === "customer"
                              ? "bg-emerald-500 text-black shadow-sm"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          Pelanggan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* NAVIGASI MENU / PORTAL */}
                  <div className="space-y-2.5 pt-1 text-left">
                    {/* TOMBOL UTAMA ADMIN JIKA ROLE ADMIN / STAFF */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={onClose}
                        className="group flex items-center justify-between w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-brand-accent/20 to-amber-500/10 border-2 border-amber-500/60 hover:border-amber-400 text-text-primary transition-all duration-200 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500 text-black flex items-center justify-center shrink-0 font-bold shadow-sm group-hover:scale-105 transition-transform">
                            <LayoutDashboard size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-sans font-bold text-xs uppercase tracking-wide text-amber-400 group-hover:text-amber-300">
                                BUKA PANEL ADMIN
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-sans font-bold">
                                OPS
                              </span>
                            </div>
                            <p className="font-sans text-[11px] text-text-muted mt-0.5">
                              Kanban Produksi, Gang Sheet, Stok & Metrik
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
                      </Link>
                    )}

                    {/* DASHBOARD PESANAN PELANGGAN */}
                    <Link
                      href="/dashboard/orders"
                      onClick={onClose}
                      className="group flex items-center justify-between w-full p-3 rounded-xl bg-surface/70 border border-border-subtle hover:border-brand-accent/50 text-text-primary transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center shrink-0">
                          <ShoppingBag size={17} />
                        </div>
                        <div>
                          <span className="font-sans font-semibold text-xs tracking-tight block">
                            DASHBOARD PESANAN SAYA
                          </span>
                          <p className="font-sans text-[11px] text-text-muted mt-0.5">
                            Status Order, Riwayat Desain & Pengiriman
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={15} className="text-text-muted group-hover:text-brand-accent group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>

                    {/* STUDIO 3D SHORTCUT */}
                    <Link
                      href="/studio"
                      onClick={onClose}
                      className="group flex items-center justify-between w-full p-2.5 rounded-xl bg-surface/40 border border-border-subtle hover:border-border-strong text-text-primary transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-surface-elevated text-text-muted flex items-center justify-center shrink-0">
                          <Sparkles size={14} />
                        </div>
                        <span className="font-sans text-xs font-semibold text-text-secondary">
                          Studio Kustom 3D Mockup
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-text-muted group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await signOut();
                        } finally {
                          if (mounted.current) setLoading(false);
                        }
                        onClose();
                      }}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-sans text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <LogOut size={14} /> KELUAR
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 rounded-xl font-sans text-xs font-bold bg-brand-accent text-canvas hover:brightness-110 transition-all cursor-pointer"
                    >
                      SELESAI
                    </button>
                  </div>
                </div>
              );
            })() : (
              // -------------------------------------------------------------
              // AUTH FORMS: MASUK & DAFTAR
              // -------------------------------------------------------------
              <>
                {/* Header & Brand */}
                <div className="mb-3 text-left">
                  {mode === "forgot-password" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-[10px] font-mono font-bold tracking-wider uppercase mb-1.5">
                      <KeyRound size={11} />
                      <span>PEMULIHAN AKUN</span>
                    </div>
                  )}
                  <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-text-primary uppercase">
                    {mode === "login"
                      ? "Masuk Akun"
                      : mode === "forgot-password"
                      ? forgotStep === 1
                        ? "Lupa Password"
                        : "Atur Password Baru"
                      : registerStep === 2
                      ? "Verifikasi Email"
                      : "Daftar Akun Baru"}
                  </h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">
                    {mode === "login"
                      ? "Masuk dengan Email, Username, atau No. WhatsApp Anda."
                      : mode === "forgot-password"
                      ? forgotStep === 1
                        ? "Masukkan email terdaftar untuk menerima kode verifikasi OTP pemulihan."
                        : `Kode verifikasi 6-digit telah dikirim ke ${forgotEmail}. Silakan buat password baru.`
                      : registerStep === 2
                      ? `Masukkan 6-digit kode verifikasi yang dikirim ke ${registerEmail}.`
                      : "Daftar dengan Email utama Anda untuk verifikasi aman dan cepat."}
                  </p>
                </div>

                {/* Sub Navigation jika Mode Lupa Password */}
                {mode === "forgot-password" ? (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        resetMessages();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-brand-accent transition-colors cursor-pointer py-1 font-medium"
                    >
                      <ArrowLeft size={14} />
                      <span>Kembali ke Halaman Masuk</span>
                    </button>
                  </div>
                ) : registerStep === 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
                          await signIn.social({ provider: "google", callbackURL: currentPath });
                        } catch (e: any) {
                          setErrorMessage(e?.message || "Google login gagal — periksa GOOGLE_CLIENT_ID");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-white text-black font-sans font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-100 active:scale-[0.99] transition-all dark:shadow-md border border-black/10 dark:border-white/25 cursor-pointer"
                    >
                      <Chrome size={16} className="text-[#4285F4]" />
                      <span>LANJUT DENGAN GOOGLE</span>
                    </button>

                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px flex-1 bg-border-subtle" />
                      <span className="text-[10px] font-sans text-text-muted uppercase">
                        ATAU KREDENSIAL AKUN
                      </span>
                      <div className="h-px flex-1 bg-border-subtle" />
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex p-1 bg-surface-elevated/50 rounded-xl border border-border-subtle mb-3 font-sans text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          resetMessages();
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          mode === "login"
                            ? "bg-brand-accent text-canvas shadow"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        MASUK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("register");
                          setRegisterStep(1);
                          resetMessages();
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          mode === "register"
                            ? "bg-brand-accent text-canvas shadow"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        DAFTAR
                      </button>
                    </div>
                  </>
                ) : null}

                {/* Notifications */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans animate-fadeIn">
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-sans flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* ======================================================= */}
                {/* TAB 1: FORM MASUK (LOGIN MULTI-IDENTIFIER)               */}
                {/* ======================================================= */}
                {mode === "login" && (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Email, Username, atau No. WhatsApp
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          required
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="e.g. nama@email.com / 0812... / username"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Masukkan password Anda"
                          autoComplete="current-password"
                          className="w-full pl-10 pr-11 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          aria-label={showLoginPassword ? "Sembunyikan password" : "Tampilkan password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 font-sans text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setMode("forgot-password");
                            setForgotStep(1);
                            if (loginIdentifier.includes("@")) {
                              setForgotEmail(loginIdentifier.trim());
                            }
                            resetMessages();
                          }}
                          className="text-brand-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound size={12} className="shrink-0" />
                          <span>Lupa password?</span>
                        </button>
                        <span className="text-text-muted text-[10px]">Reset via Email OTP</span>
                      </div>
                    </div>

                    {/* Turnstile Captcha untuk Login */}
                    {turnstileEnabled && (
                      <div className="py-1">
                        <TurnstileWidget
                          onVerify={(t) => setLoginTurnstileToken(t)}
                          onExpire={() => setLoginTurnstileToken(null)}
                          onError={() => setLoginTurnstileToken(null)}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl font-sans text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Memverifikasi...</span>
                        </>
                      ) : (
                        <>
                          <span>MASUK SEKARANG</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ======================================================= */}
                {/* TAB 2: REGISTER STEP 1 (INPUT DATA DENGAN EMAIL UTAMA)   */}
                {/* ======================================================= */}
                {mode === "register" && registerStep === 1 && (
                  <form onSubmit={handleSendRegisterOtp} className="space-y-3">
                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Nama Lengkap <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          placeholder="e.g. Andi Muhammad"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Email Utama <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-accent" />
                        <input
                          type="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Nomor WhatsApp <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="tel"
                          required
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          placeholder="081234567890"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                          Password <span className="text-brand-accent">*</span>
                        </label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type={showRegisterPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            placeholder="Min. 6 char"
                            className="w-full pl-10 pr-10 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                          >
                            {showRegisterPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                          Konfirmasi <span className="text-brand-accent">*</span>
                        </label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type={showRegisterPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={registerConfirmPassword}
                            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                            placeholder="Ulangi password"
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Turnstile Captcha untuk Register */}
                    {turnstileEnabled && (
                      <div className="py-1">
                        <TurnstileWidget
                          onVerify={(t) => setRegisterTurnstileToken(t)}
                          onExpire={() => setRegisterTurnstileToken(null)}
                          onError={() => setRegisterTurnstileToken(null)}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl font-sans text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>MENGIRIM KODE OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>KIRIM KODE VERIFIKASI EMAIL</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ======================================================= */}
                {/* TAB 2: REGISTER STEP 2 (MASUKKAN 6 DIGIT OTP EMAIL)     */}
                {/* ======================================================= */}
                {mode === "register" && registerStep === 2 && (
                  <form onSubmit={handleVerifyRegisterOtp} className="space-y-4 pt-1 animate-fadeIn">
                    <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-border-subtle text-left space-y-2">
                      <div className="flex items-center gap-2 text-brand-accent font-sans text-xs font-bold">
                        <KeyRound size={16} />
                        <span>KODE OTP 6-DIGIT EMAIL</span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Masukkan 6-digit kode OTP yang kami kirim ke email{" "}
                        <strong className="text-text-primary font-sans">{registerEmail}</strong>.
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        autoFocus
                        value={registerOtpCode}
                        onChange={(e) => setRegisterOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[12px] text-2xl font-mono tabular-nums py-3 rounded-xl bg-surface border-2 border-brand-accent/40 focus:border-brand-accent text-brand-accent placeholder:text-neutral-700 focus:outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-sans pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterStep(1);
                          resetMessages();
                          if (typeof window !== "undefined") {
                            try {
                              sessionStorage.removeItem("kaoskami_pending_reg");
                            } catch {}
                          }
                        }}
                        className="text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowLeft size={13} />
                        <span>Ubah Email / Data</span>
                      </button>

                      <button
                        type="button"
                        disabled={loading || otpCooldown > 0}
                        onClick={async () => {
                          if (otpCooldown > 0) return;
                          setLoading(true);
                          resetMessages();
                          try {
                            const res = await fetch("/api/auth/send-email-otp", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: registerEmail.trim(),
                                name: registerName.trim(),
                                turnstileToken: registerTurnstileToken || undefined,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setOtpCooldown(60);
                              setSuccessMessage("Kode OTP baru berhasil dikirim!");
                              if (typeof window !== "undefined") {
                                try {
                                  // A6: tanpa password (ketik ulang bila sesi refresh).
                                  sessionStorage.setItem(
                                    "kaoskami_pending_reg",
                                    JSON.stringify({
                                      name: registerName.trim(),
                                      email: registerEmail.trim(),
                                      phone: registerPhone.trim(),
                                      timestamp: Date.now(),
                                    })
                                  );
                                } catch {}
                              }
                            } else {
                              setErrorMessage(data.error || "Gagal mengirim ulang OTP");
                            }
                          } catch {
                            setErrorMessage("Gagal menghubungi server");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-brand-accent hover:underline disabled:text-text-muted disabled:no-underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        <span>{otpCooldown > 0 ? `Kirim Ulang (${otpCooldown}s)` : "Kirim Ulang"}</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || registerOtpCode.length !== 6}
                      className="w-full mt-2 py-3 px-4 rounded-xl font-sans text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>MEMVERIFIKASI...</span>
                        </>
                      ) : (
                        <>
                          <span>VERIFIKASI & SELESAIKAN PENDAFTARAN</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ======================================================= */}
                {/* TAB 3: FORGOT PASSWORD (STEP 1: INPUT EMAIL)            */}
                {/* ======================================================= */}
                {mode === "forgot-password" && forgotStep === 1 && (
                  <form onSubmit={handleSendForgotOtp} className="space-y-3">
                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Email Terdaftar <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    {turnstileEnabled && (
                      <div className="py-1">
                        <TurnstileWidget
                          onVerify={(t) => setForgotTurnstileToken(t)}
                          onExpire={() => setForgotTurnstileToken(null)}
                          onError={() => setForgotTurnstileToken(null)}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !forgotEmail.trim()}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl font-sans text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>MENGIRIM KODE OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>KIRIM KODE VERIFIKASI</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ======================================================= */}
                {/* TAB 3: FORGOT PASSWORD (STEP 2: OTP + NEW PASSWORD)      */}
                {/* ======================================================= */}
                {mode === "forgot-password" && forgotStep === 2 && (
                  <form onSubmit={handleConfirmForgotOtp} className="space-y-3">
                    {/* Info email sasaran */}
                    <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-border-subtle flex items-center justify-between font-sans text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={14} className="text-brand-accent shrink-0" />
                        <span className="truncate text-text-primary font-medium">{forgotEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          resetMessages();
                        }}
                        className="text-brand-accent hover:underline text-[11px] font-semibold shrink-0 cursor-pointer ml-2"
                      >
                        Ganti Email
                      </button>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        6-Digit Kode OTP Email <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 text-center tracking-[0.4em] font-mono text-base text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex justify-end mt-1 font-sans text-[11px]">
                        <button
                          type="button"
                          disabled={loading || forgotCooldown > 0}
                          onClick={async () => {
                            if (forgotCooldown > 0) return;
                            try {
                              setLoading(true);
                              resetMessages();
                              const res = await fetch("/api/auth/reset-password/send-otp", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  email: forgotEmail.trim().toLowerCase(),
                                  turnstileToken: forgotTurnstileToken || undefined,
                                }),
                              });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                setForgotCooldown(60);
                                setSuccessMessage(data.message || "Kode OTP baru telah dikirim.");
                              } else {
                                setErrorMessage(data.error || "Gagal mengirim ulang OTP");
                              }
                            } catch {
                              setErrorMessage("Gagal menghubungi server");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="text-brand-accent hover:underline disabled:text-text-muted disabled:no-underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                          <span>{forgotCooldown > 0 ? `Kirim Ulang (${forgotCooldown}s)` : "Kirim Ulang Kode OTP"}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Password Baru <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showForgotNewPassword ? "text" : "password"}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-10 pr-11 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword((v) => !v)}
                          aria-label={showForgotNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] uppercase tracking-wider text-text-muted mb-1">
                        Konfirmasi Password Baru <span className="text-brand-accent">*</span>
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showForgotNewPassword ? "text" : "password"}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          className="w-full pl-10 pr-11 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 text-sm text-text-primary placeholder:text-neutral-600 focus:outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || forgotOtp.length !== 6 || forgotNewPassword.length < 6}
                      className="w-full mt-2 py-3 px-4 rounded-xl font-sans text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas dark:shadow-[0_0_20px_rgba(230,81,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>MENYIMPAN PASSWORD...</span>
                        </>
                      ) : (
                        <>
                          <span>SIMPAN PASSWORD BARU</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Security Guarantee */}
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-center gap-1.5 text-center">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-text-muted">Enkripsi 256-bit · Keamanan Data Terjamin</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
