import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Switch checkout V2 vs legacy (Amandemen Bab 56 A2) — TEST SAJA.
 *
 * Sumber kebenaran: src/components/ui/CartDrawer.tsx:13-16
 *   const USE_CHECKOUT_V2 = process.env.NEXT_PUBLIC_CHECKOUT_V2 !== "false";
 *   const ActiveCheckoutModal = USE_CHECKOUT_V2 ? CheckoutModal : CheckoutModalLegacy;
 *
 * 🟡 Komponen .tsx tak testable di node-env (vitest.config.mts: environment
 * "node", include hanya file baru berekstensi .test.ts; impor .tsx ber-JSX + "use client" +
 * next/image gagal tanpa jsdom/plugin React — preseden sama didokumentasikan
 * di src/components/admin/adminCommandPalette.ts). Maka yang diuji adalah:
 *  (a) replika murni 1-baris aturan flag (fail-closed: hanya "false" persis
 *      yang rollback — selaras RUNBOOK §2b & AGENTS.md butir 8), dan
 *  (b) kontrak statis beda-tahap via isi file sumber (V2 = 2 tahap step 1|2,
 *      legacy = 1 layar penuh 4 seksi, tanpa state step).
 */

const ROOT = process.cwd();
const readSrc = (rel: string): string =>
  fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Replika murni baris CartDrawer.tsx:15 — JANGAN ubah tanpa ubah sumber juga. */
function resolveCheckoutVariant(env: string | undefined): "V2" | "legacy" {
  return env !== "false" ? "V2" : "legacy";
}

describe("checkoutSwitch: flag NEXT_PUBLIC_CHECKOUT_V2 (CartDrawer.tsx:15)", () => {
  it("default (unset/undefined) = V2 2-tahap", () => {
    expect(resolveCheckoutVariant(undefined)).toBe("V2");
  });

  it('hanya string persis "false" yang rollback ke legacy (fail-closed)', () => {
    expect(resolveCheckoutVariant("false")).toBe("legacy");
  });

  it('nilai lain tetap V2: "true", "", "0", "FALSE", " false"', () => {
    for (const v of ["true", "", "0", "FALSE", "False", " false", "false "]) {
      expect(resolveCheckoutVariant(v)).toBe("V2");
    }
  });
});

describe("checkoutSwitch: kontrak statis V2 vs legacy (beda tahap)", () => {
  const cartDrawer = readSrc("src/components/ui/CartDrawer.tsx");
  const v2 = readSrc("src/components/ui/CheckoutModal.tsx");
  const legacy = readSrc("src/components/ui/CheckoutModalLegacy.tsx");

  it("CartDrawer memilih modal via flag (V2 ? CheckoutModal : CheckoutModalLegacy)", () => {
    expect(cartDrawer).toContain("NEXT_PUBLIC_CHECKOUT_V2");
    expect(cartDrawer).toContain('!== "false"');
    expect(cartDrawer).toContain("USE_CHECKOUT_V2 ? CheckoutModal : CheckoutModalLegacy");
  });

  it("V2 = 2 tahap (state step 1|2 + penanda TAHAP 1/TAHAP 2)", () => {
    expect(v2).toContain("const [step, setStep] = useState<1 | 2>(1)");
    expect(v2).toContain("TAHAP 1");
    expect(v2).toContain("TAHAP 2");
    expect(v2).toContain("step === 1");
    expect(v2).toContain("step === 2");
  });

  it("legacy = 1 layar penuh 4 seksi, TANPA state step (beda tahap terbukti)", () => {
    expect(legacy).toContain("1 layar penuh 4 seksi");
    expect(legacy).not.toContain("const [step");
    expect(legacy).not.toContain("setStep");
    expect(legacy).not.toContain("step ===");
  });
});
