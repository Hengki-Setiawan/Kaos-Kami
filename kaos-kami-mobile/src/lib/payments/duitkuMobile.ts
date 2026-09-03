import { Browser } from '@capacitor/browser';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: 'QRIS' | 'VA_BCA' | 'VA_MANDIRI' | 'EWALLET_SHOPEEPAY' | 'EWALLET_GOPAY' | 'COD';
}

export async function openDuitkuPaymentModal(
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

    Browser.addListener('browserFinished', () => {
      if (onComplete) onComplete();
    });
  } catch (err) {
    console.debug('[Duitku Payment] Browser fallback:', err);
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank');
    }
  }
}
