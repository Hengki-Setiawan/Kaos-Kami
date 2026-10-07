import { createClient } from "@libsql/client/web";

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL or DATABASE_URL not found in environment!");
  }

  console.log("Connecting to Turso libSQL at:", url.replace(/\/\/.*@/, "//***@"));
  const client = createClient({ url, authToken });

  const queries = [
    `CREATE TABLE IF NOT EXISTS "CatalogProduct" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "tagline" TEXT,
      "description" TEXT,
      "apparelSlug" TEXT NOT NULL DEFAULT 'tshirt',
      "basePriceIdr" INTEGER NOT NULL DEFAULT 165000,
      "images" TEXT NOT NULL DEFAULT '[]',
      "sizes" TEXT NOT NULL DEFAULT '["S","M","L","XL","XXL"]',
      "tags" TEXT,
      "isFeatured" INTEGER NOT NULL DEFAULT 0,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "OrderComplaint" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "orderId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "photoUrls" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "resolutionNote" TEXT,
      "resolvedByUserId" TEXT,
      "resolvedAt" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "OrderComplaint_orderId_idx" ON "OrderComplaint" ("orderId");`,
    `CREATE INDEX IF NOT EXISTS "OrderComplaint_userId_idx" ON "OrderComplaint" ("userId");`,

    `CREATE TABLE IF NOT EXISTS "OrderRefund" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "orderId" TEXT NOT NULL,
      "amountIdr" INTEGER NOT NULL,
      "bankName" TEXT,
      "accountNumber" TEXT,
      "accountHolder" TEXT,
      "reason" TEXT NOT NULL,
      "proofPhotoUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "processedByUserId" TEXT,
      "refundedAt" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "OrderRefund_orderId_idx" ON "OrderRefund" ("orderId");`,

    `CREATE TABLE IF NOT EXISTS "ProductReview" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "orderId" TEXT,
      "userId" TEXT NOT NULL,
      "productVariantId" TEXT,
      "customerName" TEXT,
      "rating" INTEGER NOT NULL DEFAULT 5,
      "reviewText" TEXT NOT NULL,
      "photoUrls" TEXT,
      "isVerifiedPurchase" INTEGER NOT NULL DEFAULT 1,
      "isPublished" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "ProductReview_orderId_idx" ON "ProductReview" ("orderId");`,
    `CREATE INDEX IF NOT EXISTS "ProductReview_userId_idx" ON "ProductReview" ("userId");`
  ];

  for (const q of queries) {
    await client.execute(q);
  }
  console.log("All DDL executed successfully on Turso database!");

  // Verifikasi tabel ada di sqlite_master
  const check = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('CatalogProduct', 'OrderComplaint', 'OrderRefund', 'ProductReview') ORDER BY name;"
  );
  console.log("Tables verified in Turso:", check.rows.map((r) => r.name));
}

main().catch(console.error);
