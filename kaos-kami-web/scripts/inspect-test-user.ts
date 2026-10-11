import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const user = await db.run(sql`SELECT id, name, email, phoneNumber, role FROM "User" WHERE email = '081999000111@kaoskami.test' OR phoneNumber = '081999000111'`);
  const u = user.rows[0] as any;
  console.log("User:", u);

  const orders = await db.run(sql`SELECT id, orderNumber, status, totalIdr FROM "Order" WHERE userId = ${u.id}`);
  console.log("Orders:", orders.rows);

  for (const o of orders.rows as any[]) {
    const items = await db.run(sql`SELECT id, snapshotName, quantity, lineTotalIdr, snapshotImageUrl FROM "OrderItem" WHERE orderId = ${o.id}`);
    console.log(`Items for order ${o.orderNumber}:`, items.rows);
  }

  const designs = await db.run(sql`SELECT id, title, size, calculatedPriceIdr, colorHex, colorName FROM "Design" WHERE userId = ${u.id}`);
  console.log("Designs for user:", designs.rows);

  const addresses = await db.run(sql`SELECT id, label, recipientName, city, fullAddress, phone FROM "Address" WHERE userId = ${u.id}`);
  console.log("Addresses for user:", addresses.rows);

  const vouchers = await db.run(sql`SELECT id, code, discountPercent, maxDiscountIdr, minOrderTotalIdr FROM "Coupon" LIMIT 5`);
  console.log("Available Coupons:", vouchers.rows);
}

main().catch(console.error);
