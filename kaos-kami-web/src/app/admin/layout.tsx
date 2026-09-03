import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  Sparkles,
  Settings,
  Users,
  LogOut,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // RBAC — server-side gate (ADMIN/SUPER_ADMIN/PRODUCTION_STAFF)
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      // Allow dev without session but log warning (hapus di prod strict)
      if (process.env.NODE_ENV === "production") {
        redirect("/");
      }
    }
  } catch (e) {
    console.warn("AdminLayout auth check failed (dev mode):", e);
  }
  return (
    <div className="min-h-screen bg-[#0E0E10] text-text-primary flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#141416] border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <Link href="/admin" className="flex items-center space-x-2.5">
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

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 font-mono text-xs">
            <Link
              href="/admin"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <LayoutDashboard size={16} />
              <span>OVERVIEW & METRIK</span>
            </Link>

            <Link
              href="/admin/production"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Layers size={16} className="text-brand-accent" />
              <span>KANBAN PRODUKSI DTF</span>
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <ShoppingBag size={16} />
              <span>DAFTAR PESANAN</span>
            </Link>

            <Link
              href="/admin/catalog"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Layers size={16} />
              <span>KATALOG & STOK</span>
            </Link>

            <Link
              href="/admin/customers"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Users size={16} />
              <span>CUSTOMER DB</span>
            </Link>

            <Link
              href="/admin/coupons"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Sparkles size={16} />
              <span>VOUCHER</span>
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings size={16} />
              <span>SETTINGS & WA TEMPLATE</span>
            </Link>

            <div className="pt-4 pb-1 px-3">
              <span className="text-[10px] text-text-muted/60 uppercase font-bold tracking-wider">
                PORTAL EKSTERNAL
              </span>
            </div>

            <Link
              href="/studio"
              target="_blank"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-text-muted hover:text-brand-accent hover:bg-white/5 transition-all"
            >
              <div className="flex items-center space-x-3">
                <Layers size={16} />
                <span>3D MOCKUP STUDIO</span>
              </div>
              <ExternalLink size={12} />
            </Link>

            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag size={16} />
                <span>HALAMAN DEPAN</span>
              </div>
              <ExternalLink size={12} />
            </Link>
          </nav>
        </div>

        {/* User Footer info */}
        <div className="p-4 border-t border-white/5 font-mono text-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold">
              ADM
            </div>
            <div className="overflow-hidden">
              <span className="block text-white font-bold truncate">Operator Workshop</span>
              <span className="block text-[10px] text-emerald-400">● Online / Aktif</span>
            </div>
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
