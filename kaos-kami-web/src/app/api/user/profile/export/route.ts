import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/security/authGuard";

/** GET /api/user/profile/export — unduh data saya (UU PDP: hak akses data). */
export async function GET(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, viewer.id),
      columns: { id: true, name: true, email: true, phoneNumber: true, role: true, createdAt: true },
    });
    const addresses = await db.query.Address.findMany({
      where: (t, { eq }) => eq(t.userId, viewer.id),
      limit: 50,
    });
    const orders = await db.query.Order.findMany({
      where: (t, { eq }) => eq(t.userId, viewer.id),
      columns: { id: true, orderNumber: true, status: true, totalIdr: true, createdAt: true },
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 100,
    });
    return NextResponse.json({
      success: true,
      exportedAt: new Date().toISOString(),
      user: me,
      addresses,
      orders,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
