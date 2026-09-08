// URL situs kanonis. Fail-closed di production bila env hilang (jangan bocorkan
// localhost ke invoice/WA pelanggan).
export function siteUrl(): string {
  const v = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (v) return v.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL belum di-set");
  }
  return "http://localhost:3000";
}
