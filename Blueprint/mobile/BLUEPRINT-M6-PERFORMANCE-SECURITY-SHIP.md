# BLUEPRINT M6 — PERFORMANCE BUDGET, PROGUARD/R8 & CI/CD PIPELINE
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M2, M3, M4, M5
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 1. ANGGARAN PERFORMA MUTLAK (PERFORMANCE BUDGET)

Setiap build rilis aplikasi Kaos Kami wajib lolos audit batas performa berikut:

| Parameter Metrik | Batas Standar Produksi | Cara Pengukuran |
| :--- | :--- | :--- |
| **Ukuran Bundle Android (.aab)** | < 25 MB | `ls -lh android/app/build/outputs/bundle/release/` |
| **Ukuran Bundle iOS (.ipa)** | < 30 MB | Xcode Organizer Archive Report |
| **Cold Start ke Interaktif** | < 2.0 detik di Redmi Note 12 / Galaxy A14 | Android Profiler App Startup Metric |
| **Warm Start (Resume)** | < 400 ms | Background-to-Foreground duration |
| **Initial JS Bundle (Gzipped)** | < 400 KB | Next.js Build Output Analyzer |
| **Penggunaan RAM (3D Studio)** | < 380 MB | Chrome Remote DevTools / Android Studio Profiler |
| **Tingkat Bebas Crash** | > 99.5% | Sentry Native + Google Play Vitals |
| **Tingkat ANR (App Not Responding)** | < 0.35% | Google Play Console Android Vitals |

---

## 2. PROGUARD & R8 RULES UTUH — FILE: `android/app/proguard-rules.pro`

Untuk mencegah R8 salah membuang (*tree-shaking*) fungsi Three.js, R3F, SQLite, dan plugin Capacitor saat kompilasi rilis:

```proguard
# ==================== CAPACITOR CORE & PLUGINS ====================
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# ==================== ANDROID EDGE-TO-EDGE & SYSTEMBARS ====================
-keep class androidx.core.view.WindowInsetsCompat { *; }
-keep class androidx.core.view.WindowInsetsAnimationCompat { *; }

# ==================== SQLITE LOCAL DATABASE ====================
-keep class io.sqlc.** { *; }
-keep class com.getcapacitor.community.database.sqlite.** { *; }
-dontwarn io.sqlc.**

# ==================== BIOMETRIC AUTHENTICATION ====================
-keep class androidx.biometric.** { *; }
-dontwarn androidx.biometric.**

# ==================== THREE.JS & WEBKIT INTERFACES ====================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ==================== MLKIT BARCODE SCANNING ====================
-keep class com.google.mlkit.vision.barcode.** { *; }
-dontwarn com.google.mlkit.vision.barcode.**

# ==================== PRESERVE SENTRY LINE NUMBERS ====================
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
```

---

## 3. GITHUB ACTIONS AUTOMATED CI/CD PIPELINE

File: `.github/workflows/mobile-release.yml`
```yaml
name: Mobile Production CI/CD

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    name: Build & Sign Android AAB
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Node Dependencies
        run: npm ci

      - name: Build Next.js Static Export
        run: npm run build:mobile

      - name: Sync Capacitor Android
        run: npx cap sync android

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build Android App Bundle (Release)
        run: |
          cd android
          ./gradlew bundleRelease

      - name: Sign Android Release AAB
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: android/app/build/outputs/bundle/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEY_STORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Upload Signed AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: kaos-kami-release.aab
          path: android/app/build/outputs/bundle/release/*.aab

  build-ios:
    name: Build iOS IPA Release
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies & Build Web
        run: |
          npm ci
          npm run build:mobile
          npx cap sync ios

      - name: Build Xcode Archive
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath build/App.xcarchive CODE_SIGNING_ALLOWED=NO

      - name: Upload Xcode Archive Artifact
        uses: actions/upload-artifact@v4
        with:
          name: kaos-kami-ios.xcarchive
          path: ios/App/build/App.xcarchive
```

---

## 4. SENTRY MOBILE CRASH & ANR REPORTING

File: `src/lib/sentry.mobile.ts`
```typescript
import * as Sentry from '@sentry/nextjs';
import { NativeBridge } from '@/bridge/NativeBridge';

export function initializeMobileSentry() {
  if (!NativeBridge.isNative()) return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2, // 20% sample transaksi untuk menghemat baterai HP
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      // Hilangkan data sensitif pengguna sebelum dikirim
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    },
  });
}
```

---

## 5. MATRIKS UJI COBA 5 PERANGKAT FISIK (REAL-WORLD QA)

| Nama Perangkat | Chipset / GPU | RAM | Target Minimum FPS | Kriteria Kelulusan |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone 14 Pro / 15** | Apple A16/A17 Pro | 6GB | 60 FPS | Dynamic Island aktif, transisi spring 60 FPS |
| **Samsung Galaxy A54** | Exynos 1380 (Mali-G68) | 8GB | 45-60 FPS | On-mesh gizmo lancar, Safe Area pas |
| **Redmi Note 12 / 13** | Snapdragon 685 (Adreno 610) | 6GB | 30-40 FPS | Cold start < 2.0 detik, WebGL stabil |
| **Infinix Hot 30 / Smart 8** | Helio G88 (Mali-G52) | 4GB | 25-30 FPS | Render loop demand, suhu HP tidak overheat |
| **Google Pixel 6a** | Google Tensor (Mali-G78) | 6GB | 60 FPS | Edge-to-edge Android 15 berjalan sempurna |

---

## 6. GOOGLE PLAY STORE & APPLE APP STORE SUBMISSION PLAYBOOK

### A. Google Play Store (Android):
- [ ] **Target API Level:** Android 15 (API level 35) sesuai standar Google Play 2026.
- [ ] **Data Safety Form:** Deklarasikan nomor HP untuk autentikasi OTP WhatsApp dan nama/alamat untuk pengiriman sablon kaos Makassar.
- [ ] **Screenshots Resolusi Tinggi:** Minimal 4 screenshot (3D Studio, Katalog Heavyweight, Checkout Duitku Makassar, Pelacakan Produksi).
- [ ] **Privacy Policy:** Tautan aktif ke `https://kaos-kami-3d.hengkisetiawan461.workers.dev/privacy`.

### B. Apple App Store (iOS):
- [ ] **App Privacy Details:** Deklarasikan pengumpulan nama, nomor HP, dan akses galeri/kamera untuk stiker sablon.
- [ ] **App Icon:** 1024x1024 PNG tanpa alpha transparency channel.
- [ ] **TestFlight Staging:** Uji coba internal minimal 5 perangkat fisik sebelum pengajuan review publik.

---

## 7. ACCEPTANCE CRITERIA
- [ ] File rilis `.aab` berukuran di bawah 25 MB.
- [ ] R8 minify dan Proguard rules mengompresi kode tanpa memicu `ClassNotFoundException`.
- [ ] Pipeline GitHub Actions berhasil membangun bundle release secara otomatis pada git tag `v*`.
- [ ] Form Data Safety dan Privacy Policy siap diserahkan ke konsol pengembang.
- [ ] Pengujian di HP low-tier (Infinix/Redmi) menghasilkan tingkat crash-free > 99.5%.
