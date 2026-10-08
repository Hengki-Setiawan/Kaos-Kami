import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { User, Session } from "@/lib/drizzle-schema";

export const dynamic = "force-dynamic";

/**
 * Endpoint Bypass Akses PIN Rahasia (5x Klik Logo)
 * - PIN 164164 -> Akses SUPER ADMIN (Admin Utama) -> Redirect ke /admin
 * - PIN 461461 -> Akses AKUN USER (Customer) -> Redirect ke /dashboard/orders
 * Mengaitkan sesi resmi Better Auth + cookie role agar tidak ditolak middleware/layout.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pin = String(body.pin || "").trim();

    let targetRole: "SUPER_ADMIN" | "CUSTOMER" | null = null;
    let redirectUrl = "/";

    if (pin === "164164") {
      targetRole = "SUPER_ADMIN";
      redirectUrl = "/admin";
    } else if (pin === "461461") {
      targetRole = "CUSTOMER";
      redirectUrl = "/dashboard/orders";
    } else {
      return NextResponse.json(
        { success: false, error: "PIN Salah! Akses ditolak." },
        { status: 401 }
      );
    }

    // 1. Cari atau buat user yang sesuai di database Turso
    let targetUser: any = null;

    if (targetRole === "SUPER_ADMIN") {
      targetUser = await db.query.User.findFirst({
        where: (t, { or, eq }) => or(eq(t.role, "SUPER_ADMIN"), eq(t.role, "ADMIN")),
      });

      if (!targetUser) {
        const newId = nanoid(21);
        await db.insert(User).values({
          id: newId,
          name: "Hengki Setiawan (Super Admin)",
          email: "admin@kaoskami.biz.id",
          role: "SUPER_ADMIN",
          emailVerified: true,
        });
        targetUser = {
          id: newId,
          name: "Hengki Setiawan (Super Admin)",
          email: "admin@kaoskami.biz.id",
          role: "SUPER_ADMIN",
        };
      }
    } else {
      targetUser = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.role, "CUSTOMER"),
      });

      if (!targetUser) {
        // Ambil user sembarang atau buat baru
        const anyUser = await db.query.User.findFirst();
        if (anyUser) {
          targetUser = anyUser;
        } else {
          const newId = nanoid(21);
          await db.insert(User).values({
            id: newId,
            name: "Pelanggan Pengujian (Customer)",
            email: "customer@kaoskami.biz.id",
            role: "CUSTOMER",
            emailVerified: true,
          });
          targetUser = {
            id: newId,
            name: "Pelanggan Pengujian (Customer)",
            email: "customer@kaoskami.biz.id",
            role: "CUSTOMER",
          };
        }
      }
    }

    // 2. Buat sesi otentikasi resmi di tabel Session
    const token = nanoid(36);
    const sessionId = nanoid(24);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 hari

    await db.insert(Session).values({
      id: sessionId,
      userId: targetUser.id,
      token: token,
      expiresAt: expiresAt,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "SecretPinBypass",
    });

    // 3. Buat response dan suntikkan cookie resmi Better Auth & Dev Role
    const res = NextResponse.json({
      success: true,
      role: targetRole,
      userName: targetUser.name,
      redirectUrl,
      message: `Akses ${targetRole === "SUPER_ADMIN" ? "Super Admin Utama" : "Pelanggan"} berhasil dibuka!`,
      sessionUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetRole,
      },
    });

    const isHttps = req.nextUrl.protocol === "https:";

    // Cookie Better Auth Session Token (digunakan oleh getSession)
    res.cookies.set("better-auth.session_token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
    });

    if (isHttps) {
      res.cookies.set("__Secure-better-auth.session_token", token, {
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
    }

    // Cookie Role Pendukung & User ID
    res.cookies.set("kaos_dev_role", targetRole, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
    });

    res.cookies.set("kaos_dev_user_id", targetUser.id, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (err: any) {
    console.error("Gagal memproses bypass PIN:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
