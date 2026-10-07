import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Order, OrderStatusEvent, ProductionTask } from "@/lib/drizzle-schema";
import { isTerminalStatus, type Role } from "@/lib/orders/machine";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import {
  buildMasterNotifyNote,
  clampMasterPrintWidthCm,
  isHttpsR2MasterUrl,
  normalizeOffsetFromCollarCm,
  normalizePlacementSide,
  normalizeResi,
} from "@/lib/masterNotify";

/**
 * POST /api/admin/production-tasks/master-notify — lampirkan master film DTF
 * + metadata fisik + resi + notifikasi WA opsional (master-attach).
 *
 * RBAC = PATCH existing (ADMIN/SUPER_ADMIN/PRODUCTION_STAFF, anon 401).
 * Input: taskId wajib; printFileUrl https-R2; printWidthCm clamp ≤30;
 * placementSide; offsetFromCollarCm; resi ≤40; notifyWa default FALSE.
 * SELALU tulis OrderStatusEvent. WA HANYA bila notifyWa true eksplisit
 * (try/catch fail-safe — checkout/produksi tak boleh gagal karena Fonnte).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`admin-tasks:ip:${ip}`, 120, 60);
    if (rl.isLimited)
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 120) });

    // RBAC: sama dengan PATCH — wajib login workshop.
    let actorUserId: string | null = null;
    let isAdmin = false;
    let actorRole: Role = "PRODUCTION_STAFF";
    try {
      const { auth } = await import("@/lib/auth");
      const hdrs = await headers();
      const session = await auth.api.getSession({ headers: hdrs as any });
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
      }
      if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role ?? "")) {
        return NextResponse.json({ error: "Forbidden: khusus tim workshop" }, { status: 403 });
      }
      actorUserId = (session?.user as { id?: string } | undefined)?.id || null;
      isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
      actorRole = ((role as Role) ?? "PRODUCTION_STAFF");
      void actorRole;
    } catch {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = z
      .object({
        taskId: z.string().min(1, "taskId wajib diisi"),
        printFileUrl: z
          .string()
          .max(2048, "URL master terlalu panjang (maks 2048)")
          .optional(),
        printWidthCm: z.number().finite().positive().max(100).optional(),
        placementSide: z.string().max(40).optional(),
        offsetFromCollarCm: z.number().finite().min(0).max(30).optional(),
        resi: z.string().max(40, "Resi maksimal 40 karakter").optional(),
        notifyWa: z.boolean().optional().default(false),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { taskId, printFileUrl, printWidthCm, placementSide, offsetFromCollarCm, resi, notifyWa } = parsed.data;

    // Validasi https-R2 bila URL dikirim (tolak base64/data:/http:).
    if (printFileUrl !== undefined && !isHttpsR2MasterUrl(printFileUrl)) {
      return NextResponse.json(
        { error: "printFileUrl wajib URL https R2 (tolak base64/data:/http:)" },
        { status: 400 }
      );
    }
    if (
      printFileUrl === undefined &&
      printWidthCm === undefined &&
      placementSide === undefined &&
      offsetFromCollarCm === undefined &&
      (resi === undefined || resi.trim() === "")
    ) {
      return NextResponse.json({ error: "Minimal satu field master/resi wajib diisi" }, { status: 400 });
    }

    const task = await db.query.ProductionTask.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.id, taskId),
      columns: {
        id: true,
        orderId: true,
        assignedToUserId: true,
        stage: true,
        printFileUrl: true,
        printWidthCm: true,
        placementSide: true,
        offsetFromCollarCm: true,
      },
    });
    if (!task) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }
    // Kepemilikan = PATCH: milik operator lain + bukan ADMIN → 403.
    if (task.assignedToUserId && task.assignedToUserId !== actorUserId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: task dipegang operator lain" }, { status: 403 });
    }
    const ord = await db.query.Order.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.id, task.orderId),
      columns: { id: true, orderNumber: true, status: true, deliveryMethod: true, trackingNumber: true, userId: true },
    });
    if (!ord) {
      return NextResponse.json({ error: "Order task tidak ditemukan" }, { status: 404 });
    }
    if (isTerminalStatus(ord.status)) {
      return NextResponse.json(
        { error: `Order ${ord.status} bersifat final dan tidak bisa diubah` },
        { status: 400 }
      );
    }

    const widthClamped = clampMasterPrintWidthCm(printWidthCm);
    const sideNorm = normalizePlacementSide(placementSide);
    const offsetNorm = normalizeOffsetFromCollarCm(offsetFromCollarCm);
    const resiNorm = normalizeResi(resi);

    // Tulis task (hanya field yang dikirim; lebar selalu clamp ≤30).
    await db
      .update(ProductionTask)
      .set({
        ...(printFileUrl !== undefined ? { printFileUrl } : {}),
        ...(widthClamped !== undefined ? { printWidthCm: widthClamped } : {}),
        ...(sideNorm !== undefined ? { placementSide: sideNorm } : {}),
        ...(offsetNorm !== undefined ? { offsetFromCollarCm: offsetNorm } : {}),
      })
      .where(eq(ProductionTask.id, taskId));

    // Resi → Order.trackingNumber (trim ≤40).
    if (resiNorm !== undefined && resiNorm !== ord.trackingNumber) {
      await db.update(Order).set({ trackingNumber: resiNorm }).where(eq(Order.id, ord.id));
    }

    const note = buildMasterNotifyNote({
      printWidthCm: widthClamped,
      placementSide: sideNorm,
      offsetFromCollarCm: offsetNorm,
      resi: resiNorm,
      hasFile: printFileUrl !== undefined || task.printFileUrl != null,
    });
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: ord.id,
      status: ord.status,
      note: `Master-attach ${taskId}: ${note}`,
      actorUserId,
    });

    // WA HANYA bila notifyWa true eksplisit + try/catch fail-safe.
    let waSent = false;
    let waError: string | undefined;
    if (notifyWa === true) {
      try {
        const buyer = await db.query.User.findFirst({
          where: (t, { eq: eqFn }) => eqFn(t.id, ord.userId),
          columns: { id: true, name: true, phoneNumber: true },
        });
        const phone = buyer?.phoneNumber?.trim();
        if (!phone) {
          waError = "Nomor WA pembeli belum ada";
        } else {
          const { sendWhatsAppNotification, buildProductionStatusMessage } = await import(
            "@/lib/notifications/whatsapp"
          );
          let invoiceUrl = `/orders/${ord.id}`;
          try {
            invoiceUrl = `${siteUrl()}/orders/${ord.id}`;
          } catch {
            // abaikan — fallback path relatif
          }
          const msg = buildProductionStatusMessage({
            orderNumber: ord.orderNumber,
            recipientName: buyer?.name || "Pelanggan",
            stageName: `Master sablon siap${resiNorm ? ` · Resi: ${resiNorm}` : ""}`,
            note: note.slice(0, 200),
            invoiceUrl,
          });
          const res = await sendWhatsAppNotification(phone, msg);
          waSent = res.success;
          if (!res.success) waError = res.error || "WA tidak terkirim (mock/guard)";
        }
      } catch (e) {
        waError = e instanceof Error ? e.message : "WA gagal (fail-safe)";
      }
    }

    const updated = await db.query.ProductionTask.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.id, taskId),
    });

    return NextResponse.json({
      success: true,
      task: updated,
      resi: resiNorm ?? null,
      waSent,
      ...(waError ? { waError } : {}),
    });
  } catch (error: unknown) {
    console.error("master-notify error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal melampirkan master" }, { status: 500 });
  }
}


