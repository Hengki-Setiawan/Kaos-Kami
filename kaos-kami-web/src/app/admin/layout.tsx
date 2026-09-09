import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

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
    if (!session || !role || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      redirect("/");
    }
  } catch (e) {
    console.error("AdminLayout auth check failed — akses ditolak:", (e as any)?.message);
    redirect("/");
  }
  return (
    <div className="min-h-screen bg-[#0E0E10] text-text-primary flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#141416] border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <Link href="/admin" className="flex items-center space-x-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
              <img src="/brand/logo-white-clean.png" alt="Kaos Kami" className="h-7 w-auto object-contain" />
              <div className="border-l border-white/20 pl-2.5">
                <span className="font-display font-black text-xs uppercase tracking-tight text-white block leading-tight">
                  WORKSHOP OPS
                </span>
                <span className="font-mono text-[9px] text-brand-accent font-bold leading-tight">
                  DTF MAKASSAR
                </span>
              </div>
            </Link>
          </div>

          {/* Navigasi + role + logout (client, active-state) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <AdminNav role={role || "ADMIN"} />
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 bg-[#0E0E10] overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
