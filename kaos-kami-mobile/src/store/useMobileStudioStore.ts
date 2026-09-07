import { create } from 'zustand';

export type ApparelType = 'tshirt' | 'hoodie' | 'jacket' | 'longsleeve';
export type AnimationPreset = 'idle' | 'walking' | 'waving' | 'spin' | 'none';
export type CameraAngle = 'front' | 'back' | 'left' | 'right' | 'perspective';

/**
 * Multiplier unit-3D → cm TERUKUR dari bounding-box GLB (selaras web scaleCalibration.ts).
 * tshirt 56/0.550=101.8 · hoodie 60/0.631=95.1 · jacket via tinggi 74/1.065=69.5 · longsleeve 56/0.794=70.5
 */
export const MOBILE_UNITS_TO_CM: Record<ApparelType, number> = {
  tshirt: 101.8,
  hoodie: 95.1,
  jacket: 69.5,
  longsleeve: 70.5,
};

/** Lebar cetak maks (cm) per apparel mobile — cermin web APPAREL_PHYSICAL_SPECS. */
export const MOBILE_MAX_WIDTH_CM: Record<ApparelType, number> = {
  tshirt: 30,
  hoodie: 28,
  jacket: 14,
  longsleeve: 30,
};

/** Skala 3D maksimal agar klaim cm tepat menyentuh batas cetak. */
export function mobileMaxScaleUnits(apparel: ApparelType): number {
  return (MOBILE_MAX_WIDTH_CM[apparel] ?? 30) / (MOBILE_UNITS_TO_CM[apparel] ?? 100);
}

export interface MobileStudioState {
  apparelType: ApparelType;
  color: string;
  sleeveColor: string;
  collarColor: string;

  // Decal parameters
  decalUrl: string | null;
  decalPosition: [number, number, number];
  decalScale: [number, number, number];
  decalRotation: number;

  // Real world DTF scale (max 30.0 cm clamped)
  printWidthCm: number;
  printHeightCm: number;
  offsetFromCollarCm: number;

  // Studio motion and camera
  activeAnimation: AnimationPreset;
  cameraAngle: CameraAngle;
  activeFace: 'front' | 'back';

  // Gizmo & quality
  isGizmoDragging: boolean;
  decalDpi: number | null;

  // Actions
  setApparelType: (type: ApparelType) => void;
  setColor: (hex: string) => void;
  setSleeveColor: (hex: string) => void;
  setCollarColor: (hex: string) => void;
  setDecalUrl: (url: string | null) => void;
  setDecalTransform: (
    pos: [number, number, number],
    scale: [number, number, number],
    rot: number,
    widthCm?: number,
    heightCm?: number
  ) => void;
  setActiveAnimation: (anim: AnimationPreset) => void;
  setCameraAngle: (angle: CameraAngle) => void;
  setActiveFace: (face: 'front' | 'back') => void;
  setGizmoDragging: (v: boolean) => void;
  setDecalDpi: (dpi: number | null) => void;
  resetStudio: () => void;
}

export const useMobileStudioStore = create<MobileStudioState>((set) => ({
  apparelType: 'tshirt',
  color: '#0E0E10',
  sleeveColor: '#0E0E10',
  collarColor: '#0E0E10',

  decalUrl: null,
  decalPosition: [0, 0.04, 0.15],
  decalScale: [0.22, 0.22, 0.22],
  decalRotation: 0,

  printWidthCm: 22.0,
  printHeightCm: 22.0,
  offsetFromCollarCm: 7.5,

  activeAnimation: 'idle',
  cameraAngle: 'perspective',
  activeFace: 'front',

  isGizmoDragging: false,
  decalDpi: null,

  setApparelType: (apparelType) => set({ apparelType }),
  setColor: (color) => set({ color }),
  setSleeveColor: (sleeveColor) => set({ sleeveColor }),
  setCollarColor: (collarColor) => set({ collarColor }),
  setDecalUrl: (decalUrl) => set({ decalUrl }),

  setDecalTransform: (decalPosition, decalScale, decalRotation, widthCm, heightCm) =>
    set((state) => {
      // Kalibrasi terukur per apparel (selaras web) — clamped ke printhead DTF 30.0 cm.
      const mult = MOBILE_UNITS_TO_CM[state.apparelType] ?? 100;
      const rawWidth = widthCm ?? decalScale[0] * mult;
      const rawHeight = heightCm ?? decalScale[1] * mult;
      const clampedWidth = Math.min(30.0, Math.max(5.0, rawWidth));
      const clampedHeight = Math.min(42.0, Math.max(5.0, rawHeight));

      // Hitung ulang DPI dari piksel asli setiap skala berubah (jujur per-cm).
      let dpi: number | null = state.decalDpi;
      try {
        const px = Number(localStorage.getItem('kaoskami_decal_px') || 0);
        dpi = px > 0 ? Math.max(0, Math.min(2400, Math.round(px / (clampedWidth / 2.54)))) : null;
      } catch {}

      return {
        decalPosition,
        decalScale,
        decalRotation,
        printWidthCm: Number(clampedWidth.toFixed(1)),
        printHeightCm: Number(clampedHeight.toFixed(1)),
        decalDpi: dpi,
      };
    }),

  setActiveAnimation: (activeAnimation) => set({ activeAnimation }),
  setCameraAngle: (cameraAngle) => set({ cameraAngle }),
  setActiveFace: (activeFace) =>
    set({
      activeFace,
      cameraAngle: activeFace === 'front' ? 'front' : 'back',
      decalPosition: activeFace === 'front' ? [0, 0.04, 0.15] : [0, 0.04, -0.15],
    }),
  setGizmoDragging: (isGizmoDragging) => set({ isGizmoDragging }),
  setDecalDpi: (decalDpi) => set({ decalDpi }),

  resetStudio: () =>
    set({
      apparelType: 'tshirt',
      color: '#0E0E10',
      sleeveColor: '#0E0E10',
      collarColor: '#0E0E10',
      decalUrl: null,
      decalPosition: [0, 0.04, 0.15],
      decalScale: [0.22, 0.22, 0.22],
      decalRotation: 0,
      printWidthCm: 22.0,
      printHeightCm: 22.0,
      offsetFromCollarCm: 7.5,
      activeAnimation: 'idle',
      cameraAngle: 'perspective',
      activeFace: 'front',
    }),
}));
