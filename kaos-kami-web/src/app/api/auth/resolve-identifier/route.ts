import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { User } from "@/lib/drizzle-schema";
import { normalizePhoneId } from "@/lib/phone";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const ResolveSchema = z.object({
  identifier: z.string().min(1).max(255),
});

/**
 * POST /api/auth/resolve-identifier
 * Mengonversi identifier login (Email, Nomor WhatsApp, atau Username / Nama Lengkap)
 * menjadi canonical email yang terdaftar di Better Auth.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimitAsync(`resolve-id:ip:${ip}`, 30, 60); // 30 req/menit
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan." },
        { status: 429, headers: rateLimitHeaders(ipLimit, 30) }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifier wajib diisi" }, { status: 400 });
    }

    const raw = parsed.data.identifier.trim();

    // A4 anti-enumerasi: rate per-identifier (bucket hash, bukan PII mentah) +
    // respons SERAGAM tanpa flag matched (ada/tidaknya akun tak bisa dibedakan).
    let idHash = 0;
    for (let i = 0; i < raw.length; i++) idHash = (idHash * 31 + raw.charCodeAt(i)) | 0;
    const idLimit = await checkRateLimitAsync(`resolve-id:one:${(idHash >>> 0).toString(36)}`, 10, 300);
    if (idLimit.isLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan untuk identifier ini." },
        { status: 429, headers: rateLimitHeaders(idLimit, 10) }
      );
    }

    // 1. Jika sudah berformat email standar
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json({
        email: raw.toLowerCase(),
        type: "email",
      });
    }

    // 2. Jika merupakan format nomor telepon (hanya digit atau awalan +/0/62)
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (digitsOnly.length >= 9 && digitsOnly.length <= 16) {
      const normalized08 = normalizePhoneId(raw); // Mengubah +62 / 62 menjadi 08
      const formatted62 = normalized08.replace(/^0/, "62");

      const userByPhone = await db.query.User.findFirst({
        where: (t, { or, eq }) =>
          or(
            eq(t.phoneNumber, normalized08),
            eq(t.phoneNumber, formatted62),
            eq(t.phoneNumber, raw),
            eq(t.email, `${normalized08}@kaoskami.phone`),
            eq(t.email, `${digitsOnly}@kaoskami.phone`)
          ),
      });

      if (userByPhone?.email) {
        return NextResponse.json({
          email: userByPhone.email,
          type: "phone",
        });
      }

      // Fallback untuk nomor yang belum ada atau akun virtual lama
      return NextResponse.json({
        email: `${normalized08}@kaoskami.phone`,
        type: "phone",
      });
    }

    // 3. Jika merupakan username / nama lengkap
    const userByName = await db.query.User.findFirst({
      where: (t, { eq, sql }) =>
        or(
          eq(t.name, raw),
          sql`LOWER(${t.name}) = LOWER(${raw})`
        ),
    });

    if (userByName?.email) {
      return NextResponse.json({
        email: userByName.email,
        type: "username",
      });
    }

    // Fallback: kembalikan input mentah
    return NextResponse.json({
      email: raw,
      type: "unknown",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
