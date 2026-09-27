// scripts/e2e-kasus-2.mjs — Eksekusi Nyata Kasus 2: Hoodie Fleece Workshop Pickup KM 10 & DTF 30cm Clamping
// SSOT: Blueprint/BLUEPRINT-E2E-ADMIN-USER-LENGKAP.md Domain L (C-01/C-02) & Domain B (PROD-09)
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client/web";
import { cookieForEmail } from "./e2e-auth.mjs";

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const OUTPUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", `kasus-2-${STAMP}`);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const c = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

async function runKasus2() {
  console.log("=================================================================");
  console.log("MEMULAI EKSEKUSI NYATA KASUS 2: HOODIE FLEECE WORKSHOP PICKUP");
  console.log("   (Uji Kritis Batas Printhead DTF Clamped Maksimal 30.0 cm)");
  console.log("=================================================================\n");

  // 1. Ambil Sesi Pelanggan (hengkivibecoding@gmail.com)
  const custSessionRes = await c.execute({
    sql: 'SELECT s.token, u.id as userId, u.name, u.email, u.phoneNumber, u.phoneVerified FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1',
    args: ["hengkivibecoding@gmail.com"],
  });
  if (custSessionRes.rows.length === 0) throw new Error("Sesi pelanggan tidak ditemukan di DB!");
  const custUser = custSessionRes.rows[0];

  const custCookie = await cookieForEmail(c, "hengkivibecoding@gmail.com");
  console.log("1. Data Pelanggan Terverifikasi:");
  console.log(`   - Nama: ${custUser.name}`);
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber} (phoneVerified: ${custUser.phoneVerified})`);

  // 2. Siapkan Payload Hoodie dengan Desain Jumbo (Uji Clamping 30.0 cm)
  const itemsPayload = [
    {
      apparelSlug: "hoodie",
      fabricThicknessSlug: "french-terry-380",
      materialFinishSlug: "standard",
      colorHex: "#1e3a8a",
      colorName: "Deep Navy Blue",
      size: "XL",
      quantity: 1,
      title: "Custom HOODIE Fleece Sablon DTF Workshop Makassar",
      decals: [
        {
          id: "decal-back-jumbo",
          name: "Maskot Sablon DTF Punggung Jumbo",
          targetSide: "back",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/mascot-sablon.png",
          x: 0,
          y: 0.05,
          scale: 0.85, // Skala ditarik sangat besar (> 35 cm) untuk uji clamping
          rotation: 0,
          opacity: 1,
          printPx: { w: 3500, h: 4200 },
        },
        {
          id: "decal-front-crest",
          name: "Emblem Logo Kaos Kami Dada Kiri",
          targetSide: "front",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-emblem.png",
          x: -0.22,
          y: 0.18,
          scale: 0.22,
          rotation: 0,
          opacity: 1,
          printPx: { w: 900, h: 900 },
        },
      ],
      masterAssetUrl: {
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-sablon.png",
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-emblem.png",
      },
    },
  ];

  const checkoutPayload = {
    recipientName: custUser.name,
    phoneNumber: custUser.phoneNumber,
    email: custUser.email,
    deliveryMethod: "PICKUP",
    turnaroundTier: "REGULER",
    district: "Tamalanrea",
    fullAddress: "Workshop Kaos Kami Makassar (Self Pick-up) - Jl. Perintis Kemerdekaan KM 10",
    courierNotes: "Ambil langsung di workshop fisik saat sablon selesai. Hubungi saat siap.",
    items: itemsPayload,
  };

  console.log(`\n2. Mengirim Checkout Request ke ${BASE_URL}/api/checkout...`);
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie,
      "Idempotency-Key": `idem-kasus2-${Date.now()}`,
    },
    body: JSON.stringify(checkoutPayload),
  });

  const checkoutData = await checkoutRes.json();
  console.log(`   - HTTP Status: ${checkoutRes.status}`);
  if (!checkoutRes.ok) throw new Error(`Checkout gagal: ${JSON.stringify(checkoutData)}`);

  const orderId = checkoutData.orderId;
  const orderNumber = checkoutData.orderNumber;
  console.log(`\nPESANAN KASUS 2 TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Total Tagihan: Rp ${Number(checkoutData.amount).toLocaleString("id-ID")}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrderRes = await c.execute({
    sql: 'SELECT id, orderNumber, status, subtotalIdr, shippingCostIdr, totalIdr, deliveryMethod FROM "Order" WHERE id = ?',
    args: [orderId],
  });
  const dbOrder = dbOrderRes.rows[0];
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log(`   - Delivery Method: ${dbOrder.deliveryMethod} (Ambil Sendiri Workshop)`);
  console.log(`   - Biaya Pengiriman: Rp ${dbOrder.shippingCostIdr}`);

  // 4. Simulasi Pembayaran Lunas Duitku (Webhook Callback MD5)
  console.log("\n4. Menjalankan Simulasi Pembayaran Lunas Duitku VA...");
  const merchantCode = requireEnv("DUITKU_MERCHANT_CODE");
  const apiKey = requireEnv("DUITKU_API_KEY");
  const amountStr = String(dbOrder.totalIdr);
  const signatureRaw = merchantCode + amountStr + orderNumber + apiKey;
  const signature = crypto.createHash("md5").update(signatureRaw).digest("hex");

  const duitkuCallbackPayload = {
    merchantCode,
    amount: amountStr,
    merchantOrderId: orderNumber,
    productDetail: "Custom HOODIE Fleece Sablon DTF Workshop Makassar",
    additionalParam: "",
    paymentCode: "VA_BCA",
    resultCode: "00",
    merchantUserId: custUser.userId,
    reference: checkoutData.reference || "DUITKU-REF-002",
    signature,
  };

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/duitku`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duitkuCallbackPayload),
  });
  console.log(`   - Webhook Status: ${webhookRes.status}`);

  // 5. Verifikasi Pembuatan ProductionTask & Uji Batas Printhead 30.0 cm
  const taskRes = await c.execute({
    sql: "SELECT id, orderId, stage, printWidthCm, printHeightCm, placementSide FROM ProductionTask WHERE orderId = ?",
    args: [orderId],
  });
  const taskRows = taskRes.rows;
  console.log(`\n5. Evaluasi Kepatuhan Skala Sablon DTF (Batas 30.0 cm):`);
  console.log(`   - Diterbitkan: ${taskRows.length} tugas produksi`);

  let clampingVerified = true;
  taskRows.forEach((t, i) => {
    const w = Number(t.printWidthCm);
    console.log(`     [Task ${i + 1}] Area: ${t.placementSide}, Lebar: ${w} cm x Tinggi: ${t.printHeightCm} cm`);
    if (w <= 30.0) {
      console.log(`     [LULUS] Lebar ${w} cm terkunci dalam batas aman printhead DTF (<= 30.0 cm).`);
    } else {
      console.error(`     [GAGAL] Lebar ${w} cm melebihi batas printhead 30.0 cm!`);
      clampingVerified = false;
    }
  });

  // 6. Simpan Dokumen Hasil
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-2-hoodie-pickup-${orderNumber}.json`);
  fs.writeFileSync(
    orderJsonPath,
    JSON.stringify(
      {
        kasus: "KASUS 2: HOODIE FLEECE WORKSHOP PICKUP",
        clampingAudit: {
          isClampedTo30cm: clampingVerified,
          tasks: taskRows.map((t) => ({
            printWidthCm: t.printWidthCm,
            printHeightCm: t.printHeightCm,
            placementSide: t.placementSide,
            isCompliant: Number(t.printWidthCm) <= 30.0,
          })),
        },
        order: dbOrder,
        customer: {
          name: custUser.name,
          email: custUser.email,
          phone: custUser.phoneNumber,
        },
        items: itemsPayload,
        productionTasks: taskRows,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\nDokumen hasil terbit di: ${orderJsonPath}`);
  console.log("=================================================================");
  console.log(`KASUS 2 SELESAI: ${clampingVerified ? "100% SUKSES DAN PATUH STANDAR DTF" : "GAGAL CLAMPING"}`);
  console.log("=================================================================");
}

runKasus2().catch((e) => {
  console.error("FATAL ERROR KASUS 2:", e);
  process.exit(1);
});
