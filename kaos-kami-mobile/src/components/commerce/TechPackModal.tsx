"use client";

import React from 'react';
import { Printer, Download, X, FileText } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { generateTechPackHtml, TechPackData } from '@/lib/techpack/generateTechPack';
import { haptic } from '@/lib/bridge/haptics';

export function TechPackModal({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TechPackData;
}) {
  const htmlContent = generateTechPackHtml(data);

  const handlePrintOrDownload = () => {
    haptic.tapHeavy();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 300);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Lembar Spesifikasi DTF Sablon (B2B Tech Pack)"
      description="Standar lembar kerja workshop konveksi dan mesin heat press Makassar."
    >
      <div className="space-y-4 py-2 pb-8">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono font-bold text-white">{data.orderId}</span>
            <Badge variant="production">Batas 30cm Terkalibrasi</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-zinc-400">
            <div>
              <span className="text-[10px] text-zinc-500 block">Jenis Apparel:</span>
              <span className="text-white font-medium">{data.apparelTitle}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Warna Kain:</span>
              <span className="text-white font-medium">{data.colorName}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Dimensi Sablon:</span>
              <span className="text-[#FF6B35] font-bold font-mono">
                {data.printWidthCm} x {data.printHeightCm} cm
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Suhu & Waktu Press:</span>
              <span className="text-white font-medium">160°C • 15 Detik</span>
            </div>
          </div>
        </div>

        <HapticButton
          variant="primary"
          hapticStyle="success"
          icon={<Printer className="w-4 h-4" />}
          onClick={handlePrintOrDownload}
          className="w-full py-4 text-sm font-bold shadow-xl shadow-orange-600/40"
        >
          Cetak / Simpan PDF (Dialog Sistem)
        </HapticButton>
        <p className="text-[10px] text-zinc-500 text-center">
          Di Android pilih “Simpan sebagai PDF”; di workshop colok printer thermal/inkjet.
        </p>
      </div>
    </BottomSheet>
  );
}
