import { StatusBar, Style } from '@capacitor/status-bar';

export async function initEdgeToEdgeStatusBar() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: '#0E0E10' });
  } catch (err) {
    // Non-native web preview fallback
    console.debug('[StatusBar] Running on web or unsupported platform');
  }
}
