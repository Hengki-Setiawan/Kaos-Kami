/**
 * M8 — Abstraksi monetisasi. Provider AKTIF: simulasi lokal (jujur dilabeli di UI).
 * Untuk LIVE butuh: akun Google Play Console + produk in-app Rp29.000/bln, lalu
 * ganti SimulatedBillingProvider dengan plugin billing (mis. @capgo/capacitor-purchase)
 * yang mengimplementasikan interface yang sama. Purchase token WAJIB divalidasi
 * server-side sebelum mengaktifkan Pro (edge case M8 §5).
 */
export interface BillingResult {
  ok: boolean;
  purchaseToken?: string;
  simulated: boolean;
}

export interface BillingProvider {
  readonly isLive: boolean;
  purchaseProMonthly(): Promise<BillingResult>;
}

export class SimulatedBillingProvider implements BillingProvider {
  readonly isLive = false;
  async purchaseProMonthly(): Promise<BillingResult> {
    await new Promise((r) => setTimeout(r, 800));
    return { ok: true, purchaseToken: `SIM-${Date.now()}`, simulated: true };
  }
}

export const billingProvider: BillingProvider = new SimulatedBillingProvider();
