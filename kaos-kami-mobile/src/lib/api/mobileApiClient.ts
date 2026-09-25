import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kaoskami.biz.id';

/** Base URL API — dipakai komponen untuk endpoint GET publik (ongkir, geocode). */
export const API_BASE_URL = BASE_API_URL;

// Batas waktu jaringan (CapacitorHttp Android; web fallback diabaikan aman).
const HTTP_TIMEOUT = { connectTimeout: 15000, readTimeout: 15000 } as const;

// Retry eksponensial HANYA untuk throw jaringan (tanpa respons) — status HTTP
// error (4xx/5xx) TIDAK di-retry di sini (ditangani pemanggil per-status).
// backoff: 500ms → 1000ms (maks 3 percobaan). OTP SENGAJA tak di-retry
// (tiap kirim = biaya Fonnte + rate-limit server 3x/5 mnt).
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function withNetworkRetry<T>(fn: () => Promise<T>, retries = 2, baseMs = 500): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(baseMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

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
  /** Defensif masa depan (endpoint kini belum kirim): dibaca bila ada. */
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  note?: string | null;
  reviewNote?: string | null;
  rejectReason?: string | null;
  invoiceUrl?: string | null;
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
      // Kunci stabil per panggilan: retry jaringan memakai key SAMA agar server
      // dedupe (409 + order lama) bila request pertama ternyata sampai.
      const stableKey =
        opts?.idempotencyKey && opts.idempotencyKey.length >= 8
          ? opts.idempotencyKey
          : `retry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      headers['Idempotency-Key'] = stableKey;
      const response: HttpResponse = await withNetworkRetry(() =>
        CapacitorHttp.post({
          url: `${BASE_API_URL}/api/mobile/orders/checkout`,
          headers,
          data: payload,
          ...HTTP_TIMEOUT,
        })
      );
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
  sendOtp: async (phoneNumber: string): Promise<{ ok: boolean; mock?: boolean; code?: string; alreadyVerified?: boolean; error?: string; status?: number }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/auth/send-otp`,
        headers: { 'Content-Type': 'application/json' },
        data: { phoneNumber },
        ...HTTP_TIMEOUT,
      });
      if (response.status >= 200 && response.status < 300) {
        return { ok: true, mock: (response.data as any)?.mock, code: (response.data as any)?.code, alreadyVerified: (response.data as any)?.alreadyVerified === true, status: response.status };
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
   * Sesi admin nyata (pola login web: better-auth cookie session).
   * Web: signIn.email({email,password}) → POST /api/auth/sign-in/email +
   * resolve-identifier; sesi dibaca via GET /api/auth/get-session.
   * Mobile memakai transport SAMA (CapacitorHttp) agar cookie jar native
   * dipakai konsisten oleh getProductionTasks/advance di bawah.
   * Catatan jujur: cookie HttpOnly dipegang native layer; WebView tak bisa
   * baca manual — verifikasi SELALU via get-session, jangan klaim login
   * dari status POST saja.
   */
  getAdminSession: async (): Promise<{ id: string; name: string; email: string; role: string } | null> => {
    // 1) Jalur utama: CapacitorHttp (native bypass CORS, cookie otomatis).
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/auth/get-session`,
        ...HTTP_TIMEOUT,
      });
      const user = (response.data as any)?.user;
      if (response.status === 200 && user?.id) {
        return { id: user.id, name: user.name || '', email: user.email || '', role: (user as any).role || 'CUSTOMER' };
      }
    } catch {}
    // 2) Fallback PWA/web same-origin: fetch + credentials (WebView cookie).
    try {
      if (typeof fetch !== 'undefined') {
        const r = await fetch(`${BASE_API_URL}/api/auth/get-session`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json().catch(() => null);
          const user = (d as any)?.user;
          if (user?.id) return { id: user.id, name: user.name || '', email: user.email || '', role: (user as any).role || 'CUSTOMER' };
        }
      }
    } catch {}
    return null;
  },

  /**
   * Login admin via kredensial (cermin web AuthModal handleLogin):
   * resolve identifier (email/username/WA) → sign-in/email. Cookie sesi
   * disimpan native layer; panggil getAdminSession() untuk verifikasi.
   */
  adminSignIn: async (identifier: string, password: string): Promise<{ ok: boolean; error?: string; status?: number }> => {
    const rawId = identifier.trim();
    if (!rawId || password.length < 6) return { ok: false, error: 'Isi identifier + password min. 6 karakter.' };
    let targetEmail = rawId;
    try {
      const rr: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/auth/resolve-identifier`,
        headers: { 'Content-Type': 'application/json' },
        data: { identifier: rawId },
        ...HTTP_TIMEOUT,
      });
      if ((rr.data as any)?.email) targetEmail = (rr.data as any).email;
    } catch {
      // Fallback: pakai input apa adanya (server yang menolak bila salah).
    }
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/auth/sign-in/email`,
        headers: { 'Content-Type': 'application/json' },
        data: { email: targetEmail, password },
        ...HTTP_TIMEOUT,
      });
      if (response.status >= 200 && response.status < 300 && !(response.data as any)?.error && (response.data as any)?.user !== null) {
        return { ok: true, status: response.status };
      }
      const msg = (response.data as any)?.message || (response.data as any)?.error || `Login ditolak (${response.status})`;
      return { ok: false, error: typeof msg === 'string' ? msg : 'Login gagal. Periksa identifier + password.', status: response.status };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  adminSignOut: async (): Promise<void> => {
    try {
      await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/auth/sign-out`,
        headers: { 'Content-Type': 'application/json' },
        data: {},
        ...HTTP_TIMEOUT,
      });
    } catch {}
  },

  /**
   * Tab read-only revenue: GET /api/admin/reports (ADMIN/SUPER_ADMIN saja).
   * 401 = belum login, 403 = staf produksi (omset sensitif). Null = tak-ada-data.
   */
  getAdminReports: async (range: 'today' | '7d' | '30d' = '7d'): Promise<{ data?: any; status: number; error?: string }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/admin/reports?range=${range}`,
        ...HTTP_TIMEOUT,
      });
      if (response.status === 200) return { data: response.data, status: 200 };
      return { status: response.status, error: (response.data as any)?.error || `Gagal memuat laporan (${response.status})` };
    } catch (err: any) {
      return { status: 0, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  /**
   * Tab read-only kupon: GET /api/admin/coupons (ADMIN/SUPER_ADMIN saja).
   */
  getAdminCoupons: async (limit = 50): Promise<{ data?: any; status: number; error?: string }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/admin/coupons?limit=${Math.max(1, Math.min(200, limit))}`,
        ...HTTP_TIMEOUT,
      });
      if (response.status === 200) return { data: response.data, status: 200 };
      return { status: response.status, error: (response.data as any)?.error || `Gagal memuat kupon (${response.status})` };
    } catch (err: any) {
      return { status: 0, error: err?.message || 'Jaringan bermasalah' };
    }
  },
  /**
   * Antrean produksi workshop (butuh sesi admin di backend;
   * cookie better-auth dikirim otomatis oleh CapacitorHttp native.
   * 401/403 → pemanggil wajib tampilkan login, BUKAN fallback demo diam).
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

  /**
   * P3 QC — upload foto QC ke R2 via endpoint existing (multipart `file`,
   * png/jpg/webp ≤10MB, wajib login). Cermin web QcChecklistPanel (FormData).
   * 401 = belum login staf → pemanggil tampilkan pesan jujur (tanpa klaim).
   */
  uploadQcPhoto: async (
    blob: Blob,
    filename: string,
  ): Promise<{ ok: boolean; url?: string; error?: string; status?: number }> => {
    try {
      const form = new FormData();
      form.append('file', new File([blob], filename, { type: blob.type || 'image/png' }));
      const res = await fetch(`${BASE_API_URL}/api/upload/r2`, { method: 'POST', body: form });
      const data = (await res.json().catch(() => null)) as { success?: boolean; url?: string; error?: string } | null;
      if (res.ok && data?.success && data?.url) return { ok: true, url: data.url, status: res.status };
      return { ok: false, error: data?.error || `Upload gagal (${res.status})`, status: res.status };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  /**
   * P3 QC — simpan jejak inspeksi. Kontrak web POST /api/qc/inspections:
   * { orderId*, photoUrl https*, productionTaskId?, grazingDeg? (15|30|45|90),
   *   luxEstimate? (int 0–100000), side?, checks? (LUBANG|NODA|MISPRINT|CRACKING),
   *   note? (≤500) } → { success, data }. RBAC staf (401/403 jujur).
   */
  postQcInspection: async (payload: {
    orderId: string;
    photoUrl: string;
    productionTaskId?: string;
    grazingDeg?: 15 | 30 | 45 | 90;
    luxEstimate?: number;
    side?: string;
    checks?: Array<'LUBANG' | 'NODA' | 'MISPRINT' | 'CRACKING'>;
    note?: string;
  }): Promise<{ ok: boolean; data?: unknown; error?: string; status?: number }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/qc/inspections`,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        ...HTTP_TIMEOUT,
      });
      const body = (response.data ?? {}) as { success?: boolean; data?: unknown; error?: string };
      if (response.status >= 200 && response.status < 300 && body.success) {
        return { ok: true, data: body.data, status: response.status };
      }
      return { ok: false, error: body.error || `Simpan gagal (${response.status})`, status: response.status };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  /** P3 QC — riwayat jejak per order (GET /api/qc/inspections?orderId=). Staf only. */
  getQcInspections: async (orderId: string): Promise<{ ok: boolean; rows?: any[]; error?: string; status?: number }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/qc/inspections?orderId=${encodeURIComponent(orderId)}`,
        ...HTTP_TIMEOUT,
      });
      const body = (response.data ?? {}) as { success?: boolean; data?: any[]; error?: string };
      if (response.status === 200 && body.success) return { ok: true, rows: body.data || [], status: 200 };
      return { ok: false, error: body.error || `Gagal memuat (${response.status})`, status: response.status };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  /**
   * P3 GANG — viewer read-only: daftar task + status, TANPA builder.
   * Bungkus getProductionTasks + normalisasi ringan (tak pernah mutasi).
   * Throw bila 401/403/offline → pemanggil fallback demo lokal yang jujur.
   */
  getGangViewerTasks: async (): Promise<
    Array<{
      taskId: string;
      orderId: string;
      orderNumber: string;
      stage: string;
      printWidthCm: number;
      printHeightCm: number;
      gangNote: string | null;
      createdAt: string;
    }>
  > => {
    const response: HttpResponse = await CapacitorHttp.get({
      url: `${BASE_API_URL}/api/admin/production-tasks`,
      ...HTTP_TIMEOUT,
    });
    if (response.status === 200 && response.data?.success) {
      const tasks = (response.data.tasks || []) as any[];
      return tasks.map((t: any) => {
        const notes = typeof t.notes === 'string' ? t.notes : '';
        const m = notes.match(/\[GANG:[^\]]+\]/);
        return {
          taskId: String(t.id || ''),
          orderId: String(t.orderId || ''),
          orderNumber: String(t.order?.orderNumber || t.orderId || '-'),
          stage: String(t.stage || '-'),
          printWidthCm: Number(t.printWidthCm ?? 0),
          printHeightCm: Number(t.printHeightCm ?? 0),
          gangNote: m ? m[0] : null,
          createdAt: String(t.createdAt || ''),
        };
      });
    }
    throw new Error(`gang-viewer ${response.status}`);
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
