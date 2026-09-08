"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * Bottom-sheet untuk CustomizerDrawer di <768px.
 * Snap peek/half/full via drag pointer beneran (audit #4 — sebelumnya cuma klik),
 * + semantik dialog, ESC untuk tutup, scroll-lock, dan handle 44px.
 */
export const BottomSheet: React.FC<{
  children: React.ReactNode;
  defaultSnap?: "peek" | "half" | "full";
  onClose?: () => void;
}> = ({ children, defaultSnap = "half", onClose }) => {
  const [snap, setSnap] = useState<"peek" | "half" | "full">(defaultSnap);
  const [dragY, setDragY] = useState<number | null>(null);
  const startY = useRef(0);
  const startSnap = useRef(snap);
  const sheetRef = useRef<HTMLDivElement>(null);

  const ORDER = ["peek", "half", "full"] as const;

  // ESC menutup + kunci scroll body saat sheet terbuka.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    startSnap.current = snap;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    setDragY(e.clientY - startY.current);
  };

  const onPointerUp = () => {
    if (dragY === null) return;
    const idx = ORDER.indexOf(startSnap.current);
    // Ambang 60px untuk pindah snap.
    const next =
      dragY < -60 ? ORDER[Math.min(2, idx + 1)]! : dragY > 60 ? ORDER[Math.max(0, idx - 1)]! : startSnap.current;
    setSnap(next);
    setDragY(null);
  };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label="Panel kustomisasi"
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#141416] border-t border-white/10 rounded-t-2xl transition-transform duration-300 ${
        snap === "peek" ? "translate-y-[70%]" : snap === "half" ? "translate-y-[30%]" : "translate-y-0"
      }`}
      style={{ maxHeight: "85vh", transform: dragY !== null ? `translateY(${Math.max(-40, Math.min(200, dragY))}px)` : undefined }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Geser untuk ubah ukuran panel (ketuk untuk penuh/separuh)"
        onClick={() => setSnap(snap === "full" ? "half" : "full")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSnap(snap === "full" ? "half" : "full");
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragY(null)}
        className="mx-auto my-1 flex items-center justify-center min-h-[44px] min-w-[44px] cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
      </div>
      <div className="overflow-y-auto max-h-[75vh] p-4">{children}</div>
    </div>
  );
};
