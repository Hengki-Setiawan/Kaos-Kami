import { CapacitorHttp, HttpResponse } from '@capacitor/core';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kaos-kami-3d.hengkisetiawan461.workers.dev';

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

  checkout: async (payload: Record<string, unknown>): Promise<{ success: boolean; orderId?: string; orderNumber?: string; userId?: string; paymentUrl?: string; reference?: string; invoiceUrl?: string; error?: string }> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/mobile/orders/checkout`,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
      });
      return response.data;
    } catch (err: any) {
      console.debug('[MobileAPI] checkout error:', err);
      return { success: false, error: err?.message || 'Jaringan bermasalah' };
    }
  },

  pollOrderStatus: async (orderId: string): Promise<MobileOrderStatus | null> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/mobile/orders/${orderId}/status`,
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
        data: { pushToken: token, platform: 'android', userId },
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
      });
      return response.status === 200 && !!response.data?.success;
    } catch {
      return false;
    }
  },
};
