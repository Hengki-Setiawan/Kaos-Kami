import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

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
    const validation = RegisterSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { pushToken, platform, userId } = validation.data;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }
    }

    const device = await prisma.userDevice.upsert({
      where: { pushToken },
      update: { platform, userId: userId ?? undefined },
      create: { pushToken, platform, userId: userId ?? undefined },
    });

    return NextResponse.json({ success: true, deviceId: device.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
