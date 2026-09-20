import { createClient } from "@libsql/client/web";

async function main() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const info = await c.execute("PRAGMA table_info(User)");
  console.log("User table columns:", info.rows.map(r => ({ name: r.name, type: r.type })));

  const u = await c.execute({
    sql: "SELECT * FROM User WHERE id = '6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn'",
    args: []
  });
  console.log("User row:", u.rows[0]);
}

main().catch(console.error);
