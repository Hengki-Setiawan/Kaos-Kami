import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Address, Order, User } from "@/lib/drizzle-schema";
import { and, desc, eq, inArray, or, sql, type SQLWrapper } from "drizzle-orm";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

import { maskPhone as maskPhoneLib } from "@/lib/mask";
// Satukan ke SSOT lib/mask (format 4****+2) + fallback "-" agar CSV tak bolong.
function maskPhone(v: string): string {
  if (!v || v === "-") return "-";
  return maskPhoneLib(v) || "-";
}

// Escape karakter khusus LIKE (% _ \) — tanpa ini input user menjadi wildcard.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// LIKE case-insensitive + ESCAPE eksplisit. Catatan: helper `ilike()` bawaan
// drizzle memancarkan keyword ILIKE yang DITOLAK Turso/libSQL (syntax error),
// dan escape backslash tanpa klausa ESCAPE tidak berpengaruh di SQLite —
// keduanya sudah diverifikasi via uji baca-only 20 Sep 2026.
function ciLike(column: SQLWrapper, raw: string) {
  return sql`lower(${column}) like lower(${"%" + escapeLike(raw) + "%"}) escape '\\'`;
}

const STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

async function requireAdmin(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`admin-export:ip:${ip}`, 10, 60);
  if (rl.isLimited) {
    return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 10) }) };
  }
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const role = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { role: role as string };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

/**
 * GET /api/admin/orders/export — Unduh data pesanan dalam format CSV untuk pembukuan UMKM
 *
 * Query: ?status=… (enum valid) &q=… (filter pencarian, sama seperti daftar)
 *   &cursor=… (offset awal, default 0) &limit=… (1–1000, default 500).
 * Bila masih ada baris berikutnya, header respons `X-Next-Cursor` berisi cursor
 * halaman selanjutnya; bila kosong = sudah halaman terakhir.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;

  const url = new URL(req.url);
  const statusParam = (url.searchParams.get("status") || "").trim();
  const q = (url.searchParams.get("q") || "").trim().slice(0, 40);

  if (statusParam && !(STATUSES as readonly string[]).includes(statusParam)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const cursorRaw = Number(url.searchParams.get("cursor") || "0");
  const cursor = Number.isFinite(cursorRaw) && cursorRaw > 0 ? Math.floor(cursorRaw) : 0;
  const limitRaw = Number(url.searchParams.get("limit") || "500");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(1000, Math.max(1, Math.floor(limitRaw)))
    : 500;

  const conds: any[] = [];
  if (statusParam) conds.push(eq(Order.status, statusParam as any));
  if (q) {
    const [matchingUsers, matchingAddresses] = await Promise.all([
      db
        .select({ id: User.id })
        .from(User)
        .where(
          or(
            ciLike(User.name, q),
            ciLike(User.phoneNumber, q),
            ciLike(User.email, q)
          )
        )
        .limit(50),
      db
        .select({ id: Address.id })
        .from(Address)
        .where(
          or(
            ciLike(Address.recipientName, q),
            ciLike(Address.phoneNumber, q),
            ciLike(Address.fullAddress, q)
          )
        )
        .limit(50),
    ]);
    const userIds = matchingUsers.map((u) => u.id);
    const addressIds = matchingAddresses.map((a) => a.id);
    const orClauses: any[] = [
      ciLike(Order.orderNumber, q),
      ciLike(Order.trackingNumber, q),
    ];
    if (userIds.length > 0) orClauses.push(inArray(Order.userId, userIds));
    if (addressIds.length > 0) orClauses.push(inArray(Order.shippingAddressId, addressIds));
    conds.push(or(...orClauses));
  }
  const where = conds.length > 0 ? and(...conds) : undefined;

  // Ambil 1 baris ekstra untuk mendeteksi halaman berikutnya (cursor pagination).
  const fetched = await db.query.Order.findMany({
    where,
    orderBy: [desc(Order.createdAt)],
    limit: limit + 1,
    offset: cursor,
    with: {
      items: true,
      user: true,
      shippingAddress: true,
      payment: true,
    },
  });
  const hasMore = fetched.length > limit;
  const orders = hasMore ? fetched.slice(0, limit) : fetched;
  const nextCursor = hasMore ? String(cursor + limit) : "";

  const header = [
    "No Order",
    "Tanggal",
    "Nama Pemesan",
    "No WhatsApp",
    "Metode Pengiriman",
    "Alamat",
    "Kota",
    "Status Pesanan",
    "No Resi",
    "Jumlah Item",
    "Subtotal (Rp)",
    "Ongkir (Rp)",
    "Diskon (Rp)",
    "Total Transaksi (Rp)",
    "Metode Pembayaran",
    "Status Pembayaran",
  ];

  const rows = orders.map((o) => {
    const cleanAddress = (o.shippingAddress?.fullAddress || "Workshop Pick-up").replace(/"/g, '""');
    const recipient = (o.shippingAddress?.recipientName || o.user?.name || "Pelanggan").replace(/"/g, '""');
    const waRaw: string = o.user?.phoneNumber || o.shippingAddress?.phoneNumber || "-";
    const wa = maskPhone(waRaw);
    const city = (o.shippingAddress?.city || "Makassar").replace(/"/g, '""');

    return [
      `"${o.orderNumber}"`,
      `"${new Date(o.createdAt).toISOString().slice(0, 10)}"`,
      `"${recipient}"`,
      `"${wa}"`,
      `"${o.deliveryMethod}"`,
      `"${cleanAddress}"`,
      `"${city}"`,
      `"${o.status}"`,
      `"${o.trackingNumber || "-"}"`,
      o.items.length,
      o.subtotalIdr,
      o.shippingCostIdr,
      o.discountIdr,
      o.totalIdr,
      `"${o.payment?.method || "-"}"`,
      `"${o.payment?.status || "-"}"`,
    ].join(",");
  });

  const csvContent = "\uFEFF" + [header.join(","), ...rows].join("\r\n");

  const resHeaders: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="laporan-pesanan-kaos-kami-${new Date().toISOString().slice(0, 10)}.csv"`,
  };
  if (nextCursor) resHeaders["X-Next-Cursor"] = nextCursor;

  return new NextResponse(csvContent, { status: 200, headers: resHeaders });
}
