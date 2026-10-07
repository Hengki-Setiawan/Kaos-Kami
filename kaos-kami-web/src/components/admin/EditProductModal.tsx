"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, X, Sparkles, Check, AlertCircle, Box, Image as ImageIcon } from "lucide-react";

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
  { hex: "#8A2BE2", name: "Ungu Violet" },
  { hex: "#B22222", name: "Crimson Red" },
];

const IMAGE_PRESETS = [
  { label: "Look 01 (Dark)", url: "/lookbook/look-01.jpg" },
  { label: "Look 02 (Chalk)", url: "/lookbook/look-02.jpg" },
  { label: "Look 03 (Tangerine)", url: "/lookbook/look-03.jpg" },
  { label: "Look 04 (Olive)", url: "/lookbook/look-04.jpg" },
  { label: "Coach Jacket Olive", url: "/products/coach-jacket-olive.jpg" },
  { label: "Hoodie Fleece Black", url: "/products/hoodie-black.jpg" },
  { label: "Kaos Streetwear Oranye", url: "/products/tshirt-orange-makassar.jpg" },
  { label: "Kaos Combed Putih", url: "/products/tshirt-white-ecru.jpg" },
  { label: "Crewneck Grey Misty", url: "/products/crewneck-grey.jpg" },
];

export interface EditProductModalProps {
  variant: {
    id: string;
    sku: string;
    name: string;
    categoryId: string;
    colorHex: string;
    colorName: string;
    size: string;
    priceIdr: number;
    stockQty: number;
    images?: string[] | string;
    isActive: boolean;
  };
  categories: CategoryOption[];
}

interface SiblingSizeItem {
  variantId: string;
  size: string;
  priceIdr: number;
  stockQty: number;
  sku: string;
}

export function EditProductModal({ variant, categories }: EditProductModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Parse initial image
  const initialImg = React.useMemo(() => {
    if (Array.isArray(variant.images) && variant.images[0]) return variant.images[0];
    if (typeof variant.images === "string") {
      try {
        const parsed = JSON.parse(variant.images);
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
      } catch {
        if (variant.images.startsWith("/") || variant.images.startsWith("http")) return variant.images;
      }
    }
    return "/lookbook/look-01.jpg";
  }, [variant.images]);

  // Form Fields
  const [name, setName] = useState(variant.name || "");
  const [categoryId, setCategoryId] = useState(variant.categoryId || categories[0]?.id || "");
  const [priceIdr, setPriceIdr] = useState(String(variant.priceIdr || 165000));
  const [stockQty, setStockQty] = useState(String(variant.stockQty || 0));
  const [colorHex, setColorHex] = useState(variant.colorHex || "#121214");
  const [colorName, setColorName] = useState(variant.colorName || "Hitam");
  const [size, setSize] = useState(variant.size || "L");
  const [imageUrl, setImageUrl] = useState(initialImg);
  const [isActive, setIsActive] = useState(!!variant.isActive);

  // Shopee-style sibling variations state
  const [siblingSizes, setSiblingSizes] = useState<SiblingSizeItem[]>([]);
  const [massPrice, setMassPrice] = useState(String(variant.priceIdr || 165000));
  const [massStock, setMassStock] = useState(String(variant.stockQty || 20));

  const handleOpen = async () => {
    setName(variant.name || "");
    setCategoryId(variant.categoryId || categories[0]?.id || "");
    setPriceIdr(String(variant.priceIdr || 165000));
    setStockQty(String(variant.stockQty || 0));
    setColorHex(variant.colorHex || "#121214");
    setColorName(variant.colorName || "Hitam");
    setSize(variant.size || "L");
    setImageUrl(initialImg);
    setIsActive(!!variant.isActive);
    setErrorMsg(null);
    setSuccessMsg(false);
    setIsOpen(true);

    const initialList: SiblingSizeItem[] = [
      {
        variantId: variant.id,
        size: variant.size || "L",
        priceIdr: Number(variant.priceIdr) || 165000,
        stockQty: Number(variant.stockQty) || 0,
        sku: variant.sku || variant.id,
      },
    ];
    setSiblingSizes(initialList);

    // Fetch sibling variations with same product name and color
    try {
      const res = await fetch("/api/catalog/variants");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.variants)) {
        const match = data.variants.find((v: any) => v.id === variant.id);
        if (match && Array.isArray(match.sizes) && match.sizes.length > 0) {
          setSiblingSizes(
            match.sizes.map((s: any) => ({
              variantId: s.variantId || s.id,
              size: s.size,
              priceIdr: Number(s.priceIdr),
              stockQty: Number(s.stockQty),
              sku: s.sku || variant.sku,
            }))
          );
        }
      }
    } catch {
      // Keep initial list if offline or error
    }
  };

  const handleMassApply = () => {
    const p = Number(massPrice) || 165000;
    const s = Number(massStock) || 0;
    setSiblingSizes((prev) =>
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

    setBusy(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, unknown> = {
        variantId: variant.id,
        name: name.trim(),
        categoryId,
        colorHex,
        colorName: colorName.trim(),
        images: [imageUrl.trim()],
        isActive,
      };

      if (siblingSizes.length > 1) {
        payload.batchVariations = siblingSizes.map((s) => ({
          variantId: s.variantId,
          size: s.size,
          priceIdr: Math.max(1000, Math.min(100_000_000, s.priceIdr)),
          stockQty: Math.max(0, Math.min(100000, s.stockQty)),
        }));
      } else {
        const price = Math.min(100_000_000, Number(priceIdr) || 0);
        const stock = Number(stockQty);
        if (!price || price < 1000) {
          setErrorMsg("Harga produk minimal Rp 1.000");
          setBusy(false);
          return;
        }
        payload.priceIdr = price;
        payload.stockQty = stock;
        payload.size = size;
      }

      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Gagal memperbarui produk");
      }

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setIsOpen(false);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-brand-accent/40 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors flex items-center gap-1"
        title="Ubah detail produk, 3D asset, tulisan, dan foto etalase"
      >
        <Edit2 size={12} />
        <span>EDIT</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !busy && setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit produk etalase"
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 font-sans text-sm shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-border-subtle pb-4">
              <div>
                <span className="text-[10px] text-brand-accent tracking-widest uppercase font-bold block mb-1">
                  EDIT DETAIL PRODUK // SKU: {variant.sku}
                </span>
                <h2 className="font-sans font-bold text-xl uppercase text-text-primary">
                  UBAH PRODUK ETALASE
                </h2>
                <p className="text-text-muted mt-0.5 text-[11px]">
                  Perubahan tulisan, model 3D, foto, variasi ukuran, dan stok langsung sinkron dengan database.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={busy}
                aria-label="Tutup modal edit produk"
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
                <span>✓ Perubahan produk & seluruh variasi ukuran berhasil disimpan ke database!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kategori Apparel / Asset 3D */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px] flex items-center gap-1.5">
                  <Box size={13} className="text-brand-accent" />
                  <span>Kategori Pakaian / Model 3D</span>
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
                <p className="text-[10px] text-text-muted">
                  Mengubah kategori otomatis mengubah 3D GLB model yang muncul di etalase interaktif.
                </p>
              </div>

              {/* Nama Produk (Tulisan) */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px]">
                  Nama Produk / Tulisan Etalase
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent text-xs"
                  required
                />
              </div>

              {/* Shopee-style Variation Matrix Table (jika memiliki multi-size) */}
              {siblingSizes.length > 1 ? (
                <div className="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
                    <div>
                      <span className="font-bold text-text-primary uppercase text-[11px] block">
                        Matriks Variasi Ukuran ({siblingSizes.length} Ukuran Aktif)
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Atur harga dan stok untuk masing-masing ukuran produk ini.
                      </span>
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
                        className="w-24 p-1.5 rounded-lg bg-canvas border border-border-subtle text-text-primary font-bold text-[11px]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-text-muted text-[10px]">Stok</span>
                      <input
                        type="number"
                        value={massStock}
                        onChange={(e) => setMassStock(e.target.value)}
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

                  {/* Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase">
                          <th className="py-2 px-2">Ukuran</th>
                          <th className="py-2 px-2">Harga Jual (Rp)</th>
                          <th className="py-2 px-2">Stok (Pcs)</th>
                          <th className="py-2 px-2">Kode SKU</th>
                          <th className="py-2 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {siblingSizes.map((item) => (
                          <tr key={item.variantId}>
                            <td className="py-2.5 px-2 font-bold text-text-primary">
                              <span className="px-2.5 py-1 rounded-md bg-surface border border-border-subtle font-mono text-xs">
                                {item.size}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                value={item.priceIdr}
                                onChange={(e) =>
                                  setSiblingSizes((prev) =>
                                    prev.map((it) =>
                                      it.variantId === item.variantId
                                        ? { ...it, priceIdr: Number(e.target.value) || 0 }
                                        : it
                                    )
                                  )
                                }
                                className="w-28 p-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold focus:border-brand-accent"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                value={item.stockQty}
                                onChange={(e) =>
                                  setSiblingSizes((prev) =>
                                    prev.map((it) =>
                                      it.variantId === item.variantId
                                        ? { ...it, stockQty: Number(e.target.value) || 0 }
                                        : it
                                    )
                                  )
                                }
                                className="w-20 p-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold focus:border-brand-accent"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-[10px] text-text-muted font-mono truncate max-w-[120px]">
                              {item.sku}
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
              ) : (
                /* Single Variant Price & Stock Fallback */
                <>
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

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-primary uppercase text-[11px]">
                      Ukuran Produk
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
                </>
              )}

              {/* Gambar / Mockup Etalase */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-primary uppercase text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-brand-accent" />
                    <span>Gambar / Foto Katalog</span>
                  </span>
                  <span className="text-text-muted truncate max-w-[200px]">{imageUrl}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_PRESETS.map((ip) => (
                    <button
                      key={ip.url}
                      type="button"
                      onClick={() => setImageUrl(ip.url)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all ${
                        imageUrl === ip.url
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold"
                          : "bg-canvas border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <span className="truncate text-[10px]">{ip.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="URL R2 atau path gambar (https://... atau /products/...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary text-[11px] mt-1"
                />
              </div>

              {/* Status Tampil di Etalase */}
              <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
                <div>
                  <span className="font-bold text-text-primary text-[11px] block">
                    Status Etalase Toko
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {isActive ? "Produk muncul di halaman depan & katalog publik" : "Produk disembunyikan dari etalase"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1.5 rounded-full font-bold text-[10px] border transition-colors ${
                    isActive
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-surface border-border-subtle text-text-muted"
                  }`}
                >
                  {isActive ? "AKTIF (TAMPIL)" : "NONAKTIF (SEMBUNYI)"}
                </button>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-border-subtle">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 px-6 rounded-2xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Sparkles size={15} />
                  <span>{busy ? "MENYIMPAN PERUBAHAN..." : "SIMPAN PERUBAHAN KE ETALASE"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
