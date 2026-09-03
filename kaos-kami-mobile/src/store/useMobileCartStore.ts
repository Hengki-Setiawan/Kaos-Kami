import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from './useMobileStudioStore';
import { haptic } from '@/lib/bridge/haptics';

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
      items: [
        {
          id: 'demo-item-1',
          apparelType: 'tshirt',
          apparelTitle: 'Kaos Heavyweight 280 GSM',
          colorHex: '#0E0E10',
          colorName: 'Obsidian Black',
          size: 'L',
          quantity: 1,
          basePrice: 125000,
          sablonPrice: 35000,
          totalPrice: 160000,
          decalUrl: null,
          printWidthCm: 28.5,
          printHeightCm: 22.0,
          createdAt: new Date().toISOString(),
        },
      ],

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
    }
  )
);
