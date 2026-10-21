// URL situs kanonis. Fail-closed di production bila env hilang (jangan bocorkan
// localhost ke invoice/WA pelanggan).
export function siteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  const v = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (process.env.NODE_ENV === "production" || process.env.CF_PAGES || process.env.CLOUDFLARE_ACCOUNT_ID) {
    if (v && !v.includes("localhost")) return v.replace(/\/+$/, "");
    return "https://kaoskami.biz.id";
  }
  return v || "http://localhost:3000";
}
