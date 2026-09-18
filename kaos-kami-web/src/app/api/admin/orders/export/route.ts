import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Order } from "@/lib/drizzle-schema";
import { and, eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

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
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where = status ? eq(Order.status, status as any) : undefined;

  const orders = await db.query.Order.findMany({
    where,
    orderBy: (t, { desc: d }) => d(t.createdAt),
    limit: 500,
    with: {
      items: true,
      user: true,
      shippingAddress: true,
      payment: true,
    },
  });

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
    const wa = o.user?.phoneNumber || o.shippingAddress?.phoneNumber || "-";
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

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-pesanan-kaos-kami-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
