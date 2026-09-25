import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const CATEGORIES = ["SABLON_CACAT", "SALAH_UKURAN", "WARNA_BEDA", "KETERLAMBATAN", "LAINNYA"] as const;

const ComplaintSchema = z.object({
  orderId: z.string().min(1).max(64),
  category: z.enum(CATEGORIES),
  message: z.string().min(10).max(1000),
  photoUrl: z.string().url().max(500).optional(),
});

/**
 * U15: komplain terstruktur customer. TANPA migrasi: tercatat sebagai
 * OrderStatusEvent note `[KOMPLAIN:<kategori>]` (follow-up: tabel dedicated).
 * Hanya pemilik order + status SHIPPED/DELIVERED/COMPLETED.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const uid = (session?.user as any)?.id as string | undefined;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`complaint:user:${uid}`, 5, 3600);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Batas 5 komplain per jam." }, { status: 429, headers: rateLimitHeaders(rl, 5) });
    }
    void ip;
    const parsed = ComplaintSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
    }
    const order = await db.query.Order.findFirst({
      where: (t, { eq }: any) => eq(t.id, parsed.data.orderId),
      columns: { id: true, userId: true, status: true, orderNumber: true },
    });
    if (!order || order.userId !== uid) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }
    if (!["SHIPPED", "DELIVERED", "COMPLETED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Komplain dibuka setelah barang dikirim (status saat ini: " + order.status + ")." },
        { status: 400 }
      );
    }
    const [row] = await db
      .insert(OrderStatusEvent)
      .values({
        id: nanoid(),
        orderId: order.id,
        status: order.status,
        note: `[KOMPLAIN:${parsed.data.category}] ${parsed.data.message}${parsed.data.photoUrl ? ` | Foto: ${parsed.data.photoUrl}` : ""}`,
        actorUserId: uid,
      })
      .returning({ id: OrderStatusEvent.id });
    return NextResponse.json({ success: true, id: row?.id, message: "Komplain tercatat. Workshop menindaklanjuti via WhatsApp." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}

/** Daftar komplain milik sendiri (dari event bertanda KOMPLAIN). */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const uid = (session?.user as any)?.id as string | undefined;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const mine = await db.query.Order.findMany({
      where: (t, { eq }: any) => eq(t.userId, uid),
      columns: { id: true },
      limit: 50,
      orderBy: (t, { desc }: any) => desc(t.createdAt),
    });
    const ids = mine.map((o) => o.id);
    if (ids.length === 0) return NextResponse.json({ success: true, items: [] });
    const events = await db.query.OrderStatusEvent.findMany({
      where: (t, { and, inArray, like }: any) =>
        and(inArray(t.orderId, ids), like(t.note, "[KOMPLAIN:%")),
      orderBy: (t, { desc }: any) => desc(t.createdAt),
      limit: 30,
    });
    return NextResponse.json({
      success: true,
      items: events.map((e: any) => ({
        id: e.id,
        orderId: e.orderId,
        note: e.note,
        createdAt: e.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
