"use client";

import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { GlassCard, Badge, HapticButton } from '@/components/ui';
import { openDuitkuPaymentModal } from '@/lib/payments/duitkuMobile';
import { mobileApiClient, MobileOrderStatus } from '@/lib/api/mobileApiClient';
import { haptic } from '@/lib/bridge/haptics';

export type OrderStatus =
  | 'PENDING_DESIGN_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'IN_PRODUCTION_QUEUE'
  | 'PRINTING_DTF'
  | 'CURING_PRESS'
  | 'QC_PACKED'
  | 'SHIPPED'
  | 'COMPLETED';

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
}: {
  order: OrderItemData;
  onPayNow?: () => void;
}) {
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  const handleOpenWhatsApp = () => {
    haptic.tap();
    const message = encodeURIComponent(
      `Halo Admin Kaos Kami! Saya ingin menanyakan pesanan nomor *${order.orderNumber}* (${order.apparelTitle}).`
    );
    window.open(`https://wa.me/62882020685076?text=${message}`, '_blank');
  };

  const handlePay = () => {
    haptic.tapHeavy();
    if (onPayNow) {
      onPayNow();
    } else {
      openDuitkuPaymentModal('https://sandbox.duitku.com/webapi/qris/demo');
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
                  : 'production'
              }
              pulse={order.status !== 'COMPLETED'}
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
                : 'Selesai'}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {order.quantity}x {order.apparelTitle} • {order.colorName} ({order.size})
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
              Admin sedang memvalidasi resolusi stiker sablon Anda ({order.printWidthCm}x{order.printHeightCm} cm). Begitu disetujui, tombol pembayaran QRIS akan aktif otomatis!
            </p>
          </div>
        </div>
      )}

      {order.status === 'PENDING_PAYMENT' && (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
            <p className="font-bold">🎉 Desain Kaos Anda telah disetujui Admin!</p>
            <p className="text-[10px] text-emerald-300/80 mt-0.5">
              Silakan selesaikan pembayaran untuk langsung memasukkan baju Anda ke antrean cetak DTF.
            </p>
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
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED: 'PRINTING_DTF',
  IN_PRODUCTION_QUEUE: 'PRINTING_DTF',
  PRINTING: 'PRINTING_DTF',
  QUALITY_CHECK: 'CURING_PRESS',
  READY_TO_SHIP: 'SHIPPED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'COMPLETED',
  COMPLETED: 'COMPLETED',
};

/**
 * Kontainer live: polling GET /api/mobile/orders/:id/status tiap 10 detik.
 * Menggantikan mock saat orderId server (cuid) tersedia.
 */
export function UserOrderTrackerLive({
  orderId,
  paymentUrl,
  onNotify,
}: {
  orderId: string;
  paymentUrl?: string;
  onNotify?: (msg: string) => void;
}) {
  const [remote, setRemote] = useState<MobileOrderStatus | null>(null);
  const [offline, setOffline] = useState(false);

  const poll = useCallback(async () => {
    const s = await mobileApiClient.pollOrderStatus(orderId);
    if (s) {
      setRemote(s);
      setOffline(false);
    } else {
      setOffline(true);
    }
  }, [orderId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, [poll]);

  if (!remote) {
    return (
      <GlassCard className="p-4 text-xs text-zinc-400">
        {offline ? 'Menunggu koneksi untuk memuat status pesanan…' : 'Memuat status pesanan…'}
      </GlassCard>
    );
  }

  const mapped = SERVER_TO_TRACKER[remote.status] ?? 'PENDING_PAYMENT';
  const order: OrderItemData = {
    id: remote.id,
    orderNumber: remote.orderNumber,
    apparelTitle: 'Pesanan Sablon DTF',
    colorName: '-',
    size: '-',
    quantity: 1,
    printWidthCm: 0,
    printHeightCm: 0,
    status: mapped,
    totalAmount: 0,
    paymentMethod: paymentUrl ? 'Duitku' : '-',
    deliveryMethod: 'Makassar',
    createdAt: remote.updatedAt,
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
          mapped === 'PENDING_PAYMENT' && paymentUrl
            ? () => openDuitkuPaymentModal(paymentUrl, () => poll())
            : undefined
        }
      />
    </div>
  );
}
