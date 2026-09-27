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

interface SizeMatrixItem {
  size: string;
  enabled: boolean;
  priceIdr: number;
  stockQty: number;
}

const DEFAULT_MATRIX: SizeMatrixItem[] = [
  { size: "S", enabled: true, priceIdr: 165000, stockQty: 20 },
  { size: "M", enabled: true, priceIdr: 165000, stockQty: 25 },
  { size: "L", enabled: true, priceIdr: 165000, stockQty: 30 },
  { size: "XL", enabled: true, priceIdr: 175000, stockQty: 20 },
  { size: "XXL", enabled: true, priceIdr: 185000, stockQty: 10 },
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
  const [imageUrl, setImageUrl] = useState("/lookbook/look-01.jpg");
  const [isPreDesigned, setIsPreDesigned] = useState(true);

  // Shopee/Tokopedia Size & Stock Variation Matrix
  const [sizeMatrix, setSizeMatrix] = useState<SizeMatrixItem[]>(DEFAULT_MATRIX);
  const [massPrice, setMassPrice] = useState("165000");
  const [massStock, setMassStock] = useState("20");

  const handleMassApply = () => {
    const p = Number(massPrice) || 165000;
    const s = Number(massStock) || 0;
    setSizeMatrix((prev) =>
      prev.map((item) => {
        const surcharge = item.size === "XL" ? 10000 : item.size === "XXL" ? 20000 : 0;
        return {
          ...item,
          priceIdr: p + surcharge,
          stockQty: s,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama produk wajib diisi");
      return;
    }

    const enabledVariations = sizeMatrix.filter((m) => m.enabled);
    if (enabledVariations.length === 0) {
      setErrorMsg("Pilih minimal 1 ukuran untuk dijual");
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
          colorName: colorName.trim(),
          images: [imageUrl.trim()],
          isPreDesigned,
          variations: enabledVariations.map((v) => ({
            size: v.size,
            priceIdr: Math.max(1000, Math.min(100_000_000, v.priceIdr)),
            stockQty: Math.max(0, Math.min(100000, v.stockQty)),
          })),
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
            className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 font-mono text-xs shadow-2xl space-y-6"
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
                  Pengaturan variasi ukuran, harga dinamis, dan stok terintegrasi database Turso.
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
                <span>✓ Produk dan seluruh variasi ukuran berhasil disimpan ke database!</span>
              </div>
            )}

            {/* Ingestion Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kategori Apparel */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px]">
                  Kategori Pakaian / Model 3D
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent font-bold"
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

              {/* ─── PENGATURAN VARIASI UKURAN & STOK (STANDAR SHOPEE / TOKOPEDIA) ─── */}
              <div className="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <span className="font-bold text-text-primary uppercase text-[11px] block">
                      Matriks Variasi Ukuran (Size & Stock Matrix)
                    </span>
                    <span className="text-[10px] text-text-muted">
                      Atur harga dan stok masing-masing ukuran (S, M, L, XL, XXL) terintegrasi ke database.
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {sizeMatrix.map((sz) => (
                      <button
                        key={sz.size}
                        type="button"
                        onClick={() =>
                          setSizeMatrix((prev) =>
                            prev.map((it) => (it.size === sz.size ? { ...it, enabled: !it.enabled } : it))
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          sz.enabled
                            ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted opacity-60"
                        }`}
                      >
                        {sz.enabled ? `✓ ${sz.size}` : `+ ${sz.size}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mass Apply Bar */}
                <div className="p-2.5 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-center gap-2 text-[11px]">
                  <span className="font-bold text-text-primary text-[10px] shrink-0 uppercase">
                    ⚡ Terapkan Massal:
                  </span>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-text-muted text-[10px]">Harga Rp</span>
                    <input
                      type="number"
                      value={massPrice}
                      onChange={(e) => setMassPrice(e.target.value)}
                      placeholder="165000"
                      className="w-24 p-1.5 rounded-lg bg-canvas border border-border-subtle text-text-primary font-bold text-[11px]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-text-muted text-[10px]">Stok</span>
                    <input
                      type="number"
                      value={massStock}
                      onChange={(e) => setMassStock(e.target.value)}
                      placeholder="20"
                      className="w-20 p-1.5 rounded-lg bg-canvas border border-border-subtle text-text-primary font-bold text-[11px]"
                    />
                    <span className="text-text-muted text-[10px]">pcs</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMassApply}
                    className="w-full sm:w-auto ml-auto px-3 py-1.5 rounded-lg bg-brand-accent text-canvas font-bold text-[10px] uppercase hover:brightness-110 active:scale-95 transition-all shadow-sm"
                  >
                    Terapkan ke Semua Ukuran
                  </button>
                </div>

                {/* Variation Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase">
                        <th className="py-2 px-2">Ukuran</th>
                        <th className="py-2 px-2">Harga Jual (Rp)</th>
                        <th className="py-2 px-2">Stok (Pcs)</th>
                        <th className="py-2 px-2">Keterangan</th>
                        <th className="py-2 px-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {sizeMatrix.map((item) => (
                        <tr key={item.size} className={item.enabled ? "" : "opacity-40"}>
                          <td className="py-2.5 px-2 font-bold text-text-primary flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) =>
                                setSizeMatrix((prev) =>
                                  prev.map((it) => (it.size === item.size ? { ...it, enabled: e.target.checked } : it))
                                )
                              }
                              className="rounded accent-brand-accent"
                            />
                            <span className="text-xs">{item.size}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              disabled={!item.enabled}
                              value={item.priceIdr}
                              onChange={(e) =>
                                setSizeMatrix((prev) =>
                                  prev.map((it) =>
                                    it.size === item.size ? { ...it, priceIdr: Number(e.target.value) || 0 } : it
                                  )
                                )
                              }
                              className="w-28 p-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold focus:border-brand-accent"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              disabled={!item.enabled}
                              value={item.stockQty}
                              onChange={(e) =>
                                setSizeMatrix((prev) =>
                                  prev.map((it) =>
                                    it.size === item.size ? { ...it, stockQty: Number(e.target.value) || 0 } : it
                                  )
                                )
                              }
                              className="w-20 p-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold focus:border-brand-accent"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-[10px] text-text-muted">
                            {item.size === "XL" ? "+10rb (katun extra)" : item.size === "XXL" ? "+20rb (katun extra)" : "Standar distro"}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {item.stockQty <= 0 ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                HABIS (0)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                READY ({item.stockQty})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <span>{busy ? "MENYIMPAN KE DATABASE..." : "TERBITKAN SELURUH VARIASI KE ETALASE"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
