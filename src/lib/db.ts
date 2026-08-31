import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

import path from "path";

function getDatabaseUrl(): string {
  // Dukung kedua env: DATABASE_URL (Prisma native) dan TURSO_DATABASE_URL (legacy rumah-kripik-web)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("libsql://")) {
    return process.env.DATABASE_URL;
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  return `file:${dbPath}`;
}

function createPrismaClient() {
  const url = getDatabaseUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const adapter = new (PrismaLibSQL as any)({
    url,
    authToken,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
