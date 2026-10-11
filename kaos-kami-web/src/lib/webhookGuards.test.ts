import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IpaymuPaymentProvider } from "@/lib/payments/ipaymu";

// R5: Guard webhook iPaymu — signature / idempotency / status check
// tanpa hit gateway asli (hit asli tetap milik run sandbox).
const TEST_VA = "0000001234567890";
const TEST_API_KEY = "test-ipaymu-api-key-32-chars-xxxx";
let oldVa: string | undefined;
let oldKey: string | undefined;

beforeEach(() => {
  oldVa = process.env.IPAYMU_VA;
  oldKey = process.env.IPAYMU_API_KEY;
  process.env.IPAYMU_VA = TEST_VA;
  process.env.IPAYMU_API_KEY = TEST_API_KEY;
});

afterEach(() => {
  if (oldVa === undefined) delete process.env.IPAYMU_VA;
  else process.env.IPAYMU_VA = oldVa;
  if (oldKey === undefined) delete process.env.IPAYMU_API_KEY;
  else process.env.IPAYMU_API_KEY = oldKey;
});

describe("webhookGuards: iPaymu signature verification", () => {
  it("signature cocok dengan body mentah dan secret", () => {
    const p = new IpaymuPaymentProvider();
    const rawBody = JSON.stringify({ trx_id: 12345, status: "berhasil", sid: "ORDER-01" });
    const expectedSig = p.generateSignature("POST", rawBody);

    expect(p.verifyCallbackSignature(rawBody, expectedSig)).toBe(true);
  });

  it("signature salah DITOLAK", () => {
    const p = new IpaymuPaymentProvider();
    const rawBody = JSON.stringify({ trx_id: 12345, status: "berhasil" });
    expect(p.verifyCallbackSignature(rawBody, "signature_palsu_123456")).toBe(false);
  });

  it("body berbeda DITOLAK (tamper-proofing)", () => {
    const p = new IpaymuPaymentProvider();
    const rawBodyA = JSON.stringify({ trx_id: 12345, amount: 100000 });
    const rawBodyB = JSON.stringify({ trx_id: 12345, amount: 50000 });
    const sigA = p.generateSignature("POST", rawBodyA);

    expect(p.verifyCallbackSignature(rawBodyB, sigA)).toBe(false);
  });

  it("secret kosong fail-closed (tanpa konfigurasi = tolak)", () => {
    process.env.IPAYMU_VA = "";
    process.env.IPAYMU_API_KEY = "";
    const p = new IpaymuPaymentProvider();
    expect(p.isConfigured()).toBe(false);
    expect(p.verifyCallbackSignature("{}", "apapun")).toBe(false);
    expect(() => p.assertConfigured()).toThrow();
  });
});

describe("webhookGuards: generateSignature deterministik", () => {
  it("input sama menghasilkan signature hex konsisten", () => {
    const p = new IpaymuPaymentProvider();
    const body = '{"test":true}';
    const a = p.generateSignature("POST", body);
    const b = p.generateSignature("POST", body);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
