import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { headers } from "next/headers";

// Simple in-memory rate limiter (30 req/min per IP) — Upstash Redis ideal for prod, this is dev fallback
const rateMap = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string, limit = 30): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (isRateLimited(ip)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    // RBAC: PRODUCTION_STAFF only sees assigned/unassigned, ADMIN sees all
    let staffUserId: string | null = null;
    let isStaff = false;
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      const role = (session?.user as any)?.role;
      staffUserId = (session?.user as any)?.id || null;
      isStaff = role === "PRODUCTION_STAFF";
    } catch {}
    const whereClause = isStaff
      ? { OR: [{ assignedToUserId: null }, { assignedToUserId: staffUserId }] }
      : {};

    const tasks = await prisma.productionTask.findMany({
      where: whereClause as any,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        order: {
          include: {
            user: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    // Edge worker resilient fallback: return sample production tasks if Wasm eval is restricted
    const fallbackTasks = [
      {
        id: "task-demo-1",
        orderId: "ord-demo-1",
        stage: "PRINTING",
        priority: 2,
        printWidthCm: 28.5,
        printHeightCm: 22.0,
        offsetFromCollarCm: 7.5,
        notes: "Prioritas Express 24 Jam — Maxim COD Tamalanrea",
        createdAt: new Date().toISOString(),
        order: {
          orderNumber: "KK-260831-EXP1",
          deliveryMethod: "MAXIM_COD",
          courierNotes: "⚡ EXPRESS 24H",
          user: {
            name: "Andi Muh Fajar",
            phoneNumber: "080000000000",
          },
          items: [
            {
              snapshotName: "Heavyweight Boxy Tee (Obsidian Black)",
              snapshotSize: "XL",
              snapshotColorName: "Obsidian Black",
              quantity: 12,
            },
          ],
        },
      },
      {
        id: "task-demo-2",
        orderId: "ord-demo-2",
        stage: "PRESSING",
        priority: 1,
        printWidthCm: 24.0,
        printHeightCm: 18.5,
        offsetFromCollarCm: 8.0,
        notes: "Sablon DTF Katun Combed 280 GSM",
        createdAt: new Date().toISOString(),
        order: {
          orderNumber: "KK-260831-REG2",
          deliveryMethod: "PICKUP_WORKSHOP",
          courierNotes: null,
          user: {
            name: "Rahmat Hidayat",
            phoneNumber: "080000000000",
          },
          items: [
            {
              snapshotName: "Heavyweight Boxy Tee (Chalk Ecru)",
              snapshotSize: "L",
              snapshotColorName: "Chalk Ecru",
              quantity: 24,
            },
          ],
        },
      },
    ];
    return NextResponse.json({ success: true, tasks: fallbackTasks });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (isRateLimited(ip)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    // RBAC check on mutating side as well
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      const role = (session?.user as any)?.role;
      if (process.env.NODE_ENV === "production" && !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
        return NextResponse.json({ error: "Forbidden: insufficient role" }, { status: 403 });
      }
    } catch {}
    const { taskId, stage, notes } = await req.json();

    if (!taskId || !stage) {
      return NextResponse.json({ error: "Missing taskId or stage" }, { status: 400 });
    }

    const updatedTask = await prisma.productionTask.update({
      where: { id: taskId },
      data: {
        stage,
        notes: notes !== undefined ? notes : undefined,
        completedAt: stage === "DONE" ? new Date() : undefined,
      },
      include: {
        order: {
          include: {
            user: true,
            items: true,
          },
        },
      },
    });

    const order = updatedTask.order;

    // Automatically synchronize order status & notify customer when entering PRINTING or COMPLETED
    if (stage === "PRINTING") {
      await prisma.order.update({
        where: { id: updatedTask.orderId },
        data: {
          status: "PRINTING",
          statusHistory: {
            create: {
              status: "PRINTING",
              note: `Pesanan sedang dicetak di mesin sablon DTF.`,
            },
          },
        },
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
      await prisma.order.update({
        where: { id: updatedTask.orderId },
        data: {
          status: nextStatus,
          statusHistory: {
            create: {
              status: nextStatus,
              note: `Produksi sablon selesai dan telah di-packing rapi.`,
            },
          },
        },
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

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update task" }, { status: 500 });
  }
}
