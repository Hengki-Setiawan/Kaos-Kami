import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { Account, Address, Session, User, Verification } from "@/lib/drizzle-schema";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { normalizePhoneId } from "@/lib/phone";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const ProfileUpdateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  phoneNumber: z.string().optional().nullable(),
  otpCode: z.string().regex(/^\d{6}$/).optional(),
});

/**
 * GET /api/user/profile
 * Profil milik sendiri (aman: TANPA passwordHash!). KEPUTUSAN OWNER 2026-09-24 (P0-2 E2E):
 * melengkapi PATCH+DELETE agar konsisten (script E2E + klien butuh uid tanpa tebak-tebakan DB).
 */
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`profile:ip:${getClientIp(req)}`, 60, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    }
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 });
    }
    const row = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, viewer.id),
      columns: { id: true, name: true, email: true, phoneNumber: true, role: true, phoneVerified: true, emailVerified: true, createdAt: true },
    });
    if (!row) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true, user: row });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat profil" }, { status: 500 });
  }
}

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

    const { name, phoneNumber, otpCode } = parsed.data;
    const cleanName = name.trim();
    let cleanPhone: string | null = null;
    let phoneChanged = false;

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

      // A3: ganti nomor WAJIB OTP milik nomor BARU (hash+expiry+satu-pakai).
      const meNow = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.id, viewer.id),
        columns: { phoneNumber: true },
      });
      const { canonicalPhone } = await import("@/lib/phone");
      phoneChanged =
        canonicalPhone(meNow?.phoneNumber || "") !== canonicalPhone(cleanPhone);
      if (phoneChanged) {
        if (!otpCode) {
          return NextResponse.json(
            { error: "Nomor berubah — minta kode OTP ke nomor BARU lalu ulangi simpan." },
            { status: 401 }
          );
        }
        const ip = getClientIp(req);
        const rl = await checkRateLimitAsync(`update-phone:ip:${ip}`, 10, 300);
        if (rl.isLimited) {
          return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
        }
        const canonNew = canonicalPhone(cleanPhone);
        const otpRecord = await db.query.Verification.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.identifier, `otp:${canonNew}`), eq(t.value, hashOtp(otpCode))),
          orderBy: (t, { desc }) => desc(t.createdAt),
        });
        if (!otpRecord || new Date() > otpRecord.expiresAt) {
          return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa." }, { status: 401 });
        }
        await db.delete(Verification).where(eq(Verification.identifier, `otp:${canonNew}`)).catch(() => {});
      }
    }

    await db
      .update(User)
      .set({
        name: cleanName,
        phoneNumber: cleanPhone,
        // Nomor baru = verifikasi lama hangus (wajib OTP sekali).
        ...(phoneChanged ? { phoneVerified: false } : {}),
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
      message: phoneChanged
        ? "Profil diperbarui. Nomor baru perlu OTP sekali sebelum bebas OTP."
        : "Profil akun berhasil diperbarui!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memperbarui profil akun" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/profile — hapus akun (UU PDP): anonimisasi identitas,
 * cabut semua sesi, riwayat operasional (order) dipertahankan tanpa PII.
 * Body: { confirm: "HAPUS" } (konfirmasi ganda).
 */
export async function DELETE(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (body?.confirm !== "HAPUS") {
      return NextResponse.json({ error: 'Ketik konfirmasi "HAPUS" untuk menghapus akun.' }, { status: 400 });
    }
    const tag = `deleted-${viewer.id.slice(0, 8)}`;
    await db.update(User).set({
      name: "Pengguna Dihapus",
      email: `${tag}@deleted.local`,
      phoneNumber: null,
      phoneVerified: false,
      passwordHash: null,
      image: null,
      updatedAt: new Date(),
    }).where(eq(User.id, viewer.id)).catch(() => {});
    await db.update(Address).set({ recipientName: "Dihapus", phoneNumber: "-" }).where(eq(Address.userId, viewer.id)).catch(() => {});
    await db.delete(Session).where(eq(Session.userId, viewer.id)).catch(() => {});
    await db.delete(Account).where(eq(Account.userId, viewer.id)).catch(() => {});
    await db.delete(Verification).where(eq(Verification.identifier, `del:${viewer.id}`)).catch(() => {});
    return NextResponse.json({ success: true, message: "Akun dihapus dan identitas dianonimkan." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
