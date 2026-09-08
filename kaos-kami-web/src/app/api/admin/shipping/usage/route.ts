import { NextRequest, NextResponse } from "next/server";
import { awUsage } from "@/lib/shipping/agenwebsite";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Admin: sisa kuota AgenWebsite hari ini (peringatan 80%/95% di UI).
export async function GET(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-ship:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited)
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const usage = await awUsage();
  if (!usage) {
    return NextResponse.json({ configured: false, message: "API key AgenWebsite belum dipasang." });
  }
  return NextResponse.json({ configured: true, usage });
}
