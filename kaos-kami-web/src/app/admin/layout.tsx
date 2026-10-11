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

import {
  AdminMobileNavTrigger,
  AdminMobileBottomNav,
  AdminMobileDrawer,
} from "@/components/admin/AdminMobileNav";

export const dynamic = "force-dynamic";

// Seluruh /admin/* jangan terindeks (audit).
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // RBAC — server-side gate (ADMIN/SUPER_ADMIN/PRODUCTION_STAFF).
  // B1-4: FAIL-CLOSED — error auth/infra = tolak, JANGAN render panel.
  let role: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    role = (session?.user as any)?.role || null;

    // DEV OVERRIDE: Di localhost dev mode, izinkan Super Admin jika sesi valid.
    // Jika user adalah CUSTOMER atau GUEST (belum login / session null), tolak akses admin.
    if (process.env.NODE_ENV !== "production") {
      if (role && role !== "CUSTOMER") {
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
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col md:flex-row relative">
      {/* ── 1. MOBILE TOP HEADER (Sticky, ONLY on Mobile < md) ── */}
      <header className="md:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border-subtle h-14 px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <AdminMobileNavTrigger />
          <AdminLogoClickable />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AdminCommandBar role={role} compact />
          <AdminBell />
        </div>
      </header>

      {/* ── 2. DESKTOP SIDEBAR (Sticky on Desktop >= md, HIDDEN on Mobile) ── */}
      {/* Icon-rail 64px saat ≤1280px (md..xl), sidebar penuh 256px saat >1280px (xl+) */}
      <aside className="hidden md:flex md:w-16 xl:w-64 bg-surface border-r border-border-subtle flex-col md:h-screen md:sticky md:top-0 shrink-0 z-30">
        {/* Brand Header */}
        <div className="p-3 md:p-2 xl:px-4 xl:py-3.5 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
          <AdminLogoClickable />
        </div>

        {/* Navigasi + role + logout (client, active-state) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AdminNav role={role || "ADMIN"} />
        </div>
      </aside>

      {/* ── 3. MAIN CONTENT VIEWPORT (with pb-24 on mobile to clear bottom thumb bar) ── */}
      <main className="flex-1 min-w-0 bg-canvas overflow-y-auto flex flex-col pb-24 md:pb-0">
        {/* Desktop Sticky Topbar: Breadcrumbs + Search Command + AdminBell */}
        <header className="hidden md:flex sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border-subtle px-4 sm:px-8 py-2.5 items-center justify-between gap-3 shrink-0">
          <div className="flex items-center min-w-0">
            <AdminBreadcrumbs />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-40 sm:w-64">
              <AdminCommandBar role={role} />
            </div>
            <AdminBell />
          </div>
        </header>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>

      {/* ── 4. MOBILE BOTTOM THUMB BAR (Fixed at bottom on Mobile, outside of header) ── */}
      <AdminMobileBottomNav />

      {/* ── 5. MOBILE NAVIGATION DRAWER (Portal directly to document.body, 100% immune to CSS bugs) ── */}
      <AdminMobileDrawer role={role} />
    </div>
  );
}
