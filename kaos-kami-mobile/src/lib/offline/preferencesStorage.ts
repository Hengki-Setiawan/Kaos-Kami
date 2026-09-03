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
