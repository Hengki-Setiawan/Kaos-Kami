// scripts/e2e-auth.mjs — helper auth E2E (SSOT cookie!).
// FAKTA (investigasi 2026-09-23): better-auth 1.7.2 MENANDATANGANI cookie sesi
// (better-call serializeSignedCookie: value = token + "." + base64(HMAC-SHA256(secret, token))).
// Token mentah dari tabel Session DITOLAK (guest!) — SEMUA runner WAJIB pakai signedCookie() ini!
// Secret: BETTER_AUTH_SECRET via env (requireEnv di tiap script, JANGAN hardcode!).
import { serializeSignedCookie } from "../node_modules/better-call/dist/cookies.mjs";

export async function signedValue(token) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("E2E butuh env BETTER_AUTH_SECRET (untuk sign cookie sesi)");
  const ser = await serializeSignedCookie("better-auth.session_token", token, secret, {});
  return ser.slice(ser.indexOf("=") + 1);
}

// Header Cookie siap pakai. Hanya better-auth.session_token (varian kaos-kami-auth/kaoskami-auth
// TIDAK ADA di kode app — jangan kirim sampah!).
export async function cookieHeader(token) {
  return `better-auth.session_token=${await signedValue(token)}`;
}

// Ambil token sesi terbaru user dari DB (read-only!) lalu kembalikan header cookie bertanda.
export async function cookieForEmail(db, email) {
  const r = await db.execute({
    sql: "SELECT token FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1",
    args: [email],
  });
  if (!r.rows.length) throw new Error(`Tidak ada sesi untuk ${email}`);
  return cookieHeader(r.rows[0].token);
}
