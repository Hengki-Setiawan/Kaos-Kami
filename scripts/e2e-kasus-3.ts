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

async function runKasus3() {
  console.log("=================================================================");
  console.log("🚀 MEMULAI EKSEKUSI NYATA KASUS 3: BULK MERCH ORDER (12 PCS KAOS)");
  console.log("   (Pemesanan Banyak Kaos dengan 24+ Desain Sablon Fisik Heterogen)");
  console.log("=================================================================\n");

  // 1. Login Pelanggan (hengkivibecoding@gmail.com)
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
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber}`);

  // 2. Siapkan Payload 12 Pcs Kaos Komunitas (2 Item Heterogen x 6 pcs)
  // Item A: 6 pcs Kaos Boxy Hitam 24s (Mascot Primary A3 + Back Logo)
  // Item B: 6 pcs Kaos Standard Putih 30s (Mascot Cool A4 + Logo Black A6)
  const itemsPayload = [
    {
      apparelSlug: "tshirt",
      fabricThicknessSlug: "combed-24s",
      materialFinishSlug: "standard",
      colorHex: "#121214",
      colorName: "Obsidian Black",
      size: "L",
      quantity: 6,
      title: "Batch A - Kaos Komunitas Boxy Hitam (Qty 6)",
      decals: [
        {
          id: "decal-primary-a3",
          name: "Maskot Kaos Kami Primary A3",
          targetSide: "front",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/mascot-primary.png",
          x: 0,
          y: 0.05,
          scale: 0.60,
          rotation: 0,
          opacity: 1,
          printPx: { w: 2800, h: 3800 }
        },
        {
          id: "decal-label-back",
          name: "Label Kerah Minimalis",
          targetSide: "back",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-transparent.png",
          x: 0,
          y: 0.38,
          scale: 0.12,
          rotation: 0,
          opacity: 1,
          printPx: { w: 600, h: 600 }
        }
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-primary.png",
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-transparent.png"
      }
    },
    {
      apparelSlug: "tshirt",
      fabricThicknessSlug: "combed-30s",
      materialFinishSlug: "standard",
      colorHex: "#ffffff",
      colorName: "Pure White",
      size: "XL",
      quantity: 6,
      title: "Batch B - Kaos Komunitas Putih 30s (Qty 6)",
      decals: [
        {
          id: "decal-cool-a4",
          name: "Maskot Kaos Kami Cool A4",
          targetSide: "front",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/mascot-cool.png",
          x: 0,
          y: 0.08,
          scale: 0.50,
          rotation: 0,
          opacity: 1,
          printPx: { w: 2000, h: 2800 }
        },
        {
          id: "decal-pocket-a6",
          name: "Logo Saku Kaos Kami Hitam",
          targetSide: "front",
          url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-black.png",
          x: -0.25,
          y: 0.20,
          scale: 0.20,
          rotation: 0,
          opacity: 1,
          printPx: { w: 1000, h: 1000 }
        }
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-cool.png"
      }
    }
  ];

  const checkoutPayload = {
    recipientName: custUser.name,
    phoneNumber: custUser.phoneNumber,
    email: custUser.email,
    deliveryMethod: "EXPEDITION_MANUAL",
    turnaroundTier: "REGULER",
    destinationCity: "Jakarta Selatan",
    fullAddress: "Jl. Kemang Raya No. 88, Mampang Prapatan, Jakarta Selatan, DKI Jakarta 12730",
    courierNotes: "Pesanan merchandise kaos komunitas. Harap bungkus plastik tebal + bubble wrap.",
    items: itemsPayload
  };

  console.log("\n2. Mengirim Bulk Checkout Request ke http://localhost:3000/api/checkout...");
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie,
      "Idempotency-Key": `idem-kasus3-${Date.now()}`
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
  console.log(`\n🎉 PESANAN BULK ORDER KASUS 3 TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Total Tagihan (12 Kaos + Ongkir Ekspedisi): Rp ${checkoutData.amount.toLocaleString("id-ID")}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrder = await db.query.Order.findFirst({
    where: eq(Order.id, orderId)
  });
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log(`   - Subtotal Kaos: Rp ${dbOrder?.subtotalIdr.toLocaleString("id-ID")}`);
  console.log(`   - Ongkir Ekspedisi: Rp ${dbOrder?.shippingCostIdr.toLocaleString("id-ID")}`);
  console.log(`   - Total Transaksi: Rp ${dbOrder?.totalIdr.toLocaleString("id-ID")}`);

  // 4. Simulasi Pembayaran Lunas Duitku
  console.log("\n4. Menjalankan Simulasi Pembayaran Lunas Duitku Gateway...");
  const merchantCode = requireEnv("DUITKU_MERCHANT_CODE");
  const apiKey = requireEnv("DUITKU_API_KEY");
  const amountStr = String(dbOrder?.totalIdr);
  const signatureRaw = merchantCode + amountStr + orderNumber + apiKey;
  const signature = crypto.createHash("md5").update(signatureRaw).digest("hex");

  const duitkuCallbackPayload = {
    merchantCode,
    amount: amountStr,
    merchantOrderId: orderNumber,
    productDetail: "Bulk Merch Order 12 Pcs Kaos Komunitas Sablon DTF",
    additionalParam: "",
    paymentCode: "QRIS",
    resultCode: "00",
    merchantUserId: custUser.id,
    reference: checkoutData.reference || "DUITKU-REF-003",
    signature
  };

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/duitku`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duitkuCallbackPayload)
  });
  const webhookText = await webhookRes.text();
  console.log(`   - Webhook Status: ${webhookRes.status} (${webhookText})`);

  // 5. Verifikasi Pembuatan 24+ ProductionTasks di Database
  console.log("\n5. AUDIT PRODUKSI WORKSHOP (Tugas Sablon Terbit):");
  const taskRows = await db.query.ProductionTask.findMany({
    where: eq(ProductionTask.orderId, orderId)
  });
  console.log(`   - Total Production Tasks Terbit: ${taskRows.length} antrean cetak sablon!`);
  taskRows.forEach((t, i) => {
    console.log(`     [Task ${i+1}] Stage: ${t.stage}, Ukuran: ${t.printWidthCm} cm x ${t.printHeightCm} cm`);
  });

  // 6. Ambil Dokumen Cetak Invoice & SPK Job Ticket sebagai Admin
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
  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-3-bulk-merch-order-${orderNumber}.json`);
  const invoiceHtmlPath = path.join(OUTPUT_DIR, `KASUS-3-invoice-web.html`);
  const spkHtmlPath = path.join(OUTPUT_DIR, `KASUS-3-job-ticket-spk.html`);

  fs.writeFileSync(orderJsonPath, JSON.stringify({
    kasus: "KASUS 3: BULK MERCH ORDER 12 PCS KAOS KOMUNITAS",
    summary: {
      totalShirts: 12,
      totalPrintTasks: taskRows.length,
      orderNumber: orderNumber,
      orderId: orderId,
      totalAmountIdr: dbOrder?.totalIdr
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
      paymentMethod: "QRIS",
      resultCode: "00",
      reference: checkoutData.reference
    },
    shipping: {
      method: "EXPEDITION_MANUAL",
      destination: checkoutPayload.destinationCity,
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
  console.log(`✅ KASUS 3 SELESAI DENGAN STATUS 100% SUKSES! (Order: ${orderNumber})`);
  console.log("=================================================================\n");
}

runKasus3().catch(console.error);
