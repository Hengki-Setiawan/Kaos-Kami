import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.run(sql`UPDATE "Design" SET previewImageFrontUrl = '/products/tshirt-black.jpg', previewImageBackUrl = '/products/tshirt-black.jpg' WHERE id = 'des_test_cyber_01'`);
  await db.run(sql`UPDATE "Design" SET previewImageFrontUrl = '/products/tshirt-white-ecru.jpg', previewImageBackUrl = '/products/tshirt-white-ecru.jpg' WHERE id = 'des_test_losari_02'`);
  await db.run(sql`UPDATE "Design" SET previewImageFrontUrl = '/products/hoodie-black.jpg', previewImageBackUrl = '/products/hoodie-black.jpg' WHERE id = 'des_test_toraja_03'`);

  console.log("Updated 3D Design preview URLs to realistic mockups!");

  const updated = await db.run(sql`SELECT id, title, previewImageFrontUrl FROM "Design" WHERE id IN ('des_test_cyber_01', 'des_test_losari_02', 'des_test_toraja_03')`);
  console.log("Updated designs:", updated.rows);
}

main().catch(console.error);
