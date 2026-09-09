import { createHash, randomInt } from "crypto";

/** Hash OTP sebelum simpan (DB bocor ≠ kode bocor). */
export function hashOtp(code: string): string {
  const pepper = process.env.BETTER_AUTH_SECRET || "";
  // Tanpa secret asli di prod = pepper publik = brute-force 1jt kode (audit).
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET belum di-set (pepper OTP)");
  }
  const use = pepper || "kaos-kami-otp-pepper-dev";
  return createHash("sha256").update(`${use}:otp:${code}`).digest("hex");
}

/** 6 digit CSPRNG (bukan Math.random). Workerd-safe via node:crypto. */
export function randomOtp6(): string {
  return String(100000 + randomInt(900000));
}
