import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const user = await db.run(sql`SELECT id, name, email, phoneNumber, role FROM "User" WHERE email = '081999000111@kaoskami.test' OR phoneNumber = '081999000111'`);
  const u = user.rows[0] as any;
  console.log("Testing user:", u);

  const addrs = await db.run(sql`SELECT id, label, recipientName, city, fullAddress, phoneNumber, isDefault FROM "Address" WHERE userId = ${u.id}`);
  console.log("Current Addresses:", addrs.rows);

  if (addrs.rows.length === 0) {
    console.log("Seeding Address for testing user...");
    const addrId1 = "addr_test_01";
    await db.run(sql`INSERT INTO "Address" (id, userId, label, recipientName, phoneNumber, province, city, district, postalCode, fullAddress, isDefault, createdAt, updatedAt)
      VALUES (${addrId1}, ${u.id}, 'Rumah Utama (Panakkukang)', 'Hengki Setiawan', '081999000111', 'Sulawesi Selatan', 'Kota Makassar', 'Panakkukang', '90231', 'Jl. Boulevard No. 88, Komp. Ruby, RT 02 / RW 04 (Depan Mall Panakkukang)', 1, '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z')`);
    
    const addrId2 = "addr_test_02";
    await db.run(sql`INSERT INTO "Address" (id, userId, label, recipientName, phoneNumber, province, city, district, postalCode, fullAddress, isDefault, createdAt, updatedAt)
      VALUES (${addrId2}, ${u.id}, 'Studio Kreatif Tamalanrea', 'Tim Kaos Kami Makassar', '081999000111', 'Sulawesi Selatan', 'Kota Makassar', 'Tamalanrea', '90245', 'Jl. Perintis Kemerdekaan KM 10 No. 14, Dekat Pintu 1 UNHAS', 0, '2026-10-05T14:30:00.000Z', '2026-10-05T14:30:00.000Z')`);
    console.log("Addresses seeded successfully!");
  }

  // Check if testing user orders have shippingAddressId attached
  const checkOrders = await db.run(sql`SELECT id, orderNumber, shippingAddressId, status, totalIdr FROM "Order" WHERE userId = ${u.id}`);
  console.log("Orders with address link:", checkOrders.rows);

  for (const o of checkOrders.rows as any[]) {
    if (!o.shippingAddressId) {
      await db.run(sql`UPDATE "Order" SET shippingAddressId = 'addr_test_01' WHERE id = ${o.id}`);
      console.log(`Updated shippingAddressId for order ${o.orderNumber}`);
    }
  }

  // Check notifications for testing user
  const notifs = await db.run(sql`SELECT COUNT(*) as count FROM "Notification" WHERE userId = ${u.id}`);
  console.log("Notifications count:", notifs.rows);
}

main().catch(console.error);
