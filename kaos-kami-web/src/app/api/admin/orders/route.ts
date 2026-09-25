import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { and, desc, eq, lt, or, sql, type SQLWrapper } from "drizzle-orm";
import { Order } from "@/lib/drizzle-schema";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { ORDER_STATUSES } from "@/lib/orders/machine";
import { maskPhone } from "@/lib/mask";

async function requireStaff(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`admin-orders-list:ip:${ip}`, 30, 60);
  if (rl.isLimited) {
    return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) }) };
  }
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const role = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER"].includes(role)) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { role: role as string };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

/**
 * GET /api/admin/orders?status=&q=&cursor=&limit=
 * List order untuk antrean review & admin (cursor createdAt+id, bawaan terbaru).
 * PII dimask (WA), cocok untuk role staff.
 */
export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if ("error" in gate) return gate.error;
  try {
    const sp = new URL(req.url).searchParams;
    const status = (sp.get("status") || "").trim();
    const q = (sp.get("q") || "").trim().slice(0, 40);
    const limitRaw = Math.min(100, Math.max(1, Number(sp.get("limit") || "25")));
    const cursorRaw = (sp.get("cursor") || "").trim();
    let cursor: { createdAt: Date; id: string } | null = null;
    if (cursorRaw) {
      try {
        const c = JSON.parse(Buffer.from(cursorRaw, "base64url").toString("utf8"));
        if (c?.createdAt && c?.id) cursor = { createdAt: new Date(c.createdAt), id: String(c.id) };
      } catch {}
    }
    const conds: SQLWrapper[] = [];
    if (status) {
      if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json({ error: "Status tidak dikenal" }, { status: 400 });
      }
      conds.push(eq(Order.status, status));
    }
    if (q) {
      const esc = q.replace(/[\\%_]/g, (c) => `\\${c}`);
      conds.push(
        or(
          sql`lower(${Order.orderNumber}) like lower(${"%" + esc + "%"}) escape '\\'`,
          sql`lower(${Order.trackingNumber}) like lower(${"%" + esc + "%"}) escape '\\'`
        )!
      );
    }
    if (cursor) {
      conds.push(
        or(
          lt(Order.createdAt, cursor.createdAt),
          and(eq(Order.createdAt, cursor.createdAt), lt(Order.id, cursor.id))
        )!
      );
    }
    const rows = await (db.query.Order as any).findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [desc(Order.createdAt), desc(Order.id)],
      limit: limitRaw + 1,
      columns: {
        id: true, orderNumber: true, status: true, totalIdr: true,
        deliveryMethod: true, trackingNumber: true, createdAt: true,
        reviewNote: true, reviewedAt: true,
      },
      with: { user: { columns: { id: true, name: true, phoneNumber: true } } },
    });
    const hasMore = rows.length > limitRaw;
    const page = rows.slice(0, limitRaw);
    const last = page[page.length - 1] as any;
    const nextCursor = hasMore && last
      ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString("base64url")
      : null;
    return NextResponse.json({
      success: true,
      orders: page.map((o: any) => ({
        ...o,
        user: o.user ? { ...o.user, phoneNumber: maskPhone(o.user.phoneNumber || "") } : o.user,
      })),
      nextCursor,
      hasMore,
    });
  } catch (e: any) {
    console.error("[admin/orders] list error:", e?.message || e);
    return NextResponse.json({ error: "Gagal memuat order" }, { status: 500 });
  }
}
