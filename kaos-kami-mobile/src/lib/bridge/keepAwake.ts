import { KeepAwake } from '@capacitor-community/keep-awake';

export async function enableScreenKeepAwake() {
  try {
    await KeepAwake.keepAwake();
  } catch (err) {
    console.debug('[KeepAwake] Fallback: web preview mode');
  }
}

export async function disableScreenKeepAwake() {
  try {
    await KeepAwake.allowSleep();
  } catch (err) {
    console.debug('[KeepAwake] Fallback: web preview mode');
  }
}
