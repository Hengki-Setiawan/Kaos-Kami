================================================================================
KAOS KAMI — BLUEPRINT 04 / 04
MOBILE EXPERIENCE, PERFORMANCE BUDGET & FULL INFRASTRUCTURE / DEVOPS STACK
================================================================================
Version: 1.0 · Depends on: BLUEPRINT-01, 02, 03 (this document explains how
to RUN and SHIP everything they describe, cheaply and reliably, and how to
make the 3D experience genuinely good on a mid-range Indonesian Android
phone — not just "technically works on mobile").

--------------------------------------------------------------------------------
0. WHY MOBILE IS NOT AN AFTERTHOUGHT HERE
--------------------------------------------------------------------------------

Indonesia is a mobile-first e-commerce market. A meaningful share of Kaos
Kami's real customers will arrive on a mid-range Android phone over 4G,
often with a browser tab they're not going to give infinite patience to.
A heavy WebGL scene that's beautiful on a desktop dev machine but takes 8
seconds to load or drops to 12fps on a Rp2-3 juta Android phone is a
conversion killer, full stop — this is the single biggest risk to the
whole project succeeding commercially, bigger than any missing feature.

Everything in this document is written with that constraint as the
starting assumption, not a checkbox added at the end.

--------------------------------------------------------------------------------
1. DEVICE/NETWORK REALITY CHECK — DESIGN TARGETS
--------------------------------------------------------------------------------

Design and test against these explicit targets, not "modern browsers":
  - **Primary target device class**: mid-range Android (4-6GB RAM,
    Mali-G52/Adreno 610-class GPU, e.g. devices in the Rp2-3.5 juta
    range — Redmi/Infinix/Samsung A-series equivalents), Chrome/WebView.
  - **Network**: assume 4G with real-world throughput of 3-8 Mbps and
    100-300ms latency, not fiber. Test with Chrome DevTools' "Fast 3G"/
    "Slow 4G" throttling profiles as a baseline, not just "no throttle."
  - **First meaningful interaction budget**: the hero 3D scene should be
    interactive (not necessarily fully loaded, but respondable) within
    **~3.5s on the mid-tier target**, with a real garment silhouette
    visible within ~1.5s (progressive loading, see §2).
  - **Sustained frame rate target**: 30fps minimum on the mid-tier device
    class during normal camera orbit/decal interaction in the Studio;
    60fps is the desktop target, not the universal one — do not let a
    desktop-only 60fps assumption creep into animation timing code (GSAP
    timelines keyed to wall-clock time are fine; anything keyed to frame
    count is not).

--------------------------------------------------------------------------------
2. DEVICE-TIER ADAPTIVE RENDERING STRATEGY
--------------------------------------------------------------------------------

Extend the existing `useWebglSupport.ts` hook family into a fuller device
capability probe, run once on mount, cached in a cookie/localStorage so
repeat visits skip re-probing:

```ts
// src/hooks/useDeviceTier.ts
"use client";
import { useEffect, useState } from "react";

export type DeviceTier = "high" | "mid" | "low" | "no-webgl";

export function useDeviceTier(): DeviceTier | null {
  const [tier, setTier] = useState<DeviceTier | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("kk_device_tier") as DeviceTier | null;
    if (cached) { setTier(cached); return; }

    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) { setTier("no-webgl"); return; }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
      : "";
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const deviceMemory = (navigator as any).deviceMemory as number | undefined; // Chrome-only, undefined elsewhere — treat as a hint, not a hard signal
    const cores = navigator.hardwareConcurrency ?? 4;
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);

    let computed: DeviceTier = "mid";
    const knownLowEndGpu = /Mali-4|Adreno 3|PowerVR SGX/i.test(renderer);
    if (knownLowEndGpu || maxTextureSize < 4096 || (deviceMemory && deviceMemory <= 2)) {
      computed = "low";
    } else if (!isMobile && (deviceMemory ?? 8) >= 8 && cores >= 8) {
      computed = "high";
    }

    localStorage.setItem("kk_device_tier", computed);
    setTier(computed);
  }, []);

  return tier;
}
```

Tier → render config mapping (consumed by `CanvasStage.tsx` and the
garment model loader from BLUEPRINT-02 §5):

| Setting | `no-webgl` | `low` | `mid` | `high` |
|---|---|---|---|---|
| Renders | `StaticShowcase` (existing) | Simplified GLB (`.lod1.glb`) | Full optimized GLB | Full GLB + extra post-processing |
| `dpr` (device pixel ratio cap) | n/a | `1` | `[1, 1.5]` | `[1, 2]` |
| Shadows | n/a | off | on, low-res shadow map | on, full-res |
| Wind/animation shaders | n/a | disabled | enabled | enabled |
| Multi-decal live gizmo | n/a | enabled (perf-tested first) | enabled | enabled |
| Antialiasing | n/a | off (rely on `dpr` instead) | on | on (MSAA if available) |
| Post-processing (bloom/etc, if any added later) | n/a | off | off | on |

This tiering must be the DEFAULT behavior, not an opt-in "performance
mode" toggle buried in settings — most users will never find a manual
toggle, so the system must self-select correctly out of the box. A manual
override IS worth adding for power users ("Kualitas Render:
Otomatis/Rendah/Tinggi" in a small settings menu), but the default path
must already be correct.

--------------------------------------------------------------------------------
3. PROGRESSIVE LOADING SEQUENCE (perceived performance)
--------------------------------------------------------------------------------

Order of appearance, tuned so the user perceives speed even while heavy
assets are still arriving in the background:

1. **0ms**: Static HTML shell (headline, nav) paints immediately — Next.js
   App Router SSR already gives this for free; do not regress it by
   client-rendering the hero text.
2. **~200-500ms**: A lightweight placeholder — a flat-shaded silhouette or
   a blurred low-res poster image of the garment (generated once via the
   BLUEPRINT-02 §6 render pipeline and shipped as a static asset) —
   appears where the 3D canvas will mount. This is the same "LQIP"
   (low-quality image placeholder) pattern used for photos, applied to the
   3D hero.
3. **Parallel, as soon as possible**: Draco/KTX2 decoder WASM + the
   correctly-tiered GLB begin streaming (use `<link rel="preload">` for
   the decoder WASM files in `layout.tsx` `<head>`, since those are always
   needed regardless of which garment loads).
4. **On GLB ready**: cross-fade from the poster image to the live R3F
   canvas (opacity transition, ~300ms) — never a hard pop-in.
5. **Non-blocking, after first interaction is possible**: prefetch the
   NEXT most-likely garment model (e.g. if the user is on the T-shirt hero,
   prefetch the hoodie GLB at low priority) so switching apparel in the
   Studio feels instant later — but only on `mid`/`high` tiers and only on
   a non-metered-feeling connection (`navigator.connection?.saveData`
   check — respect it if true, skip prefetch entirely).

--------------------------------------------------------------------------------
4. TOUCH INTERACTION DESIGN (mobile Studio UX)
--------------------------------------------------------------------------------

- **OrbitControls tuning for touch**: reduce `rotateSpeed` and increase
  `dampingFactor` on touch devices vs. mouse (a 1:1 desktop-tuned speed
  feels wildly oversensitive on a phone's smaller viewport-to-finger-size
  ratio). Detect via `('ontouchstart' in window)`.
- **Gesture ownership handoff**: when a `DecalGizmoOverlay` handle
  (BLUEPRINT-02 §2) is actively being dragged, `OrbitControls.enabled`
  must be set `false` for that gesture's duration, and re-enabled on
  pointer-up — without this, dragging a decal will simultaneously spin the
  camera, which is the single most common bug/complaint in mobile 3D
  configurators.
- **Bottom-sheet Studio panel** (replaces the desktop side drawer on
  viewports `< 768px`): a swipeable bottom sheet (peek/half/full states)
  using a lightweight library (`vaul` — small, unstyled, built for exactly
  this pattern, or a hand-rolled version using CSS `transform` + a
  pointer-drag handle if a minimal-dependency approach is preferred) so
  the 3D canvas keeps maximum vertical space while controls stay
  reachable with a thumb.
- **Minimum touch target size**: 44×44px for every interactive control
  (gizmo handles, tab buttons, color swatches) — this is an Apple/Google
  accessibility guideline that also happens to be the single best fix for
  "my thumb keeps hitting the wrong swatch" complaints.
- **Haptic feedback** (where available — `navigator.vibrate`, Android
  Chrome only, iOS Safari does not support it) on decal snap-to-center or
  successful "Add to Cart" — small polish detail, cheap to add, noticeably
  raises perceived quality on supported devices.

--------------------------------------------------------------------------------
5. PWA / "ADD TO HOME SCREEN" LAYER
--------------------------------------------------------------------------------

Given the mobile-first goal, ship a proper installable PWA — this is
close to zero marginal cost on top of Next.js and gives real value:
returning customers get an app-like icon, offline order-history caching,
and (optionally, later) push notifications as a free alternative/
complement to WhatsApp for logged-in users.

```json
// public/manifest.json
{
  "name": "Kaos Kami — 3D Apparel Studio",
  "short_name": "Kaos Kami",
  "description": "Custom sablon streetwear dengan 3D mockup studio.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#121214",
  "theme_color": "#121214",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Use `next-pwa` (or hand-roll a minimal service worker if avoiding another
dependency is preferred) with a caching strategy that's deliberately
CONSERVATIVE around the 3D assets: cache-first for static GLBs/textures
(they rarely change once published), network-first for anything
order/price-related (never let a stale cached price or order status show
— that's a trust-breaking bug class, not just a UX nit).

--------------------------------------------------------------------------------
6. PERFORMANCE BUDGET & CI ENFORCEMENT
--------------------------------------------------------------------------------

Set concrete budgets and fail CI if they regress — otherwise "we'll
optimize it later" never happens:

| Metric | Budget |
|---|---|
| Initial JS bundle (route: `/`) | < 250KB gzipped |
| Largest Contentful Paint (mid-tier throttled) | < 3.5s |
| Time to Interactive | < 4.5s |
| Cumulative Layout Shift | < 0.1 |
| Per-garment GLB size (compressed) | < 3MB (see BLUEPRINT-02 §5) |
| Studio panel interaction latency (tap to visible response) | < 100ms |

Enforce via:
  - `@next/bundle-analyzer` run in CI on every PR, comment the diff.
  - Lighthouse CI (`@lhci/cli`) against a throttled mobile profile,
    wired into GitHub Actions, blocking merge on budget regressions past
    a small tolerance.

--------------------------------------------------------------------------------
7. INFRASTRUCTURE / HOSTING STACK — FULL 2026 COST TABLE
--------------------------------------------------------------------------------

Philosophy: start on free tiers that don't box the project into a corner,
upgrade only the specific piece that's actually being stressed, never
prepay for scale you don't have yet. All figures verified against
2026-era published pricing at time of writing — re-check before final
commitment since these do shift.

| Layer | Service | Free tier | First paid tier | Notes |
|---|---|---|---|---|
| Frontend hosting/SSR | **Vercel** | 100GB bandwidth, 6,000 build min/mo, generous serverless execution | Pro ~$20/mo | Best-in-class Next.js fit; Hobby plan's 10s function timeout is fine for this app's route handlers (nothing here needs long-running compute except the render pipeline, which should run async/queued anyway) |
| Database | **Supabase Postgres** | 500MB DB, 1GB storage, 5GB egress, 50k MAU, 2 projects | Pro $25/mo (8GB DB, 100k MAU) | Pause-after-7-days-inactivity on free tier — fine for active dev, watch for it if the project goes quiet pre-launch |
| Auth | **Better Auth** (self-hosted, uses the same Postgres) | Free forever, no per-MAU cost | N/A (you host it) | Chosen specifically to avoid Clerk's per-MAU curve; full control, data stays in your own DB — see BLUEPRINT-01 §2 |
| Object storage (decals, renders, GLBs) | **Cloudflare R2** | 10GB storage, 1M writes/mo, 10M reads/mo, **zero egress always** | ~$0.015/GB storage beyond free tier | Zero egress is the deciding factor here — this app re-serves mockup images constantly, and R2's no-egress-fee model directly protects margin as traffic grows |
| CDN (images, static) | **Cloudflare** (in front of R2 + Vercel) | Free | Free tier is genuinely sufficient here | Also gives free image resizing via Cloudflare Images if wanted later |
| Payment gateway | **Midtrans** | No monthly fee, pay-per-transaction (QRIS 0.7% regulated, cards ~2.8-2.9%+Rp2.000, VA ~flat Rp4.000/txn) | N/A (transaction-based) | See BLUEPRINT-01 §6 for full rationale |
| Shipping & Fulfillment | **Hyperlocal Delivery (Makassar Native)** | **Rp0 (Free)** — Self Pick-up / Instant Maxim COD / Flat Makassar | No external SaaS fees | Eliminates RajaOngkir rate-limits & API downtime; perfectly matches local buying habits in Makassar |
| WhatsApp notifications | **Fonnte** (with Web/wa.me fail-safe) | 1,000 messages/mo, no attachments | ~Rp135.000-175.000/mo (quota or unlimited tiers) | Unofficial gateway — acceptable at UMKM scale; wrapped in try/catch with web receipt + manual wa.me link fallback so checkout never fails |
| Transactional email (backup channel) | **Resend** | 3,000 emails/mo, 1 domain | $20/mo for 50k | Only used for receipts/backup — WhatsApp is primary per BLUEPRINT-01 §7 |
| Background jobs / queue | **Upstash QStash** | 500 messages/day | Pay-per-use beyond | For render jobs, abandoned-cart reminders |
| Rate limiting | **Upstash Redis + Ratelimit** | 10,000 commands/day | Pay-per-use beyond | Protects `/api/checkout`, auth routes |
| Headless render (mockup screenshots) | **Playwright + `@sparticuz/chromium`** on Vercel serverless | Included in Vercel compute | Scales with Vercel plan | No separate SaaS bill — see BLUEPRINT-02 §6 |
| Error monitoring | **Sentry** | 5,000 errors/mo, 1 project | $26/mo for more | Non-negotiable for a real payment-handling app — do not skip this even in v1 |
| Uptime monitoring | **UptimeRobot** or **Better Stack** free tier | 50 monitors free | ~$18/mo if more needed | Cheap insurance, alerts to WhatsApp/email if the site or webhook endpoint goes down |
| Analytics | **Vercel Analytics** (free, privacy-friendly) + **Plausible** or **PostHog** free tier if deeper funnels needed | Free tiers sufficient at this scale | — | Avoid Google Analytics unless there's a specific reason — GA's data model is overkill and its cookie/consent overhead isn't worth it for a lean UMKM site |

**Realistic month-1 total cost (pre-revenue, low traffic): effectively
Rp0-150.000/month** (mostly just Fonnte's paid tier once testing volume
exceeds the free 1,000 messages — everything else comfortably fits free
tiers at launch scale). This is a deliberately chosen stack to match a
bootstrapped UMKM's actual budget reality, not a "assume VC funding"
architecture.

--------------------------------------------------------------------------------
8. CI/CD PIPELINE
--------------------------------------------------------------------------------

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npx prisma generate
      - run: npm run build
      - name: Lighthouse CI (mobile throttled)
        run: npx lhci autorun --config=lighthouserc.json
      - name: Bundle size check
        run: npx bundlesize
```

Deploy flow: Vercel's native GitHub integration handles preview
deployments per PR and production deploys on merge to `main` — no custom
deploy scripting needed, this is one of Vercel's core value propositions
and there is no reason to build a custom pipeline around it for this
project's scale.

Database migrations: run `npx prisma migrate deploy` as a Vercel Build
Command hook (or a dedicated GitHub Action step gated to only run on
`main`) — never run `prisma migrate dev` (which can prompt interactively
and is meant for local development only) in a CI/production context.

--------------------------------------------------------------------------------
9. ENVIRONMENT VARIABLES CHECKLIST
--------------------------------------------------------------------------------

Extend `.env.example` (currently just `NEXT_PUBLIC_SITE_URL`) to document
every variable the full system needs — this file is the map of every
external dependency for anyone (including a future dev, or the AI build
agent picking this up mid-project) onboarding onto the project:

```bash
# .env.example

# --- App ---
NEXT_PUBLIC_SITE_URL=https://kaoskami.com

# --- Database ---
DATABASE_URL=postgresql://...           # Supabase connection string
DIRECT_URL=postgresql://...             # Supabase direct (non-pooled) connection, for migrations

# --- Auth (Better Auth) ---
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Storage (Cloudflare R2) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# --- Payments (Midtrans) ---
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# --- Shipping & Fulfillment (Hyperlocal Makassar) ---
SHOP_WORKSHOP_ADDRESS="Jl. [Alamat Workshop], Makassar, Sulawesi Selatan"
SHOP_CONTACT_WHATSAPP="628xxxxxxxxxx"

# --- Notifications ---
FONNTE_TOKEN=
RESEND_API_KEY=

# --- Background jobs ---
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=

# --- Rate limiting ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Monitoring ---
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# --- Internal (server-side render pipeline) ---
INTERNAL_RENDER_BASE_URL=http://localhost:3000   # or the deployed URL,
                                                   # used by the Playwright
                                                   # render worker (BLUEPRINT-02 §6)
```

--------------------------------------------------------------------------------
10. NEXT.JS 14 → 15 UPGRADE PATH (do this early, not late)
--------------------------------------------------------------------------------

The project currently pins `next@14.2.15`. Next.js 15 is stable and
broadly adopted as of 2026, with meaningful wins relevant here: improved
caching defaults (less surprising stale-data behavior — directly relevant
to BLUEPRINT-01's order/price data, which must never be served stale),
and better React 19 support (concurrent features that help keep the 3D
canvas responsive while server data streams in). Recommendation: upgrade
BEFORE building the backend layer in BLUEPRINT-01, not after — migrating
a small, mostly-frontend app now is far cheaper than migrating a full
e-commerce app with live orders later.

```bash
npx @next/codemod@latest upgrade latest
npm run typecheck && npm run build   # verify immediately, fix any
                                       # App Router caching-behavior
                                       # regressions before proceeding
                                       # to BLUEPRINT-01
```

--------------------------------------------------------------------------------
11. THREE.JS / R3F UPGRADE PATH (WebGPU readiness, not urgency)
--------------------------------------------------------------------------------

Current: `three@0.169`, `@react-three/fiber@8.17`. As of 2026, R3F v9
supports WebGPU via an explicit `gl` factory prop (opt-in, with automatic
fallback to WebGL2 if unavailable), and Three.js's `WebGPURenderer` is
maturing but WebGL2 still covers the overwhelming majority of real-world
browsers including the mid-range Android target this project prioritizes.

**Recommendation: do NOT chase WebGPU for v1.** It is not yet a
meaningful performance or capability unlock for THIS project's actual
needs (garment mockup rendering does not require WebGPU's compute-shader
capabilities), and premature adoption risks compatibility issues on
exactly the budget-Android devices this blueprint is optimizing for.
Upgrade `three`/`@react-three/fiber`/`@react-three/drei` to their current
stable versions for bug fixes and `TshirtModel`/`HoodieModel` compatibility,
but keep the `WebGLRenderer` as the default `gl` in `CanvasStage.tsx`.
Revisit WebGPU as a `high`-tier-only progressive enhancement once R3F v10
(which plans default WebGPU support) has been stable in production
elsewhere for a few months — track this as a documented v2+ idea, not a
v1 task.

--------------------------------------------------------------------------------
12. MONITORING & INCIDENT READINESS CHECKLIST
--------------------------------------------------------------------------------

- [ ] Sentry wired into both client (React error boundaries — note
      `ModelErrorBoundary.tsx` already exists, extend it to report to
      Sentry rather than silently falling back) and server (API routes,
      especially the Midtrans webhook handler — a silent failure there
      means a paid order never gets marked paid, which is a
      revenue-and-trust-critical bug class).
- [ ] Uptime monitor pinging `/api/health` (add this simple route — DB
      connectivity check + return 200) every 1-5 minutes, alerting to
      WhatsApp (via the same Fonnte integration, repurposed for ops
      alerts to the admin's own number) and email.
- [ ] A documented manual runbook (a simple `RUNBOOK.md` in the repo) for
      the two most business-critical failure modes: "Midtrans webhook
      didn't fire / payment stuck as pending" (manual reconciliation via
      Midtrans dashboard) and "WhatsApp notification failed to send"
      (Fonnte device disconnected — needs a QR re-scan) — these are the
      two most likely real-world 3am problems for this specific stack,
      worth writing down BEFORE they happen, not after.

================================================================================
END OF BLUEPRINT SET (4/4).

SUMMARY FOR THE BUILD AGENT — SUGGESTED EXECUTION ORDER ACROSS ALL FOUR
DOCUMENTS:
  1. BLUEPRINT-04 §10 (Next.js 15 upgrade) — do this first, it's cheapest now.
  2. BLUEPRINT-01 full (data model, auth, payments, shipping, API surface).
  3. BLUEPRINT-02 Track D (asset compression) — cheap, high-impact, unblocks
     mobile testing of everything else early.
  4. BLUEPRINT-02 remaining tracks (gizmo, multi-part color, animation,
     server render pipeline) interleaved with BLUEPRINT-04 §1-6 (mobile/
     perf work) since they touch the same components — build and test on
     a real throttled mobile profile continuously, not as a final pass.
  5. BLUEPRINT-03 (admin + user dashboards) once orders/designs actually
     flow through the system end-to-end.
  6. BLUEPRINT-04 §5, §7-9, §12 (PWA, hosting setup, CI/CD, monitoring) —
     productionize once the product loop works.
================================================================================
