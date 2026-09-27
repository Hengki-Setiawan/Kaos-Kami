import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";

const url = "libsql://kaos-kami-hengki164.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgxNDg0MDEsImlkIjoiMDFhMDU1ZjItMjcwMS03NGM2LTliMGUtMzg2ODhlN2UwYTE2Iiwia2lkIjoiVHcwS3NHSzQwZXl5MFVad3JDTV9XcUg4VzJaVHlTWlY0cVJaNzIycUxHWSIsInJpZCI6ImQ3ZTNiMjkzLTkzNjktNDE1Ny04MjM3LWI0MjFjNmNmODJhYyJ9.FZo5YdVyvFPNyOo0eNRSpsGaHmxxfsULaEQhvm61pL7qhQzEeCuBFGhdzjdYcSEg4bHnMRkufnmhC4FqgxzFAQ";

const client = createClient({ url, authToken });

async function runTest() {
  console.log("=== Memulai Test E2E Admin Bypass Pembayaran ===");

  // 1. Cari user ADMIN di database
  const userRes = await client.execute({
    sql: "SELECT id, name, email, role FROM User WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN' OR email = 'hengkishadow@gmail.com' LIMIT 1",
    args: [],
  });

  if (userRes.rows.length === 0) {
    console.error("User admin tidak ditemukan!");
    return;
  }

  const admin = userRes.rows[0];
  console.log(`Menggunakan akun Admin: ${admin.name} (${admin.email}, Role: ${admin.role})`);

  // 2. Buat sesi pengujian sementara di tabel Session
  const testSessionId = "test-session-" + nanoid();
  const testToken = "test-token-" + nanoid();
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  await client.execute({
    sql: "INSERT INTO Session (id, userId, token, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    args: [testSessionId, admin.id, testToken, expiresAt, new Date().toISOString(), new Date().toISOString()],
  });
  console.log("Sesi pengujian berhasil dibuat.");

  let createdOrderId = null;

  try {
    // 3. Panggil API Checkout dengan cookie sesi dan flag adminBypassPayment: true
    const { makeSignature } = await import("better-auth/crypto");
    const secret = "kaos-kami-secret-dev-2026-key-32-chars-minimum-security-better-auth";
    const sig = await makeSignature(testToken, secret);
    const signedCookie = `${testToken}.${sig}`;

    console.log("Mengirim request checkout dengan bypass pembayaran...");
    const res = await fetch("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `better-auth.session_token=${encodeURIComponent(signedCookie)}`,
      },
      body: JSON.stringify({
        recipientName: "Hengki Admin Tester",
        phoneNumber: "081244002026",
        deliveryMethod: "PICKUP",
        fullAddress: "Workshop Kaos Kami Makassar",
        items: [
          {
            apparelSlug: "tshirt",
            colorHex: "#111111",
            colorName: "Hitam Solid",
            size: "XL",
            quantity: 2,
            decals: [
              {
                id: "decal-test-1",
                url: "https://example.com/logo.png",
                name: "Logo Test",
                targetSide: "front",
                x: 0,
                y: 0,
                scale: 0.5,
                rotation: 0,
                opacity: 1,
              },
            ],
            title: "T-Shirt DTF Custom Testing Bypass",
          },
        ],
        adminBypassPayment: true,
        adminDirectConfirm: true,
      }),
    });

    const data = await res.json();
    console.log("Status respons HTTP:", res.status);
    console.log("Respons Checkout:", data);

    if (res.status !== 200 || data.status !== "PAYMENT_CONFIRMED") {
      throw new Error(`Checkout bypass gagal: ${JSON.stringify(data)}`);
    }

    createdOrderId = data.orderId;
    console.log(`✅ Order berhasil dibuat! ID: ${createdOrderId}, No: ${data.orderNumber}`);

    // 4. Verifikasi di database: Order, Payment, dan ProductionTask
    const orderCheck = await client.execute({
      sql: "SELECT id, orderNumber, status, reviewedBy, notes, courierNotes FROM \"Order\" WHERE id = ?",
      args: [createdOrderId],
    });
    const orderRow = orderCheck.rows[0];
    console.log("Data Order DB:", orderRow);

    if (orderRow.status !== "PAYMENT_CONFIRMED") {
      throw new Error(`Status order bukan PAYMENT_CONFIRMED, melainkan ${orderRow.status}`);
    }

    if (!orderRow.notes?.includes("TEST_ORDER:ADMIN_BYPASS")) {
      throw new Error("Order tidak memiliki tag [TEST_ORDER:ADMIN_BYPASS]!");
    }

    // 5. Cek Tiket Produksi Kanban (ProductionTask)
    const taskCheck = await client.execute({
      sql: "SELECT id, stage, notes, printWidthCm, printHeightCm, placementSide FROM ProductionTask WHERE orderId = ?",
      args: [createdOrderId],
    });
    console.log(`Jumlah Tiket Produksi (ProductionTask) terbit: ${taskCheck.rows.length}`);
    for (const task of taskCheck.rows) {
      console.log("  -> Tiket Kanban:", task);
    }

    if (taskCheck.rows.length === 0) {
      throw new Error("Tidak ada tiket produksi yang dibuat!");
    }

    console.log("🎉 SEMUA UJI COBA BYPASS PEMBAYARAN & GENERATE TIKET KANBAN 100% SUKSES!");

  } finally {
    // 6. Bersihkan data pengujian
    console.log("Membersihkan data pengujian...");
    if (createdOrderId) {
      await client.execute({ sql: "DELETE FROM ProductionTask WHERE orderId = ?", args: [createdOrderId] });
      await client.execute({ sql: "DELETE FROM OrderStatusEvent WHERE orderId = ?", args: [createdOrderId] });
      await client.execute({ sql: "DELETE FROM OrderItem WHERE orderId = ?", args: [createdOrderId] });
      await client.execute({ sql: "DELETE FROM Payment WHERE orderId = ?", args: [createdOrderId] });
      await client.execute({ sql: "DELETE FROM \"Order\" WHERE id = ?", args: [createdOrderId] });
      console.log("Data order test dibersihkan.");
    }
    await client.execute({ sql: "DELETE FROM Session WHERE id = ?", args: [testSessionId] });
    console.log("Sesi test dibersihkan.");
  }
}

runTest();
