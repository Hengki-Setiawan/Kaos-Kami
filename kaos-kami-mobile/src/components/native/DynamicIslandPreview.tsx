"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Printer, Flame, Truck, CheckCircle2 } from 'lucide-react';
import { OrderStatus } from '@/components/commerce/UserOrderTracker';

export function DynamicIslandPreview({
  status,
  orderNumber,
  apparelTitle,
}: {
  status: OrderStatus;
  orderNumber: string;
  apparelTitle: string;
}) {
  const getStatusInfo = () => {
    switch (status) {
      case 'PRINTING_DTF':
        return { label: 'Cetak DTF', icon: Printer, color: 'text-orange-400', progress: '35%' };
      case 'CURING_PRESS':
        return { label: 'Press 160°C', icon: Flame, color: 'text-amber-400', progress: '65%' };
      case 'SHIPPED':
        return { label: 'Kurir Maxim', icon: Truck, color: 'text-blue-400', progress: '85%' };
      case 'COMPLETED':
        return { label: 'Selesai', icon: CheckCircle2, color: 'text-emerald-400', progress: '100%' };
      case 'PENDING_DESIGN_APPROVAL':
      case 'PENDING_PAYMENT':
      default:
        return { label: 'Review Desain', icon: Printer, color: 'text-zinc-400', progress: '15%' };
    }
  };

  const info = getStatusInfo();
  const Icon = info.icon;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-xs mx-auto p-3 rounded-[32px] bg-black border border-white/15 text-white shadow-2xl flex items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-4 h-4 ${info.color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-tight truncate leading-tight font-['Syne']">
            {orderNumber} • {info.label}
          </p>
          <p className="text-[9px] text-zinc-400 truncate mt-0.5">{apparelTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-[#FF6B35] rounded-full transition-all duration-500"
            style={{ width: info.progress }}
          />
        </div>
        <span className="text-[9px] font-mono text-[#FF6B35] font-bold">{info.progress}</span>
      </div>
    </motion.div>
  );
}
