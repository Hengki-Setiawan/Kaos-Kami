"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Sparkles, X, Check, AlertCircle, ShoppingBag, Box, ArrowRight, Loader2, RefreshCw, Save } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useSession } from "@/lib/auth-client";
import { APPAREL_CATALOG } from "@/lib/constants";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { PRODUCT_COLORS } from "@/lib/constants";

export function StudioPublishModal() {
  const searchParams = useSearchParams();
  const editCatalogId = searchParams.get("editCatalogId");
  const titleParam = searchParams.get("title");

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishedVariant, setPublishedVariant] = useState<any | null>(null);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFinishAndClose = () => {
    setIsOpen(false);
    setAutoCloseSeconds(null);
    if (typeof window !== "undefined") {
      // 1. Refresh tab admin pemanggil jika ada
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.location.reload();
        } catch (e) {
          console.warn("Opener reload error:", e);
        }
        try {
          window.close();
          return;
        } catch (e) {
          console.warn("Window close error:", e);
        }
      }
      // 2. Fallback jika tab dibuka langsung di jendela yang sama
      window.location.href = "/admin/catalog";
    }
  };

  useEffect(() => {
    if (autoCloseSeconds === null) return;
    if (autoCloseSeconds <= 0) {
      handleFinishAndClose();
      return;
    }
    const timer = setTimeout(() => {
      setAutoCloseSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoCloseSeconds]);

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

  // Role-guard: tombol PAJANG DI ETALASE hanya untuk admin.
  const { data: session } = useSession();
  const userRole = String((session?.user as any)?.role || "");
  const isAdmin =
    ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole.toUpperCase()) ||
    session?.user?.email === "hengkishadow@gmail.com" ||
    session?.user?.email === "admin@kaoskami.biz.id";

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
    // 1. Pastikan model baju lurus tegak ke depan & simetris di tengah
    const storeState = useConfiguratorStore.getState();
    storeState.setModelRotY(0);
    storeState.setModelPosX(0);
    storeState.setModelPosY(0);
    storeState.setActiveViewSide("front");

    const snap = captureCanvas();
    setSnapshotUrl(snap);

    const curApparel = storeState.activeApparel;
    const curColorName = storeState.activeColorName;
    const curColorHex = storeState.selectedColor;
    const curSize = storeState.selectedSize || "L";
    const curDecals = storeState.decals;

    const apparelInfo = APPAREL_CATALOG[curApparel] || { name: "Pakaian Custom" };
    const defaultName = titleParam || `${apparelInfo.name} - ${curColorName}`;
    setProductName(defaultName);

    // Hitung estimasi harga dari pricing engine
    const matchedColor = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === curColorHex.toLowerCase()
    );
    const matPricing = materialFinishToPricing(materialFinish);
    const pricing = calculate6VariablePrice({
      apparelSlug: curApparel,
      fabricThicknessSlug: matPricing.fabricThicknessSlug,
      size: curSize,
      colorHex: curColorHex,
      isSpecialPigment: !!matchedColor?.isSpecialPigment,
      decals: curDecals,
      quantity: 1,
    });

    setPriceInput(String(Math.max(pricing.totalPriceIdr, 120000)));
    setStockInput("15");
    setChosenSize(curSize);
    setErrorMsg(null);
    setPublishedVariant(null);
    setIsOpen(true);
  };

  const handleRetakeSnapshot = () => {
    const storeState = useConfiguratorStore.getState();
    storeState.setModelRotY(0);
    storeState.setModelPosX(0);
    storeState.setModelPosY(0);
    storeState.setActiveViewSide("front");
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
      let finalImgUrl = "/products/tshirt-orange-makassar.jpg";

      const uploadAssetToR2 = async (rawUrl: string | null | undefined): Promise<string | null> => {
        if (!rawUrl) return null;
        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
        try {
          let b64 = rawUrl;
          if (rawUrl.startsWith("blob:")) {
            const res = await fetch(rawUrl);
            const blob = await res.blob();
            b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          if (b64.startsWith("data:image/")) {
            const upRes = await fetch("/api/upload/r2", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: b64,
                kind: "master",
              }),
            });
            const upData = await upRes.json().catch(() => null);
            if (upRes.ok && upData?.url) return upData.url;
          }
        } catch (e) {
          console.warn("Upload asset to R2 failed:", e);
        }
        return null;
      };

      // 1. Upload snapshot 3D ke R2
      if (snapshotUrl && snapshotUrl.startsWith("data:image/")) {
        const uploadedSnap = await uploadAssetToR2(snapshotUrl);
        if (uploadedSnap) finalImgUrl = uploadedSnap;
      }

      // 2. Ambil decal URLs bila ada & upload ke R2 jika masih base64 / blob
      const rawFrontDecal = decals.find((d) => d.targetSide === "front")?.url || null;
      const rawBackDecal = decals.find((d) => d.targetSide === "back")?.url || null;

      const [uploadedFront, uploadedBack] = await Promise.all([
        uploadAssetToR2(rawFrontDecal),
        uploadAssetToR2(rawBackDecal),
      ]);

      // Buat salinan decals dengan URL permanen R2 bila tersedia
      const persistentDecals = await Promise.all(
        decals.map(async (d) => {
          if (d.url.startsWith("http://") || d.url.startsWith("https://")) return d;
          const uploaded = await uploadAssetToR2(d.url);
          return uploaded ? { ...d, url: uploaded } : d;
        })
      );

      const tagsData = {
        colorHex: selectedColor,
        frontDecalUrl: uploadedFront || (rawFrontDecal && !rawFrontDecal.startsWith("blob:") && !rawFrontDecal.startsWith("data:") ? rawFrontDecal : null),
        backDecalUrl: uploadedBack || (rawBackDecal && !rawBackDecal.startsWith("blob:") && !rawBackDecal.startsWith("data:") ? rawBackDecal : null),
        printSize: "A4",
        decals: persistentDecals,
        mockupSnapshotUrl: finalImgUrl,
      };

      // 2. Terbitkan ke Distro Catalog API
      const endpoint = "/api/admin/distro-catalog";
      const method = editCatalogId ? "PATCH" : "POST";
      const payload: any = {
        name: productName.trim(),
        basePriceIdr: price,
        tags: tagsData,
      };

      if (editCatalogId) {
        payload.id = editCatalogId;
        payload.apparelSlug = activeApparel;
        // JANGAN timpa foto 2D etalase (images) jika sedang mengedit produk yang sudah ada
      } else {
        payload.apparelSlug = activeApparel;
        payload.images = [finalImgUrl];
        payload.sizes = ["S", "M", "L", "XL", "XXL"];
        payload.isActive = true;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan mockup produk ke etalase");
      }

      setPublishedVariant(data.product || { name: productName, basePriceIdr: price, stockQty: stock });
      if (editCatalogId) {
        setAutoCloseSeconds(4);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan produk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {isAdmin && (
        <button
          onClick={handleOpen}
          type="button"
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-canvas font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all border border-amber-400/40"
          title={editCatalogId ? "Perbarui hasil mockup 3D ini ke etalase produk distro" : "Pajang hasil desain 3D ini ke etalase toko"}
        >
          {editCatalogId ? <Save size={14} className="text-canvas" /> : <Sparkles size={14} className="animate-spin text-canvas" style={{ animationDuration: "4s" }} />}
          <span>{editCatalogId ? "PERBARUI KE ETALASE" : "PAJANG DI ETALASE"}</span>
        </button>
      )}

      {isOpen && isAdmin && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6 flex min-h-full items-start sm:items-center justify-center animate-in fade-in duration-200"
          onClick={() => {
            if (!busy) {
              setAutoCloseSeconds(null);
              setIsOpen(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-xl my-auto bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 font-mono text-xs shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border-subtle pb-3">
              <div>
                <span className="text-[10px] text-brand-accent tracking-widest uppercase font-bold block mb-0.5">
                  {editCatalogId ? "ADMIN STUDIO 3D // UPDATE SHOWCASE PRODUCT" : "ADMIN STUDIO 3D // PUBLISH TO SHOWCASE"}
                </span>
                <h2 className="font-sans font-bold text-base sm:text-lg uppercase text-text-primary">
                  {editCatalogId ? "PERBARUI MOCKUP PRODUK ETALASE" : "PAJANG DESAIN KE ETALASE TOKO"}
                </h2>
                <p className="text-text-muted text-[11px]">
                  {editCatalogId
                    ? "Snapshot 3D renderan terbaru, warna kain, dan posisi sablon akan disimpan langsung ke produk etalase ini."
                    : "Terbitkan hasil rancangan 3D ini menjadi produk siap beli di halaman depan toko."}
                </p>
              </div>
              <button
                onClick={() => {
                  setAutoCloseSeconds(null);
                  setIsOpen(false);
                }}
                disabled={busy}
                className="p-1.5 rounded-full hover:bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
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
                  <h3 className="font-sans font-bold text-lg uppercase text-text-primary">
                    {editCatalogId ? "MOCKUP PRODUK BERHASIL DIPERBARUI!" : "PRODUK RESMI TAYANG DI ETALASE!"}
                  </h3>
                  <p className="text-text-muted text-xs mt-1 max-w-md mx-auto">
                    <strong>{publishedVariant.name}</strong> kini telah diperbarui di etalase toko dan siap dilihat oleh pelanggan.
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
                      Rp {Number(publishedVariant.basePriceIdr || publishedVariant.priceIdr || priceInput).toLocaleString("id-ID")}
                    </span>
                    <span className="text-text-muted text-[10px] block">
                      Aset 3D & Decal Terpasang Sempurna
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col items-center gap-3 justify-center">
                  {editCatalogId ? (
                    <>
                      <button
                        type="button"
                        onClick={handleFinishAndClose}
                        className="w-full sm:w-auto py-3 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <Check size={16} />
                        <span>✓ SELESAI & KEMBALI KE ADMIN CATALOG</span>
                      </button>

                      {autoCloseSeconds !== null && (
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>
                            Otomatis menutup studio dalam <strong className="text-brand-accent font-mono text-xs">{autoCloseSeconds}</strong> detik...
                          </span>
                          <button
                            type="button"
                            onClick={() => setAutoCloseSeconds(null)}
                            className="text-[10px] text-text-muted hover:text-text-primary underline ml-1 cursor-pointer"
                          >
                            (Batal otomatis)
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <Link
                          href="/catalog"
                          onClick={() => {
                            setAutoCloseSeconds(null);
                            setIsOpen(false);
                          }}
                          className="py-2 px-4 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-[11px] font-bold uppercase transition-colors flex items-center gap-1.5"
                        >
                          <ShoppingBag size={13} />
                          <span>Lihat di Etalase</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setAutoCloseSeconds(null);
                            setIsOpen(false);
                          }}
                          className="py-2 px-4 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-[11px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          Tetap di Studio 3D
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 justify-center w-full">
                      <Link
                        href="/catalog"
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
                  )}
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
                        <span>MENYIMPAN KE ETALASE...</span>
                      </>
                    ) : editCatalogId ? (
                      <>
                        <Save size={14} />
                        <span>SIMPAN & PERBARUI KE ETALASE TOKO</span>
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
        </div>,
        document.body
      )}
    </>
  );
}
