"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  LayoutGrid,
  ShoppingBag,
  Eye,
  Package,
  Users,
  TicketPercent,
  Truck,
  FileText,
  Boxes,
  Settings,
  LogOut,
  ExternalLink,
  MapPin,
  TrendingUp,
  Layers,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState } from "react";

export type PillarId = "all" | "production" | "delivery" | "admin";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  pillar: "production" | "delivery" | "admin";
}

const LINKS: NavLink[] = [
  // PILAR 1: PRODUKSI WORKSHOP DTF
  { href: "/admin/production", label: "KANBAN PRODUKSI DTF", Icon: ClipboardList, pillar: "production" },
  { href: "/admin/gang-sheet", label: "GANG SHEET 100×58", Icon: LayoutGrid, pillar: "production" },
  { href: "/admin/review", label: "REVIEW DESAIN", Icon: Eye, pillar: "production" },
  { href: "/admin/assets", label: "ASET 3D APPAREL", Icon: Boxes, pillar: "production" },

  // PILAR 2: PENGIRIMAN & KURIR
  { href: "/admin/deliveries", label: "HUB KURIR & PENGIRIMAN", Icon: Truck, pillar: "delivery" },
  { href: "/admin/shipping", label: "ONGKIR & ZONA", Icon: MapPin, pillar: "delivery" },

  // PILAR 3: E-COMMERCE & ADMIN
  { href: "/admin", label: "OVERVIEW & METRIK", Icon: LayoutDashboard, pillar: "admin" },
  { href: "/admin/orders", label: "DAFTAR PESANAN", Icon: ShoppingBag, pillar: "admin" },
  { href: "/admin/catalog", label: "KATALOG & STOK", Icon: Package, pillar: "admin" },
  { href: "/admin/customers", label: "CUSTOMER & TIM DB", Icon: Users, pillar: "admin" },
  { href: "/admin/coupons", label: "VOUCHER DISKON", Icon: TicketPercent, pillar: "admin" },
  { href: "/admin/cms", label: "CMS WEBSITE", Icon: FileText, pillar: "admin" },
  { href: "/admin/laporan", label: "LAPORAN KEUANGAN", Icon: TrendingUp, pillar: "admin" },
  { href: "/admin/settings", label: "INFO SISTEM", Icon: Settings, pillar: "admin" },
];

const PILLAR_CONFIG = [
  { id: "production" as const, title: "PRODUKSI WORKSHOP", icon: Layers, badge: "DTF" },
  { id: "delivery" as const, title: "LOGISTIK & KURIR", icon: Truck, badge: "KIRIM" },
  { id: "admin" as const, title: "E-COMMERCE & ADMIN", icon: LayoutDashboard, badge: "STORE" },
];

/** Sidebar internal: 3 Pilar Operasional (Produksi, Pengiriman, Admin E-Commerce). */
export function AdminNav({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingLogout, setAskingLogout] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<PillarId>("all");

  const safeRole = (role || "").toUpperCase();
  const isSuperOrAdmin = safeRole === "ADMIN" || safeRole === "SUPER_ADMIN";
  const isProdStaff = safeRole === "PRODUCTION_STAFF";
  const isCourier = safeRole === "COURIER";

  // Filter berdasarkan Peran (RBAC strict display)
  const allowedLinks = LINKS.filter((l) => {
    if (isProdStaff) return l.pillar === "production";
    if (isCourier) return l.pillar === "delivery";
    // Admin / Super Admin melihat semua link, disaring bila tab filter aktif
    if (selectedPillar !== "all") return l.pillar === selectedPillar;
    return true;
  });

  const roleShort = (safeRole || "?").slice(0, 3);
  const roleLabel = (safeRole || "TANPA ROLE").replace(/_/g, " ");

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
    <div className="flex flex-col justify-between h-full font-mono text-xs">
      <div className="p-3 space-y-3">
        {/* Banner Identitas Pilar Peran */}
        {isProdStaff && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider">
              <Layers size={13} />
              <span>DIVISI PRODUKSI WORKSHOP</span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Meja cetak DTF & heat press.</p>
          </div>
        )}

        {isCourier && (
          <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider">
              <Truck size={13} />
              <span>DIVISI PENGIRIMAN & KURIR</span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Antar Makassar & resi nasional.</p>
          </div>
        )}

        {/* Tab Switcher Pilar untuk Admin/Super Admin */}
        {isSuperOrAdmin && (
          <div className="space-y-1.5">
            <span className="block text-[9px] text-text-muted/70 uppercase font-black tracking-wider px-1">
              Pilar Operasional
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-[10px] font-bold">
              {[
                { id: "all", label: "SEMUA" },
                { id: "production", label: "PROD" },
                { id: "delivery", label: "KURIR" },
                { id: "admin", label: "TOKO" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPillar(p.id as PillarId)}
                  className={`py-1 rounded-lg transition-all text-center ${
                    selectedPillar === p.id
                      ? "bg-brand-accent text-canvas font-black shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daftar Navigasi per Pilar */}
        <nav className="space-y-4">
          {PILLAR_CONFIG.map((group) => {
            const groupLinks = allowedLinks.filter((l) => l.pillar === group.id);
            if (groupLinks.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header hanya tampil jika Admin melihat mode 'SEMUA' */}
                {isSuperOrAdmin && selectedPillar === "all" && (
                  <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-text-muted/60">
                    <span className="flex items-center gap-1.5">
                      <group.icon size={12} />
                      <span>{group.title}</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] bg-white/5 border border-border-subtle">
                      {group.badge}
                    </span>
                  </div>
                )}

                {groupLinks.map(({ href, label, Icon }) => {
                  const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${
                        active
                          ? "bg-brand-accent/15 text-brand-accent font-bold border border-brand-accent/30 shadow-sm"
                          : "text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon size={15} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Akses Cepat Eksternal */}
          <div className="pt-2 px-0 border-t border-border-subtle">
            <span className="block text-[9px] text-text-muted/60 uppercase font-bold tracking-wider px-3 pb-1">
              Portal Eksternal
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
                className="flex items-center justify-between px-3 py-2 rounded-xl text-text-muted hover:text-brand-accent hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[11px]"
              >
                <span>{label}</span>
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </nav>
      </div>

      {/* Profil Pengguna & Keluar Panel */}
      <div className="p-4 border-t border-border-subtle space-y-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold">
            {roleShort}
          </div>
          <div className="overflow-hidden">
            <span className="block text-text-primary font-bold truncate">{roleLabel}</span>
            <span className="block text-[10px] text-emerald-700 dark:text-emerald-400">● Online / Aktif</span>
          </div>
        </div>
        <button
          onClick={() => setAskingLogout(true)}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-500/40 transition-all disabled:opacity-50"
        >
          <LogOut size={13} />
          <span>{busy ? "KELUAR…" : "KELUAR PANEL"}</span>
        </button>
        <ConfirmDialog
          open={askingLogout}
          title="Keluar panel?"
          message="Sesi operasional internal akan diakhiri di perangkat ini."
          confirmLabel="YA, KELUAR"
          busy={busy}
          onConfirm={() => void logout()}
          onCancel={() => setAskingLogout(false)}
        />
      </div>
    </div>
  );
}
