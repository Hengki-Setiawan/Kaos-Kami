import { create } from "zustand";
import {
  PRODUCT_COLORS,
  APPAREL_CATALOG,
  calculateCustomMockupPrice,
  type ApparelType,
  type StudioTheme,
  type MaterialFinish,
  type LightingPreset,
  type CameraViewPreset,
  type DecalLayer,
  type SavedMockupDesign,
} from "@/lib/constants";

export type ViewMode = "story" | "studio";
export type InteractionTool = "rotate" | "pan";
export type DrawerPosition = "right" | "left";

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
  setSelectedDecalId: (id: string | null) => void;
  setFrontGraphicUrl: (url: string | null) => void;
  setBackGraphicUrl: (url: string | null) => void;

  // Saved Designs Actions
  saveCurrentDesign: (title?: string) => string;
  loadSavedDesign: (id: string) => void;
  deleteSavedDesign: (id: string) => void;

  // Studio Environment Actions
  setStudioTheme: (theme: StudioTheme) => void;
  setMaterialFinish: (finish: MaterialFinish) => void;
  setLightingPreset: (preset: LightingPreset) => void;
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
}

const getInitialSavedDesigns = (): SavedMockupDesign[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("kaoskami_saved_designs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  viewMode: "story",
  activePhase: 1,
  isHideWebsiteUI: false,

  isDrawerCollapsed: false,
  drawerPosition: "right",
  interactionTool: "rotate",

  activeApparel: "tshirt",
  selectedColor: PRODUCT_COLORS[0]?.hex ?? "#121214",
  activeColorName: PRODUCT_COLORS[0]?.name ?? "Obsidian Black",
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

  frontGraphicUrl: null,
  backGraphicUrl: null,

  studioTheme: "obsidian",
  materialFinish: "combed-cotton",
  lightingPreset: "editorial",
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

  resetModelTransform: () => set({ modelPosX: 0, modelPosY: 0, modelScale: 1.0, modelRotY: 0 }),

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
          y: 0.08,
          scale: 0.55,
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
          y: 0.12,
          scale: 0.75,
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

  saveCurrentDesign: (title) => {
    const state = get();
    const id = `saved-${Date.now()}`;
    const pricing = calculateCustomMockupPrice(
      state.activeApparel,
      state.selectedColor,
      state.selectedSize,
      state.decals
    );
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
      calculatedPriceIdr: pricing.totalPrice,
    };
    const updated = [newDesign, ...state.savedDesigns];
    set({ savedDesigns: updated });
    try {
      localStorage.setItem("kaoskami_saved_designs", JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage save error", e);
    }
    return id;
  },

  loadSavedDesign: (id) => {
    const state = get();
    const found = state.savedDesigns.find((d) => d.id === id);
    if (!found) return;

    set({
      activeApparel: found.apparel,
      selectedColor: found.colorHex,
      activeColorName: found.colorName,
      selectedSize: found.size,
      studioTheme: found.theme,
      materialFinish: found.materialFinish,
      decals: [...found.decals],
    });

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", found.theme);
    }
  },

  deleteSavedDesign: (id) => {
    const state = get();
    const updated = state.savedDesigns.filter((d) => d.id !== id);
    set({ savedDesigns: updated });
    try {
      localStorage.setItem("kaoskami_saved_designs", JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage delete error", e);
    }
  },

  setStudioTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ studioTheme: theme });
  },

  setMaterialFinish: (finish) => set({ materialFinish: finish }),
  setLightingPreset: (preset) => set({ lightingPreset: preset }),
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
  applyLogoPreset: () => {
    const s = get();
    const xMap = [-0.075, 0, 0.075] as const;
    const scaleMap = [0.09, 0.12, 0.17] as const;
    const active = s.decals.find((d) => d.id === s.selectedDecalId) ?? s.decals[0];
    if (!active) return;
    s.updateDecal(active.id, {
      x: xMap[s.logoPresetPos] ?? 0,
      scale: scaleMap[s.logoPresetScale] ?? 0.52,
    });
  },
}));
