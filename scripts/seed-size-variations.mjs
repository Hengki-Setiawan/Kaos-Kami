import { createClient } from "@libsql/client/web";
import fs from "fs";
import { nanoid } from "nanoid";

async function seedSizeVariations() {
  let env = {};
  try {
    const txt = fs.readFileSync("kaos-kami-web/.env.local", "utf-8");
    txt.split("\n").forEach((l) => {
      const idx = l.indexOf("=");
      if (idx > 0) env[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
    });
  } catch (e) {}

  const client = createClient({
    url: env.TURSO_DATABASE_URL || env.DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  const variationsToAdd = [
    // 1. Kaos Hitam
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-BLK-HEAVY-S", name: "Kaos Polos Combed 24s - Hitam", size: "S", priceIdr: 165000, stockQty: 12, colorHex: "#121214", colorName: "Hitam", images: '["/products/tshirt-black.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-BLK-HEAVY-M", name: "Kaos Polos Combed 24s - Hitam", size: "M", priceIdr: 165000, stockQty: 30, colorHex: "#121214", colorName: "Hitam", images: '["/products/tshirt-black.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-BLK-HEAVY-XL", name: "Kaos Polos Combed 24s - Hitam", size: "XL", priceIdr: 175000, stockQty: 15, colorHex: "#121214", colorName: "Hitam", images: '["/products/tshirt-black.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-BLK-HEAVY-XXL", name: "Kaos Polos Combed 24s - Hitam", size: "XXL", priceIdr: 185000, stockQty: 4, colorHex: "#121214", colorName: "Hitam", images: '["/products/tshirt-black.jpg"]' },

    // 2. Kaos Putih Ecru
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-WHT-HEAVY-S", name: "Kaos Polos Combed 24s - Putih Ecru", size: "S", priceIdr: 165000, stockQty: 10, colorHex: "#EFECE6", colorName: "Putih Ecru", images: '["/products/tshirt-white-ecru.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-WHT-HEAVY-M", name: "Kaos Polos Combed 24s - Putih Ecru", size: "M", priceIdr: 165000, stockQty: 25, colorHex: "#EFECE6", colorName: "Putih Ecru", images: '["/products/tshirt-white-ecru.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-WHT-HEAVY-XL", name: "Kaos Polos Combed 24s - Putih Ecru", size: "XL", priceIdr: 175000, stockQty: 12, colorHex: "#EFECE6", colorName: "Putih Ecru", images: '["/products/tshirt-white-ecru.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-WHT-HEAVY-XXL", name: "Kaos Polos Combed 24s - Putih Ecru", size: "XXL", priceIdr: 185000, stockQty: 0, colorHex: "#EFECE6", colorName: "Putih Ecru", images: '["/products/tshirt-white-ecru.jpg"]' },

    // 3. Kaos Streetwear Oranye Makassar
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-TNG-LIMITED-S", name: "Kaos Streetwear Grafis Makassar - Oranye", size: "S", priceIdr: 195000, stockQty: 6, colorHex: "#E65100", colorName: "Oranye", images: '["/products/tshirt-orange-makassar.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-TNG-LIMITED-L", name: "Kaos Streetwear Grafis Makassar - Oranye", size: "L", priceIdr: 195000, stockQty: 14, colorHex: "#E65100", colorName: "Oranye", images: '["/products/tshirt-orange-makassar.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-TNG-LIMITED-XL", name: "Kaos Streetwear Grafis Makassar - Oranye", size: "XL", priceIdr: 205000, stockQty: 8, colorHex: "#E65100", colorName: "Oranye", images: '["/products/tshirt-orange-makassar.jpg"]' },
    { categoryId: "cmtgq1g6t0000us04hybzsn50", sku: "TS-TNG-LIMITED-XXL", name: "Kaos Streetwear Grafis Makassar - Oranye", size: "XXL", priceIdr: 215000, stockQty: 0, colorHex: "#E65100", colorName: "Oranye", images: '["/products/tshirt-orange-makassar.jpg"]' },

    // 4. Hoodie Boxy Fleece Hitam
    { categoryId: "cmtgq1h900003us04cx9f42qm", sku: "HD-BLK-FLEECE-S", name: "Hoodie Boxy Fleece - Hitam", size: "S", priceIdr: 285000, stockQty: 5, colorHex: "#121214", colorName: "Hitam", images: '["/products/hoodie-black.jpg"]' },
    { categoryId: "cmtgq1h900003us04cx9f42qm", sku: "HD-BLK-FLEECE-M", name: "Hoodie Boxy Fleece - Hitam", size: "M", priceIdr: 285000, stockQty: 18, colorHex: "#121214", colorName: "Hitam", images: '["/products/hoodie-black.jpg"]' },
    { categoryId: "cmtgq1h900003us04cx9f42qm", sku: "HD-BLK-FLEECE-L", name: "Hoodie Boxy Fleece - Hitam", size: "L", priceIdr: 285000, stockQty: 20, colorHex: "#121214", colorName: "Hitam", images: '["/products/hoodie-black.jpg"]' },
    { categoryId: "cmtgq1h900003us04cx9f42qm", sku: "HD-BLK-FLEECE-XXL", name: "Hoodie Boxy Fleece - Hitam", size: "XXL", priceIdr: 305000, stockQty: 6, colorHex: "#121214", colorName: "Hitam", images: '["/products/hoodie-black.jpg"]' },

    // 5. Jaket Coach Urban Hijau Olive
    { categoryId: "cmtgq1hd30004us04xiyh1xam", sku: "JK-TAC-COACH-S", name: "Jaket Coach Urban - Hijau Olive", size: "S", priceIdr: 320000, stockQty: 4, colorHex: "#3B4435", colorName: "Hijau Olive", images: '["/products/coach-jacket-olive.jpg"]' },
    { categoryId: "cmtgq1hd30004us04xiyh1xam", sku: "JK-TAC-COACH-M", name: "Jaket Coach Urban - Hijau Olive", size: "M", priceIdr: 320000, stockQty: 12, colorHex: "#3B4435", colorName: "Hijau Olive", images: '["/products/coach-jacket-olive.jpg"]' },
    { categoryId: "cmtgq1hd30004us04xiyh1xam", sku: "JK-TAC-COACH-XL", name: "Jaket Coach Urban - Hijau Olive", size: "XL", priceIdr: 335000, stockQty: 10, colorHex: "#3B4435", colorName: "Hijau Olive", images: '["/products/coach-jacket-olive.jpg"]' },
    { categoryId: "cmtgq1hd30004us04xiyh1xam", sku: "JK-TAC-COACH-XXL", name: "Jaket Coach Urban - Hijau Olive", size: "XXL", priceIdr: 350000, stockQty: 2, colorHex: "#3B4435", colorName: "Hijau Olive", images: '["/products/coach-jacket-olive.jpg"]' },
  ];

  let addedCount = 0;
  for (const v of variationsToAdd) {
    const existing = await client.execute({
      sql: "SELECT id FROM ProductVariant WHERE sku = ?",
      args: [v.sku],
    });

    if (existing.rows.length === 0) {
      const id = `var_${nanoid(16)}`;
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO ProductVariant (id, categoryId, sku, name, colorHex, colorName, size, priceIdr, stockQty, images, isPreDesigned, isActive, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        args: [
          id,
          v.categoryId,
          v.sku,
          v.name,
          v.colorHex,
          v.colorName,
          v.size,
          v.priceIdr,
          v.stockQty,
          v.images,
          now,
          now,
        ],
      });
      addedCount++;
      console.log(`+ Added variation: ${v.sku} (${v.name} - ${v.size}) Stock: ${v.stockQty}, Price: ${v.priceIdr}`);
    } else {
      console.log(`- Already exists: ${v.sku}`);
    }
  }

  console.log(`✓ Selesai. Total variasi ukuran baru ditambahkan: ${addedCount}`);
}

seedSizeVariations().catch(console.error);
