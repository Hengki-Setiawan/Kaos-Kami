import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const r = await db.run(sql`SELECT id, title, status, previewImageFrontUrl FROM "Design" WHERE userId = 'cmth7rezr0000us08kjfnz909'`);
  console.log(r.rows);
}

main().catch(console.error);
