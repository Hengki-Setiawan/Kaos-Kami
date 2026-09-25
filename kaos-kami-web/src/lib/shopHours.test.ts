import { describe, it, expect } from "vitest";
import {
  getClosedQueueNotice,
  getShopStatus,
  getWitaParts,
  isShopOpen,
  nextOpenLabel,
} from "@/lib/shopHours";

// WITA = UTC+8 (tanpa DST) → 02:00Z = 10:00 WITA, dst. Intl(timeZone)
// membuat suite ini independen dari TZ runner.
const at = (utcIso: string) => new Date(utcIso);

describe("shopHours (Asia/Makassar 09–21)", () => {
  it("konversi WITA benar di TZ mana pun", () => {
    expect(getWitaParts(at("2026-09-21T02:30:00.000Z"))).toEqual({
      hour: 10,
      minute: 30,
    });
  });

  it("buka 10:00 WITA, tutup 08:59 & tepat 21:00", () => {
    expect(isShopOpen(at("2026-09-21T02:00:00.000Z"))).toBe(true); // 10:00
    expect(isShopOpen(at("2026-09-21T00:59:00.000Z"))).toBe(false); // 08:59
    expect(isShopOpen(at("2026-09-21T01:00:00.000Z"))).toBe(true); // 09:00 inklusif
    expect(isShopOpen(at("2026-09-21T13:00:00.000Z"))).toBe(false); // 21:00 eksklusif
  });

  it("badge BUKA/TUTUP selaras isShopOpen", () => {
    expect(getShopStatus(at("2026-09-21T02:00:00.000Z"))).toEqual({
      open: true,
      label: "BUKA",
    });
    expect(getShopStatus(at("2026-09-21T00:00:00.000Z"))).toEqual({
      open: false,
      label: "TUTUP",
    });
  });

  it("label buka-berikutnya: hari ini vs besok", () => {
    expect(nextOpenLabel(at("2026-09-21T02:00:00.000Z"))).toContain("tutup 21.00");
    expect(nextOpenLabel(at("2026-09-21T00:00:00.000Z"))).toContain("hari ini"); // 08:00
    expect(nextOpenLabel(at("2026-09-21T14:00:00.000Z"))).toContain("besok"); // 22:00
  });

  it("notice antrean: null saat buka, informatif saat tutup", () => {
    expect(getClosedQueueNotice(at("2026-09-21T02:00:00.000Z"))).toBeNull();
    const notice = getClosedQueueNotice(at("2026-09-21T14:00:00.000Z"));
    expect(notice).toContain("antrean");
    expect(notice).toContain("Checkout tetap bisa dilanjutkan");
  });
});
