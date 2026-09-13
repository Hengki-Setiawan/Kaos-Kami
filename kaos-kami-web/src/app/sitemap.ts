import type { MetadataRoute } from "next";

// Sitemap statis — HANYA rute yang benar-benar ada ( diverifikasi Sep 2026).
// Rute dinamis (/orders/[id]) dan auth (/dashboard, /admin)
// disengaja tidak dimasukkan.
const STATIC_ROUTES: Array<{ path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/studio", changeFrequency: "weekly", priority: 0.9 },
  { path: "/track", changeFrequency: "weekly", priority: 0.6 },
  { path: "/kalkulator-sablon", changeFrequency: "monthly", priority: 0.7 },
  { path: "/kredit", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaoskami.biz.id").replace(/\/+$/, "");
  // Tanggal stabil per rute (audit H23): lastModified: now berubah tiap request
  // = boros crawl. Bump manual saat rute berubah (lihat tracker Fase).
  return STATIC_ROUTES.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: new Date("2026-09-08"),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
