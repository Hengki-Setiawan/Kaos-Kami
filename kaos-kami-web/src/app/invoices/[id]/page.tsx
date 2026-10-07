import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { maskPhone as maskPhoneLib, maskEmail as maskEmailLib, maskName as maskNameLib } from "@/lib/mask"; // SSOT PII (cermin orders/[id])
import { SHOP_WHATSAPP, SHOP_WORKSHOP_ADDRESS } from "@/lib/shop";
import { PrintInvoiceButton } from "@/components/commerce/PrintInvoiceButton";
import { InvoiceStatusPoller, CopyResiButton } from "@/components/commerce/InvoiceLiveBits";
import { InvoicePdfButton } from "@/components/commerce/InvoicePdfButton";

// Invoice kanonis privat: jangan biarkan terindeks bila URL bocor (cermin orders/[id]).
export const metadata = {
  robots: { index: false, follow: false },
};

interface CanonicalInvoicePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Halaman invoice kanonis /invoices/[id] (UI-only).
 * Render ulang invoice existing orders/[id] dengan komponen reuse
 * (PrintInvoiceButton, InvoicePdfButton, InvoiceStatusPoller, CopyResiButton).
 * Tanpa logika bisnis/API/DB baru — query baca sama seperti orders/[id].
 */
export default async function CanonicalInvoicePage({ params }: CanonicalInvoicePageProps) {
  const { id } = await params;

  // Anti-IDOR: cermin orders/[id] — PII dimask untuk non-pemilik.
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
    },
  });

  if (!order) {
    notFound();
  }

  // Masking PII cermin orders/[id] (SSOT @/lib/mask).
  const isPrivileged =
    sessionRole === "ADMIN" || sessionRole === "SUPER_ADMIN" || sessionRole === "PRODUCTION_STAFF";
  const isOwner = !!sessionUserId && order.userId === sessionUserId;
  const canSeePII = isOwner || isPrivileged;

  const maskPhone = (p?: string | null) =>
    !p ? "-" : canSeePII ? p : maskPhoneLib(p) || "-";
  const maskEmail = (e?: string | null) => {
    if (!e) return "-";
    if (canSeePII) return e;
    return maskEmailLib(e) || "-";
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-12 sm:py-20 max-w-3xl mx-auto space-y-6 font-sans tabular-nums print:py-4 print:px-2 print:bg-white print:text-black">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-brand-accent transition-colors"
        >
          <span>← INVOICE LAMA (/orders)</span>
        </Link>
        <PrintInvoiceButton />
      </div>

      <div className="hidden print:block pb-4 mb-4 border-b-2 border-black text-center">
        <h1 className="text-xl font-black uppercase tracking-wider text-black">
          KAOS KAMI MAKASSAR · DTF PRINT & SABLON WORKSHOP
        </h1>
        <p className="text-[11px] text-gray-700">
          Alamat: {SHOP_WORKSHOP_ADDRESS} · WhatsApp CS: +{SHOP_WHATSAPP}
        </p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 space-y-6 print:border print:border-black print:bg-white print:p-4">
        <div className="text-center space-y-2 pb-6 border-b border-border-subtle print:border-black print:pb-3">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-accent/15 text-brand-accent border border-brand-accent/30 print:bg-gray-100 print:text-black print:border-black">
            STATUS: {order.status.replace(/_/g, " ")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary print:text-black">
            INVOICE RESMI PEMESANAN
          </h1>
          <p className="text-xs text-text-muted print:text-black">
            Nomor Pesanan: <span className="text-text-primary print:text-black font-bold text-sm">{order.orderNumber}</span>
          </p>
        </div>

        {/* Penerima & kontak — masking PII cermin orders/[id] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs print:grid-cols-2">
          <div className="p-4 rounded-xl bg-surface/50 border border-border-subtle space-y-1.5 print:bg-white print:border-black">
            <span className="block text-[11px] text-text-muted uppercase print:text-black font-bold">Penerima & Kontak</span>
            <p className="font-bold text-text-primary text-sm print:text-black">{canSeePII ? (order.shippingAddress?.recipientName || order.user?.name || "Pelanggan") : (maskNameLib(order.shippingAddress?.recipientName || order.user?.name) || "Pelanggan")}</p>
            <p className="text-text-muted print:text-black">{maskPhone(order.user?.phoneNumber || order.shippingAddress?.phoneNumber)}</p>
            <p className="text-text-muted truncate print:text-black">{maskEmail(order.user?.email)}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface/50 border border-border-subtle space-y-1.5 print:bg-white print:border-black">
            <span className="block text-[11px] text-text-muted uppercase print:text-black font-bold">Pengiriman Makassar</span>
            <p className="font-bold text-brand-accent text-sm print:text-black">{order.deliveryMethod}</p>
            <p className="text-text-muted text-[11px] print:text-black">
              {canSeePII ? order.shippingAddress?.fullAddress : "Alamat disembunyikan untuk privasi pemilik"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl bg-surface/30 overflow-hidden text-xs print:bg-white print:border-black">
          {order.items.map((item) => (
            <div key={item.id} className="p-3.5 flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-text-primary truncate print:text-black">{item.snapshotName}</p>
                <p className="text-[11px] text-text-muted truncate print:text-black">
                  Ukuran: {item.snapshotSize} · Warna: {item.snapshotColorName} · Qty: {item.quantity} pcs
                </p>
              </div>
              <span className="font-bold text-text-primary shrink-0 print:text-black">
                Rp {item.lineTotalIdr.toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2 text-xs print:bg-white print:border-black">
          <div className="flex justify-between text-text-muted print:text-black">
            <span>Subtotal Kaos & Sablon</span>
            <span>Rp {order.subtotalIdr.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-text-muted print:text-black">
            <span>Biaya Pengiriman</span>
            <span>Rp {order.shippingCostIdr.toLocaleString("id-ID")}</span>
          </div>
          {order.discountIdr > 0 && (
            <div className="flex justify-between text-emerald-400 print:text-black">
              <span>Diskon kupon</span>
              <span>−Rp {order.discountIdr.toLocaleString("id-ID")}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-border-subtle text-sm font-bold text-text-primary print:border-black print:text-black">
            <span>TOTAL TAGIHAN:</span>
            <span className="text-brand-accent text-lg print:text-black">
              Rp {order.totalIdr.toLocaleString("id-ID")}
            </span>
          </div>
          {order.payment && (
            <div className="flex justify-between text-text-muted pt-1 print:text-black">
              <span>Pembayaran ({order.payment.method || "QRIS"})</span>
              <span className="font-bold text-text-primary print:text-black">{order.payment.status}</span>
            </div>
          )}
        </div>

        {order.trackingNumber && (
          <p className="text-xs text-emerald-400 print:text-black flex items-center gap-2 flex-wrap">
            <span>
              No. Resi: <span className="font-bold select-all">{order.trackingNumber}</span>
            </span>
            <span className="print:hidden">
              <CopyResiButton resi={order.trackingNumber} />
            </span>
          </p>
        )}

        <InvoiceStatusPoller orderId={order.id} initialStatus={order.status} />

        <div className="pt-2 flex flex-col sm:flex-row gap-3 print:hidden">
          <InvoicePdfButton
            order={{
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              totalIdr: order.totalIdr,
              subtotalIdr: order.subtotalIdr,
              shippingCostIdr: order.shippingCostIdr,
              discountIdr: order.discountIdr,
              trackingNumber: order.trackingNumber,
              createdAt: new Date(order.createdAt).toISOString(),
              items: order.items.map((it) => ({
                snapshotName: it.snapshotName,
                snapshotSize: it.snapshotSize,
                snapshotColorName: it.snapshotColorName,
                quantity: it.quantity,
                lineTotalIdr: it.lineTotalIdr,
              })),
            }}
          />
          <Link
            href={`/orders/${order.id}`}
            className="py-3 px-5 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all text-center"
          >
            BUKA TAMPILAN LAMA
          </Link>
        </div>
      </div>
    </div>
  );
}
