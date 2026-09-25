import { describe, it, expect } from "vitest";
import { getOrderCouponCode } from "@/lib/coupons";

// R5 (Bab 8): kupon S-026 + U-028/U-040. Yang murni (marker parse) diuji di
// sini; race consume atomik (UPDATE ... WHERE usedCount<maxUses) + restore
// tetap milik test HTTP (S-026/C-03) karena butuh DB konkuren.
describe("couponAtomic: getOrderCouponCode", () => {
  it("marker COUPON:<CODE> terbaca uppercase", () => {
    expect(getOrderCouponCode({ notes: "COUPON:E2E-ABC", discountIdr: 5000 })).toBe("E2E-ABC");
    expect(getOrderCouponCode({ notes: "COUPON:e2e-abc", discountIdr: 5000 })).toBe("E2E-ABC");
  });
  it("tanpa marker = null (JANGAN restore asal!)", () => {
    expect(getOrderCouponCode({ notes: null, discountIdr: 0 })).toBeNull();
    expect(getOrderCouponCode({ notes: "", discountIdr: 5000 })).toBeNull();
    expect(getOrderCouponCode({ notes: "Titip di satpam", discountIdr: 0 })).toBeNull();
  });
  it("legacy kode mentah: hanya bila order memang diskon", () => {
    expect(getOrderCouponCode({ notes: "HEMAT10", discountIdr: 10000 })).toBe("HEMAT10");
    expect(getOrderCouponCode({ notes: "HEMAT10", discountIdr: 0 })).toBeNull();
  });
  it("marker berkarakter aneh DITOLAK", () => {
    expect(getOrderCouponCode({ notes: "COUPON:HEMAT 10!", discountIdr: 5000 })).toBeNull();
  });
});
