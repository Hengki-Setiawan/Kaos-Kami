import { describe, it, expect } from "vitest";
import { isOtpPeekAllowed, parsePeekAllowlist, type PeekEnv } from "@/lib/testOtpPeek";

// OPSI-1 intip-OTP (keputusan owner 2026-09-24): guard murni fail-closed.
// Setiap lapis diuji: flag, prod-ganda, allowlist, kanonisasi.
const BASE: PeekEnv = {
  E2E_ALLOW_OTP_PEEK: "YA",
  NODE_ENV: "development",
  DUITKU_ENV: "sandbox",
  E2E_OTP_PEEK_NUMBERS: "0895803463032, 0882020685076",
};

describe("testOtpPeek: allowlist kanonisasi", () => {
  it("08/62/+62/spasi = SATU nomor", () => {
    expect(parsePeekAllowlist("081234567890")).toEqual(["6281234567890"]);
    expect(parsePeekAllowlist("081234567890, +6281234567890 ")).toEqual(["6281234567890", "6281234567890"]);
    expect(parsePeekAllowlist("")).toEqual([]);
    expect(parsePeekAllowlist(undefined)).toEqual([]);
  });
});

describe("testOtpPeek: isOtpPeekAllowed fail-closed", () => {
  it("nomor terdaftar 08 & 62 lolos", () => {
    expect(isOtpPeekAllowed(BASE, "0895803463032")).toEqual({ ok: true, canonical: "62895803463032" });
    expect(isOtpPeekAllowed(BASE, "62895803463032")).toEqual({ ok: true, canonical: "62895803463032" });
  });
  it("varian +62 nomor terdaftar lolos", () => {
    const r = isOtpPeekAllowed(BASE, "+62882020685076");
    expect(r.ok).toBe(true);
  });
  it("flag mati/unset/salah = tolak", () => {
    for (const flag of [undefined, "", "ya", "true", "1", "YES"]) {
      const r = isOtpPeekAllowed({ ...BASE, E2E_ALLOW_OTP_PEEK: flag }, "0895803463032");
      expect(r).toEqual({ ok: false, reason: "flag-mati" });
    }
  });
  it("produksi DITOLAK dua lapis (NODE_ENV + DUITKU_ENV)", () => {
    expect(isOtpPeekAllowed({ ...BASE, NODE_ENV: "production" }, "0895803463032")).toEqual({
      ok: false,
      reason: "tolak-prod",
    });
    expect(isOtpPeekAllowed({ ...BASE, DUITKU_ENV: "production" }, "0895803463032")).toEqual({
      ok: false,
      reason: "tolak-prod",
    });
  });
  it("allowlist kosong = tolak semua", () => {
    expect(isOtpPeekAllowed({ ...BASE, E2E_OTP_PEEK_NUMBERS: "" }, "0895803463032")).toEqual({
      ok: false,
      reason: "allowlist-kosong",
    });
  });
  it("nomor tak terdaftar = tolak", () => {
    expect(isOtpPeekAllowed(BASE, "081111111111")).toEqual({ ok: false, reason: "nomor-tak-terdaftar" });
  });
  it("nomor tak valid = tolak", () => {
    for (const bad of ["", "abc", null, undefined, 123]) {
      const r = isOtpPeekAllowed(BASE, bad);
      expect(r.ok).toBe(false);
    }
  });
});
