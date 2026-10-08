"use client";

import React, { useRef } from "react";
import Link from "next/link";

export function AdminLogoClickable() {
  const logoClickRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

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
    <Link href="/admin" onClick={handleLogoClick} prefetch={false} className="flex items-center gap-2.5 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-white-clean.png" alt="Kaos Kami" className="h-6 w-auto object-contain logo-dark-mode shrink-0" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-black-clean.png" alt="Kaos Kami" className="h-6 w-auto object-contain logo-light-mode shrink-0" />
      <div className="hidden xl:flex flex-col min-w-0">
        <span className="font-sans font-bold text-xs tracking-tight text-text-primary leading-tight truncate">
          Kaos Kami
        </span>
        <span className="text-[10px] text-text-muted font-medium leading-none">
          Admin Workshop
        </span>
      </div>
    </Link>
  );
}
