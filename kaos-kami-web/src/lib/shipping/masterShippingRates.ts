/**
 * MASTER DATABASE TARIF EKSPEDISI SE-INDONESIA (ORIGIN: KOTA MAKASSAR)
 * Meliputi seluruh 514 Kabupaten dan Kota di 38 Provinsi Indonesia (Kemendagri / BPS).
 * Digunakan sebagai SSOT Offline Mandiri untuk menggantikan ketergantungan API eksternal berbayar.
 * Kurir: Lion Parcel (REGPACK), JNE (REG), J&T (EZ).
 */

import { INDONESIA_514_CITIES } from "./data/indonesia514Cities";

export interface MasterCityRate {
  id: string;
  city: string;
  province: string;
  region: "Sulsel" | "Sulawesi" | "Jawa-Bali" | "Kalimantan" | "Sumatera" | "NusaTenggara" | "Maluku" | "Papua";
  postalCode: string;
  jneReg: number;       // Tarif dasar per kg (Rp)
  jntEz: number;        // Tarif dasar per kg (Rp)
  lionReg: number;      // Tarif dasar per kg (Rp)
  sicepatReg: number;   // Tarif dasar per kg (Rp)
  posKilat: number;     // Tarif dasar per kg (Rp)
  etdDays: string;      // Estimasi lama pengantaran
}

export interface CalculatedCourierRate {
  courierCode: "JNE" | "JNT" | "LION" | "SICEPAT" | "POS";
  courierName: string;
  serviceCode: string;
  serviceName: string;
  costIdr: number;
  etdText: string;
  isCheapest?: boolean;
}

// Master Data 514 Kabupaten & Kota Indonesia terkelompok berdasarkan zonasi logistik dari Makassar (UPG)
export const MASTER_INDONESIA_CITIES: MasterCityRate[] = INDONESIA_514_CITIES;

/**
 * Normalisasi string pencarian untuk mencocokkan variasi penulisan:
 * "Kota Surabaya" -> "surabaya", "Kab. Bone" -> "bone", dsb.
 */
function cleanQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(kota|kabupaten|kab\.?|daerah|provinsi|wilayah)\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Mencari kota dari database master 514 kota berdasarkan substring nama kota, kabupaten, provinsi, atau kode pos.
 */
export function searchMasterCities(query: string): MasterCityRate[] {
  const rawQ = query.trim().toLowerCase();
  const cleanQ = cleanQuery(rawQ);
  if (rawQ.length < 2 && cleanQ.length < 2) return [];

  const matches: { city: MasterCityRate; score: number }[] = [];

  for (const c of MASTER_INDONESIA_CITIES) {
    const rawCity = c.city.toLowerCase();
    const cleanCity = cleanQuery(rawCity);
    const prov = c.province.toLowerCase();

    let score = 0;

    // Kecocokan persis bersih nama kota
    if (cleanCity === cleanQ) score += 100;
    else if (cleanCity.startsWith(cleanQ)) score += 60;
    else if (cleanCity.includes(cleanQ)) score += 40;
    else if (rawCity.includes(rawQ)) score += 30;

    // Kecocokan kode pos
    if (c.postalCode.startsWith(rawQ)) score += 50;

    // Kecocokan provinsi
    if (prov.includes(cleanQ) || prov.includes(rawQ)) score += 15;

    if (score > 0) {
      matches.push({ city: c, score });
    }
  }

  // Urutkan dari skor kecocokan tertinggi
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, 10).map((m) => m.city);
}

/**
 * Mencari tarif kurir terhitung (Lion Parcel, JNE, J&T) berdasarkan kota dan berat paket (gram).
 * Menggunakan aturan logistik kargo resmi Indonesia:
 * - Toleransi kargo: <= 1.200 gram dihitung 1 kg; 1.201 - 2.200 gram dihitung 2 kg.
 */
export function calculateMasterCourierRates(
  cityOrId: string,
  weightGrams = 1000,
  surchargeMultiplier = 1.0 // Pengali surcharge global bila ada penyesuaian BBM
): { city: MasterCityRate; rates: CalculatedCourierRate[] } | null {
  const rawQ = cityOrId.trim().toLowerCase();
  const cleanQ = cleanQuery(rawQ);
  if (!rawQ) return null;

  // 1. Temukan kecocokan terbaik di antara 514 kota
  const match =
    MASTER_INDONESIA_CITIES.find((c) => c.id === cityOrId) ||
    MASTER_INDONESIA_CITIES.find((c) => cleanQuery(c.city) === cleanQ) ||
    MASTER_INDONESIA_CITIES.find((c) => c.city.toLowerCase() === rawQ) ||
    MASTER_INDONESIA_CITIES.find((c) => cleanQuery(c.city).includes(cleanQ) || (cleanQ.length >= 3 && cleanQ.includes(cleanQuery(c.city)))) ||
    MASTER_INDONESIA_CITIES.find((c) => c.city.toLowerCase().includes(rawQ) || rawQ.includes(c.city.toLowerCase())) ||
    MASTER_INDONESIA_CITIES.find((c) => c.province.toLowerCase().includes(rawQ));

  if (!match) return null;

  // 2. Hitung berat paket (kg) sesuai standar kargo
  const kg = Math.max(1, Math.ceil(Math.max(0, weightGrams - 200) / 1000));
  const mult = Math.max(0.5, Math.min(2.0, surchargeMultiplier));

  const rates: CalculatedCourierRate[] = [
    {
      courierCode: "LION" as const,
      courierName: "Lion Parcel",
      serviceCode: "REGPACK",
      serviceName: "Reguler (Lion Air Cargo)",
      costIdr: Math.round(match.lionReg * kg * mult),
      etdText: match.etdDays,
    },
    {
      courierCode: "SICEPAT" as const,
      courierName: "SiCepat Ekspres",
      serviceCode: "SIUNTUNG",
      serviceName: "SIUNTUNG (Layanan Cepat)",
      costIdr: Math.round(match.sicepatReg * kg * mult),
      etdText: match.etdDays,
    },
    {
      courierCode: "JNE" as const,
      courierName: "JNE Express",
      serviceCode: "REG",
      serviceName: "Layanan Reguler",
      costIdr: Math.round(match.jneReg * kg * mult),
      etdText: match.etdDays,
    },
    {
      courierCode: "JNT" as const,
      courierName: "J&T Express",
      serviceCode: "EZ",
      serviceName: "EZ Reguler",
      costIdr: Math.round(match.jntEz * kg * mult),
      etdText: match.etdDays,
    },
    {
      courierCode: "POS" as const,
      courierName: "Pos Indonesia",
      serviceCode: "KILAT_KHUSUS",
      serviceName: "Pos Kilat Khusus Nasional",
      costIdr: Math.round(match.posKilat * kg * mult),
      etdText: match.etdDays,
    },
  ];

  // Urutkan dari yang termurah dan beri tanda isCheapest
  rates.sort((a, b) => a.costIdr - b.costIdr);
  if (rates[0]) rates[0].isCheapest = true;

  return { city: match, rates };
}

/**
 * Mengembalikan total jumlah kabupaten dan kota yang terdaftar dalam sistem (514).
 */
export function getMasterCitiesTotalCount(): number {
  return MASTER_INDONESIA_CITIES.length;
}
