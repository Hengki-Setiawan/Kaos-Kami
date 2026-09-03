import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from '@/store/useMobileStudioStore';
import { haptic } from '@/lib/bridge/haptics';

export interface SavedDesign {
  id: string;
  title: string;
  apparelType: ApparelType;
  colorHex: string;
  colorName: string;
  decalDataUrl: string | null;
  printWidthCm: number;
  printHeightCm: number;
  savedAt: string;
}

export interface SavedDesignsState {
  designs: SavedDesign[];
  saveDesign: (design: Omit<SavedDesign, 'id' | 'savedAt'>) => void;
  deleteDesign: (id: string) => void;
  getDesign: (id: string) => SavedDesign | undefined;
}

export const useSavedDesignsStore = create<SavedDesignsState>()(
  persist(
    (set, get) => ({
      designs: [
        {
          id: 'design-preset-1',
          title: 'Streetwear Makassar Minimalist',
          apparelType: 'tshirt',
          colorHex: '#0E0E10',
          colorName: 'Obsidian Black',
          decalDataUrl: null,
          printWidthCm: 28.5,
          printHeightCm: 22.0,
          savedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],

      saveDesign: (newDesign) => {
        haptic.success();
        set((state) => ({
          designs: [
            {
              ...newDesign,
              id: `design-${Date.now()}`,
              savedAt: new Date().toISOString(),
            },
            ...state.designs,
          ],
        }));
      },

      deleteDesign: (id) => {
        haptic.tapMedium();
        set((state) => ({
          designs: state.designs.filter((d) => d.id !== id),
        }));
      },

      getDesign: (id) => {
        return get().designs.find((d) => d.id === id);
      },
    }),
    {
      name: 'kaoskami_saved_designs_offline',
    }
  )
);
