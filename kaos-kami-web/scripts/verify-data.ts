import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const ev = await db.run(sql`SELECT count(*) as count FROM "OrderStatusEvent"`);
  console.log("All OrderStatusEvents count:", ev.rows);

  const cm = await db.run(sql`SELECT count(*) as count FROM "ChatMessage"`);
  console.log("All ChatMessages count:", cm.rows);

  const user = await db.run(sql`SELECT id, name, email FROM "User" WHERE email = '081999000111@kaoskami.test'`);
  console.log("User:", user.rows);
}

main().catch(console.error);
