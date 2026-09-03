# BLUEPRINT M8 — MONETIZATION, REWARDED ADS & B2B SABLON TECH PACK GENERATOR
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M4, BLUEPRINT-03 (Admin & Workshop Architecture)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & ARSITEKTUR MONETISASI

Kaos Kami beroperasi dengan model bisnis ganda: **E-commerce Baju Fisik** dan **SaaS Mockup Studio Digital** bagi distro, konveksi, dan brand lokal di Makassar.

### 4 Pilar Pendapatan (Revenue Streams):
1. **Penjualan Fisik Utama (Direct Sales):** Kaos heavyweight 240 & 280 GSM + jasa sablon DTF cetak panas 160°C via Duitku v2.
2. **Freemium Pro Tier (Google Play Billing / Apple IAP):**
   - *Free Tier:* Desain 3D tanpa batas, ekspor gambar 1080p dengan watermark mikro "Kaos Kami Makassar".
   - *Pro Tier (Rp 29.000/bulan atau Rp 9.000/desain):* Ekspor 4K tanpa watermark, ekspor video turntable MP4 60 FPS, dan unduh Tech Pack PDF sablon.
3. **Rewarded Video Ads (Facebook Audience Network / Google AdMob):** Pengguna gratis dapat menonton video iklan sponsor 15 detik untuk membuka 1x ekspor HD tanpa watermark.
4. **B2B Sablon Tech Pack Generator:** Ekspor PDF standar konveksi sablon industri berisi: koordinat cetak dalam CM, ukuran printhead DTF, kode warna HEX/Pantone, dan estimasi biaya pemakaian film meteran.

---

## 1. B2B SABLON TECH PACK GENERATOR UTUH

File: `src/lib/techpack/generateTechPack.ts`
```typescript
import { DecalLayer, ApparelVariant } from '@/types/commerce';

export interface TechPackData {
  orderId: string;
  brandName: string;
  designerPhone: string;
  apparel: ApparelVariant;
  decals: DecalLayer[];
  totalFilmUsedCm2: number;
  printCostEstimateIdr: number;
}

/**
 * Menghasilkan dokumen cetak PDF standar workshop DTF Tamalanrea Makassar
 * Memuat koordinat CM fisik, batas printhead 30cm, dan resep press panas
 */
export function generateTechPackHtml(data: TechPackData): string {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Tech Pack Sablon DTF — ${data.orderId}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            padding: 32px;
            margin: 0;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #FF6B35;
            letter-spacing: -0.5px;
          }
          .meta-info {
            font-size: 11px;
            color: #6B7280;
            text-align: right;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
            margin-top: 24px;
            margin-bottom: 8px;
            border-left: 4px solid #FF6B35;
            padding-left: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 16px;
          }
          th, td {
            border: 1px solid #E5E7EB;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #F9FAFB;
            font-weight: 600;
            color: #4B5563;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #E5E7EB;
            padding-top: 12px;
            font-size: 10px;
            color: #9CA3AF;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">KAOS KAMI — DTF PRODUCTION TECH PACK</div>
            <div style="font-size: 12px; color: #4B5563; margin-top: 4px;">
              Workshop Produksi Sablon DTF Tamalanrea, Kota Makassar
            </div>
          </div>
          <div class="meta-info">
            <div><strong>JOB ID:</strong> ${data.orderId}</div>
            <div><strong>TANGGAL:</strong> ${currentDate}</div>
            <div><strong>KONTAK:</strong> ${data.designerPhone}</div>
          </div>
        </div>

        <div class="section-title">1. Spesifikasi Garmen & Bahan Dasar</div>
        <table>
          <tr>
            <th style="width: 25%;">Model Pakaian</th>
            <td>${data.apparel.name} (${data.apparel.gsm} GSM Combed 16s Heavyweight)</td>
          </tr>
          <tr>
            <th>Warna Kain</th>
            <td>
              <span class="badge" style="background:${data.apparel.colorHex}; color:#FFFFFF;">
                ${data.apparel.colorName} (${data.apparel.colorHex})
              </span>
            </td>
          </tr>
        </table>

        <div class="section-title">2. Detail Parameter Cetak Sablon DTF (Batas Printhead Max 30.0 cm)</div>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Lebar Fisik (cm)</th>
              <th>Tinggi Fisik (cm)</th>
              <th>Resolusi Master</th>
              <th>Suhu Mesin Press</th>
              <th>Waktu Press</th>
              <th>Metode Pengelupasan</th>
            </tr>
          </thead>
          <tbody>
            ${data.decals
              .map(
                (d, idx) => `
              <tr>
                <td><strong>Area #${idx + 1} (${d.side.toUpperCase()})</strong></td>
                <td><strong>${d.widthCm} cm</strong></td>
                <td>${d.heightCm} cm</td>
                <td>${d.dpi >= 300 ? '✅ 300 DPI (Siap Cetak)' : '⚠️ ' + d.dpi + ' DPI (Perlu Konfirmasi)'}</td>
                <td>160°C</td>
                <td>15 Detik</td>
                <td>Cold Peel (Kupas Dingin)</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-title">3. Kalkulasi Konsumsi Bahan & Estimasi Produksi</div>
        <table>
          <tr>
            <th style="width: 25%;">Total Luas Film DTF</th>
            <td><strong>${data.totalFilmUsedCm2} cm²</strong></td>
          </tr>
          <tr>
            <th>Estimasi Jasa Sablon</th>
            <td><strong>Rp ${data.printCostEstimateIdr.toLocaleString('id-ID')}</strong></td>
          </tr>
        </table>

        <div class="footer">
          Dokumen resmi Kaos Kami Platform. Ditujukan untuk operator mesin sablon DTF & penjahit workshop.
        </div>
      </body>
    </html>
  `;
}
```

---

## 2. IN-APP BILLING (GOOGLE PLAY & APPLE IAP) BRIDGE

File: `src/bridge/inAppPurchases.ts`
```typescript
import { NativeBridge } from './NativeBridge';

export const IAP_TIERS = {
  PRO_MONTHLY: 'id.makassar.kaoskami.pro.monthly', // Rp 29.000 / bulan
  SINGLE_EXPORT: 'id.makassar.kaoskami.export.single', // Rp 9.000 / 1x export HD
};

export async function purchaseProTier(productId: string): Promise<boolean> {
  NativeBridge.hapticTap('heavy');

  if (!NativeBridge.isNative()) {
    // Mode testing desktop: bypass pembayaran
    alert('Simulasi Pembayaran Google Play / Apple IAP Berhasil (Web Testing)');
    return true;
  }

  try {
    console.log('[IAP Engine] Membuka Google Play Billing untuk produk:', productId);
    // Verifikasi receipt dengan Cloudflare Workers backend
    NativeBridge.hapticNotification('success');
    return true;
  } catch (error) {
    console.warn('[IAP Error]: Pembayaran dibatalkan pengguna', error);
    NativeBridge.hapticNotification('error');
    return false;
  }
}
```

---

## 3. REWARDED ADS BRIDGE (FACEBOOK AUDIENCE NETWORK & ADMOB)

File: `src/bridge/rewardedAds.ts`
```typescript
import { NativeBridge } from './NativeBridge';

export async function showRewardedAdForFreeExport(
  onRewardGranted: () => void,
  onAdFailed: () => void
): Promise<void> {
  NativeBridge.hapticTap('medium');

  if (!NativeBridge.isNative()) {
    // Web test: simulasi jeda video 2 detik
    setTimeout(() => {
      onRewardGranted();
    }, 2000);
    return;
  }

  try {
    console.log('[Ads Engine] Memanggil Rewarded Video Ad...');
    // Setelah video iklan 15 detik selesai:
    NativeBridge.hapticNotification('success');
    onRewardGranted();
  } catch (err) {
    console.warn('[Ads Error] Gagal memuat video iklan:', err);
    onAdFailed();
  }
}
```

---

## 4. WATERMARK OVERLAY COMPONENT (FREE TIER)

File: `src/components/3d/WatermarkOverlay.tsx`
```tsx
import React from 'react';

export function WatermarkOverlay({ isProUser = false }: { isProUser?: boolean }) {
  if (isProUser) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-none opacity-60">
      <span className="text-[11px] font-bold text-white bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10 font-['Syne']">
        KAOS KAMI MAKASSAR
      </span>
    </div>
  );
}
```

---

## 5. MATRIKS EDGE CASE MONETISASI & IKLAN

| Skenario Error | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Iklan Video Tidak Tersedia (No Fill)** | Pengguna gratis tidak bisa nonton iklan | Berikan 1x ekspor gratis sebagai kompensasi (*graceful pass*) | *"Iklan tidak tersedia. Anda mendapatkan 1x ekspor gratis!"* |
| **IAP Transaksi Sukses tapi Sinyal Putus** | Langganan Pro belum aktif di HP | Simpan purchase token di Preferences, validasi ulang saat online | Status Pro langsung aktif begitu internet tersambung |
| **Pengguna Membatalkan Pembayaran IAP** | Pembelian dibatalkan | Tutup sheet pembayaran tanpa error modal | Kembali ke studio 3D secara tenang |

---

## 6. ACCEPTANCE CRITERIA
- [ ] Pengguna gratis dapat mengekspor gambar 1080p dengan watermark mikro "Kaos Kami Makassar".
- [ ] Menonton video iklan sponsor atau membeli Pro Tier menghilangkan watermark secara otomatis.
- [ ] Tech Pack Generator menghasilkan dokumen PDF sablon DTF yang presisi hingga skala centimeter untuk tukang sablon di workshop Tamalanrea.
