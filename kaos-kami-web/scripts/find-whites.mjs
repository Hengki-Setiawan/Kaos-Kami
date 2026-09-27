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
    SELECT v.id, v.name, v.size, v.stockQty, v.colorHex, v.colorName, c.slug as categorySlug
    FROM ProductVariant v 
    LEFT JOIN ApparelCategory c ON v.categoryId = c.id 
    WHERE c.slug = 'tshirt' AND v.isActive = 1
  `);
  
  // Find all variants that touch #ffffff or white
  const whites = rs.rows.filter(r => 
    (r.colorHex || "").toLowerCase() === "#ffffff" || 
    (r.colorHex || "").toLowerCase() === "#efece6" ||
    (r.colorName || "").toLowerCase().includes("putih") ||
    (r.colorName || "").toLowerCase().includes("white")
  );
  
  console.log("All matching white variants for tshirt in DB:");
  for (const w of whites) {
    console.log(`id: ${w.id}, name: "${w.name}", size: ${w.size}, stockQty: ${w.stockQty}, colorHex: ${w.colorHex}, colorName: ${w.colorName}`);
  }
}

main().catch(console.error);
