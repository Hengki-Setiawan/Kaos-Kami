import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { nanoid } from "nanoid";
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

const ZoneSchema = z.object({
  city: z.string().min(2).max(80),
  province: z.string().min(2).max(80),
  courier: z.string().min(2).max(40),
  service: z.string().min(1).max(40),
  costIdr: z.number().int().min(0).max(10_000_000),
  etdLabel: z.string().min(1).max(40),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const rows = await db
    .select()
    .from(ExpeditionZone)
    .orderBy(asc(ExpeditionZone.sortOrder), asc(ExpeditionZone.city));
  return NextResponse.json({ zones: rows });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = ZoneSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input zona tidak valid" }, { status: 400 });
  }
  try {
    const [row] = await db.insert(ExpeditionZone).values({ id: nanoid(), ...parsed.data }).returning();
    return NextResponse.json({ zone: row }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message || "").includes("UNIQUE")) {
      return NextResponse.json({ error: "Zona kota+kurir+layanan ini sudah ada" }, { status: 409 });
    }
    throw e;
  }
}
