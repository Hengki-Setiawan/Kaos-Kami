import { describe, it, expect } from "vitest";
import { ipaymuProvider } from "./ipaymu";

/**
 * P0.2 (23 Okt 2026): test webhook signature iPaymu sesuai docs resmi
 * (docs.ipaymu.com/en/docs/callback) — HMAC-SHA256 kunci = Nomor VA over
 * payload yang di-normalisasi + sorted A-Z + escape "/" (standar PHP json_encode).
 */
describe("iPaymu Webhook & Signature Verification Simulation", () => {
  it("verifies callback signature correctly when X-Signature header is present", () => {
    if (!ipaymuProvider.isConfigured()) return;

    const payload = {
      trx_id: "12345678",
      status: "berhasil",
      reference_id: "KK-20261018-9999",
      total: "150000",
      via: "QRIS",
    };

    // Signature resmi dihitung provider iPaymu dengan kunci VA — di sini
    // disimulasikan memakai API method yang sama (rumus docs).
    const validSignature = ipaymuProvider.computeCallbackSignature(payload);
    const isValid = ipaymuProvider.verifyCallbackSignature(payload, validSignature);
    expect(isValid).toBe(true);

    const isInvalid = ipaymuProvider.verifyCallbackSignature(payload, "invalid_sig_123");
    expect(isInvalid).toBe(false);
  });

  it("normalisasi tipe docs: string '12345' dan int 12345 → signature identik", () => {
    if (!ipaymuProvider.isConfigured()) return;

    const asString = ipaymuProvider.computeCallbackSignature({
      trx_id: "12345",
      status: "berhasil",
    });
    const asNumber = ipaymuProvider.computeCallbackSignature({
      trx_id: 12345,
      status: "berhasil",
    });
    expect(asString).toBe(asNumber);
  });

  it("handles empty or missing signature with fail-closed", () => {
    const isValid = ipaymuProvider.verifyCallbackSignature({ foo: "bar" }, "");
    expect(isValid).toBe(false);
  });
});
