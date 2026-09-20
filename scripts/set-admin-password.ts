import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Account } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const adminId = "mENTVcqg2HGntvKZ89uPrREfwrghvMwL"; // hengkishadow@gmail.com
  const ctx = await (auth as any).$context;
  const hashed = await ctx.password.hash("KaosKamiAdmin2026!");

  await db.update(Account)
    .set({ password: hashed })
    .where(eq(Account.userId, adminId));

  console.log("Admin password set to KaosKamiAdmin2026!");
}

main().catch(console.error);
