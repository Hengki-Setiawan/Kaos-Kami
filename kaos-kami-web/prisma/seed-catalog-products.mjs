import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("Seeding CatalogProduct table in Turso...");

  const products = [
    {
      id: "catprod_makassar_orange",
      slug: "kaos-streetwear-grafis-makassar-oranye",
      name: "Kaos Streetwear Grafis Makassar - Oranye Flame",
      tagline: "Edisi Terbatas DTF 300 DPI Budaya Maritim Makassar",
      description: "Kaos distro edisi terbatas dengan sablon DTF resolusi tinggi grafis kultur Makassar di atas bahan katun combed 24s premium. Terinspirasi dari dinamika pemuda kota Makassar. Menggunakan teknik cetak DTF 300 DPI dengan tinta tahan cuci hingga 50x.",
      apparelSlug: "tshirt",
      basePriceIdr: 195000,
      images: JSON.stringify(["/products/tshirt-orange-makassar.jpg"]),
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      tags: JSON.stringify(["Streetwear", "Limited Edition", "Makassar Pride", "Best Seller"]),
      isFeatured: 1,
      isActive: 1,
      sortOrder: 1
    },
    {
      id: "catprod_hoodie_celebes",
      slug: "hoodie-boxy-celebes-horizon-black",
      name: "Hoodie Boxy Oversize Celebes Horizon - Jet Black",
      tagline: "Boxy Cut Cotton Fleece 330 GSM Streetwear",
      description: "Hoodie boxy fleece katun 330 GSM tebal dan lembut dengan grafis siluet garis cakrawala Celebes di bagian punggung. Cutting boxy modern bergaya streetwear kontemporer.",
      apparelSlug: "hoodie",
      basePriceIdr: 285000,
      images: JSON.stringify(["/products/hoodie-black.jpg"]),
      sizes: JSON.stringify(["S", "M", "L", "XXL"]),
      tags: JSON.stringify(["Heavyweight", "Boxy Cut", "Streetwear"]),
      isFeatured: 1,
      isActive: 1,
      sortOrder: 2
    },
    {
      id: "catprod_coach_tactical",
      slug: "coach-jacket-urban-makassar-olive",
      name: "Coach Jacket Urban Makassar Tactical - Forest Olive",
      tagline: "Windproof Parasut Taslan Tipografi Lontara",
      description: "Jaket coach parasut taslan windproof dengan bordir typography aksara Lontara dan kancing snap metal matte. Dibuat untuk penjelajah urban tahan angin dan gerimis.",
      apparelSlug: "shirt",
      basePriceIdr: 320000,
      images: JSON.stringify(["/products/coach-jacket-olive.jpg"]),
      sizes: JSON.stringify(["S", "M", "XL", "XXL"]),
      tags: JSON.stringify(["Windproof", "Tactical", "Lontara Modern"]),
      isFeatured: 0,
      isActive: 1,
      sortOrder: 3
    },
    {
      id: "catprod_tee_ecru",
      slug: "kaos-polos-heavyweight-ecru",
      name: "Kaos Polos Combed 24s Heavyweight - Off White Ecru",
      tagline: "Essential Relaxed Cut Combed 24s Reaktif",
      description: "Kaos potongan santai dengan katun combed 24s reaktif warna ecru alami, jahitan rantai rapi dan rib leher tebal anti-melar. Nyaman dipakai di iklim tropis Sulawesi.",
      apparelSlug: "tshirt",
      basePriceIdr: 165000,
      images: JSON.stringify(["/products/tshirt-white-ecru.jpg"]),
      sizes: JSON.stringify(["S", "M", "XL", "XXL"]),
      tags: JSON.stringify(["Essential", "Heavyweight", "Pure Cotton"]),
      isFeatured: 0,
      isActive: 1,
      sortOrder: 4
    },
    {
      id: "catprod_crewneck_losari",
      slug: "crewneck-vintage-losari-dusk-ash",
      name: "Crewneck Sweater Vintage Losari Dusk - Ash Heather",
      tagline: "Vintage Baby Terry Sunset Losari Typo",
      description: "Sweater crewneck baby terry katun dengan warna ash heather klasik dan tipografi grafis sunset Losari dalam estetika vintage wash yang tenang dan elegan.",
      apparelSlug: "crewneck",
      basePriceIdr: 245000,
      images: JSON.stringify(["/products/crewneck-grey.jpg"]),
      sizes: JSON.stringify(["M", "L", "XL"]),
      tags: JSON.stringify(["Vintage Wash", "Losari", "Cozy Wear"]),
      isFeatured: 0,
      isActive: 1,
      sortOrder: 5
    },
    {
      id: "catprod_longsleeve_phinisi",
      slug: "longsleeve-phinisi-heritage-navy",
      name: "Longsleeve Phinisi Heritage Cyberpunk - Deep Navy",
      tagline: "Neo-Traditional Phinisi Bugis Makassar Graphic",
      description: "Kaos lengan panjang dengan ilustrasi perahu Phinisi bergaya neo-tradisional di bagian lengan dan punggung. Penghormatan kepada pelaut ulung Bugis-Makassar.",
      apparelSlug: "longsleeve",
      basePriceIdr: 215000,
      images: JSON.stringify(["/products/tshirt-black.jpg"]),
      sizes: JSON.stringify(["S", "M", "L", "XL"]),
      tags: JSON.stringify(["Phinisi", "Heritage", "Cyberpunk"]),
      isFeatured: 1,
      isActive: 1,
      sortOrder: 6
    }
  ];

  for (const p of products) {
    await client.execute({
      sql: `INSERT INTO CatalogProduct (id, slug, name, tagline, description, apparelSlug, basePriceIdr, images, sizes, tags, isFeatured, isActive, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              slug=excluded.slug,
              name=excluded.name,
              tagline=excluded.tagline,
              description=excluded.description,
              basePriceIdr=excluded.basePriceIdr,
              images=excluded.images,
              sizes=excluded.sizes,
              tags=excluded.tags,
              updatedAt=datetime('now')`,
      args: [
        p.id,
        p.slug,
        p.name,
        p.tagline,
        p.description,
        p.apparelSlug,
        p.basePriceIdr,
        p.images,
        p.sizes,
        p.tags,
        p.isFeatured,
        p.isActive,
        p.sortOrder
      ]
    });
    console.log(`✓ Seeded CatalogProduct: ${p.name}`);
  }

  // Get first user in DB to attach sample reviews
  const userRow = await client.execute("SELECT id FROM User LIMIT 1");
  const fallbackUserId = userRow.rows[0]?.id || "usr_guest_demo";

  const sampleReviews = [
    {
      id: "rev_makassar_01",
      userId: fallbackUserId,
      customerName: "Rian (Makassar)",
      rating: 5,
      reviewText: "Kualitas sablon DTF nya mantap sekali, detail grafisnya tajam dan warnanya oranye menyala pas. Katun 24s adem dipakai siang hari di Losari.",
      isVerifiedPurchase: 1,
      isPublished: 1
    },
    {
      id: "rev_celebes_01",
      userId: fallbackUserId,
      customerName: "Fadli (Gowa)",
      rating: 5,
      reviewText: "Cutting boxy-nya terbaik! Bahannya tebal 330 gsm tapi tidak kaku. Sangat recommended buat anak motor malam.",
      isVerifiedPurchase: 1,
      isPublished: 1
    }
  ];

  for (const r of sampleReviews) {
    await client.execute({
      sql: `INSERT INTO ProductReview (id, userId, customerName, rating, reviewText, isVerifiedPurchase, isPublished, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET reviewText=excluded.reviewText, updatedAt=datetime('now')`,
      args: [r.id, r.userId, r.customerName, r.rating, r.reviewText, r.isVerifiedPurchase, r.isPublished]
    });
    console.log(`✓ Seeded ProductReview: ${r.customerName}`);
  }

  console.log("Seeding complete!");
}

main().catch(console.error);
