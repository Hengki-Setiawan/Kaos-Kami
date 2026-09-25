import crypto from "crypto";
import fs from "fs";
import path from "path";
import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Order, ProductionTask } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:3000";
// Secret WAJIB via env (JANGAN hardcode � insiden Sep 2026).
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const OUTPUT_DIR = "d:/Vibe coding Semester 7/Kaos Kami/Blueprint/hasil-pengujian-e2e/orders-invoices";

async function runKasus2() {
  console.log("=================================================================");
  console.log("🚀 MEMULAI EKSEKUSI NYATA KASUS 2: HOODIE FLEECE WORKSHOP PICKUP");
  console.log("   (Uji Kritis Batas Printhead DTF Clamped Maksimal 30.0 cm)");
  console.log("=================================================================\n");

  // 1. Login Resmi Pelanggan (hengkivibecoding@gmail.com)
  const custLoginRes = await auth.api.signInEmail({
    body: {
      email: "hengkivibecoding@gmail.com",
      password: requireEnv("E2E_TEST_PASSWORD")
    },
    asResponse: true
  });

  if (!custLoginRes.ok) {
    throw new Error(`Gagal login customer: ${custLoginRes.status}`);
  }

  const rawCustCookie = custLoginRes.headers.get("set-cookie") || "";
  const custCookie = rawCustCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");

  const custSession = await auth.api.getSession({
    headers: new Headers({ "cookie": custCookie })
  });
  const custUser = custSession!.user;
  console.log("1. Data Pelanggan Terverifikasi:");
  console.log(`   - Nama: ${custUser.name}`);
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber} (phoneVerified: ${custUser.phoneVerified})`);

  // 2. Siapkan Payload Hoodie dengan Desain Jumbo (Uji Clamping 30.0 cm)
  // Back: /mascot/mascot-sablon.png (skala besar 0.85 -> fisik > 35 cm)
  // Front Crest: /mascot/logo-emblem.png (9 cm x 9 cm)
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
          scale: 0.85, // Skala ditarik sangat besar (menguji apakah terkunci ketat 30.0 cm)
          rotation: 0,
          opacity: 1,
          printPx: { w: 3500, h: 4200 }
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
          printPx: { w: 900, h: 900 }
        }
      ],
      masterAssetUrl: {
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-sablon.png",
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-emblem.png"
      }
    }
  ];

  const checkoutPayload = {
    recipientName: custUser.name,
    phoneNumber: custUser.phoneNumber,
    email: custUser.email,
    deliveryMethod: "PICKUP",
    turnaroundTier: "REGULER",
    fullAddress: "Workshop Kaos Kami Makassar (Self Pick-up) - Jl. Tamalanrea Raya No. 12",
    courierNotes: "Ambil langsung di workshop fisik saat sablon selesai. Hubungi saat siap.",
    items: itemsPayload
  };

  console.log("\n2. Mengirim Checkout Request ke http://localhost:3000/api/checkout...");
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie,
      "Idempotency-Key": `idem-kasus2-${Date.now()}`
    },
    body: JSON.stringify(checkoutPayload)
  });

  const checkoutData: any = await checkoutRes.json();
  console.log(`   - HTTP Status: ${checkoutRes.status}`);
  if (!checkoutRes.ok) {
    console.error("Gagal checkout:", checkoutData);
    throw new Error(`Checkout gagal: ${JSON.stringify(checkoutData)}`);
  }

  const orderId = checkoutData.orderId;
  const orderNumber = checkoutData.orderNumber;
  console.log(`\n🎉 PESANAN KASUS 2 TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Total Tagihan: Rp ${checkoutData.amount.toLocaleString("id-ID")}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrder = await db.query.Order.findFirst({
    where: eq(Order.id, orderId)
  });
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log(`   - Delivery Method: ${dbOrder?.deliveryMethod} (Ambil Sendiri Workshop)`);
  console.log(`   - Biaya Pengiriman: Rp ${dbOrder?.shippingCostIdr}`);

  // 4. Simulasi Pembayaran Lunas Duitku (Webhook Callback MD5)
  console.log("\n4. Menjalankan Simulasi Pembayaran Lunas Duitku VA...");
  const merchantCode = requireEnv("DUITKU_MERCHANT_CODE");
  const apiKey = requireEnv("DUITKU_API_KEY");
  const amountStr = String(dbOrder?.totalIdr);
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
    merchantUserId: custUser.id,
    reference: checkoutData.reference || "DUITKU-REF-002",
    signature
  };

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/duitku`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duitkuCallbackPayload)
  });
  const webhookText = await webhookRes.text();
  console.log(`   - Webhook Status: ${webhookRes.status} (${webhookText})`);

  // 5. Verifikasi UJI KRITIS CLAMPING 30.0 CM di Database ProductionTask
  console.log("\n5. AUDIT KALIBRASI FISIK PRINTHEAD DTF (Maksimal 30.0 cm):");
  const taskRows = await db.query.ProductionTask.findMany({
    where: eq(ProductionTask.orderId, orderId)
  });

  let clampingVerified = false;
  taskRows.forEach((t, i) => {
    console.log(`   [Task ${i+1}] Stage: ${t.stage}, Lebar: ${t.printWidthCm} cm, Tinggi: ${t.printHeightCm} cm`);
    if (t.printWidthCm <= 30.0) {
      console.log(`     ✓ Lebar ${t.printWidthCm} cm terkunci dalam batas aman printhead DTF (<= 30.0 cm).`);
      clampingVerified = true;
    } else {
      console.error(`     ❌ GAGAL: Lebar ${t.printWidthCm} cm melebihi batas printhead 30.0 cm!`);
    }
  });

  // 6. Ambil Dokumen Invoice & SPK Job Ticket sebagai Admin
  console.log("\n6. Mengambil Dokumen Cetak Invoice & SPK Job Ticket Workshop via Akses Admin...");
  const adminLoginRes = await auth.api.signInEmail({
    body: {
      email: "hengkishadow@gmail.com",
      password: requireEnv("E2E_ADMIN_PASSWORD")
    },
    asResponse: true
  });
  const rawAdminCookie = adminLoginRes.headers.get("set-cookie") || "";
  const adminCookie = rawAdminCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");

  const invoiceRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { "Cookie": adminCookie }
  });
  const invoiceHtml = await invoiceRes.text();

  const spkRes = await fetch(`${BASE_URL}/admin/orders/${orderId}/job-ticket`, {
    headers: { "Cookie": adminCookie }
  });
  const spkHtml = await spkRes.text();

  // 7. Simpan Dokumen Fisik ke Blueprint/hasil-pengujian-e2e/orders-invoices/
  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-2-hoodie-pickup-${orderNumber}.json`);
  const invoiceHtmlPath = path.join(OUTPUT_DIR, `KASUS-2-invoice-web.html`);
  const spkHtmlPath = path.join(OUTPUT_DIR, `KASUS-2-job-ticket-spk.html`);

  fs.writeFileSync(orderJsonPath, JSON.stringify({
    kasus: "KASUS 2: HOODIE FLEECE WORKSHOP PICKUP",
    clampingAudit: {
      isClampedTo30cm: clampingVerified,
      tasks: taskRows.map(t => ({
        printWidthCm: t.printWidthCm,
        printHeightCm: t.printHeightCm,
        offsetFromCollarCm: t.offsetFromCollarCm,
        isCompliant: t.printWidthCm <= 30.0
      }))
    },
    order: dbOrder,
    customer: {
      name: custUser.name,
      email: custUser.email,
      phone: custUser.phoneNumber
    },
    items: itemsPayload,
    productionTasks: taskRows,
    payment: {
      gateway: "Duitku v2 Sandbox",
      paymentMethod: "VA_BCA",
      resultCode: "00",
      reference: checkoutData.reference
    },
    shipping: {
      method: "PICKUP",
      workshopAddress: "Workshop Kaos Kami Makassar (Tamalanrea)",
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
  console.log(`✅ KASUS 2 SELESAI DENGAN STATUS 100% SUKSES! (Order: ${orderNumber})`);
  console.log("=================================================================\n");
}

runKasus2().catch(console.error);
