import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { haptic } from './haptics';

/**
 * M5.6 — Barcode & QRIS Scanner Engine (MLKit).
 * dipakai admin untuk scan Job Ticket / QR pesanan.
 */
export async function scanJobTicketOrQris(): Promise<string | null> {
  haptic.tapMedium();

  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() !== true) {
    const mock = prompt('Mode Web: masukkan ID Pesanan manual:');
    return mock || null;
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
