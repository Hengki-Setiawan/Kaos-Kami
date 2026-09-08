import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { haptic } from './haptics';
import { promptText } from './dialogs';

/**
 * M5.6 — Barcode & QRIS Scanner Engine (MLKit).
 * dipakai admin untuk scan Job Ticket / QR pesanan.
 */
export async function scanJobTicketOrQris(): Promise<string | null> {
  haptic.tapMedium();

  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() !== true) {
    // Web: prompt browser cukup. Native: JANGAN window.prompt (tak andal di WebView).
    return promptText('Mode Web', 'Masukkan ID Pesanan manual:', 'cth: KK-20260908-0001');
  }

  try {
    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) return null;

    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') return null;

    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128],
    });

    if (barcodes.length > 0) {
      await haptic.success();
      return barcodes[0]?.rawValue ?? null;
    }
    return null;
  } catch (err) {
    console.warn('[Scanner Error]:', err);
    return null;
  }
}
