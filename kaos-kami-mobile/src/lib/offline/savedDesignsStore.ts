import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from '@/store/useMobileStudioStore';
import { haptic } from '@/lib/bridge/haptics';
import { preferencesJsonStorage } from '@/lib/offline/preferencesStorage';

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
  /** Contoh bawaan (bukan karya user) — disaring dari sync + berlabel. */
  isSample?: boolean;
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
          // Sampel: 28.0cm = batas depan hoodie (saku kangaroo, selaras web
          // APPAREL_PHYSICAL_SPECS.hoodie.maxFrontWidthCm + MOBILE_MAX_WIDTH_CM).
          // JANGAN 28.5 (melebihi hoodie; membingungkan saat sampel dibuka di hoodie).
          printWidthCm: 28.0,
          printHeightCm: 22.0,
          savedAt: new Date(Date.now() - 86400000).toISOString(),
          isSample: true,
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
      storage: preferencesJsonStorage(),
      // v3: migrasi slug legacy 'jacket' → canonical 'shirt' (K-B) +
      // koreksi sampel preset 28.5 → 28.0cm (batas depan hoodie).
      version: 3,
      migrate: (persisted: any) => {
        if (!persisted || typeof persisted !== 'object') return { designs: [] } as any;
        const designs = Array.isArray((persisted as any).designs) ? (persisted as any).designs : [];
        return {
          designs: designs.map((d: any) => {
            let out = d;
            if (d?.apparelType === 'jacket') out = { ...out, apparelType: 'shirt' };
            if (out?.id === 'design-preset-1' && Number(out?.printWidthCm) === 28.5) {
              out = { ...out, printWidthCm: 28.0 };
            }
            return out;
          }),
        } as any;
      },
    }
  )
);
