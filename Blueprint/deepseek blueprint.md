Baik, saya sudah menganalisis project **Kaos Kami** secara mendalam. Berikut ringkasan analisis dan blueprint lengkap yang akan saya buatkan:

## 📊 Analisis Project Kaos Kami

### ✅ Yang Sudah Ada (Solid Foundation)
- **Stack**: Next.js 14 App Router + React Three Fiber + Three.js + GSAP + Zustand
- **5 Blueprint Lengkap** (01-05): E-commerce Core, Mockup Studio Engine, Admin Dashboard, Mobile Performance, Enterprise Security
- **3D Configurator** dengan kalibrasi fisik 30cm untuk DTF printing
- **Scroll-driven storytelling** dengan 4 phase choreographed camera
- **Database**: Turso libSQL (24/7 always-on)
- **Payment**: Midtrans/Duitku integration
- **Deployment**: Cloudflare Workers

### 🎯 Gap vs Kompetitor (VirtualThreads, 3DMockups, FitMockup)
| Fitur | VirtualThreads | 3DMockups | FitMockup | Kaos Kami Current | Target |
|-------|---------------|-----------|-----------|-------------------|--------|
| Multi-decal layers | Partial | ✅ | Partial | Stub | Full layer system |
| Direct manipulation gizmo | ✅ | ✅ | ✅ | Sliders only | On-mesh drag/pinch/rotate |
| Animation presets (walk/wind/knit) | ✅ | Partial | ❌ | None | GSAP+R3F driven |
| Multi-part coloring | ❌ | ❌ | ✅ | Single color | Per-part system |
| AI photorealistic enhancement | ❌ | ❌ | ✅ | None | Image-to-image API |
| AR Try-On | ❌ | ❌ | ❌ | None | Camera + body tracking |
| Native app features | N/A | N/A | Mobile | Web only | Capacitor native |

---

# 📱 BLUEPRINT 06/10 — CAPACITOR NATIVE APP ARCHITECTURE

```markdown
# ================================================================================
# KAOS KAMI — BLUEPRINT 06 / 10
# CAPACITOR NATIVE APP ARCHITECTURE & CROSS-PLATFORM BRIDGE
# ================================================================================

Version: 2.0 · Target: iOS 17+ / Android 12+ (API 31+)
Companion documents: BLUEPRINT-01 through BLUEPRINT-05 (existing web stack),
BLUEPRINT-07 (Premium UI/UX), BLUEPRINT-08 (WebGPU 3D Mobile),
BLUEPRINT-09 (AR Try-On & Native Features), BLUEPRINT-10 (Store Submission)

================================================================================
0. EXECUTIVE SUMMARY — WHY CAPACITOR, NOT JUST A PWA
================================================================================

Kaos Kami sudah memiliki web app yang powerful. Namun untuk bersaing dengan
FitMockup (mobile-app-first) dan mencapai "native feel" yang tidak terasa
seperti WebView, kita perlu Capacitor bukan sekadar sebagai wrapper, tetapi
sebagai STRATEGIC BRIDGE untuk:

1. NATIVE PERFORMANCE ESCAPE HATCHS:
   - GPU-accelerated Three.js via WebGPU (2-5x faster than WebGL on mobile)
   - Native file I/O untuk offline design caching (zero latency)
   - Native camera & ARKit/ARCore untuk Virtual Try-On
   - Native haptics untuk premium micro-interactions
   - Native push notifications untuk order updates

2. PLATFORM-SPECIFIC UX:
   - iOS: Dynamic Island integration, Live Activities (order tracking)
   - Android: Material You dynamic colors, Quick Settings tile
   - Both: Biometric auth (FaceID/TouchID) for instant login

3. STORE DISTRIBUTION:
   - App Store / Play Store presence = trust signal untuk Indonesian users
   - OTA updates via Capgo untuk rapid iteration
   - In-app purchases untuk premium features (enhanced exports, AI credits)

GOLDEN RULE: Web app tetap berfungsi penuh sebagai fallback. Capacitor app
adalah UPGRADE yang menambahkan capabilities, bukan replacement.

================================================================================
1. PROJECT STRUCTURE — MONOREPO HYBRID ARCHITECTURE
================================================================================

Kita menggunakan monorepo structure untuk berbagi 95% code antara web dan
Capacitor, dengan platform-specific escape hatches:

```
kaos-kami/
├── apps/
│   ├── web/                    # Existing Next.js app (unchanged)
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # Shared components
│   │   └── lib/                # Shared utilities
│   │
│   └── mobile/                 # NEW: Capacitor app
│       ├── capacitor.config.ts
│       ├── android/            # Native Android project
│       ├── ios/                # Native iOS project
│       └── src/
│           ├── capacitor/      # Platform-specific code
│           │   ├── plugins/    # Custom Capacitor plugins
│           │   ├── bridges/    # Web ↔ Native bridges
│           │   └── permissions/ # iOS/Android permission handlers
│           │
│           ├── native-ui/      # Premium native-style components
│           │   ├── BottomSheet.tsx
│           │   ├── PullToRefresh.tsx
│           │   ├── HapticButton.tsx
│           │   └── BiometricPrompt.tsx
│           │
│           └── stores/
│               └── useNativeStore.ts  # Platform-aware state
│
├── packages/
│   ├── shared/                 # Truly shared code
│   │   ├── components/         # Platform-agnostic components
│   │   ├── store/              # Zustand store (web + mobile)
│   │   ├── lib/
│   │   │   ├── schemas/        # Zod schemas
│   │   │   ├── constants.ts    # Apparel catalog
│   │   │   └── api.ts          # API client
│   │   └── types/
│   │
│   └── capacitor-plugins/      # Custom plugins
│       ├── ar-try-on/          # AR body tracking plugin
│       ├── haptic-feedback/    # Enhanced haptics
│       └── biometric-auth/     # FaceID/TouchID/Fingerprint
│
└── turbo.json                  # Turborepo config
```

================================================================================
2. CAPACITOR SETUP — STEP BY STEP
================================================================================

## 2.1 Installation & Configuration

```bash
# Install Capacitor core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor (creates capacitor.config.ts)
npx cap init "Kaos Kami" "com.kaoskami.app" \
  --web-dir=../../apps/web/dist

# Add platforms
npx cap add android
npx cap add ios

# Install essential plugins
npm install @capacitor/app \
            @capacitor/camera \
            @capacitor/device \
            @capacitor/filesystem \
            @capacitor/haptics \
            @capacitor/keyboard \
            @capacitor/local-notifications \
            @capacitor/network \
            @capacitor/preferences \
            @capacitor/push-notifications \
            @capacitor/share \
            @capacitor/splash-screen \
            @capacitor/status-bar

# Premium plugins (community)
npm install @capawesome/capacitor-file-picker \
            @capawesome/capacitor-cloudinary \
            capgo-native-navigation
```

## 2.2 capacitor.config.ts — Premium Configuration

```typescript
// apps/mobile/capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaoskami.app',
  appName: 'Kaos Kami',
  webDir: '../../apps/web/dist',
  
  // CRITICAL: Use server.url only for development, NEVER in production
  // Production uses bundled web assets
  server: process.env.NODE_ENV === 'development' ? {
    url: 'http://localhost:3000',
    cleartext: true
  } : undefined,

  // Performance: Enable web debugging only in dev
  loggingBehavior: process.env.NODE_ENV === 'development' ? 'debug' : 'production',

  // iOS-specific optimizations
  ios: {
    // Enable content mode for better WebView performance
    contentMode: 'mobile',
    // Hide status bar on splash for immersive experience
    prefersHomeIndicatorHidden: true,
    // Enable background fetch for order notifications
    backgroundMode: ['fetch', 'processing'],
    // Dark mode support
    overrideUserAgentStyle: true,
    // Limit zoom to prevent accidental pinch-zoom
    limitsNavigationsToAppBoundDomains: true,
    // Allow inline media playback
    allowsLinkPreview: false,
    // Scheme for custom URL handling (kaoskami://)
    scheme: 'kaoskami'
  },

  // Android-specific optimizations
  android: {
    // Enable hardware acceleration
    allowMixedContent: 'never',
    // Background color matches app theme
    backgroundColor: '#0a0a0b',
    // Enable web debugging
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    // Custom splash screen
    splash: {
      launchAutoHide: false, // We control splash hide manually
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true
    }
  },

  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#0a0a0b',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0b'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E65100' // Kaos Kami Signal Tangerine
    }
  }
};

export default config;
```

## 2.3 Platform Detection Bridge

```typescript
// apps/mobile/src/capacitor/bridges/platform.ts
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export type Platform = 'web' | 'ios' | 'android';
export type DeviceTier = 'high' | 'medium' | 'low';

class PlatformBridge {
  private _platform: Platform | null = null;
  private _deviceTier: DeviceTier | null = null;

  async getPlatform(): Promise<Platform> {
    if (this._platform) return this._platform;
    
    this._platform = Capacitor.getPlatform() as Platform;
    return this._platform;
  }

  async getDeviceTier(): Promise<DeviceTier> {
    if (this._deviceTier) return this._deviceTier;

    const info = await Device.getInfo();
    const platform = await this.getPlatform();

    if (platform === 'web') {
      // Web: use Navigator API
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency;
      
      if (memory >= 8 && cores >= 8) this._deviceTier = 'high';
      else if (memory >= 4 && cores >= 4) this._deviceTier = 'medium';
      else this._deviceTier = 'low';
    } else {
      // Native: use Capacitor Device API
      if (platform === 'ios') {
        // iOS: Use model detection
        const model = info.model || '';
        if (model.includes('iPhone14') || model.includes('iPhone15') || model.includes('iPhone16')) {
          this._deviceTier = 'high'; // A15 Bionic and newer
        } else if (model.includes('iPhone12') || model.includes('iPhone13')) {
          this._deviceTier = 'medium'; // A13/A14
        } else {
          this._deviceTier = 'low'; // A12 and older
        }
      } else {
        // Android: Use RAM + API level
        const memInfo = await Device.getInfo();
        const ramGB = (memInfo as any).memTotal ? (memInfo as any).memTotal / 1e9 : 4;
        
        if (ramGB >= 8) this._deviceTier = 'high';
        else if (ramGB >= 4) this._deviceTier = 'medium';
        else this._deviceTier = 'low';
      }
    }

    return this._deviceTier;
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  isWeb(): boolean {
    return !this.isNative();
  }

  // Safe execution: run native code only if on native platform
  async safeNative<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.isNative()) return fallback;
    try {
      return await fn();
    } catch (error) {
      console.warn('[PlatformBridge] Native call failed:', error);
      return fallback;
    }
  }
}

export const platform = new PlatformBridge();
```

================================================================================
3. WEB ↔ NATIVE BRIDGE PATTERN
================================================================================

The key architectural pattern: ALL business logic stays in web code (shared/).
Native code is only for PLATFORM-SPECIFIC CAPABILITIES that web cannot do.

## 3.1 Bridge Architecture

```typescript
// apps/mobile/src/capacitor/bridges/NativeBridge.ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { platform } from './platform';

/**
 * NativeBridge: Centralized access to native capabilities with automatic
 * fallback to web alternatives. All components should use this bridge
 * instead of importing Capacitor plugins directly.
 */
export const NativeBridge = {
  // ============================================================
  // HAPTICS
  // ============================================================
  async hapticLight(): Promise<void> {
    await platform.safeNative(
      () => Haptics.impact({ style: ImpactStyle.Light }),
      undefined // Web: no haptics available
    );
  },

  async hapticMedium(): Promise<void> {
    await platform.safeNative(
      () => Haptics.impact({ style: ImpactStyle.Medium }),
      undefined
    );
  },

  async hapticHeavy(): Promise<void> {
    await platform.safeNative(
      () => Haptics.impact({ style: ImpactStyle.Heavy }),
      undefined
    );
  },

  async hapticSuccess(): Promise<void> {
    await platform.safeNative(
      () => Haptics.notification({ type: NotificationType.Success }),
      undefined
    );
  },

  async hapticWarning(): Promise<void> {
    await platform.safeNative(
      () => Haptics.notification({ type: NotificationType.Warning }),
      undefined
    );
  },

  async hapticError(): Promise<void> {
    await platform.safeNative(
      () => Haptics.notification({ type: NotificationType.Error }),
      undefined
    );
  },

  async hapticSelection(): Promise<void> {
    await platform.safeNative(
      () => Haptics.selectionStart().then(() => Haptics.selectionChanged()),
      undefined
    );
  },

  // ============================================================
  // PERSISTENT STORAGE (Offline-first design)
  // ============================================================
  async getPreference(key: string): Promise<string | null> {
    if (platform.isNative()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async setPreference(key: string, value: string): Promise<void> {
    if (platform.isNative()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removePreference(key: string): Promise<void> {
    if (platform.isNative()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  // ============================================================
  // FILE SYSTEM (For offline design assets)
  // ============================================================
  async saveDesignOffline(designId: string, data: Blob): Promise<string> {
    if (!platform.isNative()) {
      // Web: Use IndexedDB
      return this.saveToIndexedDB(designId, data);
    }

    const base64 = await this.blobToBase64(data);
    const path = `designs/${designId}.json`;
    
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Documents,
      recursive: true
    });

    return path;
  },

  async loadDesignOffline(designId: string): Promise<Blob | null> {
    if (!platform.isNative()) {
      return this.loadFromIndexedDB(designId);
    }

    try {
      const path = `designs/${designId}.json`;
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Documents
      });
      return this.base64ToBlob(result.data as string);
    } catch {
      return null;
    }
  },

  // ============================================================
  // CAMERA (For design uploads & AR try-on)
  // ============================================================
  async takePhoto(): Promise<string | null> {
    if (!platform.isNative()) {
      // Web: Use file input
      return this.webFileInput('image/*');
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 2048,
        height: 2048,
        correctOrientation: true
      });
      return photo.webPath || null;
    } catch (error) {
      console.warn('[NativeBridge] Camera cancelled:', error);
      return null;
    }
  },

  async pickImage(): Promise<string | null> {
    if (!platform.isNative()) {
      return this.webFileInput('image/*');
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        correctOrientation: true
      });
      return photo.webPath || null;
    } catch {
      return null;
    }
  },

  // ============================================================
  // UTILITY
  // ============================================================
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  },

  base64ToBlob(base64: string): Blob {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  },

  async saveToIndexedDB(key: string, data: Blob): Promise<string> {
    return new Promise((resolve) => {
      const request = indexedDB.open('KaosKamiOffline', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('designs')) {
          db.createObjectStore('designs');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('designs', 'readwrite');
        tx.objectStore('designs').put(data, key);
        tx.oncomplete = () => resolve(key);
      };
    });
  },

  async loadFromIndexedDB(key: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('KaosKamiOffline', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('designs', 'readonly');
        const getReq = tx.objectStore('designs').get(key);
        getReq.onsuccess = () => resolve(getReq.result || null);
      };
    });
  },

  webFileInput(accept: string): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve(URL.createObjectURL(file));
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
};
```

================================================================================
4. ZUSTAND STORE — PLATFORM-AWARE EXTENSIONS
================================================================================

```typescript
// packages/shared/store/useConfiguratorStore.ts (extended)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NativeBridge } from '@/capacitor/bridges/NativeBridge';

interface ConfiguratorState {
  // ... existing state from BLUEPRINT-02 ...
  
  // NEW: Platform-specific state
  isNative: boolean;
  deviceTier: 'high' | 'medium' | 'low';
  isOffline: boolean;
  pendingOfflineSync: string[]; // Design IDs to sync when online
  nativePreferences: {
    hapticsEnabled: boolean;
    biometricAuthEnabled: boolean;
    pushNotificationsEnabled: boolean;
    darkMode: 'system' | 'light' | 'dark';
  };
}

interface ConfiguratorActions {
  // ... existing actions ...
  
  // NEW: Platform-aware actions
  initializePlatform: () => Promise<void>;
  setNativePreference: <K extends keyof ConfiguratorState['nativePreferences']>(
    key: K,
    value: ConfiguratorState['nativePreferences'][K]
  ) => Promise<void>;
  syncOfflineDesigns: () => Promise<void>;
  queueOfflineDesign: (designId: string) => void;
}

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set, get) => ({
      // ... existing state ...
      
      isNative: false,
      deviceTier: 'medium',
      isOffline: false,
      pendingOfflineSync: [],
      nativePreferences: {
        hapticsEnabled: true,
        biometricAuthEnabled: false,
        pushNotificationsEnabled: true,
        darkMode: 'system'
      },

      initializePlatform: async () => {
        const platform = await import('@/capacitor/bridges/platform');
        const isNative = platform.default.isNative();
        const deviceTier = await platform.default.getDeviceTier();
        
        // Load native preferences
        const haptics = await NativeBridge.getPreference('hapticsEnabled');
        const biometric = await NativeBridge.getPreference('biometricAuthEnabled');
        const push = await NativeBridge.getPreference('pushNotificationsEnabled');
        const darkMode = await NativeBridge.getPreference('darkMode');
        
        set({
          isNative,
          deviceTier,
          nativePreferences: {
            hapticsEnabled: haptics !== 'false',
            biometricAuthEnabled: biometric === 'true',
            pushNotificationsEnabled: push !== 'false',
            darkMode: (darkMode as any) || 'system'
          }
        });
      },

      setNativePreference: async (key, value) => {
        const prefKey = key as string;
        await NativeBridge.setPreference(prefKey, String(value));
        
        set((state) => ({
          nativePreferences: {
            ...state.nativePreferences,
            [key]: value
          }
        }));
      },

      queueOfflineDesign: (designId) => {
        set((state) => ({
          pendingOfflineSync: [...state.pendingOfflineSync, designId]
        }));
      },

      syncOfflineDesigns: async () => {
        const { pendingOfflineSync } = get();
        if (pendingOfflineSync.length === 0) return;

        for (const designId of pendingOfflineSync) {
          const blob = await NativeBridge.loadDesignOffline(designId);
          if (blob) {
            // Upload to server
            // ... implementation in §5 (offline sync) ...
          }
        }

        set({ pendingOfflineSync: [] });
      }
    }),
    {
      name: 'kaos-kami-configurator',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          // Use native Preferences on native, localStorage on web
          const value = await NativeBridge.getPreference(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name: string, value: any) => {
          await NativeBridge.setPreference(name, JSON.stringify(value));
        },
        removeItem: async (name: string) => {
          await NativeBridge.removePreference(name);
        }
      }))
    }
  )
);
```

================================================================================
5. OFFLINE-FIRST SYNC STRATEGY
================================================================================

Kaos Kami harus berfungsi penuh tanpa internet (critical for Indonesian users
dengan flaky connections). Offline-first architecture:

```typescript
// apps/mobile/src/capacitor/bridges/OfflineSync.ts
import { Network } from '@capacitor/network';
import { useConfiguratorStore } from '@/store/useConfiguratorStore';
import { NativeBridge } from './NativeBridge';

class OfflineSyncManager {
  private syncQueue: Array<{
    type: 'design' | 'order' | 'cart';
    id: string;
    payload: any;
    timestamp: number;
  }> = [];

  constructor() {
    this.initializeNetworkListener();
  }

  private async initializeNetworkListener() {
    // Listen for network changes
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        this.processQueue();
      } else {
        useConfiguratorStore.setState({ isOffline: true });
      }
    });

    // Check initial status
    const status = await Network.getStatus();
    useConfiguratorStore.setState({ isOffline: !status.connected });

    // Process any pending queue on startup
    if (status.connected) {
      await this.processQueue();
    }
  }

  async saveDesignOffline(designId: string, design: any): Promise<void> {
    // Save to device storage
    const blob = new Blob([JSON.stringify(design)], { type: 'application/json' });
    await NativeBridge.saveDesignOffline(designId, blob);

    // Add to sync queue
    this.syncQueue.push({
      type: 'design',
      id: designId,
      payload: design,
      timestamp: Date.now()
    });

    // Persist queue to native storage
    await NativeBridge.setPreference('syncQueue', JSON.stringify(this.syncQueue));

    // Queue in store
    useConfiguratorStore.getState().queueOfflineDesign(designId);
  }

  async processQueue(): Promise<void> {
    // Load queue from storage
    const queueStr = await NativeBridge.getPreference('syncQueue');
    if (queueStr) {
      this.syncQueue = JSON.parse(queueStr);
    }

    if (this.syncQueue.length === 0) return;

    console.log(`[OfflineSync] Processing ${this.syncQueue.length} items`);

    const failed: typeof this.syncQueue = [];

    for (const item of this.syncQueue) {
      try {
        switch (item.type) {
          case 'design':
            await this.syncDesign(item.id, item.payload);
            break;
          case 'order':
            await this.syncOrder(item.id, item.payload);
            break;
          case 'cart':
            await this.syncCart(item.payload);
            break;
        }
        await NativeBridge.hapticSuccess();
      } catch (error) {
        console.warn(`[OfflineSync] Failed to sync ${item.type}:${item.id}`, error);
        failed.push(item);
        await NativeBridge.hapticError();
      }
    }

    // Only keep failed items in queue
    this.syncQueue = failed;
    await NativeBridge.setPreference('syncQueue', JSON.stringify(this.syncQueue));

    if (failed.length === 0) {
      useConfiguratorStore.setState({ 
        isOffline: false,
        pendingOfflineSync: []
      });
    }
  }

  private async syncDesign(id: string, design: any): Promise<void> {
    const response = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(design)
    });
    if (!response.ok) throw new Error('Design sync failed');
  }

  private async syncOrder(id: string, order: any): Promise<void> {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!response.ok) throw new Error('Order sync failed');
  }

  private async syncCart(cart: any): Promise<void> {
    const response = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cart)
    });
    if (!response.ok) throw new Error('Cart sync failed');
  }
}

export const offlineSync = new OfflineSyncManager();
```

================================================================================
6. SPLASH SCREEN & APP LAUNCH EXPERIENCE
================================================================================

Premium apps never show a blank WebView. Custom splash experience:

```typescript
// apps/mobile/src/capacitor/SplashManager.ts
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { platform } from './bridges/platform';

class SplashManager {
  private static instance: SplashManager;
  private isReady = false;

  static getInstance(): SplashManager {
    if (!SplashManager.instance) {
      SplashManager.instance = new SplashManager();
    }
    return SplashManager.instance;
  }

  async initialize() {
    // Set status bar style
    if (platform.isNative()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0a0b' });
    }

    // Wait for critical resources
    await this.preloadCriticalAssets();

    // Hide splash screen with smooth transition
    await SplashScreen.hide({ fadeOutDuration: 400 });
  }

  private async preloadCriticalAssets() {
    const promises: Promise<any>[] = [
      // Preload critical fonts
      this.preloadFonts(),
      
      // Preload first screen data
      this.preloadCatalogData(),
      
      // Warm up WebGL/WebGPU context
      this.warmUpGPU(),
      
      // Minimum display time for brand presence
      this.minimumDisplayTime(1200)
    ];

    await Promise.all(promises);
    this.isReady = true;
  }

  private async preloadFonts(): Promise<void> {
    const fonts = [
      new FontFace('Syne', 'url(/fonts/Syne-Variable.woff2)', {
        weight: '400 800',
        style: 'normal'
      }),
      new FontFace('JetBrains Mono', 'url(/fonts/JetBrainsMono-Regular.woff2)', {
        weight: '400',
        style: 'normal'
      })
    ];

    await Promise.all(fonts.map((font) => font.load()));
    fonts.forEach((font) => document.fonts.add(font));
  }

  private async preloadCatalogData(): Promise<void> {
    try {
      const response = await fetch('/api/catalog/categories', {
        cache: 'force-cache'
      });
      const data = await response.json();
      // Pre-populate TanStack Query cache
      // ... implementation ...
    } catch {
      // Non-critical, continue
    }
  }

  private async warmUpGPU(): Promise<void> {
    // Create hidden canvas to warm up WebGL/WebGPU context
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.position = 'absolute';
    canvas.style.left = '-9999px';
    document.body.appendChild(canvas);

    // Try WebGPU first (2026 mobile standard)
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          console.log('[GPU] WebGPU warmed up');
        }
      } catch {
        // Fallback to WebGL
        const gl = canvas.getContext('webgl2');
        if (gl) {
          console.log('[GPU] WebGL2 warmed up');
        }
      }
    }

    document.body.removeChild(canvas);
  }

  private minimumDisplayTime(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const splashManager = SplashManager.getInstance();
```

================================================================================
7. BIOMETRIC AUTHENTICATION (FaceID / TouchID / Fingerprint)
================================================================================

```typescript
// packages/capacitor-plugins/biometric-auth/src/index.ts
import { registerPlugin } from '@capacitor/core';

export interface BiometricAuthPlugin {
  isAvailable(): Promise<{ available: boolean; biometryType: 'face' | 'touch' | 'fingerprint' | 'none' }>;
  authenticate(reason: string): Promise<{ success: boolean; token?: string }>;
  saveCredentials(key: string, value: string): Promise<void>;
  getCredentials(key: string): Promise<string | null>;
  deleteCredentials(key: string): Promise<void>;
}

const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth', {
  web: () => import('./web').then((m) => new m.BiometricAuthWeb())
});

export { BiometricAuth };
```

```typescript
// apps/mobile/src/components/BiometricLogin.tsx
import { BiometricAuth } from '@/capacitor/plugins/biometric-auth';
import { NativeBridge } from '@/capacitor/bridges/NativeBridge';
import { useConfiguratorStore } from '@/store/useConfiguratorStore';

export function BiometricLogin() {
  const { nativePreferences, setNativePreference } = useConfiguratorStore();

  const handleBiometricLogin = async () => {
    const { available, biometryType } = await BiometricAuth.isAvailable();
    
    if (!available) {
      // Show fallback: PIN/password
      return;
    }

    const biometryLabel = {
      face: 'Face ID',
      touch: 'Touch ID',
      fingerprint: 'Sidik Jari',
      none: 'Biometric'
    }[biometryType];

    const result = await BiometricAuth.authenticate(
      `Masuk ke Kaos Kami menggunakan ${biometryLabel}`
    );

    if (result.success && result.token) {
      // Use token to restore session
      await restoreSession(result.token);
      await NativeBridge.hapticSuccess();
    } else {
      await NativeBridge.hapticError();
    }
  };

  const enableBiometric = async () => {
    const result = await BiometricAuth.authenticate(
      'Aktifkan biometric untuk login cepat'
    );

    if (result.success) {
      // Save encrypted session token
      await BiometricAuth.saveCredentials('session_token', generateSessionToken());
      await setNativePreference('biometricAuthEnabled', true);
      await NativeBridge.hapticSuccess();
    }
  };

  return (
    <div className="biometric-login">
      {nativePreferences.biometricAuthEnabled ? (
        <button
          onClick={handleBiometricLogin}
          className="biometric-button"
          aria-label="Login dengan biometric"
        >
          <BiometricIcon />
          <span>Masuk dengan Cepat</span>
        </button>
      ) : (
        <button onClick={enableBiometric}>
          Aktifkan Biometric Login
        </button>
      )}
    </div>
  );
}
```

================================================================================
8. PUSH NOTIFICATIONS & ORDER TRACKING
================================================================================

```typescript
// apps/mobile/src/capacitor/services/PushNotificationService.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { platform } from '../bridges/platform';
import { NativeBridge } from '../bridges/NativeBridge';

class PushNotificationService {
  private initialized = false;

  async initialize() {
    if (this.initialized || !platform.isNative()) return;

    // Check permissions
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission denied');
      return;
    }

    // Register for push
    await PushNotifications.register();

    // Listen for token
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Registration token:', token.value);
      await this.registerTokenWithServer(token.value);
    });

    // Listen for errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // Listen for foreground notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification);
      this.handleForegroundNotification(notification);
    });

    // Listen for notification actions (user tapped)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action);
      this.handleNotificationAction(action);
    });

    this.initialized = true;
  }

  private async registerTokenWithServer(token: string) {
    await fetch('/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        platform: await platform.getPlatform(),
        deviceInfo: await this.getDeviceInfo()
      })
    });
  }

  private async getDeviceInfo() {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return {
      model: info.model,
      platform: info.platform,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer
    };
  }

  private async handleForegroundNotification(notification: any) {
    // Show local notification while app is in foreground
    await LocalNotifications.schedule({
      notifications: [{
        id: parseInt(notification.id),
        title: notification.title,
        body: notification.body,
        schedule: { at: new Date(Date.now() + 1000) },
        sound: 'default',
        attachments: notification.image ? [{ url: notification.image }] : undefined,
        actionTypeId: notification.actionTypeId || '',
        extra: notification.data || {}
      }]
    });

    await NativeBridge.hapticMedium();
  }

  private async handleNotificationAction(action: any) {
    const { notification, actionId } = action;
    const data = notification.data;

    // Route based on notification type
    switch (data.type) {
      case 'order_update':
        window.location.href = `/orders/${data.orderId}`;
        break;
      case 'payment_received':
        window.location.href = `/orders/${data.orderId}?status=paid`;
        break;
      case 'design_comment':
        window.location.href = `/designs/${data.designId}#comment-${data.commentId}`;
        break;
      case 'promo':
        window.location.href = `/catalog?promo=${data.promoCode}`;
        break;
    }
  }

  // Schedule local notification (e.g., reminder to complete design)
  async scheduleReminder(options: {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date } | { every: 'hour' | 'day' | 'week' };
    data?: any;
  }) {
    if (!platform.isNative()) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.schedule,
        sound: 'default',
        extra: options.data || {}
      }]
    });
  }

  // iOS-specific: Live Activities (Dynamic Island) for order tracking
  async startOrderTrackingActivity(orderId: string, orderData: any) {
    if (!platform.isNative() || await platform.getPlatform() !== 'ios') return;
    
    // This requires custom native plugin implementation
    // See BLUEPRINT-09 for iOS Live Activities implementation
    console.log('[Push] Starting Live Activity for order:', orderId);
  }
}

export const pushService = new PushNotificationService();
```

================================================================================
9. PERFORMANCE BUDGETS & OPTIMIZATION
================================================================================

```typescript
// apps/mobile/src/capacitor/config/PerformanceBudget.ts

export const PERFORMANCE_BUDGETS = {
  // Startup performance
  splashToInteractive: {
    high: 800,    // ms, high-end devices
    medium: 1200, // ms, mid-range
    low: 2000     // ms, low-end
  },

  // 3D rendering
  threeJsBundle: {
    maxBytes: 400 * 1024, // 400KB gzipped
    targetFPS: {
      high: 60,
      medium: 30,
      low: 24
    }
  },

  // Memory
  memory: {
    maxHeapMB: {
      high: 512,
      medium: 256,
      low: 128
    },
    maxVRAM_MB: {
      high: 256,
      medium: 128,
      low: 64
    }
  },

  // Network
  network: {
    maxInitialLoadBytes: 2 * 1024 * 1024, // 2MB total initial
    maxThreeJsModelBytes: 3 * 1024 * 1024, // 3MB per model
    maxImageBytes: 500 * 1024 // 500KB per image
  },

  // Battery
  battery: {
    maxCPUUsagePercent: 30, // Average CPU usage
    maxGPURenderTime: 16.67 // ms per frame (60fps)
  }
};

// Performance monitoring
class PerformanceMonitor {
  private metrics: {
    startupTime?: number;
    frameTime: number[];
    memoryUsage: number[];
    batteryDrain: number[];
  } = {
    frameTime: [],
    memoryUsage: [],
    batteryDrain: []
  };

  markStartup() {
    this.metrics.startupTime = performance.now();
  }

  recordFrame(delta: number) {
    this.metrics.frameTime.push(delta);
    if (this.metrics.frameTime.length > 100) {
      this.metrics.frameTime.shift();
    }
  }

  getAverageFPS(): number {
    if (this.metrics.frameTime.length === 0) return 0;
    const avgDelta = this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length;
    return 1000 / avgDelta;
  }

  async checkBattery(): Promise<number> {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return battery.level;
    }
    return 1;
  }

  // Reduce quality if battery is low
  shouldReduceQuality(): boolean {
    const avgFPS = this.getAverageFPS();
    return avgFPS < 24; // If below 24fps, reduce quality
  }

  reportToAnalytics() {
    // Send metrics to analytics service
    // ... implementation ...
  }
}

export const perfMonitor = new PerformanceMonitor();
```

================================================================================
10. DEEP LINKING & UNIVERSAL LINKS
================================================================================

```typescript
// apps/mobile/src/capacitor/services/DeepLinkService.ts
import { App } from '@capacitor/app';
import { platform } from '../bridges/platform';

class DeepLinkService {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!platform.isNative()) {
      // Web: Handle URL hash/route
      window.addEventListener('popstate', () => {
        this.handleUrl(window.location.href);
      });
      return;
    }

    // Native: Listen for app launch URLs
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.checkPendingDeepLink();
      }
    });

    App.addListener('appUrlOpen', (data) => {
      this.handleUrl(data.url);
    });
  }

  private async checkPendingDeepLink() {
    // Check if app was launched via deep link
    // ... platform-specific implementation ...
  }

  handleUrl(url: string) {
    console.log('[DeepLink] Handling URL:', url);

    try {
      const parsed = new URL(url);
      
      // Handle kaoskami:// scheme
      if (parsed.protocol === 'kaoskami:') {
        this.handleCustomScheme(parsed);
        return;
      }

      // Handle universal links (https://app.kaoskami.com/...)
      if (parsed.hostname === 'app.kaoskami.com' || parsed.hostname === 'localhost') {
        this.handleUniversalLink(parsed);
      }
    } catch (error) {
      console.warn('[DeepLink] Invalid URL:', error);
    }
  }

  private handleCustomScheme(url: URL) {
    const path = url.hostname + url.pathname;
    
    switch (path) {
      case 'design':
        const designId = url.searchParams.get('id');
        if (designId) {
          window.location.href = `/studio?design=${designId}`;
        }
        break;
      
      case 'order':
        const orderId = url.searchParams.get('id');
        if (orderId) {
          window.location.href = `/orders/${orderId}`;
        }
        break;

      case 'catalog':
        const category = url.searchParams.get('category');
        if (category) {
          window.location.href = `/catalog/${category}`;
        } else {
          window.location.href = '/catalog';
        }
        break;

      case 'cart':
        window.location.href = '/cart';
        break;
    }
  }

  private handleUniversalLink(url: URL) {
    // Universal links use standard routing
    // Handled by Next.js App Router
    window.location.href = url.pathname + url.search;
  }
}

export const deepLinkService = new DeepLinkService();
```

================================================================================
11. APP LIFECYCLE MANAGEMENT
================================================================================

```typescript
// apps/mobile/src/capacitor/AppLifecycle.ts
import { App as CapApp } from '@capacitor/app';
import { useConfiguratorStore } from '@/store/useConfiguratorStore';
import { offlineSync } from './bridges/OfflineSync';

class AppLifecycleManager {
  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // App state changes (foreground/background)
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        await this.onForeground();
      } else {
        await this.onBackground();
      }
    });

    // App restored (Android only)
    CapApp.addListener('appRestored', () => {
      console.log('[Lifecycle] App restored');
      this.onForeground();
    });

    // Back button (Android)
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });
  }

  private async onForeground() {
    console.log('[Lifecycle] App entered foreground');

    // Check for network reconnection
    await offlineSync.processQueue();

    // Refresh data if stale
    await this.refreshStaleData();

    // Resume animations
    useConfiguratorStore.setState({ appIsActive: true });
  }

  private async onBackground() {
    console.log('[Lifecycle] App entered background');

    // Pause expensive operations
    useConfiguratorStore.setState({ appIsActive: false });

    // Save current state
    await this.saveAppState();

    // Schedule background fetch if needed (iOS)
    // ... implementation in §12 ...
  }

  private async refreshStaleData() {
    const lastFetch = parseInt(
      await import('./bridges/NativeBridge').then(m => 
        m.NativeBridge.getPreference('lastDataFetch')
      ) || '0'
    );

    const now = Date.now();
    const staleAfter = 5 * 60 * 1000; // 5 minutes

    if (now - lastFetch > staleAfter) {
      // Refetch catalog data
      // ... implementation ...
    }
  }

  private async saveAppState() {
    // Save current design state
    // Save cart state
    // Save scroll position
    // ... implementation ...
  }
}

export const lifecycleManager = new AppLifecycleManager();
```

================================================================================
12. IOS-SPECIFIC: LIVE ACTIVITIES & DYNAMIC ISLAND
================================================================================

```swift
// ios/App/App/LiveActivityManager.swift
import ActivityKit
import WidgetKit

@available(iOS 16.2, *)
class LiveActivityManager: NSObject {
  static let shared = LiveActivityManager()
  
  func startOrderTracking(orderId: String, orderData: [String: Any]) {
    let attributes = OrderTrackingAttributes(
      orderNumber: orderData["orderNumber"] as? String ?? "",
      customerName: orderData["customerName"] as? String ?? ""
    )
    
    let initialContent = OrderTrackingAttributes.ContentState(
      status: "PENDING_PAYMENT",
      estimatedDelivery: orderData["estimatedDelivery"] as? String ?? "TBD",
      progress: 0.0
    )
    
    let content = ActivityContent(state: initialContent, staleDate: nil)
    
    do {
      let activity = try Activity<OrderTrackingAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: .token
      )
      
      // Send push token to server for updates
      let token = activity.pushToken
      if let token = token {
        let tokenString = token.map { String(format: "%02x", $0) }.joined()
        // Send to server
        sendPushToken(orderId: orderId, token: tokenString)
      }
    } catch {
      print("[LiveActivity] Failed to start: \(error)")
    }
  }
  
  func updateOrderStatus(orderId: String, status: String, progress: Double) {
    // Update all active activities for this order
    // ... implementation ...
  }
  
  func endOrderTracking(orderId: String) {
    // End all activities for this order
    // ... implementation ...
  }
}
```

================================================================================
13. ANDROID-SPECIFIC: MATERIAL YOU & QUICK SETTINGS
================================================================================

```kotlin
// android/app/src/main/java/com/kaoskami/app/MaterialYouTheme.kt
package com.kaoskami.app

import android.app.WallpaperManager
import android.content.Context
import android.os.Build
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
fun KaosKamiTheme(content: @Composable () -> Unit) {
  val context = LocalContext.current
  
  val colorScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    // Material You: Extract colors from wallpaper
    val isDark = isSystemInDarkTheme()
    if (isDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
  } else {
    // Fallback: Kaos Kami brand colors
    KaosKamiColorScheme
  }
  
  MaterialTheme(
    colorScheme = colorScheme,
    typography = KaosKamiTypography,
    content = content
  )
}
```

```kotlin
// android/app/src/main/java/com/kaoskami/app/QuickSettingsTile.kt
package com.kaoskami.app

import android.service.quicksettings.TileService
import android.content.Intent

class OpenStudioTileService : TileService() {
  override fun onClick() {
    super.onClick()
    
    // Launch app directly to studio
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      data = android.net.Uri.parse("kaoskami://studio")
    }
    startActivityAndCollapse(intent)
  }
}
```

================================================================================
14. BUILD & DEPLOYMENT PIPELINE
================================================================================

```yaml
# .github/workflows/capacitor-build.yml
name: Capacitor Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/**'
      - 'apps/web/**'

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:web
      - uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: apps/web/dist

  build-android:
    needs: build-web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'
      
      - uses: actions/download-artifact@v4
        with:
          name: web-build
          path: apps/web/dist
      
      - name: Setup Capacitor
        run: |
          npm ci
          cd apps/mobile
          npx cap sync android
      
      - name: Build Android APK
        run: |
          cd apps/mobile/android
          ./gradlew assembleRelease
      
      - name: Sign APK
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: apps/mobile/android/app/build/outputs/apk/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEY_STORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}
      
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: apps/mobile/android/app/build/outputs/apk/release/*.apk

  build-ios:
    needs: build-web
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - uses: actions/download-artifact@v4
        with:
          name: web-build
          path: apps/web/dist
      
      - name: Setup Capacitor
        run: |
          npm ci
          cd apps/mobile
          npx cap sync ios
      
      - name: Build iOS
        run: |
          cd apps/mobile/ios/App
          xcodebuild -workspace App.xcworkspace -scheme App -sdk iphoneos -configuration Release archive -archivePath $PWD/build/App.xcarchive
      
      - name: Export IPA
        run: |
          xcodebuild -exportArchive -archivePath apps/mobile/ios/App/build/App.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath $PWD/build
      
      - uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: build/*.ipa

  deploy:
    needs: [build-android, build-ios]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.kaoskami.app
          releaseFiles: ${{ github.workspace }}/android-apk/*.apk
          track: internal
      
      - name: Deploy to App Store
        uses: Apple-Actions/upload-testflight-build@v1
        with:
          app-store-connect-issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          app-store-connect-private-key-id: ${{ secrets.APPSTORE_KEY_ID }}
          app-store-connect-private-key: ${{ secrets.APPSTORE_PRIVATE_KEY }}
```

================================================================================
15. OTA UPDATES WITH CAPGO
================================================================================

```typescript
// apps/mobile/src/capacitor/services/OTAService.ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

class OTAService {
  private readonly API_KEY = process.env.NEXT_PUBLIC_CAPGO_API_KEY;
  private readonly APP_ID = 'com.kaoskami.app';

  async checkForUpdates(): Promise<{
    hasUpdate: boolean;
    version?: string;
    changelog?: string;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { hasUpdate: false };
    }

    try {
      const currentVersion = await this.getCurrentVersion();
      const response = await fetch(`https://api.capgo.app/v1/apps/${this.APP_ID}/versions`, {
        headers: {
          Authorization: `Bearer ${this.API_KEY}`
        }
      });

      const versions = await response.json();
      const latestVersion = versions[0];

      if (latestVersion.version !== currentVersion) {
        return {
          hasUpdate: true,
          version: latestVersion.version,
          changelog: latestVersion.changelog
        };
      }

      return { hasUpdate: false };
    } catch (error) {
      console.warn('[OTA] Update check failed:', error);
      return { hasUpdate: false };
    }
  }

  async applyUpdate(): Promise<void> {
    // Capgo handles update application automatically
    // On next app restart, new version will be active
    await Preferences.set({ key: 'pendingUpdate', value: 'true' });
    window.location.reload();
  }

  private async getCurrentVersion(): Promise<string> {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info.version;
  }
}

export const otaService = new OTAService();
```

================================================================================
END OF BLUEPRINT 06 — proceed to BLUEPRINT-07-PREMIUM-NATIVE-UI-UX-DESIGN-SYSTEM.md
================================================================================
```

Ini adalah **BLUEPRINT 06** yang sangat komprehensif. Saya telah membuat blueprint yang berisi:

## 📋 Yang Sudah Tercakup di Blueprint 06:

✅ **1090+ baris** dokumentasi arsitektur lengkap
✅ **Monorepo structure** untuk code sharing antara web dan mobile
✅ **Platform bridge pattern** untuk web ↔ native communication
✅ **Offline-first sync strategy** untuk koneksi Indonesia yang flaky
✅ **Biometric authentication** (FaceID/TouchID/Fingerprint)
✅ **Push notifications** dengan order tracking
✅ **iOS Live Activities** (Dynamic Island)
✅ **Android Material You** theming
✅ **Performance budgets** dan monitoring
✅ **Deep linking** dan universal links
✅ **Build pipeline** untuk iOS dan Android
✅ **OTA updates** dengan Capgo

---

Karena response sudah sangat panjang, izinkan saya lanjutkan dengan **BLUEPRINT 07-10** di message berikutnya. Mau saya lanjutkan sekarang dengan:

- **BLUEPRINT-07**: Premium Native UI/UX Design System (micro-interactions 2026, Material Design 3, native components)
- **BLUEPRINT-08**: Advanced 3D Mobile & WebGPU Performance (optimisasi Three.js untuk mobile)
- **BLUEPRINT-09**: AR Try-On & Advanced Native Features
- **BLUEPRINT-10**: Store Submission & Monetization Strategy

Atau mau saya fokus lebih detail di satu blueprint tertentu dulu?