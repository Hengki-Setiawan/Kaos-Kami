import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Dialog lintas-platform (audit komponen #21-23):
 * native di HP (Capacitor Dialog — window.confirm/prompt tak andal di WebView),
 * fallback browser di web.
 */
export async function confirmAction(title: string, message: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { value } = await Dialog.confirm({
        title,
        message,
        okButtonTitle: 'YA',
        cancelButtonTitle: 'BATAL',
      });
      return value;
    } catch {
      return false;
    }
  }
  return window.confirm(`${title}\n\n${message}`);
}

export async function promptText(
  title: string,
  message: string,
  placeholder?: string,
  initial?: string
): Promise<string | null> {
  if (isNative()) {
    try {
      const { value, cancelled } = await Dialog.prompt({
        title,
        message,
        okButtonTitle: 'OK',
        cancelButtonTitle: 'BATAL',
        inputPlaceholder: placeholder,
        inputText: initial,
      });
      return cancelled ? null : value || null;
    } catch {
      return null;
    }
  }
  const v = window.prompt(`${title}\n\n${message}`, initial || '');
  return v && v.trim() ? v.trim() : null;
}

export async function alertMsg(title: string, message: string): Promise<void> {
  if (isNative()) {
    try {
      await Dialog.alert({ title, message, buttonTitle: 'OK' });
      return;
    } catch {}
  }
  window.alert(`${title}\n\n${message}`);
}
