// Audit-only: list tables + check UserDevice + Payment.provider values. No writes.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv(f) {
  const txt = fs.readFileSync(f, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      process.env[m[1]] = v;
    }
  }
}
loadEnv(path.join(__dirname, "kaos-kami-web", ".env"));
const { createClient } = await import("@libsql/client/http");
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log("TABLES:", tables.rows.map((r) => r.name).join(","));
const cols = await db.execute("PRAGMA table_info(Payment)");
console.log(
  "PAYMENT_COLS:",
  cols.rows.map((r) => `${r.name}:${r.type}`).join(",")
);
