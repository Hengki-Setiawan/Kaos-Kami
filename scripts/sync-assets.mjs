import fs from 'fs';
import path from 'path';

const srcModelsDir = path.resolve('kaos-kami-web/public/models');
const destModelsDir = path.resolve('kaos-kami-mobile/public/models');
const androidModelsDir = path.resolve('kaos-kami-mobile/android/app/src/main/assets/public/models');

// SOFT-DISABLE DRACO 14 Sep 2026 (keputusan owner, paritas web non-Draco):
// JANGAN salin varian Draco (*.draco.glb) maupun decoder (public/decoders/draco/)
// ke public/ — keduanya diarsipkan di backups/draco-archive/ (lihat RESTORE.md).
// Decoder memang tak pernah di-sync script ini (catatan pengaman agar tak ditambahkan).
const EXCLUDE_PATTERNS = [/\.draco\.glb$/i];

if (!fs.existsSync(destModelsDir)) {
  fs.mkdirSync(destModelsDir, { recursive: true });
}

if (!fs.existsSync(androidModelsDir) && fs.existsSync(path.resolve('kaos-kami-mobile/android'))) {
  fs.mkdirSync(androidModelsDir, { recursive: true });
}

if (fs.existsSync(srcModelsDir)) {
  const files = fs.readdirSync(srcModelsDir);
  let count = 0;
  let androidCount = 0;
  for (const file of files) {
    if (EXCLUDE_PATTERNS.some((re) => re.test(file))) {
      continue; // lewati arsip Draco (soft-disable 14 Sep 2026)
    }
    const srcFile = path.join(srcModelsDir, file);
    const destFile = path.join(destModelsDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      count++;
      if (fs.existsSync(androidModelsDir)) {
        fs.copyFileSync(srcFile, path.join(androidModelsDir, file));
        androidCount++;
      }
    }
  }
  console.log(`[Sync Assets] Berhasil menyinkronkan ${count} file 3D model ke kaos-kami-mobile/public/models!`);
  if (androidCount > 0) {
    console.log(`[Sync Assets] Berhasil menyinkronkan ${androidCount} file 3D model ke android assets!`);
  }
} else {
  console.warn(`[Sync Assets] Direktori sumber ${srcModelsDir} tidak ditemukan.`);
}
