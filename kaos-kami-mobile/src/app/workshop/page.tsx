"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileWorkshopPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-dvh bg-[#0E0E10] text-zinc-400 text-xs font-mono">
      Mengarahkan ke Beranda Kaos Kami...
    </div>
  );
}
