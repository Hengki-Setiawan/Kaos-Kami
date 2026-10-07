import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/** GET /api/user/profile/export — unduh data saya (UU PDP: hak akses data). */
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`profile-export:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
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
