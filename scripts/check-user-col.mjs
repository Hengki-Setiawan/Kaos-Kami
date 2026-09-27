import { createClient } from "@libsql/client/web";

async function main() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const info = await c.execute("PRAGMA table_info(User)");
  console.log("User table columns:", info.rows.map(r => ({ name: r.name, type: r.type })));

  const u = await c.execute({
    sql: "SELECT id, name, email, phoneNumber, role FROM User WHERE role = 'ADMIN' OR email LIKE '%hengki%'",
    args: []
  });
  console.log("Admins and Hengki users:", u.rows);
}

main().catch(console.error);
