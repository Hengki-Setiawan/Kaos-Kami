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
    SELECT v.id, v.size, v.stockQty, v.colorHex, v.colorName, c.slug as categorySlug, c.name as categoryName
    FROM ProductVariant v 
    LEFT JOIN ApparelCategory c ON v.categoryId = c.id 
    WHERE v.isActive = 1
  `);
  
  const map = {};
  for (const v of rs.rows) {
    const rawSlug = (v.categorySlug || "").toLowerCase().trim();
    const slugs = [rawSlug];
    if (rawSlug === "tee") slugs.push("tshirt");
    if (rawSlug === "tshirt") slugs.push("tee");
    if (rawSlug === "sweater") slugs.push("crewneck");
    if (rawSlug === "crewneck") slugs.push("sweater");
    if (rawSlug === "jacket") slugs.push("shirt");
    if (rawSlug === "shirt") slugs.push("jacket");

    const hex = (v.colorHex || "").toLowerCase().trim();
    const sz = (v.size || "").toUpperCase().trim();
    const cName = (v.colorName || "").toLowerCase().trim();
    const info = {
      stockQty: v.stockQty ?? 0,
    };

    for (const s of slugs) {
      if (hex) map[`${s}_${hex}_${sz}`] = info;
      if (cName) map[`${s}_${cName}_${sz}`] = info;
      if (hex === "#efece6" || hex === "#f7f5f0" || cName.includes("putih") || cName.includes("white") || cName.includes("ecru")) {
        map[`${s}_#ffffff_${sz}`] = info;
        map[`${s}_#efece6_${sz}`] = info;
        map[`${s}_#f7f5f0_${sz}`] = info;
        map[`${s}_chalk_${sz}`] = info;
      }
      if (hex === "#121214" || hex === "#111111" || hex === "#000000" || cName.includes("hitam") || cName.includes("black")) {
        map[`${s}_#121214_${sz}`] = info;
        map[`${s}_#111111_${sz}`] = info;
        map[`${s}_#000000_${sz}`] = info;
        map[`${s}_obsidian_${sz}`] = info;
      }
    }
  }

  console.log("Keys in map matching tshirt_#ffffff:", Object.keys(map).filter(k => k.startsWith("tshirt_#ffffff")));
  console.log("S:", map["tshirt_#ffffff_S"]);
  console.log("M:", map["tshirt_#ffffff_M"]);
  console.log("L:", map["tshirt_#ffffff_L"]);
  console.log("XL:", map["tshirt_#ffffff_XL"]);
  console.log("XXL:", map["tshirt_#ffffff_XXL"]);
}

main().catch(console.error);
