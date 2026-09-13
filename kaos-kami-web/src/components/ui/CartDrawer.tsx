"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useShallow } from "zustand/shallow";
import { CheckoutModal } from "./CheckoutModal";
import { isSafeImageUrl } from "@/lib/safeUrl";
import { fetchServerPriceMap, formatIdr } from "@/lib/cartPriceRefresh";

export const CartDrawer: React.FC = () => {
  const { items, isCartOpen, closeCart, updateQuantity, removeItem, getTotalPrice, getTotalCount } =
    useCartStore(
      useShallow((s) => ({
        items: s.items,
        isCartOpen: s.isCartOpen,
        closeCart: s.closeCart,
        updateQuantity: s.updateQuantity,
        removeItem: s.removeItem,
        getTotalPrice: s.getTotalPrice,
        getTotalCount: s.getTotalCount,
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
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        checkoutMode="cart"
      />
      {isCartOpen && (
      <div
        className="fixed inset-0 z-50 flex justify-end"
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
          className="relative z-10 w-full max-w-md bg-[#121214] border-l border-white/10 text-text-primary h-full flex flex-col shadow-2xl animate-slideLeft">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag size={18} className="text-brand-accent" />
              <span className="font-display font-black text-base uppercase tracking-tight">
                KERANJANG BELANJA
              </span>
              <span className="px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent font-mono text-xs font-bold">
                {totalCount}
              </span>
            </div>
            <button
              ref={closeBtnRef}
              onClick={closeCart}
              aria-label="Tutup keranjang"
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg bg-surface border border-white/10 text-text-muted hover:text-white flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 font-mono text-xs text-text-muted">
                <ShoppingBag size={36} className="opacity-30" />
                <p>Keranjang Anda masih kosong.</p>
                <Link
                  href="/catalog"
                  onClick={closeCart}
                  className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold uppercase tracking-wider"
                >
                  LIHAT KATALOG
                </Link>
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
                  className="p-3.5 rounded-xl bg-surface/70 border border-white/5 flex gap-3.5 font-mono text-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden relative bg-black/40 border border-white/10 shrink-0">
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
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-white text-xs leading-tight line-clamp-1">
                          {item.name}
                        </span>                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          aria-label={`Hapus ${item.name} ukuran ${item.size}`}
                          className="text-text-muted hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="text-[10px] text-text-muted mt-1 space-x-2">
                        <span>SIZE: <strong className="text-white">{item.size}</strong></span>
                        <span>WARNA: <strong className="text-white">{item.colorName}</strong></span>
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
                          className={`text-[10px] mt-1 font-bold ${atCap ? "text-amber-400" : "text-text-muted"}`}
                          aria-live="polite"
                        >
                          {atCap ? `Maks stok (${cap} pcs)` : `Stok: ${cap} pcs`}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <span className="font-bold text-brand-accent block">
                          Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          @{item.priceIdr.toLocaleString("id-ID")} × {item.quantity}
                        </span>
                      </div>

                      {/* Quantity Toggles */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, -1)}
                          aria-label="Kurangi jumlah"
                          className="w-9 h-9 rounded bg-black/50 border border-white/10 text-white flex items-center justify-center hover:border-brand-accent"
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
                          className={`w-9 h-9 rounded bg-black/50 border border-white/10 text-white flex items-center justify-center hover:border-brand-accent ${atCap ? "opacity-40 cursor-not-allowed hover:border-white/10" : ""}`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    {stockNoticeKey === rowKey && atCap && (
                      <p className="text-[10px] text-amber-400 font-bold pt-1" role="status">
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
            <div className="p-5 border-t border-white/10 bg-[#0E0E10] space-y-3 font-mono text-xs">
              {priceChecking && (
                <p className="text-[10px] text-text-muted" role="status">
                  Mengecek harga terbaru katalog…
                </p>
              )}
              {priceNotice && priceNotice.diff !== 0 && (
                <div
                  role="status"
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold leading-snug"
                >
                  Harga katalog berubah: Rp {priceNotice.oldTotal.toLocaleString("id-ID")} → Rp{" "}
                  {priceNotice.newTotal.toLocaleString("id-ID")} (selisih {formatIdr(priceNotice.diff)}).
                  Total di bawah sudah harga terbaru.
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-text-muted">SUBTOTAL:</span>
                <span className="text-white text-base">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Harga final dihitung server. Diantar gratis se-Makassar / ambil di workshop.</span>
              </p>

              <button
                onClick={() => {
                  closeCart();
                  setIsCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(230,81,0,0.4)] flex items-center justify-center space-x-2"
              >
                <span>PROSES CHECKOUT (DUITKU)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </aside>
      </div>
      )}
    </>
  );
};
