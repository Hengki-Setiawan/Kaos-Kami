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
  /** DPI aktual store/artwork — null = belum diukur (tampil jujur). */
  decalDpi?: number | null;
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
  const todayId = (() => {
    try {
      return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  })();
  const overMax = data.printWidthCm > 30.0;
  const hasDims = data.printWidthCm > 0 && data.printHeightCm > 0;
  const dpiLabel = data.decalDpi && data.decalDpi > 0 ? `${data.decalDpi} DPI (aktual)` : 'menunggu info workshop';

  const ticketText = [
    `📋 SPK JOB TICKET PRODUKSI — KAOS KAMI MAKASSAR`,
    `Tanggal: ${todayId}`,
    `Order: ${data.orderNumber}`,
    `Pelanggan: ${data.customerName || 'Pelanggan'}`,
    `Apparel: ${data.apparelTitle} (${data.colorName} - Size ${data.size} x ${data.quantity} pcs)`,
    `Ukuran Cetak DTF: ${hasDims ? `${data.printWidthCm} x ${data.printHeightCm} cm (Maks 30.0 cm)` : 'menunggu info workshop'}${overMax ? ' — ⚠️ MELEBIHI BATAS, kecilkan sebelum cetak' : ''}`,
    `DPI master: ${dpiLabel}`,
    `Kirim: ${data.deliveryMethod || '-'}`,
    `Workshop: ${WORKSHOP_LOCATION.address}`,
    `SOP QC: ${completedCount}/${SOP_STEPS.length} langkah selesai`,
  ].join('\n');

  const handleShareSpk = async () => {
    haptic.tap();
    await shareText(
      `SPK Job Ticket ${data.orderNumber}`,
      ticketText,
      'Bagikan Lembar Kerja SPK Workshop'
    );
  };

  const handlePrintSpk = () => {
    haptic.tap();
    try {
      window.print();
    } catch {}
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`SPK Job Ticket ${data.orderNumber}`}
      description="Lembar Instruksi Kerja & Kendali Mutu Workshop Tallo Makassar"
    >
      {/* CSS cetak: hanya tiket yang keluar di kertas (siap cetak/share). */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #kk-spk-ticket, #kk-spk-ticket * { visibility: visible !important; }
        #kk-spk-ticket { position: absolute !important; left: 0; top: 0; width: 100% !important; background: #fff !important; color: #000 !important; }
        #kk-spk-ticket .spk-no-print { display: none !important; }
        #kk-spk-ticket .spk-card { border: 1px solid #000 !important; background: #fff !important; }
      }`}</style>
      <div id="kk-spk-ticket" className="space-y-4 py-2 pb-8 select-none text-xs">
        {/* Kop tiket — rapi untuk cetak thermal/A4 */}
        <div className="spk-card p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
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
            WA: {SHOP_WHATSAPP} • Operasional: {WORKSHOP_LOCATION.operatingHours} • {todayId}
          </p>
        </div>

        {/* Spesifikasi Cetak & Apparel */}
        <div className="spk-card p-3.5 rounded-2xl bg-zinc-900/90 border border-[#FF6B35]/30 space-y-2.5">
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

          {data.artworkUrl && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black/50 border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.artworkUrl} alt="Artwork sablon" className="w-14 h-14 object-contain rounded-lg bg-white/5" />
              <p className="text-[10px] text-zinc-400">Pratinjau artwork — file master 300 DPI dipakai produksi, bukan thumbnail ini.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <div>
              <span className="text-[10px] text-zinc-500 block">Pelanggan:</span>
              <span className="font-bold text-white">{data.customerName || 'Pelanggan'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Kirim:</span>
              <span className="font-bold text-white">{data.deliveryMethod || '-'}</span>
            </div>
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
              <span className={`font-bold font-mono ${overMax ? 'text-red-400' : 'text-emerald-400'}`}>
                {hasDims ? `${data.printWidthCm} cm x ${data.printHeightCm} cm` : 'menunggu info workshop'}
              </span>
              {overMax && (
                <span className="block text-[10px] text-red-300 font-bold">⚠️ Melebihi printhead 30.0 cm — kecilkan dulu!</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Kerapatan Resolusi:</span>
              <span className="font-bold text-white font-mono">{dpiLabel}</span>
            </div>
          </div>
        </div>

        {/* SOP & QC Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white font-['Syne'] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" /> Checklist SOP Produksi:
            </span>
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
                  className={`spk-no-print w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
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
                    <span className="font-mono text-zinc-500 mr-1">{idx + 1}.</span>{step}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Versi cetak: daftar bernomor statis (tombol interaktif disembunyikan). */}
          <ol className="hidden print:block text-[11px] text-black space-y-0.5 list-decimal ml-4">
            {SOP_STEPS.map((step, idx) => (
              <li key={idx}>{step} {(checkedSteps[idx] ? '✓' : '☐')}</li>
            ))}
          </ol>
        </div>

        {/* Tanda tangan QC — wajib di kertas */}
        <div className="spk-card p-3 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <p className="text-zinc-500 text-[10px]">Operator Press:</p>
            <p className="mt-6 border-t border-zinc-700 pt-1 text-zinc-400">(nama + ttd)</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px]">QC / Admin:</p>
            <p className="mt-6 border-t border-zinc-700 pt-1 text-zinc-400">(nama + ttd)</p>
          </div>
        </div>

        {/* Actions (disembunyikan saat cetak) */}
        <div className="spk-no-print flex gap-2 pt-2">
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
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrintSpk}
            className="flex-1 text-xs"
          >
            Cetak / PDF
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
