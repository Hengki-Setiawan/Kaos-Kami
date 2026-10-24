"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  Layers,
  Printer,
  Truck,
  MessageSquare,
  Package,
  Tag,
  MapPin,
  Sliders,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ExternalLink,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminHealthPill } from "@/components/admin/AdminHealthPill";
import { useAdminMobileNav } from "@/store/useAdminMobileNav";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roleLimit?: string[];
}

const PRIMARY_LINKS: NavItem[] = [
  { href: "/admin", label: "Pusat Pesanan", icon: ShoppingBag, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/production", label: "Workshop Sablon DTF", icon: Layers, roleLimit: ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"] },
  { href: "/admin/gang-sheet", label: "Gang Sheet Roll DTF", icon: Printer, roleLimit: ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"] },
  { href: "/admin/deliveries", label: "Hub Pengiriman & Kurir", icon: Truck, roleLimit: ["ADMIN", "SUPER_ADMIN", "COURIER"] },
  { href: "/admin/chat", label: "Chat & Pesan Pelanggan", icon: MessageSquare, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
];

const MODULE_LINKS: NavItem[] = [
  { href: "/admin/catalog", label: "Katalog & Stok Bahan", icon: Package, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/coupons", label: "Kupon & Diskon Promo", icon: Tag, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/shipping", label: "Tarif & Zona Ongkir", icon: MapPin, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/cms", label: "Konten Website (CMS)", icon: Sliders, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/customers", label: "Database Pelanggan", icon: Users, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/laporan", label: "Laporan Finansial & QC", icon: BarChart3, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Pengaturan & Analitik", icon: Settings, roleLimit: ["ADMIN", "SUPER_ADMIN"] },
];

/** ── 1. TOMBOL HAMBURGER HEADER HP ── */
export function AdminMobileNavTrigger() {
  const openDrawer = useAdminMobileNav((s) => s.openDrawer);
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Buka menu navigasi admin"
      className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shrink-0"
    >
      <Menu size={20} />
    </button>
  );
}

/** ── 2. BOTTOM THUMB NAVIGATION BAR (5 TAB DI BAWAH HP) ── */
export function AdminMobileBottomNav() {
  const pathname = usePathname();
  const toggleDrawer = useAdminMobileNav((s) => s.toggleDrawer);
  const isDrawerOpen = useAdminMobileNav((s) => s.isOpen);

  const isTabActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border-subtle z-40 md:hidden flex items-center justify-around px-2 font-sans select-none"
      aria-label="Navigasi Bawah Cepat"
    >
      {/* Tab 1: Pesanan */}
      <Link
        href="/admin"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
          isTabActive("/admin")
            ? "text-brand-accent font-bold"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <ShoppingBag size={18} />
        <span className="text-[10px] leading-none">Pesanan</span>
      </Link>

      {/* Tab 2: Workshop */}
      <Link
        href="/admin/production"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
          isTabActive("/admin/production")
            ? "text-brand-accent font-bold"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <Layers size={18} />
        <span className="text-[10px] leading-none">Workshop</span>
      </Link>

      {/* Tab 3: Gang Sheet */}
      <Link
        href="/admin/gang-sheet"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
          isTabActive("/admin/gang-sheet")
            ? "text-amber-500 font-bold"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <Printer size={18} />
        <span className="text-[10px] leading-none">Gang Sheet</span>
      </Link>

      {/* Tab 4: Chat */}
      <Link
        href="/admin/chat"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
          isTabActive("/admin/chat")
            ? "text-brand-accent font-bold"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <MessageSquare size={18} />
        <span className="text-[10px] leading-none">Chat</span>
      </Link>

      {/* Tab 5: Menu Drawer Button */}
      <button
        type="button"
        onClick={toggleDrawer}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
          isDrawerOpen ? "text-brand-accent font-bold" : "text-text-muted hover:text-text-primary"
        }`}
      >
        <Menu size={18} />
        <span className="text-[10px] leading-none">Menu</span>
      </button>
    </nav>
  );
}

/** ── 3. SLIDE-OVER DRAWER (PORTAL KE BODY, 100% BEBAS STACKING BUG) ── */
export function AdminMobileDrawer({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const isOpen = useAdminMobileNav((s) => s.isOpen);
  const closeDrawer = useAdminMobileNav((s) => s.closeDrawer);
  const [mounted, setMounted] = useState(false);
  const [askingLogout, setAskingLogout] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup drawer tiap route berganti
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  // Kunci scrolling body saat drawer terbuka
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, mounted]);

  const safeRole = (role || "").toUpperCase();
  const roleLabel = (safeRole || "STAFF").replace(/_/g, " ");
  const roleShort = (safeRole || "ADM").slice(0, 3);

  const canAccess = (item: NavItem) => {
    if (!item.roleLimit) return true;
    return item.roleLimit.includes(safeRole) || safeRole === "SUPER_ADMIN" || safeRole === "ADMIN";
  };

  const handleLogout = async () => {
    if (busy) return;
    setAskingLogout(false);
    setBusy(true);
    try {
      // P0.1 (23 Okt 2026): route /api/auth/pin-bypass DIHAPUS (keputusan owner).
      // Pembersihan cookie dev shim (kaos_dev_role / kaos_dev_user_id) kini dilakukan di sisi klien;
      // sesi resmi better-auth tetap via signOut().
      if (typeof document !== "undefined") {
        for (const devCookie of ["kaos_dev_role", "kaos_dev_user_id"]) {
          document.cookie = `${devCookie}=; Path=/; Max-Age=0; SameSite=Lax`;
        }
      }
      const { clearCachedSession } = await import("@/lib/auth-client");
      clearCachedSession();
      await signOut();
    } catch {
      // Fallback
    } finally {
      setBusy(false);
    }
    closeDrawer();
    window.location.replace("/");
  };

  const isTabActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex md:hidden animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi mobile"
    >
      {/* Backdrop Gelap Solid + Blur */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      {/* Drawer Panel Solid Opaque dari Sisi Kiri */}
      <div className="relative w-[85vw] max-w-xs h-full bg-[#18181b] text-zinc-100 border-r border-zinc-800 flex flex-col shadow-2xl z-10">
        {/* Header Drawer */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white-clean.png" alt="Kaos Kami" className="h-6 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-xs text-white block leading-none truncate">
                Kaos Kami
              </span>
              <span className="text-[10px] text-brand-accent font-semibold leading-none mt-1 block">
                Admin Workshop
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
            aria-label="Tutup menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sub-Header: Health Status Pill */}
        <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/30 shrink-0">
          <span className="font-medium">Status Operasional</span>
          <AdminHealthPill />
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Grup 1: Operasional Inti */}
          <div className="space-y-1">
            <span className="px-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Operasional Inti
            </span>
            <nav className="space-y-0.5">
              {PRIMARY_LINKS.filter(canAccess).map(({ href, label, icon: Icon }) => {
                const active = isTabActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                      active
                        ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/40 shadow-xs"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} className={active ? "text-brand-accent" : "text-zinc-400"} />
                      <span className="truncate">{label}</span>
                    </div>
                    <ChevronRight size={13} className="opacity-40" />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Grup 2: Modul & Inventaris */}
          <div className="space-y-1 pt-2 border-t border-zinc-800/80">
            <span className="px-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Modul & Pengaturan
            </span>
            <nav className="space-y-0.5">
              {MODULE_LINKS.filter(canAccess).map(({ href, label, icon: Icon }) => {
                const active = isTabActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                      active
                        ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/40 font-semibold shadow-xs"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className={active ? "text-brand-accent" : "text-zinc-400"} />
                      <span className="truncate text-xs">{label}</span>
                    </div>
                    <ChevronRight size={12} className="opacity-40" />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Grup 3: Pintasan Pratinjau */}
          <div className="space-y-1 pt-2 border-t border-zinc-800/80">
            <span className="px-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Pintasan Pratinjau
            </span>
            <div className="space-y-0.5">
              <a
                href="/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Studio 3D Mockup</span>
                </div>
                <ExternalLink size={12} className="opacity-60" />
              </a>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag size={14} className="text-emerald-400" />
                  <span>Halaman Toko Web</span>
                </div>
                <ExternalLink size={12} className="opacity-60" />
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Footer: User Profile & Logout */}
        <div className="p-3 border-t border-zinc-800 space-y-2 shrink-0 bg-zinc-900/60">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold text-xs shrink-0">
              {roleShort}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <span className="block text-white font-bold text-xs leading-none truncate">
                {roleLabel}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Sesi Aktif</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAskingLogout(true)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40 transition-all text-xs font-bold cursor-pointer"
          >
            <LogOut size={13} />
            <span>{busy ? "Mengakhiri sesi..." : "Keluar Panel Admin"}</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={askingLogout}
        title="Keluar dari Panel Admin?"
        message="Sesi operasional internal Anda akan diakhiri di perangkat ini."
        confirmLabel="Ya, Keluar"
        busy={busy}
        onConfirm={() => void handleLogout()}
        onCancel={() => setAskingLogout(false)}
      />
    </div>,
    document.body
  );
}
