import { describe, expect, it } from "vitest";
import {
  classifyOrderForWebhook,
  isIpaymuSuccessStatus,
  mustWaitForConfirmationEvent,
} from "./webhookState";

describe("classifyOrderForWebhook", () => {
  it("hanya PENDING_PAYMENT yang boleh dikonfirmasi", () => {
    expect(classifyOrderForWebhook("PENDING_PAYMENT")).toBe("pending");
  });

  it.each([
    "PAYMENT_CONFIRMED",
    "IN_PRODUCTION_QUEUE",
    "PRINTING",
    "QUALITY_CHECK",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
  ])("status %s = sudah dibayar/diproses (idempoten)", (status) => {
    expect(classifyOrderForWebhook(status)).toBe("already_paid");
  });

  it("REFUNDED tidak boleh ditimpa settlement", () => {
    expect(classifyOrderForWebhook("REFUNDED")).toBe("already_refunded");
  });

  it.each(["CANCELLED", "REJECTED", "DESIGN_REVIEW"])(
    "status %s yang menerima uang = late payment / refund",
    (status) => {
      expect(classifyOrderForWebhook(status)).toBe("late_payment");
    }
  );

  it("status tak dikenal tidak pernah dianggap pending", () => {
    expect(classifyOrderForWebhook("SOMETHING_NEW")).toBe("unknown");
  });
});

describe("mustWaitForConfirmationEvent", () => {
  it("hanya PAYMENT_CONFIRMED yang menunggu event batch", () => {
    expect(mustWaitForConfirmationEvent("PAYMENT_CONFIRMED")).toBe(true);
    expect(mustWaitForConfirmationEvent("PENDING_PAYMENT")).toBe(false);
    expect(mustWaitForConfirmationEvent("READY_TO_SHIP")).toBe(false);
    expect(mustWaitForConfirmationEvent("COMPLETED")).toBe(false);
  });
});

describe("isIpaymuSuccessStatus", () => {
  it("menerima kode resmi success 1 dan success-unsettled 6", () => {
    expect(isIpaymuSuccessStatus({ status: "1" })).toBe(true);
    expect(isIpaymuSuccessStatus({ status: "6" })).toBe(true);
    expect(isIpaymuSuccessStatus({ statusCode: 1 })).toBe(true);
  });

  it("menolak pending/cancelled/expired walau deskripsi memuat kata success", () => {
    expect(isIpaymuSuccessStatus({ status: "0", statusDesc: "Success" })).toBe(false);
    expect(isIpaymuSuccessStatus({ status: "2", statusDesc: "Berhasil" })).toBe(false);
    expect(isIpaymuSuccessStatus({ status: "-2", statusDesc: "Success" })).toBe(false);
    expect(isIpaymuSuccessStatus({ status: "belum berhasil" })).toBe(false);
  });

  it("TIDAK salah menganggap 'unsettled' sebagai settled", () => {
    expect(isIpaymuSuccessStatus({ status: "unsettled" })).toBe(false);
    expect(isIpaymuSuccessStatus({ statusDesc: "unsettled" })).toBe(false);
    expect(isIpaymuSuccessStatus({ statusDesc: "pending settlement" })).toBe(false);
  });

  it("menerima PaidStatus paid dan frasa exact resmi", () => {
    expect(isIpaymuSuccessStatus({ status: "6", paidStatus: "paid" })).toBe(true);
    expect(isIpaymuSuccessStatus({ paidStatus: "paid" })).toBe(true);
    expect(isIpaymuSuccessStatus({ status: "berhasil" })).toBe(true);
    expect(isIpaymuSuccessStatus({ statusDesc: "Success - Unsettled" })).toBe(true);
  });
});
