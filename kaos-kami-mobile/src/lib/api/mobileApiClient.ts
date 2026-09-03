import { CapacitorHttp, HttpResponse } from '@capacitor/core';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kaos-kami-3d.hengkisetiawan461.workers.dev';

export const mobileApiClient = {
  /**
   * Fetch catalog with ETag 304 caching to conserve mobile cellular data
   */
  getCatalog: async (cachedEtag?: string): Promise<{ data: any; etag?: string; notModified: boolean }> => {
    try {
      const headers: Record<string, string> = {};
      if (cachedEtag) {
        headers['If-None-Match'] = cachedEtag;
      }

      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/catalog/categories`,
        headers,
      });

      if (response.status === 304) {
        return { data: null, notModified: true };
      }

      return {
        data: response.data,
        etag: response.headers['ETag'] || response.headers['etag'],
        notModified: false,
      };
    } catch (err) {
      console.debug('[MobileAPI] Network fallback:', err);
      return { data: null, notModified: false };
    }
  },

  /**
   * Ultra-lean order status polling (< 500 bytes) for real-time DTF sablon tracking
   */
  pollOrderStatus: async (orderId: string): Promise<{ status: string; updatedAt: string } | null> => {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${BASE_API_URL}/api/orders/${orderId}?fields=status,updatedAt`,
      });

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Register push notification token for instant design approval & order alerts
   */
  registerPushToken: async (token: string, userId?: string): Promise<boolean> => {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${BASE_API_URL}/api/notifications/register-device`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          token,
          platform: 'android',
          userId,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },
};
