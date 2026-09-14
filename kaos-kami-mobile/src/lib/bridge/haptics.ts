import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Fallback web: Capacitor Haptics tak tersedia di browser/preview → pakai
// navigator.vibrate bila ada. Pola dibedakan per intensitas agar umpan balik
// tetap terasa walau kasar. Bungkus try/catch: vibrate tak boleh melempar.
function vibrateFallback(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(pattern);
      } catch {
        // Abaikan: vibrasi web bersifat best-effort.
      }
    }
  } catch {
    // Abaikan: fallback tak boleh mengganggu alur utama.
  }
}

export const haptic = {
  tap: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      vibrateFallback(10);
    }
  },
  tapMedium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      vibrateFallback(20);
    }
  },
  tapHeavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      vibrateFallback(30);
    }
  },
  success: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      vibrateFallback([10, 50, 10]);
    }
  },
  error: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      vibrateFallback([50, 50, 50]);
    }
  },
  warning: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      vibrateFallback([30, 50, 30]);
    }
  },
  selection: async () => {
    try {
      await Haptics.selectionChanged();
    } catch {
      vibrateFallback(8);
    }
  },
  snapDecal: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      vibrateFallback(10);
    }
  },
  addToCart: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      vibrateFallback([10, 50, 10]);
    }
  },
};
