import { describe, it, expect } from "vitest";
import { maskPhone, maskEmail, maskName } from "@/lib/mask";

// R5 (Bab 8): SSOT mask PII — S-045. Bila mask lokal di komponen menyimpang
// dari kontrak ini, samakan ke mask.ts (JANGAN ubah test agar lolos!).
describe("mask SSOT: maskPhone", () => {
  it("format standar 4+****+2", () => {
    expect(maskPhone("081234567890")).toBe("0812****90");
    expect(maskPhone("6281244002026")).toBe("6281****26");
  });
  it("pendek: samarkan hampir semua", () => {
    expect(maskPhone("08")).toBe("****");
    expect(maskPhone("08123")).toBe("0****3");
  });
  it("kosong/null tidak melempar", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("   ")).toBe("");
    expect(maskPhone(null)).toBe("");
    expect(maskPhone(undefined)).toBe("");
  });
  it("tidak membocorkan digit tengah", () => {
    const out = maskPhone("0895803463032");
    expect(out).not.toContain("803463");
    expect(out.startsWith("0895")).toBe(true);
    expect(out.endsWith("32")).toBe(true);
  });
});

describe("mask SSOT: maskEmail", () => {
  it("2 char + ***@domain", () => {
    expect(maskEmail("hengkivibecoding@gmail.com")).toBe("he***@gmail.com");
  });
  it("tanpa @: jangan bocorkan mentah bila panjang", () => {
    expect(maskEmail("abcdef")).toBe("ab***");
    expect(maskEmail("ab")).toBe("***");
  });
  it("kosong/null tidak melempar", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
  });
});

describe("mask SSOT: maskName (invoice tamu)", () => {
  it("kata pertama + ' ***', marga hilang", () => {
    expect(maskName("Hengki Setiawan")).toBe("Hengki ***");
    expect(maskName("Budi")).toBe("Budi ***");
    expect(maskName("  Siti   Aminah  ")).toBe("Siti ***");
  });
  it("kosong/null -> ''", () => {
    expect(maskName("")).toBe("");
    expect(maskName("   ")).toBe("");
    expect(maskName(null)).toBe("");
    expect(maskName(undefined)).toBe("");
  });
  it("tak bocorkan kata kedua", () => {
    expect(maskName("Hengki Setiawan")).not.toContain("Setiawan");
  });
});
