import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const decalCyber = JSON.stringify([
    {
      id: "decal-cyber-1",
      name: "Kamito Cyber DTF A3",
      targetSide: "front",
      tier: "A3",
      widthCm: 30,
      heightCm: 38,
      costIdr: 35000,
      x: 0,
      y: 0.05,
      scale: 0.55,
      rotation: 0,
      opacity: 1,
      url: "/mascot/kamito-clean-decal.png",
    },
  ]);

  const decalLosari = JSON.stringify([
    {
      id: "decal-losari-1",
      name: "Kamito Losari DTF A4",
      targetSide: "front",
      tier: "A4",
      widthCm: 21,
      heightCm: 29.7,
      costIdr: 25000,
      x: 0,
      y: 0.02,
      scale: 0.45,
      rotation: 0,
      opacity: 1,
      url: "/mascot/kamito-clean-decal.png",
    },
  ]);

  const decalToraja = JSON.stringify([
    {
      id: "decal-toraja-1",
      name: "Kamito Toraja DTF A5",
      targetSide: "front",
      tier: "A5",
      widthCm: 15,
      heightCm: 20,
      costIdr: 20000,
      x: 0,
      y: 0.08,
      scale: 0.4,
      rotation: 0,
      opacity: 1,
      url: "/mascot/kamito-clean-decal.png",
    },
  ]);

  await db.run(
    sql`UPDATE "Design" SET 
      previewImageFrontUrl = '/mockups/mockup-cyber-makassar-black.jpg', 
      previewImageBackUrl = '/mockups/mockup-cyber-makassar-black.jpg',
      decals = ${decalCyber}
    WHERE id = 'des_test_cyber_01'`
  );

  await db.run(
    sql`UPDATE "Design" SET 
      previewImageFrontUrl = '/mockups/mockup-losari-sunset-white.jpg', 
      previewImageBackUrl = '/mockups/mockup-losari-sunset-white.jpg',
      decals = ${decalLosari}
    WHERE id = 'des_test_losari_02'`
  );

  await db.run(
    sql`UPDATE "Design" SET 
      previewImageFrontUrl = '/mockups/mockup-toraja-hoodie-black.jpg', 
      previewImageBackUrl = '/mockups/mockup-toraja-hoodie-black.jpg',
      decals = ${decalToraja}
    WHERE id = 'des_test_toraja_03'`
  );

  console.log("Updated 3 designs in database with realistic Kamito mascot mockups and decals!");

  const rows = await db.run(
    sql`SELECT id, title, previewImageFrontUrl, decals FROM "Design" WHERE id IN ('des_test_cyber_01', 'des_test_losari_02', 'des_test_toraja_03')`
  );
  console.log("Verified designs:", rows.rows);
}

main().catch(console.error);
