import { create } from 'zustand';

export type ApparelType =
  | 'tshirt'
  | 'hoodie'
  | 'shirt'
  | 'longsleeve'
  | 'crewneck'
  | 'sweater'
  | 'cap'
  | 'pants'
  | 'shorts';
export type AnimationPreset = 'idle' | 'walking' | 'waving' | 'spin' | 'none';
export type CameraAngle = 'front' | 'back' | 'left' | 'right' | 'perspective';

/**
 * Status ketersediaan per apparel mobile — cermin web
 * (tshirt/longsleeve/crewneck/hoodie/shirt) + ekstensi katalog
 * (sweater = alias crewneck, cap, pants).
 * - mockupEnabled: renderer HP sudah bisa tampilkan mockup 3D penuh.
 * - orderable: boleh masuk keranjang + checkout (server tetap sumber
 *   kebenaran; flag ini hanya penjaga dini client-side ≈400).
 * 4 aktif (tshirt/longsleeve/hoodie/shirt) = true/true.
 * crewneck = false/false — TETAP dikunci di picker (scope tugas Sweater/Cap);
 *   render defensif memakai MobileSweaterModel (mesh web crewneck MEMANG
 *   sweater.glb), pesan mengarahkan ke Sweater Pack.
 * sweater = true/false (MOCKUP-SAJA, cermin web orderable false):
 *   public/models/sweater.glb + sweater.draco.glb direstore (lihat
 *   MobileSweaterModel untuk kalibrasi 102.4/surfaceZ 0.151); order TETAP
 *   diblokir client (≈400) + server wajib menolak ulang.
 * cap = true/false (MOCKUP-SAJA, cermin web orderable false):
 *   public/models/cap.glb + cap.draco.glb direstore (lihat MobileCapModel;
 *   units/cm 50.0 + maxWidth 12cm = ASUMSI+TODO, web tak punya spek fisik
 *   cap); order TETAP diblokir client (≈400) + server wajib menolak ulang.
 * pants = true/false (cermin web orderable false) — MOCKUP SAJA:
 *   public/models/pants.glb disalin dari Asset 3D/github/ 12 Sep 2026
 *   (1.16MB, 1 mesh/1 material/1 tekstur, TERUKUR bbox 0.328×1.003×0.244,
 *   Y 0.11–1.11). Renderer mobile tampilkan (center Box3, skala native);
 *   order TETAP diblokir client (≈400) + server wajib menolak ulang.
 * shorts = true/false (cermin web orderable false) — MOCKUP SAJA, pola
 *   pants persis: public/models/shorts.glb disalin dari Asset 3D/github/
 *   12 Sep 2026 (754 verts, 1 mesh/1 material/1 PNG 1024, TERUKUR bbox
 *   0.332×0.585×0.240, Y −0.32…0.26). Renderer mobile tampilkan (center
 *   Box3, skala native); order TETAP diblokir client (≈400) + server
 *   wajib menolak ulang.
 */
export interface MobileApparelMeta {
  mockupEnabled: boolean;
  orderable: boolean;
  /** Pesan jujur saat pengguna memilih item terkunci. */
  lockedMessage: string;
  /** Nama file GLB bila ada (null = tak ada file). */
  modelFile: string | null;
}

export const MOBILE_APPAREL_META: Record<ApparelType, MobileApparelMeta> = {
  tshirt: { mockupEnabled: true, orderable: true, lockedMessage: '', modelFile: 'tee-basic.glb' },
  longsleeve: { mockupEnabled: true, orderable: true, lockedMessage: '', modelFile: 'longsleeve.glb' },
  hoodie: { mockupEnabled: true, orderable: true, lockedMessage: '', modelFile: 'hoodie-blue.glb' },
  shirt: { mockupEnabled: true, orderable: true, lockedMessage: '', modelFile: 'jacket.glb' },
  crewneck: {
    mockupEnabled: true,
    orderable: true,
    lockedMessage: '',
    modelFile: 'sweater.glb',
  },
  sweater: {
    mockupEnabled: true,
    orderable: true,
    lockedMessage: '',
    modelFile: 'sweater.glb',
  },
  cap: {
    mockupEnabled: true,
    orderable: false,
    lockedMessage: 'Topi (cap): mockup 3D bisa dicoba di studio HP — pemesanan SEGERA dibuka (simpan & checkout HP menolak).',
    modelFile: 'cap.glb',
  },
  pants: {
    mockupEnabled: true,
    orderable: false,
    lockedMessage: 'Celana (pants): mockup 3D bisa dicoba di studio HP — pemesanan SEGERA dibuka (simpan & checkout HP menolak).',
    modelFile: 'pants.glb',
  },
  shorts: {
    mockupEnabled: true,
    orderable: false,
    lockedMessage: 'Celana pendek (shorts): mockup 3D bisa dicoba di studio HP — pemesanan SEGERA dibuka (simpan & checkout HP menolak).',
    modelFile: 'shorts.glb',
  },
};

/** Penjaga dini client-side (≈400): true bila apparel boleh di-order. */
export function isApparelOrderable(apparel: string): boolean {
  return (MOBILE_APPAREL_META[apparel as ApparelType]?.orderable ?? false) === true;
}

/** True bila renderer HP sudah bisa mockup penuh. */
export function isApparelMockupEnabled(apparel: string): boolean {
  return (MOBILE_APPAREL_META[apparel as ApparelType]?.mockupEnabled ?? false) === true;
}

/**
 * Multiplier unit-3D → cm TERUKUR dari bounding-box GLB (selaras web scaleCalibration.ts).
 * tshirt 56/0.550=101.8 · hoodie 60/0.631=95.1 · shirt via tinggi 74/1.065=69.5 · longsleeve 56/0.794=70.5
 * crewneck/sweater 102.4 = cermin web FASE 13 APPAREL_PHYSICAL_SPECS.crewneck.meshMultiplier
 * cap 50.0 = panel depan snapback 20cm
 * pants 103.7 = cermin web APPAREL_PHYSICAL_SPECS.pants.meshMultiplier (cargo pants)
 * shorts 131.9 = cermin web APPAREL_PHYSICAL_SPECS.shorts.meshMultiplier (denim shorts)
 */
export const MOBILE_UNITS_TO_CM: Record<ApparelType, number> = {
  tshirt: 101.8,
  hoodie: 95.1,
  shirt: 69.5,
  longsleeve: 70.5,
  crewneck: 102.4,
  sweater: 102.4,
  cap: 50.0,
  pants: 103.7,
  shorts: 131.9,
};

/** Lebar cetak maks (cm) per apparel mobile — cermin web APPAREL_PHYSICAL_SPECS.
 *  crewneck/sweater 30 = cermin web maxFrontWidthCm (30×38 depan).
 *  cap 12 = ASUMSI + TODO (area DTF/bordir panel depan topi; web tak punya
 *  speknya — fallback efektif web = spek tshirt 30cm). Orderable false → tak
 *  dipakai produksi.
 *  pants 25 & shorts 22 = cermin web maxFrontWidthCm (placeholder jujur). */
export const MOBILE_MAX_WIDTH_CM: Record<ApparelType, number> = {
  tshirt: 30,
  hoodie: 28,
  shirt: 14,
  longsleeve: 30,
  crewneck: 30,
  sweater: 30,
  cap: 12,
  pants: 25,
  shorts: 22,
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

  // PERF (idle 0fps): default 'none' agar Canvas frameloop="demand" saat idle.
  // Animasi hanya jalan saat user memilih eksplisit / jendela transien 800ms
  // (lihat CanvasStageMobile transientMotion, tiru web CanvasStage).
  activeAnimation: 'none',
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

      // Hitung ulang DPI dari piksel asli PER-DESAIN setiap skala berubah.
      // Fast-path sync via cermin localStorage (map kaoskami_decal_px_map +
      // pointer current); nilai master di Preferences (lihat persistentKeys).
      let dpi: number | null = state.decalDpi;
      try {
        const cur = typeof window !== 'undefined' ? localStorage.getItem('kaoskami_decal_px_current') : null;
        let px = 0;
        if (cur) {
          try {
            const map = JSON.parse(localStorage.getItem('kaoskami_decal_px_map') || '{}');
            px = Number(map[cur] || 0);
          } catch {}
        }
        if (!px) px = Number(localStorage.getItem('kaoskami_decal_px') || 0); // migrasi global lama
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
      activeAnimation: 'none',
      cameraAngle: 'perspective',
      activeFace: 'front',
    }),
}));
