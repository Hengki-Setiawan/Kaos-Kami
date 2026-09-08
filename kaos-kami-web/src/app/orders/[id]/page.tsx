import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SHOP_WORKSHOP_ADDRESS } from "@/lib/shop";
import { RepayButton } from "@/components/commerce/RepayButton";
import { CancelOrderButton } from "@/components/commerce/CancelOrderButton";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MessageCircle,
  ArrowLeft,
  Calendar,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

interface OrderReceiptPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrderReceiptPage({ params, searchParams }: OrderReceiptPageProps) {
  // Next 15: params & searchParams async.
  const { id } = await params;
  const sp = await searchParams;
  // Anti-IDOR: invoice publik via link WA, tapi PII dimask untuk non-pemilik.
  let sessionUserId: string | null = null;
  let sessionRole: string | null = null;
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    sessionUserId = (session?.user as any)?.id || null;
    sessionRole = (session?.user as any)?.role || null;
  } catch {}
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      items: true,
      user: true,
      shippingAddress: true,
      payment: true,
      statusHistory: {
        orderBy: (t, { asc }) => asc(t.createdAt),
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isPrivileged =
    sessionRole === "ADMIN" || sessionRole === "SUPER_ADMIN" || sessionRole === "PRODUCTION_STAFF";
  const isOwner = !!sessionUserId && order.userId === sessionUserId;
  const canSeePII = isOwner || isPrivileged;
  const maskPhone = (p?: string | null) =>
    !p ? "-" : canSeePII ? p : `${p.slice(0, 4)}****${p.slice(-2)}`;
  const maskEmail = (e?: string | null) => {
    if (!e) return "-";
    if (canSeePII) return e;
    const [u, d] = e.split("@");
    return `${(u || "").slice(0, 2)}***@${d || "***"}`;
  };

  const isSuccess =
    sp.status === "success" ||
    order.status === "PAYMENT_CONFIRMED" ||
    order.status === "IN_PRODUCTION_QUEUE";

  // WhatsApp manual fallback link
  const waMessage = encodeURIComponent(
    `*Halo Kaos Kami Makassar, saya ingin konfirmasi pesanan saya:*\n` +
      `No. Pesanan: ${order.orderNumber}\n` +
      `Total: Rp ${order.totalIdr.toLocaleString("id-ID")}\n` +
      `Status: ${order.status}\n\n` +
      `Mohon dibantu proses antrean sablonnya. Terima kasih!`
  );
  const waLink = `https://wa.me/6281244002026?text=${waMessage}`;

  // Link bayar hilang/kedaluarsa → minta baru via WA (tanpa risiko tagih ganda).
  const waPayMessage = encodeURIComponent(
    `*Halo Kaos Kami, link bayar saya hilang:*\n` +
      `No. Pesanan: ${order.orderNumber}\n` +
      `Total: Rp ${order.totalIdr.toLocaleString("id-ID")}\n\n` +
      `Mohon kirim ulang link pembayarannya. Terima kasih!`
  );
  const waPayLink = `https://wa.me/6281244002026?text=${waPayMessage}`;
  const needsPayLink = order.status === "PENDING_PAYMENT";

  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-12 sm:py-20 max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-mono text-xs text-text-muted hover:text-brand-accent transition-colors"
      >
        <ArrowLeft size={14} />
        <span>KEMBALI KE BERANDA</span>
      </Link>

      {/* Main Receipt Card */}
      <div className="bg-[#151518] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Status Header Banner */}
        <div className="text-center space-y-2 pb-6 border-b border-white/5">
          <div className="w-16 h-16 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center mx-auto mb-3">
            {isSuccess ? <CheckCircle2 size={32} /> : <Clock size={32} />}
          </div>
          <span className="inline-block px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
            {order.status}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            {isSuccess ? "PESANAN BERHASIL DITERIMA" : "INVOICE PESANAN"}
          </h1>
          <p className="font-mono text-xs text-text-muted">
            Nomor Pesanan: <span className="text-white font-bold">{order.orderNumber}</span>
          </p>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-surface/50 border border-white/5 space-y-1.5">
            <span className="block text-[11px] text-text-muted uppercase">Penerima & Kontak</span>
            <p className="font-bold text-white text-sm">{order.shippingAddress?.recipientName || order.user.name}</p>
            <p className="text-text-muted">{maskPhone(order.user.phoneNumber || order.shippingAddress?.phoneNumber)}</p>
            <p className="text-text-muted truncate">{maskEmail(order.user.email)}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface/50 border border-white/5 space-y-1.5">
            <span className="block text-[11px] text-text-muted uppercase">Pengiriman Makassar</span>
            <p className="font-bold text-brand-accent text-sm">{order.deliveryMethod}</p>
            {order.deliveryMethod === "PICKUP" ? (
              <>
                <p className="text-white text-[11px]">Ambil di: {SHOP_WORKSHOP_ADDRESS}</p>
                <p className="text-text-muted text-[10px]">Tunjukkan nomor pesanan saat pengambilan.</p>
              </>
            ) : (
              <p className="text-text-muted text-[11px]">
                {canSeePII ? order.shippingAddress?.fullAddress : "Alamat disembunyikan untuk privasi pemilik"}
              </p>
            )}
            {order.courierNotes && <p className="text-amber-400 text-[10px]">Catatan: {order.courierNotes}</p>}
            {order.trackingNumber && (
              <p className="text-emerald-400 text-[11px]">
                No. Resi: <span className="font-bold select-all">{order.trackingNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-3 pt-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
            RINCIAN ITEM SABLON DTF
          </h3>
          <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-surface/30 overflow-hidden font-mono text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="p-3.5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{item.snapshotName}</p>
                  <p className="text-[11px] text-text-muted">
                    Ukuran: {item.snapshotSize} · Warna: {item.snapshotColorName} · Qty: {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-white">
                  Rp {item.lineTotalIdr.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal Kaos & Sablon</span>
            <span>Rp {order.subtotalIdr.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Biaya Pengiriman</span>
            <span>Rp {order.shippingCostIdr.toLocaleString("id-ID")}</span>
          </div>
          {order.discountIdr > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Diskon kupon</span>
              <span>−Rp {order.discountIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm font-bold text-white">
            <span>TOTAL TAGIHAN:</span>
            <span className="text-brand-accent text-lg">
              Rp {order.totalIdr.toLocaleString("id-ID")}
            </span>
          </div>
          {order.payment && (
            <div className="flex justify-between text-text-muted pt-1">
              <span>Pembayaran ({order.payment.method || "Duitku"})</span>
              <span className="font-bold text-white">{order.payment.status}</span>
            </div>
          )}
        </div>

        {/* Riwayat perjalanan pesanan */}
        {order.statusHistory.length > 0 && (
          <div className="p-4 rounded-xl bg-surface/30 border border-white/5 font-mono text-xs space-y-0">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted pb-2">
              Perjalanan pesanan
            </h3>
            <div className="divide-y divide-white/5">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="py-2 flex justify-between items-center gap-3">
                  <div>
                    <span className="font-bold text-white block text-[11px]">{h.status.replace(/_/g, " ")}</span>
                    {h.note && <span className="text-text-muted text-[10px]">{h.note}</span>}
                  </div>
                  <span className="text-text-muted text-[10px] shrink-0">
                    {new Date(h.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fail-Safe Direct WhatsApp Fallback Button */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {needsPayLink && (
            <div className="flex-1 space-y-2">
              <RepayButton orderId={order.id} />
              <a
                href={waPayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center font-mono text-[11px] text-text-muted hover:text-white transition-colors"
              >
                atau minta link via WhatsApp →
              </a>
            </div>
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] text-white font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2 text-center"
          >
            <MessageCircle size={15} />
            <span>KONFIRMASI VIA WHATSAPP (MANUAL)</span>
          </a>

          <Link
            href="/studio"
            className="py-3 px-5 rounded-xl bg-surface border border-white/10 text-white hover:bg-white/10 font-mono font-bold text-xs uppercase tracking-wider transition-all text-center flex items-center justify-center"
          >
            BUAT DESAIN LAIN
          </Link>
        </div>
        {canSeePII && order.status === "PENDING_PAYMENT" && (
          <CancelOrderButton orderId={order.id} />
        )}
      </div>
    </div>
  );
}
