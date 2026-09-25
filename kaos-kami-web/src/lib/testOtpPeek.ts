import { canonicalPhone } from "./phone";

/**
 * Guard murni endpoint intip-OTP test (POST /api/test/otp).
 *
 * Fail-closed berlapis — SEMUA harus lolos, satu gagal = TOLAK:
 * 1. `E2E_ALLOW_OTP_PEEK` persis `"YA"` (unset/kosong/nilai lain = tolak).
 * 2. BUKAN produksi: `NODE_ENV !== "production"` DAN `DUITKU_ENV !== "production"`.
 * 3. Nomor kanonis terdaftar di `E2E_OTP_PEEK_NUMBERS` (koma, dibandingkan
 *    setelah kanonisasi 62… — `08…`/`62…`/`+62…` = SATU nomor).
 *
 * Murni (tanpa DB/rate) agar bisa 100% unit-test. Rate-limit + audit-log
 * ditegakkan di route (rateLimiter + console.warn tanpa kode!).
 */
export interface PeekEnv {
  E2E_ALLOW_OTP_PEEK?: string;
  NODE_ENV?: string;
  DUITKU_ENV?: string;
  E2E_OTP_PEEK_NUMBERS?: string;
}

export function parsePeekAllowlist(raw: string | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => canonicalPhone(s.trim()))
    .filter((s): s is string => !!s);
}

export function isOtpPeekAllowed(
  env: PeekEnv,
  rawPhone: unknown
): { ok: true; canonical: string } | { ok: false; reason: string } {
  if (env.E2E_ALLOW_OTP_PEEK !== "YA") return { ok: false, reason: "flag-mati" };
  if (env.NODE_ENV === "production") return { ok: false, reason: "tolak-prod" };
  if (env.DUITKU_ENV === "production") return { ok: false, reason: "tolak-prod" };
  const canonical = canonicalPhone(String(rawPhone ?? ""));
  if (!canonical) return { ok: false, reason: "nomor-tak-valid" };
  const allowlist = parsePeekAllowlist(env.E2E_OTP_PEEK_NUMBERS);
  if (allowlist.length === 0) return { ok: false, reason: "allowlist-kosong" };
  if (!allowlist.includes(canonical)) return { ok: false, reason: "nomor-tak-terdaftar" };
  return { ok: true, canonical };
}
