import { SHOP_POSTAL_CODE } from "@/lib/shop";

// Provider AgenWebsite Rate API (https://api.agenwebsite.com/v1).
// Key HANYA di server (wrangler secret AGENWEBSITE_RATE_API_KEY / .env.local).
// Tanpa key → getAgenWebsiteProvider() null → pemanggil WAJIB fallback ke
// tabel ExpeditionZone (lihat zones.resolveExpeditionCost). Fail-soft: error
// jaringan/429/partial → null, JANGAN lempar (checkout tidak boleh mati).
// Docs: https://www.agenwebsite.com/documentation/agenwebsite-rate-api/

const LIVE_BASE = "https://api.agenwebsite.com/v1";
const SANDBOX_BASE = "https://api-sandbox.agenwebsite.com/v1";

function baseUrl(): string {
  return process.env.AGENWEBSITE_SANDBOX === "true" ? SANDBOX_BASE : LIVE_BASE;
}

export function isAgenWebsiteConfigured(): boolean {
  return !!process.env.AGENWEBSITE_RATE_API_KEY;
}

export interface AwRate {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  costIdr: number; // harga hemat (discounted_cost bila ada, else cost)
  etdText: string;
  cheapest: boolean;
  fastest: boolean;
}

export interface AwLocation {
  subdistrictId: string;
  postalCode: string;
  label: string;
}

async function awFetch(path: string, init?: RequestInit, timeoutMs = 15000): Promise<any | null> {
  const key = process.env.AGENWEBSITE_RATE_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "x-api-key": key,
        "Content-Type": "application/json",
        ...(init?.headers as any),
      },
    });
    clearTimeout(t);
    // 429 kuota habis / burst → null (pemanggil fallback), bukan error.
    if (res.status === 429) {
      console.warn("[agenwebsite] 429 rate limited, fallback ke tabel zona");
      return null;
    }
    if (!res.ok) {
      console.warn("[agenwebsite] HTTP", res.status);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.warn("[agenwebsite] fetch gagal:", e?.message);
    return null;
  }
}

/** Cek tarif real-time. weightGrams = total berat paket. */
export async function awRates(
  destinationPostalCode: string,
  weightGrams: number,
  couriers?: string[]
): Promise<AwRate[] | null> {
  // Field RESMI: "zipcode" (bukan "postal_code" seperti contoh docs lama) —
  // terverifikasi live 08 Sep 2026 (postal_code → validation_error).
  const body: any = {
    shipper: { zipcode: SHOP_POSTAL_CODE },
    destination: { zipcode: destinationPostalCode },
    weight: Math.max(1, Math.min(Math.round(weightGrams), 30000)),
    sort: "cheapest",
  };
  if (couriers?.length) body.couriers = couriers;
  const j = await awFetch("/rates", { method: "POST", body: JSON.stringify(body) });
  const rates = j?.data?.rates;
  if (!Array.isArray(rates)) return null;
  if (j?.meta?.partial) {
    console.warn("[agenwebsite] partial:", j?.meta?.couriers_failed);
  }
  // Saring layanan kargo/motor absurd (Rp jutaan) → 10 termurah saja.
  // User memilih yang termurah sesuai aturan owner; server cocokkan serviceCode.
  const mapped: AwRate[] = rates.map((r: any) => ({
    courierCode: String(r.courier_code || ""),
    courierName: String(r.courier_name || r.courier_code || ""),
    serviceCode: String(r.service_code || ""),
    serviceName: String(r.service_name || r.service_code || ""),
    costIdr: Number(r.discounted_cost ?? r.cost ?? 0),
    etdText: String(r.etd_text || ""),
    cheapest: !!r.cheapest,
    fastest: !!r.fastest,
  }));
  return mapped
    .filter((r) => r.courierCode && r.costIdr > 0 && r.costIdr <= 500_000)
    .sort((a, b) => a.costIdr - b.costIdr)
    .slice(0, 10);
}

/** Autocomplete kecamatan → kode pos (database 82rb+ wilayah). */
export async function awLocationsSearch(q: string, limit = 6): Promise<AwLocation[] | null> {
  const query = q.trim().slice(0, 60);
  if (query.length < 3) return [];
  const j = await awFetch(`/locations/search?q=${encodeURIComponent(query)}&limit=${limit}`, undefined, 10000);
  const list = j?.data ?? j?.data?.locations;
  const arr = Array.isArray(list) ? list : Array.isArray(j?.data?.results) ? j.data.results : null;
  if (!arr) return null;
  return arr.map((l: any) => ({
    subdistrictId: String(l.subdistrict_id || l.id || ""),
    postalCode: String(l.postal_code || l.postalCode || ""),
    label: String(l.label || [l.subdistrict, l.city, l.province].filter(Boolean).join(", ") || l.name || ""),
  }));
}

/** Sisa kuota hari ini (untuk dashboard admin). Null bila tak terkonfigurasi. */
export async function awUsage(): Promise<{ plan: string; limit: number; used: number; remaining: number; resetAt: string } | null> {
  const j = await awFetch("/usage", undefined, 10000);
  const d = j?.data;
  if (!d) return null;
  return {
    plan: String(d.plan || "?"),
    limit: Number(d.limit || 0),
    used: Number(d.used || 0),
    remaining: Number(d.remaining || 0),
    resetAt: String(d.reset_at || ""),
  };
}

/** Daftar kurir didukung (otoritatif — cek ini, bukan klaim marketing). */
export async function awCouriers(): Promise<{ code: string; name: string }[] | null> {
  const j = await awFetch("/couriers", undefined, 10000);
  const list = j?.data?.couriers || j?.data;
  if (!Array.isArray(list)) return null;
  return list.map((c: any) => ({ code: String(c.code || c.courier_code || ""), name: String(c.name || c.courier_name || "") }));
}

// ------------------------------------------------------------------
// CACHE HEMAT KUOTA (in-memory TTL 30 mnt, best-effort per isolate).
// Tarif (asal, tujuan, berat, kurir) sama jarang berubah per menit;
// docs mereka sendiri menyarankan cache ~30 mnt (hemat 60-80% hit).
// Key: kode pos tujuan + berat dibulatkan ke 250g + filter kurir.
// ------------------------------------------------------------------
const rateCache = new Map<string, { at: number; rates: AwRate[] }>();
const RATE_TTL_MS = 30 * 60 * 1000;

export async function awRatesCached(
  destinationPostalCode: string,
  weightGrams: number,
  couriers?: string[]
): Promise<AwRate[] | null> {
  const bucket = Math.ceil(weightGrams / 250) * 250;
  const key = `${destinationPostalCode}:${bucket}:${(couriers || []).slice().sort().join(",")}`;
  const hit = rateCache.get(key);
  if (hit && Date.now() - hit.at < RATE_TTL_MS) return hit.rates;
  const rates = await awRates(destinationPostalCode, weightGrams, couriers);
  if (rates) {
    rateCache.set(key, { at: Date.now(), rates });
    if (rateCache.size > 500) {
      const oldest = [...rateCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) rateCache.delete(oldest);
    }
  }
  return rates;
}
