# BLUEPRINT M4 — COMMERCE FLOW MOBILE, DUITKU POP & MAKASSAR LOGISTICS
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M2, BLUEPRINT-01 (E-Commerce Core), BLUEPRINT-05 (Duitku v2 Official Migration)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & ARSITEKTUR PEMBAYARAN DUITKU v2

Kaos Kami telah **resmi 100% bermigrasi ke Duitku Payment Gateway API v2** (Merchant Code: `DS28521`). Seluruh transaksi pemesanan kaos streetwear dan sablon DTF diproses melalui gateway Duitku dengan biaya transaksi QRIS & Virtual Account yang jauh lebih hemat bagi UMKM.

### 4 Pilar Transaksi Mobile Kaos Kami:
1. **Duitku Pop Modal & Direct Checkout (`duitku.js`):**
   - Di mobile app Capacitor, pembayaran dipanggil via `(window as any).checkout.process(reference, callbackHandlers)`.
   - Jika terjadi kendala pada script Pop Modal, sistem otomatis mengalihkan pengguna ke In-App Browser (`@capacitor/browser`) membuka `paymentUrl` resmi Duitku (`passport.duitku.com/topup/topupdirectv2.aspx?ref=...`).
2. **Intersepsi E-Wallet & QRIS Indonesia:**
   - Mendukung QRIS interaktif (ShopeePay, GoPay, OVO, DANA, BCA QRIS, LinkAja) serta Virtual Account (BCA, Mandiri, BNI, BRI, Permata).
   - Skema URL native e-wallet diintersepsi agar pengguna dapat langsung membuka aplikasi mobile perbankan/e-wallet asli di HP mereka.
3. **Logistik Hyperlocal Khas Makassar:**
   - **Ambil di Workshop (Tamalanrea):** Bebas ongkir (Rp 0).
   - **Kurir Instan Maxim COD (Makassar):** Ongkir dibayar tunai langsung ke abang driver Maxim saat kaos tiba di lokasi.
   - **Flat Rate Se-Makassar:** Rp 15.000 via kurir internal Kaos Kami.
   - **J&T / JNE:** Untuk pengiriman ke luar kota (Gowa, Maros, Bone, Palopo, hingga luar pulau).
4. **WhatsApp Fail-Safe Notification (Fonnte):**
   - Pengiriman invoice otomatis ke nomor WhatsApp pelanggan dijalankan di latar belakang dengan *try/catch safety guard* agar kegagalan jaringan telko tidak pernah menggagalkan proses checkout.

---

## 1. DATA MODELS & VALIDASI SKEMA ZOD

File: `src/types/commerce.ts`
```typescript
import { z } from 'zod';

export const DecalLayerSchema = z.object({
  id: z.string(),
  imageUrl: z.string().url(),
  positionX: z.number(),
  positionY: z.number(),
  scale: z.number().min(0.05).max(1.0),
  rotation: z.number(),
  side: z.enum(['front', 'back', 'left', 'right']),
  widthCm: z.number().max(30.0), // Enforced DTF Printhead Limit 30cm
  heightCm: z.number(),
  dpi: z.number(),
  pricePerCm2: z.number().default(25), // Rp 25 per cm2
});

export type DecalLayer = z.infer<typeof DecalLayerSchema>;

export interface ApparelVariant {
  id: string;
  name: string;
  sku: string;
  gsm: 240 | 280;
  colorName: string;
  colorHex: string;
  basePrice: number;
  stockQty: number;
  model3DPath: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  variant: ApparelVariant;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  decals: DecalLayer[];
  customPrintPrice: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail3D?: string; // Base64 preview snapshot
}

export type DeliveryMethod =
  | 'WORKSHOP_PICKUP'    // Rp 0 (Workshop Tamalanrea)
  | 'MAXIM_INSTANT_COD'  // Bayar ongkir langsung ke kurir Maxim
  | 'FLAT_RATE_MAKASSAR' // Rp 15.000 flat rate se-Makassar
  | 'EXPEDITION_JNT';    // J&T Express luar kota

export const MAKASSAR_DISTRICTS = [
  'Tamalanrea',
  'Biringkanaya',
  'Panakkukang',
  'Manggala',
  'Rappocini',
  'Tamalate',
  'Mamajang',
  'Mariso',
  'Makassar',
  'Ujung Pandang',
  'Wajo',
  'Bontoala',
  'Tallo',
  'Ujung Tanah',
  'Kepulauan Sangkarrang',
] as const;
```

---

## 2. OPTIMISTIC CART STORE (ZUSTAND 4)

File: `src/store/useCartStore.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types/commerce';
import { NativeBridge } from '@/bridge/NativeBridge';

interface CartState {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      totalItems: 0,

      addItem: (newItem) => {
        NativeBridge.hapticNotification('success');
        const currentItems = get().items;
        const existingIdx = currentItems.findIndex((it) => it.id === newItem.id);

        let updated: CartItem[];
        if (existingIdx > -1) {
          updated = currentItems.map((it, idx) =>
            idx === existingIdx
              ? {
                  ...it,
                  quantity: it.quantity + newItem.quantity,
                  totalPrice: (it.quantity + newItem.quantity) * it.unitPrice,
                }
              : it
          );
        } else {
          updated = [...currentItems, newItem];
        }

        const subtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
        const totalItems = updated.reduce((sum, it) => sum + it.quantity, 0);
        set({ items: updated, subtotal, totalItems });
      },

      removeItem: (id) => {
        NativeBridge.hapticTap('medium');
        const updated = get().items.filter((it) => it.id !== id);
        const subtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
        const totalItems = updated.reduce((sum, it) => sum + it.quantity, 0);
        set({ items: updated, subtotal, totalItems });
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        NativeBridge.hapticTap('light');
        const updated = get().items.map((it) =>
          it.id === id ? { ...it, quantity: qty, totalPrice: qty * it.unitPrice } : it
        );
        const subtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
        const totalItems = updated.reduce((sum, it) => sum + it.quantity, 0);
        set({ items: updated, subtotal, totalItems });
      },

      clearCart: () => {
        set({ items: [], subtotal: 0, totalItems: 0 });
      },
    }),
    {
      name: 'kaoskami_mobile_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

## 3. DUITKU v2 MOBILE PAYMENT BRIDGE LENGKAP

File: `src/bridge/payment.ts`
```typescript
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { NativeBridge } from './NativeBridge';

export interface DuitkuCheckoutResponse {
  orderId: string;
  orderNumber: string;
  reference: string;
  paymentUrl: string;
  invoiceUrl: string;
  vaNumber?: string;
  qrString?: string;
}

/**
 * Eksekusi pembayaran Duitku di aplikasi mobile:
 * 1. Coba gunakan Duitku Pop Modal JS jika tersedia di window
 * 2. Fallback ke Capacitor In-App Browser jika Pop Modal terhambat
 */
export async function processDuitkuPayment(
  paymentData: DuitkuCheckoutResponse,
  onStatusChange: (status: 'success' | 'pending' | 'error' | 'closed') => void
) {
  NativeBridge.hapticTap('heavy');

  // Opsi 1: Duitku Pop Modal (Sesuai implementasi CheckoutModal.tsx)
  if (typeof window !== 'undefined' && (window as any).checkout && paymentData.reference) {
    try {
      (window as any).checkout.process(paymentData.reference, {
        defaultLanguage: 'id',
        successEvent: () => {
          NativeBridge.hapticNotification('success');
          onStatusChange('success');
        },
        pendingEvent: () => {
          NativeBridge.hapticNotification('warning');
          onStatusChange('pending');
        },
        errorEvent: () => {
          NativeBridge.hapticNotification('error');
          onStatusChange('error');
        },
        closeEvent: () => {
          onStatusChange('closed');
        },
      });
      return;
    } catch (err) {
      console.warn('[Duitku Pop Error]: Fallback ke In-App Browser', err);
    }
  }

  // Opsi 2: Fallback ke In-App Browser resmi Duitku
  if (paymentData.paymentUrl && !paymentData.paymentUrl.includes('mock')) {
    await Browser.open({
      url: paymentData.paymentUrl,
      presentationStyle: 'popover',
      toolbarColor: '#0E0E10',
    });

    // Listener saat pengguna kembali via deep link kaoskami://payment/callback
    const appListener = App.addListener('appUrlOpen', (event) => {
      if (event.url.startsWith('kaoskami://payment')) {
        Browser.close();
        appListener.then((handle) => handle.remove());
        NativeBridge.hapticNotification('success');
        onStatusChange('success');
      }
    });

    Browser.addListener('browserFinished', () => {
      onStatusChange('closed');
    });
  } else {
    // Fallback terakhir: Buka invoice web order
    window.location.href = paymentData.invoiceUrl || `/orders/${paymentData.orderId}`;
  }
}
```

---

## 4. CHECKOUT SHEET 3-LANGKAH KHUSUS MAKASSAR

File: `src/components/checkout/CheckoutSheetMobile.tsx`
```tsx
'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/ui/BottomSheet';
import { HapticButton } from '@/ui/HapticButton';
import { MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { processDuitkuPayment, DuitkuCheckoutResponse } from '@/bridge/payment';
import { MAKASSAR_DISTRICTS } from '@/types/commerce';

export function CheckoutSheetMobile({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('FLAT_RATE_MAKASSAR');
  const [district, setDistrict] = useState<string>('Tamalanrea');
  const [loading, setLoading] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const { subtotal, items, clearCart } = useCartStore();

  const shippingCost = deliveryMethod === 'FLAT_RATE_MAKASSAR' ? 15000 : 0;
  const grandTotal = subtotal + shippingCost;

  const handlePay = async () => {
    setLoading(true);
    try {
      // 1. Panggil API Checkout Duitku v2 yang sudah ada di /api/checkout
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          phone,
          district,
          deliveryMethod,
          addressLine: address,
          items: items.map((it) => ({
            variantId: it.variantId,
            apparelSlug: it.variant.name.toLowerCase().includes('hoodie') ? 'hoodie' : 'tshirt',
            size: it.size,
            colorName: it.variant.colorName,
            colorHex: it.variant.colorHex,
            quantity: it.quantity,
            unitPriceIdr: it.unitPrice,
            lineTotalIdr: it.totalPrice,
          })),
        }),
      });

      const data: DuitkuCheckoutResponse = await res.json();

      // 2. Eksekusi Pembayaran Duitku Pop / In-App Browser
      await processDuitkuPayment(data, (status) => {
        setLoading(false);
        if (status === 'success') {
          clearCart();
          setStep(3); // Tampilkan Layar Sukses
        }
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} snapPoints={['90%']}>
      <div className="flex flex-col h-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <span className={`text-xs font-semibold ${step >= 1 ? 'text-[#FF6B35]' : 'text-zinc-500'}`}>1. Alamat</span>
          <div className="h-0.5 w-8 bg-zinc-800" />
          <span className={`text-xs font-semibold ${step >= 2 ? 'text-[#FF6B35]' : 'text-zinc-500'}`}>2. Kurir Makassar</span>
          <div className="h-0.5 w-8 bg-zinc-800" />
          <span className={`text-xs font-semibold ${step === 3 ? 'text-emerald-500' : 'text-zinc-500'}`}>3. Bayar</span>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white font-['Syne'] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B35]" /> Alamat Pengiriman
              </h3>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nama Penerima"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B35]"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nomor WhatsApp (+62)"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B35]"
              />
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-sm text-white focus:outline-none focus:border-[#FF6B35]"
              >
                {MAKASSAR_DISTRICTS.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900 text-white">
                    Kecamatan {d}
                  </option>
                ))}
              </select>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat Lengkap (Contoh: Jl. Perintis Kemerdekaan KM 10)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B35]"
              />
              <HapticButton
                variant="primary"
                disabled={!recipientName || !phone}
                onClick={() => setStep(2)}
                className="w-full mt-2"
              >
                Lanjut ke Opsi Pengiriman
              </HapticButton>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white font-['Syne'] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#FF6B35]" /> Pilih Metode Pengiriman
              </h3>
              {[
                { id: 'WORKSHOP_PICKUP', name: 'Ambil Sendiri di Workshop (Tamalanrea)', price: 'Rp 0', desc: 'Bebas ongkir, siap diambil saat sablon selesai' },
                { id: 'FLAT_RATE_MAKASSAR', name: 'Flat Rate Se-Kota Makassar', price: 'Rp 15.000', desc: 'Kurir internal Kaos Kami langsung ke pintu rumah' },
                { id: 'MAXIM_INSTANT_COD', name: 'Kurir Instan Maxim COD', price: 'Tarif Maxim', desc: 'Ongkos kirim dibayarkan ke kurir Maxim saat kaos tiba' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setDeliveryMethod(opt.id)}
                  className={`p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    deliveryMethod === opt.id ? 'border-[#FF6B35] bg-[#FF6B35]/10' : 'border-zinc-800 bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{opt.name}</span>
                    <span className="text-xs font-bold text-[#FF6B35]">{opt.price}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{opt.desc}</p>
                </div>
              ))}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Total Pembayaran</span>
                <span className="text-base font-bold text-[#FF6B35] font-['Syne']">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>

              <HapticButton variant="primary" loading={loading} onClick={handlePay} className="w-full">
                Bayar Sekarang via Duitku (QRIS / VA)
              </HapticButton>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-white font-['Syne']">Pesanan Berhasil Dibuat!</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Notifikasi bukti pembayaran & invoice sablon DTF telah dikirimkan ke WhatsApp Anda via Duitku Gateway.
              </p>
              <HapticButton variant="secondary" onClick={() => onOpenChange(false)} className="w-full mt-4">
                Lihat Status di Tab Pesanan
              </HapticButton>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
```

---

## 5. MATRIKS SKENARIO KEGAGALAN TRANSAKSI (PAYMENT EDGE CASES)

| Masalah Transaksi | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Duitku Pop Modal Terblokir Browser** | Pop-up tidak muncul di HP Android tertentu | Deteksi blokir via catch block, otomatis buka `Browser.open(paymentUrl)` | Pengguna tetap diarahkan ke halaman bayar tanpa error |
| **Pengguna Menutup Pop-up Sebelum Bayar** | Transaksi berstatus `PENDING_PAYMENT` | Callback `closeEvent` mengarahkan pengguna ke halaman rincian pesanan | Pesanan tetap tersimpan, ada tombol *"Lanjutkan Pembayaran"* |
| **Sinyal Putus Saat Bayar QRIS** | Status di HP belum ter-refresh | Webhook Duitku di server tetap memproses dan memicu notifikasi WhatsApp | Pengguna menerima pesan WA: *"Pembayaran Anda telah kami terima!"* |
| **Alamat Di Luar Kota Makassar** | Pilihan kurir lokal tidak valid | Validasi form memandu pengguna memilih ekspedisi reguler J&T | Estimasi ongkir antar-kota terhitung otomatis |

---

## 6. ACCEPTANCE CRITERIA
- [ ] Seluruh transaksi diproses melalui gateway resmi Duitku v2 (`DS28521`).
- [ ] Duitku Pop Modal berjalan mulus di dalam WebView mobile dengan fallback ke In-App Browser jika diperlukan.
- [ ] Webhook Duitku `/api/webhooks/duitku` berhasil memverifikasi tanda tangan MD5 dan mengonfirmasi pelunasan pesanan secara otomatis.
- [ ] Opsi pengiriman khas Makassar (Workshop Tamalanrea Rp 0, Maxim COD, Flat Rate Rp 15.000) terhitung akurat pada total pembayaran.
- [ ] Keranjang belanja tersimpan secara instan di local storage dan tidak hilang saat restart app.
