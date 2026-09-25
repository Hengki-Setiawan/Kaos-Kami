import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";
import { assertRole } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { assertTransition, type Role } from "@/lib/orders/machine";
import { findRejectTemplate } from "@/lib/reviewTemplates";

/**
 * POST /api/admin/orders/[id]/review — Review desain alur baru (owner Sep 2026).
 *
 * Kontrak FINAL (dipakai agent lain — JANGAN ubah nama field/status):
 * - Body: { action: "approve" | "reject", note?, templateId? }
 * - ADMIN / SUPER_ADMIN saja + rate-limit.
 * - approve: DESIGN_REVIEW → PENDING_PAYMENT + event + actor
 *   (user lalu bayar via POST /api/orders/[id]/request-payment di dashboard).
 * - reject: DESIGN_REVIEW → REJECTED (terminal) + reviewNote WAJIB min 5 char
 *   (template preset dari REVIEW_REJECT_TEMPLATES ATAU custom) + event + actor.
 * - Selain dari DESIGN_REVIEW → 400.
 *
 * Sweep 24 jam SENGAJA tak menyentuh DESIGN_REVIEW (hanya PENDING_PAYMENT di
 * /api/cron/sweep) — order review menunggu + badge overdue di UI (milik UI).
 */

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  // Catatan admin (opsional untuk approve; untuk reject digabung dengan
  // template bila keduanya ada). Batas 1000 char anti-bloat kolom TEXT.
  note: z.string().max(1000).optional(),
  // Id template dari REVIEW_REJECT_TEMPLATES (opsional; "lainnya" = custom).
  templateId: z.string().max(64).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`review:ip:${ip}`, 30, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  }

  // Gerbang peran: HANYA ADMIN/SUPER_ADMIN (PRODUCTION_STAFF tak boleh ACC/TOLAK).
  let actor: { id: string; role: string };
  try {
    actor = await assertRole(["ADMIN", "SUPER_ADMIN"]);
  } catch (e: any) {
    const msg = e?.message || "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg.startsWith("Unauthorized") ? 401 : 403 });
  }
  const actorRole = actor.role as Role;
  const actorUserId = actor.id;

  const parsed = ReviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { action, note, templateId } = parsed.data;

  const { id: orderId } = await params;
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    columns: { id: true, orderNumber: true, status: true, userId: true },
  });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  // KONTRAK: review hanya dari DESIGN_REVIEW — selain itu 400.
  if (order.status !== "DESIGN_REVIEW") {
    return NextResponse.json(
      { error: `Hanya order DESIGN_REVIEW yang bisa direview (status saat ini: ${order.status}).` },
      { status: 400 }
    );
  }

  const target = action === "approve" ? "PENDING_PAYMENT" : "REJECTED";

  // Resolve alasan review SEBELUM tulis apa pun (fail-closed).
  let reviewNote: string | null = null;
  if (action === "reject") {
    const template = findRejectTemplate(templateId);
    if (templateId && !template) {
      return NextResponse.json({ error: `templateId "${templateId}" tidak dikenal.` }, { status: 400 });
    }
    const custom = (note || "").trim();
    const preset = (template?.text || "").trim();
    // Final = preset + custom digabung (salah satu boleh kosong) — WAJIB ≥ 5 char.
    reviewNote = [preset, custom].filter(Boolean).join(" — ") || null;
    if (!reviewNote || reviewNote.length < 5) {
      return NextResponse.json(
        { error: "Alasan penolakan wajib diisi (min 5 karakter) — pilih template preset ATAU tulis alasan custom." },
        { status: 400 }
      );
    }
  } else {
    const custom = (note || "").trim();
    reviewNote = custom || null;
    if (templateId) {
      const template = findRejectTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: `templateId "${templateId}" tidak dikenal.` }, { status: 400 });
      }
      // Approve + template: preset bersifat info tambahan (tak wajib).
      reviewNote = [(template.text || "").trim(), custom].filter(Boolean).join(" — ") || null;
    }
  }

  // WAJIB lewat mesin transisi per peran (DESIGN_REVIEW → PENDING_PAYMENT /
  // REJECTED untuk ADMIN/SUPER_ADMIN; terminal tak bisa keluar).
  try {
    assertTransition(actorRole, order.status, target);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Transisi status tidak diizinkan" }, { status: 400 });
  }

  // Update optimistis: gagal (0 baris) = status berubah di tengah jalan.
  // Kolom reviewNote/reviewedBy/reviewedAt BUTUH `db push` (Turso) — TANPA
  // migrasi di sesi ini (lihat prisma/schema.prisma + drizzle-schema.ts).
  const now = new Date();
  const race = await db
    .update(Order)
    .set({ status: target, reviewNote, reviewedBy: actorUserId, reviewedAt: now })
    .where(and(eq(Order.id, order.id), eq(Order.status, "DESIGN_REVIEW")));
  if ((race.rowsAffected ?? 0) === 0) {
    return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
  }

  await db.insert(OrderStatusEvent).values({
    id: nanoid(),
    orderId: order.id,
    status: target,
    note:
      action === "approve"
        ? `Desain DISETUJUI oleh admin (${actorRole}) — order dibuka untuk pembayaran via dashboard.${reviewNote ? ` Catatan: ${reviewNote}` : ""}`
        : `Desain DITOLAK oleh admin (${actorRole}). Alasan: ${reviewNote}`,
    actorUserId,
  });

  return NextResponse.json({ success: true, orderId: order.id, status: target });
}
