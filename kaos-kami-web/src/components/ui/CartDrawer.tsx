"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useShallow } from "zustand/shallow";
import { CheckoutModal } from "./CheckoutModal";
import { CheckoutModalLegacy } from "./CheckoutModalLegacy";

// Amandemen Bab 56 A2: flag rollback 1-env. Default true (V2 2-tahap).
// Rollback darurat: set NEXT_PUBLIC_CHECKOUT_V2=false lalu restart/redeploy.
const USE_CHECKOUT_V2 = process.env.NEXT_PUBLIC_CHECKOUT_V2 !== "false";
const ActiveCheckoutModal = USE_CHECKOUT_V2 ? CheckoutModal : CheckoutModalLegacy;
import { isSafeImageUrl } from "@/lib/safeUrl";
import { fetchServerPriceMap, formatIdr } from "@/lib/cartPriceRefresh";
import { Z_CLASS_CART } from "@/lib/zIndex";

/** 3 rekomendasi terlaris (data statis dari katalog existing — cermin
 *  DEFAULT_SHOWCASE StoreShowcaseSection; tambah-ke-cart via store). */
const BESTSELLERS: Array<{
  id: string;
  name: string;
  priceIdr: number;
  size: string;
  colorName: string;
  colorHex: string;
  image: string;
  apparelSlug: string;
  productVariantId: string;
  stockQty: number;
  rank: string;
}> = [
  {
    id: "cmtgx5swk000kush0030f43il",
    name: "Kaos Polos Combed 24s - Hitam",
    priceIdr: 165000,
    size: "L",
    colorName: "Hitam",
    colorHex: "#121214",
    image: "/products/tshirt-black.jpg",
    apparelSlug: "tshirt",
    productVariantId: "cmtgx5swk000kush0030f43il-l",
    stockQty: 48,
    rank: "#1 Terlaris",
  },
  {
    id: "cmtgx5tab000qush0tyeaysce",
    name: "Hoodie Boxy Fleece - Hitam",
    priceIdr: 285000,
    size: "L",
    colorName: "Hitam",
    colorHex: "#121214",
    image: "/products/hoodie-black.jpg",
    apparelSlug: "hoodie",
    productVariantId: "cmtgx5tab000qush0tyeaysce-l",
    stockQty: 19,
    rank: "#2 Terlaris",
  },
  {
    id: "cmtgx5t0q000mush0jv2muo0e",
    name: "Kaos Polos Combed 24s - Putih Ecru",
    priceIdr: 165000,
    size: "L",
    colorName: "Putih Ecru",
    colorHex: "#EFECE6",
    image: "/products/tshirt-white-ecru.jpg",
    apparelSlug: "tshirt",
    productVariantId: "cmtgx5t0q000mush0jv2muo0e-l",
    stockQty: 29,
    rank: "#3 Terlaris",
  },
];

export const CartDrawer: React.FC = () => {
  const { items, isCartOpen, closeCart, updateQuantity, removeItem, getTotalPrice, getTotalCount, addItem } =
    useCartStore(
      useShallow((s) => ({
        items: s.items,
        isCartOpen: s.isCartOpen,
        closeCart: s.closeCart,
        updateQuantity: s.updateQuantity,
        removeItem: s.removeItem,
        getTotalPrice: s.getTotalPrice,
        getTotalCount: s.getTotalCount,
        addItem: s.addItem,
      }))
    );
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [stockNoticeKey, setStockNoticeKey] = useState<string | null>(null);
  // Refresh harga basi: bandingkan subtotal lokal vs katalog segar saat
  // drawer dibuka; selisih tampil eksplisit (jangan diam-diam ganti angka).
  const [priceNotice, setPriceNotice] = useState<{ oldTotal: number; newTotal: number; diff: number } | null>(null);
  const [priceChecking, setPriceChecking] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // A11y dialog (tiru AuthModal/BottomSheet): ESC-to-close, fokus awal ke
  // tombol tutup, focus-trap Tab sederhana di dalam panel drawer.
  useEffect(() => {
    if (!isCartOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCart();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isCartOpen, closeCart]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // Refresh harga dari /api/catalog/variants sekali per pembukaan drawer.
  // Sengaja dep [isCartOpen] saja (baca items via getState) agar syncPrices
  // yang mengubah items tak memicu loop fetch ulang.
  useEffect(() => {
    if (!isCartOpen) {
      setPriceNotice(null);
      return;
    }
    let alive = true;
    setPriceChecking(true);
    (async () => {
      try {
        const before = useCartStore.getState().items.reduce((a, it) => a + it.priceIdr * it.quantity, 0);
        if (before <= 0) return;
        const map = await fetchServerPriceMap(10000);
        if (!alive || Object.keys(map).length === 0) return;
        const { diffIdr } = useCartStore.getState().syncPrices(map);
        if (!alive) return;
        const after = useCartStore.getState().items.reduce((a, it) => a + it.priceIdr * it.quantity, 0);
        if (diffIdr !== 0) {
          setPriceNotice({ oldTotal: before, newTotal: after, diff: diffIdr });
        } else {
          setPriceNotice(null);
        }
      } finally {
        if (alive) setPriceChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen]);

  if (!isCartOpen && !isCheckoutModalOpen) return null;

  const totalCount = getTotalCount();
  const totalPrice = getTotalPrice();

  return (
    <>
      {/* Modal checkout DI ATAS early-return (audit #35): closeCart() saat
          klik checkout tidak boleh meng-unmount modal ini. */}
      <ActiveCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        checkoutMode="cart"
      />
      {isCartOpen && isClient && typeof document !== "undefined" && createPortal(
      <div
        className={`fixed inset-0 ${Z_CLASS_CART} flex justify-end`}
        data-lenis-prevent="true"
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={closeCart}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <aside
          ref={panelRef}
          data-lenis-prevent="true"
          className="relative z-10 w-full max-w-md bg-surface border-l border-border-subtle text-text-primary h-full flex flex-col shadow-2xl animate-slideLeft">
          {/* Header */}
          <div className="p-5 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag size={18} className="text-brand-accent" />
              <span className="font-sans font-bold text-base tracking-tight">
                Keranjang ({totalCount})
              </span>
            </div>
            <button
              ref={closeBtnRef}
              onClick={closeCart}
              aria-label="Tutup keranjang"
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-brand-accent/10 border border-brand-accent/25 p-2 shadow-inner flex items-center justify-center">
                  <Image
                    src="/mascot/kamito-avatar.png"
                    alt="Kamito Mascot"
                    width={88}
                    height={88}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1.5 max-w-[240px]">
                  <h4 className="font-sans font-extrabold text-sm uppercase tracking-wide text-text-primary">
                    Keranjang Masih Kosong
                  </h4>
                  <p className="font-sans text-xs text-text-muted leading-relaxed">
                    Kreasikan sablon DTF impianmu di Studio 3D atau pilih koleksi streetwear siap kirim se-Makassar.
                  </p>
                </div>
                <div className="flex flex-col w-full max-w-[240px] gap-2 pt-2">
                  <Link
                    href="/studio"
                    onClick={closeCart}
                    className="w-full py-3 px-4 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-md active:scale-[0.98] transition-all"
                  >
                    <Sparkles size={14} />
                    <span>Buka Studio 3D</span>
                  </Link>
                  <Link
                    href="/catalog"
                    onClick={closeCart}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border-subtle text-text-primary hover:border-brand-accent/50 font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <ShoppingBag size={14} />
                    <span>Belanja Katalog</span>
                  </Link>
                </div>
                {/* Rekomendasi terlaris inline (data statis katalog existing) */}
                <div className="w-full max-w-[300px] space-y-2 pt-1 text-left">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted text-center">
                    Sering dibeli bareng
                  </p>
                  {BESTSELLERS.map((b) => (
                    <div
                      key={`${b.id}-${b.size}`}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-surface/70 border border-border-subtle"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={isSafeImageUrl(b.image) ? b.image : "/lookbook/look-01.jpg"}
                        alt={b.name}
                        width={48}
                        height={60}
                        loading="lazy"
                        className="w-10 h-12 rounded-lg object-cover bg-surface border border-border-subtle shrink-0"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          if (!t.src.endsWith("/lookbook/look-01.jpg")) t.src = "/lookbook/look-01.jpg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-brand-accent uppercase">{b.rank}</p>
                        <p className="text-[11px] font-bold text-text-primary truncate">{b.name}</p>
                        <p className="text-[10px] font-mono tabular-nums text-text-muted">
                          Rp {b.priceIdr.toLocaleString("id-ID")} · Size {b.size}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addItem({
                            id: b.id,
                            name: b.name,
                            priceIdr: b.priceIdr,
                            size: b.size,
                            colorName: b.colorName,
                            colorHex: b.colorHex,
                            image: b.image,
                            apparelSlug: b.apparelSlug,
                            productVariantId: b.productVariantId,
                            stockQty: b.stockQty,
                          })
                        }
                        aria-label={`Tambah ${b.name} ke keranjang`}
                        className="shrink-0 px-2.5 py-2 rounded-lg bg-brand-accent/15 border border-brand-accent/40 text-brand-accent font-sans font-bold text-[10px] uppercase hover:bg-brand-accent hover:text-canvas transition-all min-h-[36px]"
                      >
                        + Tambah
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              items.map((item) => {
                // Stok jujur: kunci tombol + di cap stok varian (store juga
                // menjepit, tapi UI wajib eksplisit — jangan gagal diam-diam).
                const cap =
                  typeof item.stockQty === "number" && Number.isFinite(item.stockQty)
                    ? Math.floor(item.stockQty)
                    : null;
                const atCap = cap !== null && item.quantity >= cap;
                const rowKey = `${item.id}-${item.size}`;
                return (
                <div
                  key={rowKey}
                  className="p-3.5 rounded-xl bg-surface/70 border border-border-subtle flex gap-3.5 font-sans text-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden relative bg-surface border border-border-subtle shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={isSafeImageUrl(item.image) ? item.image : "/lookbook/look-01.jpg"}
                      alt={item.name}
                      width={128}
                      height={160}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        if (!t.src.endsWith("/lookbook/look-01.jpg")) t.src = "/lookbook/look-01.jpg";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-text-primary text-xs leading-tight line-clamp-1">
                          {item.name}
                        </span>                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          aria-label={`Hapus ${item.name} ukuran ${item.size}`}
                          className="text-text-muted hover:text-red-700 dark:hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="text-[10px] text-text-muted mt-1 space-x-2">
                        <span>SIZE: <strong className="text-text-primary">{item.size}</strong></span>
                        <span>WARNA: <strong className="text-text-primary">{item.colorName}</strong></span>
                      </div>
                      {/* M4.1 teamwear: label personal + jumlah sablon per item. */}
                      {item.teamwearLabel && (
                        <div className="text-[10px] mt-1 font-bold text-brand-accent">
                          JERSEY: {item.teamwearLabel}
                          {Array.isArray(item.decals) && item.decals.length > 0 && (
                            <span className="text-text-muted font-normal"> · {item.decals.length} sablon</span>
                          )}
                        </div>
                      )}
                      {/* Info stok per baris (stok jujur): tampilkan sisa stok
                          bila diketahui agar user paham batas tombol +. */}
                      {cap !== null && (
                        <div
                          className={`text-[10px] mt-1 font-bold ${atCap ? "text-amber-700 dark:text-amber-400" : "text-text-muted"}`}
                          aria-live="polite"
                        >
                          {atCap ? `Maks stok (${cap} pcs)` : `Stok: ${cap} pcs`}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <span className="font-bold text-brand-accent block font-mono tabular-nums">
                          Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono tabular-nums">
                          @{item.priceIdr.toLocaleString("id-ID")} × {item.quantity}
                        </span>
                      </div>

                      {/* Quantity Toggles */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, -1)}
                          aria-label="Kurangi jumlah"
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded bg-surface border border-border-subtle text-text-primary flex items-center justify-center hover:border-brand-accent"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-bold" aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => {
                            if (atCap) {
                              // Jangan gagal diam-diam: beri pesan eksplisit 2 detik.
                              setStockNoticeKey(rowKey);
                              if (noticeTimer.current) clearTimeout(noticeTimer.current);
                              noticeTimer.current = setTimeout(() => {
                                setStockNoticeKey((cur) => (cur === rowKey ? null : cur));
                              }, 2000);
                              return;
                            }
                            updateQuantity(item.id, item.size, 1);
                          }}
                          aria-label={atCap ? `Stok maks ${cap} pcs` : "Tambah jumlah"}
                          aria-disabled={atCap}
                          // SENGAJA tanpa `disabled` attr: tombol terkunci tetap
                          // bisa diklik agar pesan stok tampil (jangan gagal diam-diam).
                          title={atCap ? `Stok maks ${cap} pcs` : "Tambah jumlah"}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded bg-surface border border-border-subtle text-text-primary flex items-center justify-center hover:border-brand-accent ${atCap ? "opacity-40 cursor-not-allowed hover:border-border-subtle" : ""}`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    {stockNoticeKey === rowKey && atCap && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold pt-1" role="status">
                        Stok varian ini tinggal {cap} pcs — kurangi item lain atau pilih ukuran lain.
                      </p>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Footer Subtotal & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border-subtle bg-canvas space-y-3 font-sans text-xs">
              {priceChecking && (
                <p className="text-[10px] text-text-muted" role="status">
                  Mengecek harga terbaru katalog…
                </p>
              )}
              {priceNotice && priceNotice.diff !== 0 && (
                <div
                  role="status"
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold leading-snug"
                >
                  Harga katalog berubah: Rp {priceNotice.oldTotal.toLocaleString("id-ID")} → Rp{" "}
                  {priceNotice.newTotal.toLocaleString("id-ID")} (selisih {formatIdr(priceNotice.diff)}).
                  Total di bawah sudah harga terbaru.
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-text-muted">SUBTOTAL:</span>
                <span className="text-text-primary text-base font-mono tabular-nums">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-700 dark:text-emerald-400" />
                <span>Harga final dihitung server. Diantar gratis se-Makassar / ambil di workshop.</span>
              </p>

              <button
                onClick={() => {
                  closeCart();
                  setIsCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-sans font-semibold text-sm tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(230,81,0,0.4)] flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <span>Proses Checkout (Bayar QRIS)</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </aside>
      </div>,
      document.body
      )}
    </>
  );
};
