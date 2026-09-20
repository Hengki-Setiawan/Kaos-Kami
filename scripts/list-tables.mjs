import { createClient } from "@libsql/client/web";

async function main() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  const res = await c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables in Turso:", res.rows.map(r => r.name));
}

main().catch(console.error);
