"use client";

import React, { useState } from 'react';
import { Printer, Download, X, FileText } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { generateTechPackHtml, TechPackData } from '@/lib/techpack/generateTechPack';
import { haptic } from '@/lib/bridge/haptics';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

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

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePrintOrDownload = async () => {
    haptic.tapHeavy();
    setMsg(null);
    // WebView tak bisa window.open+print (audit: no-op di Android) → simpan
    // HTML ke file + Share sheet native (atau unduh di browser).
    try {
      setBusy(true);
      const fileName = `techpack-${data.orderId.replace(/[^A-Za-z0-9-]/g, '') || 'order'}.html`;
      if (Capacitor.isNativePlatform()) {
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: btoa(unescape(encodeURIComponent(htmlContent))),
          directory: Directory.Cache,
        });
        await Share.share({
          title: 'Tech Pack DTF',
          text: `Lembar spesifikasi ${data.orderId}`,
          url: saved.uri,
          dialogTitle: 'Bagikan / cetak tech pack',
        });
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e: any) {
      setMsg(e?.message || 'Gagal simpan tech pack');
    } finally {
      setBusy(false);
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
          loading={busy}
          className="w-full py-4 text-sm font-bold shadow-xl shadow-orange-600/40"
        >
          Simpan & Bagikan Tech Pack
        </HapticButton>
        {msg && <p className="text-[11px] text-rose-300 text-center">{msg}</p>}
        <p className="text-[10px] text-zinc-500 text-center">
          Tersimpan sebagai file HTML — bagikan via WA atau buka di browser lalu cetak PDF.
        </p>
      </div>
    </BottomSheet>
  );
}
