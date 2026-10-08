import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";
import { Account, Session, User, Verification } from "./drizzle-schema";

const authSecret = process.env.BETTER_AUTH_SECRET || "";
// Secret default = semua session bisa ditempa. Wajib di-set di production.
if (!authSecret && process.env.NODE_ENV === "production") {
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
    if (process.env.NODE_ENV !== "production") {
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
    if (process.env.NODE_ENV !== "production") origins.push("http://localhost:3000");
    return [...new Set(origins)];
  })(),
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
// DEV / PIN BYPASS SESSION INTERCEPTOR (Localhost & Testing)
// Memastikan PIN 164164 (Super Admin) dan PIN 461461 (Customer) dikenali 100%
// oleh seluruh server components, API routes, dan auth guard tanpa mental 401.
// ============================================================================
if (process.env.NODE_ENV !== "production") {
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

