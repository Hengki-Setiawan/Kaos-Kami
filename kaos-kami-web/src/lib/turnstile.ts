import { isDevOrTest } from "./envMode";

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
}

/**
 * Verifikasi token Cloudflare Turnstile di server side
 * Dokumentasi: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  // Test key Cloudflare ("selalu lolos") HANYA untuk dev. Di production tanpa
  // secret asli = verifikasi tidak berarti → tolak.
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "";
  
  // P0.4 (23 Okt 2026, keputusan owner): token dummy resmi Cloudflare (test key
  // 1x00000000000000000000AA) HANYA boleh dipakai di NON-production. Di production,
  // token apa pun — termasuk "XXXX.DUMMY.*" — diverifikasi via secret asli → dummy
  // otomatis GAGAL (fail-closed, pintu anti-bot tidak bisa dilubangi).
  const isDev = isDevOrTest();
  const isDummyToken =
    isDev &&
    typeof token === "string" &&
    (token.startsWith("XXXX.DUMMY.") || token === "dummy-token");
  const effectiveSecret = isDummyToken
    ? "1x0000000000000000000000000000000AA"
    : secretKey;

  if (!effectiveSecret) {
    // Fail-closed untuk semua mode selain development/test eksplisit.
    if (!isDev) {
      return { success: false, errorCodes: ["missing-secret"] };
    }
    return { success: true };
  }

  // Jika token kosong
  if (!token) {
    return {
      success: false,
      errorCodes: ["missing-input-response"],
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", effectiveSecret);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        // Jangan biarkan verifikasi anti-bot menggantung checkout.
        signal: AbortSignal.timeout(8000),
      }
    );

    const data: any = await response.json();

    return {
      success: !!data.success,
      errorCodes: data["error-codes"],
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error("[Turnstile] Verification error:", error);
    // B1-4: FAIL-CLOSED di jalur uang — Cloudflare down/timeout = tolak,
    // JANGAN loloskan bot. (Sebelumnya success:true.)
    return {
      success: false,
      errorCodes: ["verification-error"],
    };
  }
}
