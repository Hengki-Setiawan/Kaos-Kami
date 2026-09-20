import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { User } from "@/lib/drizzle-schema";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { normalizePhoneId } from "@/lib/phone";

const ProfileUpdateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  phoneNumber: z.string().optional().nullable(),
});

/**
 * PATCH /api/user/profile
 * Memperbarui nama lengkap dan nomor WhatsApp pengguna saat ini
 */
export async function PATCH(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data profil tidak valid" },
        { status: 400 }
      );
    }

    const { name, phoneNumber } = parsed.data;
    const cleanName = name.trim();
    let cleanPhone: string | null = null;

    if (phoneNumber && phoneNumber.trim()) {
      cleanPhone = normalizePhoneId(phoneNumber);
      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json(
          { error: "Format nomor WhatsApp tidak valid. Gunakan format seperti 08123456789 atau +628123456789." },
          { status: 400 }
        );
      }

      // Pastikan nomor telepon belum digunakan oleh akun lain
      const existingPhoneUser = await db.query.User.findFirst({
        where: (t, { and, eq, ne }) => and(eq(t.phoneNumber, cleanPhone!), ne(t.id, viewer.id)),
      });

      if (existingPhoneUser) {
        return NextResponse.json(
          { error: "Nomor WhatsApp ini sudah digunakan oleh akun lain." },
          { status: 409 }
        );
      }
    }

    await db
      .update(User)
      .set({
        name: cleanName,
        phoneNumber: cleanPhone,
        updatedAt: new Date(),
      })
      .where(eq(User.id, viewer.id));

    return NextResponse.json({
      success: true,
      user: {
        id: viewer.id,
        name: cleanName,
        email: viewer.email,
        phoneNumber: cleanPhone,
        role: viewer.role,
      },
      message: "Profil akun berhasil diperbarui!",
    });
  } catch (err: any) {
    console.error("[User Profile API] Error updating profile:", err);
    return NextResponse.json({ error: err?.message || "Gagal memperbarui profil akun" }, { status: 500 });
  }
}
