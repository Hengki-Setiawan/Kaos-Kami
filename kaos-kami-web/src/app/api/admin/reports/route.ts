import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  and,
  count,
  eq,
  gte,
  inArray,
  like,
  lt,
  notInArray,
  sum,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { maskPhone as maskPhoneLib } from "@/lib/mask"; // SSOT PII (S-045)
import {
  Order,
  OrderItem,
  ProductionTask,
  ProductVariant,
  QcInspection,
  User,
} from "@/lib/drizzle-schema";
import {
  checkRateLimitAsync,
  getClientIp,
  rateLimitHeaders,
} from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

// GET /api/admin/reports — Laporan ringkas workshop (omset, defect, workload, forecast).
// Pola ditiru dari api/admin/orders/export: gate role + rate-limit per IP.
// Bedanya: HANYA ADMIN / SUPER_ADMIN (tanpa PRODUCTION_STAFF — data omset sensitif).

const REPORT_LIMIT_PER_MINUTE = 30;

// Status yang TIDAK dihitung sebagai omset (konsisten dengan admin/page.tsx).
const EXCLUDED_FROM_GROSS = ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"];

// Stage kanban yang dianggap "aktif" (konsisten dengan admin/page.tsx).
const ACTIVE_STAGES = [
  "DESIGN_PREP",
  "SCREEN_PRINT_SETUP",
  "PRINTING",
  "PRESSING",
  "QUALITY_CHECK",
];

// Kode cacat QC resmi (api/qc/inspections + qcLighting.ts; dinormalisasi UPPERCASE).
const KNOWN_DEFECTS = ["LUBANG", "NODA", "MISPRINT", "CRACKING"] as const;

async function requireAdmin() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: (await headers()) as any,
    });
    const role = (session?.user as any)?.role;
    if (!session?.user) {
      return {
        error: NextResponse.json(
          { success: false, error: "Unauthorized: silakan login dulu" },
          { status: 401 },
        ),
      };
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return {
        error: NextResponse.json(
          { success: false, error: "Forbidden: khusus ADMIN / SUPER_ADMIN" },
          { status: 403 },
        ),
      };
    }
    return { role: role as string };
  } catch {
    // Fail-closed: error auth = tolak, jangan lolos.
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized: silakan login dulu" },
        { status: 401 },
      ),
    };
  }
}

/** Kunci tanggal lokal server YYYY-MM-DD (konsisten dengan batas today setHours). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Agregat SUM yang jujur: null bila tak ada baris (BUKAN 0 palsu). */
function sumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Mask nomor WA/telepon sisi server — yang mentah tak pernah keluar API. */
function maskPhone(p?: string | null): string {
  if (!p) return "—";
  return maskPhoneLib(p) || "—";
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(
    `admin-reports:ip:${ip}`,
    REPORT_LIMIT_PER_MINUTE,
    60,
  );
  if (rl.isLimited) {
    return NextResponse.json(
      { success: false, error: "Rate limited: coba lagi sebentar" },
      { status: 429, headers: rateLimitHeaders(rl, REPORT_LIMIT_PER_MINUTE) },
    );
  }

  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const range = new URL(req.url).searchParams.get("range") || "7d";
  if (!["today", "7d", "30d"].includes(range)) {
    return NextResponse.json(
      { success: false, error: "Parameter range harus today, 7d, atau 30d" },
      { status: 400 },
    );
  }

  const now = new Date();
  let from: Date;
  if (range === "today") {
    from = new Date();
    from.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const validInWindow = and(
    notInArray(Order.status, EXCLUDED_FROM_GROSS),
    gte(Order.createdAt, from),
  );

  // -- Kueri utama (paralel; semua read-only) -------------------------------
  const [
    grossRows,
    refundRows,
    statusGroups,
    completedOrders,
    qcRows,
    overdueExpressRows,
    activeTasks,
    orders30d,
    orders2d,
    variants,
  ] = await Promise.all([
    db
      .select({
        gross: sum(Order.totalIdr),
        disc: sum(Order.discountIdr),
        n: count(),
      })
      .from(Order)
      .where(validInWindow),
    db
      .select({ refund: sum(Order.totalIdr), n: count() })
      .from(Order)
      .where(and(eq(Order.status, "REFUNDED"), gte(Order.createdAt, from))),
    db
      .select({ status: Order.status, n: count() })
      .from(Order)
      .where(gte(Order.createdAt, from))
      .groupBy(Order.status),
    // COMPLETED + riwayat status untuk turnaround jujur (event bila ada).
    db.query.Order.findMany({
      where: and(eq(Order.status, "COMPLETED"), gte(Order.createdAt, from)),
      columns: { id: true, createdAt: true, updatedAt: true },
      with: {
        statusHistory: { columns: { status: true, createdAt: true } },
      },
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 200,
    }),
    db.query.QcInspection.findMany({
      where: gte(QcInspection.createdAt, from),
      columns: { checksJson: true },
      limit: 500,
    }),
    // Express kedaluwarsa SLA 24 jam (semua waktu, bukan cuma window).
    db
      .select({ n: count() })
      .from(Order)
      .where(
        and(
          like(Order.courierNotes, "%EXPRESS%"),
          notInArray(Order.status, ["COMPLETED", "CANCELLED", "REFUNDED"]),
          lt(Order.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
        ),
      ),
    db.query.ProductionTask.findMany({
      where: inArray(ProductionTask.stage, ACTIVE_STAGES),
      columns: {
        id: true,
        assignedToUserId: true,
        dueDate: true,
        completedAt: true,
      },
      with: { order: { columns: { courierNotes: true } } },
      limit: 500,
    }),
    // Order 30 hari (non-void) untuk burn-rate stok.
    db.query.Order.findMany({
      where: and(
        notInArray(Order.status, EXCLUDED_FROM_GROSS),
        gte(Order.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
      ),
      columns: { id: true },
      limit: 1000,
    }),
    // Order 2 hari terakhir untuk kartu tutup harian (hari ini vs kemarin).
    db.query.Order.findMany({
      where: gte(
        Order.createdAt,
        (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - 1);
          return d;
        })(),
      ),
      columns: { createdAt: true, totalIdr: true, discountIdr: true, status: true },
      limit: 2000,
    }),
    db.query.ProductVariant.findMany({
      where: (t, { eq: e }) => e(t.isActive, true),
      columns: {
        id: true,
        name: true,
        size: true,
        colorName: true,
        stockQty: true,
      },
      with: { category: { columns: { name: true } } },
      limit: 200,
    }),
  ]);

  // -- Omset -----------------------------------------------------------------
  const validCount = grossRows[0]?.n ?? 0;
  const gross = validCount > 0 ? sumOrNull(grossRows[0]?.gross) : null;
  const discountTotal = validCount > 0 ? sumOrNull(grossRows[0]?.disc) : null;
  const refundCount = refundRows[0]?.n ?? 0;
  const refundTotal = refundCount > 0 ? sumOrNull(refundRows[0]?.refund) : null;
  // net = gross − refund − diskon (null diperlakukan 0; net null bila ketiganya null).
  const net =
    gross === null && refundTotal === null && discountTotal === null
      ? null
      : (gross ?? 0) - (refundTotal ?? 0) - (discountTotal ?? 0);

  // -- Counts ----------------------------------------------------------------
  const counts = { orders: 0, cancelled: 0, refunded: 0, completed: 0 };
  for (const g of statusGroups) {
    counts.orders += g.n;
    if (g.status === "CANCELLED") counts.cancelled += g.n;
    if (g.status === "REFUNDED") counts.refunded += g.n;
    if (g.status === "COMPLETED") counts.completed += g.n;
  }

  // -- Turnaround (jujur: event bila ada, fallback createdAt→updatedAt) -------
  let turnaroundSum = 0;
  let turnaroundSample = 0;
  let turnaroundFromEvents = 0;
  for (const o of completedOrders) {
    const evts = [...(o.statusHistory ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const completedEvt = [...evts]
      .reverse()
      .find((e) => e.status === "COMPLETED");
    const start = evts[0]?.createdAt ?? o.createdAt;
    const end = completedEvt?.createdAt ?? o.updatedAt;
    if (completedEvt) turnaroundFromEvents += 1;
    const hrs = (end.getTime() - start.getTime()) / 3600000;
    if (Number.isFinite(hrs) && hrs >= 0) {
      turnaroundSum += hrs;
      turnaroundSample += 1;
    }
  }
  const avgTurnaroundHours =
    turnaroundSample > 0
      ? Math.round((turnaroundSum / turnaroundSample) * 10) / 10
      : null;
  const avgTurnaroundMeta = {
    sample: turnaroundSample,
    source:
      turnaroundSample === 0
        ? "tak-ada-data: tak ada order COMPLETED terukur di periode ini"
        : `${turnaroundFromEvents} order pakai OrderStatusEvent (dibuat→COMPLETED), ${turnaroundSample - turnaroundFromEvents} order fallback Order.createdAt→updatedAt`,
  };

  // -- Defect QC --------------------------------------------------------------
  const perDefect: Record<string, number> = {
    LUBANG: 0,
    NODA: 0,
    MISPRINT: 0,
    CRACKING: 0,
  };
  let qcLolos = 0;
  let qcUnparsed = 0;
  for (const r of qcRows) {
    let arr: unknown;
    try {
      arr = JSON.parse(r.checksJson);
    } catch {
      qcUnparsed += 1;
      continue;
    }
    if (!Array.isArray(arr)) {
      qcUnparsed += 1;
      continue;
    }
    const codes = arr.filter((c) => typeof c === "string") as string[];
    if (codes.length === 0) {
      qcLolos += 1;
      continue;
    }
    for (const c of codes) {
      const norm = c.trim().toUpperCase();
      if ((KNOWN_DEFECTS as readonly string[]).includes(norm)) {
        perDefect[norm] = (perDefect[norm] ?? 0) + 1;
      }
    }
  }
  const defectRate = {
    total: qcRows.length,
    lolos: qcLolos,
    perDefect,
  };

  // -- Workload (dikelompokkan per penanggung jawab) ---------------------------
  const assigneeIds = [
    ...new Set(
      activeTasks
        .map((t) => t.assignedToUserId)
        .filter((v): v is string => !!v),
    ),
  ];
  const assignees =
    assigneeIds.length > 0
      ? await db.query.User.findMany({
          where: inArray(User.id, assigneeIds),
          columns: { id: true, name: true, phoneNumber: true },
          limit: 100,
        })
      : [];
  const assigneeMap = new Map(assignees.map((u) => [u.id, u]));
  const workloadAgg = new Map<
    string,
    { userId: string | null; name: string; phoneMasked: string; active: number; express: number; overdue: number }
  >();
  for (const t of activeTasks) {
    const key = t.assignedToUserId ?? "UNASSIGNED";
    const u = t.assignedToUserId ? assigneeMap.get(t.assignedToUserId) : undefined;
    const row = workloadAgg.get(key) ?? {
      userId: t.assignedToUserId ?? null,
      name:
        key === "UNASSIGNED"
          ? "Belum ditetapkan"
          : (u?.name ?? `Tak dikenal (${(t.assignedToUserId ?? "").slice(0, 8)}…)`),
      phoneMasked: key === "UNASSIGNED" ? "—" : maskPhone(u?.phoneNumber),
      active: 0,
      express: 0,
      overdue: 0,
    };
    row.active += 1;
    if (t.order?.courierNotes?.includes("EXPRESS")) row.express += 1;
    if (t.dueDate && t.dueDate.getTime() < now.getTime() && !t.completedAt) {
      row.overdue += 1;
    }
    workloadAgg.set(key, row);
  }
  const workload = [...workloadAgg.values()].sort((a, b) => b.active - a.active);

  // -- Forecast stok (burn dari OrderItem 30 hari ÷ 4 minggu) ------------------
  const orderIds30 = orders30d.map((o) => o.id);
  const burnMap = new Map<string, number>();
  if (orderIds30.length > 0) {
    const items = await db.query.OrderItem.findMany({
      where: inArray(OrderItem.orderId, orderIds30),
      columns: { productVariantId: true, quantity: true },
      limit: 5000,
    });
    for (const it of items) {
      if (!it.productVariantId) continue;
      burnMap.set(
        it.productVariantId,
        (burnMap.get(it.productVariantId) ?? 0) + it.quantity,
      );
    }
  }
  const stockForecast = variants
    .map((v) => {
      const sold30 = burnMap.get(v.id);
      // burn null = tak ada penjualan tercatat 30 hari (BUKAN 0 palsu).
      const burnPerWeek =
        sold30 === undefined ? null : Math.round((sold30 / 4) * 100) / 100;
      const weeksLeft =
        burnPerWeek === null || burnPerWeek <= 0
          ? null
          : Math.round((v.stockQty / burnPerWeek) * 10) / 10;
      const suggestOrder =
        burnPerWeek === null || weeksLeft === null
          ? null
          : weeksLeft < 2
            ? Math.max(0, Math.ceil(burnPerWeek * 4 - v.stockQty))
            : 0;
      return {
        variantId: v.id,
        name: v.category?.name ? `${v.category.name} — ${v.name}` : v.name,
        size: v.size,
        colorName: v.colorName,
        qty: v.stockQty,
        burnPerWeek,
        weeksLeft,
        suggestOrder,
      };
    })
    .sort((a, b) => (a.weeksLeft ?? Infinity) - (b.weeksLeft ?? Infinity));

  // -- Tren harian (daftar per hari dalam window) ------------------------------
  const spanDays = range === "today" ? 1 : range === "30d" ? 30 : 7;
  const dailyMap = new Map<string, { gross: number; orders: number }>();
  const trendOrders = await db.query.Order.findMany({
    where: gte(Order.createdAt, from),
    columns: { createdAt: true, totalIdr: true, status: true },
    orderBy: (t, { asc }) => asc(t.createdAt),
    limit: 2000,
  });
  for (const o of trendOrders) {
    if ((EXCLUDED_FROM_GROSS as string[]).includes(o.status)) continue;
    const k = dayKey(o.createdAt);
    const row = dailyMap.get(k) ?? { gross: 0, orders: 0 };
    row.gross += o.totalIdr;
    row.orders += 1;
    dailyMap.set(k, row);
  }
  const daily: { date: string; gross: number | null; orders: number }[] = [];
  for (let i = spanDays - 1; i >= 0; i--) {
    const d = new Date(now);
    if (range !== "today") d.setDate(d.getDate() - i);
    else {
      d.setHours(0, 0, 0, 0);
    }
    const k = dayKey(d);
    const row = dailyMap.get(k);
    daily.push({
      date: k,
      gross: row ? row.gross : null,
      orders: row ? row.orders : 0,
    });
  }

  // -- Tutup harian: hari ini vs kemarin ---------------------------------------
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const closeAgg = (dayStart: Date, dayEnd: Date) => {
    let g: number | null = null;
    let r: number | null = null;
    let d: number | null = null;
    let n = 0;
    for (const o of orders2d) {
      if (o.createdAt < dayStart || o.createdAt >= dayEnd) continue;
      if (o.status === "REFUNDED") {
        r = (r ?? 0) + o.totalIdr;
        n += 1;
        continue;
      }
      if ((EXCLUDED_FROM_GROSS as string[]).includes(o.status)) continue;
      g = (g ?? 0) + o.totalIdr;
      d = (d ?? 0) + o.discountIdr;
      n += 1;
    }
    return {
      gross: g,
      refundTotal: r,
      discountTotal: d,
      net: g === null && r === null && d === null ? null : (g ?? 0) - (r ?? 0) - (d ?? 0),
      orders: n,
    };
  };
  const tomorrow = new Date(startToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const closing = {
    today: { date: dayKey(startToday), ...closeAgg(startToday, tomorrow) },
    yesterday: {
      date: dayKey(new Date(startToday.getTime() - 24 * 60 * 60 * 1000)),
      ...closeAgg(
        new Date(startToday.getTime() - 24 * 60 * 60 * 1000),
        startToday,
      ),
    },
  };

  return NextResponse.json({
    success: true,
    range,
    window: { from: from.toISOString(), to: now.toISOString() },
    gross,
    refundTotal,
    net,
    discountTotal,
    discountSource:
      "Estimasi dari kolom Order.discountIdr (nilai kupon tercatat saat checkout). Kode kupon asli ada di Order.notes format COUPON:<KODE> bila order memakai kupon.",
    counts,
    avgTurnaroundHours,
    avgTurnaroundMeta,
    defectRate,
    defectSource:
      "Sumber: QcInspection.checksJson di periode ini. checksJson=[] berarti LOLOS; kode cacat LUBANG/NODA/MISPRINT/CRACKING (tak-terbaca tidak dihitung lolos).",
    defectUnparsed: qcUnparsed,
    overdueExpress: overdueExpressRows[0]?.n ?? 0,
    overdueSource:
      "Order bertanda EXPRESS di courierNotes, status belum selesai, dibuat >24 jam lalu (batas SLA Express 24H).",
    workload,
    workloadSource:
      "ProductionTask stage aktif (DESIGN_PREP, SCREEN_PRINT_SETUP, PRINTING, PRESSING, QUALITY_CHECK — sama seperti kartu Antrean di /admin). Kontak sudah dimask.",
    stockForecast,
    stockSource:
      "burnPerWeek = total qty OrderItem 30 hari terakhir (order valid non-void) ÷ 4. burn null = tak ada penjualan tercatat (bukan 0). suggestOrder = kebutuhan 4 minggu − sisa, bila sisa < 2 minggu; 0 = aman; null = tak bisa dihitung.",
    daily,
    closing,
    meta: {
      sources: {
        orders: "Order + OrderStatusEvent (Turso via Drizzle)",
        qc: "QcInspection",
        production: "ProductionTask + User",
        stock: "OrderItem + ProductVariant",
      },
      limits: {
        completedOrders: 200,
        qcRows: 500,
        tasks: 500,
        orders30d: 1000,
        orderItems: 5000,
        trendOrders: 2000,
        variants: 200,
      },
      generatedAt: now.toISOString(),
      honestNote:
        "Angka null / tanda — berarti tak-ada-data pada sumbernya, bukan nol. Jangan mengganti null menjadi 0.",
    },
  });
}
