import { describe, it, expect } from "vitest";
import { canonicalPhone, normalizePhoneId } from "@/lib/phone";

describe("kanonik nomor WA 08/62 (I3 lifetime OTP)", () => {
  it("semua format populer → satu bentuk 62…", () => {
    expect(canonicalPhone("081234567890")).toBe("6281234567890");
    expect(canonicalPhone("6281234567890")).toBe("6281234567890");
    expect(canonicalPhone("+6281234567890")).toBe("6281234567890");
    expect(canonicalPhone("0812-3456-7890")).toBe("6281234567890");
    expect(canonicalPhone("0812 3456 7890")).toBe("6281234567890");
    expect(canonicalPhone("(0812) 3456-7890")).toBe("6281234567890");
  });

  it("tetap stabil untuk kunci otp: + idempotensi format", () => {
    const a = canonicalPhone("081234567890");
    const b = canonicalPhone("+62 812-3456-7890");
    expect(a).toBe(b);
    expect(a).toMatch(/^62\d+$/);
  });

  it("input rusak → string kosong (ditolak jujur hilir)", () => {
    expect(canonicalPhone("")).toBe("");
    expect(canonicalPhone(null)).toBe("");
    expect(canonicalPhone(undefined)).toBe("");
    expect(canonicalPhone("abc")).toBe("");
  });

  it("normalizePhoneId lama tak berubah perilaku", () => {
    expect(normalizePhoneId("081234567890")).toBe("081234567890");
    expect(normalizePhoneId("+6281234567890")).toBe("+6281234567890");
  });
});
