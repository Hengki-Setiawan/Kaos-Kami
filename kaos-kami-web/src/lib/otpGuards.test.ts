import { describe, it, expect, afterEach } from "vitest";
import { hashOtp, randomOtp6 } from "@/lib/otp";
import { normalizePhoneId } from "@/lib/phone";

// R5: OTP murni — hash pepper, CSPRNG, normalisasi ID (tanpa DB/WA;
// pengiriman + sekali-pakai tetap milik test HTTP).
const OLD_ENV = { ...process.env };
const writableEnv = process.env as Record<string, string | undefined>;
afterEach(() => {
  writableEnv.BETTER_AUTH_SECRET = OLD_ENV.BETTER_AUTH_SECRET;
  writableEnv.NODE_ENV = OLD_ENV.NODE_ENV;
});

describe("otpGuards: hashOtp", () => {
  it("deterministik + hex64 + beda kode beda hash", () => {
    const a = hashOtp("123456");
    expect(a).toBe(hashOtp("123456"));
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOtp("123457")).not.toBe(a);
  });
  it("pepper beda = hash beda", () => {
    process.env.BETTER_AUTH_SECRET = "pepper-A-32-char-minimum-xxxxxx";
    const a = hashOtp("123456");
    process.env.BETTER_AUTH_SECRET = "pepper-B-32-char-minimum-xxxxxx";
    expect(hashOtp("123456")).not.toBe(a);
  });
  it("dev tanpa pepper: tak melempar (pepper-dev)", () => {
    delete writableEnv.BETTER_AUTH_SECRET;
    writableEnv.NODE_ENV = "test";
    expect(() => hashOtp("123456")).not.toThrow();
  });
  it("prod tanpa pepper: MELEMPAR (fail-closed)", () => {
    delete writableEnv.BETTER_AUTH_SECRET;
    writableEnv.NODE_ENV = "production";
    expect(() => hashOtp("123456")).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe("otpGuards: randomOtp6", () => {
  it("200x selalu 6 digit 100000-999999", () => {
    for (let i = 0; i < 200; i++) {
      const c = randomOtp6();
      expect(c).toMatch(/^[0-9]{6}$/);
      expect(Number(c)).toBeGreaterThanOrEqual(100000);
      expect(Number(c)).toBeLessThanOrEqual(999999);
    }
  });
});

describe("otpGuards: normalizePhoneId", () => {
  it("strip spasi/strip/titik/kurung", () => {
    expect(normalizePhoneId("0812-3456 7890")).toBe("081234567890");
    expect(normalizePhoneId("(0812) 3456.7890")).toBe("081234567890");
  });
  it("kosong/bukan-string -> ''", () => {
    expect(normalizePhoneId("")).toBe("");
    expect(normalizePhoneId(null)).toBe("");
    expect(normalizePhoneId(undefined)).toBe("");
    expect(normalizePhoneId(123)).toBe("");
  });
});
