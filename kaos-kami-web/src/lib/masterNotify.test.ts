import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildMasterNotifyNote,
  clampMasterPrintWidthCm,
  isHttpsR2MasterUrl,
  normalizeOffsetFromCollarCm,
  normalizePlacementSide,
  normalizeResi,
} from "@/lib/masterNotify";

/** Master-notify (endpoint master-attach) — unit murni + kontrak statis route. */

describe("masterNotify: clamp lebar ≤30", () => {
  it("29.9 lolos; 30 tepat; 45 dijepit 30; 0/NaN → undefined", () => {
    expect(clampMasterPrintWidthCm(29.9)).toBeCloseTo(29.9, 6);
    expect(clampMasterPrintWidthCm(30)).toBe(30);
    expect(clampMasterPrintWidthCm(45)).toBe(30);
    expect(clampMasterPrintWidthCm(0)).toBeUndefined();
    expect(clampMasterPrintWidthCm(NaN)).toBeUndefined();
    expect(clampMasterPrintWidthCm(undefined)).toBeUndefined();
  });
});

describe("masterNotify: https-R2 guard", () => {
  it("https lolos; http/data:/blob:/base64 ditolak; >2048 ditolak", () => {
    expect(isHttpsR2MasterUrl("https://r2.kaoskami.biz.id/masters/a.png")).toBe(true);
    expect(isHttpsR2MasterUrl("http://r2.kaoskami.biz.id/masters/a.png")).toBe(false);
    expect(isHttpsR2MasterUrl("data:image/png;base64,AAA")).toBe(false);
    expect(isHttpsR2MasterUrl("blob:https://x")).toBe(false);
    expect(isHttpsR2MasterUrl("https://" + "a".repeat(2050))).toBe(false);
  });
});

describe("masterNotify: resi/placement/offset", () => {
  it("resi trim ≤40; kosong → undefined", () => {
    expect(normalizeResi("  JNE123  ")).toBe("JNE123");
    expect(normalizeResi("   ")).toBeUndefined();
    expect(normalizeResi("x".repeat(50))).toHaveLength(40);
  });
  it("placement trim ≤40; offset 0…30", () => {
    expect(normalizePlacementSide(" Dada Depan ")).toBe("Dada Depan");
    expect(normalizePlacementSide("")).toBeUndefined();
    expect(normalizeOffsetFromCollarCm(5)).toBe(5);
    expect(normalizeOffsetFromCollarCm(-1)).toBeUndefined();
    expect(normalizeOffsetFromCollarCm(31)).toBeUndefined();
  });
  it("note ringkas ≤500 char", () => {
    const n = buildMasterNotifyNote({
      printWidthCm: 30,
      placementSide: "Dada Depan",
      offsetFromCollarCm: 5,
      resi: "JNE123",
      hasFile: true,
    });
    expect(n).toContain("Master film DTF");
    expect(n).toContain("30.0");
    expect(n.length).toBeLessThanOrEqual(500);
  });
});

describe("masterNotify: kontrak statis route", () => {
  const ROOT = process.cwd();
  const routeSrc: string = fs.readFileSync(
    path.join(ROOT, "src/app/api/admin/production-tasks/master-notify/route.ts"),
    "utf8"
  );
  it("RBAC = PATCH (ADMIN/SUPER_ADMIN/PRODUCTION_STAFF + 401/403)", () => {
    expect(routeSrc).toContain("ADMIN");
    expect(routeSrc).toContain("PRODUCTION_STAFF");
    expect(routeSrc).toContain("401");
    expect(routeSrc).toContain("403");
  });
  it("tulis OrderStatusEvent selalu", () => {
    expect(routeSrc).toContain("OrderStatusEvent");
    expect(routeSrc).toContain("Master-attach");
  });
  it("WA HANYA bila notifyWa true eksplisit + try/catch", () => {
    expect(routeSrc).toContain("notifyWa === true");
    expect(routeSrc).toContain("try");
    expect(routeSrc).toContain("sendWhatsAppNotification");
    expect(routeSrc).toContain("notifyWa");
  });
});
