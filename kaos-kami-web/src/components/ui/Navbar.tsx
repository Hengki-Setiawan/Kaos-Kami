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
import { Z_CLASS_NAV } from "@/lib/zIndex";

export const Navbar: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleOpenAuth = () => setIsAuthOpen(true);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuth);
  }, []);

  // Scroll-aware: bg solid setelah scrollY > 20 (struktur header dipertahankan).
  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    adminViewMode,
    setAdminViewMode,
  } = useConfiguratorStore(
    useShallow((s) => ({
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
      adminViewMode: s.adminViewMode,
      setAdminViewMode: s.setAdminViewMode,
    }))
  );

  const isLight = studioTheme === "gallery";

  // 5x Klik Logo untuk memicu Secret PIN Bypass Modal (Super Admin & User)
  const logoClickRef = React.useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - logoClickRef.current.lastTime > 2500) {
      logoClickRef.current = { count: 1, lastTime: now };
    } else {
      logoClickRef.current.count += 1;
      logoClickRef.current.lastTime = now;
    }

    if (logoClickRef.current.count >= 5) {
      e.preventDefault();
      e.stopPropagation();
      logoClickRef.current = { count: 0, lastTime: 0 };
      window.dispatchEvent(new CustomEvent("open-secret-pin-modal"));
    }
  };

  return (
    <>
      <header
      className={`fixed top-0 left-0 right-0 ${Z_CLASS_NAV} px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between pointer-events-auto backdrop-blur-xl border-b ${isScrolled ? "bg-canvas border-border-strong shadow-sm" : "bg-canvas/80 border-border-subtle"} text-text-primary transition-all duration-500 ${
        isHideWebsiteUI ? "opacity-30 hover:opacity-100" : "opacity-100"
      }`}
    >
      {/* Left: Brand Logo & Navigation Links (Left-Aligned to prevent any overlap) */}
      <div className="flex items-center gap-6 xl:gap-8 shrink-0">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="hover:opacity-85 transition-opacity flex items-center shrink-0 cursor-pointer select-none"
          title="Kaos Kami Studio"
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

        {/* Navigation Links (Clean Left Flow - English) */}
        <nav
          className="hidden lg:flex items-center space-x-6 text-sm font-sans"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="text-text-muted hover:text-text-primary transition-colors font-medium py-1 nav-sliding-underline"
          >
            Home
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
            className="text-text-muted hover:text-text-primary transition-colors font-medium py-1 nav-sliding-underline"
          >
            Catalog
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
            className="text-text-muted hover:text-text-primary transition-colors font-medium py-1 nav-sliding-underline"
          >
            About Us
          </Link>
          {mounted && session?.user && (
            <Link
              href="/dashboard/orders"
              className="text-text-muted hover:text-text-primary transition-colors font-medium py-1 nav-sliding-underline"
            >
              My Orders
            </Link>
          )}
        </nav>
      </div>

      {/* Right Control Bar (Clean, Minimal, Height-Unified h-10) */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Lonceng notifikasi interaktif user: HANYA bila login */}
        {mounted && session?.user && <UserNotificationBell />}

        {/* Shopping Cart Button: HANYA bila sudah login */}
        {mounted && session?.user && (
          <button
            onClick={openCart}
            className="relative w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all flex items-center justify-center shrink-0"
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-brand-accent text-canvas text-[9px] font-mono font-bold flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        )}

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

        {/* Admin Quick Jump Pill / Mode Pelanggan Switcher */}
        {mounted && isAdmin && (
          adminViewMode === "admin" ? (
            <Link
              href="/admin"
              className="group relative h-10 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 rounded-full font-sans text-sm font-medium border transition-all duration-200 active:scale-95 shadow-sm
                bg-white text-neutral-900 border-amber-500/70 hover:bg-amber-500 hover:text-black hover:border-amber-600 hover:shadow-[0_0_16px_rgba(245,158,11,0.35)]
                dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/50 dark:hover:bg-amber-500 dark:hover:text-black dark:hover:border-amber-400 dark:shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0"
              title="Buka Dashboard Admin & Workshop DTF"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-black/20 group-hover:text-black flex items-center justify-center transition-colors">
                <ShieldCheck size={13} className="stroke-[2.5]" />
              </div>
              <span className="hidden xl:inline font-extrabold tracking-tight">PANEL ADMIN</span>
              <span className="xl:hidden font-extrabold tracking-tight">ADMIN</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-black tracking-wider transition-transform group-hover:scale-105">
                OPS
              </span>
            </Link>
          ) : (
            <button
              onClick={() => setAdminViewMode("admin")}
              className="group relative h-10 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-full font-sans text-sm font-medium border transition-all duration-200 active:scale-95 shadow-sm
                bg-emerald-500/15 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 shrink-0"
              title="Sedang dalam mode pratinjau pembeli. Klik untuk kembali ke Mode Admin."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xl:inline font-extrabold tracking-tight">MODE PELANGGAN</span>
              <span className="xl:hidden font-extrabold tracking-tight">PELANGGAN</span>
            </button>
          )
        )}

        {/* User Account / Login Button (Unified h-10, Label LOGIN) */}
        <button
          onClick={() => setIsAuthOpen(true)}
          className={`h-10 flex items-center gap-2 px-4 rounded-full font-sans text-sm border transition-all ${
            mounted && session?.user
              ? "bg-surface border-brand-accent/40 text-brand-accent font-bold"
              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
          }`}
          title={mounted && session?.user ? `Akun: ${session.user.name}` : "Masuk / Daftar Akun"}
          aria-label="Akun Pengguna"
        >
          <UserIcon size={15} />
          <span className="hidden sm:inline font-medium normal-case tracking-normal">
            {mounted && session?.user ? session.user.name?.split(" ")[0] : "LOGIN"}
          </span>
        </button>

        {/* Tablet / Mobile hamburger */}
        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          className="lg:hidden w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all flex items-center justify-center"
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Enter 3D Sandbox Dedicated Page (English: Create 3D) */}
        <Link
          href="/studio"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full font-sans text-sm font-medium bg-brand-accent text-canvas shadow-[0_0_16px_rgba(230,81,0,0.3)] hover:brightness-110 active:scale-95 transition-all shrink-0"
          aria-label="Open 3D Studio"
        >
          <span>Create 3D</span>
        </Link>
      </div>

      {/* Mobile / Tablet dropdown menu */}
      {isMenuOpen && (
        <nav
          className="lg:hidden absolute top-full left-0 right-0 bg-surface/95 backdrop-blur-xl border-b border-border-subtle px-4 py-3 flex flex-col gap-1 font-sans text-sm"
          aria-label="Mobile navigation"
        >
          {mounted && isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/30 font-sans font-medium text-sm normal-case tracking-normal transition-colors flex items-center justify-between mb-1"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} />
                Admin Panel & Workshop
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-sans font-bold">OPS</span>
            </Link>
          )}
          {[
            { href: "/", label: "Home" },
            { href: "/#etalase", label: "Catalog" },
            { href: "/#tentang-kami", label: "About Us" },
            ...(mounted && session?.user ? [{ href: "/dashboard/orders", label: "My Orders" }] : []),
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setIsMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface/60 font-medium text-sm transition-colors"
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
            className="mt-1 px-3 py-2.5 rounded-xl text-brand-accent bg-brand-accent/10 border border-brand-accent/30 font-sans font-medium text-sm normal-case tracking-normal transition-all flex items-center gap-2"
          >
            <Smartphone size={14} />
            <span>Download Android App</span>
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
