"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { CheckoutModal } from "./CheckoutModal";

export const CartDrawer: React.FC = () => {
  const { items, isCartOpen, closeCart, updateQuantity, removeItem, getTotalPrice, getTotalCount } =
    useCartStore();
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  if (!isCartOpen) return null;

  const totalCount = getTotalCount();
  const totalPrice = getTotalPrice();

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={closeCart}
        />

        {/* Drawer Panel */}
        <aside className="relative z-10 w-full max-w-md bg-[#121214] border-l border-white/10 text-text-primary h-full flex flex-col shadow-2xl animate-slideLeft">
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
              onClick={closeCart}
              className="p-1.5 rounded-lg bg-surface border border-white/10 text-text-muted hover:text-white"
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
              items.map((item) => (
                <div
                  key={`${item.id}-${item.size}`}
                  className="p-3.5 rounded-xl bg-surface/70 border border-white/5 flex gap-3.5 font-mono text-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden relative bg-black/40 border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image || "/lookbook/look-01.jpg"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-white text-xs leading-tight line-clamp-1">
                          {item.name}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-text-muted hover:text-red-400 p-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="text-[10px] text-text-muted mt-1 space-x-2">
                        <span>SIZE: <strong className="text-white">{item.size}</strong></span>
                        <span>WARNA: <strong className="text-white">{item.colorName}</strong></span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-brand-accent">
                        Rp {item.priceIdr.toLocaleString("id-ID")}
                      </span>

                      {/* Quantity Toggles */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded bg-black/50 border border-white/10 text-white flex items-center justify-center hover:border-brand-accent"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded bg-black/50 border border-white/10 text-white flex items-center justify-center hover:border-brand-accent"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-white/10 bg-[#0E0E10] space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-text-muted">SUBTOTAL:</span>
                <span className="text-white text-base">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Pengiriman Flat Makassar Rp 15.000 / Ambil Gratis di Workshop.</span>
              </p>

              <button
                onClick={() => {
                  closeCart();
                  setIsCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(230,81,0,0.4)] flex items-center justify-center space-x-2"
              >
                <span>PROSES CHECKOUT (MIDTRANS)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Checkout Modal Bridge */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        checkoutMode="cart"
      />
    </>
  );
};
