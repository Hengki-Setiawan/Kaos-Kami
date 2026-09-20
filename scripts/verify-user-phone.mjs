import { createClient } from "@libsql/client/web";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const res = await c.execute("SELECT id, name, email, phoneNumber, phoneVerified FROM User WHERE email LIKE '%hengki%' OR email LIKE '%admin%'");
  console.log("Users found:", res.rows);
}

main().catch(console.error);
