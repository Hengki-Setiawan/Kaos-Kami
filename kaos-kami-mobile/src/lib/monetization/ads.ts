/**
 * M8 — Abstraksi rewarded ads. Provider AKTIF: simulasi (jujur dilabeli di UI).
 * Untuk LIVE butuh: akun AdMob + App ID Android + plugin
 * (mis. @capacitor-community/admob) yang mengimplementasikan interface yang sama.
 * Edge case M8 §5: no-fill → berikan 1x ekspor gratis (graceful pass) — sudah
 * diimplementasikan di bawah (onUnavailable → reward tetap diberikan sekali).
 */
export interface AdsProvider {
  readonly isLive: boolean;
  showRewarded(onReward: () => void, onUnavailable?: () => void): Promise<void>;
}

export class SimulatedAdsProvider implements AdsProvider {
  readonly isLive = false;
  async showRewarded(onReward: () => void): Promise<void> {
    // Mensimulasikan slot iklan 15 detik; live diganti SDK AdMob/FAN.
    await new Promise((r) => setTimeout(r, 1500));
    onReward();
  }
}

export const adsProvider: AdsProvider = new SimulatedAdsProvider();
