import { describe, it, expect } from "vitest";

function sanitizeChatContent(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function validateChatMessage(content: unknown): { valid: boolean; error?: string } {
  if (typeof content !== "string") {
    return { valid: false, error: "Konten pesan wajib berupa string" };
  }
  const clean = sanitizeChatContent(content);
  if (clean.length === 0) {
    return { valid: false, error: "Konten pesan tidak boleh kosong" };
  }
  if (clean.length > 2000) {
    return { valid: false, error: "Pesan maksimal 2000 karakter" };
  }
  return { valid: true };
}

function calculatePresenceStatus(lastSeenDate: Date | null, now: Date = new Date()): {
  isOnline: boolean;
  statusText: string;
} {
  if (!lastSeenDate) {
    return { isOnline: false, statusText: "Belum aktif hari ini" };
  }
  const diffMs = now.getTime() - lastSeenDate.getTime();
  if (diffMs <= 4 * 60 * 1000) {
    return { isOnline: true, statusText: "Online sekarang" };
  }
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return { isOnline: false, statusText: `Aktif ${diffMins} menit lalu` };
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return { isOnline: false, statusText: `Aktif ${diffHours} jam lalu` };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { isOnline: false, statusText: `Aktif ${diffDays} hari lalu` };
}

describe("Chat & Kamito Support System Guards", () => {
  it("sanitizes HTML tags in user chat input to prevent XSS attacks", () => {
    const maliciousInput = "<script>alert('hack')</script> Halo Kamito!";
    const sanitized = sanitizeChatContent(maliciousInput);
    expect(sanitized).toBe("&lt;script&gt;alert('hack')&lt;/script&gt; Halo Kamito!");
    expect(sanitized.includes("<script>")).toBe(false);
  });

  it("validates chat message length bounds (min 1, max 2000 chars)", () => {
    expect(validateChatMessage("").valid).toBe(false);
    expect(validateChatMessage("   ").valid).toBe(false);
    expect(validateChatMessage(123).valid).toBe(false);

    const normal = validateChatMessage("Halo admin, sablon DTF ukuran A3 berapa ya?");
    expect(normal.valid).toBe(true);

    const overlyLong = "a".repeat(2001);
    expect(validateChatMessage(overlyLong).valid).toBe(false);
  });

  it("correctly evaluates online status within 4 minutes threshold", () => {
    const now = new Date("2026-09-27T18:00:00Z");
    const activeJustNow = new Date("2026-09-27T17:58:00Z"); // 2 mins ago
    const statusOnline = calculatePresenceStatus(activeJustNow, now);
    expect(statusOnline.isOnline).toBe(true);
    expect(statusOnline.statusText).toBe("Online sekarang");
  });

  it("calculates relative inactive time when admin is offline", () => {
    const now = new Date("2026-09-27T18:00:00Z");
    const active15MinsAgo = new Date("2026-09-27T17:45:00Z");
    const status15m = calculatePresenceStatus(active15MinsAgo, now);
    expect(status15m.isOnline).toBe(false);
    expect(status15m.statusText).toBe("Aktif 15 menit lalu");

    const active3HoursAgo = new Date("2026-09-27T15:00:00Z");
    const status3h = calculatePresenceStatus(active3HoursAgo, now);
    expect(status3h.isOnline).toBe(false);
    expect(status3h.statusText).toBe("Aktif 3 jam lalu");
  });

  it("handles null lastSeen date gracefully without crashing", () => {
    const statusNull = calculatePresenceStatus(null);
    expect(statusNull.isOnline).toBe(false);
    expect(statusNull.statusText).toBe("Belum aktif hari ini");
  });
});
