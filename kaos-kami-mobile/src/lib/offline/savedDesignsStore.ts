import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApparelType } from '@/store/useMobileStudioStore';
import type { MobileDecalSide } from '@/lib/3d/mobileScaleCalibration';
import { haptic } from '@/lib/bridge/haptics';
import { preferencesJsonStorage } from '@/lib/offline/preferencesStorage';

/** Lapis sablon tersimpan per desain (P1 parity — 2 desain tak timpa). */
export interface SavedDecalSnapshot {
  id: string;
  url: string;
  targetSide: MobileDecalSide;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface SavedDesign {
  id: string;
  title: string;
  apparelType: ApparelType;
  colorHex: string;
  colorName: string;
  /** Kompat tunggal (cermin decals[0]; baca baru → decals[]). */
  decalDataUrl: string | null;
  /** Snapshot N-decal (sumber kebenaran; opsional agar cache lama lolos). */
  decals?: SavedDecalSnapshot[];
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
          decals: [],
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
              // Kompat: decalDataUrl selalu cermin decals[0] bila decals ada.
              decalDataUrl:
                newDesign.decalDataUrl ??
                (Array.isArray(newDesign.decals) && newDesign.decals.length > 0
                  ? newDesign.decals[0]?.url ?? null
                  : null),
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
      // v4 (P1 parity): decals[] (N-lapis); cache lama tanpa decals →
      // dibungkus dari decalDataUrl tunggal agar desain lama tak hilang.
      version: 4,
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
            if (!Array.isArray(out?.decals)) {
              out = {
                ...out,
                decals: out?.decalDataUrl
                  ? [
                      {
                        id: `decal-${out?.id ?? 'legacy'}`,
                        url: out.decalDataUrl,
                        targetSide: 'front',
                        x: 0,
                        y: 0.04,
                        scale: 0.22,
                        rotation: 0,
                        opacity: 1,
                      },
                    ]
                  : [],
              };
            }
            return out;
          }),
        } as any;
      },
    }
  )
);
