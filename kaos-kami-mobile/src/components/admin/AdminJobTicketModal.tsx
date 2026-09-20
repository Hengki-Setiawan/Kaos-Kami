"use client";

import React, { useState } from 'react';
import { FileText, Printer, CheckSquare, Square, Share2, ShieldCheck, MapPin } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { WORKSHOP_LOCATION } from '@/lib/shipping/deliveryOptionsMobile';
import { SHOP_WHATSAPP } from '@/lib/shop';
import { shareText } from '@/lib/bridge/share';
import { haptic } from '@/lib/bridge/haptics';

export interface AdminJobTicketData {
  orderNumber: string;
  customerName?: string;
  apparelTitle: string;
  colorName: string;
  size: string;
  quantity: number;
  printWidthCm: number;
  printHeightCm: number;
  decalDpi?: number;
  deliveryMethod?: string;
  artworkUrl?: string | null;
}

export function AdminJobTicketModal({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AdminJobTicketData | null;
}) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  if (!data) return null;

  const toggleStep = (idx: number) => {
    haptic.selection();
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const SOP_STEPS = [
    'RIP file 300 DPI & White Underbase Layer aktif',
    'Cetak DTF Roll 580mm + Tabur Hotmelt Powder rata',
    'Oven Curing 160°C (bubuk meleleh seperti kulit jeruk)',
    'Pre-press kain kaos 5 detik (menghilangkan kelembaban)',
    'Heat Press 160°C selama 15 detik (tekanan 4–5 bar)',
    'Cold Peel: tunggu film PET dingin total sebelum dikelupas',
    'Finishing Press 5 detik dengan lembar Teflon',
    'QC akhir jahitan, kebersihan sablon, & packing OPP polymailer',
  ];

  const completedCount = Object.values(checkedSteps).filter(Boolean).length;

  const handleShareSpk = async () => {
    haptic.tap();
    const text = [
      `📋 SPK JOB TICKET PRODUKSI — KAOS KAMI MAKASSAR`,
      `Order: ${data.orderNumber}`,
      `Apparel: ${data.apparelTitle} (${data.colorName} - Size ${data.size} x ${data.quantity} pcs)`,
      `Ukuran Cetak DTF: ${data.printWidthCm} x ${data.printHeightCm} cm (Maks 30.0 cm)`,
      `Workshop: ${WORKSHOP_LOCATION.address}`,
      `SOP QC: ${completedCount}/${SOP_STEPS.length} langkah selesai`,
    ].join('\n');

    await shareText(
      `SPK Job Ticket ${data.orderNumber}`,
      text,
      'Bagikan Lembar Kerja SPK Workshop'
    );
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`SPK Job Ticket ${data.orderNumber}`}
      description="Lembar Instruksi Kerja & Kendali Mutu Workshop Tallo Makassar"
    >
      <div className="space-y-4 py-2 pb-8 select-none text-xs">
        {/* Workshop SSOT Header */}
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white font-['Syne'] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {WORKSHOP_LOCATION.name}
            </span>
            <Badge variant="production">SOP Standar DTF</Badge>
          </div>
          <p className="text-[11px] text-zinc-400 flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <span>{WORKSHOP_LOCATION.address}</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">
            WA: {SHOP_WHATSAPP} • Operasional: {WORKSHOP_LOCATION.operatingHours}
          </p>
        </div>

        {/* Spesifikasi Cetak & Apparel */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-[#FF6B35]/30 space-y-2.5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <span className="text-[10px] text-zinc-500 block font-mono">NOMOR SPK:</span>
              <span className="text-sm font-extrabold text-white font-mono">{data.orderNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block">JUMLAH:</span>
              <span className="text-sm font-bold text-[#FF6B35] font-mono">{data.quantity} Pcs</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <div>
              <span className="text-[10px] text-zinc-500 block">Apparel:</span>
              <span className="font-bold text-white">{data.apparelTitle}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Warna & Ukuran:</span>
              <span className="font-bold text-white">{data.colorName} • Size {data.size}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Dimensi DTF Sablon:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {data.printWidthCm} cm x {data.printHeightCm} cm
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Kerapatan Resolusi:</span>
              <span className="font-bold text-white font-mono">{data.decalDpi ?? 300} DPI</span>
            </div>
          </div>
        </div>

        {/* SOP & QC Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white font-['Syne']">Checklist SOP Produksi:</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">
              {completedCount}/{SOP_STEPS.length} Selesai
            </span>
          </div>

          <div className="space-y-1.5">
            {SOP_STEPS.map((step, idx) => {
              const isChecked = !!checkedSteps[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleStep(idx)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                    isChecked
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                  )}
                  <span className={`text-[11px] leading-snug ${isChecked ? 'line-through opacity-80' : ''}`}>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <HapticButton
            variant="primary"
            icon={<Share2 className="w-4 h-4" />}
            onClick={handleShareSpk}
            className="flex-1 text-xs"
          >
            Bagikan Lembar SPK
          </HapticButton>
          <HapticButton
            variant="glass"
            onClick={() => onOpenChange(false)}
            className="px-4 text-xs"
          >
            Tutup
          </HapticButton>
        </div>
      </div>
    </BottomSheet>
  );
}
