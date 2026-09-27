import { createClient } from "@libsql/client/web";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const client = createClient({
  url: env.TURSO_DATABASE_URL || env.DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN
});

async function main() {
  const rs = await client.execute(`
    SELECT v.id, v.name, v.size, v.stockQty, v.colorHex, v.colorName, v.createdAt
    FROM ProductVariant v 
    LEFT JOIN ApparelCategory c ON v.categoryId = c.id 
    WHERE c.slug = 'tshirt' AND (v.colorHex = '#EFECE6' OR v.colorHex = '#FFFFFF' OR v.name LIKE '%Putih%')
    ORDER BY v.createdAt DESC
  `);
  console.log(JSON.stringify(rs.rows, null, 2));
}

main().catch(console.error);
