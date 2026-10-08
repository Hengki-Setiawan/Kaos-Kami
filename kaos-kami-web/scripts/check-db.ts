import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const cats = await db.run(sql`SELECT id, slug, name FROM "ApparelCategory"`);
  console.log("Apparel Categories:", cats.rows);
}

main().catch(console.error);
