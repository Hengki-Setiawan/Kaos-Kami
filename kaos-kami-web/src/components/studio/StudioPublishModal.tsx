"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, X, Check, AlertCircle, ShoppingBag, Box, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { APPAREL_CATALOG } from "@/lib/constants";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { PRODUCT_COLORS } from "@/lib/constants";

export function StudioPublishModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishedVariant, setPublishedVariant] = useState<any | null>(null);

  const {
    activeApparel,
    selectedColor,
    activeColorName,
    selectedSize,
    materialFinish,
    decals,
  } = useConfiguratorStore();

  // Snapshot canvas 3D
  const [snapshotUrl, setSnapshotUrl] = useState<string>("");

  // Form Fields
  const [productName, setProductName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [stockInput, setStockInput] = useState("15");
  const [chosenSize, setChosenSize] = useState("L");

  const captureCanvas = (): string => {
    try {
      const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
      if (canvas) {
        return canvas.toDataURL("image/webp", 0.85);
      }
    } catch {}
    return "";
  };

  const handleOpen = () => {
    const snap = captureCanvas();
    setSnapshotUrl(snap);

    const apparelInfo = APPAREL_CATALOG[activeApparel] || { name: "Pakaian Custom" };
    const defaultName = `${apparelInfo.name} - ${activeColorName}`;
    setProductName(defaultName);

    // Hitung estimasi harga dari pricing engine
    const matchedColor = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
    );
    const matPricing = materialFinishToPricing(materialFinish);
    const pricing = calculate6VariablePrice({
      apparelSlug: activeApparel,
      fabricThicknessSlug: matPricing.fabricThicknessSlug,
      size: selectedSize || "L",
      colorHex: selectedColor,
      isSpecialPigment: !!matchedColor?.isSpecialPigment,
      decals,
      quantity: 1,
    });

    setPriceInput(String(Math.max(pricing.totalPriceIdr, 120000)));
    setStockInput("15");
    setChosenSize(selectedSize || "L");
    setErrorMsg(null);
    setPublishedVariant(null);
    setIsOpen(true);
  };

  const handleRetakeSnapshot = () => {
    const snap = captureCanvas();
    if (snap) {
      setSnapshotUrl(snap);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setErrorMsg("Nama produk wajib diisi");
      return;
    }
    const price = Math.min(100_000_000, Number(priceInput) || 0);
    const stock = Number(stockInput) || 0;
    if (price < 1000) {
      setErrorMsg("Harga minimal Rp 1.000");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      let finalImgUrl = "/lookbook/look-01.jpg";

      // 1. Upload snapshot ke R2 bila ada base64 snapshot
      if (snapshotUrl && snapshotUrl.startsWith("data:image/")) {
        try {
          const upRes = await fetch("/api/upload/r2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: snapshotUrl,
              kind: "master",
            }),
          });
          const upData = await upRes.json().catch(() => null);
          if (upRes.ok && upData?.url) {
            finalImgUrl = upData.url;
          } else {
            // Fallback bila R2 mock/local: gunakan snapshot langsung atau default
            finalImgUrl = snapshotUrl;
          }
        } catch {
          finalImgUrl = snapshotUrl || "/lookbook/look-01.jpg";
        }
      }

      // Ambil decal URLs bila ada
      const frontDecal = decals.find((d) => d.targetSide === "front")?.url || null;
      const backDecal = decals.find((d) => d.targetSide === "back")?.url || null;

      // 2. Terbitkan ke catalog API
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: activeApparel,
          name: productName.trim(),
          colorHex: selectedColor,
          colorName: activeColorName,
          size: chosenSize,
          priceIdr: price,
          stockQty: stock,
          images: [finalImgUrl],
          frontDecalUrl: frontDecal && !frontDecal.startsWith("blob:") ? frontDecal : null,
          backDecalUrl: backDecal && !backDecal.startsWith("blob:") ? backDecal : null,
          isPreDesigned: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Gagal menerbitkan produk ke etalase");
      }

      setPublishedVariant(data.variant || { name: productName, priceIdr: price, stockQty: stock });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mempublikasikan produk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-canvas font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all border border-amber-400/40"
        title="Admin: Pajang hasil desain 3D ini langsung ke etalase toko sebagai produk ready stock"
      >
        <Sparkles size={14} className="animate-spin text-canvas" style={{ animationDuration: "4s" }} />
        <span>PAJANG DI ETALASE</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !busy && setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-surface border border-border-subtle rounded-3xl p-5 sm:p-7 font-mono text-xs shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border-subtle pb-3.5">
              <div>
                <span className="text-[10px] text-brand-accent tracking-widest uppercase font-bold block mb-1">
                  ADMIN STUDIO 3D // PUBLISH TO SHOWCASE
                </span>
                <h2 className="font-display font-black text-lg sm:text-xl uppercase text-text-primary">
                  PAJANG DESAIN KE ETALASE TOKO
                </h2>
                <p className="text-text-muted mt-0.5 text-[11px]">
                  Terbitkan hasil rancangan 3D ini menjadi produk siap beli di halaman depan toko.
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

            {publishedVariant ? (
              /* Success State */
              <div className="py-6 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check size={28} />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg uppercase text-text-primary">
                    PRODUK RESMI TAYANG DI ETALASE!
                  </h3>
                  <p className="text-text-muted text-xs mt-1 max-w-md mx-auto">
                    <strong>{publishedVariant.name}</strong> kini dapat dilihat dan dibeli langsung oleh pelanggan di halaman depan toko.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-canvas border border-border-subtle max-w-sm mx-auto flex items-center gap-3 text-left">
                  {snapshotUrl && (
                    <img
                      src={snapshotUrl}
                      alt="Thumbnail"
                      className="w-14 h-14 rounded-xl object-cover bg-surface border border-border-subtle shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-text-primary block truncate">{publishedVariant.name}</span>
                    <span className="text-brand-accent font-bold text-xs">
                      Rp {Number(publishedVariant.priceIdr || priceInput).toLocaleString("id-ID")}
                    </span>
                    <span className="text-text-muted text-[10px] block">
                      Stok: {publishedVariant.stockQty || stockInput} pcs · Ukuran: {chosenSize}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="py-2.5 px-5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <ShoppingBag size={14} />
                    <span>LIHAT DI ETALASE TOKO</span>
                  </Link>

                  <Link
                    href="/admin/catalog"
                    onClick={() => setIsOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-wider hover:border-brand-accent transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>KELOLA DI ADMIN CATALOG</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handlePublish} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 text-xs">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 3D Snapshot Preview Card */}
                <div className="p-3 rounded-2xl bg-canvas border border-border-subtle flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#121214] border border-border-subtle shrink-0 flex items-center justify-center">
                    {snapshotUrl ? (
                      <img src={snapshotUrl} alt="3D Preview Snapshot" className="w-full h-full object-cover" />
                    ) : (
                      <Box size={24} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">
                        SNAPSHOT 3D OTOMATIS
                      </span>
                      <button
                        type="button"
                        onClick={handleRetakeSnapshot}
                        className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                        title="Ambil ulang tangkapan layar 3D"
                      >
                        <RefreshCw size={10} />
                        <span>Foto Ulang</span>
                      </button>
                    </div>
                    <span className="font-bold text-text-primary text-xs block truncate mt-0.5">
                      {APPAREL_CATALOG[activeApparel]?.name || activeApparel} ({activeColorName})
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {decals.length > 0
                        ? `✓ Termasuk ${decals.length} layer sablon DTF aktif`
                        : "Model 3D polos tanpa sablon"}
                    </span>
                  </div>
                </div>

                {/* Nama Produk */}
                <div className="space-y-1">
                  <label className="font-bold text-text-primary uppercase text-[11px]">
                    Nama Produk di Etalase
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent text-xs"
                    required
                  />
                </div>

                {/* Grid: Harga & Stok */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-text-primary uppercase text-[11px]">
                      Harga Jual (Rp)
                    </label>
                    <input
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent font-bold text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-text-primary uppercase text-[11px]">
                      Stok Siap Kirim (Pcs)
                    </label>
                    <input
                      type="number"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent font-bold text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Ukuran Standar */}
                <div className="space-y-1">
                  <label className="font-bold text-text-primary uppercase text-[11px]">
                    Ukuran Display Utama
                  </label>
                  <div className="flex gap-2">
                    {["S", "M", "L", "XL", "XXL"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setChosenSize(sz)}
                        className={`flex-1 py-2 rounded-xl font-bold text-xs border transition-all ${
                          chosenSize === sz
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-canvas border-border-subtle text-text-primary hover:border-brand-accent/50"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail Ringkas Baju & Warna */}
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-border-subtle"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span className="text-text-muted">Warna:</span>
                    <strong className="text-text-primary">{activeColorName}</strong>
                  </div>
                  <span className="text-[10px] text-brand-accent uppercase font-bold bg-brand-accent/10 px-2 py-0.5 rounded-md border border-brand-accent/20">
                    {activeApparel.toUpperCase()}
                  </span>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-border-subtle">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>MENERBITKAN KE ETALASE...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>TERBITKAN SEKARANG KE ETALASE TOKO</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-text-muted mt-2">
                    Produk akan langsung muncul di halaman depan toko dengan model 3D dan foto siap pakai.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
