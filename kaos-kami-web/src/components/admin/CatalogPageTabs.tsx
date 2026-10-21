"use client";

import React, { useState } from "react";
import {
  Layers,
  ShoppingBag,
  Settings2,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Palette,
  Sparkles,
  Printer,
  Clock,
  EyeOff,
  Check,
} from "lucide-react";
import { MatrixStockGrid, type CategoryItem, type VariantItem } from "./MatrixStockGrid";
import { DistroCatalogManager, type DistroProductItem } from "./DistroCatalogManager";

interface CatalogPageTabsProps {
  categories: CategoryItem[];
  variants: VariantItem[];
  distroProducts?: DistroProductItem[];
  categoriesWithCounts: any[];
  colors: any[];
  materials: any[];
  sablonMethods: any[];
  hideDistroTab?: boolean;
  initialTab?: "matrix" | "distro" | "master";
}

const idr = (v: number | null | undefined) =>
  v == null ? "—" : `Rp ${Number(v).toLocaleString("id-ID")}`;

export function CatalogPageTabs({
  categories,
  variants,
  distroProducts = [],
  categoriesWithCounts,
  colors: initialColors,
  materials: initialMaterials,
  sablonMethods: initialSablonMethods,
  hideDistroTab = false,
  initialTab = "matrix",
}: CatalogPageTabsProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "distro" | "master">(initialTab);

  // Local state untuk Data Master agar interaktif
  const [catList, setCatList] = useState(categoriesWithCounts);
  const [sablonList, setSablonList] = useState(initialSablonMethods);
  const [matList, setMatList] = useState(initialMaterials);
  const [colorList, setColorList] = useState(initialColors);

  // Status Toast
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit Modals State
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingSablon, setEditingSablon] = useState<any | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editingColor, setEditingColor] = useState<any | null>(null);

  // Add Modals State
  const [isAddColorOpen, setIsAddColorOpen] = useState(false);
  const [newColorData, setNewColorData] = useState({ name: "", hex: "#121214", surchargeIdr: 0 });

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [newMaterialData, setNewMaterialData] = useState({ name: "", surchargeIdr: 0 });

  const [isAddSablonOpen, setIsAddSablonOpen] = useState(false);
  const [newSablonData, setNewSablonData] = useState({
    name: "",
    description: "",
    priceA6Idr: 10000,
    priceA5Idr: 15000,
    priceA4Idr: 25000,
    priceA3Idr: 35000,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Submit Edit Kategori Pakaian (termasuk status Coming Soon / Mockup / Nonaktif)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          id: editingCategory.id,
          name: editingCategory.name,
          weightGsm: editingCategory.weightGsm || null,
          basePriceIdr: Number(editingCategory.basePriceIdr),
          statusType: editingCategory.statusType || "ACTIVE",
          isActive: editingCategory.statusType !== "INACTIVE",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kategori");

      let updatedName = editingCategory.name;
      if (editingCategory.statusType === "COMING_SOON" && !updatedName.includes("SEGERA")) {
        updatedName = `${updatedName} (SEGERA Hadir)`;
      } else if (editingCategory.statusType === "MOCKUP_ONLY" && !updatedName.includes("Mockup")) {
        updatedName = `${updatedName} (Mockup Saja)`;
      } else if (editingCategory.statusType === "ACTIVE") {
        updatedName = updatedName.replace(/\s*\((SEGERA Hadir|Mockup Saja)\)/gi, "").trim();
      }

      setCatList((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: updatedName,
                weightGsm: editingCategory.weightGsm,
                basePriceIdr: Number(editingCategory.basePriceIdr),
                isActive: editingCategory.statusType !== "INACTIVE",
              }
            : c
        )
      );
      showToast("Kategori pakaian berhasil diperbarui di database!", "success");
      setEditingCategory(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Edit & Tambah Tarif Sablon
  const handleSaveSablon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSablon) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sablon",
          id: editingSablon.id,
          name: editingSablon.name,
          priceA6Idr: Number(editingSablon.priceA6Idr),
          priceA5Idr: Number(editingSablon.priceA5Idr),
          priceA4Idr: Number(editingSablon.priceA4Idr),
          priceA3Idr: Number(editingSablon.priceA3Idr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan tarif");

      setSablonList((prev) =>
        prev.map((s) =>
          s.id === editingSablon.id
            ? {
                ...s,
                name: editingSablon.name,
                priceA6Idr: Number(editingSablon.priceA6Idr),
                priceA5Idr: Number(editingSablon.priceA5Idr),
                priceA4Idr: Number(editingSablon.priceA4Idr),
                priceA3Idr: Number(editingSablon.priceA3Idr),
              }
            : s
        )
      );
      showToast(`Tarif sablon "${editingSablon.name}" berhasil diperbarui!`, "success");
      setEditingSablon(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSablon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSablonData.name.trim()) return showToast("Nama metode sablon wajib diisi", "error");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sablon",
          name: newSablonData.name,
          description: newSablonData.description || undefined,
          priceA6Idr: Number(newSablonData.priceA6Idr),
          priceA5Idr: Number(newSablonData.priceA5Idr),
          priceA4Idr: Number(newSablonData.priceA4Idr),
          priceA3Idr: Number(newSablonData.priceA3Idr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah metode sablon");

      setSablonList((prev) => [...prev, data.item]);
      showToast(`Metode sablon "${newSablonData.name}" berhasil ditambahkan!`, "success");
      setIsAddSablonOpen(false);
      setNewSablonData({ name: "", description: "", priceA6Idr: 10000, priceA5Idr: 15000, priceA4Idr: 25000, priceA3Idr: 35000 });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Edit & Tambah Material
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "material",
          id: editingMaterial.id,
          name: editingMaterial.name,
          surchargeIdr: Number(editingMaterial.surchargeIdr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan material");

      setMatList((prev) =>
        prev.map((m) =>
          m.id === editingMaterial.id
            ? {
                ...m,
                name: editingMaterial.name,
                surchargeIdr: Number(editingMaterial.surchargeIdr),
              }
            : m
        )
      );
      showToast("Material finishing berhasil diperbarui!", "success");
      setEditingMaterial(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialData.name.trim()) return showToast("Nama material wajib diisi", "error");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "material",
          name: newMaterialData.name,
          surchargeIdr: Number(newMaterialData.surchargeIdr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah material");

      setMatList((prev) => [...prev, data.item]);
      showToast(`Material "${newMaterialData.name}" berhasil ditambahkan!`, "success");
      setIsAddMaterialOpen(false);
      setNewMaterialData({ name: "", surchargeIdr: 0 });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Edit & Tambah Warna
  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColor) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "color",
          id: editingColor.id,
          name: editingColor.name,
          hex: editingColor.hex,
          surchargeIdr: Number(editingColor.surchargeIdr || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan warna");

      setColorList((prev) =>
        prev.map((c) =>
          c.id === editingColor.id
            ? {
                ...c,
                name: editingColor.name,
                hex: editingColor.hex,
                surchargeIdr: Number(editingColor.surchargeIdr || 0),
              }
            : c
        )
      );
      showToast("Warna kain berhasil diperbarui!", "success");
      setEditingColor(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorData.name.trim()) return showToast("Nama warna wajib diisi", "error");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "color",
          name: newColorData.name,
          hex: newColorData.hex,
          surchargeIdr: Number(newColorData.surchargeIdr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah warna");

      setColorList((prev) => [...prev, data.item]);
      showToast(`Warna "${newColorData.name}" berhasil ditambahkan!`, "success");
      setIsAddColorOpen(false);
      setNewColorData({ name: "", hex: "#121214", surchargeIdr: 0 });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Item Handler (Warna, Material, Sablon)
  const handleDeleteMasterItem = async (type: "color" | "material" | "sablon", id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus item "${name}" dari Data Master?`)) return;

    try {
      const res = await fetch(`/api/admin/master-data?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus item");

      if (type === "color") setColorList((prev) => prev.filter((c) => c.id !== id));
      if (type === "material") setMatList((prev) => prev.filter((m) => m.id !== id));
      if (type === "sablon") setSablonList((prev) => prev.filter((s) => s.id !== id));

      showToast(`Item "${name}" berhasil dihapus`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* TAB SELECTOR BUTTONS */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all whitespace-nowrap ${
              activeTab === "matrix"
                ? "bg-brand-accent text-canvas shadow-[0_4px_16px_rgba(37,99,235,0.35)]"
                : "bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kaos Polos Studio 3D (Matrix Grid)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "matrix" ? "bg-canvas/20 text-canvas" : "bg-surface-elevated text-text-muted"
              }`}
            >
              {variants.length} SKU
            </span>
          </button>

          {!hideDistroTab && (
            <button
              onClick={() => setActiveTab("distro")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all whitespace-nowrap ${
                activeTab === "distro"
                  ? "bg-brand-accent text-canvas shadow-[0_4px_16px_rgba(37,99,235,0.35)]"
                  : "bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Produk Distro Jadi (E-Commerce)</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === "distro" ? "bg-canvas/20 text-canvas" : "bg-surface-elevated text-text-muted"
                }`}
              >
                {distroProducts.length} Produk
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("master")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all whitespace-nowrap ${
              activeTab === "master"
                ? "bg-brand-accent text-canvas shadow-[0_4px_16px_rgba(37,99,235,0.35)]"
                : "bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Referensi Workshop & Sablon (Kelola Penuh)</span>
          </button>
        </div>

        {/* Global Toast Indicator */}
        {statusMessage && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all animate-fade-in flex items-center gap-2 shrink-0 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
            }`}
          >
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* TAB 1: MATRIX STOCK GRID */}
      {activeTab === "matrix" && (
        <section className="space-y-4 animate-fade-in">
          <MatrixStockGrid categories={categories} initialVariants={variants} />
        </section>
      )}

      {/* TAB 2: DISTRO CATALOG PRODUCTS */}
      {!hideDistroTab && activeTab === "distro" && (
        <section className="space-y-4 animate-fade-in">
          <DistroCatalogManager initialProducts={distroProducts} />
        </section>
      )}

      {/* TAB 3: DATA MASTER WORKSHOP (REFERENSI STUDIO 3D - EDITABLE & EXTENDABLE) */}
      {activeTab === "master" && (
        <section className="bg-surface-elevated/40 border border-border-subtle rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl animate-fade-in">
          <div className="border-b border-border-subtle/80 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-brand-accent/10 text-brand-accent">
                <Settings2 className="w-5 h-5" />
              </span>
              <h2 className="font-sans text-xl sm:text-2xl font-bold uppercase text-text-primary tracking-wide">
                DATA MASTER APPAREL & KALKULASI SABLON
              </h2>
            </div>
            <p className="text-text-muted text-xs">
              Basis data referensi yang dibaca oleh <strong>Studio 3D Mockup</strong> dan <strong>Kalkulator Sablon Satuan</strong>. Anda dapat menambah, menghapus, mengubah status (Aktif, Segera Hadir, Mockup Saja, Nonaktif), serta mengatur harga dasar dan tarif cetak sablon.
            </p>
          </div>

          {/* 1. Kategori Pakaian Dasar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-text-primary">
                Kategori Pakaian Dasar ({catList.length})
              </h3>
              <span className="text-[11px] text-text-muted">Klik ikon pensil untuk atur status (Aktif / Segera Hadir / Nonaktif) & harga</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {catList.map((c: any) => {
                const isComingSoon = c.name.includes("SEGERA") || c.tagline?.includes("SEGERA");
                const isMockup = c.name.includes("Mockup") || c.tagline?.includes("Mockup");
                const isInactive = !c.isActive;

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between group transition-colors bg-surface ${
                      isInactive
                        ? "border-rose-500/30 opacity-60"
                        : isComingSoon
                        ? "border-amber-500/40"
                        : isMockup
                        ? "border-border-subtle"
                        : "border-border-subtle hover:border-brand-accent/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-text-primary text-xs block">{c.name}</span>
                        <button
                          onClick={() => {
                            let sType = "ACTIVE";
                            if (isInactive) sType = "INACTIVE";
                            else if (isComingSoon) sType = "COMING_SOON";
                            else if (isMockup) sType = "MOCKUP_ONLY";

                            setEditingCategory({
                              ...c,
                              statusType: sType,
                            });
                          }}
                          className="p-1 rounded-lg bg-surface-elevated hover:bg-brand-accent/20 text-text-muted hover:text-brand-accent transition-colors"
                          title="Edit Kategori & Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-text-muted text-[11px] block mt-0.5">
                        {c.weightGsm || "—"} • <strong className="text-text-primary font-mono">{idr(c.basePriceIdr)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle/40">
                      <span className="text-[10px] text-brand-accent font-mono">
                        {c._count?.variants ?? 0} varian
                      </span>

                      {/* Status Badges */}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          isInactive
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : isComingSoon
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : isMockup
                            ? "bg-surface-elevated text-text-muted border border-border-subtle"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isInactive ? "Nonaktif" : isComingSoon ? "Segera Hadir" : isMockup ? "Mockup Saja" : "Siap Produksi"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Colors, Materials & Sablon */}
          <div className="grid md:grid-cols-3 gap-4 pt-2">
            {/* Warna Kain */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
                <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-accent" />
                  Warna Kain ({colorList.length})
                </span>
                <button
                  onClick={() => setIsAddColorOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {colorList.map((c: any) => (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-[11px] group"
                  >
                    <button
                      onClick={() => setEditingColor({ ...c })}
                      className="flex items-center gap-1.5 hover:text-brand-accent transition-colors"
                      title="Klik untuk edit warna"
                    >
                      <span className="w-3 h-3 rounded-full border border-border-strong shadow-xs shrink-0" style={{ background: c.hex }} />
                      <span className="font-medium text-text-primary">{c.name}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMasterItem("color", c.id, c.name)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-text-muted transition-all"
                      title="Hapus Warna"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Material Finishing */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
                <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Material Finishing ({matList.length})
                </span>
                <button
                  onClick={() => setIsAddMaterialOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {matList.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-[11px] py-1 border-b border-border-subtle/40 last:border-0 group"
                  >
                    <span className="text-text-primary">{m.name || "—"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-brand-accent font-mono font-bold">+{(m.surchargeIdr ?? 0).toLocaleString("id-ID")}</span>
                      <button
                        onClick={() => setEditingMaterial({ ...m })}
                        className="p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-brand-accent"
                        title="Edit Material"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteMasterItem("material", m.id, m.name)}
                        className="p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Material"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarif Sablon */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
                <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Tarif Sablon ({sablonList.length})
                </span>
                <button
                  onClick={() => setIsAddSablonOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah</span>
                </button>
              </div>
              <div className="space-y-2.5">
                {sablonList.map((s: any) => (
                  <div key={s.id} className="p-3 rounded-xl bg-surface-elevated text-[11px] border border-border-subtle/60 space-y-2 group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-xs">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingSablon({ ...s })}
                          className="px-2 py-0.5 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas font-bold text-[10px] uppercase transition-all flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMasterItem("sablon", s.id, s.name)}
                          className="p-1 rounded hover:bg-rose-500/15 text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus Metode Sablon"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-text-muted bg-surface/60 p-2 rounded-lg border border-border-subtle/40">
                      <span>A6: <strong className="text-text-primary">Rp {s.priceA6Idr?.toLocaleString("id-ID")}</strong></span>
                      <span>A5: <strong className="text-text-primary">Rp {s.priceA5Idr?.toLocaleString("id-ID")}</strong></span>
                      <span>A4: <strong className="text-text-primary">Rp {s.priceA4Idr?.toLocaleString("id-ID")}</strong></span>
                      <span>A3: <strong className="text-text-primary">Rp {s.priceA3Idr?.toLocaleString("id-ID")}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: EDIT KATEGORI PAKAIAN & STATUS */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Edit Kategori & Status</h3>
              <button onClick={() => setEditingCategory(null)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* Status Selector: Aktif / Coming Soon / Mockup / Nonaktif */}
              <div>
                <label className="block font-bold text-text-primary mb-1">Status Ketersediaan</label>
                <select
                  value={editingCategory.statusType}
                  onChange={(e) => setEditingCategory({ ...editingCategory, statusType: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                >
                  <option value="ACTIVE">🟢 Siap Produksi & Pemesanan (Aktif)</option>
                  <option value="COMING_SOON">🟡 Segera Hadir / Coming Soon</option>
                  <option value="MOCKUP_ONLY">⚪ Mockup Saja (Hanya Tampil 3D)</option>
                  <option value="INACTIVE">🔴 Nonaktif (Sembunyikan Total)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Gramasi Kain (GSM)</label>
                <input
                  type="text"
                  placeholder="Contoh: 240 / 280 GSM"
                  value={editingCategory.weightGsm || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, weightGsm: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Harga Dasar Polos (Rp)</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={editingCategory.basePriceIdr}
                  onChange={(e) => setEditingCategory({ ...editingCategory, basePriceIdr: Number(e.target.value) })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TARIF SABLON */}
      {editingSablon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Edit Tarif: {editingSablon.name}</h3>
              <button onClick={() => setEditingSablon(null)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSablon} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A6 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingSablon.priceA6Idr || 0}
                    onChange={(e) => setEditingSablon({ ...editingSablon, priceA6Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A5 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingSablon.priceA5Idr || 0}
                    onChange={(e) => setEditingSablon({ ...editingSablon, priceA5Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A4 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingSablon.priceA4Idr || 0}
                    onChange={(e) => setEditingSablon({ ...editingSablon, priceA4Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A3 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingSablon.priceA3Idr || 0}
                    onChange={(e) => setEditingSablon({ ...editingSablon, priceA3Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setEditingSablon(null)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Simpan Tarif"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2B: TAMBAH METODE SABLON BARU */}
      {isAddSablonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Tambah Metode Sablon Baru</h3>
              <button onClick={() => setIsAddSablonOpen(false)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSablon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Metode Sablon *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DTF UV Glow in the Dark"
                  value={newSablonData.name}
                  onChange={(e) => setNewSablonData({ ...newSablonData, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A6 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={newSablonData.priceA6Idr}
                    onChange={(e) => setNewSablonData({ ...newSablonData, priceA6Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A5 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={newSablonData.priceA5Idr}
                    onChange={(e) => setNewSablonData({ ...newSablonData, priceA5Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A4 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={newSablonData.priceA4Idr}
                    onChange={(e) => setNewSablonData({ ...newSablonData, priceA4Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Tarif A3 (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={newSablonData.priceA3Idr}
                    onChange={(e) => setNewSablonData({ ...newSablonData, priceA3Idr: Number(e.target.value) })}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setIsAddSablonOpen(false)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Tambah Metode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT MATERIAL FINISHING */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Edit Material Finishing</h3>
              <button onClick={() => setEditingMaterial(null)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Material</label>
                <input
                  type="text"
                  required
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Biaya Tambahan (+Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={editingMaterial.surchargeIdr || 0}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, surchargeIdr: Number(e.target.value) })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setEditingMaterial(null)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3B: TAMBAH MATERIAL FINISHING BARU */}
      {isAddMaterialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Tambah Material Baru</h3>
              <button onClick={() => setIsAddMaterialOpen(false)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Material *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Heavy French Terry 450 GSM"
                  value={newMaterialData.name}
                  onChange={(e) => setNewMaterialData({ ...newMaterialData, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Biaya Tambahan (+Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={newMaterialData.surchargeIdr}
                  onChange={(e) => setNewMaterialData({ ...newMaterialData, surchargeIdr: Number(e.target.value) })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setIsAddMaterialOpen(false)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Tambah Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT WARNA KAIN */}
      {editingColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Edit Warna Kain</h3>
              <button onClick={() => setEditingColor(null)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveColor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Warna</label>
                <input
                  type="text"
                  required
                  value={editingColor.name}
                  onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Kode Hex Warna</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingColor.hex}
                    onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border-subtle bg-transparent p-0"
                  />
                  <input
                    type="text"
                    required
                    value={editingColor.hex}
                    onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                    className="flex-1 bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Surcharge Pigmen Khusus (+Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editingColor.surchargeIdr || 0}
                  onChange={(e) => setEditingColor({ ...editingColor, surchargeIdr: Number(e.target.value) })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setEditingColor(null)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4B: TAMBAH WARNA KAIN BARU */}
      {isAddColorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-bold text-sm text-text-primary">Tambah Warna Kain Baru</h3>
              <button onClick={() => setIsAddColorOpen(false)} className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateColor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nama Warna *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sage Green"
                  value={newColorData.name}
                  onChange={(e) => setNewColorData({ ...newColorData, name: e.target.value })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Kode Hex Warna *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColorData.hex}
                    onChange={(e) => setNewColorData({ ...newColorData, hex: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border-subtle bg-transparent p-0"
                  />
                  <input
                    type="text"
                    required
                    value={newColorData.hex}
                    onChange={(e) => setNewColorData({ ...newColorData, hex: e.target.value })}
                    className="flex-1 bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-text-primary mb-1">Biaya Tambahan Pigmen (+Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={newColorData.surchargeIdr}
                  onChange={(e) => setNewColorData({ ...newColorData, surchargeIdr: Number(e.target.value) })}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button type="button" onClick={() => setIsAddColorOpen(false)} className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90">
                  {isSubmitting ? "Menyimpan..." : "Tambah Warna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryPageTabs(props: Omit<CatalogPageTabsProps, "distroProducts" | "hideDistroTab">) {
  return <CatalogPageTabs {...props} hideDistroTab={true} initialTab="matrix" />;
}
