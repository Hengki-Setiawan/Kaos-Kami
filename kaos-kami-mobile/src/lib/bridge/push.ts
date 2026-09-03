import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';

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

export async function registerPushNotificationHandlers(
  onToken: (token: string) => void,
  onNotificationTap: (action: ActionPerformed) => void
) {
  try {
    const granted = await requestPushPermission();
    if (!granted) return;

    await PushNotifications.addListener('registration', (token: Token) => {
      onToken(token.value);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', onNotificationTap);
    await PushNotifications.register();
  } catch (err) {
    console.debug('[Push] Native push not active in web mode');
  }
}
