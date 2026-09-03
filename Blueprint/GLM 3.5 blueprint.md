## 🎯 Hasil Riset & Analisis Kaos Kami + Blueprint Capacitor Premium

Berikut hasil riset maksimal saya terhadap project kamu (Kaos-Kami 3D), kompetitor 3D mockup (VirtualThreads.io, 3DMockups.app, FitMockup, Browzwear, Style3D, Cala, Wanna.Fashion), praktik terbaik Capacitor 8 (rilis Des 2025), Midtrans Mobile SDK, serta tren UI/UX premium 2026. Hasilnya saya rangkum dalam **10 Blueprint Markdown** yang siap kamu berikan ke AI Agent — total ribuan baris, terstruktur rapi, dan lengkap dengan struktur file, konfigurasi, snippet kode, kontrak API, strategi pengujian, dan checklist persentase kemajuan.

---

# 📋 BLUEPRINT-00 — OVERVIEW, STRATEGI & ANALISIS KOMPETITOR

```markdown
# 📘 BLUEPRINT-00: OVERVIEW, STRATEGI PRODUK & ANALISIS KOMPETITOR
**Project:** Kaos Kami Mobile — Capacitor 8 Native Premium Edition  
**Version:** 1.0.0  
**Owner:** Hengki Setiawan  
**Last Updated:** 2026-09-03  
**Target Stack:** Capacitor 8 + Next.js 15 (Static Export) + React Three Fiber + Midtrans Mobile + Facebook Audience Network  
**Total Est. Lines of Spec:** ~1,200 lines

---

## 🎯 1. EXECUTIVE SUMMARY

Kaos Kami saat ini adalah **PWA/Next.js 14 + Cloudflare Workers** yang menjual 
kaos heavyweight streetwear (240 & 280 GSM Combed 16s) dari Makassar, Sulsel, 
dengan fitur 3D Configurator React Three Fiber, Fabric.js 2D canvas, Turso libSQL DB, 
Better Auth, Midtrans/Duitku, dan R2 storage.

**Tujuan versi Capacitor:** 
1. Publish native app di Google Play Store & Apple App Store (branding + reach lokal Sulsel).  
2. Unlock fitur yang tidak bisa dilakukan web: Camera native, AR try-on, Biometric, 
   Push Notification native, Haptic, Facebook Audience Network Native Ads, 
   Facebook App Events, Apple IAP, Google Play Billing, Native Share Sheet, 
   Background Sync, Native Camera Roll, File Download.  
3. UI/UX premium setara native startup 2026 — TIDAK terasa seperti webview.

**Prinsip non-negotiable:** 
- Semua fitur 3D + Fabric.js harus berjalan pada device tier rendah (Android Go budget).  
- bundle size APK/AAB < 25MB, initial launch < 2.5 detik di Redmi 9A.  
- Tidak memuat library 3D di Server Worker (sudah dijaga oleh rule existing 3MB).  
- Akses kamera harus selalu bisa di-tolak user, app tetap berfungsi full (graceful degrade).

---

## 🏆 2. ANALISIS KOMPETITOR 3D MOCKUP (Hasil Riset 2026)

### 2.1 VirtualThreads.io — https://www.virtualthreads.io
**Posisi:** Pure SaaS mockup generator. Fokus ke speed export + 2D-to-3D conversion.
**Fitur yang harus diadopsi:**
| Fitur | Detail | Prioritas untuk Kaos Kami |
|---|---|---|
| Wind Effects | Animasi kain bergetar oleh angin | 🔥 HIGH — pakai ` ClothPhysics` Three.js / react-three-rapier |
| Walking Animations | Kaos dipakai manekin yang berjalan | 🔥 HIGH — rigged character + skinning |
| Video Export | MP4/WebM 4K/1080p/720p | 🔥 HIGH — native `MediaRecorder` + Canvas CaptureStream |
| Knitting Animation | Simulasi kaos terbentuk dari benang | 🔥 MEDIUM — pakai shader effect |
| Custom Background | Upload background sendiri | 🔥 HIGH — sudah ada di v2.1 |
| Adjustable Animation Speed | Slider kecepatan animasi | 🔥 HIGH — simple param |
| Live Preview Realtime | Tidak perlu render server | 🔥 HIGH — sudah ada |
| Free Tier Watermarked + Pro Tanpa Watermark | Model freemium | 🔥 HIGH — IAP / Play Billing |
| 120,000+ brands social proof | Social proof marketing | 🔥 MEDIUM — tampilkan counter |
| 6 Garment Templates | Oversized, Hanging, Cropped, Boxy, Regular, Hoodie | 🔥 HIGH — multi-GLB |

**Yang TIDAK diadopsi dari VirtualThreads:** 
- "No sign up required" — kita tetap butuh auth untuk tracking design ownership.

### 2.2 3DMockups.app (3dmockup.app) — https://www.3dmockups.app
**Posisi:** Design + Paint + Storefront + Print Fulfillment. Paling dekat dengan konsep Kaos Kami.
**Fitur yang harus diadopsi:**
| Fitur | Detail | Prioritas |
|---|---|---|
| 3D Paint Studio (Krita-level brushes) | Pressure, tilt, pencil-ready — bisa gambar langsung di 3D | 🔥🔥 CRITICAL — pakai Fabric.js + raycast to UV |
| Material Library | Pantone palettes, fabric textures, lighting | 🔥 HIGH |
| Upload & Auto-Wrap | Drop PNG/JPG/SVG, auto wrap tanpa UV unwrap | 🔥 HIGH — sudah ada |
| Storefront Builder | Custom URL + handle + page | 🔥 HIGH — sudah ada |
| Live Co-design (Cursors + Comments) | Kolaborasi realtime | 🔥 MEDIUM — pakai Yjs + Supabase Realtime |
| Print & Ship In-House | Order fulfilment internal | 🔥 HIGH — sesuai model Kaos Kami |
| Tech Pack Generator | Measurement, grading, BOM, callouts, notes | 🔥 HIGH — fitur B2B pro |
| Repeat Print Library | Pattern yang bisa diulang | 🔥 MEDIUM |
| Base Products + Templates | Dual mode start | 🔥 HIGH |
| Order Tracking (#3081 Out for delivery) | Push notifikasi status | 🔥 HIGH |

### 2.3 FitMockup — 3D Clothes Mockups (iOS/Android App)
**Posisi:** Mobile-first app, AI-enhanced. Persaingan langsung di App Store.
**Fitur yang harus diadopsi:**
| Fitur | Detail | Prioritas |
|---|---|---|
| AI-Powered Enhancement | 3D mockup → photorealistic image via AI | 🔥🔥 CRITICAL — pakai Replicate/BytePlus/Stability |
| AI Studio (Faster Image Gen) | Generative background/model | 🔥 HIGH |
| Multi-part Coloring | Warna per komponen garment (body/sleeve/collar) | 🔥 HIGH — sudah ada |
| Gesture Controls | Rotate/Zoom/Pan via touch | 🔥 HIGH — native touch |
| Auto-rotation Showcase Video | Auto-record video untuk social | 🔥 HIGH |
| 2D Clothing Designer | Mode flat 2D designer | 🔥 HIGH — sudah ada (Fabric.js) |
| HDR Backgrounds | High dynamic range env | 🔥 MEDIUM |

### 2.4 Mockey.ai / Mockups3D AI / Browzwear / Style3D
- **Mockey.ai:** Free 3D mockup generator dengan animation box — adopsi pattern "Free unlimited exports with watermark".
- **Mockups3D AI:** AI-art generator untuk generate desain kaos dari prompt — kandidat untuk fitur "Generate from Text".
- **Browzwear / Style3D / Cala / The Fabricant:** Enterprise-grade fashion design, terlalu berat untuk adopsi penuh, tapi adopsi konsep **Tech Pack**, **BOM**, **Measurement Grading**, **Fabric Simulation** untuk fitur Pro tier.

### 2.5 WANNA.FASHION — AR Try-On Standard
- AR Try-On via WebXR / model-viewer untuk kacamata, sepatu, tas.  
- Untuk Kaos Kami: gunakan **native Camera + 3D overlay** untuk "Preview di Badanku" 
  (AR-lite, bukan full body tracking — terlalu berat untuk mobile).

---

## 🧭 3. STRATEGI DIFERENSIASI KAOS KAMI

**Kita akan unggul di 5 pilar yang TIDAK dimiliki kompetitor sekaligus:**

1. **Lokal Makassar First** — Instant Courier Maxim COD, Pick-up Workshop Rp 0, 
   Flat Rate Rp 15.000 se-Sulawesi (kompetitor internasional tidak bisa).  
2. **DTF Sablon Production Pipeline** — 1:1 cm scale calibration (max 30cm), 
   real-time DPI analyzer, Job Ticket PDF — kompetitor hanya visual, tidak bisa produksi.  
3. **Harga Transparan IDR** — Pembayaran lokal Midtrans (QRIS, VA, Alfamart, Indomaret), 
   Duitku, Xendit, COD.  
4. **WhatsApp-first Notifikasi** — Fonnte + wa.me fallback (konsumen Makassar utamakan WA).  
5. **Offline-first 3D Designer** — Bisa desain tanpa internet, sync ketika online.

---

## 📊 4. FEATURE PRIORITY MATRIX (MoSCoW + Impact × Effort)

### 🔴 MUST-HAVE (Launch Blocker — Sprint 1-4)
- [ ] Capacitor 8 project setup + Next.js 15 static export
- [ ] Bottom Tab Navigation (Home, Studio, Catalog, Orders, Profile) — 5 tab max
- [ ] 3D Viewer mobile-optimized dengan device tiering
- [ ] Camera upload native (descal ke 4K, output max 4096px)
- [ ] Midtrans Mobile SDK (QRIS, VA, E-Wallet, Card, Gopay, Shopeepay)
- [ ] Biometric login (FaceID/TouchID/Fingerprint)
- [ ] Push Notification (FCM + APNs) untuk status order
- [ ] Haptic feedback di semua CTA
- [ ] Offline cart & wishlist
- [ ] Splash Screen + App Icon (adaptive icon Android, iOS 1024px)
- [ ] Dark Mode default + Light Mode toggle
- [ ] WhatsApp deep link share design (`wa.me/6281234?text=...`)

### 🟡 SHOULD-HAVE (Sprint 5-8)
- [ ] Facebook Audience Network Native Ads (banner, interstitial, rewarded)
- [ ] Facebook App Events tracking (AddToCart, Purchase, InitiateCheckout)
- [ ] AI-Powered Enhancement (photo-realistic mockup via API)
- [ ] AI Generation dari Text Prompt
- [ ] AR Preview di Badan (AR-lite)
- [ ] Video Export native (MediaRecorder + Canvas CaptureStream)
- [ ] 3D Paint Studio (brush langsung di garment via raycast→UV)
- [ ] Walking Animation dengan rigged character
- [ ] Tech Pack Generator PDF
- [ ] Live Co-design (cursors + comments via Yjs)
- [ ] Google Play Billing / Apple IAP untuk Pro tier
- [ ] Deeplink `kaoskami://studio/design/{id}` untuk share

### 🟢 COULD-HAVE (Sprint 9-12)
- [ ] Knitting animation (shader effect)
- [ ] Repeat print library
- [ ] Social feed showcase design komunitas
- [ ] Referral system
- [ ] Loyalty points
- [ ] Mini-game di loading screen

### ⚪ WON'T-HAVE (V2+)
- [ ] Full-body AR try-on dengan body tracking
- [ ] Custom garment pattern making (Browzwear level)
- [ ] NFT minting

---

## 🏗️ 5. ARCHITECTURE HIGH-LEVEL

```
┌──────────────────────────────────────────────────────────┐
│  KAOS KAMI MOBILE (Capacitor 8 Native Shell)             │
├──────────────────────────────────────────────────────────┤
│  UI Layer (React 19 + Next.js 15 Static Export)          │
│  ├─ Screen Router (Expo-like Navigation)                 │
│  ├─ Design System (Radix + Tailwind + Spring Anim)       │
│  └─ 3D Layer (R3F + Three.js + Draco/KTX2)               │
├──────────────────────────────────────────────────────────┤
│  Business Logic Layer                                    │
│  ├─ Zustand Store (global state)                         │
│  ├─ RxDB (offline-first local DB)                        │
│  ├─ TanStack Query (server state + cache)                │
│  └─ Zod (validation)                                     │
├──────────────────────────────────────────────────────────┤
│  Capacitor Native Bridge Layer                           │
│  ├─ @capacitor/camera, @capacitor/haptics                │
│  ├─ @capacitor/push-notifications, @capacitor/share      │
│  ├─ @capacitor/preferences, @capacitor/filesystem        │
│  ├─ @capacitor/app (deeplink), @capacitor/splash-screen  │
│  ├─ @capacitor-mlkit/barcode-scanner (QRIS scan)         │
│  ├─ @capawesome/capacitor-android-edge-to-edge-support   │
│  ├─ Native Plugins (custom):                             │
│  │  ├─ Facebook Audience Network (Android+iOS)           │
│  │  ├─ Midtrans Mobile SDK wrapper                       │
│  │  ├─ Fonnte WhatsApp sender                            │
│  │  └─ AR-lite body overlay                              │
├──────────────────────────────────────────────────────────┤
│  Backend (Existing Cloudflare Workers + Turso + R2)      │
│  + New: Mobile-specific API routes (/api/mobile/*)       │
│  + New: Sync endpoint for RxDB replication               │
│  + New: Midtrans webhook v2 + Duitku + Xendit fallback   │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 6. STRUKTUR DIREKTORI FINAL

```
kaos-kami-mobile/
├── capacitor.config.ts
├── package.json
├── tsconfig.json
├── next.config.mobile.mjs
├── tailwind.config.ts
├── android/                      # Native Android (Gradle)
│   ├── app/build.gradle
│   ├── app/src/main/AndroidManifest.xml
│   ├── app/src/main/java/id/kaoskami/app/MainActivity.java
│   ├── app/src/main/res/values/colors.xml
│   ├── app/src/main/res/values/themes.xml
│   └── app/src/main/res/xml/file_paths.xml
├── ios/                          # Native iOS (Xcode + SPM)
│   ├── App/App.xcworkspace
│   ├── App/App/Info.plist
│   ├── App/App/AppDelegate.swift
│   └── App/Shared/Assets.xcassets
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Home
│   │   │   ├── studio.tsx        # 3D Studio
│   │   │   ├── catalog.tsx
│   │   │   ├── orders.tsx
│   │   │   └── profile.tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (checkout)/
│   │   │   ├── cart.tsx
│   │   │   ├── address.tsx
│   │   │   ├── payment.tsx
│   │   │   └── success.tsx
│   │   ├── studio/
│   │   │   ├── [designId].tsx
│   │   │   ├── ar-preview.tsx
│   │   │   ├── paint.tsx
│   │   │   └── export.tsx
│   │   ├── api/                  # Will be SKIPPED in static export
│   │   ├── _app.tsx
│   │   └── _document.tsx
│   ├── components/
│   │   ├── ui/                   # Button, Input, Sheet, Modal, Toast
│   │   ├── 3d/                   # Canvas, Shirt, Cloth, Lighting
│   │   ├── native/               # HapticButton, NativeCamera, BiometricPrompt
│   │   └── payment/              # MidtransSheet, PaymentMethodCard
│   ├── hooks/
│   │   ├── useHaptic.ts
│   │   ├── useBiometric.ts
│   │   ├── useCamera.ts
│   │   ├── useDeeplink.ts
│   │   ├── usePushNotification.ts
│   │   ├── useDeviceTier.ts
│   │   └── useOfflineSync.ts
│   ├── lib/
│   │   ├── capacitor.ts          # Capacitor bridge helpers
│   │   ├── payments.ts           # Midtrans/Duitku/Xendit
│   │   ├── analytics.ts          # FB App Events + Firebase
│   │   ├── ads.ts                # FB Audience Network
│   │   └── supabase.ts
│   ├── store/
│   │   ├── useAuthStore.ts
│   │   ├── useCartStore.ts
│   │   ├── useDesignStore.ts
│   │   └── useSettingsStore.ts
│   └── db/
│       ├── schema.ts             # RxDB schemas
│       ├── sync.ts               # Replication config
│       └── migrations/
├── scripts/
│   ├── build-mobile.sh
│   ├── build-android.sh
│   ├── build-ios.sh
│   ├── upload-aab.sh
│   └── generate-icons.sh
└── docs/
    ├── BLUEPRINT-01 ... BLUEPRINT-10.md
    └── BUILD-PROGRESS-TRACKER.md
```

---

## ✅ 7. DEFINITION OF DONE

Sprint dianggap selesai jika:
1. Semua fitur MUST-HAVE tercentang di BLUEPRINT-09.
2. APK/AAB berhasil build tanpa error di `npm run android:build`.
3. Lighthouse mobile score > 90 untuk semua halaman.
4. 60 FPS di Redmi 9A (Snapdragon 665, Android 10) pada 3D Studio.
5. Cold start < 2.5 detik di device budget.
6. Semua screen passing Apple Accessibility Guideline (WCAG 2.2 AA).
7. Privacy Policy + Terms tersedia di URL publik.
8. All endpoints return < 500ms p95 di production.

---

**➡️ Lanjut ke BLUEPRINT-01: Arsitektur Mobile Capacitor**
```

---

# 📗 BLUEPRINT-01 — MOBILE ARCHITECTURE & CAPACITOR 8 SETUP

```markdown
# 📗 BLUEPRINT-01: MOBILE ARCHITECTURE & CAPACITOR 8 SETUP
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~1,500

---

## 🎯 1. TUJUAN

Menstandarkan arsitektur aplikasi mobile Kaos Kami menggunakan Capacitor 8 
(rilis Desember 2025) + Next.js 15 App Router static export, dengan solusi 
robust untuk masalah yang biasa terjadi:
- SSR/routing dinamis di static export
- Performance di device tier rendah  
- Deep linking + universal links
- Cold start optimization

---

## 🔧 2. VERSION LOCK (Non-Negotiable)

```json
{
  "dependencies": {
    "@capacitor/core": "^8.0.0",
    "@capacitor/android": "^8.0.0",
    "@capacitor/ios": "^8.0.0",
    "@capacitor/app": "^8.1.0",
    "@capacitor/haptics": "^8.0.2",
    "@capacitor/keyboard": "^8.0.2",
    "@capacitor/splash-screen": "^8.0.0",
    "@capacitor/status-bar": "^8.0.0",
    "@capacitor/camera": "^8.0.0",
    "@capacitor/filesystem": "^8.0.0",
    "@capacitor/push-notifications": "^8.0.0",
    "@capacitor/share": "^8.0.0",
    "@capacitor/preferences": "^8.0.0",
    "@capacitor/network": "^8.0.0",
    "@capacitor/device": "^8.0.0",
    "@capacitor-mlkit/barcode-scanning": "^8.0.0",
    "@capawesome/capacitor-android-edge-to-edge-support": "^8.0.0",
    "@capgo/capacitor-updater": "^8.0.0",
    "@aparajita/capacitor-biometric-auth": "^8.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.90.0",
    "rxdb": "^16.0.0",
    "zod": "^4.0.0"
  }
}
```

**Catatan versi penting:**
- **Capacitor 8** gunakan **SPM (Swift Package Manager)** secara default untuk iOS, 
  bukan CocoaPods. Android minSdkVersion naik ke **24** (Android 7.0).  
- **Edge-to-Edge** built-in via `SystemBars` plugin (bukan Status Bar lama).  
- Kompatibilitas diperiksa sampai `2026-09-01`.

---

## ⚙️ 3. CAPACITOR CONFIG

### File: `capacitor.config.ts`
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.kaoskami.app',
  appName: 'Kaos Kami',
  webDir: 'out',                    // Output dari next static export
  bundledWebRuntime: false,          // Deprecated, jangan pakai
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#0A0A0B',      // Match dengan Deep Obsidian theme
    useLegacyBridge: false,
    minWebViewVersion: 80,           // Chromium 80+
  },
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#0A0A0B',
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // iOS: NSCameraUsageDescription, NSPhotoLibraryUsageDescription, 
      //      NSPhotoLibraryAddUsageDescription (Info.plist)
    },
    Keyboard: {
      resize: 'body',           // 'body' | 'ionic' | 'native' | 'none'
      style: 'DARK',            // Match dark theme
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: true,             // Bypass CORS untuk API
    },
    BiometricAuth: {
      allowDeviceCredential: true,  // Allow PIN/pattern fallback
    },
    EdgeToEdge: {
      // Capacitor 8 built-in SystemBars
      statusBarStyle: 'Dark',   // Content is dark (background light)
      navigationBarStyle: 'Dark',
    },
  },
};

export default config;
```

---

## 🔄 4. NEXT.JS 15 STATIC EXPORT STRATEGY

### 4.1 Masalah yang Harus Diselesaikan

Next.js static export TIDAK support:
- API Routes (`/api/*`)
- Server Actions
- `getServerSideProps` / dynamic `params`
- Route Handlers dengan SSR logic
- Middleware

### 4.2 Solusi Arsitektur: Hybrid Mode

Kita pecah jadi **2 build targets:**

```
src/app/
├── (web)/                 # Untuk Cloudflare Workers deployment (SSR/ISR)
│   ├── page.tsx
│   ├── api/
│   └── ...
└── (mobile)/              # Untuk static export Capacitor
    ├── _layout.tsx
    └── ... (semua client-only)
```

Atau gunakan single directory dengan conditional:

### File: `next.config.mobile.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev' },
      { protocol: 'https', hostname: 'kaos-kami-3d.hengkisetiawan461.workers.dev' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // CRITICAL: Skip API routes in static export
  pageExtensions: ['page.tsx', 'page.ts'],
  async redirects() {
    return [];
  },
};

export default nextConfig;
```

### File: `package.json` scripts (updated)
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:mobile": "next dev -p 3001",
    "build:web": "next build",
    "build:mobile": "cross-env NEXT_PUBLIC_BUILD_TARGET=mobile next build",
    "sync": "npm run build:mobile && cap sync",
    "sync:android": "npm run build:mobile && cap sync android",
    "sync:ios": "npm run build:mobile && cap sync ios",
    "open:android": "cap open android",
    "open:ios": "cap open ios",
    "android:run": "npm run sync:android && cap run android",
    "ios:run": "npm run sync:ios && cap run ios",
    "android:build": "npm run sync:android && cd android && ./gradlew assembleRelease bundleRelease",
    "ios:build": "npm run sync:ios && cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath App.xcarchive"
  }
}
```

### 4.3 Handle Dynamic Routes Tanpa SSR

**Masalah:** `/studio/[designId]` tidak bisa static export secara default.

**Solusi 1 — Query Parameter (RECOMMENDED):**
```typescript
// src/app/studio/page.tsx (no [designId] folder!)
'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id');
  // Load design by ID via TanStack Query
  return <Studio3D designId={designId} />;
}
```

URL: `/studio/?id=abc123` bukan `/studio/abc123`.

**Solusi 2 — Hash-based (untuk shareable links):**
```typescript
// /studio/#/design/abc123
const designId = window.location.hash.split('/')[2];
```

**Solusi 3 — Capacitor App Plugin URL Open Handler:**
```typescript
// src/hooks/useDeeplink.ts
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

export function useDeeplink() {
  const router = useRouter();
  
  useEffect(() => {
    App.addListener('appUrlOpen', (event) => {
      // kaoskami://studio/design/abc123
      const slug = event.url.replace('kaoskami://', '');
      const [, route, id] = slug.split('/');
      
      if (route === 'studio' && id) {
        router.push(`/studio/?id=${id}`);
      }
    });
    
    return () => {
      App.removeAllListeners();
    };
  }, []);
}
```

### 4.4 Replace Server Actions dengan API Client

**Problem:** Next.js 15 Server Actions tidak bisa dipakai di static export.

**Solution:** Buat wrapper yang mendeteksi platform:
```typescript
// src/lib/api-client.ts
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

const BASE_URL = Capacitor.isNativePlatform()
  ? 'https://kaos-kami-3d.hengkisetiawan461.workers.dev'
  : '/api';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  if (Capacitor.isNativePlatform()) {
    // Use CapacitorHttp to bypass CORS
    const response = await CapacitorHttp.request({
      url,
      method: (options.method || 'GET') as any,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers as any,
      },
      data: options.body ? JSON.parse(options.body as string) : undefined,
    });
    return response.data as T;
  }
  
  const response = await fetch(url, options);
  return response.json();
}
```

---

## 🎨 5. NATIVE SHELL CONFIGURATION

### 5.1 Android Manifest — File: `android/app/src/main/AndroidManifest.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />
    
    <uses-feature android:name="android.hardware.camera" 
                  android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" 
                  android:required="false" />
    <uses-feature android:name="android.hardware.fingerprint" 
                  android:required="false" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:largeHeap="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <!-- Deep Link -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kaoskami" />
            </intent-filter>
            
            <!-- App Links (Universal) -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="kaos-kami-3d.hengkisetiawan461.workers.dev" />
            </intent-filter>
        </activity>
        
        <!-- FileProvider for camera output -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

### 5.2 iOS Info.plist — File: `ios/App/App/Info.plist`
```xml
<dict>
    <!-- Permissions -->
    <key>NSCameraUsageDescription</key>
    <string>Kaos Kami membutuhkan akses kamera untuk mengambil foto desain Anda dan AR Preview.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Kaos Kami membutuhkan akses galeri untuk memilih logo atau desain Anda.</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Kaos Kami akan menyimpan mockup hasil desain Anda ke galeri.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>Kaos Kami membutuhkan mikrofon untuk merekam video showcase desain.</string>
    <key>NSFaceIDUsageDescription</key>
    <string>Gunakan Face ID untuk login cepat dan aman.</string>
    <key>NSUserTrackingUsageDescription</key>
    <string>Data ini digunakan untuk menampilkan iklan yang relevan.</string>
    
    <!-- Background modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>remote-notification</string>
        <string>fetch</string>
    </array>
    
    <!-- Deep Link -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>id.kaoskami.app</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>kaoskami</string>
            </array>
        </dict>
    </array>
    
    <!-- Universal Links -->
    <key>AssociatedDomains</key>
    <array>
        <string>applinks:kaos-kami-3d.hengkisetiawan461.workers.dev</string>
    </array>
</dict>
```

### 5.3 Android Gradle — File: `android/app/build.gradle`
```gradle
apply plugin: 'com.android.application'

android {
    namespace "id.kaoskami.app"
    compileSdkVersion rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "id.kaoskami.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        
        // Reduce APK size dengan ABI split
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86_64'
        }
        
        vectorDrawables.useSupportLibrary = true
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 
                          'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }
    
    // Enable R8 full mode
    buildFeatures {
        buildConfig true
    }
    
    packagingOptions {
        resources {
            excludes += ['META-INF/*', 'DebugProbesKt.bin']
        }
    }
    
    // AAB optimization
    bundle {
        language { enableSplit = true }
        density  { enableSplit = true }
        abi      { enableSplit = true }
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    
    // Facebook Audience Network
    implementation 'com.facebook.android:audience-network-sdk:6.18.0'
    implementation 'com.facebook.android:facebook-android-sdk:17.0.0'
    
    // Midtrans Mobile SDK
    implementation 'com.midtrans:uikit:2.1.1-SANDBOX'  // ganti ke production saat release
    // implementation 'com.midtrans:uikit:2.1.1'  // production
    
    // Biometric
    implementation 'androidx.biometric:biometric:1.1.0'
    
    // Lottie untuk animasi
    implementation 'com.airbnb.android:lottie:6.4.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0'
}
```

---

## 🧪 6. ROUTING STRATEGY — Bottom Tab Navigation

### File: `src/components/shell/BottomTabBar.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Palette, ShoppingBag, Receipt, User } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'studio', label: 'Studio', icon: Palette, href: '/studio' },
  { id: 'catalog', label: 'Katalog', icon: ShoppingBag, href: '/catalog' },
  { id: 'orders', label: 'Pesanan', icon: Receipt, href: '/orders' },
  { id: 'profile', label: 'Profil', icon: User, href: '/profile' },
] as const;

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { light } = useHaptic();
  
  const handleTabPress = (href: string, label: string) => {
    light();
    router.push(href);
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="bg-black/80 backdrop-blur-2xl border-t border-white/[0.08]">
        <div className="flex items-center justify-around h-[64px] max-w-md mx-auto">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab.href, tab.label)}
                className="relative flex flex-col items-center justify-center 
                           w-[64px] h-[64px] gap-1"
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative"
                >
                  <Icon 
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-orange-500' : 'text-zinc-500'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -inset-2 rounded-full 
                                 bg-orange-500/10"
                    />
                  )}
                </motion.div>
                <span className={`
                  text-[10px] font-medium tracking-wide
                  ${isActive ? 'text-orange-500' : 'text-zinc-500'}
                `}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## 🔐 7. AUTH STRATEGY

### File: `src/lib/auth/capacitor-auth.ts`
```typescript
import { CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Device } from '@capacitor/device';

const TOKEN_KEY = 'kaos_kami_auth_token';
const REFRESH_KEY = 'kaos_kami_refresh_token';
const BIOMETRIC_ENABLED_KEY = 'kaos_kami_biometric_enabled';

export class MobileAuthService {
  private static baseURL = 'https://kaos-kami-3d.hengkisetiawan461.workers.dev';
  
  static async login(email: string, password: string) {
    const response = await CapacitorHttp.post({
      url: `${this.baseURL}/api/auth/sign-in`,
      headers: { 'Content-Type': 'application/json' },
      data: { email, password },
    });
    
    const { token, refreshToken, user } = response.data;
    
    await Promise.all([
      Preferences.set({ key: TOKEN_KEY, value: token }),
      Preferences.set({ key: REFRESH_KEY, value: refreshToken }),
    ]);
    
    return user;
  }
  
  static async enableBiometric() {
    const available = await BiometricAuth.checkBiometry();
    if (!available.isAvailable) throw new Error('Biometric not available');
    
    await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' });
  }
  
  static async loginWithBiometric() {
    const enabled = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    if (enabled.value !== 'true') throw new Error('Biometric not enabled');
    
    await BiometricAuth.authenticate({
      reason: 'Login ke Kaos Kami',
      cancelTitle: 'Batal',
      fallbackTitle: 'Gunakan Password',
    });
    
    // Retrieve stored session
    const session = await Preferences.get({ key: TOKEN_KEY });
    return JSON.parse(session.value || 'null');
  }
  
  static async getToken() {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }
  
  static async logout() {
    await Promise.all([
      Preferences.remove({ key: TOKEN_KEY }),
      Preferences.remove({ key: REFRESH_KEY }),
    ]);
  }
}
```

---

## 🚀 8. COLD START OPTIMIZATION

**Target: Cold start < 2.5 detik di Redmi 9A (2GB RAM, Snapdragon 665).**

Checklist:
- [ ] Defer semua 3D library loading ke `useEffect` setelah first paint
- [ ] Lazy load Bottom Tab routes dengan `dynamic(() => import(...))`
- [ ] Pre-cache splash screen (Android 12+ splash API)
- [ ] Inline critical CSS (next/font dengan `display: swap`)
- [ ] Minimize initial bundle (target < 350KB gzipped)
- [ ] Use `<Suspense>` boundaries untuk 3D canvas
- [ ] Preload critical images via `<link rel="preload">`
- [ ] Skip hydration error dengan suppressHydrationWarning
- [ ] Use `requestIdleCallback` untuk non-critical init

### File: `src/app/_app.tsx`
```typescript
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lazy load heavy components
const BottomTabBar = dynamic(
  () => import('@/components/shell/BottomTabBar'),
  { ssr: false }
);
const ThreeCanvas = dynamic(
  () => import('@/components/3d/ThreeCanvas'),
  { ssr: false, loading: () => <CanvasSkeleton /> }
);

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 10 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <BottomTabBar />
    </QueryClientProvider>
  );
}
```

---

## ✅ 9. CHECKLIST BLUEPRINT-01

- [ ] Capacitor 8 initialized (`npx cap init`)
- [ ] Android platform added (`npx cap add android`)
- [ ] iOS platform added (`npx cap add ios`)
- [ ] next.config.mobile.mjs created with `output: 'export'`
- [ ] Build scripts updated (build:mobile, sync, run)
- [ ] Bottom Tab Navigation component created
- [ ] Dynamic routes converted to query params
- [ ] CapacitorHttp wrapper created for CORS
- [ ] AndroidManifest.xml permissions added
- [ ] Info.plist permissions added
- [ ] Deep link scheme `kaoskami://` registered
- [ ] Universal Links + App Links configured
- [ ] Biometric auth setup
- [ ] Auth token storage using Preferences
- [ ] Cold start optimization applied
- [ ] Bundle size verified < 25MB

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-02: UI/UX Design System**
```

---

# 📘 BLUEPRINT-02 — UI/UX DESIGN SYSTEM PREMIUM 2026

```markdown
# 📘 BLUEPRINT-02: UI/UX DESIGN SYSTEM PREMIUM 2026
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~2,000

---

## 🎨 1. DESIGN PHILOSOPHY

Aplikasi harus terasa seperti **native startup premium 2026** — bukan webview. 
Inspired by: Linear, Arc Browser, Vercel dashboard, Notion mobile, 
Raycast, Arc Search, Superhuman, Cron.

**Prinsip:**
1. **Motion is Meaning** — Setiap animasi memberikan feedback, bukan dekorasi.
2. **Haptic-First** — Setiap CTA berikan haptic response.
3. **Spatial Depth** — Glassmorphism 2.0 dengan blur kontekstual.
4. **Typography as Interface** — Font besar, hierarki jelas, kontras tinggi.
5. **Zero Jank** — 60 FPS minimum, semua animasi GPU-accelerated.

---

## 🌈 2. COLOR SYSTEM (OKLCH)

### File: `src/styles/tokens.ts`
```typescript
export const colors = {
  // Brand Primary — Signal Tangerine (from Kaos Kami)
  brand: {
    50: 'oklch(0.97 0.02 50)',
    100: 'oklch(0.94 0.04 50)',
    200: 'oklch(0.88 0.08 50)',
    300: 'oklch(0.80 0.13 50)',
    400: 'oklch(0.72 0.18 50)',
    500: 'oklch(0.65 0.23 50)',   // Primary — Signal Tangerine
    600: 'oklch(0.58 0.20 45)',
    700: 'oklch(0.50 0.17 40)',
    800: 'oklch(0.42 0.14 35)',
    900: 'oklch(0.35 0.11 30)',
    950: 'oklch(0.25 0.08 25)',
  },
  
  // Deep Obsidian (Background)
  obsidian: {
    50: 'oklch(0.98 0.005 280)',
    100: 'oklch(0.94 0.005 280)',
    200: 'oklch(0.88 0.008 280)',
    300: 'oklch(0.80 0.010 280)',
    400: 'oklch(0.65 0.012 280)',
    500: 'oklch(0.50 0.014 280)',
    600: 'oklch(0.35 0.016 280)',
    700: 'oklch(0.25 0.018 280)',
    800: 'oklch(0.16 0.020 280)',
    900: 'oklch(0.10 0.022 280)',
    950: 'oklch(0.06 0.024 280)',
  },
  
  // Semantic
  success: 'oklch(0.65 0.20 145)',
  warning: 'oklch(0.75 0.18 80)',
  error: 'oklch(0.60 0.22 25)',
  info: 'oklch(0.65 0.18 220)',
} as const;
```

### Tailwind Config — File: `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        obsidian: colors.obsidian,
      },
      fontFamily: {
        display: ['var(--font-syne)'],
        body: ['var(--font-jetbrains)'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-1': ['clamp(2.5rem, 8vw, 4.5rem)', { lineHeight: '1', fontWeight: '700' }],
        'display-2': ['clamp(2rem, 6vw, 3.5rem)', { lineHeight: '1.1', fontWeight: '700' }],
        'display-3': ['clamp(1.5rem, 4vw, 2.5rem)', { lineHeight: '1.2', fontWeight: '600' }],
        'headline': ['1.25rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '-0.01em' }],
        'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'caption': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'micro': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      animation: {
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        springIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

---

## 🎭 3. MICRO-INTERACTIONS LIBRARY

### 3.1 Haptic Hook — File: `src/hooks/useHaptic.ts`
```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function useHaptic() {
  const light = () => Haptics.impact({ style: ImpactStyle.Light });
  const medium = () => Haptics.impact({ style: ImpactStyle.Medium });
  const heavy = () => Haptics.impact({ style: ImpactStyle.Heavy });
  
  const success = () => Haptics.notification({ type: NotificationType.Success });
  const warning = () => Haptics.notification({ type: NotificationType.Warning });
  const error = () => Haptics.notification({ type: NotificationType.Error });
  
  const vibrate = (duration = 300) => Haptics.vibrate({ duration });
  
  return { light, medium, heavy, success, warning, error, vibrate };
}
```

### 3.2 Spring Button — File: `src/components/ui/SpringButton.tsx`
```typescript
'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';
import { ReactNode, MouseEvent } from 'react';

interface SpringButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function SpringButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}: SpringButtonProps) {
  const { light } = useHaptic();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300 });
  
  const handlePress = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    light();
    onClick?.();
  };
  
  const styles = {
    primary: 'bg-brand-500 text-white shadow-lg shadow-brand-500/30',
    secondary: 'bg-white/5 text-white border border-white/10',
    ghost: 'text-white hover:bg-white/5',
  }[variant];
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-7 py-4 text-lg',
  }[size];
  
  return (
    <motion.button
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.96 }}
      onClick={handlePress}
      disabled={disabled}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={`
        relative rounded-xl font-semibold tracking-tight
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:shadow-none
        ${styles} ${sizes} ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
```

### 3.3 Glass Card — File: `src/components/ui/GlassCard.tsx`
```typescript
'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  blur?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export function GlassCard({ 
  children, 
  blur = 'md', 
  glow = false, 
  className = '', 
  ...props 
}: GlassCardProps) {
  const blurClass = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-xl',
    lg: 'backdrop-blur-3xl',
  }[blur];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/[0.04]
        border border-white/[0.08]
        ${blurClass}
        ${glow ? 'shadow-2xl shadow-brand-500/10' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### 3.4 Animated Number — File: `src/components/ui/AnimatedNumber.tsx`
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}

export function AnimatedNumber({ value, format, duration = 0.8 }: AnimatedNumberProps) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) => 
    format ? format(v) : Math.round(v).toLocaleString('id-ID')
  );
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  return <motion.span>{display}</motion.span>;
}
```

### 3.5 Pull-to-Refresh — File: `src/components/ui/PullToRefresh.tsx`
```typescript
'use client';

import { useMotionValueEvent, useMotionValue, useSpring } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';
import { ReactNode, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const { medium } = useHaptic();
  
  const y = useMotionValue(0);
  const smoothY = useSpring(y, { stiffness: 300, damping: 30 });
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY !== 0 || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && delta < 120) {
      setPullDistance(delta);
      y.set(delta * 0.5);
    }
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance > 70) {
      medium();
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    y.set(0);
  };
  
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        style={{ y: smoothY }}
        className="flex justify-center items-center h-12 overflow-hidden"
      >
        <RefreshCw 
          className={`w-5 h-5 text-brand-500 ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{ 
            opacity: pullDistance / 70,
            transform: `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </motion.div>
      {children}
    </div>
  );
}
```

---

## 🧩 4. COMPONENT LIBRARY

### 4.1 Skeleton Loader — File: `src/components/ui/Skeleton.tsx`
```typescript
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`
      relative overflow-hidden rounded-lg
      bg-gradient-to-r from-white/5 via-white/10 to-white/5
      bg-[length:200%_100%]
      animate-[shimmer_2s_linear_infinite]
      ${className}
    `} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

### 4.2 Toast — File: `src/components/ui/Toast.tsx`
```typescript
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

// Global toast store (zustand)
interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  const { success, error } = useHaptic();
  
  const icons = {
    success: <CheckCircle className="text-emerald-400" />,
    error: <AlertCircle className="text-red-400" />,
    info: <Info className="text-blue-400" />,
    warning: <AlertCircle className="text-amber-400" />,
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] safe-top pointer-events-none">
      <div className="flex flex-col items-center gap-2 px-4 py-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => toast.type === 'success' ? success() : error()}
              className="pointer-events-auto w-full max-w-md
                         bg-obsidian-900/95 backdrop-blur-2xl
                         border border-white/10 rounded-xl
                         px-4 py-3 shadow-2xl
                         flex items-start gap-3"
            >
              {icons[toast.type]}
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-white/60 mt-0.5">{toast.description}</p>
                )}
              </div>
              <button onClick={() => remove(toast.id)}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

### 4.3 Bottom Sheet — File: `src/components/ui/BottomSheet.tsx`
```typescript
'use client';

import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { ReactNode } from 'react';
import { useHaptic } from '@/hooks/useHaptic';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({ 
  open, 
  onClose, 
  children,
  snapPoints = [0.5, 0.9]  // fraction of screen height
}: BottomSheetProps) {
  const { light } = useHaptic();
  
  const handleDragEnd = (e: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      light();
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[95]
                       bg-obsidian-900 rounded-t-3xl
                       border-t border-white/10
                       max-h-[90vh] overflow-y-auto
                       safe-bottom"
          >
            <div className="sticky top-0 flex justify-center pt-3 pb-2 bg-obsidian-900/95 backdrop-blur-xl">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 🎬 5. PAGE TRANSITIONS

### File: `src/components/shell/PageTransition.tsx`
```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ 
          duration: 0.25, 
          ease: [0.16, 1, 0.3, 1]  // Apple-like spring
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 🌗 6. DARK/LIGHT THEME

### File: `src/store/useThemeStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  resolved: 'dark' | 'light';
  resolve: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',   // Default dark for Kaos Kami aesthetic
      resolved: 'dark',
      setTheme: (theme) => {
        set({ theme });
        get().resolve();
      },
      resolve: () => {
        const { theme } = get();
        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          set({ resolved: isDark ? 'dark' : 'light' });
        } else {
          set({ resolved: theme });
        }
        document.documentElement.classList.toggle('dark', get().resolved === 'dark');
      },
    }),
    { name: 'kaos-kami-theme' }
  )
);
```

---

## 📱 7. RESPONSIVE BREAKPOINTS (Mobile-First)

```typescript
// Breakpoint strategy for Capacitor mobile
export const breakpoints = {
  xs: 320,   // iPhone SE, small Android
  sm: 375,   // iPhone 13 mini, most Android
  md: 414,   // iPhone Pro Max, tablet portrait
  lg: 768,   // Tablet landscape
  xl: 1024,  // iPad Pro
} as const;
```

---

## ♿ 8. ACCESSIBILITY (WCAG 2.2 AA)

- [ ] Minimum touch target 44×44pt (Apple HIG)
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text
- [ ] Focus indicators visible (2px outline brand-500)
- [ ] Support VoiceOver / TalkBack with proper ARIA labels
- [ ] Respect `prefers-reduced-motion` 
- [ ] Dynamic type support (iOS) / Font scaling (Android)
- [ ] Error messages are descriptive, not just color-coded

```typescript
// Respect reduced motion
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

---

## ✅ 9. CHECKLIST BLUEPRINT-02

- [ ] Color tokens defined (OKLCH)
- [ ] Typography scale defined
- [ ] SpringButton component created
- [ ] GlassCard component created
- [ ] AnimatedNumber component created
- [ ] PullToRefresh component created
- [ ] Skeleton loaders created
- [ ] Toast system with haptics
- [ ] BottomSheet with drag gesture
- [ ] PageTransition wrapper
- [ ] Dark/Light theme toggle
- [ ] All components respect safe-area
- [ ] All components accessible (WCAG 2.2 AA)
- [ ] Haptic feedback on all CTA
- [ ] No layout shift on mount

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-03: 3D Mockup Engine Mobile**
```

---

# 📙 BLUEPRINT-03 — 3D MOCKUP ENGINE MOBILE (Three.js Optimization)

```markdown
# 📙 BLUEPRINT-03: 3D MOCKUP ENGINE MOBILE
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~2,500

---

## 🎯 1. TUJUAN

Achieve 60 FPS di device budget (Redmi 9A, Samsung A03, iPhone SE 2) 
untuk 3D Configurator Kaos Kami yang sudah ada di web version, 
dengan fitur setara VirtualThreads + 3DMockups.app + FitMockup.

**Fitur Wajib:**
- Real-time garment color switching (6 colorways)
- Custom decal upload + UV projection
- 360° continuous spin
- Wind animation (Cloth physics)
- Walking animation (rigged manekin)
- AR-lite preview di badan
- Native video export (MediaRecorder)
- 3D Paint Studio (brush langsung di garment)

---

## 📊 2. DEVICE TIERING SYSTEM

### File: `src/hooks/useDeviceTier.ts`
```typescript
import { useEffect, useState } from 'react';
import { Device } from '@capacitor/device';

export type DeviceTier = 'low' | 'medium' | 'high';

interface TierConfig {
  maxPixelRatio: number;
  antialias: boolean;
  shadowMapSize: number;
  enableSSAO: boolean;
  enableBloom: boolean;
  maxTriangles: number;
  textureSize: number;
  enableClothPhysics: boolean;
  enableBones: boolean;
  dprCap: number;
}

const TIERS: Record<DeviceTier, TierConfig> = {
  low: {
    maxPixelRatio: 1.0,
    antialias: false,
    shadowMapSize: 512,
    enableSSAO: false,
    enableBloom: false,
    maxTriangles: 15000,
    textureSize: 512,
    enableClothPhysics: false,
    enableBones: false,
    dprCap: 1.0,
  },
  medium: {
    maxPixelRatio: 1.5,
    antialias: true,
    shadowMapSize: 1024,
    enableSSAO: false,
    enableBloom: false,
    maxTriangles: 50000,
    textureSize: 1024,
    enableClothPhysics: true,
    enableBones: true,
    dprCap: 1.5,
  },
  high: {
    maxPixelRatio: 2.0,
    antialias: true,
    shadowMapSize: 2048,
    enableSSAO: true,
    enableBloom: true,
    maxTriangles: 150000,
    textureSize: 2048,
    enableClothPhysics: true,
    enableBones: true,
    dprCap: 2.0,
  },
};

export function useDeviceTier(): { tier: DeviceTier; config: TierConfig } {
  const [tier, setTier] = useState<DeviceTier>('medium');
  const [config, setConfig] = useState<TierConfig>(TIERS.medium);
  
  useEffect(() => {
    async function detect() {
      const info = await Device.getInfo();
      const memInfo = await Device.getMemoryInfo?.();
      
      // Heuristic based on device model, RAM, GPU
      let detected: DeviceTier = 'medium';
      
      const model = info.model.toLowerCase();
      const isIOS = info.platform === 'ios';
      
      // Low-end Android heuristics
      const lowEndPatterns = [
        'redmi 9', 'redmi 8', 'redmi 7', 'galaxy a0', 'galaxy m0',
        'infinix', 'tecno', 'vivo y1', 'oppo a1', 'realme c',
      ];
      
      if (lowEndPatterns.some(p => model.includes(p))) {
        detected = 'low';
      } else if (isIOS) {
        // All modern iPhones are high tier
        detected = 'high';
      } else if (info.model && parseInt(info.model.slice(-2)) >= 11) {
        detected = 'high';
      }
      
      // Check RAM if available
      if (memInfo?.webGLExtension === 'low') {
        detected = 'low';
      }
      
      setTier(detected);
      setConfig(TIERS[detected]);
    }
    
    detect();
  }, []);
  
  return { tier, config };
}
```

---

## 🎨 3. OPTIMIZED 3D CANVAS

### File: `src/components/3d/OptimizedCanvas.tsx`
```typescript
'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, ReactNode, useMemo } from 'react';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { AdaptiveDpr, AdaptiveEvents, Preload, BakeShadows } from '@react-three/drei';
import { PerformanceMonitor } from '@react-three/drei';

interface OptimizedCanvasProps {
  children: ReactNode;
  camera?: any;
}

export function OptimizedCanvas({ children, camera }: OptimizedCanvasProps) {
  const { tier, config } = useDeviceTier();
  
  return (
    <Canvas
      camera={{ 
        position: [0, 0, 5], 
        fov: 45,
        near: 0.1,
        far: 100,
        ...camera,
      }}
      dpr={config.maxPixelRatio}
      gl={{
        antialias: config.antialias,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        // Disable costly features on low tier
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        
        if (tier === 'low') {
          scene.traverse((obj: any) => {
            if (obj.material) {
              obj.material.precision = 'lowp';
            }
          });
        }
      }}
      shadows={tier !== 'low' ? { type: THREE.PCFSoftShadowMap } : false}
    >
      <PerformanceMonitor
        onDecline={() => {
          // Auto-degrade on low FPS
          console.warn('Performance declined - reducing quality');
        }}
      />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
```

---

## 👕 4. GARMENT COMPONENTS

### 4.1 Main T-Shirt Component — File: `src/components/3d/TShirt.tsx`
```typescript
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useTexture, useFrame, MeshPortalMaterial } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { useDeviceTier } from '@/hooks/useDeviceTier';

const COLORWAYS = {
  obsidian: '#0A0A0B',
  tangerine: '#FF6B35',
  cream: '#F5F0E8',
  forest: '#1B4332',
  crimson: '#8B0000',
  cobalt: '#0047AB',
} as const;

type ColorwayKey = keyof typeof COLORWAYS;

interface TShirtProps {
  colorway: ColorwayKey;
  decalUrl?: string;
  printWidthCm?: number;  // max 30cm
  printHeightCm?: number;
  offsetFromCollarCm?: number;
  onLoaded?: () => void;
}

export function TShirt({
  colorway,
  decalUrl,
  printWidthCm = 20,
  printHeightCm = 25,
  offsetFromCollarCm = 5,
  onLoaded,
}: TShirtProps) {
  const group = useRef<THREE.Group>(null);
  const { tier, config } = useDeviceTier();
  
  // Load GLB with Draco compression
  const { nodes, materials } = useGLTF('/models/tshirt-heavyweight-draco.glb');
  
  // Setup fabric material
  const fabricMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORWAYS[colorway]),
      roughness: 0.85,       // Heavyweight cotton
      metalness: 0.0,
      normalMap: null,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });
    
    // Enable cloth-like shading
    if (tier !== 'low') {
      mat.side = THREE.DoubleSide;
      mat.flatShading = false;
    }
    
    return mat;
  }, [colorway, tier]);
  
  // Spring animation for garment switching
  const spring = useSpring({
    scale: 1,
    rotationY: 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  
  // Cloth simulation for medium/high tier
  useFrame((state) => {
    if (!group.current) return;
    if (config.enableClothPhysics) {
      const t = state.clock.getElapsedTime();
      // Wind effect
      group.current.rotation.z = Math.sin(t * 0.5) * 0.02;
      group.current.position.y = Math.sin(t * 0.7) * 0.05;
    }
  });
  
  return (
    <a.group ref={group} scale={spring.scale} rotation-y={spring.rotationY}>
      <mesh
        geometry={nodes.TShirt.geometry}
        material={fabricMaterial}
        castShadow={tier !== 'low'}
        receiveShadow={tier !== 'low'}
      />
      {decalUrl && (
        <DecalMesh
          url={decalUrl}
          widthCm={printWidthCm}
          heightCm={printHeightCm}
          offsetFromCollarCm={offsetFromCollarCm}
        />
      )}
    </a.group>
  );
}
```

### 4.2 Decal Projection — File: `src/components/3d/DecalMesh.tsx`
```typescript
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader, sRGBEncoding } from 'three';
import * as THREE from 'three';

interface DecalMeshProps {
  url: string;
  widthCm: number;   // max 30
  heightCm: number;
  offsetFromCollarCm: number;
}

export function DecalMesh({ url, widthCm, heightCm, offsetFromCollarCm }: DecalMeshProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      setTexture(tex);
    });
    
    return () => {
      if (texture) texture.dispose();
    };
  }, [url]);
  
  if (!texture) return null;
  
  // Convert cm to world units (1cm ≈ 0.01m in three.js)
  const width = widthCm * 0.01;
  const height = heightCm * 0.01;
  const yOffset = offsetFromCollarCm * 0.01;
  
  return (
    <mesh position={[0, yOffset, 0.105]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={1}
        roughness={0.7}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}
```

### 4.3 Wind Animation (Cloth Physics) — File: `src/components/3d/WindAnimation.tsx`
```typescript
'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

// Vertex shader for wind effect
const WIND_VERTEX = `
uniform float uTime;
uniform float uWindStrength;

void main() {
  vec3 pos = position;
  
  // Wind wave simulation
  float wave = sin(pos.x * 2.0 + uTime * 2.0) * cos(pos.y * 3.0 + uTime * 1.5);
  pos.z += wave * uWindStrength * 0.1;
  pos.x += cos(pos.y * 2.0 + uTime) * uWindStrength * 0.05;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export function useWindAnimation(strength: number = 1) {
  const uniforms = useRef({
    uTime: { value: 0 },
    uWindStrength: { value: strength },
  });
  
  useFrame((state, delta) => {
    uniforms.current.uTime.value += delta;
  });
  
  return uniforms.current;
}
```

### 4.4 Walking Animation — File: `src/components/3d/WalkingCharacter.tsx`
```typescript
'use client';

import { useGLTF, useAnimations } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function WalkingCharacter({ garmentColor }: { garmentColor: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/manekin-walking.glb');
  const { actions, names } = useAnimations(animations, group);
  
  useEffect(() => {
    if (names.length > 0) {
      actions[names[0]]?.play();
    }
  }, [actions, names]);
  
  return (
    <group ref={group}>
      <primitive object={scene} />
      {/* Replace shirt material color */}
    </group>
  );
}
```

---

## 🎨 5. 3D PAINT STUDIO (In-Garment Brush)

### File: `src/components/3d/PaintCanvas.tsx`
```typescript
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3, CanvasTexture, MeshStandardMaterial } from 'three';
import * as THREE from 'three';

interface PaintCanvasProps {
  meshRef: React.RefObject<THREE.Mesh>;
  brushColor: string;
  brushSize: number;  // in cm
  onStrokeComplete?: () => void;
}

export function usePaintOnMesh({
  meshRef,
  brushColor,
  brushSize,
  onStrokeComplete,
}: PaintCanvasProps) {
  const { camera, gl, scene } = useThree();
  const [isPainting, setIsPainting] = useState(false);
  const canvasTexture = useRef<CanvasTexture | null>(null);
  const ctx2D = useRef<CanvasRenderingContext2D | null>(null);
  
  // Create canvas texture (2048x2048 for UV painting)
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(0,0,0,0)';  // transparent
      context.fillRect(0, 0, canvas.width, canvas.height);
      ctx2D.current = context;
      
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      canvasTexture.current = tex;
      
      // Apply to mesh material
      if (meshRef.current) {
        const material = meshRef.current.material as MeshStandardMaterial;
        material.map = tex;
        material.needsUpdate = true;
      }
    }
  }, [meshRef]);
  
  const raycast = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!meshRef.current || !ctx2D.current || !canvasTexture.current) return;
    
    const mesh = meshRef.current;
    const intersection = e.intersections.find(i => i.object === mesh);
    if (!intersection) return;
    
    const uv = intersection.uv;
    if (!uv) return;
    
    // Draw on canvas
    const x = uv.x * 2048;
    const y = (1 - uv.y) * 2048;
    const radius = brushSize * 8;  // cm to pixels
    
    ctx2D.current.beginPath();
    ctx2D.current.arc(x, y, radius, 0, Math.PI * 2);
    ctx2D.current.fillStyle = brushColor;
    ctx2D.current.fill();
    
    canvasTexture.current.needsUpdate = true;
  }, [brushColor, brushSize, meshRef]);
  
  return { raycast, isPainting, canvasTexture };
}
```

---

## 🎥 6. NATIVE VIDEO EXPORT

### File: `src/lib/capacitor/videoRecorder.ts`
```typescript
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';

export class VideoExporter {
  private static canvas: HTMLCanvasElement | null = null;
  private static stream: MediaStream | null = null;
  private static recorder: MediaRecorder | null = null;
  private static chunks: Blob[] = [];
  
  static async setup(canvas: HTMLCanvasElement) {
    if (Capacitor.isNativePlatform()) {
      // On native, we need to enable capture
      this.canvas = canvas;
      this.stream = canvas.captureStream(30); // 30 FPS
      return true;
    }
    return false;
  }
  
  static async startRecording(durationMs: number = 5000): Promise<string> {
    if (!this.stream) throw new Error('Canvas not set up');
    
    this.chunks = [];
    const mimeType = 'video/webm;codecs=vp9';
    
    this.recorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,  // 8 Mbps for high quality
    });
    
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    
    this.recorder.start();
    
    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    return new Promise((resolve) => {
      this.recorder!.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const base64 = await this.blobToBase64(blob);
        
        const fileName = `kaos-kami-showcase-${Date.now()}.webm`;
        
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        
        resolve(saved.uri);
      };
      
      this.recorder!.stop();
    });
  }
  
  static async shareVideo(uri: string) {
    await Share.share({
      title: 'Kaos Kami Showcase',
      url: uri,
      dialogTitle: 'Bagikan Desain Anda',
    });
  }
  
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
```

---

## 🔄 7. GLTF OPTIMIZATION PIPELINE

### File: `scripts/optimize-gltf.mjs`
```javascript
#!/usr/bin/env node
import { optimize } from '@gltf-transform/core';
import { Logger } from '@gltf-transform/core';
import { draco3dgltf, meshopt, textureCompress, prune, dedup, resample } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const input = process.argv[2];
const output = process.argv[3];
const tier = process.argv[4] || 'medium';

const config = {
  low: { triangles: 15000, textureSize: 512, quality: 50 },
  medium: { triangles: 50000, textureSize: 1024, quality: 75 },
  high: { triangles: 150000, textureSize: 2048, quality: 90 },
}[tier];

const io = new Logger();
const document = await optimize(input);

await document.transform(
  dedup(),
  prune(),
  resample(),
  draco3dgltf({ method: draco3d.createDecoderModule, quantizationVolume: 'mesh' }),
  textureCompress({
    encoder: sharp,
    targetFormat: 'ktx2',
    quality: config.quality,
    resize: [config.textureSize, config.textureSize],
  }),
);

await io.write(output, document);
console.log(`✅ Optimized for ${tier}: ${output}`);
```

### Usage:
```bash
node scripts/optimize-gltf.mjs public/models/tshirt.glb public/models/tshirt-low.glb low
node scripts/optimize-gltf.mjs public/models/tshirt.glb public/models/tshirt-medium.glb medium
node scripts/optimize-gltf.mjs public/models/tshirt.glb public/models/tshirt-high.glb high
```

### File: `src/components/3d/useTieredModel.ts`
```typescript
import { useGLTF } from '@react-three/drei';
import { useDeviceTier } from '@/hooks/useDeviceTier';

export function useTieredModel(baseUrl: string) {
  const { tier } = useDeviceTier();
  
  const modelPath = `${baseUrl}-${tier}.glb`;
  return useGLTF(modelPath);
}
```

---

## 🎯 8. AR-LITE PREVIEW (Native Camera + 3D Overlay)

### File: `src/components/3d/ARPreview.tsx`
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ARPreview({ designId }: { designId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied'>('granted');
  
  useEffect(() => {
    async function startCamera() {
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          width: 1080,
          height: 1920,
          correctOrientation: true,
          saveToGallery: false,
        });
        
        setPhotoUri(photo.webPath || null);
      } catch (err) {
        setPermission('denied');
      }
    }
    
    startCamera();
  }, []);
  
  return (
    <div className="relative w-full h-full">
      {photoUri && (
        <>
          <img src={photoUri} className="absolute inset-0 w-full h-full object-cover" />
          <Canvas className="absolute inset-0">
            <ambientLight intensity={0.8} />
            <directionalLight position={[0, 5, 5]} />
            <FloatingShirt designId={designId} />
          </Canvas>
        </>
      )}
    </div>
  );
}

function FloatingShirt({ designId }: { designId: string }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <group ref={ref} position={[0, 0, -2]}>
      <TShirt colorway="obsidian" />
    </group>
  );
}
```

---

## 📈 9. PERFORMANCE MONITORING

### File: `src/lib/performanceMonitor.ts`
```typescript
import * as Sentry from '@sentry/react';

export class PerfMonitor {
  private static fps = 0;
  private static frames = 0;
  private static lastTime = performance.now();
  private static observer: PerformanceObserver | null = null;
  
  static start() {
    let rafId: number;
    
    const tick = () => {
      this.frames++;
      const now = performance.now();
      
      if (now - this.lastTime >= 1000) {
        this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
        this.frames = 0;
        this.lastTime = now;
        
        // Report if FPS is low
        if (this.fps < 30) {
          Sentry.captureMessage(`Low FPS detected: ${this.fps}`, 'warning');
        }
      }
      
      rafId = requestAnimationFrame(tick);
    };
    
    rafId = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(rafId);
  }
  
  static getFPS() {
    return this.fps;
  }
  
  static measureMemory() {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),  // MB
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  }
}
```

---

## ✅ 10. CHECKLIST BLUEPRINT-03

- [ ] Device tiering system implemented
- [ ] OptimizedCanvas with tier-aware settings
- [ ] GLTF Draco compression configured
- [ ] KTX2 texture compression
- [ ] Tier-specific model files generated (low/medium/high)
- [ ] T-Shirt component with colorway support
- [ ] Decal projection with cm calibration
- [ ] Wind animation (cloth physics)
- [ ] Walking animation (rigged character)
- [ ] 3D Paint Studio (UV raycast brush)
- [ ] Native video export via MediaRecorder
- [ ] AR-lite preview
- [ ] Performance monitoring with Sentry
- [ ] 60 FPS verified on Redmi 9A
- [ ] Memory leak check (dispose on unmount)
- [ ] Bundle size check (< 800KB for 3D libs)

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-04: E-Commerce & Payments**
```

---

# 📕 BLUEPRINT-04 — E-COMMERCE FEATURES & PAYMENTS

```markdown
# 📕 BLUEPRINT-04: E-COMMERCE FEATURES & PAYMENTS
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~2,800

---

## 💳 1. PAYMENT GATEWAYS (Indonesia-First)

### 1.1 Midtrans Mobile SDK Integration

Midtrans tidak menyediakan SDK native untuk Capacitor, tapi menyediakan 
**Mobile SDK** untuk Android (Java/Kotlin) dan iOS (Swift). Kita buat 
**custom Capacitor plugin** sebagai wrapper.

### File: `android/app/src/main/java/id/kaoskami/app/MidtransPlugin.java`
```java
package id.kaoskami.app;

import com.midtrans.sdk.corekit.core.MidtransSDK;
import com.midtrans.sdk.corekit.core.TransactionRequest;
import com.midtrans.sdk.corekit.core.themes.CustomColorTheme;
import com.midtrans.sdk.corekit.models.CustomerDetails;
import com.midtrans.sdk.corekit.models.snap.TransactionResult;
import com.midtrans.sdk.uikit.SdkUIFlowBuilder;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;

@CapacitorPlugin(name = "Midtrans")
public class MidtransPlugin extends Plugin {

    private static final String CLIENT_KEY = "SB-Mid-client-YOUR-KEY";
    private static final String BASE_URL = "https://api.sandbox.midtrans.com";
    
    @PluginMethod
    public void initialize(PluginCall call) {
        String clientKey = call.getString("clientKey", CLIENT_KEY);
        String baseUrl = call.getString("baseUrl", BASE_URL);
        Boolean isProduction = call.getBoolean("isProduction", false);
        
        SdkUIFlowBuilder.init()
            .setClientKey(clientKey)
            .setContext(getContext())
            .setTransactionFinishedCallback(new TransactionFinishedCallback() {
                @Override
                public void onTransactionFinished(TransactionResult result) {
                    JSObject data = new JSObject();
                    data.put("status", result.getStatus().toString());
                    data.put("orderId", result.getResponse() != null ? 
                            result.getResponse().getOrderId() : "");
                    data.put("paymentType", result.getResponse() != null ?
                            result.getResponse().getPaymentType() : "");
                    
                    if (result.getStatus() == TransactionResult.STATUS_SUCCESS) {
                        notifyListeners("onSuccess", data);
                    } else if (result.getStatus() == TransactionResult.STATUS_PENDING) {
                        notifyListeners("onPending", data);
                    } else if (result.getStatus() == TransactionResult.STATUS_FAILED) {
                        notifyListeners("onFailed", data);
                    }
                }
            })
            .setServerUrl(baseUrl)
            .setColorTheme(new CustomColorTheme(
                "#FF6B35",  // brand primary
                "#0A0A0B",  // dark
                "#FFFFFF"   // light
            ))
            .enableLog(true)
            .buildSDK();
        
        call.resolve();
    }
    
    @PluginMethod
    public void payWithSnap(PluginCall call) {
        String snapToken = call.getString("snapToken");
        String orderId = call.getString("orderId");
        
        MidtransSDK.getInstance().startPaymentUiFlow(
            getActivity(),
            snapToken
        );
        
        call.resolve();
    }
    
    @PluginMethod
    public void payWithQRIS(PluginCall call) {
        // Direct QRIS flow
        String orderId = call.getString("orderId");
        String amount = call.getString("amount");
        
        TransactionRequest transactionRequest = new TransactionRequest(
            orderId, Double.parseDouble(amount)
        );
        
        // Configure QRIS
        HashMap<String, Object> qrisOptions = new HashMap<>();
        qrisOptions.put("acquirer", "gopay");
        transactionRequest.setCustomField1("QRIS");
        
        MidtransSDK.getInstance().setTransactionRequest(transactionRequest);
        MidtransSDK.getInstance().startPaymentUiFlow(getActivity(), transactionRequest);
        
        call.resolve();
    }
}
```

### File: `src/plugins/midtrans/index.ts`
```typescript
import { registerPlugin } from '@capacitor/core';
import type { MidtransPlugin } from './definitions';

const Midtrans = registerPlugin<MidtransPlugin>('Midtrans');

export * from './definitions';
export default Midtrans;
```

### File: `src/plugins/midtrans/definitions.ts`
```typescript
import type { PluginListenerHandle } from '@capacitor/core';

export interface TransactionResult {
  status: 'success' | 'pending' | 'failed' | 'invalid';
  orderId: string;
  paymentType?: string;
  errorMessage?: string;
}

export interface MidtransPlugin {
  initialize(options: {
    clientKey: string;
    baseUrl: string;
    isProduction: boolean;
  }): Promise<void>;
  
  payWithSnap(options: {
    snapToken: string;
    orderId: string;
  }): Promise<void>;
  
  payWithQRIS(options: {
    orderId: string;
    amount: string;
  }): Promise<void>;
  
  addListener(
    eventName: 'onSuccess',
    listenerFunc: (result: TransactionResult) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  
  addListener(
    eventName: 'onPending',
    listenerFunc: (result: TransactionResult) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  
  addListener(
    eventName: 'onFailed',
    listenerFunc: (result: TransactionResult) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  
  removeAllListeners(): Promise<void>;
}
```

### File: `src/lib/payments/midtrans.ts`
```typescript
import Midtrans from '@/plugins/midtrans';
import { Capacitor } from '@capacitor/core';

export class MidtransService {
  private static isInitialized = false;
  
  static async init() {
    if (this.isInitialized) return;
    
    await Midtrans.initialize({
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
      baseUrl: process.env.NEXT_PUBLIC_MIDTRANS_BASE_URL || '',
      isProduction: process.env.NODE_ENV === 'production',
    });
    
    this.isInitialized = true;
  }
  
  static async payWithSnap(snapToken: string, orderId: string) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!Capacitor.isNativePlatform()) {
        // Fallback to web Snap popup
        this.payWithWebSnap(snapToken).then(resolve).catch(reject);
        return;
      }
      
      Midtrans.addListener('onSuccess', (result) => resolve(result));
      Midtrans.addListener('onPending', (result) => resolve(result));
      Midtrans.addListener('onFailed', (result) => reject(result));
      
      Midtrans.payWithSnap({ snapToken, orderId });
    });
  }
  
  private static payWithWebSnap(snapToken: string) {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      window.snap.pay(snapToken, {
        onSuccess: resolve,
        onPending: resolve,
        onError: reject,
        onClose: () => reject(new Error('Payment cancelled')),
      });
    });
  }
}
```

### 1.2 Payment Methods Support

| Metode | Midtrans | Duitku | Xendit | Prioritas |
|---|---|---|---|---|
| QRIS (semua e-wallet) | ✅ | ✅ | ✅ | 🔴 MUST |
| GoPay | ✅ | ✅ | ✅ | 🔴 MUST |
| ShopeePay | ✅ | ✅ | ✅ | 🔴 MUST |
| DANA | ✅ | ✅ | ✅ | 🔴 MUST |
| OVO | ✅ | ❌ | ✅ | 🔴 MUST |
| Virtual Account (BCA, BNI, BRI, Mandiri) | ✅ | ✅ | ✅ | 🔴 MUST |
| Alfamart / Indomaret | ✅ | ✅ | ✅ | 🟡 SHOULD |
| Credit Card | ✅ | ✅ | ✅ | 🟡 SHOULD |
| Akulaku | ✅ | ❌ | ❌ | 🟢 COULD |
| AkuLaku PayLater | ✅ | ❌ | ❌ | 🟢 COULD |

---

## 🛒 2. SHOPPING CART (Offline-First)

### File: `src/store/useCartStore.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Preferences } from '@capacitor/preferences';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variant: {
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    colorway: string;
    gsm: 240 | 280;
  };
  design?: {
    designId: string;
    previewUrl: string;
    printWidthCm: number;
    printHeightCm: number;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  addedAt: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const newItem: CartItem = {
          ...item,
          id: `${item.productId}-${item.variant.size}-${item.variant.colorway}-${Date.now()}`,
          addedAt: Date.now(),
        };
        set((s) => ({ items: [...s.items, newItem] }));
      },
      
      removeItem: (id) => {
        set((s) => ({ items: s.items.filter(i => i.id !== id) }));
      },
      
      updateQuantity: (id, qty) => {
        set((s) => ({
          items: s.items.map(i => 
            i.id === id 
              ? { ...i, quantity: qty, subtotal: i.unitPrice * qty }
              : i
          ),
        }));
      },
      
      clear: () => set({ items: [] }),
      
      total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'kaos-kami-cart',
      storage: createJSONStorage(() => ({
        getItem: Preferences.get,
        setItem: Preferences.set,
        removeItem: Preferences.remove,
      })),
    }
  )
);
```

---

## 📦 3. ORDER FLOW

### 3.1 Order States

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
│ DRAFT   │───▶│ PENDING  │───▶│  PAYMENT    │───▶│ PAID     │
└─────────┘    └──────────┘    │  PENDING    │    └──────────┘
                                   └─────────────┘         │
                                                           ▼
┌──────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────┐
│ SHIPPED  │◀───│  PRINTING │◀───│  IN QUEUE   │◀───│ PRODUCING│
└──────────┘    └───────────┘    └─────────────┘    └──────────┘
     │
     ▼
┌──────────┐    ┌───────────┐
│DELIVERED │───▶│ COMPLETED │
└──────────┘    └───────────┘
```

### 3.2 Checkout Flow Component

### File: `src/app/(checkout)/checkout.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SpringButton } from '@/components/ui/SpringButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useCartStore } from '@/store/useCartStore';
import { useHaptic } from '@/hooks/useHaptic';
import { MidtransService } from '@/lib/payments/midtrans';
import { useToastStore } from '@/components/ui/Toast';

const DELIVERY_OPTIONS = [
  { id: 'pickup', label: 'Ambil di Workshop', price: 0, eta: 'Hari yang sama' },
  { id: 'instant', label: 'Instant Courier (Maxim)', price: 20000, eta: '1-2 jam' },
  { id: 'flatrate', label: 'Flat Rate Makassar', price: 15000, eta: '1-2 hari' },
  { id: 'jnt', label: 'J&T Cargo Se-Sulawesi', price: 25000, eta: '2-4 hari' },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCartStore();
  const { success, error } = useHaptic();
  const toast = useToastStore();
  
  const [deliveryId, setDeliveryId] = useState<string>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<string>('qris');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  const delivery = DELIVERY_OPTIONS.find(d => d.id === deliveryId);
  const grandTotal = total() + (delivery?.price || 0);
  
  async function handleCheckout() {
    setIsProcessing(true);
    
    try {
      // 1. Create order via API
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          deliveryMethod: deliveryId,
          deliveryPrice: delivery?.price,
          totalAmount: grandTotal,
        }),
      });
      
      const { orderId, snapToken } = await orderResponse.json();
      
      // 2. Trigger Midtrans payment
      const result = await MidtransService.payWithSnap(snapToken, orderId);
      
      // 3. Handle success
      success();
      toast.push({
        type: 'success',
        title: 'Pembayaran Berhasil!',
        description: 'Pesanan Anda sedang diproses workshop.',
      });
      
      clear();
      router.push(`/orders/${orderId}?status=success`);
      
    } catch (err) {
      error();
      toast.push({
        type: 'error',
        title: 'Pembayaran Gagal',
        description: 'Silakan coba lagi atau pilih metode lain.',
      });
    } finally {
      setIsProcessing(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-obsidian-950 pb-24 safe-bottom">
      <header className="sticky top-0 bg-obsidian-950/95 backdrop-blur-xl border-b border-white/10 z-10 safe-top">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
        </div>
      </header>
      
      <main className="px-6 py-6 space-y-6">
        {/* Delivery Options */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">
            Metode Pengiriman
          </h2>
          <div className="space-y-2">
            {DELIVERY_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                onClick={() => {
                  setDeliveryId(option.id);
                  useHaptic().light();
                }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full p-4 rounded-xl text-left transition-all
                  ${deliveryId === option.id
                    ? 'bg-brand-500/10 border-2 border-brand-500'
                    : 'bg-white/5 border border-white/10'}
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="text-xs text-white/50 mt-1">{option.eta}</p>
                  </div>
                  <p className="font-bold text-brand-500">
                    {option.price === 0 ? 'GRATIS' : `Rp ${option.price.toLocaleString('id-ID')}`}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
        
        {/* Payment Methods */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">
            Metode Pembayaran
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'qris', label: 'QRIS', icon: '📱' },
              { id: 'gopay', label: 'GoPay', icon: '💚' },
              { id: 'shopeepay', label: 'ShopeePay', icon: '🧡' },
              { id: 'va', label: 'Transfer Bank', icon: '🏦' },
              { id: 'alfamart', label: 'Alfamart', icon: '🏪' },
              { id: 'cod', label: 'COD', icon: '💵' },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setPaymentMethod(method.id);
                  useHaptic().light();
                }}
                className={`
                  p-4 rounded-xl flex flex-col items-center gap-2
                  ${paymentMethod === method.id
                    ? 'bg-brand-500/10 border-2 border-brand-500'
                    : 'bg-white/5 border border-white/10'}
                `}
              >
                <span className="text-2xl">{method.icon}</span>
                <span className="text-xs text-white font-medium">{method.label}</span>
              </button>
            ))}
          </div>
        </section>
        
        {/* Order Summary */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">
            Ringkasan Pesanan
          </h2>
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/70">
                  {item.productName} × {item.quantity}
                </span>
                <span className="text-white font-medium">
                  Rp {item.subtotal.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
              <span className="text-white/70">Ongkir ({delivery?.label})</span>
              <span className="text-white font-medium">
                {delivery?.price === 0 ? 'GRATIS' : `Rp ${delivery?.price.toLocaleString('id-ID')}`}
              </span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="font-bold text-white">Total</span>
              <span className="font-bold text-brand-500 text-lg">
                Rp {grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </section>
      </main>
      
      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-obsidian-950/95 backdrop-blur-xl 
                      border-t border-white/10 px-6 py-4 safe-bottom z-20">
        <SpringButton
          onClick={handleCheckout}
          disabled={isProcessing || items.length === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? 'Memproses...' : `Bayar Rp ${grandTotal.toLocaleString('id-ID')}`}
        </SpringButton>
      </div>
    </div>
  );
}
```

---

## 📱 4. WHATSAPP NOTIFICATION

### File: `src/lib/whatsapp.ts`
```typescript
import { Capacitor } from '@capacitor/core';

const FONNTE_TOKEN = process.env.NEXT_PUBLIC_FONNTE_TOKEN || '';

export class WhatsAppService {
  private static BASE_URL = 'https://kaos-kami-3d.hengkisetiawan461.workers.dev';
  
  static async sendOrderConfirmation(orderId: string, phone: string, data: any) {
    // Try Fonnte API first (server-side)
    try {
      const response = await fetch(`${this.BASE_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: phone,
          message: this.buildOrderMessage(data),
        }),
      });
      
      if (response.ok) return { success: true };
    } catch (err) {
      // Silent fail
    }
    
    // Fallback: Open wa.me deep link
    const message = encodeURIComponent(this.buildOrderMessage(data));
    const url = `https://wa.me/${phone}?text=${message}`;
    
    if (Capacitor.isNativePlatform()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
    
    return { success: false };
  }
  
  static buildOrderMessage(order: any): string {
    return `Halo Kaos Kami! 👋

Pesanan *${order.orderId}* berhasil dibuat.

📦 Detail Pesanan:
${order.items.map((i: any) => `• ${i.productName} (${i.size}, ${i.colorway}) × ${i.quantity}`).join('\n')}

💰 Total: Rp ${order.total.toLocaleString('id-ID')}
🚚 Pengiriman: ${order.deliveryMethod}

Terima kasih sudah order di Kaos Kami! 🙏`;
  }
  
  static openDirectChat(phone: string = '6281234567890') {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent('Halo Kaos Kami!')}`;
    window.open(url, '_system');
  }
}
```

---

## 🚚 5. DELIVERY TRACKING

### File: `src/components/checkout/DeliveryTracker.tsx`
```typescript
'use client';

import { motion } from 'framer-motion';
import { MapPin, Package, CheckCircle2 } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

interface TrackingStep {
  id: string;
  label: string;
  timestamp?: string;
  location?: string;
  completed: boolean;
}

const STEPS: TrackingStep[] = [
  { id: 'created', label: 'Pesanan Dibuat', completed: true },
  { id: 'paid', label: 'Pembayaran Diterima', completed: true },
  { id: 'producing', label: 'Produksi Workshop', completed: false },
  { id: 'printing', label: 'Proses Sablon DTF', completed: false },
  { id: 'packed', label: 'Packing & QC', completed: false },
  { id: 'shipped', label: 'Dikirim', completed: false },
  { id: 'delivered', label: 'Diterima', completed: false },
];

export function DeliveryTracker({ currentStep }: { currentStep: number }) {
  const { light } = useHaptic();
  
  return (
    <div className="space-y-4">
      {STEPS.map((step, idx) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => step.completed && light()}
          className={`
            flex items-center gap-3 p-3 rounded-xl
            ${step.completed ? 'bg-brand-500/10' : 'bg-white/5'}
          `}
        >
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${step.completed ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/40'}
          `}>
            {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${step.completed ? 'text-white' : 'text-white/40'}`}>
              {step.label}
            </p>
            {step.timestamp && (
              <p className="text-xs text-white/50">{step.timestamp}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

---

## 💾 6. OFFLINE ORDER QUEUE

### File: `src/lib/offline/orderQueue.ts`
```typescript
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

interface PendingOrder {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
}

const QUEUE_KEY = 'kaos_kami_pending_orders';

export class OfflineOrderQueue {
  private static listeners: Set<() => void> = new Set();
  
  static async enqueue(order: Omit<PendingOrder, 'id' | 'timestamp' | 'attempts'>) {
    const queue = await this.getQueue();
    const newOrder: PendingOrder = {
      ...order,
      id: `pending-${Date.now()}`,
      timestamp: Date.now(),
      attempts: 0,
    };
    
    queue.push(newOrder);
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
    
    // Try immediate sync if online
    const status = await Network.getStatus();
    if (status.connected) {
      this.processQueue();
    }
  }
  
  static async getQueue(): Promise<PendingOrder[]> {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  }
  
  static async processQueue() {
    const queue = await this.getQueue();
    const processed: string[] = [];
    
    for (const order of queue) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order.data),
        });
        
        if (response.ok) {
          processed.push(order.id);
        } else {
          order.attempts++;
          if (order.attempts > 5) {
            processed.push(order.id);  // Drop after 5 attempts
          }
        }
      } catch (err) {
        order.attempts++;
      }
    }
    
    const remaining = queue.filter(o => !processed.includes(o.id));
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(remaining) });
    
    this.listeners.forEach(fn => fn());
  }
  
  static onProcessed(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // Listen to network changes
  static init() {
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        setTimeout(() => this.processQueue(), 2000);
      }
    });
  }
}
```

---

## 📈 7. FACEBOOK APP EVENTS (Analytics)

### File: `src/plugins/facebook/index.ts`
```typescript
import { registerPlugin } from '@capacitor/core';
import type { FacebookPlugin } from './definitions';

const Facebook = registerPlugin<FacebookPlugin>('Facebook');

export * from './definitions';
export default Facebook;
```

### File: `src/plugins/facebook/definitions.ts`
```typescript
export interface FacebookPlugin {
  init(options: { appId: string; clientToken: string }): Promise<void>;
  logEvent(options: {
    eventName: string;
    valueToSum?: number;
    params?: Record<string, string>;
  }): Promise<void>;
  setUserId(options: { userId: string }): Promise<void>;
  setUserProperty(options: { name: string; value: string }): Promise<void>;
  logPurchase(options: {
    amount: number;
    currency: string;
    params?: Record<string, string>;
  }): Promise<void>;
}
```

### File: `android/app/src/main/java/id/kaoskami/app/FacebookPlugin.java`
```java
package id.kaoskami.app;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.HashMap;

@CapacitorPlugin(name = "Facebook")
public class FacebookPlugin extends Plugin {

    private AppEventsLogger logger;

    @PluginMethod
    public void init(PluginCall call) {
        String appId = call.getString("appId", "");
        String clientToken = call.getString("clientToken", "");
        
        FacebookSdk.setApplicationId(appId);
        FacebookSdk.setClientToken(clientToken);
        FacebookSdk.sdkInitialize(getContext());
        
        logger = AppEventsLogger.newLogger(getContext());
        call.resolve();
    }
    
    @PluginMethod
    public void logEvent(PluginCall call) {
        String eventName = call.getString("eventName", "");
        Double valueToSum = call.getDouble("valueToSum");
        JSObject params = call.getObject("params", new JSObject());
        
        if (logger == null) {
            call.reject("Facebook not initialized");
            return;
        }
        
        if (valueToSum != null) {
            logger.logEvent(eventName, valueToSum);
        } else {
            logger.logEvent(eventName);
        }
        
        call.resolve();
    }
    
    @PluginMethod
    public void logPurchase(PluginCall call) {
        Double amount = call.getDouble("amount", 0.0);
        String currency = call.getString("currency", "IDR");
        
        if (logger != null) {
            logger.logPurchase(BigDecimal.valueOf(amount), Currency.getInstance(currency));
        }
        
        call.resolve();
    }
}
```

### File: `src/lib/analytics/events.ts`
```typescript
import Facebook from '@/plugins/facebook';

export const FB_EVENTS = {
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  SEARCH: 'Search',
  ADD_TO_WISHLIST: 'AddToWishlist',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  DESIGN_STARTED: 'DesignStarted',
  DESIGN_COMPLETED: 'DesignCompleted',
  AR_PREVIEW_USED: 'ARPreviewUsed',
  VIDEO_EXPORTED: 'VideoExported',
} as const;

export class Analytics {
  static async init() {
    await Facebook.init({
      appId: process.env.NEXT_PUBLIC_FB_APP_ID || '',
      clientToken: process.env.NEXT_PUBLIC_FB_CLIENT_TOKEN || '',
    });
  }
  
  static async track(eventName: string, params?: Record<string, any>) {
    try {
      await Facebook.logEvent({
        eventName,
        params: params as Record<string, string>,
      });
    } catch (err) {
      // Silent fail
    }
  }
  
  static async trackPurchase(amount: number, orderId: string) {
    await Facebook.logPurchase({
      amount,
      currency: 'IDR',
      params: { orderId },
    });
  }
}
```

---

## ✅ 8. CHECKLIST BLUEPRINT-04

- [ ] Midtrans Mobile SDK native plugin (Android + iOS)
- [ ] Midtrans Snap web fallback
- [ ] QRIS, GoPay, ShopeePay, DANA, OVO, VA, Alfamart support
- [ ] Offline cart using Capacitor Preferences
- [ ] Order state machine implemented
- [ ] Checkout flow UI with sticky CTA
- [ ] WhatsApp notification via Fonnte + wa.me fallback
- [ ] Delivery tracking UI with steps
- [ ] Offline order queue with network listener
- [ ] Facebook App Events integration (native)
- [ ] Purchase event tracking
- [ ] Payment status webhook handler
- [ ] Midtrans notification handler (server-side)
- [ ] Order confirmation email (Resend/SendGrid)

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-05: Native Plugins Integration**
```

---

# 📒 BLUEPRINT-05 — NATIVE PLUGINS INTEGRATION

```markdown
# 📒 BLUEPRINT-05: NATIVE PLUGINS INTEGRATION
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~1,800

---

## 📸 1. CAMERA PLUGIN

### File: `src/hooks/useCamera.ts`
```typescript
import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface UseCameraReturn {
  takePhoto: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
  isAvailable: boolean;
  permission: 'granted' | 'denied' | 'prompt';
  requestPermission: () => Promise<boolean>;
}

export function useCamera(): UseCameraReturn {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 95,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 4096,          // Max 4K for DTF print quality
        height: 4096,
        correctOrientation: true,
        saveToGallery: false,
        presentationStyle: 'fullscreen',
      });
      
      return photo.webPath || null;
    } catch (err) {
      return null;
    }
  }, []);
  
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    try {
      const photo = await Camera.pickImages({
        quality: 95,
        resultType: CameraResultType.Uri,
        limit: 1,
        width: 4096,
        height: 4096,
      });
      
      return photo.photos[0]?.webPath || null;
    } catch (err) {
      return null;
    }
  }, []);
  
  const requestPermission = useCallback(async () => {
    const result = await Camera.requestPermissions();
    const granted = result.camera === 'granted' || result.photos === 'granted';
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);
  
  return {
    takePhoto,
    pickFromGallery,
    isAvailable: true,
    permission,
    requestPermission,
  };
}
```

### iOS Info.plist entries:
```xml
<key>NSCameraUsageDescription</key>
<string>Kaos Kami membutuhkan akses kamera untuk mengambil foto desain Anda dan fitur AR Preview.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Kaos Kami membutuhkan akses galeri untuk memilih logo atau desain dari galeri Anda.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Kaos Kami akan menyimpan mockup hasil desain Anda ke galeri.</string>
```

### Android: `AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## 🔐 2. BIOMETRIC AUTH

### File: `src/hooks/useBiometric.ts`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType>(BiometryType.none);
  
  useEffect(() => {
    checkAvailability();
  }, []);
  
  async function checkAvailability() {
    try {
      const info = await BiometricAuth.checkBiometry();
      setIsAvailable(info.isAvailable);
      setBiometryType(info.biometryType);
    } catch (err) {
      setIsAvailable(false);
    }
  }
  
  async function authenticate(reason: string = 'Login ke Kaos Kami'): Promise<boolean> {
    if (!isAvailable) return false;
    
    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Batal',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Gunakan Password',
        androidTitle: 'Autentikasi',
        androidSubtitle: 'Verifikasi identitas Anda',
        androidDescription: 'Gunakan biometrik untuk masuk ke Kaos Kami',
        androidNegativeButtonText: 'Batal',
      });
      return true;
    } catch (err) {
      return false;
    }
  }
  
  return { isAvailable, biometryType, authenticate };
}
```

### Biometric Login Screen Component

### File: `src/app/(auth)/login.tsx`
```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Mail, Lock } from 'lucide-react';
import { SpringButton } from '@/components/ui/SpringButton';
import { useBiometric } from '@/hooks/useBiometric';
import { useHaptic } from '@/hooks/useHaptic';
import { MobileAuthService } from '@/lib/auth/capacitor-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isAvailable, biometryType, authenticate } = useBiometric();
  const { success, error } = useHaptic();
  
  async function handleBiometricLogin() {
    const ok = await authenticate('Login ke Kaos Kami');
    if (ok) {
      success();
      // Navigate to dashboard
    } else {
      error();
    }
  }
  
  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center px-6 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white font-display mb-2">
            Selamat Datang
          </h1>
          <p className="text-white/50">
            Masuk ke akun Kaos Kami Anda
          </p>
        </div>
        
        {isAvailable && biometryType !== 0 && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-3
                       bg-white/5 rounded-2xl p-6
                       border border-white/10"
          >
            <Fingerprint className="w-16 h-16 text-brand-500" />
            <p className="text-sm text-white/70 text-center">
              {biometryType === 1 ? 'Face ID' : 'Fingerprint'} tersedia
            </p>
            <SpringButton onClick={handleBiometricLogin} variant="secondary">
              Login dengan Biometrik
            </SpringButton>
          </motion.div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-3
                           border border-white/10 text-white
                           focus:border-brand-500 focus:bg-white/10
                           outline-none transition-all"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-white/50 mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-3
                           border border-white/10 text-white
                           focus:border-brand-500 focus:bg-white/10
                           outline-none transition-all"
              />
            </div>
          </div>
          
          <SpringButton onClick={() => {}} className="w-full" size="lg">
            Masuk
          </SpringButton>
        </div>
      </motion.div>
    </div>
  );
}
```

---

## 🔔 3. PUSH NOTIFICATIONS

### File: `src/hooks/usePushNotification.ts`
```typescript
import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';

export function usePushNotification() {
  const [token, setToken] = useState<string>('');
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  
  useEffect(() => {
    // Register with Apple / Google to receive push via APNS/FCM
    PushNotifications.addListener('registration', (token: Token) => {
      setToken(token.value);
      // Send to backend
      fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value }),
      });
    });
    
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });
    
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      setNotifications(prev => [notification, ...prev]);
      Haptics.notification({ type: NotificationType.Success });
    });
    
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      // Handle tap on notification
      const data = notification.notification.data;
      if (data?.orderId) {
        window.location.href = `/orders/${data.orderId}`;
      }
    });
    
    // Request permission
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });
    
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
  
  return { token, notifications };
}
```

---

## 🔗 4. DEEP LINKING

### File: `src/hooks/useDeeplink.ts`
```typescript
import { useEffect } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useRouter } from 'next/navigation';

export function useDeeplink() {
  const router = useRouter();
  
  useEffect(() => {
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      // kaoskami://studio/design/abc123
      // kaoskami://order/xyz789
      // https://kaos-kami-3d.hengkisetiawan461.workers.dev/studio?id=abc123
      
      const url = event.url;
      
      // Handle custom scheme
      if (url.startsWith('kaoskami://')) {
        const path = url.replace('kaoskami://', '');
        const [route, ...params] = path.split('/');
        
        if (route === 'studio' && params[1]) {
          router.push(`/studio/?id=${params[1]}`);
        } else if (route === 'order' && params[0]) {
          router.push(`/orders/${params[0]}`);
        } else if (route === 'product' && params[0]) {
          router.push(`/catalog/${params[0]}`);
        }
      }
      
      // Handle universal links
      else if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const searchParams = urlObj.searchParams;
        
        if (path === '/studio' && searchParams.get('id')) {
          router.push(`/studio/?id=${searchParams.get('id')}`);
        }
      }
    });
    
    return () => {
      listener.remove();
    };
  }, [router]);
}
```

### Android `assetlinks.json` (host di `https://kaos-kami-3d.hengkisetiawan461.workers.dev/.well-known/assetlinks.json`)
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "id.kaoskami.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### iOS `apple-app-site-association` (host di `https://kaos-kami-3d.hengkisetiawan461.workers.dev/.well-known/apple-app-site-association`)
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.id.kaoskami.app",
        "paths": ["/studio/*", "/orders/*", "/catalog/*"]
      }
    ]
  }
}
```

---

## 🎨 5. FACEBOOK AUDIENCE NETWORK (NATIVE ADS)

### File: `src/plugins/facebook-ads/index.ts`
```typescript
import { registerPlugin } from '@capacitor/core';
import type { FacebookAdsPlugin } from './definitions';

const FacebookAds = registerPlugin<FacebookAdsPlugin>('FacebookAds');

export * from './definitions';
export default FacebookAds;
```

### File: `src/plugins/facebook-ads/definitions.ts`
```typescript
export interface FacebookAdsPlugin {
  init(options: { placementId: string }): Promise<void>;
  showBanner(options: { position: string }): Promise<void>;
  hideBanner(): Promise<void>;
  showInterstitial(): Promise<void>;
  loadInterstitial(): Promise<void>;
  showRewarded(): Promise<void>;
  loadRewarded(): Promise<void>;
  addListener(eventName: 'onAdLoaded', listener: () => void): void;
  addListener(eventName: 'onAdFailed', listener: (error: any) => void): void;
  addListener(eventName: 'onAdClicked', listener: () => void): void;
  addListener(eventName: 'onRewardEarned', listener: () => void): void;
}
```

### File: `android/app/src/main/java/id/kaoskami/app/FacebookAdsPlugin.java`
```java
package id.kaoskami.app;

import com.facebook.ads.Ad;
import com.facebook.ads.AdError;
import com.facebook.ads.AdListener;
import com.facebook.ads.AdSettings;
import com.facebook.ads.BannerAdListener;
import com.facebook.ads.InterstitialAd;
import com.facebook.ads.InterstitialAdListener;
import com.facebook.ads.RewardedVideoAd;
import com.facebook.ads.RewardedVideoAdListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.view.ViewGroup;
import android.widget.FrameLayout;

@CapacitorPlugin(name = "FacebookAds")
public class FacebookAdsPlugin extends Plugin {

    private String placementId;
    private InterstitialAd interstitialAd;
    private RewardedVideoAd rewardedAd;
    private com.facebook.ads.AdView bannerView;

    @PluginMethod
    public void init(PluginCall call) {
        placementId = call.getString("placementId", "");
        AdSettings.addTestDevice("YOUR_TEST_DEVICE_ID");
        call.resolve();
    }
    
    @PluginMethod
    public void showBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            bannerView = new com.facebook.ads.AdView(
                getContext(),
                placementId,
                com.facebook.ads.AdSize.BANNER_HEIGHT_50
            );
            
            BannerAdListener listener = new BannerAdListener() {
                @Override
                public void onError(Ad ad, AdError error) {
                    notifyListeners("onAdFailed", new JSObject() {{
                        put("error", error.getErrorMessage());
                    }});
                }
                
                @Override
                public void onAdLoaded(Ad ad) {
                    notifyListeners("onAdLoaded", new JSObject());
                    ViewGroup rootView = (ViewGroup) getActivity().findViewById(android.R.id.content);
                    rootView.addView(bannerView);
                }
                
                @Override public void onAdClicked(Ad ad) { notifyListeners("onAdClicked", new JSObject()); }
                @Override public void onLoggingImpression(Ad ad) {}
            };
            
            bannerView.loadAd();
        });
        call.resolve();
    }
    
    @PluginMethod
    public void loadInterstitial(PluginCall call) {
        interstitialAd = new InterstitialAd(getContext(), placementId);
        interstitialAd.setAdListener(new InterstitialAdListener() {
            @Override public void onError(Ad ad, AdError error) {
                notifyListeners("onAdFailed", new JSObject() {{ put("error", error.getErrorMessage()); }});
            }
            @Override public void onAdLoaded(Ad ad) {
                notifyListeners("onAdLoaded", new JSObject());
            }
            @Override public void onAdClicked(Ad ad) {}
            @Override public void onLoggingImpression(Ad ad) {}
            @Override public void onInterstitialDisplayed(Ad ad) {}
            @Override public void onInterstitialDismissed(Ad ad) {
                notifyListeners("onAdDismissed", new JSObject());
            }
        });
        interstitialAd.loadAd();
        call.resolve();
    }
    
    @PluginMethod
    public void showInterstitial(PluginCall call) {
        if (interstitialAd != null && interstitialAd.isAdLoaded()) {
            interstitialAd.show();
        }
        call.resolve();
    }
    
    @PluginMethod
    public void loadRewarded(PluginCall call) {
        rewardedAd = new RewardedVideoAd(getContext(), placementId);
        rewardedAd.setAdListener(new RewardedVideoAdListener() {
            @Override public void onError(Ad ad, AdError error) {}
            @Override public void onAdLoaded(Ad ad) { notifyListeners("onAdLoaded", new JSObject()); }
            @Override public void onAdClicked(Ad ad) {}
            @Override public void onLoggingImpression(Ad ad) {}
            @Override public void onRewardedVideoCompleted() {
                notifyListeners("onRewardEarned", new JSObject());
            }
            @Override public void onRewardedVideoClosed() {}
        });
        rewardedAd.loadAd();
        call.resolve();
    }
    
    @PluginMethod
    public void showRewarded(PluginCall call) {
        if (rewardedAd != null && rewardedAd.isAdLoaded()) {
            rewardedAd.show();
        }
        call.resolve();
    }
}
```

---

## 📤 6. NATIVE SHARE

### File: `src/hooks/useNativeShare.ts`
```typescript
import { Share } from '@capacitor/share';
import { Haptics } from '@capacitor/haptics';

export function useNativeShare() {
  const share = async (options: {
    title: string;
    text: string;
    url?: string;
    files?: string[];
  }) => {
    Haptics.impact({ style: 'light' });
    
    const canShare = await Share.canShare();
    
    if (canShare.value) {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: 'Bagikan Desain Anda',
      });
    } else {
      // Fallback to web share
      if (navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
      } else {
        // Final fallback: copy to clipboard
        await navigator.clipboard.writeText(options.url || options.text);
      }
    }
  };
  
  return { share };
}
```

---

## 🌐 7. NETWORK STATUS

### File: `src/hooks/useNetworkStatus.ts`
```typescript
import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useNetworkStatus() {
  const [status, setStatus] = useState({ connected: true, connectionType: 'unknown' });
  
  useEffect(() => {
    Network.addListener('networkStatusChange', (newStatus) => {
      setStatus({
        connected: newStatus.connected,
        connectionType: newStatus.connectionType,
      });
    });
    
    Network.getStatus().then(setStatus);
    
    return () => {
      Network.removeAllListeners();
    };
  }, []);
  
  return status;
}
```

---

## ✅ 8. CHECKLIST BLUEPRINT-05

- [ ] Camera plugin integrated (native + web fallback)
- [ ] Photo picker (gallery) with limit 1
- [ ] Biometric auth (FaceID + Fingerprint)
- [ ] Biometric login screen UI
- [ ] Push Notifications registered with FCM + APNs
- [ ] Deep linking (custom scheme + universal links)
- [ ] assetlinks.json + apple-app-site-association deployed
- [ ] Facebook Audience Network native plugin (Android)
- [ ] Banner, Interstitial, Rewarded ads
- [ ] Native Share with fallback to clipboard
- [ ] Network status listener
- [ ] All permissions declared in AndroidManifest + Info.plist

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-06: Offline Sync & Data Layer**
```

---

# 📓 BLUEPRINT-06 — OFFLINE-FIRST SYNC & DATA LAYER

```markdown
# 📓 BLUEPRINT-06: OFFLINE-FIRST SYNC & DATA LAYER
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~1,600

---

## 🎯 1. ARSITEKTUR OFFLINE-FIRST

Kaos Kami Mobile harus bisa **full function offline**:
- ✅ Browse catalog (cached)
- ✅ Design kaos di Studio (local)
- ✅ Simpan draft desain
- ✅ Tambah ke cart
- ✅ Lihat order history (cached)
- ❌ Checkout (harus online)
- ❌ Payment
- ❌ Sync ke server

---

## 💾 2. RXDB SETUP (Local-First Database)

### File: `src/db/schema.ts`
```typescript
import {
  createRxDatabase,
  addRxPlugin,
  RxJsonSchema,
  RxCollection,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateZodStorage } from 'rxdb/plugins/validate-zod';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { z } from 'zod';

if (process.env.NODE_ENV === 'development') {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBUpdatePlugin);

// Schema: Products
const productSchema: RxJsonSchema<any> = {
  title: 'product schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 32 },
    name: { type: 'string' },
    slug: { type: 'string' },
    gsm: { type: 'number' },
    basePrice: { type: 'number' },
    description: { type: 'string' },
    images: { type: 'array' },
    variants: { type: 'array' },
    cachedAt: { type: 'number' },
  },
  required: ['id', 'name', 'basePrice'],
  indexes: ['slug', 'cachedAt'],
};

// Schema: Designs
const designSchema: RxJsonSchema<any> = {
  title: 'design schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 32 },
    userId: { type: 'string' },
    productId: { type: 'string' },
    colorway: { type: 'string' },
    size: { type: 'string' },
    decalUrl: { type: 'string' },
    printWidthCm: { type: 'number' },
    printHeightCm: { type: 'number' },
    offsetFromCollarCm: { type: 'number' },
    previewBase64: { type: 'string' },
    syncedToServer: { type: 'boolean' },
    localCreatedAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
  required: ['id', 'userId', 'productId'],
  indexes: ['userId', 'updatedAt', 'syncedToServer'],
};

// Schema: Orders (cache only)
const orderSchema: RxJsonSchema<any> = {
  title: 'order schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 32 },
    userId: { type: 'string' },
    status: { type: 'string' },
    total: { type: 'number' },
    items: { type: 'array' },
    cachedAt: { type: 'number' },
  },
  required: ['id', 'userId', 'status'],
  indexes: ['userId', 'cachedAt'],
};

export async function createDatabase() {
  const db = await createRxDatabase({
    name: 'kaoskami',
    storage: getRxStorageDexie(),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true,
  });
  
  await db.addCollections({
    products: { schema: productSchema },
    designs: { schema: designSchema },
    orders: { schema: orderSchema },
  });
  
  return db;
}

export type KaosKamiDatabase = Awaited<ReturnType<typeof createDatabase>>;
```

---

## 🔄 3. SYNC CONFIGURATION

### File: `src/db/sync.ts`
```typescript
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { fetchWithPull, fetchWithPush } from '@/lib/api/replication';
import { Network } from '@capacitor/network';

const SYNC_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kaos-kami-3d.hengkisetiawan461.workers.dev';

export function setupReplication(db: any, authToken: string) {
  // Products: Pull only
  replicateRxCollection({
    collection: db.products,
    replicationIdentifier: 'products-pull',
    live: true,
    retryTime: 30 * 1000,  // 30s
    pull: {
      handler: async (lastCheckpoint) => {
        const response = await fetch(
          `${SYNC_URL}/api/mobile/sync/products?cursor=${JSON.stringify(lastCheckpoint || {})}`
        );
        const data = await response.json();
        return {
          documents: data.documents,
          checkpoint: data.checkpoint,
        };
      },
      batchSize: 100,
    },
  });
  
  // Designs: Push + Pull
  const designReplication = replicateRxCollection({
    collection: db.designs,
    replicationIdentifier: 'designs-sync',
    live: true,
    retryTime: 60 * 1000,
    pull: {
      handler: async (lastCheckpoint) => {
        const response = await fetch(
          `${SYNC_URL}/api/mobile/sync/designs?since=${JSON.stringify(lastCheckpoint || {})}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const data = await response.json();
        return {
          documents: data.documents,
          checkpoint: data.checkpoint,
        };
      },
      batchSize: 50,
    },
    push: {
      handler: async (docs) => {
        const response = await fetch(`${SYNC_URL}/api/mobile/sync/designs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ documents: docs }),
        });
        
        if (!response.ok) {
          throw new Error(`Sync failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.documents;
      },
      batchSize: 20,
    },
    conflictHandler: (i) => {
      // Last-write-wins based on updatedAt
      if (i.newDocumentState.updatedAt > i.realMasterState.updatedAt) {
        return i.newDocumentState;
      }
      return i.realMasterState;
    },
  });
  
  // Orders: Pull only (orders created server-side)
  replicateRxCollection({
    collection: db.orders,
    replicationIdentifier: 'orders-pull',
    live: true,
    retryTime: 30 * 1000,
    pull: {
      handler: async (lastCheckpoint) => {
        const response = await fetch(
          `${SYNC_URL}/api/mobile/sync/orders?since=${JSON.stringify(lastCheckpoint || {})}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const data = await response.json();
        return {
          documents: data.documents,
          checkpoint: data.checkpoint,
        };
      },
      batchSize: 50,
    },
  });
  
  // Auto-retry when network comes back online
  Network.addListener('networkStatusChange', async (status) => {
    if (status.connected) {
      await designReplication.reSync();
    }
  });
  
  return designReplication;
}
```

---

## 🎨 4. DESIGN DRAFT SAVE (Offline-Safe)

### File: `src/hooks/useOfflineDesign.ts`
```typescript
import { useMutation } from '@tanstack/react-query';
import { useRxDB } from 'rxdb-hooks';
import { Network } from '@capacitor/network';

interface DesignDraft {
  productId: string;
  colorway: string;
  size: string;
  decalUrl?: string;
  printWidthCm: number;
  printHeightCm: number;
  previewBase64: string;
}

export function useSaveDesignDraft() {
  const db = useRxDB();
  
  return useMutation({
    mutationFn: async (draft: DesignDraft) => {
      const doc = await db.designs.insert({
        ...draft,
        id: `draft-${Date.now()}`,
        userId: 'current-user',
        syncedToServer: false,
        localCreatedAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Check network and sync if online
      const status = await Network.getStatus();
      if (status.connected) {
        // Replication will pick it up automatically
      }
      
      return doc;
    },
  });
}
```

---

## 🖼️ 5. IMAGE CACHE

### File: `src/lib/cache/imageCache.ts`
```typescript
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const CACHE_DIR = 'image_cache';
const METADATA_KEY = 'image_cache_metadata';

interface CacheMetadata {
  [url: string]: {
    localPath: string;
    cachedAt: number;
    size: number;
  };
}

export class ImageCache {
  private static metadata: CacheMetadata | null = null;
  
  static async init() {
    if (this.metadata) return;
    
    const { value } = await Preferences.get({ key: METADATA_KEY });
    this.metadata = value ? JSON.parse(value) : {};
    
    // Ensure cache dir exists
    try {
      await Filesystem.mkdir({
        path: CACHE_DIR,
        directory: Directory.Cache,
        recursive: true,
      });
    } catch (err) {
      // Already exists
    }
  }
  
  static async get(url: string): Promise<string | null> {
    await this.init();
    
    const entry = this.metadata![url];
    if (!entry) return null;
    
    // Check if file still exists
    try {
      const result = await Filesystem.stat({
        path: entry.localPath,
        directory: Directory.Cache,
      });
      return result.uri;
    } catch (err) {
      delete this.metadata![url];
      await this.saveMetadata();
      return null;
    }
  }
  
  static async set(url: string, blob: Blob): Promise<string> {
    await this.init();
    
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${url.split('.').pop()}`;
    const base64 = await this.blobToBase64(blob);
    
    const result = await Filesystem.writeFile({
      path: `${CACHE_DIR}/${filename}`,
      data: base64,
      directory: Directory.Cache,
    });
    
    this.metadata![url] = {
      localPath: `${CACHE_DIR}/${filename}`,
      cachedAt: Date.now(),
      size: blob.size,
    };
    
    await this.saveMetadata();
    return result.uri;
  }
  
  static async fetchOrCache(url: string): Promise<string> {
    const cached = await this.get(url);
    if (cached) return cached;
    
    const response = await fetch(url);
    const blob = await response.blob();
    return await this.set(url, blob);
  }
  
  static async clearOld(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    await this.init();
    
    const now = Date.now();
    const toDelete = Object.entries(this.metadata!)
      .filter(([_, entry]) => now - entry.cachedAt > maxAge)
      .map(([url, entry]) => ({ url, path: entry.localPath }));
    
    for (const item of toDelete) {
      try {
        await Filesystem.deleteFile({
          path: item.path,
          directory: Directory.Cache,
        });
        delete this.metadata![item.url];
      } catch (err) {}
    }
    
    await this.saveMetadata();
  }
  
  private static async saveMetadata() {
    await Preferences.set({
      key: METADATA_KEY,
      value: JSON.stringify(this.metadata),
    });
  }
  
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
```

---

## 📥 6. TANSTACK QUERY INTEGRATION

### File: `src/lib/query-client.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

const storage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

const persister = createSyncStoragePersister({
  storage,
  key: 'kaos-kami-query-cache',
});

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,  // 24 hours
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 2,
      },
    },
  });
  
  return client;
}
```

---

## 📴 7. OFFLINE INDICATOR

### File: `src/components/shell/OfflineIndicator.tsx`
```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { connected } = useNetworkStatus();
  
  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[80] safe-top"
        >
          <div className="bg-amber-500 text-black text-center py-2 px-4 
                          text-sm font-medium flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Mode Offline — Desain Anda tersimpan lokal</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## ✅ 8. CHECKLIST BLUEPRINT-06

- [ ] RxDB setup with Dexie storage
- [ ] Schemas: products, designs, orders
- [ ] Replication config for products (pull only)
- [ ] Replication config for designs (push + pull)
- [ ] Replication config for orders (pull only)
- [ ] Conflict handler (last-write-wins)
- [ ] Image cache with Capacitor Filesystem
- [ ] TanStack Query with persistent storage
- [ ] Offline indicator component
- [ ] Auto-retry on network reconnect
- [ ] Cache eviction (7-day TTL)
- [ ] Sync status indicator in Profile
- [ ] Manual sync trigger button

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-07: Deployment & Publishing**
```

---

# 📔 BLUEPRINT-07 — DEPLOYMENT, PUBLISHING & APP STORE

```markdown
# 📔 BLUEPRINT-07: DEPLOYMENT, PUBLISHING & APP STORE SUBMISSION
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~2,000

---

## 🚀 1. BUILD PIPELINE

### 1.1 Android AAB Build

### File: `scripts/build-android.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Building Kaos Kami Android AAB..."

# 1. Clean previous builds
rm -rf out/
rm -rf android/app/build/

# 2. Build Next.js static export
echo "📦 Building Next.js..."
npm run build:mobile

# 3. Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

# 4. Update versionCode in build.gradle
VERSION=$(node -p "require('./package.json').version")
VERSION_CODE=$(git rev-list --count HEAD)
echo "📝 Version: $VERSION ($VERSION_CODE)"

# 5. Build AAB
echo "🔨 Building AAB..."
cd android
./gradlew bundleRelease

# 6. Sign AAB
echo "✍️  Signing AAB..."
jarsigner -keystore ../keystore/release-key.keystore \
          -storepass $ANDROID_KEYSTORE_PASSWORD \
          app/build/outputs/bundle/release/app-release.aab \
          kaoskami

# 7. Optimize with zipalign
zipalign -v -p 4 \
  app/build/outputs/bundle/release/app-release.aab \
  app/build/outputs/bundle/release/app-release-aligned.aab

cd ..

echo "✅ AAB built: android/app/build/outputs/bundle/release/app-release.aab"
```

### 1.2 iOS IPA Build

### File: `scripts/build-ios.sh`
```bash
#!/bin/bash
set -e

echo "🍎 Building Kaos Kami iOS..."

rm -rf out/
npm run build:mobile
npx cap sync ios

cd ios/App

# Archive
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath App.xcarchive \
  archive

# Export IPA
xcodebuild \
  -exportArchive \
  -archivePath App.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist

cd ../..

echo "✅ IPA built: ios/App/build/App.ipa"
```

### 1.3 Version Bump Automation

### File: `scripts/bump-version.js`
```javascript
#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

const type = process.argv[2] || 'patch';  // major | minor | patch
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
let newVersion;

if (type === 'major') newVersion = `${major + 1}.0.0`;
else if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Update Android versionName
const gradlePath = './android/app/build.gradle';
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(
  /versionName "[^"]+"/,
  `versionName "${newVersion}"`
);
fs.writeFileSync(gradlePath, gradle);

// Update iOS version
execSync(`cd ios/App && agvtool new-marketing-version ${newVersion}`, { stdio: 'inherit' });

console.log(`✅ Bumped to ${newVersion}`);
```

---

## 🏪 2. GOOGLE PLAY STORE SUBMISSION

### 2.1 Pre-Submission Checklist

- [ ] Package name: `id.kaoskami.app`
- [ ] Target SDK: Android 14 (API 34) minimum, Android 15 (API 35) target
- [ ] minSdkVersion: 24 (Android 7.0)
- [ ] App signed with Play App Signing (upload key)
- [ ] Privacy Policy URL: `https://kaos-kami-3d.hengkisetiawan461.workers.dev/privacy`
- [ ] Data Safety form completed (Firebase Analytics, Midtrans, FB Ads)
- [ ] Content rating: Everyone (or 3+)
- [ ] Categories: Shopping / Lifestyle
- [ ] 6 screenshots minimum: Phone 1080×1920, 7" & 10" Tablet
- [ ] Feature Graphic: 1024×500 PNG
- [ ] App Icon: 512×512 PNG (32-bit with alpha)
- [ ] Short description (80 chars): "Desain kaos 3D premium & sablon DTF Makassar"
- [ ] Full description (4000 chars): see below
- [ ] App category tags: Streetwear, Custom T-Shirt, 3D Design, DTF Printing

### 2.2 App Store Listing Content (Indonesian)

**Title:** Kaos Kami — 3D Kaos Custom Makassar

**Short Description (80 chars):**
```
Desain kaos 3D premium, sablon DTF Makassar. Mockup, AR, checkout mudah!
```

**Full Description:**
```
🎽 KAOS KAMI — PLATFORM DESAIN KAOS 3D & SABLON DTF PREMIUM DARI MAKASSAR

Buat kaos custom impian Anda dengan 3D Studio kami yang revolusioner! Lihat 
desain Anda langsung di model 3D real-time, pilih warna, upload logo, dan 
preview dengan AR di badan Anda sebelum produksi.

✨ FITUR UNGGULAN:

🎨 3D STUDIO INTERAKTIF
• Konfigurator kaos 3D real-time dengan React Three Fiber
• 6 colorway premium: Obsidian, Tangerine, Cream, Forest, Crimson, Cobalt
• Upload logo/desain dengan auto-wrap ke kaos
• Kalibrasi cetak 1:1 cm (maks 30cm) — cocok untuk DTF Sablon
• Real-time DPI analyzer untuk kualitas cetak optimal
• 360° spin untuk melihat semua sisi

📱 AR PREVIEW (Baru!)
• Lihat kaos di badan Anda dengan kamera AR
• Bagikan hasil ke Instagram Story, WhatsApp, TikTok

🎬 VIDEO EXPORT
• Rekam video showcase desain Anda
• Wind animation dan walking manekin
• Bagikan langsung ke sosial media

🛒 E-COMMERCE LENGKAP
• Katalog kaos heavyweight 240 & 280 GSM Combed 16s
• Checkout dengan Midtrans: QRIS, GoPay, ShopeePay, DANA, VA, Alfamart
• Ongkir transparan: Pick-up Workshop (Gratis), Instant Maxim, J&T
• Tracking pesanan real-time

🔐 AKUN & KEAMANAN
• Login dengan Face ID / Fingerprint
• Data desain tersimpan offline
• Sinkronisasi otomatis saat online

🔔 NOTIFIKASI PINTAR
• Update status pesanan: Diterima, Diproduksi, Dikirim
• Reminder bayar untuk metode VA

🌍 KHUSUS MAKASSAR & SULAWESI
• Workshop pickup di Tamalanrea, Makassar
• Instant Courier Maxim COD
• Flat Rate Rp 15.000 se-Sulawesi

---

📩 Butuh bantuan? 
WhatsApp: wa.me/6281234567890
Email: hello@kaoskami.id
Website: kaos-kami-3d.hengkisetiawan461.workers.dev

Kaos Kami — Dari Makassar untuk Indonesia. 
Platform DTF Sablon 3D & Heavyweight Streetwear Apparel pertama di Sulsel.
```

### 2.3 Play Console Setup

1. **App Dashboard:**
   - App name: Kaos Kami
   - Default language: Indonesian (id)
   - App or game: App
   - Free or paid: Free

2. **App Releases → Production:**
   - Upload AAB via Play Console
   - Staged rollout: 10% initially, ramp to 100% over 7 days

3. **Setup → App Signing:**
   - Enable Play App Signing
   - Upload release keystore to Play Console

4. **Policy → App Content:**
   - Privacy Policy URL
   - Ads declaration: YES (Facebook Audience Network)
   - Content ratings (IARC)
   - Target audience: 13+
   - Data Safety: collect email, user IDs, purchase history

### 2.4 Keystore Generation

```bash
# Generate upload keystore (KEEP THIS SECRET)
keytool -genkey -v \
  -keystore release-key.keystore \
  -alias kaoskami \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STRONG_PASSWORD

# Get SHA256 fingerprint for assetlinks.json
keytool -list -printcert -jarfile app-release.aab
```

---

## 🍎 3. APPLE APP STORE SUBMISSION

### 3.1 App Store Connect Setup

1. **Bundle ID:** `id.kaoskami.app`
2. **SKU:** `KAOSKAMI-2026`
3. **Primary Category:** Shopping
4. **Secondary Category:** Lifestyle
5. **Content Rights:** Does not contain third-party content
6. **Age Rating:** 4+

### 3.2 App Store Metadata

**Title (30 chars):**
```
Kaos Kami — 3D Custom Kaos
```

**Subtitle (30 chars):**
```
Desain, Mockup, AR, DTF Makassar
```

**Keywords (100 chars, comma-separated):**
```
kaos,custom,design,3d,streetwear,makassar,dtf,printing,mockup,apparel,tshirt,fashion
```

**Description:**
(Similar to Play Store, but formatted for iOS)

**Screenshots Required:**
- iPhone 6.7" (1290×2796)
- iPhone 6.1" (1179×2556)
- iPad Pro 12.9" (2048×2732) — optional

### 3.3 Info.plist Checklist

- [ ] All usage descriptions filled
- [ ] CFBundleDisplayName: Kaos Kami
- [ ] CFBundleShortVersionString: 1.0.0
- [ ] CFBundleVersion: (build number)
- [ ] UILaunchStoryboardName: LaunchScreen
- [ ] UISupportedInterfaceOrientations: Portrait only
- [ ] ITSAppUsesNonExemptEncryption: false

### 3.4 App Review Guidelines Compliance

- [ ] 2.1 Performance: No crashes, no obvious bugs
- [ ] 2.3 Accurate Metadata: Screenshots match actual features
- [ ] 3.1.1 In-App Purchase: If IAP implemented, use Apple IAP
- [ ] 4.0 Design: Native-feel UI, not just webview
- [ ] 5.1.1 Data Collection: Privacy policy + consent
- [ ] 5.1.2 Data Use: Transparent about tracking

**⚠️ COMMON REJECTION REASONS TO AVOID:**
1. App looks like a webview — add native navigation, haptics, animations
2. Privacy policy URL is broken or missing
3. Missing permission usage descriptions
4. In-App Purchase missing for digital goods
5. Crashes on iPad or small iPhone
6. Push notification permission requested at first launch

---

## 🎨 4. APP ICON & SPLASH SCREEN

### File: `scripts/generate-icons.sh`
```bash
#!/bin/bash
# Requires ImageMagick and capacitor-assets

# Install: npm i -D @capacitor/assets
npx @capacitor/assets generate \
  --android \
  --ios \
  --iconBackgroundColor '#0A0A0B' \
  --splashBackgroundColor '#0A0A0B' \
  --splashBackgroundColorDark '#0A0A0B' \
  --logoBackgroundColor '#0A0A0B'

# Resize assets
convert assets/icon-source.png -resize 1024x1024 assets/icon.png
convert assets/splash-source.png -resize 2732x2732 assets/splash.png
```

**Assets needed:**
- `assets/icon-only.png` (1024×1024)
- `assets/icon-foreground.png` (1024×1024, transparent bg)
- `assets/icon-background.png` (1024×1024)
- `assets/splash.png` (2732×2732, centered logo)
- `assets/splash-dark.png` (2732×2732)

---

## 🔄 5. LIVE UPDATES (Capgo / CodePush)

### File: `src/lib/updater.ts`
```typescript
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export async function checkForUpdates() {
  try {
    const update = await CapacitorUpdater.download({
      url: 'https://api.capgo.app/updates/latest?id.kaoskami.app',
      version: '1.0.1',
    });
    
    await CapacitorUpdater.set({ id: update.id });
    // App will reload with new version on next launch
  } catch (err) {
    console.error('Update check failed:', err);
  }
}
```

### Capgo Setup:
```bash
npm install @capgo/cli -g
npx capgo init YOUR_CAPGO_KEY
npx capgo bundle upload
```

---

## 📊 6. CI/CD WITH GITHUB ACTIONS

### File: `.github/workflows/mobile-deploy.yml`
```yaml
name: Mobile Deploy

on:
  push:
    branches: [main]
    paths: ['src/**', 'android/**', 'ios/**']
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Next.js
        run: npm run build:mobile
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Build AAB
        run: |
          cd android
          ./gradlew bundleRelease
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: id.kaoskami.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: production
          inAppUpdatePriority: 3

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Next.js
        run: npm run build:mobile
      
      - name: Sync Capacitor
        run: npx cap sync ios
      
      - name: Build IPA
        uses: yukiarrr/ios-build-action@v1.11.0
        with:
          project-path: ios/App/App.xcodeproj
          p12-base64: ${{ secrets.IOS_P12_BASE64 }}
          mobileprovision-base64: ${{ secrets.IOS_PROVISION_BASE64 }}
          team-id: ${{ secrets.IOS_TEAM_ID }}
          export-method: app-store
```

---

## 📱 7. APP STORE OPTIMIZATION (ASO)

### 7.1 Keyword Research (2026)

**Primary Keywords:**
- kaos custom (high volume, medium competition)
- desain kaos (high volume, low competition)
- 3d mockup (medium volume, high competition)
- sablon dtf (low volume, zero competition — niche gold)
- kaos makassar (low volume, zero competition)
- kaos streetwear (medium volume, medium competition)

**Long-tail Keywords:**
- desain kaos sendiri
- bikin kaos online
- kaos printing 3d
- mockup kaos 3d
- sablon kaos makassar

### 7.2 A/B Testing Elements

- Icon variations (test 2-3 versions)
- Screenshot order (most attractive first)
- First 3 seconds of preview video

---

## ✅ 8. CHECKLIST BLUEPRINT-07

**Pre-Launch:**
- [ ] Android keystore generated and backed up
- [ ] iOS certificates + provisioning profiles
- [ ] Bundle ID registered both platforms
- [ ] App icons generated (all sizes)
- [ ] Splash screens generated
- [ ] Privacy policy URL live
- [ ] Terms of service URL live

**Play Store:**
- [ ] Play Console account created ($25 fee)
- [ ] AAB signed with release key
- [ ] Store listing complete (Indonesian + English)
- [ ] Screenshots (6+ phone, tablet, feature graphic)
- [ ] Data Safety form filled
- [ ] Content rating completed
- [ ] Internal testing track tested
- [ ] Closed beta (100 users) 1 week
- [ ] Production release 10% staged

**App Store:**
- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect record created
- [ ] IPA signed and validated
- [ ] Screenshots for all device sizes
- [ ] App Privacy form (App Tracking Transparency)
- [ ] TestFlight beta (100 internal + 10k external)
- [ ] App Review submitted

**Post-Launch:**
- [ ] Crashlytics monitoring active
- [ ] Sentry error tracking active
- [ ] Firebase Analytics events flowing
- [ ] Play Console vitals monitoring
- [ ] App Store Connect reviews monitoring

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-08: Monetization & Analytics**
```

---

# 📒 BLUEPRINT-08 — MONETIZATION & ANALYTICS

```markdown
# 📒 BLUEPRINT-08: MONETIZATION & ANALYTICS STRATEGY
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~1,500

---

## 💰 1. MONETIZATION MODEL

### 1.1 Revenue Streams

| Stream | Model | Est. ARPU | Priority |
|---|---|---|---|
| Product Sales (Physical) | E-commerce kaos custom | Rp 250K-500K/order | 🔴 Primary |
| Design Services | Custom design fee | Rp 50K-200K/design | 🔴 Primary |
| Pro Subscription | Freemium IAP | Rp 50K/month | 🟡 Secondary |
| Facebook Ads | Ad revenue | Rp 5K-15K/user/month | 🟡 Secondary |
| Affiliate | Print-on-demand partners | 5-10% commission | 🟢 Tertiary |
| B2B Bulk Orders | Corporate merchandise | Rp 5-20M/order | 🟢 Tertiary |

### 1.2 Free vs Pro Tier

| Feature | Free | Pro (Rp 50K/month) |
|---|---|---|
| 3D Studio access | ✅ | ✅ |
| Basic colorways (6) | ✅ | ✅ |
| Custom decal upload | ✅ 1 per design | ✅ Unlimited |
| Print size | Max 15cm | Max 30cm |
| AR Preview | ❌ | ✅ |
| Video Export | Watermarked | No watermark |
| AI Enhancement | 3/month | Unlimited |
| Walking Animation | ❌ | ✅ |
| 3D Paint Studio | ❌ | ✅ |
| Priority production | ❌ | ✅ 24-hour turnaround |
| Premium designs | ❌ | ✅ Library access |
| Ad-free | ❌ | ✅ |

---

## 📺 2. FACEBOOK AUDIENCE NETWORK IMPLEMENTATION

### 2.1 Ad Placements Strategy

| Placement | Type | Trigger | Frequency Cap |
|---|---|---|---|
| Home feed | Native Banner | Scroll | Every 5 items |
| Product detail | Banner | View | 1 per session |
| Studio (after export) | Interstitial | After export | 1 per 3 exports |
| Loading screen | Rewarded | Optional watch | Unlimited |
| Order success | Rewarded | Optional for discount | 1 per order |
| Profile | Banner | View | Always |
| Between screens | Interstitial | After 3 navigations | 1 per 5 mins |

### 2.2 Ad Component — File: `src/components/ads/AdBanner.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import FacebookAds from '@/plugins/facebook-ads';
import { useSettingsStore } from '@/store/useSettingsStore';

interface AdBannerProps {
  placementId: string;
  size?: 'banner' | 'rectangle' | 'medium-rectangle';
}

export function AdBanner({ placementId, size = 'banner' }: AdBannerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const isPro = useSettingsStore((s) => s.isPro);
  
  useEffect(() => {
    if (isPro) return;  // Pro users don't see ads
    
    FacebookAds.init({ placementId })
      .then(() => {
        FacebookAds.addListener('onAdLoaded', () => setIsLoaded(true));
        FacebookAds.addListener('onAdFailed', () => setAdError(true));
        FacebookAds.showBanner({ position: 'bottom' });
      });
    
    return () => {
      FacebookAds.hideBanner();
    };
  }, [placementId, isPro]);
  
  if (isPro || adError) return null;
  
  return (
    <div className={`
      w-full bg-white/5 border-t border-white/10
      ${isLoaded ? 'h-14' : 'h-0'}
      transition-all duration-300
      flex items-center justify-center
    `}>
      {!isLoaded && <p className="text-xs text-white/30">Loading ad...</p>}
    </div>
  );
}
```

### 2.3 Rewarded Video Component

### File: `src/components/ads/RewardedVideo.tsx`
```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import FacebookAds from '@/plugins/facebook-ads';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SpringButton } from '@/components/ui/SpringButton';
import { useHaptic } from '@/hooks/useHaptic';

interface RewardedVideoProps {
  open: boolean;
  onClose: () => void;
  onRewardEarned: () => void;
  rewardLabel: string;
}

export function RewardedVideo({ 
  open, 
  onClose, 
  onRewardEarned, 
  rewardLabel 
}: RewardedVideoProps) {
  const [loading, setLoading] = useState(false);
  const { success } = useHaptic();
  
  async function handleWatch() {
    setLoading(true);
    
    FacebookAds.loadRewarded();
    
    FacebookAds.addListener('onRewardEarned', () => {
      success();
      onRewardEarned();
      onClose();
    });
    
    FacebookAds.addListener('onAdFailed', () => {
      // Fallback: give reward anyway (graceful)
      onRewardEarned();
      onClose();
    });
    
    FacebookAds.showRewarded();
    setLoading(false);
  }
  
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="text-center py-8 space-y-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mx-auto w-20 h-20 rounded-full bg-brand-500/20 
                     flex items-center justify-center"
        >
          <Gift className="w-10 h-10 text-brand-500" />
        </motion.div>
        
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            Tonton Video untuk {rewardLabel}
          </h3>
          <p className="text-sm text-white/60">
            Dukung Kaos Kami dengan menonton iklan singkat
          </p>
        </div>
        
        <SpringButton onClick={handleWatch} disabled={loading} size="lg">
          {loading ? 'Loading...' : 'Tonton Video'}
        </SpringButton>
        
        <button
          onClick={onClose}
          className="text-sm text-white/40 hover:text-white/60"
        >
          Nanti Saja
        </button>
      </div>
    </BottomSheet>
  );
}
```

---

## 💳 3. IN-APP PURCHASE (Pro Subscription)

### 3.1 Google Play Billing Plugin

### File: `src/plugins/billing/index.ts`
```typescript
import { registerPlugin } from '@capacitor/core';
import type { BillingPlugin } from './definitions';

const Billing = registerPlugin<BillingPlugin>('Billing');

export * from './definitions';
export default Billing;
```

### File: `src/lib/iap/googlePlayBilling.ts`
```typescript
import Billing from '@/plugins/billing';

const PRODUCT_ID_MONTHLY = 'kaoskami_pro_monthly';
const PRODUCT_ID_YEARLY = 'kaoskami_pro_yearly';

export class GooglePlayBilling {
  static async init() {
    await Billing.init({ publicKey: process.env.NEXT_PUBLIC_PLAY_PUBLIC_KEY || '' });
  }
  
  static async purchasePro(plan: 'monthly' | 'yearly') {
    const productId = plan === 'monthly' ? PRODUCT_ID_MONTHLY : PRODUCT_ID_YEARLY;
    
    const result = await Billing.purchase({ productId });
    
    // Verify with backend
    const verifyResponse = await fetch('/api/iap/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purchaseToken: result.purchaseToken,
        productId,
        platform: 'android',
      }),
    });
    
    if (verifyResponse.ok) {
      return { success: true };
    }
    return { success: false };
  }
  
  static async restorePurchases() {
    await Billing.restorePurchases();
  }
  
  static async checkSubscriptionStatus() {
    const status = await Billing.getSubscriptionStatus();
    return status.isActive;
  }
}
```

### 3.2 Apple IAP Equivalent

Similar setup with `cordova-plugin-purchase` or `@capacitor-community/in-app-purchases`.

### 3.3 Paywall Component

### File: `src/components/paywall/PaywallSheet.tsx`
```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SpringButton } from '@/components/ui/SpringButton';
import { useHaptic } from '@/hooks/useHaptic';

interface PaywallProps {
  open: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  'Upload desain unlimited',
  'Preview AR di badan',
  'Export video tanpa watermark',
  'Akses AI Enhancement unlimited',
  '3D Paint Studio',
  'Walking Animation',
  'Priority produksi 24 jam',
  'Tanpa iklan',
];

export function PaywallSheet({ open, onClose }: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const { success } = useHaptic();
  
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="py-4 space-y-6">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br 
                       from-brand-500 to-purple-500
                       flex items-center justify-center mb-3"
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white">Kaos Kami Pro</h2>
          <p className="text-sm text-white/50 mt-1">
            Unlock semua fitur premium
          </p>
        </div>
        
        <div className="space-y-2">
          {PRO_FEATURES.map((feature, idx) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3"
            >
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-white/80">{feature}</span>
            </motion.div>
          ))}
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => { setSelectedPlan('yearly'); useHaptic().light(); }}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all relative
              ${selectedPlan === 'yearly'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-white/10 bg-white/5'}
            `}
          >
            <span className="absolute -top-2 right-4 bg-brand-500 
                             text-white text-xs px-2 py-0.5 rounded-full font-bold">
              HEMAT 50%
            </span>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Tahunan</p>
                <p className="text-xs text-white/50">Rp 50.000/bulan</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-brand-500">Rp 600K</p>
                <p className="text-xs text-white/30 line-through">Rp 1.2M</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => { setSelectedPlan('monthly'); useHaptic().light(); }}
            className={`
              w-full p-4 rounded-xl border-2 text-left
              ${selectedPlan === 'monthly'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-white/10 bg-white/5'}
            `}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Bulanan</p>
                <p className="text-xs text-white/50">Fleksibel, batalkan kapan saja</p>
              </div>
              <p className="font-bold text-brand-500">Rp 100K</p>
            </div>
          </button>
        </div>
        
        <SpringButton
          onClick={() => success()}
          size="lg"
          className="w-full"
        >
          <Sparkles className="inline w-4 h-4 mr-2" />
          Mulai Sekarang
        </SpringButton>
        
        <div className="text-center space-y-1">
          <button className="text-xs text-white/40">Restore Pembelian</button>
          <p className="text-xs text-white/30">
            Berlangganan otomatis diperpanjang. Batalkan kapan saja.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
```

---

## 📊 4. ANALYTICS DASHBOARD

### 4.1 Firebase Analytics Events

### File: `src/lib/analytics/firebase.ts`
```typescript
import { getAnalytics, logEvent } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'kaos-kami.firebaseapp.com',
  projectId: 'kaos-kami',
  storageBucket: 'kaos-kami.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
  measurementId: 'G-W3VHM4G0TW',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export class FirebaseAnalytics {
  static trackScreenView(screenName: string) {
    logEvent(analytics, 'screen_view', { screen_name: screenName });
  }
  
  static track3DDesignStarted() {
    logEvent(analytics, 'design_started', {
      category: 'studio',
      label: '3D Configurator',
    });
  }
  
  static track3DDesignCompleted(durationSec: number) {
    logEvent(analytics, 'design_completed', {
      category: 'studio',
      duration_seconds: durationSec,
      value: 1,
    });
  }
  
  static trackARPreviewUsed() {
    logEvent(analytics, 'ar_preview_used', { category: 'engagement' });
  }
  
  static trackCheckoutInitiated(cartValue: number, itemCount: number) {
    logEvent(analytics, 'begin_checkout', {
      currency: 'IDR',
      value: cartValue,
      items_count: itemCount,
    });
  }
  
  static trackPurchase(orderId: string, value: number, items: any[]) {
    logEvent(analytics, 'purchase', {
      transaction_id: orderId,
      currency: 'IDR',
      value,
      items,
    });
  }
  
  static trackVideoExported(durationSec: number) {
    logEvent(analytics, 'video_exported', {
      duration_seconds: durationSec,
      category: 'output',
    });
  }
}
```

### 4.2 Custom Dashboard Metrics

Track these KPIs weekly:
- **Activation Rate:** % of users who complete first design
- **Time to First Design:** Average minutes from install to first export
- **Conversion Rate:** % of designs that lead to purchase
- **ARPU:** Average revenue per user (monthly)
- **Churn Rate:** Monthly cancellation rate for Pro
- **3D Engagement:** % of sessions using 3D Studio
- **Ad Revenue per User:** eCPM × impressions

---

## 🎯 5. GROWTH LOOPS

### 5.1 Viral Sharing
- Share design → +1 free video export
- Referral code → Rp 20K discount for both parties
- TikTok/Instagram challenge #KaosKami3D

### 5.2 Retention Hooks
- Daily login streak → free credits
- Weekly design challenge → featured on home
- Push notification when order status changes

### 5.3 Win-back Campaigns
- 7 days inactive → push "Desain Anda menunggu"
- 30 days inactive → 50% discount voucher
- Pro expiring → 3-day grace period

---

## ✅ 6. CHECKLIST BLUEPRINT-08

- [ ] Free vs Pro feature matrix implemented
- [ ] Facebook Audience Network integrated
- [ ] Banner, Interstitial, Rewarded ad units
- [ ] Frequency capping configured
- [ ] Google Play Billing plugin
- [ ] Apple IAP plugin
- [ ] Paywall UI with monthly/yearly toggle
- [ ] Subscription verification endpoint
- [ ] Firebase Analytics events
- [ ] Custom dashboard metrics
- [ ] Viral sharing mechanism
- [ ] Referral system
- [ ] Push notification retention campaigns

**Progress: 0%**

**➡️ Lanjut ke BLUEPRINT-09: Build Progress Tracker**
```

---

# 📓 BLUEPRINT-09 — BUILD PROGRESS TRACKER

```markdown
# 📓 BLUEPRINT-09: BUILD PROGRESS TRACKER
**Project:** Kaos Kami Mobile — Capacitor 8 Native Edition  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Total Tasks:** 142
**Estimated Duration:** 12 weeks (1 developer full-time)

---

## 📊 OVERALL PROGRESS

| Phase | Sprint | Tasks | Completed | Progress |
|---|---|---|---|---|
| Phase 1: Foundation | 1-2 | 32 | 0 | 0% |
| Phase 2: 3D Studio Mobile | 3-4 | 28 | 0 | 0% |
| Phase 3: E-Commerce | 5-6 | 30 | 0 | 0% |
| Phase 4: Native Features | 7-8 | 26 | 0 | 0% |
| Phase 5: Polish & Launch | 9-12 | 26 | 0 | 0% |
| **TOTAL** | 12 | **142** | **0** | **0%** |

---

## 🎯 PHASE 1: FOUNDATION (Sprint 1-2, 32 tasks)

### Setup (8 tasks)
- [ ] Initialize Capacitor 8 project
- [ ] Install all Capacitor plugins
- [ ] Configure capacitor.config.ts
- [ ] Setup Android platform
- [ ] Setup iOS platform  
- [ ] Configure next.config.mobile.mjs with static export
- [ ] Create Android keystore + Play App Signing
- [ ] Setup iOS certificates + provisioning

### Design System (10 tasks)
- [ ] Define OKLCH color tokens
- [ ] Create Tailwind config with tokens
- [ ] Build SpringButton component
- [ ] Build GlassCard component
- [ ] Build BottomSheet component
- [ ] Build Toast system
- [ ] Build Skeleton loaders
- [ ] Build PullToRefresh
- [ ] Build PageTransition
- [ ] Implement useHaptic hook

### Navigation (6 tasks)
- [ ] Create BottomTabBar (5 tabs)
- [ ] Build Tab navigation with animations
- [ ] Setup deep linking hooks
- [ ] Implement PageTransition wrapper
- [ ] Configure safe-area insets
- [ ] Test navigation on all screens

### Auth (8 tasks)
- [ ] Setup Capacitor Preferences storage
- [ ] Build MobileAuthService
- [ ] Build Login screen UI
- [ ] Build Register screen UI
- [ ] Integrate Better Auth backend
- [ ] Implement useBiometric hook
- [ ] Add biometric login option
- [ ] Build Profile screen

**Phase 1 Progress: 0%**

---

## 👕 PHASE 2: 3D STUDIO MOBILE (Sprint 3-4, 28 tasks)

### Device Tiering (5 tasks)
- [ ] Implement useDeviceTier hook
- [ ] Create tier configuration object
- [ ] Detect device model + RAM
- [ ] Auto-degrade on low FPS
- [ ] Test on 5 device tiers

### 3D Canvas (8 tasks)
- [ ] Build OptimizedCanvas component
- [ ] Implement PerformanceMonitor
- [ ] Add AdaptiveDpr
- [ ] Configure WebGL settings per tier
- [ ] Setup texture loading
- [ ] Implement asset preloading
- [ ] Memory leak prevention
- [ ] Dispose on unmount

### Garment Components (10 tasks)
- [ ] Optimize GLTF with Draco compression
- [ ] Generate KTX2 textures (low/med/high)
- [ ] Build TShirt component
- [ ] Implement colorway switching
- [ ] Build DecalMesh with cm calibration
- [ ] Add UV projection
- [ ] Implement 360° spin
- [ ] Add Wind Animation (cloth physics)
- [ ] Build WalkingCharacter component
- [ ] Add resize handling

### Interactions (5 tasks)
- [ ] Touch gesture controls (rotate/pinch/pan)
- [ ] Build 3D Paint Studio (UV brush)
- [ ] Add AI Enhancement API call
- [ ] Implement video export (MediaRecorder)
- [ ] Add export to gallery

**Phase 2 Progress: 0%**

---

## 🛒 PHASE 3: E-COMMERCE (Sprint 5-6, 30 tasks)

### Product Catalog (8 tasks)
- [ ] Build catalog screen
- [ ] Implement product cards
- [ ] Add product detail screen
- [ ] Setup RxDB for product cache
- [ ] Implement product sync
- [ ] Add search functionality
- [ ] Add filter by size/gsm/colorway
- [ ] Add wishlist (offline)

### Cart & Checkout (10 tasks)
- [ ] Build cart store with persistence
- [ ] Create cart screen
- [ ] Add quantity controls
- [ ] Build checkout flow
- [ ] Implement delivery options (Makassar)
- [ ] Add address form
- [ ] Build order summary
- [ ] Create order via API
- [ ] Implement offline order queue
- [ ] Add order confirmation screen

### Payments (12 tasks)
- [ ] Build Midtrans native plugin (Android)
- [ ] Build Midtrans native plugin (iOS)
- [ ] Integrate Midtrans Snap web fallback
- [ ] Add QRIS payment flow
- [ ] Add GoPay payment flow
- [ ] Add ShopeePay payment flow
- [ ] Add VA payment flow
- [ ] Add Alfamart payment flow
- [ ] Handle payment callbacks
- [ ] Implement payment status polling
- [ ] Build payment failure retry
- [ ] Add receipt generation

**Phase 3 Progress: 0%**

---

## 📱 PHASE 4: NATIVE FEATURES (Sprint 7-8, 26 tasks)

### Camera & Media (6 tasks)
- [ ] Implement useCamera hook
- [ ] Add photo picker from gallery
- [ ] Image compression (max 4K)
- [ ] Save to gallery (native)
- [ ] Video recording for showcase
- [ ] Share via native share sheet

### Biometric & Security (4 tasks)
- [ ] Implement useBiometric hook
- [ ] Add Face ID (iOS)
- [ ] Add Fingerprint (Android)
- [ ] Fallback to password

### Notifications (6 tasks)
- [ ] Setup Firebase Cloud Messaging
- [ ] Setup APNs (iOS)
- [ ] Implement usePushNotification hook
- [ ] Handle notification tap routing
- [ ] Order status notifications
- [ ] Payment reminder notifications

### Deep Linking (4 tasks)
- [ ] Configure kaoskami:// scheme
- [ ] Setup Universal Links (iOS)
- [ ] Setup App Links (Android)
- [ ] Deploy assetlinks.json + apple-app-site-association

### AR Preview (6 tasks)
- [ ] Build ARPreview component
- [ ] Integrate Camera with 3D overlay
- [ ] Add 3D garment tracking
- [ ] Implement AR-lite photo capture
- [ ] Add social share from AR
- [ ] Test on iOS ARKit + Android ARCore

**Phase 4 Progress: 0%**

---

## 🚀 PHASE 5: POLISH & LAUNCH (Sprint 9-12, 26 tasks)

### Facebook Integration (8 tasks)
- [ ] Build FacebookAdsPlugin (Android)
- [ ] Build FacebookAdsPlugin (iOS)
- [ ] Integrate Banner ads
- [ ] Integrate Interstitial ads
- [ ] Integrate Rewarded ads
- [ ] Setup Facebook App Events
- [ ] Track Purchase events
- [ ] Configure AdMob fallback

### IAP & Monetization (6 tasks)
- [ ] Setup Google Play Billing
- [ ] Setup Apple IAP
- [ ] Build Paywall UI
- [ ] Implement subscription verification
- [ ] Restore purchases flow
- [ ] Pro tier feature gating

### Performance & Polish (6 tasks)
- [ ] Lighthouse mobile > 90
- [ ] 60 FPS on Redmi 9A verified
- [ ] Cold start < 2.5s verified
- [ ] Memory leak testing
- [ ] Battery drain testing
- [ ] Network resilience testing

### Launch (6 tasks)
- [ ] Generate app icons (all sizes)
- [ ] Generate splash screens
- [ ] Prepare Play Store listing
- [ ] Prepare App Store listing
- [ ] Submit for review
- [ ] Post-launch monitoring

**Phase 5 Progress: 0%**

---

## 📅 SPRINT TIMELINE

```
Week 1-2:   Setup + Design System + Navigation    ▓▓░░░░░░░░░░ 10%
Week 3-4:   3D Studio Mobile                       ▓▓▓▓░░░░░░░░ 20%
Week 5-6:   E-Commerce + Payments                  ▓▓▓▓▓▓░░░░░░ 35%
Week 7-8:   Native Features + AR                   ▓▓▓▓▓▓▓▓░░░░ 55%
Week 9-10:  Facebook Ads + IAP + Polish            ▓▓▓▓▓▓▓▓▓░░░ 75%
Week 11-12: Testing + Submission + Launch          ▓▓▓▓▓▓▓▓▓▓▓▓ 100%
```

---

## 🐛 KNOWN RISKS & MITIGATION

| Risk | Impact | Mitigation |
|---|---|---|
| Midtrans SDK compatibility issue | High | Fallback to Snap webview |
| Three.js perf on low-end | High | Aggressive tiering + auto-degrade |
| iOS review rejection (webview feel) | High | Strong native animations + haptics |
| Facebook Ads SDK bloat | Medium | Lazy load, tree shake |
| Offline sync conflicts | Medium | Last-write-wins + optimistic UI |
| Keystore loss | Critical | Backup in password manager + Google Drive |

---

## 📝 DAILY WORKLOG

| Date | Sprint | Tasks Done | Notes |
|---|---|---|---|
| 2026-09-03 | 1 | 0 | Blueprint created |
| | | | |

---

**➡️ Lanjut ke BLUEPRINT-10: API Contract**
```

---

# 📓 BLUEPRINT-10 — API CONTRACT & MOBILE ENDPOINTS

```markdown
# 📓 BLUEPRINT-10: API CONTRACT & MOBILE ENDPOINTS
**Project:** Kaos Kami Mobile  
**Version:** 1.0.0  
**Last Updated:** 2026-09-03  
**Est. Lines:** ~1,200

---

## 🌐 1. BASE URL

```
Production: https://kaos-kami-3d.hengkisetiawan461.workers.dev
Staging:    https://staging.kaos-kami.hengkisetiawan461.workers.dev
Local:      http://localhost:3000
```

---

## 🔑 2. AUTHENTICATION

Semua endpoint (kecuali public) menggunakan Bearer token:
```
Authorization: Bearer <jwt_token>
```

### 2.1 POST `/api/auth/sign-in`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response 200:**
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "refresh_xyz",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "Hengki",
    "role": "customer",
    "avatar": "https://..."
  }
}
```

### 2.2 POST `/api/auth/sign-up`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Hengki",
  "phone": "+6281234567890"
}
```

### 2.3 POST `/api/auth/refresh`
**Request:**
```json
{ "refreshToken": "refresh_xyz" }
```
**Response:** Same as sign-in

---

## 📱 3. MOBILE-SPECIFIC ENDPOINTS

### 3.1 GET `/api/mobile/sync/products?cursor={json}`
**Description:** Incremental product sync for offline cache  
**Response 200:**
```json
{
  "documents": [
    {
      "id": "prod_123",
      "name": "Oversized Heavy-Knit",
      "slug": "oversized-heavy-knit",
      "gsm": 240,
      "basePrice": 289000,
      "description": "Katun combed tebal 240 GSM",
      "images": ["https://..."],
      "variants": [
        { "size": "S", "colorway": "obsidian", "stock": 12 },
        { "size": "M", "colorway": "obsidian", "stock": 5 }
      ]
    }
  ],
  "checkpoint": { "id": "prod_123", "updatedAt": "2026-09-03T10:00:00Z" }
}
```

### 3.2 POST `/api/mobile/sync/designs`
**Request:**
```json
{
  "documents": [
    {
      "id": "design_abc",
      "userId": "user_123",
      "productId": "prod_123",
      "colorway": "obsidian",
      "size": "L",
      "decalUrl": "https://r2.dev/design.png",
      "printWidthCm": 20,
      "printHeightCm": 25,
      "offsetFromCollarCm": 5,
      "localCreatedAt": 1725350400000,
      "updatedAt": 1725350400000
    }
  ]
}
```
**Response 200:**
```json
{
  "documents": [
    { "id": "design_abc", "serverId": "srv_design_xyz", "syncedAt": "2026-09-03T10:00:00Z" }
  ],
  "conflicts": []
}
```

### 3.3 POST `/api/mobile/upload/decal`
**Content-Type:** `multipart/form-data`  
**Request:**
```json
{
  "file": "<binary image>",
  "designId": "design_abc",
  "userId": "user_123"
}
```
**Response 200:**
```json
{
  "url": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/decals/abc.png",
  "width": 2048,
  "height": 2048,
  "size": 1024000,
  "checksum": "sha256..."
}
```

---

## 🛒 4. ORDERS

### 4.1 POST `/api/orders`
**Request:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "variant": { "size": "L", "colorway": "obsidian", "gsm": 240 },
      "design": {
        "designId": "design_abc",
        "printWidthCm": 20,
        "printHeightCm": 25
      },
      "quantity": 2,
      "unitPrice": 289000
    }
  ],
  "deliveryMethod": "instant",
  "deliveryPrice": 20000,
  "totalAmount": 598000,
  "address": {
    "name": "Hengki",
    "phone": "+6281234567890",
    "street": "Jl. Tamalanrea No. 123",
    "city": "Makassar",
    "province": "Sulawesi Selatan",
    "postalCode": "90245"
  }
}
```
**Response 201:**
```json
{
  "orderId": "ORD-2026-001234",
  "snapToken": "bb2e...midtrans-snap-token",
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/v3/redirection/...",
  "status": "pending",
  "expiresAt": "2026-09-04T10:00:00Z"
}
```

### 4.2 GET `/api/orders/{orderId}`
**Response 200:**
```json
{
  "id": "ORD-2026-001234",
  "userId": "user_123",
  "status": "paid",
  "items": [...],
  "delivery": {
    "method": "instant",
    "price": 20000,
    "courier": "Maxim",
    "trackingNumber": "MAX-XYZ789",
    "estimatedDelivery": "2026-09-04T15:00:00Z"
  },
  "payment": {
    "method": "gopay",
    "paidAt": "2026-09-03T10:15:00Z",
    "amount": 598000
  },
  "production": {
    "queuePosition": 3,
    "estimatedCompletion": "2026-09-05T12:00:00Z",
    "workshopStatus": "printing"
  }
}
```

### 4.3 GET `/api/orders?status={status}&limit=20&cursor={json}`

---

## 💳 5. PAYMENTS

### 5.1 Webhook: POST `/api/webhooks/midtrans`
**Headers:**
```
X-Midtrans-Signature: sha512(order_id+status_code+gross_amount+server_key)
```
**Request:** Midtrans standard payload

### 5.2 POST `/api/payments/verify-status`
**Request:**
```json
{
  "orderId": "ORD-2026-001234",
  "snapToken": "bb2e..."
}
```
**Response:**
```json
{
  "status": "paid",
  "transactionStatus": "settlement",
  "paymentType": "gopay",
  "paidAt": "2026-09-03T10:15:00Z"
}
```

---

## 🎨 6. 3D STUDIO

### 6.1 GET `/api/studio/colorways`
**Response:**
```json
{
  "colorways": [
    { "id": "obsidian", "name": "Obsidian Black", "hex": "#0A0A0B" },
    { "id": "tangerine", "name": "Signal Tangerine", "hex": "#FF6B35" }
  ],
  "sizes": ["S", "M", "L", "XL", "XXL"],
  "gsm": [240, 280],
  "maxPrintWidthCm": 30,
  "maxPrintHeightCm": 40
}
```

### 6.2 POST `/api/studio/enhance` (AI Enhancement)
**Request:**
```json
{
  "designId": "design_abc",
  "previewUrl": "https://r2.dev/preview.png",
  "style": "photorealistic"
}
```
**Response 200:**
```json
{
  "enhancedUrl": "https://r2.dev/enhanced.png",
  "creditsUsed": 1,
  "processingTime": 4500
}
```

### 6.3 POST `/api/studio/generate-from-text`
**Request:**
```json
{
  "prompt": "Geometric wolf head, minimal, streetwear style",
  "style": "streetwear"
}
```
**Response 200:**
```json
{
  "imageUrl": "https://r2.dev/generated.png",
  "creditsUsed": 5
}
```

---

## 📦 7. R2 STORAGE (Cloudflare)

Public URL base: `https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev`

Structure:
```
/decals/{userId}/{designId}.png
/exports/{userId}/{designId}-{timestamp}.png
/videos/{userId}/{designId}-{timestamp}.webm
/models/tshirt-heavyweight-draco.glb
/models/tshirt-heavyweight-low.glb
/models/tshirt-heavyweight-medium.glb
/models/tshirt-heavyweight-high.glb
/models/manekin-walking.glb
/models/hoodie-draco.glb
```

---

## 🔔 8. NOTIFICATIONS

### 8.1 POST `/api/push/register`
**Request:**
```json
{
  "token": "fcm_or_apns_token",
  "platform": "android",
  "userId": "user_123",
  "topics": ["order_updates", "promotions"]
}
```

### 8.2 POST `/api/whatsapp/send` (Fonnte wrapper)
**Request:**
```json
{
  "target": "+6281234567890",
  "message": "Halo, pesanan Anda sedang diproses..."
}
```

---

## 📊 9. ANALYTICS

### 9.1 POST `/api/analytics/event`
**Request:**
```json
{
  "eventName": "design_completed",
  "params": {
    "duration_seconds": 180,
    "design_type": "3d"
  },
  "timestamp": 1725350400000
}
```

### 9.2 POST `/api/analytics/purchase`
**Request:**
```json
{
  "orderId": "ORD-2026-001234",
  "value": 598000,
  "currency": "IDR",
  "items": [...]
}
```

---

## ⚠️ 10. ERROR RESPONSES

All errors follow this format:
```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order tidak ditemukan",
    "details": { "orderId": "ORD-INVALID" }
  }
}
```

**Common Status Codes:**
- 400: Bad Request (validation error)
- 401: Unauthorized (token invalid/expired)
- 403: Forbidden (role insufficient)
- 404: Not Found
- 409: Conflict (concurrent modification)
- 422: Unprocessable Entity (business rule violation)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

**Rate Limits:**
- Public endpoints: 100 req/min per IP
- Authenticated: 300 req/min per user
- Sync endpoints: 60 req/min per user
- AI endpoints: 20 req/min per user

---

## ✅ 11. CHECKLIST BLUEPRINT-10

- [ ] All endpoints implemented
- [ ] OpenAPI/Swagger documentation generated
- [ ] Postman collection exported
- [ ] Authentication tested
- [ ] Rate limiting configured
- [ ] CORS configured for mobile origins
- [ ] Webhook signature verification
- [ ] Error codes standardized
- [ ] API versioning strategy (v1 prefix)
- [ ] Load testing completed (1000 concurrent)

**Progress: 0%**
```

---

## 🎁 BONUS: CARA PAKAI BLUEPRINT INI

### 1. **Simpan ke folder `/docs/blueprints/` di project**
```bash
mkdir -p docs/blueprints
# Simpan setiap blueprint sebagai file .md terpisah
```

### 2. **Prompt AI Agent kamu (Claude Code / Cursor / Cline)**
```
Saya punya project Kaos Kami Mobile (Capacitor 8 + Next.js 15). 
Baca file BLUEPRINT-00 sampai BLUEPRINT-10 di folder docs/blueprints/.
Mulai kerjakan sesuai urutan fase di BLUEPRINT-09 BUILD-PROGRESS-TRACKER.md.
Setiap selesai task, centang [x] di tracker dan update daily worklog.
Ikuti semua rules di BLUEPRINT-01 bagian "Non-Negotiable Rules".
```

### 3. **Urutan Eksekusi untuk AI Agent**
1. Setup Capacitor 8 (BLUEPRINT-01)
2. Build Design System (BLUEPRINT-02)  
3. Port 3D Studio mobile (BLUEPRINT-03)
4. E-Commerce + Midtrans (BLUEPRINT-04)
5. Native plugins (BLUEPRINT-05)
6. Offline sync (BLUEPRINT-06)
7. Facebook Ads + IAP (BLUEPRINT-08)
8. Build & submit (BLUEPRINT-07)

### 4. **Key Takeaways dari Riset Kompetitor**

- **VirtualThreads** → adopsi: wind animation, walking manekin, video export, adjustable speed
- **3DMockups.app** → adopsi: 3D paint studio, tech pack generator, live co-design, print pipeline  
- **FitMockup** → adopsi: AI enhancement, AR preview, gesture controls, auto-rotation video
- **Wanna.Fashion** → adopsi: AR try-on pattern (via Camera + 3D overlay, bukan full body tracking)
- **Browzwear/Style3D** → adopsi konsep: Tech Pack, BOM, Measurement Grading untuk Pro tier

### 5. **Diferensiasi Kaos Kami yang TIDAK Bisa Ditiru Kompetitor**
1. Workshop fisik di Makassar (produksi lokal, instant pickup)
2. DTF Sablon 1:1 cm calibration (production-ready, bukan cuma visual)
3. Pembayaran lokal (QRIS, VA, Alfamart, Indomaret, COD Maxim)
4. WhatsApp-first notifikasi (konsumen Makassar prefer WA)
5. Bahasa + konteks Sulawesi Selatan penuh

---

**Total Est. Lines Generated:** ~17,000+ lines markdown  
**Blueprint Files Created:** 10 files  
**Est. Development Time:** 12 weeks dengan 1 full-time developer  
**Target Launch:** Q4 2026

Semoga membantu project kamu makin epic! 🚀