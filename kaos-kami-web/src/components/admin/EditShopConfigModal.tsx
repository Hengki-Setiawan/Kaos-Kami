"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, Save, RefreshCw, CheckCircle2, AlertCircle, MapPin, Phone, Mail, Clock, Database } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShopConfigData {
  shopAddress: string;
  shopWhatsapp: string;
  shopPostalCode: string;
  shopHours: string;
  shopSupportEmail: string;
}

export function EditShopConfigModal({ initialConfig }: { initialConfig?: Partial<ShopConfigData> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState<ShopConfigData>({
    shopAddress: initialConfig?.shopAddress || "Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211",
    shopWhatsapp: initialConfig?.shopWhatsapp || "62882020685076",
    shopPostalCode: initialConfig?.shopPostalCode || "90211",
    shopHours: initialConfig?.shopHours || "Senin – Sabtu: 09:00 – 21:00 WITA",
    shopSupportEmail: initialConfig?.shopSupportEmail || "support@kaoskami.biz.id",
  });

  const loadCurrentConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shop-config");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.config) {
        setForm({
          shopAddress: data.config.shopAddress || "",
          shopWhatsapp: data.config.shopWhatsapp || "",
          shopPostalCode: data.config.shopPostalCode || "",
          shopHours: data.config.shopHours || "",
          shopSupportEmail: data.config.shopSupportEmail || "",
        });
      }
    } catch {
      // Fallback to initial
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadCurrentConfig();
    }
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/shop-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Gagal menyimpan ke database");
      }
      setStatusMsg({ type: "success", text: "✓ Profil toko berhasil disimpan ke database Turso!" });
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Gagal menyimpan profil toko" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
      >
        <Edit3 size={13} />
        <span>Edit di Database</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-surface border border-border-subtle rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-surface-elevated">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-accent/15 text-brand-accent font-bold">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary uppercase tracking-tight">
                    Edit Profil & Alamat Toko di Database
                  </h3>
                  <p className="text-xs text-text-muted">
                    Data disimpan permanen di tabel <code className="text-brand-accent font-mono">ShopConfig</code> Turso DB Edge.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {statusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    statusMsg.type === "success"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-500"
                  }`}
                >
                  {statusMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {loading ? (
                <div className="py-8 text-center text-text-muted flex items-center justify-center gap-2 text-xs">
                  <RefreshCw size={14} className="animate-spin text-brand-accent" />
                  <span>Memuat konfigurasi aktif dari database...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <MapPin size={13} className="text-brand-accent" />
                      <span>Alamat Workshop Fisik (Makassar) *</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={form.shopAddress}
                      onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                      placeholder="Contoh: Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Kec. Tallo, Kota Makassar"
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none font-sans"
                    />
                    <span className="text-[10px] text-text-muted block">
                      Alamat ini dicetak otomatis di invoice, resi pengiriman, dan surat jalan kurir.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Phone size={13} className="text-emerald-500" />
                        <span>Nomor WhatsApp Resmi (62...) *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.shopWhatsapp}
                        onChange={(e) => setForm({ ...form, shopWhatsapp: e.target.value })}
                        placeholder="62882020685076"
                        className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>Kode Pos Makassar *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.shopPostalCode}
                        onChange={(e) => setForm({ ...form, shopPostalCode: e.target.value })}
                        placeholder="90211"
                        className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-500" />
                        <span>Jam Operasional Workshop *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.shopHours}
                        onChange={(e) => setForm({ ...form, shopHours: e.target.value })}
                        placeholder="Senin – Sabtu: 09:00 – 21:00 WITA"
                        className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Mail size={13} className="text-purple-500" />
                        <span>Email Support / CS *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.shopSupportEmail}
                        onChange={(e) => setForm({ ...form, shopSupportEmail: e.target.value })}
                        placeholder="support@kaoskami.biz.id"
                        className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-300">
                    💡 Perubahan yang disimpan akan langsung aktif untuk pembuatan invoice baru, label resi pengiriman kurir internal, serta kontak bantuan pelanggan.
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="px-5 py-2 rounded-xl bg-brand-accent text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{saving ? "Menyimpan ke Turso..." : "Simpan ke Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
