import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatMessage } from "@/lib/drizzle-schema";
import { eq } from "drizzle-orm";
import { checkRateLimitAsync, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * U14+I8: notifikasi customer terintegrasi dari:
 * 1. OrderStatusEvent milik pesanannya
 * 2. Pesan masuk dari Kamito / Admin Workshop
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

    const [mineOrders, chatItems] = await Promise.all([
      db.query.Order.findMany({
        where: (t, { eq }: any) => eq(t.userId, uid),
        columns: { id: true, orderNumber: true },
        limit: 50,
        orderBy: (t, { desc: d }: any) => d(t.createdAt),
      }),
      db.query.ChatMessage.findMany({
        where: (t, { and, or, eq, inArray }: any) =>
          and(
            eq(t.receiverId, uid),
            inArray(t.senderRole, ["ADMIN", "BOT"])
          ),
        orderBy: (t, { desc: d }: any) => d(t.createdAt),
        limit: 15,
      }),
    ]);

    const ids = mineOrders.map((o) => o.id);
    const numById = new Map(mineOrders.map((o) => [o.id, o.orderNumber]));

    let events: any[] = [];
    if (ids.length > 0) {
      events = await db.query.OrderStatusEvent.findMany({
        where: (t, { inArray: ina }: any) => ina(t.orderId, ids),
        orderBy: (t, { desc: d }: any) => d(t.createdAt),
        limit: 25,
      });
    }

    const orderNotifs = events.map((e: any) => ({
      id: e.id,
      type: "order" as const,
      orderId: e.orderId,
      orderNumber: numById.get(e.orderId) || e.orderId.slice(0, 8),
      status: e.status,
      note: e.note,
      title: `Update Pesanan #${numById.get(e.orderId) || e.orderId.slice(0, 8)}`,
      message: e.note || `Status pesanan kini: ${e.status}`,
      createdAt: e.createdAt,
    }));

    const chatNotifs = chatItems.map((m: any) => ({
      id: m.id,
      type: "chat" as const,
      orderId: m.orderId || null,
      orderNumber: null,
      status: "CHAT_MESSAGE",
      note: m.content,
      title: `${m.senderName || "Kamito"} mengirim pesan`,
      message: m.content.length > 60 ? m.content.slice(0, 60) + "…" : m.content,
      createdAt: m.createdAt,
      isRead: Boolean(m.isRead),
    }));

    // Gabungkan dan urutkan berdasarkan waktu terbaru
    const combined = [...orderNotifs, ...chatNotifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      items: combined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memuat notifikasi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const uid = (session?.user as any)?.id as string | undefined;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Tandai pesan chat untuk user ini sebagai dibaca
    await db
      .update(ChatMessage)
      .set({ isRead: true })
      .where(eq(ChatMessage.receiverId, uid));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
