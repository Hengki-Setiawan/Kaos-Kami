================================================================================
KAOS KAMI — BLUEPRINT 02 / 04
ADVANCED 3D MOCKUP STUDIO ENGINE
(Target: match and exceed VirtualThreads.io, 3dmockups.app, FitMockup)
================================================================================
Version: 1.0 · Depends on: BLUEPRINT-01 (Design model, autosave API,
render job endpoints). Read that document first.

--------------------------------------------------------------------------------
0. COMPETITIVE BENCHMARK — WHAT "BETTER THAN" ACTUALLY MEANS
--------------------------------------------------------------------------------

Researched capabilities of the three named competitors (as of 2026):

**VirtualThreads.io**
  - Core strength: cinematic ANIMATION — walking loop, wind-blown fabric,
    "knitting reel" (garment appears to knit itself into existence),
    adjustable animation speed, acid-wash/puff-print visual effect presets.
  - Export: image, 360° video, 3D model file. No sign-up required for the
    free tier; everything processed/stored locally until export.
  - Weakness: single-purpose mockup tool, no storefront/commerce layer.

**3dmockups.app**
  - Core strength: the fullest BUSINESS loop — 3D studio + built-in
    storefront-per-seller + Stripe Connect payouts + in-house production
    (no Printify middleman) + Figma-style real-time collaboration
    (live cursors, comments, approvals).
  - Weakness (relative to Kaos Kami's needs): multi-tenant marketplace
    model, generic global production — not tailored to a single UMKM's own
    sablon capability/pricing.

**FitMockup**
  - Core strength: AI-powered enhancement (turns the 3D preview into a
    photorealistic image), multi-part coloring (different colors per
    sleeve/body/hood), mobile-app-first with gesture controls, sketch-to-
    photo AI.
  - Weakness: subscription-gated, apparel variety currently limited
    (hoodie/tee/cap), user reviews report AI generation reliability issues.

**What "exceed" means for Kaos Kami, concretely — the gap list this
blueprint closes:**

| Capability | VT | 3dmockups.app | FitMockup | Kaos Kami TODAY | Kaos Kami TARGET |
|---|---|---|---|---|---|
| Multi-decal (front+back+sleeve+multi-layer) | partial | yes | partial | single front/back via legacy stub | **full multi-layer, per-layer transform** (already begun via `DecalLayer[]`) |
| Real-time drag/scale/rotate on 3D surface | yes | yes | yes | drawer sliders only | **direct-manipulation gizmo on the mesh** |
| Animation presets (walk/wind/knit) | yes | partial | no | none | **yes, GSAP+R3F driven, §4** |
| Material finish presets | limited | yes | limited | 3 finishes defined, not yet wired to material | **wired + visually distinct**, §3 |
| Multi-part coloring (sleeve ≠ body ≠ hood) | no | no | yes | single color for whole garment | **yes, §3** |
| AI photorealistic enhancement | no | no | yes | none | **yes, via a cheap 2026 image API, §6** |
| Server-side render for catalog images | n/a | yes | yes (mobile) | none (client-only) | **yes, §6 — this is what makes product-page images fast & consistent** |
| 360° turntable export (video/gif) | yes | yes | yes | manual OrbitControls spin only | **auto-turntable export, §6** |
| Real-time collaboration | no | yes | no | no | **out of scope for v1** (noted as v2 idea, §8) |
| Mobile touch gestures (pinch/rotate/drag) | yes | yes | yes | desktop-oriented OrbitControls | **first-class, see BLUEPRINT-04** |
| Save/reuse designs | local only | account-based | account-based | localStorage only | **backend-synced via BLUEPRINT-01 Design model** |

--------------------------------------------------------------------------------
1. CURRENT CODE INVENTORY (grounding — read before writing new code)
--------------------------------------------------------------------------------

Already exists and MUST be preserved/extended, not replaced:
  - `src/store/useConfiguratorStore.ts` — already has `decals: DecalLayer[]`,
    `selectedDecalId`, `modelPosX/Y/Scale/RotY`, `studioTheme`,
    `materialFinish`, `lightingPreset`, `isWireframe`, `isRotating`,
    `cameraPreset`, `savedDesigns` (localStorage-backed),
    `drawerPosition`, `interactionTool` ("rotate" | "pan"). This is a
    genuinely strong foundation — v3.0 of the internal spec already
    anticipated most of this blueprint's direction.
  - `src/components/3d/ApparelMeshRenderer.tsx`, `TshirtModel.tsx`,
    `HoodieModel.tsx`, `ShirtModel.tsx`, `DecalLayerRenderer.tsx`,
    `StudioLighting.tsx`, `CameraRig.tsx`, `CanvasStage.tsx`.
  - `public/models/tshirt-heavyweight.glb` (1.0MB), `hoodie.glb` (19MB —
    ⚠ far too large, see §5), `jacket.glb` (5.2MB).
  - `src/lib/proceduralTextures.ts` — canvas-based procedural normal
    maps/decals, used as the zero-dependency fallback.
  - `src/components/ui/CustomizerDrawer.tsx` — the studio control panel.
  - `src/hooks/useWebglSupport.ts` + `StaticShowcase.tsx` — WebGL
    detection and non-3D fallback (foundation for BLUEPRINT-04's device
    tiering).

Reference Repositories Available Locally (`.skills-sourced/3d-configurators/`):
  - `starklord-tshirt/` — Drei `<Decal>` projection math, lightweight baked AO garment mesh (`shirt_baked.glb`), and reactive color mutation.
  - `vihan-tshirt-designer/` — Fabric.js 2D Canvas Designer integration (custom typography, font selection, multi-object layers) with live 3D texture projection.
  - `afilah-clothing-configurator/` — Multi-apparel geometry swapping, scale clamping, and responsive drawer controls (`shirt.glb`).

This blueprint's job is to synthesize these proven open-source techniques with our production-grade 2026 architecture (real-world cm calibration, high-res Cloudflare R2 vaults, and Supabase order backend) across the tracks below.

--------------------------------------------------------------------------------
2. TRACK A — DIRECT-MANIPULATION DECAL GIZMO (the single biggest UX gap)
--------------------------------------------------------------------------------

Today, decal position/scale/rotation are set via `CustomizerDrawer`
sliders. Every competitor lets the user grab the artwork directly on the
garment and drag/pinch/rotate it. This is the highest-leverage single
change in this whole blueprint.

Implementation approach: since the decal is rendered as a texture-mapped
plane/decal projection in 3D space (via `DecalLayerRenderer.tsx`), add a
2D overlay interaction layer that maps screen-space drag deltas to the
decal's local UV-space `x`/`y`/`scale`/`rotation` fields on the ACTIVE
`DecalLayer`.

```tsx
// src/components/3d/DecalGizmoOverlay.tsx
"use client";
import { useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useRef, useCallback } from "react";
import * as THREE from "three";

/**
 * Renders an invisible HTML-space hit target sized/positioned to match the
 * active decal's current on-screen projection, and translates pointer drag
 * gestures into store updates. Works with both mouse and touch (pointer
 * events unify both).
 */
export function DecalGizmoOverlay() {
  const { camera, size } = useThree();
  const decals = useConfiguratorStore((s) => s.decals);
  const selectedDecalId = useConfiguratorStore((s) => s.selectedDecalId);
  const updateDecal = useConfiguratorStore((s) => s.updateDecal);
  const active = decals.find((d) => d.id === selectedDecalId);

  const dragState = useRef<{
    mode: "move" | "scale" | "rotate" | null;
    startX: number; startY: number;
    startDecal: typeof active;
  }>({ mode: null, startX: 0, startY: 0, startDecal: undefined });

  const onPointerDown = useCallback((mode: "move" | "scale" | "rotate") =>
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = { mode, startX: e.clientX, startY: e.clientY, startDecal: active ? { ...active } : undefined };
    }, [active]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const { mode, startX, startY, startDecal } = dragState.current;
    if (!mode || !startDecal || !active) return;
    const dx = (e.clientX - startX) / size.width;
    const dy = (e.clientY - startY) / size.height;

    if (mode === "move") {
      updateDecal(active.id, {
        x: clamp(startDecal.x + dx, -0.35, 0.35),
        y: clamp(startDecal.y - dy, -0.35, 0.35),
      });
    } else if (mode === "scale") {
      const delta = 1 + dx * 1.5;
      updateDecal(active.id, { scale: clamp(startDecal.scale * delta, 0.15, 1.2) });
    } else if (mode === "rotate") {
      const delta = dx * 180;
      updateDecal(active.id, {
        rotation: ((startDecal.rotation + delta + 180) % 360) - 180,
      });
    }
  }, [active, updateDecal, size]);

  const onPointerUp = useCallback(() => {
    dragState.current.mode = null;
  }, []);

  if (!active) return null;

  // Handles are positioned via a projected screen-space anchor computed
  // each frame in a parent <Html/> (drei) wrapper — omitted here for
  // brevity; full projection math goes in the actual component file.
  return (
    <group>
      {/* drei <Html transform occlude> anchored to the decal's 3D anchor,
          containing move/scale/rotate handle buttons wired to the
          onPointerDown/Move/Up above. Touch targets must be >= 44px per
          BLUEPRINT-04 mobile guidelines. */}
    </group>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
```

Pinch-to-scale and two-finger rotate on mobile: use a pointer-event based
two-touch tracker (do NOT depend on a heavy gesture library — implement
with native Pointer Events + a small custom hook `useTwoFingerGesture()`,
since React Three Fiber's Canvas already captures pointer events and
adding e.g. Hammer.js creates event-conflict headaches with OrbitControls).
When two active pointers are on the decal hit-area simultaneously, compute
the distance delta for scale and the angle delta for rotation, disable
`OrbitControls` for the gesture's duration (`enabled={false}` on the
controls ref while `dragState.current.mode !== null`).

--------------------------------------------------------------------------------
2.1 TRACK A.2 — REAL-WORLD PHYSICAL SCALE CALIBRATION (3D-to-CM Mapping)
--------------------------------------------------------------------------------

A critical innovation of Kaos Kami is that the 3D canvas is **not just an
approximate visualizer** — it is mathematically calibrated to real-world
physical fabric dimensions. This bridges the customer's visual design directly
to the workshop's DTF printing hardware.

**Physical Calibration Standard:**
- Garment chest reference (e.g. Size L Heavyweight Tee) = **54.0 cm physical chest width** (mapped to 1.0 UV/3D reference unit).
- Maximum printable area per side = **30.0 cm maximum width** (clamped to match standard A3 / 30cm DTF printhead roll limits).
- Scale clamp: Decal scale is constrained so `realWidthCm = decal.scale * 30.0 cm <= 30.0 cm`.

```ts
// src/lib/scaleCalibration.ts
export const REAL_WORLD_PRINT_LIMITS = {
  maxPrintWidthCm: 30.0, // Standard DTF 30cm roll width
  maxPrintHeightCm: 42.0, // Standard A3+ height limit
  chestWidthReferenceCm: {
    tshirt: 54.0,
    hoodie: 60.0,
    jacket: 58.0,
  },
};

export interface PhysicalPrintDimension {
  widthCm: number;
  heightCm: number;
  offsetFromCollarCm: number;
  isWithinProductionLimits: boolean;
}

export function computePhysicalPrintDimensions(
  apparelType: "tshirt" | "hoodie" | "shirt",
  decalScale: number,
  decalY: number,
  aspectRatio: number = 1.0
): PhysicalPrintDimension {
  // Clamp scale to maximum physical printhead width (30cm)
  const rawWidth = decalScale * REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm;
  const widthCm = Math.min(REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm, Math.round(rawWidth * 10) / 10);
  const heightCm = Math.round((widthCm / aspectRatio) * 10) / 10;

  // Convert UV offset Y to distance from collar baseline (cm)
  const offsetFromCollarCm = Math.round((0.35 - decalY) * 35.0 * 10) / 10;

  return {
    widthCm,
    heightCm,
    offsetFromCollarCm,
    isWithinProductionLimits: widthCm <= 30.0 && heightCm <= 42.0,
  };
}
```

**UI Output in Studio & Admin:**
1. **In Studio Drawer / Gizmo:** Live floating badge displays exact physical dimensions:  
   `📏 28.5 cm × 16.2 cm (Maks 30 cm)` so the customer has 100% confidence in scale.
2. **In Database & Order Snapshot:** Saved directly into `ProductionTask.printWidthCm` and `ProductionTask.printHeightCm`.
3. **In Admin Dashboard:** Displays the exact centimeter dimensions for operator input into DTF RIP software.

--------------------------------------------------------------------------------
3. TRACK B — MULTI-PART MATERIAL & COLOR SYSTEM (beat FitMockup's
   headline feature)
--------------------------------------------------------------------------------

Today `selectedColor` is a single hex applied to the whole garment
material. FitMockup's differentiator is per-part coloring (sleeve ≠ body
≠ hood). To implement this without a full geometry rebuild:

1. Ensure each GLB model has separate material slots / mesh groups per
   garment part (Blender-side asset requirement — if the current GLBs are
   single-material, this needs a re-export; document this as an asset
   task, not just a code task, in the roadmap §7).
2. Extend the Zustand store:

```ts
// addition to useConfiguratorStore.ts state
interface PartColorMap {
  [partId: string]: string; // e.g. { body: "#121214", sleeves: "#E65100", hood: "#121214" }
}

// new state
partColors: PartColorMap;
activeColorMode: "single" | "multi-part";

// new actions
setPartColor: (partId: string, hex: string) => void;
setColorMode: (mode: "single" | "multi-part") => void;
resetPartColors: () => void;
```

3. In `ApparelMeshRenderer.tsx`, when traversing the loaded GLTF scene,
   tag each mesh with a `partId` from `userData` (set in Blender via a
   custom property, or via a naming convention like `mesh_body`,
   `mesh_sleeve_l`, `mesh_hood` parsed at load time), and assign a cloned
   `MeshPhysicalMaterial` per part whose `color` is driven by
   `partColors[partId] ?? selectedColor` (fallback to the single global
   color when the user hasn't customized that part — this keeps the
   existing single-color flow 100% backward compatible).
4. `CustomizerDrawer` Tab 1 gets a "Multi-Part" toggle; when on, render
   one color-swatch-picker per detected part instead of one global picker.

--------------------------------------------------------------------------------
4. TRACK C — ANIMATION PRESETS (walking / wind / knit-reveal)
--------------------------------------------------------------------------------

This is VirtualThreads' signature feature and currently Kaos Kami has
none. Three animation modes, all implementable with GSAP timelines driving
either: (a) bone/skeleton animation if the GLB is rigged, or (b) vertex
shader-based cloth-simulation-*looking* wind (cheap, no physics engine
needed, purely a sine-wave displacement shader) for garments that are NOT
rigged, which is the more realistic near-term path given the current
procedural/simple GLB assets.

```ts
// src/store/useConfiguratorStore.ts additions
export type AnimationPreset = "static" | "wind" | "walking" | "knit-reveal";
animationPreset: AnimationPreset;
animationSpeed: number; // 0.5 - 2.0
setAnimationPreset: (preset: AnimationPreset) => void;
setAnimationSpeed: (speed: number) => void;
```

```glsl
// src/lib/shaders/windDisplacement.glsl (vertex shader chunk, injected via
// onBeforeCompile on the garment's MeshPhysicalMaterial)
uniform float uTime;
uniform float uWindStrength; // 0 = off, ramps 0..1 based on animationPreset==="wind"
varying vec3 vWorldPos;

void main() {
  vec3 transformed = position;
  // Displacement increases toward garment hem/sleeve extremities
  // (driven by a per-vertex "windWeight" attribute baked into the GLB,
  // 0 at the collar/shoulder-seam, 1 at hem and cuffs) so the fabric
  // billow looks anchored at the body and free at the edges — this is
  // the same trick used for cheap cloth-look effects without full
  // physics simulation.
  float wave = sin(uTime * 2.0 + position.y * 4.0) * uWindStrength;
  transformed.x += wave * windWeight * 0.04;
  transformed.z += cos(uTime * 1.6 + position.x * 3.0) * uWindStrength * windWeight * 0.03;
  // ... standard MVP transform continues below, unmodified
}
```

For "walking" — since the current models are not rigged human+garment
combos, implement this as a **camera + garment composite loop** rather
than true bone animation in v1: a subtle rhythmic bob/sway of the whole
garment group (`groupRef.current.position.y`, `.rotation.z` on a sine
curve) combined with the wind shader at low strength, exported as a video
loop via §6's render pipeline. This achieves ~80% of the perceived effect
VirtualThreads sells, at a fraction of the asset-pipeline cost (true
walking animation needs a rigged mannequin + skinned garment, which is a
real 3D-artist task — document that as a v2 asset upgrade, not a v1
blocker).

"Knit-reveal": a shader-based reveal using a vertical/radial wipe mask
driven by `uProgress` (0→1 over ~2s), combined with a "yarn strand"
particle burst using `THREE.Points` — visually communicates
"materializing from thread" without needing actual yarn simulation.

Wire `CustomizerDrawer` Tab 3 with an animation preset row:
`[ Static ] [ Wind ] [ Walking Loop ] [ Knit Reveal ]` + a speed slider —
mirrors the mental model users already have from VirtualThreads, which
lowers the learning curve for anyone who's used a competitor before.

--------------------------------------------------------------------------------
5. TRACK D — ASSET PIPELINE FIXES (mandatory, currently a real problem)
--------------------------------------------------------------------------------

`hoodie.glb` is **19MB**. This alone will cause slow/failed loads on
Indonesian mobile networks (a large % of the target audience is on 4G, not
fiber-grade broadband) — this is not a nice-to-have optimization, it is a
launch blocker for the mobile-first goal stated by the project owner.

Required pipeline (run once per asset, then commit the compressed
output — do not compress at runtime):

```bash
# 1. Draco-compress geometry (typically 5-10x reduction on vertex data)
npx gltf-transform draco public/models/hoodie.glb public/models/hoodie.draco.glb

# 2. Convert textures to KTX2/Basis (GPU-compressed, massive VRAM + transfer
#    savings vs raw PNG/JPG embedded textures)
npx gltf-transform etc1s public/models/hoodie.draco.glb public/models/hoodie.optimized.glb

# 3. Verify size
ls -lh public/models/hoodie.optimized.glb   # target: < 3MB

# 4. Generate a low-poly LOD variant for mobile/low-tier devices
npx gltf-transform simplify public/models/hoodie.optimized.glb public/models/hoodie.lod1.glb --ratio 0.35
```

Loader setup (once, shared across all garment components):

```ts
// src/lib/loaders/gltfLoader.ts
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createOptimizedGLTFLoader(gl: THREE.WebGLRenderer) {
  const draco = new DRACOLoader();
  draco.setDecoderPath("/decoders/draco/"); // host decoder WASM on your own
                                              // CDN/public dir, do not hot-
                                              // link Google's CDN in prod
  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath("/decoders/basis/");
  ktx2.detectSupport(gl);

  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setKTX2Loader(ktx2);
  return loader;
}
```

Model selection by device tier (full tiering logic lives in
BLUEPRINT-04 §2, referenced here because it directly determines which GLB
variant loads):

```ts
const modelPath = deviceTier === "low"
  ? "/models/hoodie.lod1.glb"
  : "/models/hoodie.optimized.glb";
```

--------------------------------------------------------------------------------
6. TRACK E — SERVER-SIDE RENDER PIPELINE (the "combination" the user
   asked for: real-time 3D in-browser AND fotorealistic server renders)
--------------------------------------------------------------------------------

Real-time client-side R3F is correct for the INTERACTIVE editing
experience (instant feedback while dragging/coloring). But for:
  - Product catalog thumbnails (must be fast, consistent, cacheable, and
    NOT require every visitor's browser to boot a WebGL context just to
    see a listing grid)
  - Order/production tickets (BLUEPRINT-03 needs a flat printable image)
  - Social sharing / WhatsApp preview images
  - The optional AI-photorealistic-enhancement feature (beats FitMockup)

...a server-side render step is needed. Two viable, cheap 2026 approaches,
in order of recommendation:

**Approach 1 (recommended, cheapest): headless Three.js render via a
Vercel/Node serverless function using `node-canvas` + `gl` (headless-gl) or,
more robustly, a small dedicated render worker using Playwright to screenshot
a hidden `/render/[designId]` Next.js route that mounts the SAME
`CanvasStage` component used in the live Studio (guaranteeing visual
parity between what the user designed and what gets rendered — this is a
common and costly bug class in mockup tools where the export doesn't match
the preview).**

```ts
// src/app/api/designs/[id]/render/route.ts
import { chromium } from "playwright-core";
// Use @sparticuz/chromium on Vercel serverless (lightweight Chromium
// binary built for Lambda-style environments) — free, no external SaaS
// bill, scales with your existing hosting.

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1600 } });
  await page.goto(`${process.env.INTERNAL_RENDER_BASE_URL}/render/${params.id}?angle=front`);
  await page.waitForSelector("[data-render-ready='true']"); // the render
                                                              // route sets
                                                              // this attr
                                                              // once R3F's
                                                              // onCreated +
                                                              // a settle
                                                              // timeout fire
  const buffer = await page.screenshot({ type: "png" });
  await browser.close();

  const url = await uploadToR2(`renders/${params.id}/front.png`, buffer);
  await prisma.design.update({
    where: { id: params.id },
    data: { previewImageFrontUrl: url },
  });
  return Response.json({ url });
}
```

The `/render/[designId]` route is a minimal, UI-chrome-free page: no
navbar, no drawer, just `<CanvasStage>` fed with the Design's saved
config, camera locked to a clean front/back/iso angle, and a
`data-render-ready` flag set via a `useEffect` that waits for
`gl.info.render.frame > 0` plus one `requestAnimationFrame` past texture
upload completion.

For the 360° turntable export (matches VirtualThreads' video export),
render N frames (e.g. 36, one every 10°) via the same pipeline and either:
  (a) stitch into an MP4 with `ffmpeg` (available in most serverless
      container runtimes, or via a lightweight Fly.io/Railway worker if
      Vercel's ephemeral filesystem is too constrained), or
  (b) ship the 36 frames as a WebP sprite and drive the "spin" in the
      browser with a lightweight JS scrubber (near-zero cost, works
      everywhere, avoids the ffmpeg dependency entirely — recommended as
      the v1 approach, upgrade to real video export in v2).

**Approach 2 (AI photorealistic enhancement, matches FitMockup's headline
feature): pass the server-rendered PNG through an image-to-image API to
add photographic lighting/texture realism on top of the 3D render.** Use a
pay-per-call API rather than hosting a model — at UMKM scale this is
drastically cheaper than GPU infrastructure. Recommended 2026 options to
evaluate at build time (pricing/availability changes fast in this space,
so the agent should re-check current pricing before committing):
  - Google's Gemini image models (natural fit since the project owner is
    already using Gemini for the build agent — check current
    image-generation/editing endpoint pricing under the Gemini API).
  - fal.ai hosted image-to-image endpoints (pay-per-second, no
    infrastructure, generous free credits for testing).
  - Replicate hosted models (similar pay-per-run model).

Treat this as an OPTIONAL "Enhance with AI ✨" button on top of the
already-good server render, not a replacement for it — the 3D render must
always work standalone (matches VirtualThreads' reliability, avoids
FitMockup's reported reliability complaints where the AI step is a single
point of failure for the whole export flow).

--------------------------------------------------------------------------------
7. TRACK F — STUDIO UI/UX RESTRUCTURE
--------------------------------------------------------------------------------

Upgrade `CustomizerDrawer.tsx` into a tabbed panel matching the depth
competitors offer, while keeping Kaos Kami's own editorial visual identity
(OKLCH tokens, Syne/JetBrains Mono type) — do not reskin toward a generic
SaaS-tool look:

```
┌─ STUDIO SANDBOX ───────────────────────────────┐
│ [Apparel & Fit] [Color & Material] [Sablon]     │
│ [Effects & Animation] [Camera] [My Designs]     │
├──────────────────────────────────────────────────┤
│ Tab: Apparel & Fit                               │
│   Garment switcher (chip row, thumbnails)        │
│   Size matrix (per-garment, dynamic)             │
│                                                    │
│ Tab: Color & Material                            │
│   [Single Color] [Multi-Part] toggle              │
│   Swatch grid (+ custom hex input)                │
│   Material finish cards w/ live preview thumbnail │
│                                                    │
│ Tab: Sablon (decal management)                   │
│   Layer list (front/back/sleeve), drag to reorder │
│   Upload button per layer, delete, duplicate      │
│   Selected layer: numeric x/y/scale/rotation      │
│     (synced bidirectionally with the on-mesh      │
│      gizmo from Track A — dragging updates these  │
│      numbers live, and vice versa)                │
│   Live price breakdown (from calculateCustomMockupPrice) │
│                                                    │
│ Tab: Effects & Animation                          │
│   Animation preset row (Static/Wind/Walk/Knit)    │
│   Speed slider                                    │
│   Lighting preset, Theme, Wireframe toggle         │
│                                                    │
│ Tab: Camera                                       │
│   Preset views (Front/Back/Left/Right/Iso)         │
│   Auto-spin toggle, Reset                          │
│   "Export" section: PNG (front/back/iso),          │
│     360° spin (WebP sprite v1 / MP4 v2), and the   │
│     "Enhance with AI ✨" button from Track E        │
│                                                    │
│ Tab: My Designs                                   │
│   Grid of saved designs (backend-synced per        │
│     BLUEPRINT-01 §4), each with a thumbnail        │
│     (server-rendered preview, not a live 3D re-    │
│      render — keeps this tab instant to open)      │
│   [Load] [Duplicate] [Delete] [Add to Cart →]      │
└──────────────────────────────────────────────────┘
```

Mobile layout collapses this into a bottom sheet (full detail in
BLUEPRINT-04) rather than the current side drawer — a side drawer eats
too much of a phone's limited width for a 3D canvas to remain usable.

--------------------------------------------------------------------------------
8. OUT OF SCOPE FOR V1 (explicitly deferred, do not build yet)
--------------------------------------------------------------------------------

- Real-time multi-user collaboration (3dmockups.app's live-cursor
  feature) — high complexity (needs a realtime sync layer like Liveblocks
  or Yjs + a WebSocket-capable host), low near-term value for a single-
  admin UMKM workflow. Revisit only if Kaos Kami starts onboarding
  external design partners.
- True rigged human-mannequin walking animation — needs a 3D artist to
  produce a properly skinned garment+body rig; the shader-based
  sway/wind approximation in Track C is the correct v1 tradeoff.
- Full physics-based cloth simulation — expensive at runtime, especially
  on the mobile-tier devices this project explicitly prioritizes; the
  wind-displacement vertex shader gives 80% of the visual payoff at ~1%
  of the compute cost.

================================================================================
END OF BLUEPRINT 02 — proceed to BLUEPRINT-03-ADMIN-USER-DASHBOARD.md
================================================================================
