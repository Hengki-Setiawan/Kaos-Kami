import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const tasks = await prisma.productionTask.findMany({
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
    return NextResponse.json({ error: error?.message || "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
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
