import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const OrderIdParam = z.string().min(5).max(64);

/**
 * M10.3 — GET /api/mobile/orders/:id/status
 * Lean polling: status + ringkasan non-PII (total, metode kirim/bayar, jumlah
 * item) agar tracker HP tampil data real, bukan hardcode Rp0.
 * Aman publik by-ID (cuid tak tertebak, tanpa PII) — pola sama seperti invoice web.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
      },
      with: {
        items: { columns: { quantity: true } },
        payment: { columns: { method: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const { items, payment, ...rest } = order as any;
    return NextResponse.json(
      {
        ...rest,
        itemCount: (items || []).reduce((a: number, it: any) => a + (it.quantity || 0), 0),
        paymentMethod: payment?.method || null,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
