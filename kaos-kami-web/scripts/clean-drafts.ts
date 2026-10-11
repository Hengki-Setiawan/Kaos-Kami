import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.run(
    sql`DELETE FROM "Design" WHERE status = 'DRAFT' AND userId = 'cmth7rezr0000us08kjfnz909'`
  );
  console.log("Drafts cleaned:", result);
  const remaining = await db.run(
    sql`SELECT id, title, status FROM "Design" WHERE userId = 'cmth7rezr0000us08kjfnz909'`
  );
  console.log("Remaining user designs:", remaining.rows);
}

main().catch(console.error);
