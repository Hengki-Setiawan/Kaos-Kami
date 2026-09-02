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
  const secretKey =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    // Default fallback testing secret key (Always passes)
    "1x0000000000000000000000000000000AA";

  // Jika token kosong
  if (!token) {
    return {
      success: false,
      errorCodes: ["missing-input-response"],
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
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
    // Fail-safe: jika Cloudflare challenge down, tidak memblokir user sungguhan
    return {
      success: true,
    };
  }
}
