import { describe, it, expect, vi } from "vitest";
import { withBusyRetry } from "./dbRetry";

describe("dbRetry: withBusyRetry", () => {
  it("langsung return hasil jika operasi sukses pertama kali", async () => {
    const fn = vi.fn().mockResolvedValue("SUCCESS");
    const result = await withBusyRetry(fn);
    expect(result).toBe("SUCCESS");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("melakukan retry saat terjadi SQLITE_BUSY dan berhasil di percobaan berikutnya", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("SQLiteError: SQLITE_BUSY: database is locked");
      }
      return "RECOVERED";
    });

    const result = await withBusyRetry(fn, { maxRetries: 4, baseDelayMs: 5 });
    expect(result).toBe("RECOVERED");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("langsung melempar error non-busy tanpa retry sia-sia", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ValidationError: invalid price"));
    await expect(withBusyRetry(fn, { maxRetries: 3 })).rejects.toThrow("ValidationError");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("melempar error jika seluruh percobaan retry habis", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("SQLITE_BUSY: database is locked"));
    await expect(withBusyRetry(fn, { maxRetries: 3, baseDelayMs: 5 })).rejects.toThrow("SQLITE_BUSY");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
