# ==============================================================================
# KAOS KAMI MOBILE — ENTERPRISE PROGUARD & R8 PRODUCTION RULES
# ==============================================================================

# 1. Preserve Capacitor Core and Native Plugin Interfaces
-keep public class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# 2. Preserve WebView JavaScript Interfaces for Native Bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 3. Preserve AndroidX Biometric Prompt Classes
-keep class androidx.biometric.** { *; }
-dontwarn androidx.biometric.**

# 4. Preserve Three.js and WebGL Canvas Hardware Acceleration
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# 5. Suppress Unused Warnings
-dontwarn com.google.android.gms.**
-dontwarn okhttp3.**
-dontwarn okio.**

# 6. MLKit Barcode Scanning
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# 7. Sentry (aktif saat @sentry/capacitor + DSN dipasang — siapkan Data Safety)
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**
