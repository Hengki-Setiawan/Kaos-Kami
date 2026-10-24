import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IpaymuPaymentProvider } from "@/lib/payments/ipaymu";

/**
 * R5/P0.2 (23 Okt 2026): Guard webhook iPaymu — signature VA-based (docs resmi),
 * idempotency via renderer test, dan tamper-check. Tanpa hit gateway asli
 * (hit asli tetap milik run sandbox).
 */
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

describe("webhookGuards: iPaymu callback signature (VA key, docs resmi)", () => {
  it("signature cocok dengan payload dan secret = Nomor VA", () => {
    const p = new IpaymuPaymentProvider();
    const payload = { trx_id: 12345, status: "berhasil", reference_id: "KK-01", total: "100000" };
    const expectedSig = p.computeCallbackSignature(payload);

    expect(expectedSig).toMatch(/^[a-f0-9]{64}$/);
    expect(p.verifyCallbackSignature(payload, expectedSig)).toBe(true);
  });

  it("signature salah DITOLAK", () => {
    const p = new IpaymuPaymentProvider();
    const payload = { trx_id: 12345, status: "berhasil" };
    expect(p.verifyCallbackSignature(payload, "signature_palsu_123456")).toBe(false);
  });

  it("payload berbeda DITOLAK (tamper-proofing)", () => {
    const p = new IpaymuPaymentProvider();
    const payloadA = { trx_id: 12345, total: "100000" };
    const payloadB = { trx_id: 12345, total: "50000" };
    const sigA = p.computeCallbackSignature(payloadA);

    expect(p.verifyCallbackSignature(payloadB, sigA)).toBe(false);
  });

  it("normalisasi tipe docs: '12345' (form) === 12345 (json) untuk trx_id", () => {
    const p = new IpaymuPaymentProvider();
    const fromForm = p.computeCallbackSignature({ trx_id: "12345", status: "berhasil" });
    const fromJson = p.computeCallbackSignature({ trx_id: 12345, status: "berhasil" });
    expect(fromForm).toBe(fromJson);
  });

  it("field hilang paperwork: tanpa additional_info → disisipkan array kosong (docs step 3)", () => {
    const p = new IpaymuPaymentProvider();
    const withEmptyAdded = p.computeCallbackSignature({ foo: "bar", additional_info: [] });
    const without = p.computeCallbackSignature({ foo: "bar" });
    expect(withEmptyAdded).toBe(without);
  });

  it("secret kosong fail-closed (tanpa konfigurasi = tolak)", () => {
    process.env.IPAYMU_VA = "";
    process.env.IPAYMU_API_KEY = "";
    const p = new IpaymuPaymentProvider();
    expect(p.isConfigured()).toBe(false);
    expect(p.verifyCallbackSignature({}, "apapun")).toBe(false);
    expect(() => p.computeCallbackSignature({})).toThrow();
  });
});

describe("webhookGuards: generateSignature (REQUEST) tetap deterministik", () => {
  it("input sama menghasilkan signature hex konsisten", () => {
    const p = new IpaymuPaymentProvider();
    const body = '{"test":true}';
    const a = p.generateSignature("POST", body);
    const b = p.generateSignature("POST", body);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
