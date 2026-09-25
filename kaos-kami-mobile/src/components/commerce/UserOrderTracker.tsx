"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  CreditCard,
  Printer,
  Flame,
  CheckCircle2,
  Truck,
  MessageCircle,
  ExternalLink,
  PartyPopper,
} from 'lucide-react';
import { GlassCard, Badge, HapticButton } from '@/components/ui';
import { openDuitkuPaymentModal } from '@/lib/payments/duitkuMobile';
import { SHOP_WHATSAPP, shopWaLink } from '@/lib/shop';
import { mobileApiClient, MobileOrderStatus } from '@/lib/api/mobileApiClient';
import { haptic } from '@/lib/bridge/haptics';
import { shareText } from '@/lib/bridge/share';
import { Browser } from '@capacitor/browser';
import { useMobileCartStore } from '@/store/useMobileCartStore';

export type OrderStatus =
  | 'PENDING_DESIGN_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'IN_PRODUCTION_QUEUE'
  | 'PRINTING_DTF'
  | 'CURING_PRESS'
  | 'QC_PACKED'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItemData {
  id: string;
  orderNumber: string;
  apparelTitle: string;
  colorName: string;
  size: string;
  quantity: number;
  printWidthCm: number;
  printHeightCm: number;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  deliveryMethod: string;
  createdAt: string;
  /** ID ProductionTask server (jika data dari /api/admin/production-tasks). */
  taskId?: string;
  artworkUrl?: string | null;
  customerPhone?: string;
  /** Nama pelanggan asli (server order.user.name) — JANGAN isi apparelTitle. */
  customerName?: string;
  /** DPI aktual (store/artwork) — null = belum diukur, tampil jujur. */
  decalDpi?: number | null;
  /**
   * Alasan review admin (fallback string-match [REVIEW...]/[DITOLAK...] —
   * kolom reviewNote BELUM ADA di server 21 Sep 2026; endpoint
   * /api/mobile/orders/:id/status juga belum mengembalikan note).
   */
  reviewNote?: string | null;
  reviewKind?: 'REVIEW' | 'APPROVED' | 'REJECTED' | null;
}

const STATUS_STEPS: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'PENDING_DESIGN_APPROVAL', label: 'Review Desain', icon: Clock },
  { key: 'PENDING_PAYMENT', label: 'Menunggu Bayar', icon: CreditCard },
  { key: 'PRINTING_DTF', label: 'Cetak DTF', icon: Printer },
  { key: 'CURING_PRESS', label: 'Press Panas', icon: Flame },
  { key: 'SHIPPED', label: 'Diantar', icon: Truck },
  { key: 'COMPLETED', label: 'Selesai', icon: CheckCircle2 },
];

export function UserOrderTracker({
  order,
  onPayNow,
  onNotify,
}: {
  order: OrderItemData;
  onPayNow?: () => void;
  onNotify?: (msg: string) => void;
}) {
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  const handleOpenWhatsApp = () => {
    haptic.tap();
    const message = encodeURIComponent(
      `Halo Admin Kaos Kami! Saya ingin menanyakan pesanan nomor *${order.orderNumber}* (${order.apparelTitle}).`
    );
    window.open(`https://wa.me/${SHOP_WHATSAPP}?text=${message}`, '_blank');
  };

  const handlePay = () => {
    haptic.tapHeavy();
    if (onPayNow) {
      onPayNow();
    } else {
      // TANPA URL demo (audit: link sandbox mati menyesatkan) — arahkan ke WA.
      onNotify?.('Link bayar tidak tersedia. Minta link baru via tombol WA di bawah.');
    }
  };
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header Info Order */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white font-mono">{order.orderNumber}</span>
            <Badge
              variant={
                order.status === 'COMPLETED'
                  ? 'success'
                  : order.status === 'PENDING_PAYMENT'
                  ? 'warning'
                  : order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'REJECTED'
                  ? 'neutral'
                  : 'production'
              }
              pulse={order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && order.status !== 'REJECTED'}
            >
              {order.status === 'PENDING_DESIGN_APPROVAL'
                ? 'Menunggu Review Admin'
                : order.status === 'PENDING_PAYMENT'
                ? 'Siap Dibayar'
                : order.status === 'PRINTING_DTF'
                ? 'Sedang Dicetak DTF'
                : order.status === 'CURING_PRESS'
                ? 'Press Panas 160°C'
                : order.status === 'SHIPPED'
                ? 'Dalam Perjalanan'
                : order.status === 'CANCELLED'
                ? 'Dibatalkan'
                : order.status === 'REFUNDED'
                ? 'Dana Kembali'
                : order.status === 'REJECTED'
                ? 'Ditolak'
                : order.status === 'COMPLETED'
                ? 'Selesai'
                : order.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {order.quantity}x {order.apparelTitle} • {order.colorName} ({order.size})
          </p>
          {/* Q6: ukuran cetak fisik ASLI dari API di SEMUA status; 0/kosong =
              "Menunggu info workshop" (JANGAN tampilkan 0). */}
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Ukuran cetak:{' '}
            {order.printWidthCm > 0 && order.printHeightCm > 0
              ? `${order.printWidthCm}×${order.printHeightCm} cm`
              : 'Menunggu info workshop'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-sm font-bold text-[#FF6B35] font-['Syne']">
            Rp {order.totalAmount.toLocaleString('id-ID')}
          </span>
          <p className="text-[10px] text-zinc-500">{order.deliveryMethod}</p>
        </div>
      </div>

      {/* Horizontal Step Timeline Tracker */}
      <div className="relative py-2">
        <div className="flex items-center justify-between relative z-10">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= (currentStepIndex === -1 ? 0 : currentStepIndex);
            const isCurrent = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-[#FF6B35] text-white ring-4 ring-orange-500/25 scale-110'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[9px] mt-1.5 text-center font-medium max-w-[50px] leading-tight ${
                    isCurrent ? 'text-[#FF6B35] font-bold' : isCompleted ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Notice & Action CTA */}
      {order.status === 'PENDING_DESIGN_APPROVAL' && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-bold">Desain Anda sedang diperiksa oleh Admin Workshop</p>
            <p className="text-[10px] text-amber-300/80 mt-0.5">
              Admin sedang memvalidasi resolusi stiker sablon Anda (
              {order.printWidthCm > 0 && order.printHeightCm > 0
                ? `${order.printWidthCm}x${order.printHeightCm} cm`
                : 'menunggu info workshop'}
              ). Begitu disetujui, tombol pembayaran QRIS akan aktif otomatis!
            </p>
            {order.reviewNote && (
              <p className="text-[10px] text-amber-300/70 mt-1 break-words">Catatan: {order.reviewNote}</p>
            )}
          </div>
        </div>
      )}

      {order.status === 'PENDING_PAYMENT' && (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
            <p className="font-bold flex items-center gap-1.5"><PartyPopper className="w-4 h-4 text-emerald-400 shrink-0" /> Desain Kaos Anda telah disetujui Admin!</p>
            <p className="text-[10px] text-emerald-300/80 mt-0.5">
              Silakan selesaikan pembayaran untuk langsung memasukkan baju Anda ke antrean cetak DTF.
            </p>
            {order.reviewNote && (
              <p className="text-[10px] text-emerald-300/70 mt-1 break-words">Catatan admin: {order.reviewNote}</p>
            )}
          </div>
          <HapticButton
            variant="primary"
            hapticStyle="success"
            onClick={handlePay}
            icon={<CreditCard className="w-4 h-4" />}
            className="w-full py-3.5 text-sm font-bold shadow-lg shadow-orange-600/30"
          >
            Bayar Sekarang (QRIS / VA)
          </HapticButton>
        </div>
      )}

      {/* Banner REVIEW generik (mis. oversell triase saat status sudah lunas). */}
      {(order.reviewKind === 'REVIEW' ||
        (order.reviewNote && /(\[REVIEW|REVIEW:|OVERSELL|triase)/i.test(order.reviewNote))) &&
        order.status !== 'PENDING_DESIGN_APPROVAL' && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-bold">Pesanan dalam peninjauan workshop</p>
            {order.reviewNote ? (
              <p className="text-[10px] text-amber-300/80 mt-0.5 break-words">Catatan: {order.reviewNote}</p>
            ) : (
              <p className="text-[10px] text-amber-300/80 mt-0.5">
                Tim memeriksa pesanan Anda — status diperbarui otomatis.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Banner DITOLAK + alasan admin. */}
      {(order.status === 'REJECTED' || order.reviewKind === 'REJECTED') && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
          <p className="font-bold">❌ Pesanan ditolak workshop</p>
          {order.reviewNote ? (
            <p className="text-[10px] text-red-300/80 mt-0.5 break-words">Alasan admin: {order.reviewNote}</p>
          ) : (
            <p className="text-[10px] text-red-300/70 mt-0.5">
              Alasan belum tercatat — tanya via WhatsApp di bawah.
            </p>
          )}
        </div>
      )}

      {/* Bottom Contact Admin Button */}
      <div className="flex gap-2 pt-1">
        <HapticButton
          variant="secondary"
          icon={<MessageCircle className="w-3.5 h-3.5 text-emerald-400" />}
          onClick={handleOpenWhatsApp}
          className="flex-1 py-2 text-xs"
        >
          Chat WhatsApp Admin Workshop
        </HapticButton>
      </div>
    </GlassCard>
  );
}

const SERVER_TO_TRACKER: Record<string, OrderStatus> = {
  // Review desain pra-bayar (konsep mobile; server kini/future melempar mentah).
  PENDING_DESIGN_APPROVAL: 'PENDING_DESIGN_APPROVAL',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED: 'PRINTING_DTF',
  IN_PRODUCTION_QUEUE: 'PRINTING_DTF',
  PRINTING: 'PRINTING_DTF',
  QUALITY_CHECK: 'CURING_PRESS',
  READY_TO_SHIP: 'SHIPPED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'COMPLETED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  // Ditolak workshop (tanpa ini isDead tak pernah true untuk REJECTED).
  REJECTED: 'REJECTED',
};

/**
 * Kontainer live: polling GET /api/mobile/orders/:id/status tiap 10 detik.
 * Menggantikan mock saat orderId server (cuid) tersedia.
 */
/** Minta link bayar Duitku untuk order yg sudah di-ACC (tanpa link lama). */
function RequestPaymentButton({ orderId, onOpened }: { orderId: string; onOpened?: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/request-payment`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.paymentUrl) throw new Error(data?.error || 'Belum bisa bayar — pastikan admin sudah ACC.');
      onOpened?.();
      await openDuitkuPaymentModal(data.paymentUrl, () => onOpened?.());
    } catch (e: any) {
      setMsg(e?.message || 'Gagal minta link bayar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
      >
        {busy ? 'MEMINTA LINK…' : 'BAYAR SEKARANG (QRIS)'}
      </button>
      {msg && <p className="text-[10px] text-amber-400 text-center">{msg}</p>}
    </div>
  );
}

/**
 * Q5: aksi invoice dari invoiceUrl server (halaman invoice web) — TERPISAH
 * dari paymentUrl Duitku (JANGAN buka invoice sebagai "lanjut bayar").
 * - Unduh/Buka: Browser native (fallback window.open di web).
 * - Bagikan: Share sheet native.
 * - Bayar manual via WA: wa.me workshop + nomor order + link invoice.
 */
export function InvoiceActions({
  orderNumber,
  invoiceUrl,
  onNotify,
}: {
  orderNumber: string;
  invoiceUrl: string;
  onNotify?: (msg: string) => void;
}) {
  const openInvoice = async () => {
    haptic.tap();
    try {
      await Browser.open({ url: invoiceUrl, windowName: '_blank', presentationStyle: 'popover', toolbarColor: '#0E0E10' });
    } catch {
      try {
        window.open(invoiceUrl, '_blank');
      } catch {}
    }
  };
  const shareInvoice = async () => {
    haptic.tap();
    const ok = await shareText(`Invoice ${orderNumber} — Kaos Kami`, `Invoice pesanan ${orderNumber}: ${invoiceUrl}`, 'Bagikan invoice');
    onNotify?.(ok ? 'Lembar bagikan invoice dibuka.' : 'Link invoice disalin — tempel manual ke WA.');
  };
  const payManualWa = () => {
    haptic.tapHeavy();
    window.open(
      shopWaLink(`Halo Admin Kaos Kami! Saya mau bayar MANUAL via WA untuk pesanan ${orderNumber}. Link invoice: ${invoiceUrl}`),
      '_blank'
    );
  };
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <button
        type="button"
        onClick={() => void openInvoice()}
        className="py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-[11px] font-bold"
      >
        Unduh Invoice
      </button>
      <button
        type="button"
        onClick={() => void shareInvoice()}
        className="py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-[11px] font-bold"
      >
        Bagikan
      </button>
      <button
        type="button"
        onClick={payManualWa}
        className="py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
      >
        Bayar via WA
      </button>
    </div>
  );
}

/**
 * Q5 fallback: bayar manual via WA TANPA butuh invoiceUrl (cukup nomor order).
 * Dipakai bila prop invoiceUrl hilang (mis. app restart — hidrasi page.tsx
 * hanya memulihkan orderId+paymentUrl) dan status server belum kirim
 * invoiceUrl. wa.me workshop SSOT dari lib/shop.
 */
export function ManualWaPayButton({
  orderNumber,
  invoiceUrl,
}: {
  orderNumber: string;
  invoiceUrl?: string | null;
}) {
  const payManualWa = () => {
    haptic.tapHeavy();
    const suffix = invoiceUrl ? ` Link invoice: ${invoiceUrl}` : ' (link invoice menyusul — info dari tab ini).';
    window.open(
      shopWaLink(`Halo Admin Kaos Kami! Saya mau bayar MANUAL via WA untuk pesanan ${orderNumber}.${suffix}`),
      '_blank'
    );
  };
  return (
    <button
      type="button"
      onClick={payManualWa}
      className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
    >
      Bayar manual via WA
    </button>
  );
}

export function UserOrderTrackerLive({
  orderId,
  paymentUrl,
  invoiceUrl,
  onNotify,
}: {
  orderId: string;
  paymentUrl?: string;
  /** Halaman invoice server (fallback bayar manual) — bukan link Duitku. */
  invoiceUrl?: string;
  onNotify?: (msg: string) => void;
}) {
  const [remote, setRemote] = useState<MobileOrderStatus | null>(null);
  const [offline, setOffline] = useState(false);
  // Backoff polling (audit N12): gagal beruntun → interval 10s→30s→60s.
  const failCount = useRef(0);
  const [pollEvery, setPollEvery] = useState(10000);

  const paidNotifiedRef = useRef(false);
  const poll = useCallback(async () => {
    const s = await mobileApiClient.pollOrderStatus(orderId);
    if (s) {
      setRemote(s);
      setOffline(false);
      failCount.current = 0;
      setPollEvery(10000);
      // A7: server nyatakan lunas (bukan PENDING) → cart yg ditandai order ini
      // boleh dikosongkan SEKARANG (satu kali). Pending/close = cart utuh.
      try {
        const st = String((s as any)?.status || "");
        const pendingMark =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("kaoskami_cart_pending_order")
            : null;
        if (!paidNotifiedRef.current && st && st !== "PENDING_PAYMENT" && pendingMark === orderId) {
          paidNotifiedRef.current = true;
          try { localStorage.removeItem("kaoskami_cart_pending_order"); } catch {}
          try { useMobileCartStore.getState().clearCart(); } catch {}
          onNotify?.("✅ Pembayaran lunas — keranjang dikosongkan.");
        }
      } catch {}
    } else {
      setOffline(true);
      failCount.current += 1;
      setPollEvery(failCount.current >= 5 ? 60000 : failCount.current >= 2 ? 30000 : 10000);
    }
  }, [orderId]);

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const isHidden = () =>
      typeof document !== 'undefined' && document.hidden;
    const start = () => {
      if (t) clearInterval(t);
      // Pause saat tab hidden (hemat baterai/kuota + hindari race).
      if (isHidden()) return;
      t = setInterval(() => {
        if (isHidden()) return;
        void poll();
      }, pollEvery);
    };
    const onVis = () => {
      if (isHidden()) {
        if (t) {
          clearInterval(t);
          t = null;
        }
      } else {
        void poll(); // segarkan segera saat tab kembali terlihat
        start();
      }
    };
    if (!isHidden()) void poll();
    start();
    // A8: browser bayar ditutup → poll segera (jangan tunggu interval).
    const onDemand = () => {
      void poll();
    };
    try {
      window.addEventListener('kaoskami:refresh-order', onDemand);
    } catch {}
    document?.addEventListener?.('visibilitychange', onVis);
    return () => {
      if (t) clearInterval(t);
      document?.removeEventListener?.('visibilitychange', onVis);
      try {
        window.removeEventListener('kaoskami:refresh-order', onDemand);
      } catch {}
    };
  }, [poll, pollEvery]);

  if (!remote) {
    return (
      <GlassCard className="p-4 text-xs text-zinc-400">
        {offline ? 'Menunggu koneksi untuk memuat status pesanan…' : 'Memuat status pesanan…'}
      </GlassCard>
    );
  }

  const rawStatus: string = remote.status;
  // Status tak dikenal = label server mentah TANPA tombol bayar.
  // JANGAN fallback PENDING_PAYMENT (risiko bayar ganda/status palsu).
  const mapped: OrderStatus | null = SERVER_TO_TRACKER[rawStatus] ?? null;
  const effectiveStatus: OrderStatus = mapped ?? (rawStatus as OrderStatus);
  // Status final non-bayar (batal/refund) JANGAN pernah tampil "Siap Dibayar"
  // + tombol bayar (audit N14 — risiko bayar ganda).
  const isDead = mapped === 'CANCELLED' || mapped === 'REFUNDED' || mapped === 'REJECTED';
  // Passthrough review defensif (hanya baca field bila ada — endpoint status
  // kini BELUM mengembalikan note/reviewNote/dimensi cetak).
  // reviewNote null = tampilkan status + arahan WA (jujur, bukan karangan).
  // Dimensi 0 = "menunggu info workshop" di render (JANGAN tampilkan 0x0 cm).
  const remoteAny = remote as any;
  const remoteW =
    typeof remoteAny?.printWidthCm === 'number' && Number.isFinite(remoteAny.printWidthCm) && remoteAny.printWidthCm > 0
      ? remoteAny.printWidthCm
      : 0;
  const remoteH =
    typeof remoteAny?.printHeightCm === 'number' && Number.isFinite(remoteAny.printHeightCm) && remoteAny.printHeightCm > 0
      ? remoteAny.printHeightCm
      : 0;
  const remoteNote: string | null =
    typeof remoteAny?.note === "string" && remoteAny.note.trim()
      ? String(remoteAny.note)
      : typeof remoteAny?.reviewNote === "string" && remoteAny.reviewNote.trim()
        ? String(remoteAny.reviewNote)
        : typeof remoteAny?.rejectReason === "string" && remoteAny.rejectReason.trim()
          ? String(remoteAny.rejectReason)
          : null;
  const remoteKind: OrderItemData["reviewKind"] = remoteNote
    ? /(\[DITOLAK|ditolak|REJECTED)/i.test(remoteNote)
      ? "REJECTED"
      : /(\[REVIEW|REVIEW:|OVERSELL|triase)/i.test(remoteNote)
        ? "REVIEW"
        : /(disetujui|diterima|siap dibayar)/i.test(remoteNote)
          ? "APPROVED"
          : null
    : rawStatus === "REJECTED"
      ? "REJECTED"
      : null;
  const order: OrderItemData = {
    id: remote.id,
    orderNumber: remote.orderNumber,
    apparelTitle: `Pesanan Sablon DTF (${remote.itemCount || 1} pcs)`,
    colorName: '-',
    size: '-',
    quantity: remote.itemCount || 1,
    printWidthCm: remoteW,
    printHeightCm: remoteH,
    status: effectiveStatus,
    totalAmount: remote.totalIdr || 0,
    paymentMethod: paymentUrl ? 'Duitku' : remote.paymentMethod || '-',
    deliveryMethod: remote.deliveryMethod || 'Makassar',
    createdAt: remote.updatedAt,
    reviewNote: remoteNote,
    reviewKind: remoteKind,
  };

  return (
    <div className="space-y-2">
      {offline && (
        <p className="text-[10px] text-amber-400 text-center">Offline — menampilkan status terakhir.</p>
      )}
      {!SERVER_TO_TRACKER[remote.status] && (
        <p className="text-[10px] text-zinc-400 text-center">Status server: {remote.status}</p>
      )}
      <UserOrderTracker
        order={order}
        onPayNow={
          !isDead && mapped === 'PENDING_PAYMENT' && paymentUrl
            ? () => openDuitkuPaymentModal(paymentUrl, () => poll())
            : undefined
        }
        onNotify={onNotify}
      />
      {/* ALUR REVIEW: approved tapi belum ada link → minta link bayar ke server. */}
      {!isDead && mapped === 'PENDING_PAYMENT' && !paymentUrl && (
        <RequestPaymentButton orderId={remote.id} onOpened={() => poll()} />
      )}
      {/* Q5: invoice server — unduh/bagikan + bayar manual via WA (bukan paymentUrl).
          Sumber: prop invoiceUrl (checkout sesi ini) fallback remote.invoiceUrl
          (status server, bila backend sudah kirim). Tanpa URL pun tombol Bayar
          manual via WA TETAP tampil (cukup nomor order). */}
      {(() => {
        const liveInvoice: string | null =
          invoiceUrl ?? (remote as MobileOrderStatus).invoiceUrl ?? null;
        return liveInvoice ? (
          <InvoiceActions orderNumber={remote.orderNumber} invoiceUrl={liveInvoice} onNotify={onNotify} />
        ) : (
          <ManualWaPayButton orderNumber={remote.orderNumber} />
        );
      })()}
      {isDead && (
        <p className="text-[11px] text-zinc-400 text-center">
          {mapped === 'CANCELLED' ? 'Pesanan ini dibatalkan.' : mapped === 'REFUNDED' ? 'Dana pesanan ini sudah dikembalikan.' : 'Pesanan ini ditolak workshop.'}
        </p>
      )}
    </div>
  );
}
