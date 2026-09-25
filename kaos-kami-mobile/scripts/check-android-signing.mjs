/**
 * Guard signing AAB/APK rilis (dipanggil script cap:build:aab / cap:build:apk).
 * Gagal CEPAT dengan pesan jelas bila kredensial signing tak tersedia —
 * JANGAN sampai Gradle meledak dengan "Value is null" yang samar.
 *
 * Sumber kredensial (salah satu wajib ada):
 * 1. Env CI: KAOSKAMI_STORE_PASSWORD + KAOSKAMI_KEY_PASSWORD
 *    (+ opsional KAOSKAMI_KEY_ALIAS, default "kaoskami"), atau
 * 2. File lokal (gitignored, JANGAN commit): android/key.properties
 *    berisi storePassword=... keyAlias=... keyPassword=...
 *
 * Catatan: keystore BETA (kaoskami-release.keystore) HANYA untuk sideload.
 * AAB Play Store WAJIB memakai keystore produksi baru (lihat
 * docs/NATIVE-DISTRIBUSI.md §L2 + §upload-play). Script ini TIDAK generate
 * keystore dan TIDAK membaca/mencetak password.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const keyProps = join(here, '..', 'android', 'key.properties');

const hasEnv =
  !!process.env.KAOSKAMI_STORE_PASSWORD && !!process.env.KAOSKAMI_KEY_PASSWORD;
const hasPropsFile = existsSync(keyProps);

if (!hasEnv && !hasPropsFile) {
  console.error(
    [
      '[signing-guard] Kredensial signing rilis TIDAK DITEMUKAN.',
      'Pilih salah satu:',
      '  1. CI: set secrets KAOSKAMI_STORE_PASSWORD + KAOSKAMI_KEY_PASSWORD',
      '     (+ opsional KAOSKAMI_KEY_ALIAS), atau',
      '  2. Lokal: salin android/key.properties.example → android/key.properties',
      '     lalu isi password (file ini gitignored — JANGAN di-commit).',
      'Lihat docs/NATIVE-DISTRIBUSI.md (§N1 + §L2). Build DIBATALKAN.',
    ].join('\n')
  );
  process.exit(1);
}

console.log(
  `[signing-guard] OK (sumber: ${hasEnv ? 'env/CI secrets' : 'android/key.properties'}).`
);
