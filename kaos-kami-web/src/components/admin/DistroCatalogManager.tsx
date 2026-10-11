"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  X,
  UploadCloud,
  Box,
  ExternalLink,
} from "lucide-react";
import { safeJsonArray } from "@/lib/json";

export interface DistroProductItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  apparelSlug: string;
  basePriceIdr: number;
  images: string; // JSON string
  sizes: string; // JSON string
  tags: string | null;
  isFeatured: boolean | number;
  isActive: boolean | number;
  sortOrder: number;
}

interface DistroCatalogManagerProps {
  initialProducts: DistroProductItem[];
}

const APPAREL_CATEGORIES = [
  { slug: "tshirt", label: "Kaos T-Shirt (Boxy Fit)" },
  { slug: "longsleeve", label: "Kaos Lengan Panjang" },
  { slug: "crewneck", label: "Crewneck Sweater" },
  { slug: "hoodie", label: "Hoodie Jumper" },
  { slug: "shirt", label: "Coach Jacket Tactical" },
  { slug: "cap", label: "Topi Snapback" },
  { slug: "pants", label: "Celana Panjang" },
  { slug: "shorts", label: "Celana Pendek" },
];

const AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL"];

export const COLOR_PRESETS = [
  { name: "Hitam Onyx", hex: "#121214" },
  { name: "Putih Ecru", hex: "#EFECE6" },
  { name: "Oranye Makassar", hex: "#E65100" },
  { name: "Hijau Olive", hex: "#3B4435" },
  { name: "Biru Navy", hex: "#1A237E" },
  { name: "Abu Misty", hex: "#B0B3B8" },
  { name: "Charcoal Dark", hex: "#262626" },
  { name: "Coklat Camel", hex: "#8D6E63" },
];

export function DistroCatalogManager({ initialProducts }: DistroCatalogManagerProps) {
  const [products, setProducts] = useState<DistroProductItem[]>(initialProducts);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [editingProduct, setEditingProduct] = useState<DistroProductItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State untuk Tambah / Edit
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    apparelSlug: "tshirt",
    basePriceIdr: 165000,
    imageUrl: "/products/tshirt-orange-makassar.jpg", // Foto 2D Etalase Depan
    mockup3dSnapshotUrl: "/products/tshirt-orange-makassar.jpg", // Snapshot 3D Mockup Independen
    colorHex: "#121214", // Warna dasar kanvas 3D
    frontDecalUrl: "", // Artwork Sablon Depan (PNG transparan)
    backDecalUrl: "", // Artwork Sablon Belakang (PNG transparan)
    printSize: "A4", // A6 | A5 | A4 | A3
    printPosition: "chest_center", // chest_center | chest_left
    selectedSizes: ["S", "M", "L", "XL", "XXL"],
    isActive: true,
    isFeatured: false,
  });

  const showToast = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const openEditModal = (p: DistroProductItem) => {
    const rawImages = (safeJsonArray(p.images) as string[]) || [];
    const rawSizes = (safeJsonArray(p.sizes) as string[]) || ["M", "L"];

    // Deteksi warna default dari slug/nama
    let guessedHex = "#121214";
    if (p.slug.includes("orange") || p.name.includes("Oranye")) guessedHex = "#E65100";
    else if (p.slug.includes("olive") || p.name.includes("Olive")) guessedHex = "#3B4435";
    else if (p.slug.includes("ecru") || p.name.includes("Ecru")) guessedHex = "#EFECE6";
    else if (p.slug.includes("navy") || p.name.includes("Navy")) guessedHex = "#1A237E";
    else if (p.slug.includes("ash") || p.name.includes("Ash")) guessedHex = "#B0B3B8";

    // Ekstrak metadata 3D dari p.tags jika tersimpan
    let parsedTags: any = null;
    try {
      if (p.tags) {
        parsedTags = typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags;
      }
    } catch {}

    const savedColor = parsedTags?.colorHex || guessedHex;
    const frontDecal = parsedTags?.frontDecalUrl || "";
    const backDecal = parsedTags?.backDecalUrl || "";
    const printSize = parsedTags?.printSize || "A4";
    const printPosition = parsedTags?.printPosition || "chest_center";
    const saved3dSnapshot =
      parsedTags?.mockupSnapshotUrl ||
      (rawImages[0]?.includes("masters") ? rawImages[0] : null) ||
      rawImages[0] ||
      "/products/tshirt-orange-makassar.jpg";

    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      tagline: p.tagline || "",
      description: p.description || "",
      apparelSlug: p.apparelSlug,
      basePriceIdr: p.basePriceIdr,
      imageUrl: rawImages[0] || "/products/tshirt-orange-makassar.jpg",
      mockup3dSnapshotUrl: saved3dSnapshot,
      colorHex: savedColor,
      frontDecalUrl: frontDecal,
      backDecalUrl: backDecal,
      printSize,
      printPosition,
      selectedSizes: rawSizes,
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
    });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      slug: "",
      tagline: "",
      description: "",
      apparelSlug: "tshirt",
      basePriceIdr: 175000,
      imageUrl: "/products/tshirt-orange-makassar.jpg",
      mockup3dSnapshotUrl: "/products/tshirt-orange-makassar.jpg",
      colorHex: "#121214",
      frontDecalUrl: "",
      backDecalUrl: "",
      printSize: "A4",
      printPosition: "chest_center",
      selectedSizes: ["S", "M", "L", "XL", "XXL"],
      isActive: true,
      isFeatured: false,
    });
    setIsAddModalOpen(true);
  };

  // Upload File ke R2 Storage
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return showToast("Format file harus PNG, JPG, atau WebP", "error");
    }

    if (file.size > 10 * 1024 * 1024) {
      return showToast("Ukuran foto maksimal 10MB", "error");
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto ke storage");

      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      showToast("Foto berhasil diunggah ke Cloudflare R2!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle Active di Etalase
  const handleToggleActive = async (p: DistroProductItem) => {
    const nextStatus = !p.isActive;
    setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, isActive: nextStatus } : item)));

    try {
      const res = await fetch("/api/admin/distro-catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status");
      showToast(nextStatus ? `"${p.name}" kini aktif di etalase` : `"${p.name}" disembunyikan`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
      setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, isActive: p.isActive } : item)));
    }
  };

  // Submit Save (Create / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Nama produk wajib diisi", "error");
    if (formData.selectedSizes.length === 0) return showToast("Pilih minimal 1 ukuran yang tersedia", "error");

    const tagsPayload = {
      colorHex: formData.colorHex,
      frontDecalUrl: formData.frontDecalUrl || null,
      backDecalUrl: formData.backDecalUrl || null,
      printSize: formData.printSize || "A4",
      printPosition: formData.printPosition || "chest_center",
      mockupSnapshotUrl: formData.mockup3dSnapshotUrl || null,
    };

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // UPDATE
        const res = await fetch("/api/admin/distro-catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProduct.id,
            name: formData.name,
            slug: formData.slug || undefined,
            tagline: formData.tagline || null,
            description: formData.description || null,
            apparelSlug: formData.apparelSlug,
            basePriceIdr: Number(formData.basePriceIdr),
            images: [formData.imageUrl.trim()],
            sizes: formData.selectedSizes,
            tags: tagsPayload,
            isActive: formData.isActive,
            isFeatured: formData.isFeatured,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memperbarui produk");

        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingProduct.id
              ? {
                  ...item,
                  name: formData.name,
                  slug: formData.slug || item.slug,
                  tagline: formData.tagline || null,
                  description: formData.description || null,
                  apparelSlug: formData.apparelSlug,
                  basePriceIdr: Number(formData.basePriceIdr),
                  images: JSON.stringify([formData.imageUrl.trim()]),
                  sizes: JSON.stringify(formData.selectedSizes),
                  tags: JSON.stringify(tagsPayload),
                  isActive: formData.isActive,
                  isFeatured: formData.isFeatured,
                }
              : item
          )
        );
        showToast("Produk distro & aset 3D berhasil diperbarui!", "success");
        setEditingProduct(null);
      } else {
        // CREATE
        const res = await fetch("/api/admin/distro-catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug || undefined,
            tagline: formData.tagline || null,
            description: formData.description || null,
            apparelSlug: formData.apparelSlug,
            basePriceIdr: Number(formData.basePriceIdr),
            images: [formData.imageUrl.trim()],
            sizes: formData.selectedSizes,
            tags: tagsPayload,
            isActive: formData.isActive,
            isFeatured: formData.isFeatured,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat produk");

        setProducts((prev) => [data.product, ...prev]);
        showToast("Produk distro baru & aset 3D berhasil ditambahkan ke etalase!", "success");
        setIsAddModalOpen(false);
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (p: DistroProductItem) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${p.name}" dari etalase?`)) return;

    try {
      const res = await fetch(`/api/admin/distro-catalog?id=${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");

      setProducts((prev) => prev.filter((item) => item.id !== p.id));
      showToast(`Produk "${p.name}" berhasil dihapus`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="bg-surface-elevated/40 border border-border-subtle rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-subtle/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-brand-accent/10 text-brand-accent">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h2 className="font-sans text-xl sm:text-2xl font-bold uppercase text-text-primary tracking-wide">
              KATALOG PRODUK JADI E-COMMERCE (DISTRO KAOS KAMI)
            </h2>
          </div>
          <p className="text-text-muted text-xs">
            Kelola koleksi pakaian siap kirim yang tampil di etalase publik (<strong>/catalog</strong>). Anda bisa mengunggah foto produk langsung ke cloud storage R2 serta mengonfigurasi aset 3D kanvas bawaan studio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toast Notification */}
          {statusMessage && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all animate-fade-in flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400"
              }`}
            >
              {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {statusMessage.text}
            </div>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Jadi</span>
          </button>
        </div>
      </div>

      {/* PRODUCT GRID CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const rawImages = (safeJsonArray(p.images) as string[]) || [];
          const rawSizes = (safeJsonArray(p.sizes) as string[]) || [];
          const mainImage = rawImages[0] || "/products/tshirt-orange-makassar.jpg";
          const catInfo = APPAREL_CATEGORIES.find((c) => c.slug === p.apparelSlug) || { label: p.apparelSlug };

          return (
            <div
              key={p.id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between bg-surface ${
                p.isActive ? "border-border-subtle hover:border-brand-accent/50 shadow-sm" : "border-border-subtle/50 opacity-60"
              }`}
            >
              {/* Image & Badges */}
              <div className="relative aspect-[4/3] bg-surface-elevated overflow-hidden group">
                <Image
                  src={mainImage}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-canvas/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-text-primary border border-border-subtle">
                    {catInfo.label.split("(")[0]}
                  </span>
                  {Boolean(p.isFeatured) && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-canvas text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3 h-3" /> Unggulan
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {(() => {
                    let pTags: any = null;
                    try {
                      if (p.tags) pTags = typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags;
                    } catch {}
                    const studioUrl = `/studio?apparel=${encodeURIComponent(p.apparelSlug)}&color=${encodeURIComponent(pTags?.colorHex || "#121214")}${pTags?.frontDecalUrl ? `&decalFront=${encodeURIComponent(pTags.frontDecalUrl)}` : ""}${pTags?.backDecalUrl ? `&decalBack=${encodeURIComponent(pTags.backDecalUrl)}` : ""}&printSize=${pTags?.printSize || "A4"}&title=${encodeURIComponent(p.name)}`;

                    return (
                      <Link
                        href={studioUrl}
                        target="_blank"
                        className="p-1.5 rounded-xl bg-canvas/80 backdrop-blur-md border border-border-subtle text-text-muted hover:text-brand-accent transition-colors shadow-xs"
                        title="Uji Buka di Studio 3D (Lengkap dengan Sablon Mockup)"
                      >
                        <Box className="w-4 h-4" />
                      </Link>
                    );
                  })()}

                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`p-1.5 rounded-xl backdrop-blur-md transition-all border ${
                      p.isActive
                        ? "bg-emerald-500/80 border-emerald-400 text-white hover:bg-emerald-600"
                        : "bg-surface/80 border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                    title={p.isActive ? "Aktif di Etalase (Klik untuk sembunyikan)" : "Nonaktif (Klik untuk tampilkan)"}
                  >
                    {p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary line-clamp-1">{p.name}</h3>
                  {p.tagline && <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{p.tagline}</p>}
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-border-subtle/50">
                  <span className="text-[10px] text-text-muted font-mono uppercase">Harga Jual</span>
                  <span className="font-mono text-base font-bold text-brand-accent">
                    Rp {Number(p.basePriceIdr).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Available Sizes */}
                <div>
                  <span className="text-[10px] text-text-muted block mb-1">Ukuran Tersedia:</span>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_SIZES.map((sz) => {
                      const hasSize = rawSizes.includes(sz);
                      return (
                        <span
                          key={sz}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            hasSize
                              ? "bg-surface-elevated border border-border-subtle text-text-primary"
                              : "text-text-muted/30 line-through"
                          }`}
                        >
                          {sz}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border-subtle/50">
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border-subtle text-text-primary text-xs font-bold transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-brand-accent" />
                    <span>Edit Produk</span>
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p)}
                    className="p-2 rounded-xl bg-surface-elevated hover:bg-rose-500/15 border border-border-subtle text-text-muted hover:text-rose-400 transition-all"
                    title="Hapus Produk"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FORM (TAMBAH / EDIT PRODUK DENGAN UPLOAD R2 & 3D ASSET CONFIG) */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-accent" />
                <h3 className="font-bold text-base text-text-primary">
                  {editingProduct ? "Edit Produk Distro" : "Tambah Produk Distro Baru"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddModalOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kaos Streetwear Grafis Makassar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Kategori Pakaian *</label>
                  <select
                    value={formData.apparelSlug}
                    onChange={(e) => setFormData({ ...formData, apparelSlug: e.target.value })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                  >
                    {APPAREL_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-primary mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={formData.basePriceIdr}
                    onChange={(e) => setFormData({ ...formData, basePriceIdr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Tagline Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Premium Combed 24s • Sablon DTF High-Density"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* UPLOAD FOTO 2D ETALASE DEPAN */}
              <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary flex items-center gap-1.5 text-xs sm:text-sm">
                    <UploadCloud className="w-4 h-4 text-brand-accent shrink-0" />
                    <span>Foto 2D Etalase Depan (Tampilan Utama Toko) *</span>
                  </span>
                  {isUploading && (
                    <span className="text-[10px] text-brand-accent font-bold animate-pulse">
                      Mengunggah ke R2...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Foto produk 2D yang tampil di etalase beranda dan katalog toko. Mengunggah atau mengganti foto di sini tidak akan mengubah model atau mockup 3D.
                </p>

                <div className="flex items-center gap-3">
                  {/* Thumbnail Preview Foto 2D */}
                  <div className="relative w-16 h-16 rounded-xl border border-border-subtle bg-surface overflow-hidden shrink-0">
                    <Image
                      src={formData.imageUrl || "/products/tshirt-orange-makassar.jpg"}
                      alt="Preview Foto 2D Etalase"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadFile}
                        className="hidden"
                        id="distro-file-upload"
                      />
                      <label
                        htmlFor="distro-file-upload"
                        className="px-3 py-1.5 rounded-xl bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Pilih Foto 2D</span>
                      </label>
                      <span className="text-[10px] text-text-muted">Maks 10MB (PNG / JPG / WebP)</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar 2D..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-1.5 text-text-primary focus:outline-none focus:border-brand-accent font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* INTEGRASI LANGSUNG DENGAN STUDIO 3D */}
              <div className="p-4 rounded-2xl bg-surface-elevated/50 border border-brand-accent/40 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-brand-accent/15 text-brand-accent">
                      <Box className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                        Model & Mockup 3D Interaktif (360°)
                      </h4>
                      <p className="text-[10px] text-text-muted">
                        Aset 3D Three.js terpisah dari foto 2D. Bisa diputar 360°, ditempeli sablon DTF, & diatur di Studio 3D.
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                    3D ENGINE AKTIF
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border-subtle">
                  <div className="relative w-14 h-14 rounded-lg bg-surface-elevated border border-border-subtle overflow-hidden shrink-0">
                    <Image
                      src={formData.mockup3dSnapshotUrl || "/products/tshirt-orange-makassar.jpg"}
                      alt="Snapshot Mockup 3D"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="text-[11px] font-bold text-text-primary flex items-center justify-between">
                      <div>
                        Apparel: <span className="uppercase text-brand-accent">{formData.apparelSlug}</span> • Warna:{" "}
                        <span className="font-mono text-text-muted">{formData.colorHex}</span>
                      </div>
                      {formData.frontDecalUrl ? (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">
                          ✓ Sablon DTF Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-muted">Polos (Tanpa Sablon)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">Ubah Warna Dasar:</span>
                      <input
                        type="color"
                        value={formData.colorHex}
                        onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border border-border-subtle bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={formData.colorHex}
                        onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                        className="w-20 bg-surface-elevated border border-border-subtle rounded-lg px-2 py-0.5 text-text-primary font-mono text-[10px] focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setFormData({ ...formData, colorHex: preset.hex })}
                          className={`w-4 h-4 rounded-full border transition-all ${
                            formData.colorHex.toLowerCase() === preset.hex.toLowerCase()
                              ? "ring-2 ring-brand-accent scale-110 border-canvas"
                              : "border-border-subtle hover:scale-110"
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/studio?editCatalogId=${editingProduct ? editingProduct.id : ""}&apparel=${encodeURIComponent(formData.apparelSlug)}&color=${encodeURIComponent(formData.colorHex)}${formData.frontDecalUrl ? `&decalFront=${encodeURIComponent(formData.frontDecalUrl)}` : ""}${formData.backDecalUrl ? `&decalBack=${encodeURIComponent(formData.backDecalUrl)}` : ""}&title=${encodeURIComponent(formData.name || "Produk Distro")}`}
                  target="_blank"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-canvas font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{editingProduct ? "Buka di Studio 3D & Edit Mockup" : "Rancang Mockup 3D di Studio"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Ukuran Ready di Etalase *</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_SIZES.map((sz) => {
                    const isChecked = formData.selectedSizes.includes(sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => {
                          if (isChecked) {
                            setFormData({
                              ...formData,
                              selectedSizes: formData.selectedSizes.filter((s) => s !== sz),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedSizes: [...formData.selectedSizes, sz],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs border transition-all ${
                          isChecked
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Deskripsi Produk</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi bahan, fitting, dan keunggulan sablon..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl p-3 text-text-primary focus:outline-none focus:border-brand-accent text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-border-subtle text-brand-accent focus:ring-brand-accent w-4 h-4"
                  />
                  <span className="font-semibold text-text-primary">Tampilkan di Etalase</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-border-subtle text-brand-accent focus:ring-brand-accent w-4 h-4"
                  />
                  <span className="font-semibold text-text-primary">Produk Unggulan</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border-subtle text-text-muted hover:text-text-primary font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
