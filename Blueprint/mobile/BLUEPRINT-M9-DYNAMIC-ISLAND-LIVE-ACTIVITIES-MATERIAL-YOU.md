# BLUEPRINT M9 — DYNAMIC ISLAND LIVE ACTIVITIES & ANDROID MATERIAL YOU
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M2, M4, BLUEPRINT-03 (Kanban Workshop)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & FITUR HARDWARE SPESIFIK OS

Untuk menciptakan reputasi aplikasi streetwear kelas atas dan tidak terkesan seperti "website yang dibungkus webview", Kaos Kami memanfaatkan fitur terdalam dari iOS dan Android:

1. **iOS Live Activities & Dynamic Island (ActivityKit):** Pengguna iPhone 14 Pro/15/16/17 dapat melihat progres sablon DTF mereka secara real-time langsung di "pulau hitam" Dynamic Island dan Lock Screen, tanpa harus membuka aplikasi!
2. **Android Quick Settings Tile:** Menambahkan shortcut cepat di panel notifikasi Android (*pull-down tile*) berlogo Kaos Kami untuk langsung melompat ke Studio 3D dalam 1 ketukan.
3. **Material You Dynamic Theming:** Di Android 12 ke atas, aksen warna aplikasi dapat beradaptasi secara elegan dengan palet warna wallpaper pengguna.

---

## 1. IOS LIVE ACTIVITIES & DYNAMIC ISLAND SPECIFICATION

### A. Swift Widget: `ios/App/App/OrderTrackingLiveActivity.swift`
```swift
import ActivityKit
import WidgetKit
import SwiftUI

public struct OrderTrackingAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var statusText: String      // "Cetak Sablon DTF", "Press Panas 160°C", "Kurir Maxim OTW"
    public var progress: Double        // 0.0 s/d 1.0
    public var estimatedArrival: String // "15 Menit" atau "Siap Diambil"
  }

  public var orderId: String
  public var apparelName: String
}

@available(iOS 16.2, *)
struct OrderTrackingWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: OrderTrackingAttributes.self) { context in
      // Lock Screen Live Activity Banner
      HStack(spacing: 14) {
        ZStack {
          Circle()
            .fill(Color(hex: "#FF6B35").opacity(0.15))
            .frame(width: 44, height: 44)
          Image(systemName: "tshirt.fill")
            .font(.system(size: 20))
            .foregroundColor(Color(hex: "#FF6B35"))
        }
        
        VStack(alignment: .leading, spacing: 3) {
          Text(context.attributes.apparelName)
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
          Text(context.state.statusText)
            .font(.system(size: 12))
            .foregroundColor(.gray)
        }
        
        Spacer()
        
        VStack(alignment: .trailing, spacing: 3) {
          Text(context.state.estimatedArrival)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(hex: "#FF6B35"))
          Text("\(Int(context.state.progress * 100))%")
            .font(.system(size: 10))
            .foregroundColor(.gray)
        }
      }
      .padding(16)
      .background(Color(hex: "#0E0E10"))
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded View saat Dynamic Island ditekan lama
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: "flame.fill")
              .foregroundColor(Color(hex: "#FF6B35"))
            Text("Kaos Kami")
              .font(.caption2)
              .bold()
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.estimatedArrival)
            .font(.caption)
            .foregroundColor(Color(hex: "#FF6B35"))
            .bold()
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 4) {
            HStack {
              Text(context.state.statusText)
                .font(.caption)
                .foregroundColor(.white)
              Spacer()
              Text("\(Int(context.state.progress * 100))%")
                .font(.caption2)
                .foregroundColor(.gray)
            }
            ProgressView(value: context.state.progress)
              .tint(Color(hex: "#FF6B35"))
          }
          .padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: "tshirt.fill")
          .foregroundColor(Color(hex: "#FF6B35"))
      } compactTrailing: {
        Text("\(Int(context.state.progress * 100))%")
          .font(.caption2)
          .foregroundColor(Color(hex: "#FF6B35"))
          .bold()
      } minimal: {
        Image(systemName: "tshirt.fill")
          .foregroundColor(Color(hex: "#FF6B35"))
      }
    }
  }
}

// Ekstensi Warna Hex untuk SwiftUI
extension Color {
  init(hex: String) {
    let scanner = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)
    let r = Double((rgb >> 16) & 0xFF) / 255.0
    let g = Double((rgb >> 8) & 0xFF) / 255.0
    let b = Double(rgb & 0xFF) / 255.0
    self.init(red: r, green: g, blue: b)
  }
}
```

---

## 2. ANDROID QUICK SETTINGS TILE LENGKAP

### A. Kotlin Service: `android/app/src/main/java/id/makassar/kaoskami/QuickStudioTileService.kt`
```kotlin
package id.makassar.kaoskami

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import androidx.annotation.RequiresApi

@RequiresApi(Build.VERSION_CODES.N)
class QuickStudioTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        val tile = qsTile ?: return
        tile.state = Tile.STATE_ACTIVE
        tile.label = "Studio 3D"
        tile.updateTile()
    }

    override fun onClick() {
        super.onClick()
        
        // Membuka aplikasi langsung ke halaman 3D Studio melalui Deep Link
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = Uri.parse("kaoskami://studio")
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(intent)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
```

---

## 3. HOOK REACT PENGENDALI LIVE ACTIVITIES DARI JAVASCRIPT

File: `src/hooks/useOrderLiveActivity.ts`
```typescript
'use client';

import { useEffect } from 'react';
import { NativeBridge } from '@/bridge/NativeBridge';

export interface OrderProgressUpdate {
  orderId: string;
  apparelName: string;
  statusText: string;
  progress: number;
  estimatedArrival: string;
}

export function useOrderLiveActivity(orderData?: OrderProgressUpdate) {
  useEffect(() => {
    if (!NativeBridge.isNative() || NativeBridge.getPlatform() !== 'ios' || !orderData) {
      return;
    }

    console.log('[LiveActivity] Memperbarui status Dynamic Island untuk:', orderData.orderId);
    // Di sini kita trigger native plugin update status
  }, [orderData]);
}
```

---

## 4. MATRIKS EDGE CASE HARDWARE UI

| Skenario Error | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **iPhone Tanpa Dynamic Island (Contoh: iPhone 11/12/13)** | Dynamic Island tidak tersedia | Otomatis tampil sebagai Lock Screen Banner standar iOS | Notifikasi tetap terlihat rapi di layar kunci |
| **User Menghapus Tile dari Quick Settings** | Shortcut hilang | Tile tetap terdaftar di daftar tile Android yang bisa ditarik kembali | Tidak mengganggu fungsi aplikasi utama |
| **Pesanan Sudah Selesai Diambil** | Live Activity masih menggantung di Dynamic Island | Kirim event pembatalan `Activity.end()` otomatis dari backend | Dynamic Island menutup otomatis dengan bersih |

---

## 5. ACCEPTANCE CRITERIA
- [ ] Di iPhone 14 Pro ke atas, status produksi sablon (Cetak $\rightarrow$ Press Panas $\rightarrow$ Packing $\rightarrow$ Maxim OTW) tampil di Dynamic Island.
- [ ] Pengguna Android dapat menambahkan icon "Studio 3D" ke Quick Settings drawer di status bar.
- [ ] Menekan Quick Settings tile langsung membuka aplikasi dan mendarat di halaman 3D Studio (`/studio`).
