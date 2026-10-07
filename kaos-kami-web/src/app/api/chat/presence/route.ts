import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserPresence } from "@/lib/drizzle-schema";
import { eq, inArray, desc } from "drizzle-orm";
import { isShopOpen, SHOP_HOURS_LABEL } from "@/lib/shopHours";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Baru saja aktif";
  if (diffMins < 60) return `Aktif ${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Aktif ${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `Aktif ${diffDays} hari lalu`;
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`presence:ip:${getClientIp(req)}`, 60, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    }
    const adminPresence = await db.query.UserPresence.findFirst({
      where: (t, { inArray }: any) => inArray(t.role, ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"]),
      orderBy: (t, { desc }: any) => desc(t.lastSeenAt),
    });

    const now = new Date();
    const shopOpen = isShopOpen(now);

    let isAdminOnline = false;
    let lastSeenText = shopOpen ? "Workshop Buka (09.00 - 21.00 WITA)" : "Workshop Tutup (Buka 09.00 WITA)";
    let lastSeenAt: string | null = null;

    if (adminPresence) {
      lastSeenAt = adminPresence.lastSeenAt ? new Date(adminPresence.lastSeenAt).toISOString() : null;
      const lastSeenDate = new Date(adminPresence.lastSeenAt);
      const diffMs = now.getTime() - lastSeenDate.getTime();
      
      // Online bila ada aktivitas dalam 5 menit terakhir
      if (diffMs <= 5 * 60 * 1000) {
        isAdminOnline = true;
        lastSeenText = "Online sekarang";
      } else if (shopOpen) {
        lastSeenText = "Workshop Buka (09.00 - 21.00 WITA)";
      } else {
        lastSeenText = formatRelativeTime(lastSeenDate);
      }
    }

    return NextResponse.json({
      success: true,
      isAdminOnline,
      lastSeenText,
      lastSeenAt,
      isShopOpen: shopOpen,
      shopHoursLabel: SHOP_HOURS_LABEL,
      mascot: {
        name: "Kamito",
        role: "CS & Workshop Admin Kaos Kami",
        avatarUrl: "/mascot/kamito-avatar.png",
        welcomeMessage: "Halo! Saya Kamito dari Customer Service Kaos Kami Makassar. Ada yang bisa kami bantu seputar pesanan sablon DTF, bahan combed, atau konfirmasi pesananmu?",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat status kehadiran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`presence-mut:ip:${getClientIp(req)}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (user as any)?.role || "CUSTOMER";
    const name = user.name || "Pengguna";

    // Simpan atau perbarui presence
    const now = new Date();
    await db
      .insert(UserPresence)
      .values({
        userId: user.id,
        userName: name,
        role: role,
        lastSeenAt: now,
        isOnline: true,
      })
      .onConflictDoUpdate({
        target: UserPresence.userId,
        set: {
          lastSeenAt: now,
          isOnline: true,
          userName: name,
          role: role,
        },
      });

    return NextResponse.json({ success: true, timestamp: now.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memperbarui presence" }, { status: 500 });
  }
}
