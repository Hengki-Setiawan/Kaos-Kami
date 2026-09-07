"use client";

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Flame,
  Truck,
  MessageCircle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ScanLine,
} from 'lucide-react';
import { GlassCard, Badge, HapticButton, BottomSheet } from '@/components/ui';
import { OrderItemData, OrderStatus } from '@/components/commerce/UserOrderTracker';
import { mobileApiClient } from '@/lib/api/mobileApiClient';
import { scanJobTicketOrQris } from '@/lib/bridge/scanner';
import { haptic } from '@/lib/bridge/haptics';

const STAGE_TO_STATUS: Record<string, OrderStatus> = {
  DESIGN_PREP: 'PENDING_DESIGN_APPROVAL',
  SCREEN_PRINT_SETUP: 'PENDING_DESIGN_APPROVAL',
  PRINTING: 'PRINTING_DTF',
  PRESSING: 'CURING_PRESS',
  QUALITY_CHECK: 'CURING_PRESS',
  PACKAGING: 'SHIPPED',
  DONE: 'COMPLETED',
};

const STATUS_TO_STAGE: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: 'PRINTING',
  PRINTING_DTF: 'PRESSING',
  CURING_PRESS: 'PACKAGING',
  SHIPPED: 'DONE',
};

const INITIAL_ADMIN_ORDERS: OrderItemData[] = [
  {
    id: 'ord-1',
    orderNumber: '#KK-2026-101',
    apparelTitle: 'Kaos Heavyweight 280 GSM',
    colorName: 'Obsidian Black',
    size: 'XL',
    quantity: 1,
    printWidthCm: 28.5,
    printHeightCm: 22.0,
    status: 'PENDING_DESIGN_APPROVAL',
    totalAmount: 160000,
    paymentMethod: 'QRIS Instant',
    deliveryMethod: 'Maxim Instant COD',
    createdAt: '10 menit yang lalu',
  },
  {
    id: 'ord-2',
    orderNumber: '#KK-2026-098',
    apparelTitle: 'Streetwear Hoodie 330 GSM',
    colorName: 'Pure White',
    size: 'L',
    quantity: 2,
    printWidthCm: 26.0,
    printHeightCm: 26.0,
    status: 'PRINTING_DTF',
    totalAmount: 390000,
    paymentMethod: 'BCA Virtual Account',
    deliveryMethod: 'Ambil di Workshop',
    createdAt: '1 jam yang lalu',
  },
  {
    id: 'ord-3',
    orderNumber: '#KK-2026-095',
    apparelTitle: 'Coach Jacket Waterproof',
    colorName: 'Signal Tangerine',
    size: 'M',
    quantity: 1,
    printWidthCm: 24.0,
    printHeightCm: 18.0,
    status: 'COMPLETED',
    totalAmount: 220000,
    paymentMethod: 'QRIS Instant',
    deliveryMethod: 'Kurir Internal Flat Rate',
    createdAt: 'Kemarin',
  },
];

export function AdminMobileDashboard({
  onClose,
  onNotify,
}: {
  onClose?: () => void;
  onNotify?: (msg: string) => void;
}) {
  const [orders, setOrders] = useState<OrderItemData[]>(INITIAL_ADMIN_ORDERS);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PRODUCTION' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItemData | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);

  // Coba tarik antrean produksi asli dari server (butuh sesi admin).
  // Gagal/403 → tetap pakai data demo lokal + badge mode demo.
  const loadLiveTasks = async () => {
    setLoadingLive(true);
    try {
      const tasks = await mobileApiClient.getProductionTasks();
      if (tasks.length > 0) {
        setOrders(
          tasks.map((t: any) => {
            const first = t.order?.items?.[0];
            const total = (t.order?.items || []).reduce(
              (s: number, it: any) => s + (it.lineTotalIdr || 0),
              0
            );
            return {
              id: t.orderId || t.id,
              taskId: t.id,
              orderNumber: t.order?.orderNumber || t.orderId,
              apparelTitle: first?.snapshotName || 'Pesanan Sablon DTF',
              colorName: first?.snapshotColorName || '-',
              size: first?.snapshotSize || '-',
              quantity: first?.quantity || 1,
              printWidthCm: t.printWidthCm ?? 0,
              printHeightCm: t.printHeightCm ?? 0,
              status: STAGE_TO_STATUS[t.stage] ?? 'PENDING_DESIGN_APPROVAL',
              totalAmount: total,
              paymentMethod: '-',
              deliveryMethod: t.order?.deliveryMethod || '-',
              createdAt: t.createdAt || '',
            } as OrderItemData;
          })
        );
        setLiveMode(true);
      }
    } catch {
      /* fallback demo */
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    loadLiveTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.apparelTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (filter === 'PENDING') return o.status === 'PENDING_DESIGN_APPROVAL' || o.status === 'PENDING_PAYMENT';
    if (filter === 'PRODUCTION') return o.status === 'PRINTING_DTF' || o.status === 'CURING_PRESS' || o.status === 'QC_PACKED';
    if (filter === 'COMPLETED') return o.status === 'COMPLETED' || o.status === 'SHIPPED';
    return true;
  });

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    haptic.success();
    const target = orders.find((o) => o.id === orderId);
    const serverStage = STATUS_TO_STAGE[newStatus];
    // ACC 1-klik asli: PATCH ke server jika taskId tersedia.
    // Jujur: bila server gagal, JANGAN klaim sukses.
    let synced = true;
    if (target?.taskId && serverStage) {
      synced = await mobileApiClient.advanceProductionTask(target.taskId, serverStage);
    }
    if (!synced) {
      onNotify?.('Gagal sinkron ke server (butuh login admin / offline). Status TIDAK diubah.');
      return;
    }
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (onNotify) {
      onNotify(`Pesanan ${selectedOrder?.orderNumber} status diubah ke: ${newStatus}`);
    }
  };

  const pendingApprovalCount = orders.filter((o) => o.status === 'PENDING_DESIGN_APPROVAL').length;

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Admin Mobile Banner */}
      <GlassCard glow className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/95 border-zinc-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne']">Admin Mobile Workshop</h2>
              <p className="text-[11px] text-zinc-400">Pusat Moderasi Desain & Sablon DTF</p>
              <p className="text-[10px] mt-0.5 font-mono">
                {loadingLive ? (
                  <span className="text-zinc-500">Menghubungi server…</span>
                ) : liveMode ? (
                  <span className="text-emerald-400">● Live tersambung ke server</span>
                ) : (
                  <span className="text-amber-400">● Mode demo lokal (offline / tanpa sesi admin)</span>
                )}
              </p>
            </div>
          </div>
          {pendingApprovalCount > 0 && (
            <Badge variant="warning" pulse>
              {pendingApprovalCount} Perlu ACC
            </Badge>
          )}
        </div>
      </GlassCard>

      {/* Search and Quick Filters */}
      <div className="space-y-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID pesanan, nama baju..."
              aria-label="Cari pesanan berdasarkan ID atau nama baju"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-xs text-white outline-none focus:border-[#FF6B35]"
            />
          </div>
          <button
            title="Scan Job Ticket / QR pesanan"
            onClick={async () => {
              const code = await scanJobTicketOrQris();
              if (code) {
                setSearchQuery(code);
                onNotify?.(`Hasil scan: ${code}`);
              }
            }}
            className="w-10 h-10 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-[#FF6B35]"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { key: 'ALL', label: 'Semua Pesanan' },
            { key: 'PENDING', label: 'Perlu ACC Desain', count: pendingApprovalCount },
            { key: 'PRODUCTION', label: 'Sedang Dicetak' },
            { key: 'COMPLETED', label: 'Selesai' },
          ].map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  haptic.selection();
                  setFilter(tab.key as any);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-600/30'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order List Cards */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            Tidak ada pesanan yang sesuai dengan filter.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <GlassCard
              key={ord.id}
              interactive
              onClick={() => {
                haptic.tap();
                setSelectedOrder(ord);
              }}
              className="p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                <Badge
                  variant={
                    ord.status === 'PENDING_DESIGN_APPROVAL'
                      ? 'warning'
                      : ord.status === 'COMPLETED'
                      ? 'success'
                      : 'production'
                  }
                  pulse={ord.status === 'PENDING_DESIGN_APPROVAL'}
                >
                  {ord.status === 'PENDING_DESIGN_APPROVAL'
                    ? 'Perlu ACC Admin'
                    : ord.status === 'PENDING_PAYMENT'
                    ? 'Menunggu Bayar'
                    : ord.status === 'PRINTING_DTF'
                    ? 'Cetak DTF'
                    : ord.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white leading-tight font-['Syne']">{ord.apparelTitle}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {ord.colorName} • Size {ord.size} • Sablon {ord.printWidthCm}x{ord.printHeightCm} cm
                  </p>
                </div>
                <span className="font-bold text-[#FF6B35]">
                  Rp {ord.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                <span>{ord.deliveryMethod}</span>
                <span className="text-[#FF6B35] font-semibold flex items-center gap-1">
                  Detail & ACC Desain →
                </span>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Detail & 1-Click Moderation Bottom Sheet */}
      {selectedOrder && (
        <BottomSheet
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          title={`Inspeksi Order ${selectedOrder.orderNumber}`}
          description={`${selectedOrder.apparelTitle} (${selectedOrder.colorName})`}
        >
          <div className="space-y-4 py-2 pb-8">
            {/* Spesifikasi Teknis DTF Sablon */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <h4 className="font-bold text-white font-['Syne']">Kalibrasi Sablon Workshop:</h4>
              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Ukuran Cetak DTF:</span>
                  <span className="text-white font-mono font-bold">
                    {selectedOrder.printWidthCm} cm x {selectedOrder.printHeightCm} cm
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Kualitas Gambar:</span>
                  <span className="text-amber-400 font-bold">Perlu verifikasi file master</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Metode Pembayaran:</span>
                  <span className="text-white">{selectedOrder.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Opsi Pengiriman:</span>
                  <span className="text-white">{selectedOrder.deliveryMethod}</span>
                </div>
              </div>
            </div>

            {/* Tombol Moderasi Utama (ACC Desain) */}
            {selectedOrder.status === 'PENDING_DESIGN_APPROVAL' && (
              <div className="space-y-2">
                <HapticButton
                  variant="primary"
                  hapticStyle="success"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'PENDING_PAYMENT')}
                  className="w-full py-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30 shadow-lg shadow-emerald-600/30"
                >
                  Setujui Desain & Terbitkan Tagihan QRIS
                </HapticButton>

                <HapticButton
                  variant="destructive"
                  hapticStyle="error"
                  icon={<XCircle className="w-4 h-4" />}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'COMPLETED')}
                  className="w-full py-3 text-xs"
                >
                  Tolak Desain (Gambar Pecah / Buram)
                </HapticButton>
              </div>
            )}

            {/* Alur Produksi Workshop Selanjutnya */}
            {selectedOrder.status === 'PENDING_PAYMENT' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <p className="font-bold">Desain telah Anda setujui!</p>
                <p className="text-[10px] text-amber-300/80 mt-0.5">
                  Menunggu pelanggan menyelesaikan pembayaran QRIS di aplikasinya.
                </p>
                <HapticButton
                  variant="primary"
                  onClick={() => updateOrderStatus(selectedOrder.id, 'PRINTING_DTF')}
                  className="w-full mt-3 text-xs"
                >
                  Simulasikan Pelanggan Sudah Lunas → Kirim ke Mesin DTF
                </HapticButton>
              </div>
            )}

            {selectedOrder.status === 'PRINTING_DTF' && (
              <HapticButton
                variant="primary"
                icon={<Flame className="w-4 h-4" />}
                onClick={() => updateOrderStatus(selectedOrder.id, 'CURING_PRESS')}
                className="w-full py-3.5 text-xs font-bold"
              >
                Cetak Selesai → Lanjut Press Panas 160°C
              </HapticButton>
            )}

            {selectedOrder.status === 'CURING_PRESS' && (
              <HapticButton
                variant="primary"
                icon={<Truck className="w-4 h-4" />}
                onClick={() => updateOrderStatus(selectedOrder.id, 'SHIPPED')}
                className="w-full py-3.5 text-xs font-bold"
              >
                Selesai QC & Packing → Serahkan ke Kurir Maxim
              </HapticButton>
            )}

            {/* Chat WhatsApp Pelanggan */}
            <HapticButton
              variant="secondary"
              icon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
              onClick={() => {
                haptic.tap();
                const msg = encodeURIComponent(
                  `Halo dari Kaos Kami Workshop Makassar! Mengenai pesanan Anda ${selectedOrder.orderNumber}...`
                );
                window.open(`https://wa.me/62882020685076?text=${msg}`, '_blank');
              }}
              className="w-full py-2.5 text-xs"
            >
              Chat WhatsApp Pelanggan Langsung
            </HapticButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
