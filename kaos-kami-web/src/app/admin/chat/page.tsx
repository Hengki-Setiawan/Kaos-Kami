import React from "react";
import { AdminChatManager } from "@/components/admin/AdminChatManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Chat Kamito & Pelanggan | Admin Kaos Kami",
  robots: { index: false, follow: false },
};

export default function AdminChatPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
              PUSAT LIVE CHAT KAMITO
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
              REALTIME
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Komunikasi langsung dengan pelanggan studio sablon DTF dan pemesan produk Kaos Kami Makassar.
          </p>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <AdminChatManager />
    </div>
  );
}
