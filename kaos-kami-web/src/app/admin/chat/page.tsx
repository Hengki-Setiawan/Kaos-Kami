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
            <h1 className="font-sans font-bold text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
              Pusat Live Chat Kamito
            </h1>
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
