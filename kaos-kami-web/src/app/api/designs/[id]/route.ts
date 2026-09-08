import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// GET /api/designs/[id] — satu desain untuk deep-link studio (audit #14).
// Menggantikan fetch-SEMUA + find di client (over-fetch + bocor daftar).
// Aturan lihat = pola PATCH/DELETE: milik sendiri, staf, atau tamu pemegang ID.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimitAsync(`design-get:ip:${getClientIp(_req)}`, 30, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  }
  try {
    const { id } = await params;
    const parsed = z.string().min(5).max(64).safeParse(id);
    if (!parsed.success) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const design = await db.query.Design.findFirst({
      where: (t, { eq }) => eq(t.id, parsed.data),
      with: { category: true },
    });
    if (!design) return NextResponse.json({ error: "Desain tidak ditemukan" }, { status: 404 });
    const viewer = await getAuthenticatedUser().catch(() => null);
    const viewerRole = (viewer as any)?.role;
    const isStaff = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(viewerRole);
    if (design.userId && (!viewer || (!isStaff && viewer.id !== design.userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { design },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal muat desain" }, { status: 500 });
  }
}
