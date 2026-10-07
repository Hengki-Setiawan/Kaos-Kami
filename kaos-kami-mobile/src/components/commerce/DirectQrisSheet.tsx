"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Download, Camera, CheckCircle2, Clock, Sparkles, ShieldCheck, Copy, Check, Loader2, FileText } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { haptic } from '@/lib/bridge/haptics';
import { saveQrisImageToDevice } from '@/lib/payments/ipaymuMobile';
import { mobileApiClient } from '@/lib/api/mobileApiClient';

export interface DirectQrisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  qrImage?: string;
  qrString?: string;
  invoiceUrl?: string;
  onPaymentSuccess?: () => void;
}

export const DirectQrisSheet: React.FC<DirectQrisSheetProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  amountIdr,
  qrImage,
  qrString,
  invoiceUrl,
  onPaymentSuccess,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1800);
  const [toast, setToast] = useState<string | null>(null);

  // Countdown timer 30 menit
  useEffect(() => {
    if (!open || isPaid) return;
    const t = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [open, isPaid]);

  // Polling status pelunasan real-time di server
  useEffect(() => {
    if (!open || !orderId || isPaid) return;

    let isSubscribed = true;
    const checkStatus = async () => {
      try {
        const order = await mobileApiClient.pollOrderStatus(orderId);
        if (!order) return;
        const status = (order as any).status;
        const paymentStatus = (order as any).payment?.status;

        if (
          status === 'PAYMENT_CONFIRMED' ||
          status === 'IN_PRODUCTION' ||
          status === 'COMPLETED' ||
          paymentStatus === 'SETTLEMENT' ||
          paymentStatus === 'SETTLED'
        ) {
          if (isSubscribed) {
            setIsPaid(true);
            haptic.success();
            onPaymentSuccess?.();
            setTimeout(() => {
              onOpenChange(false);
            }, 2000);
          }
        }
      } catch {
        // Polling silent
      }
    };

    const interval = setInterval(checkStatus, 3500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [open, orderId, isPaid, onPaymentSuccess, onOpenChange]);

  const handleDownload = async () => {
    if (!qrImage) {
      handleCopy();
      return;
    }
    setDownloading(true);
    haptic.selection();
    try {
      const res = await saveQrisImageToDevice(qrImage, orderNumber || orderId);
      setToast(res.message);
      if (res.success) haptic.success();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Gunakan Screenshot layar untuk menyimpan QRIS.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = () => {
    if (!qrString) return;
    haptic.selection();
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setToast('Kode QRIS berhasil disalin ke clipboard');
    setTimeout(() => {
      setCopied(false);
      setToast(null);
    }, 2500);
  };

  const handleScreenshotTip = () => {
    haptic.selection();
    setToast('📸 Silakan screenshot layar ini sekarang, lalu buka aplikasi m-Banking Anda!');
    setTimeout(() => setToast(null), 4500);
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Bayar QRIS Langsung"
      description="100% In-App: Simpan QRIS ke galeri atau screenshot untuk pembayaran cepat"
    >
      <div className="space-y-4 py-2 pb-6">
        {/* Lunas Notification Overlay */}
        {isPaid && (
          <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <p className="text-sm font-bold text-white">PEMBAYARAN DITERIMA!</p>
            <p className="text-xs text-zinc-400">Pesanan telah lunas dan langsung masuk antrean sablon DTF.</p>
          </div>
        )}

        {/* Total Tagihan & Timer */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
            TOTAL TAGIHAN (ORDER #{orderNumber || orderId.slice(0, 8)})
          </span>
          <div className="text-2xl font-black text-[#FF6B35] font-mono tabular-nums">
            Rp {amountIdr.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-amber-400 pt-1">
            <Clock size={12} />
            <span>Batas waktu bayar: </span>
            <span className="font-bold tabular-nums">{timeFormatted}</span>
          </div>
        </div>

        {/* Gambar QRIS Resolusi Tinggi */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-white max-w-[220px] aspect-square flex items-center justify-center">
            {qrImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrImage}
                alt={`QRIS Order ${orderNumber}`}
                className="w-full h-full object-contain rounded-lg"
                loading="eager"
              />
            ) : qrString ? (
              <div className="text-center p-3">
                <p className="font-mono text-[9px] text-zinc-800 break-all mb-2 leading-tight">
                  {qrString.slice(0, 80)}...
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 rounded bg-zinc-900 text-white font-mono text-xs font-bold"
                >
                  {copied ? 'Tersalin!' : 'Salin Kode QRIS'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-zinc-500">
                <Loader2 size={24} className="animate-spin text-[#FF6B35] mb-2" />
                <span className="text-xs">Menyiapkan QRIS...</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>QRIS Nasional · Bebas Biaya Admin</span>
          </div>
        </div>

        {/* Toast Notifikasi Feedback */}
        {toast && (
          <div className="p-2.5 rounded-xl bg-[#FF6B35]/15 border border-[#FF6B35]/30 text-center text-xs text-white animate-fadeIn font-sans font-semibold">
            {toast}
          </div>
        )}

        {/* Tombol Aksi: Unduh ke Galeri & Screenshot */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <HapticButton
            onClick={handleDownload}
            disabled={downloading || !qrImage}
            className="py-3 px-3 rounded-xl bg-[#FF6B35] text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(255,107,53,0.3)] disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{downloading ? 'Mengunduh...' : 'Unduh ke Galeri'}</span>
          </HapticButton>

          <HapticButton
            onClick={handleScreenshotTip}
            className="py-3 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-sans font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-zinc-700"
          >
            <Camera size={14} className="text-amber-400" />
            <span>Screenshot Layar</span>
          </HapticButton>
        </div>

        {/* Salin Kode QR (opsional) */}
        {qrString && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Kode Berhasil Disalin' : 'Salin String Kode QRIS'}</span>
          </button>
        )}

        {/* Panduan Pembayaran 4 Langkah Cepat */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles size={13} className="text-amber-400" />
            <span>Cara Bayar Cepat (1 Menit Lunas):</span>
          </div>
          <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside pl-0.5 leading-relaxed">
            <li>
              Klik <strong className="text-white">Unduh ke Galeri</strong> atau lakukan <strong className="text-white">Screenshot</strong> layar ini.
            </li>
            <li>
              Buka aplikasi <strong className="text-white">m-Banking</strong> (BCA, Mandiri, BRI, BNI) atau <strong className="text-white">e-Wallet</strong> (GoPay, Dana, OVO, ShopeePay).
            </li>
            <li>
              Pilih menu <strong className="text-white">Bayar QRIS</strong> lalu klik ikon <strong className="text-white">Ambil dari Galeri</strong>.
            </li>
            <li>
              Konfirmasi tagihan. Pembayaran langsung lunas otomatis seketika!
            </li>
          </ol>
        </div>

        {/* Auto Polling Live Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Menunggu verifikasi pembayaran...
          </span>
          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6B35] hover:underline flex items-center gap-1"
            >
              <FileText size={11} />
              <span>Invoice</span>
            </a>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
