"use client";

import React, { useEffect, useState } from 'react';
import { Package, Clock, ExternalLink, RefreshCw, ChevronRight, CheckCircle2, Truck, Printer } from 'lucide-react';
import { GlassCard, Badge, HapticButton } from '@/components/ui';
import { haptic } from '@/lib/bridge/haptics';

export interface LocalOrderEntry {
  id: string;
  orderNumber: string;
  totalIdr: number;
  itemCount: number;
  deliveryMethod: string;
  status: string;
  createdAt: string;
}

export function UserOrderHistory({
  onSelectOrder,
  onNewOrder,
}: {
  onSelectOrder: (orderId: string) => void;
  onNewOrder?: () => void;
}) {
  const [orders, setOrders] = useState<LocalOrderEntry[]>([]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('kaoskami_order_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
          return;
        }
      }
    } catch {}

    // Fallback: jika ada order aktif tunggal yang belum masuk history
    try {
      const activeOid = localStorage.getItem('kaoskami_active_order');
      if (activeOid) {
        setOrders([
          {
            id: activeOid,
            orderNumber: `#${activeOid.slice(-8).toUpperCase()}`,
            totalIdr: 0,
            itemCount: 1,
            deliveryMethod: 'Antar Makassar',
            status: 'IN_PRODUCTION_QUEUE',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {}
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (orders.length === 0) {
    return (
      <GlassCard className="p-6 text-center space-y-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mx-auto">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white font-['Syne']">Belum Ada Riwayat Pesanan</h3>
          <p className="text-[11px] text-zinc-400 mt-1">
            Pesanan sablon DTF yang Anda selesaikan akan otomatis tercatat dan tersimpan rapi di HP.
          </p>
        </div>
        {onNewOrder && (
          <HapticButton
            variant="primary"
            onClick={onNewOrder}
            className="w-full py-2.5 text-xs font-bold"
          >
            Mulai Desain Kaos
          </HapticButton>
        )}
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2.5 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-white font-['Syne']">
          Riwayat ({orders.length} Pesanan)
        </span>
        <button
          onClick={() => {
            haptic.tap();
            loadHistory();
          }}
          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Segarkan
        </button>
      </div>

      <div className="space-y-2">
        {orders.map((ord) => {
          const dateStr = (() => {
            try {
              return new Date(ord.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
            } catch {
              return ord.createdAt;
            }
          })();

          return (
            <GlassCard
              key={ord.id}
              interactive
              onClick={() => {
                haptic.tap();
                onSelectOrder(ord.id);
              }}
              className="p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-extrabold text-white font-mono">{ord.orderNumber}</span>
                <Badge variant={ord.status === 'COMPLETED' ? 'success' : 'production'}>
                  {ord.status === 'COMPLETED' ? 'Selesai' : 'Diproses'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    {ord.itemCount} Kaos • {ord.deliveryMethod}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{dateStr}</p>
                </div>
                <div className="text-right">
                  {ord.totalIdr > 0 && (
                    <span className="font-bold text-[#FF6B35] block">
                      Rp {ord.totalIdr.toLocaleString('id-ID')}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400 flex items-center justify-end gap-0.5 mt-0.5">
                    Pantau Live <ChevronRight className="w-3 h-3 text-[#FF6B35]" />
                  </span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
