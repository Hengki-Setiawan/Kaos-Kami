import { prisma } from "../src/lib/db";

async function main() {
  console.log("🌱 Mulai seeding katalog database Kaos Kami...");

  // 1. Seed Apparel Categories (Sesuai APPAREL_CATALOG di src/lib/constants.ts)
  const apparelData = [
    {
      slug: "tshirt",
      name: "Heavyweight Boxy Tee (Lengan Pendek)",
      tagline: "240 & 280 GSM Long-Staple Combed Cotton",
      weightGsm: "240 / 280 GSM",
      basePriceIdr: 149000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/tshirt-heavyweight.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Architectural drop-shoulder silhouette with heavy ribbed 3.2cm collar binding.",
      sortOrder: 1,
    },
    {
      slug: "longsleeve",
      name: "Heavyweight Longsleeve Tee (Lengan Panjang)",
      tagline: "240 & 280 GSM Combed Cotton with Ribbed Cuffs",
      weightGsm: "240 / 280 GSM",
      basePriceIdr: 169000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/tshirt-heavyweight.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Drop-shoulder boxy longsleeve with 5cm ribbed sleeve cuffs and reinforced neckline.",
      sortOrder: 2,
    },
    {
      slug: "crewneck",
      name: "Heavyweight Crewneck Sweater",
      tagline: "330 & 380 GSM Premium Loopback French Terry",
      weightGsm: "330 / 380 GSM",
      basePriceIdr: 249000,
      sizes: JSON.stringify(["M", "L", "XL", "XXL"]),
      model3dPath: "/models/hoodie.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Classic relaxed streetwear sweater without hood, featuring dense ribbed collar, cuffs, and hem.",
      sortOrder: 3,
    },
    {
      slug: "hoodie",
      name: "Heavyweight Oversized Hoodie",
      tagline: "380 GSM Heavy French Terry Fleece",
      weightGsm: "380 GSM",
      basePriceIdr: 269000,
      sizes: JSON.stringify(["M", "L", "XL", "XXL"]),
      model3dPath: "/models/hoodie.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Depan", side: "front", anchor: [0, 0.05, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.05, -0.15] },
      ]),
      description: "Dense loopback French Terry with double-layered structured hood and deep kangaroo pouch.",
      sortOrder: 4,
    },
    {
      slug: "shirt",
      name: "Streetwear Coach Jacket",
      tagline: "320 GSM Technical Canvas & Hardware",
      weightGsm: "320 GSM",
      basePriceIdr: 329000,
      sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
      model3dPath: "/models/jacket.glb",
      fallbackComponent: "TshirtModel",
      decalNodes: JSON.stringify([
        { id: "front", label: "Dada Kiri / Kanan", side: "front", anchor: [-0.08, 0.08, 0.15] },
        { id: "back", label: "Punggung Belakang", side: "back", anchor: [0, 0.08, -0.15] },
      ]),
      description: "Architectural boxy zip jacket with front hardware, side pockets, and durable tactical weave.",
      sortOrder: 5,
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
      slug: "acid-wash",
      name: "Vintage Mineral Acid Wash Treatment",
      surchargeIdr: 30000,
      roughness: 0.85,
      sheen: 0.4,
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
      email: "admin@kaoskami.com",
      role: "ADMIN",
    },
    create: {
      name: "Admin Workshop Kaos Kami",
      email: "admin@kaoskami.com",
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
        name: "Heavyweight Boxy Tee — Obsidian Black (Polos)",
        colorHex: "#121214",
        colorName: "Obsidian Black",
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
        name: "Heavyweight Boxy Tee — Chalk Ecru (Polos)",
        colorHex: "#EFECE6",
        colorName: "Chalk Ecru",
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
        name: "Acid Tangerine Edition — Makassar Streetwear Drop",
        colorHex: "#E65100",
        colorName: "Signal Tangerine",
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
        name: "Fleece Heavyweight Oversized Hoodie — Obsidian Black",
        colorHex: "#121214",
        colorName: "Obsidian Black",
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
        name: "Tactical Urban Coach Jacket — Military Olive",
        colorHex: "#3B4435",
        colorName: "Military Olive",
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
