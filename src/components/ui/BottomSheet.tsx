"use client";
import React, { useState } from "react";

/**
 * vaul-inspired bottom-sheet for CustomizerDrawer on <768px
 * Peek / half / full states via CSS transform + pointer drag
 */
export const BottomSheet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#141416] border-t border-white/10 rounded-t-2xl transition-transform duration-300 ${
        snap === "peek" ? "translate-y-[70%]" : snap === "half" ? "translate-y-[30%]" : "translate-y-0"
      }`}
      style={{ maxHeight: "85vh" }}
    >
      <div
        className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 cursor-pointer"
        onClick={() => setSnap(snap === "full" ? "half" : "full")}
      />
      <div className="overflow-y-auto max-h-[75vh] p-4">{children}</div>
    </div>
  );
};
