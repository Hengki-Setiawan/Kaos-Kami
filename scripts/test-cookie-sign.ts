import { auth } from "../kaos-kami-web/src/lib/auth.ts";

async function main() {
  const userId = "6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn"; // hengki vibecoding1
  const ctx = await (auth as any).$context;
  
  // Set password using ctx.password.hash
  const hashedPassword = await ctx.password.hash("KaosKami2026!");
  console.log("Hashed password:", hashedPassword);

  // Update in Account table
  const { db } = await import("../kaos-kami-web/src/lib/db.ts");
  const { Account } = await import("../kaos-kami-web/src/lib/drizzle-schema.ts");
  const { eq } = await import("drizzle-orm");

  await db.update(Account)
    .set({ password: hashedPassword })
    .where(eq(Account.userId, userId));
  console.log("Account password updated!");

  // Now test signInEmail
  const res = await auth.api.signInEmail({
    body: {
      email: "hengkivibecoding@gmail.com",
      password: "KaosKami2026!"
    },
    asResponse: true
  });

  console.log("signInEmail status:", res.status);
  const setCookie = res.headers.get("set-cookie");
  console.log("set-cookie:", setCookie);

  // Test getSession with this cookie
  const sessionRes = await auth.api.getSession({
    headers: new Headers({
      "cookie": setCookie || ""
    })
  });
  console.log("Resolved session from Better Auth:", sessionRes);
}

main().catch(console.error);
