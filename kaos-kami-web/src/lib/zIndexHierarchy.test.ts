import { describe, it, expect } from "vitest";
import {
  Z_CANVAS,
  Z_BG,
  Z_HUD,
  Z_CHAT,
  Z_NAV,
  Z_DRAWER,
  Z_CART,
  Z_MODAL,
  Z_AUTH,
  Z_CONFIRM,
  Z_POPOVER,
  Z_QRIS,
  Z_TOAST,
  Z_HIERARCHY,
  Z_CLASS_CHAT,
  Z_CLASS_NAV,
  Z_CLASS_DRAWER,
  Z_CLASS_CART,
  Z_CLASS_MODAL,
  Z_CLASS_AUTH,
  Z_CLASS_CONFIRM,
  Z_CLASS_QRIS,
  Z_CLASS_TOAST,
} from "@/lib/zIndex";

/**
 * Hierarki z-index L0→L7 (SSOT: src/lib/zIndex.ts, Blueprint Bab 23/27/39).
 * Urutan mutlak: canvas(10) < bg(20) < hud(30) < chat(35) < nav/drawer(50)
 *   < cart/modal(60) < auth/confirm/popover(70) < qris/toast(80).
 */

// "z-50" -> 50, "z-[35]" -> 35
function classToNumber(cls: string): number {
  const m = cls.match(/^z-(?:\[(\d+)\]|(\d+))$/);
  if (!m) throw new Error(`kelas z tak dikenal: ${cls}`);
  return Number(m[1] ?? m[2]);
}

describe("zIndexHierarchy: L0→L7 menaik ketat (Z_HIERARCHY)", () => {
  it("8 lapis L0..L7 = [10,20,30,35,50,60,70,80] berurutan", () => {
    const vals = Object.values(Z_HIERARCHY);
    expect(vals).toEqual([10, 20, 30, 35, 50, 60, 70, 80]);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]!);
    }
  });

  it("kunci L0..L7 hadir lengkap", () => {
    expect(Object.keys(Z_HIERARCHY)).toEqual([
      "L0_canvas",
      "L1_bg",
      "L2_hud",
      "L3_chat",
      "L4_nav_drawer",
      "L5_modal_cart",
      "L6_auth_confirm",
      "L7_qris_toast",
    ]);
  });
});

describe("zIndexHierarchy: rantai chat<drawer<cart<auth<qris (numerik)", () => {
  it("chat(35) < drawer(50) < cart(60) < auth(70) < qris(80)", () => {
    expect(Z_CHAT).toBe(35);
    expect(Z_DRAWER).toBe(50);
    expect(Z_CART).toBe(60);
    expect(Z_AUTH).toBe(70);
    expect(Z_QRIS).toBe(80);
    expect(Z_CHAT).toBeLessThan(Z_DRAWER);
    expect(Z_DRAWER).toBeLessThan(Z_CART);
    expect(Z_CART).toBeLessThan(Z_AUTH);
    expect(Z_AUTH).toBeLessThan(Z_QRIS);
  });

  it("pasangan selevel: NAV==DRAWER(50), CART==MODAL(60), AUTH==CONFIRM==POPOVER(70), QRIS==TOAST(80)", () => {
    expect(Z_NAV).toBe(Z_DRAWER);
    expect(Z_CART).toBe(Z_MODAL);
    expect(Z_AUTH).toBe(Z_CONFIRM);
    expect(Z_AUTH).toBe(Z_POPOVER);
    expect(Z_QRIS).toBe(Z_TOAST);
  });

  it("kanvas paling bawah, qris/toast paling atas", () => {
    const all = [Z_CANVAS, Z_BG, Z_HUD, Z_CHAT, Z_NAV, Z_DRAWER, Z_CART, Z_MODAL, Z_AUTH, Z_CONFIRM, Z_POPOVER, Z_QRIS, Z_TOAST];
    expect(Math.min(...all)).toBe(Z_CANVAS);
    expect(Math.max(...all)).toBe(Z_QRIS);
  });
});

describe("zIndexHierarchy: class Tailwind mengikuti angka yang sama", () => {
  it("rantai class chat<drawer<cart<auth<qris", () => {
    const chat = classToNumber(Z_CLASS_CHAT);
    const drawer = classToNumber(Z_CLASS_DRAWER);
    const cart = classToNumber(Z_CLASS_CART);
    const auth = classToNumber(Z_CLASS_AUTH);
    const qris = classToNumber(Z_CLASS_QRIS);
    expect([chat, drawer, cart, auth, qris]).toEqual([Z_CHAT, Z_DRAWER, Z_CART, Z_AUTH, Z_QRIS]);
    expect(chat).toBeLessThan(drawer);
    expect(drawer).toBeLessThan(cart);
    expect(cart).toBeLessThan(auth);
    expect(auth).toBeLessThan(qris);
  });

  it("class nav/drawer/modal/confirm/toast selevel dengan pasangannya", () => {
    expect(classToNumber(Z_CLASS_NAV)).toBe(Z_NAV);
    expect(classToNumber(Z_CLASS_DRAWER)).toBe(Z_DRAWER);
    expect(classToNumber(Z_CLASS_CART)).toBe(Z_CART);
    expect(classToNumber(Z_CLASS_MODAL)).toBe(Z_MODAL);
    expect(classToNumber(Z_CLASS_AUTH)).toBe(Z_AUTH);
    expect(classToNumber(Z_CLASS_CONFIRM)).toBe(Z_CONFIRM);
    expect(classToNumber(Z_CLASS_TOAST)).toBe(Z_TOAST);
  });
});
