import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, ProductionTask } from "@/lib/drizzle-schema";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`admin-tasks:ip:${ip}`, 30, 60);
    if (rl.isLimited)
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });

    // RBAC: wajib login; PRODUCTION_STAFF hanya lihat assigned/unassigned, ADMIN lihat semua.
    // Anon SELALU 401 — data berisi PII pelanggan (nama, WA, alamat).
    let staffUserId: string | null = null;
    let isStaff = false;
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      const role = (session?.user as any)?.role;
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
      }
      if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
        return NextResponse.json({ error: "Forbidden: khusus tim workshop" }, { status: 403 });
      }
      staffUserId = (session?.user as any)?.id || null;
      isStaff = role === "PRODUCTION_STAFF";
    } catch {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const tasks = await db.query.ProductionTask.findMany({
      where: isStaff
        ? (t, { or, eq, isNull }) =>
            or(isNull(t.assignedToUserId), staffUserId ? eq(t.assignedToUserId, staffUserId) : undefined)
        : undefined,
      orderBy: (t, { desc, asc }) => [desc(t.priority), asc(t.createdAt)],
      with: {
        order: {
          with: {
            user: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    // JANGAN kembalikan data demo — menyesatkan operator. Gagal = 500 jujur.
    console.error("Admin production-tasks GET error:", error?.message);
    return NextResponse.json({ error: "Gagal memuat antrean produksi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`admin-tasks:ip:${ip}`, 30, 60);
    if (rl.isLimited)
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });

    // RBAC: selalu enforce di semua env (dev fail-open = WA palsu + stage palsu).
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      const role = (session?.user as any)?.role;
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
      }
      if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
        return NextResponse.json({ error: "Forbidden: insufficient role" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = z.object({
      taskId: z.string().min(1),
      stage: z.enum(["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK", "PACKAGING", "DONE"]),
      notes: z.string().max(500).optional(),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { taskId, stage, notes } = parsed.data;

    const [updatedTask] = await db
      .update(ProductionTask)
      .set({
        stage,
        ...(notes !== undefined ? { notes } : {}),
        ...(stage === "DONE" ? { completedAt: new Date() } : {}),
      })
      .where(eq(ProductionTask.id, taskId))
      .returning();
    if (!updatedTask) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }
    const fullTask = await db.query.ProductionTask.findFirst({
      where: (t, { eq }) => eq(t.id, taskId),
      with: { order: { with: { user: true, items: true } } },
    });
    const order = fullTask?.order;
    if (!order) {
      return NextResponse.json({ error: "Order task tidak ditemukan" }, { status: 404 });
    }
    const taskWithOrder = { ...updatedTask, order };

    // Automatically synchronize order status & notify customer when entering PRINTING or COMPLETED
    if (stage === "PRINTING") {
      await db.update(Order).set({ status: "PRINTING" }).where(eq(Order.id, updatedTask.orderId));
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: updatedTask.orderId,
        status: "PRINTING",
        note: `Pesanan sedang dicetak di mesin sablon DTF.`,
      });

      // Send WhatsApp update to customer
      if (order.user?.phoneNumber) {
        const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${updatedTask.orderId}`;
        sendWhatsAppNotification(
          order.user.phoneNumber,
          buildProductionStatusMessage({
            orderNumber: order.orderNumber,
            recipientName: order.user.name || "Pelanggan",
            stageName: "Sedang Dicetak di Mesin Sablon DTF",
            note: "Desain Anda saat ini sedang dalam proses cetak roll DTF & oven curing.",
            invoiceUrl,
          })
        ).catch((err) => console.warn("WA trigger error:", err));
      }
    } else if (stage === "PACKAGING" || stage === "DONE") {
      const nextStatus = order.deliveryMethod === "PICKUP" ? "READY_TO_SHIP" : "SHIPPED";
      await db.update(Order).set({ status: nextStatus }).where(eq(Order.id, updatedTask.orderId));
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: updatedTask.orderId,
        status: nextStatus,
        note: `Produksi sablon selesai dan telah di-packing rapi.`,
      });

      if (order.user?.phoneNumber) {
        const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${updatedTask.orderId}`;
        sendWhatsAppNotification(
          order.user.phoneNumber,
          buildProductionStatusMessage({
            orderNumber: order.orderNumber,
            recipientName: order.user.name || "Pelanggan",
            stageName:
              order.deliveryMethod === "PICKUP"
                ? "Siap Diambil di Workshop Kaos Kami"
                : "Sedang Dikirim ke Alamat Anda",
            note: "Silakan periksa invoice atau bawa nomor pesanan saat pengambilan.",
            invoiceUrl,
          })
        ).catch((err) => console.warn("WA trigger error:", err));
      }
    }

    return NextResponse.json({ success: true, task: taskWithOrder });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update task" }, { status: 500 });
  }
}
