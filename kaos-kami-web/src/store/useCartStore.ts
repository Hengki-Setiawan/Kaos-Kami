"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DecalLayer } from "@/lib/constants";

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
  /** Stok varian saat dimasukkan (stok jujur: kunci tombol + di drawer). */
  stockQty?: number;
  /** M4.1 teamwear: lapis sablon per item (desain dasar + teks personal).
   * Item katalog tak punya ini (= []). Tanpa productVariantId, server
   * menghitung harga custom via engine (otoritatif, termasuk diskon). */
  decals?: DecalLayer[];
  /** M4.1 teamwear: label "NAMA #NOMOR" untuk tampil di drawer. */
  teamwearLabel?: string;
  /** M4.1 teamwear: finish kain studio agar surcharge kain tepat. */
  materialFinishSlug?: string;
  fabricThicknessSlug?: "combed-30s" | "combed-24s" | "combed-20s" | "combed-16s" | "french-terry-380";
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
  /** Refresh harga/stok dari /api/catalog/variants (anti harga basi). */
  syncPrices: (server: Record<string, { priceIdr?: number; stockQty?: number }>) => { updated: number; diffIdr: number };
  clearCart: () => void;
  getTotalCount: () => number;
  getTotalPrice: () => number;
}

/** Batas atas qty per baris bila stok varian diketahui (stok jujur). */
function capFor(stockQty: unknown): number | null {
  return typeof stockQty === "number" && Number.isFinite(stockQty) && stockQty >= 0
    ? Math.floor(stockQty)
    : null;
}

/** Sisi decal valid (selaras DecalLayerSchema server). */
const VALID_DECAL_SIDES = ["front", "back", "left_sleeve", "right_sleeve", "hood"] as const;

const VALID_FABRICS = ["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"] as const;

/** Sanitasi decal teamwear dari localStorage (batas selaras server: 10 lapis, URL ≤500k). */
function sanitizeDecals(raw: unknown): DecalLayer[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return undefined;
  const out: DecalLayer[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") return undefined;
    const r = d as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id || r.id.length > 64) return undefined;
    if (typeof r.url !== "string" || !r.url || r.url.length > 500_000) return undefined;
    if (typeof r.name !== "string") return undefined;
    if (!VALID_DECAL_SIDES.includes(r.targetSide as (typeof VALID_DECAL_SIDES)[number])) return undefined;
    for (const k of ["x", "y", "scale", "rotation", "opacity"] as const) {
      if (typeof r[k] !== "number" || !Number.isFinite(r[k])) return undefined;
    }
    // printPx opsional (selaras DecalLayerSchema): valid → teruskan agar aspek
    // server tak fallback 1.0; rusak → buang field-nya saja (bukan barisnya).
    const base = d as DecalLayer;
    const px = (r as { printPx?: unknown }).printPx as { w?: unknown; h?: unknown } | undefined;
    if (px !== undefined) {
      const w = typeof px?.w === "number" ? px.w : NaN;
      const h = typeof px?.h === "number" ? px.h : NaN;
      if (Number.isInteger(w) && Number.isInteger(h) && (w as number) > 0 && (h as number) > 0 && (w as number) <= 8000 && (h as number) <= 8000) {
        out.push({ ...base, printPx: { w: w as number, h: h as number } });
      } else {
        const { printPx: _drop, ...rest } = base as DecalLayer & { printPx?: unknown };
        void _drop;
        out.push(rest as DecalLayer);
      }
    } else {
      out.push(base);
    }
  }
  return out;
}

/** Sanitasi satu baris cart dari localStorage korup (merge bijak). */
function sanitizeItem(raw: unknown): CartProductItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id || typeof r.size !== "string" || !r.size) return null;
  const priceIdr = typeof r.priceIdr === "number" && Number.isFinite(r.priceIdr) && r.priceIdr >= 0
    ? Math.floor(r.priceIdr)
    : 0;
  let quantity = typeof r.quantity === "number" && Number.isFinite(r.quantity)
    ? Math.floor(r.quantity)
    : 1;
  quantity = Math.max(1, quantity);
  const cap = capFor(r.stockQty);
  if (cap !== null) {
    if (cap <= 0) return null; // stok habis saat disimpan → buang barisnya
    quantity = Math.min(quantity, cap);
  }
  // M4.1 teamwear: decal personal ikut tersimpan; bila korup → buang baris
  // (jangan checkout jersey tanpa nama/nomor — salah produksi).
  let teamwearDecals: DecalLayer[] | undefined;
  const hasTeamwearFlag = typeof r.teamwearLabel === "string" && r.teamwearLabel.length > 0;
  if (hasTeamwearFlag || r.decals !== undefined) {
    const clean = sanitizeDecals(r.decals);
    if (hasTeamwearFlag && !clean) return null;
    teamwearDecals = clean;
  }
  const fabric = VALID_FABRICS.includes(r.fabricThicknessSlug as (typeof VALID_FABRICS)[number])
    ? (r.fabricThicknessSlug as (typeof VALID_FABRICS)[number])
    : undefined;
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "",
    priceIdr,
    size: r.size,
    colorName: typeof r.colorName === "string" ? r.colorName : "",
    colorHex: typeof r.colorHex === "string" ? r.colorHex : "#121214",
    image: typeof r.image === "string" ? r.image : "/lookbook/look-01.jpg",
    quantity,
    ...(typeof r.isCustom === "boolean" ? { isCustom: r.isCustom } : {}),
    ...(typeof r.apparelSlug === "string" ? { apparelSlug: r.apparelSlug } : {}),
    ...(typeof r.productVariantId === "string" ? { productVariantId: r.productVariantId } : {}),
    ...(cap !== null ? { stockQty: cap } : {}),
    ...(teamwearDecals ? { decals: teamwearDecals } : {}),
    ...(hasTeamwearFlag && typeof r.teamwearLabel === "string" ? { teamwearLabel: r.teamwearLabel.slice(0, 40) } : {}),
    ...(typeof r.materialFinishSlug === "string" && r.materialFinishSlug.length <= 40 ? { materialFinishSlug: r.materialFinishSlug } : {}),
    ...(fabric ? { fabricThicknessSlug: fabric } : {}),
    // Kompat: legacy `isAcidWash` (nonaktif Sep 2026) SENGAJA tak disalin —
    // cart lama tetap lolos sanitasi, tanpa surcharge.
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
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
          const cap = capFor(newItem.stockQty ?? (existingIndex > -1 ? state.items[existingIndex]!.stockQty : undefined));
          // Stok habis → tolak diam-diam JANGAN (caller tampilkan pesan);
          // di sini kembalikan state tanpa perubahan agar drawer tak terbuka palsu.
          if (cap !== null && cap <= 0) return state;
          const addQty = Math.max(1, Math.floor(newItem.quantity || 1));
          if (existingIndex > -1) {
            const updated = [...state.items];
            const prev = updated[existingIndex]!;
            const nextQty = cap !== null ? Math.min(prev.quantity + addQty, cap) : prev.quantity + addQty;
            updated[existingIndex]! = {
              ...prev,
              quantity: nextQty,
              // Segarkan stok terbaru dari katalog bila ada.
              ...(cap !== null ? { stockQty: cap } : {}),
            };
            return { items: updated, isCartOpen: true };
          }
          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity: cap !== null ? Math.min(addQty, cap) : addQty,
              },
            ],
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
                const cap = capFor(item.stockQty);
                const newQty = item.quantity + delta;
                // Kunci atas di stok (jangan gagal diam-diam — drawer kunci tombol +).
                if (cap !== null && newQty > cap) return { ...item, quantity: cap };
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter(Boolean) as CartProductItem[],
        }));
      },

      // Refresh harga basi dari server: cocokkan per baris via productVariantId
      // (fallback id lama), update priceIdr + stockQty, jepit qty ke stok.
      // Kembalikan { updated, diffIdr } agar UI tampilkan selisih eksplisit.
      syncPrices: (server) => {
        const before = get().items.reduce((a, it) => a + it.priceIdr * it.quantity, 0);
        let updated = 0;
        set((state) => ({
          items: state.items.map((item) => {
            const key = item.productVariantId || item.id;
            const fresh = server[key];
            if (!fresh) return item;
            let next = item;
            if (typeof fresh.priceIdr === "number" && Number.isFinite(fresh.priceIdr) && fresh.priceIdr >= 0) {
              const p = Math.floor(fresh.priceIdr);
              if (p !== item.priceIdr) {
                next = { ...next, priceIdr: p };
                updated += 1;
              }
            }
            if (typeof fresh.stockQty === "number" && Number.isFinite(fresh.stockQty) && fresh.stockQty >= 0) {
              const cap = Math.floor(fresh.stockQty);
              if (cap !== item.stockQty) {
                next = { ...next, stockQty: cap };
              }
              if (next.quantity > cap && cap > 0) {
                next = { ...next, quantity: cap };
                updated += 1;
              }
            }
            return next;
          }),
        }));
        const after = get().items.reduce((a, it) => a + it.priceIdr * it.quantity, 0);
        return { updated, diffIdr: after - before };
      },

      // Catatan: JANGAN panggil clearCart() pasca-POST /api/checkout.
      // Order sudah dibuat server saat itu; cart hanya dikosongkan setelah
      // bayar terkonfirmasi (successEvent Duitku / redirect paymentUrl) dari
      // CheckoutModal — agar tutup-pop/retry tak kehilangan isi keranjang.
      clearCart: () => set({ items: [] }),

      getTotalCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((acc, item) => acc + item.priceIdr * item.quantity, 0);
      },
    }),
    {
      name: "kaos-kami-cart-v1",
      storage: createJSONStorage(() => localStorage),
      // Hanya `items` yang dipersist — `isCartOpen` (state UI sesaat) jangan
      // ikut tersimpan agar drawer tak terbuka sendiri saat reload.
      partialize: (s) => ({ items: s.items }) as CartStore,
      // Merge bijak: localStorage bisa korup/diutak-atik — sanitasi tiap baris,
      // buang yang tak valid, jepit qty ke stok bila diketahui.
      merge: (persisted, current) => {
        const rawItems =
          persisted && typeof persisted === "object" && Array.isArray((persisted as { items?: unknown }).items)
            ? ((persisted as { items: unknown[] }).items)
            : [];
        const items = rawItems
          .map(sanitizeItem)
          .filter((x): x is CartProductItem => x !== null);
        return { ...current, items };
      },
    }
  )
);
