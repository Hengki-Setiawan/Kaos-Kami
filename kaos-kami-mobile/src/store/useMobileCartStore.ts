import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from './useMobileStudioStore';
import type { MobileDecalSide } from '@/lib/3d/mobileScaleCalibration';
import { clampMobileDecalXY, mobileMaxDecalScaleUnits, validSidesForMobile } from '@/lib/3d/mobileScaleCalibration';
import { haptic } from '@/lib/bridge/haptics';
import { preferencesJsonStorage } from '@/lib/offline/preferencesStorage';

/**
 * Snapshot satu lapis sablon per item cart (kontrak = DecalLayerSchema web:
 * id/url/targetSide/x/y/scale/rotation/opacity — 7 sisi).
 * Tiap item membawa transformnya SENDIRI (bukan satu transform global studio
 * saat checkout) sehingga 2 desain beda posisi/sisi tak saling timpa.
 */
export interface CartDecalSnapshot {
  id: string;
  url: string;
  targetSide: MobileDecalSide;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

/** Normalisasi snapshot decal cart ke batas kontrak server (murni). */
export function sanitizeCartDecal(apparel: string, d: Partial<CartDecalSnapshot> & { url: string }, fallbackId: string): CartDecalSnapshot {
  // Sisi tak-valid untuk apparel tsb (mis. hood di kaos) → 'front' agar tak
  // melayang di placement tudung; cermin sanitizeMobileDecal di studio store.
  const valid = validSidesForMobile(apparel);
  const side: MobileDecalSide = valid.includes(d.targetSide as MobileDecalSide)
    ? (d.targetSide as MobileDecalSide)
    : 'front';
  const c = clampMobileDecalXY(
    side,
    typeof d.x === 'number' ? d.x : 0,
    typeof d.y === 'number' ? d.y : 0.04
  );
  const maxS = Math.max(0.02, mobileMaxDecalScaleUnits(apparel, side));
  const num = (v: unknown, lo: number, hi: number, fb: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb;
  return {
    id: typeof d.id === 'string' && d.id ? d.id.slice(0, 64) : fallbackId,
    url: d.url,
    targetSide: side,
    x: c.x,
    y: c.y,
    scale: num(d.scale, 0.02, maxS, Math.min(0.22, maxS)),
    rotation: num(d.rotation, -180, 180, 0),
    opacity: num(d.opacity, 0, 1, 1),
  };
}

export interface CartItem {
  id: string;
  apparelType: ApparelType;
  apparelTitle: string;
  colorHex: string;
  colorName: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  basePrice: number;
  sablonPrice: number;
  totalPrice: number;
  /** Kompat tunggal (cermin decals[0]; baca baru → decals[]). */
  decalUrl: string | null;
  printWidthCm: number;
  printHeightCm: number;
  // Snapshot gizmo per-item: decals[] = sumber kebenaran; field tunggal di
  // bawah cermin decals[0] untuk pembaca lama. Mobile front-only dulu:
  // kini 7 sisi penuh ('front' | 'back' | lengan | samping | 'hood').
  decals: CartDecalSnapshot[];
  /** @deprecated cermin decals[0].x */
  decalX: number;
  /** @deprecated cermin decals[0].y */
  decalY: number;
  /** @deprecated cermin decals[0].scale */
  decalScale: number;
  /** @deprecated cermin decals[0].rotation */
  decalRotation: number;
  /** @deprecated cermin decals[0].targetSide (front/back lama) */
  decalTargetSide: 'front' | 'back';
  // Q2+Q8 (kompat sesi konkuren): varian studio per item — opsional agar
  // cache lama lolos; server hitung ulang (sumber kebenaran).
  sleeveColorHex?: string;
  collarColorHex?: string;
  materialSlug?: string;
  artworkText?: string;
  decalOpacity?: number;
  createdAt: string;
}

export interface MobileCartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'createdAt' | 'totalPrice' | 'decalX' | 'decalY' | 'decalScale' | 'decalRotation' | 'decalTargetSide'> & Partial<Pick<CartItem, 'decalX' | 'decalY' | 'decalScale' | 'decalRotation' | 'decalTargetSide'>>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  /**
   * P5 parity (pola web fetchServerPriceMap disederhanakan): sinkronkan
   * basePrice item dari katalog server segar. Kembalikan selisih subtotal
   * (baru − lama); 0 = tak ada perubahan. Tak pernah throw.
   */
  syncBasePrices: (priceMap: Record<string, number>) => number;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useMobileCartStore = create<MobileCartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        haptic.addToCart();
        set((state) => {
          const id = `item-${Date.now()}`;
          const totalPrice = (newItem.basePrice + newItem.sablonPrice) * newItem.quantity;
          const decals = Array.isArray((newItem as { decals?: unknown }).decals)
            ? ((newItem as { decals?: Array<Partial<CartDecalSnapshot> & { url: string }> }).decals ?? [])
                .filter((d) => d && typeof d.url === 'string' && d.url.length > 0)
                .slice(0, 10)
                .map((d, i) => sanitizeCartDecal(newItem.apparelType, d, `decal-${id}-${i}`))
            : [];
          const first = decals[0];
          const fullItem: CartItem = {
            ...newItem,
            decals,
            // Kompat: field tunggal cermin decals[0] (fallback default store).
            decalX: first?.x ?? (newItem as Partial<CartItem>).decalX ?? 0,
            decalY: first?.y ?? (newItem as Partial<CartItem>).decalY ?? 0.04,
            decalScale: first?.scale ?? (newItem as Partial<CartItem>).decalScale ?? 0.22,
            decalRotation: first?.rotation ?? (newItem as Partial<CartItem>).decalRotation ?? 0,
            decalTargetSide: (first?.targetSide === 'back' ? 'back' : 'front'),
            id,
            totalPrice,
            createdAt: new Date().toISOString(),
          };
          return { items: [fullItem, ...state.items] };
        });
      },

      removeItem: (id) => {
        haptic.tapMedium();
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        haptic.selection();
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity,
                  totalPrice: (item.basePrice + item.sablonPrice) * quantity,
                }
              : item
          ),
        }));
      },

      syncBasePrices: (priceMap) => {
        try {
          const before = get().items.reduce((a, it) => a + (it.basePrice + it.sablonPrice) * it.quantity, 0);
          set((state) => ({
            items: state.items.map((it) => {
              const fresh = priceMap[it.apparelType];
              if (typeof fresh !== 'number' || !Number.isFinite(fresh) || fresh <= 0) return it;
              if (fresh === it.basePrice) return it;
              return { ...it, basePrice: Math.floor(fresh), totalPrice: (Math.floor(fresh) + it.sablonPrice) * it.quantity };
            }),
          }));
          const after = get().items.reduce((a, it) => a + (it.basePrice + it.sablonPrice) * it.quantity, 0);
          return after - before;
        } catch {
          return 0;
        }
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'kaoskami_mobile_cart',
      storage: preferencesJsonStorage(),
      // Versi skema cache (audit N12): mismatch = buang cache lama agar
      // bentuk item basi tak merusak checkout.
      // v2: migrasi slug legacy 'jacket' → canonical 'shirt' (K-B).
      // v3: snapshot gizmo per-item (decalX/decalY/decalScale/decalRotation/
      // decalTargetSide); item lama tanpa snapshot diisi default store
      // (x 0, y 0.04, scale 0.22, rot 0, front) agar lolos Zod server.
      // v4 (P1 parity): snapshot N-decal per item (decals[]); item v3 lama
      // (satu decal) dibungkus jadi decals[1] agar 2-desain lama tak hilang.
      version: 4,
      migrate: (persisted: any, version?: number) => {
        if (!persisted || typeof persisted !== 'object') return { items: [] } as any;
        const items = Array.isArray((persisted as any).items) ? (persisted as any).items : [];
        return {
          items: items.map((it: any) => {
            const next = { ...it };
            if (next?.apparelType === 'jacket') next.apparelType = 'shirt';
            // v2→v3: item lama belum punya snapshot gizmo → default store.
            if (typeof next.decalX !== 'number' || !Number.isFinite(next.decalX)) next.decalX = 0;
            if (typeof next.decalY !== 'number' || !Number.isFinite(next.decalY)) next.decalY = 0.04;
            if (typeof next.decalScale !== 'number' || !Number.isFinite(next.decalScale)) next.decalScale = 0.22;
            if (typeof next.decalRotation !== 'number' || !Number.isFinite(next.decalRotation)) next.decalRotation = 0;
            if (next.decalTargetSide !== 'back') next.decalTargetSide = 'front';
            // v3→v4: bungkus snapshot tunggal jadi decals[1].
            if (!Array.isArray(next.decals)) {
              next.decals = next.decalUrl
                ? [
                    sanitizeCartDecal(next.apparelType ?? 'tshirt', {
                      id: `decal-${next.id ?? 'legacy'}`,
                      url: next.decalUrl,
                      targetSide: next.decalTargetSide,
                      x: next.decalX,
                      y: next.decalY,
                      scale: next.decalScale,
                      rotation: next.decalRotation,
                      opacity: 1,
                    }, `decal-${next.id ?? 'legacy'}`),
                  ]
                : [];
            }
            void version;
            return next;
          }),
        } as any;
      },
    }
  )
);
