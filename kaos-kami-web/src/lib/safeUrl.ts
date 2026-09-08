// URL gambar aman untuk <img>/texture (audit B7 — URL tersimpan di DB
// dirender mentah; tolak scheme aneh seperti javascript:/vbscript:).
// Diizinkan: https, http (dev lokal), data:image/*, blob:.
export function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > 500_000) return false;
  const u = url.trim();
  if (u.startsWith("/") || u.startsWith("#")) return true; // path relatif
  if (/^(https?|blob):/i.test(u)) return true;
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(u)) return true;
  return false;
}
