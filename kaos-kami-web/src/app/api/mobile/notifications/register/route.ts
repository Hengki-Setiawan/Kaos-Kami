import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { UserDevice } from "@/lib/drizzle-schema";
import { assertResourceOwnerOrAdmin } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const RegisterSchema = z.object({
  pushToken: z.string().min(10).max(512),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  userId: z.string().min(1).optional(),
});

/**
 * M10.5 — POST /api/mobile/notifications/register
 * Simpan token FCM/APNs ke UserDevice (upsert by token). userId opsional;
 * jika diisi harus cocok dengan user di DB.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`register:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak registrasi." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const validation = RegisterSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { pushToken, platform, userId } = validation.data;

    // Klaim token ke userId HANYA oleh pemilik akun (anti sadap notifikasi).
    // Tanpa sesi login, token disimpan tanpa kaitan user.
    let linkUserId: string | undefined;
    if (userId) {
      try {
        await assertResourceOwnerOrAdmin(userId);
      } catch (e: any) {
        const msg = e?.message || "Forbidden";
        const status = msg.startsWith("Unauthorized") ? 401 : 403;
        return NextResponse.json({ error: msg }, { status });
      }
      const user = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.id, userId),
        columns: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }
      linkUserId = userId;
    }

    const [device] = await db
      .insert(UserDevice)
      .values({ id: nanoid(), pushToken, platform, userId: linkUserId })
      .onConflictDoUpdate({
        target: UserDevice.pushToken,
        set: { platform, userId: linkUserId },
      })
      .returning({ id: UserDevice.id });

    return NextResponse.json({ success: true, deviceId: device?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
