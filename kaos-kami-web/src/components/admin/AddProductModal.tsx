"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Sparkles, Check, AlertCircle } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ColorPreset {
  hex: string;
  name: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { hex: "#121214", name: "Obsidian Black" },
  { hex: "#EFECE6", name: "Chalk Ecru" },
  { hex: "#E65100", name: "Signal Tangerine" },
  { hex: "#3B4435", name: "Military Olive" },
  { hex: "#2E3B55", name: "Deep Navy" },
  { hex: "#8A2BE2", name: "Neon Violet" },
  { hex: "#B22222", name: "Crimson Red" },
];

const LOOKBOOK_PRESETS = [
  { label: "Look 01 (Obsidian Dark)", url: "/lookbook/look-01.jpg" },
  { label: "Look 02 (Chalk Ecru)", url: "/lookbook/look-02.jpg" },
  { label: "Look 03 (Signal Tangerine)", url: "/lookbook/look-03.jpg" },
  { label: "Look 04 (Tactical Olive)", url: "/lookbook/look-04.jpg" },
];

export function AddProductModal({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form Fields
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState("#121214");
  const [colorName, setColorName] = useState("Obsidian Black");
  const [size, setSize] = useState("L");
  const [priceIdr, setPriceIdr] = useState("165000");
  const [stockQty, setStockQty] = useState("25");
  const [imageUrl, setImageUrl] = useState("/lookbook/look-01.jpg");
  const [isPreDesigned, setIsPreDesigned] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama produk wajib diisi");
      return;
    }
    const price = Number(priceIdr);
    const stock = Number(stockQty);
    if (!price || price < 1000) {
      setErrorMsg("Harga produk minimal Rp 1.000");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          name: name.trim(),
          colorHex,
          colorName,
          size,
          priceIdr: price,
          stockQty: stock,
          images: [imageUrl],
          isPreDesigned,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Gagal menyimpan produk baru");
      }

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setIsOpen(false);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
      >
        <Plus size={15} />
        <span>+ TAMBAH PRODUK BARU</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !busy && setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 font-mono text-xs shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-border-subtle pb-4">
              <div>
                <span className="text-[10px] text-brand-accent tracking-widest uppercase font-bold block mb-1">
                  ADMIN E-COMMERCE CATALOG
                </span>
                <h2 className="font-display font-black text-xl uppercase text-text-primary">
                  INPUT PRODUK ETALASE BARU
                </h2>
                <p className="text-text-muted mt-1 text-[11px]">
                  Produk yang Anda buat akan langsung tampil di Beranda & Katalog Publik Kaos Kami.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={busy}
                className="p-1.5 rounded-full hover:bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <Check size={15} className="shrink-0" />
                <span>✓ Produk berhasil ditambahkan ke katalog & etalase toko!</span>
              </div>
            )}

            {/* Ingestion Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kategori Apparel */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px]">
                  Kategori Pakaian
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Produk */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px]">
                  Nama Produk / Mockup
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kaos Polos Combed 24s - Hitam atau Kaos Sablon Edisi Losari"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent text-xs"
                  required
                />
              </div>

              {/* Grid: Harga & Stok */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-primary uppercase text-[11px]">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    value={priceIdr}
                    onChange={(e) => setPriceIdr(e.target.value)}
                    className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-text-primary uppercase text-[11px]">
                    Jumlah Stok (Pcs)
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent font-bold"
                    required
                  />
                </div>
              </div>

              {/* Pilihan Warna Kain */}
              <div className="space-y-2">
                <label className="font-bold text-text-primary uppercase text-[11px] flex justify-between">
                  <span>Warna Kain</span>
                  <span className="text-brand-accent">{colorName} ({colorHex})</span>
                </label>
                <div className="flex gap-2 flex-wrap items-center">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => {
                        setColorHex(p.hex);
                        setColorName(p.name);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        colorHex === p.hex ? "border-brand-accent scale-110" : "border-border-subtle hover:scale-105"
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                  <input
                    type="text"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="Nama Warna"
                    className="flex-1 p-2 rounded-xl bg-canvas border border-border-subtle text-text-primary text-[11px]"
                  />
                </div>
              </div>

              {/* Pilihan Ukuran Default */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px]">
                  Ukuran Tersedia
                </label>
                <div className="flex gap-2">
                  {["S", "M", "L", "XL", "XXL"].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSize(sz)}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        size === sz
                          ? "bg-brand-accent text-canvas border-brand-accent"
                          : "bg-canvas border-border-subtle text-text-primary hover:border-brand-accent/50"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Gambar Mockup */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px] flex justify-between">
                  <span>Gambar / Mockup Etalase</span>
                  <span className="text-text-muted">{imageUrl}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LOOKBOOK_PRESETS.map((lp) => (
                    <button
                      key={lp.url}
                      type="button"
                      onClick={() => setImageUrl(lp.url)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        imageUrl === lp.url
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold"
                          : "bg-canvas border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <span className="truncate text-[10px]">{lp.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Atau masukkan URL R2 gambar kustom (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary text-[11px] mt-2"
                />
              </div>

              {/* Switch Edisi Grafis vs Polos */}
              <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
                <span className="font-bold text-text-primary text-[11px]">
                  Tipe Produk
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreDesigned(!isPreDesigned)}
                  className={`px-3 py-1.5 rounded-full font-bold text-[10px] border transition-colors ${
                    isPreDesigned
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-surface border-border-subtle text-text-muted"
                  }`}
                >
                  {isPreDesigned ? "★ EDISI GRAFIS MOCKUP" : "KAOS POLOS BASIC"}
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border-subtle">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 px-6 rounded-2xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Sparkles size={15} />
                  <span>{busy ? "MENYIMPAN KE DATABASE..." : "TERBITKAN PRODUK KE ETALASE"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
