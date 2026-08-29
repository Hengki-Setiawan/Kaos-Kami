================================================================================
KAOS KAMI — BLUEPRINT 01 / 04
MASTER E-COMMERCE CORE ARCHITECTURE & DATA MODEL
================================================================================
Version: 1.0 · Target execution agent: Gemini 3.7 Flash (or any capable coding
agent) operating inside this repository.
Companion documents: BLUEPRINT-02-MOCKUP-STUDIO-ENGINE.md,
BLUEPRINT-03-ADMIN-USER-DASHBOARD.md, BLUEPRINT-04-MOBILE-PERFORMANCE-INFRA.md
Supersedes: KAOS-KAMI-BUILD-SPEC-v2.1.md and v3.0 remain valid for the 3D
visual/creative-direction layer — this document does NOT change brand DNA,
OKLCH tokens, typography, or the scroll-storytelling phases. It adds the
business/data/backend layer underneath the existing frontend.

--------------------------------------------------------------------------------
0. READ THIS FIRST — HOW TO USE THIS BLUEPRINT SET
--------------------------------------------------------------------------------

This is document 1 of 4. Together they describe the full transformation of
"Kaos Kami" from a single-product 3D landing page into a production
e-commerce platform for a real Makassar-based custom sablon (screen-printing)
UMKM business.

Reading order for the build agent:
  1. THIS DOCUMENT — data model, auth, payments, shipping, order lifecycle,
     API surface. Build this first; everything else depends on it.
  2. BLUEPRINT-02 — upgrades the existing R3F mockup studio into a system
     that matches/exceeds VirtualThreads.io, 3dmockups.app, and FitMockup.
  3. BLUEPRINT-03 — Admin Dashboard (sablon production + order ops) and a
     simple User Dashboard, both consuming the API surface defined here.
  4. BLUEPRINT-04 — mobile responsiveness, performance budget, and the full
     infrastructure/DevOps/cost stack (what to use, why, and what it costs
     — prioritizing free tiers and cheap-but-solid 2026 tools).

Golden rule for the agent: DO NOT throw away `useConfiguratorStore.ts`,
`constants.ts`, the `/components/3d/*` tree, or the scroll-storytelling
system. Extend them. The store already models `activeApparel`, `decals`,
`selectedColor`, `selectedSize`, and a client-side `savedDesigns` array in
`localStorage` — this blueprint promotes that local state into a real
backend-synced `Design` and `Order` model without breaking the existing
Studio UI contract.

--------------------------------------------------------------------------------
1. BUSINESS CONTEXT (do not skip — this shapes every schema decision)
--------------------------------------------------------------------------------

- Kaos Kami is a real custom-apparel screen-printing (sablon) business based
  in Makassar, South Sulawesi, Indonesia.
- Customers are Indonesian, price-sensitive, pay in IDR, and expect
  QRIS / e-wallet / bank transfer / COD-style trust signals, not just cards.
- Two customer journeys must both be first-class:
    (a) "Beli langsung" — pick a ready design (or a pre-made colorway) from
        the catalog like a normal e-commerce store, choose size, checkout.
    (b) "Custom Sablon" — a customer uploads their own artwork, positions it
        on the 3D garment (front/back/sleeve), picks a garment + color +
        size + material finish, gets a live price, saves a Design, then
        converts that Design into an Order. This is the flow that needs to
        beat VirtualThreads / 3dmockups.app / FitMockup on UX quality.
- The seller side is NOT a multi-tenant marketplace (unlike 3dmockups.app's
  storefront-per-seller model). It is a single-brand UMKM store with an
  internal admin team that manages sablon production and fulfillment.
  Design this as single-tenant first, but keep the schema loosely
  normalized enough that multi-tenant is a plausible v2 (do not hard-code
  "there is only one shop" into primary keys).
- Physical production constraint that MUST show up in the data model: an
  Order line item that includes custom sablon has a **production step**
  (cutting the film/screen, printing, curing) that a pure digital-goods
  e-commerce schema (like a generic Shopify clone) does not need. This is
  why BLUEPRINT-03's admin dashboard is not just "order list" — it is a
  production Kanban.

--------------------------------------------------------------------------------
2. TARGET TECH STACK (backend layer — additive to the existing frontend)
--------------------------------------------------------------------------------

Keep:
  - Next.js 14 App Router (upgrade path to Next.js 15 covered in BLUEPRINT-04)
  - React Three Fiber 8.x / Three.js 0.169 (upgrade path to R3F v9 + WebGPU
    fallback covered in BLUEPRINT-02 and BLUEPRINT-04)
  - Zustand for client/ephemeral 3D + UI state
  - Tailwind CSS + existing OKLCH design tokens
  - GSAP + Lenis for the story scroll experience

Add:
  - **Database**: PostgreSQL via Supabase (see BLUEPRINT-04 for the
    "why Supabase" cost/tradeoff writeup — free tier: 500MB DB, 1GB storage,
    5GB egress, 50k MAU, which is more than enough for an early-stage UMKM
    store).
  - **ORM**: Prisma (or Drizzle — Drizzle is lighter and edge-friendly;
    this blueprint writes examples in Prisma syntax for readability but the
    schema translates 1:1 to Drizzle. Agent should pick ONE and be
    consistent — do not mix ORMs in the same repo).
  - **Auth**: Phone Number (WhatsApp) + Password authentication (using Better Auth / custom credentials) with WhatsApp OTP verification via Fonnte on registration and password reset. Supports Guest Checkout so customers can purchase with just Name + WhatsApp without mandatory pre-registration.
  - **Payments**: Midtrans Snap as the primary gateway (see §6 for full rationale) with an abstraction layer so Xendit can be added later without touching business logic.
  - **Object storage**: Cloudflare R2 for user-uploaded artwork (PNG/SVG decals) and generated mockup renders. Zero egress fees matter a lot here because every product-page view re-serves a mockup image.
  - **Shipping & Fulfillment**: Hyperlocal Makassar Delivery Model (No RajaOngkir dependency needed for local scale). Native options: (1) Self Pick-up at Kaos Kami Workshop (Rp 0), (2) Instant Courier Makassar (Maxim / GoSend / GrabExpress with COD ongkir), (3) Flat Rate Makassar (Rp 10.000–15.000), and (4) Manual Out-of-Town Expedition.
  - **Notifications**: Fonnte (WhatsApp Gateway API) for automated transactional order status (payment received, in production, ready for pick-up/shipped) and OTP verification. Implemented with a **Fail-Safe / Graceful Fallback** pattern: if Fonnte fails or is offline, the web receipt and direct manual WhatsApp action (`wa.me`) guarantee 100% checkout success without blocking the user.
  - **State/data fetching**: TanStack Query (React Query) for all server-state (orders, catalog, admin data) layered ON TOP of Zustand, which stays scoped to purely client/ephemeral UI + 3D state (camera, decal drag position, active tab, etc.) — do not put server data inside Zustand; this is the #1 architecture mistake to avoid.
  - **Validation**: Zod for all API route input/output schemas, shared between client and server via a `src/lib/schemas/` folder.
  - **Background jobs**: Vercel Cron (free on Hobby: daily; Pro: more frequent) for things like abandoned-cart reminders and stale-design cleanup. For anything heavier, a lightweight queue via Upstash QStash (free tier: 500 messages/day) is the 2026 cheap serverless-queue default — no Redis server to manage.

--------------------------------------------------------------------------------
3. FULL DATA MODEL (Prisma schema)
--------------------------------------------------------------------------------

Create `prisma/schema.prisma`. This schema is designed to sit UNDER the
existing `ApparelType`, `ProductColor`, `DecalLayer`, and
`SavedMockupDesign` TypeScript types in `src/lib/constants.ts` — the shapes
should be kept structurally compatible so the Zustand store can serialize
directly into `Design.configSnapshot` (a JSONB column) without a mapping
layer.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------------------------------
// IDENTITY
// ------------------------------------------------------------------

enum UserRole {
  CUSTOMER
  ADMIN
  PRODUCTION_STAFF   // sablon operator, sees only assigned production tasks
  SUPER_ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  phoneNumber   String?   @unique  // E.164, e.g. +6281234567890 — primary
                                    // contact channel for Indonesian users
  name          String?
  passwordHash  String?             // null if OAuth-only
  role          UserRole  @default(CUSTOMER)
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  addresses     Address[]
  designs       Design[]
  orders        Order[]
  cart          Cart?
  sessions      Session[]     // Better Auth session table shape
  accounts      Account[]     // Better Auth OAuth account linking

  @@index([phoneNumber])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  providerId        String  // "google", "credential", "whatsapp-otp"
  accountId         String
  accessToken       String?
  refreshToken      String?
  createdAt         DateTime @default(now())

  @@unique([providerId, accountId])
}

enum DeliveryMethod {
  PICKUP              // Ambil di workshop Kaos Kami Makassar (Rp 0)
  INSTANT_COURIER     // Maxim / GoSend / Grab (Ongkir COD bayar ke driver)
  FLAT_MAKASSAR       // Kurir Internal Flat Rate Makassar
  EXPEDITION_MANUAL   // Ekspedisi Luar Kota (JNE / J&T)
}

model Address {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label         String   // "Rumah", "Kantor", "Workshop Pickup"
  recipientName String
  phoneNumber   String
  province      String?  @default("Sulawesi Selatan")
  city          String?  @default("Makassar")
  district      String?  // kecamatan (Tamalanrea, Rappocini, Panakkukang, dll)
  postalCode    String?
  fullAddress   String   // detail alamat lengkap atau catatan patokan kurir
  notes         String?
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
}

// ------------------------------------------------------------------
// PRODUCT CATALOG
// (Generalizes the existing APPAREL_CATALOG in constants.ts into DB rows
//  so the admin can add new garments — cargo pants, jackets, caps —
//  without a code deploy.)
// ------------------------------------------------------------------

model ApparelCategory {
  id            String    @id @default(cuid())
  slug          String    @unique          // "tshirt" | "hoodie" | "jacket" ...
  name          String                     // "Heavyweight Boxy Tee"
  tagline       String?
  weightGsm     String?                    // "240 / 280 GSM"
  description   String?
  basePriceIdr  Int                        // matches constants.ts basePriceIdr
  sizes         String[]                   // ["S","M","L","XL","XXL"]
  model3dPath   String                     // "/models/tshirt-heavyweight.glb"
  fallbackComponent String                 // "TshirtModel" — maps to a React
                                            // component name registry, see BP-02
  decalNodes    Json                       // [{ id, label, side, anchor:[x,y,z] }]
  isActive      Boolean   @default(true)
  sortOrder     Int       @default(0)

  variants      ProductVariant[]
  designs       Design[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// A ProductVariant is a ready-made, non-custom SKU (e.g. "Heavyweight Tee,
// Obsidian Black, size L, blank/no sablon" OR a pre-designed drop like
// "Kaos Kami x [Artist] Limited Print, size M"). This is what powers the
// classic "browse & buy" catalog experience.
model ProductVariant {
  id              String   @id @default(cuid())
  categoryId      String
  category        ApparelCategory @relation(fields: [categoryId], references: [id])
  sku             String   @unique
  name            String
  colorHex        String
  colorName       String
  size            String
  priceIdr        Int
  stockQty        Int      @default(0)
  images          String[] // R2 URLs: studio-rendered mockup images
  frontDecalUrl   String?  // for pre-designed drops (nullable = blank garment)
  backDecalUrl    String?
  isPreDesigned   Boolean  @default(false) // true = fixed catalog drop
  isActive        Boolean  @default(true)

  cartItems       CartItem[]
  orderItems      OrderItem[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([categoryId])
}

model ColorOption {
  id                String  @id @default(cuid())
  slug              String  @unique
  name              String
  hex               String
  isSpecialPigment  Boolean @default(false)
  surchargeIdr      Int     @default(0)
  description       String?
  sortOrder         Int     @default(0)
}

model MaterialFinish {
  id            String  @id @default(cuid())
  slug          String  @unique   // "combed-cotton" | "french-terry" | "acid-wash"
  name          String
  surchargeIdr  Int     @default(0)
  roughness     Float   @default(0.9)   // feeds directly into the R3F material
  sheen         Float   @default(0.5)
}

model SablonMethod {
  id              String  @id @default(cuid())
  slug            String  @unique  // "dtf" | "plastisol" | "sablon-manual" | "polyflex"
  name            String
  description     String?
  pricingModel    String  // "PER_AREA" | "FLAT"
  // Pricing tiers mirror the existing calculateCustomMockupPrice()
  // A6/A4/A3 sizing buckets in constants.ts:
  priceA6Idr      Int?
  priceA4Idr      Int?
  priceA3Idr      Int?
  flatPriceIdr    Int?
  minTurnaroundDays Int   @default(2)
  maxTurnaroundDays Int   @default(5)
}

// ------------------------------------------------------------------
// DESIGN — the persisted, backend-synced version of Zustand's
// SavedMockupDesign + decals[]. This is the object that both the 3D
// Studio (BLUEPRINT-02) and the Admin production dashboard
// (BLUEPRINT-03) read from.
// ------------------------------------------------------------------

model Design {
  id               String   @id @default(cuid())
  userId           String?  // nullable: guests can build a design pre-signup
  user             User?    @relation(fields: [userId], references: [id])
  categoryId       String
  category         ApparelCategory @relation(fields: [categoryId], references: [id])
  title            String
  colorHex         String
  colorName        String
  size             String
  materialFinishSlug String?
  sablonMethodSlug   String?

  // Full decal layer array — structurally identical to DecalLayer[] in
  // constants.ts so the client can JSON.stringify(state.decals) directly.
  decals           Json     // DecalLayer[]

  studioTheme      String?  // "obsidian" | "gallery" | "concrete"
  calculatedPriceIdr Int
  priceBreakdown   Json     // PriceBreakdown object from calculateCustomMockupPrice()

  // Rendered output — generated server-side once the design is finalized
  // (see BLUEPRINT-02 §6 render pipeline). Used for cart thumbnails,
  // order records, and the admin production ticket.
  previewImageFrontUrl String?
  previewImageBackUrl  String?
  previewImage360Url   String?  // optional turntable sprite/video

  status           DesignStatus @default(DRAFT)
  cartItems        CartItem[]
  orderItems       OrderItem[]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([userId])
}

enum DesignStatus {
  DRAFT           // still being edited in the Studio
  SAVED           // user explicitly saved it ("Saved Designs" tab)
  IN_CART
  ORDERED
  ARCHIVED
}

// ------------------------------------------------------------------
// CART
// ------------------------------------------------------------------

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id              String   @id @default(cuid())
  cartId          String
  cart            Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  // Exactly one of these two is set — a cart line is EITHER a catalog
  // variant OR a custom design, never both.
  productVariantId String?
  productVariant   ProductVariant? @relation(fields: [productVariantId], references: [id])
  designId         String?
  design           Design?  @relation(fields: [designId], references: [id])
  quantity         Int      @default(1)
  unitPriceIdr     Int      // snapshot at time of add-to-cart
  createdAt        DateTime @default(now())
}

// ------------------------------------------------------------------
// ORDER — the core of the admin production dashboard in BLUEPRINT-03.
// ------------------------------------------------------------------

enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_CONFIRMED
  IN_PRODUCTION_QUEUE   // waiting for a sablon slot
  PRINTING              // actively being sablon-ed
  QUALITY_CHECK
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  REFUNDED
}

model Order {
  id                String         @id @default(cuid())
  orderNumber       String         @unique  // human-readable, e.g. KK-20260829-0007
  userId            String
  user              User           @relation(fields: [userId], references: [id])
  status            OrderStatus    @default(PENDING_PAYMENT)
  deliveryMethod    DeliveryMethod @default(PICKUP)

  items             OrderItem[]

  subtotalIdr       Int
  shippingCostIdr   Int            @default(0)
  discountIdr       Int            @default(0)
  totalIdr          Int

  shippingAddressId String?
  shippingAddress   Address?       @relation(fields: [shippingAddressId], references: [id])
  courierNotes      String?        // e.g. "Titip di satpam Unhas" or driver notes
  trackingNumber    String?        // Resi if sent via expedition

  payment           Payment?
  productionTasks   ProductionTask[]
  statusHistory     OrderStatusEvent[]

  notes             String?        // customer notes at checkout
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([userId])
  @@index([status])
}

model OrderItem {
  id                String   @id @default(cuid())
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productVariantId  String?
  productVariant    ProductVariant? @relation(fields: [productVariantId], references: [id])
  designId          String?
  design            Design?  @relation(fields: [designId], references: [id])
  quantity          Int
  unitPriceIdr      Int
  lineTotalIdr      Int
  // Denormalized snapshot fields so the order record survives even if the
  // catalog/design is edited or deleted later — NEVER read live catalog
  // data to render an existing order.
  snapshotName      String
  snapshotImageUrl  String?
  snapshotSize      String
  snapshotColorName String
}

model OrderStatusEvent {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  actorUserId String?   // admin who made the change, null if system/webhook
  createdAt DateTime    @default(now())
}

// ------------------------------------------------------------------
// PAYMENT
// ------------------------------------------------------------------

enum PaymentStatus {
  PENDING
  SETTLEMENT
  EXPIRED
  DENIED
  REFUNDED
  FAILED
}

model Payment {
  id              String        @id @default(cuid())
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])
  provider        String        // "midtrans" | "xendit"
  providerRef     String        // Midtrans order_id / transaction_id
  method          String?       // "qris" | "gopay" | "bank_transfer" | "credit_card"
  amountIdr       Int
  status          PaymentStatus @default(PENDING)
  rawWebhookPayload Json?       // full webhook body for audit/debugging
  paidAt          DateTime?
  expiresAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// ------------------------------------------------------------------
// PRODUCTION — this is the part a generic e-commerce schema does NOT
// have, and it is the backbone of BLUEPRINT-03's admin Kanban.
// ------------------------------------------------------------------

enum ProductionStage {
  DESIGN_PREP     // separating colors / preparing film or DTF file
  SCREEN_PRINT_SETUP
  PRINTING
  CURING
  QUALITY_CHECK
  PACKAGING
  DONE
}

model ProductionTask {
  id               String          @id @default(cuid())
  orderId          String
  order            Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItemId      String
  stage            ProductionStage @default(DESIGN_PREP)
  assignedToUserId String?         // PRODUCTION_STAFF user
  priority         Int             @default(0)  // for manual queue reordering
  dueDate          DateTime?
  notes            String?

  // --- Real-World Sablon Manufacturing Calibration ---
  // Calibrated from 3D model geometry (Max width clamped to 30.0 cm / A3 DTF width)
  printWidthCm     Float?          // Real physical print width in cm (e.g. 28.5)
  printHeightCm    Float?          // Real physical print height in cm (e.g. 16.2)
  placementSide    String?         // "front" | "back"
  offsetFromCollarCm Float?        // Distance in cm from collar baseline
  rawAssetUrl      String?         // High-res 300 DPI original user-uploaded PNG/SVG for DTF RIP software
  mockupPreviewUrl String?         // 3D snapshot render for operator visual guide
  printFileUrl     String?         // Color-separated / prepared film file

  completedAt      DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([stage])
  @@index([assignedToUserId])
}

// ------------------------------------------------------------------
// MISC
// ------------------------------------------------------------------

model Coupon {
  id            String   @id @default(cuid())
  code          String   @unique
  discountType  String   // "PERCENT" | "FIXED"
  discountValue Int
  minSpendIdr   Int      @default(0)
  maxUses       Int?
  usedCount     Int      @default(0)
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
}

model AbandonedCartLog {
  id        String   @id @default(cuid())
  userId    String
  reminderSentAt DateTime?
  createdAt DateTime @default(now())
}
```

--------------------------------------------------------------------------------
4. RELATION TO THE EXISTING ZUSTAND STORE
--------------------------------------------------------------------------------

Do NOT replace `useConfiguratorStore`. Instead:

1. Keep every existing field (`activeApparel`, `selectedColor`, `decals`,
   `modelPosX/Y`, `studioTheme`, etc.) exactly as-is — BLUEPRINT-02 builds on
   top of this state shape.
2. Add a **thin sync layer**, `src/lib/designSync.ts`, that:
   - Debounces (1.5s) writes of the current Studio state to
     `POST /api/designs/:id/autosave` while `viewMode === "studio"`.
   - On `saveCurrentDesign()`, additionally calls
     `POST /api/designs` (create) or `PATCH /api/designs/:id` (update) so
     the design exists in Postgres, not just `localStorage`.
   - Keep `localStorage` as an **offline-first cache** — if the network
     call fails (e.g. flaky mobile connection), queue it and retry. This
     matters a lot for the mobile-first Indonesian user base.
3. Replace the `savedDesigns` array's source of truth: on mount, if the
   user is authenticated, hydrate `savedDesigns` from
   `GET /api/designs?userId=me&status=SAVED` instead of (or merged with)
   `localStorage`. Guests keep using `localStorage` only, and get a
   "Login to save your design permanently" prompt — this mirrors how
   VirtualThreads and 3dmockups.app both let you use the tool with zero
   friction before ever asking for an account.

--------------------------------------------------------------------------------
5. API SURFACE (Next.js Route Handlers, `src/app/api/**/route.ts`)
--------------------------------------------------------------------------------

Group by domain. All routes validate input/output with Zod schemas from
`src/lib/schemas/`. All mutating routes require an authenticated session
except where marked (guest).

**Catalog (public, cached aggressively — see BLUEPRINT-04 for caching
strategy with Next.js `revalidate`)**
  - `GET  /api/catalog/categories` — list ApparelCategory (+ variants count)
  - `GET  /api/catalog/categories/:slug` — full detail incl. decalNodes,
    3D model path, sizes, base price
  - `GET  /api/catalog/variants?categoryId=&color=&size=` — filterable
    product listing for the "browse & buy" store view
  - `GET  /api/catalog/colors`, `/api/catalog/materials`,
    `/api/catalog/sablon-methods`

**Designs (guest-allowed for create/autosave; auth required to persist
long-term)**
  - `POST   /api/designs` (guest) — create draft
  - `GET    /api/designs/:id` (guest via id, or auth+ownership)
  - `PATCH  /api/designs/:id` — update decals/color/size/etc.
  - `POST   /api/designs/:id/autosave` (guest) — lightweight partial update
  - `POST   /api/designs/:id/render` — triggers server-side mockup render
    (see BLUEPRINT-02 §6); returns job id, client polls
    `GET /api/designs/:id/render/status`
  - `DELETE /api/designs/:id`
  - `GET    /api/designs?userId=me&status=` (auth)
  - `POST   /api/designs/:id/claim` — attaches a guest-created design
    (identified by a signed cookie token) to the now-authenticated user,
    called right after signup/login so nothing is lost mid-funnel.

**Cart (auth required — see BLUEPRINT-04 for the guest-cart-in-cookie
fallback pattern if you want true guest checkout)**
  - `GET    /api/cart`
  - `POST   /api/cart/items` — body: `{ productVariantId? , designId?, quantity }`
  - `PATCH  /api/cart/items/:id` — update quantity
  - `DELETE /api/cart/items/:id`
  - `POST   /api/cart/apply-coupon`

**Checkout & Orders**
  - `POST   /api/checkout/shipping-quote` — body: destination district +
    total weight; proxies to RajaOngkir/Biteship (see §8); returns courier
    options with cost + ETA
  - `POST   /api/checkout` — creates `Order` (status `PENDING_PAYMENT`),
    creates `Payment` record, calls Midtrans Snap API, returns
    `{ orderId, snapToken, redirectUrl }`
  - `GET    /api/orders` (auth) — user's own order history
  - `GET    /api/orders/:id` (auth+ownership OR admin)
  - `POST   /api/orders/:id/cancel` (auth+ownership, only if still
    `PENDING_PAYMENT`)

**Payment webhooks (server-to-server, signature-verified, no session)**
  - `POST /api/webhooks/midtrans` — verifies `signature_key`
    (SHA512 of `order_id+status_code+gross_amount+ServerKey`), updates
    `Payment.status`, on `settlement`/`capture` transitions
    `Order.status -> PAYMENT_CONFIRMED`, creates initial `ProductionTask`
    rows for each order item, and fires the WhatsApp "pesanan
    dikonfirmasi" notification.

**Admin (role-gated — see BLUEPRINT-03 for full surface, listed here for
completeness of the API map)**
  - `GET/PATCH /api/admin/orders`, `/api/admin/orders/:id/status`
  - `GET/PATCH /api/admin/production-tasks`
  - `GET/POST/PATCH/DELETE /api/admin/catalog/*`
  - `GET /api/admin/dashboard/metrics` — revenue, order count, production
    backlog, low-stock alerts

--------------------------------------------------------------------------------
6. PAYMENT INTEGRATION — MIDTRANS SNAP (primary) with an abstraction layer
--------------------------------------------------------------------------------

Rationale (from 2026 market research): Midtrans and Xendit are both solid
and both support QRIS, GoPay, bank transfer VA, and cards. QRIS fee is
regulated at 0.7% on both — not a differentiator. Midtrans wins for a
single-shop UMKM because:
  - It is part of GoTo, giving smoother native GoPay UX (Indonesia's
    largest e-wallet), which matters directly for conversion.
  - It is the simplest integration for a single-merchant, non-recurring,
    non-disbursement use case — Kaos Kami does not need Xendit's
    disbursement/payout-to-many-sellers feature since this is not a
    marketplace.
  - No minimum fee, well-documented Snap.js embeddable checkout widget
    that avoids a full redirect (keeps the user in your branded flow).

Build a provider-agnostic interface so Xendit (or DOKU) can be swapped in
without touching business logic:

```ts
// src/lib/payments/PaymentProvider.ts
export interface CreateChargeInput {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: { name: string; email?: string; phone: string };
  itemDetails: { id: string; name: string; price: number; quantity: number }[];
}

export interface CreateChargeResult {
  providerRef: string;
  snapToken?: string;      // Midtrans Snap
  redirectUrl?: string;    // fallback / Xendit invoice URL
}

export interface PaymentProvider {
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(payload: unknown): {
    providerRef: string;
    status: "PENDING" | "SETTLEMENT" | "EXPIRED" | "DENIED" | "REFUNDED" | "FAILED";
    method?: string;
  };
}
```

```ts
// src/lib/payments/midtransProvider.ts
import crypto from "crypto";
import type { PaymentProvider } from "./PaymentProvider";

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export const midtransProvider: PaymentProvider = {
  async createCharge(input) {
    const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
    const res = await fetch(MIDTRANS_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amountIdr,
        },
        customer_details: {
          first_name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
        },
        item_details: input.itemDetails,
        enabled_payments: ["gopay", "qris", "bank_transfer", "credit_card"],
        callbacks: { finish: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success` },
      }),
    });
    const data = await res.json();
    return {
      providerRef: input.orderId,
      snapToken: data.token,
      redirectUrl: data.redirect_url,
    };
  },

  verifyWebhookSignature(rawBody, _headers) {
    const body = JSON.parse(rawBody);
    const expected = crypto
      .createHash("sha512")
      .update(
        `${body.order_id}${body.status_code}${body.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
      )
      .digest("hex");
    return expected === body.signature_key;
  },

  parseWebhookEvent(payload) {
    const body = payload as any;
    const statusMap: Record<string, any> = {
      capture: "SETTLEMENT",
      settlement: "SETTLEMENT",
      pending: "PENDING",
      deny: "DENIED",
      expire: "EXPIRED",
      cancel: "DENIED",
      refund: "REFUNDED",
    };
    return {
      providerRef: body.order_id,
      status: statusMap[body.transaction_status] ?? "FAILED",
      method: body.payment_type,
    };
  },
};
```

Client-side, load Snap.js and open the embedded modal rather than a hard
redirect:

```tsx
// src/components/checkout/MidtransSnapButton.tsx
"use client";
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js"; // swap to
                                                                  // app.midtrans.com in prod
  script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!);
  document.body.appendChild(script);
  return () => { document.body.removeChild(script); };
}, []);

function payNow(snapToken: string) {
  // @ts-expect-error snap injected globally by the script tag
  window.snap.pay(snapToken, {
    onSuccess: () => router.push(`/orders/${orderId}?status=success`),
    onPending: () => router.push(`/orders/${orderId}?status=pending`),
    onError: () => toast.error("Pembayaran gagal, silakan coba lagi."),
    onClose: () => toast("Pembayaran dibatalkan."),
  });
}
```

Webhook idempotency rule (critical): the handler MUST be safe to receive
the same webhook twice. Use `providerRef` (the order_id) as the natural
idempotency key — if `Payment.status` is already `SETTLEMENT`, no-op on a
repeat `settlement` event rather than re-firing notifications or
re-creating `ProductionTask` rows.

--------------------------------------------------------------------------------
7. NOTIFICATIONS — WHATSAPP-FIRST (Fonnte)
--------------------------------------------------------------------------------

Indonesian UMKM customers live in WhatsApp, not email. Treat WhatsApp as
the PRIMARY channel and email as a backup/receipt-only channel.

```ts
// src/lib/notifications/whatsapp.ts
export async function sendWhatsApp(target: string, message: string) {
  await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_TOKEN!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ target, message }),
  });
}

export function orderConfirmedMessage(order: {
  orderNumber: string; totalIdr: number; itemsSummary: string;
}) {
  return [
    `*Kaos Kami — Pesanan Dikonfirmasi* ✅`,
    ``,
    `No. Pesanan: ${order.orderNumber}`,
    `Item: ${order.itemsSummary}`,
    `Total: Rp ${order.totalIdr.toLocaleString("id-ID")}`,
    ``,
    `Pesananmu sekarang masuk antrian produksi sablon. Kami akan kabari`,
    `lagi begitu mulai dicetak dan saat sudah dikirim. Terima kasih! 🙏`,
  ].join("\n");
}
```

Trigger points (wire these into the webhook handler and admin status
transitions from BLUEPRINT-03):
  - Payment confirmed → "Pesanan Dikonfirmasi"
  - Production stage → `PRINTING` → "Desainmu sedang dicetak"
  - Order status → `SHIPPED` → include `trackingNumber` + courier tracking
    link
  - Order status → `CANCELLED`/`REFUNDED` → apologetic, clear next steps

Cost note: Fonnte's free tier (1,000 messages, no attachments) is enough
for early testing/demo; budget ~Rp135.000–175.000/month once order volume is
real. 

**Fail-Safe / Graceful Fallback Pattern (Non-blocking):**
Notifications to WhatsApp are executed asynchronously with a `try/catch` wrapper.
If Fonnte is rate-limited, offline, or returns an error:
1. The checkout and order database transactions still succeed 100%.
2. The user is redirected to the web digital invoice (`/orders/[id]`).
3. The invoice provides a direct manual WhatsApp button (`https://wa.me/628xxx?text=...`) as an infallible fallback.

--------------------------------------------------------------------------------
8. SHIPPING & FULFILLMENT — HYPERLOCAL MAKASSAR DELIVERY ENGINE
--------------------------------------------------------------------------------

Rather than introducing external API complexity and rate-limit points of failure
(such as RajaOngkir Starter) for a local Makassar business, Kaos Kami operates
a clean, transparent **Hyperlocal Fulfillment Model**:

1. **`PICKUP` — Ambil Sendiri di Workshop Kaos Kami (Rp 0)**
   - The primary choice for local students (Unhas, UNM, UIN) and community members.
   - Requires zero courier fee; customer receives notification when order reaches `READY_TO_PICKUP`.
2. **`INSTANT_COURIER` — Kurir Instan Makassar (Maxim / GoSend / GrabExpress)**
   - Ideal for same-day delivery inside Makassar.
   - Shipping fee is COD (paid directly to the driver upon delivery) or flat estimation.
3. **`FLAT_MAKASSAR` — Kurir Internal / Flat Rate Kota Makassar (Rp 10.000 - Rp 15.000)**
   - Fixed delivery fee calculated automatically during checkout for Makassar addresses.
4. **`EXPEDITION_MANUAL` — Ekspedisi Luar Kota (JNE / J&T / SiCepat)**
   - For orders outside Makassar; admin inputs waybill/resi manually or confirms via WhatsApp.

```ts
// src/lib/shipping/types.ts
export type DeliveryMethod = "PICKUP" | "INSTANT_COURIER" | "FLAT_MAKASSAR" | "EXPEDITION_MANUAL";

export interface DeliveryOption {
  method: DeliveryMethod;
  name: string;
  description: string;
  costIdr: number;
  isCodShippingFee?: boolean;
}

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    method: "PICKUP",
    name: "Ambil di Workshop Kaos Kami",
    description: "Ambil langsung di workshop Makassar setelah sablon selesai (Gratis)",
    costIdr: 0,
  },
  {
    method: "INSTANT_COURIER",
    name: "Kurir Instan (Maxim / GoSend / GrabExpress)",
    description: "Dikirim langsung begitu selesai cetak. Ongkir dibayar ke driver (COD)",
    costIdr: 0,
    isCodShippingFee: true,
  },
  {
    method: "FLAT_MAKASSAR",
    name: "Kurir Regular Flat Makassar",
    description: "Pengantaran area Kota Makassar (1-2 hari setelah produksi)",
    costIdr: 15000,
  },
  {
    method: "EXPEDITION_MANUAL",
    name: "Ekspedisi Luar Kota (JNE / J&T)",
    description: "Pengiriman luar kota Makassar (Resi diinput setelah kirim)",
    costIdr: 25000,
  },
];
```

This hyperlocal architecture eliminates API downtime risks, provides an intuitive checkout UX, and accurately mirrors real-world purchasing behavior in Kota Makassar.

--------------------------------------------------------------------------------
9. ORDER LIFECYCLE STATE MACHINE
--------------------------------------------------------------------------------

```
PENDING_PAYMENT
   │  (Midtrans webhook: settlement/capture)
   ▼
PAYMENT_CONFIRMED  ──► ProductionTask rows auto-created for each item
   │  (admin moves task to production, see BLUEPRINT-03 Kanban)
   ▼
IN_PRODUCTION_QUEUE
   │
   ▼
PRINTING  ──► WhatsApp: "sedang dicetak"
   │
   ▼
QUALITY_CHECK
   │
   ▼
READY_FOR_FULFILLMENT  ──► Ready for Workshop Pickup OR Instant Courier Dispatch
   │
   ▼
SHIPPED / PICKED_UP  ──► WhatsApp notification + Digital Receipt updated
   │
   ▼
DELIVERED / COMPLETED
```

Any state before SHIPPED can transition to CANCELLED (customer request or
admin decision, e.g. stock issue) or REFUNDED (post-payment cancellation),
both of which must trigger a WhatsApp notice and — if REFUNDED — a manual
Midtrans refund action logged in `OrderStatusEvent`.
```

Every transition MUST write an `OrderStatusEvent` row (append-only audit
log) — this is what BLUEPRINT-03's order detail timeline renders, and it
is also the cheapest possible customer-support tool: "cek riwayat
pesanan" resolves 80% of "mana pesanan saya" WhatsApp messages without a
human needing to dig through logs.

--------------------------------------------------------------------------------
10. COMPREHENSIVE PRICING ENGINE — MULTI-VARIABLE COST CALCULATION
--------------------------------------------------------------------------------

The pricing engine is modeled directly on the real-world operational costing
standards of the Makassar custom apparel & DTF screen-printing industry. It
calculates total garment cost dynamically across 6 distinct pricing variables:

```ts
// src/lib/pricingEngine.ts

export interface PricingFactors {
  apparel: "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt";
  fabricThickness: "30s" | "24s" | "20s" | "16s-heavyweight" | "french-terry-380";
  sleeveType: "short" | "long-ribbed";
  size: "S" | "M" | "L" | "XL" | "XXL" | "XXXL";
  colorTreatment: "solid" | "special-pigment" | "acid-wash";
  decals: Array<{
    targetSide: "front" | "back" | "sleeve";
    widthCm: number;
    heightCm: number;
  }>;
  quantity: number;
}
```

### 1. Fabric Thickness & Gramasi (GSM) Matrix:
- **Cotton Combed 30s (140-150 GSM):** Lightweight, breathable everyday standard (`basePriceIdr`).
- **Cotton Combed 24s (175-185 GSM):** Medium-heavy, most popular distro standard in Makassar (`+Rp 10.000`).
- **Cotton Combed 20s (190-210 GSM):** Heavy cotton, structured drape (`+Rp 15.000`).
- **Heavyweight 16s (240-280 GSM):** High-end streetwear drop-shoulder boxy cut (`+Rp 25.000`).
- **Loopback French Terry (330-380 GSM):** For Crewneck Sweaters & Heavyweight Hoodies.

### 2. Sleeve Type Variance:
- **Short Sleeve (Lengan Pendek):** Standard (`+Rp 0`).
- **Long Sleeve with 5cm Ribbed Cuffs (Lengan Panjang):** (`+Rp 20.000`).

### 3. Print Area Tier Variance (Calibrated DTF Sablon, Max 30cm):`
- **A6 Mini / Pocket Chest (≤ 10 × 10 cm):** `+Rp 10.000` per layer.
- **A5 Medium Chest (≤ 15 × 20 cm):** `+Rp 15.000` per layer.
- **A4 Standard Print (≤ 21 × 30 cm):** `+Rp 25.000` per layer.
- **A3 Extra Large (≤ 30 × 42 cm - Max limit):** `+Rp 35.000` per layer.
- *Multi-position support: Each front, back, and sleeve decal layer is priced independently based on its computed physical centimeter bounding box.*

### 4. Size Surcharge Variance:
- **S, M, L, XL:** Standard (`+Rp 0`).
- **XXL:** `+Rp 10.000` (extra fabric consumption).
- **XXXL (Jumbo):** `+Rp 20.000`.

### 5. Color & Pigment Treatment:
- **Solid Regular Colors:** (Obsidian Black, Chalk Ecru, Navy, Maroon, Sage) (`+Rp 0`).
- **Acid Wash / Vintage Mineral Dye:** (`+Rp 30.000`).

### 6. Volume Wholesale Tier Discounts (Grosir Komunitas & Event):
- **1 – 5 pcs (Satuan Custom):** 100% (Normal price).
- **6 – 12 pcs (Lusinan / Mini-Bulk):** 5% Discount.
- **13 – 50 pcs (Komunitas / Kelas Kampus):** 12% Discount.
- **> 50 pcs (Partai Besar / Event):** 20% Discount.

`calculateCustomMockupPrice()` computes this instantly on the client side for
real-time visual feedback, while `POST /api/checkout` validates the exact same
calculation server-side against database pricing rules before opening Midtrans Snap.

--------------------------------------------------------------------------------
11. SECURITY & COMPLIANCE CHECKLIST
--------------------------------------------------------------------------------

- [ ] All admin routes gated by `role IN (ADMIN, SUPER_ADMIN, PRODUCTION_STAFF)`
      checked server-side in the route handler, never trust a client role claim.
- [ ] Rate-limit `/api/checkout`, `/api/designs`, and auth routes
      (Upstash Ratelimit, free tier sufficient at this scale).
- [ ] Validate every uploaded decal image: MIME type allow-list
      (png/jpg/webp/svg-sanitized), max 10MB, server-side re-encode
      (via `sharp`) before storing in R2 — never store/serve a raw
      user-uploaded file verbatim (XSS/SVG-script risk, malformed-image
      DoS risk).
- [ ] Midtrans/webhook endpoints verify signature before trusting payload
      (see §6) — never update `Order.status` from an unverified webhook.
- [ ] UU PDP (Indonesia's Personal Data Protection Law) applies: store a
      clear privacy notice, only collect the address/phone data needed for
      fulfillment, and support account/data deletion requests.
- [ ] Never log full card numbers or Midtrans server key; use
      `.env.local` (gitignored, already the case per `.gitignore`) and
      Vercel/host environment variable manager for production secrets.

--------------------------------------------------------------------------------
12. IMPLEMENTATION ROADMAP (Phase 1 of the overall 4-blueprint build)
--------------------------------------------------------------------------------

1. `npm install prisma @prisma/client zod @tanstack/react-query better-auth`
   and initialize Prisma against a fresh Supabase Postgres instance.
2. Author `prisma/schema.prisma` exactly as §3, run
   `npx prisma migrate dev --name init`.
3. Seed the catalog (`prisma/seed.ts`) from the CURRENT
   `APPAREL_CATALOG` / `PRODUCT_COLORS` objects in `constants.ts` so day
   one the DB matches what's already shipped — zero visual regression.
4. Wire Better Auth (`src/lib/auth.ts` + `src/app/api/auth/[...all]/route.ts`),
   add login/signup UI (email/password + Google OAuth) as a modal, not a
   full page redirect — keep the user inside the immersive 3D experience.
5. Build `src/lib/designSync.ts` and wire it into
   `useConfiguratorStore` per §4 — this is the highest-leverage step
   because BLUEPRINT-02 and BLUEPRINT-03 both depend on Designs existing
   server-side.
6. Implement the Cart + Checkout API routes and the Midtrans provider
   (§5, §6). Build the checkout UI (address form, shipping quote,
   Snap payment).
7. Implement the webhook handler + WhatsApp notification triggers (§6, §7).
8. Implement shipping quote provider (§8).
9. Run `npm run typecheck && npm run lint && npm run build` after every
   step — do not batch all 8 steps before the first verification.

================================================================================
END OF BLUEPRINT 01 — proceed to BLUEPRINT-02-MOCKUP-STUDIO-ENGINE.md
================================================================================
