import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Order, OrderStatusEvent, ProductionTask } from "@/lib/drizzle-schema";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`admin-tasks:ip:${ip}`, 120, 60);
    if (rl.isLimited)
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 120) });

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
      // Ramping: tanpa full user row + batas 200 (audit: PII penuh + tanpa limit).
      limit: 200,
      with: {
        order: {
          columns: { id: true, orderNumber: true, status: true, deliveryMethod: true, totalIdr: true },
          with: {
            user: { columns: { id: true, name: true, phoneNumber: true } },
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
    const rl = await checkRateLimitAsync(`admin-tasks:ip:${ip}`, 120, 60);
    if (rl.isLimited)
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 120) });

    // RBAC: selalu enforce di semua env (dev fail-open = WA palsu + stage palsu).
    let actorUserId: string | null = null;
    let isAdmin = false;
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
      actorUserId = (session?.user as any)?.id || null;
      isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    } catch {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = z.object({
      taskId: z.string().min(1).optional(),
      taskIds: z.array(z.string().min(1)).optional(),
      stage: z.enum(["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK", "PACKAGING", "DONE"]).optional(),
      notes: z.string().max(500).optional(),
      claim: z.boolean().optional(),
    }).refine((d) => Boolean(d.taskId || (d.taskIds && d.taskIds.length > 0)), {
      message: "taskId atau taskIds wajib diisi",
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { taskId, taskIds, stage, notes, claim } = parsed.data;

    // Batch update stage untuk banyak task (dipakai oleh Gang-Sheet Builder saat ekspor)
    if (taskIds && taskIds.length > 0) {
      if (!stage) {
        return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });
      }
      await db
        .update(ProductionTask)
        .set({
          stage,
          ...(notes !== undefined ? { notes } : {}),
          ...(stage === "DONE" ? { completedAt: new Date() } : {}),
        })
        .where(inArray(ProductionTask.id, taskIds));

      // Otomatis sinkronkan status order yang terpengaruh
      if (stage === "PRINTING") {
        const affectedTasks = await db.query.ProductionTask.findMany({
          where: inArray(ProductionTask.id, taskIds),
          columns: { orderId: true },
        });
        const distinctOrderIds = Array.from(new Set(affectedTasks.map((t) => t.orderId)));
        for (const oId of distinctOrderIds) {
          await db.update(Order).set({ status: "PRINTING" }).where(eq(Order.id, oId));
          await db.insert(OrderStatusEvent).values({
            id: nanoid(),
            orderId: oId,
            status: "PRINTING",
            note: "Pesanan masuk antrean cetak mesin sablon DTF (batch gang-sheet).",
          });
        }
      } else if (stage === "PACKAGING" || stage === "DONE") {
        const affectedTasks = await db.query.ProductionTask.findMany({
          where: inArray(ProductionTask.id, taskIds),
          columns: { orderId: true },
          with: { order: { columns: { id: true, deliveryMethod: true } } },
        });
        const distinctOrderIds = Array.from(new Set(affectedTasks.map((t) => t.orderId)));
        for (const oId of distinctOrderIds) {
          const siblingTasks = await db.query.ProductionTask.findMany({
            where: (t, { eq }) => eq(t.orderId, oId),
            columns: { id: true, stage: true },
          });
          const allCompleted = siblingTasks.every((t) => t.stage === "PACKAGING" || t.stage === "DONE");
          if (allCompleted) {
            const ord = affectedTasks.find((t) => t.orderId === oId)?.order;
            const nextStatus = ord?.deliveryMethod === "PICKUP" ? "READY_TO_SHIP" : "SHIPPED";
            await db.update(Order).set({ status: nextStatus }).where(eq(Order.id, oId));
            await db.insert(OrderStatusEvent).values({
              id: nanoid(),
              orderId: oId,
              status: nextStatus,
              note: `Produksi sablon selesai dan telah di-packing rapi (${ord?.deliveryMethod === "PICKUP" ? "siap diambil di workshop" : "siap dikirim"}).`,
            });
          }
        }
      }

      return NextResponse.json({ success: true, updatedCount: taskIds.length, stage });
    }

    if (!taskId) {
      return NextResponse.json({ error: "taskId wajib diisi" }, { status: 400 });
    }

    // Ambil alih task ke diri sendiri (operator) — HANYA bila belum
    // dipegang siapa pun (assignedToUserId IS NULL). Klaim task yang sudah
    // dipegang = 409 (rebut-mencongkak antar operator merusak antrean).
    if (claim) {
      if (!actorUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const [claimed] = await db
        .update(ProductionTask)
        .set({ assignedToUserId: actorUserId })
        .where(and(eq(ProductionTask.id, taskId), isNull(ProductionTask.assignedToUserId)))
        .returning({ id: ProductionTask.id });
      if (claimed) return NextResponse.json({ success: true, claimed: true });
      const existing = await db.query.ProductionTask.findFirst({
        where: (t, { eq }) => eq(t.id, taskId),
        columns: { id: true, assignedToUserId: true },
      });
      if (!existing) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ error: "Task sudah dipegang operator lain" }, { status: 409 });
    }
    if (!stage) {
      return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });
    }
    // DONE final: tak bisa mundur (buat task baru / hubungi supervisor).
    const current = await db.query.ProductionTask.findFirst({
      where: (t, { eq }) => eq(t.id, taskId),
      columns: { stage: true, assignedToUserId: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }
    // Kepemilikan advance: task yang sudah di-claim hanya boleh dimajukan
    // pemiliknya (assignedToUserId) atau ADMIN (supervisi/reassign). Operator
    // lain → 403 agar tak saling menimpa stage. Task NULL (belum di-claim)
    // tetap boleh dimajukan seperti sekarang (alur claim terpisah di atas).
    if (current.assignedToUserId && current.assignedToUserId !== actorUserId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: task dipegang operator lain" }, { status: 403 });
    }
    if (current.stage === "DONE" && stage !== "DONE") {
      return NextResponse.json({ error: "Task DONE final — buat task baru bila perlu" }, { status: 400 });
    }

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

      // PENGHEMATAN KUOTA FONNTE: Update status sablon dicatat di OrderStatusEvent
      // dan tampil realtime di invoice web serta aplikasi mobile.
    } else if (stage === "PACKAGING" || stage === "DONE") {
      const siblingTasks = await db.query.ProductionTask.findMany({
        where: (t, { eq }) => eq(t.orderId, updatedTask.orderId),
        columns: { id: true, stage: true },
      });
      const allCompleted = siblingTasks.every((t) => t.stage === "PACKAGING" || t.stage === "DONE");
      if (allCompleted) {
        const nextStatus = order.deliveryMethod === "PICKUP" ? "READY_TO_SHIP" : "SHIPPED";
        await db.update(Order).set({ status: nextStatus }).where(eq(Order.id, updatedTask.orderId));
        await db.insert(OrderStatusEvent).values({
          id: nanoid(),
          orderId: updatedTask.orderId,
          status: nextStatus,
          note: `Produksi sablon selesai dan telah di-packing rapi (${order.deliveryMethod === "PICKUP" ? "siap diambil di workshop" : "siap dikirim"}).`,
        });
      }
    }

    return NextResponse.json({ success: true, task: taskWithOrder });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update task" }, { status: 500 });
  }
}
