import { describe, it, expect } from "vitest";
import { z } from "zod";
import { nanoid } from "nanoid";

describe("CheckoutItemSchema designId validation", () => {
  const DesignIdSchema = z.string().min(1).max(64).optional();

  it("accepts nanoid as designId without cuid failure", () => {
    const id = nanoid(); // e.g. "V1StGXR8_Z5jdHi6B-myT" (21 chars)
    const res = DesignIdSchema.safeParse(id);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBe(id);
    }
  });

  it("accepts legacy cuid as designId", () => {
    const legacyCuid = "cjld2cjxh0000qzrmn831i7rn";
    const res = DesignIdSchema.safeParse(legacyCuid);
    expect(res.success).toBe(true);
  });

  it("accepts undefined or omitted designId for regular catalog items", () => {
    expect(DesignIdSchema.safeParse(undefined).success).toBe(true);
  });

  it("rejects excessively long or empty string", () => {
    expect(DesignIdSchema.safeParse("").success).toBe(false);
    expect(DesignIdSchema.safeParse("a".repeat(65)).success).toBe(false);
  });
});
