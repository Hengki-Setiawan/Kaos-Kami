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
  discountValue: z.number().int().positive().max(100),
  minSpendIdr: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid" }, { status: 400 });
  const v = parsed.data;
  if (v.discountType === "PERCENT" && v.discountValue > 100) {
    return NextResponse.json({ error: "Persen maksimal 100" }, { status: 400 });
  }
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
      })
      .returning();
    return NextResponse.json({ success: true, coupon: row });
  } catch {
    return NextResponse.json({ error: "Kode sudah dipakai / gagal simpan" }, { status: 400 });
  }
}

const PatchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  delete: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { id, isActive, delete: del } = parsed.data;
  if (del) {
    await db.delete(Coupon).where(eq(Coupon.id, id));
    return NextResponse.json({ success: true, deleted: true });
  }
  if (isActive !== undefined) {
    await db.update(Coupon).set({ isActive }).where(eq(Coupon.id, id));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Tidak ada aksi" }, { status: 400 });
}
