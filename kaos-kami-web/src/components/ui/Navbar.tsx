"use client";

import React from "react";
import Link from "next/link";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCartStore } from "@/store/useCartStore";
import { useShallow } from "zustand/shallow";
import { Sun, Moon, Menu, X, User as UserIcon, ShoppingBag, ShieldCheck, Smartphone, Bell } from "lucide-react";
import { AuthModal } from "@/components/ui/AuthModal";
import { CartDrawer } from "@/components/ui/CartDrawer";
import { UserNotificationBell } from "@/components/ui/UserNotificationBell";
import { useSession } from "@/lib/auth-client";
import { APK_DOWNLOAD_URL } from "@/lib/shop";

export const Navbar: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const isAdmin =
    ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(userRole) ||
    session?.user?.email === "hengkishadow@gmail.com" ||
    session?.user?.email === "admin@kaoskami.biz.id";
  // Badge reaktif: subscribe `items` langsung (hitung qty via reduce) agar
  // badge update tiap add/remove/updateQuantity. JANGAN subscribe getTotalCount
  // (referensi fungsi stabil → tak memicu render ulang saat isi berubah).
  const { cartCount, openCart } = useCartStore(
    useShallow((s) => ({
      cartCount: s.items.reduce((acc, item) => acc + (item.quantity || 0), 0),
      openCart: s.openCart,
    }))
  );

  // Catatan: `activePhase` SENGAJA tidak di-subscribe di Navbar — hanya dipakai
  // di Studio; subscribe di sini menyebabkan render ulang sia-sia tiap ganti fase.
  const {
    studioTheme,
    setStudioTheme,
    isHideWebsiteUI,
    toggleHideWebsiteUI,
  } = useConfiguratorStore(
    useShallow((s) => ({
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
    }))
  );

  const isLight = studioTheme === "gallery";

  return (
    <>
      <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between pointer-events-auto backdrop-blur-xl border-b bg-canvas/80 border-border-subtle text-text-primary transition-all duration-500 ${
        isHideWebsiteUI ? "opacity-30 hover:opacity-100" : "opacity-100"
      }`}
    >
      {/* Left: Brand Logo */}
      <div className="flex items-center shrink-0">
        <Link
          href="/"
          className="hover:opacity-85 transition-opacity flex items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo adaptif tema via CSS; kedua img ada di SSR sehingga 0 hydration mismatch */}
          <img
            src="/brand/logo-white-clean.png"
            alt="Kaos Kami"
            className="h-8 sm:h-9 w-auto object-contain logo-dark-mode"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-black-clean.png"
            alt="Kaos Kami"
            className="h-8 sm:h-9 w-auto object-contain logo-light-mode"
          />
        </Link>
      </div>

      {/* Center: Perfectly Balanced Navigation Links (Spaced Out) */}
      <nav
        className="hidden md:flex items-center justify-center space-x-10 lg:space-x-12 text-xs font-mono absolute left-1/2 -translate-x-1/2 pointer-events-auto"
        aria-label="Navigasi utama"
      >
        <Link
          href="/"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-wider py-1"
        >
          HOME
        </Link>
        <Link
          href="/#etalase"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              const el = document.getElementById("etalase");
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: "smooth" });
              }
            }
          }}
          className="text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-wider py-1"
        >
          KATALOG
        </Link>
        <Link
          href="/#tentang-kami"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              const el = document.getElementById("tentang-kami");
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: "smooth" });
              }
            }
          }}
          className="text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-wider py-1"
        >
          ABOUT
        </Link>
        {session?.user && (
          <Link
            href="/dashboard/orders"
            className="text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-wider py-1"
          >
            PESANANKU
          </Link>
        )}
        <a
          href={APK_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          download="kaos-kami.apk"
          className="text-brand-accent hover:brightness-125 transition-all font-bold uppercase tracking-wider flex items-center gap-1.5 py-1"
          title="Download Aplikasi Android Kaos Kami (Capacitor APK)"
        >
          <Smartphone size={13} />
          <span>UNDUH APK</span>
        </a>
      </nav>

      {/* Right Control Bar (Clean, Minimal, Height-Unified h-10) */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Lonceng notifikasi interaktif user: HANYA bila login */}
        {session?.user && <UserNotificationBell />}

        {/* Shopping Cart Button (Unified w-10 h-10) */}
        <button
          onClick={openCart}
          className="relative w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all flex items-center justify-center shrink-0"
          title="Keranjang Belanja"
          aria-label="Keranjang Belanja"
        >
          <ShoppingBag size={16} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-brand-accent text-canvas text-[9px] font-mono font-bold flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>

        {/* Light / Dark Mode Quick Toggle (Unified w-10 h-10, sembunyi <380px) */}
        <button
          onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
          className="max-[379px]:hidden w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all flex items-center justify-center shrink-0"
          title={mounted ? (isLight ? "Mode Gelap (Obsidian)" : "Mode Terang (Gallery)") : "Ganti Tema"}
          aria-label="Toggle Light/Dark Mode"
          suppressHydrationWarning
        >
          {mounted ? (
            isLight ? <Moon size={16} className="text-neutral-800" /> : <Sun size={16} className="text-brand-accent" />
          ) : (
            <Sun size={16} className="text-brand-accent" />
          )}
        </button>

        {/* Admin Quick Jump Pill */}
        {isAdmin && (
          <Link
            href="/admin"
            className="group relative h-10 flex items-center gap-2 px-3.5 rounded-full font-mono text-xs font-bold border transition-all duration-200 active:scale-95 shadow-sm
              bg-white text-neutral-900 border-amber-500/70 hover:bg-amber-500 hover:text-black hover:border-amber-600 hover:shadow-[0_0_16px_rgba(245,158,11,0.35)]
              dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/50 dark:hover:bg-amber-500 dark:hover:text-black dark:hover:border-amber-400 dark:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            title="Buka Dashboard Admin & Workshop DTF"
          >
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-black/20 group-hover:text-black flex items-center justify-center transition-colors">
              <ShieldCheck size={13} className="stroke-[2.5]" />
            </div>
            <span className="font-extrabold tracking-tight">PANEL ADMIN</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-black tracking-wider transition-transform group-hover:scale-105">
              OPS
            </span>
          </Link>
        )}

        {/* User Account / Login Button (Unified h-10, Label LOGIN) */}
        <button
          onClick={() => setIsAuthOpen(true)}
          className={`h-10 flex items-center gap-2 px-4 rounded-full font-mono text-xs border transition-all ${
            session?.user
              ? "bg-surface border-brand-accent/40 text-brand-accent font-bold"
              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
          }`}
          title={session?.user ? `Akun: ${session.user.name}` : "Masuk / Daftar Akun"}
          aria-label="Akun Pengguna"
        >
          <UserIcon size={15} />
          <span className="hidden sm:inline font-bold uppercase tracking-wider">
            {session?.user ? session.user.name?.split(" ")[0] : "LOGIN"}
          </span>
        </button>

        {/* Mobile hamburger: nav desktop disembunyikan di HP */}
        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          className="md:hidden w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all flex items-center justify-center"
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Enter 3D Sandbox Dedicated Page (Unified h-10, Label KOSTUM) */}
        <Link
          href="/studio"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full font-mono text-xs uppercase tracking-wider bg-brand-accent text-canvas font-bold shadow-[0_0_16px_rgba(230,81,0,0.3)] hover:brightness-110 active:scale-95 transition-all shrink-0"
          aria-label="Buka Studio Kostum 3D"
        >
          <span>KOSTUM</span>
        </Link>
      </div>

      {/* Mobile dropdown menu */}
      {isMenuOpen && (
        <nav
          className="md:hidden absolute top-full left-0 right-0 bg-surface/95 backdrop-blur-xl border-b border-border-subtle px-4 py-3 flex flex-col gap-1 text-xs font-mono"
          aria-label="Menu mobile"
        >
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/30 font-bold uppercase tracking-wider transition-colors flex items-center justify-between mb-1"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} />
                PANEL ADMIN & WORKSHOP
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-mono font-bold">OPS</span>
            </Link>
          )}
          {[
            { href: "/", label: "HOME" },
            { href: "/#etalase", label: "KATALOG ETALASE" },
            { href: "/#tentang-kami", label: "ABOUT WORKSHOP" },
            ...(session?.user ? [{ href: "/dashboard/orders", label: "PESANANKU" }] : []),
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface/60 font-bold uppercase tracking-wider transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="kaos-kami.apk"
            onClick={() => setIsMenuOpen(false)}
            className="mt-1 px-3 py-2.5 rounded-xl text-brand-accent bg-brand-accent/10 border border-brand-accent/30 font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Smartphone size={14} />
            <span>UNDUH APK ANDROID</span>
          </a>
        </nav>
      )}
    </header>

    {/* Cart Drawer */}
    <CartDrawer />

    {/* Auth Dialog Modal */}
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
