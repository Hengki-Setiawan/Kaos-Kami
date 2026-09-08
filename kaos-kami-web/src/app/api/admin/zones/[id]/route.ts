import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ExpeditionZone } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

async function requireAdmin(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-zone:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited)
    return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) }) };
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return { error: NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 }) };
    }
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {};
}

const PatchSchema = z.object({
  city: z.string().min(2).max(80).optional(),
  province: z.string().min(2).max(80).optional(),
  courier: z.string().min(2).max(40).optional(),
  service: z.string().min(1).max(40).optional(),
  costIdr: z.number().int().min(0).max(10_000_000).optional(),
  etdLabel: z.string().min(1).max(40).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan valid" }, { status: 400 });
  }
  // Zona default fallback tidak boleh dinonaktifkan (jaminan selalu ada tarif).
  if (id === "zone_default_lainnya" && parsed.data.isActive === false) {
    return NextResponse.json({ error: "Zona default tidak boleh dinonaktifkan" }, { status: 400 });
  }
  const [row] = await db.update(ExpeditionZone).set(parsed.data).where(eq(ExpeditionZone.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Zona tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ zone: row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await params;
  if (id === "zone_default_lainnya") {
    return NextResponse.json({ error: "Zona default tidak boleh dihapus" }, { status: 400 });
  }
  const [row] = await db.delete(ExpeditionZone).where(eq(ExpeditionZone.id, id)).returning({ id: ExpeditionZone.id });
  if (!row) return NextResponse.json({ error: "Zona tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
