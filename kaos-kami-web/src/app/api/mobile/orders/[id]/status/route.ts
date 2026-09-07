import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const OrderIdParam = z.string().min(5).max(64);

/**
 * M10.3 — GET /api/mobile/orders/:id/status
 * Ultra-lean polling (<500 bytes): hanya id, orderNumber, status, updatedAt.
 * Aman publik by-ID (cuid tak tertebak, tanpa PII) — pola sama seperti invoice web.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = OrderIdParam.safeParse(params.id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, parsed.data),
      columns: { id: true, orderNumber: true, status: true, updatedAt: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
