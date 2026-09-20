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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg("Nama lengkap minimal 2 karakter.");
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
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789 atau +628123456789"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                />
              </div>
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
