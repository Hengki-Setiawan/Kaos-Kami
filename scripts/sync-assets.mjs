import fs from 'fs';
import path from 'path';

const srcModelsDir = path.resolve('kaos-kami-web/public/models');
const destModelsDir = path.resolve('kaos-kami-mobile/public/models');

if (!fs.existsSync(destModelsDir)) {
  fs.mkdirSync(destModelsDir, { recursive: true });
}

if (fs.existsSync(srcModelsDir)) {
  const files = fs.readdirSync(srcModelsDir);
  let count = 0;
  for (const file of files) {
    const srcFile = path.join(srcModelsDir, file);
    const destFile = path.join(destModelsDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      count++;
    }
  }
  console.log(`[Sync Assets] Berhasil menyinkronkan ${count} file 3D model ke kaos-kami-mobile!`);
} else {
  console.warn(`[Sync Assets] Direktori sumber ${srcModelsDir} tidak ditemukan.`);
}
