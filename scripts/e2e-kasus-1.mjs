// scripts/e2e-kasus-1.mjs — Eksekusi Nyata Kasus 1: Kaos Boxy Hyperlocal Makassar
// SSOT: Blueprint/BLUEPRINT-E2E-ADMIN-USER-LENGKAP.md Domain L (C-01) & Domain H (CH-01)
// Pembayaran: iPaymu Direct QRIS (Bab 55) — webhook Duitku 410 Gone, JANGAN dipakai.
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client/web";
import { cookieForEmail } from "./e2e-auth.mjs";

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const OUTPUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", `kasus-1-${STAMP}`);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const c = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

async function runKasus1() {
  console.log("=================================================================");
  console.log("MEMULAI EKSEKUSI NYATA KASUS 1: KAOS BOXY HYPERLOCAL MAKASSAR");
  console.log("=================================================================\n");

  // 1. Ambil Sesi Asli Pelanggan (hengkivibecoding@gmail.com)
  const custSessionRes = await c.execute({
    sql: 'SELECT s.token, u.id as userId, u.name, u.email, u.phoneNumber, u.phoneVerified FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1',
    args: ["hengkivibecoding@gmail.com"],
  });

  if (custSessionRes.rows.length === 0) {
    throw new Error("Sesi pelanggan tidak ditemukan di DB!");
  }
  const custUser = custSessionRes.rows[0];

  console.log("1. Data Pelanggan Terverifikasi:");
  console.log(`   - Nama: ${custUser.name}`);
  console.log(`   - Email: ${custUser.email}`);
  console.log(`   - No. WhatsApp: ${custUser.phoneNumber}`);
  console.log(`   - Status phoneVerified: ${custUser.phoneVerified === 1 ? "TERVERIFIKASI (1)" : "0"}`);
  console.log(`   - Session Token: ${custUser.token.slice(0, 15)}...`);

  const cookieHeader = await cookieForEmail(c, "hengkivibecoding@gmail.com");

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
          printPx: { w: 2000, h: 2800 },
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
          printPx: { w: 500, h: 500 },
        },
      ],
      masterAssetUrl: {
        front: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-white.png",
        back: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/master/logo-transparent.png",
      },
    },
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
    items: itemsPayload,
  };

  console.log(`\n2. Mengirim Checkout Request ke ${BASE_URL}/api/checkout...`);
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      "Idempotency-Key": `idem-kasus1-${Date.now()}`,
    },
    body: JSON.stringify(checkoutPayload),
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
  console.log(`\nPESANAN BERHASIL TERBIT!`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - No. Pesanan: ${orderNumber}`);
  console.log(`   - Payment Reference: ${checkoutData.reference}`);

  // 3. Verifikasi Data Pesanan di Turso DB
  const dbOrderRes = await c.execute({
    sql: 'SELECT id, orderNumber, status, subtotalIdr, shippingCostIdr, totalIdr, deliveryMethod, courierNotes FROM "Order" WHERE id = ?',
    args: [orderId],
  });
  const dbOrder = dbOrderRes.rows[0];
  console.log("\n3. Verifikasi Basis Data Turso:");
  console.log("   - Data Order DB:", dbOrder);

  // 3b. Admin hengkishadow menyetujui desain (ACC)
  console.log("\n3b. Admin hengkishadow menyetujui desain (ACC Review)...");
  const adminCookie = await cookieForEmail(c, "hengkishadow@gmail.com");
  const accRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      status: "PENDING_PAYMENT",
      note: "Desain ACC siap sablon",
    }),
  });
  console.log(`   - Status ACC Admin: ${accRes.status}`);

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
  const webhookText = await webhookRes.text();
  console.log(`   - Webhook Status: ${webhookRes.status} (${webhookText})`);
  if (webhookRes.status !== 200 || !/successfully confirmed/i.test(webhookText)) {
    throw new Error(`Webhook iPaymu gagal melunaskan ${orderNumber}: HTTP ${webhookRes.status} (${webhookText})`);
  }

  // 5. Verifikasi Perubahan Status Order & Pembuatan ProductionTask di DB
  const paidOrderRes = await c.execute({
    sql: 'SELECT id, orderNumber, status FROM "Order" WHERE id = ?',
    args: [orderId],
  });
  console.log(`   - Status Order Pasca Bayar: ${paidOrderRes.rows[0].status}`);
  if (paidOrderRes.rows[0].status !== "PAYMENT_CONFIRMED") {
    throw new Error(`Asersi lunas GAGAL: status ${paidOrderRes.rows[0].status} (mau PAYMENT_CONFIRMED)`);
  }

  const taskRes = await c.execute({
    sql: "SELECT id, orderId, stage, printWidthCm, printHeightCm, placementSide FROM ProductionTask WHERE orderId = ?",
    args: [orderId],
  });
  console.log(`   - Production Tasks Terbit: ${taskRes.rows.length} task`);
  if (taskRes.rows.length === 0) {
    throw new Error("Asersi ProductionTask GAGAL: 0 task terbit untuk order lunas");
  }
  taskRes.rows.forEach((t, i) => {
    console.log(`     [Task ${i + 1}] Stage: ${t.stage}, Area: ${t.placementSide}, Ukuran: ${t.printWidthCm}cm x ${t.printHeightCm}cm`);
  });

  // 6. Simpan Dokumen Hasil ke Blueprint/e2e/hasil-pengujian-e2e/
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const orderJsonPath = path.join(OUTPUT_DIR, `KASUS-1-kaos-boxy-makassar-${orderNumber}.json`);
  fs.writeFileSync(
    orderJsonPath,
    JSON.stringify(
      {
        kasus: "KASUS 1: KAOS BOXY HYPERLOCAL MAKASSAR",
        order: dbOrderRes.rows[0],
        paidStatus: paidOrderRes.rows[0].status,
        customer: {
          name: custUser.name,
          email: custUser.email,
          phone: custUser.phoneNumber,
        },
        productionTasks: taskRes.rows,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\nDokumen hasil terbit di: ${orderJsonPath}`);
  console.log("=================================================================");
  console.log("KASUS 1 SELESAI 100% SUKSES!");
  console.log("=================================================================");
}

runKasus1().catch((err) => {
  console.error("FATAL ERROR KASUS 1:", err);
  process.exit(1);
});
