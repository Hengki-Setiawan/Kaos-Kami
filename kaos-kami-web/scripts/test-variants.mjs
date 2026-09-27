import { createClient } from "@libsql/client/web";
import fs from "fs";

// Read .env.local manually
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
    SELECT v.id, v.size, v.stockQty, v.colorHex, v.colorName, c.slug as categorySlug, c.name as categoryName
    FROM ProductVariant v 
    LEFT JOIN ApparelCategory c ON v.categoryId = c.id 
    WHERE c.slug = 'tshirt'
  `);
  console.log('Tshirt variants count:', rs.rows.length);
  console.log(JSON.stringify(rs.rows.slice(0, 15), null, 2));
}

main().catch(console.error);
