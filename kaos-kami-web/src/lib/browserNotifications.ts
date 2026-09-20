// Web Browser Notifications API Helper

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      try {
        new Notification("Kaos Kami Makassar", {
          body: "Notifikasi aktif! Anda akan menerima update status cetak sablon DTF & pengiriman secara instan.",
          icon: "/brand/logo-white-clean.png",
          tag: "kk-welcome",
        });
      } catch {
        // Fallback for browsers with strict notification construction policies
      }
    }
    return perm;
  } catch (e) {
    console.warn("Gagal meminta izin notifikasi browser:", e);
    return "denied";
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }
  try {
    new Notification(title, {
      icon: "/brand/logo-white-clean.png",
      badge: "/brand/logo-white-clean.png",
      ...options,
    });
    return true;
  } catch (e) {
    console.warn("Gagal memicu browser notification:", e);
    return false;
  }
}
