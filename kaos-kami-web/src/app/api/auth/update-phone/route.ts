import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { User } from "@/lib/drizzle-schema";
import { normalizePhoneId } from "@/lib/phone";

const Schema = z.object({
  phoneNumber: z.string().min(9).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
    }

    const clean = normalizePhoneId(parsed.data.phoneNumber);

    // Cek apakah nomor sudah dipakai user lain
    const existing = await db.query.User.findFirst({
      where: (t, { and, eq, ne }) => and(eq(t.phoneNumber, clean), ne(t.id, session.user.id)),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Nomor WhatsApp ini sudah digunakan oleh akun lain." },
        { status: 409 }
      );
    }

    await db.update(User).set({ phoneNumber: clean, updatedAt: new Date() }).where(eq(User.id, session.user.id));

    return NextResponse.json({ success: true, phoneNumber: clean });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
