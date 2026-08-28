================================================================================
"KAOS KAMI" 3D APPAREL — MASTER BUILD SPECIFICATION v3.0
(Multi-Apparel 3D Mockup Studio · Sandbox Mode · Theme & Lighting Engine)
================================================================================

TARGET STACK: Next.js 14 (App Router) · React Three Fiber · Three.js · GSAP · Lenis · Zustand · Tailwind CSS
STATUS: v3.0 — Supersedes v2.1. Adds Multi-Apparel Support (T-Shirt, Hoodie, Cargo Pants), Sandbox Studio Controls, Studio Theme Switcher (Obsidian Dark / Gallery Light / Concrete Studio), Realistic Model Calibration, and Material Finish Presets.

--------------------------------------------------------------------------------
0. CHANGELOG vs v2.1 — WHY v3.0 EXISTS
--------------------------------------------------------------------------------

1. **Realistic 3D Asset Integration & Scaling Calibration**:
   - Upgraded from primitive blocky geometry to high-definition cloth simulated models with authentic fabric folds, drape, and seam topology.
   - Fixed camera FOV and model scaling so apparel sits with editorial breathing room behind typography instead of overwhelming the screen.
2. **Multi-Apparel Mockup Engine**:
   - **T-Shirt**: 240 & 280 GSM Boxy Heavyweight Combed Cotton.
   - **Hoodie**: 380 GSM Heavyweight Oversized French Terry Hoodie with front pouch and structured double-layer hood.
   - **Cargo Pants**: Relaxed tactical streetwear utility pants with dual bellows pockets and elasticated cuffs.
3. **Advanced 3D Sandbox Studio**:
   - **Theme Engine**: Switch between Deep Obsidian (`#121214`), Gallery Clean Light (`#F5F4F0`), and Brutalist Concrete (`#222326`).
   - **Material Finish Presets**: Combed Cotton, Heavy Fleece, and Vintage Acid Wash.
   - **Studio Lighting Presets**: High-Contrast Editorial, Cyber Acid Tangerine, and Soft Daylight Diffusion.
   - **Topology / Wireframe Mode**: Real-time wireframe overlay toggle for technical inspection.
   - **Interactive Transform Controls**: Orbit, Auto-spin, Scale zoom, and Sablon decal mapping.
4. **Enhanced Colorways & Sizing**:
   - Added garment-specific size matrices and dynamic price updating.

--------------------------------------------------------------------------------
1. BRAND IDENTITY & DESIGN DNA
--------------------------------------------------------------------------------

Color Systems (Dynamic Theme Engine in OKLCH):

| Token | Dark Mode (Obsidian) | Light Mode (Gallery Studio) | Concrete Mode |
|---|---|---|---|
| `--color-canvas` | `oklch(0.12 0.01 250)` | `oklch(0.96 0.005 90)` | `oklch(0.20 0.01 260)` |
| `--color-surface` | `oklch(0.15 0.012 250 / 0.85)` | `oklch(0.92 0.008 90 / 0.85)` | `oklch(0.24 0.012 260 / 0.85)` |
| `--color-text-primary` | `oklch(0.96 0.01 90)` | `oklch(0.12 0.01 250)` | `oklch(0.94 0.01 90)` |
| `--color-text-muted` | `oklch(0.62 0.01 240)` | `oklch(0.48 0.01 240)` | `oklch(0.65 0.01 250)` |
| `--color-brand-accent` | `oklch(0.72 0.22 45)` | `oklch(0.65 0.24 42)` | `oklch(0.72 0.22 45)` |
| `--color-border-subtle` | `oklch(0.28 0.01 250 / 0.5)` | `oklch(0.82 0.01 90 / 0.7)` | `oklch(0.35 0.01 260 / 0.5)` |

Typography:
- **Display**: `Syne` (700, 800 weight, tracking `-0.04em`)
- **Technical / Data**: `JetBrains Mono` (400, 500, 700 weight, tracking `0.05em`)
- **Body / Interface**: `Plus Jakarta Sans` (400, 500, 600 weight)

--------------------------------------------------------------------------------
2. 3D APPAREL CATALOG & GEOMETRY SPECS
--------------------------------------------------------------------------------

### 2.1 Apparel Types:
1. **`tshirt`**:
   - Model Path: `/models/tshirt-heavyweight.glb`
   - Fallback: `ProceduralTshirt.tsx` (Calibrated scale `[0.85, 0.85, 0.85]`, position `[0, -0.15, 0]`)
   - Material: Long-staple combed cotton (`roughness: 0.92`, `sheen: 0.6`)
   - Decal Nodes: Front Chest (`[0, 0.08, 0.16]`), Back Spine (`[0, 0.12, -0.16]`)
   - Base Price: IDR 289.000

2. **`hoodie`**:
   - Model Path: `/models/hoodie.glb`
   - Fallback: `ProceduralHoodie.tsx` (Torso box + hood shell + kangaroo pouch + sleeves)
   - Material: 380 GSM Heavy French Terry (`roughness: 0.95`, `sheen: 0.4`)
   - Decal Nodes: Front Chest (`[0, 0.05, 0.22]`), Back Full (`[0, 0.15, -0.22]`)
   - Base Price: IDR 549.000

3. **`pants`**:
   - Model Path: `/models/cargo-pants.glb`
   - Fallback: `ProceduralCargoPants.tsx` (Dual leg cylinders + waistband torus + dual cargo pocket boxes + ribbed cuffs)
   - Material: Heavyweight Cotton Twill / Ripstop (`roughness: 0.88`, `metalness: 0.08`)
   - Decal Nodes: Right Pocket Patch (`[0.35, -0.2, 0.18]`)
   - Base Price: IDR 489.000

--------------------------------------------------------------------------------
3. STATE MANAGEMENT ARCHITECTURE (Zustand Store v3.0)
--------------------------------------------------------------------------------

```ts
export type ApparelType = "tshirt" | "hoodie" | "pants";
export type StudioTheme = "obsidian" | "gallery" | "concrete";
export type MaterialFinish = "combed-cotton" | "heavy-fleece" | "vintage-wash";
export type LightingPreset = "editorial" | "cyber" | "soft-daylight";

interface ConfiguratorState {
  // Navigation & Mode
  viewMode: "story" | "studio";
  activePhase: number;

  // Apparel Selection
  activeApparel: ApparelType;
  selectedColor: string;
  activeColorName: string;
  selectedSize: string;

  // Custom Sablon Artwork
  frontGraphicUrl: string | null;
  backGraphicUrl: string | null;

  // Sandbox & Studio Engine
  studioTheme: StudioTheme;
  materialFinish: MaterialFinish;
  lightingPreset: LightingPreset;
  isWireframe: boolean;
  isRotating: boolean;
  modelScale: number;

  // Setters
  setViewMode: (mode: "story" | "studio") => void;
  setActivePhase: (phase: number) => void;
  setActiveApparel: (apparel: ApparelType) => void;
  setSelectedColor: (hex: string, name: string) => void;
  setSelectedSize: (size: string) => void;
  setFrontGraphicUrl: (url: string | null) => void;
  setBackGraphicUrl: (url: string | null) => void;
  setStudioTheme: (theme: StudioTheme) => void;
  setMaterialFinish: (finish: MaterialFinish) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  setIsWireframe: (wireframe: boolean) => void;
  setIsRotating: (rotating: boolean) => void;
  setModelScale: (scale: number) => void;
}
```

--------------------------------------------------------------------------------
4. STUDIO SANDBOX CONTROLS & UI SUITE
--------------------------------------------------------------------------------

The Phase 4 Studio Drawer is upgraded into a multi-tab **3D Modular Sandbox Suite**:
1. **Tab 1: APPAREL & COLOR**:
   - Apparel Switcher: `[ T-SHIRT ]` · `[ HOODIE ]` · `[ CARGO PANTS ]`
   - Colorway Selector with dynamic active color preview.
   - Street-cut sizing matrix adjusted for T-Shirts (`S` to `XXL`), Hoodies (`M` to `XXL`), and Cargo Pants (`28` to `36`).
2. **Tab 2: GRAPHICS & SABLON**:
   - Front Artwork Decal Uploader with preview & delete.
   - Back Artwork Decal Uploader with preview & delete.
3. **Tab 3: STUDIO ENVIRONMENT (Sandbox)**:
   - Background & Canvas Theme: `Obsidian Dark` vs `Gallery White` vs `Concrete Grey`.
   - Studio Lighting: `Editorial Studio` vs `Cyber Tangerine` vs `Soft Daylight`.
   - Material Finish: `Standard Weave` vs `Heavy French Terry` vs `Vintage Wash`.
   - Technical Tools: `Wireframe Mode Toggle`, `Auto-Spin 360°`, `Reset Camera View`.

--------------------------------------------------------------------------------
5. CAMERA & SCALE CALIBRATION (Fixing Scale & Text Occlusion)
--------------------------------------------------------------------------------

- **Hero Phase 1 Camera Calibration**:
  - Initial Position: `[0, 0.05, 3.4]` (Increased camera distance from `2.5` to `3.4` with `fov: 40`).
  - Model Offset: Positioned at `[0.35, -0.1, 0]` on desktop screens so the t-shirt sits with ample breathing room to the right of the large editorial text, leaving headlines completely readable!
- **Phase 2 Macro Weave**:
  - Target: `[0.25, 0.15, 1.1]` (Focuses on left chest weave).
- **Phase 3 180° Rear Reveal**:
  - Target: `[0, 0.1, -2.8]` (Spins to the back with clear perspective).
- **Phase 4 Studio Configurator**:
  - Target: `[-0.45, 0.05, 2.7]` with OrbitControls centered on `[-0.2, 0, 0]`.

--------------------------------------------------------------------------------
6. IMPLEMENTATION ROADMAP & STEP-BY-STEP UPGRADE
--------------------------------------------------------------------------------

1. Update `src/lib/constants.ts` with multi-apparel data, pricing, and themes.
2. Upgrade `src/store/useConfiguratorStore.ts` with the new sandbox state.
3. Create `src/components/3d/ApparelStage.tsx` which orchestrates:
   - `TshirtModel.tsx`
   - `HoodieModel.tsx`
   - `PantsModel.tsx`
   - `StudioLighting.tsx` with dynamic lighting presets.
4. Upgrade `src/components/ui/CustomizerDrawer.tsx` with multi-tab controls (Apparel, Graphics, Sandbox Theme & Lighting).
5. Calibrate `src/hooks/useScrollPhases.ts` and `src/components/3d/CameraRig.tsx` for optimal framing.
6. Run full verification (`npm run typecheck`, `npm run lint`, `npm run build`).

================================================================================
END OF SPEC v3.0
================================================================================
