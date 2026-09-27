// scripts/seed-306-variants.mjs
// Seeder & Synchronizer untuk 306 SKU Varian Multi-Dimensi Kaos Kami
// (8 Apparel x 9 Warna x 1-5 Ukuran) dengan harga benchmark pasar Indonesia 2026.

import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../kaos-kami-web/.env") });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

export const APPARELS = [
  {
    slug: "tshirt",
    skuPrefix: "TSH",
    name: "Kaos Polos Combed 24s",
    basePriceIdr: 59000,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "longsleeve",
    skuPrefix: "LNG",
    name: "Kaos Lengan Panjang Combed 24s",
    basePriceIdr: 69000,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "crewneck",
    skuPrefix: "CRW",
    name: "Sweater Crewneck Fleece",
    basePriceIdr: 119000,
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    slug: "hoodie",
    skuPrefix: "HOD",
    name: "Hoodie Jumper Heavy Fleece",
    basePriceIdr: 139000,
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    slug: "shirt",
    skuPrefix: "JKT",
    name: "Coach Jacket Urban Micro",
    basePriceIdr: 149000,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "cap",
    skuPrefix: "CAP",
    name: "Topi Baseball Dad Cap Twill",
    basePriceIdr: 35000,
    sizes: ["All Size"],
  },
  {
    slug: "pants",
    skuPrefix: "PNT",
    name: "Celana Panjang Cargo Twill",
    basePriceIdr: 139000,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "shorts",
    skuPrefix: "SRT",
    name: "Celana Pendek Sweatshorts",
    basePriceIdr: 79000,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
];

export const COLORS = [
  { id: "chalk", code: "WHT", name: "Chalk White", hex: "#FFFFFF", isSpecial: false, surcharge: 0 },
  { id: "obsidian", code: "BLK", name: "Obsidian Black", hex: "#121214", isSpecial: false, surcharge: 0 },
  { id: "tangerine", code: "TNG", name: "Signal Tangerine", hex: "#E65100", isSpecial: true, surcharge: 15000 },
  { id: "olive", code: "OLV", name: "Military Olive", hex: "#3B4435", isSpecial: true, surcharge: 15000 },
  { id: "shadow", code: "GRY", name: "Shadow Grey", hex: "#2A2B2E", isSpecial: false, surcharge: 0 },
  { id: "cobalt", code: "CBL", name: "Deep Cobalt", hex: "#16284F", isSpecial: true, surcharge: 15000 },
  { id: "crimson", code: "CRM", name: "Vintage Crimson", hex: "#5C1D24", isSpecial: true, surcharge: 15000 },
  { id: "forest", code: "FRS", name: "Rimba Forest", hex: "#234534", isSpecial: true, surcharge: 15000 },
  { id: "cloud", code: "CLD", name: "Cloud White", hex: "#F7F5F0", isSpecial: false, surcharge: 0 },
];

function getSizeSurcharge(size) {
  const s = size.toUpperCase().trim();
  if (s === "XXL") return 10000;
  if (s === "XXXL" || s === "3XL") return 20000;
  return 0;
}

function getDefaultStock(colorCode, size) {
  // Hitam & Putih ukuran M/L paling laku di Makassar
  if ((colorCode === "BLK" || colorCode === "WHT") && (size === "M" || size === "L")) {
    return 35;
  }
  if (size === "XXL") return 15;
  if (size === "All Size") return 25;
  return 20;
}

async function run() {
  console.log("=== Memulai Sinkronisasi & Seeding 306 Varian Multi-Dimensi ===");

  // 1. Ambil ID kategori dari database
  const catRows = await client.execute("SELECT id, slug FROM ApparelCategory");
  const catMap = new Map(catRows.rows.map((r) => [r.slug, r.id]));

  console.log("Kategori terdeteksi:", Array.from(catMap.keys()));

  let createdCount = 0;
  let updatedCount = 0;
  const nowIso = new Date().toISOString();

  for (const apparel of APPARELS) {
    const categoryId = catMap.get(apparel.slug);
    if (!categoryId) {
      console.warn(`Peringatan: Kategori ${apparel.slug} tidak ditemukan di database!`);
      continue;
    }

    // Update harga dasar kategori di ApparelCategory tabel jika berbeda
    await client.execute({
      sql: "UPDATE ApparelCategory SET basePriceIdr = ? WHERE id = ?",
      args: [apparel.basePriceIdr, categoryId],
    });

    for (const color of COLORS) {
      for (const size of apparel.sizes) {
        const sku = `${apparel.skuPrefix}-${color.code}-${size.toUpperCase().replace(/\s+/g, "")}`;
        const name = `${apparel.name} - ${color.name} (${size})`;
        const finalPrice = apparel.basePriceIdr + color.surcharge + getSizeSurcharge(size);
        const defaultStock = getDefaultStock(color.code, size);

        // Cek apakah SKU sudah ada
        const existing = await client.execute({
          sql: "SELECT id, stockQty FROM ProductVariant WHERE sku = ?",
          args: [sku],
        });

        if (existing.rows.length > 0) {
          // Update data jika sudah ada (tetap pertahankan stockQty yang sudah ada jika bukan 0)
          const currentId = existing.rows[0].id;
          await client.execute({
            sql: `UPDATE ProductVariant 
                  SET name = ?, colorHex = ?, colorName = ?, size = ?, priceIdr = ?, isActive = 1, updatedAt = ?
                  WHERE id = ?`,
            args: [name, color.hex, color.name, size, finalPrice, nowIso, currentId],
          });
          updatedCount++;
        } else {
          // Insert SKU baru
          const newId = `var_${apparel.skuPrefix.toLowerCase()}_${color.code.toLowerCase()}_${size.toLowerCase().replace(/\s+/g, "")}`;
          await client.execute({
            sql: `INSERT INTO ProductVariant (
                    id, categoryId, sku, name, colorHex, colorName, size, 
                    priceIdr, stockQty, images, isPreDesigned, isActive, 
                    createdAt, updatedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              newId,
              categoryId,
              sku,
              name,
              color.hex,
              color.name,
              size,
              finalPrice,
              defaultStock,
              JSON.stringify(["/lookbook/look-01.jpg"]),
              0, // bukan pre-designed
              1, // isActive
              nowIso,
              nowIso,
            ],
          });
          createdCount++;
        }
      }
    }
  }

  // Hitung total akhir varian di DB
  const totalRes = await client.execute("SELECT COUNT(*) as total FROM ProductVariant");
  console.log(`\n=== Selesai! ===`);
  console.log(`Varian Baru Dibuat: ${createdCount}`);
  console.log(`Varian Diperbarui: ${updatedCount}`);
  console.log(`Total Varian di Database Sekarang: ${totalRes.rows[0].total}`);
}

run().catch(console.error);
