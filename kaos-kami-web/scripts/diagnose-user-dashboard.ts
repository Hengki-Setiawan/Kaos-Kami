import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== 1. DIAGNOSIS USER & DESIGNS ===");
  const user = await db.run(sql`SELECT id, name, email, role FROM "User" WHERE email = '081999000111@kaoskami.test'`);
  const u = user.rows[0] as any;
  console.log("User:", u);

  const designs = await db.run(sql`SELECT id, title, colorHex, colorName, size, calculatedPriceIdr, previewImageFrontUrl, previewImageBackUrl, categoryId FROM "Design" WHERE userId = ${u.id}`);
  console.log("Designs details:", designs.rows);

  console.log("\n=== 2. DIAGNOSIS COUPONS / VOUCHERS ===");
  const coupons = await db.run(sql`SELECT id, code, discountType, discountValue, minSpendIdr, maxUses, usedCount, expiresAt, isActive FROM "Coupon"`);
  console.log("Coupons in DB:", coupons.rows);

  console.log("\n=== 3. DIAGNOSIS ORDERS & ITEMS ===");
  const orders = await db.run(sql`SELECT id, orderNumber, status, totalIdr, shippingAddressId, createdAt FROM "Order" WHERE userId = ${u.id}`);
  console.log("Orders count for user:", orders.rows.length, orders.rows);

  console.log("\n=== 4. DIAGNOSIS ADDRESSES ===");
  const addrs = await db.run(sql`SELECT id, label, recipientName, city, district, fullAddress, isDefault FROM "Address" WHERE userId = ${u.id}`);
  console.log("Addresses count for user:", addrs.rows.length, addrs.rows);

  console.log("\n=== 5. CHECK ADMIN SYSTEM INTEGRATION ===");
  const allOrdersCount = await db.run(sql`SELECT count(*) as count FROM "Order"`);
  console.log("Total orders in entire system (visible to admin):", allOrdersCount.rows);

  const adminUsers = await db.run(sql`SELECT id, name, email, role FROM "User" WHERE role IN ('ADMIN', 'SUPER_ADMIN')`);
  console.log("Admin accounts:", adminUsers.rows);
}

main().catch(console.error);
