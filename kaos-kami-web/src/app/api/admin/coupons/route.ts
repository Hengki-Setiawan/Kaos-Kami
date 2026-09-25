import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Coupon } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

async function requireAdmin(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-coupon:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) }) };
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

const CreateSchema = z.object({
  code: z.string().min(3).max(32),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().positive(),
  minSpendIdr: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (v) => (v.discountType === "PERCENT" ? v.discountValue <= 100 : v.discountValue <= 50_000_000),
  { message: "Nilai diskon di luar batas (persen ≤100, tetap ≤Rp50jt)" }
);

// Sortir yang didukung halaman admin — selaras dengan page.tsx.
const SORTS = ["code_asc", "code_desc", "used_desc", "used_asc"] as const;

/** GET /api/admin/coupons — daftar kupon (admin only, paginasi + sortir). */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.max(1, Math.min(200, Number(sp.get("limit")) || 50));
  const sort = SORTS.includes(sp.get("sort") as (typeof SORTS)[number])
    ? (sp.get("sort") as (typeof SORTS)[number])
    : "code_desc";
  const rows = await db.query.Coupon.findMany({
    orderBy: (t, { asc, desc }) =>
      sort === "code_asc"
        ? [asc(t.code)]
        : sort === "used_desc"
          ? [desc(t.usedCount)]
          : sort === "used_asc"
            ? [asc(t.usedCount)]
            : [desc(t.code)],
    limit: limit + 1,
    offset: (page - 1) * limit,
  });
  const hasMore = rows.length > limit;
  return NextResponse.json({
    success: true,
    page,
    limit,
    sort,
    hasMore,
    coupons: hasMore ? rows.slice(0, limit) : rows,
  });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

/**
 * DELETE /api/admin/coupons — SATU-SATUNYA jalur hapus (permanen via body { id } atau ?id=).
 * Mengembalikan 404 bila kupon tidak ada. Jangan tambah jalur hapus lain (mis. PATCH delete:true).
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const sp = new URL(req.url).searchParams;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const parsed = DeleteSchema.safeParse(
    body && typeof body === "object" && (body as Record<string, unknown>).id
      ? body
      : { id: sp.get("id") || "" }
  );
  if (!parsed.success) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  const [gone] = await db.delete(Coupon).where(eq(Coupon.id, parsed.data.id)).returning({ id: Coupon.id });
  if (!gone) return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ success: true, deleted: true, id: gone.id });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid" }, { status: 400 });
  const v = parsed.data;
  try {
    const [row] = await db
      .insert(Coupon)
      .values({
        id: nanoid(),
        code: v.code.trim().toUpperCase(),
        discountType: v.discountType,
        discountValue: v.discountValue,
        minSpendIdr: v.minSpendIdr,
        maxUses: v.maxUses ?? null,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
        isActive: v.isActive ?? true,
      })
      .returning();
    return NextResponse.json({ success: true, coupon: row });
  } catch {
    return NextResponse.json({ error: "Kode sudah dipakai / gagal simpan" }, { status: 400 });
  }
}

// PATCH hanya untuk edit field (tanpa cabang hapus — hapus HANYA via DELETE).
const PatchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  resetUsage: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { id, isActive, maxUses, expiresAt, resetUsage } = parsed.data;
  const set: Record<string, unknown> = {};
  if (isActive !== undefined) set.isActive = isActive;
  if (maxUses !== undefined) set.maxUses = maxUses;
  if (expiresAt !== undefined) set.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (resetUsage) set.usedCount = 0;
  if (Object.keys(set).length === 0) return NextResponse.json({ error: "Tidak ada aksi" }, { status: 400 });
  const [row] = await db.update(Coupon).set(set).where(eq(Coupon.id, id)).returning({ id: Coupon.id });
  if (!row) return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ success: true });
}
