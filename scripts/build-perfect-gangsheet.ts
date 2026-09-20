import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  GANG_BIN_W_MM,
  GANG_BIN_H_MM,
  packGangSheet,
  type GangPackResult,
  type GangPlacement,
  type GangRect,
} from "../kaos-kami-web/src/lib/gangPacker.ts";

const MASCOT_DIR = path.resolve(process.cwd(), "Kaos Kami Mascot");
const OUTPUT_DIR = path.resolve(process.cwd(), "Blueprint/hasil-pengujian-e2e/gang-sheets");
const CACHE_DIR = path.resolve(OUTPUT_DIR, ".trimmed_cache");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// 1. Fungsi Cerdas Auto-Trim & Cutout Background (Pangkas Kanvas Putih/Hitam)
async function getCleanCutoutAndBounds(filename: string): Promise<{
  trimmedBuffer: Buffer;
  wMm: number;
  hMm: number;
  aspectRatio: number;
}> {
  const cachePath = path.join(CACHE_DIR, `trimmed_${filename}`);
  const metaCachePath = path.join(CACHE_DIR, `meta_${filename}.json`);

  if (fs.existsSync(cachePath) && fs.existsSync(metaCachePath)) {
    const meta = JSON.parse(fs.readFileSync(metaCachePath, "utf-8"));
    return {
      trimmedBuffer: fs.readFileSync(cachePath),
      wMm: meta.wMm,
      hMm: meta.hMm,
      aspectRatio: meta.aspectRatio,
    };
  }

  const p = path.join(MASCOT_DIR, filename);
  const img = sharp(p).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  const bgR = data[0], bgG = data[1], bgB = data[2];
  const isLightBg = (bgR + bgG + bgB) / 3 > 128;
  const isTransparent = data[3] === 0;

  if (isTransparent) {
    // Sudah transparan murni, tinggal cari bounding box non-zero alpha
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const cropW = Math.max(10, maxX - minX + 1);
    const cropH = Math.max(10, maxY - minY + 1);
    const trimmed = await sharp(p)
      .extract({ left: minX, top: minY, width: cropW, height: cropH })
      .png()
      .toBuffer();

    const result = {
      trimmedBuffer: trimmed,
      wMm: 100, // default
      hMm: Math.round(100 * (cropH / cropW)),
      aspectRatio: cropW / cropH,
    };
    fs.writeFileSync(cachePath, trimmed);
    fs.writeFileSync(metaCachePath, JSON.stringify(result));
    return result;
  }

  // Flood fill dari 4 sisi untuk menghapus background solid luar (putih atau hitam)
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  function isSimilar(idx: number) {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    if (isLightBg) {
      const diff = Math.hypot(r - bgR, g - bgG, b - bgB);
      return diff < 52 || (r > 220 && g > 220 && b > 220);
    } else {
      const diff = Math.hypot(r - bgR, g - bgG, b - bgB);
      return diff < 52 || (r < 25 && g < 25 && b < 25);
    }
  }

  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const pIdx = y * w + x;
    if (visited[pIdx]) continue;
    visited[pIdx] = 1;

    const bIdx = pIdx * 4;
    if (isSimilar(bIdx)) {
      data[bIdx + 3] = 0; // Ubah background jadi transparan
      if (x > 0 && !visited[pIdx - 1]) queue.push(x - 1, y);
      if (x < w - 1 && !visited[pIdx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[pIdx - w]) queue.push(x, y - 1);
      if (y < h - 1 && !visited[pIdx + w]) queue.push(x, y + 1);
    }
  }

  // Cari tight bounding box
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = Math.max(10, maxX - minX + 1);
  const cropH = Math.max(10, maxY - minY + 1);

  // Buat cutout PNG transparan murni yang sudah di-crop ketat
  const cutout = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  const result = {
    trimmedBuffer: cutout,
    wMm: 100,
    hMm: Math.round(100 * (cropH / cropW)),
    aspectRatio: cropW / cropH,
  };
  fs.writeFileSync(cachePath, cutout);
  fs.writeFileSync(metaCachePath, JSON.stringify(result));
  return result;
}

// 2. Daftar Permintaan Sablon Realistis Sesuai Mockup 3D User
interface PrintOrderItem {
  id: string;
  label: string;
  filename: string;
  targetWidthCm: number;
  qty: number;
}

const PRODUCTION_ORDER_LIST: PrintOrderItem[] = [
  // 1. Dada Penuh A3 Kaos Boxy
  {
    id: "mascot-primary-a3",
    label: "Maskot Kaos Kami Primary (A3 Dada Depan)",
    filename: "Gemini_Generated_Image_awh96wawh96wawh9.png",
    targetWidthCm: 28.0,
    qty: 1,
  },
  // 2. Sablon Punggung A4 Hoodie
  {
    id: "mascot-sablon-a4",
    label: "Maskot Sablon DTF Workshop (A4 Punggung)",
    filename: "Gemini_Generated_Image_djm4hudjm4hudjm4.png",
    targetWidthCm: 25.0,
    qty: 1,
  },
  // 3. Sablon Dada A4 Kaos Putih
  {
    id: "mascot-cool-a4",
    label: "Maskot Streetwear Cool (A4 Dada)",
    filename: "Gemini_Generated_Image_saq9ybsaq9ybsaq9.png",
    targetWidthCm: 22.0,
    qty: 1,
  },
  // 4. Sablon Longsleeve Dynamic Action
  {
    id: "mascot-action-a5",
    label: "Maskot Dynamic Action (A5 Sedang)",
    filename: "Gemini_Generated_Image_h6213lh6213lh621.png",
    targetWidthCm: 14.0,
    qty: 1,
  },
  // 5. Sablon Streetwear Cyber Neon
  {
    id: "mascot-cyber-a5",
    label: "Maskot Cyber Neon Edition (A5 Sedang)",
    filename: "Gemini_Generated_Image_z8k72pz8k72pz8k7.png",
    targetWidthCm: 14.0,
    qty: 1,
  },
  // 6. Sablon Lengan Vertikal Longsleeve
  {
    id: "mascot-sleeve-vert",
    label: "Maskot Typography Sleeve Art",
    filename: "Gemini_Generated_Image_zc43r8zc43r8zc43.png",
    targetWidthCm: 8.5,
    qty: 1,
  },
  // 7. Badge Jaket Warrior
  {
    id: "badge-warrior",
    label: "Maskot Warrior Badge",
    filename: "Gemini_Generated_Image_b350osb350osb350.png",
    targetWidthCm: 12.0,
    qty: 1,
  },
  // 8. Badge Jaket Streetwear
  {
    id: "badge-streetwear",
    label: "Maskot Streetwear Badge",
    filename: "Gemini_Generated_Image_pc3c96pc3c96pc3c.png",
    targetWidthCm: 12.0,
    qty: 1,
  },
  // 9. Logo Brand Fix Primary
  {
    id: "logo-brand-fix",
    label: "Logo Brand Kaos Kami",
    filename: "logo fix.png",
    targetWidthCm: 13.0,
    qty: 2,
  },
  // 10. Emblem Hexagon Badge
  {
    id: "emblem-hexagon",
    label: "Emblem Hexagon Kaos Kami",
    filename: "logo fix 2.png",
    targetWidthCm: 10.0,
    qty: 2,
  },
  // 11. Logo Saku Kaos Hitam
  {
    id: "logo-saku-hitam",
    label: "Logo Saku Kaos Hitam",
    filename: "Logo Kaos Kami Hitam.png",
    targetWidthCm: 9.0,
    qty: 2,
  },
  // 12. Logo Saku Kaos Putih
  {
    id: "logo-saku-putih",
    label: "Logo Saku Kaos Putih",
    filename: "Logo Kaos Kami Putih.png",
    targetWidthCm: 9.0,
    qty: 2,
  },
  // 13. Crest Saku Dada Shield
  {
    id: "crest-shield",
    label: "Pocket Shield Crest",
    filename: "Gemini_Generated_Image_n0wukyn0wukyn0wu.png",
    targetWidthCm: 8.5,
    qty: 2,
  },
  // 14. Label Kerah Leher Belakang
  {
    id: "neck-label",
    label: "Logo Kerah Leher Belakang",
    filename: "Logo Kaos Kami Putih.png",
    targetWidthCm: 5.5,
    qty: 6,
  },
];

async function main() {
  console.log("=================================================================");
  console.log("🚀 MEMULAI PENYUSUNAN GANG SHEET DTF 100x58cm OTENTIK TANPA BANNER");
  console.log("   (Auto-Cutout, Trim Kanvas Kosong & Tepat Skala 1:1 Mockup 3D)");
  console.log("=================================================================\n");

  // 1. Ekstrak cutout transparan & hitung dimensi mm sebenarnya
  console.log("1. Melakukan Auto-Cutout & Menghitung Bounding Box Presisi...");
  const processedItems: {
    item: PrintOrderItem;
    cutoutBuffer: Buffer;
    wMm: number;
    hMm: number;
  }[] = [];

  for (const item of PRODUCTION_ORDER_LIST) {
    const cutout = await getCleanCutoutAndBounds(item.filename);
    const targetWMm = Math.round(item.targetWidthCm * 10);
    const targetHMm = Math.round(targetWMm / cutout.aspectRatio);

    processedItems.push({
      item,
      cutoutBuffer: cutout.trimmedBuffer,
      wMm: targetWMm,
      hMm: targetHMm,
    });

    console.log(
      `   ✓ [${item.filename.slice(0, 30)}...] -> Fisik: ${(targetWMm / 10).toFixed(1)} cm × ${(targetHMm / 10).toFixed(1)} cm (Qty: ${item.qty})`
    );
  }

  // 2. Siapkan GangRects untuk algoritma MaxRects Packing
  const gangRects: GangRect[] = processedItems.map((p) => ({
    id: p.item.id,
    wMm: p.wMm,
    hMm: p.hMm,
    qty: p.item.qty,
    label: p.item.label,
    orderNumber: "KK-PROD-2026",
    masterUrl: p.item.filename,
    allowRotation: true,
  }));

  const totalCopies = gangRects.reduce((acc, r) => acc + r.qty, 0);
  console.log(`\n2. Menjalankan MaxRects Packing Engine (1000mm × 580mm)...`);
  console.log(`   - Total Desain: ${gangRects.length} macam | Total Kopi Cetak: ${totalCopies} pcs`);

  // Jarak potong aman antar desain: 6 mm (standar gunting/cutter DTF)
  // Margin aman tepi roll: 8 mm
  const GAP_MM = 6;
  const MARGIN_MM = 8;

  const packResult: GangPackResult = packGangSheet(gangRects, {
    binWmm: GANG_BIN_W_MM,
    binHmm: GANG_BIN_H_MM,
    gapMm: GAP_MM,
    marginMm: MARGIN_MM,
  });

  const bin0 = packResult.bins[0];
  console.log(`   - Total Bin Terpakai:    ${packResult.bins.length} bin`);
  console.log(`   - Utilisasi Area Roll:   ${packResult.utilizationPct.toFixed(2)}%`);
  console.log(`   - Jumlah Desain Dimuat:  ${bin0.length} pcs`);
  console.log(`   - Desain Tak Muat:       ${packResult.unplaced.length} pcs`);

  // 3. Konfigurasi Rendering Kanvas PNG Master DTF
  // 150 DPI = 5906 × 3425 piksel (tajam, jernih, dan tidak berat)
  const DPI = 150;
  const MM_TO_PX = (mm: number) => Math.round((mm / 25.4) * DPI);

  const canvasWidthPx = MM_TO_PX(GANG_BIN_W_MM);
  const canvasHeightPx = MM_TO_PX(GANG_BIN_H_MM);

  console.log(`\n3. Merender Kanvas Master PNG (${canvasWidthPx} × ${canvasHeightPx} piksel)...`);

  // 4. Siapkan dua kanvas:
  // Kanvas A: Realistis Dark PET Film (Tekstur film transparan gelap agar gambar putih & hitam terlihat jelas saat diinspeksi manusia)
  // Kanvas B: 100% Transparan Murni (Khusus mesin printer DTF AcroRIP / Hoson)

  const filmBgSvg = `
  <svg width="${canvasWidthPx}" height="${canvasHeightPx}" viewBox="0 0 ${canvasWidthPx} ${canvasHeightPx}" xmlns="http://www.w3.org/2000/svg">
    <!-- Tekstur dasar film PET matte gelap transparan -->
    <rect width="${canvasWidthPx}" height="${canvasHeightPx}" fill="#0a0e17" />
    
    <!-- Garis potong panduan tipis per 100mm (grid cetak) -->
    <defs>
      <pattern id="filmGrid" width="${MM_TO_PX(100)}" height="${MM_TO_PX(100)}" patternUnits="userSpaceOnUse">
        <rect width="${MM_TO_PX(100)}" height="${MM_TO_PX(100)}" fill="none" stroke="#131c2d" stroke-width="0.8"/>
      </pattern>
    </defs>
    <rect width="${canvasWidthPx}" height="${canvasHeightPx}" fill="url(#filmGrid)" />
  </svg>
  `;

  const compositeDarkLayers: sharp.OverlayOptions[] = [];
  const compositeTransLayers: sharp.OverlayOptions[] = [];

  console.log(`\n4. Menempelkan gambar maskot asli murni tanpa bingkai dan tanpa banner...`);

  for (let i = 0; i < bin0.length; i++) {
    const p = bin0[i];
    const proc = processedItems.find((it) => it.item.id === p.id);
    if (!proc) continue;

    const leftPx = MM_TO_PX(p.xMm);
    const topPx = MM_TO_PX(p.yMm);
    const widthPx = MM_TO_PX(p.wMm);
    const heightPx = MM_TO_PX(p.hMm);

    // Proses gambar cutout: rotasi jika packer merotasi 90 derajat
    let imgPipe = sharp(proc.cutoutBuffer);
    if (p.rot) {
      imgPipe = imgPipe.rotate(90);
    }

    // Resize presisi ke ukuran target tanpa distorsi rasio
    const resizedBuffer = await imgPipe
      .resize(widthPx, heightPx, {
        fit: "inside",
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const meta = await sharp(resizedBuffer).metadata();
    const actualW = meta.width || widthPx;
    const actualH = meta.height || heightPx;

    // Hitung penempatan tepat di tengah kotak slot
    const posX = leftPx + Math.round((widthPx - actualW) / 2);
    const posY = topPx + Math.round((heightPx - actualH) / 2);

    compositeDarkLayers.push({
      input: resizedBuffer,
      left: posX,
      top: posY,
    });

    compositeTransLayers.push({
      input: resizedBuffer,
      left: posX,
      top: posY,
    });

    console.log(
      `   [#${i + 1}] Ditempel: ${proc.item.label.slice(0, 35)}... -> (${p.xMm}, ${p.yMm}) mm | ${(p.wMm / 10).toFixed(1)}×${(p.hMm / 10).toFixed(1)} cm ${p.rot ? "⟳90°" : ""}`
    );
  }

  // 5. Render Berkas PNG Asli A: Realistis Film PET Preview
  console.log(`\n5. Meng-export berkas PNG Master...`);
  const darkBase = await sharp(Buffer.from(filmBgSvg)).png().toBuffer();
  const masterDarkPng = await sharp(darkBase)
    .composite(compositeDarkLayers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const darkOutputPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-asli-dtf.png");
  fs.writeFileSync(darkOutputPath, masterDarkPng);
  console.log(`   ✓ [1] Berkas PNG Asli (Film Preview Bersih) Disimpan:`);
  console.log(`       -> ${darkOutputPath} (${(masterDarkPng.length / 1024 / 1024).toFixed(2)} MB)`);

  // 6. Render Berkas PNG Asli B: 100% Transparan Murni untuk Mesin Sablon AcroRIP
  const transBase = await sharp({
    create: {
      width: canvasWidthPx,
      height: canvasHeightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const masterTransPng = await sharp(transBase)
    .composite(compositeTransLayers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const transOutputPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-transparent-printhead.png");
  fs.writeFileSync(transOutputPath, masterTransPng);
  console.log(`   ✓ [2] Berkas PNG Transparan Murni (Untuk AcroRIP Printer) Disimpan:`);
  console.log(`       -> ${transOutputPath} (${(masterTransPng.length / 1024 / 1024).toFixed(2)} MB)`);

  // 7. Render Berkas Preview Cepat Ringan (2400 px) untuk dibuka instan
  const previewThumbPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-asli-dtf-preview.png");
  await sharp(masterDarkPng).resize(2400).png({ quality: 85 }).toFile(previewThumbPath);
  const thumbStat = fs.statSync(previewThumbPath);
  console.log(`   ✓ [3] Berkas Preview Ringan (Instan Dibuka):`);
  console.log(`       -> ${previewThumbPath} (${(thumbStat.size / 1024 / 1024).toFixed(2)} MB)`);

  console.log("\n=================================================================");
  console.log("✅ GANG SHEET ASLI BERSIH TANPA BANNER DAN TANPA KOTAK SELESAI 100%!");
  console.log("=================================================================\n");
}

main().catch(console.error);
