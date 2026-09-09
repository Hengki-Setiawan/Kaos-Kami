import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GpsCoords {
  lat: number;
  lon: number;
}

/**
 * Lokasi HP lintas-platform (audit: navigator.geolocation mentah tanpa izin
 * = gagal diam di WebView native). Alur: cek izin → minta bila perlu →
 * baca posisi → timeout 15 detik. Web murni pakai browser API.
 */
export async function getCurrentCoords(): Promise<GpsCoords | null> {
  try {
    if (!Capacitor.isNativePlatform()) {
      if (!('geolocation' in navigator)) return null;
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000,
          maximumAge: 60000,
        });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    }
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      perm = await Geolocation.requestPermissions();
    }
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      return null;
    }
    const pos = await Geolocation.getCurrentPosition({ timeout: 15000, maximumAge: 60000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}
