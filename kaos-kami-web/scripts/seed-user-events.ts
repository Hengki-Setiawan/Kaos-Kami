import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const user = await db.run(sql`SELECT id FROM "User" WHERE email = '081999000111@kaoskami.test'`);
  const u = user.rows[0] as any;

  const orders = await db.run(sql`SELECT id, orderNumber FROM "Order" WHERE userId = ${u.id}`);
  console.log("Orders:", orders.rows);

  const existingEvents = await db.run(sql`SELECT COUNT(*) as count FROM "OrderStatusEvent" WHERE orderId IN (${orders.rows.map((o: any) => o.id).join(",")})`);
  console.log("Existing OrderStatusEvents:", existingEvents.rows);

  // Seed rich OrderStatusEvents for each order if needed
  for (const o of orders.rows as any[]) {
    const evs = await db.run(sql`SELECT id FROM "OrderStatusEvent" WHERE orderId = ${o.id}`);
    if (evs.rows.length === 0) {
      console.log(`Seeding events for ${o.orderNumber}...`);
      if (o.orderNumber === "KK-20261011-0842") {
        await db.run(sql`INSERT INTO "OrderStatusEvent" (id, orderId, status, note, createdAt) VALUES
          ('ev_01_1', ${o.id}, 'PAYMENT_CONFIRMED', 'Pembayaran QRIS lunas diverifikasi otomatis via Duitku Sandbox', '2026-10-11T01:16:00.000Z'),
          ('ev_01_2', ${o.id}, 'IN_PRODUCTION_QUEUE', 'Antrean workshop Makassar: File sablon masuk RIP software DTF', '2026-10-11T01:25:00.000Z'),
          ('ev_01_3', ${o.id}, 'PRINTING', 'Sedang dicetak: Mesin DTF 6-Head mencetak pet film & tabur hotmelt powder oven', '2026-10-11T02:00:00.000Z')`);
      } else if (o.orderNumber === "KK-20261009-0315") {
        await db.run(sql`INSERT INTO "OrderStatusEvent" (id, orderId, status, note, createdAt) VALUES
          ('ev_02_1', ${o.id}, 'PAYMENT_CONFIRMED', 'Pembayaran lunas terverifikasi', '2026-10-09T04:16:00.000Z'),
          ('ev_02_2', ${o.id}, 'PRINTING', 'Proses sablon DTF hoodie 330 GSM selesai', '2026-10-09T08:00:00.000Z'),
          ('ev_02_3', ${o.id}, 'QUALITY_CHECK', 'Inspeksi QC lolos: Uji tarik sablon & kerapian jahitan 100% OK', '2026-10-09T11:00:00.000Z'),
          ('ev_02_4', ${o.id}, 'READY_TO_SHIP', 'Pesanan siap diambil di Workshop Kaos Kami (Jl. Pongtiku No. 88)', '2026-10-09T14:00:00.000Z')`);
      } else if (o.orderNumber === "KK-20260928-0199") {
        await db.run(sql`INSERT INTO "OrderStatusEvent" (id, orderId, status, note, createdAt) VALUES
          ('ev_03_1', ${o.id}, 'PAYMENT_CONFIRMED', 'Pembayaran lunas terverifikasi', '2026-09-27T04:16:00.000Z'),
          ('ev_03_2', ${o.id}, 'PRINTING', 'Selesai sablon DTF 3 pcs Losari Sunset', '2026-09-27T09:00:00.000Z'),
          ('ev_03_3', ${o.id}, 'SHIPPED', 'Paket diserahkan ke Kurir Internal Kaos Kami Makassar', '2026-09-28T02:00:00.000Z'),
          ('ev_03_4', ${o.id}, 'COMPLETED', 'Pesanan telah diterima oleh pelanggan di Panakkukang. Garansi sablon 30 hari aktif.', '2026-09-28T05:30:00.000Z')`);
      }
    }
  }

  // Also seed a friendly welcome chat message from Kamito / Admin
  const chats = await db.run(sql`SELECT COUNT(*) as count FROM "ChatMessage" WHERE receiverId = ${u.id}`);
  console.log("Chat messages count for user:", chats.rows);
  if (Number((chats.rows[0] as any).count) === 0) {
    await db.run(sql`INSERT INTO "ChatMessage" (id, senderId, senderName, senderRole, receiverId, content, isRead, createdAt) VALUES
      ('chat_welcome_01', 'system_kamito', 'Kamito AI Workshop', 'BOT', ${u.id}, 'Halo kak Hengki! Kaos Streetwear Cyber Makassar A3+ kakak sedang dalam proses pemanasan oven DTF di workshop. Estimasi selesai sore ini ya kak! 🙌', 0, '2026-10-11T02:05:00.000Z')`);
    console.log("Seeded welcome chat message!");
  }
}

main().catch(console.error);
