import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = 'E:\\Blender-Portable';
const ZIP_PATH = path.join(TARGET_DIR, 'blender-3.6.9.zip');
const BLENDER_DIR = path.join(TARGET_DIR, 'blender-3.6.9-windows-x64');
const BLENDER_EXE = path.join(BLENDER_DIR, 'blender.exe');
const DOWNLOAD_URL = 'https://download.blender.org/release/Blender3.6/blender-3.6.9-windows-x64.zip';

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

fs.writeFileSync(
  path.join(TARGET_DIR, 'BACA-SAYA.txt'),
  `Folder ini berisi Blender Portable 3.6 LTS untuk otomasi rigging pakaian Kaos Kami.
Sifatnya 100% PORTABLE (tidak diinstal ke Registry Windows).
Jika sewaktu-waktu Anda ingin menghapusnya, Anda bisa langsung DELETE folder 'E:\\Blender-Portable' ini kapan saja dengan aman.
`
);

if (fs.existsSync(BLENDER_EXE)) {
  console.log('[setup_blender] Blender Portable sudah ada di:', BLENDER_EXE);
  const ver = execSync(`"${BLENDER_EXE}" --version`, { encoding: 'utf8' });
  console.log(ver.split('\n')[0]);
  process.exit(0);
}

console.log('[setup_blender] Mengunduh/Melanjutkan Blender 3.6.9 via curl dengan resume (-C -)...');
try {
  execSync(
    `curl.exe -C - -L --retry 5 --retry-delay 3 -o "${ZIP_PATH}" "${DOWNLOAD_URL}"`,
    { stdio: 'inherit' }
  );
  console.log('[setup_blender] Selesai mengunduh! Mengekstrak dengan tar.exe...');
  execSync(`tar -xf "${ZIP_PATH}" -C "${TARGET_DIR}"`, { stdio: 'inherit' });
  console.log('[setup_blender] Ekstraksi selesai!');
  if (fs.existsSync(ZIP_PATH)) {
    fs.unlinkSync(ZIP_PATH);
  }
  const ver = execSync(`"${BLENDER_EXE}" --version`, { encoding: 'utf8' });
  console.log('[setup_blender] Verifikasi instalasi berhasil:', ver.split('\n')[0]);
} catch (err) {
  console.error('[setup_blender] Error:', err);
  process.exit(1);
}
