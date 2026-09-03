"use client";

import React from "react";
import Link from "next/link";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCartStore } from "@/store/useCartStore";
import { Sparkles, Sun, Moon, Maximize2, Minimize2, User as UserIcon, ShoppingBag } from "lucide-react";
import { AuthModal } from "@/components/ui/AuthModal";
import { CartDrawer } from "@/components/ui/CartDrawer";
import { useSession } from "@/lib/auth-client";

export const Navbar: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const { data: session } = useSession();
  const { getTotalCount, openCart } = useCartStore();
  const cartCount = getTotalCount();

  const {
    studioTheme,
    setStudioTheme,
    isHideWebsiteUI,
    toggleHideWebsiteUI,
    activePhase,
  } = useConfiguratorStore();

  const isLight = studioTheme === "gallery";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between pointer-events-auto backdrop-blur-xl border-b transition-all duration-500 ${
        isLight
          ? "bg-[#F5F4F0]/80 border-black/10 text-neutral-900"
          : "bg-[#121214]/80 border-border-subtle text-text-primary"
      } ${isHideWebsiteUI ? "opacity-30 hover:opacity-100" : "opacity-100"}`}
    >
      {/* Brand Wordmark & Nav Links */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="hover:opacity-85 transition-opacity flex items-center shrink-0"
          >
            <img
              src={isLight ? "/brand/logo-black-clean.png" : "/brand/logo-white-clean.png"}
              alt="Kaos Kami"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* E-Commerce Navigation Links */}
        <nav className="hidden md:flex items-center space-x-5 text-xs font-mono">
          <Link
            href="/catalog"
            className="text-text-muted hover:text-white transition-colors font-bold uppercase tracking-wider"
          >
            KATALOG PRODUK
          </Link>
          <Link
            href="/studio"
            className="text-text-muted hover:text-white transition-colors font-bold uppercase tracking-wider"
          >
            STUDIO 3D
          </Link>
        </nav>
      </div>

      {/* Right Control Bar (Clean, Minimal, Non-Cluttered) */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Shopping Cart Button */}
        <button
          onClick={openCart}
          className="relative p-2.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all flex items-center justify-center"
          title="Keranjang Belanja"
          aria-label="Keranjang Belanja"
        >
          <ShoppingBag size={16} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-accent text-canvas text-[9px] font-mono font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* Light / Dark Mode Quick Toggle */}
        <button
          onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
          className="p-2.5 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
          title={isLight ? "Mode Gelap (Obsidian)" : "Mode Terang (Gallery)"}
          aria-label="Toggle Light/Dark Mode"
        >
          {isLight ? <Moon size={15} className="text-neutral-800" /> : <Sun size={15} className="text-brand-accent" />}
        </button>

        {/* User Account / Login Button */}
        <button
          onClick={() => setIsAuthOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-mono text-xs border transition-all ${
            session?.user
              ? "bg-surface border-brand-accent/40 text-brand-accent font-bold"
              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
          }`}
          title={session?.user ? `Akun: ${session.user.name}` : "Masuk / Daftar Akun"}
          aria-label="Akun Pengguna"
        >
          <UserIcon size={14} />
          <span className="hidden sm:inline font-bold">{session?.user ? session.user.name?.split(" ")[0] : "MASUK"}</span>
        </button>

        {/* Enter 3D Sandbox Dedicated Page (Clean CTA, No Sparkles) */}
        <Link
          href="/studio"
          className="px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider bg-brand-accent text-canvas font-bold shadow-[0_0_16px_rgba(230,81,0,0.3)] hover:brightness-110 active:scale-95 transition-all"
          aria-label="Enter 3D Studio"
        >
          <span className="hidden sm:inline">CUSTOM 3D</span>
          <span className="sm:hidden">3D</span>
        </Link>
      </div>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Auth Dialog Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
};
