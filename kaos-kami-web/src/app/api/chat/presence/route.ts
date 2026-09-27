import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserPresence } from "@/lib/drizzle-schema";
import { eq, inArray, desc } from "drizzle-orm";
import { isShopOpen, SHOP_HOURS_LABEL } from "@/lib/shopHours";

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

export async function GET() {
  try {
    const adminPresence = await db.query.UserPresence.findFirst({
      where: (t, { inArray }: any) => inArray(t.role, ["ADMIN", "SUPER_ADMIN"]),
      orderBy: (t, { desc }: any) => desc(t.lastSeenAt),
    });

    const now = new Date();
    const shopOpen = isShopOpen(now);

    let isAdminOnline = false;
    let lastSeenText = "Belum aktif hari ini";
    let lastSeenAt: string | null = null;

    if (adminPresence) {
      lastSeenAt = adminPresence.lastSeenAt ? new Date(adminPresence.lastSeenAt).toISOString() : null;
      const lastSeenDate = new Date(adminPresence.lastSeenAt);
      const diffMs = now.getTime() - lastSeenDate.getTime();
      
      // Online bila ada aktivitas dalam 4 menit terakhir
      if (diffMs <= 4 * 60 * 1000) {
        isAdminOnline = true;
        lastSeenText = "Online sekarang";
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
        role: "Asisten Workshop Kaos Kami",
        avatarUrl: "/mascot/mascot-primary.png",
        welcomeMessage: "Halo! Saya Kamito, asisten sablon Kaos Kami Makassar. Ada yang bisa saya bantu seputar pesanan atau desainmu?",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat status kehadiran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
