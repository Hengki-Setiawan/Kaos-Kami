"use client";

import React, { useState } from "react";
import { User, Phone, Mail, ShieldCheck, Edit3, Check, X, Loader2 } from "lucide-react";

interface UserProfileProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    role?: string;
  } | null;
  onProfileUpdated?: (updatedUser: any) => void;
}

export function UserProfileCard({ user, onProfileUpdated }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/user/profile/export", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal mengunduh data");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kaos-kami-data-saya-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      setErrorMsg(e?.message || "Gagal mengunduh data");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "HAPUS" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal menghapus akun");
      setSuccessMsg("Akun dihapus. Mengalihkan…");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e?.message || "Gagal menghapus akun");
    } finally {
      setDeleting(false);
    }
  };

  const phoneChanged =
    (phone.trim() || "") !== (user?.phoneNumber || "");

  const handleSendOtp = async () => {
    setErrorMsg(null);
    try {
      setSendingOtp(true);
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal kirim OTP");
      if ((data as any)?.alreadyVerified) {
        setSuccessMsg("Nomor ini sudah terverifikasi permanen.");
      } else {
        setOtpSent(true);
        setSuccessMsg("Kode OTP dikirim ke nomor BARU. Isi 6 digit lalu simpan.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Gagal kirim OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg("Nama lengkap minimal 2 karakter.");
      return;
    }
    // Nomor berubah wajib OTP milik nomor baru (server 401 bila tanpa/salah).
    if (phoneChanged && !/^\d{6}$/.test(otpCode.trim())) {
      setErrorMsg("Nomor berubah — klik KIRIM OTP ke nomor baru lalu isi 6 digit.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phone.trim() || null,
          ...(phoneChanged ? { otpCode: otpCode.trim() } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Gagal menyimpan perubahan profil.");
        return;
      }

      setSuccessMsg("Profil berhasil diperbarui!");
      onProfileUpdated?.(data.user);
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-subtle shadow-sm transition-all font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-display font-black text-xl shadow-inner shrink-0">
            {(name || user?.name || "K")[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-black uppercase tracking-tight text-text-primary">
                {name || user?.name || "Pelanggan Kaos Kami"}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                {user?.role || "CUSTOMER"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              Identitas & data akun resmi pelanggan Kaos Kami Makassar
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setName(user?.name || "");
              setPhone(user?.phoneNumber || "");
              setErrorMsg(null);
              setSuccessMsg(null);
              setIsEditing(true);
            }}
            className="self-start sm:self-auto py-2 px-3.5 rounded-xl bg-surface-elevated hover:bg-brand-accent/15 border border-border-subtle hover:border-brand-accent/40 text-text-primary text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Edit3 size={13} className="text-brand-accent" />
            <span>UBAH PROFIL</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="pt-4 space-y-4 animate-fadeIn text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                Nama Lengkap *
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                Nomor WhatsApp Aktif *
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  placeholder="08123456789 atau +628123456789"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                />
              </div>
              {phoneChanged && (
                <div className="mt-2 space-y-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-[10px] text-amber-300">
                    Nomor berubah — verifikasi OTP milik nomor BARU (sekali, gratis seterusnya).
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSendOtp()}
                      disabled={sendingOtp}
                      className="px-3 py-2 rounded-lg bg-surface border border-border-subtle text-[11px] font-bold text-text-primary disabled:opacity-50"
                    >
                      {sendingOtp ? "Mengirim…" : otpSent ? "Kirim Ulang OTP" : "Kirim OTP"}
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      placeholder="6 digit"
                      maxLength={6}
                      aria-label="Kode OTP nomor baru"
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-center tracking-[0.3em] text-xs text-text-primary focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
              Email Utama (Terkunci untuk Autentikasi)
            </label>
            <div className="relative opacity-60 cursor-not-allowed">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                disabled
                value={user?.email || "—"}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-elevated/40 border border-border-subtle text-text-muted text-xs cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Email terdaftar digunakan sebagai kunci login & notifikasi verifikasi.
            </p>
          </div>

          {/* A12: ekspor data + hapus akun (UU PDP). */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleExportData()}
              className="px-3 py-1.5 rounded-lg border border-border-subtle text-[11px] text-text-muted hover:text-text-primary"
            >
              Unduh Data Saya (JSON)
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-[11px] text-rose-400 hover:bg-rose-500/10"
              >
                Hapus Akun…
              </button>
            ) : (
              <span className="flex items-center gap-2 text-[11px]">
                <span className="text-rose-300 font-bold">Yakin? Tindakan permanen.</span>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold disabled:opacity-50"
                >
                  {deleting ? "Menghapus…" : "YA, HAPUS"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-text-muted"
                >
                  Batal
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsEditing(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="py-2 px-4 rounded-xl border border-border-subtle hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X size={13} />
              <span>Batal</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 rounded-xl bg-brand-accent text-canvas hover:brightness-110 active:scale-95 text-xs font-bold transition-all shadow-[0_0_12px_rgba(230,81,0,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border-subtle/70">
            <div className="text-[10px] uppercase text-text-muted flex items-center gap-1.5 mb-1">
              <User size={12} className="text-brand-accent" />
              <span>Nama Profil</span>
            </div>
            <span className="font-bold text-text-primary truncate block">
              {user?.name || "—"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border-subtle/70">
            <div className="text-[10px] uppercase text-text-muted flex items-center gap-1.5 mb-1">
              <Mail size={12} className="text-brand-accent" />
              <span>Email Akun</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary truncate block text-[11px]">
                {user?.email || "—"}
              </span>
              <span title="Terverifikasi" className="inline-flex items-center">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border-subtle/70">
            <div className="text-[10px] uppercase text-text-muted flex items-center gap-1.5 mb-1">
              <Phone size={12} className="text-brand-accent" />
              <span>Nomor WhatsApp</span>
            </div>
            <span className="font-bold text-text-primary block text-[11px]">
              {user?.phoneNumber || "Belum Didaftarkan"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
