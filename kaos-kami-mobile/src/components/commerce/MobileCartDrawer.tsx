"use client";

import React from 'react';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { BottomSheet, HapticButton } from '@/components/ui';
import { useMobileCartStore } from '@/store/useMobileCartStore';
import { useShallow } from 'zustand/shallow';
import { haptic } from '@/lib/bridge/haptics';

export interface MobileCartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil saat user tekan Checkout — parent menutup drawer + buka CheckoutSheet. */
  onCheckout: () => void;
  onNotify?: (msg: string) => void;
}

/**
 * CartDrawer mobile — paritas ringan web CartDrawer (daftar item + tombol
 * checkout). Harga DITAMPILKAN APA ADANYA dari store (getSubtotal);
 * server menghitung ulang saat checkout (JANGAN ubah pricing di sini).
 */
export function MobileCartDrawer({ open, onOpenChange, onCheckout, onNotify }: MobileCartDrawerProps) {
  const { items, updateQuantity, removeItem, getSubtotal, getItemCount } = useMobileCartStore(
    useShallow((s) => ({
      items: s.items,
      updateQuantity: s.updateQuantity,
      removeItem: s.removeItem,
      getSubtotal: s.getSubtotal,
      getItemCount: s.getItemCount,
    }))
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Keranjang (${getItemCount()} pcs)`}
      description="Desain tersimpan di HP — estimasi dihitung ulang server saat checkout."
    >
      <div className="space-y-3 py-2 pb-6">
        {items.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="text-sm font-bold text-white">Keranjang masih kosong</p>
            <p className="text-[11px] text-zinc-400">
              Desain di Studio 3D lalu tekan Simpan untuk masuk ke sini.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{it.apparelTitle}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {it.size} • {it.decals.length} sablon • {it.printWidthCm}×{it.printHeightCm} cm
                    </p>
                    <p className="text-[11px] text-[#FF6B35] font-bold mt-0.5">
                      Rp {it.totalPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Kurangi jumlah"
                      onClick={() => updateQuantity(it.id, it.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">{it.quantity}</span>
                    <button
                      type="button"
                      aria-label="Tambah jumlah"
                      onClick={() => updateQuantity(it.id, it.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus item"
                      onClick={() => {
                        removeItem(it.id);
                        onNotify?.('Item dihapus dari keranjang.');
                      }}
                      className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-300 flex items-center justify-center active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Subtotal ({items.length} desain) — estimasi:</span>
                <span className="text-white font-bold">Rp {getSubtotal().toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Estimasi — dihitung ulang server saat checkout (termasuk ongkir & kupon).
              </p>
            </div>

            <HapticButton
              variant="primary"
              hapticStyle="success"
              onClick={() => {
                haptic.tapHeavy();
                onOpenChange(false);
                onCheckout();
              }}
              className="w-full py-4 text-sm font-bold"
            >
              <span>Checkout Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </HapticButton>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
