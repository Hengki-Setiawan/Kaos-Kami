// Lunas-dulu via QRIS (keputusan owner Sep 2026): TANPA COD & TANPA kurir instan.
// Opsi: PICKUP • antar tim GRATIS khusus se-Kota Makassar • ekspedisi luar kota.
export type DeliveryMethod = "PICKUP" | "FREE_MAKASSAR" | "EXPEDITION_MANUAL";

export interface DeliveryOption {
  method: DeliveryMethod;
  name: string;
  description: string;
  costIdr: number;
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

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    method: "PICKUP",
    name: "Ambil di Workshop Kaos Kami (Tallo) — Rp 0",
    description: "Ambil langsung di workshop Kaos Kami (Jl. Galangan Kapal, Lrg. Permandian 1, Tallo) setelah sablon selesai (Gratis).",
    costIdr: 0,
  },
  {
    method: "FREE_MAKASSAR",
    name: "Diantar Tim Kaos Kami — Gratis se-Kota Makassar (Rp 0)",
    description: "Tim kami antar langsung ke alamatmu di Kota Makassar, gratis tanpa minimal belanja (1-2 hari setelah produksi).",
    costIdr: 0,
  },
  {
    method: "EXPEDITION_MANUAL",
    name: "Ekspedisi Luar Kota (JNE / J&T / SiCepat)",
    description: "Pengiriman khusus luar Kota Makassar. Resi ekspedisi diinput setelah paket dikirim.",
    // HARGA JUJUR (audit HIGH): JANGAN hardcode tarif sebagai angka (dulu
    // Rp 25.000 placeholder menyesatkan). costIdr=0 = "belum ada quote";
    // UI pemakai (CheckoutModal) WAJIB tampilkan "menghitung…" + blokir submit
    // sampai quote server dipilih (server resolve live AgenWebsite → fallback
    // tabel zona). Paritas mobile: deliveryOptionsMobile.ts (price 0 + blokir).
    costIdr: 0,
  },
];

export const MAKASSAR_SUBDISTRICTS = [
  "Tamalanrea",
  "Biringkanaya",
  "Panakkukang",
  "Rappocini",
  "Makassar",
  "Manggala",
  "Mariso",
  "Mamajang",
  "Ujung Pandang",
  "Wajo",
  "Bontoala",
  "Tallo",
  "Tamalate",
  "Kepulauan Sangkarrang",
];

export interface ProductionTurnaroundOption {
  tier: "REGULER" | "EXPRESS_24H";
  label: string;
  durationDays: number;
  surchargeIdr: number;
  description: string;
}

export const PRODUCTION_TURNAROUND_OPTIONS: ProductionTurnaroundOption[] = [
  {
    tier: "REGULER",
    label: "Reguler (2-3 Hari Kerja)",
    durationDays: 3,
    surchargeIdr: 0,
    description: "Standar antrean produksi sablon DTF workshop.",
  },
  {
    tier: "EXPRESS_24H",
    label: "Express Prioritas 24 Jam (+Rp 25.000)",
    durationDays: 1,
    surchargeIdr: 25000,
    description: "Prioritas antrean mesin press pertama, selesai dalam 24 jam.",
  },
];
