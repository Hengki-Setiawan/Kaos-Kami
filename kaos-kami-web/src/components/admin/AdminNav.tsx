"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
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
import { useState, useEffect } from "react";

export type PillarId = "all" | "production" | "delivery" | "admin";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  pillar: "production" | "delivery" | "admin";
}

const SECTIONS = [
  {
    id: "core" as const,
    title: "5 Modul Utama",
    pillar: "admin" as const,
  },
];

const LINKS: NavLink[] = [
  // 5 MODUL UTAMA (BAB 38 & BAB 47 SSOT) — satu-satunya isi sidebar.
  // 8 sub-modul (orders, gang-sheet, shipping, catalog, coupons, laporan,
  // cms, customers) TIDAK ada di sidebar; akses via /admin/settings (kartu link).
  {
    href: "/admin",
    label: "Pesanan & Analitik",
    Icon: LayoutDashboard,
    pillar: "admin",
  },
  {
    href: "/admin/production",
    label: "Workshop Sablon DTF",
    Icon: Layers,
    pillar: "production",
  },
  {
    href: "/admin/deliveries",
    label: "Hub Pengiriman & Kurir",
    Icon: Truck,
    pillar: "delivery",
  },
  {
    href: "/admin/chat",
    label: "Live Chat CS (Kamito)",
    Icon: MessageSquare,
    pillar: "admin",
  },
  {
    href: "/admin/settings",
    label: "Pengaturan Toko & CMS",
    Icon: Settings,
    pillar: "admin",
  },
];

/**
 * Sidebar Admin (Bab 38/47 SSOT):
 * - HANYA 5 modul utama, tanpa seksi/collapsible sub-modul
 * - 8 sub-modul diakses via /admin/settings (kartu link)
 * - Tipografi sans-serif proporsional (Sentence Case, anti-lelah membaca)
 * - Filter pilar cepat (Semua / Produksi / Kurir / Toko)
 * - 0 Emoticon, 100% Lucide Icons profesional
 */
export function AdminNav({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [askingLogout, setAskingLogout] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<PillarId>("all");
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // Reset status navigasi ketika halaman baru sudah aktif
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  // Shortcut pilar 1/2/3/4 + Esc (UI-only, tanpa ubah API/DB).
  // Guard: abaikan saat mengetik di input/textarea/select/contentEditable
  // dan saat palet perintah (role=dialog) terbuka agar tak rebut ketikan.
  useEffect(() => {
    const onPillarKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = (t.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const map: Record<string, PillarId> = {
        "1": "all",
        "2": "production",
        "3": "delivery",
        "4": "admin",
      };
      if (e.key === "Escape") {
        setSelectedPillar("all");
        return;
      }
      const next = map[e.key];
      if (next) setSelectedPillar(next);
    };
    document.addEventListener("keydown", onPillarKey);
    return () => document.removeEventListener("keydown", onPillarKey);
  }, []);

  const safeRole = (role || "").toUpperCase();
  const isSuperOrAdmin = safeRole === "ADMIN" || safeRole === "SUPER_ADMIN";
  const isProdStaff = safeRole === "PRODUCTION_STAFF";
  const isCourier = safeRole === "COURIER";

  // Filter RBAC ketat
  const allowedLinks = LINKS.filter((l) => {
    if (isProdStaff) return l.pillar === "production";
    if (isCourier) return l.pillar === "delivery";
    if (selectedPillar !== "all") return l.pillar === selectedPillar;
    return true;
  });

  const roleShort = (safeRole || "?").slice(0, 3);
  const roleLabel = (safeRole || "STAFF").replace(/_/g, " ");

  const logout = async () => {
    if (busy) return;
    setAskingLogout(false);
    setBusy(true);
    try {
      await signOut();
    } catch {
      // Fallback redirect client
    } finally {
      setBusy(false);
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-col justify-between h-full font-sans text-[13px]">
      <div className="p-3 md:px-2 xl:p-3 space-y-3">
        {/* Palet perintah Ctrl+K — mode rail (≤1280px): tombol ikon saja via CSS */}
        <div
          className="md:[&_button]:justify-center xl:[&_button]:justify-start md:[&_span]:hidden xl:[&_span]:inline md:[&_kbd]:hidden"
          title="Cari menu / no. order (Ctrl+K)"
        >
          <AdminCommandBar role={role} />
        </div>

        {/* Banner Khusus Peran Non-Superadmin */}
        {isProdStaff && (
          <div
            className="px-3 md:px-0 xl:px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 md:flex md:justify-center xl:block"
            title="Divisi Produksi Sablon DTF — Meja cetak DTF & heat press workshop."
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <Layers size={14} />
              <span className="hidden xl:inline">Divisi Produksi Sablon DTF</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 hidden xl:block">Meja cetak DTF & heat press workshop.</p>
          </div>
        )}

        {isCourier && (
          <div
            className="px-3 md:px-0 xl:px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 md:flex md:justify-center xl:block"
            title="Divisi Pengiriman & Kurir — Antar lokal Makassar & resi nasional."
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <Truck size={14} />
              <span className="hidden xl:inline">Divisi Pengiriman & Kurir</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 hidden xl:block">Antar lokal Makassar & resi nasional.</p>
          </div>
        )}

        {/* Tab Filter Pilar untuk Admin/Super Admin */}
        {isSuperOrAdmin && (
          <div className="space-y-1 hidden xl:block">
            <div className="flex items-center justify-between px-1 text-[11px] text-text-muted font-medium">
              <span>Filter Fokus</span>
              <span className="text-[10px] text-text-muted/60" title="Shortcut: 1 Semua · 2 Produksi · 3 Kurir · 4 Toko · Esc reset">{allowedLinks.length} Menu · 1/2/3/4</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-border-subtle text-xs">
              {[
                { id: "all", label: "Semua", key: "1" },
                { id: "production", label: "Produksi", key: "2" },
                { id: "delivery", label: "Kurir", key: "3" },
                { id: "admin", label: "Toko", key: "4" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPillar(p.id as PillarId)}
                  title={`Pilar ${p.label} (shortcut ${p.key}, Esc reset)`}
                  className={`py-1 px-1 rounded-md transition-all text-center text-xs font-medium ${
                    selectedPillar === p.id
                      ? "bg-surface text-text-primary shadow-xs font-semibold border border-border-subtle"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daftar Navigasi: HANYA 5 modul utama, tanpa seksi sub-modul */}
        <nav className="space-y-3 pt-1">
          <div className="space-y-0.5">
            {isSuperOrAdmin && selectedPillar === "all" && (
              <div className="hidden xl:block px-2.5 pt-2 pb-1 text-[10px] font-semibold text-text-muted/70 uppercase tracking-wider">
                {SECTIONS[0]?.title ?? "5 Modul Utama"}
              </div>
            )}
            {allowedLinks.map(({ href, label, Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              const isNavigating = navigatingTo === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  onClick={() => {
                    if (pathname !== href) {
                      setNavigatingTo(href);
                    }
                  }}
                  aria-current={active ? "page" : undefined}
                  title={label}
                  className={`flex items-center md:justify-center xl:justify-between px-2.5 md:px-0 xl:px-2.5 py-1.5 rounded-lg transition-all text-[13px] ${
                    active
                      ? "bg-brand-accent/10 text-brand-accent font-semibold border-l-2 border-brand-accent"
                      : "text-text-muted hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center md:space-x-0 xl:space-x-2.5 space-x-2.5 min-w-0">
                    <Icon size={15} className={active ? "text-brand-accent" : "text-text-muted shrink-0"} />
                    <span className="truncate hidden xl:inline">{label}</span>
                  </div>
                  {isNavigating && (
                    <div className="hidden xl:block w-3 h-3 rounded-full border-2 border-brand-accent border-t-transparent animate-spin shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Akses Cepat Eksternal */}
          <div className="pt-2 border-t border-border-subtle">
            <span className="hidden xl:block text-[10px] font-semibold text-text-muted/70 uppercase tracking-wider px-2.5 pb-1">
              Pratinjau Eksternal
            </span>
            {[
              { href: "/studio", label: "Studio 3D Mockup", icon: Sparkles },
              { href: "/", label: "Halaman Depan Toko", icon: ExternalLink },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="flex items-center md:justify-center xl:justify-between px-2.5 md:px-0 xl:px-2.5 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all text-xs"
              >
                <span className="hidden xl:inline">{label}</span>
                <Icon size={12} className="opacity-70" />
              </a>
            ))}
          </div>
        </nav>
      </div>

      {/* Profil Pengguna & Keluar Panel */}
      <div className="p-3 md:px-2 xl:p-3 border-t border-border-subtle space-y-2">
        <div className="flex items-center md:justify-center xl:justify-start md:space-x-0 xl:space-x-2.5 space-x-2.5 px-1" title={roleLabel}>
          <div className="w-8 h-8 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-semibold text-xs shrink-0">
            {roleShort}
          </div>
          <div className="overflow-hidden min-w-0 flex-1 hidden xl:block">
            <span className="block text-text-primary font-medium text-xs truncate">{roleLabel}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Online / Aktif</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => setAskingLogout(true)}
          disabled={busy}
          title="Keluar Panel"
          className="w-full flex items-center justify-center gap-2 px-3 md:px-0 xl:px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border-subtle text-text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all text-xs font-medium disabled:opacity-50"
        >
          <LogOut size={13} />
          <span className="hidden xl:inline">{busy ? "Memproses Keluar..." : "Keluar Panel"}</span>
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
