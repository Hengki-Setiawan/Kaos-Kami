import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "kaos-kami-web/.env") });

import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Order, OrderItem, ProductionTask } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq, inArray } from "drizzle-orm";
import {
  GANG_BIN_W_MM,
  GANG_BIN_H_MM,
  packGangSheet,
  type GangRect,
} from "../kaos-kami-web/src/lib/gangPacker.ts";

const BASE_URL = "http://localhost:3000";

// Secret WAJIB via env (JANGAN hardcode).
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error('E2E butuh env ' + name + ' (JANGAN commit nilainya)');
  return v;
}
async function main() {
  console.log("=================================================================");
  console.log("🧪 UJI INTEGRASI SIKLUS HIDUP GANG SHEET & ANTI DOUBLE-PRINT");
  console.log("=================================================================\n");

  // 1. Login Admin
  console.log("1. Autentikasi Admin Workshop...");
  const loginRes = await auth.api.signInEmail({
    body: {
      email: "hengkishadow@gmail.com",
      password: requireEnv("E2E_ADMIN_PASSWORD"),
    },
    asResponse: true,
  });
  if (!loginRes.ok) throw new Error("Gagal login admin");
  const rawCookie = loginRes.headers.get("set-cookie") || "";
  const adminCookie = rawCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");

  // 2. Buat Order Dummy Pelanggan Budi (10 Kaos)
  const orderNumber = `KK-TEST-${Date.now().toString().slice(-4)}`;
  const orderId = `ord-test-${Date.now()}`;
  const adminUserId = "mENTVcqg2HGntvKZ89uPrREfwrghvMwL";

  console.log(`2. Membuat Order Uji Coba: ${orderNumber} (10 Kaos Masuk Antrean)...`);
  await db.insert(Order).values({
    id: orderId,
    orderNumber,
    userId: adminUserId,
    status: "PROCESSING",
    deliveryMethod: "PICKUP",
    subtotalIdr: 500000,
    shippingCostIdr: 0,
    totalIdr: 500000,
  });

  const taskIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const itemId = `item-t-${i}-${Date.now()}`;
    const taskId = `task-t-${i}-${Date.now()}`;
    taskIds.push(taskId);

    await db.insert(OrderItem).values({
      id: itemId,
      orderId,
      quantity: 1,
      unitPriceIdr: 50000,
      lineTotalIdr: 50000,
      snapshotName: `Desain Sablon Kaos #${i}`,
      snapshotSize: "L",
      snapshotColorName: "Hitam",
    });

    await db.insert(ProductionTask).values({
      id: taskId,
      orderId,
      orderItemId: itemId,
      stage: "SCREEN_PRINT_SETUP", // Siap masuk gang sheet
      notes: `Sablon #${i}`,
      printWidthCm: 15,
      printHeightCm: 20,
      printFileUrl: "/mascot/raw/logo fix 2.png",
    });
  }
  console.log(`   ✓ 10 Task berhasil dibuat dengan stage: SCREEN_PRINT_SETUP`);

  // 3. Ambil antrean lewat API GET /api/admin/production-tasks
  console.log("\n3. Mengecek Antrean via API GET /api/admin/production-tasks...");
  const getRes = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    headers: { Cookie: adminCookie },
  });
  const getData: any = await getRes.json();
  const queueBefore = (getData.tasks || []).filter(
    (t: any) =>
      t.order?.orderNumber === orderNumber &&
      (t.stage === "DESIGN_PREP" || t.stage === "SCREEN_PRINT_SETUP")
  );
  console.log(`   - Jumlah item di antrean susun saat ini: ${queueBefore.length} item`);
  if (queueBefore.length !== 10) throw new Error("Antrean sebelum cetak harus berisi 10 item!");

  // 4. Jalankan Multi-Heuristic Tournament Packing
  console.log("\n4. Menjalankan Multi-Heuristic Tournament (10 Strategi Kombinasi)...");
  const rects: GangRect[] = queueBefore.map((t: any) => ({
    id: t.id,
    wMm: 150,
    hMm: 200,
    qty: 1,
    label: t.notes || "",
    orderNumber,
    masterUrl: t.printFileUrl,
    allowRotation: true,
  }));

  const packRes = packGangSheet(rects, {
    binWmm: GANG_BIN_W_MM,
    binHmm: GANG_BIN_H_MM,
    gapMm: 6,
    marginMm: 8,
  });
  console.log(`   ✓ Tournament selesai! Utilisasi terbaik: ${packRes.utilizationPct.toFixed(2)}% (${packRes.bins.length} bin)`);

  // 5. Simulasikan Aksi Admin: Ekspor & Majukan ke PRINTING via Batch PATCH
  console.log("\n5. Mengekspor Gang Sheet & Mengirim Batch PATCH untuk Memajukan ke PRINTING...");
  const exportFilename = `GANG_2026-09-19_M1_58x100cm_300DPI_10desain.png`;
  const patchRes = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      taskIds,
      stage: "PRINTING",
      notes: `Dicetak via Gang Sheet: ${exportFilename}`,
    }),
  });
  const patchData: any = await patchRes.json();
  console.log(`   - Status HTTP Batch PATCH: ${patchRes.status}`);
  console.log(`   - Respons Server:`, patchData);
  if (!patchRes.ok || !patchData.success) throw new Error("Batch PATCH gagal!");

  // 6. Verifikasi Antrean Gang Sheet Setelah Ekspor
  console.log("\n6. Memverifikasi Antrean Gang Sheet Setelah Ekspor (Anti Double-Print Test)...");
  const getResAfter = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    headers: { Cookie: adminCookie },
  });
  const getDataAfter: any = await getResAfter.json();
  const queueAfter = (getDataAfter.tasks || []).filter(
    (t: any) =>
      t.order?.orderNumber === orderNumber &&
      (t.stage === "DESIGN_PREP" || t.stage === "SCREEN_PRINT_SETUP")
  );
  console.log(`   - Jumlah item ${orderNumber} di antrean susun sekarang: ${queueAfter.length} item`);

  if (queueAfter.length === 0) {
    console.log("   🎉 SUKSES 100%! Seluruh 10 item otomatis HILANG dari antrean susun.");
    console.log("      Item tidak akan pernah tercetak dobel pada pembuatan gang sheet berikutnya!");
  } else {
    throw new Error(`Gagal! Masih ada ${queueAfter.length} item yang tersisa di antrean!`);
  }

  // 7. Bersihkan data pengujian
  await db.delete(ProductionTask).where(inArray(ProductionTask.id, taskIds));
  await db.delete(OrderItem).where(eq(OrderItem.orderId, orderId));
  await db.delete(Order).where(eq(Order.id, orderId));
  console.log("\n=================================================================");
  console.log("✅ SELURUH PENGUJIAN INTEGRASI SIKLUS HIDUP & ANTI DOUBLE-PRINT LOLOS!");
  console.log("=================================================================\n");
}

main().catch(console.error);
