import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import sharp from "sharp";

dotenv.config({ path: path.resolve(process.cwd(), "kaos-kami-web/.env") });

import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Order, OrderItem, ProductionTask } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq } from "drizzle-orm";
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
const BASE_URL = "http://localhost:3000";

interface MascotOrderItemDef {
  idSuffix: string;
  label: string;
  filename: string;
  targetWidthCm: number;
  qty: number;
  placementSide: string;
}

const RAW_MASCOT_ITEMS: MascotOrderItemDef[] = [
  {
    idSuffix: "01",
    label: "Maskot Kaos Kami Primary (Dada A3)",
    filename: "Gemini_Generated_Image_awh96wawh96wawh9.png",
    targetWidthCm: 28.0,
    qty: 1,
    placementSide: "front",
  },
  {
    idSuffix: "02",
    label: "Maskot Sablon Workshop (Punggung A4)",
    filename: "Gemini_Generated_Image_djm4hudjm4hudjm4.png",
    targetWidthCm: 25.0,
    qty: 1,
    placementSide: "back",
  },
  {
    idSuffix: "03",
    label: "Maskot Streetwear Cool (Dada A4)",
    filename: "Gemini_Generated_Image_saq9ybsaq9ybsaq9.png",
    targetWidthCm: 22.0,
    qty: 1,
    placementSide: "front",
  },
  {
    idSuffix: "04",
    label: "Maskot Dynamic Action (A5)",
    filename: "Gemini_Generated_Image_h6213lh6213lh621.png",
    targetWidthCm: 14.0,
    qty: 1,
    placementSide: "front",
  },
  {
    idSuffix: "05",
    label: "Maskot Cyber Neon Edition (A5)",
    filename: "Gemini_Generated_Image_z8k72pz8k72pz8k7.png",
    targetWidthCm: 14.0,
    qty: 1,
    placementSide: "front",
  },
  {
    idSuffix: "06",
    label: "Maskot Typography Sleeve Art",
    filename: "Gemini_Generated_Image_zc43r8zc43r8zc43.png",
    targetWidthCm: 8.5,
    qty: 1,
    placementSide: "left_sleeve",
  },
  {
    idSuffix: "07",
    label: "Maskot Warrior Badge",
    filename: "Gemini_Generated_Image_b350osb350osb350.png",
    targetWidthCm: 12.0,
    qty: 1,
    placementSide: "chest",
  },
  {
    idSuffix: "08",
    label: "Maskot Streetwear Badge",
    filename: "Gemini_Generated_Image_pc3c96pc3c96pc3c.png",
    targetWidthCm: 12.0,
    qty: 1,
    placementSide: "chest",
  },
  {
    idSuffix: "09",
    label: "Logo Brand Kaos Kami",
    filename: "logo fix.png",
    targetWidthCm: 13.0,
    qty: 2,
    placementSide: "chest",
  },
  {
    idSuffix: "10",
    label: "Emblem Hexagon Kaos Kami",
    filename: "logo fix 2.png",
    targetWidthCm: 10.0,
    qty: 2,
    placementSide: "chest",
  },
  {
    idSuffix: "11",
    label: "Logo Saku Kaos Hitam",
    filename: "Logo Kaos Kami Hitam.png",
    targetWidthCm: 9.0,
    qty: 2,
    placementSide: "pocket",
  },
  {
    idSuffix: "12",
    label: "Logo Saku Kaos Putih",
    filename: "Logo Kaos Kami Putih.png",
    targetWidthCm: 9.0,
    qty: 2,
    placementSide: "pocket",
  },
  {
    idSuffix: "13",
    label: "Pocket Shield Crest",
    filename: "Gemini_Generated_Image_n0wukyn0wukyn0wu.png",
    targetWidthCm: 8.5,
    qty: 2,
    placementSide: "pocket",
  },
  {
    idSuffix: "14",
    label: "Logo Kerah Leher Belakang",
    filename: "Logo Kaos Kami Putih.png",
    targetWidthCm: 5.5,
    qty: 6,
    placementSide: "back_neck",
  },
];

async function main() {
  console.log("=================================================================");
  console.log("🚀 EKSEKUSI GANG SHEET DTF OTENTIK DARI SISTEM ADMIN KAOS KAMI");
  console.log("   (Gambar 100% Mentah Tanpa Ubahan/Cutout & Alur Real Admin)");
  console.log("=================================================================\n");

  // 1. Login Admin Workshop
  console.log("1. Autentikasi Admin Workshop (hengkishadow@gmail.com)...");
  const loginRes = await auth.api.signInEmail({
    body: {
      email: "hengkishadow@gmail.com",
      password: "KaosKamiAdmin2026!",
    },
    asResponse: true,
  });

  if (!loginRes.ok) {
    throw new Error(`Gagal login admin: ${loginRes.status}`);
  }

  const rawCookie = loginRes.headers.get("set-cookie") || "";
  const adminCookie = rawCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
  console.log("   ✓ Login Admin Berhasil!");

  // 2. Baca dimensi natural dari berkas mentah (AS IS tanpa ubahan)
  console.log("\n2. Membaca Berkas Mentah Asli dari Kaos Kami Mascot/ (0% Pixel Modification)...");
  const enrichedItems: {
    def: MascotOrderItemDef;
    naturalWidth: number;
    naturalHeight: number;
    targetWidthCm: number;
    targetHeightCm: number;
    rawPath: string;
    publicUrl: string;
  }[] = [];

  for (const def of RAW_MASCOT_ITEMS) {
    const rawPath = path.join(MASCOT_DIR, def.filename);
    const meta = await sharp(rawPath).metadata();
    const nw = meta.width || 1000;
    const nh = meta.height || 1000;
    const targetHeightCm = Number(((def.targetWidthCm / (nw / nh))).toFixed(1));

    enrichedItems.push({
      def,
      naturalWidth: nw,
      naturalHeight: nh,
      targetWidthCm: def.targetWidthCm,
      targetHeightCm,
      rawPath,
      publicUrl: `/mascot/raw/${def.filename}`,
    });

    console.log(
      `   * [${def.filename.slice(0, 25)}...] File Asli: ${nw}×${nh}px -> Cetak: ${def.targetWidthCm}×${targetHeightCm} cm (Qty: ${def.qty})`
    );
  }

  // 3. Masukkan Order & ProductionTask ke Database Turso
  const orderNumber = "KK-20260919-MASCOT";
  const orderId = `order-mascot-${Date.now()}`;
  const adminUserId = "mENTVcqg2HGntvKZ89uPrREfwrghvMwL"; // hengki admin

  console.log(`\n3. Menerbitkan Pesanan & ProductionTasks Nyata di Turso Database (${orderNumber})...`);

  // Hapus order lama jika ada
  const existingOrders = await db.query.Order.findMany({
    where: eq(Order.orderNumber, orderNumber),
  });
  for (const eo of existingOrders) {
    await db.delete(ProductionTask).where(eq(ProductionTask.orderId, eo.id));
    await db.delete(OrderItem).where(eq(OrderItem.orderId, eo.id));
    await db.delete(Order).where(eq(Order.id, eo.id));
  }

  await db.insert(Order).values({
    id: orderId,
    orderNumber,
    userId: adminUserId,
    status: "PROCESSING",
    deliveryMethod: "PICKUP",
    subtotalIdr: 750000,
    shippingCostIdr: 0,
    totalIdr: 750000,
  });

  const dbTasksToInsert = [];
  for (let i = 0; i < enrichedItems.length; i++) {
    const it = enrichedItems[i];
    const itemId = `item-mascot-${i + 1}`;
    const taskId = `task-mascot-${i + 1}`;

    await db.insert(OrderItem).values({
      id: itemId,
      orderId,
      quantity: it.def.qty,
      unitPriceIdr: 50000,
      lineTotalIdr: 50000 * it.def.qty,
      snapshotName: it.def.label,
      snapshotImageUrl: it.publicUrl,
      snapshotSize: "L",
      snapshotColorName: "Hitam",
    });

    dbTasksToInsert.push({
      id: taskId,
      orderId,
      orderItemId: itemId,
      stage: "SCREEN_PRINT_SETUP",
      notes: it.def.label,
      printWidthCm: it.targetWidthCm,
      printHeightCm: it.targetHeightCm,
      placementSide: it.def.placementSide,
      printFileUrl: it.publicUrl,
    });
  }

  for (const t of dbTasksToInsert) {
    await db.insert(ProductionTask).values(t);
  }
  console.log(`   ✓ ${dbTasksToInsert.length} Task Produksi Resmi Berhasil Diterbitkan di Turso DB!`);

  // 4. Verifikasi Pemanggilan API Nyata Admin: GET /api/admin/production-tasks
  console.log("\n4. Menguji API Admin Nyata (GET /api/admin/production-tasks)...");
  const apiRes = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    headers: {
      Cookie: adminCookie,
    },
  });
  const apiData: any = await apiRes.json();
  if (!apiRes.ok || !apiData.success) {
    throw new Error(`API gagal: ${JSON.stringify(apiData)}`);
  }
  const mascotTasksFromApi = (apiData.tasks || []).filter(
    (t: any) => t.order?.orderNumber === orderNumber
  );
  console.log(
    `   ✓ API merespons HTTP 200 OK! Menemukan ${mascotTasksFromApi.length} tasks dari antrean produksi.`
  );

  // 5. Jalankan Algoritma MaxRects Asli Sistem (packGangSheet)
  console.log("\n5. Menjalankan packGangSheet (MaxRects BSSF) Sesuai Sistem Web Kaos Kami...");
  const gangRects: GangRect[] = enrichedItems.map((p) => ({
    id: p.def.idSuffix,
    wMm: Math.round(p.targetWidthCm * 10),
    hMm: Math.round(p.targetHeightCm * 10),
    qty: p.def.qty,
    label: p.def.label,
    orderNumber,
    masterUrl: p.rawPath,
    allowRotation: true,
  }));

  const GAP_MM = 6;
  const MARGIN_MM = 8;

  const packResult: GangPackResult = packGangSheet(gangRects, {
    binWmm: GANG_BIN_W_MM,
    binHmm: GANG_BIN_H_MM,
    gapMm: GAP_MM,
    marginMm: MARGIN_MM,
  });

  const bin0 = packResult.bins[0];
  console.log(`   - Dimensi Roll:          1000 mm × 580 mm`);
  console.log(`   - Jumlah Bin Digunakan:  ${packResult.bins.length} bin`);
  console.log(`   - Utilisasi Area Roll:   ${packResult.utilizationPct.toFixed(2)}%`);
  console.log(`   - Jumlah Kopi Dimuat:    ${bin0.length} pcs`);
  console.log(`   - Jumlah Desain Gagal:   ${packResult.unplaced.length} pcs`);

  // 6. Merender Kanvas Sesuai Logika Asli Sistem (gangExport.ts)
  // Gambar 100% AS-IS tanpa memodifikasi piksel, tanpa menghapus background
  console.log("\n6. Merender Berkas Master PNG (Tanpa Manipulasi Piksel, Bebas Kotak & Banner)...");
  const DPI = 150;
  const MM_TO_PX = (mm: number) => Math.round((mm / 25.4) * DPI);
  const canvasW = MM_TO_PX(GANG_BIN_W_MM);
  const canvasH = MM_TO_PX(GANG_BIN_H_MM);

  const compositeLayersTrans: sharp.OverlayOptions[] = [];
  const compositeLayersDark: sharp.OverlayOptions[] = [];

  for (let i = 0; i < bin0.length; i++) {
    const p = bin0[i];
    const item = enrichedItems.find((it) => it.def.idSuffix === p.id);
    if (!item) continue;

    const leftPx = MM_TO_PX(p.xMm);
    const topPx = MM_TO_PX(p.yMm);
    const widthPx = MM_TO_PX(p.wMm);
    const heightPx = MM_TO_PX(p.hMm);

    // Baca file asli mentah murni tanpa filter / flood fill
    let imgPipe = sharp(item.rawPath);
    if (p.rot) {
      imgPipe = imgPipe.rotate(90);
    }

    // Resize proporsional (contain) sama persis seperti gangExport.ts di browser
    const resizedBuffer = await imgPipe
      .resize(widthPx, heightPx, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();

    const meta = await sharp(resizedBuffer).metadata();
    const actualW = meta.width || widthPx;
    const actualH = meta.height || heightPx;

    const posX = leftPx + Math.round((widthPx - actualW) / 2);
    const posY = topPx + Math.round((heightPx - actualH) / 2);

    compositeLayersTrans.push({
      input: resizedBuffer,
      left: posX,
      top: posY,
    });
    compositeLayersDark.push({
      input: resizedBuffer,
      left: posX,
      top: posY,
    });

    console.log(
      `   [#${i + 1}] Gambar Asli: ${item.def.label.slice(0, 32)}... -> Posisi (${p.xMm}, ${p.yMm}) mm | Ukuran: ${(p.wMm / 10).toFixed(1)}×${(p.hMm / 10).toFixed(1)} cm ${p.rot ? "⟳90°" : ""}`
    );
  }

  // Kanvas Transparan Murni untuk AcroRIP
  const transBase = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const printheadPng = await sharp(transBase)
    .composite(compositeLayersTrans)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const printheadPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-raw-admin-printhead.png");
  fs.writeFileSync(printheadPath, printheadPng);

  // Kanvas Dark Film Preview untuk Mata Manusia
  const filmBgSvg = `
  <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${canvasW}" height="${canvasH}" fill="#080c14" />
    <defs>
      <pattern id="grid" width="${MM_TO_PX(100)}" height="${MM_TO_PX(100)}" patternUnits="userSpaceOnUse">
        <rect width="${MM_TO_PX(100)}" height="${MM_TO_PX(100)}" fill="none" stroke="#121824" stroke-width="0.8"/>
      </pattern>
    </defs>
    <rect width="${canvasW}" height="${canvasH}" fill="url(#grid)" />
  </svg>
  `;
  const darkBase = await sharp(Buffer.from(filmBgSvg)).png().toBuffer();
  const darkPng = await sharp(darkBase)
    .composite(compositeLayersDark)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const darkPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-raw-admin.png");
  fs.writeFileSync(darkPath, darkPng);

  // Thumbnail Ringan
  const previewPath = path.join(OUTPUT_DIR, "gang-sheet-100x58-raw-admin-preview.png");
  await sharp(darkPng).resize(2400).png({ quality: 85 }).toFile(previewPath);

  console.log("\n=================================================================");
  console.log("✅ BERKAS GANG SHEET REAL ADMIN 100% RAW SELESAI!");
  console.log(`   1. Master AcroRIP (Transparan): ${printheadPath} (${(printheadPng.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   2. Master Film (Inspeksi HD):   ${darkPath} (${(darkPng.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   3. Preview Cepat (Layar):       ${previewPath}`);
  console.log("=================================================================\n");
}

main().catch(console.error);
