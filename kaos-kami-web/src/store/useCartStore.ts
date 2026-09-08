"use client";

import { create } from "zustand";

export interface CartProductItem {
  id: string;
  name: string;
  priceIdr: number;
  size: string;
  colorName: string;
  colorHex: string;
  image: string;
  quantity: number;
  isCustom?: boolean;
  /** Slug kategori (tshirt/longsleeve/...) agar server hitung tipe benar. */
  apparelSlug?: string;
  /** Varian katalog — server pakai harga varian (sudah termasuk sablon/size). */
  productVariantId?: string;
}

interface CartStore {
  items: CartProductItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartProductItem, "quantity"> & { quantity?: number }) => void;
  // Kunci = id+size (varian beda size baris terpisah — audit #5).
  removeItem: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, delta: number) => void;
  clearCart: () => void;
  getTotalCount: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  // Keranjang mulai KOSONG — item demo menyesatkan pembeli & checkout.
  items: [],
  isCartOpen: false,

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  addItem: (newItem) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.id === newItem.id && item.size === newItem.size
      );
      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex]!.quantity += newItem.quantity || 1;
        return { items: updated, isCartOpen: true };
      }
      return {
        items: [...state.items, { ...newItem, quantity: newItem.quantity || 1 }],
        isCartOpen: true,
      };
    });
  },

  removeItem: (id, size) => {
    set((state) => ({
      items: state.items.filter((item) => !(item.id === id && item.size === size)),
    }));
  },

  updateQuantity: (id, size, delta) => {
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.id === id && item.size === size) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartProductItem[],
    }));
  },

  clearCart: () => set({ items: [] }),

  getTotalCount: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((acc, item) => acc + item.priceIdr * item.quantity, 0);
  },
}));
