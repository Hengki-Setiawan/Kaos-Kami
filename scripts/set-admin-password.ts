import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Account } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq } from "drizzle-orm";

// Secret WAJIB via env (JANGAN hardcode — insiden Sep 2026).
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error("Butuh env " + name + " (JANGAN commit nilainya)");
  return v;
}

async function main() {
  const adminId = requireEnv("ADMIN_USER_ID");
  const ctx = await (auth as any).$context;
  const hashed = await ctx.password.hash(requireEnv("ADMIN_PASSWORD"));

  await db.update(Account)
    .set({ password: hashed })
    .where(eq(Account.userId, adminId));

  console.log("Admin password updated (nilainya dari env, tidak ditampilkan).");
}

main().catch(console.error);
