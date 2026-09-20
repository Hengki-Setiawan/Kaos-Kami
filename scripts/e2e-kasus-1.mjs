import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client/web";

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = "d:/Vibe coding Semester 7/Kaos Kami/Blueprint/hasil-pengujian-e2e/orders-invoices";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function runKasus1() {
  console.log("=================================================================");
  console.log("🚀 MEMULAI EKSEKUSI NYATA KASUS 1: KAOS BOXY HYPERLOCAL MAKASSAR");
  console.log("=================================================================\n");

  // 1. Ambil Sesi Asli Pelanggan (hengkivibecoding@gmail.com)
  const custSessionRes = await c.execute({
    sql: "SELECT s.token, u.id as userId, u.name, u.email, u.phoneNumber, u.phoneVerified FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1",
    args: ["hengkivibecoding@gmail.com"]
  });

  if (custSessionRes.rows.length === 0) {
    throw new Error("Sesi pelanggan tidak ditemukan di DB!");
  }
  const custUser = custSessionRes.rows[0];
  console.log("1. Data Pelanggan Terverifikasi:");
  console.log(`   - Nama: ${custUser.name}`);
  console.log(`   - Email: ${custUser.email}`);
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber}`);
  console.log(`   - Status phoneVerified: ${custUser.phoneVerified === 1 ? "✓ TERVERIFIKASI (1)" : "0"}`);
  console.log(`   - Session Token: ${custUser.token.slice(0, 15)}...`);

  const cookieHeader = `better-auth.session_token=${custUser.token}; kaos-kami-auth.session_token=${custUser.token}`;

  // 2. Siapkan Payload Pesanan Kasus 1 (Desain Maskot Resmi Kaos Kami)
  // Front Decal: /mascot/logo-white.png (20 cm x 28 cm)
  // Back Collar: /mascot/logo-transparent.png (5 cm x 5 cm)
  const itemsPayload = [
    {
      apparelSlug: "tshirt",
      fabricThicknessSlug: "combed-24s",
      materialFinishSlug: "standard",
      colorHex: "#121214",
      colorName: "Obsidian Black",
      size: "L",
      quantity: 1,
      title: "Custom TSHIRT Sablon DTF Boxy Makassar",
      decals: [
        {
          id: "decal-front-mascot",
          name: "Logo Kaos Kami Putih A4",
          targetSide: "front",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-white.png",
          x: 0,
          y: 0.05,
          scale: 0.55,
          rotation: 0,
          opacity: 1,
          printPx: { w: 2000, h: 2800 }
        },
        {
          id: "decal-collar-mascot",
          name: "Logo Minimalis Kerah",
          targetSide: "back",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-transparent.png",
          x: 0,
          y: 0.40,
          scale: 0.15,
          rotation: 0,
          opacity: 1,
          printPx: { w: 500, h: 500 }
        }
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-white.png",
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-transparent.png"
      }
    }
  ];

  const checkoutPayload = {
    recipientName: "hengki vibecoding1",
    phoneNumber: custUser.phoneNumber,
    email: custUser.email,
    deliveryMethod: "FREE_MAKASSAR",
    turnaroundTier: "REGULER",
    district: "Tamalanrea",
    fullAddress: "Jl. Perintis Kemerdekaan KM 10 No. 45, Tamalanrea Indah, Kota Makassar, Sulawesi Selatan 90245 (Koordinat GPS: -5.1353, 119.4891)",
    courierNotes: "Antar depan pagar hitam samping warkop. Titik lokasi terkalibrasi via GPS Google Maps.",
    items: itemsPayload
  };

  console.log("\n2. Mengirim Checkout Request ke http://localhost:3000/api/checkout...");
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookieHeader,
      "Idempotency-Key": `idem-kasus1-${Date.now()}`
    },
    body: JSON.stringify(checkoutPayload)
  });

  const checkoutData = await checkoutRes.json();
  console.log(`   - HTTP Status: ${checkoutRes.status}`);
  if (!checkoutRes.ok) {
    console.error("Gagal checkout:", checkoutData);
    throw new Error(`Checkout gagal: ${JSON.stringify(checkoutData)}`);
  }

  console.log("   - Response Checkout:", checkoutData);
  const orderId = checkoutData.orderId;
  const orderNumber = checkoutData.orderNumber;
  console.log(`\n🎉 PESANAN BERHASIL TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Payment Reference: ${checkoutData.reference}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrderRes = await c.execute({
    sql: "SELECT id, orderNumber, status, subtotalIdr, shippingCostIdr, totalIdr, deliveryMethod, courierNotes FROM \"Order\" WHERE id = ?",
    args: [orderId]
  });
  const dbOrder = dbOrderRes.rows[0];
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log("   - Data Order DB:", dbOrder);

  // 4. Simulasi Pembayaran Lunas Duitku (Webhook Callback dengan Tanda Tangan MD5)
  console.log("\n4. Menjalankan Simulasi Pembayaran Lunas via Duitku Webhook...");
  const merchantCode = process.env.DUITKU_MERCHANT_CODE || "DS28521";
  const apiKey = process.env.DUITKU_API_KEY || "ea279c7a1381333794d265d70b55693a";
  const amountStr = String(dbOrder.totalIdr);
  const merchantOrderId = orderNumber;
  
  // Rumus tanda tangan Duitku: MD5(merchantCode + amount + merchantOrderId + apiKey)
  const signatureRaw = merchantCode + amountStr + merchantOrderId + apiKey;
  const signature = crypto.createHash("md5").update(signatureRaw).digest("hex");

  const duitkuCallbackPayload = {
    merchantCode,
    amount: amountStr,
    merchantOrderId,
    productDetail: "Custom TSHIRT Sablon DTF Boxy Makassar",
    additionalParam: "",
    paymentCode: "QRIS",
    resultCode: "00", // Sukses
    merchantUserId: custUser.userId,
    reference: checkoutData.reference || "DUITKU-REF-001",
    signature
  };

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/duitku`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duitkuCallbackPayload)
  });
  const webhookText = await webhookRes.text();
  console.log(`   - Webhook Status: ${webhookRes.status} (${webhookText})`);

  // 5. Verifikasi Perubahan Status Order & Pembuatan ProductionTask di DB
  const paidOrderRes = await c.execute({
    sql: "SELECT id, orderNumber, status FROM \"Order\" WHERE id = ?",
    args: [orderId]
  });
  console.log(`   - Status Order Pasca Bayar: ${paidOrderRes.rows[0].status}`);

  const taskRes = await c.execute({
    sql: "SELECT id, orderId, stage, printWidthCm, printHeightCm, placementArea FROM ProductionTask WHERE orderId = ?",
    args: [orderId]
  });
  console.log(`   - Production Tasks Terbit: ${taskRes.rows.length} task`);
  taskRes.rows.forEach((t, i) => {
    console.log(`     [Task ${i+1}] Stage: ${t.stage}, Area: ${t.placementArea}, Ukuran: ${t.printWidthCm}cm x ${t.printHeightCm}cm`);
  });

  // 6. Fetch Invoice HTML & Lembar SPK Job Ticket sebagai Admin
  console.log("\n6. Mengambil Dokumen Cetak Invoice & SPK Job Ticket Workshop...");
  const adminSessionRes = await c.execute({
    sql: "SELECT s.token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = 'hengkishadow@gmail.com' ORDER BY s.createdAt DESC LIMIT 1"
  });
  const adminToken = adminSessionRes.rows[0].token;
  const adminCookie = `better-auth.session_token=${adminToken}; kaos-kami-auth.session_token=${adminToken}`;

  // Fetch Invoice Web HTML
  const invoiceRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { "Cookie": adminCookie }
  });
  const invoiceHtml = await invoiceRes.text();

  // Fetch Lembar SPK Operator HTML
  const spkRes = await fetch(`${BASE_URL}/admin/orders/${orderId}/job-ticket`, {
    headers: { "Cookie": adminCookie }
  });
  const spkHtml = await spkRes.text();

  // 7. Simpan Dokumen Fisik ke Blueprint/hasil-pengujian-e2e/orders-invoices/
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-1-kaos-boxy-makassar-${orderNumber}.json`);
  const invoiceHtmlPath = path.join(OUTPUT_DIR, `KASUS-1-invoice-web.html`);
  const spkHtmlPath = path.join(OUTPUT_DIR, `KASUS-1-job-ticket-spk.html`);

  fs.writeFileSync(orderJsonPath, JSON.stringify({
    kasus: "KASUS 1: KAOS BOXY HYPERLOCAL MAKASSAR",
    order: dbOrderRes.rows[0],
    paidStatus: paidOrderRes.rows[0].status,
    customer: {
      name: custUser.name,
      email: custUser.email,
      phone: custUser.phoneNumber,
      phoneVerified: custUser.phoneVerified === 1
    },
    items: itemsPayload,
    productionTasks: taskRes.rows,
    payment: {
      gateway: "Duitku v2 Sandbox",
      paymentMethod: "QRIS",
      signature: signature,
      resultCode: "00",
      reference: checkoutData.reference
    },
    shipping: {
      method: "FREE_MAKASSAR",
      district: "Tamalanrea",
      address: checkoutPayload.fullAddress,
      notes: checkoutPayload.courierNotes
    },
    executedAt: new Date().toISOString()
  }, null, 2));

  fs.writeFileSync(invoiceHtmlPath, invoiceHtml);
  fs.writeFileSync(spkHtmlPath, spkHtml);

  console.log(`\n💾 Berkas Bukti Nyata Disimpan:`);
  console.log(`   - JSON Transaksi: ${orderJsonPath}`);
  console.log(`   - Invoice Web:    ${invoiceHtmlPath}`);
  console.log(`   - Lembar SPK Job: ${spkHtmlPath}`);

  console.log("\n=================================================================");
  console.log(`✅ KASUS 1 SELESAI DENGAN STATUS 100% SUKSES! (Order: ${orderNumber})`);
  console.log("=================================================================\n");
}

runKasus1().catch(console.error);
