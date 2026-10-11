"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

export function AnnouncementTicker() {
  const [announcement, setAnnouncement] = useState<{ text: string; active: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/shop/announcement");
        const data = await res.json().catch(() => null);
        if (alive && res.ok && data?.active && data?.text) {
          setAnnouncement(data);
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!announcement || !announcement.active || dismissed) {
    return null;
  }

  return (
    <div className="bg-brand-accent text-canvas py-1.5 px-4 font-sans text-[11px] font-semibold tracking-wide flex items-center justify-between z-[60] relative overflow-hidden border-b border-brand-accent/20">
      <div className="flex items-center gap-2 max-w-full overflow-hidden mx-auto">
        <Megaphone size={13} className="shrink-0" />
        <span className="truncate">{announcement.text}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup pengumuman"
        className="text-canvas/80 hover:text-canvas p-0.5 rounded transition shrink-0 ml-2"
      >
        <X size={13} />
      </button>
    </div>
  );
}
