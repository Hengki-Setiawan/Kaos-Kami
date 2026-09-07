import type { MetadataRoute } from "next";

// Sitemap statis — HANYA rute yang benar-benar ada ( diverifikasi Sep 2026).
// Rute dinamis (/orders/[id], /render/[id]) dan auth (/dashboard, /admin)
// disengaja tidak dimasukkan.
const STATIC_ROUTES: Array<{ path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/studio", changeFrequency: "weekly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaoskami.com").replace(/\/+$/, "");
  const now = new Date();
  return STATIC_ROUTES.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
