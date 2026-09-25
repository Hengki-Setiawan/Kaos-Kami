import { describe, it, expect } from "vitest";
import {
  validateRosterRow,
  sizesFor,
  estimatePayloadBytes,
  estimateTeamwearPerRowIdr,
  TEAMWEAR_MAX_NAME_LEN,
  type RosterRow,
} from "@/lib/teamwear";
import { findRejectTemplate, REVIEW_REJECT_TEMPLATES } from "@/lib/reviewTemplates";

// R5: teamwear + review-template murni (tanpa DB; estimasi valid-path =
// integrasi pricingEngine, di sini hanya cabang null/catch).
const row = (o: Partial<RosterRow>): RosterRow => ({ key: "k1", nama: "Budi", nomor: "7", size: "L", ...o });
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

describe("teamwearGuards: validateRosterRow", () => {
  it("baris valid -> null (trim nama ditoleransi)", () => {
    expect(validateRosterRow(row({ nama: "  Budi " }), SIZES)).toBeNull();
  });
  it("nama kosong / >24 ditolak", () => {
    expect(validateRosterRow(row({ nama: "" }), SIZES)).toBe("Nama wajib diisi.");
    expect(validateRosterRow(row({ nama: "  " }), SIZES)).toBe("Nama wajib diisi.");
    expect(validateRosterRow(row({ nama: "x".repeat(TEAMWEAR_MAX_NAME_LEN + 1) }), SIZES)).toContain("maks");
    expect(validateRosterRow(row({ nama: "x".repeat(TEAMWEAR_MAX_NAME_LEN) }), SIZES)).toBeNull();
  });
  it("nomor 1-2 digit lolos (trim ditoleransi), selain itu ditolak", () => {
    expect(validateRosterRow(row({ nomor: "7" }), SIZES)).toBeNull();
    expect(validateRosterRow(row({ nomor: "10" }), SIZES)).toBeNull();
    expect(validateRosterRow(row({ nomor: " 7 " }), SIZES)).toBeNull();
    for (const bad of ["", "123", "a"]) {
      expect(validateRosterRow(row({ nomor: bad }), SIZES)).toContain("Nomor");
    }
  });
  it("size di luar daftar ditolak", () => {
    expect(validateRosterRow(row({ size: "XXXL" }), SIZES)).toContain("Ukuran");
  });
});

describe("teamwearGuards: sizesFor + payload + estimasi-null", () => {
  it("sizesFor fallback S-XXL bila katalog tak dikenal", () => {
    expect(sizesFor("xxx" as never)).toEqual(["S", "M", "L", "XL", "XXL"]);
  });
  it("estimatePayloadBytes deterministik", () => {
    expect(estimatePayloadBytes([])).toBe(2);
    const items = [{ decals: [], title: "E2E" }];
    expect(estimatePayloadBytes(items)).toBe(Buffer.byteLength(JSON.stringify(items)));
  });
  it("estimasi apparel tak dikenal -> null tanpa throw", () => {
    expect(
      estimateTeamwearPerRowIdr({ apparelSlug: "dress" } as never)
    ).toBeNull();
  });
});

describe("teamwearGuards: reviewTemplates", () => {
  it("5 template id unik + label non-kosong", () => {
    expect(REVIEW_REJECT_TEMPLATES).toHaveLength(5);
    const ids = REVIEW_REJECT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(5);
    for (const t of REVIEW_REJECT_TEMPLATES) expect(t.label.length).toBeGreaterThan(0);
  });
  it("find: ketemu, lainnya teks kosong, asing -> undefined", () => {
    expect(findRejectTemplate("resolusi-kurang")?.text).toContain("300");
    expect(findRejectTemplate("lainnya")?.text).toBe("");
    expect(findRejectTemplate("tak-ada")).toBeUndefined();
    expect(findRejectTemplate(null)).toBeUndefined();
    expect(findRejectTemplate("")).toBeUndefined();
  });
});
