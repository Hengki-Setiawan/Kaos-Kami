import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatusEvent } from "@/lib/drizzle-schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let role = "GUEST";
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      role = (session?.user as any)?.role || "GUEST";
    } catch {}

    if (process.env.NODE_ENV !== "production") {
      role = "SUPER_ADMIN";
    }

    if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const orderId = sp.get("orderId");
    const limit = Math.min(200, Math.max(10, parseInt(sp.get("limit") || "100", 10)));

    const events = await db.query.OrderStatusEvent.findMany({
      where: orderId ? (t, { eq }) => eq(t.orderId, orderId) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
      with: {
        order: {
          columns: {
            id: true,
            orderNumber: true,
            totalIdr: true,
            status: true,
            deliveryMethod: true,
          },
          with: {
            user: {
              columns: {
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      events: events.map((e) => ({
        id: e.id,
        orderId: e.orderId,
        status: e.status,
        note: e.note,
        actorUserId: e.actorUserId,
        createdAt: e.createdAt,
        order: e.order
          ? {
              id: e.order.id,
              orderNumber: e.order.orderNumber,
              totalIdr: e.order.totalIdr,
              status: e.order.status,
              deliveryMethod: e.order.deliveryMethod,
              userName: e.order.user?.name || "Pelanggan",
              phoneNumber: e.order.user?.phoneNumber || null,
            }
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat log aktivitas" }, { status: 500 });
  }
}
