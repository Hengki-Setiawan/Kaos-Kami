import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { User } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const PatchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["CUSTOMER", "ADMIN", "PRODUCTION_STAFF", "SUPER_ADMIN"]),
});

export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cust:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const myRole = (session?.user as any)?.role;
    const myId = (session?.user as any)?.id;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
      return NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 });
    }
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    const { userId, role } = parsed.data;
    if (userId === myId) {
      return NextResponse.json({ error: "Tidak bisa ubah role sendiri (anti-lockout)" }, { status: 400 });
    }
    await db.update(User).set({ role }).where(eq(User.id, userId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
