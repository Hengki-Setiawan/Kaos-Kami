import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, Payment } from "@/lib/drizzle-schema";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Allowlist email admin darurat untuk bypass (tanpa ubah logika bisnis/DB):
// - Prod: set BYPASS_PAYMENT_ADMIN_EMAILS="a@x.id,b@y.id" via env/wrangler secret.
// - Fallback = 2 email bawaan lama agar perilaku tak berubah bila env unset.
// - Perbandingan case-insensitive; nilai kosong diabaikan.
const BYPASS_FALLBACK_EMAILS = ["hengkishadow@gmail.com", "admin@kaoskami.biz.id"];
function getBypassEmailAllowlist(): string[] {
  const fromEnv = (process.env.BYPASS_PAYMENT_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : BYPASS_FALLBACK_EMAILS;
}

/**
 * POST /api/orders/[id]/bypass-payment
 * Endpoint khusus ADMIN untuk bypass pembayaran pesanan yang sudah ada di antrean
 * (baik DESIGN_REVIEW maupun PENDING_PAYMENT) langsung menjadi PAYMENT_CONFIRMED
 * dan menerbitkan tiket produksi DTF di Kanban.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const rl = await checkRateLimitAsync(`bypass:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { success: false, error: "Terlalu sering. Tunggu sebentar." },
        { status: 429, headers: rateLimitHeaders(rl, 10) }
      );
    }

    // 1. Verifikasi role ADMIN (Strict Server-Side Gate)
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });

    const userRole = (session?.user as any)?.role;
    const userEmail = session?.user?.email;
    const isAdmin =
      ["ADMIN", "SUPER_ADMIN"].includes(userRole) ||
      getBypassEmailAllowlist().includes((userEmail || "").toLowerCase());

    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya admin yang dapat melakukan bypass pembayaran" },
        { status: 403 }
      );
    }

    // 2. Ambil pesanan
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, orderId),
      with: { items: true, payment: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (["PAYMENT_CONFIRMED", "PRINTING", "PRESSING", "READY_TO_SHIP", "COMPLETED"].includes(order.status)) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: order.status,
        message: "Pesanan ini sudah lunas/dalam produksi.",
      });
    }

    // 3. Jika status DESIGN_REVIEW, bawa dulu ke PENDING_PAYMENT
    if (order.status === "DESIGN_REVIEW") {
      await db
        .update(Order)
        .set({
          status: "PENDING_PAYMENT",
          reviewedBy: session.user.id || "ADMIN_BYPASS",
        })
        .where(eq(Order.id, order.id));

      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "PENDING_PAYMENT",
        note: `Desain disetujui via Admin Test Bypass (${session.user.name || userEmail}). Siap konfirmasi lunas.`,
      });
    }

    // 4. Catat Payment jika belum ada
    if (!order.payment) {
      await db.insert(Payment).values({
        id: nanoid(),
        orderId: order.id,
        provider: "ADMIN_BYPASS",
        providerRef: `TEST-BYPASS-${nanoid(8).toUpperCase()}`,
        amountIdr: order.totalIdr,
        status: "SETTLED",
      });
    } else {
      await db
        .update(Payment)
        .set({
          status: "SETTLED",
          provider: "ADMIN_BYPASS",
          providerRef: `TEST-BYPASS-${nanoid(8).toUpperCase()}`,
        })
        .where(eq(Payment.orderId, order.id));
    }

    // Tag note order agar tidak mencemari omzet
    const testTag = "[TEST_ORDER:ADMIN_BYPASS]";
    const currentNotes = order.notes || "";
    if (!currentNotes.includes(testTag)) {
      const updatedNotes = currentNotes ? `${currentNotes} | ${testTag}` : testTag;
      await db.update(Order).set({ notes: updatedNotes }).where(eq(Order.id, order.id));
    }

    // 5. Konfirmasi lunas & terbitkan tiket produksi
    const isExpress = order.courierNotes?.includes("[TIER:EXPRESS_24H]") === true;
    const confirmResult = await confirmOrderPaid(order.id, {
      via: `ADMIN_BYPASS (${session.user.name || userEmail})`,
      paymentCode: "ADMIN_BYPASS",
      reference: `BYPASS-${order.orderNumber}`,
      express: isExpress,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "PAYMENT_CONFIRMED",
      confirmResult,
      message: "Pembayaran berhasil di-bypass. Status pesanan lunas dan tiket produksi DTF telah terbit di Kanban.",
    });
  } catch (error: any) {
    console.error("[bypass-payment] Gagal:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memproses bypass pembayaran" },
      { status: 500 }
    );
  }
}
