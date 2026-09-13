"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  Users,
  Sparkles,
  Truck,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "OVERVIEW & METRIK", Icon: LayoutDashboard },
  { href: "/admin/production", label: "KANBAN PRODUKSI DTF", Icon: Layers },
  { href: "/admin/gang-sheet", label: "GANG SHEET 100×58", Icon: Layers },
  { href: "/admin/orders", label: "DAFTAR PESANAN", Icon: ShoppingBag },
  { href: "/admin/catalog", label: "KATALOG & STOK", Icon: Layers },
  { href: "/admin/customers", label: "CUSTOMER DB", Icon: Users },
  { href: "/admin/coupons", label: "VOUCHER", Icon: Sparkles },
  { href: "/admin/shipping", label: "ONGKIR & ZONA", Icon: Truck },
  { href: "/admin/cms", label: "CMS WEBSITE", Icon: FileText },
  { href: "/admin/settings", label: "INFO SISTEM", Icon: Settings },
];

/** Sidebar admin: active-state + logout (audit H20). */
export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingLogout, setAskingLogout] = useState(false);

  const logout = async () => {
    if (busy) return;
    setAskingLogout(false);
    setBusy(true);
    try {
      await signOut();
    } catch {
      // Tetap keluar sisi client walau server gagal.
    } finally {
      setBusy(false);
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <nav className="p-3 space-y-1 font-mono text-xs">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                active
                  ? "bg-brand-accent/15 text-brand-accent font-bold border border-brand-accent/30"
                  : "text-text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
        <div className="pt-3 mt-2 px-0 border-t border-white/5">
          <span className="block text-[10px] text-text-muted/60 uppercase font-bold tracking-wider px-3 pb-1">
            Portal eksternal
          </span>
          {[
            { href: "/studio", label: "3D MOCKUP STUDIO" },
            { href: "/", label: "HALAMAN DEPAN" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-text-muted hover:text-brand-accent hover:bg-white/5 transition-all"
            >
              <span>{label}</span>
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 font-mono text-xs space-y-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold">
            {role.slice(0, 3).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <span className="block text-white font-bold truncate">{role.replace(/_/g, " ")}</span>
            <span className="block text-[10px] text-emerald-400">● Online / Aktif</span>
          </div>
        </div>
        <button
          onClick={() => setAskingLogout(true)}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-rose-300 hover:border-rose-500/40 transition-all disabled:opacity-50"
        >
          <LogOut size={14} />
          <span>{busy ? "KELUAR…" : "KELUAR PANEL"}</span>
        </button>
        <ConfirmDialog
          open={askingLogout}
          title="Keluar panel?"
          message="Sesi admin akan diakhiri di perangkat ini."
          confirmLabel="YA, KELUAR"
          busy={busy}
          onConfirm={() => void logout()}
          onCancel={() => setAskingLogout(false)}
        />
      </div>
    </div>
  );
}
