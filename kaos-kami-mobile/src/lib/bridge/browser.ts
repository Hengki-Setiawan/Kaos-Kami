import { Browser } from '@capacitor/browser';

export async function openInAppBrowser(url: string): Promise<void> {
  try {
    await Browser.open({
      url,
      windowName: '_blank',
      toolbarColor: '#0E0E10',
      presentationStyle: 'popover',
    });
  } catch (err) {
    console.warn('[BrowserBridge] Error opening In-App Browser, falling back to window.open:', err);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }
}

export async function closeInAppBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // Ignore error
  }
}
