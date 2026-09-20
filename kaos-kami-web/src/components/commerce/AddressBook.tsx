"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Navigation,
  Loader2,
  Check,
  X,
  ExternalLink,
  Home,
  Building2,
  Briefcase,
  Store,
  Phone,
  User,
  Compass,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface AddressRow {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  province?: string | null;
  city: string | null;
  district: string | null;
  postalCode?: string | null;
  fullAddress: string;
  notes?: string | null;
  isDefault?: boolean;
}

interface AddressBookProps {
  initial: AddressRow[];
  defaultRecipientName?: string;
  defaultPhoneNumber?: string;
}

const MAKASSAR_DISTRICTS = [
  "Tamalanrea",
  "Biringkanaya",
  "Panakkukang",
  "Rappocini",
  "Ujung Pandang",
  "Manggala",
  "Mamajang",
  "Mariso",
  "Tallo",
  "Bontoala",
  "Wajo",
  "Ujung Tanah",
  "Kepulauan Sangkarrang",
];

export function AddressBook({
  initial,
  defaultRecipientName = "",
  defaultPhoneNumber = "",
}: AddressBookProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<AddressRow[]>(initial);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState<AddressRow | null>(null);

  // Form states
  const [label, setLabel] = useState("Rumah");
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [province, setProvince] = useState("Sulawesi Selatan");
  const [city, setCity] = useState("Makassar");
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Status states
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsSuccessNotice, setGpsSuccessNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const resetForm = () => {
    setEditingAddr(null);
    setLabel("Rumah");
    setRecipientName(defaultRecipientName);
    setPhoneNumber(defaultPhoneNumber);
    setProvince("Sulawesi Selatan");
    setCity("Makassar");
    setDistrict("");
    setPostalCode("");
    setFullAddress("");
    setNotes("");
    setIsDefault(addresses.length === 0);
    setFormError(null);
    setGpsSuccessNotice(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (addr: AddressRow) => {
    setEditingAddr(addr);
    setLabel(addr.label || "Rumah");
    setRecipientName(addr.recipientName || "");
    setPhoneNumber(addr.phoneNumber || "");
    setProvince(addr.province || "Sulawesi Selatan");
    setCity(addr.city || "Makassar");
    setDistrict(addr.district || "");
    setPostalCode(addr.postalCode || "");
    setFullAddress(addr.fullAddress || "");
    setNotes(addr.notes || "");
    setIsDefault(!!addr.isDefault);
    setFormError(null);
    setGpsSuccessNotice(null);
    setIsModalOpen(true);
  };

  /**
   * Deteksi Lokasi Otomatis via Browser GPS + OpenStreetMap Reverse Geocoding
   */
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setFormError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      return;
    }

    setIsGpsLoading(true);
    setFormError(null);
    setGpsSuccessNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "id,en" } }
          );

          if (!res.ok) throw new Error("Gagal mengambil detail alamat dari satelit");
          const data = await res.json();

          const addr = data.address || {};
          const detectedRoad = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || "";
          const detectedDistrict = addr.city_district || addr.subdistrict || addr.district || addr.suburb || "";
          const detectedCity = addr.city || addr.town || addr.county || "Makassar";
          const detectedState = addr.state || "Sulawesi Selatan";
          const detectedPostcode = addr.postcode || "";

          // Isi form dengan data yang didapat
          if (detectedRoad) {
            setFullAddress((prev) => (prev ? `${prev}, ${detectedRoad}` : detectedRoad));
          } else if (data.display_name) {
            setFullAddress(data.display_name.split(",").slice(0, 3).join(",").trim());
          }

          if (detectedCity) {
            // Normalkan nama kota (hapus kata "Kota" jika ada)
            setCity(detectedCity.replace(/^Kota\s+/i, "").trim());
          }

          if (detectedDistrict) {
            // Cocokkan dengan daftar kecamatan Makassar jika ada
            const cleanDist = detectedDistrict.replace(/^Kecamatan\s+/i, "").trim();
            const matched = MAKASSAR_DISTRICTS.find((d) => d.toLowerCase() === cleanDist.toLowerCase());
            setDistrict(matched || cleanDist);
          }

          if (detectedPostcode) setPostalCode(detectedPostcode);
          if (detectedState) setProvince(detectedState);

          const mapsPin = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setNotes((prev) => (prev ? `${prev} (📍 ${mapsPin})` : `📍 Pin GPS: ${mapsPin}`));

          setGpsSuccessNotice(`Koordinat GPS terdeteksi (Akurasi ±${Math.round(accuracy)}m). Silakan lengkapi nomor rumah / patokan.`);
        } catch (err: any) {
          console.warn("[GPS Reverse Geocode] Fallback:", err);
          // Jika reverse geocoding gagal, simpan minimal pin koordinat
          const mapsPin = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setNotes((prev) => (prev ? `${prev} (📍 ${mapsPin})` : `📍 Pin GPS: ${mapsPin}`));
          setGpsSuccessNotice(`Koordinat GPS berhasil diperoleh (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setFormError("Izin akses lokasi ditolak oleh browser. Silakan ketik alamat secara manual atau izinkan lokasi.");
        } else {
          setFormError("Gagal mendeteksi sinyal GPS. Silakan coba lagi atau ketik manual.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  /**
   * Simpan Alamat (Tambah Baru atau Update)
   */
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (fullAddress.trim().length < 5) {
      setFormError("Detail alamat lengkap minimal 5 karakter.");
      return;
    }

    try {
      setIsSaving(true);
      const isEdit = !!editingAddr;
      const url = "/api/addresses";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...(isEdit ? { id: editingAddr.id } : {}),
        label: label.trim() || "Rumah",
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        province: province.trim(),
        city: city.trim(),
        district: district.trim() || null,
        postalCode: postalCode.trim() || null,
        fullAddress: fullAddress.trim(),
        notes: notes.trim() || null,
        isDefault,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Gagal menyimpan alamat.");
        return;
      }

      // Update state lokal
      if (isEdit) {
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === editingAddr.id) return data.address;
            if (isDefault) return { ...a, isDefault: false };
            return a;
          })
        );
      } else {
        setAddresses((prev) => {
          const updated = isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : [...prev];
          return [data.address, ...updated];
        });
      }

      setActionMsg({ text: isEdit ? "Alamat berhasil diperbarui!" : "Alamat baru berhasil ditambahkan!", type: "success" });
      setTimeout(() => setActionMsg(null), 3500);
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan sistem saat menyimpan alamat.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Set As Default Address
   */
  const handleSetDefault = async (addr: AddressRow) => {
    if (addr.isDefault || busyId) return;
    setBusyId(addr.id);
    setActionMsg(null);

    try {
      const res = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addr,
          isDefault: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ text: data.error || "Gagal menyetel alamat utama", type: "error" });
        return;
      }

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addr.id,
        }))
      );
      setActionMsg({ text: `Alamat "${addr.label}" kini menjadi alamat pengiriman utama!`, type: "success" });
      setTimeout(() => setActionMsg(null), 3000);
      router.refresh();
    } catch (e: any) {
      setActionMsg({ text: e?.message || "Gagal menyetel alamat default", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Hapus Alamat
   */
  const handleDelete = async (id: string) => {
    setDeletingId(null);
    setBusyId(id);
    setActionMsg(null);

    try {
      const res = await fetch("/api/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ text: data.error || "Gagal menghapus alamat", type: "error" });
        return;
      }

      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setActionMsg({ text: "Alamat berhasil dihapus dari buku alamat", type: "success" });
      setTimeout(() => setActionMsg(null), 3000);
      router.refresh();
    } catch (e: any) {
      setActionMsg({ text: e?.message || "Gagal menghapus alamat", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header & Tombol Tambah */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-brand-accent" />
            <h3 className="font-display font-black text-sm uppercase tracking-wide text-text-primary">
              Buku Alamat Pengiriman ({addresses.length})
            </h3>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Simpan alamat rumah, kantor, atau tujuan pengiriman untuk checkout instan tanpa mengetik ulang.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(230,81,0,0.25)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>TAMBAH ALAMAT BARU</span>
        </button>
      </div>

      {/* Global Action Toast Notification */}
      {actionMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-mono flex items-center justify-between animate-fadeIn ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="p-1 hover:opacity-75">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Daftar Kartu Alamat */}
      {addresses.length === 0 ? (
        <div className="p-10 rounded-2xl bg-surface/50 border border-dashed border-border-subtle text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto text-text-muted">
            <Compass size={24} />
          </div>
          <h4 className="font-display font-bold text-sm text-text-primary uppercase">
            Belum Ada Alamat Tersimpan
          </h4>
          <p className="text-xs text-text-muted max-w-md mx-auto font-sans leading-relaxed">
            Tambahkan alamat pengiriman pertama Anda menggunakan GPS atau ketik manual untuk kemudahan proses pengiriman sablon DTF.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-2 py-2 px-4 rounded-xl bg-surface-elevated hover:bg-brand-accent/20 border border-border-subtle hover:border-brand-accent/40 text-brand-accent text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={13} />
            <span>Pasang Alamat Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-2xl bg-surface transition-all flex flex-col justify-between border ${
                a.isDefault
                  ? "border-amber-500/50 dark:shadow-[0_0_20px_rgba(245,158,11,0.08)] bg-gradient-to-b from-amber-500/[0.03] to-transparent"
                  : "border-border-subtle hover:border-brand-accent/30"
              }`}
            >
              <div className="space-y-2.5">
                {/* Header Card: Label & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-xs uppercase px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary flex items-center gap-1.5">
                      {a.label.toLowerCase().includes("kantor") ? (
                        <Building2 size={12} className="text-brand-accent" />
                      ) : a.label.toLowerCase().includes("toko") ? (
                        <Store size={12} className="text-brand-accent" />
                      ) : (
                        <Home size={12} className="text-brand-accent" />
                      )}
                      <span>{a.label}</span>
                    </span>

                    {a.isDefault && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span>UTAMA</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(a)}
                      title="Ubah Alamat"
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(a.id)}
                      disabled={busyId === a.id}
                      title="Hapus Alamat"
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Penerima Info */}
                <div className="text-xs">
                  <span className="font-bold text-text-primary block text-sm">
                    {a.recipientName}
                  </span>
                  <span className="text-text-muted font-sans text-xs flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-text-muted" />
                    <span>{a.phoneNumber}</span>
                  </span>
                </div>

                {/* Detail Alamat Lengkap */}
                <div className="text-xs text-text-muted font-sans leading-relaxed pt-1 border-t border-border-subtle/50">
                  <p className="text-text-primary">{a.fullAddress}</p>
                  <p className="text-[11px] text-text-muted mt-1">
                    {[a.district ? `Kec. ${a.district}` : null, a.city, a.province, a.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                {/* Catatan Kurir / Pin GPS */}
                {a.notes && (
                  <div className="p-2.5 rounded-xl bg-surface-elevated/50 border border-border-subtle/70 text-[11px] text-text-muted font-sans flex items-start gap-2">
                    <Navigation size={13} className="text-brand-accent shrink-0 mt-0.5" />
                    <div className="flex-1 break-words">
                      <span>{a.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Set Default Button */}
              {!a.isDefault && (
                <div className="pt-3 mt-3 border-t border-border-subtle/40 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSetDefault(a)}
                    disabled={busyId === a.id}
                    className="text-[11px] font-mono text-brand-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {busyId === a.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Star size={11} />
                    )}
                    <span>Jadikan Alamat Utama</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL FORM: TAMBAH & UBAH ALAMAT (DENGAN GPS)          */}
      {/* ======================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-canvas/75 dark:bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg max-h-[min(92dvh,750px)] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden text-left font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase tracking-tight text-text-primary flex items-center gap-2">
                  <MapPin size={16} className="text-brand-accent" />
                  <span>{editingAddr ? "Ubah Alamat Pengiriman" : "Tambah Alamat Baru"}</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5 font-sans">
                  Gunakan GPS otomatis atau isi rincian alamat secara manual
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* GPS Geolocation Auto-Detect Button */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand-accent/15 via-surface-elevated to-transparent border border-brand-accent/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Navigation size={14} className="text-brand-accent" />
                      <span>Deteksi Lokasi Otomatis (GPS)</span>
                    </span>
                    <p className="text-[11px] text-text-muted font-sans mt-0.5">
                      Mengisi nama jalan, kelurahan, kecamatan, dan kota sesuai titik lokasi Anda saat ini.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isGpsLoading}
                    onClick={handleGpsDetect}
                    className="py-2 px-3.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isGpsLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Mencari Satelit...</span>
                      </>
                    ) : (
                      <>
                        <Compass size={13} />
                        <span>Pasang GPS</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsSuccessNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-sans flex items-start gap-1.5">
                    <Check size={14} className="shrink-0 mt-0.5" />
                    <span>{gpsSuccessNotice}</span>
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Label Alamat (Pilihan Cepat) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5 font-bold">
                  Label Alamat *
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["Rumah", "Kantor", "Kost", "Toko"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLabel(preset)}
                      className={`py-1 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        label.toLowerCase() === preset.toLowerCase()
                          ? "bg-brand-accent text-canvas border-brand-accent"
                          : "bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Misal: Rumah Utama, Kantor Cabang"
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                />
              </div>

              {/* Penerima & Nomor Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                    Nama Penerima *
                  </label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nama orang yang menerima"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                    No. Telepon / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                  Alamat Lengkap (Jalan, No Rumah, RT/RW, Patokan) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Jl. Perintis Kemerdekaan KM 10 No. 45, RT 02 / RW 04, Samping Apotek"
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs font-sans leading-relaxed"
                />
              </div>

              {/* Wilayah: Kota, Kecamatan, Kode Pos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                    Kota / Kabupaten *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Makassar"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    list="makassar-districts-list"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Mis. Tamalanrea"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                  />
                  <datalist id="makassar-districts-list">
                    {MAKASSAR_DISTRICTS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="90245"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs"
                  />
                </div>
              </div>

              {/* Catatan Tambahan untuk Kurir */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1 font-bold">
                  Catatan Pengiriman / Petunjuk untuk Kurir (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Pagar hitam, dekat warung Bu Ani, titip satpam"
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle focus:border-brand-accent text-text-primary focus:outline-none transition-all text-xs font-sans"
                />
              </div>

              {/* Checkbox Alamat Utama */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-border-subtle text-brand-accent focus:ring-brand-accent accent-brand-accent"
                  />
                  <span className="text-xs text-text-primary font-sans font-medium">
                    Jadikan sebagai alamat pengiriman utama
                  </span>
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-border-subtle hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2.5 px-5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(230,81,0,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>{editingAddr ? "Perbarui Alamat" : "Simpan Alamat"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        open={deletingId !== null}
        title="Hapus Alamat Pengiriman?"
        message="Alamat ini akan dihapus dari buku alamat Anda dan tidak akan muncul di daftar pilihan checkout."
        confirmLabel="YA, HAPUS ALAMAT"
        danger
        busy={busyId !== null}
        onConfirm={() => deletingId && void handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
