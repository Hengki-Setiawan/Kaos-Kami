# BLUEPRINT M1 — MOBILE ARCHITECTURE & CAPACITOR ENTERPRISE BRIDGE
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: BLUEPRINT-01 (API surface, schema), BLUEPRINT-04 (infra), BLUEPRINT-05 (Enterprise Resilience)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & ARSITEKTUR KUNCI

**Kaos Kami Mobile** adalah aplikasi native iOS dan Android yang dibangun di atas codebase Next.js 14 existing menggunakan runtime **Capacitor 8**, React Three Fiber (R3F), Zustand, dan Turso libSQL Edge SQLite.

### 5 Prinsip Arsitektur Non-Negotiable:
1. **Single Codebase, Pragmatic Dual-Config (Bukan Monorepo Destruktif):**
   - **Web Target:** Berjalan di Cloudflare Workers via `@opennextjs/cloudflare` (SSR, dynamic OpenGraph, ISR).
   - **Mobile Target:** Diekspor sebagai SPA statis lokal (`output: 'export'` via `next.config.mobile.mjs`) yang seluruh HTML/CSS/JS/3D asset tertanam fisik di dalam file APK/IPA pengguna (*Offline-First*).
   - *Rationale:* Mencegah migrasi destruktif Turborepo yang dapat merusak konfigurasi OpenNext dan CI/CD Cloudflare existing.
2. **Native Edge-to-Edge (Android 15/16 & iOS 18 Compliant):**
   - Menggunakan konfigurasi Capacitor 8 `adjustMarginsForEdgeToEdge: 'auto'` dan CSS Safe Area insets (`env(safe-area-inset-*)`) untuk mendukung Dynamic Island iPhone dan navigasi gesture Android tanpa floating bar atau konten terpotong.
3. **Central NativeBridge & Graceful Web Fallback:**
   - Seluruh akses hardware (Kamera, Haptic, Push Notification, Biometrik, FileSystem) diakses melalui satu interface `NativeBridge`.
   - Jika dijalankan di browser web biasa, `NativeBridge` secara otomatis melakukan fallback transparan (misal: Kamera native $\rightarrow$ HTML `<input type="file">`, Biometric $\rightarrow$ Password, SQLite $\rightarrow$ IndexedDB/LocalStorage).
4. **Zero-CORS via CapacitorHttp:**
   - Semua request mobile ke backend Cloudflare Workers (`https://kaos-kami-3d.hengkisetiawan461.workers.dev`) menggunakan plugin `CapacitorHttp` untuk bypass CORS dan mendapatkan native network timeouts.
5. **Performance Target:**
   - 60 FPS di 3D Studio (device tiering otomatis).
   - < 2.0 detik Cold Start di HP Android budget (RAM 3–4GB, Helio G85/Snapdragon 665).
   - < 25 MB ukuran bundle final APK/AAB.

---

## 1. STRUKTUR DIREKTORI HYBRID CODEBASE LENGKAP

```tree
kaos-kami/
├── android/                      # Native Android project (Gradle + Android Studio)
│   ├── app/
│   │   ├── build.gradle          # MinSdk 24, TargetSdk 35, Proguard/R8
│   │   ├── proguard-rules.pro    # Proguard rules Three.js & Capacitor
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/id/makassar/kaoskami/
│   │       │   ├── MainActivity.java
│   │       │   └── QuickStudioTileService.kt
│   │       └── res/
│   │           ├── values/styles.xml
│   │           └── xml/file_paths.xml
├── ios/                          # Native iOS project (Xcode + Swift Package Manager)
│   └── App/
│       ├── App.xcworkspace
│       └── App/
│           ├── Info.plist
│           ├── AppDelegate.swift
│           └── OrderTrackingLiveActivity.swift
├── public/
│   ├── models/                   # 3D GLB Models (tshirt, hoodie, jacket)
│   └── fonts/                    # Syne & Inter local webfonts
├── src/
│   ├── app/                      # Next.js App Router (Shared Pages)
│   │   ├── (tabs)/               # Tab screens (Home, Studio, Catalog, Orders, Profile)
│   │   ├── checkout/             # Cart & Checkout flows
│   │   └── api/                  # Cloudflare Worker API routes (Skipped in mobile export)
│   ├── bridge/                   # NativeBridge abstraction layer
│   │   ├── NativeBridge.ts       # Unified bridge interface
│   │   ├── platform.ts           # OS & hardware tier detection
│   │   ├── haptics.ts            # Tactile feedback presets
│   │   ├── biometrics.ts         # FaceID / Fingerprint handler
│   │   ├── camera.ts             # 4K descaling & gallery picker
│   │   ├── payment.ts            # Duitku v2 payment bridge
│   │   └── storage.ts            # Native Preferences / Filesystem
│   ├── components/
│   │   ├── 3d/                   # R3F Canvas, ShirtModel, DecalGizmo, Lighting
│   │   ├── ui/                   # Vaul Sheet, HapticButton, GlassCard, Header
│   │   └── native/               # Native-only wrappers (LiveActivity, QuickTile)
│   ├── store/                    # Zustand stores (Configurator, Cart, Auth, Offline)
│   ├── db/                       # Offline SQLite schemas & sync engine
│   └── lib/                      # API client, calculations, Turso client
├── capacitor.config.ts           # Capacitor 8 runtime configuration
├── next.config.mjs               # Web build config (OpenNext Cloudflare)
├── next.config.mobile.mjs        # Mobile build config (Static export to 'out/')
└── package.json
```

---

## 2. CAPACITOR 8 CONFIGURATION UTUH (`capacitor.config.ts`)

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.makassar.kaoskami',
  appName: 'Kaos Kami',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'kaos-kami-3d.hengkisetiawan461.workers.dev',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#0E0E10',
    minWebViewVersion: 80,
    adjustMarginsForEdgeToEdge: 'auto', // Enforced edge-to-edge Android 15/16
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#0E0E10',
    scrollEnabled: false, // Hilangkan rubber-band scroll web untuk sensasi 100% native
    allowsLinkPreview: false,
    scheme: 'kaoskami',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: false, // Dikontrol manual via SplashManager setelah font & GPU warm-up
      backgroundColor: '#0E0E10',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0E0E10',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    CapacitorHttp: {
      enabled: true, // Native network stack bypasses CORS
    },
    LiveUpdate: {
      appId: 'kaos-kami-mobile',
      autoUpdateMethod: 'background',
    },
  },
};

export default config;
```

---

## 3. NEXT.JS STATIC EXPORT FOR MOBILE (`next.config.mobile.mjs`)

```javascript
// next.config.mobile.mjs
/** @type {import('next').NextConfig} */
const nextMobileConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true, // Wajib untuk export statis
  },
  trailingSlash: true, // Kompatibilitas iOS file:/// dan custom capacitor:// scheme
  assetPrefix: './',   // Menjamin resource lokal ter-load di Android & iOS filesystem
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'zustand',
      'clsx',
      'tailwind-merge',
    ],
  },
  env: {
    NEXT_PUBLIC_BUILD_TARGET: 'mobile',
    NEXT_PUBLIC_API_URL: 'https://kaos-kami-3d.hengkisetiawan461.workers.dev',
    NEXT_PUBLIC_CDN_URL: 'https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev',
    NEXT_PUBLIC_DUITKU_ENV: 'production',
  },
};

export default nextMobileConfig;
```

---

## 4. NATIVE ANDROID MANIFEST LENGKAP (`AndroidManifest.xml`)

File: `android/app/src/main/AndroidManifest.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="id.makassar.kaoskami">

    <!-- Izin Hardware & Jaringan -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Kamera Hardware Opsional (Aplikasi tetap jalan jika HP tidak ada kamera) -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.fingerprint" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:largeHeap="true"
        android:theme="@style/AppTheme.NoActionBarLaunch">

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

            <!-- Deep Link Skema Kustom (kaoskami://) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kaoskami" />
            </intent-filter>

            <!-- App Links Universal (https://kaoskami.makassar.id) -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="kaos-kami-3d.hengkisetiawan461.workers.dev" />
            </intent-filter>
        </activity>

        <!-- FileProvider untuk Output Kamera & Gambar Stiker Sablon -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

        <!-- Quick Settings Tile: Buka 3D Studio dari Notification Shade -->
        <service
            android:name=".QuickStudioTileService"
            android:icon="@drawable/ic_stat_tshirt"
            android:label="Studio 3D"
            android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.quicksettings.action.QS_TILE" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

File: `android/app/src/main/res/xml/file_paths.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="Android/data/id.makassar.kaoskami/files/Pictures" />
    <cache-path name="cache_images" path="." />
    <files-path name="files_images" path="." />
</paths>
```

---

## 5. NATIVE IOS CONFIGURATION UTUH (`Info.plist`)

File: `ios/App/App/Info.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>id</string>
    <key>CFBundleDisplayName</key>
    <string>Kaos Kami</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>

    <!-- Deskripsi Izin Privasi Resmi -->
    <key>NSCameraUsageDescription</key>
    <string>Kaos Kami membutuhkan akses kamera untuk fitur AR Virtual Try-On dan mengambil foto logo sablon DTF Anda.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Kaos Kami membutuhkan akses galeri foto untuk memilih gambar stiker sablon berkualitas tinggi.</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Kaos Kami akan menyimpan gambar mockup 3D beresolusi tinggi ke galeri foto Anda.</string>
    <key>NSFaceIDUsageDescription</key>
    <string>Gunakan Face ID untuk masuk ke akun Kaos Kami secara cepat dan aman.</string>

    <!-- Background Modes untuk Order Tracking -->
    <key>UIBackgroundModes</key>
    <array>
        <string>remote-notification</string>
        <string>fetch</string>
    </array>

    <!-- Deep Link Custom Scheme (kaoskami://) -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>id.makassar.kaoskami</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>kaoskami</string>
            </array>
        </dict>
    </array>

    <!-- Associated Domains untuk Universal Link -->
    <key>AssociatedDomains</key>
    <array>
        <string>applinks:kaos-kami-3d.hengkisetiawan461.workers.dev</string>
    </array>

    <key>NSSupportsLiveActivities</key>
    <true/>
</dict>
</plist>
```

---

## 6. NATIVE GRADLE BUILD CONFIGURATION UTUH (`build.gradle`)

File: `android/app/build.gradle`
```gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'

android {
    namespace "id.makassar.kaoskami"
    compileSdkVersion 35

    defaultConfig {
        applicationId "id.makassar.kaoskami"
        minSdkVersion 24
        targetSdkVersion 35
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"

        // Kurangi ukuran APK dengan filter ABI 64-bit modern
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86_64'
        }

        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }

    buildFeatures {
        buildConfig true
    }

    packagingOptions {
        resources {
            excludes += ['META-INF/*', 'DebugProbesKt.bin']
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
    implementation "androidx.appcompat:appcompat:1.7.0"
    implementation "androidx.coordinatorlayout:coordinatorlayout:1.2.0"
    implementation "androidx.core:core-splashscreen:1.0.1"
    implementation "androidx.biometric:biometric:1.2.0-alpha05"
}
```

---

## 7. CENTRAL NATIVEBRIDGE DENGAN SAFE WEB FALLBACK UTUH

```typescript
// src/bridge/NativeBridge.ts
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';

export class NativeBridge {
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static getPlatform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  }

  // ==================== HAPTICS ====================
  static async hapticTap(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!this.isNative()) return;
    try {
      const styles = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styles[style] });
    } catch {}
  }

  static async hapticNotification(type: 'success' | 'warning' | 'error'): Promise<void> {
    if (!this.isNative()) return;
    try {
      const types = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: types[type] });
    } catch {}
  }

  // ==================== CAMERA / GALLERY ====================
  static async pickImage(): Promise<string | null> {
    if (this.isNative()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
          width: 4096, // Max clamp 4K
          correctOrientation: true,
        });
        return photo.webPath || null;
      } catch {
        return null;
      }
    }

    // Web Fallback: Native HTML file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/webp';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) resolve(URL.createObjectURL(file));
        else resolve(null);
      };
      input.click();
    });
  }

  // ==================== PERSISTENT STORAGE ====================
  static async getItem(key: string): Promise<string | null> {
    if (this.isNative()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (this.isNative()) {
      await Preferences.set({ key, value });
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  // ==================== SHARE ====================
  static async share(title: string, text: string, url: string): Promise<void> {
    if (this.isNative()) {
      await Share.share({ title, text, url, dialogTitle: 'Bagikan ke Teman' });
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
    }
  }
}
```

---

## 8. MATRIKS SKENARIO KEGAGALAN (EDGE CASE & FAILURE RECOVERY)

| Skenario Kegagalan | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Izin Kamera Ditolak Pengguna** | Gagal mengambil foto logo via kamera | Fallback ke galeri file input lokal via `pickImage()` | Tampilkan toast: *"Izin kamera tidak aktif. Membuka galeri foto..."* |
| **Koneksi Seluler Terputus Saat Buka App** | Request API katalog gagal | Load data katalog dari cache SQLite lokal (`cached_products`) | App langsung terbuka normal dengan banner kuning: *"Mode Offline aktif"*. |
| **HP Android Masuk Mode Hemat Baterai Ekstrem** | WebGL context ter-terminate oleh OS | Listener `webglcontextrestored` mengembalikan adegan secara otomatis | Layar tidak blank; 3D studio re-render mulus begitu disentuh. |
| **Deep Link Dibuka Saat App Masih Closed** | Routing Next.js belum ter-mount | Listener `appUrlOpen` menyimpan pending deep link di `sessionStorage` | App menyelesaikan cold start lalu otomatis diarahkan ke URL tujuan. |

---

## 9. ACCEPTANCE CRITERIA
- [ ] `npm run build:mobile` menghasilkan direktori `out/` tanpa error SSR.
- [ ] `npx cap sync android` menyalin aset web ke direktori native tanpa konflik berkas.
- [ ] Berkas `AndroidManifest.xml` memuat seluruh deklarasi izin, FileProvider, dan Intent Filters.
- [ ] Berkas `Info.plist` lolos verifikasi deskripsi privasi Apple tanpa penolakan App Store.
- [ ] `NativeBridge` berjalan transparan di emulator Android, simulator iOS, dan browser desktop.
