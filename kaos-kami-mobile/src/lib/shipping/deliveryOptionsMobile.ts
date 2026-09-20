export interface DeliveryOption {
  id: 'WORKSHOP_PICKUP' | 'FREE_MAKASSAR' | 'EXPEDITION';
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  badge?: string;
}

export interface WorkshopLocation {
  name: string;
  address: string;
  road: string;
  suburb: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  operatingHours: string;
}

/**
 * Single Source of Truth (SSOT) Titik Workshop Kaos Kami
 * Koordinat: -5.106018313739206, 119.43239633333334
 * Lokasi: Jl. Galangan Kapal, Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Kota Makassar 90211
 */
export const WORKSHOP_LOCATION: WorkshopLocation = {
  name: "Workshop Kaos Kami Makassar",
  address: "Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211",
  road: "Jalan Galangan Kapal, Lorong Permandian 1",
  suburb: "Kaluku Bodoa",
  district: "Tallo",
  city: "Kota Makassar",
  province: "Sulawesi Selatan",
  postalCode: "90211",
  lat: -5.106018313739206,
  lng: 119.43239633333334,
  googleMapsUrl: "https://www.google.com/maps?q=-5.106018313739206,119.43239633333334",
  operatingHours: "Setiap Hari 09:00 - 21:00 WITA",
};

export type TurnaroundTier = "REGULER" | "EXPRESS_24H";

export interface ProductionTurnaroundOption {
  tier: TurnaroundTier;
  label: string;
  description: string;
  surchargeIdr: number;
  badge: string;
}

export const PRODUCTION_TURNAROUND_OPTIONS: ProductionTurnaroundOption[] = [
  {
    tier: "REGULER",
    label: "Produksi Reguler (2-3 Hari)",
    description: "Antrean standar workshop. Selesai sablon & curing 2-3 hari kerja.",
    surchargeIdr: 0,
    badge: "Standar (Rp 0)",
  },
  {
    tier: "EXPRESS_24H",
    label: "⚡ Express Kilat 24 Jam",
    description: "Prioritas antrean cetak DTF pertama. Selesai siap kirim/ambil 24 jam.",
    surchargeIdr: 25000,
    badge: "+Rp 25.000",
  },
];

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
    description: 'Jl. Galangan Kapal, Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Makassar 90211',
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
    price: 0,
    estimatedTime: '2 - 4 Hari (tergantung kota)',
    badge: 'Cek ongkir — menghitung…',
  },
];

