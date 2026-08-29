# ================================================================================
# KAOS KAMI — MASTER BUILD PROGRESS & EXECUTION TRACKER
# ================================================================================
# Project: Rancang Bangun Platform E-Commerce Berbasis 3D Interactive Mockup untuk Optimalisasi Pemesanan UMKM Kaos Kami di Kota Makassar
# Standard: Commercial-Ready Web-to-Print E-Commerce & Academic Thesis Standard (Semester 7)
# Architecture: Next.js 14 App Router, Three.js / React Three Fiber, Turso libSQL Edge SQLite, Cloudflare Pages + R2, Midtrans Snap, Better Auth, Fonnte / wa.me
# Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git
# ================================================================================

This master document tracks every single task, architectural decision, and milestone across all 4 Blueprints. Every task completed MUST be marked as `[x]` with the completion date and verified against the criteria.

---

## 🏛️ CORE ARCHITECTURAL DECISIONS (IMMUTABLE GROUND RULES)

1. **Database Strategy:**
   - **Provider:** Turso (libSQL Edge SQLite) via `@prisma/adapter-libsql` or `@libsql/client`.
   - **Key Advantage:** 9 GB free storage, 24/7 Always-On (0ms cold start, NEVER auto-pauses/sleeps like Supabase).
2. **Media & 3D Asset Storage:**
   - **Provider:** Cloudflare R2 (S3-compatible API).
   - **Key Advantage:** 10 GB free storage, **$0.00 / Zero Egress Bandwidth Fees** (unlimited downloads).
3. **Frontend & Serverless Hosting:**
   - **Provider:** Cloudflare Pages (via `@opennextjs/cloudflare`) for 100% legal commercial free tier (with Vercel Hobby option for academic thesis evaluation).
   - **Worker Limit Strategy:** 3D & GSAP bundles are strictly client-side (`use client` + dynamic imports) in Pages Static CDN; Server Worker is kept lean (< 1.2 MB, well below Cloudflare's 3 MB limit).
4. **Physical Scale Calibration (DTF Sablon Standard):**
   - **Garment Chest Reference:** 54.0 cm chest width (Size L).
   - **Max Print Limit:** **30.0 cm maximum width** (clamped to physical A3 DTF printhead roll limit).
   - **Formula:** `printWidthCm = Math.min(30.0, decalScale * 30.0)`.
5. **Hyperlocal Makassar Fulfillment (No RajaOngkir):**
   - Self Pick-up at Workshop (Rp 0).
   - Instant Courier Maxim / GoSend / GrabExpress (COD shipping fee).
   - Flat Rate Makassar (Rp 15.000).
6. **Payment & Notifications:**
   - **Payment:** Midtrans Snap (QRIS 0.7%, Virtual Accounts, E-Wallet).
   - **WhatsApp:** Automated via Fonnte + Fail-Safe Native `wa.me` manual fallback + Web receipt.

---

## 🗺️ MASTER 5-PHASE EXECUTION CHECKLIST

---

### 📦 FASE 1: Fondasi Database, Autentikasi & Data Core (Blueprint 01 & 04)
*Status: READY TO EXECUTE*

- [ ] **1.1. Package Installation & Prisma Setup**
  - [ ] Install Prisma dependencies: `prisma`, `@prisma/client`, `@prisma/adapter-libsql`, `@libsql/client`, `zod`, `@tanstack/react-query`, `better-auth`.
  - [ ] Setup `prisma/schema.prisma` with SQLite provider and `driverAdapters` preview feature.
  - [ ] Setup `.env.local` with `DATABASE_URL` (local `file:dev.db` and Turso cloud `libsql://...`).
- [ ] **1.2. Complete Prisma Data Schema**
  - [ ] `User` model (id, phoneNumber, email, name, passwordHash, role: CUSTOMER/ADMIN/PRODUCTION_STAFF).
  - [ ] `Session` model (Better Auth session management).
  - [ ] `Product` & `ProductColor` models (supporting 5 apparel types, colors, GSM thicknesses).
  - [ ] `Design` model (title, configSnapshot JSON string, rawAssetUrl, previewUrl, userId).
  - [ ] `Order` & `OrderItem` models (orderNumber, status, deliveryMethod, shippingAddress, totalPriceIdr).
  - [ ] `ProductionTask` model (status: QUEUE/PRINTING/QC/READY, printWidthCm, printHeightCm, offsetFromCollarCm, operatorId).
  - [ ] `Address` model (recipientName, phoneNumber, streetAddress, subdistrict, city, notes).
  - [ ] `OrderStatusEvent` model (audit log for order timeline).
- [ ] **1.3. Catalog Database Seed Script**
  - [ ] Create `prisma/seed.ts` seeding 5 apparel types (`tshirt`, `longsleeve`, `crewneck`, `hoodie`, `shirt`).
  - [ ] Seed color options (Obsidian Black, Chalk Ecru, Navy, Maroon, Sage Green, Acid Wash).
  - [ ] Seed fabric thickness options (Combed 30s, 24s, 20s, 16s Heavyweight, French Terry 380 GSM).
  - [ ] Execute `npx prisma db seed` and verify data integrity.
- [ ] **1.4. Better Auth Integration**
  - [ ] Setup `src/lib/auth.ts` with credentials (Phone Number/WhatsApp + Password) and session cookies.
  - [ ] Setup route handler `src/app/api/auth/[...all]/route.ts`.
  - [ ] Setup Login & Register Modal component with Guest Checkout support.
- [ ] **1.5. TanStack Query & Server State Infrastructure**
  - [ ] Create `src/lib/queryClient.ts` and `src/components/providers/QueryProvider.tsx`.
  - [ ] Verify TypeScript compilation: `npm run typecheck`.

---

### 🎨 FASE 2: Peningkatan Mesin 3D Mockup Studio (Blueprint 02 & 04)
*Status: QUEUED*

- [ ] **2.1. Physical Scale & Calibration Engine**
  - [ ] Create `src/lib/scaleCalibration.ts` with `REAL_WORLD_PRINT_LIMITS` (max 30.0 cm width, max 42.0 cm height).
  - [ ] Create `computePhysicalPrintDimensions()` converting 3D UV space to exact centimeters (`printWidthCm`, `printHeightCm`, `offsetFromCollarCm`).
  - [ ] Add live dimension badge in Studio UI (`📏 28.5 cm × 14.2 cm (Maks 30 cm)`).
- [ ] **2.2. Real-Time DPI & Image Quality Analyzer**
  - [ ] Create `src/lib/dpiAnalyzer.ts` computing effective print DPI.
  - [ ] Display real-time badges: 🟢 300+ DPI (HD Tajam), 🟡 150-299 DPI (Cukup), 🔴 <150 DPI (Peringatan Pecah/Blur).
  - [ ] Transparency & JPG white-background advisor tip.
- [ ] **2.3. Automated Image Enhancer & Background Cleanup Suite**
  - [ ] Create `src/lib/enhancers/removeSolidBackground.ts` (instant <10ms Canvas Chroma-Key algorithm).
  - [ ] Add `[ ✨ Hapus Background Putih (1-Klik) ]` button in Customizer Drawer.
  - [ ] Serverless Sharp image sharpening route (`/api/enhance-image`) for edge cleanup and de-noising.
- [ ] **2.4. Direct-Manipulation Decal Gizmo on 3D Mesh**
  - [ ] Implement direct touch/pointer manipulation bounding box overlay on the 3D garment.
  - [ ] Gesture ownership handoff: Disable `OrbitControls` while actively dragging/scaling decals.
- [ ] **2.5. Multi-Apparel 3D Geometry & Material Support**
  - [ ] Verify and support 5 apparel meshes (`tshirt`, `longsleeve`, `crewneck`, `hoodie`, `shirt`).
  - [ ] PBR `MeshPhysicalMaterial` with fabric sheen, roughness, and procedural micro-weave normal maps.
- [ ] **2.6. Adaptive Device Tiering Hook**
  - [ ] Create `src/hooks/useDeviceTier.ts` detecting hardware capability (`high`, `mid`, `low`, `no-webgl`).
  - [ ] Connect `StaticShowcase.tsx` as automatic 2D Canvas/SVG fallback on low-end devices.

---

### 💳 FASE 3: Mesin E-Commerce, Pricing & Transaksi Midtrans (Blueprint 01)
*Status: QUEUED*

- [ ] **3.1. Dynamic 6-Variable Pricing Engine**
  - [ ] Create `src/lib/pricingEngine.ts` calculating:
    - Base apparel price
    - Fabric thickness surcharge (30s, 24s +10k, 20s +15k, 16s +25k)
    - Sleeve surcharge (Longsleeve +20k)
    - Per-decal print area tier (A6 +10k, A5 +15k, A4 +25k, A3 max 30cm +35k)
    - Size surcharge (XXL +10k, XXXL +20k)
    - Volume wholesale discounts (6-12 pcs -5%, 13-50 pcs -12%, >50 pcs -20%).
- [ ] **3.2. Cart & Design Persistence Layer**
  - [ ] Setup `/api/cart` and `/api/designs` routes storing config snapshots to Turso DB.
  - [ ] Server-side price re-validation in `POST /api/checkout` (never trust client total).
- [ ] **3.3. Hyperlocal Makassar Checkout UI**
  - [ ] Delivery method selector: Pick-up at Workshop (Rp 0), Maxim Instant COD, Flat Makassar (Rp 15.000).
  - [ ] SLA turnaround selector: Reguler (2-3 hari) vs Express 24 Jam (+Rp 25.000).
  - [ ] Address input form with Makassar subdistricts validation.
- [ ] **3.4. Midtrans Snap Payment Gateway Integration**
  - [ ] Setup `src/lib/payments/midtrans.ts` (Server SDK & Snap token generator).
  - [ ] Client Snap popup modal trigger.
  - [ ] Setup Webhook Handler `src/app/api/webhooks/midtrans/route.ts` with signature verification.
  - [ ] On `settlement`/`capture`: Update Order to `PAYMENT_CONFIRMED` and auto-generate `ProductionTask` rows.
- [ ] **3.5. Transactional WhatsApp Notification Engine**
  - [ ] Setup `src/lib/notifications/whatsapp.ts` (Fonnte API integration with try/catch fail-safe).
  - [ ] Automated triggers: Payment Received (Invoice), In Production, Ready for Pick-up / Shipped.
  - [ ] Public Digital Receipt page (`/orders/[id]`) with direct `wa.me` manual confirmation button.

---

### 🏭 FASE 4: Dashboard Admin & Workshop Kanban Produksi DTF (Blueprint 03)
*Status: QUEUED*

- [ ] **4.1. Role-Gated Admin Authentication & Layout**
  - [ ] Admin layout (`src/app/admin/layout.tsx`) protected for `ADMIN` and `PRODUCTION_STAFF` roles.
  - [ ] Metric cards: Total Omset, Pesanan Aktif, Antrean Sablon DTF, SLA Express Alerts.
- [ ] **4.2. DTF Sablon Production Kanban Board**
  - [ ] Drag-and-drop Kanban columns: `Antrean Verifikasi` $\rightarrow$ `Sedang Dicetak DTF` $\rightarrow$ `Press & QC` $\rightarrow$ `Siap Diambil/Kirim`.
  - [ ] Moving cards updates `ProductionTask.status` and triggers customer WhatsApp updates.
- [ ] **4.3. Admin Order Detail & 360° 3D Inspector**
  - [ ] Dedicated order page (`/admin/orders/[id]`) with interactive 3D model inspector.
  - [ ] Real-world dimensions display: `printWidthCm`, `printHeightCm`, `offsetFromCollarCm`.
- [ ] **4.4. Operator Job Ticket Generator (PDF)**
  - [ ] Generate printable PDF Job Ticket for the workshop press operator with technical specs.
- [ ] **4.5. High-Res Master Asset Vault**
  - [ ] One-click download button for original 300 DPI master PNG/SVG artwork for AcroRIP software.
- [ ] **4.6. Customer Account Portal**
  - [ ] Customer dashboard (`/dashboard/orders`) showing active order status timeline and saved designs gallery.

---

### ⚡ FASE 5: Optimasi Cloudflare, PWA & Production Launch (Blueprint 04)
*Status: QUEUED*

- [ ] **5.1. 3D Model Asset Compression**
  - [ ] Run Draco geometry compression on `hoodie.glb` (< 2.0 MB) and `jacket.glb` (< 1.5 MB).
- [ ] **5.2. PWA & Mobile Polish**
  - [ ] Setup `public/manifest.json`, app icons, theme-color metadata.
  - [ ] Service worker registration for offline asset caching.
- [ ] **5.3. Cloudflare Pages & Workers Verification**
  - [ ] Verify server worker compressed size remains < 1.2 MB.
  - [ ] Test Next.js App Router compilation with `@opennextjs/cloudflare`.
- [ ] **5.4. Final End-to-End Quality Audit**
  - [ ] `npm run typecheck` (0 errors).
  - [ ] `npm run lint` (0 errors).
  - [ ] `npm run build` (Clean production build).
  - [ ] Complete user walkthrough test: Landing $\rightarrow$ 3D Studio $\rightarrow$ Cart $\rightarrow$ Midtrans Sandbox $\rightarrow$ Admin Kanban $\rightarrow$ Job Ticket PDF.

---

## 📈 LOG HARIAN PENGERJAAN (DAILY WORKLOG)

| Tanggal | Fase | Rincian Tugas yang Dikerjakan | Status |
| :--- | :---: | :--- | :---: |
| **2026-08-30** | **Perencanaan** | Sinkronisasi 4 Blueprint, Arsitektur Turso libSQL, Cloudflare Pages, Skala 30cm, dan Pembuatan Build Progress Tracker. | ✅ Selesai |
| *Upcoming* | **Fase 1** | Setup Turso libSQL, Prisma Schema lengkap, Database Seed, dan Better Auth. | ⏳ Menunggu Eksekusi |

---
*Dokumen ini diperbarui secara otomatis setiap kali ada fitur yang selesai dikerjakan.*
