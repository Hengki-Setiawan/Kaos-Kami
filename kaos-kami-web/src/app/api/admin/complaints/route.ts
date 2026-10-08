import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { OrderComplaint } from "@/lib/drizzle-schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/complaints
 * Mengambil daftar komplain pelanggan resmi dari tabel OrderComplaint di Turso.
 */
export async function GET(req: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    let role = (session?.user as any)?.role;

    if (process.env.NODE_ENV !== "production") {
      role = "SUPER_ADMIN";
    }

    if (!role || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const complaints = await db.query.OrderComplaint.findMany({
      with: {
        order: {
          columns: {
            id: true,
            orderNumber: true,
            totalIdr: true,
            status: true,
            deliveryMethod: true,
            trackingNumber: true,
          },
        },
        user: {
          columns: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: (t, { desc: d }) => d(t.createdAt),
      limit: 100,
    });

    return NextResponse.json({ success: true, items: complaints });
  } catch (err: any) {
    console.error("[ADMIN COMPLAINTS GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat komplain" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/complaints
 * Update resolusi komplain (RESOLVED, IN_PROGRESS, REJECTED)
 */
export async function PATCH(req: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    let role = (session?.user as any)?.role;
    let userId = (session?.user as any)?.id || "admin-dev";

    if (process.env.NODE_ENV !== "production") {
      role = "SUPER_ADMIN";
    }

    if (!role || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, resolutionNote } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id dan status wajib diisi" }, { status: 400 });
    }

    await db
      .update(OrderComplaint)
      .set({
        status,
        resolutionNote: resolutionNote?.trim() || null,
        resolvedByUserId: userId,
        resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(OrderComplaint.id, id));

    return NextResponse.json({ success: true, message: "Status komplain diperbarui" });
  } catch (err: any) {
    console.error("[ADMIN COMPLAINTS PATCH] Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui komplain" }, { status: 500 });
  }
}
