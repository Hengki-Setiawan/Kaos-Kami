"use client";

import Link from "next/link";

export function AdminLogoClickable() {
  // P0.1 (23 Okt 2026): dispatcher 5-klik logo → modal PIN rahasia DIHAPUS permanen
  // (keputusan owner: route /api/auth/pin-bypass dihapus; logo admin berfungsi normal).

  return (
    <Link href="/admin" prefetch={false} className="flex items-center gap-2.5 min-w-0">
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
