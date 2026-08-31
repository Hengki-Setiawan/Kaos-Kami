"use client";

import React from "react";
import Link from "next/link";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Sparkles, Sun, Moon, Maximize2, Minimize2, User as UserIcon } from "lucide-react";
import { AuthModal } from "@/components/ui/AuthModal";
import { useSession } from "@/lib/auth-client";

export const Navbar: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const { data: session } = useSession();

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
      {/* Brand Wordmark */}
      <div className="flex items-center space-x-3">
        <Link
          href="/"
          className="font-display font-black text-xl sm:text-2xl tracking-tighter uppercase hover:opacity-80 transition-opacity text-left"
        >
          kaos kami<span className="text-brand-accent">.</span>
        </Link>
        <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-surface border border-border-subtle text-text-muted">
          3D STUDIO v3.0
        </span>
      </div>

      {/* Center Active Phase Callout (Hidden in Clean Mockup View) */}
      {!isHideWebsiteUI && (
        <div className="hidden lg:flex items-center space-x-2 font-mono text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          <span className="tracking-widest uppercase">
            {`STORY // PHASE 0${activePhase}`}
          </span>
        </div>
      )}

      {/* Right Control Bar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Light / Dark Mode Quick Toggle */}
        <button
          onClick={() => setStudioTheme(isLight ? "obsidian" : "gallery")}
          className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
          title={isLight ? "Switch to Obsidian Dark Mode" : "Switch to Gallery Light Mode"}
          aria-label="Toggle Light/Dark Studio Mode"
        >
          {isLight ? <Moon size={14} className="text-neutral-800" /> : <Sun size={14} className="text-brand-accent" />}
        </button>

        {/* User Account / Login Button */}
        <button
          onClick={() => setIsAuthOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs border transition-all ${
            session?.user
              ? "bg-surface border-brand-accent/40 text-brand-accent font-bold"
              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
          }`}
          title={session?.user ? `Akun: ${session.user.name}` : "Masuk / Daftar Akun"}
          aria-label="Akun Pengguna"
        >
          <UserIcon size={13} />
          <span className="hidden sm:inline">{session?.user ? session.user.name?.split(" ")[0] : "MASUK"}</span>
        </button>

        {/* Clean Mockup Fullscreen View Toggle */}
        <button
          onClick={toggleHideWebsiteUI}
          className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-mono text-xs uppercase border transition-all ${
            isHideWebsiteUI
              ? "bg-brand-accent text-canvas border-brand-accent font-bold"
              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
          }`}
          title="Toggle Clean Mockup View"
        >
          {isHideWebsiteUI ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span className="text-[11px]">{isHideWebsiteUI ? "EXIT CLEAN" : "CLEAN VIEW"}</span>
        </button>

        {/* Enter 3D Sandbox Dedicated Page */}
        <Link
          href="/studio"
          className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider bg-brand-accent text-canvas font-bold shadow-[0_0_16px_rgba(230,81,0,0.4)] hover:brightness-110 active:scale-95 transition-all"
          aria-label="Enter 3D Studio"
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">ENTER 3D SANDBOX</span>
          <span className="sm:hidden">SANDBOX</span>
        </Link>
      </div>

      {/* Auth Dialog Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
};
