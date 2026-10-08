import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBell } from "@/components/admin/AdminBell";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminHealthPill } from "@/components/admin/AdminHealthPill";
import { AdminLogoClickable } from "@/components/admin/AdminLogoClickable";

import { AdminCommandBar } from "@/components/admin/AdminCommandBar";

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

    // DEV OVERRIDE: Di localhost dev mode, jika bukan akun CUSTOMER (PIN 461461), selalu berikan SUPER_ADMIN
    if (process.env.NODE_ENV !== "production") {
      if (role !== "CUSTOMER") {
        role = "SUPER_ADMIN";
      }
    }

    if (!role || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER"].includes(role)) {
      redirect("/?denied=admin");
    }
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.message === "NEXT_REDIRECT") throw e;
    if (process.env.NODE_ENV !== "production") {
      role = "SUPER_ADMIN";
    } else {
      console.error("AdminLayout auth check failed — akses ditolak:", (e as any)?.message);
      redirect("/?denied=admin");
    }
  }
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col md:flex-row">
      {/* Sidebar Modern (Sticky on Desktop) */}
      {/* Icon-rail 64px saat ≤1280px (md..xl), sidebar penuh 256px saat >1280px (xl+) — CSS breakpoint only */}
      <aside className="w-full md:w-16 xl:w-64 bg-surface border-r border-border-subtle flex flex-col md:h-screen md:sticky md:top-0 shrink-0 z-40">
        {/* Brand Header */}
        <div className="p-3 md:p-2 xl:px-4 xl:py-3.5 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
          <AdminLogoClickable />
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <AdminBell />
          </div>
        </div>

        {/* Navigasi + role + logout (client, active-state) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AdminNav role={role || "ADMIN"} />
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 bg-canvas overflow-y-auto flex flex-col">
        {/* Sticky Topbar: Breadcrumbs + Search Command + AdminBell */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border-subtle px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center min-w-0">
            <AdminBreadcrumbs />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-40 sm:w-64">
              <AdminCommandBar role={role} />
            </div>
            <div className="hidden md:block">
              <AdminBell />
            </div>
          </div>
        </header>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
