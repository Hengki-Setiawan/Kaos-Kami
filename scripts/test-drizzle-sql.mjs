import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { schema } from "../kaos-kami-web/src/lib/drizzle-schema.js";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  const db = drizzle(client, { schema });

  try {
    const res = await db.query.ApparelCategory.findFirst({ columns: { id: true } });
    console.log("ApparelCategory.findFirst:", res);
  } catch (e) {
    console.log("ApparelCategory.findFirst error:", e.message);
  }
}

main().catch(console.error);
