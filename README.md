# Kaos Kami — 3D Apparel Experience

Indonesian Heavyweight (240 & 280 GSM) Combed Cotton Streetwear Landing Page & 3D Configurator.

Built with **Next.js 15.5 (App Router)**, **React 19**, **React Three Fiber**, **Three.js 0.180**, **GSAP**, **Lenis**, and **Zustand**.

---

## ⚡ Key Features

- **Zero-Missing-Asset Guarantee**: The site is 100% functional out of the box with procedural 3D garment mesh, dynamic micro-weave canvas normal maps, and dynamic wordmark decal rendering.
- **Scroll-Driven Storytelling**: 4 choreographed camera phases linked to scroll progress via GSAP ScrollTrigger and Lenis.
- **3D Customizer Studio**: Colorway switching, real-time custom decal PNG uploaders with memory-safe VRAM disposal, sizing selector, 360° continuous spin, and OrbitControls rotation.
- **Accessibility & Fallbacks**: Dedicated non-WebGL fallback (`StaticShowcase.tsx`) and full support for `prefers-reduced-motion`.
- **Editorial Design System**: OKLCH color space (Deep Obsidian, Signal Tangerine), Syne + JetBrains Mono typography, hairline borders, and glassmorphism.

---

## 🚀 Quick Start (monorepo — run from repo root)

1. Install dependencies (root):
   ```bash
   npm install
   ```

2. Run web (Next.js 15.5) — http://localhost:3000:
   ```bash
   npm run web:dev
   ```

3. Run mobile (Next.js 15.5 + Capacitor) — http://localhost:3001:
   ```bash
   npm run mobile:dev
   ```

4. Typecheck & build:
   ```bash
   npm run web:typecheck
   npm run web:build
   npm run mobile:build
   ```

---

## 📦 Optional External Assets

The application will automatically detect and upgrade to external assets if dropped into `kaos-kami-web/public`:
- `kaos-kami-web/public/models/tshirt-heavyweight.glb` — Draco-compressed 3D GLTF model (rantai aktif: `*.draco.glb` → master `*.glb` → legacy, decoder di `kaos-kami-web/public/decoders/draco/`)
- `kaos-kami-web/public/lookbook/look-01.jpg` to `look-04.jpg` — Sourced high-resolution photography
- `kaos-kami-web/public/video/atelier-loop.mp4` — Ambient background video loop

---

## 🛠️ Verification & Build

- `npm run web:typecheck` — Type checking web (`kaos-kami-web/`, strict mode)
- `npm run web:build` — Production Next.js web build (`kaos-kami-web/`)
- `npm run mobile:build` — Production mobile build (`kaos-kami-mobile/`)
