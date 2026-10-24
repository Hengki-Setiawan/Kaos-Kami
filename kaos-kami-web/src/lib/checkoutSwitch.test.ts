import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * P0 keputusan owner #16 (23 Okt 2026): CheckoutModalLegacy + flag
 * NEXT_PUBLIC_CHECKOUT_V2 SUDAH DIHAPUS. Checkout V2 (2 tahap) adalah
 * satu-satunya modal — tidak ada lagi jalur rollback 1-langkah.
 *
 * Test ini mengunci kontrak pasca-penghapusan (statis, karena .tsx tak
 * testable di node-env — preseden adminCommandPalette.ts):
 *  - CartDrawer TIDAK lagi menyebut legacy/flag apa pun.
 *  - File CheckoutModalLegacy.tsx tidak ada lagi di repo.
 *  - CheckoutModal adalah V2 2-tahap (state step 1|2 + penanda TAHAP 1/TAHAP 2).
 */

const ROOT = process.cwd();
const readSrc = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("checkoutSwitch: pasca-penghapusan legacy (keputusan owner #16)", () => {
  const cartDrawer = readSrc("src/components/ui/CartDrawer.tsx");
  const v2 = readSrc("src/components/ui/CheckoutModal.tsx");

  it("CartDrawer memakai CheckoutModal langsung (tanpa flag/legacy)", () => {
    expect(cartDrawer).toContain('from "./CheckoutModal"');
    expect(cartDrawer).not.toContain("CheckoutModalLegacy");
    expect(cartDrawer).not.toContain("NEXT_PUBLIC_CHECKOUT_V2");
    expect(cartDrawer).toContain("<CheckoutModal");
  });

  it("file legacy benar-benar sudah dihapus dari repo", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/ui/CheckoutModalLegacy.tsx"))).toBe(false);
  });

  it("V2 = 2 tahap (state step 1|2 + penanda TAHAP 1/TAHAP 2)", () => {
    expect(v2).toContain("const [step, setStep] = useState<1 | 2>(1)");
    expect(v2).toContain("TAHAP 1");
    expect(v2).toContain("TAHAP 2");
    expect(v2).toContain("step === 1");
    expect(v2).toContain("step === 2");
  });
});
