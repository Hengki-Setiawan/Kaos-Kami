export type DeliveryMethod = "PICKUP" | "INSTANT_COURIER" | "FLAT_MAKASSAR" | "EXPEDITION_MANUAL";

export interface DeliveryOption {
  method: DeliveryMethod;
  name: string;
  description: string;
  costIdr: number;
  isCodShippingFee?: boolean;
}

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    method: "PICKUP",
    name: "Ambil di Workshop Kaos Kami (Rp 0)",
    description: "Ambil langsung di workshop Kaos Kami Makassar setelah sablon selesai (Gratis).",
    costIdr: 0,
  },
  {
    method: "INSTANT_COURIER",
    name: "Kurir Instan Makassar (Maxim / GoSend / Grab)",
    description: "Langsung diantar setelah cetak selesai. Tarif ongkir dibayar langsung ke driver (COD).",
    costIdr: 0,
    isCodShippingFee: true,
  },
  {
    method: "FLAT_MAKASSAR",
    name: "Kurir Regular Flat Makassar (Rp 15.000)",
    description: "Pengantaran flat rate ke seluruh penjuru Kota Makassar (1-2 hari setelah produksi).",
    costIdr: 15000,
  },
  {
    method: "EXPEDITION_MANUAL",
    name: "Ekspedisi Luar Kota (JNE / J&T / SiCepat)",
    description: "Pengiriman khusus luar Kota Makassar. Resi ekspedisi diinput setelah paket dikirim.",
    costIdr: 25000,
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
