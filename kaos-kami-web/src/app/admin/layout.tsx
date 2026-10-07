import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBell } from "@/components/admin/AdminBell";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminHealthPill } from "@/components/admin/AdminHealthPill";

export const dynamic = "force-dynamic";

// Seluruh /admin/* jangan terindeks (audit).
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // RBAC — server-side gate (ADMIN/SUPER_ADMIN/PRODUCTION_STAFF).
  // B1-4: FAIL-CLOSED — error auth/infra = tolak, JANGAN render panel.
  // (Sebelumnya: non-prod/catch → panel terbuka.)
  let role: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    role = (session?.user as any)?.role || null;
    if (!session || !role || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER"].includes(role)) {
      redirect("/?denied=admin");
    }
  } catch (e) {
    console.error("AdminLayout auth check failed — akses ditolak:", (e as any)?.message);
    redirect("/?denied=admin");
  }
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col md:flex-row">
      {/* Sidebar Modern (Sticky on Desktop) */}
      {/* Icon-rail 64px saat ≤1280px (md..xl), sidebar penuh 256px saat >1280px (xl+) — CSS breakpoint only */}
      <aside className="w-full md:w-16 xl:w-64 bg-surface border-r border-border-subtle flex flex-col md:h-screen md:sticky md:top-0 shrink-0">
        {/* Brand Header */}
        <div className="p-4 md:p-2 xl:p-4 border-b border-border-subtle flex items-center justify-between md:justify-center xl:justify-between gap-2 shrink-0">
          <Link href="/admin" prefetch={false} className="flex items-center space-x-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
            <img src="/brand/logo-white-clean.png" alt="Kaos Kami" className="h-7 w-auto object-contain logo-dark-mode" />
            {/* eslint-disable-next-line @next/next/no-img-element -- varian gelap untuk light mode */}
            <img src="/brand/logo-black-clean.png" alt="Kaos Kami" className="h-7 w-auto object-contain logo-light-mode" />
            <div className="border-l border-border-strong pl-2.5 hidden xl:block">
              <span className="font-sans font-bold text-xs tracking-tight text-text-primary block leading-tight">
                PORTAL INTERNAL
              </span>
              <span className="font-mono text-[9px] text-brand-accent font-semibold leading-tight">
                KAOS KAMI MAKASSAR
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <AdminHealthPill />
            <AdminBell />
          </div>
        </div>

        {/* Navigasi + role + logout (client, active-state) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AdminNav role={role || "ADMIN"} />
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 bg-canvas overflow-y-auto">
        <AdminBreadcrumbs />
        {children}
      </main>
    </div>
  );
}
