import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kaoskami.biz.id';

/** Base URL API — dipakai komponen untuk endpoint GET publik (ongkir, geocode). */
export const API_BASE_URL = BASE_API_URL;

// Batas waktu jaringan (CapacitorHttp Android; web fallback diabaikan aman).
const HTTP_TIMEOUT = { connectTimeout: 15000, readTimeout: 15000 } as const;

/** Platform aktual (android/ios/web) — jangan hardcode. */
export function currentPlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'android';
  }
}

export interface MobileCatalogCategory {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  weightGsm?: string | null;
  basePriceIdr: number;
  sizes: string[];
  model3dPath: string;
}

export interface MobileOrderStatus {
  id: string;
  orderNumber: string;
  status: string;
  updatedAt: string;
  totalIdr?: number;
  deliveryMethod?: string;
  itemCount?: number;
  paymentMethod?: string | null;
}

/**
 * M10 — klien API mobile resmi (Blueprint M10 §1).
 * Endpoint: /api/mobile/catalog, /api/mobile/orders/checkout,
 * /api/mobile/orders/:id/status, /api/mobile/designs/sync,
 * /api/mobile/notifications/register.
 */
export const mobileApiClient = {
  getCatalog: async (cachedEtag?: string): Promise<{ data: { categories: MobileCatalogCategory[] } | null; etag?: string; notModified: boolean }> => {
    try {
      const headers: Record<string, string> = {};
      if (cachedEtag) headers['If-None-Match'] = cachedEtag;
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/mobile/catalog`,
        headers,
        ...HTTP_TIMEOUT,
      });
      if (response.status === 304) return { data: null, notModified: true };
      return {
        data: response.data,
        etag: response.headers['ETag'] || response.headers['etag'],
        notModified: false,
      };
    } catch (err) {
      console.debug('[MobileAPI] catalog fallback:', err);
      return { data: null, notModified: false };
    }
  },

  checkout: async (
    payload: Record<string, unknown>,
    // P0-2: header custom (Idempotency-Key unik per klik bayar). Server dedupe
    // via header ini — replay key sama = 409 + order lama (tanpa dobel).
    opts?: { idempotencyKey?: string }
  ): Promise<{ success: boolean; orderId?: string; orderNumber?: string; userId?: string; paymentUrl?: string; reference?: string; invoiceUrl?: string; error?: string; status?: number }> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/mobile/orders/checkout`,
        headers,
        data: payload,
        ...HTTP_TIMEOUT,
      });
      // CapacitorHttp TAK melempar untuk status HTTP error — response.data
      // membawa { error, orderId?, orderNumber?, invoiceUrl? } server.
      // Sertakan status agar pemanggil bisa bedakan 401/403/409/503 (jujur).
      const body = (response.data ?? {}) as Record<string, unknown>;
      return { success: response.status >= 200 && response.status < 300 && (body as any).success !== false, status: response.status, ...(body as object) } as any;
    } catch (err: any) {
      console.debug('[MobileAPI] checkout error:', err);
      return { success: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  /**
   * P0-3: minta kode OTP 6-digit ke WA via /api/auth/send-otp (sama dengan web).
   * Hemat Fonnte: panggil 1x per checkout (rate-limit server 3x/5 mnt).
   * Mock code HANYA ada di dev tanpa FONNTE_TOKEN — prod tak pernah kirim code.
   */
  sendOtp: async (phoneNumber: string): Promise<{ ok: boolean; mock?: boolean; code?: string; error?: string; status?: number }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/auth/send-otp`,
        headers: { 'Content-Type': 'application/json' },
        data: { phoneNumber },
        ...HTTP_TIMEOUT,
      });
      if (response.status >= 200 && response.status < 300) {
        return { ok: true, mock: (response.data as any)?.mock, code: (response.data as any)?.code, status: response.status };
      }
      return { ok: false, error: (response.data as any)?.error || `Gagal kirim OTP (${response.status})`, status: response.status };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  pollOrderStatus: async (orderId: string): Promise<MobileOrderStatus | null> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/mobile/orders/${orderId}/status`,
        ...HTTP_TIMEOUT,
      });
      if (response.status === 200) return response.data;
      return null;
    } catch {
      return null;
    }
  },

  syncDesigns: async (payload: { userId: string; deviceId?: string; designs: unknown[] }): Promise<{ success: boolean; synced?: number; error?: string }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/mobile/designs/sync`,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        ...HTTP_TIMEOUT,
      });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  registerPushToken: async (token: string, userId?: string): Promise<boolean> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/mobile/notifications/register`,
        headers: { 'Content-Type': 'application/json' },
        data: { pushToken: token, platform: currentPlatform(), userId },
        ...HTTP_TIMEOUT,
      });
      return response.status === 200 && !!response.data?.success;
    } catch {
      return false;
    }
  },

  /**
   * Antrean produksi workshop (butuh sesi admin di backend;
   * 401/403 → pemanggil wajib fallback ke mode demo lokal).
   */
  getProductionTasks: async (): Promise<any[]> => {
    const response: HttpResponse = await CapacitorHttp.get({
      url: `${BASE_API_URL}/api/admin/production-tasks`,
      ...HTTP_TIMEOUT,
    });
    if (response.status === 200 && response.data?.success) return response.data.tasks || [];
    throw new Error(`production-tasks ${response.status}`);
  },

  /** ACC 1-klik: majukan stage ProductionTask di server. */
  advanceProductionTask: async (taskId: string, stage: string, notes?: string): Promise<boolean> => {
    try {
      const response: HttpResponse = await CapacitorHttp.request({
        method: 'PATCH',
        url: `${BASE_API_URL}/api/admin/production-tasks`,
        headers: { 'Content-Type': 'application/json' },
        data: { taskId, stage, notes },
        ...HTTP_TIMEOUT,
      });
      return response.status === 200 && !!response.data?.success;
    } catch {
      return false;
    }
  },
};

export interface ShippingZoneQuote {
  id: string;
  city: string;
  province: string;
  courier: string;
  service: string;
  costIdr: number;
  etdLabel: string;
}

/** Tarif ekspedisi per kota (publik). Harga final tetap di-resolve server saat checkout. */
export async function quoteShipping(city: string, postalCode?: string, weightGrams?: number): Promise<{ source: string; rates?: ShippingZoneQuote[]; zones?: ShippingZoneQuote[] }> {
  const params = new URLSearchParams({ city });
  if (postalCode) params.set('postalCode', postalCode);
  if (weightGrams) params.set('weightGrams', String(weightGrams));
  const response: HttpResponse = await CapacitorHttp.get({
    url: `${BASE_API_URL}/api/shipping/quote?${params.toString()}`,
    ...HTTP_TIMEOUT,
  });
  if (response.status === 200) return response.data;
  throw new Error(response.data?.error || 'Gagal cek ongkir');
}

export interface GeoResult {
  district: string;
  city: string;
  province: string;
  displayName: string;
}

/** Reverse-geocode via proxy server (bukan direct Nominatim dari HP). Null bila gagal. */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  try {
    const response: HttpResponse = await CapacitorHttp.get({
      url: `${BASE_API_URL}/api/geocode/reverse?lat=${lat}&lon=${lon}`,
      ...HTTP_TIMEOUT,
    });
    return response.data?.result || null;
  } catch {
    return null;
  }
}

export interface ShipLocation {
  postalCode: string;
  label: string;
}

/** Autocomplete kecamatan → kode pos (tutup gap vs web). Gagal = [] (input manual). */
export async function searchLocations(q: string): Promise<ShipLocation[]> {
  try {
    if (q.trim().length < 3) return [];
    const response: HttpResponse = await CapacitorHttp.get({
      url: `${BASE_API_URL}/api/shipping/locations?q=${encodeURIComponent(q.trim())}`,
      ...HTTP_TIMEOUT,
    });
    const list = response.data?.locations;
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}
