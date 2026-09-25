import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimitAsync, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * U14+I8: notifikasi customer dari OrderStatusEvent order MILIKNYA.
 * Read-state di localStorage client (tanpa migrasi): server kembalikan item
 * terbaru + unreadEstimate dihitung client dari lastSeen tersimpan.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const uid = (session?.user as any)?.id as string | undefined;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = await checkRateLimitAsync(`notif:user:${uid}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    const mine = await db.query.Order.findMany({
      where: (t, { eq }: any) => eq(t.userId, uid),
      columns: { id: true, orderNumber: true },
      limit: 50,
      orderBy: (t, { desc: d }: any) => d(t.createdAt),
    });
    const ids = mine.map((o) => o.id);
    if (ids.length === 0) return NextResponse.json({ success: true, items: [] });
    const numById = new Map(mine.map((o) => [o.id, o.orderNumber]));
    const events = await db.query.OrderStatusEvent.findMany({
      where: (t, { inArray: ina }: any) => ina(t.orderId, ids),
      orderBy: (t, { desc: d }: any) => d(t.createdAt),
      limit: 30,
    });
    return NextResponse.json({
      success: true,
      items: events.map((e: any) => ({
        id: e.id,
        orderId: e.orderId,
        orderNumber: numById.get(e.orderId) || e.orderId.slice(0, 8),
        status: e.status,
        note: e.note,
        createdAt: e.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
