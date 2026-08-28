================================================================================
"KAOS KAMI" 3D APPAREL — MASTER BUILD SPECIFICATION v2.1
(Autonomous AI Agent Ground Truth — designed for single-pass build)
================================================================================

TARGET STACK: Next.js 14 (App Router) · React Three Fiber · Three.js · GSAP · Lenis · Zustand
STATUS: v2.1 — supersedes v2.0/v1. All items in §0 must be respected; they
close real build-breaking gaps found in earlier drafts. v2.1 adds §17–18: an
explicit asset SOURCING pipeline (search → license-check → fetch → fallback)
for 3D models, video, and photography, on top of (never instead of) the
zero-missing-asset procedural guarantee from §0.1.

--------------------------------------------------------------------------------
0. CHANGELOG vs v1 — WHY THIS VERSION EXISTS
--------------------------------------------------------------------------------

Fixed / added in v2, in priority order:

1. **Zero-missing-asset guarantee.** v1 required `tshirt-heavyweight.glb`,
   `fabric-normal.jpg`, `fabric-roughness.jpg`, `default-artwork.png`, and local
   font files — none of which a text-only coding agent can generate. v2 makes
   every one of these **optional enhancements**: the app renders a fully
   correct, on-brand experience with zero external binary assets, and
   auto-upgrades to real assets the moment a human drops them in `/public`.
2. `@studio-freight/lenis` → `lenis` (the maintained package; the studio-freight
   scope is legacy).
3. Fonts moved to `next/font/google`, wired in `layout.tsx` — no local font
   files, no FOIT/FOUT.
4. `Preloader.tsx` actually implemented and mounted (via `useProgress`).
5. `ModelErrorBoundary` + procedural fallback mesh — GLTF load failure never
   blanks the canvas.
6. WebGL-unsupported / `prefers-reduced-motion` fallback path (`StaticShowcase`)
   — the site degrades to a static, still-on-brand page instead of breaking.
7. Lenis is actually stopped/started when `viewMode` flips to `"studio"`, via a
   Zustand subscription (no prop-drilling, no React Context needed).
8. Texture disposal implemented for real: every `useTexture`/blob-URL swap
   revokes and disposes the previous one.
9. SEO: metadata, Open Graph, Twitter card, `sitemap.ts`, `robots.ts`,
   Product JSON-LD.
10. Explicit **Build Order** (§12) — the exact sequence an agent should create
    files in, so nothing imports something that doesn't exist yet.
11. Scope fence: this spec builds a **marketing + 3D configurator landing
    page**. Cart/payment/checkout backend is explicitly OUT OF SCOPE — the
    "Acquire Piece" button is a CTA stub (documented in §11.6), not a payment
    flow. Do not invent a fake payment integration.
12. **[v2.1] Asset sourcing pipeline added (§17–18).** Earlier drafts only
    told the agent how to *fall back* when 3D models/photography/video were
    missing. v2.1 adds the missing other half: an explicit, license-aware
    procedure for the agent to *search for and acquire* real assets first
    (free/CC0 3D models, stock photography, ambient video), with the
    procedural fallback as the safety net if sourcing isn't possible or
    nothing suitable is found — never the other way around.

Everything not called out above is functionally the same intent as v1, just
completed to a buildable state.

--------------------------------------------------------------------------------
1. PROJECT SCOPE & BRAND
--------------------------------------------------------------------------------

Product: Heavyweight Cotton Combed (240 & 280 GSM) Boxy/Oversized Streetwear
T-Shirts, brand "kaos kami" (Indonesian premium streetwear).

Aesthetic: Editorial high-streetwear minimalism (Balenciaga / Acne Studios /
Awwwards-tier). Dark canvas, mono-technical data callouts, one acid-orange
accent, generous whitespace, confident oversized type.

Experience: real-time 3D garment inspection, scroll-driven visual storytelling
across 4 phases, procedural fabric shading, front/back graphic decals, and an
interactive 360° customizer studio at the end of the scroll.

Out of scope (do not build): payment processing, user accounts, real inventory,
CMS integration, multi-language i18n. These are documented as "Phase 2" ideas
in §16 only.

--------------------------------------------------------------------------------
2. DESIGN DNA
--------------------------------------------------------------------------------

Color space: OKLCH.

| Token                  | Value                              | Role                        |
|-------------------------|-------------------------------------|------------------------------|
| `--color-canvas`         | `oklch(0.12 0.01 250)`              | Deep obsidian background     |
| `--color-surface`        | `oklch(0.15 0.012 250 / 0.85)`      | Glass panel                  |
| `--color-surface-elevated` | `oklch(0.18 0.015 250 / 0.95)`    | Drawer / elevated panel      |
| `--color-text-primary`   | `oklch(0.96 0.01 90)`               | Bone white                   |
| `--color-text-muted`     | `oklch(0.62 0.01 240)`              | Industrial slate             |
| `--color-brand-accent`   | `oklch(0.72 0.22 45)`               | Signal tangerine             |
| `--color-border-subtle`  | `oklch(0.28 0.01 250 / 0.5)`        | Mechanical hairline border   |

Typography (via `next/font/google`, no local font files required):

| Role       | Font                         | Notes                                   |
|------------|-------------------------------|------------------------------------------|
| Display    | `Syne`                        | weight 700–800, tracking `-0.04em`       |
| Mono       | `JetBrains Mono`               | uppercase labels, tracking `0.05em`      |
| Body       | `Plus Jakarta Sans`            | line-height 1.6                          |

Breakpoints (Tailwind defaults are fine — do not add a custom scale): `sm 640`,
`md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Design mobile-first; the 3D canvas
and overlay cards must both work down to 375px width.

--------------------------------------------------------------------------------
3. MOTION DESIGN FRAMEWORK
--------------------------------------------------------------------------------

Curves: `cubic-bezier(0.16, 1, 0.3, 1)` (UI), `power3.out`/`expo.out` (camera),
`back.out(1.7)` (toggle snaps).

Timing: micro-interactions 150–250ms · drawers/overlays 400–600ms · full-scene
camera travel 1200–1800ms.

**A11y constraint (mandatory, not optional):** `prefers-reduced-motion: reduce`
must disable GSAP scrub-based camera movement AND Lenis smooth-wheel easing.
Concrete implementation is in §7.2 and §8.1 — this is not satisfied by only
adding a CSS media query; the JS timelines must actually branch on it.

--------------------------------------------------------------------------------
4. THREE.JS / R3F PIPELINE
--------------------------------------------------------------------------------

Canvas: `dpr={[1, 2]}`, `THREE.ACESFilmicToneMapping`, `toneMappingExposure: 1.15`,
`THREE.PCFSoftShadowMap`.

Material — heavyweight combed cotton: `roughness: 0.92`, `metalness: 0.05`,
`sheen: 0.6`, `sheenRoughness: 0.8`, `sheenColor: '#ffffff'`.

**Model strategy (this is the critical fix):**
- Primary: load `/public/models/tshirt-heavyweight.glb` (Draco-compressed) via
  `useGLTF` if present.
- Fallback: if the file is missing/404s or fails to parse, an error boundary
  catches it silently and renders the procedural box+cylinder+torus garment
  from v1 instead — same material, same decals, same silhouette proportions.
  **This fallback is not a "nice to have," it is the default expected state**
  for a fresh one-shot build, since no coding agent can author a real GLB.
  A human can later drop in a real model and the app upgrades automatically,
  with zero code changes.

Decal coordinates: front `[0, 0.1, 0.18]`, back `[0, 0.15, -0.18]` (matches the
procedural mesh proportions in v1 — kept identical for consistency).

--------------------------------------------------------------------------------
5. GSAP & SMOOTH SCROLL CHOREOGRAPHY
--------------------------------------------------------------------------------

Library: `lenis` (not `@studio-freight/lenis`), driven by the GSAP ticker,
synced to `ScrollTrigger.update`.

Scroll phases (0–100% of `#scroll-container`, which is 4 stacked `100vh`
sections — total scrollable height ≈ 400vh):

| Phase | Range   | Camera behavior                                                   |
|-------|---------|----------------------------------------------------------------------|
| 1     | 0–25%   | Hero idle float, bold type reveal                                 |
| 2     | 25–55%  | Macro fabric inspection — camera → `[0.35, 0.25, 0.9]`             |
| 3     | 55–80%  | 180° Y rotation reveal, camera frames upper back                  |
| 4     | 80–100% | HTML scroll unpins, `OrbitControls` enabled, customizer drawer opens |

**Scroll lock rule:** whenever `viewMode === "studio"` (whether reached by
scroll progress ≥0.85 or by the manual Navbar toggle), Lenis must be stopped
(`lenis.stop()`) so `OrbitControls` drag doesn't fight page scroll; it resumes
(`lenis.start()`) the moment `viewMode` returns to `"story"`. This is wired via
a Zustand store subscription inside `SmoothScrollProvider` — see §7.6.

--------------------------------------------------------------------------------
6. AI AGENT OPERATIONAL RULES ("GENJUTSU")
--------------------------------------------------------------------------------

- Zero AI slop: no generic rounded gradient cards, no decorative blur that
  tanks FPS, no stock Bootstrap-ish layouts.
- Strict TypeScript: no `any`. `tsconfig.json` has `"strict": true`.
- Memory-safe WebGL: every texture created via `useTexture`, `THREE.TextureLoader`,
  or `URL.createObjectURL` must be disposed/revoked when replaced or unmounted
  — implemented concretely in §7.4, not just stated as a rule.
- Every new file created must be added to the Build Order checklist in §12 in
  the correct dependency position.
- Do not invent payment/checkout backend logic — see §1 scope fence.

--------------------------------------------------------------------------------
7. IMPLEMENTATION — FULL FILE CONTENTS
--------------------------------------------------------------------------------

### 7.0 Directory tree (v2)

```
kaos-kami/
├── .env.example
├── .eslintrc.json
├── next.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── README.md
├── ASSET_CREDITS.md                     # NEW [v2.1] — log of every sourced external asset + license
├── public/
│   ├── favicon.ico                      # optional — falls back to generated icon
│   ├── og-image.jpg                     # optional — omit metadata field if absent
│   ├── models/
│   │   └── tshirt-heavyweight.glb       # OPTIONAL — procedural fallback if absent
│   ├── textures/                        # OPTIONAL — all textures are procedural by default
│   ├── video/                           # NEW [v2.1] — OPTIONAL ambient loop(s), see §17.3
│   │   └── atelier-loop.mp4
│   └── lookbook/                        # NEW [v2.1] — OPTIONAL editorial photography, see §17.4
│       ├── look-01.jpg
│       ├── look-02.jpg
│       ├── look-03.jpg
│       └── look-04.jpg
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── sitemap.ts
    │   └── robots.ts
    ├── components/
    │   ├── 3d/
    │   │   ├── CanvasStage.tsx
    │   │   ├── TshirtModel.tsx
    │   │   ├── ProceduralTshirt.tsx     # NEW — extracted fallback mesh
    │   │   ├── StudioLighting.tsx
    │   │   └── CameraRig.tsx
    │   ├── ui/
    │   │   ├── Navbar.tsx
    │   │   ├── Footer.tsx               # NEW
    │   │   ├── HeroOverlay.tsx
    │   │   ├── TechSpecsOverlay.tsx
    │   │   ├── BackGraphicOverlay.tsx
    │   │   ├── CustomizerDrawer.tsx
    │   │   ├── Preloader.tsx            # NEW — implemented
    │   │   ├── StaticShowcase.tsx       # NEW — no-WebGL / reduced-motion fallback
    │   │   ├── ModelErrorBoundary.tsx   # NEW
    │   │   ├── LookbookImage.tsx        # NEW [v2.1] — image w/ placeholder fallback
    │   │   ├── AmbientVideoBackground.tsx # NEW [v2.1] — video w/ poster fallback
    │   │   └── EditorialLookbook.tsx    # NEW [v2.1] — new landing-page section
    │   └── providers/
    │       └── SmoothScrollProvider.tsx
    ├── hooks/
    │   ├── useScrollPhases.ts
    │   └── useWebglSupport.ts           # NEW
    ├── store/
    │   └── useConfiguratorStore.ts
    └── lib/
        ├── constants.ts
        ├── utils.ts                      # NEW — cn() helper etc.
        ├── proceduralTextures.ts         # NEW — canvas-based 3D texture generators
        └── placeholderImage.ts           # NEW [v2.1] — canvas-based 2D image placeholder
```

### 7.1 `package.json`

```json
{
  "name": "kaos-kami-3d",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.10",
    "clsx": "^2.1.1",
    "gsap": "^3.12.5",
    "lenis": "^1.1.14",
    "lucide-react": "^0.454.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4",
    "three": "^0.169.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/node": "^20.16.11",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.169.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3"
  }
}
```
Note to agent: run `npm view <pkg> version` before install if uncertain — pin
to whatever resolves, exact patch numbers are not load-bearing for this spec.

### 7.2 `tailwind.config.ts` — unchanged from v1, keep as-is:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "text-primary": "var(--color-text-primary)",
        "text-muted": "var(--color-text-muted)",
        "brand-accent": "var(--color-brand-accent)",
        "border-subtle": "var(--color-border-subtle)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
```

### 7.3 `next.config.mjs` (NEW)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
```

### 7.4 `tsconfig.json` (NEW — strict)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 7.5 `.env.example` (NEW)

```
NEXT_PUBLIC_SITE_URL=https://kaoskami.com
```

### 7.6 `src/lib/utils.ts` (NEW)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 7.7 `src/lib/proceduralTextures.ts` (NEW — removes asset dependency)

```ts
"use client";
import * as THREE from "three";

/** Micro-weave normal map generated at runtime — no external fabric-normal.jpg needed. */
export function createFabricNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 4) {
    for (let y = 0; y < 512; y += 4) {
      const n = (Math.random() - 0.5) * 40;
      ctx.fillStyle = `rgb(${128 + n}, ${128 + n}, 255)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  return texture;
}

/** Default wordmark decal generated at runtime — no external default-artwork.png needed. */
export function createWordmarkDecal(label = "KAOS KAMI"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "#F5F3EF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 56px 'Arial', sans-serif";
  ctx.fillText(label.toUpperCase(), 256, 240);
  ctx.font = "400 16px 'Arial', sans-serif";
  ctx.fillStyle = "#E65100";
  ctx.fillText("HEAVYWEIGHT · 240GSM", 256, 290);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
```

### 7.8 `src/store/useConfiguratorStore.ts` — unchanged logic from v1, kept as-is

```ts
import { create } from "zustand";
import { PRODUCT_COLORS } from "@/lib/constants";

export type ViewMode = "story" | "studio";

interface ConfiguratorState {
  viewMode: ViewMode;
  selectedColor: string;
  activeColorName: string;
  frontGraphicUrl: string | null;
  backGraphicUrl: string | null;
  selectedSize: "S" | "M" | "L" | "XL" | "XXL";
  isRotating: boolean;
  activePhase: number;

  setViewMode: (mode: ViewMode) => void;
  setSelectedColor: (hex: string, name: string) => void;
  setFrontGraphicUrl: (url: string | null) => void;
  setBackGraphicUrl: (url: string | null) => void;
  setSelectedSize: (size: "S" | "M" | "L" | "XL" | "XXL") => void;
  setIsRotating: (rotating: boolean) => void;
  setActivePhase: (phase: number) => void;
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  viewMode: "story",
  selectedColor: PRODUCT_COLORS[0].hex,
  activeColorName: PRODUCT_COLORS[0].name,
  frontGraphicUrl: null,
  backGraphicUrl: null,
  selectedSize: "L",
  isRotating: false,
  activePhase: 1,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedColor: (hex, name) => set({ selectedColor: hex, activeColorName: name }),
  setFrontGraphicUrl: (url) => set({ frontGraphicUrl: url }),
  setBackGraphicUrl: (url) => set({ backGraphicUrl: url }),
  setSelectedSize: (size) => set({ selectedSize: size }),
  setIsRotating: (rotating) => set({ isRotating: rotating }),
  setActivePhase: (phase) => set({ activePhase: phase }),
}));
```
`frontGraphicUrl`/`backGraphicUrl` default to `null` now (v1 defaulted to a
missing PNG path) — `TshirtModel.tsx` falls back to `createWordmarkDecal()`
whenever these are `null`.

### 7.9 `src/lib/constants.ts` — unchanged from v1

(Keep exactly as in v1 §6.1 — `PRODUCT_COLORS` and `TECHNICAL_SPECS` arrays.
No changes needed.)

### 7.10 `src/components/3d/ProceduralTshirt.tsx` (NEW — extracted from v1's TshirtModel)

```tsx
"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Decal, useTexture } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { createFabricNormalMap, createWordmarkDecal } from "@/lib/proceduralTextures";

const DecalMesh: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  textureUrl: string | null;
}> = ({ position, rotation, scale, textureUrl }) => {
  const fallback = useMemo(() => createWordmarkDecal(), []);
  const uploaded = textureUrl ? useTexture(textureUrl) : null;
  const texture = uploaded ?? fallback;

  // Dispose the uploaded texture (blob URL) whenever it's replaced or unmounted.
  useEffect(() => {
    return () => {
      if (uploaded) uploaded.dispose();
    };
  }, [uploaded]);

  return (
    <Decal position={position} rotation={rotation} scale={scale}>
      <meshBasicMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-4} />
    </Decal>
  );
};

export const ProceduralTshirt: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { selectedColor, frontGraphicUrl, backGraphicUrl, isRotating } = useConfiguratorStore();
  const normalMap = useMemo(() => createFabricNormalMap(), []);

  const fabricMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedColor),
      roughness: 0.92,
      metalness: 0.05,
      normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
    });
  }, [selectedColor, normalMap]);

  useEffect(() => () => fabricMaterial.dispose(), [fabricMaterial]);

  useFrame((_, delta) => {
    if (meshRef.current && isRotating) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]} dispose={null}>
      <mesh castShadow receiveShadow material={fabricMaterial}>
        <boxGeometry args={[1.3, 1.4, 0.35]} />
        <DecalMesh
          position={[0, 0.1, 0.18]}
          rotation={[0, 0, 0]}
          scale={[0.5, 0.5, 0.5]}
          textureUrl={frontGraphicUrl}
        />
        <DecalMesh
          position={[0, 0.15, -0.18]}
          rotation={[0, Math.PI, 0]}
          scale={[0.7, 0.7, 0.7]}
          textureUrl={backGraphicUrl}
        />
      </mesh>

      <mesh castShadow receiveShadow material={fabricMaterial} position={[-0.85, 0.45, 0]} rotation={[0, 0, -Math.PI / 10]}>
        <cylinderGeometry args={[0.22, 0.24, 0.6, 32]} />
      </mesh>
      <mesh castShadow receiveShadow material={fabricMaterial} position={[0.85, 0.45, 0]} rotation={[0, 0, Math.PI / 10]}>
        <cylinderGeometry args={[0.22, 0.24, 0.6, 32]} />
      </mesh>

      <mesh material={fabricMaterial} position={[0, 0.7, 0]}>
        <torusGeometry args={[0.26, 0.04, 16, 64]} />
      </mesh>
    </group>
  );
};
```

### 7.11 `src/components/ui/ModelErrorBoundary.tsx` (NEW)

```tsx
"use client";
import React from "react";

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export class ModelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Expected in a fresh project without a real .glb — fall through silently.
    console.warn("[kaos-kami] GLTF model unavailable, using procedural fallback:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

### 7.12 `src/components/3d/TshirtModel.tsx` (REWRITTEN — GLTF-first with fallback)

```tsx
"use client";

import React, { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { ModelErrorBoundary } from "@/components/ui/ModelErrorBoundary";
import { ProceduralTshirt } from "./ProceduralTshirt";

const MODEL_PATH = "/models/tshirt-heavyweight.glb";

/** Renders the real GLB if present. Throws (caught by ModelErrorBoundary) if missing. */
const GltfTshirt: React.FC = () => {
  const { scene } = useGLTF(MODEL_PATH);
  return <primitive object={scene} dispose={null} />;
};

export const TshirtModel: React.FC = () => {
  return (
    <ModelErrorBoundary fallback={<ProceduralTshirt />}>
      <Suspense fallback={<ProceduralTshirt />}>
        <GltfTshirt />
      </Suspense>
    </ModelErrorBoundary>
  );
};

// Only attempts to preload; a 404 here is expected until a real model is added.
if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_PATH);
}
```
Note: material/color/decal application on the real GLB (once a human supplies
one) requires walking `scene.traverse()` to find the garment mesh and swap its
material — left as a documented TODO comment in code, since it depends on the
actual mesh names inside that specific GLB export.

### 7.13 `src/components/3d/StudioLighting.tsx` — unchanged from v1

(Keep exactly as in v1 §7.1 — ambient + spot + point + directional lights,
`ContactShadows`. No changes needed.)

### 7.14 `src/components/3d/CameraRig.tsx` — unchanged from v1

(Keep exactly as in v1 §7.3. No changes needed.)

### 7.15 `src/components/ui/Preloader.tsx` (NEW — implemented)

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

export const Preloader: React.FC = () => {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [active, progress]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden={!active}
    >
      <span className="font-display font-black text-2xl uppercase tracking-tighter text-text-primary mb-4">
        kaos kami<span className="text-brand-accent">.</span>
      </span>
      <div className="w-48 h-[2px] bg-border-subtle overflow-hidden rounded-full">
        <div
          className="h-full bg-brand-accent transition-[width] duration-200 ease-out-expo"
          style={{ width: `${Math.round(progress)}%` }}
        />
      </div>
      <span className="mt-3 font-mono text-[10px] text-text-muted tracking-widest">
        LOADING ASSETS — {Math.round(progress)}%
      </span>
    </div>
  );
};
```

### 7.16 `src/hooks/useWebglSupport.ts` (NEW)

```ts
"use client";
import { useEffect, useState } from "react";

export function useWebglSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported; // null while checking, then true/false
}
```

### 7.17 `src/components/ui/StaticShowcase.tsx` (NEW — no-WebGL fallback)

```tsx
"use client";
import React from "react";
import { PRODUCT_COLORS, TECHNICAL_SPECS } from "@/lib/constants";

/**
 * Rendered instead of the 3D canvas when WebGL is unavailable. Keeps the page
 * fully usable and on-brand — same copy, no 3D dependency.
 */
export const StaticShowcase: React.FC = () => {
  return (
    <main className="min-h-screen bg-canvas text-text-primary px-6 md:px-12 py-24 space-y-24">
      <section>
        <p className="font-mono text-xs text-brand-accent tracking-widest uppercase mb-3">
          // ARCHITECTURAL FIT / AUTONOMOUS STREETWEAR
        </p>
        <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter uppercase leading-[0.9]">
          OVERSIZED<br />HEAVY-KNIT
        </h1>
        <p className="mt-6 max-w-md text-sm text-text-muted font-mono">
          Your browser doesn&apos;t support interactive 3D previews — here&apos;s
          everything you need to know about the piece instead.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        {TECHNICAL_SPECS.map((spec) => (
          <div key={spec.label} className="p-6 rounded-2xl bg-surface border border-border-subtle">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[11px] font-mono text-text-muted">{spec.label}</span>
              <span className="text-sm font-mono font-bold text-brand-accent">{spec.value}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">{spec.detail}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">Colorways</h2>
        <div className="flex flex-wrap gap-3">
          {PRODUCT_COLORS.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-full border border-border-subtle">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }} />
              <span className="text-xs font-mono">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      <button className="w-full max-w-md py-4 rounded-xl bg-brand-accent text-canvas font-display font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all">
        ACQUIRE PIECE — IDR 289.000
      </button>
    </main>
  );
};
```

### 7.18 `src/components/3d/CanvasStage.tsx` (UPDATED — adds Preloader mount)

```tsx
"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLighting } from "./StudioLighting";
import { TshirtModel } from "./TshirtModel";
import { CameraRig } from "./CameraRig";
import { Preloader } from "@/components/ui/Preloader";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

interface CanvasStageProps {
  camPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ camPos, lookAtPos }) => {
  const { viewMode } = useConfiguratorStore();

  return (
    <>
      <Preloader />
      <div className={`webgl-canvas-container ${viewMode === "studio" ? "interactive" : ""}`}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
        >
          <Suspense fallback={null}>
            <StudioLighting />
            <TshirtModel />
            <CameraRig targetPosition={camPos} targetLookAt={lookAtPos} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
};
```

### 7.19 `src/components/providers/SmoothScrollProvider.tsx` (REWRITTEN)

```tsx
"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

gsap.registerPlugin(ScrollTrigger);

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.9,
    });

    lenis.on("scroll", ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Stop/start Lenis whenever the configurator enters/exits the 3D studio,
    // so OrbitControls drag never fights page scroll. No React re-render
    // needed — this subscribes directly to the Zustand store.
    const unsubscribe = useConfiguratorStore.subscribe((state, prevState) => {
      if (state.viewMode === prevState.viewMode) return;
      if (state.viewMode === "studio") lenis.stop();
      else lenis.start();
    });

    return () => {
      unsubscribe();
      lenis.destroy();
      gsap.ticker.remove(raf);
    };
  }, []);

  return <>{children}</>;
};
```

### 7.20 `src/hooks/useScrollPhases.ts` (UPDATED — reduced-motion branch)

```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

gsap.registerPlugin(ScrollTrigger);

export const useScrollPhases = () => {
  const { setViewMode, setActivePhase } = useConfiguratorStore();
  const camPosRef = useRef(new THREE.Vector3(0, 0, 2.5));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrub = prefersReducedMotion ? true : 1.2; // true = snap immediately, no lag

    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub,
        onUpdate: (self) => {
          const progress = self.progress;
          if (progress < 0.25) setActivePhase(1);
          else if (progress < 0.6) setActivePhase(2);
          else if (progress < 0.85) setActivePhase(3);
          else setActivePhase(4);

          setViewMode(progress >= 0.85 ? "studio" : "story");
        },
      },
    });

    const ease = prefersReducedMotion ? "none" : "power2.inOut";

    masterTimeline.to(camPosRef.current, { x: 0.35, y: 0.25, z: 0.9, ease }, 0.25);
    masterTimeline.to(lookAtRef.current, { x: 0.1, y: 0.2, z: 0.1, ease }, 0.25);
    masterTimeline.to(camPosRef.current, { x: 0, y: 0.15, z: -2.2, ease }, 0.6);
    masterTimeline.to(lookAtRef.current, { x: 0, y: 0, z: 0, ease }, 0.6);
    masterTimeline.to(camPosRef.current, { x: 0, y: 0.4, z: 2.2, ease: prefersReducedMotion ? "none" : "expo.out" }, 0.85);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [setActivePhase, setViewMode]);

  return { camPos: camPosRef.current, lookAtPos: lookAtRef.current };
};
```

### 7.21 UI overlays — `Navbar.tsx`, `HeroOverlay.tsx`, `TechSpecsOverlay.tsx`,
`BackGraphicOverlay.tsx` — **unchanged from v1** (§9.1–9.4). Keep exactly as
written there; no fixes needed in those files.

### 7.22 `src/components/ui/Footer.tsx` (NEW)

```tsx
import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-10 flex flex-col md:flex-row justify-between gap-6">
      <div>
        <span className="font-display font-black uppercase text-text-primary">
          kaos kami<span className="text-brand-accent">.</span>
        </span>
        <p className="text-xs font-mono text-text-muted mt-2 max-w-xs">
          Heavyweight Indonesian streetwear. Engineered, not printed.
        </p>
      </div>
      <div className="flex gap-8 text-xs font-mono text-text-muted uppercase">
        <span>Jakarta, ID</span>
        <span>© {new Date().getFullYear()} Kaos Kami</span>
      </div>
    </footer>
  );
};
```

### 7.23 `src/components/ui/CustomizerDrawer.tsx` (UPDATED — back upload + disposal)

```tsx
"use client";

import React, { useRef } from "react";
import { Upload, RotateCcw, Check, X } from "lucide-react";
import { PRODUCT_COLORS } from "@/lib/constants";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const CustomizerDrawer: React.FC = () => {
  const {
    selectedColor,
    activeColorName,
    setSelectedColor,
    frontGraphicUrl,
    setFrontGraphicUrl,
    backGraphicUrl,
    setBackGraphicUrl,
    selectedSize,
    setSelectedSize,
    isRotating,
    setIsRotating,
  } = useConfiguratorStore();

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleUpload =
    (current: string | null, setter: (url: string | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (current && current.startsWith("blob:")) URL.revokeObjectURL(current);
      setter(URL.createObjectURL(file));
    };

  const clearGraphic = (current: string | null, setter: (url: string | null) => void) => () => {
    if (current && current.startsWith("blob:")) URL.revokeObjectURL(current);
    setter(null);
  };

  return (
    <section className="h-screen w-full flex items-end justify-center md:justify-end p-6 md:p-12 relative z-30 pointer-events-none">
      <div className="w-full max-w-lg p-6 md:p-8 rounded-2xl bg-surface-elevated border border-border-subtle backdrop-blur-xl shadow-2xl pointer-events-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-[10px] font-mono text-brand-accent tracking-widest uppercase">// 3D STUDIO</span>
            <h3 className="text-xl font-display font-black uppercase text-text-primary">CONFIGURE PIECE</h3>
          </div>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-2 rounded-full border border-border-subtle transition-colors ${
              isRotating ? "bg-brand-accent text-canvas" : "bg-canvas text-text-muted"
            }`}
            title="Toggle Auto-Spin"
            aria-pressed={isRotating}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-text-muted">COLORWAY:</span>
            <span className="text-text-primary font-bold">{activeColorName}</span>
          </div>
          <div className="flex space-x-3">
            {PRODUCT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.hex, c.name)}
                style={{ backgroundColor: c.hex }}
                aria-label={c.name}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  selectedColor === c.hex ? "border-brand-accent scale-110" : "border-border-subtle"
                }`}
              >
                {selectedColor === c.hex && (
                  <Check size={14} className={c.id === "chalk" ? "text-canvas" : "text-text-primary"} />
                )}
              </button>
            ))}
          </div>
        </div>

        {[
          { label: "FRONT SABLON DECAL", url: frontGraphicUrl, ref: frontInputRef, setter: setFrontGraphicUrl },
          { label: "BACK SABLON DECAL", url: backGraphicUrl, ref: backInputRef, setter: setBackGraphicUrl },
        ].map(({ label, url, ref, setter }) => (
          <div className="mb-4" key={label}>
            <span className="block text-xs font-mono text-text-muted mb-2">{label} (PNG/JPG):</span>
            <input
              type="file"
              ref={ref}
              onChange={handleUpload(url, setter)}
              accept="image/png, image/jpeg"
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => ref.current?.click()}
                className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg border border-dashed border-border-subtle hover:border-brand-accent bg-canvas/50 text-xs font-mono text-text-primary transition-colors"
              >
                <Upload size={14} className="text-brand-accent" />
                <span>{url ? "REPLACE" : "UPLOAD"}</span>
              </button>
              {url && (
                <button
                  onClick={clearGraphic(url, setter)}
                  aria-label={`Remove ${label}`}
                  className="px-3 rounded-lg border border-border-subtle text-text-muted hover:text-brand-accent"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="mb-6 mt-2">
          <span className="block text-xs font-mono text-text-muted mb-2">STREET-CUT SIZING:</span>
          <div className="grid grid-cols-5 gap-2">
            {(["S", "M", "L", "XL", "XXL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`py-2 rounded font-mono text-xs font-bold border transition-colors ${
                  selectedSize === s
                    ? "bg-text-primary text-canvas border-text-primary"
                    : "bg-canvas border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* CTA stub — no payment integration in this scope. Wire to a real
            checkout flow in a future iteration; see spec §16. */}
        <button className="w-full py-4 rounded-xl bg-brand-accent text-canvas font-display font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all">
          ACQUIRE PIECE — IDR 289.000
        </button>
      </div>
    </section>
  );
};
```

### 7.24 `src/app/globals.css` — unchanged from v1 (§5.2), keep as-is.

### 7.25 `src/app/layout.tsx` (REWRITTEN — fonts + metadata + SEO)

```tsx
import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "kaos kami — Heavyweight 3D Apparel Experience",
  description:
    "Engineered oversized streetwear. 240–280 GSM combed cotton, inspected and customized in real-time 3D.",
  openGraph: {
    title: "kaos kami",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
    url: siteUrl,
    siteName: "kaos kami",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "kaos kami",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e1e22",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${syne.variable} ${mono.variable} ${jakarta.variable}`}>
      <body className="bg-canvas text-text-primary selection:bg-brand-accent selection:text-canvas">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
```
`og-image.jpg` is intentionally omitted from `openGraph.images` — add it back
once a human supplies `/public/og-image.jpg`.

### 7.26 `src/app/page.tsx` (REWRITTEN — WebGL gate + reduced-motion gate)

```tsx
"use client";

import React from "react";
import { CanvasStage } from "@/components/3d/CanvasStage";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroOverlay } from "@/components/ui/HeroOverlay";
import { TechSpecsOverlay } from "@/components/ui/TechSpecsOverlay";
import { BackGraphicOverlay } from "@/components/ui/BackGraphicOverlay";
import { CustomizerDrawer } from "@/components/ui/CustomizerDrawer";
import { StaticShowcase } from "@/components/ui/StaticShowcase";
import { EditorialLookbook } from "@/components/ui/EditorialLookbook";
import { useScrollPhases } from "@/hooks/useScrollPhases";
import { useWebglSupport } from "@/hooks/useWebglSupport";

export default function Home() {
  const { camPos, lookAtPos } = useScrollPhases();
  const webglSupported = useWebglSupport();

  if (webglSupported === false) {
    return <StaticShowcase />;
  }

  return (
    <main className="relative bg-canvas">
      <Navbar />
      {webglSupported && <CanvasStage camPos={camPos} lookAtPos={lookAtPos} />}

      <div id="scroll-container" className="relative z-20">
        <HeroOverlay />
        <TechSpecsOverlay />
        <BackGraphicOverlay />
        <CustomizerDrawer />
      </div>

      {/* Static section, not tied to GSAP scroll phases — sits after the pinned
          3D story and before the footer. See §17.4/§18.3. */}
      <EditorialLookbook />

      <Footer />
    </main>
  );
}
```
`webglSupported` is `null` on first render (server + first paint) — the canvas
mounts once the client check resolves `true`, avoiding a hydration mismatch.

### 7.27 `src/app/sitemap.ts` (NEW)

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [{ url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
```

### 7.28 `src/app/robots.ts` (NEW)

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

### 7.29 `.eslintrc.json` (NEW)

```json
{
  "extends": "next/core-web-vitals"
}
```

### 7.30 `README.md` (NEW)

```md
# kaos kami — 3D Apparel Experience

## Setup
1. `npm install`
2. `cp .env.example .env.local` and set `NEXT_PUBLIC_SITE_URL`
3. `npm run dev`

## Optional assets (app works without all of these — see BUILD-SPEC §0.1)
- `public/models/tshirt-heavyweight.glb` — real garment mesh (Draco-compressed)
- `public/og-image.jpg` — 1200×630 social preview image
- `public/favicon.ico`

## Verification before shipping
- `npm run typecheck` — must be 0 errors
- `npm run lint`
- `npm run build`
```

--------------------------------------------------------------------------------
8. ACCESSIBILITY
--------------------------------------------------------------------------------

- `prefers-reduced-motion: reduce` disables Lenis smoothing and collapses GSAP
  camera tweens to instant (`scrub: true`, `ease: "none"`) — implemented in
  §7.19/§7.20, not just a CSS rule.
- If WebGL is unavailable, `StaticShowcase` renders instead of a blank canvas
  — implemented in §7.17/§7.26.
- All interactive controls (color swatches, size buttons, upload buttons) have
  `aria-label`/`aria-pressed` where the visual state isn't otherwise conveyed
  in text.
- Canvas container is `pointer-events: none` except during the studio phase,
  so it never traps keyboard/focus during the story phases.

--------------------------------------------------------------------------------
9. PERFORMANCE BUDGET
--------------------------------------------------------------------------------

- Procedural mesh: well under 40,000 polys (few primitives). If/when a real
  GLB is added, keep it under 40,000 polys and Draco-compress it.
- `dpr={[1, 2]}` hard cap — never remove.
- All canvas-generated textures (`proceduralTextures.ts`) are created once via
  `useMemo` and disposed on unmount — never regenerated per frame.
- Target: Lighthouse Performance ≥ 85 mobile, ≥ 95 desktop; LCP < 2.5s on the
  hero (note the 3D canvas is not the LCP element — `HeroOverlay`'s `<h1>` is).

--------------------------------------------------------------------------------
10. SEO / STRUCTURED DATA
--------------------------------------------------------------------------------

Add a `<script type="application/ld+json">` in `page.tsx` (or a small
`JsonLd.tsx` component) with a minimal `Product` schema — name, description,
brand "kaos kami", and `offers.priceCurrency: "IDR"`. Keep it factual to what's
actually on the page; do not fabricate review counts or ratings.

--------------------------------------------------------------------------------
11. AGENT VERIFICATION CHECKLIST (run in this order after generating all files)
--------------------------------------------------------------------------------

1. `npm install` — must complete with no unresolved peer-dep errors.
2. `npm run typecheck` — 0 errors (no `any` anywhere).
3. `npm run lint` — 0 errors.
4. `npm run build` — must succeed **even with `public/models/` empty** (this
   is the single most important check — it proves the zero-missing-asset
   guarantee in §0.1 actually holds).
5. `npm run dev` and manually verify:
   - Canvas renders the procedural garment (no blank screen, no console error
     about a missing GLB beyond the expected warning).
   - Scrolling through all 4 phases moves the camera and updates
     `activePhase` in the store.
   - At phase 4, `OrbitControls` responds to drag and Lenis stops (page does
     not also scroll while dragging).
   - Uploading a front/back image swaps the decal and the old blob URL is
     revoked (check DevTools memory tab doesn't accumulate blob URLs across
     repeated uploads).
   - Toggling `prefers-reduced-motion` in DevTools rendering tab removes the
     scroll-scrub lag.
   - Throttling/disabling WebGL in DevTools renders `StaticShowcase`, not a
     blank page.
6. Resize to 375px width — overlay cards must not overflow or occlude each
   other; canvas must not push horizontal scroll onto the page.

--------------------------------------------------------------------------------
12. BUILD ORDER FOR THE AI AGENT
--------------------------------------------------------------------------------

Create files in this exact order so nothing imports a module that doesn't
exist yet:

1. `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`,
   `postcss.config.mjs`, `.eslintrc.json`, `.env.example`
2. `src/lib/utils.ts`, `src/lib/constants.ts`, `src/lib/proceduralTextures.ts`
3. `src/store/useConfiguratorStore.ts`
4. `src/app/globals.css`
5. `src/components/3d/StudioLighting.tsx`
6. `src/components/3d/ProceduralTshirt.tsx`
7. `src/components/ui/ModelErrorBoundary.tsx`
8. `src/components/3d/TshirtModel.tsx`
9. `src/components/3d/CameraRig.tsx`
10. `src/components/ui/Preloader.tsx`
11. `src/components/3d/CanvasStage.tsx`
12. `src/hooks/useWebglSupport.ts`
13. `src/hooks/useScrollPhases.ts`
14. `src/components/providers/SmoothScrollProvider.tsx`
15. `src/components/ui/Navbar.tsx`, `HeroOverlay.tsx`, `TechSpecsOverlay.tsx`,
    `BackGraphicOverlay.tsx`, `Footer.tsx`, `CustomizerDrawer.tsx`,
    `StaticShowcase.tsx`
16. `src/lib/placeholderImage.ts`, `src/components/ui/LookbookImage.tsx`,
    `src/components/ui/AmbientVideoBackground.tsx`,
    `src/components/ui/EditorialLookbook.tsx`
17. `src/app/layout.tsx`
18. `src/app/page.tsx`
19. `src/app/sitemap.ts`, `src/app/robots.ts`
20. `README.md`
21. **Run the full checklist in §11 now, with `public/models/`, `public/video/`,
    and `public/lookbook/` still empty.** This must pass before step 22 — it
    proves the site is fully functional on procedural fallbacks alone.
22. **[Optional] Asset Sourcing Pass — §17.** Only after step 21 passes, and
    only if the agent's environment has live web access: attempt to source
    real 3D models, video, and photography per §17. This step must never be
    allowed to leave the build in a broken state — if a fetched asset causes
    a build/runtime error, remove it and let the procedural fallback take
    over rather than leaving a partially-wired asset in place.

--------------------------------------------------------------------------------
13. CUSTOMIZER SCOPE STUB
--------------------------------------------------------------------------------

"ACQUIRE PIECE" is a static CTA button with no `onClick` handler wired to any
backend. This is intentional — payment/checkout is out of scope for this spec
(see §1). Do not implement Stripe/Midtrans/a fake order flow unless
explicitly asked in a follow-up.

--------------------------------------------------------------------------------
14. DEPLOYMENT (Vercel)
--------------------------------------------------------------------------------

1. Push to a Git repo, import into Vercel.
2. Set `NEXT_PUBLIC_SITE_URL` env var to the production domain.
3. Framework preset: Next.js (auto-detected). Build command `next build`.
4. No serverless functions/DB required for this scope — static + client
   components only.

--------------------------------------------------------------------------------
15. WHAT v2 DELIBERATELY DOES NOT ADD
--------------------------------------------------------------------------------

To keep this buildable in one pass, v2 does **not** add: postprocessing bloom/
DOF effects, a CMS-driven product catalog, multi-product routing, cart
persistence, i18n, or automated tests. These are reasonable v3 ideas (§16) but
each adds real scope and asset/infra dependencies that would break the
single-pass build guarantee this spec is optimized for.

--------------------------------------------------------------------------------
16. FUTURE ITERATIONS (not part of this build)
--------------------------------------------------------------------------------

- Swap the procedural garment for a real Draco GLB with named mesh nodes for
  per-panel material assignment.
- Real checkout via a payment provider once business logic is defined.
- Multi-product catalog + CMS (Sanity/Contentful).
- Playwright smoke tests for the scroll phases and customizer.

--------------------------------------------------------------------------------
17. [v2.1] ASSET SOURCING & CREATION PIPELINE
--------------------------------------------------------------------------------

This section tells the agent what to *actively look for and try to acquire*,
not just what to fall back to. It only applies if the agent's runtime has live
web access (search/fetch tools). If it doesn't, skip straight to the
fallbacks already built in §7 — the site is fully functional without this
section.

### 17.1 Priority ladder (applies to every asset type below)

1. **Already present** — if a file already exists at the target path in
   `public/`, use it as-is, do not overwrite it.
2. **Sourced** — if live web access is available, search the vetted sources
   listed per asset type below, filtered to a license that permits commercial
   use with no per-unit fee (CC0 preferred; CC-BY acceptable if attribution is
   recorded). Download, place in the correct path, and log it.
3. **Procedural fallback** — if step 2 isn't possible or nothing suitable is
   found within a reasonable number of attempts (≈5 searches per asset), stop
   and rely on the procedural generator already specified in §7. Never leave
   the build blocked on step 2.

**Every asset that reaches step 2 must be logged** in `ASSET_CREDITS.md`:

```md
| Asset | Source URL | License | Fetched | Attribution required? |
|-------|-----------|---------|---------|------------------------|
| tshirt-heavyweight.glb | <url> | CC0 | 2026-08-27 | No |
```

### 17.2 3D model (`public/models/tshirt-heavyweight.glb`)

Search targets, in order of preference (all offer CC0/free-commercial assets):
- **Poly Haven** (polyhaven.com) — CC0, no attribution needed.
- **Quaternius** (quaternius.com) — CC0, low-poly stylized packs, good fit for
  the boxy/oversized silhouette.
- **Kenney** (kenney.nl) — CC0, mostly game assets but occasionally apparel.
- **Sketchfab** (sketchfab.com) — filter search to **Downloadable** +
  **CC0** or **CC Attribution** only. Do not use anything marked "Editorial"
  or "Standard" (non-commercial) license.

Search query patterns: `"t-shirt" OR "oversized shirt" 3D model CC0
downloadable`, `streetwear apparel low poly model free`.

After download:
- Run it through `gltf-transform` (or Blender's glTF exporter with Draco
  enabled) to Draco-compress it. Target: **under 5MB, under 40,000 polys**
  (§9 perf budget is non-negotiable).
- Open it once in `npm run dev` and check the browser console for the mesh
  node names (`scene.traverse(n => console.log(n.name))` temporarily in
  `GltfTshirt`). Update the material-swap TODO in §7.12 to target the actual
  garment mesh name(s) found — do not guess.
- If the model's proportions are wildly different from the procedural
  fallback (e.g. it's a fitted tee, not oversized/boxy), prefer continuing the
  search over shipping an off-brand silhouette — the procedural fallback is a
  better result than a wrong-fit garment.

### 17.3 Ambient video (`public/video/atelier-loop.mp4`) — optional, off by default

This is a nice-to-have hero/section enhancement, not a requirement. Only wire
it in if a suitable clip is actually found.

Search targets (all free-for-commercial, no attribution required):
- **Pexels Videos** (pexels.com/videos)
- **Coverr** (coverr.co)
- **Mixkit** (mixkit.co/free-stock-video)

Search query patterns: `fabric close up macro loop`, `textile weave slow
motion`, `minimal studio product loop`. Avoid anything with visible people's
faces (keeps it license-simple and on-brand for a garment-focused site).

Constraints — all mandatory if a video is wired in:
- ≤ 8MB, ≤ 15s, looped, **muted**, `playsinline`, with a real `poster` image
  (never autoplay audio; browsers block unmuted autoplay anyway).
- Must respect `prefers-reduced-motion` — freeze on the poster frame instead
  of autoplaying (implemented in `AmbientVideoBackground.tsx`, §18.2).
- Lazy — only mount the `<video>` tag once its section scrolls near the
  viewport, never in the initial hero paint budget.

If nothing suitable is found, leave `srcMp4` unset — `AmbientVideoBackground`
renders its `poster` image only, which itself falls back to a generated
placeholder (§17.4) if no real photo is available either. The site must never
show a broken video element.

### 17.4 Editorial photography (`public/lookbook/look-0X.jpg`)

Search targets:
- **Unsplash** (unsplash.com) — free commercial license, no attribution
  legally required (but crediting the photographer is good practice — log it
  anyway).
- **Pexels** (pexels.com) — same terms.

Search query patterns: `streetwear editorial minimal studio`, `oversized
t-shirt model dark background`, `fashion campaign monochrome`. Prefer images
that already lean dark/moody to match the OKLCH obsidian palette — don't pick
bright lifestyle shots that will need heavy CSS filtering to fit the brand.

**Do not** use images of identifiable real public figures/celebrities, or any
image whose license is unclear — skip and keep searching, or fall through to
the placeholder.

Fallback if nothing is sourced: `generatePlaceholderImage()` (§18.1) produces
a brand-consistent generated image (OKLCH-tinted gradient + mono caption like
"LOOK 01 — OBSIDIAN") instead of a gray broken-image box. This keeps
`EditorialLookbook`'s grid fully populated and on-brand with zero external
assets, exactly like the 3D texture strategy in §7.7.

### 17.5 Icons

No sourcing needed — `lucide-react` (already a dependency) covers every icon
in this spec as vector components. Do not fetch icon image files.

--------------------------------------------------------------------------------
18. [v2.1] NEW COMPONENT IMPLEMENTATIONS
--------------------------------------------------------------------------------

### 18.1 `src/lib/placeholderImage.ts` (NEW)

```ts
"use client";

/** Brand-consistent generated placeholder — used whenever a real sourced
 *  image isn't available. Returns a data URL, safe to use directly as an
 *  <img src>. Never shows as a broken image. */
export function generatePlaceholderImage(caption: string, seed = 0): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d")!;

  const hueShift = (seed * 37) % 40; // small deterministic variation per index
  const grad = ctx.createLinearGradient(0, 0, 0, 1000);
  grad.addColorStop(0, `hsl(${220 + hueShift}, 10%, 16%)`);
  grad.addColorStop(1, `hsl(${220 + hueShift}, 12%, 9%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1000);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let y = 40; y < 1000; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#E65100";
  ctx.font = "600 14px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(caption.toUpperCase(), 400, 500);

  return canvas.toDataURL("image/png");
}
```

### 18.2 `src/components/ui/AmbientVideoBackground.tsx` (NEW)

```tsx
"use client";

import React, { useEffect, useState } from "react";

interface Props {
  /** Path under /public, e.g. "/video/atelier-loop.mp4". Omit if none sourced. */
  srcMp4?: string;
  poster: string;
  className?: string;
}

export const AmbientVideoBackground: React.FC<Props> = ({ srcMp4, poster, className }) => {
  const [videoOk, setVideoOk] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setVideoOk(!!srcMp4 && !reduced);
  }, [srcMp4]);

  if (!videoOk) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" className={className} />;
  }

  return (
    <video
      className={className}
      src={srcMp4}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setVideoOk(false)}
    />
  );
};
```

### 18.3 `src/components/ui/LookbookImage.tsx` (NEW)

```tsx
"use client";

import React, { useState } from "react";
import { generatePlaceholderImage } from "@/lib/placeholderImage";

interface Props {
  /** Real sourced path, e.g. "/lookbook/look-01.jpg". May not exist yet. */
  src: string;
  caption: string;
  seed: number;
  className?: string;
}

export const LookbookImage: React.FC<Props> = ({ src, caption, seed, className }) => {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [usedFallback, setUsedFallback] = useState(false);

  const handleError = () => {
    if (usedFallback) return; // avoid loop if the placeholder itself ever fails
    setUsedFallback(true);
    setResolvedSrc(generatePlaceholderImage(caption, seed));
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolvedSrc} onError={handleError} alt={caption} className={className} loading="lazy" />
  );
};
```

### 18.4 `src/components/ui/EditorialLookbook.tsx` (NEW — new landing page section)

```tsx
import React from "react";
import { LookbookImage } from "./LookbookImage";

const LOOKS = [
  { src: "/lookbook/look-01.jpg", caption: "Look 01 — Obsidian" },
  { src: "/lookbook/look-02.jpg", caption: "Look 02 — Chalk Ecru" },
  { src: "/lookbook/look-03.jpg", caption: "Look 03 — Signal Tangerine" },
  { src: "/lookbook/look-04.jpg", caption: "Look 04 — Military Olive" },
];

export const EditorialLookbook: React.FC = () => {
  return (
    <section className="relative z-20 bg-canvas px-6 md:px-12 py-24">
      <span className="block text-[10px] font-mono text-brand-accent uppercase tracking-widest mb-2">
        // LOOKBOOK
      </span>
      <h2 className="text-3xl md:text-5xl font-display font-black uppercase text-text-primary mb-10">
        FIELD NOTES
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {LOOKS.map((look, i) => (
          <div key={look.caption} className="aspect-[4/5] overflow-hidden rounded-xl border border-border-subtle">
            <LookbookImage
              src={look.src}
              caption={look.caption}
              seed={i}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
};
```

Each `<img>` above will silently self-heal to a generated placeholder via
`onError` if `public/lookbook/look-0X.jpg` doesn't exist yet — so this section
is safe to include in the build order (§12 step 16) *before* any real
photography has been sourced.

--------------------------------------------------------------------------------
19. AGENT VERIFICATION CHECKLIST — v2.1 ADDENDUM
--------------------------------------------------------------------------------

In addition to §11, after an Asset Sourcing Pass (§12 step 22):

- Every file in `ASSET_CREDITS.md` corresponds to a file that actually exists
  in `public/`.
- `npm run build` still succeeds.
- Removing any single sourced asset (rename it temporarily) and reloading the
  dev server must NOT crash the page — the corresponding fallback must take
  over cleanly. This is the real test of §17's "never block the build" rule.

================================================================================
END OF SPEC v2.1
================================================================================
