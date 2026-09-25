import { create } from 'zustand';
import {
  clampMobileDecalXY,
  mobileMaxDecalScaleUnits as maxScaleForSide,
  MOBILE_MULTIPLIERS,
  MOBILE_SIDE_BOX_CM,
  MOBILE_SURFACE_Z,
  validSidesForMobile,
  type MobileDecalSide,
} from '@/lib/3d/mobileScaleCalibration';

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

/** F0 Test Lab — cermin web useConfiguratorStore TestLabMode suite. */
export type TestLabMode = 'none' | 'stretch' | 'flashlight' | 'windtunnel';
export type SpecialInkEffect = 'standard' | 'reflective3m' | 'glow' | 'goldfoil' | 'holographic';
export type StretchDirection = 'horizontal' | 'vertical' | 'biaxial';
export type WindDirection = 'front' | 'side' | 'up';

/**
 * Status ketersediaan per apparel mobile — cermin web
 * (tshirt/longsleeve/crewneck/hoodie/shirt) + ekstensi katalog
 * (sweater = alias crewneck, cap, pants).
 * - mockupEnabled: renderer HP sudah bisa tampilkan mockup 3D penuh.
 * - orderable: boleh masuk keranjang + checkout (server tetap sumber
 *   kebenaran; flag ini hanya penjaga dini client-side ≈400).
 * 5 aktif (tshirt/longsleeve/crewneck/hoodie/shirt) = true/true,
 *   cermin web APPAREL_CATALOG (crewneck orderable TRUE di web).
 * crewneck = true/true — BISA dipesan (mesh web crewneck MEMANG sweater.glb
 *   via MobileSweaterModel, BUKAN fallback defensif).
 * sweater = true/false (ALIAS MOCKUP-SAJA — slug 'sweater' TAK ADA di
 *   APPAREL_CATALOG web sehingga server 400 "tidak dikenal"):
 *   public/models/sweater.glb direstore (lihat MobileSweaterModel untuk
 *   kalibrasi); order TETAP diblokir client (≈400) + server wajib menolak
 *   ulang. Pesan lockedMessage tampil di semua jalur (picker/katalog/
 *   save-to-cart/checkout).
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
    orderable: false,
    lockedMessage: 'Sweater Pack: mockup 3D bisa dicoba di studio HP — pilih Crewneck untuk memesan (mesh sama), atau tunggu slug Sweater dibuka server.',
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
 * Multiplier unit-3D → cm TERUKUR (SSOT di lib mobileScaleCalibration;
 * objek ini dipertahankan agar impor lama tak pecah).
 */
export const MOBILE_UNITS_TO_CM: Record<ApparelType, number> = {
  tshirt: MOBILE_MULTIPLIERS['tshirt'] ?? 145.5,
  hoodie: MOBILE_MULTIPLIERS['hoodie'] ?? 105.6,
  shirt: MOBILE_MULTIPLIERS['shirt'] ?? 69.5,
  longsleeve: MOBILE_MULTIPLIERS['longsleeve'] ?? 145.5,
  crewneck: MOBILE_MULTIPLIERS['crewneck'] ?? 163.7,
  sweater: MOBILE_MULTIPLIERS['sweater'] ?? 163.7,
  cap: MOBILE_MULTIPLIERS['cap'] ?? 50.0,
  pants: MOBILE_MULTIPLIERS['pants'] ?? 103.7,
  shorts: MOBILE_MULTIPLIERS['shorts'] ?? 131.9,
};

/** Lebar cetak maks depan (cm) per apparel — SSOT box depan di lib (kompat). */
export const MOBILE_MAX_WIDTH_CM: Record<ApparelType, number> = {
  tshirt: MOBILE_SIDE_BOX_CM['tshirt']?.front.w ?? 30,
  hoodie: MOBILE_SIDE_BOX_CM['hoodie']?.front.w ?? 28,
  // SWAP 20 Sep 2026: pullover tanpa resleting → depan full 28 (cermin web).
  shirt: MOBILE_SIDE_BOX_CM['shirt']?.front.w ?? 28,
  longsleeve: MOBILE_SIDE_BOX_CM['longsleeve']?.front.w ?? 30,
  crewneck: MOBILE_SIDE_BOX_CM['crewneck']?.front.w ?? 30,
  sweater: MOBILE_SIDE_BOX_CM['sweater']?.front.w ?? 30,
  cap: MOBILE_SIDE_BOX_CM['cap']?.front.w ?? 12,
  pants: MOBILE_SIDE_BOX_CM['pants']?.front.w ?? 25,
  shorts: MOBILE_SIDE_BOX_CM['shorts']?.front.w ?? 22,
};

/** Skala 3D maksimal sisi DEPAN (kompat lama; per-sisi pakai lib langsung). */
export function mobileMaxScaleUnits(apparel: ApparelType): number {
  return maxScaleForSide(apparel, 'front');
}

/** SSOT surfaceZ (kompat — pindahan ke lib; impor lama tetap jalan). */
export const MOBILE_SURFACE_Z_COMPAT: Record<ApparelType, number> = {
  tshirt: MOBILE_SURFACE_Z['tshirt'] ?? 0.151,
  longsleeve: MOBILE_SURFACE_Z['longsleeve'] ?? 0.151,
  hoodie: MOBILE_SURFACE_Z['hoodie'] ?? 0.177,
  shirt: MOBILE_SURFACE_Z['shirt'] ?? 0.07,
  crewneck: MOBILE_SURFACE_Z['crewneck'] ?? 0.151,
  sweater: MOBILE_SURFACE_Z['sweater'] ?? 0.151,
  cap: MOBILE_SURFACE_Z['cap'] ?? 0.091,
  pants: MOBILE_SURFACE_Z['pants'] ?? 0.145,
  shorts: MOBILE_SURFACE_Z['shorts'] ?? 0.145,
};

/**
 * Satu lapis sablon — cermin web `DecalLayer` (constants.ts), disederhanakan:
 * tanpa printPx/name (nama tampil = label sisi). 7 sisi penuh.
 */
export interface MobileDecalLayer {
  id: string;
  url: string;
  targetSide: MobileDecalSide;
  /** Offset X unit 3D (batas SSOT per sisi via clampMobileDecalXY). */
  x: number;
  /** Offset Y unit 3D. */
  y: number;
  /** Skala 3D (0.02 … maks sisi via mobileMaxDecalScaleUnits). */
  scale: number;
  /** Rotasi derajat (±180). */
  rotation: number;
  /** Opasitas 0…1. */
  opacity: number;
}

/** Maks lapis per desain studio (selaras Zod server: maks 10). */
export const MOBILE_MAX_DECALS = 10;

function newDecalId(): string {
  try {
    const u = (globalThis as any)?.crypto?.randomUUID?.();
    if (typeof u === 'string' && u.length >= 8) return `decal-${u}`;
  } catch {
    // abaikan — fallback di bawah
  }
  return `decal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampN(v: unknown, lo: number, hi: number, fb: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb;
}

/** Normalisasi satu patch decal ke batas SSOT sisi+apparel tsb (murni). */
export function sanitizeMobileDecal(
  apparel: string,
  input: Partial<MobileDecalLayer> & { url: string }
): MobileDecalLayer {
  const valid = validSidesForMobile(apparel);
  const side: MobileDecalSide = valid.includes(input.targetSide as MobileDecalSide)
    ? (input.targetSide as MobileDecalSide)
    : 'front';
  const c = clampMobileDecalXY(side, input.x ?? 0, input.y ?? 0.04);
  const maxS = Math.max(0.02, maxScaleForSide(apparel, side));
  return {
    id: typeof input.id === 'string' && input.id ? input.id.slice(0, 64) : newDecalId(),
    url: input.url,
    targetSide: side,
    x: c.x,
    y: c.y,
    scale: clampN(input.scale, 0.02, maxS, Math.min(0.22, maxS)),
    rotation: clampN(input.rotation, -180, 180, 0),
    opacity: clampN(input.opacity, 0, 1, 1),
  };
}

export interface MobileStudioState {
  apparelType: ApparelType;
  color: string;
  sleeveColor: string;
  collarColor: string;

  // Lapis sablon N-desain (P1 parity): tambah tak menimpa (uji 2 desain).
  decals: MobileDecalLayer[];
  /** Decal aktif untuk gizmo/cutout (null = ikut decal terakhir). */
  selectedDecalId: string | null;
  /** Sisi untuk upload BERIKUTNYA (dipilih di sheet Kustomisasi). */
  pendingSide: MobileDecalSide;

  // Kompat tunggal (cermin decal terpilih; JANGAN dibaca untuk render —
  // renderer memakai decals[]). Dipertahankan agar gizmo/cutout/cart lama jalan.
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

  // F0 3D Test Lab (cermin web TestLabMode suite) — stretch semua tier,
  // angin/senter gating di overlay (bukan store).
  testLabMode: TestLabMode;
  specialInkEffect: SpecialInkEffect;
  windTunnelSpeed: number;
  windDirection: WindDirection;
  stretchIntensity: number;
  stretchDirection: StretchDirection;
  flashlightFocus: number;
  /** True saat drag stretch aktif — orbit mati + gizmo null (hemat baterai). */
  isStretchDragging: boolean;
  /** Q7: overlay panduan batas cetak di CanvasStageMobile (default tampil). */
  showPrintZone: boolean;

  // Actions
  setApparelType: (type: ApparelType) => void;
  setColor: (hex: string) => void;
  setSleeveColor: (hex: string) => void;
  setCollarColor: (hex: string) => void;
  /** Tambah lapis (tak menimpa yang ada); kembalikan id atau null bila penuh. */
  addDecal: (input: { url: string; targetSide?: MobileDecalSide; x?: number; y?: number; scale?: number; rotation?: number; opacity?: number }) => string | null;
  updateDecal: (id: string, patch: Partial<Omit<MobileDecalLayer, 'id' | 'url'>> & { url?: string }) => void;
  removeDecal: (id: string) => void;
  clearDecals: () => void;
  setSelectedDecalId: (id: string | null) => void;
  setPendingSide: (side: MobileDecalSide) => void;
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
  setTestLabMode: (mode: TestLabMode) => void;
  setSpecialInkEffect: (effect: SpecialInkEffect) => void;
  setWindTunnelSpeed: (speed: number) => void;
  setWindDirection: (dir: WindDirection) => void;
  setStretchIntensity: (intensity: number) => void;
  setStretchDirection: (dir: StretchDirection) => void;
  setFlashlightFocus: (focus: number) => void;
  setStretchDragging: (v: boolean) => void;
  /** Q7: toggle overlay panduan batas cetak (append kecil, tanpa ubah lain). */
  setShowPrintZone: (v: boolean) => void;
  /**
   * P2 presisi-cm: offset kerah global (0–30cm, dijepit). Satu-satunya
   * penulisan offset — panel angka per-sisi memakainya (offset per-decal
   * = follow-up bila store pecah per sisi).
   */
  setOffsetFromCollarCm: (v: number) => void;
  resetStudio: () => void;
}

/** Ambil decal aktif (selected ?? terakhir ?? null) — murni. */
export function activeDecalOf(state: Pick<MobileStudioState, 'decals' | 'selectedDecalId'>): MobileDecalLayer | null {
  if (state.decals.length === 0) return null;
  const sel = state.selectedDecalId
    ? state.decals.find((d) => d.id === state.selectedDecalId)
    : undefined;
  return sel ?? state.decals[state.decals.length - 1] ?? null;
}

function legacyMirror(decal: MobileDecalLayer | null, apparel: ApparelType): {
  decalUrl: string | null;
  decalPosition: [number, number, number];
  decalScale: [number, number, number];
  decalRotation: number;
} {
  if (!decal) {
    return {
      decalUrl: null,
      decalPosition: [0, 0.04, 0.15],
      decalScale: [0.22, 0.22, 0.22],
      decalRotation: 0,
    };
  }
  const z = MOBILE_SURFACE_Z[apparel] ?? 0.176;
  return {
    decalUrl: decal.url,
    decalPosition: [decal.x, decal.y, decal.targetSide === 'back' ? -(z + 0.01) : z + 0.01],
    decalScale: [decal.scale, decal.scale, decal.scale],
    decalRotation: decal.rotation,
  };
}

function cmForDecal(apparel: ApparelType, decal: MobileDecalLayer | null): { w: number; h: number } {
  if (!decal) return { w: 22.0, h: 22.0 };
  const mult = MOBILE_UNITS_TO_CM[apparel as ApparelType] ?? 100;
  const rawW = decal.scale * mult;
  // Aspek tak diketahui di store (ada di tekstur GPU) → kotak 1:1 + clamp
  // printhead DTF 30.0 cm (angka pasti dihitung renderer per aspek).
  return {
    w: Number(Math.min(30.0, Math.max(5.0, rawW)).toFixed(1)),
    h: Number(Math.min(42.0, Math.max(5.0, rawW)).toFixed(1)),
  };
}

export const useMobileStudioStore = create<MobileStudioState>((set) => ({
  apparelType: 'tshirt',
  color: '#0E0E10',
  sleeveColor: '#0E0E10',
  collarColor: '#0E0E10',

  decals: [],
  selectedDecalId: null,
  pendingSide: 'front',

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

  testLabMode: 'none',
  specialInkEffect: 'standard',
  windTunnelSpeed: 35,
  windDirection: 'front',
  stretchIntensity: 0,
  stretchDirection: 'horizontal',
  flashlightFocus: 0.45,
  isStretchDragging: false,
  showPrintZone: true,

  setApparelType: (apparelType) =>
    set((state) => {
      // Ganti apparel: sisi pending + lapis tak-valid ikut ke 'front' (jujur,
      // bukan render melayang) — URL & transform lain dipertahankan.
      const valid = validSidesForMobile(apparelType);
      const decals = state.decals.map((d) =>
        valid.includes(d.targetSide) ? d : { ...d, targetSide: 'front' as MobileDecalSide }
      );
      const pendingSide = valid.includes(state.pendingSide) ? state.pendingSide : 'front' as MobileDecalSide;
      const active = activeDecalOf({ decals, selectedDecalId: state.selectedDecalId });
      const cm = cmForDecal(apparelType, active);
      return {
        apparelType,
        decals,
        pendingSide,
        ...legacyMirror(active, apparelType),
        printWidthCm: cm.w,
        printHeightCm: cm.h,
      };
    }),
  setColor: (color) => set({ color }),
  setSleeveColor: (sleeveColor) => set({ sleeveColor }),
  setCollarColor: (collarColor) => set({ collarColor }),

  addDecal: (input) => {
    let newId: string | null = null;
    set((state) => {
      if (state.decals.length >= MOBILE_MAX_DECALS) return state;
      if (!input.url) return state;
      const clean = sanitizeMobileDecal(state.apparelType, {
        targetSide: input.targetSide ?? state.pendingSide,
        ...input,
      });
      newId = clean.id;
      const decals = [...state.decals, clean];
      const cm = cmForDecal(state.apparelType, clean);
      return {
        decals,
        selectedDecalId: clean.id,
        ...legacyMirror(clean, state.apparelType),
        printWidthCm: cm.w,
        printHeightCm: cm.h,
      };
    });
    return newId;
  },

  updateDecal: (id, patch) =>
    set((state) => {
      const idx = state.decals.findIndex((d) => d.id === id);
      if (idx < 0) return state;
      const prev = state.decals[idx]!;
      const nextSide =
        patch.targetSide && validSidesForMobile(state.apparelType).includes(patch.targetSide)
          ? patch.targetSide
          : prev.targetSide;
      const c = clampMobileDecalXY(nextSide, patch.x ?? prev.x, patch.y ?? prev.y);
      const maxS = Math.max(0.02, maxScaleForSide(state.apparelType, nextSide));
      const next: MobileDecalLayer = {
        ...prev,
        ...patch,
        id: prev.id,
        targetSide: nextSide,
        x: c.x,
        y: c.y,
        scale: clampN(patch.scale ?? prev.scale, 0.02, maxS, prev.scale),
        rotation: clampN(patch.rotation ?? prev.rotation, -180, 180, prev.rotation),
        opacity: clampN(patch.opacity ?? prev.opacity, 0, 1, prev.opacity),
      };
      const decals = state.decals.map((d, i) => (i === idx ? next : d));
      const active = activeDecalOf({ decals, selectedDecalId: state.selectedDecalId });
      const cm = cmForDecal(state.apparelType, active);
      return {
        decals,
        ...legacyMirror(active, state.apparelType),
        printWidthCm: cm.w,
        printHeightCm: cm.h,
      };
    }),

  removeDecal: (id) =>
    set((state) => {
      const decals = state.decals.filter((d) => d.id !== id);
      const selectedDecalId =
        state.selectedDecalId === id ? (decals[decals.length - 1]?.id ?? null) : state.selectedDecalId;
      const active = activeDecalOf({ decals, selectedDecalId });
      const cm = cmForDecal(state.apparelType, active);
      return {
        decals,
        selectedDecalId,
        ...legacyMirror(active, state.apparelType),
        printWidthCm: cm.w,
        printHeightCm: cm.h,
      };
    }),

  clearDecals: () =>
    set((state) => ({
      decals: [],
      selectedDecalId: null,
      ...legacyMirror(null, state.apparelType),
      printWidthCm: 22.0,
      printHeightCm: 22.0,
    })),

  setSelectedDecalId: (selectedDecalId) =>
    set((state) => {
      const active = activeDecalOf({ decals: state.decals, selectedDecalId });
      const cm = cmForDecal(state.apparelType, active);
      return {
        selectedDecalId,
        ...legacyMirror(active, state.apparelType),
        printWidthCm: cm.w,
        printHeightCm: cm.h,
      };
    }),

  setPendingSide: (pendingSide) =>
    set((state) => ({
      pendingSide: validSidesForMobile(state.apparelType).includes(pendingSide) ? pendingSide : 'front',
    })),

  // Kompat: isi URL decal AKTIF (tak menghapus lapis lain = anti-timpa);
  // null = bersihkan semua (semantik lama).
  setDecalUrl: (url) =>
    set((state) => {
      if (!url) {
        return {
          decals: [],
          selectedDecalId: null,
          ...legacyMirror(null, state.apparelType),
          printWidthCm: 22.0,
          printHeightCm: 22.0,
        };
      }
      const active = activeDecalOf(state);
      if (!active) {
        const clean = sanitizeMobileDecal(state.apparelType, {
          url,
          targetSide: state.pendingSide,
        });
        const cm = cmForDecal(state.apparelType, clean);
        return {
          decals: [clean],
          selectedDecalId: clean.id,
          ...legacyMirror(clean, state.apparelType),
          printWidthCm: cm.w,
          printHeightCm: cm.h,
        };
      }
      const decals = state.decals.map((d) => (d.id === active.id ? { ...d, url } : d));
      const next = { ...active, url };
      return { decals, ...legacyMirror(next, state.apparelType) };
    }),

  setDecalTransform: (decalPosition, decalScale, decalRotation, widthCm, heightCm) =>
    set((state) => {
      // Kalibrasi terukur per apparel (selaras web) — clamped ke printhead DTF 30.0 cm.
      const mult = MOBILE_UNITS_TO_CM[state.apparelType] ?? 100;
      const rawWidth = widthCm ?? decalScale[0] * mult;
      const rawHeight = heightCm ?? decalScale[1] * mult;
      const clampedWidth = Math.min(30.0, Math.max(5.0, rawWidth));
      const clampedHeight = Math.min(42.0, Math.max(5.0, rawHeight));

      // Tulis-balik ke decal aktif (gizmo cubit = edit lapis terpilih).
      const active = activeDecalOf(state);
      const c = active
        ? clampMobileDecalXY(active.targetSide, decalPosition[0], decalPosition[1])
        : { x: decalPosition[0], y: decalPosition[1] };
      const maxS = active ? Math.max(0.02, maxScaleForSide(state.apparelType, active.targetSide)) : 1.5;
      const nextScale = active
        ? clampN(decalScale[0], 0.02, maxS, active.scale)
        : clampN(decalScale[0], 0.02, 1.5, 0.22);
      const nextRot = clampN(decalRotation, -180, 180, active?.rotation ?? 0);
      const decals = active
        ? state.decals.map((d) => (d.id === active.id ? { ...d, x: c.x, y: c.y, scale: nextScale, rotation: nextRot } : d))
        : state.decals;

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
        decals,
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
    set((state) => {
      // Semantik lama: ganti muka = reset posisi default; cerminkan ke lapis
      // depan/belakang yang aktif (lengan/samping/tudung tak disentuh).
      const active = activeDecalOf(state);
      const decals =
        active && (active.targetSide === 'front' || active.targetSide === 'back')
          ? state.decals.map((d) => (d.id === active.id ? { ...d, targetSide: activeFace, x: 0, y: 0.04 } : d))
          : state.decals;
      const next = active && (active.targetSide === 'front' || active.targetSide === 'back')
        ? { ...active, targetSide: activeFace, x: 0, y: 0.04 }
        : active;
      return {
        activeFace,
        cameraAngle: activeFace === 'front' ? 'front' : 'back',
        decals,
        ...(next
          ? legacyMirror(next, state.apparelType)
          : { decalPosition: (activeFace === 'front' ? [0, 0.04, 0.15] : [0, 0.04, -0.15]) as [number, number, number] }),
      };
    }),
  setGizmoDragging: (isGizmoDragging) => set({ isGizmoDragging }),
  setDecalDpi: (decalDpi) => set({ decalDpi }),
  setTestLabMode: (testLabMode) => set({ testLabMode }),
  setSpecialInkEffect: (specialInkEffect) => set({ specialInkEffect }),
  setWindTunnelSpeed: (windTunnelSpeed) =>
    set({ windTunnelSpeed: Math.max(0, Math.min(100, windTunnelSpeed)) }),
  setWindDirection: (windDirection) => set({ windDirection }),
  setStretchIntensity: (stretchIntensity) =>
    set({ stretchIntensity: Math.max(0, Math.min(1, stretchIntensity)) }),
  setStretchDirection: (stretchDirection) => set({ stretchDirection }),
  setFlashlightFocus: (flashlightFocus) =>
    set({ flashlightFocus: Math.max(0.15, Math.min(0.85, flashlightFocus)) }),
  setStretchDragging: (isStretchDragging) => set({ isStretchDragging }),
  setShowPrintZone: (showPrintZone) => set({ showPrintZone }),

  setOffsetFromCollarCm: (v) =>
    set(() => ({
      offsetFromCollarCm: Number(Math.min(30, Math.max(0, Number(v) || 0)).toFixed(1)),
    })),

  resetStudio: () =>
    set({
      apparelType: 'tshirt',
      color: '#0E0E10',
      sleeveColor: '#0E0E10',
      collarColor: '#0E0E10',
      decals: [],
      selectedDecalId: null,
      pendingSide: 'front',
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
      testLabMode: 'none',
      specialInkEffect: 'standard',
      windTunnelSpeed: 35,
      windDirection: 'front',
      stretchIntensity: 0,
      stretchDirection: 'horizontal',
      flashlightFocus: 0.45,
      isStretchDragging: false,
      showPrintZone: true,
    }),
}));
