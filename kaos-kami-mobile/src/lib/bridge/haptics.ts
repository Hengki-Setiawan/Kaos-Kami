import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const haptic = {
  tap: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Safe fallback for web preview
    }
  },
  tapMedium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Safe fallback
    }
  },
  tapHeavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Safe fallback
    }
  },
  success: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Safe fallback
    }
  },
  error: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Safe fallback
    }
  },
  warning: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Safe fallback
    }
  },
  selection: async () => {
    try {
      await Haptics.selectionChanged();
    } catch {
      // Safe fallback
    }
  },
  snapDecal: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Safe fallback
    }
  },
  addToCart: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Safe fallback
    }
  },
};
