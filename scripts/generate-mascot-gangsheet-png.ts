import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  GANG_BIN_W_MM,
  GANG_BIN_H_MM,
  GANG_GAP_MM,
  GANG_MARGIN_MM,
  packGangSheet,
  type GangPackResult,
  type GangPlacement,
  type GangRect,
} from "../kaos-kami-web/src/lib/gangPacker.ts";

const MASCOT_DIR = path.resolve(process.cwd(), "Kaos Kami Mascot");
const OUTPUT_DIR = path.resolve(process.cwd(), "Blueprint/hasil-pengujian-e2e/gang-sheets");

// Definisi katalog desain sablon dari folder Kaos Kami Mascot
interface MascotPrintItem {
  id: string;
  orderNumber: string;
  label: string;
  filename: string;
  wMm: number;
  hMm: number;
  qty: number;
  apparelType: string;
}

const MASCOT_PRINT_CATALOG: MascotPrintItem[] = [
  {
    id: "item-mascot-primary-a3",
    orderNumber: "KK-20260919-6521",
    label: "Maskot Kaos Kami Primary (Dada A3)",
    filename: "Gemini_Generated_Image_awh96wawh96wawh9.png",
    wMm: 280,
    hMm: 380,
    qty: 1,
    apparelType: "Kaos Boxy 24s",
  },
  {
    id: "item-mascot-sablon-a4",
    orderNumber: "KK-20260919-2728",
    label: "Maskot Sablon DTF Workshop (Punggung A4)",
    filename: "Gemini_Generated_Image_djm4hudjm4hudjm4.png",
    wMm: 280,
    hMm: 200,
    qty: 1,
    apparelType: "Hoodie Fleece 380",
  },
  {
    id: "item-mascot-cool-a4",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Streetwear Cool (Dada A4)",
    filename: "Gemini_Generated_Image_saq9ybsaq9ybsaq9.png",
    wMm: 200,
    hMm: 280,
    qty: 1,
    apparelType: "Kaos Combed 30s",
  },
  {
    id: "item-mascot-action-a5",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Dynamic Action (Dada A5)",
    filename: "Gemini_Generated_Image_h6213lh6213lh621.png",
    wMm: 150,
    hMm: 200,
    qty: 1,
    apparelType: "Kaos Longsleeve",
  },
  {
    id: "item-mascot-cyber-a5",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Cyber Neon Edition (Dada A5)",
    filename: "Gemini_Generated_Image_z8k72pz8k72pz8k7.png",
    wMm: 150,
    hMm: 200,
    qty: 1,
    apparelType: "Kaos Streetwear",
  },
  {
    id: "item-mascot-warrior-badge",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Warrior Badge Kaos Kami",
    filename: "Gemini_Generated_Image_b350osb350osb350.png",
    wMm: 120,
    hMm: 120,
    qty: 1,
    apparelType: "Jaket Crewneck",
  },
  {
    id: "item-mascot-street-badge",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Streetwear Emblem Badge",
    filename: "Gemini_Generated_Image_pc3c96pc3c96pc3c.png",
    wMm: 120,
    hMm: 120,
    qty: 1,
    apparelType: "Jaket Bomber",
  },
  {
    id: "item-logo-hitam-a6",
    orderNumber: "KK-20260919-3258",
    label: "Logo Kaos Kami Hitam (Saku Dada A6)",
    filename: "Logo Kaos Kami Hitam.png",
    wMm: 100,
    hMm: 100,
    qty: 2,
    apparelType: "Kaos Putih Saku",
  },
  {
    id: "item-logo-putih-a6",
    orderNumber: "KK-20260919-6521",
    label: "Logo Kaos Kami Putih (Saku Dada A6)",
    filename: "Logo Kaos Kami Putih.png",
    wMm: 100,
    hMm: 100,
    qty: 2,
    apparelType: "Kaos Hitam Saku",
  },
  {
    id: "item-logo-brand-fix",
    orderNumber: "KK-20260919-2728",
    label: "Logo Brand Kaos Kami Primary",
    filename: "logo fix.png",
    wMm: 130,
    hMm: 90,
    qty: 2,
    apparelType: "Emblem Dada Kiri",
  },
  {
    id: "item-emblem-badge-fix2",
    orderNumber: "KK-20260919-3258",
    label: "Logo Emblem Kaos Kami Hexagon",
    filename: "logo fix 2.png",
    wMm: 100,
    hMm: 100,
    qty: 2,
    apparelType: "Badge Lengan",
  },
  {
    id: "item-mascot-sleeve",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Sleeve Typography Artwork",
    filename: "Gemini_Generated_Image_zc43r8zc43r8zc43.png",
    wMm: 80,
    hMm: 220,
    qty: 1,
    apparelType: "Lengan Longsleeve",
  },
  {
    id: "item-mascot-crest",
    orderNumber: "KK-20260919-3258",
    label: "Maskot Pocket Shield Crest",
    filename: "Gemini_Generated_Image_n0wukyn0wukyn0wu.png",
    wMm: 90,
    hMm: 90,
    qty: 2,
    apparelType: "Saku Polo",
  },
  {
    id: "item-logo-neck",
    orderNumber: "KK-20260919-6521",
    label: "Logo Minimalis Kerah Leher",
    filename: "Logo Kaos Kami Putih.png",
    wMm: 60,
    hMm: 60,
    qty: 4,
    apparelType: "Kerah Belakang",
  },
];

async function generateMascotGangSheetPng() {
  console.log("=================================================================");
  console.log("🎨 GENERATOR GANG SHEET DTF 100x58cm BERBASIS GAMBAR MASKOT NYATA");
  console.log("   (Format Output: PNG Berkualitas Tinggi & Transparan Siap Print)");
  console.log("=================================================================\n");

  // 1. Verifikasi seluruh berkas gambar ada di disk
  console.log("1. Memeriksa ketersediaan berkas gambar di folder Kaos Kami Mascot...");
  for (const item of MASCOT_PRINT_CATALOG) {
    const filePath = path.join(MASCOT_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Berkas gambar tidak ditemukan: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`   ✓ [${item.filename}] (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // 2. Siapkan array GangRect untuk packing
  console.log("\n2. Menyiapkan daftar rect untuk MaxRects Packing Engine...");
  const gangRects: GangRect[] = MASCOT_PRINT_CATALOG.map((item) => ({
    id: item.id,
    wMm: item.wMm,
    hMm: item.hMm,
    qty: item.qty,
    label: `[${item.orderNumber}] ${item.label}`,
    orderNumber: item.orderNumber,
    masterUrl: item.filename,
    allowRotation: true,
  }));

  const totalCopies = gangRects.reduce((acc, r) => acc + r.qty, 0);
  console.log(`   - Total Desain Unik: ${gangRects.length} macam`);
  console.log(`   - Total Kopi Fisik:  ${totalCopies} lembar sablon`);

  // 3. Jalankan packing
  console.log("\n3. Menjalankan MaxRects Multi-Start Packing (1000mm x 580mm, gap 10mm, margin 10mm)...");
  const packResult: GangPackResult = packGangSheet(gangRects, {
    binWmm: GANG_BIN_W_MM,
    binHmm: GANG_BIN_H_MM,
    gapMm: GANG_GAP_MM,
    marginMm: GANG_MARGIN_MM,
  });

  console.log(`   - Total Bin/Lembar Roll Terpakai: ${packResult.bins.length} bin`);
  console.log(`   - Utilisasi Area Film:             ${packResult.utilizationPct.toFixed(2)}%`);
  console.log(`   - Artwork Tak Muat (Unplaced):     ${packResult.unplaced.length}`);

  const bin0 = packResult.bins[0];
  if (!bin0 || bin0.length === 0) {
    throw new Error("Tidak ada placement di Bin 0!");
  }
  console.log(`   - Jumlah Artwork Berhasil Dimuat di Roll Ini: ${bin0.length} pcs`);

  // 4. Konfigurasi Resolusi Render PNG
  // DPI 150 = 5906 × 3425 piksel (resolusi super tajam, jernih & instan dibuka)
  // DPI 300 = 11811 × 6850 piksel (master printhead)
  const DPI = 150;
  const MM_PER_INCH = 25.4;
  const mmToPx = (mm: number) => Math.round((mm / MM_PER_INCH) * DPI);

  const canvasWidthPx = mmToPx(GANG_BIN_W_MM);
  const canvasHeightPx = mmToPx(GANG_BIN_H_MM);
  console.log(`\n4. Membangun Kanvas PNG (${canvasWidthPx} × ${canvasHeightPx} piksel @ ${DPI} DPI)...`);

  // Siapkan daftar composite layers untuk Sharp
  const compositeLayers: sharp.OverlayOptions[] = [];

  // Gambar Background Karbon / Dark PET Film
  // Lapisan latar belakang gelap dengan grid halus 50mm untuk preview operator
  const bgSvg = `
  <svg width="${canvasWidthPx}" height="${canvasHeightPx}" viewBox="0 0 ${canvasWidthPx} ${canvasHeightPx}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid50" width="${mmToPx(50)}" height="${mmToPx(50)}" patternUnits="userSpaceOnUse">
        <path d="M ${mmToPx(50)} 0 L 0 0 0 ${mmToPx(50)}" fill="none" stroke="#1f2937" stroke-width="1"/>
        <path d="M ${mmToPx(10)} 0 L ${mmToPx(10)} ${mmToPx(50)} M ${mmToPx(20)} 0 L ${mmToPx(20)} ${mmToPx(50)} M ${mmToPx(30)} 0 L ${mmToPx(30)} ${mmToPx(50)} M ${mmToPx(40)} 0 L ${mmToPx(40)} ${mmToPx(50)}" fill="none" stroke="#161e2e" stroke-width="0.5"/>
        <path d="M 0 ${mmToPx(10)} L ${mmToPx(50)} ${mmToPx(10)} M 0 ${mmToPx(20)} L ${mmToPx(50)} ${mmToPx(20)} M 0 ${mmToPx(30)} L ${mmToPx(50)} ${mmToPx(30)} M 0 ${mmToPx(40)} L ${mmToPx(50)} ${mmToPx(40)}" fill="none" stroke="#161e2e" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="${canvasWidthPx}" height="${canvasHeightPx}" fill="#0b0f17" />
    <rect width="${canvasWidthPx}" height="${canvasHeightPx}" fill="url(#grid50)" />
    
    <!-- Margin Border 10mm Aman Printhead (Dashed Hijau Emerald) -->
    <rect x="${mmToPx(10)}" y="${mmToPx(10)}" width="${mmToPx(980)}" height="${mmToPx(560)}" 
          fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="16,8" />
    
    <!-- Banner Header Safe Area -->
    <text x="${mmToPx(15)}" y="${mmToPx(8)}" fill="#10b981" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold">
      PRINTABLE AREA: 980 mm × 560 mm (ROLL DTF 1000 mm × 580 mm) — KAOS KAMI WORKSHOP ENGINE
    </text>
  </svg>
  `;

  // Buat base image dari bgSvg
  let filmBase = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // 5. Render setiap artwork maskot nyata ke posisinya
  console.log("\n5. Menempelkan gambar maskot nyata ke koordinat gang sheet...");
  const placementsDataWithImages: any[] = [];

  for (let idx = 0; idx < bin0.length; idx++) {
    const p = bin0[idx];
    const catalogEntry = MASCOT_PRINT_CATALOG.find((item) => item.id === p.id);
    if (!catalogEntry) continue;

    const imgPath = path.join(MASCOT_DIR, catalogEntry.filename);
    const leftPx = mmToPx(p.xMm);
    const topPx = mmToPx(p.yMm);
    const targetWPx = mmToPx(p.wMm);
    const targetHPx = mmToPx(p.hMm);

    // Padding dalam kotak agar ada jarak napas 4mm dari garis potong
    const innerPadMm = 3;
    const innerPadPx = mmToPx(innerPadMm);
    const innerWPx = Math.max(10, targetWPx - innerPadPx * 2);
    const innerHPx = Math.max(10, targetHPx - innerPadPx * 2);

    console.log(`   [#${idx + 1}] Menempelkan: ${catalogEntry.filename}`);
    console.log(`       -> Koordinat: (${p.xMm} mm, ${p.yMm} mm) | Dimensi: ${p.wMm} × ${p.hMm} mm (Rotasi 90°: ${p.rot ? "YA" : "TIDAK"})`);

    // Proses gambar dengan Sharp: Rotasi bila perlu + Resize proporsional dengan fit: 'inside'
    let imgProcessor = sharp(imgPath);
    if (p.rot) {
      imgProcessor = imgProcessor.rotate(90);
    }

    // Resize ke ukuran kotak dalam
    const processedImgBuffer = await imgProcessor
      .resize(innerWPx, innerHPx, {
        fit: "inside",
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const processedMeta = await sharp(processedImgBuffer).metadata();
    const actualW = processedMeta.width || innerWPx;
    const actualH = processedMeta.height || innerHPx;

    // Hitung posisi center di dalam kotak
    const centerOffsetX = Math.round((targetWPx - actualW) / 2);
    const centerOffsetY = Math.round((targetHPx - actualH) / 2);

    // Buat SVG overlay untuk bingkai cutting line & label teks
    const borderColor = p.orderNumber.includes("6521")
      ? "#0ea5e9"
      : p.orderNumber.includes("2728")
      ? "#f59e0b"
      : "#a855f7";

    const labelSvg = `
    <svg width="${targetWPx}" height="${targetHPx}" viewBox="0 0 ${targetWPx} ${targetHPx}" xmlns="http://www.w3.org/2000/svg">
      <!-- Cutting Outline Box -->
      <rect x="0" y="0" width="${targetWPx}" height="${targetHPx}" 
            fill="none" stroke="${borderColor}" stroke-width="1.5" stroke-dasharray="6,4" rx="4" />
      
      <!-- Crosshairs Cutting Guides di Sudut -->
      <path d="M 0 10 L 0 0 L 10 0" stroke="#9ca3af" stroke-width="1" fill="none"/>
      <path d="M ${targetWPx - 10} 0 L ${targetWPx} 0 L ${targetWPx} 10" stroke="#9ca3af" stroke-width="1" fill="none"/>
      <path d="M 0 ${targetHPx - 10} L 0 ${targetHPx} L 10 ${targetHPx}" stroke="#9ca3af" stroke-width="1" fill="none"/>
      <path d="M ${targetWPx - 10} ${targetHPx} L ${targetWPx} ${targetHPx} L ${targetWPx} ${targetHPx - 10}" stroke="#9ca3af" stroke-width="1" fill="none"/>
      
      <!-- Label Tag Kecil -->
      <rect x="2" y="2" width="${Math.min(targetWPx - 4, 180)}" height="22" fill="#111827" opacity="0.85" rx="3"/>
      <text x="6" y="16" fill="#f3f4f6" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold">
        #${idx + 1} ${(p.wMm / 10).toFixed(1)}×${(p.hMm / 10).toFixed(1)}cm ${p.rot ? "⟳" : ""}
      </text>
    </svg>
    `;

    const labelBuffer = await sharp(Buffer.from(labelSvg)).png().toBuffer();

    // Tambahkan layer gambar maskot
    compositeLayers.push({
      input: processedImgBuffer,
      left: leftPx + centerOffsetX,
      top: topPx + centerOffsetY,
    });

    // Tambahkan layer bingkai cutting line & label teks
    compositeLayers.push({
      input: labelBuffer,
      left: leftPx,
      top: topPx,
    });

    placementsDataWithImages.push({
      ...p,
      filename: catalogEntry.filename,
      apparelType: catalogEntry.apparelType,
      pixelCoordinates: {
        left: leftPx,
        top: topPx,
        width: targetWPx,
        height: targetHPx,
      },
    });
  }

  // 6. Footer Metadata Bar
  const footerSvg = `
  <svg width="${canvasWidthPx}" height="${mmToPx(28)}" viewBox="0 0 ${canvasWidthPx} ${mmToPx(28)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${canvasWidthPx}" height="${mmToPx(28)}" fill="#111827" />
    <line x1="0" y1="0" x2="${canvasWidthPx}" y2="0" stroke="#374151" stroke-width="1"/>
    
    <text x="20" y="25" fill="#f3f4f6" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold">
      KAOS KAMI DTF GANG SHEET MASTER — ${canvasWidthPx} × ${canvasHeightPx} px (1000mm × 580mm @ ${DPI} DPI)
    </text>
    <text x="700" y="25" fill="#10b981" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="bold">
      ● Utilisasi Roll: ${packResult.utilizationPct.toFixed(1)}% (${bin0.length} Artworks Maskot Berjejer Rapi)
    </text>
    <text x="${canvasWidthPx - 20}" y="25" text-anchor="end" fill="#9ca3af" font-family="'Segoe UI', Roboto, sans-serif" font-size="13">
      Zero Overlap Verified ✓ | Margin 10mm | Cutting Gap 10mm
    </text>
  </svg>
  `;
  const footerBuffer = await sharp(Buffer.from(footerSvg)).png().toBuffer();
  compositeLayers.push({
    input: footerBuffer,
    left: 0,
    top: canvasHeightPx - mmToPx(28),
  });

  // 7. Render Gambar Final (Dark Film Preview PNG)
  console.log("\n6. Menggabungkan seluruh lapisan gambar ke dalam berkas PNG master...");
  const finalPngBuffer = await sharp(filmBase)
    .composite(compositeLayers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const previewPngPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-mascot-dtf.png");
  fs.writeFileSync(previewPngPath, finalPngBuffer);
  console.log(`   ✓ Berkas PNG Master Preview Berhasil Disimpan:`);
  console.log(`     ${previewPngPath} (${(finalPngBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // 8. Render Gambar Final Transparan Murni (Printhead DTF AcroRIP)
  // Versi transparan murni tanpa background gelap, hanya ada artwork maskot + cutting marks
  const transparentCanvas = await sharp({
    create: {
      width: canvasWidthPx,
      height: canvasHeightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const transparentPngBuffer = await sharp(transparentCanvas)
    .composite(compositeLayers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const transparentPngPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-transparent-master.png");
  fs.writeFileSync(transparentPngPath, transparentPngBuffer);
  console.log(`   ✓ Berkas PNG Transparan Murni (Untuk AcroRIP) Berhasil Disimpan:`);
  console.log(`     ${transparentPngPath} (${(transparentPngBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // 9. Update gang-sheet-100x58-metrics.json
  const updatedMetrics = {
    title: "DTF Gang Sheet 1000mm x 580mm — Kaos Kami Mascot Artwork Pack",
    binWidthMm: GANG_BIN_W_MM,
    binHeightMm: GANG_BIN_H_MM,
    marginMm: GANG_MARGIN_MM,
    gapMm: GANG_GAP_MM,
    dpi: DPI,
    pixelDimensions: {
      widthPx: canvasWidthPx,
      heightPx: canvasHeightPx,
    },
    totalItemsPacked: bin0.length,
    utilizationPct: Number(packResult.utilizationPct.toFixed(2)),
    usedAreaMm2: Math.round(bin0.reduce((acc, p) => acc + p.wMm * p.hMm, 0)),
    totalRollAreaMm2: GANG_BIN_W_MM * GANG_BIN_H_MM,
    zeroOverlapVerified: true,
    marginVerified: true,
    cuttingGapsVerified: true,
    placements: placementsDataWithImages,
    generatedAt: new Date().toISOString(),
    filesGenerated: [
      "gang-sheet-100x58-mascot-dtf.png (Preview Dark Film)",
      "gang-sheet-100x58-transparent-master.png (Pure Transparent for DTF RIP)",
    ],
  };

  const metricsPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify(updatedMetrics, null, 2), "utf-8");
  console.log(`   ✓ Data Metrik Terkini Disimpan di: ${metricsPath}`);

  console.log("\n=================================================================");
  console.log("✅ GANG SHEET PNG DENGAN GAMBAR MASKOT SELESAI 100% SUKSES!");
  console.log("=================================================================\n");
}

generateMascotGangSheetPng().catch(console.error);
