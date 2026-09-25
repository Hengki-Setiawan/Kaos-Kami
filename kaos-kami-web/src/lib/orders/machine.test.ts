import { describe, it, expect } from "vitest";
import {
  assertTransition,
  isTerminalStatus,
  isAdminCancelFrom,
  isAdminRefundFrom,
  TERMINAL_STATUSES,
} from "@/lib/orders/machine";

function transitionError(role: string, from: string, to: string): { status?: number } | null {
  try {
    assertTransition(role as never, from as never, to as never);
    return null;
  } catch (e) {
    return e as { status?: number };
  }
}

describe("mesin transisi status order", () => {
  it("rantai normal lolos per peran", () => {
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "CANCELLED")).toBeNull();
    expect(transitionError("ADMIN", "SHIPPED", "DELIVERED")).toBeNull();
    expect(transitionError("PRODUCTION_STAFF", "PRINTING", "QUALITY_CHECK")).toBeNull();
    expect(transitionError("SYSTEM", "PENDING_PAYMENT", "PAYMENT_CONFIRMED")).toBeNull();
  });

  it("lompatan ilegal → 400 (PENDING→COMPLETED/SHIPPED, resurrect, mundur)", () => {
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "COMPLETED")?.status).toBe(400);
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "SHIPPED")?.status).toBe(400);
    expect(transitionError("ADMIN", "CANCELLED", "SHIPPED")?.status).toBe(400);
    expect(transitionError("ADMIN", "COMPLETED", "PRINTING")?.status).toBe(400);
    expect(transitionError("PRODUCTION_STAFF", "SHIPPED", "PRINTING")?.status).toBe(400);
  });

  it("review: approve/reject hanya dari DESIGN_REVIEW (admin saja)", () => {
    expect(transitionError("ADMIN", "DESIGN_REVIEW", "PENDING_PAYMENT")).toBeNull();
    expect(transitionError("ADMIN", "DESIGN_REVIEW", "REJECTED")).toBeNull();
    expect(transitionError("PRODUCTION_STAFF", "DESIGN_REVIEW", "PENDING_PAYMENT")?.status).toBe(400);
    expect(transitionError("PRODUCTION_STAFF", "DESIGN_REVIEW", "REJECTED")?.status).toBe(400);
    expect(transitionError("SYSTEM", "DESIGN_REVIEW", "PENDING_PAYMENT")?.status).toBe(400);
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "REJECTED")?.status).toBe(400);
    expect(transitionError("ADMIN", "REJECTED", "PENDING_PAYMENT")?.status).toBe(400);
  });

  it("terminal tak bisa keluar untuk semua peran", () => {
    expect(TERMINAL_STATUSES).toEqual(["CANCELLED", "REFUNDED", "COMPLETED", "REJECTED"]);
    for (const t of TERMINAL_STATUSES) {
      expect(isTerminalStatus(t)).toBe(true);
      for (const role of ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER", "SYSTEM"]) {
        expect(transitionError(role, t, "PRINTING")?.status).toBe(400);
      }
    }
  });

  it("staff tak boleh finansial (cancel/refund/konfirmasi bayar)", () => {
    expect(transitionError("PRODUCTION_STAFF", "PAYMENT_CONFIRMED", "CANCELLED")?.status).toBe(400);
    expect(transitionError("PRODUCTION_STAFF", "PRINTING", "REFUNDED")?.status).toBe(400);
    expect(transitionError("PRODUCTION_STAFF", "PENDING_PAYMENT", "PAYMENT_CONFIRMED")?.status).toBe(400);
  });

  it("rework QC→PRINTING diizinkan, DELIVERED hanya maju", () => {
    expect(transitionError("ADMIN", "QUALITY_CHECK", "PRINTING")).toBeNull();
    expect(transitionError("ADMIN", "DELIVERED", "COMPLETED")).toBeNull();
    expect(transitionError("ADMIN", "DELIVERED", "REFUNDED")?.status).toBe(400);
  });
});

describe("mesin transisi R5: batas peran + finansial (A-005/A-006/A-015)", () => {
  it("DESIGN_REVIEW tak bisa lompat produksi (ADMIN)", () => {
    expect(transitionError("ADMIN", "DESIGN_REVIEW", "SHIPPED")?.status).toBe(400);
    expect(transitionError("ADMIN", "DESIGN_REVIEW", "PRINTING")?.status).toBe(400);
    expect(transitionError("ADMIN", "DESIGN_REVIEW", "COMPLETED")?.status).toBe(400);
  });
  it("terminal REJECTED/COMPLETED/CANCELLED tak bisa ke mana pun", () => {
    expect(transitionError("ADMIN", "REJECTED", "PENDING_PAYMENT")?.status).toBe(400);
    expect(transitionError("ADMIN", "REJECTED", "COMPLETED")?.status).toBe(400);
    expect(transitionError("ADMIN", "COMPLETED", "DELIVERED")?.status).toBe(400);
    expect(transitionError("ADMIN", "COMPLETED", "REFUNDED")?.status).toBe(400);
    expect(transitionError("ADMIN", "CANCELLED", "REFUNDED")?.status).toBe(400);
    expect(transitionError("ADMIN", "CANCELLED", "PRINTING")?.status).toBe(400);
  });
  it("replay status sama = 400 (anti race-approve ganda)", () => {
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "PENDING_PAYMENT")?.status).toBe(400);
    expect(transitionError("SYSTEM", "PAYMENT_CONFIRMED", "PAYMENT_CONFIRMED")?.status).toBe(400);
  });
  it("mundur ke DESIGN_REVIEW selalu 400", () => {
    expect(transitionError("ADMIN", "PENDING_PAYMENT", "DESIGN_REVIEW")?.status).toBe(400);
    expect(transitionError("SUPER_ADMIN", "PAYMENT_CONFIRMED", "DESIGN_REVIEW")?.status).toBe(400);
  });
  it("STAFF: READY/SHIPPED/DELIVERED boleh COMPLETED; SYSTEM: READY hanya SHIPPED", () => {
    expect(transitionError("PRODUCTION_STAFF", "READY_TO_SHIP", "DELIVERED")).toBeNull();
    expect(transitionError("PRODUCTION_STAFF", "READY_TO_SHIP", "COMPLETED")).toBeNull();
    expect(transitionError("PRODUCTION_STAFF", "SHIPPED", "COMPLETED")).toBeNull();
    expect(transitionError("SYSTEM", "READY_TO_SHIP", "SHIPPED")).toBeNull();
    expect(transitionError("SYSTEM", "READY_TO_SHIP", "DELIVERED")?.status).toBe(400);
    expect(transitionError("SYSTEM", "SHIPPED", "COMPLETED")?.status).toBe(400);
    expect(transitionError("SYSTEM", "DELIVERED", "COMPLETED")).toBeNull();
  });
  it("SUPER_ADMIN setara ADMIN; STAFF tak boleh REFUNDED", () => {
    expect(transitionError("SUPER_ADMIN", "DESIGN_REVIEW", "PENDING_PAYMENT")).toBeNull();
    expect(transitionError("SUPER_ADMIN", "SHIPPED", "REFUNDED")).toBeNull();
    expect(transitionError("PRODUCTION_STAFF", "READY_TO_SHIP", "REFUNDED")?.status).toBe(400);
    expect(transitionError("PRODUCTION_STAFF", "SHIPPED", "REFUNDED")?.status).toBe(400);
  });
  it("batas finansial sinkron route: cancel vs refund", () => {
    expect(isAdminCancelFrom("PENDING_PAYMENT")).toBe(true);
    expect(isAdminCancelFrom("PAYMENT_CONFIRMED")).toBe(true);
    expect(isAdminCancelFrom("PRINTING")).toBe(false);
    expect(isAdminRefundFrom("PAYMENT_CONFIRMED")).toBe(true);
    expect(isAdminRefundFrom("SHIPPED")).toBe(true);
    expect(isAdminRefundFrom("PENDING_PAYMENT")).toBe(false);
    expect(isAdminRefundFrom("DELIVERED")).toBe(false);
  });
});
