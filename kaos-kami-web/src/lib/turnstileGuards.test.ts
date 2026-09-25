import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";

// R5: Turnstile fail-closed — murni via vi.stubEnv + stub fetch
// (TANPA network Cloudflare asli; nilai riil + latensi milik test HTTP).
const OLD_ENV = { ...process.env };
beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(OLD_ENV)) {
    (process.env as Record<string, string | undefined>)[k] = v;
  }
});

describe("turnstileGuards: tanpa secret", () => {
  it("dev secret-kosong -> lolos (fail-open dev)", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "test");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await verifyTurnstileToken("", undefined)).toEqual({ success: true });
    expect(spy).not.toHaveBeenCalled();
  });
  it("production secret-kosong -> TOLAK missing-secret", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await verifyTurnstileToken("", undefined)).toEqual({ success: false, errorCodes: ["missing-secret"] });
    expect(spy).not.toHaveBeenCalled();
  });
  it("secret ada + token kosong -> missing-input-response", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "s3cr3t");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await verifyTurnstileToken("", "1.1.1.1")).toEqual({ success: false, errorCodes: ["missing-input-response"] });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("turnstileGuards: siteverify stub", () => {
  const okFetch = (body: unknown) =>
    vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) });
  it("dummy XXXX.DUMMY.* pakai test-key AA (secret kosong pun jalan)", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "test");
    const spy = okFetch({ success: true, challenge_ts: "ts", hostname: "h" });
    vi.stubGlobal("fetch", spy);
    const r = await verifyTurnstileToken("XXXX.DUMMY.abc", undefined);
    expect(r).toEqual({ success: true, errorCodes: undefined, challengeTs: "ts", hostname: "h" });
    const [, init] = spy.mock.calls[0] as [string, { body: string }];
    expect(init.body).toContain("secret=1x0000000000000000000000000000000AA");
  });
  it("body urlencoded secret+response+remoteip", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "s3cr3t");
    const spy = okFetch({ success: true });
    vi.stubGlobal("fetch", spy);
    await verifyTurnstileToken("tok", "1.1.1.1");
    const [url, init] = spy.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.body).toContain("secret=s3cr3t");
    expect(init.body).toContain("response=tok");
    expect(init.body).toContain("remoteip=1.1.1.1");
  });
  it("tanpa ip -> tanpa remoteip", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "s3cr3t");
    const spy = okFetch({ success: true });
    vi.stubGlobal("fetch", spy);
    await verifyTurnstileToken("tok", undefined);
    const [, init] = spy.mock.calls[0] as [string, { body: string }];
    expect(init.body).not.toContain("remoteip");
  });
  it("error-codes diteruskan persis", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "s3cr3t");
    vi.stubGlobal("fetch", okFetch({ success: false, "error-codes": ["invalid-input-response"] }));
    expect(await verifyTurnstileToken("tok", undefined)).toEqual({
      success: false,
      errorCodes: ["invalid-input-response"],
      challengeTs: undefined,
      hostname: undefined,
    });
  });
  it("fetch reject/timeout/json-throw -> verification-error (fail-closed)", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "s3cr3t");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await verifyTurnstileToken("tok", undefined)).toEqual({ success: false, errorCodes: ["verification-error"] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.reject(new Error("bad json")) })
    );
    expect(await verifyTurnstileToken("tok", undefined)).toEqual({ success: false, errorCodes: ["verification-error"] });
  });
});
