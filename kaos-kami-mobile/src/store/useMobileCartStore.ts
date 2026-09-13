import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from './useMobileStudioStore';
import { haptic } from '@/lib/bridge/haptics';
import { preferencesJsonStorage } from '@/lib/offline/preferencesStorage';

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
  decalUrl: string | null;
  printWidthCm: number;
  printHeightCm: number;
  // Snapshot gizmo per-item (kontrak = DecalLayerSchema web: x/y/scale/
  // rotation/targetSide). Diisi saat addItem dari useMobileStudioStore agar
  // tiap item membawa transformnya sendiri (bukan satu transform global
  // studio saat checkout). Mobile front-only: 'front' | 'back'.
  decalX: number;
  decalY: number;
  decalScale: number;
  decalRotation: number;
  decalTargetSide: 'front' | 'back';
  createdAt: string;
}

export interface MobileCartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'createdAt' | 'totalPrice'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
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
          const fullItem: CartItem = {
            ...newItem,
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
      version: 3,
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
            void version;
            return next;
          }),
        } as any;
      },
    }
  )
);
