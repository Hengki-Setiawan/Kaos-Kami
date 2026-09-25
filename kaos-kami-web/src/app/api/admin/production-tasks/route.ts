import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull, or, sql, type SQLWrapper } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import {
  Order,
  OrderStatusEvent,
  ProductionTask,
  QcInspection,
  User,
} from "@/lib/drizzle-schema";
import { assertTransition, isTerminalStatus, type Role } from "@/lib/orders/machine";
// Kebijakan Fonnte owner 20 Sep 2026: HANYA OTP — route ini tak kirim WA.
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Escape karakter khusus LIKE (% _ \) — tanpa ini input user menjadi wildcard.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// LIKE case-insensitive + ESCAPE eksplisit. Catatan: helper `ilike()` bawaan
// drizzle memancarkan keyword ILIKE yang DITOLAK Turso/libSQL, dan escape
// backslash tanpa klausa ESCAPE tidak berpengaruh di SQLite.
function ciLike(column: SQLWrapper, raw: string) {
  return sql`lower(${column}) like lower(${"%" + escapeLike(raw) + "%"}) escape '\\'`;
}

// Gate QC: task hanya boleh maju ke PACKAGING/DONE bila order sudah punya
// inspeksi terbaru yang LOLOS (checks kosong). Tanpa inspeksi / defect
// terbaru = blokir (409) agar barang cacat tak lolos ke packing.
async function checkQcPass(orderId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const latest = await db.query.QcInspection.findMany({
    where: (t, { eq }) => eq(t.orderId, orderId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 1,
    columns: { id: true, checksJson: true },
  });
  const head = latest[0];
  if (!head) {
    return {
      ok: false,
      reason:
        "QC belum lolos: belum ada inspeksi QC untuk order ini. Lakukan inspeksi (checks kosong = lolos) sebelum PACKAGING/DONE.",
    };
  }
  let checks: unknown;
  try {
    checks = JSON.parse(head.checksJson);
  } catch {
    return { ok: false, reason: "Data QC terakhir rusak — periksa ulang inspeksi sebelum PACKAGING/DONE." };
  }
  if (!Array.isArray(checks)) {
    return { ok: false, reason: "Data QC terakhir rusak — periksa ulang inspeksi sebelum PACKAGING/DONE." };
  }
  if (checks.length > 0) {
    return {
      ok: false,
      reason: `QC terbaru menemukan defect (${checks.join(", ")}) — lakukan rework sebelum PACKAGING/DONE.`,
    };
  }
  return { ok: true };
}

// appendNotes:true → tempel catatan baru di bawah catatan lama + aktor +
// timestamp (bukan overwrite). Tanpa append (atau catatan lama kosong) →
// ganti langsung. Kembalikan undefined bila tak ada notes baru di request.
function resolveTaskNotes(
  oldNotes: string | null | undefined,
  newNotes: string | undefined,
  append: boolean | undefined,
  actorUserId: string | null,
): string | undefined {
  if (newNotes === undefined) return undefined;
  if (!append || !oldNotes) return newNotes;
  const stamp = new Date().toISOString();
  return `${oldNotes}\n[${stamp} ${actorUserId ?? "workshop"}] ${newNotes}`.slice(0, 2000);
}

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

    // ?q= cari nomor order (LIKE case-insensitive, wildcard di-escape).
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim().slice(0, 64);
    let orderIdFilter: string[] | undefined;
    if (q) {
      const matched = await db
        .select({ id: Order.id })
        .from(Order)
        .where(ciLike(Order.orderNumber, q))
        .limit(200);
      const ids = matched.map((m) => m.id);
      if (ids.length === 0) return NextResponse.json({ success: true, tasks: [] });
      orderIdFilter = ids;
    }

    const conds: SQLWrapper[] = [];
    if (isStaff) {
      const staffCond = or(
        isNull(ProductionTask.assignedToUserId),
        staffUserId ? eq(ProductionTask.assignedToUserId, staffUserId) : undefined,
      );
      if (staffCond) conds.push(staffCond);
    }
    if (orderIdFilter) conds.push(inArray(ProductionTask.orderId, orderIdFilter));
    const where = conds.length > 0 ? and(...conds) : undefined;

    const tasks = await db.query.ProductionTask.findMany({
      where,
      orderBy: (t, { desc, asc }) => [desc(t.priority), asc(t.createdAt)],
      // Ramping: tanpa full user row + batas 200 (audit: PII penuh + tanpa limit).
      limit: 200,
      with: {
        order: {
          // Allowlist kolom order (courierNotes untuk triase workshop + resi
          // untuk status kirim; kolom task dueDate/priority ikut default select).
          columns: {
            id: true,
            orderNumber: true,
            status: true,
            deliveryMethod: true,
            totalIdr: true,
            courierNotes: true,
            trackingNumber: true,
          },
          with: {
            // Allowlist PII minimal (id, nama, WA) — JANGAN user:true penuh.
            user: { columns: { id: true, name: true, phoneNumber: true } },
            items: true,
          },
        },
      },
    });

    // Nama assignee (relasi tak ada di skema → lookup manual, allowlist nama saja).
    const assigneeIds = Array.from(
      new Set(tasks.map((t) => t.assignedToUserId).filter((v): v is string => Boolean(v))),
    );
    const assigneeMap = new Map<string, string | null>();
    if (assigneeIds.length > 0) {
      const users = await db.query.User.findMany({
        where: inArray(User.id, assigneeIds),
        columns: { id: true, name: true },
      });
      for (const u of users) assigneeMap.set(u.id, u.name);
    }
    const tasksOut = tasks.map((t) => ({
      ...t,
      assignee: t.assignedToUserId
        ? { id: t.assignedToUserId, name: assigneeMap.get(t.assignedToUserId) ?? null }
        : null,
    }));

    return NextResponse.json({ success: true, tasks: tasksOut });
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
    let actorRole: Role = "PRODUCTION_STAFF";
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
      actorRole = (role as Role) ?? "PRODUCTION_STAFF";
    } catch {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = z.object({
      taskId: z.string().min(1).optional(),
      taskIds: z.array(z.string().min(1)).max(50, "Maksimal 50 task per batch").optional(),
      stage: z.enum(["DESIGN_PREP", "SCREEN_PRINT_SETUP", "PRINTING", "PRESSING", "QUALITY_CHECK", "PACKAGING", "DONE"]).optional(),
      notes: z.string().max(500).optional(),
      appendNotes: z.boolean().optional(),
      claim: z.boolean().optional(),
    }).refine((d) => Boolean(d.taskId || (d.taskIds && d.taskIds.length > 0)), {
      message: "taskId atau taskIds wajib diisi",
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { taskId, taskIds, stage, notes, appendNotes, claim } = parsed.data;

    // Batch update stage untuk banyak task (dipakai oleh Gang-Sheet Builder saat ekspor)
    if (taskIds && taskIds.length > 0) {
      if (!stage) {
        return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });
      }
      const uniqueIds = Array.from(new Set(taskIds));
      const failed: { taskId: string; reason: string }[] = [];

      // Preload integritas: kepemilikan + DONE-final dicek per task SEBELUM tulis.
      const preloaded = await db.query.ProductionTask.findMany({
        where: inArray(ProductionTask.id, uniqueIds),
        columns: { id: true, assignedToUserId: true, stage: true, orderId: true, notes: true },
      });
      const byId = new Map(preloaded.map((t) => [t.id, t]));
      const ownedIds: string[] = [];
      for (const tid of uniqueIds) {
        const cur = byId.get(tid);
        if (!cur) {
          failed.push({ taskId: tid, reason: "Task tidak ditemukan" });
          continue;
        }
        // Task milik operator lain + bukan ADMIN → skip per-task (failed[]),
        // JANGAN 403 buta yang menggagalkan seluruh batch.
        if (cur.assignedToUserId && cur.assignedToUserId !== actorUserId && !isAdmin) {
          failed.push({ taskId: tid, reason: "Task dipegang operator lain" });
          continue;
        }
        if (cur.stage === "DONE" && stage !== "DONE") {
          failed.push({ taskId: tid, reason: "Task DONE final — buat task baru bila perlu" });
          continue;
        }
        ownedIds.push(tid);
      }

      // Tolak bila order terminal (COMPLETED/CANCELLED/REFUNDED) atau
      // regresi SHIPPED → PRINTING.
      const batchOrderIds = Array.from(
        new Set(ownedIds.map((id) => byId.get(id)?.orderId).filter((v): v is string => Boolean(v))),
      );
      const batchOrders =
        batchOrderIds.length > 0
          ? await db.query.Order.findMany({
              where: inArray(Order.id, batchOrderIds),
              columns: { id: true, status: true, deliveryMethod: true, trackingNumber: true },
            })
          : [];
      const batchOrderById = new Map(batchOrders.map((o) => [o.id, o]));
      const passIds: string[] = [];
      for (const tid of ownedIds) {
        const cur = byId.get(tid);
        if (!cur) continue;
        const ord = batchOrderById.get(cur.orderId);
        if (!ord) {
          failed.push({ taskId: tid, reason: "Order task tidak ditemukan" });
          continue;
        }
        if (isTerminalStatus(ord.status)) {
          failed.push({ taskId: tid, reason: `Order ${ord.status} bersifat final dan tidak bisa diubah` });
          continue;
        }
        if (ord.status === "SHIPPED" && stage === "PRINTING") {
          failed.push({ taskId: tid, reason: "Regresi SHIPPED → PRINTING ditolak" });
          continue;
        }
        passIds.push(tid);
      }

      // QC blocking per order (PACKAGING/DONE wajib inspeksi LOLOS terbaru).
      const qcReasonByOrder = new Map<string, string>();
      if (stage === "PACKAGING" || stage === "DONE") {
        const checkOrderIds = Array.from(
          new Set(passIds.map((id) => byId.get(id)?.orderId).filter((v): v is string => Boolean(v))),
        );
        for (const oId of checkOrderIds) {
          const gate = await checkQcPass(oId);
          if (!gate.ok) qcReasonByOrder.set(oId, gate.reason);
        }
      }
      const finalIds: string[] = [];
      for (const tid of passIds) {
        const cur = byId.get(tid);
        if (!cur) continue;
        const blockReason = qcReasonByOrder.get(cur.orderId);
        if (blockReason) {
          failed.push({ taskId: tid, reason: blockReason });
          continue;
        }
        finalIds.push(tid);
      }

      for (const tid of finalIds) {
        const cur = byId.get(tid);
        if (!cur) continue;
        const nextNotes = resolveTaskNotes(cur.notes, notes, appendNotes, actorUserId);
        await db
          .update(ProductionTask)
          .set({
            stage,
            ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
            ...(stage === "DONE" ? { completedAt: new Date() } : {}),
          })
          .where(eq(ProductionTask.id, tid));
      }

      // Otomatis sinkronkan status order yang terpengaruh (best-effort per
      // order via mesin transisi + update optimistis; gagal = skip order itu).
      const syncedOrderIds = Array.from(
        new Set(finalIds.map((id) => byId.get(id)?.orderId).filter((v): v is string => Boolean(v))),
      );
      if (stage === "PRINTING") {
        for (const oId of syncedOrderIds) {
          const ord = batchOrderById.get(oId);
          if (!ord) continue;
          try {
            assertTransition(actorRole, ord.status, "PRINTING");
          } catch {
            continue;
          }
          if (ord.status !== "PRINTING") {
            const race = await db
              .update(Order)
              .set({ status: "PRINTING" })
              .where(and(eq(Order.id, oId), eq(Order.status, ord.status)));
            if ((race.rowsAffected ?? 0) === 0) continue;
          }
          await db.insert(OrderStatusEvent).values({
            id: nanoid(),
            orderId: oId,
            status: "PRINTING",
            note: "Pesanan masuk antrean cetak mesin sablon DTF (batch gang-sheet).",
            actorUserId,
          });
        }
      } else if (stage === "PACKAGING" || stage === "DONE") {
        for (const oId of syncedOrderIds) {
          const ord = batchOrderById.get(oId);
          if (!ord) continue;
          const siblingTasks = await db.query.ProductionTask.findMany({
            where: (t, { eq }) => eq(t.orderId, oId),
            columns: { id: true, stage: true },
          });
          const allCompleted =
            siblingTasks.length > 0 && siblingTasks.every((t) => t.stage === "PACKAGING" || t.stage === "DONE");
          if (!allCompleted) continue;
          // PICKUP → READY_TO_SHIP. Non-PICKUP TANPA resi → TAHAN di
          // READY_TO_SHIP + event "menunggu resi" (JANGAN auto-SHIPPED).
          let nextStatus: string;
          let note: string;
          if (ord.deliveryMethod === "PICKUP") {
            nextStatus = "READY_TO_SHIP";
            note = "Produksi sablon selesai dan telah di-packing rapi (siap diambil di workshop).";
          } else if (ord.trackingNumber) {
            nextStatus = "SHIPPED";
            note = "Produksi sablon selesai dan telah di-packing rapi (siap dikirim).";
          } else {
            nextStatus = "READY_TO_SHIP";
            note = "Produksi selesai dan di-packing; menunggu nomor resi sebelum dikirim (tahan di READY_TO_SHIP).";
          }
          try {
            assertTransition(actorRole, ord.status, nextStatus);
          } catch {
            continue;
          }
          if (ord.status !== nextStatus) {
            const race = await db
              .update(Order)
              .set({ status: nextStatus })
              .where(and(eq(Order.id, oId), eq(Order.status, ord.status)));
            if ((race.rowsAffected ?? 0) === 0) continue;
          }
          await db.insert(OrderStatusEvent).values({
            id: nanoid(),
            orderId: oId,
            status: nextStatus,
            note,
            actorUserId,
          });
        }
      }

      return NextResponse.json({ success: true, updatedCount: finalIds.length, stage, failed });
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
      columns: { id: true, stage: true, assignedToUserId: true, orderId: true, notes: true },
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
    const ord = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, current.orderId),
      columns: { id: true, status: true, deliveryMethod: true, trackingNumber: true },
    });
    if (!ord) {
      return NextResponse.json({ error: "Order task tidak ditemukan" }, { status: 404 });
    }
    // Integritas order: status terminal final + regresi SHIPPED → PRINTING.
    if (isTerminalStatus(ord.status)) {
      return NextResponse.json(
        { error: `Order ${ord.status} bersifat final dan tidak bisa diubah` },
        { status: 400 },
      );
    }
    if (ord.status === "SHIPPED" && stage === "PRINTING") {
      return NextResponse.json({ error: "Regresi SHIPPED → PRINTING ditolak" }, { status: 400 });
    }
    // QC blocking: PACKAGING/DONE wajib inspeksi LOLOS terbaru (409).
    if (stage === "PACKAGING" || stage === "DONE") {
      const gate = await checkQcPass(current.orderId);
      if (!gate.ok) {
        return NextResponse.json({ error: gate.reason }, { status: 409 });
      }
    }

    const nextNotes = resolveTaskNotes(current.notes, notes, appendNotes, actorUserId);
    // Advance atomik: where(id + stage lama) — 0 baris = stage berubah di
    // tengah jalan (balapan antar operator) → 409, bukan overwrite buta.
    const [updatedTask] = await db
      .update(ProductionTask)
      .set({
        stage,
        ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
        ...(stage === "DONE" ? { completedAt: new Date() } : {}),
      })
      .where(and(eq(ProductionTask.id, taskId), eq(ProductionTask.stage, current.stage)))
      .returning();
    if (!updatedTask) {
      return NextResponse.json({ error: "Task berubah di tengah jalan — muat ulang dulu" }, { status: 409 });
    }

    // Sinkronisasi status order + SELALU tulis OrderStatusEvent (semua stage,
    // berikut actorUserId). Sinkronisasi best-effort via mesin transisi:
    // bila transisi tak legal, status order dipertahankan + event jujur.
    if (stage === "PRINTING" || stage === "QUALITY_CHECK") {
      let synced = false;
      let syncError: string | undefined;
      try {
        assertTransition(actorRole, ord.status, stage);
        if (ord.status !== stage) {
          const race = await db
            .update(Order)
            .set({ status: stage })
            .where(and(eq(Order.id, ord.id), eq(Order.status, ord.status)));
          if ((race.rowsAffected ?? 0) === 0) {
            return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
          }
        }
        synced = true;
      } catch (e: any) {
        syncError = e?.message;
      }
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: ord.id,
        status: synced ? stage : ord.status,
        note: synced
          ? stage === "PRINTING"
            ? "Pesanan sedang dicetak di mesin sablon DTF."
            : "Pesanan masuk pemeriksaan kualitas (QC)."
          : `Task ${taskId} → ${stage} (status order ${ord.status} tertahan: ${syncError ?? "transisi tidak diizinkan"}).`,
        actorUserId,
      });
    } else if (stage === "PACKAGING" || stage === "DONE") {
      const siblingTasks = await db.query.ProductionTask.findMany({
        where: (t, { eq }) => eq(t.orderId, updatedTask.orderId),
        columns: { id: true, stage: true },
      });
      const allCompleted =
        siblingTasks.length > 0 && siblingTasks.every((t) => t.stage === "PACKAGING" || t.stage === "DONE");
      if (allCompleted) {
        // PICKUP → READY_TO_SHIP. Non-PICKUP TANPA resi → TAHAN di
        // READY_TO_SHIP + event "menunggu resi" (JANGAN auto-SHIPPED).
        let nextStatus: string;
        let note: string;
        if (ord.deliveryMethod === "PICKUP") {
          nextStatus = "READY_TO_SHIP";
          note = "Produksi sablon selesai dan telah di-packing rapi (siap diambil di workshop).";
        } else if (ord.trackingNumber) {
          nextStatus = "SHIPPED";
          note = "Produksi sablon selesai dan telah di-packing rapi (siap dikirim).";
        } else {
          nextStatus = "READY_TO_SHIP";
          note = "Produksi selesai dan di-packing; menunggu nomor resi sebelum dikirim (tahan di READY_TO_SHIP).";
        }
        try {
          assertTransition(actorRole, ord.status, nextStatus);
          if (ord.status !== nextStatus) {
            const race = await db
              .update(Order)
              .set({ status: nextStatus })
              .where(and(eq(Order.id, ord.id), eq(Order.status, ord.status)));
            if ((race.rowsAffected ?? 0) === 0) {
              return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
            }
          }
          await db.insert(OrderStatusEvent).values({
            id: nanoid(),
            orderId: ord.id,
            status: nextStatus,
            note,
            actorUserId,
          });
        } catch (e: any) {
          await db.insert(OrderStatusEvent).values({
            id: nanoid(),
            orderId: ord.id,
            status: ord.status,
            note: `Task ${taskId} → ${stage} (sinkronisasi status tertahan: ${e?.message ?? "transisi tidak diizinkan"}).`,
            actorUserId,
          });
        }
      } else {
        const doneCount = siblingTasks.filter((t) => t.stage === "PACKAGING" || t.stage === "DONE").length;
        await db.insert(OrderStatusEvent).values({
          id: nanoid(),
          orderId: ord.id,
          status: ord.status,
          note: `Task ${taskId} → ${stage} (${doneCount}/${siblingTasks.length} task selesai).`,
          actorUserId,
        });
      }

      // PENGHEMATAN KUOTA FONNTE: Update status sablon dicatat di OrderStatusEvent
      // dan tampil realtime di invoice web serta aplikasi mobile.
    } else {
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: ord.id,
        status: ord.status,
        note: `Task ${taskId} maju ke ${stage}.`,
        actorUserId,
      });
    }

    const fullTask = await db.query.ProductionTask.findFirst({
      where: (t, { eq }) => eq(t.id, taskId),
      // Allowlist PII minimal (id, nama, WA) — JANGAN user:true penuh.
      with: {
        order: { with: { user: { columns: { id: true, name: true, phoneNumber: true } }, items: true } },
      },
    });
    const order = fullTask?.order;
    if (!order) {
      return NextResponse.json({ error: "Order task tidak ditemukan" }, { status: 404 });
    }
    const assigneeId = updatedTask.assignedToUserId;
    let assignee: { id: string; name: string | null } | null = null;
    if (assigneeId) {
      const u = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.id, assigneeId),
        columns: { id: true, name: true },
      });
      assignee = u ? { id: u.id, name: u.name } : { id: assigneeId, name: null };
    }
    const taskWithOrder = { ...updatedTask, order, assignee };

    return NextResponse.json({ success: true, task: taskWithOrder });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update task" }, { status: 500 });
  }
}
