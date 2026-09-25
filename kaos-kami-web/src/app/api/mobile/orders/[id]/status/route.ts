import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const OrderIdParam = z.string().min(5).max(64);

/**
 * M10.3 — GET /api/mobile/orders/:id/status
 * Lean polling: status + ringkasan non-PII (total, metode kirim/bayar, jumlah
 * item) agar tracker HP tampil data real, bukan hardcode Rp0.
 * Aman publik by-ID (cuid tak tertebak, tanpa PII) — pola sama seperti invoice web.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Rate-limit KETAT: endpoint publik by-ID (tanpa auth) + pola polling —
    // 30/mnt/IP cukup untuk tracker (poll 5–10 dtk) tapi memenggal enumerasi
    // ID; key IP satu-satunya opsi (tanpa userId di jalur publik).
    const rl = await checkRateLimitAsync(`mobile-order-status:ip:${getClientIp(req)}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    const { id } = await params;
    const parsed = OrderIdParam.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, parsed.data),
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        updatedAt: true,
        totalIdr: true,
        deliveryMethod: true,
        // Q6: dimensi + review agar tracker HP tampil data asli (non-PII).
        reviewNote: true,
        reviewedAt: true,
      },
      with: {
        items: { columns: { quantity: true } },
        payment: { columns: { method: true } },
        productionTasks: {
          columns: { printWidthCm: true, printHeightCm: true },
          limit: 10,
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const { items, payment, productionTasks, ...rest } = order as any;
    const dims = (productionTasks || []).filter(
      (t: any) => Number(t.printWidthCm) > 0 && Number(t.printHeightCm) > 0
    );
    const firstDim = dims[0] || null;
    return NextResponse.json(
      {
        ...rest,
        itemCount: (items || []).reduce((a: number, it: any) => a + (it.quantity || 0), 0),
        paymentMethod: payment?.method || null,
        printWidthCm: firstDim ? Number(firstDim.printWidthCm) : null,
        printHeightCm: firstDim ? Number(firstDim.printHeightCm) : null,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
