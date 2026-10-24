import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { Account, Session, User, Verification } from "./drizzle-schema";
import { isDevOrTest } from "./envMode";

/**
 * Baca header dari context Better Auth. `ctx.headers` bisa berupa Headers,
 * object, atau array; `ctx.request` adalah fallback yang paling stabil.
 */
function readRequestHeader(ctx: any, name: string): string {
  try {
    const fromHeaders = new Headers(ctx?.headers as HeadersInit | undefined);
    const value = fromHeaders.get(name);
    if (value) return value;
  } catch {
    // lanjut ke request
  }
  try {
    return ctx?.request?.headers?.get?.(name) || "";
  } catch {
    return "";
  }
}

function isEmailPasswordSignup(ctx: any): boolean {
  const path = (String(ctx?.path || "").split("?")[0] ?? "").replace(/\/+$/, "");
  return path === "/sign-up/email" || path.endsWith("/sign-up/email");
}

const authSecret = process.env.BETTER_AUTH_SECRET || "";
// Secret default = semua session bisa ditempa. Wajib di-set di production.
if (!authSecret && !isDevOrTest()) {
  throw new Error("BETTER_AUTH_SECRET belum di-set (wrangler secret put BETTER_AUTH_SECRET)");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    // Petakan model better-auth ke tabel Turso yang sudah ada
    // (nama tabel kapital warisan Prisma — tanpa migrasi).
    schema: {
      user: User,
      session: Session,
      account: Account,
      verification: Verification,
    },
  }),
  baseURL: (() => {
    if (isDevOrTest()) {
      const url = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      if (url.includes("workers.dev") || url.includes("kaoskami.biz.id")) {
        return "http://localhost:3000";
      }
      return url;
    }
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kaoskami.biz.id";
  })(),
  // Domain kanonis + www: login/cookie dari kedua host harus diterima.
  // C3 (owner, 11 Sep 2026): *.workers.dev DITOLAK permanen — cabut-total
  // (tak ada user lama); JANGAN tambahkan kembali sebagai trustedOrigin /
  // fallback login/API. Filter di bawah menegakkannya juga untuk
  // TRUSTED_ORIGINS dari env (anti salah-config).
  // P1 (13 Sep 2026): dev dapat http://localhost:3000; prod HANYA kanonis +
  // TRUSTED_ORIGINS (koma-separated, mis. staging). workers.dev selalu dibuang.
  trustedOrigins: (() => {
    const canonical = ["https://kaoskami.biz.id", "https://www.kaoskami.biz.id"];
    const extra = (process.env.TRUSTED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.includes("workers.dev"));
    const origins = [...canonical, ...extra];
    if (isDevOrTest()) origins.push("http://localhost:3000");
    return [...new Set(origins)];
  })(),
  // Rate limit bawaan Better Auth = 100/10 dtk (terlalu longgar untuk login).
  // Perketat endpoint kredensial; server-side auth.api tidak terkena limit ini.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
      "/two-factor/*": { window: 60, max: 5 },
    },
  },
  /**
   * Gerbang anti-bypass pendaftaran email/password.
   *
   * Alur resmi: /api/auth/verify-email-otp memverifikasi OTP lalu menerbitkan
   * tiket `email-verified:<email>` (15 menit, sekali pakai). Client mengirim
   * tiket itu sebagai header saat signUp.email. Tanpa tiket yang cocok,
   * user TIDAK dibuat — jadi menembak /api/auth/sign-up/email langsung tidak
   * lagi cukup untuk punya akun.
   *
   * OAuth Google (/callback/google) tetap boleh membuat user tanpa tiket:
   * identitas email sudah diverifikasi provider.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (!isEmailPasswordSignup(ctx)) return;
          const email = String(user.email || "").trim().toLowerCase();
          if (!email) {
            throw new APIError("BAD_REQUEST", { message: "Email wajib diisi." });
          }
          const ticket = readRequestHeader(ctx, "x-email-verification-ticket").trim();
          if (!ticket) {
            throw new APIError("FORBIDDEN", {
              message: "Email belum diverifikasi. Minta kode OTP lalu verifikasi sebelum mendaftar.",
            });
          }
          const record = await db.query.Verification.findFirst({
            where: (t, { and, eq }) =>
              and(
                eq(t.identifier, `email-verified:${email}`),
                eq(t.value, ticket)
              ),
            columns: { id: true, expiresAt: true },
          });
          if (!record || new Date() > record.expiresAt) {
            throw new APIError("FORBIDDEN", {
              message: "Tiket verifikasi email salah atau kedaluwarsa. Minta kode OTP baru.",
            });
          }
          // Jangan percaya body client: emailVerified ditetapkan server.
          return { data: { ...user, emailVerified: true } };
        },
        after: async (user, ctx) => {
          if (!isEmailPasswordSignup(ctx)) return;
          const email = String(user.email || "").trim().toLowerCase();
          const ticket = readRequestHeader(ctx, "x-email-verification-ticket").trim();
          if (!email || !ticket) return;
          // Sekali pakai: baru dihapus setelah user benar-benar dibuat.
          await db
            .delete(Verification)
            .where(
              and(
                eq(Verification.identifier, `email-verified:${email}`),
                eq(Verification.value, ticket)
              )
            )
            .catch(() => {});
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60 * 24, // Update setiap 1 hari
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 menit client-side cookie cache
    },
  },
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        // KRITIS: tanpa input:false, pendaftar bisa kirim role:"ADMIN".
        input: false,
      },
      phoneVerified: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// ============================================================================
// DEV ONLY: DEV-COOKIE SESSION INTERCEPTOR (Localhost & Testing)
// CATATAN JUJUR (23 Okt 2026, keputusan owner): route /api/auth/pin-bypass yang
// memicu cookie kaos_dev_role / kaos_dev_user_id SUDAH DIHAPUS permanen — cookie
// ini kini hanya bisa diset manual di localhost untuk pengembangan.
// Dilarang menambahkan kembali pemicu produksi untuk shim ini.
// ============================================================================
if (isDevOrTest()) {
  const originalGetSession = auth.api.getSession.bind(auth.api);

  (auth.api as any).getSession = async (context?: any) => {
    // 1. Coba session resmi Better Auth terlebih dahulu
    try {
      const realSession = await originalGetSession(context);
      if (realSession?.user) {
        return realSession;
      }
    } catch {
      // fallback dev
    }

    // 2. Deteksi cookie role dev dari headers request atau next/headers
    let devRole: string | null = null;
    let devUserId: string | null = null;

    try {
      const hdrs = context?.headers;
      let cookieHeader = "";
      if (hdrs) {
        if (typeof hdrs.get === "function") {
          cookieHeader = hdrs.get("cookie") || "";
        } else if (typeof hdrs === "object") {
          cookieHeader = hdrs.cookie || hdrs.Cookie || "";
        }
      }

      if (cookieHeader) {
        const matchRole = cookieHeader.match(/kaos_dev_role=([^;]+)/);
        if (matchRole && matchRole[1]) {
          devRole = decodeURIComponent(matchRole[1]).trim();
        }
        const matchUser = cookieHeader.match(/kaos_dev_user_id=([^;]+)/);
        if (matchUser && matchUser[1]) {
          devUserId = decodeURIComponent(matchUser[1]).trim();
        }
      }

      if (!devRole) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        devRole = cookieStore.get("kaos_dev_role")?.value || null;
        devUserId = cookieStore.get("kaos_dev_user_id")?.value || null;
      }
    } catch {
      // di luar konteks request / headers
    }

    // 3. Evaluasi devRole
    // Jika user sengaja Logout atau memilih Mode Tamu (GUEST): kembalikan null (belum login)
    if (devRole === "GUEST") {
      return null;
    }

    // Jika mode CUSTOMER (PIN 461461)
    if (devRole === "CUSTOMER") {
      const uid = devUserId || "6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn";
      return {
        session: {
          id: "dev-customer-session-id",
          userId: uid,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          token: "dev-customer-token",
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: "127.0.0.1",
          userAgent: "SecretPinDevCustomer",
        },
        user: {
          id: uid,
          name: "Hengki Vibecoding (Customer)",
          email: "hengkivibecoding@gmail.com",
          role: "CUSTOMER",
          emailVerified: true,
          phoneNumber: "089876543210",
          phoneVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    // Default di localhost / Super Admin (PIN 164164):
    // Memastikan panel admin dapat diakses bebas tanpa mental ke landing page
    const adminUid = devUserId || "cmtgq1jgh000ius04zygxhh8b";
    return {
      session: {
        id: "dev-superadmin-session-id",
        userId: adminUid,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        token: "dev-superadmin-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: "127.0.0.1",
        userAgent: "SecretPinDevSuperAdmin",
      },
      user: {
        id: adminUid,
        name: "Admin Workshop Kaos Kami",
        email: "admin@kaoskami.biz.id",
        role: "SUPER_ADMIN",
        emailVerified: true,
        phoneNumber: "081234567890",
        phoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  };
}

