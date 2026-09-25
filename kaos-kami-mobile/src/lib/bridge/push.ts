import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

/**
 * N3 — Bridge push notification lengkap (Capacitor @capacitor/push-notifications).
 *
 * Listener yang didaftarkan:
 * - `registration` → token FCM/APNs (disimpan + diteruskan ke server)
 * - `registrationError` → kegagalan ambil token (log + callback, JANGAN crash)
 * - `pushNotificationReceived` → notifikasi masuk saat app foreground (toast)
 * - `pushNotificationActionPerformed` → user TAP notifikasi (navigasi)
 *
 * Token terakhir disimpan di memori + cermin localStorage
 * (`kaoskami_last_push_token`) agar bisa di-RE-REGISTER pasca-login/OTP
 * via `refreshPushTokenBinding()` — panggil setiap kali userId berubah
 * (login Google, OTP sukses, checkout sukses).
 */

const LAST_PUSH_TOKEN_KEY = 'kaoskami_last_push_token';

let lastPushToken: string | null = null;
try {
  lastPushToken =
    typeof window !== 'undefined' ? localStorage.getItem(LAST_PUSH_TOKEN_KEY) : null;
} catch {
  lastPushToken = null;
}

function rememberToken(token: string): void {
  lastPushToken = token;
  try {
    if (typeof window !== 'undefined') localStorage.setItem(LAST_PUSH_TOKEN_KEY, token);
  } catch {}
}

/** Token push terakhir yang pernah diterima perangkat ini (null bila belum ada). */
export function getLastPushToken(): string | null {
  if (lastPushToken) return lastPushToken;
  try {
    const v = typeof window !== 'undefined' ? localStorage.getItem(LAST_PUSH_TOKEN_KEY) : null;
    if (v) lastPushToken = v;
    return v;
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    return permStatus.receive === 'granted';
  } catch {
    return false;
  }
}

export interface PushHandlerOptions {
  /** Notifikasi masuk saat app foreground (tampilkan toast, JANGAN navigasi). */
  onForeground?: (notification: PushNotificationSchema) => void;
  /** Gagal registrasi token (FCM/APNs error) — untuk log/toast, bukan crash. */
  onRegistrationError?: (error: unknown) => void;
}

export async function registerPushNotificationHandlers(
  onToken: (token: string) => void,
  onNotificationTap: (action: ActionPerformed) => void,
  opts?: PushHandlerOptions
) {
  try {
    const granted = await requestPushPermission();
    if (!granted) return;

    // Hindari listener ganda bila dipanggil ulang (mis. StrictMode / re-mount).
    try {
      await PushNotifications.removeAllListeners();
    } catch {}

    await PushNotifications.addListener('registration', (token: Token) => {
      rememberToken(token.value);
      onToken(token.value);
    });

    // N3: error registrasi token — catat + teruskan, JANGAN lempar.
    await PushNotifications.addListener('registrationError', (error: unknown) => {
      try {
        console.warn('[Push] registrationError:', error);
      } catch {}
      try {
        opts?.onRegistrationError?.(error);
      } catch {}
    });

    // N3: notifikasi foreground — default toast via callback pemilik.
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        try {
          opts?.onForeground?.(notification);
        } catch {}
      }
    );

    await PushNotifications.addListener('pushNotificationActionPerformed', onNotificationTap);
    await PushNotifications.register();
  } catch (err) {
    console.debug('[Push] Native push not active in web mode');
  }
}

/**
 * N3 — Re-register token push ke server SETELAH identitas berubah.
 * Panggil pasca-login Google / OTP sukses / checkout sukses (userId baru).
 * No-op aman bila token belum ada (belum grant permission / web mode).
 *
 * @param userId userId baru; bila kosong, baca dari cermin localStorage.
 * @returns true bila terkirim, false bila dilewati/gagal (checkout tetap jalan).
 */
export async function refreshPushTokenBinding(userId?: string): Promise<boolean> {
  try {
    const token = getLastPushToken();
    if (!token) return false;
    let uid = (userId || '').trim();
    if (!uid) {
      try {
        uid =
          (typeof window !== 'undefined'
            ? localStorage.getItem('kaoskami_user_id') || ''
            : ''
          ).trim();
      } catch {
        uid = '';
      }
    }
    const { mobileApiClient } = await import('@/lib/api/mobileApiClient');
    return await mobileApiClient.registerPushToken(token, uid || undefined);
  } catch {
    return false;
  }
}

/** Alias eksplisit untuk dibaca di call-site login/OTP. */
export const reRegisterPushTokenAfterLogin = refreshPushTokenBinding;
