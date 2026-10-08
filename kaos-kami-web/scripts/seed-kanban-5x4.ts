import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { sql } from "drizzle-orm";
import crypto from "crypto";

const CUSTOMERS = [
  // 5 customers for Pillar 1 (DESIGN_PREP)
  { name: "Andi Muhammad Fikri", phone: "081242398111", address: "Jl. Boulevard Panakkukang No. 12, Makassar", method: "FREE_MAKASSAR", note: "Pagar hitam, telepon sebelum tiba" },
  { name: "Nurul Fadillah", phone: "085299441234", address: "Jl. Perintis Kemerdekaan Km. 10, Tamalanrea, Makassar", method: "FREE_MAKASSAR", note: "Titip di satpam perumahan gerbang utama" },
  { name: "Rezky Pratama Putra", phone: "082188776655", address: "Jl. Hertasning Baru No. 88, Makassar", method: "PICKUP", note: "Ambil langsung di workshop jam 4 sore" },
  { name: "Siti Rahmawati", phone: "081355667788", address: "Jl. Sultan Alauddin No. 45, Makassar", method: "FREE_MAKASSAR", note: "Rumah warna abu-abu samping minimarket" },
  { name: "Fachrul Razi", phone: "085344556677", address: "Jl. Urip Sumoharjo No. 20, Makassar", method: "JNE", note: "Kirim via ekspedisi reguler" },

  // 5 customers for Pillar 2 (SCREEN_PRINT_SETUP)
  { name: "Dewi Sartika", phone: "081144223344", address: "Jl. Somba Opu No. 77, Makassar", method: "FREE_MAKASSAR", note: "Dekat Pantai Losari" },
  { name: "Muh. Ilham Syahputra", phone: "082399887711", address: "Jl. Pengayoman Ruko Pasar Segar, Makassar", method: "FREE_MAKASSAR", note: "Ruko blok B-12 lantai 2" },
  { name: "Ayu Lestari", phone: "085155443322", address: "Jl. Cenderawasih No. 15, Makassar", method: "PICKUP", note: "Ambil sendiri besok pagi" },
  { name: "Bambang Kurniawan", phone: "081241122334", address: "Jl. Veteran Selatan No. 102, Makassar", method: "FREE_MAKASSAR", note: "Depan apotek" },
  { name: "Rahmat Hidayat", phone: "082190011223", address: "Jl. Toddopuli Raya No. 5, Makassar", method: "JNT", note: "Packing plastik ekstra aman" },

  // 5 customers for Pillar 3 (PRESSING)
  { name: "Dian Anggraeni", phone: "085298765432", address: "Jl. AP Pettarani No. 33, Makassar", method: "FREE_MAKASSAR", note: "Antar saat jam kerja" },
  { name: "Fadly Ramadhan", phone: "081356789012", address: "Jl. Gunung Bawakaraeng No. 90, Makassar", method: "FREE_MAKASSAR", note: "Dekat lapangan Karebosi" },
  { name: "Mega Utami", phone: "082187654321", address: "Jl. Maccini Raya No. 14, Makassar", method: "PICKUP", note: "Ambil sore hari" },
  { name: "Taufik Ismail", phone: "085341234567", address: "Jl. Sungai Saddang Lama No. 50, Makassar", method: "FREE_MAKASSAR", note: "Rumah pagar putih" },
  { name: "Nabila Zahrani", phone: "081146789012", address: "Jl. Ratulangi No. 28, Makassar", method: "JNE", note: "Pastikan tidak kusut" },

  // 5 customers for Pillar 4 (PACKAGING)
  { name: "Hendra Wijaya", phone: "082391234567", address: "Jl. Bandang No. 11, Makassar", method: "FREE_MAKASSAR", note: "Toko elektronik lantai 1" },
  { name: "Putri Maharani", phone: "085157890123", address: "Jl. Antang Raya No. 82, Makassar", method: "FREE_MAKASSAR", note: "Perumahan Griya Antang" },
  { name: "Ahmad Dani", phone: "081249876543", address: "Jl. Kajaolalido No. 3, Makassar", method: "PICKUP", note: "Ambil langsung jam istirahat" },
  { name: "Indah Permatasari", phone: "082198765432", address: "Jl. Baji Rupa No. 21, Makassar", method: "FREE_MAKASSAR", note: "Bel masuk samping pagar" },
  { name: "Zulkifli Hasan", phone: "085399881122", address: "Jl. Landak Baru No. 17, Makassar", method: "SICEPAT", note: "Mohon double polymailer" },
];

interface ApparelSpec {
  name: string;
  slug: "tshirt" | "hoodie" | "longsleeve" | "crewneck";
  colorName: string;
  colorHex: string;
  size: string;
  qty: number;
  price: number;
  snapshotImage: string;
  decalUrl: string;
  targetSide: "front" | "back";
  printWidthCm: number;
  printHeightCm: number;
  offsetFromCollarCm: number;
  multiDecals?: {
    side: string;
    url: string;
    widthCm: number;
    heightCm: number;
    offsetCm: number;
    name: string;
  }[];
}

const APPAREL_SPECS: ApparelSpec[] = [
  // 1. T-Shirt Hitam Solid - Mascot Cool (Depan + Belakang)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "L",
    qty: 1,
    price: 85000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/mascot-cool.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 6.5,
    multiDecals: [
      {
        side: "front",
        url: "/mascot/mascot-cool.png",
        widthCm: 26.0,
        heightCm: 30.0,
        offsetCm: 6.5,
        name: "Mascot Cool Dada Depan",
      },
      {
        side: "back",
        url: "/brand/logo-white-clean.png",
        widthCm: 28.0,
        heightCm: 12.0,
        offsetCm: 7.0,
        name: "Logo Kaos Kami Punggung",
      },
    ],
  },
  // 2. T-Shirt Putih Ecru - Logo Clean (Horizontal Text)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Putih Bersih",
    colorHex: "#f5f5f5",
    size: "M",
    qty: 2,
    price: 85000,
    snapshotImage: "/products/tshirt-white-ecru.jpg",
    decalUrl: "/brand/logo-black-clean.png",
    targetSide: "front",
    printWidthCm: 27.5,
    printHeightCm: 11.5,
    offsetFromCollarCm: 7.0,
  },
  // 3. Hoodie Deep Blue - Mascot Sablon (Vertical Art)
  {
    name: "HOODIE Heavyweight Custom DTF",
    slug: "hoodie",
    colorName: "Deep Blue",
    colorHex: "#1e3a5f",
    size: "XL",
    qty: 1,
    price: 185000,
    snapshotImage: "/products/hoodie-black.jpg",
    decalUrl: "/mascot/mascot-sablon.png",
    targetSide: "back",
    printWidthCm: 27.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 8.0,
  },
  // 4. Crewneck Grey - Logo Emblem (Square Art)
  {
    name: "CREWNECK Sweater Custom DTF",
    slug: "crewneck",
    colorName: "Abu Misty",
    colorHex: "#6b7280",
    size: "L",
    qty: 1,
    price: 145000,
    snapshotImage: "/products/crewneck-grey.jpg",
    decalUrl: "/mascot/logo-emblem.png",
    targetSide: "front",
    printWidthCm: 20.0,
    printHeightCm: 20.0,
    offsetFromCollarCm: 7.5,
  },
  // 5. Longsleeve Hitam - Kamito Mascot (Portrait Art)
  {
    name: "LONGSLEEVE Custom DTF Sablon",
    slug: "longsleeve",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "XL",
    qty: 3,
    price: 105000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/kamito-avatar.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 28.0,
    offsetFromCollarCm: 6.5,
  },
  // 6. T-Shirt Orange Makassar - Mascot Primary
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Orange Makassar",
    colorHex: "#ea580c",
    size: "S",
    qty: 1,
    price: 85000,
    snapshotImage: "/products/tshirt-orange-makassar.jpg",
    decalUrl: "/mascot/mascot-primary.png",
    targetSide: "front",
    printWidthCm: 25.0,
    printHeightCm: 28.0,
    offsetFromCollarCm: 6.0,
  },
  // 7. Hoodie Hitam Solid - Logo White Clean (Horizontal Logo)
  {
    name: "HOODIE Heavyweight Custom DTF",
    slug: "hoodie",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "XXL",
    qty: 1,
    price: 195000,
    snapshotImage: "/products/hoodie-black.jpg",
    decalUrl: "/brand/logo-white-clean.png",
    targetSide: "front",
    printWidthCm: 28.0,
    printHeightCm: 12.0,
    offsetFromCollarCm: 7.0,
  },
  // 8. T-Shirt Navy Dongker - Logo Transparent (Horizontal Logo)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Navy Dongker",
    colorHex: "#1e3a5f",
    size: "L",
    qty: 2,
    price: 85000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/logo-transparent.png",
    targetSide: "back",
    printWidthCm: 28.0,
    printHeightCm: 12.0,
    offsetFromCollarCm: 7.0,
  },
  // 9. Crewneck Hitam - Mascot Cool (Portrait)
  {
    name: "CREWNECK Sweater Custom DTF",
    slug: "crewneck",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "M",
    qty: 1,
    price: 145000,
    snapshotImage: "/products/crewneck-grey.jpg",
    decalUrl: "/mascot/mascot-cool.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 7.0,
  },
  // 10. Longsleeve Putih Bersih - Logo Emblem (Square)
  {
    name: "LONGSLEEVE Custom DTF Sablon",
    slug: "longsleeve",
    colorName: "Putih Bersih",
    colorHex: "#f5f5f5",
    size: "L",
    qty: 1,
    price: 105000,
    snapshotImage: "/products/tshirt-white-ecru.jpg",
    decalUrl: "/mascot/logo-emblem.png",
    targetSide: "front",
    printWidthCm: 20.0,
    printHeightCm: 20.0,
    offsetFromCollarCm: 6.5,
  },
  // 11. T-Shirt Maroon - FULL 4 SISI SABLON (Dada Depan, Punggung, Lengan Kiri, Lengan Kanan)
  {
    name: "TSHIRT Custom DTF Sablon 4 Sisi",
    slug: "tshirt",
    colorName: "Maroon Red",
    colorHex: "#7f1d1d",
    size: "XL",
    qty: 2,
    price: 125000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/logo-transparent.png",
    targetSide: "front",
    printWidthCm: 28.0,
    printHeightCm: 12.0,
    offsetFromCollarCm: 6.5,
    multiDecals: [
      {
        side: "front",
        url: "/mascot/logo-transparent.png",
        widthCm: 28.0,
        heightCm: 12.0,
        offsetCm: 6.5,
        name: "Logo Kaos Kami Dada Depan",
      },
      {
        side: "back",
        url: "/mascot/mascot-primary.png",
        widthCm: 26.0,
        heightCm: 28.0,
        offsetCm: 7.0,
        name: "Mascot Streetwear Punggung",
      },
      {
        side: "left_sleeve",
        url: "/mascot/kamito-avatar.png",
        widthCm: 8.0,
        heightCm: 8.0,
        offsetCm: 10.0,
        name: "Avatar Badge Lengan Kiri",
      },
      {
        side: "right_sleeve",
        url: "/brand/logo-white-clean.png",
        widthCm: 7.0,
        heightCm: 14.0,
        offsetCm: 10.0,
        name: "Typography Vertikal Lengan Kanan",
      },
    ],
  },
  // 12. T-Shirt Hitam - Kamito Avatar Back (Portrait)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "L",
    qty: 1,
    price: 85000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/kamito-avatar.png",
    targetSide: "back",
    printWidthCm: 26.0,
    printHeightCm: 28.0,
    offsetFromCollarCm: 7.0,
  },
  // 13. Hoodie Deep Blue - Logo White (Horizontal Logo)
  {
    name: "HOODIE Heavyweight Custom DTF",
    slug: "hoodie",
    colorName: "Deep Blue",
    colorHex: "#1e3a5f",
    size: "L",
    qty: 1,
    price: 185000,
    snapshotImage: "/products/hoodie-black.jpg",
    decalUrl: "/brand/logo-white-clean.png",
    targetSide: "front",
    printWidthCm: 28.0,
    printHeightCm: 12.0,
    offsetFromCollarCm: 7.5,
  },
  // 14. T-Shirt Army Green - Mascot Cool (Portrait)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Army Green",
    colorHex: "#1a3c2e",
    size: "M",
    qty: 4,
    price: 85000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/mascot-cool.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 6.5,
  },
  // 15. Crewneck Grey - Mascot Primary (Portrait)
  {
    name: "CREWNECK Sweater Custom DTF",
    slug: "crewneck",
    colorName: "Abu Misty",
    colorHex: "#6b7280",
    size: "XL",
    qty: 1,
    price: 145000,
    snapshotImage: "/products/crewneck-grey.jpg",
    decalUrl: "/mascot/mascot-primary.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 7.0,
  },
  // 16. T-Shirt Putih - Logo Black Clean (Horizontal Logo)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Putih Bersih",
    colorHex: "#f5f5f5",
    size: "XXL",
    qty: 1,
    price: 90000,
    snapshotImage: "/products/tshirt-white-ecru.jpg",
    decalUrl: "/brand/logo-black-clean.png",
    targetSide: "back",
    printWidthCm: 28.0,
    printHeightCm: 12.0,
    offsetFromCollarCm: 7.0,
  },
  // 17. Longsleeve Hitam - Mascot Sablon (Portrait)
  {
    name: "LONGSLEEVE Custom DTF Sablon",
    slug: "longsleeve",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "M",
    qty: 2,
    price: 105000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/mascot-sablon.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 6.5,
  },
  // 18. Hoodie Hitam - Logo Emblem (Square)
  {
    name: "HOODIE Heavyweight Custom DTF",
    slug: "hoodie",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "S",
    qty: 1,
    price: 185000,
    snapshotImage: "/products/hoodie-black.jpg",
    decalUrl: "/mascot/logo-emblem.png",
    targetSide: "front",
    printWidthCm: 20.0,
    printHeightCm: 20.0,
    offsetFromCollarCm: 7.0,
  },
  // 19. T-Shirt Hitam - Mascot Cool Front (Portrait)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Hitam Solid",
    colorHex: "#18181b",
    size: "L",
    qty: 1,
    price: 85000,
    snapshotImage: "/products/tshirt-black.jpg",
    decalUrl: "/mascot/mascot-cool.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 30.0,
    offsetFromCollarCm: 6.5,
  },
  // 20. T-Shirt Orange Makassar - Kamito Mascot (Portrait)
  {
    name: "TSHIRT Custom DTF Sablon",
    slug: "tshirt",
    colorName: "Orange Makassar",
    colorHex: "#ea580c",
    size: "XL",
    qty: 3,
    price: 85000,
    snapshotImage: "/products/tshirt-orange-makassar.jpg",
    decalUrl: "/mascot/kamito-avatar.png",
    targetSide: "front",
    printWidthCm: 26.0,
    printHeightCm: 28.0,
    offsetFromCollarCm: 6.5,
  },
];

// The 4 stages corresponding exactly to the 4 pillars
const STAGE_DISTRIBUTION = [
  // 5 items for Stage 1: DESIGN_PREP (Desain Masuk)
  "DESIGN_PREP",
  "DESIGN_PREP",
  "DESIGN_PREP",
  "DESIGN_PREP",
  "DESIGN_PREP",

  // 5 items for Stage 2: SCREEN_PRINT_SETUP (Antrean Gang Sheet)
  "SCREEN_PRINT_SETUP",
  "SCREEN_PRINT_SETUP",
  "SCREEN_PRINT_SETUP",
  "SCREEN_PRINT_SETUP",
  "SCREEN_PRINT_SETUP",

  // 5 items for Stage 3: PRESSING (Siap Sablon)
  "PRESSING",
  "PRESSING",
  "PRESSING",
  "PRESSING",
  "PRESSING",

  // 5 items for Stage 4: PACKAGING (Pesanan Disiapkan / Packing)
  "PACKAGING",
  "PACKAGING",
  "PACKAGING",
  "PACKAGING",
  "PACKAGING",
];

async function seed() {
  const { db } = await import("../src/lib/db");
  console.log("🧹 1. Membersihkan data ProductionTask lama...");
  await db.run(sql`DELETE FROM "ProductionTask"`);
  console.log("✅ Semua data ProductionTask lama berhasil dihapus.");

  console.log("🚀 2. Membuat 20 pesanan baru (masing-masing 5 per kolom)...");

  for (let i = 0; i < 20; i++) {
    const cust = CUSTOMERS[i]!;
    const spec = APPAREL_SPECS[i]!;
    const stage = STAGE_DISTRIBUTION[i]!;
    const orderNum = `KK-20261008-${1000 + i}`;
    const now = new Date(Date.now() - (20 - i) * 3600000).toISOString();

    const userId = `usr-kanban-${i + 1}`;
    const addressId = `addr-kanban-${i + 1}`;
    const designId = `dsg-kanban-${i + 1}`;
    const orderId = `ord-kanban-${i + 1}`;
    const orderItemId = `item-kanban-${i + 1}`;
    const taskId = `task-kanban-${i + 1}`;

    // A. Upsert User
    await db.run(sql`
      INSERT INTO "User" (id, name, email, phoneNumber, role, createdAt, updatedAt)
      VALUES (${userId}, ${cust.name}, ${`cust${i + 1}@kaoskami.id`}, ${cust.phone}, 'CUSTOMER', ${now}, ${now})
      ON CONFLICT(id) DO UPDATE SET name = ${cust.name}, phoneNumber = ${cust.phone}
    `);

    // B. Upsert Address
    await db.run(sql`
      INSERT INTO "Address" (id, userId, label, recipientName, phoneNumber, fullAddress, city, province, postalCode, createdAt, updatedAt)
      VALUES (${addressId}, ${userId}, 'Alamat Utama', ${cust.name}, ${cust.phone}, ${cust.address}, 'Kota Makassar', 'Sulawesi Selatan', '90222', ${now}, ${now})
      ON CONFLICT(id) DO UPDATE SET fullAddress = ${cust.address}
    `);

    // C. Insert Design with REAL Decals
    const decalsList = spec.multiDecals
      ? spec.multiDecals.map((md, idx) => ({
          id: `decal-${md.side}-${i + 1}-${idx}`,
          url: md.url,
          targetSide: md.side,
          scale: 0.15,
          x: 0,
          y: -0.04,
          rotation: 0,
          printWidthCm: md.widthCm,
          printHeightCm: md.heightCm,
          offsetFromCollarCm: md.offsetCm,
        }))
      : [
          {
            id: `decal-${spec.targetSide}-${i + 1}`,
            url: spec.decalUrl,
            targetSide: spec.targetSide,
            scale: 0.16,
            x: 0,
            y: -0.04,
            rotation: 0,
            printWidthCm: spec.printWidthCm,
            printHeightCm: spec.printHeightCm,
            offsetFromCollarCm: spec.offsetFromCollarCm,
          },
        ];
    const decalsJson = JSON.stringify(decalsList);

    const CATEGORY_MAP: Record<string, string> = {
      tshirt: "cmtgq1g6t0000us04hybzsn50",
      longsleeve: "cmtgq1h010001us04cwn17j5z",
      crewneck: "cmtgq1h4k0002us04wganqpf9",
      hoodie: "cmtgq1h900003us04cx9f42qm",
    };
    const catId = CATEGORY_MAP[spec.slug] || "cmtgq1g6t0000us04hybzsn50";

    await db.run(sql`
      INSERT INTO "Design" (id, userId, categoryId, title, colorHex, colorName, size, decals, calculatedPriceIdr, priceBreakdown, masterAssetUrl, status, createdAt, updatedAt)
      VALUES (${designId}, ${userId}, ${catId}, ${`${spec.name} - ${spec.colorName}`}, ${spec.colorHex}, ${spec.colorName}, ${spec.size}, ${decalsJson}, ${spec.price}, '{"base":79000,"print":6000}', ${spec.decalUrl}, 'PUBLISHED', ${now}, ${now})
      ON CONFLICT(id) DO UPDATE SET decals = ${decalsJson}, colorHex = ${spec.colorHex}, colorName = ${spec.colorName}
    `);

    // D. Insert Order
    const subtotal = spec.price * spec.qty;
    const total = subtotal;
    const orderStatus = "PROCESSING";

    await db.run(sql`
      INSERT INTO "Order" (id, orderNumber, userId, status, deliveryMethod, subtotalIdr, totalIdr, shippingAddressId, courierNotes, createdAt, updatedAt)
      VALUES (${orderId}, ${orderNum}, ${userId}, ${orderStatus}, ${cust.method}, ${subtotal}, ${total}, ${addressId}, ${cust.note}, ${now}, ${now})
      ON CONFLICT(id) DO UPDATE SET orderNumber = ${orderNum}, status = ${orderStatus}, deliveryMethod = ${cust.method}, courierNotes = ${cust.note}
    `);

    // E. Insert OrderItem
    await db.run(sql`
      INSERT INTO "OrderItem" (id, orderId, designId, quantity, unitPriceIdr, lineTotalIdr, snapshotName, snapshotImageUrl, snapshotSize, snapshotColorName)
      VALUES (${orderItemId}, ${orderId}, ${designId}, ${spec.qty}, ${spec.price}, ${subtotal}, ${`${spec.name} Size ${spec.size}`}, ${spec.snapshotImage}, ${spec.size}, ${spec.colorName})
      ON CONFLICT(id) DO UPDATE SET snapshotName = ${`${spec.name} Size ${spec.size}`}, snapshotSize = ${spec.size}, snapshotColorName = ${spec.colorName}, snapshotImageUrl = ${spec.snapshotImage}
    `);

    // F. Insert ProductionTask (Jika ada multiDecals, buatkan task per sisi cetak)
    const qcId = `qc-pass-${i + 1}`;
    if (spec.multiDecals && spec.multiDecals.length > 0) {
      for (let sIdx = 0; sIdx < spec.multiDecals.length; sIdx++) {
        const md = spec.multiDecals[sIdx]!;
        const multiTaskId = sIdx === 0 ? taskId : `${taskId}-${sIdx + 1}`;
        await db.run(sql`
          INSERT INTO "ProductionTask" (
            id, orderId, orderItemId, stage, priority, dueDate, notes,
            printWidthCm, printHeightCm, placementSide, offsetFromCollarCm,
            rawAssetUrl, mockupPreviewUrl, printFileUrl, createdAt, updatedAt
          ) VALUES (
            ${multiTaskId}, ${orderId}, ${orderItemId}, ${stage}, 1, ${now}, ${cust.note},
            ${md.widthCm}, ${md.heightCm}, ${md.side.toUpperCase()}, ${md.offsetCm},
            ${md.url}, ${spec.snapshotImage}, ${md.url}, ${now}, ${now}
          )
        `);

        const qcMultiId = `${qcId}-${sIdx + 1}`;
        await db.run(sql`
          INSERT INTO "QcInspection" (id, orderId, productionTaskId, photoUrl, grazingDeg, luxEstimate, side, checksJson, note, createdAt)
          VALUES (${qcMultiId}, ${orderId}, ${multiTaskId}, ${md.url}, 45, 850, ${md.side}, '[]', 'Lolos QC visual maklon', ${now})
          ON CONFLICT(id) DO UPDATE SET checksJson = '[]'
        `);
      }
    } else {
      await db.run(sql`
        INSERT INTO "ProductionTask" (
          id, orderId, orderItemId, stage, priority, dueDate, notes,
          printWidthCm, printHeightCm, placementSide, offsetFromCollarCm,
          rawAssetUrl, mockupPreviewUrl, printFileUrl, createdAt, updatedAt
        ) VALUES (
          ${taskId}, ${orderId}, ${orderItemId}, ${stage}, 1, ${now}, ${cust.note},
          ${spec.printWidthCm}, ${spec.printHeightCm}, ${spec.targetSide === "back" ? "BACK" : "FRONT"}, ${spec.offsetFromCollarCm},
          ${spec.decalUrl}, ${spec.snapshotImage}, ${spec.decalUrl}, ${now}, ${now}
        )
      `);

      await db.run(sql`
        INSERT INTO "QcInspection" (id, orderId, productionTaskId, photoUrl, grazingDeg, luxEstimate, side, checksJson, note, createdAt)
        VALUES (${qcId}, ${orderId}, ${taskId}, ${spec.decalUrl}, 45, 850, ${spec.targetSide}, '[]', 'Lolos QC visual maklon', ${now})
        ON CONFLICT(id) DO UPDATE SET checksJson = '[]'
      `);
    }

    console.log(`  ✓ [Pillar ${Math.floor(i / 5) + 1} - ${stage}] Order ${orderNum} (${spec.name} ${spec.size} ${spec.colorName}) berhasil dibuat.`);
  }

  console.log("\n🎉 SELESAI! Tepat 20 data pesanan (5 per kolom Kanban) dengan aset lengkap telah dimasukkan.");
}

seed().catch(console.error);
