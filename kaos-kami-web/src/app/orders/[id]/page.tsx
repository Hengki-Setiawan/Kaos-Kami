import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { maskPhone as maskPhoneLib, maskEmail as maskEmailLib, maskName as maskNameLib } from "@/lib/mask"; // SSOT PII (S-045)
import { SHOP_WHATSAPP, SHOP_WORKSHOP_ADDRESS, APK_DOWNLOAD_URL } from "@/lib/shop";
import { RepayButton } from "@/components/commerce/RepayButton";
import { CancelOrderButton } from "@/components/commerce/CancelOrderButton";
import { PrintInvoiceButton } from "@/components/commerce/PrintInvoiceButton";
import { PaymentDeadline, InvoiceStatusPoller, CopyResiButton, ClearCartOnSuccess } from "@/components/commerce/InvoiceLiveBits";
import { InvoicePdfButton } from "@/components/commerce/InvoicePdfButton";
import { ComplaintForm } from "@/components/commerce/ComplaintForm";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  ArrowLeft,
  Truck,
  Smartphone,
  Download,
} from "lucide-react";

interface OrderReceiptPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Invoice privat: jangan biarkan terindeks bila URL bocor (audit).
export const metadata = {
  robots: { index: false, follow: false },
};

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
    !p ? "-" : canSeePII ? p : maskPhoneLib(p) || "-";
  const maskEmail = (e?: string | null) => {
    if (!e) return "-";
    if (canSeePII) return e;
    return maskEmailLib(e) || "-";
  };

  // Banner status server (+ ?status=error/pending dari redirect Duitku — dulu diabaikan).
  const isPaid = !["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(order.status);
  const isSuccess = sp.status === "success" && isPaid;
  const queryFlag = typeof sp.status === "string" ? sp.status : null;
  const showPayError = queryFlag === "error" && !isPaid;
  const showPayPending = queryFlag === "pending" && !isPaid;

  // I6: tautan lacak kurir dari info ekspedisi (fallback: teks resi saja).
  const trackingUrl = (() => {
    const resi = order.trackingNumber?.trim();
    if (!resi) return null;
    const notes = `${(order as any).courierNotes || ""}`.toUpperCase();
    const map: Array<[RegExp, (r: string) => string]> = [
      [/JNE/, (r) => `https://www.jne.co.id/id/tracking/trace/${encodeURIComponent(r)}`],
      [/J&T|JNT/, (r) => `https://jet.co.id/track?awb=${encodeURIComponent(r)}`],
      [/SICEPAT/, (r) => `https://www.sicepat.com/checkAwb/${encodeURIComponent(r)}`],
      [/NINJA/, (r) => `https://www.ninjavan.co/id-id/tracking?id=${encodeURIComponent(r)}`],
      [/GOSEND|GOJEK/, () => `https://gojek.com/id-id/gosend/`],
      [/GRAB/, () => `https://www.grab.com/id/express/`],
      [/ANTER/, (r) => `https://anteraja.id/tracking/search/${encodeURIComponent(r)}`],
      [/LION|JAGOPACK/, (r) => `https://lionparcel.com/track?stt_no=${encodeURIComponent(r)}`],
      [/\bPOS\b|POS INDONESIA/, (r) => `https://www.posindonesia.co.id/id/tracking?awb=${encodeURIComponent(r)}`],
      [/TIKI/, (r) => `https://tiki.id/id/tracking?cnno=${encodeURIComponent(r)}`],
    ];
    for (const [re, build] of map) {
      if (re.test(notes)) return build(resi);
    }
    return null;
  })();

  // WhatsApp manual fallback link
  const waMessage = encodeURIComponent(
    `*Halo Kaos Kami Makassar, saya ingin konfirmasi pesanan saya:*\n` +
      `No. Pesanan: ${order.orderNumber}\n` +
      `Total: Rp ${order.totalIdr.toLocaleString("id-ID")}\n` +
      `Status: ${order.status}\n\n` +
      `Mohon dibantu proses antrean sablonnya. Terima kasih!`
  );
  const waLink = `https://wa.me/${SHOP_WHATSAPP}?text=${waMessage}`;

  // Link bayar via WhatsApp
  const waPayMessage = encodeURIComponent(
    `*Halo Kaos Kami, link bayar saya hilang:*\n` +
      `No. Pesanan: ${order.orderNumber}\n` +
      `Total: Rp ${order.totalIdr.toLocaleString("id-ID")}\n\n` +
      `Mohon kirim ulang link pembayarannya. Terima kasih!`
  );
  const waPayLink = `https://wa.me/${SHOP_WHATSAPP}?text=${waPayMessage}`;
  const needsPayLink = order.status === "PENDING_PAYMENT";

  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-12 sm:py-20 max-w-3xl mx-auto space-y-6 print:py-4 print:px-2 print:bg-white print:text-black">
      {/* Back Link & Print Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-text-muted hover:text-brand-accent transition-colors"
        >
          <ArrowLeft size={14} />
          <span>KEMBALI KE BERANDA</span>
        </Link>
        <PrintInvoiceButton />
      </div>

      {/* Official Workshop Letterhead (Visible ONLY during Printing) */}
      <div className="hidden print:block pb-4 mb-4 border-b-2 border-black text-center font-mono">
        <h1 className="text-xl font-black uppercase tracking-wider text-black">
          KAOS KAMI MAKASSAR — DTF PRINT & SABLON WORKSHOP
        </h1>
        <p className="text-xs text-black mt-1">
          Spesialis Sablon Digital Transfer Film & Interactive 3D Customizer
        </p>
        <p className="text-[11px] text-gray-700">
          Alamat: {SHOP_WORKSHOP_ADDRESS} · WhatsApp CS: +{SHOP_WHATSAPP}
        </p>
      </div>

      {/* Main Receipt Card */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 dark:shadow-2xl space-y-6 print:border print:border-black print:bg-white print:p-4 print:shadow-none">
        {/* Status Header Banner */}
        <div className="text-center space-y-2 pb-6 border-b border-border-subtle print:border-black print:pb-3">
          <div className="w-16 h-16 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center mx-auto mb-3 print:hidden">
            {isSuccess ? <CheckCircle2 size={32} /> : <Clock size={32} />}
          </div>
          <span className="inline-block px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider bg-brand-accent/15 text-brand-accent border border-brand-accent/30 print:bg-gray-100 print:text-black print:border-black">
            STATUS: {order.status.replace(/_/g, " ")}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary print:text-black print:text-2xl">
            {isSuccess ? "PESANAN BERHASIL DITERIMA" : "INVOICE RESMI PEMESANAN"}
          </h1>
          {showPayError && (
            <p className="font-mono text-xs text-rose-400 font-bold print:hidden">
              ⚠️ Pembayaran gagal/dibatalkan — pesanan masih PENDING. Klik BAYAR ULANG di bawah atau minta link baru via WhatsApp.
            </p>
          )}
          {showPayPending && (
            <p className="font-mono text-xs text-amber-400 font-bold print:hidden">
              ⏳ Pembayaran masih diproses — status berubah otomatis bila lunas (tunggu ~1 menit lalu muat ulang).
            </p>
          )}
          <p className="font-mono text-xs text-text-muted print:text-black">
            Nomor Pesanan: <span className="text-text-primary print:text-black font-bold font-mono text-sm">{order.orderNumber}</span>
          </p>
        </div>

        {/* Order Details Grid */}
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
            {order.deliveryMethod === "PICKUP" ? (
              <>
                <p className="text-text-primary text-[11px] print:text-black">Ambil di: {SHOP_WORKSHOP_ADDRESS}</p>
                <p className="text-text-muted text-[10px] print:text-black">Tunjukkan nomor pesanan saat pengambilan.</p>
              </>
            ) : (
              <p className="text-text-muted text-[11px] print:text-black">
                {canSeePII ? order.shippingAddress?.fullAddress : "Alamat disembunyikan untuk privasi pemilik"}
              </p>
            )}
            {(() => {
              const segs = (order.courierNotes || "").split(" | ").filter(Boolean);
              const pub = segs.filter((s) => s.startsWith("Ekspedisi "));
              const shown = canSeePII ? segs : pub;
              if (shown.length === 0) return null;
              return <p className="text-amber-400 text-[10px] print:text-black">Catatan: {shown.join(" | ")}</p>;
            })()}
            {order.trackingNumber && order.status !== "PENDING_PAYMENT" && (
              <p className="text-emerald-400 text-[11px] print:text-black flex items-center gap-2 flex-wrap">
                <span>
                  No. Resi:{" "}
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold select-all underline underline-offset-2"
                    >
                      {order.trackingNumber} ↗
                    </a>
                  ) : (
                    <span className="font-bold select-all">{order.trackingNumber}</span>
                  )}
                </span>
                <span className="print:hidden">
                  <CopyResiButton resi={order.trackingNumber} />
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-3 pt-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted print:text-black">
            RINCIAN ITEM SABLON DTF
          </h3>
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl bg-surface/30 overflow-hidden font-mono text-xs print:bg-white print:border-black print:divide-black">
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
        </div>

        {/* Payment Summary */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2 font-mono text-xs print:bg-white print:border-black">
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
              <span>Pembayaran ({order.payment.method || "Duitku"})</span>
              <span className="font-bold text-text-primary print:text-black">{order.payment.status}</span>
            </div>
          )}
        </div>

        {/* Riwayat perjalanan pesanan */}
        {order.statusHistory.length > 0 && (
          <div className="p-4 rounded-xl bg-surface/30 border border-border-subtle font-mono text-xs space-y-0 print:hidden">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted pb-2">
              Perjalanan pesanan
            </h3>
            <div className="divide-y divide-border-subtle">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="py-2 flex justify-between items-center gap-3">
                  <div>
                    <span className="font-bold text-text-primary block text-[11px]">{h.status.replace(/_/g, " ")}</span>
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

        {/* Info Pelacakan & Unduh Aplikasi Capacitor */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-brand-accent/10 to-surface border border-brand-accent/30 font-mono text-xs space-y-2.5 print:hidden">
          <div className="flex items-center gap-2 text-brand-accent font-bold">
            <Smartphone size={16} />
            <span className="uppercase tracking-wider">Pantau Sablon via Aplikasi Android</span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Update status antrean sablon & resi pengiriman dapat dipantau langsung di halaman ini atau melalui Aplikasi Resmi Kaos Kami untuk pengalaman yang lebih cepat dan bebas spam.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              download="kaos-kami.apk"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-accent text-canvas font-bold text-[11px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              <Download size={13} />
              <span>UNDUH APK ANDROID</span>
            </a>
          </div>
        </div>

        {/* I1+I2: deadline bayar + auto-refresh status saat PENDING. */}
        {needsPayLink && (
          <div className="print:hidden">
            <PaymentDeadline createdAtISO={new Date(order.createdAt).toISOString()} />
          </div>
        )}
        <InvoiceStatusPoller orderId={order.id} initialStatus={order.status} />
        <React.Suspense fallback={null}>
          <ClearCartOnSuccess />
        </React.Suspense>

        {/* Fail-Safe Direct WhatsApp Fallback Button & Actions (Hidden on Print) */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 print:hidden">
          {needsPayLink && (
            <div className="flex-1 space-y-2">
              <RepayButton orderId={order.id} />
              <a
                href={waPayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
              >
                atau minta link via WhatsApp →
              </a>
            </div>
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] text-white font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all dark:shadow-[0_0_16px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2 text-center"
          >
            <MessageCircle size={15} />
            <span>KONFIRMASI VIA WHATSAPP (MANUAL)</span>
          </a>

          {/* I7: duplikat bawah dihapus — tombol cetak atas dipertahankan. */}
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

          {(order.status === "SHIPPED" || order.status === "DELIVERED" || order.status === "COMPLETED") && (
            <ComplaintForm orderId={order.id} />
          )}

          <Link
            href="/studio"
            className="py-3 px-5 rounded-xl bg-surface border border-border-subtle text-text-primary hover:border-brand-accent hover:text-brand-accent font-mono font-bold text-xs uppercase tracking-wider transition-all text-center flex items-center justify-center"
          >
            BUAT DESAIN LAIN
          </Link>
        </div>

        {canSeePII && order.status === "PENDING_PAYMENT" && (
          <div className="print:hidden">
            <CancelOrderButton orderId={order.id} />
          </div>
        )}
      </div>
    </div>
  );
}
