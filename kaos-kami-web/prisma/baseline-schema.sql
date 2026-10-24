-- ============================================================================
-- BASELINE SKEMA KAOS KAMI (SQLite / Turso libSQL)
-- Digenerate: 2026-10-23T10:44:47.997Z
-- Sumber   : introspeksi READ-ONLY sqlite_master dari database aktif
--            (@libsql/client/web; hanya SELECT, tanpa tulis).
-- Keputusan owner #8=A (23 Okt 2026).
--
-- CATATAN PENTING:
-- 1) File ini adalah SNAPSHOT REFERENSI, bukan migration runner otomatis.
--    Prisma migrate/db push TIDAK bisa konek ke libsql:// (P1013) — lihat RUNBOOK §5.
-- 2) Untuk database baru: eksekusi statement berurutan via @libsql/client
--    (autocommit per-statement; JANGAN bungkus satu transaksi interaktif).
-- 3) Urutan: semua CREATE TABLE dulu, lalu CREATE INDEX.
-- 4) Jangan edit manual kecuali darurat; regenerate dengan:
--       node scripts/export-schema-sql.mjs
-- ============================================================================

CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "issuer" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "province" TEXT DEFAULT 'Sulawesi Selatan',
    "city" TEXT DEFAULT 'Makassar',
    "district" TEXT,
    "postalCode" TEXT,
    "fullAddress" TEXT NOT NULL,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ApparelCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "weightGsm" TEXT,
    "description" TEXT,
    "basePriceIdr" INTEGER NOT NULL,
    "sizes" TEXT NOT NULL,
    "model3dPath" TEXT NOT NULL,
    "fallbackComponent" TEXT NOT NULL,
    "decalNodes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Cart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "designId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceIdr" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CartItem_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CatalogProduct" (
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
    );

CREATE TABLE ChatMessage (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      senderName TEXT,
      senderRole TEXT NOT NULL DEFAULT 'CUSTOMER',
      receiverId TEXT,
      orderId TEXT,
      content TEXT NOT NULL,
      attachments TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

CREATE TABLE "ColorOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "isSpecialPigment" BOOLEAN NOT NULL DEFAULT false,
    "surchargeIdr" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minSpendIdr" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "Design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "materialFinishSlug" TEXT,
    "sablonMethodSlug" TEXT,
    "decals" TEXT NOT NULL,
    "studioTheme" TEXT,
    "calculatedPriceIdr" INTEGER NOT NULL,
    "priceBreakdown" TEXT NOT NULL,
    "previewImageFrontUrl" TEXT,
    "previewImageBackUrl" TEXT,
    "previewImage360Url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "masterAssetUrl" TEXT,
    CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Design_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApparelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ExpeditionZone" ("id" TEXT PRIMARY KEY, "city" TEXT NOT NULL, "province" TEXT NOT NULL, "courier" TEXT NOT NULL, "service" TEXT NOT NULL, "costIdr" INTEGER NOT NULL, "etdLabel" TEXT NOT NULL, "isActive" INTEGER NOT NULL DEFAULT 1, "sortOrder" INTEGER NOT NULL DEFAULT 0);

CREATE TABLE "MaterialFinish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surchargeIdr" INTEGER NOT NULL DEFAULT 0,
    "roughness" REAL NOT NULL DEFAULT 0.9,
    "sheen" REAL NOT NULL DEFAULT 0.5
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "deliveryMethod" TEXT NOT NULL DEFAULT 'PICKUP',
    "subtotalIdr" INTEGER NOT NULL,
    "shippingCostIdr" INTEGER NOT NULL DEFAULT 0,
    "discountIdr" INTEGER NOT NULL DEFAULT 0,
    "totalIdr" INTEGER NOT NULL,
    "shippingAddressId" TEXT,
    "courierNotes" TEXT,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "reviewNote" TEXT, "reviewedBy" TEXT, "reviewedAt" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderComplaint" (
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
    );

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "designId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceIdr" INTEGER NOT NULL,
    "lineTotalIdr" INTEGER NOT NULL,
    "snapshotName" TEXT NOT NULL,
    "snapshotImageUrl" TEXT,
    "snapshotSize" TEXT NOT NULL,
    "snapshotColorName" TEXT NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderRefund" (
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
    );

CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'IPAYMU',
    "providerRef" TEXT NOT NULL,
    "method" TEXT,
    "amountIdr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawWebhookPayload" TEXT,
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId")
      REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );

CREATE TABLE "ProductReview" (
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
    );

CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "priceIdr" INTEGER NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT NOT NULL,
    "frontDecalUrl" TEXT,
    "backDecalUrl" TEXT,
    "isPreDesigned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApparelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'DESIGN_PREP',
    "assignedToUserId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "notes" TEXT,
    "printWidthCm" REAL,
    "printHeightCm" REAL,
    "placementSide" TEXT,
    "offsetFromCollarCm" REAL,
    "rawAssetUrl" TEXT,
    "mockupPreviewUrl" TEXT,
    "printFileUrl" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "teamName" TEXT, "teamwearFlag" INTEGER,
    CONSTRAINT "ProductionTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "QcInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productionTaskId" TEXT,
    "photoUrl" TEXT NOT NULL,
    "grazingDeg" INTEGER,
    "luxEstimate" INTEGER,
    "side" TEXT,
    "checksJson" TEXT NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QcInspection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QcInspection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );

CREATE TABLE "SablonMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricingModel" TEXT NOT NULL,
    "priceA6Idr" INTEGER,
    "priceA5Idr" INTEGER,
    "priceA4Idr" INTEGER,
    "priceA3Idr" INTEGER,
    "flatPriceIdr" INTEGER,
    "minTurnaroundDays" INTEGER NOT NULL DEFAULT 2,
    "maxTurnaroundDays" INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ShopConfig" ("key" text PRIMARY KEY, "value" text NOT NULL, "updatedAt" text NOT NULL);

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phoneNumber" TEXT,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
, phoneVerified INTEGER NOT NULL DEFAULT 0);

CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "pushToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );

CREATE TABLE UserPresence (
      userId TEXT PRIMARY KEY,
      userName TEXT,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      lastSeenAt TEXT NOT NULL,
      isOnline INTEGER NOT NULL DEFAULT 1,
      deviceInfo TEXT
    );

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

CREATE UNIQUE INDEX "ApparelCategory_slug_key" ON "ApparelCategory"("slug");

CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

CREATE UNIQUE INDEX "ColorOption_slug_key" ON "ColorOption"("slug");

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

CREATE INDEX "Design_userId_idx" ON "Design"("userId");

CREATE UNIQUE INDEX "ExpeditionZone_city_courier_service_uidx" ON "ExpeditionZone" ("city", "courier", "service");

CREATE INDEX "ExpeditionZone_city_idx" ON "ExpeditionZone" ("city");

CREATE UNIQUE INDEX "MaterialFinish_slug_key" ON "MaterialFinish"("slug");

CREATE INDEX "OrderComplaint_orderId_idx" ON "OrderComplaint" ("orderId");

CREATE INDEX "OrderComplaint_userId_idx" ON "OrderComplaint" ("userId");

CREATE INDEX "OrderRefund_orderId_idx" ON "OrderRefund" ("orderId");

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

CREATE INDEX "Order_status_idx" ON "Order"("status");

CREATE INDEX "Order_userId_idx" ON "Order"("userId");

CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview" ("orderId");

CREATE INDEX "ProductReview_userId_idx" ON "ProductReview" ("userId");

CREATE INDEX "ProductVariant_categoryId_idx" ON "ProductVariant"("categoryId");

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

CREATE INDEX "ProductionTask_assignedToUserId_idx" ON "ProductionTask"("assignedToUserId");

CREATE INDEX "ProductionTask_stage_idx" ON "ProductionTask"("stage");

CREATE INDEX "QcInspection_orderId_idx" ON "QcInspection"("orderId");

CREATE UNIQUE INDEX "SablonMethod_slug_key" ON "SablonMethod"("slug");

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

CREATE UNIQUE INDEX "UserDevice_pushToken_key" ON "UserDevice"("pushToken");

CREATE INDEX "UserDevice_userId_idx" ON "UserDevice"("userId");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

CREATE UNIQUE INDEX "Verification_identifier_key" ON "Verification"("identifier");

CREATE INDEX idx_chat_created ON ChatMessage(createdAt);

CREATE INDEX idx_chat_order ON ChatMessage(orderId);

CREATE INDEX idx_chat_receiver ON ChatMessage(receiverId);

CREATE INDEX idx_chat_sender ON ChatMessage(senderId);

CREATE INDEX idx_presence_lastSeen ON UserPresence(lastSeenAt);

CREATE INDEX idx_presence_role ON UserPresence(role);
