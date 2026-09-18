// Seed Node-only: Prisma Client v7 jalan normal di Node (CLI/tsx).
// JANGAN impor dari src/lib/db (itu Drizzle untuk Workers runtime).
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function makePrisma() {
  const url =
    process.env.DATABASE_URL?.startsWith("libsql://")
      ? process.env.DATABASE_URL
      : process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
  return new PrismaClient({
    adapter: new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN || "" }),
  });
}

const prisma = makePrisma();

async function main() {
  console.log("🌱 Mulai seeding katalog database Kaos Kami...");

  // 1. Seed Apparel Categories (Sesuai APPAREL_CATALOG di src/lib/constants.ts)
  const apparelData = [
    {
      slug: "tshirt",
      name: "Kaos Lengan Pendek (Combed 24s/30s)",
      tagline: "Katun Combed Sejuk & Lembut",
      weightGsm: "Combed 24s / 30s",
      basePriceIdr: 79000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/tee-basic.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Kaos katun combed pilihan berkarakter sejuk dan rapi, nyaman untuk harian maupun sablon kustom.",
      sortOrder: 1,
    },
    {
      slug: "longsleeve",
      name: "Kaos Lengan Panjang",
      tagline: "Katun Combed dengan Manset Rib",
      weightGsm: "Combed 24s",
      basePriceIdr: 99000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/longsleeve.glb",
      fallbackComponent: "LongsleeveModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Kaos lengan panjang berkerah rib elastis yang nyaman untuk aktivitas harian dan seragam.",
      sortOrder: 2,
    },
    {
      slug: "crewneck",
      name: "Crewneck Sweater",
      tagline: "Bahan Fleece Lembut & Hangat",
      weightGsm: "Fleece 280 GSM",
      basePriceIdr: 149000,
      sizes: JSON.stringify(["M", "L", "XL", "XXL"]),
      model3dPath: "/models/sweater.glb",
      fallbackComponent: "CrewneckModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Sweater crewneck berpotongan santai dengan bahan fleece lembut dan rib elastis.",
      sortOrder: 3,
    },
    {
      slug: "hoodie",
      name: "Hoodie Jumper",
      tagline: "Cotton Fleece Tebal dengan Tudung",
      weightGsm: "Fleece 330 GSM",
      basePriceIdr: 179000,
      sizes: JSON.stringify(["M", "L", "XL", "XXL"]),
      model3dPath: "/models/hoodie-blue.glb",
      fallbackComponent: "HoodieModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.05, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.05, -0.15] },
      ]),
      description: "Hoodie jumper bertudung ganda dengan saku kanguru dan bahan fleece tebal sejuk.",
      sortOrder: 4,
    },
    {
      slug: "shirt",
      name: "Coach Jacket",
      tagline: "Jaket Kasual Tahan Angin",
      weightGsm: "Micro Ripstop",
      basePriceIdr: 189000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/jacket.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Kiri / Kanan", side: "front", anchor: [-0.08, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Jaket coach kasual tahan angin dengan kancing jepret dan furing nyaman.",
      sortOrder: 5,
    },
    {
      // FASE 13: topi — mockup 3D AKTIF (cap.glb), pemesanan BELUM dibuka
      // (orderable=false di kode; DB tak punya kolom itu). basePriceIdr 0 =
      // arsip dashboard saja. WAJIB ada baris ini agar dashboard boleh
      // simpan desain topi (POST /api/designs lookup kategori by slug).
      // JANGAN buat varian (tanpa varian = tak muncul di katalog jualan).
      slug: "cap",
      name: "Snapback Baseball Cap (Mockup Saja)",
      tagline: "Mockup 3D — pemesanan SEGERA hadir",
      weightGsm: "—",
      basePriceIdr: 0,
      sizes: JSON.stringify(["All Size"]),
      model3dPath: "/models/cap.glb",
      fallbackComponent: "CapModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Depan Topi", side: "front", anchor: [0, 0.1, 0.09] },
      ]),
      description: "Mockup 3D topi untuk latihan desain. Belum bisa dipesan — harga & produksi menyusul.",
      sortOrder: 6,
    },
    {
      // FASE 13: celana — mockup 3D AKTIF (pants.glb), pemesanan BELUM
      // dibuka (orderable=false di kode; DB tak punya kolom itu).
      // basePriceIdr 0 = arsip dashboard saja. WAJIB ada baris ini agar
      // dashboard boleh simpan desain celana (POST /api/designs lookup
      // kategori by slug). JANGAN buat varian (tanpa varian = tak muncul
      // di katalog jualan).
      slug: "pants",
      name: "Celana (SEGERA Hadir)",
      tagline: "Mockup & pemesanan SEGERA hadir",
      weightGsm: "—",
      basePriceIdr: 0,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/pants.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([]),
      description: "Belum ada mockup 3D maupun pemesanan.",
      sortOrder: 7,
    },
    {
      // CELANA PENDEK coming-soon (pola pants persis): mockup 3D AKTIF
      // (shorts.glb), pemesanan BELUM dibuka. basePriceIdr 0 = arsip
      // dashboard saja. WAJIB ada agar dashboard boleh simpan desain
      // shorts (POST /api/designs lookup kategori by slug). JANGAN buat
      // varian (tanpa varian = tak muncul di katalog jualan).
      slug: "shorts",
      name: "Celana Pendek (Mockup Saja)",
      tagline: "Mockup 3D — pemesanan SEGERA hadir",
      weightGsm: "—",
      basePriceIdr: 0,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/shorts.glb",
      fallbackComponent: "ShortsModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Paha Depan", side: "front", anchor: [0, -0.05, 0.12] },
      ]),
      description: "Mockup 3D celana pendek untuk latihan desain. Belum bisa dipesan — harga & produksi menyusul.",
      sortOrder: 8,
    },
  ];

  for (const item of apparelData) {
    await prisma.apparelCategory.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }
  console.log(`✅ ${apparelData.length} Kategori Apparel berhasil di-seed.`);

  // 2. Seed Color Options (Sesuai PRODUCT_COLORS di src/lib/constants.ts)
  const colorsData = [
    {
      slug: "obsidian",
      name: "Obsidian Black",
      hex: "#121214",
      isSpecialPigment: false,
      surchargeIdr: 0,
      description: "Deep reactive carbon dyed combed cotton.",
      sortOrder: 1,
    },
    {
      slug: "chalk",
      name: "Chalk Ecru",
      hex: "#EFECE6",
      isSpecialPigment: false,
      surchargeIdr: 0,
      description: "Natural unbleached raw organic cotton flecks.",
      sortOrder: 2,
    },
    {
      slug: "tangerine",
      name: "Signal Tangerine",
      hex: "#E65100",
      isSpecialPigment: true,
      surchargeIdr: 15000,
      description: "High-visibility industrial acid orange pigment dye (+IDR 15.000).",
      sortOrder: 3,
    },
    {
      slug: "olive",
      name: "Military Olive",
      hex: "#3B4435",
      isSpecialPigment: true,
      surchargeIdr: 15000,
      description: "Subdued tactical olive drab utility wash (+IDR 15.000).",
      sortOrder: 4,
    },
    {
      slug: "shadow",
      name: "Shadow Grey",
      hex: "#2A2B2E",
      isSpecialPigment: false,
      surchargeIdr: 0,
      description: "Muted brutalist concrete wash.",
      sortOrder: 5,
    },
    {
      slug: "cobalt",
      name: "Deep Cobalt",
      hex: "#16284F",
      isSpecialPigment: true,
      surchargeIdr: 15000,
      description: "Rich maritime midnight blue pigment (+IDR 15.000).",
      sortOrder: 6,
    },
    {
      slug: "crimson",
      name: "Vintage Crimson",
      hex: "#5C1D24",
      isSpecialPigment: true,
      surchargeIdr: 15000,
      description: "Deep aged streetwear burgundy red (+IDR 15.000).",
      sortOrder: 7,
    },
  ];

  for (const c of colorsData) {
    await prisma.colorOption.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }
  console.log(`✅ ${colorsData.length} Pilihan Warna Kain berhasil di-seed.`);

  // 3. Seed Material Finishes
  // NONAKTIF Sep 2026 (keputusan owner): "acid-wash" (+30rb) DIHAPUS total —
  // entri dihapus dari seed agar tak ter-seed ulang. Baris DB lama TIDAK
  // terhapus otomatis oleh upsert (owner hapus manual 1x via Studio/SQL:
  // DELETE FROM MaterialFinish WHERE slug='acid-wash'; — JANGAN jalankan
  // seed otomatis di sini).
  const materialsData = [
    {
      slug: "combed-cotton",
      name: "100% Long-Staple Combed Cotton",
      surchargeIdr: 0,
      roughness: 0.9,
      sheen: 0.3,
    },
    {
      slug: "french-terry",
      name: "Loopback Heavy French Terry (380 GSM)",
      surchargeIdr: 0,
      roughness: 0.95,
      sheen: 0.2,
    },
    {
      slug: "poplin",
      name: "Technical Water-Repellent Tactical Weave",
      surchargeIdr: 0,
      roughness: 0.6,
      sheen: 0.7,
    },
  ];

  for (const m of materialsData) {
    await prisma.materialFinish.upsert({
      where: { slug: m.slug },
      update: m,
      create: m,
    });
  }
  console.log(`✅ ${materialsData.length} Karakter Bahan/Finish berhasil di-seed.`);

  // 4. Seed Sablon Methods (DTF Sablon Calibrated Standard)
  const sablonMethods = [
    {
      slug: "dtf",
      name: "DTF (Direct to Film) High-Density Print",
      description: "Teknologi cetak digital modern dengan ketajaman foto ultra-HD 300 DPI, elastis dan tahan cuci berkali-kali.",
      pricingModel: "PER_AREA",
      priceA6Idr: 10000, // Saku / Pocket (<= 10x10cm)
      priceA5Idr: 15000, // Sedang (<= 15x20cm)
      priceA4Idr: 25000, // Dada Standar (<= 21x30cm)
      priceA3Idr: 35000, // Cetak Besar Maksimal (<= 30x42cm)
      minTurnaroundDays: 2,
      maxTurnaroundDays: 3,
    },
    {
      slug: "plastisol",
      name: "Plastisol Curing Manual Screen-Printing",
      description: "Sablon manual premium dengan tinta oil-based padat bertekstur, khusus pesanan lusinan (min 12 pcs).",
      pricingModel: "PER_AREA",
      priceA6Idr: 12000,
      priceA5Idr: 18000,
      priceA4Idr: 28000,
      priceA3Idr: 40000,
      minTurnaroundDays: 4,
      maxTurnaroundDays: 7,
    },
  ];

  for (const s of sablonMethods) {
    await prisma.sablonMethod.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }
  console.log(`✅ ${sablonMethods.length} Metode Sablon berhasil di-seed.`);

  // 5. Seed Admin & Production Staff User Default
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: "081244002026" },
    update: {
      name: "Admin Workshop Kaos Kami",
      email: "admin@kaoskami.biz.id",
      role: "ADMIN",
    },
    create: {
      name: "Admin Workshop Kaos Kami",
      email: "admin@kaoskami.biz.id",
      phoneNumber: "081244002026",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin Workshop User berhasil disiapkan: ${adminUser.name} (${adminUser.phoneNumber}).`);

  // 6. Seed Ready-To-Buy E-Commerce Product Variants (Blueprint 01 §3)
  const tshirtCategory = await prisma.apparelCategory.findUnique({ where: { slug: "tshirt" } });
  const hoodieCategory = await prisma.apparelCategory.findUnique({ where: { slug: "hoodie" } });
  const jacketCategory = await prisma.apparelCategory.findUnique({ where: { slug: "shirt" } });

  if (tshirtCategory && hoodieCategory) {
    const readyProducts = [
      {
        sku: "TS-BLK-HEAVY-L",
        categoryId: tshirtCategory.id,
        name: "Kaos Polos Combed 24s - Hitam",
        colorHex: "#121214",
        colorName: "Hitam",
        size: "L",
        priceIdr: 165000,
        stockQty: 48,
        images: JSON.stringify(["/lookbook/look-01.jpg"]),
        isPreDesigned: false,
        isActive: true,
      },
      {
        sku: "TS-WHT-HEAVY-L",
        categoryId: tshirtCategory.id,
        name: "Kaos Polos Combed 24s - Putih Ecru",
        colorHex: "#EFECE6",
        colorName: "Putih Ecru",
        size: "L",
        priceIdr: 165000,
        stockQty: 35,
        images: JSON.stringify(["/lookbook/look-02.jpg"]),
        isPreDesigned: false,
        isActive: true,
      },
      {
        sku: "TS-TNG-LIMITED-M",
        categoryId: tshirtCategory.id,
        name: "Kaos Streetwear Grafis Makassar - Oranye",
        colorHex: "#E65100",
        colorName: "Oranye",
        size: "M",
        priceIdr: 195000,
        stockQty: 20,
        images: JSON.stringify(["/lookbook/look-03.jpg"]),
        isPreDesigned: true,
        isActive: true,
      },
      {
        sku: "HD-BLK-FLEECE-XL",
        categoryId: hoodieCategory.id,
        name: "Hoodie Boxy Fleece - Hitam",
        colorHex: "#121214",
        colorName: "Hitam",
        size: "XL",
        priceIdr: 285000,
        stockQty: 25,
        images: JSON.stringify(["/lookbook/look-04.jpg"]),
        isPreDesigned: false,
        isActive: true,
      },
      {
        sku: "JK-TAC-COACH-L",
        categoryId: jacketCategory ? jacketCategory.id : tshirtCategory.id,
        name: "Jaket Coach Urban - Hijau Olive",
        colorHex: "#3B4435",
        colorName: "Hijau Olive",
        size: "L",
        priceIdr: 320000,
        stockQty: 18,
        images: JSON.stringify(["/lookbook/look-01.jpg"]),
        isPreDesigned: false,
        isActive: true,
      },
    ];

    for (const prod of readyProducts) {
      await prisma.productVariant.upsert({
        where: { sku: prod.sku },
        update: prod,
        create: prod,
      });
    }
    console.log(`✅ ${readyProducts.length} Produk Siap Beli (E-Commerce Catalog) berhasil di-seed.`);
  }

  console.log("🚀 Seeding database Kaos Kami selesai 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
