// scripts/e2e-kasus-3.mjs — Eksekusi Nyata Kasus 3: Pemesanan Massal (Bulk Merch 12 Pcs) & Multi-Item DTF
// SSOT: Blueprint/BLUEPRINT-E2E-ADMIN-USER-LENGKAP.md Domain L (C-04) & Domain G (K-03/K-05)
// Pembayaran: iPaymu Direct QRIS (Bab 55) — webhook Duitku 410 Gone, JANGAN dipakai.
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client/web";
import { cookieForEmail } from "./e2e-auth.mjs";

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const OUTPUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", `kasus-3-${STAMP}`);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const c = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

async function runKasus3() {
  console.log("=================================================================");
  console.log("MEMULAI EKSEKUSI NYATA KASUS 3: BULK MERCH ORDER (12 PCS KAOS)");
  console.log("   (Pemesanan Banyak Kaos dengan Desain Sablon Multi-Item)");
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
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber}`);

  // 2. Siapkan Payload 12 Pcs Kaos Komunitas (2 Item Heterogen x 6 pcs)
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
          printPx: { w: 2800, h: 3800 },
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
          printPx: { w: 600, h: 600 },
        },
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-primary.png",
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-transparent.png",
      },
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
          printPx: { w: 2000, h: 2800 },
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
          printPx: { w: 1000, h: 1000 },
        },
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/mascot-cool.png",
      },
    },
  ];

  const checkoutPayload = {
    recipientName: custUser.name,
    phoneNumber: custUser.phoneNumber,
    email: custUser.email,
    deliveryMethod: "FREE_MAKASSAR",
    turnaroundTier: "REGULER",
    district: "Panakkukang",
    fullAddress: "Jl. Boulevard No. 18, Panakkukang, Kota Makassar, Sulawesi Selatan 90231",
    courierNotes: "Pesanan merchandise kaos komunitas (12 pcs). Harap bungkus rapi per lusin.",
    items: itemsPayload,
  };

  console.log(`\n2. Mengirim Bulk Checkout Request ke ${BASE_URL}/api/checkout...`);
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie,
      "Idempotency-Key": `idem-kasus3-${Date.now()}`,
    },
    body: JSON.stringify(checkoutPayload),
  });

  const checkoutData = await checkoutRes.json();
  console.log(`   - HTTP Status: ${checkoutRes.status}`);
  if (!checkoutRes.ok) throw new Error(`Bulk Checkout gagal: ${JSON.stringify(checkoutData)}`);

  const orderId = checkoutData.orderId;
  const orderNumber = checkoutData.orderNumber;
  console.log(`\nPESANAN BULK KASUS 3 TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Total Tagihan (12 Pcs): Rp ${Number(checkoutData.amount).toLocaleString("id-ID")}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrderRes = await c.execute({
    sql: 'SELECT id, orderNumber, status, subtotalIdr, shippingCostIdr, totalIdr FROM "Order" WHERE id = ?',
    args: [orderId],
  });
  const dbOrder = dbOrderRes.rows[0];
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log(`   - Subtotal: Rp ${dbOrder.subtotalIdr.toLocaleString("id-ID")}`);
  console.log(`   - Total Tagihan: Rp ${dbOrder.totalIdr.toLocaleString("id-ID")}`);

  // 4. Simulasi Pembayaran Lunas via Webhook Resmi iPaymu (migrasi Bab 55 — Duitku 410 Gone).
  // SSOT sukses: Blueprint/BUILD-PROGRESS-TRACKER.md Gelombang 7 (KK-20261004-5473 Rp 89000:
  // POST /api/webhooks/ipaymu {reference_id, status:"berhasil", amount, via:"QRIS"}
  // → 200 "Payment successfully confirmed", Order=PAYMENT_CONFIRMED, Payment=SETTLEMENT/IPAYMU_QRIS).
  console.log("\n4. Menjalankan Simulasi Pembayaran Lunas via Webhook iPaymu...");
  const ipaymuCallbackPayload = {
    trx_id: `IPAYMU-MOCK-${Date.now()}`,
    sid: `SID-${Date.now()}`,
    reference_id: orderNumber,
    reference: orderNumber,
    status: "berhasil",
    status_code: "00",
    amount: Number(dbOrder.totalIdr),
    via: "QRIS",
    channel: "qris",
  };

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/ipaymu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ipaymuCallbackPayload),
  });
  const webhookText = await webhookRes.text().catch(() => "");
  console.log(`   - Webhook Status: ${webhookRes.status} (${webhookText})`);
  if (webhookRes.status !== 200 || !/successfully confirmed/i.test(webhookText)) {
    throw new Error(`Webhook iPaymu gagal melunaskan ${orderNumber}: HTTP ${webhookRes.status} (${webhookText})`);
  }

  // 4b. Asersi lunas: status order HARUS PAYMENT_CONFIRMED.
  const paidCheckRes = await c.execute({
    sql: 'SELECT status FROM "Order" WHERE id = ?',
    args: [orderId],
  });
  if (paidCheckRes.rows[0]?.status !== "PAYMENT_CONFIRMED") {
    throw new Error(`Asersi lunas GAGAL: status ${paidCheckRes.rows[0]?.status} (mau PAYMENT_CONFIRMED)`);
  }
  console.log(`   - Status Order Pasca Bayar: PAYMENT_CONFIRMED (asersi lunas LULUS)`);

  // 5. Verifikasi Tugas Produksi Batch Sablon Terbit
  const taskRes = await c.execute({
    sql: "SELECT id, orderId, stage, printWidthCm, printHeightCm, placementSide FROM ProductionTask WHERE orderId = ?",
    args: [orderId],
  });
  const taskRows = taskRes.rows;
  console.log(`\n5. Evaluasi Penerbitan Tugas Produksi Bulk Sablon:`);
  console.log(`   - Diterbitkan: ${taskRows.length} tugas produksi sablon`);
  if (taskRows.length === 0) {
    throw new Error("Asersi ProductionTask GAGAL: 0 task terbit untuk order lunas");
  }
  taskRows.forEach((t, i) => {
    console.log(`     [Task ${i + 1}] Area: ${t.placementSide}, Lebar: ${t.printWidthCm} cm x ${t.printHeightCm} cm`);
  });

  // 6. Simpan Dokumen Hasil
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-3-bulk-merch-${orderNumber}.json`);
  fs.writeFileSync(
    orderJsonPath,
    JSON.stringify(
      {
        kasus: "KASUS 3: BULK MERCH ORDER (12 PCS KAOS)",
        order: dbOrder,
        customer: {
          name: custUser.name,
          email: custUser.email,
          phone: custUser.phoneNumber,
        },
        itemsCount: 12,
        productionTasks: taskRows,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\nDokumen hasil terbit di: ${orderJsonPath}`);
  console.log("=================================================================");
  console.log("KASUS 3 SELESAI 100% SUKSES!");
  console.log("=================================================================");
}

runKasus3().catch((e) => {
  console.error("FATAL ERROR KASUS 3:", e);
  process.exit(1);
});
