import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { DuitkuPaymentProvider } from "@/lib/payments/duitku";

// R5 (Bab 8): guard webhook S-033–S-037 + U-049/U-058 — signature/nominal/
// idempotency TANPA hit Duitku asli (hit asli tetap milik R3 sandbox).
const MERCHANT = "DSB_TEST_MERCHANT";
const APIKEY = "test-api-key-32-char-minimum-xxxx";
let oldMerchant: string | undefined;
let oldKey: string | undefined;

beforeEach(() => {
  oldMerchant = process.env.DUITKU_MERCHANT_CODE;
  oldKey = process.env.DUITKU_API_KEY;
  process.env.DUITKU_MERCHANT_CODE = MERCHANT;
  process.env.DUITKU_API_KEY = APIKEY;
});
afterEach(() => {
  if (oldMerchant === undefined) delete process.env.DUITKU_MERCHANT_CODE;
  else process.env.DUITKU_MERCHANT_CODE = oldMerchant;
  if (oldKey === undefined) delete process.env.DUITKU_API_KEY;
  else process.env.DUITKU_API_KEY = oldKey;
});

describe("webhookGuards: verifyCallbackSignature", () => {
  it("MD5(merchant+amount+orderId+key) lolos", () => {
    const p = new DuitkuPaymentProvider();
    const sig = crypto.createHash("md5").update(`${MERCHANT}104000KK-TEST-1${APIKEY}`).digest("hex");
    expect(p.verifyCallbackSignature(MERCHANT, 104000, "KK-TEST-1", sig)).toBe(true);
  });
  it("signature salah DITOLAK", () => {
    const p = new DuitkuPaymentProvider();
    expect(p.verifyCallbackSignature(MERCHANT, 104000, "KK-TEST-1", "0".repeat(32))).toBe(false);
  });
  it("amount beda DITOLAK (anti-underpay S-037)", () => {
    const p = new DuitkuPaymentProvider();
    const sig = crypto.createHash("md5").update(`${MERCHANT}104000KK-TEST-1${APIKEY}`).digest("hex");
    expect(p.verifyCallbackSignature(MERCHANT, 103000, "KK-TEST-1", sig)).toBe(false);
  });
  it("kunci API beda DITOLAK (anti-forgery: tanda-tangan tak transferable)", () => {
    const p = new DuitkuPaymentProvider();
    const sigLain = crypto.createHash("md5").update(`${MERCHANT}104000KK-TEST-1KUNCI-ORANG-LAIN`).digest("hex");
    expect(p.verifyCallbackSignature(MERCHANT, 104000, "KK-TEST-1", sigLain)).toBe(false);
  });
  // NOTE S-036 (merchantCode asing -> 401) ditegakkan route
  // webhooks/duitku/route.ts:78-82 (banding vs DUITKU_MERCHANT_CODE server),
  // butuh DB order -> tetap milik test HTTP, bukan unit.
  it("secret kosong fail-closed (S-033/S-060: tanpa verifikasi = tolak)", () => {
    process.env.DUITKU_API_KEY = "";
    process.env.DUITKU_MERCHANT_CODE = "";
    const p = new DuitkuPaymentProvider();
    expect(p.isConfigured()).toBe(false);
    expect(p.verifyCallbackSignature(MERCHANT, 104000, "KK-TEST-1", "apapun")).toBe(false);
    expect(() => p.assertDuitkuConfigured()).toThrow();
  });
});

describe("webhookGuards: generateInquirySignature deterministik", () => {
  it("input sama = signature sama, format md5 hex", () => {
    const p = new DuitkuPaymentProvider();
    const a = p.generateInquirySignature("KK-TEST-1", 104000);
    const b = p.generateInquirySignature("KK-TEST-1", 104000);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });
});
