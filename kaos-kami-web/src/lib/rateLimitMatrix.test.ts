import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/security/rateLimiter";

// R5 (Bab 8): matriks angka rate-limit §S-P6 — assert KONFIGURASI + perilaku
// sliding-window murni (tanpa hit HTTP asli; hit asli tetap milik S-001/S-006/S-040).
// Key unik per test (store module-global!) agar tak saling mencemari.
const k = (name: string) => `t-${name}-${Date.now()}-${Math.random()}`;

describe("rateLimitMatrix: sliding window memory", () => {
  it("lolos sampai limit, blokir di limit+1", () => {
    const key = k("limit3");
    expect(checkRateLimit(key, 3, 60).isLimited).toBe(false);
    expect(checkRateLimit(key, 3, 60).isLimited).toBe(false);
    const third = checkRateLimit(key, 3, 60);
    expect(third.isLimited).toBe(false);
    expect(third.remaining).toBe(0);
    const fourth = checkRateLimit(key, 3, 60);
    expect(fourth.isLimited).toBe(true);
    expect(fourth.resetSeconds).toBeGreaterThan(0);
  });
  it("key berbeda terisolasi", () => {
    const a = k("iso-a");
    const b = k("iso-b");
    checkRateLimit(a, 1, 60);
    expect(checkRateLimit(a, 1, 60).isLimited).toBe(true);
    expect(checkRateLimit(b, 1, 60).isLimited).toBe(false);
  });
  it("angka §S-P6: checkout 5/60, otp 3/300, repay 3/300, track 10/300", () => {
    const matrix = [
      ["checkout", 5, 60],
      ["send-otp", 3, 300],
      ["repay", 3, 300],
      ["track", 10, 300],
    ] as const;
    for (const [name, limit, win] of matrix) {
      const key = k(`matrix-${name}`);
      for (let i = 0; i < limit; i++) {
        expect(checkRateLimit(key, limit, win).isLimited).toBe(false);
      }
      expect(checkRateLimit(key, limit, win).isLimited).toBe(true);
    }
  });
});
