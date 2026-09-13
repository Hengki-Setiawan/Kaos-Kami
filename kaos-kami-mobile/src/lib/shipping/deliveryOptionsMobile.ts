export interface DeliveryOption {
  id: 'WORKSHOP_PICKUP' | 'FREE_MAKASSAR' | 'EXPEDITION';
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  badge?: string;
}

/**
 * Whitelist kecamatan se-Kota Makassar untuk FREE_MAKASSAR — CERMINAN (bukan
 * hardcode baru) dari `kaos-kami-web/src/lib/shipping/deliveryOptions.ts`
 * (`MAKASSAR_SUBDISTRICTS`). Server menolak district di luar daftar ini (400),
 * jadi pengiriman dari sini WAJIB salah satunya. Bila web menambah kecamatan,
 * daftar ini WAJIB disamakan manual.
 */
export const MAKASSAR_SUBDISTRICTS: string[] = [
  'Tamalanrea',
  'Biringkanaya',
  'Panakkukang',
  'Rappocini',
  'Makassar',
  'Manggala',
  'Mariso',
  'Mamajang',
  'Ujung Pandang',
  'Wajo',
  'Bontoala',
  'Tallo',
  'Tamalate',
  'Kepulauan Sangkarrang',
];

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'WORKSHOP_PICKUP',
    name: 'Ambil di Workshop (Tallo)',
    description: 'Jl. Galangan Kapal Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Makassar',
    price: 0,
    estimatedTime: 'Siap diambil setelah QC',
    badge: 'Gratis Rp 0',
  },
  {
    id: 'FREE_MAKASSAR',
    name: 'Diantar Tim Kaos Kami — Gratis Makassar',
    description: 'Tim kami antar langsung ke alamatmu di Kota Makassar, gratis (1-2 hari setelah produksi)',
    price: 0,
    estimatedTime: '1 - 2 Hari setelah selesai sablon',
    badge: 'Gratis Rp 0',
  },
  {
    id: 'EXPEDITION',
    name: 'Ekspedisi Luar Kota (JNE / J&T)',
    description: 'Pilih kurir termurah sesuai kotamu. Ongkir final dihitung server.',
    // HARGA JUJUR (audit HIGH): JANGAN hardcode Rp 25.000 sebagai tarif.
    // price=0 = "belum ada quote"; UI wajib tampilkan "menghitung…" +
    // blokir submit sampai quote server dipilih (lihat CheckoutSheet).
    price: 0,
    estimatedTime: '2 - 4 Hari (tergantung kota)',
    badge: 'Cek ongkir — menghitung…',
  },
];
