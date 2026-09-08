// src/lib/drizzle-schema.ts
// Skema Drizzle ORM — cermin 1:1 dari prisma/schema.prisma untuk RUNTIME
// Cloudflare Workers (Prisma Client v7 tidak dapat jalan di workerd:
// query compiler WASM-nya ditolak — "code generation disallowed".
// Lihat RUNBOOK §6). Prisma tetap dipakai untuk: db push, typegen,
// seed (Node), Studio. Bentuk nilai runtime dipertahankan:
// DateTime ISO-TEXT <-> Date via isoDateTime, Boolean <-> 0/1.
import { relations } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Prisma SQLite menyimpan DateTime sebagai ISO-8601 TEXT
// (mis. "2026-08-31T04:11:38.561+00:00"). Custom type ini menjaga
// bentuk Date di kode aplikasi — tanpa migrasi data.
export const isoDateTime = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "text";
  },
  fromDriver(value: string): Date {
    return new Date(value);
  },
  toDriver(value: Date): string {
    return value instanceof Date ? value.toISOString() : (value as unknown as string);
  },
});

// ------------------------------------------------------------------
// IDENTITY & BETTER AUTH (nama tabel persis seperti di Turso)
// ------------------------------------------------------------------

export const User = sqliteTable(
  "User",
  {
    id: text("id").primaryKey(),
    email: text("email").unique(),
    phoneNumber: text("phoneNumber").unique(),
    name: text("name"),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    passwordHash: text("passwordHash"),
    role: text("role").notNull().default("CUSTOMER"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("User_phoneNumber_idx").on(t.phoneNumber)],
);

export const Session = sqliteTable("Session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: isoDateTime("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
  updatedAt: isoDateTime("updatedAt")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const Account = sqliteTable(
  "Account",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    // better-auth 1.7 core: issuer OIDC (NULL untuk credential). Wajib ada
    // di skema drizzle atau sign-up 500 "field issuer does not exist".
    issuer: text("issuer"),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: isoDateTime("accessTokenExpiresAt"),
    refreshTokenExpiresAt: isoDateTime("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("Account_providerId_accountId_key").on(t.providerId, t.accountId)],
);

export const Verification = sqliteTable(
  "Verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: isoDateTime("expiresAt").notNull(),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("Verification_identifier_idx").on(t.identifier)],
);

export const Address = sqliteTable("Address", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  label: text("label").notNull(),
  recipientName: text("recipientName").notNull(),
  phoneNumber: text("phoneNumber").notNull(),
  province: text("province").default("Sulawesi Selatan"),
  city: text("city").default("Makassar"),
  district: text("district"),
  postalCode: text("postalCode"),
  fullAddress: text("fullAddress").notNull(),
  notes: text("notes"),
  isDefault: integer("isDefault", { mode: "boolean" }).notNull().default(false),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
  updatedAt: isoDateTime("updatedAt")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

// ------------------------------------------------------------------
// PRODUCT CATALOG
// ------------------------------------------------------------------

export const ApparelCategory = sqliteTable("ApparelCategory", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  weightGsm: text("weightGsm"),
  description: text("description"),
  basePriceIdr: integer("basePriceIdr").notNull(),
  sizes: text("sizes").notNull(),
  model3dPath: text("model3dPath").notNull(),
  fallbackComponent: text("fallbackComponent").notNull(),
  decalNodes: text("decalNodes").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
  updatedAt: isoDateTime("updatedAt")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const ProductVariant = sqliteTable(
  "ProductVariant",
  {
    id: text("id").primaryKey(),
    categoryId: text("categoryId").notNull(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    colorHex: text("colorHex").notNull(),
    colorName: text("colorName").notNull(),
    size: text("size").notNull(),
    priceIdr: integer("priceIdr").notNull(),
    stockQty: integer("stockQty").notNull().default(0),
    images: text("images").notNull(),
    frontDecalUrl: text("frontDecalUrl"),
    backDecalUrl: text("backDecalUrl"),
    isPreDesigned: integer("isPreDesigned", { mode: "boolean" }).notNull().default(false),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ProductVariant_categoryId_idx").on(t.categoryId)],
);

export const ColorOption = sqliteTable("ColorOption", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  isSpecialPigment: integer("isSpecialPigment", { mode: "boolean" }).notNull().default(false),
  surchargeIdr: integer("surchargeIdr").notNull().default(0),
  description: text("description"),
  sortOrder: integer("sortOrder").notNull().default(0),
});

export const MaterialFinish = sqliteTable("MaterialFinish", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  surchargeIdr: integer("surchargeIdr").notNull().default(0),
  roughness: real("roughness").notNull().default(0.9),
  sheen: real("sheen").notNull().default(0.5),
});

export const SablonMethod = sqliteTable("SablonMethod", {  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  pricingModel: text("pricingModel").notNull(),
  priceA6Idr: integer("priceA6Idr"),
  priceA5Idr: integer("priceA5Idr"),
  priceA4Idr: integer("priceA4Idr"),
  priceA3Idr: integer("priceA3Idr"),
  flatPriceIdr: integer("flatPriceIdr"),
  minTurnaroundDays: integer("minTurnaroundDays").notNull().default(2),
  maxTurnaroundDays: integer("maxTurnaroundDays").notNull().default(5),
});

// ------------------------------------------------------------------
// EXPEDITION ZONE (tarif luar kota per kota-kurir, editable admin)
// ------------------------------------------------------------------

export const ExpeditionZone = sqliteTable(
  "ExpeditionZone",
  {
    id: text("id").primaryKey(),
    city: text("city").notNull(),
    province: text("province").notNull(),
    courier: text("courier").notNull(),
    service: text("service").notNull(),
    costIdr: integer("costIdr").notNull(),
    etdLabel: text("etdLabel").notNull(),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [
    index("ExpeditionZone_city_idx").on(t.city),
    uniqueIndex("ExpeditionZone_city_courier_service_uidx").on(
      t.city,
      t.courier,
      t.service,
    ),
  ],
);

// ------------------------------------------------------------------
// DESIGN (3D STUDIO PERSISTENCE)
// ------------------------------------------------------------------

export const Design = sqliteTable(
  "Design",
  {
    id: text("id").primaryKey(),
    userId: text("userId"),
    categoryId: text("categoryId").notNull(),
    title: text("title").notNull(),
    colorHex: text("colorHex").notNull(),
    colorName: text("colorName").notNull(),
    size: text("size").notNull(),
    materialFinishSlug: text("materialFinishSlug"),
    sablonMethodSlug: text("sablonMethodSlug"),
    decals: text("decals").notNull(),
    studioTheme: text("studioTheme"),
    calculatedPriceIdr: integer("calculatedPriceIdr").notNull(),
    priceBreakdown: text("priceBreakdown").notNull(),
    previewImageFrontUrl: text("previewImageFrontUrl"),
    previewImageBackUrl: text("previewImageBackUrl"),
    previewImage360Url: text("previewImage360Url"),
    // Master produksi 300 DPI dari Pola 2D (URL R2 / JSON map per panel).
    masterAssetUrl: text("masterAssetUrl"),
    status: text("status").notNull().default("DRAFT"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("Design_userId_idx").on(t.userId)],
);

// ------------------------------------------------------------------
// CART
// ------------------------------------------------------------------

export const Cart = sqliteTable("Cart", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  updatedAt: isoDateTime("updatedAt")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const CartItem = sqliteTable("CartItem", {
  id: text("id").primaryKey(),
  cartId: text("cartId").notNull(),
  productVariantId: text("productVariantId"),
  designId: text("designId"),
  quantity: integer("quantity").notNull().default(1),
  unitPriceIdr: integer("unitPriceIdr").notNull(),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
});

// ------------------------------------------------------------------
// ORDER & PRODUCTION WORKFLOW
// ------------------------------------------------------------------

export const Order = sqliteTable(
  "Order",
  {
    id: text("id").primaryKey(),
    orderNumber: text("orderNumber").notNull().unique(),
    userId: text("userId").notNull(),
    status: text("status").notNull().default("PENDING_PAYMENT"),
    deliveryMethod: text("deliveryMethod").notNull().default("PICKUP"),
    subtotalIdr: integer("subtotalIdr").notNull(),
    shippingCostIdr: integer("shippingCostIdr").notNull().default(0),
    discountIdr: integer("discountIdr").notNull().default(0),
    totalIdr: integer("totalIdr").notNull(),
    shippingAddressId: text("shippingAddressId"),
    courierNotes: text("courierNotes"),
    trackingNumber: text("trackingNumber"),
    notes: text("notes"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("Order_userId_idx").on(t.userId), index("Order_status_idx").on(t.status)],
);

export const OrderItem = sqliteTable("OrderItem", {
  id: text("id").primaryKey(),
  orderId: text("orderId").notNull(),
  productVariantId: text("productVariantId"),
  designId: text("designId"),
  quantity: integer("quantity").notNull(),
  unitPriceIdr: integer("unitPriceIdr").notNull(),
  lineTotalIdr: integer("lineTotalIdr").notNull(),
  snapshotName: text("snapshotName").notNull(),
  snapshotImageUrl: text("snapshotImageUrl"),
  snapshotSize: text("snapshotSize").notNull(),
  snapshotColorName: text("snapshotColorName").notNull(),
});

export const OrderStatusEvent = sqliteTable("OrderStatusEvent", {
  id: text("id").primaryKey(),
  orderId: text("orderId").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  actorUserId: text("actorUserId"),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
});

// ------------------------------------------------------------------
// PAYMENT
// ------------------------------------------------------------------

export const Payment = sqliteTable("Payment", {
  id: text("id").primaryKey(),
  orderId: text("orderId").notNull().unique(),
  provider: text("provider").notNull().default("DUITKU"),
  providerRef: text("providerRef").notNull(),
  method: text("method"),
  amountIdr: integer("amountIdr").notNull(),
  status: text("status").notNull().default("PENDING"),
  rawWebhookPayload: text("rawWebhookPayload"),
  paidAt: isoDateTime("paidAt"),
  expiresAt: isoDateTime("expiresAt"),
  createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
  updatedAt: isoDateTime("updatedAt")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

// ------------------------------------------------------------------
// PRODUCTION TASK
// ------------------------------------------------------------------

export const ProductionTask = sqliteTable(
  "ProductionTask",
  {
    id: text("id").primaryKey(),
    orderId: text("orderId").notNull(),
    orderItemId: text("orderItemId").notNull(),
    stage: text("stage").notNull().default("DESIGN_PREP"),
    assignedToUserId: text("assignedToUserId"),
    priority: integer("priority").notNull().default(0),
    dueDate: isoDateTime("dueDate"),
    notes: text("notes"),
    printWidthCm: real("printWidthCm"),
    printHeightCm: real("printHeightCm"),
    placementSide: text("placementSide"),
    offsetFromCollarCm: real("offsetFromCollarCm"),
    rawAssetUrl: text("rawAssetUrl"),
    mockupPreviewUrl: text("mockupPreviewUrl"),
    printFileUrl: text("printFileUrl"),
    completedAt: isoDateTime("completedAt"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("ProductionTask_stage_idx").on(t.stage),
    index("ProductionTask_assignedToUserId_idx").on(t.assignedToUserId),
  ],
);

// ------------------------------------------------------------------
// MARKETING & VOUCHER
// ------------------------------------------------------------------

export const Coupon = sqliteTable("Coupon", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discountType").notNull(),
  discountValue: integer("discountValue").notNull(),
  minSpendIdr: integer("minSpendIdr").notNull().default(0),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").notNull().default(0),
  expiresAt: isoDateTime("expiresAt"),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
});

// AbandonedCartLog DIHAPUS Sep 2026 (tabel mati, tidak dipakai kode mana pun).

// ------------------------------------------------------------------
// MOBILE PUSH DEVICES
// ------------------------------------------------------------------

export const UserDevice = sqliteTable(
  "UserDevice",
  {
    id: text("id").primaryKey(),
    userId: text("userId"),
    pushToken: text("pushToken").notNull().unique(),
    platform: text("platform").notNull().default("android"),
    createdAt: isoDateTime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDateTime("updatedAt")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("UserDevice_userId_idx").on(t.userId)],
);

// ------------------------------------------------------------------
// RELATIONS (untuk db.query.*.with — setara Prisma include)
// ------------------------------------------------------------------

export const UserRelations = relations(User, ({ many, one }) => ({
  addresses: many(Address),
  designs: many(Design),
  orders: many(Order),
  cart: one(Cart, { fields: [User.id], references: [Cart.userId] }),
  devices: many(UserDevice),
  sessions: many(Session),
  accounts: many(Account),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}));

export const AddressRelations = relations(Address, ({ one, many }) => ({
  user: one(User, { fields: [Address.userId], references: [User.id] }),
  orders: many(Order),
}));

export const ApparelCategoryRelations = relations(ApparelCategory, ({ many }) => ({
  variants: many(ProductVariant),
  designs: many(Design),
}));

export const ProductVariantRelations = relations(ProductVariant, ({ one, many }) => ({
  category: one(ApparelCategory, {
    fields: [ProductVariant.categoryId],
    references: [ApparelCategory.id],
  }),
  cartItems: many(CartItem),
  orderItems: many(OrderItem),
}));

export const DesignRelations = relations(Design, ({ one, many }) => ({
  user: one(User, { fields: [Design.userId], references: [User.id] }),
  category: one(ApparelCategory, {
    fields: [Design.categoryId],
    references: [ApparelCategory.id],
  }),
  cartItems: many(CartItem),
  orderItems: many(OrderItem),
}));

export const CartRelations = relations(Cart, ({ one, many }) => ({
  user: one(User, { fields: [Cart.userId], references: [User.id] }),
  items: many(CartItem),
}));

export const CartItemRelations = relations(CartItem, ({ one }) => ({
  cart: one(Cart, { fields: [CartItem.cartId], references: [Cart.id] }),
  productVariant: one(ProductVariant, {
    fields: [CartItem.productVariantId],
    references: [ProductVariant.id],
  }),
  design: one(Design, { fields: [CartItem.designId], references: [Design.id] }),
}));

export const OrderRelations = relations(Order, ({ one, many }) => ({
  user: one(User, { fields: [Order.userId], references: [User.id] }),
  items: many(OrderItem),
  shippingAddress: one(Address, {
    fields: [Order.shippingAddressId],
    references: [Address.id],
  }),
  payment: one(Payment, { fields: [Order.id], references: [Payment.orderId] }),
  productionTasks: many(ProductionTask),
  statusHistory: many(OrderStatusEvent),
}));

export const OrderItemRelations = relations(OrderItem, ({ one }) => ({
  order: one(Order, { fields: [OrderItem.orderId], references: [Order.id] }),
  productVariant: one(ProductVariant, {
    fields: [OrderItem.productVariantId],
    references: [ProductVariant.id],
  }),
  design: one(Design, { fields: [OrderItem.designId], references: [Design.id] }),
}));

export const OrderStatusEventRelations = relations(OrderStatusEvent, ({ one }) => ({
  order: one(Order, { fields: [OrderStatusEvent.orderId], references: [Order.id] }),
}));

export const PaymentRelations = relations(Payment, ({ one }) => ({
  order: one(Order, { fields: [Payment.orderId], references: [Order.id] }),
}));

export const ProductionTaskRelations = relations(ProductionTask, ({ one }) => ({
  order: one(Order, { fields: [ProductionTask.orderId], references: [Order.id] }),
}));

export const UserDeviceRelations = relations(UserDevice, ({ one }) => ({
  user: one(User, { fields: [UserDevice.userId], references: [User.id] }),
}));

export const schema = {
  User,
  Session,
  Account,
  Verification,
  Address,
  ApparelCategory,
  ProductVariant,
  ColorOption,
  MaterialFinish,
  SablonMethod,
  Design,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusEvent,
  Payment,
  ProductionTask,
  Coupon,
  ExpeditionZone,
  UserDevice,
  UserRelations,
  SessionRelations,
  AccountRelations,
  AddressRelations,
  ApparelCategoryRelations,
  ProductVariantRelations,
  DesignRelations,
  CartRelations,
  CartItemRelations,
  OrderRelations,
  OrderItemRelations,
  OrderStatusEventRelations,
  PaymentRelations,
  ProductionTaskRelations,
  UserDeviceRelations,
};

export type DbSchema = typeof schema;
