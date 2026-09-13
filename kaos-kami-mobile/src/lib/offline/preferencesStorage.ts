import { Preferences } from '@capacitor/preferences';
import { StateStorage, createJSONStorage } from 'zustand/middleware';

/**
 * Storage Zustand di atas Capacitor Preferences (native, persist antar restart).
 * Fallback ke localStorage saat berjalan di browser desktop.
 */
function isNative(): boolean {
  try {
    return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export const preferencesStorage: StateStorage = {
  getItem: async (name) => {
    try {
      if (isNative()) {
        const { value } = await Preferences.get({ key: name });
        return value;
      }
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      if (isNative()) await Preferences.set({ key: name, value });
      else localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: async (name) => {
    try {
      if (isNative()) await Preferences.remove({ key: name });
      else localStorage.removeItem(name);
    } catch {}
  },
};

export const preferencesJsonStorage = () => createJSONStorage(() => preferencesStorage);

/**
 * KV generik di atas Preferences (native) + localStorage (web fallback).
 * Dipakai untuk kunci kecil yang sebelumnya di localStorage mentah:
 * queue, active_order, pending_payment, user_id, decal_px.
 * Selalu dual-write di web agar kode sync lama tetap jalan; baca async
 * adalah sumber kebenaran di native.
 */
export async function prefGet(key: string): Promise<string | null> {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) return value;
      // Migrasi sekali: baca sisa localStorage bila Preferences kosong.
      try {
        return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  try {
    if (isNative()) {
      await Preferences.set({ key, value });
      // Cermin localStorage agar pembaca sync (store 3D) tetap dapat nilai.
      try {
        if (typeof window !== 'undefined') localStorage.setItem(key, value);
      } catch {}
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
}

export async function prefRemove(key: string): Promise<void> {
  try {
    if (isNative()) await Preferences.remove({ key });
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch {}
  } catch {}
}
