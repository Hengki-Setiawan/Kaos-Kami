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
  secret: authSecret || "kaos-kami-dev-only-insecure-secret-ganti-di-prod",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
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
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
