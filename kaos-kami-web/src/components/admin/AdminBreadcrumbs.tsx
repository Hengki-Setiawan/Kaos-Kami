"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

/** Label hierarkis per segmen admin (UI-only, tanpa ubah API/DB). */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  production: "Workshop Sablon DTF",
  deliveries: "Hub Pengiriman & Kurir",
  chat: "Live Chat CS",
  settings: "Pengaturan Toko",
  orders: "Pesanan",
  catalog: "Katalog",
  coupons: "Kupon",
  customers: "Pelanggan",
  cms: "CMS",
  laporan: "Laporan",
  shipping: "Ongkir",
  "gang-sheet": "Gang Sheet",
  "job-ticket": "SPK Kerja",
};

function labelFor(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  // ID order dinamis → "Detail"; lainnya Sentence Case.
  if (/^[a-z0-9_-]{8,}$/i.test(seg)) return "Detail";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Breadcrumb hierarkis: Admin > NamaHalaman dari pathname. */
export function AdminBreadcrumbs() {
  const pathname = usePathname() || "/admin";
  const noQuery = pathname.split("?")[0] ?? pathname;
  const clean = noQuery.split("#")[0] ?? noQuery;
  const segs = clean.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (const s of segs) {
    acc += `/${s}`;
    if (!acc.startsWith("/admin")) continue;
    crumbs.push({ href: acc, label: labelFor(s) });
  }
  if (crumbs.length === 0) crumbs.push({ href: "/admin", label: "Admin" });
  // Halaman dashboard root: "Admin > Pesanan & Analitik" agar hierarkis jelas.
  if (crumbs.length === 1 && crumbs[0]?.href === "/admin") {
    crumbs.push({ href: "/admin", label: "Pesanan & Analitik" });
  }
  return (
    <nav aria-label="Breadcrumb admin" className="px-1 py-0.5">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-text-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.href}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={11} className="shrink-0 opacity-60" />}
              {last ? (
                <span aria-current="page" className="font-bold text-text-primary truncate">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} prefetch={false} className="hover:text-brand-accent hover:underline truncate">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
