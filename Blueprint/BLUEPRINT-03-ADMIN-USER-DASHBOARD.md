================================================================================
KAOS KAMI — BLUEPRINT 03 / 04
ADMIN DASHBOARD (SABLON PRODUCTION + ORDER OPS) & USER DASHBOARD
================================================================================
Version: 1.0 · Depends on: BLUEPRINT-01 (data model, order state machine,
API surface), BLUEPRINT-02 (Design preview images used throughout these
UIs). Read both first.

--------------------------------------------------------------------------------
0. WHY THIS IS NOT "JUST AN ORDER LIST"
--------------------------------------------------------------------------------

A generic e-commerce admin (WooCommerce-style order table) is not enough
for Kaos Kami because sablon printing is a physical, multi-step production
process with its own bottlenecks: someone has to separate the artwork,
prepare a screen/film or DTF file, print, cure, quality-check, and package
— and each of those steps can be a queue with its own delay. The admin
dashboard's core job is to make that physical workflow visible and
manageable, not just show "orders."

Two audiences, two surfaces:
  1. **Admin Dashboard** (`/admin/*`, role `ADMIN`/`SUPER_ADMIN`) — full
     order management, production Kanban, catalog management, and
     business metrics.
  2. **Production Staff view** (`/admin/production`, role
     `PRODUCTION_STAFF`) — a stripped-down subset of the admin dashboard:
     only the production Kanban, scoped to tasks assigned to them or
     unassigned. This role should NOT see revenue, customer PII beyond
     what's needed to print an address label, or catalog management.
  3. **User Dashboard** (`/account/*`, any authenticated `CUSTOMER`) —
     deliberately simple: order history/tracking, saved designs, saved
     addresses, profile. Do not over-build this; the brief explicitly
     calls it "simple."

--------------------------------------------------------------------------------
1. ROUTE MAP
--------------------------------------------------------------------------------

```
src/app/admin/
  layout.tsx                    — role gate (redirect non-admins), admin nav shell
  page.tsx                      — dashboard home: metrics + today's production queue
  orders/
    page.tsx                    — full order table, filters, search
    [id]/page.tsx                — order detail: items, timeline, actions
  production/
    page.tsx                    — Kanban board (see §3)
  catalog/
    page.tsx                    — category/variant/color/material CRUD
    categories/[id]/page.tsx
  customers/
    page.tsx                    — customer list (support/lookup use case)
    [id]/page.tsx
  coupons/
    page.tsx
  settings/
    page.tsx                    — shop info, shipping origin, notification
                                   templates, staff accounts

src/app/account/
  layout.tsx                    — auth gate, simple account nav
  page.tsx                      — overview: recent order, quick links
  orders/
    page.tsx                    — order history list
    [id]/page.tsx                — order detail + tracking timeline
  designs/
    page.tsx                    — "My Saved Designs" grid (feeds BLUEPRINT-02
                                   Studio tab, also usable standalone)
  addresses/
    page.tsx
  profile/
    page.tsx
```

All `admin/*` and `account/*` routes are Server Components by default,
fetching data directly via Prisma in the route (not through the public
API) for admin screens where that's simpler, EXCEPT interactive pieces
(the Kanban board, the Studio-linked design grid) which are Client
Components calling the API routes from BLUEPRINT-01 §5 through TanStack
Query so they get optimistic updates and background refetching for free.

--------------------------------------------------------------------------------
2. ROLE GATING (server-side, non-negotiable)
--------------------------------------------------------------------------------

```ts
// src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(session.user.role)) {
    redirect("/login?redirect=/admin");
  }
  return (
    <AdminShell role={session.user.role}>
      {children}
    </AdminShell>
  );
}
```

`AdminShell` conditionally renders nav items based on `role` —
`PRODUCTION_STAFF` sees only "Produksi" in the sidebar; `ADMIN`/
`SUPER_ADMIN` see everything. Repeat the role check at the TOP of every
individual admin API route handler too (§ from BLUEPRINT-01) — a hidden
nav link is not access control, the server check is the actual boundary.

--------------------------------------------------------------------------------
3. THE PRODUCTION KANBAN — THE CENTERPIECE OF THIS BLUEPRINT
--------------------------------------------------------------------------------

Columns map 1:1 to the `ProductionStage` enum from BLUEPRINT-01:

```
┌ Persiapan Desain ┐ ┌ Setup Screen/Film ┐ ┌ Mencetak ┐ ┌ Curing ┐ ┌ QC ┐ ┌ Packaging ┐ ┌ Selesai ┐
│  [card] [card]    │ │  [card]           │ │ [card]   │ │ [card] │ │    │ │  [card]   │ │         │
└────────────────────┘ └────────────────────┘ └──────────┘ └────────┘ └────┘ └────────────┘ └──────────┘
```

Each card represents one `ProductionTask` (one per `OrderItem`, so a
single order with 3 different printed items shows as 3 cards that can move
through the pipeline independently — this matters because different items
in the same order often finish at different times in a real sablon
workshop).

Card content:
  - Thumbnail: the Design's `previewImageFrontUrl` (server-rendered per
    BLUEPRINT-02 §6) — NOT a live 3D canvas; a Kanban with 30+ live WebGL
    contexts open simultaneously would crash most tablets/laptops used on
    a workshop floor.
  - Order number + customer name (short)
  - Garment + size + color + sablon method chip
  - Assigned staff avatar (or "Belum ditugaskan")
  - Due date badge (color-coded: green >2 days out, amber ≤2 days,
    red overdue)
  - Quick action: "Lihat File Cetak" → opens `printFileUrl` (see §4 for
    where this comes from) in a new tab, sized for direct printing/screen
    prep reference.

Drag-and-drop between columns updates `ProductionTask.stage` via
optimistic mutation:

```tsx
// src/app/admin/production/ProductionBoard.tsx
"use client";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
// @dnd-kit is the correct 2026 choice here: actively maintained,
// accessible (keyboard drag support out of the box, unlike many older
// drag libs), lighter than react-beautiful-dnd (which is unmaintained).

function ProductionBoard() {
  const { data: tasks } = useProductionTasksQuery();
  const mutation = useMoveTaskMutation(); // optimistic PATCH

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as ProductionStage;
    mutation.mutate({ taskId: active.id as string, stage: newStage });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_COLUMNS.map((stage) => (
          <KanbanColumn key={stage} stage={stage} tasks={tasksByStage(tasks, stage)} />
        ))}
      </div>
    </DndContext>
  );
}
```

Moving a task INTO `PRINTING` for the first item of an order triggers (via
the `PATCH /api/admin/production-tasks/:id` handler, server-side, not
client-side) the parent `Order.status` to sync to `PRINTING` if it isn't
already, and fires the WhatsApp "sedang dicetak" notification from
BLUEPRINT-01 §7 — this keeps the customer-facing status and the internal
production board from drifting out of sync, which is the #1 way admin
tools like this rot in production (staff moves the Kanban card but forgets
to "also" update customer status — so make it the SAME action).

Filters above the board: by assigned staff, by garment category, by
due-date urgency, and a search box (order number/customer name).

--------------------------------------------------------------------------------
4. PRINT FILE PREPARATION — closing the design→production gap
--------------------------------------------------------------------------------

When an `OrderItem` is created from a custom `Design` (BLUEPRINT-01 §3),
the raw decal images the customer uploaded are NOT directly print-ready —
they need color-mode/resolution checks and, for screen-printing (as
opposed to DTF), color separation. This blueprint does not attempt to
automate color separation (a genuinely hard image-processing problem
best left to the human operator's existing software), but the admin UI
must make the handoff painless:

- On order confirmation, auto-generate a **Print Prep Packet** per
  OrderItem: a zip (or a single info page) containing:
    - The original uploaded decal image(s) at full resolution (from R2,
      never the compressed WebP preview used in the customer-facing UI)
    - A spec sheet: garment, color, size, decal placement coordinates
      (translated from the `DecalLayer` x/y/scale/rotation into physical
      cm measurements using the known garment's real-world dimensions —
      store `physicalWidthCm`/`physicalHeightCm` per `decalNode` in
      `ApparelCategory.decalNodes` for this conversion), sablon method,
      and quantity.
    - The server-rendered front/back preview PNG for quick visual
      reference.
  Endpoint: `GET /api/admin/orders/:id/print-packet` returns a generated
  PDF (use the existing project convention — check `/mnt/skills/public/pdf`
  patterns — or a simple zip via `archiver` if a flat PDF spec sheet is
  preferred by the actual workshop team; ask the business owner which
  format their production floor prefers before building this screen, since
  this is the one part of the system a REAL non-technical print operator
  touches daily).
- `ProductionTask.printFileUrl` is manually uploaded by whoever preps the
  screen/film (a simple file-upload widget on the task detail drawer) once
  they've done that prep in their own tools (e.g., Photoshop/CorelDRAW for
  color separation) — the system doesn't need to DO the separation, just
  needs a clean place to attach and retrieve the result so it travels with
  the order.

--------------------------------------------------------------------------------
5. ORDER DETAIL SCREEN (`/admin/orders/[id]`)
--------------------------------------------------------------------------------

Sections:
  1. **Header**: order number, status badge (color-coded per
     `OrderStatus`), total, payment status, "Kirim Update ke Customer"
     quick-action (opens a WhatsApp template picker → §BLUEPRINT-01 §7).
  2. **Interactive 3D Garment Verification**:
     - Embedded 360° `CanvasStage` showing the exact custom 3D model, fabric color,
       and decal layers as positioned by the customer.
     - Lets the production operator rotate and inspect the final expected outcome
       before printing.
  3. **Print-Ready Job Ticket & Physical Dimensions (CM)**:
     - Real-world calibrated print dimensions: `printWidthCm` × `printHeightCm`
       (e.g., "Lebar 28.5 cm × Tinggi 14.2 cm | Maks 30.0 cm").
     - Placement parameters: `placementSide` (Front/Back) and `offsetFromCollarCm`
       (e.g., "7.5 cm di bawah garis kerah").
     - Fabric specifications: Apparel model, GSM weight, size (S/M/L/XL/XXL), and color code.
  4. **High-Resolution Asset Download Center (For DTF Printing)**:
     - `[ ⬇️ Download Raw High-Res Asset (300 DPI PNG/SVG) ]` — one-click download
       of original transparent artwork for direct import into DTF RIP software
       (AcroRIP / Cadlink / Photoprint).
     - `[ ⬇️ Download 3D Render Snapshot (PNG) ]` — visual placement reference for heat press operator.
     - `[ 🖨️ Print Production Job Ticket (PDF) ]` — physical paper slip to attach to the garment bundle.
  5. **Customer & Delivery Info**: name, phone (click-to-WhatsApp `wa.me` link
     — extremely high-value for a support-heavy Indonesian UMKM), delivery
     method (`PICKUP` / `INSTANT_COURIER` / `FLAT_MAKASSAR` / `EXPEDITION_MANUAL`),
     address/courier notes, and tracking number / pickup verification toggle.
  6. **Timeline & Audit Log**: renders `OrderStatusEvent[]` chronologically —
     tracks when design was verified, printed, cured, and packed.
  7. **Manual status override**: a dropdown + "Update Status" button for
     manual overrides, logging every action with `actorUserId`.

--------------------------------------------------------------------------------
6. CATALOG MANAGEMENT (`/admin/catalog`)
--------------------------------------------------------------------------------

CRUD screens for `ApparelCategory`, `ProductVariant`, `ColorOption`,
`MaterialFinish`, `SablonMethod` (all modeled in BLUEPRINT-01 §3). Keep
these forms boring and functional — this is internal tooling, not a
customer-facing surface, so favor a plain, dense data-table + modal-form
pattern (e.g. TanStack Table + a simple `<Dialog>` from your component
library) over anything fancy. The ONE piece of complexity worth investing
in: a **live 3D preview** embedded in the "Add/Edit ApparelCategory" form
when setting `decalNodes` anchors — reuse the BLUEPRINT-02 `CanvasStage`
in a lightweight admin-only mode so whoever adds a new garment (e.g. a
future "cargo pants" or "cap" category) can visually place the decal
anchor points on the actual 3D model instead of guessing `[x, y, z]`
numbers blind. This single feature is what makes adding new garment types
sustainable without needing a developer involved every time.

--------------------------------------------------------------------------------
7. DASHBOARD HOME METRICS (`/admin/page.tsx`)
--------------------------------------------------------------------------------

Keep this focused on what actually drives daily decisions for a small
team, not a vanity-metrics wall:

  - **Today's production load**: count of tasks per stage (mirrors the
    Kanban column headers) — answers "are we behind today."
  - **Orders awaiting payment** vs **orders awaiting production start**
    (`PAYMENT_CONFIRMED` but no task moved past `DESIGN_PREP` yet) — this
    surfaces bottlenecks before a customer complains.
  - **Revenue this week / this month** (simple sum of `PAYMENT_CONFIRMED`+
    orders' `totalIdr`), with a small trend sparkline (use
    `chart_display_v0`-equivalent or a lightweight `recharts` bar chart —
    do not over-invest in analytics depth here; this is an operational
    dashboard, not a BI tool).
  - **Low stock alert**: `ProductVariant` rows where `stockQty` is below a
    configurable threshold — only relevant for `isPreDesigned` catalog
    items, since fully custom sablon orders are made-to-order and have no
    stock constraint.
  - **Overdue production tasks**: `ProductionTask` rows past `dueDate`
    still not `DONE` — surfaced prominently, red badge, top of the page.

--------------------------------------------------------------------------------
8. USER DASHBOARD (`/account/*`) — DELIBERATELY SIMPLE
--------------------------------------------------------------------------------

The brief calls this "dashboard user simple" — resist the temptation to
over-engineer it. Four screens, each doing one thing well:

**`/account` (overview)**
  - Greeting, most recent order card (status + "Lacak Pesanan" button),
    quick links to Orders / Designs / Addresses / Profile. That's it.

**`/account/orders`**
  - Flat list, most recent first, each row: order number, date, item
    thumbnail(s), status badge, total. Click through to detail.
  - `/account/orders/[id]` — same timeline component used in the admin
    order detail (§5, item 4), but read-only and phrased in
    customer-friendly language (map internal `OrderStatus` enum values to
    friendly Indonesian labels via a single `ORDER_STATUS_LABELS` map —
    keep the enum technical, keep the display layer human):

```ts
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAYMENT_CONFIRMED: "Pembayaran Dikonfirmasi",
  IN_PRODUCTION_QUEUE: "Dalam Antrian Produksi",
  PRINTING: "Sedang Dicetak",
  QUALITY_CHECK: "Pemeriksaan Kualitas",
  READY_TO_SHIP: "Siap Dikirim",
  SHIPPED: "Dalam Pengiriman",
  DELIVERED: "Terkirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  REFUNDED: "Dana Dikembalikan",
};
```

**`/account/designs`**
  - Grid of the user's saved `Design` rows (server-rendered thumbnails),
    each with Load-in-Studio / Duplicate / Delete / "Jadikan Pesanan"
    (adds to cart) actions — this is the account-side mirror of
    BLUEPRINT-02's Studio "My Designs" tab; both read from the same
    `GET /api/designs?userId=me` endpoint so there's exactly one source of
    truth, just two entry points.

**`/account/addresses`** and **`/account/profile`**
  - Standard CRUD forms, nothing unusual. Address form should reuse the
    same province/city/district cascading selects as the checkout flow
    (extract into a shared `<IndonesianAddressFields />` component used in
    both places — do not duplicate this logic, district-level data
    mapping to courier APIs is fiddly enough to get right once).

--------------------------------------------------------------------------------
9. NOTIFICATION TEMPLATE MANAGEMENT (`/admin/settings`)
--------------------------------------------------------------------------------

Rather than hard-coding every WhatsApp message string in application code
(from BLUEPRINT-01 §7), give the admin a simple settings screen to edit
the message templates for each trigger point (`order_confirmed`,
`printing_started`, `shipped`, `cancelled`), with `{{orderNumber}}`,
`{{customerName}}`, `{{totalIdr}}`, `{{trackingNumber}}` placeholder
tokens. Store templates in a simple `NotificationTemplate` table (add to
the BLUEPRINT-01 schema: `id, key, bodyTemplate, updatedAt`) rather than
env vars or hard-coded strings — this lets the non-technical shop owner
adjust tone/wording without a code deploy, which matters a lot for a
UMKM's day-to-day operation.

--------------------------------------------------------------------------------
10. PERMISSIONS MATRIX (reference table for the build agent)
--------------------------------------------------------------------------------

| Screen/Action | CUSTOMER | PRODUCTION_STAFF | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `/account/*` | ✅ own data only | ❌ | ❌ | ❌ |
| `/admin/production` (Kanban) | ❌ | ✅ (assigned/unassigned tasks only) | ✅ | ✅ |
| `/admin/orders` (full detail incl. revenue) | ❌ | ❌ | ✅ | ✅ |
| `/admin/catalog` | ❌ | ❌ | ✅ | ✅ |
| `/admin/settings` (staff accounts, shop config) | ❌ | ❌ | view-only | ✅ full edit |
| `/admin/customers` (PII lookup) | ❌ | ❌ | ✅ | ✅ |

Encode this as a small `PERMISSIONS` config object
(`src/lib/permissions.ts`) checked both in layout-level redirects AND
inside every mutating API route handler — never rely on the UI hiding a
button as the actual security boundary (repeated from BLUEPRINT-01 §11
because it is the single most common real-world vulnerability in
admin-panel builds).

--------------------------------------------------------------------------------
11. IMPLEMENTATION ROADMAP (Phase 3 — after BLUEPRINT-01's checkout works
    end-to-end and BLUEPRINT-02's Design model is populated with real data)
--------------------------------------------------------------------------------

1. Scaffold `/admin` layout + role gate + nav shell.
2. Build the Orders table + Order Detail screen (read path first, actions
   second) — this alone makes the business operable even before the
   Kanban exists.
3. Build the Production Kanban (§3) with `@dnd-kit`, wired to
   `ProductionTask` CRUD + the status-sync side effect described in §3.
4. Build the Print Prep Packet generator (§4) — confirm the actual file
   format with the real shop workflow before finalizing.
5. Build Catalog management screens (§6), including the 3D decal-anchor
   preview tool.
6. Build the Dashboard home metrics (§7).
7. Build the User Dashboard (§8) — this can happen in parallel with
   steps 3-6 since it depends only on BLUEPRINT-01's Order/Design read
   APIs, not on any admin-specific work.
8. Build Notification Template settings (§9).
9. Verify the full loop manually: place a test order → confirm payment
   (Midtrans sandbox) → move it through every Kanban stage → confirm the
   customer-facing `/account/orders/[id]` timeline and WhatsApp messages
   match at every step.

================================================================================
END OF BLUEPRINT 03 — proceed to BLUEPRINT-04-MOBILE-PERFORMANCE-INFRA.md
================================================================================
