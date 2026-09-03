import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function isBiometricsAvailable(): Promise<boolean> {
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function verifyUserBiometrics(
  reason: string = 'Autentikasi akun Kaos Kami'
): Promise<boolean> {
  try {
    const available = await isBiometricsAvailable();
    if (!available) return false;

    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Verifikasi Biometrik',
      subtitle: 'Gunakan Sidik Jari atau Face ID',
      description: 'Akses instan ke dashboard pesanan sablon Anda',
    });

    return true;
  } catch (err) {
    console.debug('[Biometrics] Cancelled or fallback to password:', err);
    return false;
  }
}
