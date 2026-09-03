import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  Package,
  Sparkles,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  User,
  ShoppingBag,
} from "lucide-react";

export const revalidate = 0;

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  // PII hardened: session-based scoping — PRODUCTION_STAFF/ADMIN see all, CUSTOMER see own only
  let sessionUserId: string | null = null;
  let sessionRole: string | null = null;
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    sessionUserId = (session?.user as any)?.id || null;
    sessionRole = (session?.user as any)?.role || null;
  } catch {}
  const canSeeAll = sessionRole === "ADMIN" || sessionRole === "SUPER_ADMIN" || sessionRole === "PRODUCTION_STAFF";
  const orderWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;
  const designWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;

  const [recentOrders, savedDesigns] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.design.findMany({
      where: designWhere,
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 sm:py-16 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-display font-black text-xl">
              <User size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                PORTAL AKUN PELANGGAN
              </h1>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                Pantau status pesanan sablon DTF dan kelola mockup desain 3D Anda.
              </p>
            </div>
          </div>

          <Link
            href="/studio"
            className="py-2.5 px-4 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(230,81,0,0.3)] w-fit"
          >
            <span>BUAT KUSTOM BARU</span>
          </Link>
        </div>

        {/* Section 1: Active Orders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Package size={14} className="text-brand-accent" />
              <span>PESANAN ANDA TERAKHIR</span>
            </h2>
          </div>

          <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 font-mono text-xs shadow-xl">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{order.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-text-muted text-[11px]">
                      {order.items.length} item sablon · {order.deliveryMethod} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <span className="font-bold text-brand-accent text-sm">
                      Rp {order.totalIdr.toLocaleString("id-ID")}
                    </span>

                    <Link
                      href={`/orders/${order.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold hover:text-brand-accent transition-all flex items-center gap-1 text-[11px]"
                    >
                      <span>INVOICE</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted">
                Belum ada pesanan aktif. Mulai desain kaos kustom Anda di 3D Studio!
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Saved 3D Designs Gallery */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Layers size={14} className="text-brand-accent" />
              <span>DESAIN 3D TERSIMPAN ({savedDesigns.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedDesigns.length > 0 ? (
              savedDesigns.map((design) => (
                <div
                  key={design.id}
                  className="p-4 rounded-2xl bg-[#141416] border border-white/5 space-y-3 font-mono text-xs hover:border-white/20 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: design.colorHex }}
                      />
                      <span className="font-bold text-white truncate max-w-[150px]">
                        {design.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted uppercase">
                      {design.category.slug}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface/50 border border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Estimasi Harga:</span>
                    <span className="font-bold text-brand-accent">
                      Rp {design.calculatedPriceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <Link
                    href="/studio"
                    className="w-full py-2 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold text-center block transition-all hover:text-brand-accent text-[11px]"
                  >
                    BUKA DI 3D STUDIO
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-text-muted bg-[#141416] border border-white/5 rounded-2xl">
                Belum ada desain tersimpan. Anda dapat menyimpan kreasi langsung dari 3D Studio.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
