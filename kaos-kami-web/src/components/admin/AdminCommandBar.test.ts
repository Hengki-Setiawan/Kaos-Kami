import { describe, it, expect } from "vitest";
import {
  ADMIN_ALL_ACTIONS,
  buildOrderApiUrl,
  buildOrderSearchUrl,
  filterPaletteActions,
  parseOrderHits,
  visiblePaletteActions,
} from "@/components/admin/adminCommandPalette";

describe("AdminCommandBar — katalog aksi", () => {
  it("memuat 5 menu + 8 sub-modul + 1 antrean review = 14 aksi", () => {
    expect(ADMIN_ALL_ACTIONS).toHaveLength(14);
    const ids = ADMIN_ALL_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(14);
  });

  it("RBAC: staf produksi & kurir hanya melihat pilarnya", () => {
    const prod = visiblePaletteActions("PRODUCTION_STAFF");
    expect(prod.length).toBeGreaterThan(0);
    expect(prod.every((a) => a.pillar === "production")).toBe(true);

    const courier = visiblePaletteActions("COURIER");
    expect(courier.length).toBeGreaterThan(0);
    expect(courier.every((a) => a.pillar === "delivery")).toBe(true);

    expect(visiblePaletteActions("ADMIN")).toHaveLength(14);
    expect(visiblePaletteActions("SUPER_ADMIN")).toHaveLength(14);
  });
});

describe("AdminCommandBar — filterPaletteActions", () => {
  it("query kosong mengembalikan semua", () => {
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "")).toHaveLength(14);
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "   ")).toHaveLength(14);
  });

  it("cocok label/hint/keywords case-insensitive", () => {
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "kupon").map((a) => a.id)).toEqual([
      "sub-coupons",
    ]);
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "DTF").length).toBeGreaterThanOrEqual(2);
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "/admin/chat").map((a) => a.id)).toEqual([
      "menu-chat",
    ]);
    expect(filterPaletteActions(ADMIN_ALL_ACTIONS, "xyz-tak-ada")).toHaveLength(0);
  });
});

describe("AdminCommandBar — URL order", () => {
  it("buildOrderSearchUrl memakai /admin/orders?q= dengan encode", () => {
    expect(buildOrderSearchUrl("KK-123")).toBe("/admin/orders?q=KK-123");
    expect(buildOrderSearchUrl("KK 12&34")).toBe("/admin/orders?q=KK%2012%2634");
  });

  it("buildOrderApiUrl memakai kontrak asli ?q= + limit (bukan ?search=)", () => {
    const url = buildOrderApiUrl("KK-9", 6);
    expect(url.startsWith("/api/admin/orders?")).toBe(true);
    expect(url).toContain("q=KK-9");
    expect(url).toContain("limit=6");
    expect(url).not.toContain("search=");
  });
});

describe("AdminCommandBar — parseOrderHits", () => {
  it("mem-parse {orders:[...]} dan membuang baris rusak", () => {
    const parsed = parseOrderHits({
      success: true,
      orders: [
        { id: "o1", orderNumber: "KK-001", status: "DESIGN_REVIEW" },
        { id: "o2", orderNumber: "KK-002" },
        { id: 123, orderNumber: "KK-003" },
        null,
      ],
      nextCursor: null,
    });
    expect(parsed).toEqual([
      { id: "o1", orderNumber: "KK-001", status: "DESIGN_REVIEW" },
      { id: "o2", orderNumber: "KK-002", status: "?" },
    ]);
  });

  it("bentuk tak dikenal = null (fallback navigasi ?q=)", () => {
    expect(parseOrderHits(null)).toBeNull();
    expect(parseOrderHits([])).toBeNull();
    expect(parseOrderHits({})).toBeNull();
    expect(parseOrderHits({ orders: "bukan-array" })).toBeNull();
  });
});
