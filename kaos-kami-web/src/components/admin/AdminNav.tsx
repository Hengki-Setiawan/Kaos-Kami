"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Settings,
  LogOut,
  ExternalLink,
  Layers,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminCommandBar } from "@/components/admin/AdminCommandBar";
import { AdminHealthPill } from "@/components/admin/AdminHealthPill";
import { useState, useEffect } from "react";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  roleLimit?: string[];
}

const LINKS: NavLink[] = [
  {
    href: "/admin",
    label: "Pusat Pesanan",
    Icon: ShoppingBag,
    roleLimit: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/production",
    label: "Workshop Sablon DTF",
    Icon: Layers,
    roleLimit: ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"],
  },
  {
    href: "/admin/deliveries",
    label: "Hub Pengiriman & Kurir",
    Icon: Truck,
    roleLimit: ["ADMIN", "SUPER_ADMIN", "COURIER"],
  },
  {
    href: "/admin/chat",
    label: "Live Chat CS (Kamito)",
    Icon: MessageSquare,
    roleLimit: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Pengaturan & Analitik",
    Icon: Settings,
    roleLimit: ["ADMIN", "SUPER_ADMIN"],
  },
];

export function AdminNav({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingLogout, setAskingLogout] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const safeRole = (role || "").toUpperCase();
  const roleLabel = (safeRole || "STAFF").replace(/_/g, " ");
  const roleShort = (safeRole || "ADM").slice(0, 3);

  // Filter menu berdasarkan role
  const allowedLinks = LINKS.filter((l) => {
    if (!l.roleLimit) return true;
    return l.roleLimit.includes(safeRole) || safeRole === "SUPER_ADMIN" || safeRole === "ADMIN";
  });

  const logout = async () => {
    if (busy) return;
    setAskingLogout(false);
    setBusy(true);
    try {
      await signOut();
    } catch {
      // Fallback
    } finally {
      setBusy(false);
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-col justify-between h-full font-sans text-xs">
      <div className="p-3 md:px-2 xl:p-3 space-y-2">
        {/* Daftar Navigasi Utama */}
        <nav className="space-y-1">
          {allowedLinks.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            const isNavigating = navigatingTo === href;

            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() => {
                  if (pathname !== href) setNavigatingTo(href);
                }}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`flex items-center md:justify-center xl:justify-between px-3 md:px-2 xl:px-3 py-2 rounded-xl transition-all text-xs font-medium ${
                  active
                    ? "bg-brand-accent/10 text-brand-accent font-semibold"
                    : "text-text-muted hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center md:space-x-0 xl:space-x-2.5 space-x-2.5 min-w-0">
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      active ? "text-brand-accent" : "text-text-muted"
                    }`}
                  />
                  <span className="truncate hidden xl:inline">{label}</span>
                </div>
                {isNavigating && (
                  <div className="hidden xl:block w-3 h-3 rounded-full border-2 border-brand-accent border-t-transparent animate-spin shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Tautan Cepat Eksternal */}
        <div className="pt-2 border-t border-border-subtle space-y-0.5">
          <span className="hidden xl:block text-[10px] font-semibold text-text-muted uppercase tracking-wider px-3 pb-1">
            Pratinjau
          </span>
          {[
            { href: "/studio", label: "Studio 3D Mockup", icon: Sparkles },
            { href: "/", label: "Halaman Toko", icon: ExternalLink },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className="flex items-center md:justify-center xl:justify-between px-3 md:px-2 xl:px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all text-xs"
            >
              <span className="hidden xl:inline">{label}</span>
              <Icon size={13} className="shrink-0 opacity-70" />
            </a>
          ))}
        </div>
      </div>

      {/* Footer: Health Pill, Profil & Logout */}
      <div className="p-3 md:px-2 xl:p-3 border-t border-border-subtle space-y-2 shrink-0">
        <div className="hidden xl:flex items-center justify-between px-1 text-[11px] text-text-muted">
          <span>Sistem Workshop</span>
          <AdminHealthPill />
        </div>

        <div className="flex items-center md:justify-center xl:justify-start md:space-x-0 xl:space-x-2.5 space-x-2.5 px-1" title={roleLabel}>
          <div className="w-7 h-7 rounded-lg bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold text-xs shrink-0">
            {roleShort}
          </div>
          <div className="overflow-hidden min-w-0 flex-1 hidden xl:block">
            <span className="block text-text-primary font-semibold text-xs leading-none truncate">{roleLabel}</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Aktif</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setAskingLogout(true)}
          disabled={busy}
          title="Keluar Panel"
          className="w-full flex items-center justify-center gap-1.5 px-3 md:px-0 xl:px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle text-text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all text-xs font-medium disabled:opacity-50"
        >
          <LogOut size={13} />
          <span className="hidden xl:inline">{busy ? "Keluar..." : "Keluar Panel"}</span>
        </button>

        <ConfirmDialog
          open={askingLogout}
          title="Keluar dari Panel Admin?"
          message="Sesi operasional internal Anda akan diakhiri di perangkat ini."
          confirmLabel="Ya, Keluar"
          busy={busy}
          onConfirm={() => void logout()}
          onCancel={() => setAskingLogout(false)}
        />
      </div>
    </div>
  );
}
