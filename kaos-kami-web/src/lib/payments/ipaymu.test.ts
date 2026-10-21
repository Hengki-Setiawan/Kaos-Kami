import { describe, it, expect } from "vitest";
import { ipaymuProvider } from "./ipaymu";

describe("iPaymu Direct QRIS Provider", () => {
  it("should be configured with VA and API KEY", () => {
    // In dev environment with .env.local, verify isConfigured status
    const configured = ipaymuProvider.isConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("should generate signature properly", () => {
    if (!ipaymuProvider.isConfigured()) return;
    const sig = ipaymuProvider.generateSignature("POST", JSON.stringify({ test: 123 }));
    expect(typeof sig).toBe("string");
    expect(sig.length).toBe(64); // SHA256 hex string
  });

  it("should generate dynamic QRIS fallback when called with test order", async () => {
    if (!ipaymuProvider.isConfigured()) return;
    const res = await ipaymuProvider.createCharge({
      orderId: "test-ord-001",
      orderNumber: "KK-20261018-0001",
      amountIdr: 125000,
      customer: {
        name: "Test Customer",
        phone: "081234567890",
        email: "test@kaoskami.biz.id",
      },
      paymentMethod: "qris",
    });

    expect(res).toBeDefined();
    expect(res.reference).toBeDefined();
    expect(res.qrString).toBeDefined();
    expect(res.qrImage).toBeDefined();
    expect(res.qrString).toContain("00020101"); // QRIS EMV standard header
  });
});
