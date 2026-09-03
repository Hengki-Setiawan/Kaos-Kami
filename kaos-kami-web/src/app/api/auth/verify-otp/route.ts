import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, code } = await req.json();
    if (!phoneNumber || !code) return NextResponse.json({ error: "WA & kode wajib" }, { status: 400 });
    const clean = phoneNumber.replace(/[^0-9]/g, "");
    const record = await prisma.verification.findFirst({
      where: { identifier: `otp:${clean}`, value: code },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return NextResponse.json({ error: "Kode salah" }, { status: 400 });
    if (new Date() > record.expiresAt) return NextResponse.json({ error: "Kode kadaluarsa" }, { status: 400 });

    // Hapus biar tidak dipakai ulang
    await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});

    // Tandai phone terverifikasi — bisa set User.phoneNumber verified jika ada session, tapi untuk checkout cukup return success
    return NextResponse.json({ success: true, verified: true, phone: clean });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
