import { Browser } from '@capacitor/browser';

/**
 * Duitku mobile — client TIDAK PERNAH pegang secret/merchantCode/apiKey.
 * Transaksi dibuat SERVER (/api/mobile/orders/checkout) → HP hanya menerima
 * `paymentUrl` + `reference`. JANGAN hardcode secret di sini.
 *
 * Alur return (tersambung): server mengirim returnUrl deep-link
 * `kaoskami://payment/callback?orderId=<id>` via returnUrlOverride
 * (kaos-kami-web/src/lib/payments/duitku.ts + route mobile checkout) →
 * Duitku kembali ke APK → appUrlOpen di src/app/page.tsx (allowlist ketat
 * host+path + parseDuitkuReturnUrl di bawah untuk orderId|merchantOrderId dan
 * status|resultCode Duitku: 00=lunas). Fallback tetap ada: paymentUrl di
 * Browser + polling status bila return tak terpicu.
 */

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: 'QRIS';
}

export interface DuitkuPopOptions {
  /**
   * Reference/transaksi dari server (res.reference). WAJIB untuk Pop —
   * tanpa ini langsung fallback Browser. BUKAN secret, hanya ID transaksi.
   */
  reference?: string;
}

declare global {
  interface Window {
    checkout?: { process?: (reference: string, callbacks?: Record<string, (res?: unknown) => void>) => void };
  }
}

/** True untuk return pembayaran (mencakup /callback + varian query Duitku). */
export function isDuitkuReturnUrl(url: string): boolean {
  // KETAT seperti allowlist appUrlOpen di page.tsx (anti open-redirect):
  // protocol wajib kaoskami:, host persis "payment", path "/" atau
  // "/callback". startsWith longgar SENGAJA tak dipakai (lolos
  // kaoskami://payment-evil, kaoskami://payment@evil.com).
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

export type DuitkuReturnStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'UNKNOWN';

/**
 * Normalisasi return `kaoskami://payment[/callback]?orderId=&status=`
 * + varian Duitku (`merchantOrderId`, `resultCode`: 00=lunas).
 */
export function parseDuitkuReturnUrl(url: string): { orderId: string | null; status: DuitkuReturnStatus } {
  try {
    const q = (url || '').split('?')[1] || '';
    const params = new URLSearchParams(q);
    const orderId = params.get('orderId') || params.get('merchantOrderId') || params.get('merchant_order_id');
    const raw = (params.get('status') || params.get('resultCode') || params.get('result_code') || '').toUpperCase();
    let status: DuitkuReturnStatus = 'UNKNOWN';
    if (['COMPLETED', 'SUCCESS', 'PAID', '00'].includes(raw)) status = 'COMPLETED';
    else if (['PENDING', '01'].includes(raw)) status = 'PENDING';
    else if (['CANCELLED', 'CANCEL', 'FAILED', 'EXPIRED', '02'].includes(raw)) status = 'CANCELLED';
    return { orderId, status };
  } catch {
    return { orderId: null, status: 'UNKNOWN' };
  }
}

/** Coba Duitku Pop (checkout.js) bila script SUDAH ada + reference tersedia. */
async function tryDuitkuPop(reference: string, onComplete?: () => void): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    const proc = window.checkout?.process;
    if (typeof proc !== 'function') return false;
    let done = false;
    const once = () => {
      if (!done) {
        done = true;
        try {
          onComplete?.();
        } catch {}
      }
    };
    // checkout.js memanggil salah satu callback; closeEvent = user tutup Pop.
    proc.call(window.checkout, reference, {
      successEvent: () => once(),
      pendingEvent: () => once(),
      errorEvent: (res) => {
        console.debug('[Duitku Pop] errorEvent:', res);
        once();
      },
      closeEvent: () => once(),
    });
    return true;
  } catch (err) {
    console.debug('[Duitku Pop] gagal, fallback Browser:', err);
    return false;
  }
}

export async function openDuitkuPaymentModal(
  paymentUrl: string,
  onComplete?: () => void,
  popOpts?: DuitkuPopOptions
): Promise<void> {
  // Pop opsional: hanya bila reference server + script checkout.js ada.
  // JANGAN inject script + JANGAN hardcode merchant/secret di sini.
  if (popOpts?.reference) {
    const popped = await tryDuitkuPop(popOpts.reference, onComplete);
    if (popped) return;
  }
  try {
    await Browser.open({
      url: paymentUrl,
      windowName: '_blank',
      presentationStyle: 'popover',
      toolbarColor: '#0E0E10',
    });

    // Satu listener aktif: hapus yang lama agar onComplete tidak dobel
    // (addListener tiap panggil tanpa remove = leak + callback ganda).
    await Browser.removeAllListeners();
    if (onComplete) {
      await Browser.addListener('browserFinished', () => {
        onComplete();
      });
    }
  } catch (err) {
    console.debug('[Duitku Payment] Browser fallback:', err);
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank');
    }
  }
}
