# Kaos Kami — 3D Apparel Experience

Indonesian Heavyweight (240 & 280 GSM) Combed Cotton Streetwear Landing Page & 3D Configurator.

Built with **Next.js 14 (App Router)**, **React Three Fiber**, **Three.js**, **GSAP**, **Lenis**, and **Zustand**.

---

## ⚡ Key Features

- **Zero-Missing-Asset Guarantee**: The site is 100% functional out of the box with procedural 3D garment mesh, dynamic micro-weave canvas normal maps, and dynamic wordmark decal rendering.
- **Scroll-Driven Storytelling**: 4 choreographed camera phases linked to scroll progress via GSAP ScrollTrigger and Lenis.
- **3D Customizer Studio**: Colorway switching, real-time custom decal PNG uploaders with memory-safe VRAM disposal, sizing selector, 360° continuous spin, and OrbitControls rotation.
- **Accessibility & Fallbacks**: Dedicated non-WebGL fallback (`StaticShowcase.tsx`) and full support for `prefers-reduced-motion`.
- **Editorial Design System**: OKLCH color space (Deep Obsidian, Signal Tangerine), Syne + JetBrains Mono typography, hairline borders, and glassmorphism.

---

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run local development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Optional External Assets

The application will automatically detect and upgrade to external assets if dropped into `/public`:
- `public/models/tshirt-heavyweight.glb` — Draco-compressed 3D GLTF model
- `public/lookbook/look-01.jpg` to `look-04.jpg` — Sourced high-resolution photography
- `public/video/atelier-loop.mp4` — Ambient background video loop

---

## 🛠️ Verification & Build

- `npm run typecheck` — Type checking (strict mode)
- `npm run lint` — ESLint validation
- `npm run build` — Production Next.js build
