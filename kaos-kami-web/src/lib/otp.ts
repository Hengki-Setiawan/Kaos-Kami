import { createHash, randomInt } from "crypto";

/** Hash OTP sebelum simpan (DB bocor ≠ kode bocor). */
export function hashOtp(code: string): string {
  const pepper = process.env.BETTER_AUTH_SECRET || "kaos-kami-otp-pepper-dev";
  return createHash("sha256").update(`${pepper}:otp:${code}`).digest("hex");
}

/** 6 digit CSPRNG (bukan Math.random). Workerd-safe via node:crypto. */
export function randomOtp6(): string {
  return String(100000 + randomInt(900000));
}
