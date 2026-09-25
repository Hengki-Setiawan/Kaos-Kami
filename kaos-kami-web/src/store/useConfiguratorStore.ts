import { create } from "zustand";
import {
  PRODUCT_COLORS,
  APPAREL_CATALOG,
  type ApparelType,
  type StudioTheme,
  type MaterialFinish,
  type LightingPreset,
  type CameraViewPreset,
  type DecalLayer,
  type DecalTargetSide,
  type SavedMockupDesign,
} from "@/lib/constants";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { collectDecalMasters } from "@/lib/imageEditPipeline";

export type ViewMode = "story" | "studio";
export type InteractionTool = "rotate" | "pan";
export type DrawerPosition = "right" | "left";


export type TestLabMode = "none" | "stretch" | "flashlight" | "windtunnel";
export type SpecialInkEffect = "standard" | "reflective3m" | "glow" | "goldfoil" | "holographic";
export type StretchDirection = "horizontal" | "vertical" | "biaxial";
export type WindDirection = "front" | "side" | "up";

// Ariyan preset (genP/genS) + Afilah multi-part hooks
export const LOGO_POSITION_PRESETS = [-0.075, 0, 0.075] as const;
export const LOGO_SCALE_PRESETS = [0.09, 0.12, 0.17] as const;
export type LogoPresetIndex = 0 | 1 | 2;

interface ConfiguratorState {
  // Navigation & Mockup Mode
  viewMode: ViewMode;
  activePhase: number;
  isHideWebsiteUI: boolean; // Fullscreen clean mockup mode

  // Drawer Panel Docking & Minimize State
  isDrawerCollapsed: boolean;
  drawerPosition: DrawerPosition;
  interactionTool: InteractionTool;

  // Apparel Model Selection
  activeApparel: ApparelType;
  selectedColor: string;
  activeColorName: string;
  selectedSize: string;

  // Model Sandbox Transform Offsets (Controlled bounds: -0.75 to 0.75)
  modelPosX: number;
  modelPosY: number;
  modelScale: number;
  modelRotY: number; // 0 to 360 degrees manual rotation

  // Multi-Decal Sandbox Layers
  decals: DecalLayer[];
  selectedDecalId: string | null;

  // Multi-part coloring (Afilah) — body/sleeves/hood per-part
  partColors: Record<string, string>;
  activeColorMode: "single" | "multi-part";

  // Ariyan mobile + preset indices
  logoPresetPos: LogoPresetIndex;
  logoPresetScale: LogoPresetIndex;
  isMobile: boolean;

  // Saved Designs Suite
  savedDesigns: SavedMockupDesign[];

  // Legacy Decal Stubs
  frontGraphicUrl: string | null;
  backGraphicUrl: string | null;

  // Sandbox Studio Controls
  studioTheme: StudioTheme;
  materialFinish: MaterialFinish;
  lightingPreset: LightingPreset;
  // M2.9: toggle "akurat warna" pre-cetak — true = matikan Bloom+Vignette
  // (SMAA tetap) + exposure sudah kunci 1.0, agar mockup = warna cetak.
  isAccurateColor: boolean;
  isWireframe: boolean;
  isRotating: boolean;
  cameraPreset: CameraViewPreset | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActivePhase: (phase: number) => void;
  setIsHideWebsiteUI: (hide: boolean) => void;
  toggleHideWebsiteUI: () => void;

  // Drawer & Tool Actions
  setIsDrawerCollapsed: (collapsed: boolean) => void;
  toggleDrawerCollapsed: () => void;
  setDrawerPosition: (pos: DrawerPosition) => void;
  toggleDrawerPosition: () => void;
  setInteractionTool: (tool: InteractionTool) => void;

  setActiveApparel: (apparel: ApparelType) => void;
  setSelectedColor: (hex: string, name?: string) => void;
  setSelectedSize: (size: string) => void;

  // Transform Actions
  setModelPosX: (x: number) => void;
  setModelPosY: (y: number) => void;
  setModelScale: (scale: number) => void;
  setModelRotY: (deg: number) => void;
  alignModel: (alignment: "left" | "center" | "right") => void;
  nudgeModel: (deltaX: number, deltaY: number) => void;
  resetModelTransform: () => void;

  // Decal Management
  addDecal: (decal: Omit<DecalLayer, "id">) => string;
  updateDecal: (id: string, partial: Partial<DecalLayer>) => void;
  removeDecal: (id: string) => void;
  // Bulk-load (dipakai inspector admin): ganti seluruh layers sekaligus.
  loadDecals: (decals: DecalLayer[]) => void;
  setSelectedDecalId: (id: string | null) => void;
  setFrontGraphicUrl: (url: string | null) => void;
  setBackGraphicUrl: (url: string | null) => void;

  // Saved Designs Actions
  saveCurrentDesign: (title?: string, previewUrl?: string) => string;
  /** Sinkron 1 entri lokal ke server; kembalikan serverId / status kuota jujur. */
  syncDesignToServer: (localId: string) => Promise<{
    serverId?: string;
    quotaExceeded?: boolean;
    error?: string;
  }>;
  loadSavedDesign: (id: string) => void;
  duplicateSavedDesign: (id: string) => string;
  deleteSavedDesign: (id: string) => void;
  // Status autosave (indikator UI): idle | saving | saved | error.
  syncStatus: "idle" | "saving" | "saved" | "error";
  setSyncStatus: (s: "idle" | "saving" | "saved" | "error") => void;

  // Studio Environment Actions
  setStudioTheme: (theme: StudioTheme) => void;
  setMaterialFinish: (finish: MaterialFinish) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  setAccurateColor: (v: boolean) => void;
  setIsWireframe: (wireframe: boolean) => void;
  toggleWireframe: () => void;
  setIsRotating: (rotating: boolean) => void;
  toggleRotating: () => void;
  setCameraPreset: (preset: CameraViewPreset | null) => void;

  // Afilah multi-part + Ariyan preset
  setPartColor: (partId: string, hex: string) => void;
  setColorMode: (mode: "single" | "multi-part") => void;
  resetPartColors: () => void;
  setLogoPresetPos: (idx: LogoPresetIndex) => void;
  setLogoPresetScale: (idx: LogoPresetIndex) => void;
  setIsMobile: (v: boolean) => void;
  applyLogoPreset: () => void;
  isGizmoDragging: boolean;
  setGizmoDragging: (v: boolean) => void;
  isGizmoVisible: boolean;
  setIsGizmoVisible: (v: boolean) => void;
  toggleGizmoVisible: () => void;
  animationPreset: "static" | "wind" | "walking" | "knit";
  animationSpeed: number;
  setAnimationPreset: (p: "static" | "wind" | "walking" | "knit") => void;
  setAnimationSpeed: (s: number) => void;

  // 3D Test Lab Suite (Uji Tarik, Senter 3D & 3M, Terowongan Angin)
  testLabMode: TestLabMode;
  setTestLabMode: (mode: TestLabMode) => void;
  specialInkEffect: SpecialInkEffect;
  setSpecialInkEffect: (effect: SpecialInkEffect) => void;
  windTunnelSpeed: number;
  setWindTunnelSpeed: (speed: number) => void;
  windDirection: WindDirection;
  setWindDirection: (dir: WindDirection) => void;
  stretchIntensity: number;
  setStretchIntensity: (intensity: number) => void;
  stretchDirection: StretchDirection;
  setStretchDirection: (dir: StretchDirection) => void;
  flashlightFocus: number;
  setFlashlightFocus: (focus: number) => void;
  // Titik grip tarikan di ruang lokal garmen (ditulis raycast controller, dibaca shader).
  stretchCenterXY: [number, number];
  setStretchCenterXY: (xy: [number, number]) => void;
  // QC senter: sudut grazing dari permukaan (15/30/45/90), sisi inspeksi, azimuth, lux estimasi.
  qcGrazingDeg: number;
  setQcGrazingDeg: (d: number) => void;
  qcSide: DecalTargetSide;
  setQcSide: (s: DecalTargetSide) => void;
  qcAzimuth: number;
  setQcAzimuth: (a: number) => void;
  qcLux: number;
  setQcLux: (v: number) => void;
  // Mode inspeksi desain (toggle murni, tak ubah data): turntable | bleed X-ray |
  // macro | mood lintas-cahaya | bounds batas cetak.
  inspectMode: "none" | "turntable" | "bleed" | "macro" | "mood" | "bounds";
  setInspectMode: (m: "none" | "turntable" | "bleed" | "macro" | "mood" | "bounds") => void;
  showMannequin: boolean;
  setShowMannequin: (v: boolean) => void;
  toggleShowMannequin: () => void;
}

const LS_DESIGNS_V1 = "kaos_kami_saved_designs_v1";
const LS_DESIGNS_LEGACY = "kaoskami_saved_designs";
const MAX_LOCAL_DESIGNS = 20;

function readStoredDesigns(): SavedMockupDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_DESIGNS_V1);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1 && Array.isArray(parsed.items)) return parsed.items;
    }
    const legacy = localStorage.getItem(LS_DESIGNS_LEGACY);
    if (legacy) {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr)) {
        writeStoredDesigns(arr);
        try {
          localStorage.removeItem(LS_DESIGNS_LEGACY);
        } catch {}
        return arr.slice(0, MAX_LOCAL_DESIGNS);
      }
    }
  } catch {}
  return [];
}

function writeStoredDesigns(items: SavedMockupDesign[]) {
  try {
    localStorage.setItem(LS_DESIGNS_V1, JSON.stringify({ v: 1, items: items.slice(0, MAX_LOCAL_DESIGNS) }));
  } catch {
    try {
      localStorage.setItem(
        LS_DESIGNS_V1,
        JSON.stringify({ v: 1, items: items.slice(0, Math.floor(MAX_LOCAL_DESIGNS / 2)) })
      );
    } catch {}
  }
}

function revokeBlobDecals(decals: { url?: string }[]) {
  for (const l of decals || []) {
    try {
      if (typeof l?.url === "string" && l.url.startsWith("blob:")) URL.revokeObjectURL(l.url);
    } catch {}
  }
}

const getInitialSavedDesigns = (): SavedMockupDesign[] => readStoredDesigns();

// P0 fondasi tema (single default "gallery"): persist lokal agar tak flash,
// DB tetap menang saat login (hydrateFromServer menimpa dari server).
export const STUDIO_THEME_KEY = "kaos-studio-theme";
function readStoredTheme(): StudioTheme {
  try {
    const v = localStorage.getItem(STUDIO_THEME_KEY);
    if (v === "gallery" || v === "obsidian" || v === "concrete") return v;
  } catch {}
  return "gallery";
}
function persistTheme(theme: StudioTheme) {
  try {
    localStorage.setItem(STUDIO_THEME_KEY, theme);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  viewMode: "story",
  activePhase: 1,
  isHideWebsiteUI: false,

  isDrawerCollapsed: false,
  drawerPosition: "right",
  interactionTool: "rotate",

  activeApparel: "tshirt",
  selectedColor: PRODUCT_COLORS[0]?.hex ?? "#FFFFFF",
  activeColorName: PRODUCT_COLORS[0]?.name ?? "Chalk White",
  selectedSize: "L",

  modelPosX: 0,
  modelPosY: 0,
  modelScale: 1.0,
  modelRotY: 0,

  decals: [],
  selectedDecalId: null,
  savedDesigns: getInitialSavedDesigns(),

  partColors: {},
  activeColorMode: "single",
  logoPresetPos: 1 as LogoPresetIndex,
  logoPresetScale: 1 as LogoPresetIndex,
  isMobile: false,
  isGizmoDragging: false,
  isGizmoVisible: true,
  animationPreset: "static" as const,
  animationSpeed: 1.0,

  testLabMode: "none" as TestLabMode,
  specialInkEffect: "standard" as SpecialInkEffect,
  windTunnelSpeed: 35,
  windDirection: "front" as WindDirection,
  stretchIntensity: 0,
  stretchDirection: "horizontal" as StretchDirection,
  flashlightFocus: 0.45,
  showMannequin: false,


  frontGraphicUrl: null,
  backGraphicUrl: null,

  studioTheme: readStoredTheme(),
  materialFinish: "combed-cotton",
  lightingPreset: "editorial",
  isAccurateColor: false,
  isWireframe: false,
  isRotating: false,
  cameraPreset: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setActivePhase: (phase) => set({ activePhase: phase }),
  setIsHideWebsiteUI: (hide) => set({ isHideWebsiteUI: hide }),
  toggleHideWebsiteUI: () => set((state) => ({ isHideWebsiteUI: !state.isHideWebsiteUI })),

  setIsDrawerCollapsed: (collapsed) => set({ isDrawerCollapsed: collapsed }),
  toggleDrawerCollapsed: () => set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
  setDrawerPosition: (pos) => set({ drawerPosition: pos }),
  toggleDrawerPosition: () =>
    set((state) => ({ drawerPosition: state.drawerPosition === "right" ? "left" : "right" })),
  setInteractionTool: (tool) => set({ interactionTool: tool }),

  setActiveApparel: (apparel) => {
    const info = APPAREL_CATALOG[apparel];
    set({
      activeApparel: apparel,
      selectedSize: info.sizes[0] ?? "L",
      modelPosX: 0,
      modelPosY: 0,
      modelScale: 1.0,
      modelRotY: 0,
    });
  },

  setSelectedColor: (hex, name) => {
    const matched = PRODUCT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    set({
      selectedColor: hex,
      activeColorName: name ?? matched?.name ?? "Custom Tint",
    });
  },

  setSelectedSize: (size) => set({ selectedSize: size }),

  setModelPosX: (x) => set({ modelPosX: Math.max(-0.85, Math.min(0.85, x)) }),
  setModelPosY: (y) => set({ modelPosY: Math.max(-0.85, Math.min(0.85, y)) }),
  setModelScale: (scale) => set({ modelScale: Math.max(0.6, Math.min(1.8, scale)) }),
  setModelRotY: (deg) => set({ modelRotY: ((deg % 360) + 360) % 360 }),

  alignModel: (alignment) => {
    if (alignment === "left") {
      set({ modelPosX: -0.45, modelPosY: 0 });
    } else if (alignment === "right") {
      set({ modelPosX: 0.45, modelPosY: 0 });
    } else {
      set({ modelPosX: 0, modelPosY: 0 });
    }
  },

  nudgeModel: (deltaX, deltaY) =>
    set((state) => ({
      modelPosX: Math.max(-0.85, Math.min(0.85, state.modelPosX + deltaX)),
      modelPosY: Math.max(-0.85, Math.min(0.85, state.modelPosY + deltaY)),
    })),

  resetModelTransform: () =>
    set({
      modelPosX: 0,
      modelPosY: 0,
      modelScale: 1.0,
      modelRotY: 0,
      cameraPreset: "front",
    }),

  addDecal: (decalData) => {
    const id = `decal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newDecal: DecalLayer = { ...decalData, id };
    set((state) => ({
      decals: [...state.decals, newDecal],
      selectedDecalId: id,
    }));
    return id;
  },

  updateDecal: (id, partial) => {
    set((state) => ({
      decals: state.decals.map((d) => (d.id === id ? { ...d, ...partial } : d)),
    }));
  },

  removeDecal: (id) => {
    const state = get();
    const target = state.decals.find((d) => d.id === id);
    if (target && target.url.startsWith("blob:")) {
      URL.revokeObjectURL(target.url);
    }
    set({
      decals: state.decals.filter((d) => d.id !== id),
      selectedDecalId: state.selectedDecalId === id ? null : state.selectedDecalId,
    });
  },

  loadDecals: (decals) => set({ decals, selectedDecalId: null }),
  syncStatus: "idle",
  setSyncStatus: (s) => set({ syncStatus: s }),

  setSelectedDecalId: (id) => set({ selectedDecalId: id }),

  setFrontGraphicUrl: (url) => {
    const state = get();
    if (url) {
      const existing = state.decals.find((d) => d.name === "Front Primary");
      if (existing) {
        state.updateDecal(existing.id, { url });
      } else {
        state.addDecal({
          name: "Front Primary",
          url,
          targetSide: "front",
          x: 0,
          y: 0.02,
          scale: 0.11, // A4 standard (~20.5 cm)
          rotation: 0,
          opacity: 1,
        });
      }
    } else {
      const existing = state.decals.find((d) => d.name === "Front Primary");
      if (existing) state.removeDecal(existing.id);
    }
    set({ frontGraphicUrl: url });
  },

  setBackGraphicUrl: (url) => {
    const state = get();
    if (url) {
      const existing = state.decals.find((d) => d.name === "Back Primary");
      if (existing) {
        state.updateDecal(existing.id, { url });
      } else {
        state.addDecal({
          name: "Back Primary",
          url,
          targetSide: "back",
          x: 0,
          y: 0.02,
          scale: 0.15, // A3 poster (~27.8 cm)
          rotation: 0,
          opacity: 1,
        });
      }
    } else {
      const existing = state.decals.find((d) => d.name === "Back Primary");
      if (existing) state.removeDecal(existing.id);
    }
    set({ backGraphicUrl: url });
  },

  saveCurrentDesign: (title, previewUrl) => {
    const state = get();
    const id = `saved-${Date.now()}`;
    // K-E: harga tersimpan = SSOT 6-variabel (pigmen + kain + aspek + volume),
    // selaras drawer & struk — bukan legacy yang buta kain/aspek/diskon.
    const matchedColor = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === state.selectedColor.toLowerCase()
    );
    const matPricing = materialFinishToPricing(state.materialFinish);
    const pricing = calculate6VariablePrice({
      apparelSlug: state.activeApparel,
      fabricThicknessSlug: matPricing.fabricThicknessSlug,
      size: state.selectedSize,
      colorHex: state.selectedColor,
      isSpecialPigment: !!matchedColor?.isSpecialPigment,
      decals: state.decals,
      quantity: 1,
    });
    const newDesign: SavedMockupDesign = {
      id,
      title: title ?? `${APPAREL_CATALOG[state.activeApparel].name} - ${state.activeColorName}`,
      apparel: state.activeApparel,
      colorHex: state.selectedColor,
      colorName: state.activeColorName,
      size: state.selectedSize,
      theme: state.studioTheme,
      materialFinish: state.materialFinish,
      decals: [...state.decals],
      savedAt: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      calculatedPriceIdr: pricing.totalPriceIdr,
      previewUrl,
    };
    // Kuota penyimpanan klien: batasi maksimal MAX_LOCAL_DESIGNS (20) desain tersimpan
    const updated = [newDesign, ...state.savedDesigns].slice(0, MAX_LOCAL_DESIGNS);
    set({ savedDesigns: updated });
    writeStoredDesigns(updated.map((d) => ({ ...d, decals: d.decals.map((l) => (l.url.startsWith("blob:") ? { ...l, url: "" } : l)) })) as SavedMockupDesign[]);
    // Backend sync: POST /api/designs (fire-and-forget, non-blocking).
    // Hasil sinkron (serverId/kuota) tersedia via syncDesignToServer().
    try {
      void get().syncDesignToServer(id).catch(() => {});
    } catch {}
    return id;
  },

  syncDesignToServer: async (localId) => {
    const st = get();
    const entry = st.savedDesigns.find((d) => d.id === localId);
    if (!entry) return { error: "Desain tidak ditemukan di koleksi lokal." };
    if (entry.serverId) return { serverId: entry.serverId };
    // Harga dihitung ulang SSOT 6-variabel (cermin saveCurrentDesign).
    const matched = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === entry.colorHex.toLowerCase()
    );
    const matPricing = materialFinishToPricing(entry.materialFinish);
    const pricing = calculate6VariablePrice({
      apparelSlug: entry.apparel,
      fabricThicknessSlug: matPricing.fabricThicknessSlug,
      size: entry.size,
      colorHex: entry.colorHex,
      isSpecialPigment: !!matched?.isSpecialPigment,
      decals: entry.decals,
      quantity: 1,
    });
    // KONTRAK masterAssetUrl B-03 (cermin saveCurrentDesign): https-only.
    let masterAssetUrl: string | undefined;
    try {
      const raw = localStorage.getItem("kaoskami_master_assets") || "{}";
      const all = JSON.parse(raw) as Record<string, unknown>;
      const mine: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(all)) {
        if (k.startsWith(`${entry.apparel}:`)) mine[k.slice(entry.apparel.length + 1)] = v;
      }
      try {
        const decalMasters: Record<string, string> = collectDecalMasters();
        const now = new Date().toISOString();
        for (const [id, url] of Object.entries(decalMasters)) {
          if (typeof url === "string" && /^https?:\/\//.test(url)) {
            mine[`decal:${id}`] = { url, at: now };
          }
        }
      } catch {}
      if (Object.keys(mine).length > 0) masterAssetUrl = JSON.stringify(mine);
    } catch {}
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          apparelSlug: entry.apparel,
          colorHex: entry.colorHex,
          colorName: entry.colorName,
          size: entry.size,
          materialFinishSlug: entry.materialFinish,
          decals: entry.decals,
          studioTheme: entry.theme,
          calculatedPriceIdr: entry.calculatedPriceIdr,
          priceBreakdown: pricing,
          masterAssetUrl,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          quotaExceeded: (body as any)?.quotaExceeded === true,
          error: String((body as any)?.error || `Server menolak (${res.status}).`),
        };
      }
      const serverId = String((body as any)?.design?.id || "");
      if (serverId) {
        const updated = get().savedDesigns.map((d) =>
          d.id === localId ? { ...d, serverId } : d
        );
        set({ savedDesigns: updated });
        try {
          writeStoredDesigns(updated);
        } catch {}
        return { serverId };
      }
      return { error: "Respons server tak dikenal." };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Jaringan gagal." };
    }
  },

  loadSavedDesign: (id) => {
    const state = get();
    const found = state.savedDesigns.find((d) => d.id === id);
    if (!found) return;

    // Revoke blob lama sebelum diganti (anti bocor memori, audit #41).
    revokeBlobDecals(state.decals);
    set({
      activeApparel: found.apparel,
      selectedColor: found.colorHex,
      activeColorName: found.colorName,
      selectedSize: found.size,
      studioTheme: found.theme,
      materialFinish: found.materialFinish,
      decals: [...found.decals],
    });

    persistTheme(found.theme);
  },

  duplicateSavedDesign: (id) => {
    const state = get();
    const found = state.savedDesigns.find((d) => d.id === id);
    if (!found) return "";
    const newId = `saved-${Date.now()}`;
    const duplicated: SavedMockupDesign = {
      ...found,
      id: newId,
      title: `${found.title} (Salinan)`,
      savedAt: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [duplicated, ...state.savedDesigns].slice(0, MAX_LOCAL_DESIGNS);
    set({ savedDesigns: updated });
    writeStoredDesigns(updated);
    return newId;
  },

  deleteSavedDesign: (id) => {
    const state = get();
    const target = state.savedDesigns.find((d) => d.id === id);
    if (target) revokeBlobDecals(target.decals as { url?: string }[]);
    const updated = state.savedDesigns.filter((d) => d.id !== id);
    set({ savedDesigns: updated });
    writeStoredDesigns(updated);
  },

  setStudioTheme: (theme) => {
    persistTheme(theme);
    set({ studioTheme: theme });
  },

  setMaterialFinish: (finish) => set({ materialFinish: finish }),
  setLightingPreset: (preset) => set({ lightingPreset: preset }),
  setAccurateColor: (v) => set({ isAccurateColor: v }),
  setIsWireframe: (wireframe) => set({ isWireframe: wireframe }),
  toggleWireframe: () => set((state) => ({ isWireframe: !state.isWireframe })),
  setIsRotating: (rotating) => set({ isRotating: rotating }),
  toggleRotating: () => set((state) => ({ isRotating: !state.isRotating })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  setPartColor: (partId, hex) =>
    set((s) => ({ partColors: { ...s.partColors, [partId]: hex } })),
  setColorMode: (mode) => set({ activeColorMode: mode }),
  resetPartColors: () => set({ partColors: {} }),
  setLogoPresetPos: (idx) => set({ logoPresetPos: idx }),
  setLogoPresetScale: (idx) => set({ logoPresetScale: idx }),
  setIsMobile: (v) => set({ isMobile: v }),
  setGizmoDragging: (v) => set({ isGizmoDragging: v }),
  setIsGizmoVisible: (v) => set({ isGizmoVisible: v }),
  toggleGizmoVisible: () => set((state) => ({ isGizmoVisible: !state.isGizmoVisible })),
  setAnimationPreset: (p) => set({ animationPreset: p }),
  setAnimationSpeed: (s) => set({ animationSpeed: s }),
  setTestLabMode: (mode) => set({ testLabMode: mode }),
  setSpecialInkEffect: (effect) => set({ specialInkEffect: effect }),
  setWindTunnelSpeed: (speed) => set({ windTunnelSpeed: Math.max(0, Math.min(100, speed)) }),
  setWindDirection: (dir) => set({ windDirection: dir }),
  setStretchIntensity: (intensity) => set({ stretchIntensity: Math.max(0, Math.min(1, intensity)) }),
  setStretchDirection: (dir) => set({ stretchDirection: dir }),
  setFlashlightFocus: (focus) => set({ flashlightFocus: Math.max(0.15, Math.min(0.85, focus)) }),
  stretchCenterXY: [0, 0],
  setStretchCenterXY: (xy) => set({ stretchCenterXY: xy }),
  qcGrazingDeg: 30,
  setQcGrazingDeg: (d) => set({ qcGrazingDeg: [15, 30, 45, 90].includes(d) ? d : 30 }),
  qcSide: "front" as DecalTargetSide,
  setQcSide: (s) => set({ qcSide: s }),
  qcAzimuth: 90,
  setQcAzimuth: (a) => set({ qcAzimuth: Number.isFinite(a) ? Math.max(0, Math.min(360, a)) : 90 }),
  qcLux: 0,
  setQcLux: (v) => set({ qcLux: Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0 }),
  inspectMode: "none" as "none" | "turntable" | "bleed" | "macro" | "mood" | "bounds",
  setInspectMode: (m) => set({ inspectMode: m }),
  setShowMannequin: (v) => set({ showMannequin: v }),
  toggleShowMannequin: () => set((state) => ({ showMannequin: !state.showMannequin })),

  applyLogoPreset: () => {
    // SATU konstanta: LOGO_POSITION_PRESETS + LOGO_SCALE_PRESETS (SSOT preset
    // logo). Dulu ada scaleMap lokal [0.05,0.11,0.16] yang menyimpang dari
    // LOGO_SCALE_PRESETS [0.09,0.12,0.17] → preset tampil beda dari klaim.
    const s = get();
    const active = s.decals.find((d) => d.id === s.selectedDecalId) ?? s.decals[0];
    if (!active) return;
    s.updateDecal(active.id, {
      x: LOGO_POSITION_PRESETS[s.logoPresetPos] ?? 0,
      scale: LOGO_SCALE_PRESETS[s.logoPresetScale] ?? LOGO_SCALE_PRESETS[1]!,
    });
  },
}));
