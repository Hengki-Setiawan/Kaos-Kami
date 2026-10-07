import { Browser } from '@capacitor/browser';

/**
 * iPaymu Mobile Payment & Direct QRIS Helper
 * Memberikan pengalaman pembayaran 100% In-App tanpa redirect eksternal.
 * Mendukung unduh QRIS ke galeri HP dan panduan screenshot.
 */

export interface DirectQrisMobileData {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  qrImage?: string;
  qrString?: string;
  invoiceUrl?: string;
}

/**
 * Simpan / unduh gambar QRIS ke galeri HP atau folder unduhan
 */
export async function saveQrisImageToDevice(
  qrImageUrl: string,
  orderNumber: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (typeof window === 'undefined') return { success: false, message: 'Browser tidak tersedia' };

    // Coba ambil blob gambar
    const response = await fetch(qrImageUrl, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `QRIS-KAOSKAMI-${orderNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    return {
      success: true,
      message: 'Gambar QRIS berhasil diunduh ke galeri / folder unduhan!',
    };
  } catch (err: any) {
    // Fallback: buka gambar di browser / tab baru jika CORS membatasi
    try {
      const a = document.createElement('a');
      a.href = qrImageUrl;
      a.target = '_blank';
      a.download = `QRIS-KAOSKAMI-${orderNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return {
        success: true,
        message: 'Gambar QRIS dibuka untuk disimpan',
      };
    } catch {
      return {
        success: false,
        message: 'Gagal mengunduh gambar. Silakan gunakan Screenshot layar.',
      };
    }
  }
}

/**
 * Fallback browser jika pengguna memilih tautan pembayaran web
 */
export async function openPaymentBrowser(
  paymentUrl: string,
  onComplete?: () => void
): Promise<void> {
  try {
    await Browser.open({
      url: paymentUrl,
      windowName: '_blank',
      presentationStyle: 'popover',
      toolbarColor: '#0E0E10',
    });

    await Browser.removeAllListeners();
    if (onComplete) {
      await Browser.addListener('browserFinished', () => {
        onComplete();
      });
    }
  } catch (err) {
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank');
    }
  }
}

/**
 * Shims kompatibilitas return URL untuk deep-link
 */
export function isPaymentReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url || '');
    if (parsed.protocol !== 'kaoskami:') return false;
    if ((parsed.hostname || '').toLowerCase() !== 'payment') return false;
    const path = (parsed.pathname || '').replace(/\/+$/, '') || '/';
    return path === '/' || path === '/callback';
  } catch {
    return false;
  }
}

export type PaymentReturnStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'UNKNOWN';

export function parsePaymentReturnUrl(url: string): { orderId: string | null; status: PaymentReturnStatus } {
  try {
    const q = (url || '').split('?')[1] || '';
    const params = new URLSearchParams(q);
    const orderId = params.get('orderId') || params.get('merchantOrderId') || params.get('merchant_order_id');
    const raw = (params.get('status') || params.get('resultCode') || params.get('result_code') || '').toUpperCase();
    let status: PaymentReturnStatus = 'UNKNOWN';
    if (['COMPLETED', 'SUCCESS', 'PAID', '00'].includes(raw)) status = 'COMPLETED';
    else if (['PENDING', '01'].includes(raw)) status = 'PENDING';
    else if (['CANCELLED', 'CANCEL', 'FAILED', 'EXPIRED', '02'].includes(raw)) status = 'CANCELLED';
    return { orderId, status };
  } catch {
    return { orderId: null, status: 'UNKNOWN' };
  }
}

// Deprecated shims agar kode lama tidak error
export const isDuitkuReturnUrl = isPaymentReturnUrl;
export const parseDuitkuReturnUrl = parsePaymentReturnUrl;
export const openDuitkuPaymentModal = openPaymentBrowser;
