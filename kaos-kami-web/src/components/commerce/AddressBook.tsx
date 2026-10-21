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
import { LocationPickerModal, type PickedLocation } from "@/components/maps/LocationPickerModal";

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

/** Ambil pin GPS dari catatan (format: `google.com/maps?q=lat,lng` atau `[GPS:lat,lon]`). */
function extractMapsPin(notes: string): { lat: string; lng: string; url: string } | null {
  const m =
    notes.match(/google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    notes.match(/\[GPS:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/) ||
    notes.match(/(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})/);
  if (!m) return null;
  return { lat: m[1]!, lng: m[2]!, url: `https://www.google.com/maps?q=${m[1]},${m[2]}` };
}

/** Mini map pin visual with real OSM tile and Maps link */
function MiniMapPin({ notes }: { notes: string }) {
  const pin = extractMapsPin(notes);
  if (!pin) return null;

  const lat = parseFloat(pin.lat);
  const lng = parseFloat(pin.lng);
  const zoom = 15;
  const tileUrl =
    !isNaN(lat) && !isNaN(lng)
      ? `https://tile.openstreetmap.org/${zoom}/${Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))}/${Math.floor(
          ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
            Math.pow(2, zoom)
        )}.png`
      : null;

  return (
    <div
      aria-label="Pratinjau pin lokasi"
      className="relative h-28 rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated"
    >
      {tileUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-85 filter contrast-105 brightness-95"
          style={{ backgroundImage: `url(${tileUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
        <span aria-hidden="true" className="text-2xl leading-none drop-shadow-md">📍</span>
        <span className="font-mono text-[10px] text-text-primary bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-border-subtle shadow-xs">
          {pin.lat}, {pin.lng}
        </span>
        <a
          href={pin.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-sans text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-surface/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow-xs"
        >
          <ExternalLink size={10} />
          <span>Buka di Google Maps</span>
        </a>
      </div>
      <span className="absolute top-1.5 left-2 font-mono text-[9px] text-text-primary bg-surface/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-border-subtle z-10 shadow-xs">
        PETA AKTIF
      </span>
    </div>
  );
}

export function AddressBook({
  initial,
  defaultRecipientName = "",
  defaultPhoneNumber = "",
}: AddressBookProps) {  const router = useRouter();
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

  // Map picker modal states
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);

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
    setMapCoords(null);
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

    const pin = extractMapsPin(addr.notes || "");
    if (pin) {
      setMapCoords({ lat: parseFloat(pin.lat), lng: parseFloat(pin.lng) });
    } else {
      setMapCoords(null);
    }
    setIsModalOpen(true);
  };

  /**
   * Callback saat titik dipilih dari modal peta Leaflet OSM
   */
  const handleLocationPicked = (loc: PickedLocation) => {
    setIsMapModalOpen(false);
    setMapCoords({ lat: loc.lat, lng: loc.lng });
    if (loc.displayName) {
      setFullAddress(loc.displayName);
    }
    if (loc.city) {
      setCity(loc.city.replace(/^Kota\s+/i, "").trim());
    }
    if (loc.district) {
      const cleanDist = loc.district.replace(/^Kecamatan\s+/i, "").trim();
      const matched = MAKASSAR_DISTRICTS.find((d) => d.toLowerCase() === cleanDist.toLowerCase());
      setDistrict(matched || cleanDist);
    }
    if (loc.province) {
      setProvince(loc.province);
    }
    const mapsPin = `https://www.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
    const gpsTag = `[GPS:${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}]`;
    setNotes((prev) => {
      const cleanPrev = (prev || "")
        .replace(/📍\s*Pin GPS:.*?(?=\s*\||$)/gi, "")
        .replace(/\[GPS:[^\]]*\]/g, "")
        .replace(/\(📍\s*https:\/\/www\.google\.com\/maps\?q=[^)]+\)/gi, "")
        .trim();
      return cleanPrev ? `${cleanPrev} | 📍 Pin GPS: ${mapsPin} ${gpsTag}` : `📍 Pin GPS: ${mapsPin} ${gpsTag}`;
    });
    setGpsSuccessNotice(`Titik pin point terkunci di peta (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`);
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
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);

          if (!res.ok) throw new Error("Gagal mengambil detail alamat dari satelit");
          const data = await res.json();
          const r = data.result || {};

          const detectedRoad = r.displayName ? r.displayName.split(",").slice(0, 3).join(",").trim() : "";
          const detectedDistrict = r.district || "";
          const detectedCity = r.city || "Makassar";
          const detectedState = r.province || "Sulawesi Selatan";
          const detectedPostcode = r.postcode || "";

          // Isi form dengan data yang didapat
          if (detectedRoad) {
            setFullAddress(detectedRoad);
          } else if (r.displayName) {
            setFullAddress(r.displayName);
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
      // U8: kirim field eksplisit (tanpa spread — tahan bila skema diketatkan).
      const res = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addr.id,
          label: addr.label,
          recipientName: addr.recipientName,
          phoneNumber: addr.phoneNumber,
          province: (addr as any).province,
          city: (addr as any).city,
          district: (addr as any).district,
          postalCode: (addr as any).postalCode,
          fullAddress: addr.fullAddress,
          notes: (addr as any).notes,
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

      const deletedWasDefault = addresses.find((a) => a.id === id)?.isDefault === true;
      setAddresses((prev) => {
        const rest = prev.filter((a) => a.id !== id);
        // U8: cerminkan promosi server (terbaru jadi UTAMA) secara optimistis.
        if (deletedWasDefault && rest.length > 0 && !rest.some((a) => a.isDefault)) {
          const newest = [...rest].sort(
            (a, b) => new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime()
          )[0];
          return rest.map((a) => ({ ...a, isDefault: a.id === newest?.id }));
        }
        return rest;
      });
      setActionMsg({
        text: (data as any)?.promotedId
          ? "Alamat dihapus; alamat terbaru dijadikan UTAMA."
          : "Alamat berhasil dihapus dari buku alamat",
        type: "success",
      });
      setTimeout(() => setActionMsg(null), 3000);
      router.refresh();
    } catch (e: any) {
      setActionMsg({ text: e?.message || "Gagal menghapus alamat", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header & Tombol Tambah */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface/75 dark:bg-black/40 backdrop-blur-2xl border border-border-subtle/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-brand-accent" />
            <h3 className="font-sans font-bold text-sm uppercase tracking-wide text-text-primary">
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
          className="py-2.5 px-5 rounded-full bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>TAMBAH ALAMAT BARU</span>
        </button>
      </div>

      {/* Global Action Toast Notification */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-sans flex items-center justify-between animate-fadeIn ${
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
        <div className="p-8 sm:p-10 rounded-3xl bg-surface/60 dark:bg-black/30 backdrop-blur-xl border border-dashed border-border-subtle/80 dark:border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto text-text-muted">
            <Compass size={24} />
          </div>
          <h4 className="font-sans font-bold text-sm text-text-primary uppercase">
            Belum Ada Alamat Tersimpan
          </h4>
          <p className="text-xs text-text-muted max-w-md mx-auto font-sans leading-relaxed">
            Tambahkan alamat pengiriman pertama Anda menggunakan GPS atau ketik manual untuk kemudahan proses pengiriman sablon DTF.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-2 py-2 px-4 rounded-full bg-surface-elevated hover:bg-brand-accent/20 border border-border-subtle hover:border-brand-accent/40 text-brand-accent text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
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
              className={`p-5 rounded-3xl bg-surface/75 dark:bg-black/40 backdrop-blur-2xl transition-all flex flex-col justify-between border ${
                a.isDefault
                  ? "border-amber-500/50 shadow-[0_8px_30px_rgba(245,158,11,0.12)] bg-gradient-to-b from-amber-500/[0.04] to-transparent"
                  : "border-border-subtle/80 dark:border-white/10 hover:border-brand-accent/40 shadow-sm"
              }`}
            >
              <div className="space-y-2.5">
                {/* Header Card: Label & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-xs uppercase px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary flex items-center gap-1.5">
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
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-sans text-[10px] font-bold flex items-center gap-1">
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
                  <div className="p-2.5 rounded-xl bg-surface-elevated/50 border border-border-subtle/70 text-[11px] text-text-muted font-sans space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Navigation size={13} className="text-brand-accent shrink-0 mt-0.5" />
                      <div className="flex-1 break-words">
                        <span>{a.notes}</span>
                      </div>
                    </div>
                    {(() => {
                      const pin = extractMapsPin(a.notes);
                      if (!pin) return null;
                      return (
                        <div className="pt-1.5 border-t border-border-subtle/40 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-brand-accent flex items-center gap-1 font-semibold">
                            <MapPin size={11} />
                            <span>GPS: {pin.lat}, {pin.lng}</span>
                          </span>
                          <a
                            href={pin.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-sans text-[10px] font-bold text-brand-accent hover:underline flex items-center gap-1 bg-surface-elevated px-2 py-0.5 rounded-md border border-brand-accent/30"
                          >
                            <ExternalLink size={10} />
                            <span>Buka di Google Maps</span>
                          </a>
                        </div>
                      );
                    })()}
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
                    className="text-[11px] font-sans text-brand-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
            className="relative w-full max-w-lg max-h-[min(92dvh,750px)] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-base uppercase tracking-tight text-text-primary flex items-center gap-2">
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
              {/* GPS Geolocation Auto-Detect & Map Pinpoint Buttons */}
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <Navigation size={13} className="text-brand-accent" />
                    <span>Titik Lokasi Pengantaran (Opsional)</span>
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Tandai pin peta atau deteksi GPS untuk memudahkan kurir mengantar pesanan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="py-1.5 px-3 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MapPin size={12} className="text-brand-accent" />
                    <span>Pilih di Peta</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGpsLoading}
                    onClick={handleGpsDetect}
                    className="py-1.5 px-3 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isGpsLoading ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-brand-accent" />
                        <span>Mencari GPS...</span>
                      </>
                    ) : (
                      <>
                        <Compass size={12} className="text-brand-accent" />
                        <span>Deteksi GPS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

                {gpsSuccessNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-sans flex items-start gap-1.5">
                    <Check size={14} className="shrink-0 mt-0.5" />
                    <span>{gpsSuccessNotice}</span>
                  </div>
                )}

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
                {/* Mini static-map pin visual di atas input alamat */}
                <div className="mb-2">
                  <MiniMapPin notes={notes} />
                </div>
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
                  className="py-2.5 px-5 rounded-xl bg-brand-accent text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* Modal Interaktif Pemilihan Titik Lokasi Leaflet OSM */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialCoords={mapCoords}
        onSelectLocation={handleLocationPicked}
        title="Pilih Titik Lokasi Alamat Pengiriman di Peta"
      />
    </div>
  );
}
